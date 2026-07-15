# ADR-002: NextAuth.js Credentials Provider with PENDING Role Gate

**Date:** 2025-07-15
**Status:** Accepted
**Context:** The system handles sensitive PHI. Role self-assignment is a critical security risk. Existing systems used open-registration.

## Decision
All new registrations are assigned `PENDING` role automatically. Admin must approve and assign a clinical role before access is granted. Middleware blocks `PENDING` users from all protected routes.

## Rationale
- Prevents unauthorized access to PHI (PHIPA §12, §16)
- Satisfies HIPA/Ontario requirement for user provisioning controls
- Simple to audit: every role assignment generates an AuditEvent

## Consequences
- **Positive:** Eliminates role self-selection exploit; full audit trail
- **Negative:** Adds operational overhead for admin; mitigated by admin users page
- **Mitigation:** `/admin/users` page provides one-click approval with role assignment dropdown

## References
- PHIPA 2004 §16 — Agent accountability
- HIPAA Security Rule §164.308(a)(4) — Access control