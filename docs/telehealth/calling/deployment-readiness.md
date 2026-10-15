# Telehealth Calling Deployment Readiness

**Status:** This is a release gate, not evidence of a remote deployment. The EHR and `communication` images can be built locally, but no production LiveKit, TURN, DNS, certificate, credential, or clinical-data environment is created by this repository change.

## Scope and boundaries

- The EHR image serves the application. It must receive configuration and any persistent data location at runtime; local JSON data and `.env` files are deliberately excluded from its build context.
- The `communication` image is the private call-control service. It exposes `/healthz` and `/readyz`; it is not a LiveKit media-server image and must not be made Internet-facing merely to support browser media.
- LiveKit media is a separate, approved managed service or self-hosted deployment. The application creates room credentials server-side only; a browser receives a short-lived, scoped join token, never an API secret.
- Local work stays on loopback with synthetic identities and non-production credentials. A remote environment needs separately approved tenant, network, data-residency, identity, audit, and operations controls.

## Preconditions for a remote environment

1. Name the environment owner, on-call path, rollback owner, approved container registry, release pipeline, and isolated staging/production accounts. Build images in CI and promote immutable image digests rather than building on a clinical host.
2. Inject `DATABASE_URL`, service authentication, LiveKit API credentials, and runtime configuration from the approved secret store. Do not put values in Dockerfiles, image layers, client bundles, logs, screenshots, or source-controlled env files.
3. Run the communication migration job against the approved PostgreSQL database before a compatible service rollout; take/verify a backup and test a rollback/restore procedure. Keep `CallSession` operational data separate from FHIR Encounter truth.
4. Put the EHR and call-control API behind the approved HTTPS ingress and private service network. Enforce user/organization/appointment authorization in the EHR BFF before minting a room token, and retain PHI-safe audit events.
5. Select the LiveKit hosting model and region/data-residency boundary. For self-hosting, provide a public DNS name and trusted TLS certificate, load balancing, capacity, monitoring, and a documented upgrade path. LiveKit's [self-hosting overview](https://docs.livekit.io/transport/self-hosting/) and [Kubernetes guidance](https://docs.livekit.io/transport/self-hosting/kubernetes/) describe the deployment constraints.
6. Have network/security staff allow only the LiveKit paths required by the selected topology. The official [ports and firewall reference](https://docs.livekit.io/transport/self-hosting/ports-firewall/) covers the default API/WebSocket, ICE UDP/TCP, and optional TURN ports; it does **not** mean those ports belong on the EHR or communication containers. Validate TURN/TLS for restrictive clinic and home networks using the official [connection guidance](https://docs.livekit.io/intro/basics/connect/).

## Concrete verification checklist

- [ ] Build without local secrets or data: `docker build -f ehr/Dockerfile ehr` and `docker build -f communication/Dockerfile communication`.
- [ ] Inspect the produced images and CI logs: no `.env`, certificate/private-key, local `data/`, test artifact, or API secret is present. Confirm the communication image has only the server, migration executable, and SQL migrations required at runtime.
- [ ] Deploy the communication migration as a one-off, authenticated job; verify its database migration state, then deploy the API with `/healthz` and `/readyz` monitored separately.
- [ ] Confirm the EHR can read call history while the media provider is unavailable, and that a new media action returns a controlled unavailable result rather than fabricated success.
- [ ] Exercise the token endpoint using synthetic patient and clinician accounts: an unauthorized caller is denied; an authorized caller receives a short-lived token limited to its opaque room, identity, and required grants. LiveKit documents the token/grant model in [Tokens & grants](https://docs.livekit.io/home/server/generating-tokens).
- [ ] Verify browser bundles, network traces, and logs contain no LiveKit API secret, patient name, MRN, encounter identifier, or raw room metadata.
- [ ] Complete two-browser audio/video calls from separate networks, then repeat under UDP-restricted and TCP/TURN/TLS fallback conditions. Verify reconnect, hangup, timeout, multi-device acceptance, and late-event idempotency against the durable call record.
- [ ] Perform staging load, security, accessibility, alert, audit, backup/restore, incident-runbook, and rollback exercises with synthetic data before any production approval.

## What remains intentionally outside this change

No public endpoint, firewall rule, LiveKit project/server, TURN credential, DNS record, certificate, cloud account, secret, patient eligibility decision, or production deployment is created here. The current production path therefore fails closed: a patient video call cannot be created or joined until an approved account, care-relationship, consent, visit-authorization, explicit patient-acceptance, device/presence, and realtime/push-delivery design is configured server-side. Those actions require the identified platform, privacy, security, and clinical owners to approve the environment-specific release plan.
