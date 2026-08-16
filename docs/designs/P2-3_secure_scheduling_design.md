# P2-3 Design — Secure scheduling and FHIR Appointment binding

Story: [docs/stories/P2-3_secure_scheduling.md](docs/stories/P2-3_secure_scheduling.md)

**Acceptance Criteria**
- Booking requires auth (or an explicit anonymous flow).
- Bookings create FHIR `Appointment` via `fhirCreate` and return FHIR id.
- Double-book prevention enforced.

**Design / LLD**
- Remove `/scheduling` from publicRoutes in `ehr/src/middleware.ts`.
- Add `POST /api/ehr/appointments` to validate and call `fhirCreate('Appointment', ...)`.
- Frontend scheduling UI updated to require sign-in and show patient info.

**Files to edit**
- [ehr/src/middleware.ts](ehr/src/middleware.ts)
- [ehr/src/app/scheduling/*](ehr/src/app/scheduling/)
- [ehr/src/app/api/ehr/appointments/route.ts] (new)

**Tests / Validation**
- Booking test with auth, conflict prevention test.

**Implementation tasks**
- Implement middleware change, server route, and UI adjustments.
