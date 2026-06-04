// Package fhirsearch provides FHIR R4 search parameter extraction and querying.
// Search parameters are stored in fhir_search_params and populated on every
// create/update. Queries translate FHIR _search URL params into SQL.
package fhirsearch

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"healthcareworkspace/fhir/internal/tenant"
)

// Searcher handles FHIR search parameter indexing and querying.
type Searcher struct {
	db *pgxpool.Pool
}

// New creates a Searcher backed by the given pool.
func New(db *pgxpool.Pool) *Searcher {
	return &Searcher{db: db}
}

// SearchResult holds one page of search results.
type SearchResult struct {
	Total     int
	Resources []json.RawMessage
}

// ─── Indexing ─────────────────────────────────────────────────────────────────

// Index extracts and stores search parameters for a resource after create/update.
// Existing params for the resource are replaced atomically within its own transaction.
// If data is nil (e.g. after delete), only the DELETE is performed.
func (s *Searcher) Index(ctx context.Context, resourceType, fhirID string, data json.RawMessage) error {
	tenantID := tenant.FromContext(ctx)
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin index tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	// Remove stale index entries for this tenant
	_, err = tx.Exec(ctx,
		`DELETE FROM fhir_search_params WHERE tenant_id=$1 AND resource_type=$2 AND fhir_id=$3`,
		tenantID, resourceType, fhirID)
	if err != nil {
		return fmt.Errorf("clear search params: %w", err)
	}

	if data != nil {
		params := extractParams(resourceType, data)
		for _, p := range params {
			_, err = tx.Exec(ctx,
				`INSERT INTO fhir_search_params
				 (tenant_id, resource_type, fhir_id, param_name, param_type, value_string, value_system, value_date, value_number)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
				tenantID, resourceType, fhirID,
				p.Name, p.Type,
				p.ValueString, p.ValueSystem, p.ValueDate, p.ValueNumber,
			)
			if err != nil {
				return fmt.Errorf("insert search param %q: %w", p.Name, err)
			}
		}
	}
	return tx.Commit(ctx)
}

// ─── Querying ─────────────────────────────────────────────────────────────────

// Search runs a FHIR search query given URL query params.
// Supported: _count, _offset, any indexed param name (token/string/date).
func (s *Searcher) Search(ctx context.Context, resourceType string, query url.Values) (*SearchResult, error) {
	tenantID := tenant.FromContext(ctx)
	count := 20
	offset := 0

	conditions := []string{"r.resource_type = $1", "r.is_deleted = false", "r.tenant_id = $2"}
	args := []interface{}{resourceType, tenantID}
	argIdx := 3

	joins := []string{}
	joinIdx := 0

	for key, vals := range query {
		val := vals[0]
		switch key {
		case "_count":
			fmt.Sscanf(val, "%d", &count)
			if count > 100 {
				count = 100
			}
		case "_offset":
			fmt.Sscanf(val, "%d", &offset)
		case "_sort", "_include", "_revinclude", "_summary":
			// TODO: implement
		default:
			// Treat as a search parameter name
			joinIdx++
			alias := fmt.Sprintf("sp%d", joinIdx)
			joins = append(joins,
				fmt.Sprintf(`JOIN fhir_search_params %s ON %s.tenant_id=r.tenant_id AND %s.resource_type=r.resource_type AND %s.fhir_id=r.fhir_id AND %s.param_name=$%d`,
					alias, alias, alias, alias, alias, argIdx))
			args = append(args, key)
			argIdx++

			// System|code token splitting
			if strings.Contains(val, "|") {
				parts := strings.SplitN(val, "|", 2)
				conditions = append(conditions,
					fmt.Sprintf(`(%s.value_system=$%d AND %s.value_string=$%d)`, alias, argIdx, alias, argIdx+1))
				args = append(args, parts[0], parts[1])
				argIdx += 2
			} else {
				conditions = append(conditions,
					fmt.Sprintf(`%s.value_string=$%d`, alias, argIdx))
				args = append(args, val)
				argIdx++
			}
		}
	}

	joinSQL := strings.Join(joins, " ")
	whereSQL := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(
		`SELECT COUNT(DISTINCT r.fhir_id) FROM fhir_resources r %s WHERE %s`,
		joinSQL, whereSQL)

	var total int
	if err := s.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count query: %w", err)
	}

	dataArgs := append(args, count, offset)
	// Wrap in a subquery so ORDER BY last_updated works with DISTINCT data
	dataQuery := fmt.Sprintf(
		`SELECT data FROM (
		   SELECT DISTINCT ON (r.fhir_id) r.data, r.last_updated
		   FROM fhir_resources r %s WHERE %s
		   ORDER BY r.fhir_id, r.last_updated DESC
		 ) sub
		 ORDER BY last_updated DESC LIMIT $%d OFFSET $%d`,
		joinSQL, whereSQL, argIdx, argIdx+1)

	rows, err := s.db.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, fmt.Errorf("search query: %w", err)
	}
	defer rows.Close()

	var resources []json.RawMessage
	for rows.Next() {
		var raw json.RawMessage
		if err := rows.Scan(&raw); err != nil {
			return nil, fmt.Errorf("scan search row: %w", err)
		}
		resources = append(resources, raw)
	}

	return &SearchResult{Total: total, Resources: resources}, rows.Err()
}

// ─── Parameter extraction ─────────────────────────────────────────────────────

type param struct {
	Name        string
	Type        string
	ValueString string
	ValueSystem *string
	ValueDate   *time.Time
	ValueNumber *float64
}

// extractParams is a resource-type-aware extractor for common FHIR R4 params.
// Add cases here to support additional resource types / params.
func extractParams(resourceType string, data json.RawMessage) []param {
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(data, &obj); err != nil {
		return nil
	}

	var params []param

	// ── Common params (all resource types) ──
	params = append(params, extractIdentifiers(obj)...)
	if last := jsonString(obj, "lastUpdated"); last != "" {
		if t, err := time.Parse(time.RFC3339, last); err == nil {
			params = append(params, param{Name: "_lastUpdated", Type: "date", ValueDate: &t})
		}
	}

	// ── Resource-type-specific params ──
	switch resourceType {
	case "Patient":
		params = append(params, extractHumanNames(obj, "name")...)
		params = append(params, extractDate(obj, "birthDate", "birthdate")...)
		params = append(params, extractTokenFromField(obj, "gender", "gender")...)
		params = append(params, extractTelecom(obj)...)

	case "Practitioner":
		params = append(params, extractHumanNames(obj, "name")...)
		params = append(params, extractTokenFromField(obj, "gender", "gender")...)

	case "Encounter":
		params = append(params, extractTokenFromCoding(obj, "status", "status")...)
		params = append(params, extractReference(obj, "subject", "patient")...)
		params = append(params, extractReference(obj, "participant", "participant")...)

	case "Observation":
		params = append(params, extractCodeableConcept(obj, "code", "code")...)
		params = append(params, extractReference(obj, "subject", "patient")...)
		params = append(params, extractTokenFromField(obj, "status", "status")...)

	case "MedicationRequest":
		params = append(params, extractReference(obj, "subject", "patient")...)
		params = append(params, extractTokenFromField(obj, "status", "status")...)

	case "Condition":
		params = append(params, extractCodeableConcept(obj, "code", "code")...)
		params = append(params, extractReference(obj, "subject", "patient")...)

	case "Organization":
		params = append(params, extractStringParam(obj, "name", "name")...)
		params = append(params, extractTokenFromField(obj, "type", "type")...)

	// ── PharmacyMS ──────────────────────────────────────────────────────────
	case "Medication":
		params = append(params, extractCodeableConcept(obj, "code", "code")...)
		params = append(params, extractStringParam(obj, "form", "form")...)
		params = append(params, extractTokenFromField(obj, "status", "status")...)

	case "MedicationDispense":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractReference(obj, "subject", "patient")...)
		params = append(params, extractReference(obj, "medicationReference", "medication")...)

	case "MedicationAdministration":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractReference(obj, "subject", "patient")...)
		params = append(params, extractReference(obj, "medicationReference", "medication")...)

	case "MedicationKnowledge":
		params = append(params, extractCodeableConcept(obj, "code", "code")...)
		params = append(params, extractTokenFromField(obj, "status", "status")...)

	case "Coverage":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractReference(obj, "subscriber", "subscriber")...)
		params = append(params, extractReference(obj, "beneficiary", "patient")...)
		params = append(params, extractReference(obj, "payor", "payor")...)

	case "Claim":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractReference(obj, "patient", "patient")...)
		params = append(params, extractTokenFromField(obj, "use", "use")...)

	case "ClaimResponse":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractReference(obj, "patient", "patient")...)

	case "ExplanationOfBenefit":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractReference(obj, "patient", "patient")...)

	case "RelatedPerson":
		params = append(params, extractReference(obj, "patient", "patient")...)
		params = append(params, extractHumanNames(obj, "name")...)
		params = append(params, extractCodeableConcept(obj, "relationship", "relationship")...)

	// ── LIMS ─────────────────────────────────────────────────────────────────
	case "Specimen":
		params = append(params, extractReference(obj, "subject", "patient")...)
		params = append(params, extractCodeableConcept(obj, "type", "type")...)
		params = append(params, extractTokenFromField(obj, "status", "status")...)

	case "ObservationDefinition":
		params = append(params, extractCodeableConcept(obj, "code", "code")...)
		params = append(params, extractCodeableConcept(obj, "category", "category")...)

	case "BodyStructure":
		params = append(params, extractReference(obj, "patient", "patient")...)
		params = append(params, extractCodeableConcept(obj, "morphology", "morphology")...)
		params = append(params, extractCodeableConcept(obj, "location", "location")...)

	case "Task":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractReference(obj, "owner", "owner")...)
		params = append(params, extractReference(obj, "requester", "requester")...)
		params = append(params, extractReference(obj, "focus", "focus")...)

	case "PlanDefinition":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractStringParam(obj, "title", "title")...)

	case "ActivityDefinition":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractStringParam(obj, "title", "title")...)

	// ── EHR Hospital ─────────────────────────────────────────────────────────
	case "PractitionerRole":
		params = append(params, extractReference(obj, "practitioner", "practitioner")...)
		params = append(params, extractReference(obj, "organization", "organization")...)
		params = append(params, extractCodeableConcept(obj, "specialty", "specialty")...)

	case "Location":
		params = append(params, extractStringParam(obj, "name", "name")...)
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractCodeableConcept(obj, "type", "type")...)

	case "CareTeam":
		params = append(params, extractReference(obj, "subject", "patient")...)
		params = append(params, extractTokenFromField(obj, "status", "status")...)

	case "Goal":
		params = append(params, extractReference(obj, "subject", "patient")...)
		params = append(params, extractTokenFromField(obj, "lifecycleStatus", "lifecycle-status")...)

	case "Composition":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractReference(obj, "subject", "subject")...)
		params = append(params, extractCodeableConcept(obj, "type", "type")...)

	case "DocumentReference":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractReference(obj, "subject", "subject")...)
		params = append(params, extractCodeableConcept(obj, "type", "type")...)

	case "Account":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractAccountPatient(obj)...)

	case "ChargeItem":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractReference(obj, "subject", "patient")...)
		params = append(params, extractCodeableConcept(obj, "code", "code")...)

	case "EpisodeOfCare":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractReference(obj, "patient", "patient")...)

	case "Flag":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractReference(obj, "subject", "patient")...)

	// ── EHR Practice Management ───────────────────────────────────────────────
	case "Appointment":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractCodeableConcept(obj, "serviceType", "service-type")...)
		params = append(params, extractAppointmentParticipants(obj)...)

	case "AppointmentResponse":
		params = append(params, extractReference(obj, "appointment", "appointment")...)
		params = append(params, extractReference(obj, "actor", "actor")...)
		params = append(params, extractTokenFromField(obj, "participantStatus", "participation-status")...)

	case "Schedule":
		params = append(params, extractCodeableConcept(obj, "serviceType", "service-type")...)
		params = append(params, extractScheduleActors(obj)...)

	case "Slot":
		params = append(params, extractReference(obj, "schedule", "schedule")...)
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractCodeableConcept(obj, "serviceType", "service-type")...)

	case "Communication":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractReference(obj, "subject", "patient")...)
		params = append(params, extractReference(obj, "sender", "sender")...)

	case "Questionnaire":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractStringParam(obj, "title", "title")...)
		params = append(params, extractTokenFromField(obj, "url", "url")...)

	case "QuestionnaireResponse":
		params = append(params, extractTokenFromField(obj, "status", "status")...)
		params = append(params, extractTokenFromField(obj, "questionnaire", "questionnaire")...)
		params = append(params, extractReference(obj, "subject", "patient")...)
	}

	return params
}

// ─── Field extractors ────────────────────────────────────────────────────────

func extractIdentifiers(obj map[string]json.RawMessage) []param {
	raw, ok := obj["identifier"]
	if !ok {
		return nil
	}
	var ids []struct {
		System string `json:"system"`
		Value  string `json:"value"`
	}
	if err := json.Unmarshal(raw, &ids); err != nil {
		return nil
	}
	var out []param
	for _, id := range ids {
		sys := id.System
		out = append(out, param{
			Name:        "identifier",
			Type:        "token",
			ValueString: id.Value,
			ValueSystem: &sys,
		})
	}
	return out
}

func extractHumanNames(obj map[string]json.RawMessage, field string) []param {
	raw, ok := obj[field]
	if !ok {
		return nil
	}
	var names []struct {
		Family string   `json:"family"`
		Given  []string `json:"given"`
	}
	if err := json.Unmarshal(raw, &names); err != nil {
		return nil
	}
	var out []param
	for _, n := range names {
		if n.Family != "" {
			out = append(out, param{Name: "family", Type: "string", ValueString: strings.ToLower(n.Family)})
		}
		for _, g := range n.Given {
			out = append(out, param{Name: "given", Type: "string", ValueString: strings.ToLower(g)})
		}
	}
	return out
}

func extractDate(obj map[string]json.RawMessage, jsonField, paramName string) []param {
	s := jsonString(obj, jsonField)
	if s == "" {
		return nil
	}
	// Try date-only then datetime
	for _, layout := range []string{"2006-01-02", time.RFC3339} {
		if t, err := time.Parse(layout, s); err == nil {
			return []param{{Name: paramName, Type: "date", ValueDate: &t}}
		}
	}
	return nil
}

func extractTokenFromField(obj map[string]json.RawMessage, jsonField, paramName string) []param {
	s := jsonString(obj, jsonField)
	if s == "" {
		return nil
	}
	return []param{{Name: paramName, Type: "token", ValueString: s}}
}

func extractTokenFromCoding(obj map[string]json.RawMessage, jsonField, paramName string) []param {
	return extractTokenFromField(obj, jsonField, paramName)
}

func extractCodeableConcept(obj map[string]json.RawMessage, jsonField, paramName string) []param {
	raw, ok := obj[jsonField]
	if !ok {
		return nil
	}
	var cc struct {
		Coding []struct {
			System string `json:"system"`
			Code   string `json:"code"`
		} `json:"coding"`
	}
	if err := json.Unmarshal(raw, &cc); err != nil {
		return nil
	}
	var out []param
	for _, c := range cc.Coding {
		sys := c.System
		out = append(out, param{
			Name:        paramName,
			Type:        "token",
			ValueString: c.Code,
			ValueSystem: &sys,
		})
	}
	return out
}

func extractReference(obj map[string]json.RawMessage, jsonField, paramName string) []param {
	raw, ok := obj[jsonField]
	if !ok {
		return nil
	}
	var ref struct {
		Reference string `json:"reference"`
	}
	if err := json.Unmarshal(raw, &ref); err != nil {
		return nil
	}
	if ref.Reference == "" {
		return nil
	}
	return []param{{Name: paramName, Type: "reference", ValueString: ref.Reference}}
}

func extractStringParam(obj map[string]json.RawMessage, jsonField, paramName string) []param {
	s := jsonString(obj, jsonField)
	if s == "" {
		return nil
	}
	return []param{{Name: paramName, Type: "string", ValueString: strings.ToLower(s)}}
}

func extractTelecom(obj map[string]json.RawMessage) []param {
	raw, ok := obj["telecom"]
	if !ok {
		return nil
	}
	var items []struct {
		System string `json:"system"`
		Value  string `json:"value"`
	}
	if err := json.Unmarshal(raw, &items); err != nil {
		return nil
	}
	var out []param
	for _, t := range items {
		sys := t.System
		out = append(out, param{
			Name:        "telecom",
			Type:        "token",
			ValueString: t.Value,
			ValueSystem: &sys,
		})
	}
	return out
}

// jsonString safely extracts a string field from a raw JSON object map.
func jsonString(obj map[string]json.RawMessage, key string) string {
	raw, ok := obj[key]
	if !ok {
		return ""
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return ""
	}
	return s
}

// extractAccountPatient handles Account.subject (array of references).
func extractAccountPatient(obj map[string]json.RawMessage) []param {
	raw, ok := obj["subject"]
	if !ok {
		return nil
	}
	var refs []struct {
		Reference string `json:"reference"`
	}
	if err := json.Unmarshal(raw, &refs); err != nil {
		return nil
	}
	var out []param
	for _, r := range refs {
		if r.Reference != "" {
			out = append(out, param{Name: "patient", Type: "reference", ValueString: r.Reference})
		}
	}
	return out
}

// extractAppointmentParticipants indexes each participant.actor reference
// as a "patient" or "practitioner" param based on the reference prefix.
func extractAppointmentParticipants(obj map[string]json.RawMessage) []param {
	raw, ok := obj["participant"]
	if !ok {
		return nil
	}
	var participants []struct {
		Actor struct {
			Reference string `json:"reference"`
		} `json:"actor"`
	}
	if err := json.Unmarshal(raw, &participants); err != nil {
		return nil
	}
	var out []param
	for _, p := range participants {
		ref := p.Actor.Reference
		if ref == "" {
			continue
		}
		name := "actor"
		if strings.HasPrefix(ref, "Patient/") {
			name = "patient"
		} else if strings.HasPrefix(ref, "Practitioner/") {
			name = "practitioner"
		}
		out = append(out, param{Name: name, Type: "reference", ValueString: ref})
	}
	return out
}

// extractScheduleActors indexes Schedule.actor (array of references).
func extractScheduleActors(obj map[string]json.RawMessage) []param {
	raw, ok := obj["actor"]
	if !ok {
		return nil
	}
	var actors []struct {
		Reference string `json:"reference"`
	}
	if err := json.Unmarshal(raw, &actors); err != nil {
		return nil
	}
	var out []param
	for _, a := range actors {
		if a.Reference != "" {
			out = append(out, param{Name: "actor", Type: "reference", ValueString: a.Reference})
		}
	}
	return out
}
