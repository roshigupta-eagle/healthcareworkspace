// Package fhirhandler provides FHIR R4 REST API HTTP handlers.
// Routes follow the FHIR R4 REST specification:
//
//	GET    /fhir/R4/{type}/{id}             → read
//	GET    /fhir/R4/{type}/{id}/_history    → history
//	GET    /fhir/R4/{type}/{id}/_history/{vid} → vread
//	POST   /fhir/R4/{type}                  → create
//	PUT    /fhir/R4/{type}/{id}             → update
//	DELETE /fhir/R4/{type}/{id}             → delete
//	GET    /fhir/R4/{type}                  → search
//	GET    /fhir/R4/metadata                → capabilities
package fhirhandler

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"healthcareworkspace/fhir/internal/fhirsearch"
	"healthcareworkspace/fhir/internal/fhirstore"
)

// Handler holds dependencies for all FHIR REST handlers.
type Handler struct {
	store    *fhirstore.Store
	searcher *fhirsearch.Searcher
}

// New creates a Handler.
func New(store *fhirstore.Store, searcher *fhirsearch.Searcher) *Handler {
	return &Handler{store: store, searcher: searcher}
}

// ─── Read ─────────────────────────────────────────────────────────────────────

func (h *Handler) Read(w http.ResponseWriter, r *http.Request) {
	rt := chi.URLParam(r, "resourceType")
	id := chi.URLParam(r, "id")

	res, err := h.store.Read(r.Context(), rt, id)
	if err != nil {
		writeError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/fhir+json")
	w.Header().Set("ETag", versionETag(res.VersionID))
	w.Header().Set("Last-Modified", res.LastUpdated.Format(http.TimeFormat))
	w.WriteHeader(http.StatusOK)
	w.Write(res.Data) //nolint:errcheck
}

// ─── VRead ────────────────────────────────────────────────────────────────────

func (h *Handler) VRead(w http.ResponseWriter, r *http.Request) {
	rt := chi.URLParam(r, "resourceType")
	id := chi.URLParam(r, "id")
	vidStr := chi.URLParam(r, "vid")

	vid, err := strconv.ParseInt(vidStr, 10, 64)
	if err != nil {
		writeOutcome(w, http.StatusBadRequest, "invalid", "Invalid version id: "+vidStr)
		return
	}

	res, err := h.store.ReadVersion(r.Context(), rt, id, vid)
	if err != nil {
		writeError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/fhir+json")
	w.Header().Set("ETag", versionETag(res.VersionID))
	w.WriteHeader(http.StatusOK)
	w.Write(res.Data) //nolint:errcheck
}

// ─── Create ───────────────────────────────────────────────────────────────────

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	rt := chi.URLParam(r, "resourceType")

	body, err := io.ReadAll(io.LimitReader(r.Body, 10<<20)) // 10 MB limit
	if err != nil {
		writeOutcome(w, http.StatusBadRequest, "invalid", "Could not read request body")
		return
	}
	if !json.Valid(body) {
		writeOutcome(w, http.StatusBadRequest, "invalid", "Request body is not valid JSON")
		return
	}

	res, err := h.store.Create(r.Context(), rt, body)
	if err != nil {
		slog.Error("create resource", "resourceType", rt, "error", err)
		writeOutcome(w, http.StatusInternalServerError, "exception", "Internal server error")
		return
	}

	fhirID := extractFHIRID(res.Data)
	if err := h.searcher.Index(r.Context(), rt, fhirID, res.Data); err != nil {
		slog.Error("index resource", "resourceType", rt, "id", fhirID, "error", err)
	}

	w.Header().Set("Content-Type", "application/fhir+json")
	w.Header().Set("Location", "/fhir/R4/"+rt+"/"+fhirID)
	w.Header().Set("ETag", versionETag(res.VersionID))
	w.WriteHeader(http.StatusCreated)
	w.Write(res.Data) //nolint:errcheck
}

// ─── Update ───────────────────────────────────────────────────────────────────

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	rt := chi.URLParam(r, "resourceType")
	id := chi.URLParam(r, "id")

	body, err := io.ReadAll(io.LimitReader(r.Body, 10<<20))
	if err != nil {
		writeOutcome(w, http.StatusBadRequest, "invalid", "Could not read request body")
		return
	}
	if !json.Valid(body) {
		writeOutcome(w, http.StatusBadRequest, "invalid", "Request body is not valid JSON")
		return
	}

	res, err := h.store.Update(r.Context(), rt, id, body)
	if err != nil {
		if errors.Is(err, fhirstore.ErrNotFound) {
			// FHIR allows conditional create via PUT — create if not found
			res, err = h.store.Create(r.Context(), rt, body)
			if err != nil {
				slog.Error("upsert resource", "resourceType", rt, "id", id, "error", err)
				writeOutcome(w, http.StatusInternalServerError, "exception", "Internal server error")
				return
			}
			fhirID := extractFHIRID(res.Data)
			if err := h.searcher.Index(r.Context(), rt, fhirID, res.Data); err != nil {
				slog.Error("index resource", "resourceType", rt, "id", fhirID, "error", err)
			}
			w.Header().Set("Content-Type", "application/fhir+json")
			w.Header().Set("ETag", versionETag(res.VersionID))
			w.WriteHeader(http.StatusCreated)
			w.Write(res.Data) //nolint:errcheck
			return
		}
		slog.Error("update resource", "resourceType", rt, "id", id, "error", err)
		writeOutcome(w, http.StatusInternalServerError, "exception", "Internal server error")
		return
	}

	fhirID := extractFHIRID(res.Data)
	if err := h.searcher.Index(r.Context(), rt, fhirID, res.Data); err != nil {
		slog.Error("index resource", "resourceType", rt, "id", fhirID, "error", err)
	}

	w.Header().Set("Content-Type", "application/fhir+json")
	w.Header().Set("ETag", versionETag(res.VersionID))
	w.WriteHeader(http.StatusOK)
	w.Write(res.Data) //nolint:errcheck
}

// ─── Delete ───────────────────────────────────────────────────────────────────

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	rt := chi.URLParam(r, "resourceType")
	id := chi.URLParam(r, "id")

	if err := h.store.Delete(r.Context(), rt, id); err != nil {
		writeError(w, err)
		return
	}
	// Remove stale search index entries for deleted resource
	if err := h.searcher.Index(r.Context(), rt, id, nil); err != nil {
		slog.Error("clear index on delete", "resourceType", rt, "id", id, "error", err)
	}
	w.WriteHeader(http.StatusNoContent)
}

// ─── History ──────────────────────────────────────────────────────────────────

func (h *Handler) History(w http.ResponseWriter, r *http.Request) {
	rt := chi.URLParam(r, "resourceType")
	id := chi.URLParam(r, "id")

	versions, err := h.store.History(r.Context(), rt, id)
	if err != nil {
		writeError(w, err)
		return
	}

	entries := make([]interface{}, 0, len(versions))
	for _, v := range versions {
		entries = append(entries, map[string]interface{}{
			"fullUrl":  "/fhir/R4/" + rt + "/" + id + "/_history/" + strconv.FormatInt(v.VersionID, 10),
			"resource": json.RawMessage(v.Data),
			"request":  map[string]string{"method": operationToMethod(v.IsDeleted), "url": rt + "/" + id},
		})
	}

	bundle := map[string]interface{}{
		"resourceType": "Bundle",
		"type":         "history",
		"total":        len(entries),
		"entry":        entries,
	}

	writeJSON(w, http.StatusOK, bundle)
}

// ─── Search ───────────────────────────────────────────────────────────────────

func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {
	rt := chi.URLParam(r, "resourceType")

	result, err := h.searcher.Search(r.Context(), rt, r.URL.Query())
	if err != nil {
		slog.Error("search", "resourceType", rt, "error", err)
		writeOutcome(w, http.StatusInternalServerError, "exception", "Internal server error")
		return
	}

	entries := make([]interface{}, 0, len(result.Resources))
	for _, raw := range result.Resources {
		fid := extractFHIRID(raw)
		entries = append(entries, map[string]interface{}{
			"fullUrl":  "/fhir/R4/" + rt + "/" + fid,
			"resource": json.RawMessage(raw),
			"search":   map[string]string{"mode": "match"},
		})
	}

	bundle := map[string]interface{}{
		"resourceType": "Bundle",
		"type":         "searchset",
		"total":        result.Total,
		"entry":        entries,
	}

	writeJSON(w, http.StatusOK, bundle)
}

// ─── Capabilities ─────────────────────────────────────────────────────────────

// Capabilities returns a minimal FHIR R4 CapabilityStatement.
func Capabilities(w http.ResponseWriter, r *http.Request) {
	cs := map[string]interface{}{
		"resourceType": "CapabilityStatement",
		"status":       "active",
		"date":         "2026-01-01",
		"kind":         "instance",
		"fhirVersion":  "4.0.1",
		"format":       []string{"application/fhir+json", "application/json"},
		"software": map[string]string{
			"name":    "healthcareworkspace/fhir",
			"version": "0.1.0",
		},
		"implementation": map[string]string{
			"description": "Canadian Healthcare Platform FHIR R4 Server",
			"url":         "/fhir/R4",
		},
		"rest": []interface{}{
			map[string]interface{}{
				"mode": "server",
				"resource": buildResourceCapabilities([]string{
					// Core Clinical
					"Patient", "Practitioner", "PractitionerRole",
					"Organization", "Location",
					"Encounter", "EpisodeOfCare", "CareTeam",
					"Condition", "Observation", "Procedure",
					"DiagnosticReport", "AllergyIntolerance",
					"MedicationRequest", "Immunization",
					"CarePlan", "Goal", "Consent", "Flag",
					"ServiceRequest", "Composition", "DocumentReference",
					// Pharmacy
					"Medication", "MedicationDispense",
					"MedicationAdministration", "MedicationKnowledge",
					"Coverage", "Claim", "ClaimResponse",
					"ExplanationOfBenefit", "RelatedPerson",
					// Lab / LIMS
					"Specimen", "ObservationDefinition", "BodyStructure",
					"Task", "PlanDefinition", "ActivityDefinition",
					// Billing
					"Account", "ChargeItem",
					// Practice Management
					"Appointment", "AppointmentResponse",
					"Schedule", "Slot",
					"Communication", "Questionnaire", "QuestionnaireResponse",
				}),
			},
		},
	}
	writeJSON(w, http.StatusOK, cs)
}

func buildResourceCapabilities(types []string) []interface{} {
	interactions := []interface{}{
		map[string]string{"code": "read"},
		map[string]string{"code": "vread"},
		map[string]string{"code": "update"},
		map[string]string{"code": "delete"},
		map[string]string{"code": "create"},
		map[string]string{"code": "search-type"},
		map[string]string{"code": "history-instance"},
	}
	var out []interface{}
	for _, t := range types {
		out = append(out, map[string]interface{}{
			"type":        t,
			"versioning":  "versioned",
			"interaction": interactions,
		})
	}
	return out
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	b, err := json.Marshal(v)
	if err != nil {
		http.Error(w, "marshal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/fhir+json")
	w.WriteHeader(status)
	w.Write(b) //nolint:errcheck
}

func writeOutcome(w http.ResponseWriter, status int, severity, msg string) {
	outcome := map[string]interface{}{
		"resourceType": "OperationOutcome",
		"issue": []interface{}{
			map[string]string{
				"severity":    severity,
				"code":        "processing",
				"diagnostics": msg,
			},
		},
	}
	writeJSON(w, status, outcome)
}

func writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, fhirstore.ErrNotFound):
		writeOutcome(w, http.StatusNotFound, "error", "Resource not found")
	case errors.Is(err, fhirstore.ErrGone):
		writeOutcome(w, http.StatusGone, "error", "Resource has been deleted")
	default:
		slog.Error("fhir handler error", "error", err)
		writeOutcome(w, http.StatusInternalServerError, "exception", "Internal server error")
	}
}

func versionETag(versionID int64) string {
	return `W/"` + strconv.FormatInt(versionID, 10) + `"`
}

func extractFHIRID(data json.RawMessage) string {
	var obj struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(data, &obj); err != nil {
		return ""
	}
	return obj.ID
}

func operationToMethod(isDeleted bool) string {
	if isDeleted {
		return "DELETE"
	}
	return "PUT"
}
