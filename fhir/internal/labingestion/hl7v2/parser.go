// Package hl7v2 parses HL7 v2 ORU^R01 messages (lab results).
//
// Supports v2.3, v2.3.1, v2.4, v2.5, v2.5.1 — the versions used by
// LifeLabs, Dynacare, OLIS, and direct instrument interfaces.
//
// The parser is intentionally lenient: missing optional segments are silently
// skipped; unexpected segments are ignored. This matches real-world HL7 v2
// messages which routinely deviate from the spec.
package hl7v2

import (
	"fmt"
	"strings"
)

// ParseORU parses a raw HL7 v2 ORU^R01 message string.
// The message may use \r, \n, or \r\n as segment terminators.
// Returns a populated HL7Message or an error.
func ParseORU(raw string) (*HL7Message, error) {
	// Normalise line endings → \r
	raw = strings.ReplaceAll(raw, "\r\n", "\r")
	raw = strings.ReplaceAll(raw, "\n", "\r")
	raw = strings.TrimSpace(raw)

	segments := strings.Split(raw, "\r")

	if len(segments) == 0 {
		return nil, fmt.Errorf("empty HL7 message")
	}

	// The first segment must be MSH
	if !strings.HasPrefix(segments[0], "MSH") {
		return nil, fmt.Errorf("message does not begin with MSH: %q", segments[0][:min(20, len(segments[0]))])
	}

	// Derive the field separator from MSH-1 and the encoding chars from MSH-2
	if len(segments[0]) < 8 {
		return nil, fmt.Errorf("MSH segment too short")
	}
	fieldSep := rune(segments[0][3])
	compSep := rune(segments[0][4])  // component separator (usually ^)
	// subCompSep := rune(segments[0][7]) // sub-component sep (usually &) — rarely needed

	split := func(seg string) []string {
		return strings.Split(seg, string(fieldSep))
	}
	comp := func(field string) []string {
		return strings.Split(field, string(compSep))
	}

	msg := &HL7Message{}

	var currentGroup *HL7ResultGroup
	var lastOBXIdx int // index of last OBX in current group, for NTE attachment

	for segIdx, seg := range segments {
		if len(seg) < 3 {
			continue
		}
		segID := seg[:3]
		fields := split(seg)

		switch segID {

		// ── MSH — Message Header ──────────────────────────────────────────────
		case "MSH":
			// MSH field indices are 1-based but the separator char IS field 1
			// so MSH[1] = field sep, MSH[2] = encoding chars, MSH[3] = sending app...
			msg.SendingApplication = fieldVal(fields, 3)
			msg.SendingFacility = fieldVal(fields, 4)
			msg.ReceivingApp = fieldVal(fields, 5)
			msg.DateTimeOfMessage = comp(fieldVal(fields, 7))[0]
			msg.MessageControlID = fieldVal(fields, 10)
			msg.HL7Version = fieldVal(fields, 12)

		// ── PID — Patient Identification ─────────────────────────────────────
		case "PID":
			// PID-3: patient identifier list (can repeat with ~)
			pidList := fieldVal(fields, 3)
			for _, cx := range strings.Split(pidList, "~") {
				parts := comp(cx)
				id := HL7Identifier{
					ID:                 compIdx(parts, 0),
					AssigningAuthority: compIdx(parts, 3),
					IDType:             compIdx(parts, 4),
				}
				if id.ID != "" {
					msg.Patient.InternalIDs = append(msg.Patient.InternalIDs, id)
				}
			}

			// PID-5: patient name (family^given^...)
			nameParts := comp(fieldVal(fields, 5))
			msg.Patient.FamilyName = compIdx(nameParts, 0)
			msg.Patient.GivenName = compIdx(nameParts, 1)

			// PID-7: date of birth
			msg.Patient.DateOfBirth = comp(fieldVal(fields, 7))[0]

			// PID-8: gender
			msg.Patient.Gender = fieldVal(fields, 8)

			// PID-11: address (street^other^city^province^postalcode^country)
			addrParts := comp(fieldVal(fields, 11))
			msg.Patient.StreetAddress = compIdx(addrParts, 0)
			msg.Patient.City = compIdx(addrParts, 2)
			msg.Patient.Province = compIdx(addrParts, 3)
			msg.Patient.PostalCode = compIdx(addrParts, 4)

			// PID-13: phone
			msg.Patient.PhoneHome = comp(fieldVal(fields, 13))[0]

			// PID-18: account number
			msg.Patient.AccountNumber = comp(fieldVal(fields, 18))[0]

			// PID-19: Ontario Health Card Number (OHIP)
			msg.Patient.OHIPNumber = fieldVal(fields, 19)

		// ── PV1 — Patient Visit ───────────────────────────────────────────────
		case "PV1":
			v := &HL7Visit{}
			v.PatientClass = fieldVal(fields, 2)
			v.AssignedLocation = comp(fieldVal(fields, 3))[0]
			// PV1-7: attending doctor (ID^family^given^...)
			attParts := comp(fieldVal(fields, 7))
			if len(attParts) >= 3 {
				v.AttendingDoctor = attParts[2] + " " + attParts[1]
			} else {
				v.AttendingDoctor = compIdx(attParts, 0)
			}
			v.VisitNumber = comp(fieldVal(fields, 19))[0]
			msg.Visit = v

		// ── ORC — Common Order ────────────────────────────────────────────────
		case "ORC":
			// Start a new result group
			g := HL7ResultGroup{}
			g.OrderControl = fieldVal(fields, 1)
			g.PlacerOrderNum = comp(fieldVal(fields, 2))[0]
			g.FillerOrderNum = comp(fieldVal(fields, 3))[0]
			msg.ResultGroups = append(msg.ResultGroups, g)
			currentGroup = &msg.ResultGroups[len(msg.ResultGroups)-1]
			lastOBXIdx = -1

		// ── OBR — Observation Request ─────────────────────────────────────────
		case "OBR":
			// If no preceding ORC, start a new group
			if currentGroup == nil || currentGroup.SetID != "" {
				msg.ResultGroups = append(msg.ResultGroups, HL7ResultGroup{})
				currentGroup = &msg.ResultGroups[len(msg.ResultGroups)-1]
				lastOBXIdx = -1
			}
			currentGroup.SetID = fieldVal(fields, 1)
			// OBR-2: placer order number
			if currentGroup.PlacerOrderNum == "" {
				currentGroup.PlacerOrderNum = comp(fieldVal(fields, 2))[0]
			}
			// OBR-3: filler order number (accession number)
			if currentGroup.FillerOrderNum == "" {
				currentGroup.FillerOrderNum = comp(fieldVal(fields, 3))[0]
			}
			// OBR-4: universal service identifier
			currentGroup.UniversalServiceID = parseCWE(comp(fieldVal(fields, 4)))
			// OBR-6: requested date/time
			currentGroup.RequestedDateTime = comp(fieldVal(fields, 6))[0]
			// OBR-14: specimen received date/time
			currentGroup.SpecimenReceived = comp(fieldVal(fields, 14))[0]
			// OBR-15: specimen source
			currentGroup.SpecimenSource = comp(fieldVal(fields, 15))[0]
			// OBR-16: ordering provider
			provParts := comp(fieldVal(fields, 16))
			if len(provParts) >= 3 {
				currentGroup.OrderingProvider = provParts[2] + " " + provParts[1]
			} else {
				currentGroup.OrderingProvider = compIdx(provParts, 0)
			}
			// OBR-22: results reported date/time
			currentGroup.ResultDateTime = comp(fieldVal(fields, 22))[0]
			// OBR-25: result status
			currentGroup.ResultStatus = fieldVal(fields, 25)

		// ── OBX — Observation Result ──────────────────────────────────────────
		case "OBX":
			if currentGroup == nil {
				// Orphan OBX — create a group
				msg.ResultGroups = append(msg.ResultGroups, HL7ResultGroup{})
				currentGroup = &msg.ResultGroups[len(msg.ResultGroups)-1]
			}
			obs := HL7Observation{}
			obs.SetID = fieldVal(fields, 1)
			obs.ValueType = fieldVal(fields, 2)
			obs.ObservationID = parseCWE(comp(fieldVal(fields, 3)))
			obs.SubID = fieldVal(fields, 4)
			obs.Value = fieldVal(fields, 5)
			obs.Units = parseCWE(comp(fieldVal(fields, 6)))
			obs.ReferenceRange = fieldVal(fields, 7)
			obs.AbnormalFlags = fieldVal(fields, 8)
			obs.ResultStatus = fieldVal(fields, 11)
			obs.ObservationDateTime = comp(fieldVal(fields, 14))[0]

			currentGroup.Observations = append(currentGroup.Observations, obs)
			lastOBXIdx = len(currentGroup.Observations) - 1

		// ── NTE — Notes and Comments ──────────────────────────────────────────
		case "NTE":
			noteText := fieldVal(fields, 3)
			if noteText == "" {
				_ = segIdx // keep segIdx used
				continue
			}
			if currentGroup == nil {
				continue
			}
			if lastOBXIdx >= 0 && lastOBXIdx < len(currentGroup.Observations) {
				// Attach to the preceding OBX
				currentGroup.Observations[lastOBXIdx].Notes = append(
					currentGroup.Observations[lastOBXIdx].Notes, noteText)
			} else {
				// Attach to the OBR (report-level note)
				currentGroup.Notes = append(currentGroup.Notes, noteText)
			}
		}
	}

	if len(msg.ResultGroups) == 0 {
		return nil, fmt.Errorf("no OBR/OBX segments found in message")
	}

	return msg, nil
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

// fieldVal returns fields[i] safely, or "" if out of bounds.
// HL7 fields are 1-based; MSH is special (field 1 is the separator char itself).
func fieldVal(fields []string, i int) string {
	if i >= len(fields) {
		return ""
	}
	return strings.TrimSpace(fields[i])
}

// compIdx returns components[i] safely.
func compIdx(parts []string, i int) string {
	if i >= len(parts) {
		return ""
	}
	return strings.TrimSpace(parts[i])
}

// parseCWE builds an HL7CodedValue from a component slice.
// CWE: code ^ text ^ nameOfCodingSystem ^ altCode ^ altText ^ altCodingSystem
func parseCWE(parts []string) HL7CodedValue {
	return HL7CodedValue{
		Code:      compIdx(parts, 0),
		Text:      compIdx(parts, 1),
		System:    compIdx(parts, 2),
		AltCode:   compIdx(parts, 3),
		AltText:   compIdx(parts, 4),
		AltSystem: compIdx(parts, 5),
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// ─── ACK builder ─────────────────────────────────────────────────────────────

// AckCode is the HL7 acknowledgment code.
type AckCode string

const (
	AckAA AckCode = "AA" // Application Accept
	AckAE AckCode = "AE" // Application Error
	AckAR AckCode = "AR" // Application Reject
)

// BuildACK constructs an MSH+MSA HL7 v2 ACK message in response to msg.
// textMessage is included in MSA-3 for AE/AR responses.
func BuildACK(msg *HL7Message, code AckCode, textMessage string) string {
	now := strings.ReplaceAll(strings.ReplaceAll(
		// Format: YYYYMMDDHHMMSS
		fmt.Sprintf("%s", msg.DateTimeOfMessage), "-", ""), ":", "")
	if len(now) == 0 {
		now = "20260101000000"
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("MSH|^~\\&|FHIR_SERVER|CARDIOLOGY|%s|%s|%s||ACK^R01|ACK%s|P|%s\r",
		msg.SendingApplication,
		msg.SendingFacility,
		now,
		msg.MessageControlID,
		msg.HL7Version,
	))
	sb.WriteString(fmt.Sprintf("MSA|%s|%s|%s\r",
		string(code),
		msg.MessageControlID,
		textMessage,
	))
	return sb.String()
}
