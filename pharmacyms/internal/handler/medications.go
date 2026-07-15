package handler

import (
"log/slog"
"net/http"

"healthcareworkspace/pharmacyms/internal/store"
)

type MedicationsHandler struct{ st *store.Store }
func NewMedicationsHandler(st *store.Store) *MedicationsHandler { return &MedicationsHandler{st: st} }

func (h *MedicationsHandler) List(w http.ResponseWriter, r *http.Request) {
q := r.URL.Query().Get("q")
meds, err := h.st.ListMedications(r.Context(), q)
if err != nil {
slog.Error("list medications", "error", err)
writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list medications"})
return
}
if meds == nil { meds = []store.Medication{} }
writeJSON(w, http.StatusOK, meds)
}