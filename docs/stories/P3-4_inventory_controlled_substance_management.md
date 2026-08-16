# P3-4: Inventory and controlled-substance management

**Summary:** Add inventory tracking (lot/expiry/quantity), partial fills, and controlled-substance workflows to PharmacyMS and pharmacist UI.

**Acceptance Criteria:**
- Dispense decrements inventory by lot; cannot dispense if insufficient quantity.
- Controlled substances require two-person verification and produce enhanced audit records.
- Lot and expiry are recorded and surfaced in pharmacist UI.

**LLD:**
- **DB:** add `inventory` table (`medication_id, lot_number, expiry_date, quantity_available`).
- **Backend:** `DispensesHandler.Create` checks and decrements within a transaction.
- **UI:** inventory view with warnings for expired lots; partial fill UI.
- **Compliance:** store extra audit data for controlled substances as required.

**Tasks:**
- [ ] Add DB migration for `inventory`.
- [ ] Implement inventory checks in `DispensesHandler`.
- [ ] Add pharmacist UI and two-person verification flow.
- [ ] Add tests and compliance audit logs.
