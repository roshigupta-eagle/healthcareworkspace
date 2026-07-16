# Low-Level Design — Healthcare Platform (Overall)

**Version:** 1.0  
**Date:** 2026-07-01  
**Author:** Alex (FHIR SME Architect)  
**Jurisdiction:** Ontario / Canada (primary) · United States (secondary)  
**Status:** In Review

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack Reference](#2-technology-stack-reference)
3. [Database Schemas (Verified)](#3-database-schemas-verified)
4. [Service LLD — FHIR Server](#4-service-lld--fhir-server)
5. [Service LLD — EHR Frontend](#5-service-lld--ehr-frontend)
6. [Service LLD — LIMS](#6-service-lld--lims)
7. [Service LLD — PharmacyMS](#7-service-lld--pharmacyms)
8. [FHIR Resource Catalogue](#8-fhir-resource-catalogue)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Inter-Service Integration](#10-inter-service-integration)
11. [State Machine Reference — Cardiology Visit FSM](#11-state-machine-reference--cardiology-visit-fsm)
12. [API Contract Reference](#12-api-contract-reference)
13. [Data Flow Diagrams](#13-data-flow-diagrams)
14. [Security Controls Checklist](#14-security-controls-checklist)
15. [Known Gaps & Priority Work Items](#15-known-gaps--priority-work-items)
16. [Epic-Level HLD & LLD](#16-epic-level-hld--lld)

---

## 1. System Overview

```
+------------------+        +------------------+       +------------------+
|   EHR Frontend   |        |   PharmacyMS     |       |   LIMS           |
|   Next.js 16     |        |   Go REST API    |       |   Go REST API    |
|   React 19       |        |   :8082          |       |   :8083          |
+--------+---------+        +--------+---------+       +--------+---------+
         |                           |                          |
         | FHIR R4 REST              | FHIR R4 REST             | HL7v2 / FHIR
         v                           v                          v
+--------+--------------------------------------------------+--+------------+
|                     FHIR Server (Go)  :8081                               |
|   /fhir/R4/{resourceType}       — FHIR R4 CRUD + Search                  |
|   /cardiology/*                 — Visit FSM, Queues, Rooms, Dashboard     |
|   /lab/*                        — HL7v2 + FHIR ingestion pipeline         |
+----------------------------------+----------------------------------------+
                                   |
                     +-------------+-----------+
                     |                         |
              +------+-------+        +--------+-------+
              |  PostgreSQL  |        |   Redis         |
              |  fhir_dev    |        |   (future)      |
              |  lims_dev    |        +-----------------+
              |  pharmacyms  |
              +--------------+
```

### 1.1 Port Map

| Service | Port | Database |
|---|---|---|
| EHR (Next.js) | 3000 (3001 if occupied) | PostgreSQL via Prisma (NextAuth users) |
| FHIR Server (Go) | 8081 | `fhir_dev` |
| PharmacyMS (Go) | 8082 | `pharmacyms_dev` |
| LIMS (Go) | 8083 | `lims_dev` |
| PostgreSQL | 5432 | — |
| Redis | 6379 | — (not yet deployed) |

### 1.2 Repository Structure

```
healthcareworkspace/
├── ehr/                    Next.js 16 frontend (React 19, TypeScript strict)
│   ├── src/app/            Next.js App Router pages + API routes
│   ├── src/cardiology/     Cardiology domain: types, components, mock API
│   ├── src/design-system/  7-layer design system (WCAG 2.1 AA)
│   └── prisma/             Prisma schema (NextAuth users/sessions)
├── fhir/                   FHIR server (Go, chi v5, pgx v5)
│   ├── internal/authmw/    JWT + API-key middleware
│   ├── internal/cardiology/ Visit FSM, queues, rooms, simulator
│   ├── internal/fhirhandler/ FHIR R4 REST handlers
│   ├── internal/fhirstore/  FHIR resource CRUD + versioning
│   ├── internal/fhirsearch/ Search parameter extraction + querying
│   ├── internal/labingestion/ HL7v2 + FHIR lab result ingestion
│   └── migrations/          Goose SQL migrations (4 files)
├── lims/                   LIMS service (Go, schema only - no API handlers yet)
│   └── migrations/00001_lims_core.sql
├── pharmacyms/             PharmacyMS (Go, schema only - no API handlers yet)
│   └── migrations/00001_pharmacy_core.sql
├── scripts/                start-all.ps1, port-forward.ps1
└── go.work                 Go workspace linking all modules
```

---

## 2. Technology Stack Reference

| Layer | Technology | Version / Notes |
|---|---|---|
| Frontend framework | Next.js | 16.2.6 (App Router, Turbopack) |
| Frontend UI | React | 19.2.4 |
| Frontend language | TypeScript | 5.x strict mode |
| Styling | Tailwind CSS | v4 (CSS variables) |
| Auth (frontend) | NextAuth v5 beta | next-auth@5.0.0-beta.31 |
| ORM (frontend) | Prisma | 6.19.3 |
| Backend language | Go | 1.22+ |
| HTTP router | chi | v5 |
| DB driver | pgx | v5 (pgxpool) |
| DB migrations | Goose | SQL-based |
| Database | PostgreSQL | 15+ |
| Password hashing | bcryptjs | 3.x (frontend) |
| Token signing | HMAC-SHA256 | HS256 JWT (Go backend) |
| Testing (frontend) | Vitest | 4.1.8 |
| E2E testing | Playwright | 1.60.0 |
| Container | Docker / Kubernetes | (not yet provisioned locally) |

---

## 3. Database Schemas (Verified)

### 3.1 Database: `fhir_dev` — FHIR Server

#### Table: `fhir_resources` (primary FHIR store)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, default gen_random_uuid() | Internal row ID |
| tenant_id | TEXT | FK → tenants.id, NOT NULL | Multi-tenancy scope |
| resource_type | TEXT | NOT NULL | e.g. Patient, Encounter |
| fhir_id | TEXT | NOT NULL | FHIR logical ID |
| version_id | BIGINT | NOT NULL DEFAULT 1 | Optimistic locking |
| last_updated | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| is_deleted | BOOLEAN | NOT NULL DEFAULT false | Soft delete |
| data | JSONB | NOT NULL | Full FHIR R4 resource JSON |

Indexes: `uq_fhir_resources_tenant_type_id` (UNIQUE), `idx_fhir_resources_type`, `idx_fhir_resources_last_updated`, `idx_fhir_resources_data_gin` (GIN on data)

#### Table: `fhir_history` (append-only version log)

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | TEXT | FK → tenants |
| resource_type | TEXT | |
| fhir_id | TEXT | |
| version_id | BIGINT | |
| last_updated | TIMESTAMPTZ | |
| operation | TEXT | CHECK IN ('create','update','delete') |
| data | JSONB | NULL for deletes |

#### Table: `fhir_search_params` (extracted search index)

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL | PK |
| tenant_id | TEXT | FK → tenants |
| resource_type | TEXT | |
| fhir_id | TEXT | |
| param_name | TEXT | e.g. "identifier", "name", "birthdate" |
| param_type | TEXT | token | string | date | reference | uri |
| value_string | TEXT | String / token code / reference URL |
| value_system | TEXT | Token system |
| value_date | TIMESTAMPTZ | Date params |
| value_number | NUMERIC | Quantity params |

#### Table: `tenants`

| Column | Type | Notes |
|---|---|---|
| id | TEXT | PK (e.g. "default") |
| name | TEXT | Display name |
| plan | TEXT | CHECK IN ('free','starter','professional','enterprise') |
| is_active | BOOLEAN | |
| created_at / updated_at | TIMESTAMPTZ | |

#### Table: `api_keys`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | TEXT | FK → tenants |
| key_hash | TEXT | UNIQUE — SHA-256 hex of raw key |
| name | TEXT | Human label |
| role | TEXT | CHECK IN ('service','admin','read-only') |
| is_active | BOOLEAN | |
| last_used | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | |

#### Table: `cardiology_rooms`

| Column | Type | Notes |
|---|---|---|
| id | TEXT | PK (compound with tenant_id) |
| tenant_id | TEXT | FK → tenants |
| name | TEXT | e.g. "Exam Room 1" |
| room_type | TEXT | WAITING / CHECK_IN / EXAM / ECG / ECHO / STRESS_TEST / HOLTER / CONSULT / LAB / CHECKOUT / BILLING |
| capacity | INT | |
| fhir_location_id | TEXT | Optional FK to FHIR Location resource |
| is_active | BOOLEAN | |

Seeded rooms: waiting-room (20), checkin-1, checkin-2, exam-1/2/3, ecg-1, echo-1, stress-1, holter-1, consult-1/2, blood-draw-1, checkout-1, billing-1

#### Table: `cardiology_visit_state`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | TEXT | FK → tenants |
| encounter_id | TEXT | FHIR Encounter logical ID, UNIQUE per tenant |
| patient_id | TEXT | FHIR Patient logical ID |
| appointment_id | TEXT | FHIR Appointment logical ID (nullable) |
| referral_id | TEXT | FHIR ServiceRequest logical ID (nullable) |
| current_state | TEXT | FSM state (see §11) |
| previous_state | TEXT | Before last transition |
| visit_type | TEXT | NEW_PATIENT / FOLLOW_UP / URGENT / PROCEDURE |
| priority | TEXT | URGENT / HIGH / NORMAL / LOW |
| assigned_physician_id | TEXT | FHIR Practitioner ID |
| assigned_nurse_id | TEXT | FHIR Practitioner ID |
| current_room_id | TEXT | FK → cardiology_rooms.id |
| chief_complaint | TEXT | |
| arrived_at | TIMESTAMPTZ | Set on first physical arrival |
| state_entered_at | TIMESTAMPTZ | When current_state was entered |
| discharged_at | TIMESTAMPTZ | Terminal state timestamp |
| metadata | JSONB | Additional structured data |

Indexes: `cvs_tenant_state_idx`, `cvs_patient_idx`

#### Table: `cardiology_events` (immutable domain event log)

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | TEXT | FK → tenants |
| sequence_no | BIGSERIAL | Global ordering within tenant |
| encounter_id | TEXT | Which visit |
| patient_id | TEXT | |
| event_type | TEXT | (see EventType enum §11) |
| from_state | TEXT | |
| to_state | TEXT | |
| actor_id | TEXT | FHIR Practitioner/Patient ID |
| actor_role | TEXT | |
| room_id | TEXT | |
| notes | TEXT | |
| payload | JSONB | Arbitrary event data |
| occurred_at | TIMESTAMPTZ | |

Indexes: `ce_encounter_seq_idx`, `ce_tenant_seq_idx`

#### Table: `cardiology_queue_items`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | TEXT | FK → tenants |
| queue_name | TEXT | See QueueName enum §11 |
| encounter_id | TEXT | Which visit |
| patient_id | TEXT | |
| appointment_id | TEXT | |
| title | TEXT | Display label |
| description | TEXT | |
| priority | INT | 0=highest (URGENT), 100=lowest |
| status | TEXT | PENDING / IN_PROGRESS / COMPLETED / CANCELLED |
| assigned_to_id | TEXT | FHIR Practitioner ID |
| due_at | TIMESTAMPTZ | SLA deadline |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |
| payload | JSONB | |

Indexes: `cq_queue_status_idx`, `cq_encounter_idx`

#### Table: `lab_ingestion_log`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | TEXT | FK → tenants |
| source_system | TEXT | LIFELABS / DYNACARE / OLIS / INSTRUMENT / FHIR_PUSH / UNKNOWN |
| source_facility | TEXT | MSH-4 |
| message_type | TEXT | HL7V2_ORU_R01 / FHIR_DIAGNOSTICREPORT / FHIR_BUNDLE |
| message_id | TEXT | MSH-10 or Bundle.id |
| accession_number | TEXT | Dedup key |
| raw_ohip_number | TEXT | PID-19 (Ontario HCN) |
| raw_mrn | TEXT | PID-3 |
| raw_patient_name | TEXT | PID-5 |
| raw_dob | TEXT | PID-7 YYYYMMDD |
| matched_patient_id | TEXT | FHIR Patient.id after matching |
| status | TEXT | RECEIVED→PARSING→PARSED→MATCHING→MATCHED→NORMALIZING→NORMALIZED→STORED→FAILED→DUPLICATE→MANUAL_REVIEW |
| error_message | TEXT | |
| retry_count | INT | |
| diagnostic_report_id | TEXT | FHIR DiagnosticReport.id |
| observation_ids | TEXT[] | FHIR Observation.ids |
| raw_payload | TEXT | Raw HL7v2 / JSON stored for replay |
| parsed_json | JSONB | Intermediate parsed structure |
| received_at / processed_at / created_at / updated_at | TIMESTAMPTZ | |

Unique index: `(tenant_id, source_system, accession_number)` WHERE status NOT IN ('FAILED')

#### Table: `lab_source_profiles`

| Column | Type | Notes |
|---|---|---|
| source_system | TEXT | UNIQUE per tenant |
| display_name | TEXT | |
| message_format | TEXT | HL7V2 / FHIR |
| hl7_sending_app | TEXT | MSH-3 match pattern |
| hl7_sending_fac | TEXT | MSH-4 match pattern |
| match_strategy | TEXT | Comma-separated priority: OHIP,MRN,NAME_DOB |
| is_active | BOOLEAN | |

Seeded: LIFELABS, DYNACARE, OLIS-ONTARIO

---

### 3.2 Database: `lims_dev` — LIMS

#### Table: `lab_tests` (catalogue)

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| loinc_code | TEXT | UNIQUE — international LOINC |
| name | TEXT | |
| category | TEXT | chemistry / hematology / microbiology / etc. |
| units | TEXT | UCUM |
| created_at | TIMESTAMPTZ | |

#### Table: `lab_orders` (FHIR ServiceRequest equivalent)

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| patient_fhir_id | TEXT | FHIR Patient.id |
| orderer_id | TEXT | FHIR Practitioner.id |
| lab_test_id | UUID | FK → lab_tests |
| status | TEXT | CHECK IN ('pending','in-progress','completed','cancelled') |
| priority | TEXT | CHECK IN ('routine','urgent','stat') |
| ordered_at | TIMESTAMPTZ | |
| notes | TEXT | |

Indexes: `idx_lab_orders_patient`, `idx_lab_orders_status`

#### Table: `lab_results` (FHIR Observation equivalent)

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| order_id | UUID | FK → lab_orders |
| lab_test_id | UUID | FK → lab_tests |
| value_numeric | NUMERIC | |
| value_text | TEXT | |
| value_coded | TEXT | SNOMED/LOINC answer code |
| units | TEXT | UCUM |
| reference_range | TEXT | |
| interpretation | TEXT | CHECK IN ('N','H','L','HH','LL','A') |
| status | TEXT | CHECK IN ('preliminary','final','amended','cancelled') |
| resulted_at | TIMESTAMPTZ | |
| resulted_by | TEXT | Lab technician ID |

Indexes: `idx_lab_results_order`, `idx_lab_results_status`

---

### 3.3 Database: `pharmacyms_dev` — PharmacyMS

#### Table: `medications` (master drug catalogue)

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| din | TEXT | UNIQUE — Health Canada Drug Identification Number |
| name | TEXT | Brand name |
| generic_name | TEXT | INN |
| form | TEXT | tablet / capsule / liquid / injection / etc. |
| strength | TEXT | e.g. "20mg" |
| created_at | TIMESTAMPTZ | |

#### Table: `prescriptions` (FHIR MedicationRequest equivalent)

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| patient_fhir_id | TEXT | FHIR Patient.id |
| prescriber_id | TEXT | FHIR Practitioner.id |
| medication_id | UUID | FK → medications |
| status | TEXT | CHECK IN ('active','completed','cancelled','on-hold') |
| dosage_text | TEXT | Signa (free text for now) |
| quantity | NUMERIC | |
| refills | INTEGER | NOT NULL DEFAULT 0 |
| issued_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | |
| notes | TEXT | |

Indexes: `idx_prescriptions_patient`, `idx_prescriptions_status`

#### Table: `dispenses` (FHIR MedicationDispense equivalent)

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| prescription_id | UUID | FK → prescriptions |
| dispensed_by | TEXT | Pharmacist identifier |
| dispensed_at | TIMESTAMPTZ | |
| quantity | NUMERIC | |
| lot_number | TEXT | |
| expiry_date | DATE | |

Index: `idx_dispenses_prescription`

---

### 3.4 Database: EHR (Prisma / NextAuth)

Managed by Prisma ORM. Key tables:

| Table | Purpose |
|---|---|
| User | NextAuth users: id, email, name, role, password_hash |
| Session | NextAuth sessions |
| Account | OAuth provider links |
| VerificationToken | Email verification |

Role values in use: `PATIENT`, `DOCTOR`, `NURSE`, `ADMIN`, `RECEPTIONIST`, `TECHNICIAN`, `BILLING`

---

## 4. Service LLD — FHIR Server

**Language:** Go 1.22+ | **Router:** chi v5 | **Port:** 8081

### 4.1 Package Structure

```
fhir/
├── cmd/server/main.go          Entry point — load config, connect DB, start HTTP
├── internal/
│   ├── authmw/                 JWT + API-key middleware (HS256, dev bypass)
│   ├── cardiology/
│   │   ├── domain.go           Enums: VisitState, ActorRole, EventType, QueueName
│   │   ├── statemachine.go     Transition table, LookupTransition, IsRoleAllowed
│   │   ├── store.go            Postgres CRUD for visit_state, events, queue_items
│   │   ├── handler.go          HTTP handlers (chi router)
│   │   └── simulator.go        Seed + auto-advance for demo/dev
│   ├── config/                 Env-based config (PORT, DATABASE_URL, JWT_SECRET, ENV)
│   ├── db/                     pgxpool connection factory
│   ├── fhirhandler/            FHIR R4 REST handlers (Read/VRead/Create/Update/Delete/Search/History/Capabilities)
│   ├── fhirsearch/             Search parameter extraction and SQL query builder
│   ├── fhirstore/              FHIR resource CRUD + versioning (fhir_resources + fhir_history)
│   ├── handler/                /health endpoint
│   ├── labingestion/
│   │   ├── domain.go           IngestionRecord, ManualMatchRequest, SourceSystem
│   │   ├── handler.go          HTTP handlers
│   │   ├── store.go            DB operations (ingest, match, retry, list)
│   │   ├── normalizer.go       Maps parsed fields to FHIR DiagnosticReport + Observation
│   │   └── hl7v2/              HL7v2 ORU^R01 parser
│   ├── server/server.go        Builds the chi router, mounts all sub-routers
│   └── tenant/                 Context helpers: WithTenant, FromContext
└── migrations/
    ├── 00001_fhir_core.sql     fhir_resources, fhir_history, fhir_search_params
    ├── 00002_fhir_tenant.sql   tenants, api_keys, tenant_id columns added
    ├── 00003_cardiology_practice.sql  rooms, visit_state, events, queue_items
    └── 00004_lab_ingestion.sql lab_ingestion_log, lab_source_profiles
```

### 4.2 Authentication Modes

| Mode | Condition | Behaviour |
|---|---|---|
| Dev bypass | `JWT_SECRET=""` OR `ENV=development` | Accepts any `X-Tenant-ID` header; defaults to `default`; injects role=admin |
| Bearer JWT | `Authorization: Bearer <token>` | HS256-signed, claims: tenant_id, sub, role, exp |
| API Key | `X-Tenant-ID` + `X-API-Key` | HMAC-SHA256(secret, "apikey:"+tenantID) as hex |

### 4.3 FHIR R4 Endpoint Map

| Method | Path | Handler | Description |
|---|---|---|---|
| GET | /fhir/R4/metadata | Capabilities | CapabilityStatement (no auth) |
| GET | /fhir/R4/{type}/{id} | Read | Read resource |
| GET | /fhir/R4/{type}/{id}/_history | History | Version list |
| GET | /fhir/R4/{type}/{id}/_history/{vid} | VRead | Specific version |
| POST | /fhir/R4/{type} | Create | Create resource |
| PUT | /fhir/R4/{type}/{id} | Update | Update resource |
| DELETE | /fhir/R4/{type}/{id} | Delete | Soft delete |
| GET | /fhir/R4/{type} | Search | Search with params |

### 4.4 Cardiology Endpoint Map

All routes require auth. Base: `/cardiology`

| Method | Path | Description |
|---|---|---|
| POST | /visits | Create visit (returns VisitStateRow) |
| GET | /visits?state={s} | List visits (priority-sorted, state-filtered) |
| GET | /visits/{encounterId} | Get single visit |
| POST | /visits/{encounterId}/transition | Fire FSM event (role-checked) |
| GET | /visits/{encounterId}/events | Full domain event log for visit |
| GET | /visits/{encounterId}/transitions | Valid next transitions from current state |
| GET | /queues | Queue summaries (pendingCount, inProgressCount, avgWait) |
| GET | /queues/{name}?status= | Items in a specific queue |
| POST | /queues/{name}/items/{id}/claim | Assign queue item to calling user |
| POST | /queues/{name}/items/{id}/complete | Mark queue item done |
| GET | /rooms | All rooms with occupancy |
| GET | /dashboard | Aggregated dashboard payload |
| POST | /simulate/seed | Seed FHIR resources + visits for demo |
| POST | /simulate/advance | Auto-advance all visits one state |
| DELETE | /simulate/reset | Delete all visit/event/queue data |

### 4.5 Lab Ingestion Endpoint Map

Base: `/lab`

| Method | Path | Description |
|---|---|---|
| POST | /ingest/hl7v2 | Accept HL7v2 ORU^R01 (text/plain) — returns HL7 ACK |
| POST | /ingest/fhir | Accept FHIR DiagnosticReport or Bundle |
| GET | /queue | Ingestion queue summary by status/source |
| GET | /records?status=&source=&limit= | List ingestion records |
| GET | /records/{id} | Single ingestion record |
| POST | /records/{id}/match | Manual patient match (body: {patientId}) |
| POST | /records/{id}/retry | Re-process failed record |

### 4.6 FHIR Store — Internal Design

```
Create(ctx, resourceType, body):
  1. Extract or generate FHIR logical ID from body["id"]
  2. Stamp meta: id, resourceType, meta.versionId=1, meta.lastUpdated
  3. BEGIN transaction
  4. INSERT INTO fhir_resources (tenant_id, resource_type, fhir_id, ...)
  5. INSERT INTO fhir_history (... operation='create')
  6. COMMIT

Update(ctx, resourceType, fhirID, body):
  1. BEGIN transaction
  2. SELECT version_id FROM fhir_resources WHERE ... FOR UPDATE
  3. Increment version_id
  4. Stamp new meta
  5. UPDATE fhir_resources
  6. INSERT INTO fhir_history (... operation='update')
  7. COMMIT

Delete(ctx, resourceType, fhirID):
  1. BEGIN transaction
  2. UPDATE fhir_resources SET is_deleted=true
  3. INSERT INTO fhir_history (... operation='delete', data=NULL)
  4. COMMIT
```

### 4.7 Cardiology Store — ApplyTransition

```
ApplyTransition(ctx, encounterID, Transition, TransitionRequest):
  1. BEGIN transaction
  2. UPDATE cardiology_visit_state
     SET previous_state = current_state,
         current_state  = t.To,
         current_room_id = COALESCE(req.roomID, current_room_id),
         arrived_at = COALESCE(arrived_at, now())  -- if first arrival state
         discharged_at = now()                     -- if terminal state
  3. INSERT INTO cardiology_events (encounter_id, from_state, to_state, actor_id, actor_role, ...)
  4. If t.AutoEnqueue != "":
     INSERT INTO cardiology_queue_items (queue_name, encounter_id, patient_id, priority, ...)
  5. COMMIT
  6. Return updated VisitStateRow
```

---

## 5. Service LLD — EHR Frontend

**Framework:** Next.js 16.2.6 (App Router, Turbopack) | **Language:** TypeScript strict | **Port:** 3000

### 5.1 Route Map

```
/                           → Landing page (Hero component)
/login                      → Credentials login (NextAuth signIn)
/register                   → Self-registration form → POST /api/register
/unauthorized               → 403 page

/dashboard                  → Role-filtered home (PATIENT/DOCTOR/ADMIN cards)
/dashboard/appointments     → Appointment list (role-filtered, mock data)
/dashboard/encounters       → Encounter list (doctor/admin, mock visits)
/dashboard/encounters/new   → New encounter form
/dashboard/encounters/{id}  → Encounter detail
/dashboard/orders           → Orders list
/dashboard/patients         → Patient list (mock)
/dashboard/records          → Patient health records (mock)

/doctor                     → CardiovascularDashboard (role-gated: DOCTOR/ADMIN)
/doctor/analytics           → DoctorAnalyticsClient (shift progress, trends)
/doctor/encounters/{id}     → Encounter detail (via VisitDetail component)
/doctor/health-records      → HealthRecordsListClient
/doctor/health-records/{id} → HealthRecordDetailClient
/doctor/orders/{id}         → OrderDetailClient
/doctor/patients/{id}       → PatientDetailClient
/doctor/urgent/{id}         → UrgentPatientDetailClient

/cardiology                 → CardiovascularDashboard with mock data (dev test)

/admin/users                → User management (Prisma + mock fallback)
/admin/audit                → Audit log (mock events only)
```

### 5.2 API Routes (Next.js)

```
POST /api/auth/[...nextauth]   NextAuth credentials provider
POST /api/register             Create user (Prisma) → auto-signin
GET  /api/search?q=            Full-text search over mock visits/users/queue
POST /api/assign               Assign physician to patient (mock)
GET  /api/events/doctor        SSE stream placeholder
GET  /api/cardiology/dashboard → Proxies to FHIR :8081/cardiology/dashboard
GET  /api/cardiology/visits    → Proxies to FHIR :8081/cardiology/visits
GET  /api/cardiology/visits/{id}
GET  /api/cardiology/queueitems
POST /api/cardiology/queueitems/{id}/claim
GET  /api/cardiology/stream    SSE stream (currently disabled)
GET  /api/admin/users          Admin user list
```

### 5.3 Design System Layers (src/design-system/)

| Layer | Files | Components |
|---|---|---|
| 1. Tokens | tokens/ | Colors (7×11), Typography (15 sizes), Spacing (17), Elevation (8), Motion |
| 2. Primitives | primitives/ | Button (5 variants×4 sizes), Input, Badge (6×2), Text (12×10), Spinner, Divider |
| 3. Components | components/ | Alert (5 severity), Card (5 variants), Modal (6 sizes), Tabs (WAI-ARIA 1.2), FormField, DataTable |
| 4. Clinical | clinical/ | PatientBanner, VitalSignCard, MedicationRow, LabResultRow, ClinicalAlert |
| 5. Layout | layout/ | AppShell, Sidebar, PageHeader |
| 6. Hooks | hooks/ | useFocusTrap, useKeyboardNav, useAnnouncer, useDebounce, useAsync, useConfirmation |
| 7. Guidelines | guidelines/ | accessibility.ts (contrastRatio, passesContrast), clinicalUX.ts |

### 5.4 Cardiology Domain (src/cardiology/)

```
types/fhir-domain.ts
  CardiologyRole (8 values)
  CardiovascularVisitState (28 states)
  VisitPriority (URGENT=0, HIGH=25, NORMAL=50, LOW=75)
  CardiovascularVisit (full visit object with FHIR link fields)
  CardiovascularProcedure (ECG/ECHO/STRESS_TEST/HOLTER)
  VitalSigns (BP, HR, SpO2, Temp, RR, recordedAt, recordedBy)
  QueueItem / QueueStats / CardiologyDashboard
  TransitionRequest / TransitionResponse

components/
  CardiovascularDashboard.tsx
    - Tabs: My Queue | Rooms | All Queues (Overview and Appointments tabs removed per request)
    - Role-specific KPI cards
    - Admin assign panel
    - Urgent alerts banner
    - SSE polling (disabled; 30s polling fallback also disabled)
  VisitDetail.tsx
    - 5 tabs: Vitals | History | Orders | Results | Notes
    - Vitals with clinical validation (BP 0-300, HR 0-200, SpO2 70-100, Temp 35-42)
  QueueManager.tsx
    - 13 queues, PENDING/IN_PROGRESS/COMPLETED tabs
    - Claim + Complete actions
  AdminAssignPanel.tsx
    - Physician assignment dropdown

services/api.mock.ts
  5 seed patients, 8 mock rooms, 6 mock users
  fetchDashboard(), fetchVisitDetail(), fetchQueueItems()
  claimQueueItem(), completeQueueItem(), recordVitals(), transitionVisitState()
```

### 5.5 Authentication Flow

```
User → POST /api/auth/[...nextauth] (credentials)
  → auth.ts: CredentialsProvider.authorize()
  → prisma.user.findUnique({ where: { email } })
  → bcryptjs.compare(password, user.passwordHash)
  → Returns { id, name, email, role }
  → NextAuth creates session (JWT or DB session)
  → Client: session.user.role drives RBAC in UI

Dev override: ?asUser=USER_ID query param (non-production only)
  → Bypasses auth, injects mock user from getAllMockUsers()
```

### 5.6 Component Data Flow

```
/doctor page (server component)
  → auth() → redirect if not DOCTOR/ADMIN
  → fetchDashboard() (mock API)
  → <CardiovascularDashboard userId={...} userRole={...} dashboard={...} />
      ↓ (client component, 30s background poll disabled)
      → /api/cardiology/dashboard (Next.js API route)
          → fetch('http://localhost:8081/cardiology/dashboard', { headers: { X-Tenant-ID } })
      → useCallback navigateToPatient → router.push('/doctor/patients/{visitId}')
      → onRefresh → refetch dashboard
```

---

## 6. Service LLD — LIMS

**Language:** Go | **Port:** 8083 | **Database:** `lims_dev`

### 6.1 Current State

Schema fully implemented. Application startup works (health endpoint at `/health`). **Zero clinical API endpoints implemented.** Only `internal/handler/health.go` + `internal/handler/health_test.go` exist.

### 6.2 Required Packages (to be built)

```
lims/
├── cmd/server/main.go              ✅ exists
├── internal/
│   ├── config/                     ✅ exists
│   ├── db/                         ✅ exists
│   ├── handler/health.go           ✅ exists
│   ├── handler/lab_tests.go        ❌ missing — GET/POST /tests catalogue
│   ├── handler/lab_orders.go       ❌ missing — CRUD /orders
│   ├── handler/lab_results.go      ❌ missing — CRUD /results
│   ├── handler/specimens.go        ❌ missing — specimen workflow
│   ├── store/lab_tests_store.go    ❌ missing
│   ├── store/lab_orders_store.go   ❌ missing
│   └── store/lab_results_store.go  ❌ missing
└── migrations/
    └── 00001_lims_core.sql         ✅ exists
```

### 6.3 Planned Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /tests | List lab test catalogue |
| GET | /tests/{id} | Get test by ID |
| POST | /orders | Create lab order |
| GET | /orders?patientId=&status= | List orders |
| GET | /orders/{id} | Get order |
| PATCH | /orders/{id}/status | Update order status |
| POST | /orders/{id}/results | Record result for order |
| GET | /orders/{id}/results | List results for order |
| GET | /results/{id} | Get single result |
| PATCH | /results/{id} | Amend result |

---

## 7. Service LLD — PharmacyMS

**Language:** Go | **Port:** 8082 | **Database:** `pharmacyms_dev`

### 7.1 Current State

Same as LIMS — schema complete, only health endpoint exists.

### 7.2 Required Packages (to be built)

```
pharmacyms/
├── internal/
│   ├── handler/health.go           ✅ exists
│   ├── handler/medications.go      ❌ missing — drug catalogue
│   ├── handler/prescriptions.go    ❌ missing — CRUD + status
│   ├── handler/dispenses.go        ❌ missing — dispensing workflow
│   ├── handler/dur.go              ❌ missing — drug interaction check
│   └── store/...                   ❌ missing
```

### 7.3 Planned Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /medications?search= | Search drug catalogue by DIN/name |
| GET | /medications/{id} | Get medication |
| POST | /prescriptions | Create prescription |
| GET | /prescriptions?patientId=&status= | List prescriptions |
| GET | /prescriptions/{id} | Get prescription |
| PATCH | /prescriptions/{id}/status | Cancel, complete, hold |
| POST | /prescriptions/{id}/dispense | Record a dispense event |
| GET | /prescriptions/{id}/dispenses | Dispense history |
| POST | /dur/check | Drug-drug + drug-allergy check (future) |

---

## 8. FHIR Resource Catalogue

Resources currently stored/linked in the system:

| FHIR Resource | Used By | Key Fields | Profile Target |
|---|---|---|---|
| Patient | All | identifier (MRN, OHIP), name, birthDate, gender | CA Baseline Patient |
| Practitioner | All | identifier, name, qualification | CA Baseline Practitioner |
| PractitionerRole | FHIR | practitioner, organization, code | CA Baseline |
| Organization | FHIR | identifier, name, type | CA Baseline |
| Encounter | Cardiology | subject (Patient), participant, period, reasonCode, status | CA Baseline Encounter |
| Appointment | Cardiology | participant, start, end, serviceType, status | CA Baseline Appointment |
| ServiceRequest | Referral/Labs | subject, requester, code (SNOMED/LOINC), status, priority | CA Baseline |
| DiagnosticReport | Lab ingestion | subject, result (Observation refs), effectiveDateTime, conclusion | CA Baseline |
| Observation | Lab results/Vitals | subject, code (LOINC), value, interpretation, referenceRange | CA Baseline |
| MedicationRequest | Pharmacy | subject, medication, dosage, status, requester | CA Baseline |
| MedicationDispense | Pharmacy | subject, medication, quantity, whenHandedOver | CA Baseline |
| Location | Rooms | name, physicalType, status | CA Baseline |
| AllergyIntolerance | Clinical | patient, code (SNOMED), reaction, severity | CA Baseline |
| Condition | Problem list | subject, code (ICD-10-CA/SNOMED), clinicalStatus, category | CA Baseline |
| Composition | Discharge summary | subject, sections, author | CA Baseline |
| Bundle | Transactions | type (transaction/document) | FHIR R4 core |

### 8.1 Terminology Bindings

| Data element | Code system | Canonical URI | Binding |
|---|---|---|---|
| Diagnosis | ICD-10-CA | https://fhir.infoway-inforoute.ca/CodeSystem/icd-10-ca | Required (CA) |
| Clinical findings | SNOMED CT CA Edition | http://snomed.info/sct | Preferred |
| Lab tests | LOINC + pCLOCD | http://loinc.org | Required |
| Lab units | UCUM | http://unitsofmeasure.org | Required |
| Medications | Health Canada DIN | https://health.canada.ca/... | Required (CA) |
| Vital signs | LOINC | http://loinc.org | Required |
| Procedure types | SNOMED CT | http://snomed.info/sct | Preferred |
| Interpretation flags | HL7 ObservationInterpretation | http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation | Required |

---

## 9. Authentication & Authorization

### 9.1 FHIR Server Auth (Go)

```
Request → chi.Middleware stack
  → authmw.Middleware(jwtSecret, env)
      Development: X-Tenant-ID accepted without verification
      Production:
        Bearer JWT → verifyJWT(token, secret)
          - HS256 HMAC verify
          - Decode payload: tenant_id, sub, role, exp
          - Check exp > now()
        API Key → verifyAPIKey(key, tenantID, secret)
          - Compute HMAC-SHA256(secret, "apikey:"+tenantID)
          - Compare with hex-encoded key
      → Inject Claims{TenantID, Sub, Role} into context
      → Inject tenant ID into context (tenant.WithTenant)
  → Handler reads claims via authmw.FromContext(ctx)
  → RBAC: cardiology FSM checks IsRoleAllowed(transition, req.ActorRole)
```

### 9.2 EHR Frontend Auth (NextAuth v5)

```
Providers: CredentialsProvider only
  - authorize(): lookup user in Prisma, bcrypt compare password
  - Returns { id, name, email, role }

Session strategy: JWT (default)
  - Token contains: user.id, user.name, user.role
  - Extended via next-auth.d.ts type augmentation

Middleware (src/middleware.ts):
  - Protects /dashboard/*, /doctor/*, /admin/* routes
  - Redirects to /login if unauthenticated

⚠️ SECURITY GAP: /register allows any user to self-assign DOCTOR/ADMIN role
   Fix required: default new registrations to PATIENT; require admin approval for privileged roles
```

### 9.3 RBAC Matrix

| Role | Cardiology FSM | Patient records | Admin | Pharmacy | Lab |
|---|---|---|---|---|---|
| ADMIN | All transitions | Read/Write | Full | Read | Read |
| CARDIOLOGIST | See FSM §11 | Read/Write (own patients) | No | Read | Read/Order |
| NURSE | See FSM §11 | Read/Write (vitals) | No | Read | Read |
| RECEPTIONIST | Check-in transitions | Read (demographics) | No | No | No |
| TECHNICIAN | Procedure transitions | Read | No | No | Write (results) |
| BILLING | Billing transitions | Read (billing only) | No | No | No |
| PATIENT | Self confirm/cancel | Read (own only) | No | Own only | Own only |

---

## 10. Inter-Service Integration

### 10.1 Current Wiring

```
EHR → /api/cardiology/* (Next.js proxy) → FHIR :8081/cardiology/*
EHR → /api/auth/* → Prisma (local PostgreSQL)
FHIR /lab/ingest/hl7v2 ← External lab systems (LifeLabs, Dynacare, OLIS)
FHIR /lab/ingest/fhir  ← External FHIR-capable systems
```

### 10.2 Missing Integrations (Priority Order)

| Integration | Protocol | Direction | Status |
|---|---|---|---|
| EHR ↔ LIMS (lab orders) | REST | EHR→LIMS, LIMS→FHIR | ❌ Not started |
| EHR ↔ PharmacyMS | REST / PrescribeIT | EHR→PharmacyMS | ❌ Not started |
| FHIR → EHR (result notifications) | SSE / WebSocket | FHIR→EHR | ❌ SSE endpoint stub only |
| FHIR ← OLIS (Ontario) inbound | HL7v2 | OLIS→FHIR | ✅ Schema + parser |
| FHIR → OLIS outbound | HL7v2 | FHIR→OLIS | ❌ Not started |
| FHIR → PCR (patient registry) | FHIR R4 | FHIR↔PCR | ❌ Not started |
| PharmacyMS ↔ PrescribeIT | HL7 FHIR | Bidirectional | ❌ Not started |
| EHR → DHDR (drug history) | FHIR R4 | FHIR→DHDR | ❌ Not started |

### 10.3 Notification Flow (Target Design)

```
Lab result received → FHIR /lab/ingest/hl7v2
  → IngestionRecord status: STORED
  → Publish event to Redis pub/sub channel: lab.result.{tenantId}.{patientId}
  → FHIR SSE endpoint /api/events/doctor streams to EHR frontend
  → EHR: ClinicalAlert component shows panic value alert to ordering physician
  → If criticalFindings=true: create URGENT queue item in PHYSICIAN_CONSULT queue
```

---

## 11. State Machine Reference — Cardiology Visit FSM

### 11.1 State Groups

```
PRE-ARRIVAL:     REFERRAL_RECEIVED → SCHEDULING → APPOINTMENT_SCHEDULED → APPOINTMENT_CONFIRMED → PRE_VISIT_FORMS
ARRIVAL:         PATIENT_ARRIVED → CHECKING_IN → CHECKED_IN → IN_WAITING_ROOM
NURSING:         NURSING_ASSESSMENT → IN_EXAM_ROOM
PHYSICIAN:       PHYSICIAN_PENDING → PHYSICIAN_WITH_PATIENT → ORDERS_PLACED
PROCEDURE:       PROCEDURE_QUEUED → IN_PROCEDURE → PROCEDURE_COMPLETE → RESULTS_PENDING → RESULTS_READY → RESULTS_REVIEW
COMPLETION:      CONSULTATION_COMPLETE → CHECKING_OUT → CHECKOUT_COMPLETE → BILLING_PENDING → FOLLOW_UP_SCHEDULED / REFERRAL_SENT → DISCHARGED
EXCEPTIONAL:     ON_HOLD, CANCELLED, NO_SHOW
```

### 11.2 Complete Transition Table

| From | Event | To | Allowed Roles | Auto-Enqueue |
|---|---|---|---|---|
| REFERRAL_RECEIVED | SCHEDULING_STARTED | SCHEDULING | RECEPTIONIST, ADMIN | — |
| REFERRAL_RECEIVED | APPOINTMENT_SCHEDULED | APPOINTMENT_SCHEDULED | RECEPTIONIST, ADMIN, SYSTEM | SCHEDULING |
| SCHEDULING | APPOINTMENT_SCHEDULED | APPOINTMENT_SCHEDULED | RECEPTIONIST, ADMIN, SYSTEM | — |
| APPOINTMENT_SCHEDULED | APPOINTMENT_CONFIRMED | APPOINTMENT_CONFIRMED | PATIENT, SYSTEM, RECEPTIONIST | — |
| APPOINTMENT_SCHEDULED | CANCELLED | CANCELLED | PATIENT, RECEPTIONIST, ADMIN | — |
| APPOINTMENT_SCHEDULED | NO_SHOW | NO_SHOW | SYSTEM, RECEPTIONIST | — |
| APPOINTMENT_CONFIRMED | INTAKE_FORMS_SENT | PRE_VISIT_FORMS | SYSTEM | — |
| PRE_VISIT_FORMS | INTAKE_FORMS_COMPLETED | APPOINTMENT_CONFIRMED | PATIENT, SYSTEM | — |
| APPOINTMENT_CONFIRMED | NO_SHOW | NO_SHOW | SYSTEM, RECEPTIONIST | — |
| APPOINTMENT_CONFIRMED | CANCELLED | CANCELLED | PATIENT, RECEPTIONIST, ADMIN | — |
| APPOINTMENT_CONFIRMED | PATIENT_ARRIVED | PATIENT_ARRIVED | PATIENT, SYSTEM, RECEPTIONIST | CHECK_IN |
| PRE_VISIT_FORMS | PATIENT_ARRIVED | PATIENT_ARRIVED | PATIENT, SYSTEM, RECEPTIONIST | CHECK_IN |
| PATIENT_ARRIVED | CHECK_IN_STARTED | CHECKING_IN | RECEPTIONIST | — |
| CHECKING_IN | CHECK_IN_COMPLETED | CHECKED_IN | RECEPTIONIST | — |
| CHECKED_IN | MOVED_TO_WAITING_ROOM | IN_WAITING_ROOM | RECEPTIONIST, NURSE | NURSING |
| IN_WAITING_ROOM | NURSING_STARTED | NURSING_ASSESSMENT | NURSE | — |
| NURSING_ASSESSMENT | VITALS_TAKEN | NURSING_ASSESSMENT | NURSE | — (loop) |
| NURSING_ASSESSMENT | PATIENT_ROOMED | IN_EXAM_ROOM | NURSE | PHYSICIAN |
| IN_EXAM_ROOM | PHYSICIAN_ASSIGNED | PHYSICIAN_PENDING | NURSE, CARDIOLOGIST, SYSTEM | — |
| PHYSICIAN_PENDING | PHYSICIAN_ENTERED_ROOM | PHYSICIAN_WITH_PATIENT | CARDIOLOGIST | — |
| PHYSICIAN_WITH_PATIENT | ORDER_PLACED | ORDERS_PLACED | CARDIOLOGIST | — |
| PHYSICIAN_WITH_PATIENT | CONSULT_COMPLETED | CONSULTATION_COMPLETE | CARDIOLOGIST | CHECKOUT |
| ORDERS_PLACED | PROCEDURE_QUEUED | PROCEDURE_QUEUED | SYSTEM, CARDIOLOGIST, NURSE | — |
| PROCEDURE_QUEUED | PROCEDURE_STARTED | IN_PROCEDURE | TECHNICIAN, NURSE | — |
| IN_PROCEDURE | PROCEDURE_COMPLETED | PROCEDURE_COMPLETE | TECHNICIAN, NURSE | — |
| PROCEDURE_COMPLETE | RESULTS_READY | RESULTS_READY | SYSTEM, TECHNICIAN | RESULTS_REVIEW |
| RESULTS_READY | RESULTS_REVIEW_STARTED | RESULTS_REVIEW | CARDIOLOGIST | — |
| RESULTS_REVIEW | CONSULT_COMPLETED | CONSULTATION_COMPLETE | CARDIOLOGIST | CHECKOUT |
| RESULTS_REVIEW | ORDER_PLACED | ORDERS_PLACED | CARDIOLOGIST | — |
| ORDERS_PLACED | CONSULT_COMPLETED | CONSULTATION_COMPLETE | CARDIOLOGIST | CHECKOUT |
| CONSULTATION_COMPLETE | CHECKOUT_STARTED | CHECKING_OUT | RECEPTIONIST, PATIENT | — |
| CHECKING_OUT | CHECKOUT_COMPLETED | CHECKOUT_COMPLETE | RECEPTIONIST | — |
| CHECKOUT_COMPLETE | CLAIM_SUBMITTED | BILLING_PENDING | SYSTEM, BILLING | BILLING |
| BILLING_PENDING | FOLLOW_UP_SCHEDULED | FOLLOW_UP_SCHEDULED | RECEPTIONIST, SYSTEM | FOLLOW_UP |
| BILLING_PENDING | REFERRAL_SENT | REFERRAL_SENT | CARDIOLOGIST, SYSTEM | — |
| BILLING_PENDING | DISCHARGED | DISCHARGED | SYSTEM | — |
| FOLLOW_UP_SCHEDULED | DISCHARGED | DISCHARGED | SYSTEM | — |
| REFERRAL_SENT | DISCHARGED | DISCHARGED | SYSTEM | — |

### 11.3 Queue Names (13 total)

| Queue | Claimed by | Triggered when entering state |
|---|---|---|
| SCHEDULING | RECEPTIONIST | APPOINTMENT_SCHEDULED (from referral) |
| CHECK_IN | RECEPTIONIST | PATIENT_ARRIVED |
| NURSING | NURSE | IN_WAITING_ROOM |
| PHYSICIAN | CARDIOLOGIST | IN_EXAM_ROOM |
| PROCEDURE_ECG | TECHNICIAN | (manual) |
| PROCEDURE_ECHO | TECHNICIAN | (manual) |
| PROCEDURE_STRESS_TEST | TECHNICIAN | (manual) |
| PROCEDURE_HOLTER | TECHNICIAN | (manual) |
| RESULTS_REVIEW | CARDIOLOGIST | RESULTS_READY |
| CHECKOUT | RECEPTIONIST | CONSULTATION_COMPLETE |
| BILLING | BILLING | CHECKOUT_COMPLETE |
| FOLLOW_UP | RECEPTIONIST | BILLING_PENDING → follow-up |
| REFERRAL_REVIEW | ADMIN | REFERRAL_RECEIVED |

---

## 12. API Contract Reference

### 12.1 POST /cardiology/visits

Request:
```json
{
  "patientId": "fhir-patient-uuid",
  "appointmentId": "fhir-appt-uuid",
  "referralId": "fhir-servicerequest-uuid",
  "visitType": "NEW_PATIENT",
  "priority": "NORMAL",
  "chiefComplaint": "Chest pain on exertion"
}
```

Response 201:
```json
{
  "id": "uuid",
  "tenantId": "default",
  "encounterId": "generated-uuid",
  "patientId": "fhir-patient-uuid",
  "currentState": "APPOINTMENT_CONFIRMED",
  "priority": "NORMAL",
  "stateEnteredAt": "2026-07-01T12:00:00Z"
}
```

### 12.2 POST /cardiology/visits/{id}/transition

Request:
```json
{
  "event": "NURSING_STARTED",
  "actorId": "fhir-practitioner-uuid",
  "actorRole": "NURSE",
  "roomId": "exam-1",
  "notes": "Vitals taken, BP 130/80",
  "payload": {}
}
```

Response 200: Updated VisitStateRow  
Response 403: Role not permitted  
Response 422: Transition not defined

### 12.3 POST /lab/ingest/hl7v2

Request: `Content-Type: text/plain` (raw HL7v2 ORU^R01)  
Headers: `X-Lab-Source: LIFELABS` (optional override)  
Response 200: HL7 ACK message (text/plain)  
Headers: `X-Ingestion-ID: uuid`, `X-Ingestion-Status: RECEIVED`

### 12.4 FHIR R4 Patient Create

```
POST /fhir/R4/Patient
Authorization: Bearer <jwt>
Content-Type: application/fhir+json

{
  "resourceType": "Patient",
  "identifier": [
    { "system": "https://health.ontario.ca/ohip", "value": "1234-567-890-AB" },
    { "system": "urn:oid:2.16.840.1.113883.4.1", "value": "MRN-001" }
  ],
  "name": [{ "family": "Smith", "given": ["John"] }],
  "birthDate": "1959-03-12",
  "gender": "male"
}
```

Response 201 with `Location: /fhir/R4/Patient/{fhirId}`

---

## 13. Data Flow Diagrams

### 13.1 Patient Visit Flow (Cardiology)

```
Receptionist                FHIR Server              Cardiologist
     |                           |                         |
     |--POST /cardiology/visits->|                         |
     |                           |--INSERT visit_state---> DB
     |<-- VisitStateRow ---------|                         |
     |                           |                         |
     |--POST /transition         |                         |
     |  event: PATIENT_ARRIVED   |                         |
     |                           |--UPDATE visit_state---> DB
     |                           |--INSERT event_log ----> DB
     |                           |--INSERT queue(CHECK_IN)>DB
     |                           |                         |
     |--POST /transition         |                         |
     |  event: CHECK_IN_COMPLETED|                         |
     |--POST /transition         |                         |
     |  event: MOVED_TO_WAITING  |                         |
     |                           |--INSERT queue(NURSING)->DB
     |                           |                         |
  Nurse                          |                         |
     |--CLAIM nursing queue item-|                         |
     |--POST /transition         |                         |
     |  event: NURSING_STARTED   |                         |
     |--POST /transition         |                         |
     |  event: VITALS_TAKEN      |                         | (loop)
     |--POST /transition         |                         |
     |  event: PATIENT_ROOMED    |                         |
     |                           |--INSERT queue(PHYSICIAN)>DB
     |                           |                         |
     |                           |         |--CLAIM physician queue
     |                           |         |--POST /transition
     |                           |         |  event: PHYSICIAN_ENTERED
     |                           |         |--POST /transition
     |                           |         |  event: ORDER_PLACED
     |                           |         |--POST /transition
     |                           |         |  event: CONSULT_COMPLETED
     |                           |<--------|
     |                           |--INSERT queue(CHECKOUT)-> DB
```

### 13.2 Lab Result Ingestion Flow

```
LifeLabs                    FHIR :8081                   EHR
     |                           |                         |
     |--HL7v2 ORU^R01 ---------->|                         |
     |  POST /lab/ingest/hl7v2   |                         |
     |                           |--INSERT ingestion_log-->DB (RECEIVED)
     |                           |--Parse MSH,PID,OBR,OBX  |
     |                           |--Normalise to FHIR JSON  |
     |                           |--Match patient:          |
     |                           |    OHIP→Patient lookup   |
     |                           |    MRN→Patient lookup    |
     |                           |    NAME+DOB fallback     |
     |<--HL7 ACK (AA/AE) --------|                         |
     |                           |--If matched:             |
     |                           |  INSERT DiagnosticReport |
     |                           |  INSERT Observations     |
     |                           |  UPDATE ingestion_log(STORED)
     |                           |--[TODO] Publish to Redis  |
     |                           |         → SSE stream ---->|
     |                           |                    ClinicalAlert
```

---

## 14. Security Controls Checklist

| Control | Status | Notes |
|---|---|---|
| TLS in transit | ⚠️ Dev only (HTTP) | Requires TLS termination at load balancer in production |
| PHI encryption at rest | ❌ Not implemented | PostgreSQL tablespace-level encryption needed |
| JWT HS256 signing | ✅ Go backend | dev bypass active when JWT_SECRET unset |
| API key HMAC verification | ✅ Go backend | |
| bcrypt password hashing | ✅ Frontend (cost 10) | |
| Role-based access on FSM | ✅ IsRoleAllowed() | |
| RBAC on Next.js routes | ✅ Middleware redirect | |
| **Self-registration role exploit** | 🔴 CRITICAL GAP | /register allows DOCTOR/ADMIN self-assignment |
| Audit log (PHIPA-compliant) | 🔴 CRITICAL GAP | 3 mock events only |
| PHI access logging per record | 🔴 CRITICAL GAP | PHIPA §12 requirement |
| Session expiry / revocation | ⚠️ Partial | NextAuth JWT default |
| SQL injection | ✅ | pgx parameterised queries throughout |
| XSS | ✅ | React JSX escapes, no dangerouslySetInnerHTML |
| CSRF | ✅ | NextAuth built-in |
| Rate limiting | ❌ Not implemented | Redis-based limiter planned |
| Input validation (API) | ⚠️ Partial | Basic field checks only |
| Secret management | ⚠️ .env files | Needs Vault / K8s secrets in production |

---

## 15. Known Gaps & Priority Work Items

### P0 — Must Fix Before Any Clinical Use

| ID | Gap | Service | Effort |
|---|---|---|---|
| GAP-001 | Self-registration role exploit — new users must default to PATIENT | EHR | S (1 day) |
| GAP-002 | Real PHIPA-compliant audit log (DB-backed, tamper-evident) | EHR + FHIR | M (3 days) |
| GAP-003 | PHI access logging per record opened | EHR | M (3 days) |
| GAP-004 | TLS enforcement in production | Infra | S (1 day) |
| GAP-005 | API-level RBAC enforcement (not just UI redirect) | EHR API routes | M (2 days) |

### P1 — Core Clinical Workflows

| ID | Gap | Service | Effort |
|---|---|---|---|
| GAP-010 | LIMS REST API (orders, results, specimens) | LIMS | L (2 weeks) |
| GAP-011 | PharmacyMS REST API (prescriptions, dispenses, DUR) | PharmacyMS | L (2 weeks) |
| GAP-012 | Patient demographics create/edit form → FHIR Patient | EHR | M (3 days) |
| GAP-013 | Real-time WebSocket / SSE (Redis pub/sub) | FHIR + EHR | L (1 week) |
| GAP-014 | Panic value notification flow | FHIR + EHR | M (3 days) |
| GAP-015 | SOAP clinical note structure | EHR | M (3 days) |
| GAP-016 | ICD-10-CA diagnosis coding with autocomplete | EHR | M (3 days) |
| GAP-017 | CTAS triage classification (1–5) at nursing assessment | EHR | S (2 days) |
| GAP-018 | Cardiology decision-support calculators (CHADS-VASc, HEART) | EHR | M (3 days) |
| GAP-019 | FHIR DiagnosticReport structured display (Echo, ECG findings) | EHR | M (3 days) |
| GAP-020 | Problem list (Condition resources) | EHR | M (3 days) |
| GAP-021 | Allergy recording workflow (AllergyIntolerance resource) | EHR | M (3 days) |

### P2 — Patient Experience

| ID | Gap | Service | Effort |
|---|---|---|---|
| GAP-030 | Patient portal shell (separate from clinician EHR) | EHR | L (2 weeks) |
| GAP-031 | Appointment self-booking | EHR | L (1 week) |
| GAP-032 | Lab results patient access | EHR | M (3 days) |
| GAP-033 | Secure patient-provider messaging | EHR | L (1 week) |
| GAP-034 | Pre-visit intake questionnaires (FHIR QuestionnaireResponse) | EHR + FHIR | L (1 week) |
| GAP-035 | Full EN/FR bilingual support | EHR | M (1 week) |

### P3 — Provincial Interoperability

| ID | Gap | Service | Effort |
|---|---|---|---|
| GAP-040 | PrescribeIT adapter (FHIR MedicationRequest exchange) | PharmacyMS | XL (3 weeks) |
| GAP-041 | OLIS outbound result push | FHIR | L (1 week) |
| GAP-042 | PCR (Provincial Client Registry) patient matching | FHIR | L (2 weeks) |
| GAP-043 | OHIP health card verification at check-in | EHR + FHIR | M (1 week) |
| GAP-044 | DHDR (Drug History) read integration | FHIR | L (1 week) |
| GAP-045 | OHIP Schedule of Benefits billing | PharmacyMS / FHIR | XL (4 weeks) |

### P4 — Advanced Features

| ID | Gap | Service | Effort |
|---|---|---|---|
| GAP-050 | CDS Hooks engine (drug interactions, best-practice alerts) | FHIR | XL |
| GAP-051 | SMART on FHIR launch flow | EHR + FHIR | L |
| GAP-052 | DICOM viewer for Echo/imaging | EHR | XL |
| GAP-053 | Temporal workflow engine (long-running clinical processes) | All | XL |
| GAP-054 | AI-assisted clinical documentation | EHR | XL |

## 16. Epic-Level HLD & LLD

This section maps the 12 epics / 175 stories in `../implementation/epics.md` onto concrete High-Level Design (HLD: components, data flow, dependencies, decisions) and Low-Level Design (LLD: API contracts, data model, FHIR resources, sequence flow, validation, RBAC) so that implementation is consistent across agents and sprints. Story IDs (e.g. TR-001) trace back to `../definition/prd.md`.

### 16.1 Epic 1 — Triage Nurse: Assessment & Intake Workflows (Stories 1.1–1.16)

**HLD**
```
Triage Nurse -> EHR Triage UI (Next.js /app/triage) -> FHIR Server :8081 (Observation/Condition/AllergyIntolerance/Encounter)
                                                              -> PostgreSQL fhir_dev
                                                              -> Redis pub/sub "triage.queue.updated" -> WebSocket Gateway -> Nursing/Charge dashboards
```
- Responsibilities: EHR owns triage UI/form validation; FHIR server owns clinical resource persistence and versioning; Redis/WebSocket gateway (CC-001) owns real-time queue fan-out.
- Dependencies: CC-001 (real-time push), CC-003 (patient FHIR record must exist before triage), AD-001/CC-015 (audit every write).
- Key decisions: CTAS stored as both Observation (LOINC 74033-4) and mirrored onto Encounter.priority for cheap queue sorting without joining Observations; NEWS2/GCS/Morse scores computed server-side (FHIR server) from submitted vitals to guarantee one scoring implementation; re-triage creates a new Observation with `basedOn`/`derivedFrom` linking to the superseded one rather than mutating history (audit-safe).

**LLD**

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| POST | /api/triage/{encounterId}/ctas | `{level, rationale}` | `{encounter, observation}` | Writes Observation(74033-4) + PATCH Encounter.priority; emits `triage.queue.updated` |
| POST | /api/triage/{encounterId}/vitals | `{weight,height,temp,bp,hr,spo2,rr,pain,...}` | `{observations[], bmi, news2}` | BMI/NEWS2 computed server-side; out-of-range triggers warning payload |
| POST | /api/triage/{encounterId}/allergies | `{substance,reaction,severity}` | `{allergyIntolerance}` | Duplicate-check against existing AllergyIntolerance before insert |
| POST | /api/triage/{encounterId}/fall-risk \| /isolation \| /gcs \| /sbar | story-specific body | resource echo | Same auth/audit envelope as above |
| GET | /api/triage/queue?state=WAITING | — | `{items:[{patientId,ctas,waitTargetSec,...}]}` | Read-through Redis cache (`triage:queue:{tenant}`, 2s TTL), invalidated on queue-updated event |

- **Data model:** No new EHR-side Prisma tables required; all clinical data lives in FHIR server's Postgres (`fhir_dev`). Add a `triage_queue_cache` materialized view (or Redis-only cache) keyed by tenant for the wallboard (TR-013) to avoid recomputing sort order per request.
- **FHIR resources:** Observation (74033-4 CTAS, 85353-1 vitals panel, 94558-4 NEWS2, 72133-2 fall risk, 72514-3 pain, GCS component codes), Condition (initial presentation), AllergyIntolerance, Encounter (priority, reasonCode), QuestionnaireResponse (SBAR).
- **Sequence (CTAS assignment):**
```
Nurse -> EHR UI: select CTAS-2
EHR UI -> FHIR Server: POST Observation + PATCH Encounter.priority (If-Match: versionId)
FHIR Server -> Postgres: INSERT/UPDATE (txn)
FHIR Server -> Redis: PUBLISH triage.queue.updated
Redis -> WebSocket Gateway: fan-out to tenant subscribers
WebSocket Gateway -> Dashboards: queue re-sorts (<1s, target per AC-TR-001-01)
FHIR Server --> EHR UI: 200 OK
EHR UI -> Audit API: POST /api/audit (actor, CTAS assigned)
```
- **Validation & errors:** Mandatory-field guard client + server (400 with field key); optimistic concurrency via `Encounter.meta.versionId` / `If-Match` to prevent lost updates during re-triage (409 Conflict on mismatch, client re-fetches and retries).
- **RBAC/Security:** Role `NURSE` or `CHARGE_NURSE` only (API-level check, not just UI redirect — closes GAP-005); every write logged via AD-001/CC-015 audit pipeline with actor, entity, before/after CTAS level.

---

### 16.2 Epic 2 — Physician / Cardiologist: Clinical Documentation & Orders (Stories 2.1–2.20)

**HLD**
```
Physician -> EHR Doctor UI (/app/doctor/health-records/[visitId]) -> FHIR Server :8081
                                                                         -> DocumentReference/Condition/MedicationRequest/ServiceRequest/DiagnosticReport/Consent
                                                                         -> PharmacyMS :8082 (via PrescribeIT adapter, DR-004)
                                                                         -> LIMS :8083 (via ServiceRequest, DR-005/006)
```
- Responsibilities: EHR owns SOAP editor, ICD-10-CA/problem-list UI, order-entry forms; FHIR server owns canonical clinical resources and cross-app referencing; PharmacyMS/LIMS own their domain execution once an order/prescription lands.
- Dependencies: CC-004 (inter-app FHIR integration, currently the biggest blocker — DR-004/005/011 cannot complete without it), CC-005 (SMART on FHIR for DR-019), CC-013/012 (test coverage for clinical-safety code paths).
- Key decisions: One `Encounter`-scoped SOAP `DocumentReference` per note (immutable once signed, amendments create a new version referencing the original via `relatesTo`); ICD-10-CA and problem list share the same `Condition` resource list, differentiated by `Condition.category` (`encounter-diagnosis` vs `problem-list-item`); referrals/discharge summaries reuse the same `Composition` + `DocumentReference` pattern for consistency with DR-010.

**LLD**

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| POST | /api/encounters/{id}/soap | `{subjective,objective,assessment,plan,icd10Codes[]}` | `{documentReference, conditions[]}` | Existing route ([soap/route.ts](../../../../ehr/src/app/api/encounters/%5BencounterId%5D/soap/route.ts)); extend with ICD-10-CA autocomplete-selected codes |
| POST | /api/encounters/{id}/prescriptions | `{medication,dose,route,frequency,quantity,refills}` | `{medicationRequest}` | DR-004: on save, publish to PrescribeIT adapter queue; adapter maps to PharmacyMS `/api/v1/prescriptions` |
| POST | /api/encounters/{id}/lab-orders | `{tests[],priority,clinicalInfo}` | `{serviceRequest}` | DR-005: creates ServiceRequest, mirrored into LIMS via CC-004 sync (or direct LIMS POST /api/v1/orders in interim) |
| GET | /api/encounters/{id}/lab-results | — | `{diagnosticReports[],observations[]}` | DR-006: proxies FHIR search, flags abnormal via `interpretation` code |
| POST | /api/encounters/{id}/referrals | `{specialty,targetOrgId,reason,attachments[]}` | `{serviceRequest}` | DR-009: FHIR ServiceRequest with `intent=order`, `category=referral` |
| POST | /api/encounters/{id}/discharge-summary | `{diagnosis,treatment,followUp,medications[]}` | `{composition, documentReference, pdfUrl}` | DR-010: replaces current placeholder PDFs in `public/docs/` |
| POST | /api/encounters/{id}/consent | `{type,scope,granted}` | `{consent}` | DR-012: FHIR Consent resource, versioned, never hard-deleted |

- **Data model:** No new relational tables in EHR's Prisma schema; all clinical documentation persists as FHIR resources. Add a lightweight `note_templates` Prisma table for DR-017 (org-scoped reusable templates, not PHI).
- **FHIR resources:** DocumentReference, Composition, Condition, MedicationRequest, ServiceRequest, DiagnosticReport, Consent, CarePlan (discharge follow-up).
- **Sequence (e-Rx via PrescribeIT, DR-004):**
```
Physician -> EHR UI: submit prescription
EHR UI -> FHIR Server: POST MedicationRequest (status=active)
FHIR Server -> PrescribeIT Adapter (GAP-040): translate to PrescribeIT message format
PrescribeIT Adapter -> PharmacyMS :8082: POST /api/v1/prescriptions
PharmacyMS -> DUR Handler: POST /api/v1/dur/check (allergies, active DINs)
PharmacyMS --> PrescribeIT Adapter: ack + prescription id
PrescribeIT Adapter --> FHIR Server: PATCH MedicationRequest.identifier (prescribeItId)
FHIR Server --> EHR UI: 201 Created
```
- **Validation & errors:** ICD-10-CA/SNOMED autocomplete enforces coded-or-explicit-free-text-flag (never silently store unmapped text); prescription submission blocked if `DUR.safe == false` and no override reason captured (soft-stop) or always blocked (hard-stop).
- **RBAC/Security:** Role `PHYSICIAN`/`CARDIOLOGIST`; discharge summary and consent writes require a second audit event category (`CLINICAL_DOCUMENT_SIGNED`) distinct from generic edits, per CC-015.

---

### 16.3 Epic 3 — Lab Technician: LIMS Order & Result Workflows (Stories 3.1–3.17)

**HLD**
```
Physician (EHR) --ServiceRequest--> FHIR Server --sync/poll--> LIMS :8083 --REST--> Lab Tech UI (NEW — currently API-only)
LIMS -> PostgreSQL lims_dev (lab_tests, lab_orders, lab_results, + new: specimens, qc_results, reflex_rules)
LIMS -> Redis pub/sub "lab.critical_value" -> WebSocket Gateway -> Ordering physician dashboard
LIMS -> OLIS Outbound Adapter (GAP-041) -> Ontario OLIS
```
- Responsibilities: LIMS owns specimen lifecycle, result entry/QC/autoverification; FHIR server owns canonical DiagnosticReport/Observation once results are finalised; **no lab-tech-facing UI currently exists** — this epic requires a new frontend, not just backend work.
- Dependencies: CC-004 (order/result sync with EHR), CC-001 (critical value push, LT-005), CC-016 (bulk export for pathology/QC reporting, optional).
- Key decisions: Introduce `specimens` as a first-class entity (accession number, tube type, collected-at, status) separate from `lab_orders`, since one order can require multiple specimens and one specimen can serve multiple tests (LT-002); autoverification (LT-009) implemented as a rules table evaluated synchronously on result POST, not a background job, so TAT is not impacted; OLIS submission (LT-007) is async via an outbox table to guarantee at-least-once delivery.

**LLD**

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| GET | /api/v1/orders?status=pending | — | `LabOrder[]` | Existing; add `priority`-first sort (STAT) per LT-001 |
| POST | /api/v1/specimens | `{orderId,accessionNo,tubeType,collectedAt}` | `Specimen` | New (LT-002) |
| PATCH | /api/v1/specimens/{id}/reject | `{reason}` | `Specimen` | New (LT-006); notifies ordering clinician via CC-001 |
| POST | /api/v1/results | `{orderId,component,value,units,interpretation}` | `LabResult` | Existing, extend with autoverification check (LT-009) before status=final |
| PATCH | /api/v1/results/{id}/amend | `{value,reason}` | `LabResult` (new version) | New (LT-008); original preserved, `status=corrected` |
| POST | /api/v1/qc | `{analyzerId,level,value,expectedRange}` | `QcResult` | New (LT-012); blocks result entry for that analyzer if out-of-control |
| GET | /api/v1/tests?q= | — | `LabTest[]` (pCLOCD/LOINC) | LT-014, extend catalogue seed |

- **Data model (new tables, `lims` migrations):**
```sql
CREATE TABLE specimens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES lab_orders(id),
  accession_no TEXT UNIQUE NOT NULL,
  tube_type TEXT NOT NULL,
  collected_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'collected', -- collected|received|rejected|consumed
  rejection_reason TEXT
);
CREATE TABLE qc_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analyzer_id TEXT NOT NULL,
  level TEXT NOT NULL,
  value NUMERIC NOT NULL,
  in_control BOOLEAN NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE olis_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID REFERENCES lab_results(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending|sent|failed
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT
);
```
- **FHIR resources:** ServiceRequest (order), Specimen, Observation, DiagnosticReport.
- **Sequence (panic value escalation, LT-005):**
```
Analyst -> LIMS: POST /api/v1/results (critical value)
LIMS -> store.IsCritical(): true
LIMS -> Redis: PUBLISH lab.critical_value {orderId, patientId, value, flag}
Redis -> WebSocket Gateway -> Ordering physician dashboard: alert (<2s target)
LIMS -> Notification Service (GAP-014, new): SMS/page fallback if not acknowledged in 5 min
LIMS -> AuditEvent: CRITICAL_VALUE_ESCALATED
```
- **Validation & errors:** Result entry blocked if specimen `status != received`; QC out-of-control blocks all pending result entry for that analyzer (429-style "analyzer locked" response) until re-run.
- **RBAC/Security:** Role `LAB_TECH`/`LAB_ANALYST`/`PATHOLOGIST` (LT-015); amendments require a second `LAB_ANALYST` or supervisor role (four-eyes principle) — enforce via API check, not just UI.

---

### 16.4 Epic 4 — Pharmacist: Dispensing, DUR & Compliance (Stories 4.1–4.18)

**HLD**
```
PrescribeIT Adapter --> PharmacyMS :8083 (Pharmacist UI — NEW, currently API-only)
PharmacyMS -> PostgreSQL pharmacyms_dev (medications, prescriptions, dispenses, + new: controlled_substance_log, inventory, compounds, counselling_notes)
PharmacyMS -> DUR Handler (in-process rule table, PH-003) -> allergy/interaction alerts
PharmacyMS -> ODB/Insurance Adjudication Adapter (GAP-045) -> Ontario MOHLTC / private payer
```
- Responsibilities: PharmacyMS owns dispensing workflow state machine (verify→fill→label→final-check→dispense), DUR, inventory, controlled-substance ledger, billing; **no pharmacist-facing UI exists yet**.
- Dependencies: CC-004 (receive MedicationRequest from EHR), CC-005/DR-004 (PrescribeIT), PT epic (technician actions feed into the same state machine).
- Key decisions: DUR becomes stateful — persist `dur_checks` linked to each prescription (currently stateless request/response only) so overrides are auditable (PH-003); controlled substances get a append-only ledger table (never UPDATE, only INSERT compensating rows) for CDSA compliance (PH-006); dispensing workflow modeled as an explicit state machine (mirroring the EHR cardiology FSM pattern already in this codebase) rather than a free-form status string.

**LLD**

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| POST | /api/v1/dur/check | existing (see [dur.go](../../../../pharmacyms/internal/handler/dur.go)) | `DURResponse` | Extend to persist result to `dur_checks` (PH-003) |
| POST | /api/v1/prescriptions/{id}/verify \| /fill \| /label \| /final-check \| /dispense | step-specific body | `Prescription` (new status) | New state-machine transitions (PH-004); each transition requires the acting user's role |
| POST | /api/v1/controlled-substances/log | `{prescriptionId,drugDin,qty,witnessId}` | `ControlledSubstanceLog` | New (PH-006); double-count = two distinct user IDs required |
| POST | /api/v1/adjudication | `{prescriptionId,payer,planId}` | `{coPay,claimStatus}` | New (PH-005), calls ODB adapter |
| GET/POST | /api/v1/inventory | — / `{din,qtyOnHand,reorderPoint}` | `InventoryItem[]` | New (PH-008) |
| POST | /api/v1/counselling | `{patientId,topics[],understandingLevel}` | `CounsellingNote` | New (PH-014) |

- **Data model (new tables):**
```sql
CREATE TABLE dur_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES prescriptions(id),
  result JSONB NOT NULL,
  override_reason TEXT,
  overridden_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE controlled_substance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES prescriptions(id),
  drug_din TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  dispensed_by UUID NOT NULL,
  witnessed_by UUID NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE inventory_items (
  din TEXT PRIMARY KEY,
  qty_on_hand NUMERIC NOT NULL DEFAULT 0,
  reorder_point NUMERIC NOT NULL DEFAULT 0
);
```
- **FHIR resources:** MedicationRequest (in), MedicationDispense (out, written back to FHIR server for DHDR/patient portal visibility), Claim (adjudication, optional FHIR mirror).
- **Sequence (dispensing with DUR hard-stop override):**
```
Technician -> PharmacyMS: POST /prescriptions/{id}/fill
PharmacyMS -> DUR Handler: re-check at fill time
DUR Handler --> PharmacyMS: hard-stop alert
PharmacyMS --> Technician UI: 409 blocked, "requires pharmacist override"
Pharmacist -> PharmacyMS: POST /prescriptions/{id}/final-check {overrideReason}
PharmacyMS -> dur_checks: INSERT override record
PharmacyMS -> MedicationDispense (FHIR): POST
PharmacyMS --> Pharmacist UI: 200 dispensed
```
- **Validation & errors:** Hard-stop DUR alerts cannot be bypassed by technicians (403), only pharmacists (PH-003/PT-007 scope-of-practice enforcement); controlled-substance log requires two distinct authenticated users or request is rejected.
- **RBAC/Security:** Roles `PHARMACIST`, `PHARMACY_TECHNICIAN` with explicit scope-of-practice matrix (PT-007) enforced server-side per action.

---

### 16.5 Epic 5 — Pharmacy Technician: Fulfillment Workflows (Stories 5.1–5.9)

**HLD**
```
Pharmacy Technician -> PharmacyMS Technician UI (NEW) -> PharmacyMS :8082 dispensing state machine (shared with Epic 4)
                                                        -> Label Printer Service (new integration, PT-002)
                                                        -> Curbside/Delivery Tracker (PT-006)
```
- Responsibilities: Technician-scoped views over the same dispensing state machine as Epic 4, plus fax/image intake (OCR) and unit-dose packaging for hospital contexts.
- Dependencies: Epic 4's state machine and RBAC scope-of-practice matrix; an OCR service (third-party or self-hosted, e.g. Tesseract) for PT-005.
- Key decisions: Technician work queue is a filtered view (`status IN ('pending','filling')`) of the same `prescriptions` table — no separate queue table; label printing is a synchronous call to a local print-spooler microservice (network printer, ESC/POS or ZPL) triggered from the fill step, not a background job, so techs get immediate feedback.

**LLD**

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| GET | /api/v1/prescriptions?status=pending&sort=waitTime | — | `Prescription[]` | PT-001 work queue |
| POST | /api/v1/prescriptions/{id}/print-label | — | `{jobId,status}` | PT-002, calls print-spooler over local network |
| POST | /api/v1/prescriptions/{id}/ready-for-pickup | — | `Prescription` | PT-004 |
| POST | /api/v1/fax-intake | `multipart: image/pdf` | `{ocrText, suggestedPrescription}` | PT-005, OCR-assisted, always requires pharmacist confirmation before becoming an active prescription |
| POST | /api/v1/deliveries | `{prescriptionId,method,address}` | `Delivery` | PT-006 |
| POST | /api/v1/unit-dose-packages | `{patientId,wardId,medications[]}` | `UnitDosePackage` | PT-008 (hospital) |

- **Data model (new tables):** `deliveries` (prescription_id, method, address, status, proof_of_delivery_url), `unit_dose_packages` (patient_id, ward_id, medications JSONB, packed_by, packed_at).
- **FHIR resources:** Reuses MedicationDispense from Epic 4; no new resource types.
- **Validation & errors:** OCR-derived prescriptions are always `status=draft` and cannot progress to `verify` without explicit pharmacist confirmation (PT-005 safety guard); any action requiring pharmacist scope attempted by a technician returns 403 with `requiredRole` in the error body so the UI can route the item to a pharmacist queue automatically (PT-007).
- **RBAC/Security:** Role `PHARMACY_TECHNICIAN`; delivery proof-of-delivery upload restricted to the assigned technician or delivery partner integration account.

---

### 16.6 Epic 6 — Patient: Portal & Self-Service (Stories 6.1–6.18)

**HLD**
```
Patient (browser/mobile) -> Patient Portal Shell (NEW Next.js route group /app/patient, separate layout from clinician EHR)
                                   -> FHIR Server :8081 (read-scoped: own Patient compartment only)
                                   -> Scheduling API (existing /api/scheduling/*)
                                   -> Secure Messaging Service (new, PA-005)
                                   -> SMART on FHIR / MyHealth Ontario SSO (GAP-051/GAP-017)
```
- Responsibilities: A distinct, privacy-scoped shell (not the clinician dashboard with hidden panels) that only ever queries the FHIR `Patient/{id}/$everything`-style compartment search scoped to the authenticated patient's own record.
- Dependencies: CC-007 (bilingual EN/FR), CC-005 (SMART on FHIR / provincial SSO), scheduling module (already built, reused for PA-002).
- Key decisions: Enforce compartment-scoping at the API gateway layer (not just query filters) — every patient-portal FHIR call is automatically scoped by `Patient` compartment matching the authenticated subject's `fhirId`, so a bug in one screen cannot leak another patient's data; portal is a separate Next.js route group with its own layout/navigation to avoid any risk of clinician-only UI leaking through shared components.

**LLD**

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| GET | /api/patient/me/summary | — | `{conditions,allergies,immunizations,recentResults}` | PA-008, compartment-scoped |
| GET | /api/patient/me/lab-results | — | `DiagnosticReport[]` (plain-language annotated) | PA-006/LT-017 |
| GET/POST | /api/patient/me/appointments | — / `{slotId}` | `Appointment[]` / `Appointment` | PA-002/003, reuses existing scheduling API |
| POST | /api/patient/me/questionnaire-responses | `{questionnaireId,answers}` | `QuestionnaireResponse` | PA-004 |
| GET/POST | /api/patient/me/messages | — / `{toCareTeamId,body}` | `Communication[]` | PA-005, new secure messaging service |
| GET/PATCH | /api/patient/me/consent | — / `{scope,granted}` | `Consent[]` | PA-009 |
| GET | /api/patient/me/documents | — | `DocumentReference[]` | PA-012 |

- **Data model:** No new PHI tables; add a non-PHI `patient_portal_preferences` table (language, notification prefs) in EHR Prisma DB.
- **FHIR resources:** Patient, Condition, AllergyIntolerance, Immunization, DiagnosticReport, Appointment, QuestionnaireResponse, Communication, Consent, DocumentReference.
- **Sequence (compartment-scoped read):**
```
Patient -> Portal UI: open "My Results"
Portal UI -> Patient Portal API: GET /api/patient/me/lab-results (JWT: sub=patientFhirId)
Patient Portal API -> FHIR Server: GET /fhir/R4/DiagnosticReport?patient={fhirId}&_compartment=Patient/{fhirId}
FHIR Server -> Postgres: scoped query
FHIR Server --> Patient Portal API: 200 (only this patient's resources)
Patient Portal API --> Portal UI: annotated results
```
- **Validation & errors:** Any request where `patient` query param ≠ authenticated subject's `fhirId` returns 403 (defense in depth even though UI never constructs such a request); consent withdrawal for `data-sharing` immediately revokes downstream sharing (checked at query time, not just UI toggle).
- **RBAC/Security:** Role `PATIENT`, MFA recommended for portal login; every access logged as `PHI_SELF_ACCESS` (lighter audit tier than clinician `PHI_ACCESS`) per AD-001; EN/FR (CC-007) applied at the layout/i18n level, not per-page.

---

### 16.7 Epic 7 — Patient Care Assistant: Bedside Support (Stories 7.1–7.8)

**HLD**
```
PCA (tablet, bedside) -> EHR PCA UI (NEW, /app/pca) -> FHIR Server :8081 (Observation-lite writes, queued for nurse review)
```
- Responsibilities: Narrow-scope UI limited to ADL, I&O, transport requests, fall-prevention checklist, and PCA-entered vitals; all clinically-reviewable entries are flagged `status=preliminary` until a nurse co-signs.
- Dependencies: Epic 1 (shares the vitals/fall-risk Observation model), new `PCA` role in the role model (PC-001, a pure RBAC/config change, no new service).
- Key decisions: PCA-entered vitals (PC-006) are written as Observation with `status=preliminary`; a nurse "co-sign" action (already possible via existing Observation status transition) promotes to `final` — this reuses Epic 1's vitals pipeline rather than duplicating it.

**LLD**

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| POST | /api/pca/{encounterId}/adl | `{bathing,dressing,mobility,continence,feeding}` | `Observation[]` | PC-002 |
| POST | /api/pca/{encounterId}/io | `{intakeMl,outputMl,type,recordedAt}` | `Observation` | PC-003 |
| POST | /api/pca/transport-requests | `{patientId,mode,fromLocation,toLocation}` | `ServiceRequest` | PC-004 |
| POST | /api/pca/{encounterId}/fall-checklist | `{items:[{task,done}]}` | `QuestionnaireResponse` | PC-005 |
| POST | /api/pca/{encounterId}/vitals-preliminary | `{temp,weight}` | `Observation (status=preliminary)` | PC-006 |
| POST | /api/pca/{encounterId}/turning-log | `{position,performedAt}` | `Observation` | PC-008 |

- **Data model:** No new tables; role model change adds `PCA` to the existing role enum used by AD-004/middleware.
- **FHIR resources:** Observation (ADL, I&O, vitals-preliminary, turning log), ServiceRequest (transport), QuestionnaireResponse (fall checklist).
- **Validation & errors:** PCA-entered vitals cannot transition to `status=final` from the PCA UI — only a nurse/physician action can co-sign; attempts to access any physician/nurse-only route return 403.
- **RBAC/Security:** New role `PCA` added to the RBAC matrix with a strictly limited permission set; every PCA write tagged with `enteredByRole=PCA` in the Observation `note` extension for downstream review clarity.

---

### 16.8 Epic 8 — Receptionist / Front Desk: Scheduling & Check-In (Stories 8.1–8.18)

**HLD**
```
Receptionist -> EHR Scheduling UI (existing /app/scheduling) -> Scheduling API (existing /api/scheduling/*)
                                                              -> FHIR Server (Appointment, Patient, Encounter)
                                                              -> OHIP Eligibility Adapter (existing /api/ohip/eligibility, GAP-043)
                                                              -> PCR Adapter (GAP-042, new) for patient matching at registration
```
- Responsibilities: Extends the already-built scheduling scaffold with registration, eligibility, kiosk check-in, waitlist, recall, and multi-site scheduling; largely additive to existing code rather than new services.
- Dependencies: Existing scheduling mock/services ([scheduling.mock.ts](../../../../ehr/src/scheduling/services/scheduling.mock.ts)) need to move from mock to FHIR-backed persistence; CC-006 (PCR) for RC-002 patient matching; CC-001 for RC-013 delay notifications.
- Key decisions: Kiosk mode (RC-004) is a separate, unauthenticated-but-tokenized route (`/kiosk/{sessionToken}`) rather than reusing the staff-authenticated scheduling UI, to avoid any risk of staff session leakage on a public terminal; waitlist (RC-005) modeled as a priority queue keyed by appointment-type + earliest-acceptable-date, processed via a scheduled job when cancellations occur (RC-007).

**LLD**

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| POST | /api/scheduling/register | `{demographics,hcn}` | `{patient, mrn}` | RC-002, calls PCR adapter for matching |
| GET | /api/ohip/eligibility?hcn= | — | `{eligible,versionCode}` | Existing, wire into check-in flow (RC-003) |
| POST | /api/scheduling/kiosk/{token}/check-in | — | `{appointment,roomAssignment}` | RC-004/RC-008 |
| POST | /api/scheduling/waitlist | `{patientId,apptType,earliestDate}` | `WaitlistEntry` | RC-005 |
| POST | /api/scheduling/{id}/no-show \| /cancel | `{reason}` | `Appointment` | RC-006/RC-007, triggers waitlist processing |
| POST | /api/scheduling/interpreter-request | `{apptId,language}` | `InterpreterRequest` | RC-009 |
| GET | /api/scheduling/eod-reconciliation?date= | — | `{opened,closed,noShow,pending}` | RC-012 |
| POST | /api/scheduling/recalls | `{criteria}` | `RecallBatch` | RC-014 |

- **Data model:** Migrate existing in-memory scheduling mock to FHIR `Appointment`/`Slot`/`Schedule` resources; add EHR-side `waitlist_entries` and `interpreter_requests` Prisma tables (operational, non-PHI-heavy, or FHIR `Task` resources if full PHI traceability is required).
- **FHIR resources:** Appointment, Slot, Schedule, Patient, Encounter, Task (interpreter/transport-style requests).
- **Sequence (check-in with eligibility + room assignment):**
```
Patient -> Kiosk: check in
Kiosk -> Scheduling API: POST /kiosk/{token}/check-in
Scheduling API -> OHIP Eligibility Adapter: GET eligibility
Scheduling API -> FHIR Server: PATCH Appointment.status=arrived
Scheduling API -> Room Assignment: allocate room
Scheduling API -> Redis: PUBLISH queue.updated (nursing dashboard, Epic 1 wallboard)
Scheduling API --> Kiosk: confirmation + room number
```
- **Validation & errors:** Kiosk tokens are single-use, short-TTL (~15 min), tied to a specific appointment; ineligible OHIP status does not block check-in but flags the encounter `billing_flag=self-pay-review` for Epic 10.
- **RBAC/Security:** Role `RECEPTIONIST`/`CLINIC_ADMIN` for staff routes; kiosk routes use scoped, single-purpose tokens instead of user sessions.

---

### 16.9 Epic 9 — System Administrator: Security, Config & Compliance (Stories 9.1–9.15)

**HLD**
```
Admin -> EHR Admin UI (existing /app/admin) -> Admin API (/api/admin/*, /api/audit existing)
                                              -> Prisma (User, AuditEvent — existing) + new (SystemConfig, Session, Announcement)
                                              -> KMS / Secrets Manager (GAP: PHI encryption at rest, AD-012)
```
- Responsibilities: Closes the P0 safety-critical gaps (AD-001/002/003 already substantially implemented, per code review) and adds the remaining operational controls (user CRUD, RBAC enforcement audit, session management, encryption, rate limiting, system health, terminology management, backup/restore, announcements, error boundaries).
- Dependencies: Underpins every other epic — AD-003 (API-level RBAC) and AD-012 (encryption at rest) are cross-cutting prerequisites, not isolated features.
- Key decisions: RBAC enforcement is centralized as Next.js middleware **plus** a shared server-side `assertRole()` guard called at the top of every API route handler (defense in depth, closes GAP-005 fully rather than relying on middleware alone); PHI encryption at rest uses PostgreSQL `pgcrypto` column-level encryption for the most sensitive fields (HCN, SIN if collected) plus full-disk/tablespace encryption at the infrastructure layer for everything else.

**LLD**

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| GET | /api/audit?entityType=&entityId=&from=&limit= | — | `AuditEvent[]` | Existing ([audit/route.ts](../../../../ehr/src/app/api/audit/route.ts)) |
| GET/POST/PATCH/DELETE | /api/admin/users | — / user body | `User[]` / `User` | AD-004, full CRUD (extends existing partial admin/users UI) |
| GET | /api/admin/integrations/status | — | `{fhir,lims,pharmacyms,olis: {status,lastCheck}}` | AD-005 |
| GET/PATCH | /api/admin/config | — / `{tenantId,settings}` | `TenantConfig` | AD-006 |
| GET | /api/admin/sessions | — | `Session[]` | AD-007, supports force-revoke |
| GET | /api/admin/health | — | `{service,status,latencyMs}[]` | AD-008 |
| GET/POST | /api/admin/value-sets | — / value-set body | `ValueSet[]` | AD-009 |
| POST | /api/admin/export | `{resourceTypes,dateRange}` | `{exportId}` | AD-010, reuses CC-016 `$export` |
| POST | /api/admin/announcements | `{message,severity,expiresAt}` | `Announcement` | AD-014 |

- **Data model (new tables):** `system_config` (tenant_id, key, value JSONB), `announcements` (message, severity, expires_at), `sessions` (already partially via NextAuth — extend with `revoked_at` for AD-007).
- **FHIR resources:** AuditEvent (already implemented), Provenance (optional, for stronger PHI access chain-of-custody).
- **Sequence (API-level RBAC enforcement, AD-003):**
```
Client -> API Route: request with JWT
API Route -> assertRole(requiredRoles): checked server-side (not just middleware)
  if role not in requiredRoles -> 403 + AuditEvent(outcome=denied)
  else -> proceed to handler -> AuditEvent(outcome=success)
```
- **Validation & errors:** Rate limiting (AD-013) returns 429 + `Retry-After`; all admin destructive actions (user delete, session revoke) require re-authentication (step-up auth) within the last 5 minutes.
- **RBAC/Security:** Role `ADMIN` only; this epic's own audit trail is itself audited (meta-audit, already implemented per [audit/route.ts](../../../../ehr/src/app/api/audit/route.ts) line 30).

---

### 16.10 Epic 10 — Billing Specialist: Coding & Revenue Cycle (Stories 10.1–10.10)

**HLD**
```
Billing Specialist -> EHR Billing UI (NEW, /app/billing) -> Billing API (NEW)
                                                           -> FHIR Server (Encounter, Condition/ICD-10-CA, Claim)
                                                           -> OHIP MC EDT Adapter (GAP-045) -> MOHLTC
                                                           -> Private Insurance Adapter (BI-006)
```
- Responsibilities: Entirely new module; converts a completed, signed encounter (Epic 2 output) into a coded, submittable claim.
- Dependencies: Epic 2 (DR-002 ICD-10-CA coding must exist on the encounter before billing can code it), Epic 8 (RC-012 end-of-day reconciliation feeds the billing queue).
- Key decisions: Model claims as FHIR `Claim` resources (not a bespoke billing table) so the same resource can represent OHIP fee-for-service and private insurance claims, differentiated by `Claim.type`; time-barred claim alerts (BI-008) computed from `Claim.billablePeriod` + a configurable submission-window rule rather than hard-coded 6-month logic, so provincial rule changes don't require code changes.

**LLD**

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| GET | /api/billing/queue?status=unbilled | — | `Encounter[]` | BI-001 |
| POST | /api/billing/{encounterId}/icd10 | `{codes[]}` | `Condition[]` | BI-002, reuses DR-002 coding component |
| POST | /api/billing/{encounterId}/fee-codes | `{codes[],modifiers[]}` | `Claim` | BI-003, validates against OHIP Schedule of Benefits rule set |
| POST | /api/billing/{claimId}/submit | — | `{claim,mcEdtBatchId}` | BI-004 |
| GET | /api/billing/rejections | — | `Claim[]` (status=rejected) | BI-005 |
| POST | /api/billing/{encounterId}/private-claim | `{payerId,planId}` | `Claim` | BI-006 |
| GET | /api/billing/analytics | — | `{revenueByMonth,denialRate,...}` | BI-007 |
| GET | /api/billing/{encounterId}/superbill | — | `{pdfUrl}` | BI-009 |
| GET | /api/billing/patients/{id}/statement | — | `{balance,lineItems[]}` | BI-010 |

- **Data model:** Primarily FHIR `Claim`/`ClaimResponse`; add EHR-side `fee_schedule` reference table (fee code, description, unit value) for fast validation without round-tripping to FHIR on every keystroke.
- **FHIR resources:** Claim, ClaimResponse, Encounter, Condition, Coverage.
- **Sequence (OHIP claim submission):**
```
Billing Specialist -> Billing UI: submit claim
Billing UI -> Billing API: POST /billing/{claimId}/submit
Billing API -> FHIR Server: validate Claim resource (fee codes, ICD-10-CA present)
Billing API -> MC EDT Adapter: batch + transmit (async, per MOHLTC file-based protocol)
MC EDT Adapter --> Billing API: batch receipt id
Billing API -> Claim.status = 'entered-in-error' | 'active' (submitted)
```
- **Validation & errors:** Time-barred claims (BI-008) surfaced as a dashboard warning 30/14/3 days before the submission deadline; submission blocked entirely once past the hard MOHLTC cutoff (with override path for legitimate late-submission reason codes).
- **RBAC/Security:** Role `BILLING_SPECIALIST`; claim data treated as PHI-adjacent (financial + diagnosis codes) — same audit tier as clinical access.

---

### 16.11 Epic 11 — Cardiac Technician: Procedure & Diagnostic Workflows (Stories 11.1–11.10)

**HLD**
```
Cardiac Technician -> EHR Cardiology module (existing /src/cardiology) -> Cardiology API (existing FSM-based)
                                                                        -> FHIR Server (DiagnosticReport, Observation, ImagingStudy)
                                                                        -> DICOM Viewer (GAP-052, new, likely OHIF or Cornerstone.js embed)
```
- Responsibilities: Extends the existing cardiology visit FSM (already documented in this LLD, §11) with structured result forms (ECG/Echo/stress test), Holter tracking, DICOM viewing, and critical-finding escalation — builds on a mature existing subsystem rather than greenfield.
- Dependencies: Existing cardiology FSM/queues; CC-001 (critical finding push, TK-006); DR-008 (risk calculators consume TK result data).
- Key decisions: Structured result forms (TK-001/002/003) are modeled as `Observation` components grouped under a procedure-specific `DiagnosticReport` (one per ECG/Echo/stress test), reusing the existing `fhirDiagnosticReportId` link already present in the cardiology domain types ([fhir-domain.ts](../../../../ehr/src/cardiology/types/fhir-domain.ts)); DICOM viewing is embedded via iframe/web-component rather than a custom-built viewer, to avoid re-implementing DICOM rendering.

**LLD**

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| POST | /cardiology/procedures/{id}/ecg-result | `{intervals,rhythm,interpretation}` | `DiagnosticReport` | TK-001 |
| POST | /cardiology/procedures/{id}/echo-result | `{ef,chambers,valves,findings}` | `DiagnosticReport` | TK-002 |
| POST | /cardiology/procedures/{id}/stress-protocol | `{protocol,stages[],terminationReason}` | `DiagnosticReport` | TK-003 |
| POST | /cardiology/holter/{id}/assign \| /return | `{deviceId}` | `DeviceUseStatement` | TK-004 |
| GET | /cardiology/imaging/{studyId}/viewer-url | — | `{viewerUrl}` | TK-005, signed short-TTL URL into DICOM viewer |
| POST | /cardiology/procedures/{id}/critical-finding | `{finding,severity}` | alert dispatched | TK-006, reuses CC-001 pipeline |
| GET | /cardiology/patients/{id}/previous-studies | — | `DiagnosticReport[]` | TK-007 |

- **Data model:** Reuses existing cardiology FSM tables; add `device_assignments` table for Holter tracking (device_id, patient_id, assigned_at, returned_at).
- **FHIR resources:** DiagnosticReport, Observation, ImagingStudy, DeviceUseStatement.
- **Validation & errors:** Critical findings (TK-006) cannot be saved as a normal result — the form forces the escalation path (same pattern as LT-005) before allowing the report to be finalised.
- **RBAC/Security:** Role `CARDIAC_TECHNICIAN`; DICOM viewer URLs are signed, single-use, short-TTL to avoid exposing raw imaging storage.

---

### 16.12 Epic 12 — Cross-Cutting: Platform, Integration & Quality (Stories 12.1–12.16)

**HLD**
```
All Apps (EHR/LIMS/PharmacyMS) -> FHIR Server :8081 (canonical integration point, CC-004/CC-010)
                                -> Redis (pub/sub for CC-001, cache for queues)
                                -> Temporal (CC-002, long-running workflows: e.g. multi-day dispensing, referral tracking)
                                -> SMART on FHIR Auth Server (CC-005)
                                -> PCR Adapter (CC-006)
```
- Responsibilities: Shared platform capabilities every persona epic depends on. This epic should be sequenced **first** for its safety/integration items (CC-001, CC-004, CC-005) since Epics 1–11 all assume real-time push and cross-app FHIR sync exist.
- Dependencies: None upstream (foundation layer); all other epics depend on this one.
- Key decisions: Real-time notifications (CC-001) built on Redis pub/sub + a thin WebSocket gateway (not a heavyweight message broker) given current scale; Temporal (CC-002) introduced only for genuinely long-running, multi-step sagas (e.g. referral acceptance → scheduling → reminder → follow-up) rather than every async task, to control operational complexity; inter-app FHIR integration (CC-004) uses the FHIR server as the single source of truth with LIMS/PharmacyMS treated as downstream execution engines that sync back via REST callbacks (not direct DB-to-DB coupling).

**LLD**

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| WS | /ws/notifications | JWT on connect | event stream | CC-001, falls back to `GET /sse/notifications` |
| POST | /fhir/R4/$export | `{types,since}` | `{Content-Location}` | CC-016 |
| POST | /smart/authorize \| /token | OAuth2/SMART params | tokens | CC-005 |
| POST | /integration/pcr/match | `{demographics}` | `{matchedPatientId,confidence}` | CC-006 |
| GET | /admin/temporal/workflows | — | `WorkflowExecution[]` | CC-002 observability |

- **Data model:** `webhook_outbox` / `integration_events` table (already implicit in LIMS `olis_outbox` pattern, generalised platform-wide) for reliable at-least-once cross-service delivery; Temporal's own Postgres-backed state store (separate namespace) for CC-002.
- **FHIR resources:** All — this epic is the profile-validation (CC-010) and bulk-export (CC-016) layer for every resource type used elsewhere.
- **Sequence (cross-app FHIR sync, CC-004):**
```
EHR -> FHIR Server: POST ServiceRequest (lab order)
FHIR Server -> integration_events: INSERT (topic=lab.order.created)
Integration Worker -> LIMS: POST /api/v1/orders (idempotent on ServiceRequest.id)
LIMS --> Integration Worker: 201 Created
Integration Worker -> FHIR Server: PATCH ServiceRequest.status=active
```
- **Validation & errors:** All integration events are idempotent (keyed by FHIR resource id) so retries after a downstream outage do not create duplicates; WebSocket reconnect/backoff per AC-CC-001-01 (5s retry, 10 attempts, then manual refresh prompt).
- **RBAC/Security:** SMART on FHIR (CC-005) scopes limit third-party apps to declared resource types/actions; PCR matching (CC-006) results always require human confirmation above a configurable confidence threshold before merging records.

---

*End of Overall Low-Level Design Document — v1.1 (adds §16 Epic-Level HLD & LLD)*
