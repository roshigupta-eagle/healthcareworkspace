// Package validator — EPIC-FED-01: Ontario FHIR R4 Profile Enforcement.
// Validates FHIR resources against pan-Canadian and Ontario-specific constraints
// before persistence.
package validator

import (
"errors"
"fmt"
"regexp"
"strings"
)

// ErrValidation wraps all validation failures.
type ErrValidation struct{ Errors []string }

func (e *ErrValidation) Error() string {
return "FHIR validation failed: " + strings.Join(e.Errors, "; ")
}

// Validate dispatches to the appropriate resource validator.
// Returns *ErrValidation on failure, nil on success.
func Validate(resourceType string, resource map[string]any) error {
var errs []string
switch resourceType {
case "Patient":
errs = validatePatient(resource)
case "Observation":
errs = validateObservation(resource)
case "DiagnosticReport":
errs = validateDiagnosticReport(resource)
case "MedicationRequest":
errs = validateMedicationRequest(resource)
case "Condition":
errs = validateCondition(resource)
}
if len(errs) > 0 {
return &ErrValidation{Errors: errs}
}
return nil
}

// ─── Patient (Ontario) ───────────────────────────────────────────────────────
// Ontario patients should carry at least one OHIP Health Card Number identifier.

var hcnPattern = regexp.MustCompile(`^\d{10}$`)

func validatePatient(r map[string]any) []string {
var errs []string
identifiers, _ := r["identifier"].([]any)
hasHCN := false
for _, raw := range identifiers {
id, ok := raw.(map[string]any)
if !ok { continue }
system, _ := id["system"].(string)
value, _ := id["value"].(string)
if system == "https://fhir.infoway-inforoute.ca/NamingSystem/ca-on-patient-hcn" {
if hcnPattern.MatchString(strings.TrimSpace(value)) {
hasHCN = true
} else {
errs = append(errs, fmt.Sprintf("HCN identifier value must be 10 digits, got: %q", value))
}
}
}
// HCN is strongly recommended but not a hard stop in all contexts; issue warning-level error
if !hasHCN {
errs = append(errs, "Patient is missing an Ontario HCN identifier (system: ca-on-patient-hcn)")
}
// Gender must be present (MS)
if g, _ := r["gender"].(string); g == "" {
errs = append(errs, "Patient.gender is required (must-support)")
}
// BirthDate must be present (MS)
if bd, _ := r["birthDate"].(string); bd == "" {
errs = append(errs, "Patient.birthDate is required (must-support)")
}
return errs
}

// ─── Observation (pCLOCD/LOINC) ──────────────────────────────────────────────
// Lab observations must use a LOINC code; Canadian context prefers pCLOCD mapping.

func validateObservation(r map[string]any) []string {
var errs []string
code, _ := r["code"].(map[string]any)
if code == nil { return []string{"Observation.code is required"} }
codings, _ := code["coding"].([]any)
hasLOINC := false
for _, raw := range codings {
c, ok := raw.(map[string]any)
if !ok { continue }
system, _ := c["system"].(string)
codeVal, _ := c["code"].(string)
if (system == "http://loinc.org" || system == "https://fhir.infoway-inforoute.ca/CodeSystem/pCLOCD") && codeVal != "" {
hasLOINC = true
}
}
if !hasLOINC {
errs = append(errs, "Observation.code must include at least one LOINC or pCLOCD code")
}
// Must have either valueQuantity, valueCodeableConcept, or dataAbsentReason
_, hasQty  := r["valueQuantity"]
_, hasCC   := r["valueCodeableConcept"]
_, hasDAR  := r["dataAbsentReason"]
if !hasQty && !hasCC && !hasDAR {
errs = append(errs, "Observation must have valueQuantity, valueCodeableConcept, or dataAbsentReason")
}
if qty, ok := r["valueQuantity"].(map[string]any); ok {
if system, _ := qty["system"].(string); system != "http://unitsofmeasure.org" {
errs = append(errs, "Observation.valueQuantity.system must be UCUM (http://unitsofmeasure.org)")
}
}
return errs
}

// ─── DiagnosticReport ────────────────────────────────────────────────────────

func validateDiagnosticReport(r map[string]any) []string {
var errs []string
if _, ok := r["subject"]; !ok {
errs = append(errs, "DiagnosticReport.subject is required")
}
if _, ok := r["code"]; !ok {
errs = append(errs, "DiagnosticReport.code is required")
}
status, _ := r["status"].(string)
validStatuses := map[string]bool{"registered":true,"partial":true,"preliminary":true,"final":true,"amended":true,"corrected":true,"appended":true,"cancelled":true,"entered-in-error":true,"unknown":true}
if !validStatuses[status] {
errs = append(errs, fmt.Sprintf("DiagnosticReport.status %q is not valid", status))
}
return errs
}

// ─── MedicationRequest (Health Canada DIN) ───────────────────────────────────

var dinPattern = regexp.MustCompile(`^\d{8}$`)

func validateMedicationRequest(r map[string]any) []string {
var errs []string
med, _ := r["medicationCodeableConcept"].(map[string]any)
if med == nil {
// medicationReference is also valid
if _, ok := r["medicationReference"]; !ok {
errs = append(errs, "MedicationRequest must have medicationCodeableConcept or medicationReference")
}
} else {
codings, _ := med["coding"].([]any)
hasDIN := false
for _, raw := range codings {
c, ok := raw.(map[string]any)
if !ok { continue }
system, _ := c["system"].(string)
codeVal, _ := c["code"].(string)
if system == "https://fhir.infoway-inforoute.ca/CodeSystem/ca-hc-din" {
if dinPattern.MatchString(codeVal) { hasDIN = true } else {
errs = append(errs, fmt.Sprintf("Health Canada DIN must be 8 digits, got: %q", codeVal))
}
}
}
if !hasDIN {
errs = append(errs, "MedicationRequest.medicationCodeableConcept should include a Health Canada DIN code")
}
}
if _, ok := r["subject"]; !ok {
errs = append(errs, "MedicationRequest.subject is required")
}
if _, ok := r["requester"]; !ok {
errs = append(errs, "MedicationRequest.requester is required")
}
return errs
}

// ─── Condition (ICD-10-CA) ───────────────────────────────────────────────────

func validateCondition(r map[string]any) []string {
var errs []string
if _, ok := r["subject"]; !ok {
errs = append(errs, "Condition.subject is required")
}
code, _ := r["code"].(map[string]any)
if code == nil {
errs = append(errs, "Condition.code is required")
return errs
}
codings, _ := code["coding"].([]any)
hasICD := false
for _, raw := range codings {
c, ok := raw.(map[string]any)
if !ok { continue }
system, _ := c["system"].(string)
codeVal, _ := c["code"].(string)
if strings.Contains(system, "icd") && codeVal != "" { hasICD = true }
if strings.Contains(system, "snomed") && codeVal != "" { hasICD = true } // SNOMED accepted too
}
if !hasICD {
errs = append(errs, "Condition.code should include an ICD-10-CA or SNOMED CT code")
}
return errs
}

// ErrIs helps unwrap validation errors.
func IsValidationError(err error) bool {
var ve *ErrValidation
return errors.As(err, &ve)
}