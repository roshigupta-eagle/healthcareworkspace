# Telehealth Calling Security Threat Model

**Status:** target threat model for design and verification. It does not constitute a PHIPA/HIPAA certification, privacy impact assessment, penetration test, or production security approval.

## Scope and assets

The protected assets are CallSession state/history, participant relationships, patient/appointment/encounter references, consent and verification evidence, device registrations, short-lived media credentials, provider webhook integrity, recordings if later approved, audit evidence, and service secrets. Media is transported by the approved media provider; Roshi owns the clinical/control-plane facts.

### Trust boundaries

```text
Clinician/patient/caregiver/interpreter browser or device
  -> EHR facade / calling control plane (identity, authorization, durable state)
  -> approved event/realtime or push delivery boundary
  -> approved media provider and TURN (scoped media credentials)
  -> provider webhook back to calling control plane

PostgreSQL and approved audit/secret/observability systems remain server-side.
```

No party gains access merely by knowing a CallSession ID, patient ID, provider room ID, realtime channel, or webhook URL.

## Threats and required controls

| Threat | Required preventive controls | Detection/response | Current local status |
|---|---|---|---|
| IDOR / cross-patient access | Server-side tenant, organization, patient, participant, role, consent, and action checks on every read/write; opaque identifiers; no UI-only enforcement. | Denied-access audit, security tests, correlation IDs. | Local participant/patient checks only; production policy is not implemented. |
| Cross-tenant access | Tenant/organization filters are mandatory query predicates and policy inputs; never fetch by call ID alone. | Negative API tests and tenant-scoped audit review. | Unverified/no durable calling store. |
| Token theft or replay | Server-only signing key, short TTL, scoped room/participant/permissions, TLS, no token in URL/log/storage, expiry and audience validation. | Token misuse alerts and expired/wrong-room/wrong-user tests. | No media token exists. |
| Room enumeration / PHI leakage | Opaque room and participant identities; no names/MRNs/diagnoses in provider names, URLs, labels, metrics, or push. | Log/metric/payload review and privacy tests. | No provider room exists. |
| Unauthorized participant | Calling authorization before invitation/join; caregiver/interpreter verification; lock/admit/moderate actions server-authorized. | Participant-change audit; verified provider events; authorization tests. | Not implemented. |
| Malicious or replayed webhook | Verify provider signature, timestamp/replay protection where supported, content type, payload size, event ID idempotency, and source configuration. | Rejected-webhook audit/alert; invalid-signature tests. | No webhook endpoint exists. |
| Session hijack | Secure session handling, CSRF/redirect protection as applicable, token validation, re-authentication policy, least-privilege roles, and TLS. | Session anomaly/audit review. | Production IAM/session policy unverified. |
| Rate abuse / denial of service | Per-actor/device/tenant rate limits for create, token, accept/join, invitation; bounded payloads/timeouts; provider quotas and WAF/network controls. | Rate-limit and saturation telemetry; escalation runbook. | Not implemented for calling. |
| Provider/dependency failure cascade | Transactional outbox, deadlines, bounded retry/backoff/jitter, circuit breaking, provider-independent history. | Dependency-specific health/dashboard/alert; controlled problem responses. | Current no-provider path is controlled; no production resilience exists. |
| Secrets/credential leakage | Approved secret store, least privilege, rotation, redaction, no committed secrets or browser signing keys. | Secret-scanning and incident procedure. | No calling secrets configured. |
| Push-notification privacy leak | Minimum-necessary neutral notification text; no diagnosis, MRN, or sensitive call context on lock screens; authorize destination/device. | Payload review and device tests. | No push provider exists. |
| Unsafe recording/transcription/AI | Default off; separate policy, consent, authorization, storage, audit and retention gates. | Audit and policy-denial tests. | Out of scope; not configured. |

## Design requirements

1. Authenticate at the control plane and resolve trusted tenant, organization, roles, and subject context before any call action.
2. Treat participant type as descriptive, not authorization. Re-evaluate caregiver, RelatedPerson, interpreter, specialist, and observer access before invitation and token issuance.
3. Persist only safe technical quality summaries; do not put high-frequency media telemetry or raw media metadata into general transactional tables without a retention/privacy decision.
4. Emit structured, PHI-safe logs with correlation/trace IDs, opaque call IDs, safe tenant context where approved, and error code. Never log credentials, full webhook payloads, recordings, transcripts, names, DOB, diagnoses, or notes indiscriminately.
5. Require signed, idempotently consumable provider events before a media connection changes trusted call state. Token issuance alone is not ACTIVE.
6. Keep CallSession operational truth separate from FHIR projection, Encounter status, provider room state, and Redis/realtime cache.

## Security verification matrix

| Test | Required result |
|---|---|
| Unauthorized and unauthenticated list/detail/action | Deny without leaking call existence or patient context. |
| Cross-patient and cross-tenant guessed call ID | Deny server-side; audit safely. |
| Duplicate create/accept race | Exactly one deterministic state outcome; no double ringing, token, or state history. |
| Expired/reused/wrong-room/wrong-identity token | Join is denied. |
| Invalid/replayed/oversized webhook | Rejected before state mutation. |
| Provider/TURN/realtime/store outage | Controlled, minimum-necessary errors; no corrupted or fabricated state. |
| PHI inspection | Room names, URLs, event channels/payloads, logs, metrics, traces, dashboards and push text contain no prohibited PHI. |
| Accessibility/error handling | Patients receive plain, non-technical failure language; clinicians receive only approved actionable detail. |

## Residual risks and approvals required

Production risk acceptance requires privacy, security, clinical, provider, IAM, network, operations, and legal/organizational owners. Required decisions include the provider's data-processing/residency terms, emergency/alternative workflow, patient identity/consent policy, mobile-device controls, incident response, retention, audit access, vulnerability management, and accessibility review. No security control in this document substitutes for those approvals.
