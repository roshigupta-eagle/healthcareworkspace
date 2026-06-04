package labingestion

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

// Handler provides HTTP endpoints for the lab ingestion pipeline.
type Handler struct {
	store *Store
}

// NewHandler creates a Handler backed by store.
func NewHandler(store *Store) *Handler {
	return &Handler{store: store}
}

// Mount registers all lab ingestion routes onto r.
func (h *Handler) Mount(r chi.Router) {
	// Ingest
	r.Post("/ingest/hl7v2", h.ingestHL7v2)
	r.Post("/ingest/fhir", h.ingestFHIR)

	// Ingestion log & queue
	r.Get("/queue", h.getQueue)
	r.Get("/records", h.listRecords)
	r.Get("/records/{id}", h.getRecord)

	// Manual resolution
	r.Post("/records/{id}/match", h.manualMatch)
	r.Post("/records/{id}/retry", h.retryFailed)
}

// ─── POST /lab/ingest/hl7v2 ──────────────────────────────────────────────────
//
// Accepts a raw HL7 v2 ORU^R01 message as plain text (Content-Type: text/hl7v2
// or text/plain). The optional X-Lab-Source header can override source detection.
// Returns the HL7 ACK message as text/plain, plus JSON metadata in the
// X-Ingestion-ID and X-Ingestion-Status response headers.
func (h *Handler) ingestHL7v2(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20)) // 1 MB max
	if err != nil || len(body) == 0 {
		http.Error(w, "empty or unreadable body", http.StatusBadRequest)
		return
	}

	sourceHint := SourceSystem(r.Header.Get("X-Lab-Source"))
	logID, ack, _ := h.store.IngestHL7v2(r.Context(), string(body), sourceHint)

	w.Header().Set("Content-Type", "text/plain")
	w.Header().Set("X-Ingestion-ID", logID)
	w.WriteHeader(http.StatusOK) // HL7 v2 always returns 200; status is in ACK
	_, _ = w.Write([]byte(ack))
}

// ─── POST /lab/ingest/fhir ────────────────────────────────────────────────────
//
// Accepts a FHIR R4 DiagnosticReport or Bundle (application/fhir+json or
// application/json).
func (h *Handler) ingestFHIR(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 5<<20)) // 5 MB max
	if err != nil || len(body) == 0 {
		writeErr(w, http.StatusBadRequest, "empty or unreadable body")
		return
	}

	logID, ingErr := h.store.IngestFHIR(r.Context(), body)

	status := http.StatusAccepted
	if ingErr != nil {
		status = http.StatusUnprocessableEntity
	}
	writeJSON(w, status, map[string]interface{}{
		"ingestionId": logID,
		"accepted":    ingErr == nil,
		"error":       errStr(ingErr),
	})
}

// ─── GET /lab/queue ───────────────────────────────────────────────────────────
//
// Returns aggregate counts by status and source plus the 20 most recent records.
func (h *Handler) getQueue(w http.ResponseWriter, r *http.Request) {
	sum, err := h.store.GetSummary(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, sum)
}

// ─── GET /lab/records?status=MANUAL_REVIEW&source=LIFELABS&limit=50 ──────────
func (h *Handler) listRecords(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	source := r.URL.Query().Get("source")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	records, err := h.store.ListRecords(r.Context(), status, source, limit)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, records)
}

// ─── GET /lab/records/{id} ────────────────────────────────────────────────────
func (h *Handler) getRecord(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rec, err := h.store.GetRecord(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, rec)
}

// ─── POST /lab/records/{id}/match ─────────────────────────────────────────────
//
// Manually resolves a MANUAL_REVIEW record to a known FHIR Patient.id.
// Body: { "patientId": "abc-123" }
func (h *Handler) manualMatch(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req ManualMatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PatientID == "" {
		writeErr(w, http.StatusBadRequest, "patientId is required")
		return
	}
	if err := h.store.ManualMatch(r.Context(), id, req.PatientID); err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ─── POST /lab/records/{id}/retry ────────────────────────────────────────────
//
// Re-processes a FAILED record from its stored raw payload.
func (h *Handler) retryFailed(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.store.RetryFailed(r.Context(), id); err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func errStr(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
