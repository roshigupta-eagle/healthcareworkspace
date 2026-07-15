// Package handler — EPIC-CLIN-01: Drug Utilization Review (DUR) Engine.
// Screens prescriptions for drug-drug interactions, allergy conflicts, and duplicate therapy.
package handler

import (
"encoding/json"
"net/http"
"strings"
)

// DURSeverity indicates how the DUR result should be handled.
type DURSeverity string

const (
DURHardStop    DURSeverity = "hard-stop"    // Must not dispense
DURSoftStop    DURSeverity = "soft-stop"    // Override with documented reason
DURInformational DURSeverity = "informational" // Advisory only
)

// DURAlert is a single DUR finding.
type DURAlert struct {
Severity    DURSeverity `json:"severity"`
Category    string      `json:"category"` // drug-drug | drug-allergy | duplicate | contraindication
Description string      `json:"description"`
Guidance    string      `json:"guidance"`
}

// DURRequest is the payload for a DUR check.
type DURRequest struct {
PatientFhirID    string   `json:"patientFhirId"`
NewMedicationDIN string   `json:"newMedicationDin"`
NewMedName       string   `json:"newMedName"`
ActiveDINs       []string `json:"activeDins"`   // currently active medications
Allergies        []string `json:"allergies"`    // allergy substance names/codes
PatientAge       int      `json:"patientAge"`
PatientSex       string   `json:"patientSex"` // M | F | O
}

// DURResponse is the result of a DUR check.
type DURResponse struct {
Safe   bool       `json:"safe"`
Alerts []DURAlert `json:"alerts"`
}

// ─── Interaction database (embedded — production should call an external API) ─

// knownInteractions maps canonical drug stems to lists of interacting stems.
// Severity: "hard"=HardStop, "soft"=SoftStop, "info"=Informational
var knownInteractions = []struct {
DrugA, DrugB, Category string
Severity               DURSeverity
Description, Guidance  string
}{
{"warfarin",    "aspirin",       "drug-drug",  DURHardStop,    "Warfarin + Aspirin: major bleeding risk", "Consider alternative antiplatelet or consult physician"},
{"warfarin",    "ibuprofen",     "drug-drug",  DURHardStop,    "Warfarin + NSAID: major haemorrhage risk", "Avoid NSAIDs with warfarin"},
{"warfarin",    "naproxen",      "drug-drug",  DURHardStop,    "Warfarin + Naproxen: major haemorrhage risk", "Avoid NSAIDs with warfarin"},
{"ssri",        "tramadol",      "drug-drug",  DURHardStop,    "SSRI + Tramadol: serotonin syndrome risk", "Contraindicated — consult physician"},
{"maoi",        "ssri",          "drug-drug",  DURHardStop,    "MAOI + SSRI: life-threatening serotonin syndrome", "Absolute contraindication — 14-day washout required"},
{"metformin",   "contrast",      "drug-drug",  DURSoftStop,    "Metformin + Iodinated contrast: lactic acidosis risk", "Hold metformin 48h before/after contrast"},
{"lisinopril",  "potassium",     "drug-drug",  DURSoftStop,    "ACE inhibitor + K supplement: hyperkalaemia risk", "Monitor serum potassium"},
{"simvastatin", "amiodarone",    "drug-drug",  DURSoftStop,    "Simvastatin + Amiodarone: myopathy risk", "Limit simvastatin dose to 20mg; monitor CK"},
{"methotrexate","nsaid",         "drug-drug",  DURHardStop,    "Methotrexate + NSAID: methotrexate toxicity", "Contraindicated — high toxicity risk"},
{"digoxin",     "amiodarone",    "drug-drug",  DURSoftStop,    "Digoxin + Amiodarone: bradycardia / toxicity", "Reduce digoxin dose by 50%; monitor levels"},
{"clopidogrel", "omeprazole",    "drug-drug",  DURInformational,"Clopidogrel + PPI: possible reduced antiplatelet effect","Consider pantoprazole as alternative PPI"},
}

// knownAllergyClasses maps allergy trigger keywords to drug stems that should be avoided.
var knownAllergyClasses = map[string][]string{
"penicillin":     {"amoxicillin","ampicillin","piperacillin","cloxacillin"},
"sulfa":          {"sulfamethoxazole","trimethoprim-sulfamethoxazole"},
"aspirin":        {"aspirin","ibuprofen","naproxen","celecoxib"},
"nsaid":          {"ibuprofen","naproxen","diclofenac","meloxicam","celecoxib"},
"cephalosporin":  {"cephalexin","cefazolin","ceftriaxone","cefuroxime"},
"fluoroquinolone":{"ciprofloxacin","levofloxacin","moxifloxacin"},
}

// ─── DUR Handler ──────────────────────────────────────────────────────────────

type DURHandler struct{}

func NewDURHandler() *DURHandler { return &DURHandler{} }

// Check performs a Drug Utilization Review. POST /api/v1/dur/check
func (h *DURHandler) Check(w http.ResponseWriter, r *http.Request) {
var req DURRequest
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
return
}

resp := DURResponse{Safe: true, Alerts: []DURAlert{}}

newDrug := strings.ToLower(req.NewMedName)

// 1. Drug-drug interaction check
for _, ix := range knownInteractions {
aMatch := strings.Contains(newDrug, ix.DrugA) || containsAny(req.ActiveDINs, ix.DrugA)
bMatch := strings.Contains(newDrug, ix.DrugB) || containsAny(req.ActiveDINs, ix.DrugB)
// check both directions
aMatchR := strings.Contains(newDrug, ix.DrugB) || containsAny(req.ActiveDINs, ix.DrugB)
bMatchR := strings.Contains(newDrug, ix.DrugA) || containsAny(req.ActiveDINs, ix.DrugA)

if (aMatch && bMatch) || (aMatchR && bMatchR) {
alert := DURAlert{
Severity: ix.Severity, Category: ix.Category,
Description: ix.Description, Guidance: ix.Guidance,
}
resp.Alerts = append(resp.Alerts, alert)
if ix.Severity == DURHardStop { resp.Safe = false }
}
}

// 2. Drug-allergy check
for _, allergy := range req.Allergies {
allergyKey := strings.ToLower(allergy)
for trigger, drugs := range knownAllergyClasses {
if strings.Contains(allergyKey, trigger) {
for _, drug := range drugs {
if strings.Contains(newDrug, drug) {
resp.Alerts = append(resp.Alerts, DURAlert{
Severity:    DURHardStop,
Category:    "drug-allergy",
Description: "Allergy conflict: " + req.NewMedName + " is in the " + trigger + " class — patient allergic",
Guidance:    "Do not dispense. Select a non-" + trigger + " alternative.",
})
resp.Safe = false
}
}
}
// Direct name match
if strings.Contains(newDrug, allergyKey) {
resp.Alerts = append(resp.Alerts, DURAlert{
Severity:    DURHardStop,
Category:    "drug-allergy",
Description: "Direct allergy match: " + req.NewMedName + " matches documented allergy: " + allergy,
Guidance:    "Do not dispense — patient has documented allergy.",
})
resp.Safe = false
}
}
}

// 3. Duplicate therapy check
for _, activeDIN := range req.ActiveDINs {
if strings.EqualFold(activeDIN, req.NewMedicationDIN) {
resp.Alerts = append(resp.Alerts, DURAlert{
Severity:    DURSoftStop,
Category:    "duplicate",
Description: "Duplicate therapy: this medication is already active (DIN: " + activeDIN + ")",
Guidance:    "Confirm this is intentional (e.g., dose change). Document clinical reason for override.",
})
}
}

writeJSON(w, http.StatusOK, resp)
}

// helpers
func containsAny(dins []string, stem string) bool {
for _, d := range dins {
if strings.Contains(strings.ToLower(d), stem) { return true }
}
return false
}