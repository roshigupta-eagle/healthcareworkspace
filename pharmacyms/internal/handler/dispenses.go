package handler

import (
"encoding/json"
"errors"
"net/http"

"healthcareworkspace/pharmacyms/internal/store"
)

type DispensesHandler struct{ st *store.Store }
func NewDispensesHandler(st *store.Store) *DispensesHandler { return &DispensesHandler{st: st} }

func (h *DispensesHandler) Create(w http.ResponseWriter, r *http.Request) {
var body struct {
PrescriptionID string  `json:"prescriptionId"`
DispensedBy    string  `json:"dispensedBy"`
Quantity       float64 `json:"quantity"`
LotNumber      string  `json:"lotNumber"`
}
if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
return
}
if body.PrescriptionID == "" || body.DispensedBy == "" {
writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error":"prescriptionId and dispensedBy required"})
return
}
d, err := h.st.CreateDispense(r.Context(), body.PrescriptionID, body.DispensedBy, body.Quantity, body.LotNumber)
if err != nil {
if errors.Is(err, store.ErrInsufficientQuantity) {
writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": "insufficient quantity"})
return
}
writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to record dispense"})
return
}
writeJSON(w, http.StatusCreated, d)
}

func (h *DispensesHandler) ListByPrescription(w http.ResponseWriter, r *http.Request) {
rxID := r.URL.Query().Get("prescription")
if rxID == "" {
writeJSON(w, http.StatusBadRequest, map[string]string{"error":"prescription query parameter required"})
return
}
dispenses, err := h.st.ListDispensesByPrescription(r.Context(), rxID)
if err != nil {
writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list dispenses"})
return
}
if dispenses == nil { dispenses = []store.Dispense{} }
writeJSON(w, http.StatusOK, dispenses)
}
