// Package store provides database queries for LIMS clinical operations.
// EPIC-API-01: LIMS Clinical API
package store

import (
"context"
"fmt"
"time"

"github.com/jackc/pgx/v5/pgxpool"
)

// Store wraps the database pool with LIMS-specific query methods.
type Store struct {
db *pgxpool.Pool
}

// New creates a Store.
func New(db *pgxpool.Pool) *Store { return &Store{db: db} }

// ─── Data types ──────────────────────────────────────────────────────────────

type LabTest struct {
ID        string  `json:"id"`
LoincCode string  `json:"loincCode"`
Name      string  `json:"name"`
Category  string  `json:"category"`
Units     string  `json:"units"`
}

type LabOrder struct {
ID             string    `json:"id"`
PatientFhirID  string    `json:"patientFhirId"`
OrdererID      string    `json:"ordererId"`
LabTestID      string    `json:"labTestId"`
Status         string    `json:"status"`
Priority       string    `json:"priority"`
OrderedAt      time.Time `json:"orderedAt"`
Notes          string    `json:"notes"`
// Joined fields
TestName       string    `json:"testName,omitempty"`
LoincCode      string    `json:"loincCode,omitempty"`
}

type LabResult struct {
ID             string    `json:"id"`
OrderID        string    `json:"orderId"`
LabTestID      string    `json:"labTestId"`
ValueNumeric   *float64  `json:"valueNumeric"`
ValueText      string    `json:"valueText"`
ValueCoded     string    `json:"valueCoded"`
Units          string    `json:"units"`
ReferenceRange string    `json:"referenceRange"`
Interpretation string    `json:"interpretation"` // N,H,L,HH,LL,A
Status         string    `json:"status"`
ResultedAt     time.Time `json:"resultedAt"`
ResultedBy     string    `json:"resultedBy"`
}

type CreateOrderInput struct {
PatientFhirID string `json:"patientFhirId"`
OrdererID     string `json:"ordererId"`
LabTestID     string `json:"labTestId"`
Priority      string `json:"priority"`
Notes         string `json:"notes"`
}

type CreateResultInput struct {
OrderID        string   `json:"orderId"`
LabTestID      string   `json:"labTestId"`
ValueNumeric   *float64 `json:"valueNumeric"`
ValueText      string   `json:"valueText"`
ValueCoded     string   `json:"valueCoded"`
Units          string   `json:"units"`
ReferenceRange string   `json:"referenceRange"`
Interpretation string   `json:"interpretation"`
Status         string   `json:"status"`
ResultedBy     string   `json:"resultedBy"`
}

// ─── Lab Tests ───────────────────────────────────────────────────────────────

func (s *Store) ListTests(ctx context.Context) ([]LabTest, error) {
rows, err := s.db.Query(ctx,
`SELECT id, COALESCE(loinc_code,''), name, COALESCE(category,''), COALESCE(units,'')
 FROM lab_tests ORDER BY name`)
if err != nil {
return nil, fmt.Errorf("list tests: %w", err)
}
defer rows.Close()
var tests []LabTest
for rows.Next() {
var t LabTest
if err := rows.Scan(&t.ID, &t.LoincCode, &t.Name, &t.Category, &t.Units); err != nil {
return nil, err
}
tests = append(tests, t)
}
return tests, rows.Err()
}

// ─── Lab Orders ──────────────────────────────────────────────────────────────

func (s *Store) ListOrders(ctx context.Context, status, patientID string) ([]LabOrder, error) {
query := `SELECT o.id, o.patient_fhir_id, o.orderer_id, COALESCE(o.lab_test_id::text,''),
        o.status, o.priority, o.ordered_at, COALESCE(o.notes,''),
        COALESCE(t.name,''), COALESCE(t.loinc_code,'')
        FROM lab_orders o LEFT JOIN lab_tests t ON t.id = o.lab_test_id WHERE 1=1`
args := []any{}
i := 1
if status != "" {
query += fmt.Sprintf(" AND o.status = $%d", i); args = append(args, status); i++
}
if patientID != "" {
query += fmt.Sprintf(" AND o.patient_fhir_id = $%d", i); args = append(args, patientID); i++
}
query += " ORDER BY o.ordered_at DESC LIMIT 200"

rows, err := s.db.Query(ctx, query, args...)
if err != nil {
return nil, fmt.Errorf("list orders: %w", err)
}
defer rows.Close()
var orders []LabOrder
for rows.Next() {
var o LabOrder
if err := rows.Scan(&o.ID, &o.PatientFhirID, &o.OrdererID, &o.LabTestID,
&o.Status, &o.Priority, &o.OrderedAt, &o.Notes, &o.TestName, &o.LoincCode); err != nil {
return nil, err
}
orders = append(orders, o)
}
return orders, rows.Err()
}

func (s *Store) CreateOrder(ctx context.Context, in CreateOrderInput) (*LabOrder, error) {
priority := in.Priority
if priority == "" {
priority = "routine"
}
var o LabOrder
err := s.db.QueryRow(ctx,
`INSERT INTO lab_orders (patient_fhir_id, orderer_id, lab_test_id, priority, notes)
 VALUES ($1,$2,$3::uuid,$4,$5) RETURNING id, patient_fhir_id, orderer_id,
 COALESCE(lab_test_id::text,''), status, priority, ordered_at, COALESCE(notes,'')`,
in.PatientFhirID, in.OrdererID, in.LabTestID, priority, in.Notes,
).Scan(&o.ID, &o.PatientFhirID, &o.OrdererID, &o.LabTestID, &o.Status, &o.Priority, &o.OrderedAt, &o.Notes)
if err != nil {
return nil, fmt.Errorf("create order: %w", err)
}
return &o, nil
}

func (s *Store) UpdateOrderStatus(ctx context.Context, id, status string) error {
tag, err := s.db.Exec(ctx, `UPDATE lab_orders SET status=$1 WHERE id=$2::uuid`, status, id)
if err != nil {
return fmt.Errorf("update order status: %w", err)
}
if tag.RowsAffected() == 0 {
return fmt.Errorf("order not found: %s", id)
}
return nil
}

// ─── Lab Results ─────────────────────────────────────────────────────────────

func (s *Store) GetResultsByOrder(ctx context.Context, orderID string) ([]LabResult, error) {
rows, err := s.db.Query(ctx,
`SELECT id, order_id, COALESCE(lab_test_id::text,''), value_numeric, COALESCE(value_text,''),
 COALESCE(value_coded,''), COALESCE(units,''), COALESCE(reference_range,''),
 COALESCE(interpretation,''), status, resulted_at, COALESCE(resulted_by,'')
 FROM lab_results WHERE order_id=$1::uuid ORDER BY resulted_at DESC`, orderID)
if err != nil {
return nil, fmt.Errorf("get results: %w", err)
}
defer rows.Close()
var results []LabResult
for rows.Next() {
var r LabResult
if err := rows.Scan(&r.ID, &r.OrderID, &r.LabTestID, &r.ValueNumeric,
&r.ValueText, &r.ValueCoded, &r.Units, &r.ReferenceRange,
&r.Interpretation, &r.Status, &r.ResultedAt, &r.ResultedBy); err != nil {
return nil, err
}
results = append(results, r)
}
return results, rows.Err()
}

func (s *Store) CreateResult(ctx context.Context, in CreateResultInput) (*LabResult, error) {
status := in.Status
if status == "" {
status = "preliminary"
}
var r LabResult
err := s.db.QueryRow(ctx,
`INSERT INTO lab_results
 (order_id, lab_test_id, value_numeric, value_text, value_coded, units,
  reference_range, interpretation, status, resulted_by)
 VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10)
 RETURNING id, order_id, COALESCE(lab_test_id::text,''), value_numeric,
 COALESCE(value_text,''), COALESCE(value_coded,''), COALESCE(units,''),
 COALESCE(reference_range,''), COALESCE(interpretation,''), status, resulted_at, COALESCE(resulted_by,'')`,
in.OrderID, in.LabTestID, in.ValueNumeric, in.ValueText, in.ValueCoded,
in.Units, in.ReferenceRange, in.Interpretation, status, in.ResultedBy,
).Scan(&r.ID, &r.OrderID, &r.LabTestID, &r.ValueNumeric, &r.ValueText,
&r.ValueCoded, &r.Units, &r.ReferenceRange, &r.Interpretation,
&r.Status, &r.ResultedAt, &r.ResultedBy)
if err != nil {
return nil, fmt.Errorf("create result: %w", err)
}

// Update order status to in-progress when first result arrives
_, _ = s.db.Exec(ctx,
`UPDATE lab_orders SET status='in-progress' WHERE id=$1::uuid AND status='pending'`,
in.OrderID)

return &r, nil
}

// IsCritical checks whether a result interpretation flag is life-threatening.
func IsCritical(interpretation string) bool {
return interpretation == "HH" || interpretation == "LL"
}