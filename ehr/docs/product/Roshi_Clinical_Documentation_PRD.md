# Roshi EHR Clinical Documentation & Enterprise Notes Platform (PRD)
Version: 1.0
Status: Draft
Owner: Product Management
Target: Enterprise Healthcare (Hospitals, Clinics, Telehealth)

## Executive Summary
The Clinical Documentation module (Roshi Notes) provides an enterprise-grade documentation platform for Roshi EHR enabling clinicians to create, edit, review, sign, audit, collaborate on and manage clinical notes while maintaining regulatory compliance and HL7 FHIR compatibility.

This PRD describes scope, goals, high-level architecture, and a staged implementation plan for a structured clinical documentation experience supporting SOAP, Progress, Consultation, Operative, Nursing, Discharge, Referral and other clinical note types, with AI assistance, versioning, audit, digital signatures and FHIR export.

## Vision
Build a modern clinical documentation platform combining the best of Epic-style clinical workflows, Google-Docs collaboration, and GitHub-style version history — integrated with FHIR and enterprise audit trails.

## Goals
- Rich text + structured clinical components
- Real-time collaboration and offline sync
- Robust version history and immutable audit trail
- Digital signatures and certified provenance
- FHIR-native export (Composition / DocumentReference / Observations)

## Recommended Stack (summary)
- Editor: Tiptap (ProseMirror)
- Collab: Yjs + Hocuspocus
- Backend: NestJS + Temporal
- DB: PostgreSQL (snapshots + append-only audit tables)
- Search: OpenSearch
- Cache: Redis
- Storage: S3-compatible
- Auth: OIDC / SMART on FHIR

## Major features (summary)
- Structured templates (SOAP, Progress, Discharge...)
- Smart phrases and slash commands
- Medical components (Medication card, Vitals card, Lab result card)
- Voice dictation (Whisper / Browser / Azure)
- AI assistant for summarization and coding
- Autosave, offline sync, conflict resolution
- Version history + change acceptance
- Audit history (immutable, append-only)
- FHIR mappings (Composition, DocumentReference, Observations)
- Digital signing workflow

## Implementation roadmap (high level)
1. PRD + design exploration + API contract (this document)
2. Basic editorial experience (Tiptap) + save/load API + FHIR export
3. Versioning service + snapshot storage + UI for historical compare
4. Audit service + append-only events + retention policies
5. Collaboration (Yjs) + presence + cursor + offline sync
6. AI assistant integration + clinical prompts
7. Digital signature integration + legal attestation
8. E2E tests, performance tuning, enterprise hardening

## Notes for developers
- Start with an isolated editor component and a minimal DocumentService API
- Provide a `mapNoteToFHIR(patient, note)` helper for export
- Keep the UI accessible (WCAG 2.1 AA) and keyboard-first
- Autosave should be optimistic and idempotent; show clear saving states
- Version storage: JSON snapshots in PostgreSQL with metadata

---
This file is a first-draft PRD saved to the repository for alignment. For implementation tasks, refer to the Design and API section in this document and create incremental stories with verification criteria.
