package handler

import (
"encoding/json"
"log/slog"
"net/http"
"strings"

"healthcareworkspace/pharmacyms/internal/store"
)

type PrescriptionsHandler struct{ st *store.Store }
func NewPrescriptionsHandler(st *store.Store) *PrescriptionsHandler { return &PrescriptionsHandler{st: st} }

func (h *PrescriptionsHandler) List(w http.ResponseWriter, r *http.Request) {
patient := r.URL.Query().Get("patient")
status  := r.URL.Query().Get("status")
rxs, err := h.st.ListPrescriptions(r.Context(), patient, status)
if err != nil {
slog.Error("list prescriptions", "error", err)
writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list prescriptions"})
return
}
if rxs == nil { rxs = []store.Prescription{} }
writeJSON(w, http.StatusOK, rxs)
}

func (h *PrescriptionsHandler) Create(w http.ResponseWriter, r *http.Request) {
var in store.CreatePrescriptionInput
if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
return
}
if strings.TrimSpace(in.PatientFhirID) == "" || strings.TrimSpace(in.MedicationID) == "" {
writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error":"patientFhirId and medicationId required"})
return
}
rx, err := h.st.CreatePrescription(r.Context(), in)
if err != nil {
slog.Error("create prescription", "error", err)
writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create prescription"})
return
}
writeJSON(w, http.StatusCreated, rx)
}

func (h *PrescriptionsHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
id := extractID(r)
if id == "" {
writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing prescription id"})
return
}
var body struct{ Status string `json:"status"` }
if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Status == "" {
writeJSON(w, http.StatusBadRequest, map[string]string{"error": "status required"})
return
}
valid := map[string]bool{"active":true,"completed":true,"cancelled":true,"on-hold":true}
if !valid[body.Status] {
writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": "invalid status"})
return
}
if err := h.st.UpdatePrescriptionStatus(r.Context(), id, body.Status); err != nil {
writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
return
}
writeJSON(w, http.StatusOK, map[string]string{"id": id, "status": body.Status})
}