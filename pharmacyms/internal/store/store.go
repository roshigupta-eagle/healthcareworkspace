// Package store provides PharmacyMS database queries. EPIC-API-02.
package store

import (
"context"
"errors"
"fmt"
"time"

"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct{ db *pgxpool.Pool }
func New(db *pgxpool.Pool) *Store { return &Store{db: db} }

var ErrInsufficientQuantity = errors.New("insufficient quantity")

// ─── Types ───────────────────────────────────────────────────────────────────

type Medication struct {
ID          string `json:"id"`
DIN         string `json:"din"`
Name        string `json:"name"`
GenericName string `json:"genericName"`
Form        string `json:"form"`
Strength    string `json:"strength"`
}

type Prescription struct {
ID             string     `json:"id"`
PatientFhirID  string     `json:"patientFhirId"`
PrescriberID   string     `json:"prescriberId"`
MedicationID   string     `json:"medicationId"`
Status         string     `json:"status"`
DosageText     string     `json:"dosageText"`
Quantity       float64    `json:"quantity"`
Refills        int        `json:"refills"`
IssuedAt       time.Time  `json:"issuedAt"`
ExpiresAt      *time.Time `json:"expiresAt"`
Notes          string     `json:"notes"`
// Joined
MedName        string     `json:"medicationName,omitempty"`
DIN            string     `json:"din,omitempty"`
}

type CreatePrescriptionInput struct {
PatientFhirID string     `json:"patientFhirId"`
PrescriberID  string     `json:"prescriberId"`
MedicationID  string     `json:"medicationId"`
DosageText    string     `json:"dosageText"`
Quantity      float64    `json:"quantity"`
Refills       int        `json:"refills"`
ExpiresAt     *time.Time `json:"expiresAt"`
Notes         string     `json:"notes"`
}

type Dispense struct {
ID             string    `json:"id"`
PrescriptionID string    `json:"prescriptionId"`
DispensedBy    string    `json:"dispensedBy"`
DispensedAt    time.Time `json:"dispensedAt"`
Quantity       float64   `json:"quantity"`
LotNumber      string    `json:"lotNumber"`
ExpiryDate     *string   `json:"expiryDate"`
}

// ─── Medications ─────────────────────────────────────────────────────────────

func (s *Store) ListMedications(ctx context.Context, q string) ([]Medication, error) {
query := `SELECT id, COALESCE(din,''), name, COALESCE(generic_name,''), COALESCE(form,''), COALESCE(strength,'')
          FROM medications`
args := []any{}
if q != "" {
query += ` WHERE name ILIKE $1 OR generic_name ILIKE $1 OR din ILIKE $1`
args = append(args, "%"+q+"%")
}
query += ` ORDER BY name LIMIT 100`
rows, err := s.db.Query(ctx, query, args...)
if err != nil { return nil, fmt.Errorf("list medications: %w", err) }
defer rows.Close()
var out []Medication
for rows.Next() {
var m Medication
if err := rows.Scan(&m.ID, &m.DIN, &m.Name, &m.GenericName, &m.Form, &m.Strength); err != nil { return nil, err }
out = append(out, m)
}
return out, rows.Err()
}

// ─── Prescriptions ───────────────────────────────────────────────────────────

func (s *Store) ListPrescriptions(ctx context.Context, patientID, status string) ([]Prescription, error) {
q := `SELECT p.id, p.patient_fhir_id, p.prescriber_id, COALESCE(p.medication_id::text,''),
      p.status, COALESCE(p.dosage_text,''), COALESCE(p.quantity,0), p.refills, p.issued_at,
      p.expires_at, COALESCE(p.notes,''), COALESCE(m.name,''), COALESCE(m.din,'')
      FROM prescriptions p LEFT JOIN medications m ON m.id = p.medication_id WHERE 1=1`
args := []any{}; i := 1
if patientID != "" { q += fmt.Sprintf(" AND p.patient_fhir_id=$%d",i); args = append(args,patientID); i++ }
if status    != "" { q += fmt.Sprintf(" AND p.status=$%d",i);           args = append(args,status);    i++ }
q += " ORDER BY p.issued_at DESC LIMIT 200"
rows, err := s.db.Query(ctx, q, args...)
if err != nil { return nil, fmt.Errorf("list prescriptions: %w", err) }
defer rows.Close()
var out []Prescription
for rows.Next() {
var p Prescription
if err := rows.Scan(&p.ID,&p.PatientFhirID,&p.PrescriberID,&p.MedicationID,
&p.Status,&p.DosageText,&p.Quantity,&p.Refills,&p.IssuedAt,&p.ExpiresAt,
&p.Notes,&p.MedName,&p.DIN); err != nil { return nil, err }
out = append(out, p)
}
return out, rows.Err()
}

func (s *Store) CreatePrescription(ctx context.Context, in CreatePrescriptionInput) (*Prescription, error) {
var p Prescription
err := s.db.QueryRow(ctx,
`INSERT INTO prescriptions (patient_fhir_id,prescriber_id,medication_id,dosage_text,quantity,refills,expires_at,notes)
 VALUES ($1,$2,$3::uuid,$4,$5,$6,$7,$8)
 RETURNING id,patient_fhir_id,prescriber_id,COALESCE(medication_id::text,''),status,
 COALESCE(dosage_text,''),COALESCE(quantity,0),refills,issued_at,expires_at,COALESCE(notes,'')`,
in.PatientFhirID,in.PrescriberID,in.MedicationID,in.DosageText,
in.Quantity,in.Refills,in.ExpiresAt,in.Notes,
).Scan(&p.ID,&p.PatientFhirID,&p.PrescriberID,&p.MedicationID,&p.Status,
&p.DosageText,&p.Quantity,&p.Refills,&p.IssuedAt,&p.ExpiresAt,&p.Notes)
if err != nil { return nil, fmt.Errorf("create prescription: %w", err) }
return &p, nil
}

func (s *Store) UpdatePrescriptionStatus(ctx context.Context, id, status string) error {
tag, err := s.db.Exec(ctx,`UPDATE prescriptions SET status=$1 WHERE id=$2::uuid`,status,id)
if err != nil { return fmt.Errorf("update prescription: %w", err) }
if tag.RowsAffected() == 0 { return fmt.Errorf("prescription not found: %s", id) }
return nil
}

// GetActivePrescriptionsByPatient returns active prescriptions for DUR checks.
func (s *Store) GetActivePrescriptionsByPatient(ctx context.Context, patientID string) ([]Prescription, error) {
return s.ListPrescriptions(ctx, patientID, "active")
}

// ─── Dispenses ───────────────────────────────────────────────────────────────

func (s *Store) CreateDispense(ctx context.Context, prescriptionID, dispensedBy string, qty float64, lot string) (*Dispense, error) {
// Use a transaction and lock the prescription row to prevent concurrent over-dispense
tx, err := s.db.Begin(ctx)
if err != nil { return nil, fmt.Errorf("begin tx: %w", err) }
defer func() { _ = tx.Rollback(ctx) }()

var presQty float64
var presStatus string
err = tx.QueryRow(ctx, `SELECT COALESCE(quantity,0), COALESCE(status,'') FROM prescriptions WHERE id=$1::uuid FOR UPDATE`, prescriptionID).Scan(&presQty, &presStatus)
if err != nil { return nil, fmt.Errorf("lock prescription: %w", err) }

var dispensedSum float64
err = tx.QueryRow(ctx, `SELECT COALESCE(SUM(quantity),0) FROM dispenses WHERE prescription_id=$1::uuid`, prescriptionID).Scan(&dispensedSum)
if err != nil { return nil, fmt.Errorf("sum dispensed: %w", err) }

remaining := presQty - dispensedSum
if remaining < qty {
return nil, ErrInsufficientQuantity
}

var d Dispense
err = tx.QueryRow(ctx,
`INSERT INTO dispenses (prescription_id,dispensed_by,quantity,lot_number)
 VALUES ($1::uuid,$2,$3,$4)
 RETURNING id,prescription_id,dispensed_by,dispensed_at,quantity,COALESCE(lot_number,''),NULL`,
prescriptionID, dispensedBy, qty, lot,
).Scan(&d.ID,&d.PrescriptionID,&d.DispensedBy,&d.DispensedAt,&d.Quantity,&d.LotNumber,&d.ExpiryDate)
if err != nil { return nil, fmt.Errorf("create dispense: %w", err) }

_, err = tx.Exec(ctx,
`UPDATE prescriptions SET refills = GREATEST(refills-1,0),
 status = CASE WHEN refills <= 1 THEN 'completed' ELSE status END
 WHERE id=$1::uuid`, prescriptionID)
if err != nil { return nil, fmt.Errorf("update prescription: %w", err) }

if err := tx.Commit(ctx); err != nil { return nil, fmt.Errorf("commit: %w", err) }
return &d, nil
}

func (s *Store) ListDispensesByPrescription(ctx context.Context, prescriptionID string) ([]Dispense, error) {
rows, err := s.db.Query(ctx,
`SELECT id,prescription_id,dispensed_by,dispensed_at,quantity,COALESCE(lot_number,''),NULL
 FROM dispenses WHERE prescription_id=$1::uuid ORDER BY dispensed_at DESC`, prescriptionID)
if err != nil { return nil, fmt.Errorf("list dispenses: %w", err) }
defer rows.Close()
var out []Dispense
for rows.Next() {
var d Dispense
if err := rows.Scan(&d.ID,&d.PrescriptionID,&d.DispensedBy,&d.DispensedAt,&d.Quantity,&d.LotNumber,&d.ExpiryDate); err != nil { return nil, err }
out = append(out, d)
}
return out, rows.Err()
}
