// Package handler implements LIMS HTTP handlers. EPIC-API-01.
package handler

import (
"encoding/json"
"log/slog"
"net/http"
"strings"

"healthcareworkspace/lims/internal/store"
)

// OrdersHandler groups lab order handlers.
type OrdersHandler struct{ st *store.Store }

// NewOrdersHandler creates an OrdersHandler.
func NewOrdersHandler(st *store.Store) *OrdersHandler { return &OrdersHandler{st: st} }

// List returns all lab orders, optionally filtered by ?status=&patient=
func (h *OrdersHandler) List(w http.ResponseWriter, r *http.Request) {
status  := r.URL.Query().Get("status")
patient := r.URL.Query().Get("patient")

orders, err := h.st.ListOrders(r.Context(), status, patient)
if err != nil {
slog.Error("list orders", "error", err)
writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list orders"})
return
}
if orders == nil {
orders = []store.LabOrder{}
}
writeJSON(w, http.StatusOK, orders)
}

// Create creates a new lab order from the JSON body.
func (h *OrdersHandler) Create(w http.ResponseWriter, r *http.Request) {
var in store.CreateOrderInput
if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
return
}
if strings.TrimSpace(in.PatientFhirID) == "" || strings.TrimSpace(in.LabTestID) == "" {
writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": "patientFhirId and labTestId are required"})
return
}
order, err := h.st.CreateOrder(r.Context(), in)
if err != nil {
slog.Error("create order", "error", err)
writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create order"})
return
}
writeJSON(w, http.StatusCreated, order)
}

// UpdateStatus handles PATCH /api/v1/orders/{id}/status
func (h *OrdersHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
id := extractID(r)
if id == "" {
writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing order id"})
return
}
var body struct{ Status string `json:"status"` }
if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Status == "" {
writeJSON(w, http.StatusBadRequest, map[string]string{"error": "status field required"})
return
}
valid := map[string]bool{"pending":true,"in-progress":true,"completed":true,"cancelled":true}
if !valid[body.Status] {
writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": "invalid status value"})
return
}
if err := h.st.UpdateOrderStatus(r.Context(), id, body.Status); err != nil {
slog.Error("update order status", "error", err)
writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
return
}
writeJSON(w, http.StatusOK, map[string]string{"id": id, "status": body.Status})
}