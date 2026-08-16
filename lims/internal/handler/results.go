package handler

import (
"encoding/json"
"log/slog"
"net/http"
"strings"

"github.com/go-chi/chi/v5"

"healthcareworkspace/lims/internal/store"
)

// ResultsHandler groups lab result handlers.
type ResultsHandler struct{ st *store.Store }

// NewResultsHandler creates a ResultsHandler.
func NewResultsHandler(st *store.Store) *ResultsHandler { return &ResultsHandler{st: st} }

// List returns all results for a given order id (?order=).
func (h *ResultsHandler) List(w http.ResponseWriter, r *http.Request) {
orderID := r.URL.Query().Get("order")
if orderID == "" {
writeJSON(w, http.StatusBadRequest, map[string]string{"error": "order query parameter required"})
return
}
results, err := h.st.GetResultsByOrder(r.Context(), orderID)
if err != nil {
slog.Error("get results", "error", err)
writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to retrieve results"})
return
}
if results == nil {
results = []store.LabResult{}
}
writeJSON(w, http.StatusOK, results)
}

// Create creates a lab result and fires a critical-value alert if applicable.
func (h *ResultsHandler) Create(w http.ResponseWriter, r *http.Request) {
var in store.CreateResultInput
if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
return
}
if strings.TrimSpace(in.OrderID) == "" {
writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": "orderId is required"})
return
}

// Force preliminary status on create — handlers should not create final results directly
in.Status = ""

result, err := h.st.CreateResult(r.Context(), in)
if err != nil {
slog.Error("create result", "error", err)
writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create result"})
return
}

// EPIC-SAFE-01: Fire critical value alert asynchronously when finalization happens. Create only logs for now.
if store.IsCritical(result.Interpretation) {
// preliminary critical flags are recorded but alerts are emitted after finalization
slog.Warn("CRITICAL VALUE (preliminary)", "orderId", result.OrderID, "interp", result.Interpretation,
"value", result.ValueNumeric, "units", result.Units)
}

writeJSON(w, http.StatusCreated, result)
}

// UpdateStatus handles PATCH /api/v1/results/{id}/status — used by verifiers to finalize results
func (h *ResultsHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
id := chi.URLParam(r, "id")
if id == "" {
writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing result id"})
return
}
var body struct{ Status string `json:"status"` }
if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
return
}
if body.Status != "final" {
writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": "only status=final is allowed"})
return
}
if err := h.st.UpdateResultStatus(r.Context(), id, body.Status); err != nil {
writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update status"})
return
}
res, err := h.st.GetResultByID(r.Context(), id)
if err != nil {
writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to retrieve result"})
return
}
// On finalization, emit critical alert if applicable
if store.IsCritical(res.Interpretation) {
slog.Warn("CRITICAL VALUE (final)", "orderId", res.OrderID, "interp", res.Interpretation,
"value", res.ValueNumeric, "units", res.Units)
// TODO: publish to Redis pub/sub → SSE → notification pipeline
}
writeJSON(w, http.StatusOK, res)
}

// GetByOrder handles GET /api/v1/orders/{id}/results
func (h *ResultsHandler) GetByOrder(w http.ResponseWriter, r *http.Request) {
orderID := chi.URLParam(r, "id")
if orderID == "" {
writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing order id"})
return
}
results, err := h.st.GetResultsByOrder(r.Context(), orderID)
if err != nil {
writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to retrieve results"})
return
}
if results == nil { results = []store.LabResult{} }
writeJSON(w, http.StatusOK, results)
}
