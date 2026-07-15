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

result, err := h.st.CreateResult(r.Context(), in)
if err != nil {
slog.Error("create result", "error", err)
writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create result"})
return
}

// EPIC-SAFE-01: Fire critical value alert asynchronously
if store.IsCritical(result.Interpretation) {
slog.Warn("CRITICAL VALUE", "orderId", result.OrderID, "interp", result.Interpretation,
"value", result.ValueNumeric, "units", result.Units)
// In production: publish to Redis pub/sub → SSE stream → SMS gateway
}

writeJSON(w, http.StatusCreated, result)
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