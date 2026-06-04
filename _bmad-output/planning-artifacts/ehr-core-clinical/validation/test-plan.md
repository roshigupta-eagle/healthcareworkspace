# Test Plan — ehr-core-clinical

**Date:** 2026-05-13
**Author:** Amelia (Backend), Jordan (Frontend)
**Target application(s):** ehr-hospital, ehr-practice, fhir

## Test scope

| Test type | Tool | Owner | Coverage target |
|---|---|---|---|
| Unit tests (Go) | `testing` + `testify` | Amelia | ≥ 80% |
| Unit tests (TypeScript) | Jest / Vitest | Jordan | ≥ 80% |
| Integration tests | | Amelia | All service boundaries |
| FHIR conformance | HAPI validator | Alex | All profiles |
| E2E tests | Playwright | Amelia, Jordan | All acceptance criteria |
| Performance tests | k6 / Artillery | Amelia | NFR targets |
| Security tests | Trivy, gosec | Amelia | No critical findings |
| Accessibility tests | axe, Lighthouse | Jordan, Sally | WCAG 2.2 AA |

## Test data

<!-- How will test data be generated? FHIR test resources? -->

## Test environments

| Environment | Purpose | Data |
|---|---|---|
| Dev | Unit + integration | Synthetic |
| Staging | E2E + performance | Anonymized |

## Exit criteria

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] FHIR conformance tests pass
- [ ] E2E tests cover all acceptance criteria
- [ ] Performance meets NFR targets
- [ ] No critical security findings
- [ ] Accessibility audit passes
