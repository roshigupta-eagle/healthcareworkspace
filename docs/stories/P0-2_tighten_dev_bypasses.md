# P0-2: Tighten dev bypasses in EHR middleware

**Summary:** Remove unsafe development bypasses from `ehr/src/middleware.ts` (`?asUser=`, unconditional `x-playwright` allow) and replace with an explicit, documented test harness mechanism.

**Acceptance Criteria:**
- `?asUser=` no longer bypasses authentication unless `ENABLE_E2E_BYPASS=true` and `E2E_BYPASS_ALLOWLIST` contains allowed entries.
- `x-playwright` header bypass only allowed when `ENABLE_E2E_BYPASS=true`.
- Local dev/CI instructions updated to document how to enable bypass safely.
- Automated test proves bypass disabled by default.

**LLD:**
- **Config:** add `ENABLE_E2E_BYPASS=false` by default and `E2E_BYPASS_ALLOWLIST` as comma-separated values.
- **Middleware change:** update `ehr/src/middleware.ts` to check `process.env.ENABLE_E2E_BYPASS` and validate `asUser` only when allowed and matched in `E2E_BYPASS_ALLOWLIST`.
- **CI:** ensure CI sets the env var explicitly during E2E runs only.
- **Tests:** add unit tests demonstrating `?asUser` returns redirect when bypass disabled.

**Implementation Tasks:**
- [ ] Update `middleware.ts` logic.
- [ ] Add env var docs and examples for CI/local dev.
- [ ] Add unit tests for middleware behavior.
- [ ] Run E2E in staging to verify.
