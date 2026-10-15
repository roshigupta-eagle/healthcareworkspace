# Roshi Telehealth Calling Documentation

## Purpose and status

This directory records the evidence, target decisions, and release gates for the Roshi telehealth calling capability. It was created from the calling-platform implementation prompt dated 2026-09-20 and from repository inspection. It is documentation, not evidence that a production calling platform is deployed.

The currently running EHR Communication Hub is a local-development implementation. It uses a Next.js route facade and a JSON-backed store; it does not have a configured media provider, durable calling control plane, or production deployment. See [the current-state audit](../../communications/CURRENT_STATE_AUDIT.md) for the source-of-truth status.

## Reading order

1. [Current-state discovery](00-current-state-discovery.md) identifies the existing boundary and confirmed gaps.
2. [503 root-cause record](01-503-root-cause.md) distinguishes the intentional local provider-unavailable response from an unverified infrastructure outage.
3. [Environment guidance](environment-guidance.md) and the [ADRs](adr/) establish target decisions and prerequisites without creating duplicate infrastructure.
4. [FHIR and terminology handoff](fhir-terminology-handoff.md) keeps operational call state separate from governed FHIR projection work.
5. [Control-plane contract v1](control-plane-contract.md) defines the canonical lifecycle and the no-lossy-mapping boundary for the current EHR development facade.
6. [Security threat model](security-threat-model.md), [runbooks](runbooks/), and [open-source inventory](open-source-inventory.md) define production gates.
7. [Implementation report](implementation-report.md) is a truthful, living completion record; all unverified work remains marked as such.

## Non-negotiable boundaries

- Roshi owns clinical and calling control-plane truth; a media provider owns WebRTC media transport only.
- PostgreSQL is the target durable store; Redis and realtime channels are not clinical systems of record.
- Call history must be readable without a media-provider dependency.
- A CallSession is not an Encounter; recording, transcription, and AI are out of scope for this implementation.
- Do not use patient names, MRNs, diagnoses, or other PHI in provider room names, opaque channels, generic logs, metrics labels, URLs, or lock-screen notifications.
- No document here authorizes external deployment, account creation, use of real patient data, production credentials, firewall changes, or claims of PHIPA/HIPAA compliance.

## Required release progression

The implementation prompt defines eight gates: foundation, ringing, audio, reliability, video, group calling, telehealth workflow, and production hardening. A local modal, room creation, or two local tabs are not completion evidence. The full acceptance evidence is tracked in [implementation-report.md](implementation-report.md).

## Relationship to existing communication documentation

The target calling work must remain compatible with the EHR-facing `/api/communication/v1` facade and reconcile with the canonical [Communication HLD](../../communications/HLD.md), [Communication LLD](../../communications/LLD.md), and [Communication PRD](../../communications/01_Roshi_Communication_PRD.md). These documents do not create a second communication architecture or make the FHIR service the calling control plane.
