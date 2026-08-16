# P0-2 Design — Tighten dev bypasses in EHR middleware

Story: [docs/stories/P0-2_tighten_dev_bypasses.md](docs/stories/P0-2_tighten_dev_bypasses.md)

**Acceptance Criteria**
- ?asUser no longer bypasses auth unless ENABLE_E2E_BYPASS=true and E2E_BYPASS_ALLOWLIST contains allowed entries.
- x-playwright header bypass only allowed when ENABLE_E2E_BYPASS=true.
- CI/dev docs updated.

**Design / LLD**
- Update ehr/src/middleware.ts to read ENABLE_E2E_BYPASS and E2E_BYPASS_ALLOWLIST env vars and gate bypasses.
- Document required envs in README and CI configuration.

**Files to edit**
- ehr/src/middleware.ts
- .env.example (top-level or ehr/.env.example)

**Tests**
- Unit tests that ensure ?asUser returns redirect by default.

**Tasks**
- Implement middleware changes, add tests, and update docs.
