# P3-4 Design — Inventory & controlled-substance management

Story: [docs/stories/P3-4_inventory_controlled_substance_management.md](docs/stories/P3-4_inventory_controlled_substance_management.md)

**Acceptance Criteria**
- Dispense decrements inventory by lot and fails if insufficient.
- Controlled substances require two-person verification and produce enhanced audit.

**Design / LLD**
- Add `inventory` table: `medication_id UUID, lot_number TEXT, expiry_date DATE, quantity_available NUMERIC`.
- `DispensesHandler` checks inventory in transaction and decrements the chosen lot.
- Controlled substances flagged by medication attribute `is_controlled boolean`; create two-person verification flow in pharmacist UI.

**Files to edit**
- `pharmacyms/migrations/*` add new migration
- `pharmacyms/internal/handler/dispenses.go`
- `ehr/src/app/pharmacy/*` UI enhancements

**Tests / Validation**
- Inventory decrement tests and two-person verification tests.

**Implementation tasks**
- Add migration, implement inventory logic, UI support, and tests.
