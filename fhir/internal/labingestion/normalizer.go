package labingestion

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"healthcareworkspace/fhir/internal/labingestion/hl7v2"
)

// Normalizer converts a parsed HL7Message (or FHIR DiagnosticReport JSON)
// into one or more FHIR R4 resources ready to be stored in fhirstore.
type Normalizer struct{}

// NewNormalizer creates a Normalizer.
func NewNormalizer() *Normalizer { return &Normalizer{} }

// ─── Output ───────────────────────────────────────────────────────────────────

// NormalizedResult holds the FHIR resources produced from one lab message.
type NormalizedResult struct {
	// One DiagnosticReport per OBR group (some messages have multiple panels).
	DiagnosticReports []json.RawMessage
	// Flat list of all Observations across all reports.
	Observations []json.RawMessage
	// Accession number from the first OBR (used as deduplication key).
	AccessionNumber string
}

// ─── HL7 v2 → FHIR ────────────────────────────────────────────────────────────

// FromHL7 converts a parsed HL7Message to FHIR resources.
// patientID is the resolved FHIR Patient.id (already matched).
func (n *Normalizer) FromHL7(msg *hl7v2.HL7Message, patientID string) (*NormalizedResult, error) {
	if patientID == "" {
		return nil, fmt.Errorf("patientID is required")
	}

	result := &NormalizedResult{}

	for i, grp := range msg.ResultGroups {
		if i == 0 && grp.FillerOrderNum != "" {
			result.AccessionNumber = grp.FillerOrderNum
		}

		// Build Observations first so we can reference them in the report
		var obsRefs []map[string]interface{}
		for j, obx := range grp.Observations {
			obsResource, obsID, err := n.buildObservation(obx, grp, msg, patientID, i, j)
			if err != nil {
				continue // skip malformed OBX, don't abort
			}
			obsJSON, err := json.Marshal(obsResource)
			if err != nil {
				continue
			}
			result.Observations = append(result.Observations, obsJSON)
			obsRefs = append(obsRefs, map[string]interface{}{
				"reference": "Observation/" + obsID,
			})
		}

		// Build DiagnosticReport
		drResource, err := n.buildDiagnosticReport(grp, msg, patientID, obsRefs)
		if err != nil {
			return nil, fmt.Errorf("group %d: %w", i, err)
		}
		drJSON, err := json.Marshal(drResource)
		if err != nil {
			return nil, err
		}
		result.DiagnosticReports = append(result.DiagnosticReports, drJSON)
	}

	return result, nil
}

// ─── DiagnosticReport builder ─────────────────────────────────────────────────

func (n *Normalizer) buildDiagnosticReport(
	grp hl7v2.HL7ResultGroup,
	msg *hl7v2.HL7Message,
	patientID string,
	obsRefs []map[string]interface{},
) (map[string]interface{}, error) {

	status := ResultStatusToFHIR[grp.ResultStatus]
	if status == "" {
		status = "unknown"
	}

	dr := map[string]interface{}{
		"resourceType": "DiagnosticReport",
		"status":       status,
		"subject": map[string]interface{}{
			"reference": "Patient/" + patientID,
		},
		"result": obsRefs,
	}

	// Category — lab
	dr["category"] = []map[string]interface{}{
		{
			"coding": []map[string]interface{}{
				{
					"system":  "http://terminology.hl7.org/CodeSystem/v2-0074",
					"code":    "LAB",
					"display": "Laboratory",
				},
			},
		},
	}

	// Code from OBR-4
	if grp.UniversalServiceID.Code != "" {
		system := FHIRSystem[strings.ToUpper(grp.UniversalServiceID.System)]
		if system == "" {
			system = FHIRSystem["L"]
		}
		dr["code"] = map[string]interface{}{
			"coding": []map[string]interface{}{
				{
					"system":  system,
					"code":    grp.UniversalServiceID.Code,
					"display": grp.UniversalServiceID.Text,
				},
			},
			"text": grp.UniversalServiceID.Text,
		}
	} else {
		dr["code"] = map[string]interface{}{"text": "Laboratory Report"}
	}

	// Effective date/time
	dtStr := grp.ResultDateTime
	if dtStr == "" {
		dtStr = grp.SpecimenReceived
	}
	if dtStr == "" {
		dtStr = msg.DateTimeOfMessage
	}
	if t, err := parseHL7DT(dtStr); err == nil {
		dr["effectiveDateTime"] = t.Format(time.RFC3339)
	}

	// Issued (report datetime)
	if grp.ResultDateTime != "" {
		if t, err := parseHL7DT(grp.ResultDateTime); err == nil {
			dr["issued"] = t.Format(time.RFC3339)
		}
	}

	// Specimen source as note
	if grp.SpecimenSource != "" {
		dr["specimen"] = []map[string]interface{}{
			{"display": grp.SpecimenSource},
		}
	}

	// Ordering provider
	if grp.OrderingProvider != "" {
		dr["resultsInterpreter"] = []map[string]interface{}{
			{"display": grp.OrderingProvider},
		}
	}

	// Accession number as identifier
	if grp.FillerOrderNum != "" {
		dr["identifier"] = []map[string]interface{}{
			{
				"type": map[string]interface{}{
					"coding": []map[string]interface{}{
						{"system": "http://terminology.hl7.org/CodeSystem/v2-0203", "code": "FILL"},
					},
					"text": "Filler Order Number",
				},
				"system": "http://terminology.local/accession",
				"value":  grp.FillerOrderNum,
			},
		}
	}

	// Concatenate NTE notes as presentedForm text
	if len(grp.Notes) > 0 {
		noteText := strings.Join(grp.Notes, "\n")
		dr["conclusion"] = noteText
	}

	// Source system extension
	dr["extension"] = []map[string]interface{}{
		{
			"url":          "http://terminology.local/fhir/ext/lab-source",
			"valueString":  msg.SendingFacility,
		},
	}

	return dr, nil
}

// ─── Observation builder ──────────────────────────────────────────────────────

func (n *Normalizer) buildObservation(
	obx hl7v2.HL7Observation,
	grp hl7v2.HL7ResultGroup,
	msg *hl7v2.HL7Message,
	patientID string,
	groupIdx, obxIdx int,
) (map[string]interface{}, string, error) {

	// Deterministic local ID: accession + group + set id
	setID := obx.SetID
	if setID == "" {
		setID = fmt.Sprintf("%d", obxIdx+1)
	}
	obsID := fmt.Sprintf("%s-g%d-obs%s", grp.FillerOrderNum, groupIdx+1, setID)

	status := ResultStatusToFHIR[obx.ResultStatus]
	if status == "" {
		status = ResultStatusToFHIR[grp.ResultStatus]
	}
	if status == "" {
		status = "final"
	}

	obs := map[string]interface{}{
		"resourceType": "Observation",
		"id":           obsID,
		"status":       status,
		"subject": map[string]interface{}{
			"reference": "Patient/" + patientID,
		},
	}

	// Category
	obs["category"] = []map[string]interface{}{
		{
			"coding": []map[string]interface{}{
				{
					"system":  "http://terminology.hl7.org/CodeSystem/observation-category",
					"code":    "laboratory",
					"display": "Laboratory",
				},
			},
		},
	}

	// Code from OBX-3
	if obx.ObservationID.Code != "" {
		system := FHIRSystem[strings.ToUpper(obx.ObservationID.System)]
		if system == "" {
			system = FHIRSystem["L"]
		}
		obs["code"] = map[string]interface{}{
			"coding": []map[string]interface{}{
				{
					"system":  system,
					"code":    obx.ObservationID.Code,
					"display": obx.ObservationID.Text,
				},
			},
			"text": obx.ObservationID.Text,
		}
	} else {
		obs["code"] = map[string]interface{}{"text": "Unknown lab value"}
	}

	// Value — handle NM (numeric), ST/TX (string), CWE (coded)
	if obx.Value != "" {
		switch strings.ToUpper(obx.ValueType) {
		case "NM":
			// Quantity
			valueMap := map[string]interface{}{
				"value": obx.Value,
			}
			if obx.Units.Code != "" {
				valueMap["unit"] = obx.Units.Text
				valueMap["system"] = UCUMSystem
				valueMap["code"] = obx.Units.Code
			}
			obs["valueQuantity"] = valueMap

		case "CWE", "CE", "CNE":
			// Coded value
			system := FHIRSystem[strings.ToUpper(obx.Value)]
			if system == "" {
				system = FHIRSystem["L"]
			}
			valParts := strings.SplitN(obx.Value, "^", 3)
			code := valParts[0]
			text := ""
			if len(valParts) > 1 {
				text = valParts[1]
			}
			obs["valueCodeableConcept"] = map[string]interface{}{
				"coding": []map[string]interface{}{
					{"system": system, "code": code, "display": text},
				},
				"text": text,
			}

		case "SN":
			// Structured numeric (comparator ^ number)
			snParts := strings.SplitN(obx.Value, "^", 2)
			valueMap := map[string]interface{}{
				"value": snParts[len(snParts)-1],
			}
			if len(snParts) == 2 {
				valueMap["comparator"] = snParts[0]
			}
			if obx.Units.Code != "" {
				valueMap["unit"] = obx.Units.Text
				valueMap["system"] = UCUMSystem
				valueMap["code"] = obx.Units.Code
			}
			obs["valueQuantity"] = valueMap

		default:
			// ST, TX, FT, etc. — string
			obs["valueString"] = obx.Value
		}
	}

	// Reference range → referenceRange[0]
	if obx.ReferenceRange != "" {
		obs["referenceRange"] = []map[string]interface{}{
			{"text": obx.ReferenceRange},
		}
	}

	// Abnormal flag → interpretation
	if obx.AbnormalFlags != "" {
		if interp, ok := ObservationInterpretation[strings.ToUpper(obx.AbnormalFlags)]; ok {
			obs["interpretation"] = []map[string]interface{}{
				{
					"coding": []map[string]interface{}{
						{
							"system":  InterpretationSystem,
							"code":    interp.Code,
							"display": interp.Display,
						},
					},
				},
			}
		}
	}

	// Effective date/time
	dtStr := obx.ObservationDateTime
	if dtStr == "" {
		dtStr = grp.ResultDateTime
	}
	if dtStr == "" {
		dtStr = msg.DateTimeOfMessage
	}
	if t, err := parseHL7DT(dtStr); err == nil {
		obs["effectiveDateTime"] = t.Format(time.RFC3339)
	}

	// Notes
	if len(obx.Notes) > 0 {
		notes := make([]map[string]interface{}, 0, len(obx.Notes))
		for _, note := range obx.Notes {
			notes = append(notes, map[string]interface{}{"text": note})
		}
		obs["note"] = notes
	}

	// Link back to the DiagnosticReport via extension
	if grp.FillerOrderNum != "" {
		obs["extension"] = []map[string]interface{}{
			{
				"url":         "http://terminology.local/fhir/ext/accession-number",
				"valueString": grp.FillerOrderNum,
			},
		}
	}

	return obs, obsID, nil
}

// ─── FHIR DiagnosticReport passthrough ───────────────────────────────────────

// FromFHIR validates and extracts a single DiagnosticReport from a FHIR JSON payload.
// Supports both a bare DiagnosticReport and a Bundle containing one.
func (n *Normalizer) FromFHIR(raw []byte) (*NormalizedResult, error) {
	var envelope map[string]json.RawMessage
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}

	rtRaw, ok := envelope["resourceType"]
	if !ok {
		return nil, fmt.Errorf("missing resourceType")
	}
	var rt string
	_ = json.Unmarshal(rtRaw, &rt)

	result := &NormalizedResult{}

	switch rt {
	case "DiagnosticReport":
		// Collect referenced Observations from "contained" if present
		if containedRaw, ok := envelope["contained"]; ok {
			var contained []json.RawMessage
			_ = json.Unmarshal(containedRaw, &contained)
			for _, c := range contained {
				var res map[string]json.RawMessage
				_ = json.Unmarshal(c, &res)
				if rtb, ok2 := res["resourceType"]; ok2 {
					var rtype string
					_ = json.Unmarshal(rtb, &rtype)
					if rtype == "Observation" {
						result.Observations = append(result.Observations, c)
					}
				}
			}
		}
		result.DiagnosticReports = []json.RawMessage{raw}
		// Extract accession from identifier
		result.AccessionNumber = extractAccessionFromFHIR(envelope)

	case "Bundle":
		var entries []struct {
			Resource json.RawMessage `json:"resource"`
		}
		if entriesRaw, ok := envelope["entry"]; ok {
			_ = json.Unmarshal(entriesRaw, &entries)
		}
		for _, entry := range entries {
			if entry.Resource == nil {
				continue
			}
			var res map[string]json.RawMessage
			_ = json.Unmarshal(entry.Resource, &res)
			rtb, ok2 := res["resourceType"]
			if !ok2 {
				continue
			}
			var rtype string
			_ = json.Unmarshal(rtb, &rtype)
			switch rtype {
			case "DiagnosticReport":
				result.DiagnosticReports = append(result.DiagnosticReports, entry.Resource)
				if result.AccessionNumber == "" {
					result.AccessionNumber = extractAccessionFromFHIR(res)
				}
			case "Observation":
				result.Observations = append(result.Observations, entry.Resource)
			}
		}

	default:
		return nil, fmt.Errorf("expected DiagnosticReport or Bundle, got %q", rt)
	}

	if len(result.DiagnosticReports) == 0 {
		return nil, fmt.Errorf("no DiagnosticReport found in payload")
	}
	return result, nil
}

// ─── Date/time parsing ────────────────────────────────────────────────────────

// parseHL7DT parses HL7 DTM format: YYYYMMDD[HHMMSS[.SSSS]][+/-ZZZZ]
func parseHL7DT(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	// Strip timezone offset for simple parsing
	for _, sep := range []string{"+", "-"} {
		if idx := strings.LastIndex(s, sep); idx > 8 {
			s = s[:idx]
		}
	}

	formats := []string{
		"20060102150405.0000",
		"20060102150405",
		"200601021504",
		"2006010215",
		"20060102",
	}
	for _, f := range formats {
		if len(s) == len(f) {
			if t, err := time.ParseInLocation(f, s, time.UTC); err == nil {
				return t, nil
			}
		}
	}
	// Try prefix match
	for _, f := range formats {
		if len(s) >= len(f) {
			if t, err := time.ParseInLocation(f, s[:len(f)], time.UTC); err == nil {
				return t, nil
			}
		}
	}
	return time.Time{}, fmt.Errorf("cannot parse HL7 datetime: %q", s)
}

func extractAccessionFromFHIR(obj map[string]json.RawMessage) string {
	idRaw, ok := obj["identifier"]
	if !ok {
		return ""
	}
	var ids []struct {
		Value string `json:"value"`
		Type  struct {
			Coding []struct {
				Code string `json:"code"`
			} `json:"coding"`
		} `json:"type"`
	}
	if err := json.Unmarshal(idRaw, &ids); err != nil {
		return ""
	}
	for _, id := range ids {
		for _, c := range id.Type.Coding {
			if c.Code == "FILL" || c.Code == "ACSN" {
				return id.Value
			}
		}
	}
	if len(ids) > 0 {
		return ids[0].Value
	}
	return ""
}
