# P2-3: Protect scheduling and bind bookings to patient identity

**Summary:** Move scheduling behind authentication (or implement controlled anonymous flow), require patient identity for bookings, and persist `Appointment` to FHIR.

**Acceptance Criteria:**
- Unauthenticated user is redirected to login for booking unless an anonymous booking flow is explicitly enabled.
- Bookings create a FHIR `Appointment` via `fhirCreate('Appointment', ...)` and return a confirmation with FHIR id.
- Calendar shows provider availability and prevents double-booking.

**LLD:**
- **Middleware:** remove `/scheduling` from publicRoutes in `ehr/src/middleware.ts`.
- **Frontend:** require login or present anonymous booking token flow.
- **Server:** `POST /api/ehr/appointments` performs validation and `fhirCreate`.
- **Tests:** booking and double-book verification.

**Tasks:**
- [ ] Update middleware and UI flows.
- [ ] Implement server-side appointment creation.
- [ ] Add tests and staging verification.
