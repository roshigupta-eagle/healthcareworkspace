# Telehealth Calling Open-Source Inventory

**Status:** preliminary inventory. It distinguishes installed repository dependencies from candidate target components. It is not an approval, SBOM, license clearance, security scan, or production bill of materials.

## Inventory rules

Before any calling dependency is selected, record its exact version/digest, upstream repository, SPDX/license evidence, transitive dependencies, support owner, data-processing implications, vulnerability status, upgrade policy, and compatibility evidence. Use the existing project supply-chain tooling when selected; do not create a separate undocumented SBOM process.

`Unselected` or `unverified` below means that the repository inspection found no approved calling deployment/configuration, not that the component is unsafe or unavailable.

## Installed components relevant to the current local seam

| Component | Version evidence | License evidence | Current purpose | Repository / advisory source | Upgrade/security policy | Owner |
|---|---:|---|---|---|---|---|
| Next.js | `16.2.6` in `ehr/package.json` | Not independently verified in this inventory. | EHR routes and same-origin local communication facade. | Package metadata/upstream; GitHub Advisory Database and vendor advisories must be checked before release. | Existing EHR dependency policy; no calling-specific policy recorded. | EHR team. |
| React / React DOM | `19.2.4` in `ehr/package.json` | Not independently verified in this inventory. | Communication Hub UI. | Package metadata/upstream; GitHub Advisory Database. | Existing EHR policy; unverified. | EHR team. |
| NextAuth | `5.0.0-beta.31` in `ehr/package.json` | Not independently verified in this inventory. | Current session path used by local communication access. | Package metadata/upstream; GitHub Advisory Database. | Beta dependency suitability for production calling requires review. | EHR/IAM owner unassigned. |
| Prisma / Prisma Client | `6.19.3` in `ehr/package.json` | Not independently verified in this inventory. | EHR PostgreSQL clinical schema; not current calling persistence. | Package metadata/upstream; GitHub Advisory Database. | Existing EHR policy; compatibility with a separate calling control plane unverified. | EHR/data owner. |
| Go runtime | `1.26.3` in `fhir/go.mod` | Go distribution license not independently verified here. | Existing custom FHIR R4 service; not calling control plane. | Go release/security advisories and Go vulnerability database. | Pin/update through approved Go service process. | FHIR team. |
| Chi | `5.3.0` in `fhir/go.mod` | Not independently verified in this inventory. | Existing FHIR HTTP router. | Module metadata; Go vulnerability database/GitHub advisories. | Existing FHIR policy; reuse for a future service requires ADR. | FHIR team. |
| pgx | `5.9.2` in `fhir/go.mod` | Not independently verified in this inventory. | Existing FHIR PostgreSQL access. | Module metadata; Go vulnerability database/GitHub advisories. | Existing FHIR policy; reuse decision unapproved. | FHIR/data owner. |
| Goose CLI | Referenced by `fhir/Makefile`; version not pinned in inspected module manifest. | Unverified. | Existing FHIR migration command. | Official project/module metadata; Go vulnerability database. | Pin/version and ownership required before a new calling module relies on it. | FHIR/data owner. |

## Candidate telehealth components — not selected or deployed

| Component | Version | License | Proposed purpose | Repository / security advisory source | Upgrade policy | Owner/status |
|---|---:|---|---|---|---|---|
| LiveKit server and Go/JS SDKs | Unselected | Verify upstream SPDX/license and commercial/support terms. | WebRTC SFU/media control behind adapter. | Official LiveKit releases/security advisories; GitHub Advisory Database; container scanning. | Pin server/SDK compatibility matrix; patch under approved maintenance process. | Unassigned; provider/security/operations approval required. |
| PostgreSQL / PgBouncer | Existing EHR datasource names PostgreSQL; actual server/version unverified. | Verify deployed image/package evidence. | Durable calling control-plane store and pooling. | PostgreSQL security advisories/CVEs; image scanner. | Platform DBA policy, HA/PITR/restore evidence. | Data/platform owner unassigned. |
| Redis | Unselected for calling; project context lists Redis. | Verify selected distribution/license/version. | Ephemeral coordination, rate limits, provider needs only. | Vendor/project advisories; container scanner. | Platform policy; no clinical data durability. | Platform owner unassigned. |
| NATS JetStream | Unselected. | Verify upstream SPDX/license/version. | Candidate durable asynchronous transport if no existing approved bus fits. | NATS advisories/GitHub advisories; image scanner. | Pin and patch under platform policy. | Platform owner unassigned. |
| Apache Kafka | Unselected. | Verify selected distribution/license/version. | Existing-platform candidate event backbone, if one exists. | Selected distribution advisories/CVEs; image scanner. | Existing event-platform policy only. | Platform owner unassigned. |
| Centrifugo or existing realtime platform | Unselected; local SSE exists only. | Verify selected platform license/version. | Authorized realtime application notification fan-out. | Official advisories/GitHub advisories; image scanner. | Reuse existing platform first; no duplicate service without ADR. | Platform owner unassigned. |
| Coturn | Unselected. | Verify upstream SPDX/license/version. | Optional dedicated TURN relay only if topology requires it. | Coturn advisories/CVEs; image scanner. | Pin image and rotate credentials/certificates under network policy. | Network/operations owner unassigned. |
| OpenTelemetry SDK/Collector | Unselected for calling. | Verify selected package/image license/version. | Tracing and safe correlation. | OpenTelemetry advisories/GitHub advisories; image scanner. | Follow existing observability platform policy. | Observability owner unassigned. |
| Prometheus / Grafana | Unselected for calling. | Verify selected image/package license/version. | Metrics, dashboards, alerting. | Official advisories/CVEs; image scanner. | Follow existing observability platform policy. | Observability owner unassigned. |
| OpenBao or approved secret store | Unselected. | Verify product and deployment license/version. | Secret references and rotation. | Approved secret-platform advisories. | Follow enterprise secret-management policy. | Security/platform owner unassigned. |
| CloudNativePG / Barman or approved backup solution | Unselected. | Verify selected component license/version. | Possible PostgreSQL HA/backup/PITR implementation. | Official advisories/CVEs; image scanner. | Follow platform DBA policy; restore tests mandatory. | Data/platform owner unassigned. |

## Required SBOM and security evidence before release

1. Generate an SBOM covering Go modules, EHR/frontend packages, all images, infrastructure modules, and selected provider SDKs.
2. Run dependency, Go vulnerability, JavaScript dependency, container, IaC, and secret scans in the approved CI process.
3. Record scanner name/version/date, findings, remediation status, exception owner, and expiry. Do not ship known critical findings without documented risk acceptance.
4. Maintain a compatibility matrix for media server, SDK, browser support, TURN, and provider webhook schema.
5. Assign an owner and upgrade cadence to every selected component. This inventory intentionally has no approved calling-component owner yet.
