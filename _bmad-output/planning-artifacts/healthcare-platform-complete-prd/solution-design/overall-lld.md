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

---

*End of Overall Low-Level Design Document — v1.0*
