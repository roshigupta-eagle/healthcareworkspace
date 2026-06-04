# Domain Research — EHR Core Clinical

**Initiative:** ehr-core-clinical
**Date:** 2026-05-13
**Author:** Mary (Business Analyst)
**Research Type:** Domain
**Jurisdiction:** Canada-first (Ontario primary), pan-Canadian, US secondary
**Target Applications:** EHR (Hospital), EHR (Practice), FHIR Integration Layer

---

## Table of Contents

1. [Domain Overview](#1-domain-overview)
2. [Canadian Regulatory Landscape](#2-canadian-regulatory-landscape)
3. [Relevant Standards and Specifications](#3-relevant-standards-and-specifications)
4. [Ontario-Specific Requirements](#4-ontario-specific-requirements)
5. [FHIR Resource Mapping](#5-fhir-resource-mapping)
6. [Key Terminology](#6-key-terminology)
7. [Current State and Industry Trends](#7-current-state-and-industry-trends)
8. [Competitive Landscape](#8-competitive-landscape)
9. [Key Risks and Challenges](#9-key-risks-and-challenges)
10. [References](#10-references)

---

## 1. Domain Overview

### 1.1 What Is EHR Core Clinical?

Electronic Health Record (EHR) Core Clinical refers to the foundational digital capabilities that support the clinical lifecycle of a patient encounter within both hospital (inpatient/outpatient) and community practice (primary care/specialty) settings. It encompasses three pillars:

1. **Patient Registration** — capturing and managing patient demographics, identifiers, insurance/coverage, consent, and relationships.
2. **Encounters and Visits** — scheduling, admission, discharge, transfer (ADT), and episodic care tracking across ambulatory and acute contexts.
3. **Clinical Documentation** — recording progress notes, assessments, orders, results, care plans, allergies, problem lists, and clinical summaries.

These three pillars form the operational backbone of any EHR system and are prerequisites for advanced functions such as clinical decision support, population health analytics, and interoperability exchanges.

### 1.2 Patient Registration

Patient registration is the gateway to all clinical activity. It establishes the patient's identity within the system and connects them to provincial/territorial health insurance, organizational medical record numbers, and consent directives.

**Core data elements:**

| Category | Data Elements |
|---|---|
| **Demographics** | Legal name, preferred name, date of birth, sex assigned at birth, gender identity, address(es), phone, email, preferred language, marital status, race/ethnicity (US), Indigenous identity (CA — voluntary, self-identified) |
| **Identifiers** | Provincial health number (e.g., Ontario Health Card — OHIP), Medical Record Number (MRN), federal health number (RCMP, CAF, veterans), US SSN/MBI (secondary market) |
| **Insurance / Coverage** | Provincial health insurance plan, supplemental coverage, workplace benefits, US commercial/Medicare/Medicaid (secondary market) |
| **Consent** | Consent to treatment, consent to share information, consent to electronic communications, research consent, substitute decision-maker |
| **Relationships** | Next of kin, emergency contact, substitute decision-maker, guardian, primary care provider, referring provider |

**Hospital vs. Practice differences:**

- Hospital registration includes pre-admission, bed assignment, and inpatient census tracking.
- Practice registration is lighter-weight, often combined with scheduling, and may include rostering (patient enrollment) for Ontario capitation models (FHO, FHT, FHG).

### 1.3 Encounters and Visits

An encounter represents a period of healthcare delivery between a patient and a provider or care team. Encounter management is the temporal backbone of clinical activity.

**Encounter types by context:**

| Context | Encounter Types |
|---|---|
| **Hospital — Inpatient** | Emergency, Inpatient admission, Observation, Day surgery, Same-day procedures |
| **Hospital — Outpatient** | Ambulatory clinic visit, Pre-operative assessment, Diagnostic imaging, Lab collection |
| **Community Practice** | Office visit, Virtual visit (video/phone), Home visit, Walk-in, Periodic health exam |
| **Shared** | Referral/consult encounter, Group visit, Mental health session, Allied health visit |

**Encounter lifecycle (ADT):**

1. **Scheduled** — appointment booked, pre-registration data collected
2. **Arrived / Check-in** — patient arrives, demographics verified
3. **In Progress** — clinical care actively being delivered
4. **On Leave** — temporary departure (hospital context)
5. **Discharged / Completed** — care episode concluded, discharge summary created
6. **Cancelled / No-show** — encounter did not occur

**Episode of Care:**

In longitudinal care models (e.g., chronic disease management, cancer care pathways, mental health programs), encounters are grouped under an Episode of Care that tracks the overarching care journey.

### 1.4 Clinical Documentation

Clinical documentation captures the clinical narrative and structured data generated during patient encounters. It is the medico-legal record and the primary input for downstream processes (billing, reporting, quality measurement, interoperability exchange).

**Documentation types:**

| Document Type | Description | Context |
|---|---|---|
| **Progress Notes** | SOAP notes, narrative assessments, daily rounds documentation | Hospital + Practice |
| **History and Physical (H&P)** | Comprehensive initial assessment | Hospital (admission), Practice (new patient) |
| **Consultation Notes** | Specialist assessment in response to referral | Hospital + Practice |
| **Discharge Summary** | Summary of hospital stay, diagnoses, procedures, follow-up plan | Hospital |
| **Visit Summary** | Summary of ambulatory encounter for patient and referring provider | Practice |
| **Operative / Procedure Notes** | Documentation of surgical/procedural interventions | Hospital |
| **Nursing Assessments** | Standardized nursing intake and ongoing assessments | Hospital |
| **Care Plans** | Goal-directed plans for chronic disease, rehab, or complex care | Hospital + Practice |
| **Orders** | Lab, imaging, medication, referral, procedure orders | Hospital + Practice |
| **Results** | Lab results, imaging reports, pathology reports | Hospital + Practice |
| **Problem List** | Active and resolved conditions/diagnoses | Hospital + Practice |
| **Allergy / Intolerance List** | Drug, food, and environmental allergies | Hospital + Practice |
| **Immunization Records** | Administered vaccines and immunization history | Practice (primarily) |
| **Medication List** | Active medications, medication reconciliation | Hospital + Practice |

**Structured vs. Unstructured:**

- **Structured data**: Coded diagnoses (ICD-10-CA), coded procedures (CCI), coded observations (LOINC/pCLOCD), coded medications (DIN/ATC/SNOMED), vital signs, flowsheets.
- **Unstructured data**: Free-text narratives, scanned documents, dictated reports, attached PDFs, clinical images.
- **Semi-structured**: Templated notes with both coded fields and free-text sections.

---

## 2. Canadian Regulatory Landscape

### 2.1 Federal Privacy Legislation

**Personal Information Protection and Electronic Documents Act (PIPEDA):**

- Federal private-sector privacy law governing the collection, use, and disclosure of personal information in commercial activities.
- Applies to federally regulated organizations and as a backstop in provinces without substantially similar legislation.
- Key principles: consent, limiting collection, limiting use/disclosure/retention, accuracy, safeguards, openness, individual access, challenging compliance.
- Health information is treated as sensitive personal information requiring higher safeguards.

**Note:** PIPEDA is being modernized. The Digital Charter Implementation Act (Bill C-27) proposes the Consumer Privacy Protection Act (CPPA) as a replacement. Monitor legislative progress.

### 2.2 Provincial Health Information Acts

Each province/territory has legislation specifically governing personal health information (PHI). For our platform:

| Jurisdiction | Legislation | Key Authority |
|---|---|---|
| **Ontario** | Personal Health Information Protection Act (PHIPA, 2004) | Information and Privacy Commissioner of Ontario (IPC) |
| **Alberta** | Health Information Act (HIA) | Office of the Information and Privacy Commissioner of Alberta |
| **British Columbia** | Freedom of Information and Protection of Privacy Act (FIPPA) + E-Health Act | Office of the Information and Privacy Commissioner for BC |
| **Quebec** | Act Respecting the Sharing of Certain Health Information (Loi 5) + Act Respecting Access + Bill 25 modernization | Commission d'accès à l'information du Québec |
| **Manitoba** | Personal Health Information Act (PHIA) | Manitoba Ombudsman |
| **Saskatchewan** | Health Information Protection Act (HIPA) | Saskatchewan IPC |
| **New Brunswick** | Personal Health Information Privacy and Access Act (PHIPAA) | Access to Information and Privacy Commissioner |
| **Nova Scotia** | Personal Health Information Act (PHIA) | Privacy Review Officer |
| **Federal (CAF/RCMP/Veterans)** | Privacy Act (federal public sector) | Privacy Commissioner of Canada |

### 2.3 Ontario PHIPA Deep Dive

Since Ontario is our primary jurisdiction, PHIPA requirements are foundational:

**Key provisions:**

- **Health Information Custodians (HICs)**: Physicians, hospitals, pharmacies, labs, and other regulated health professionals are custodians of PHI.
- **Circle of Care**: Implied consent within the circle of care for treatment purposes. Individuals providing or assisting with healthcare can share PHI for treatment without explicit consent, *unless* the patient has expressly withheld or withdrawn consent.
- **Explicit Consent Required For**: Disclosure outside the circle of care, fundraising, marketing, research (unless REB-approved waiver), disclosure to non-HICs.
- **Consent Directives / Lock-Box**: Patients can restrict access to specific PHI. Systems must support consent directives (lock-box) and flag restricted records.
- **Audit Requirements**: HICs must maintain logs of access to PHI. Patients have a right to request an audit log of who accessed their information.
- **Breach Notification**: Mandatory notification to IPC and affected individuals for privacy breaches involving PHI (amended 2020).
- **Electronic Health Records**: PHIPA Part III.1 governs prescribed electronic health record systems, including prescribed persons (Ontario Health / ConnectingOntario) and their obligations.
- **Agents**: Individuals acting on behalf of a HIC are agents and must comply with HIC policies and PHIPA.

**Platform implications:**

- Must implement role-based access control (RBAC) aligned with circle-of-care rules.
- Must support patient consent directives (opt-out/lock-box) at a granular level.
- Must maintain immutable audit logs of all PHI access.
- Must support breach detection and notification workflows.
- Must distinguish HIC vs. agent vs. prescribed person roles in system design.

### 2.4 Consent Management

Consent is the most complex regulatory area for a Canadian-first EHR:

| Consent Type | Ontario (PHIPA) | Pan-Canadian | US (HIPAA) |
|---|---|---|---|
| **Treatment** | Implied within circle of care (Health Care Consent Act) | Varies by province — some explicit, some implied | Consent to treatment governed by state law |
| **Information Sharing** | Implied within circle of care; explicit outside | Varies; some provinces require explicit consent for HIE | Notice of Privacy Practices + opt-out for TPO |
| **Consent Directives** | Supported — patients can restrict (lock-box) | Supported in most provinces with varying granularity | Patient right to request restrictions (provider not required to agree) |
| **Research** | Explicit consent or REB-approved waiver | Federal Tri-Council Policy (TCPS 2) | IRB-approved consent or waiver under Common Rule |
| **Electronic Communications** | CASL (anti-spam) + PHIPA for health messages | CASL applies nationally | HIPAA minimum necessary + state telehealth laws |
| **Substitute Decision-Maker** | Health Care Consent Act hierarchy | Varies by province | State-specific (POA, healthcare proxy) |

### 2.5 Data Sovereignty and Residency

- **Canada**: PHI must generally remain in Canada. PHIPA and most provincial acts require that PHI not be transferred outside Canada without explicit consent or where necessary for treatment and adequate safeguards are in place.
- **Cloud hosting**: Must use Canadian data centers (AWS ca-central-1, Azure Canada Central / Canada East, GCP northamerica-northeast1/2).
- **US market**: If serving US clients, HIPAA Business Associate Agreements (BAAs) are required. US data must comply with HIPAA and state laws.
- **Cross-border**: A Canadian-first platform serving US clients must maintain strict data partitioning — Canadian PHI stays in Canada, US PHI stays in the US (or follows HIPAA rules).

### 2.6 CIHI Data Standards

The Canadian Institute for Health Information (CIHI) mandates data standards for Canadian healthcare reporting:

| Standard | Domain | Relevance |
|---|---|---|
| **DAD (Discharge Abstract Database)** | Hospital inpatient and day surgery | Encounter discharge coding, diagnosis (ICD-10-CA), procedures (CCI) |
| **NACRS (National Ambulatory Care Reporting System)** | Emergency department, ambulatory care | ED encounter reporting, triage, diagnoses |
| **OMHRS (Ontario Mental Health Reporting System)** | Mental health inpatient | RAI-MH assessments, mental health encounters |
| **CCRS (Continuing Care Reporting System)** | Long-term care, complex continuing care | RAI assessments, continuing care encounters |
| **NRS (National Rehabilitation Reporting System)** | Inpatient rehabilitation | FIM/FRS assessments |
| **MIS (Management Information System)** | Financial / operational reporting | Cost accounting, resource utilization |

**Platform implication**: Hospital EHR must support coded data capture in ICD-10-CA and CCI at minimum to enable downstream CIHI reporting, even if the primary clinical terminology is SNOMED CT.

---

## 3. Relevant Standards and Specifications

### 3.1 HL7 FHIR R4 — Core Resources for EHR Clinical

| Resource | Purpose in EHR Core Clinical |
|---|---|
| `Patient` | Patient demographics, identifiers, links |
| `RelatedPerson` | Next of kin, emergency contacts, guardians |
| `Person` | Cross-patient linking (MPI use cases) |
| `Coverage` | Insurance/health plan enrollment |
| `Encounter` | Visit/admission/episode tracking |
| `EpisodeOfCare` | Longitudinal care grouping |
| `Condition` | Problem list, encounter diagnoses |
| `Procedure` | Performed procedures |
| `Observation` | Vitals, social history, functional status, clinical findings |
| `DiagnosticReport` | Lab and imaging result groupings |
| `DocumentReference` | Clinical document metadata and binary references |
| `Composition` | Structured clinical documents (discharge summaries, consult notes) |
| `CarePlan` | Goal-directed care plans |
| `Goal` | Patient health goals |
| `CareTeam` | Care team membership |
| `ServiceRequest` | Orders (lab, imaging, referral, consult) |
| `AllergyIntolerance` | Allergy and intolerance records |
| `Immunization` | Administered vaccines |
| `MedicationRequest` | Medication orders/prescriptions |
| `MedicationStatement` | Patient-reported medication use |
| `MedicationAdministration` | Administered medications (hospital) |
| `Consent` | Consent directives and policies |
| `AuditEvent` | PHI access audit trail |
| `Provenance` | Data origin and authorship tracking |
| `Practitioner` | Clinician demographics and identifiers |
| `PractitionerRole` | Provider role within an organization |
| `Organization` | Healthcare organization |
| `Location` | Physical locations (wards, clinics, rooms) |
| `Appointment` | Scheduling |
| `Schedule` / `Slot` | Availability management |
| `Questionnaire` / `QuestionnaireResponse` | Structured data capture (intake forms, assessments) |

### 3.2 Canadian FHIR Profiles

**CA Baseline (Canadian Baseline):**

- Provides pan-Canadian expectations for core resources: Patient, Practitioner, PractitionerRole, Organization, Location, Encounter, Condition, Procedure, Observation, MedicationRequest, Immunization, AllergyIntolerance, DiagnosticReport.
- Published through the Canadian FHIR Registry / HL7 Canada / Simplifier.
- Defines Canadian-specific identifier systems (e.g., provincial health numbers, CPSO/college IDs).
- Establishes Must Support elements for Canadian context.
- Not a complete implementation contract — jurisdictional IGs layer on top.

**Pan-Canadian Patient Summary (PS-CA):**

- Aligned to the International Patient Summary (IPS) standard.
- Document-style exchange using `Bundle` (type: document) with `Composition` and referenced clinical resources.
- Core sections: medications, allergies, problems, immunizations, procedures, results, vital signs, functional status, advance directives.
- Uses Canadian terminology bindings (SNOMED CT Canadian Edition, pCLOCD, ICD-10-CA).
- Essential for inter-provincial patient summary exchange and Ontario Health Teams (OHTs).

**CACDI / CA Core+ Direction:**

- Emerging pan-Canadian health data content framework.
- Working toward a Canadian Core Data for Interoperability (CACDI) analogous to US USCDI.
- Monitor Health Infoway/InfoCentral for current status and FHIR profile alignment.

### 3.3 Ontario FHIR Implementation Guides

| IG | Domain | Key Resources |
|---|---|---|
| **DHDR** | Drug history, medication dispensing | `MedicationDispense`, `MedicationRequest`, `Medication`, `Patient`, `Practitioner`, `Organization` |
| **OLIS** | Laboratory results query/retrieval | `DiagnosticReport`, `Observation`, `Specimen`, `ServiceRequest`, `Patient`, `Practitioner` |
| **PCR** | Provincial client (patient) registry | `Patient` (query/match), provincial identifiers (OHIP HN, IHN) |
| **PHSD/PPR** | Provider/health services directory | `Practitioner`, `PractitionerRole`, `Organization`, `Location`, `HealthcareService`, `Endpoint` |
| **Ontario eReferral** | Referral/consult workflows | `ServiceRequest`, `Task`, `Appointment`, `DocumentReference`, `QuestionnaireResponse` |
| **Ontario eForms** | Structured data capture | `Questionnaire`, `QuestionnaireResponse` (SDC) |

### 3.4 US Core Profiles (Secondary Market)

| Profile | Relevance |
|---|---|
| **US Core Patient** | US-specific demographics, race/ethnicity, MBI/SSN identifiers |
| **US Core Encounter** | Encounter classification per US realm (e.g., CMS encounter types) |
| **US Core Condition** | Problem list and encounter diagnosis with SNOMED CT US Edition and ICD-10-CM |
| **US Core Procedure** | SNOMED CT, CPT, HCPCS, ICD-10-PCS coded procedures |
| **US Core Observation** | Vitals, lab results, social determinants, clinical results |
| **US Core DiagnosticReport** | Lab and note groupings |
| **US Core DocumentReference** | Clinical notes (C-CDA on FHIR transition) |
| **US Core CarePlan** | Assessment and plan of treatment |
| **US Core AllergyIntolerance** | Allergy records with US terminology |
| **US Core Immunization** | CVX-coded immunization records |
| **US Core MedicationRequest** | RxNorm-coded medication orders |
| **US Core Goal** | Patient health goals |

**ONC/ASTP g(10) certification** requires US Core + SMART App Launch + Bulk Data for patient and population API access. USCDI defines the baseline data classes/elements.

### 3.5 IHE Profiles

| IHE Profile | Purpose | Relevance |
|---|---|---|
| **XDS.b (Cross-Enterprise Document Sharing)** | Document repository/registry architecture | Hospital document sharing, HIE participation |
| **MHD (Mobile Access to Health Documents)** | FHIR-based document sharing (simplified XDS) | Modern FHIR-native alternative to XDS for document exchange |
| **PDQm (Patient Demographics Query for Mobile)** | FHIR-based patient demographics query | Patient matching across systems |
| **PIXm (Patient Identifier Cross-referencing for Mobile)** | FHIR-based patient ID cross-referencing | MPI integration |
| **mCSD (Mobile Care Services Discovery)** | FHIR-based provider/service directory | Provider directory integration |
| **ATNA (Audit Trail and Node Authentication)** | Audit logging and TLS node authentication | Audit trail compliance |

---

## 4. Ontario-Specific Requirements

### 4.1 Ontario Health Teams (OHTs)

Ontario Health Teams are groups of providers and organizations that are accountable for delivering coordinated care to a defined patient population. There are 50+ approved or in-development OHTs across Ontario.

**Implications for EHR Core Clinical:**

- OHTs require shared patient registration and care coordination across organizational boundaries.
- EHR must support team-based care with shared care plans, shared problem lists, and cross-organizational encounter tracking.
- Patient attribution/rostering to OHTs is a core function — linking patients to their OHT and primary care provider.
- Interoperability with ConnectingOntario Clinical Viewer is expected for OHT members.
- Consent management must handle OHT-level information sharing.

### 4.2 Ontario Health Information Exchange (HIE)

**ConnectingOntario Clinical Viewer:**

- Provincial clinical viewer providing read access to consolidated patient data from hospitals, community labs, home care, and other contributing sources.
- Clinicians can view lab results (OLIS), drug history (DHDR), hospital discharge summaries, and other clinical documents.
- Contributing to ConnectingOntario is a requirement for hospitals and increasingly for community-based providers.
- FHIR-based integration is evolving; currently a mix of legacy (HL7 v2, CDA) and emerging FHIR interfaces.

**HIE Integration Points for Our Platform:**

| Integration | Direction | Protocol | Purpose |
|---|---|---|---|
| **OLIS** | Query/Response | FHIR R4 | Retrieve laboratory results for patient |
| **DHDR** | Query/Response | FHIR R4 | Retrieve medication dispensing history |
| **PCR** | Query/Response | FHIR R4 | Patient identity verification, demographic sync |
| **PHSD/PPR** | Query/Subscription | FHIR R4 | Provider/organization directory lookup |
| **ConnectingOntario** | Contribution | HL7v2 / CDA / FHIR (emerging) | Contribute clinical documents to provincial viewer |
| **Ontario eReferral** | Bidirectional | FHIR R4 + SMART | Send/receive referrals and consults |
| **ONE ID** | Authentication | OAuth 2.0 / SAML | Clinician identity and authentication |

### 4.3 OLIS Integration for Labs

Ontario Laboratories Information System (OLIS) is the provincial lab information repository.

**Key requirements:**

- EHR must be able to query OLIS for patient lab results using FHIR R4 specifications.
- OLIS results are identified using pCLOCD/LOINC codes.
- EHR must map between internal lab order codes and OLIS observation codes.
- Result display must preserve OLIS-provided reference ranges, abnormal flags, and interpretive comments.
- Historical lab data retrieval supports continuity of care.

### 4.4 DHDR for Drug History

Digital Health Drug Repository (DHDR) provides medication dispensing history.

**Key requirements:**

- Query DHDR for patient medication history using FHIR R4 `MedicationDispense` resources.
- Supports medication reconciliation at admission (hospital) and initial/ongoing visits (practice).
- Drug identification uses DIN (Drug Identification Number — Health Canada) and potentially ATC classification.
- Must handle Ontario Drug Benefit (ODB) program medications and private-pay records where contributed.

### 4.5 PCR for Patient Identity

Provincial Client Registry (PCR) is Ontario's master patient index.

**Key requirements:**

- Query PCR for patient demographics using FHIR R4 `Patient` resource.
- Support patient matching using Ontario Health Number (OHIP health card number), demographics-based matching, and point-of-service identifiers.
- Sync patient demographics from PCR to local EHR patient record.
- Handle health card version codes and expiry for OHIP eligibility verification.
- Support newborn registration workflows (temporary health numbers).

### 4.6 ONE ID Identity Management

ONE ID is Ontario Health's identity management service for healthcare providers.

**Key requirements:**

- EHR must integrate with ONE ID for clinician authentication and single sign-on (SSO).
- ONE ID provides OAuth 2.0 / SAML-based authentication.
- Supports multi-factor authentication (MFA) for PHI access.
- Role and organizational affiliation managed through ONE ID.
- Required for accessing provincial services (OLIS, DHDR, ConnectingOntario, eReferral).

### 4.7 Ontario MD EMR Specifications

Ontario MD (a subsidiary of the Ontario Medical Association) establishes specifications for certified EMRs used in community practice settings.

**Key requirements:**

- EMR certification requirements for functionality, usability, privacy, and interoperability.
- Billing integration with OHIP (Ontario Health Insurance Plan) — physician claims submission, shadow billing for alternate payment plans.
- Cumulative Patient Profile (CPP) standards — problem list, medication list, allergy list, immunization list, risk factors, preventive care.
- Decision support for preventive care reminders and chronic disease management.
- Integration with clinical tools: lab requisition, e-prescribing, referral management.

---

## 5. FHIR Resource Mapping

### 5.1 Patient Registration Domain

| Business Concept | FHIR Resource(s) | Key Elements | Notes |
|---|---|---|---|
| Patient demographics | `Patient` | name, birthDate, gender, address, telecom, communication.language | CA Baseline Patient profile; support multiple names (legal, preferred, Indigenous name) |
| Health card number (OHIP) | `Patient.identifier` | system: provincial HN system, value: HN, period | Ontario PCR identifier system |
| Medical Record Number (MRN) | `Patient.identifier` | system: local assigning authority, value: MRN | Per-facility MRN |
| Next of kin / Emergency contact | `RelatedPerson` | relationship, name, telecom, address | Reference from Patient |
| Substitute decision-maker | `RelatedPerson` | relationship (coded: substitute decision-maker) | Ontario Health Care Consent Act role |
| Primary care provider | `Patient.generalPractitioner` | Reference to `Practitioner` or `PractitionerRole` | For rostered patients |
| Insurance / Coverage | `Coverage` | payor (ref Organization), beneficiary (ref Patient), type, period, identifier | Provincial health plan + supplemental |
| Consent directives | `Consent` | status, scope, category, patient, dateTime, policy, provision | PHIPA consent directives / lock-box |
| Patient merge / link | `Patient.link` | other (ref Patient), type (replaced-by, replaces, refer) | MPI merge support |
| Managing organization | `Patient.managingOrganization` | Reference to `Organization` | Facility/practice managing the record |

### 5.2 Encounters and Visits Domain

| Business Concept | FHIR Resource(s) | Key Elements | Notes |
|---|---|---|---|
| Ambulatory visit | `Encounter` | class: AMB, status, period, type, serviceType, participant, reasonCode | Community practice and hospital outpatient |
| Inpatient admission | `Encounter` | class: IMP, status, period, hospitalization (admit/discharge), location | Hospital ADT |
| Emergency visit | `Encounter` | class: EMER, status, period, hospitalization, priority | ED encounters |
| Virtual visit | `Encounter` | class: VR, status, period, serviceType | Telemedicine/video/phone visits |
| Encounter status tracking | `Encounter.status` | planned → arrived → in-progress → onleave → finished → cancelled | ADT state machine |
| Bed / location management | `Encounter.location` | location (ref Location), status, period, physicalType | Hospital ward/bed tracking |
| Transfer | `Encounter.location` (multiple) | Sequential location entries with periods | Track patient movement |
| Admission source / discharge disposition | `Encounter.hospitalization` | admitSource, dischargeDisposition, reAdmission | CIHI DAD reporting fields |
| Episode of care | `EpisodeOfCare` | status, type, diagnosis, patient, managingOrganization, period, careManager | Longitudinal care programs |
| Scheduling | `Appointment` + `Schedule` + `Slot` | status, serviceType, participant, start/end, slot | Appointment booking and availability |
| Care team | `CareTeam` | status, category, name, subject, encounter, participant, managingOrganization | Multi-disciplinary care team |
| Reason for visit | `Encounter.reasonCode` / `Encounter.reasonReference` | CodeableConcept or Reference to Condition/Procedure/Observation | Chief complaint / presenting problem |
| Encounter diagnosis | `Encounter.diagnosis` | condition (ref Condition), use (AD, DD, CC, CM), rank | Admission, discharge, and comorbid diagnoses |

### 5.3 Clinical Documentation Domain

| Business Concept | FHIR Resource(s) | Key Elements | Notes |
|---|---|---|---|
| Progress note / clinical note | `Composition` | type (LOINC doc type), subject, encounter, date, author, section entries | Structured clinical document |
| Discharge summary | `Composition` | type: 18842-5 (LOINC), sections: diagnoses, medications, follow-up, procedures | Hospital discharge document |
| Consult note | `Composition` | type: 11488-4 (LOINC), sections: reason, findings, assessment, plan | Specialist consultation |
| Scanned / attached documents | `DocumentReference` | type, category, subject, date, author, content (attachment URL/data) | PDFs, images, external documents |
| Lab results | `DiagnosticReport` + `Observation` | code (LOINC/pCLOCD), result, specimen, performer | OLIS integration |
| Imaging results | `DiagnosticReport` + `ImagingStudy` | code, conclusion, imagingStudy, media | Radiology reports |
| Problem list | `Condition` | clinicalStatus: active, code (SNOMED CT / ICD-10-CA), subject, onsetDateTime | Active problem list management |
| Encounter diagnosis | `Condition` | category: encounter-diagnosis, code, encounter reference | ICD-10-CA for CIHI reporting |
| Allergy list | `AllergyIntolerance` | clinicalStatus, verificationStatus, type, category, code, patient, reaction | Drug, food, environmental |
| Medication list | `MedicationRequest` / `MedicationStatement` | status, medication, subject, dosageInstruction | Active medications and patient-reported |
| Care plan | `CarePlan` | status, intent, title, description, subject, period, goal, activity | Goal-directed care plans |
| Health goals | `Goal` | lifecycleStatus, description, subject, target | Patient health goals |
| Orders (lab, imaging) | `ServiceRequest` | status, intent, code, subject, encounter, requester, performer | Order entry and tracking |
| Vital signs | `Observation` | code (LOINC vital signs panel), value, effectiveDateTime, subject, encounter | Heart rate, BP, temp, SpO2, weight, height, BMI |
| Immunization record | `Immunization` | status, vaccineCode (CVX / SNOMED CT), patient, occurrenceDateTime, site, route | PCR / public health integration |
| Assessments / screening tools | `QuestionnaireResponse` | questionnaire, subject, encounter, authored, item | PHQ-9, GAD-7, CAGE, fall risk, etc. |
| Clinical attachments | `DocumentReference` + `Binary` | content.attachment, type, category | Supporting documents for encounters |

---

## 6. Key Terminology

### 6.1 Clinical Terminology Systems

| Terminology | URI | Canadian Use | US Use | Domain |
|---|---|---|---|---|
| **SNOMED CT Canadian Edition** | `http://snomed.info/sct` (with CA edition version) | Primary clinical terminology for problems, findings, procedures, body sites | SNOMED CT US Edition used in US context | Clinical concepts |
| **ICD-10-CA** | `https://fhir.infoway-inforoute.ca/CodeSystem/icd-10-ca` | Morbidity classification, CIHI reporting (DAD, NACRS), hospital diagnoses | ICD-10-CM used in US | Diagnosis reporting |
| **CCI (Canadian Classification of Health Interventions)** | `https://fhir.infoway-inforoute.ca/CodeSystem/cci` | Health intervention classification, CIHI reporting, hospital procedures | CPT/HCPCS/ICD-10-PCS in US | Procedure reporting |
| **LOINC** | `http://loinc.org` | Lab observations, document types, vital signs, assessments | Same | Observations, documents |
| **pCLOCD** | `https://fhir.infoway-inforoute.ca/CodeSystem/pCLOCD` | Canadian LOINC subset with Canadian display names, French translations, recommended units | Not used in US | Canadian lab observations |
| **UCUM** | `http://unitsofmeasure.org` | Machine-processable units of measure | Same | Units |
| **DIN (Drug Identification Number)** | Health Canada DIN system | Canadian drug product identification | NDC in US | Drug products |
| **ATC (Anatomical Therapeutic Chemical)** | WHO ATC system | Drug classification (CIHI reporting) | Not primary in US | Drug classification |
| **CVX** | `http://hl7.org/fhir/sid/cvx` | Vaccine codes (shared with US) | Same | Immunization |
| **RxNorm** | `http://www.nlm.nih.gov/research/umls/rxnorm` | May be used for cross-border; not primary in CA | Primary medication terminology | Medication (US) |

### 6.2 Identifier Systems

| Identifier | System URI / Namespace | Context |
|---|---|---|
| Ontario Health Number (OHIP) | `https://fhir.infoway-inforoute.ca/NamingSystem/ca-on-patient-hcn` | Ontario patient identification |
| Provincial Health Number (generic) | Province-specific NamingSystem URIs | Other provinces |
| MRN (Medical Record Number) | Organization-specific system URI | Per-facility patient identification |
| CPSO Number | `https://fhir.infoway-inforoute.ca/NamingSystem/ca-on-provider-upi` | Ontario physician identifier |
| College/License Number | Province/college-specific NamingSystem | Provincial provider identification |
| NPI (National Provider Identifier) | `http://hl7.org/fhir/sid/us-npi` | US provider identification |
| Facility/Organization ID | Organization-specific or provincial directory | Facility identification |

### 6.3 Key Domain Terms Glossary

| Term | Definition |
|---|---|
| **ADT** | Admission, Discharge, Transfer — core hospital patient movement workflow |
| **Circle of Care** | The group of healthcare providers involved in a patient's treatment who can share PHI under implied consent (Ontario PHIPA) |
| **Consent Directive / Lock-Box** | Patient instruction restricting access to specific PHI |
| **CPP** | Cumulative Patient Profile — Ontario standard for the longitudinal patient summary in community EMRs |
| **DAD** | Discharge Abstract Database — CIHI reporting standard for hospital inpatient/day surgery encounters |
| **DUR** | Drug Utilization Review — pharmacy clinical decision support for drug interactions, allergies, duplicates |
| **FHO / FHT / FHG** | Family Health Organization / Team / Group — Ontario primary care capitation models |
| **HIC** | Health Information Custodian — person/organization responsible for PHI under PHIPA |
| **NACRS** | National Ambulatory Care Reporting System — CIHI standard for ED and ambulatory encounters |
| **OHT** | Ontario Health Team — integrated care delivery model |
| **OHIP** | Ontario Health Insurance Plan — provincial health insurance program |
| **OLIS** | Ontario Laboratories Information System — provincial lab results repository |
| **DHDR** | Digital Health Drug Repository — provincial drug dispensing history |
| **PCR** | Provincial Client Registry — Ontario's master patient index |
| **PHI** | Personal Health Information — as defined by provincial health information acts |
| **PHIPA** | Personal Health Information Protection Act — Ontario's health privacy legislation |
| **SOAP** | Subjective, Objective, Assessment, Plan — standard clinical documentation format |
| **SDM** | Substitute Decision-Maker — person authorized to make health decisions for an incapable patient |

---

## 7. Current State and Industry Trends

### 7.1 EMR Landscape in Ontario

**Community Practice EMRs:**

| EMR | Vendor | Market Position | Notes |
|---|---|---|---|
| **PS Suite** | TELUS Health | Dominant in Ontario primary care | Large installed base, Ontario MD certified, OLIS/DHDR integrated |
| **Accuro** | QHR Technologies (WELL Health) | Significant market share, growing | Multi-specialty, Ontario MD certified |
| **OSCAR** | Open-source (McMaster) | Moderate share, academic roots | Open-source, university-supported, niche following |
| **Med Access** | TELUS Health | Some presence | Being consolidated with PS Suite |
| **Healthquest (CHR)** | TELUS Health | Legacy, declining | Migration path to PS Suite |

**Hospital EHRs:**

| EHR | Vendor | Market Position | Notes |
|---|---|---|---|
| **Meditech** | Meditech | Widespread in Ontario community hospitals | Expanse is current platform; many hospitals on older versions |
| **Epic** | Epic Systems | Major academic/teaching hospitals (UHN, Sinai, CHEO, The Ottawa Hospital, Trillium) | Rapidly expanding in Ontario; high implementation cost |
| **Cerner (Oracle Health)** | Oracle | Present in some Ontario hospitals (Southlake, London Health Sciences transitioning) | Undergoing Oracle transformation; market position uncertain |
| **Allscripts / Altera** | Altera Digital Health | Some hospitals (Sunrise Clinical Manager) | Smaller Ontario footprint |
| **MEDITECH** | Meditech | Strong base, particularly rural/community hospitals | Expanse adoption accelerating |

### 7.2 Key Gaps in Current Landscape

1. **Fragmented patient records**: No single longitudinal patient record across hospital and community settings. ConnectingOntario is view-only, not transactional.
2. **Poor interoperability**: Most Ontario EMRs rely on HL7 v2 messaging or proprietary integrations. FHIR adoption is early-stage for most community EMRs.
3. **Limited patient engagement**: Patient portals are inconsistent; most EMRs have basic portals. No unified patient access to their own data across providers.
4. **Consent management gaps**: Most systems have rudimentary consent management. PHIPA consent directives (lock-box) are poorly supported.
5. **Clinical documentation burden**: Documentation is largely unstructured. Coded data capture is limited outside of hospital abstracting.
6. **Scheduling fragmentation**: No provincial scheduling infrastructure. Patients must call each provider separately.
7. **Referral inefficiency**: eReferral adoption is growing but not universal. Many referrals still fax-based.
8. **Mobile and remote care**: Limited mobile-first clinical interfaces. Virtual care adoption surged during COVID but tooling remains bolted-on.

### 7.3 Industry Trends

| Trend | Description | Platform Relevance |
|---|---|---|
| **FHIR-First Architecture** | Shift from HL7 v2/CDA to FHIR R4 as the primary interoperability standard | Core architecture — HAPI FHIR JPA as integration backbone |
| **Cloud-Native EHR** | Migration from on-premise to cloud-hosted EHR platforms | Kubernetes-based deployment, Canadian cloud regions |
| **AI-Assisted Documentation** | Ambient listening, AI-generated clinical notes, NLP-based coding | Future capability — prepare data model for structured+unstructured |
| **Patient-Centered Access** | Patient portals, SMART on FHIR apps, patient-controlled sharing | Design for patient-facing FHIR APIs from day one |
| **Ontario Health Teams (OHTs)** | Integrated care networks requiring shared care coordination | Team-based care, shared care plans, cross-org workflows |
| **Virtual Care Integration** | Telemedicine as a first-class encounter type, not a bolt-on | Virtual encounters, async messaging, remote monitoring |
| **Digital Identity** | Provincial digital identity (ONE ID evolution, Ontario Digital Identity) | Modern authentication, SMART App Launch |
| **Terminology Modernization** | Push toward SNOMED CT adoption for clinical use beyond coding | SNOMED CT CA Edition as primary clinical terminology |
| **Data Analytics and Population Health** | Shift from fee-for-service to value-based care requires analytics | Data warehouse readiness, reporting views, quality measures |
| **Interoperability Mandates** | Provincial and federal push for mandatory standards adoption | Compliance-ready FHIR APIs and data exchange |

---

## 8. Competitive Landscape

### 8.1 Competitive Matrix

| Competitor | Type | Strengths | Weaknesses | Opportunity |
|---|---|---|---|---|
| **Epic** | US-based enterprise EHR | Comprehensive, proven at scale, strong clinical workflows, growing Ontario footprint | Extremely expensive, US-centric design, long implementation timelines, vendor lock-in, poor FHIR openness historically | Too costly for community hospitals and practices; Canadian requirements are secondary |
| **Cerner / Oracle Health** | US-based enterprise EHR | Large installed base, Oracle investment | Oracle transformation uncertainty, customer attrition, unclear Canadian commitment | Hospitals evaluating alternatives may consider a Canadian-built option |
| **TELUS Health (PS Suite)** | Canadian practice EMR | Dominant Ontario market share, deep OHIP billing integration, large user base | Aging architecture, limited hospital capability, slow innovation, poor interoperability | Physician frustration with PS Suite creates migration opportunity |
| **QHR / Accuro** | Canadian practice EMR | Modern-ish architecture, growing, multi-specialty | Limited hospital capability, WELL Health acquisition direction uncertain | Practices seeking alternatives to TELUS |
| **OSCAR** | Open-source EMR | Free, academic support, customizable | Under-resourced development, limited scalability, no enterprise support model | Open-source community may adopt modern FHIR-native components |
| **Meditech** | US-based hospital EHR | Strong in community hospitals, affordable relative to Epic | Meditech-centric ecosystem, limited third-party integration, slower innovation | Community hospitals seeking modern FHIR-native alternative |
| **MEDITECH Expanse** | Hospital EHR (current gen) | Modernized from legacy Meditech, web-based, ambulatory capability | Still Meditech-centric, less flexible than modern cloud-native approaches | Gap between Expanse and true cloud-native platform |

### 8.2 Market Gaps and Opportunity

**The core opportunity:** There is no Canadian-built, FHIR-native, cloud-native EHR platform that spans both hospital and community practice settings with native Ontario/pan-Canadian regulatory compliance.

**Specific gaps our platform can address:**

1. **Canadian-First Compliance**: Built for PHIPA/PIPEDA from the ground up, not retrofitted from US HIPAA assumptions. Native consent directive support, circle-of-care RBAC, Canadian data residency.

2. **Unified Hospital + Practice**: A single platform architecture serving both acute and community care — eliminating the hospital/practice EHR divide that currently forces patients and providers to work across disconnected systems.

3. **FHIR-Native Architecture**: Not a legacy system with a FHIR API bolted on, but a platform where FHIR R4 is the native data model for interoperability from day one. Native OLIS, DHDR, PCR, and ConnectingOntario integration.

4. **Modern Technology Stack**: Cloud-native (Go/Rust microservices, React microfrontends, Temporal workflows) vs. legacy monolithic architectures. Designed for horizontal scaling, rapid feature delivery, and extensibility.

5. **OHT-Ready Shared Care**: Native support for Ontario Health Team care coordination — shared care plans, cross-organizational encounter visibility, team-based workflows.

6. **Canadian Terminology Native**: SNOMED CT Canadian Edition, ICD-10-CA, CCI, pCLOCD built in, not bolted on. Bilingual (EN/FR) ready for pan-Canadian expansion.

7. **Open Platform / SMART on FHIR**: Third-party app ecosystem through SMART App Launch, enabling innovation without vendor lock-in.

8. **US Secondary Market**: Same FHIR-native architecture can serve US Core profiles, USCDI, and ONC certification requirements — enabling cross-border market expansion.

---

## 9. Key Risks and Challenges

### 9.1 Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Provincial certification requirements are undefined or changing** — Ontario does not have a single EHR certification program equivalent to ONC; hospital procurement has its own evaluation criteria | High | High | Engage Ontario Health and Ontario MD early; track certification evolution; design for compliance flexibility |
| R2 | **Privacy by design is non-negotiable and complex** — PHIPA consent directives, audit requirements, and circle-of-care rules must be built into the core architecture, not layered on | High | Critical | Privacy-by-design architectural principle; engage IPC guidance; build consent engine as a core service |
| R3 | **Consent management complexity** — supporting implied consent (circle of care), explicit consent (outside circle), consent directives (lock-box), substitute decision-makers, and cross-provincial consent variations | High | High | Dedicated consent service with configurable policy engine; jurisdiction-specific policy profiles |
| R4 | **Interoperability maturity gaps** — Ontario FHIR IGs are in various stages of maturity (some published, some draft/ballot); pan-Canadian direction is evolving | Medium | High | Abstract integration layer to support IG version changes; participate in Infoway projectathons; implement adapter pattern |
| R5 | **Physician adoption resistance** — clinicians have workflow preferences; switching EHR is notoriously disruptive; documentation burden concerns | High | High | UX-first design, clinician co-design process, migration tools, training investment, demonstrate efficiency gains |
| R6 | **Hospital procurement complexity** — hospital EHR procurement involves lengthy RFP processes, IT governance, change management, and organizational politics | High | Medium | Target community hospitals first; build reference implementations; pursue OHT-aligned deployments |
| R7 | **CIHI reporting compliance** — hospital module must support DAD, NACRS, and other CIHI data submissions with accurate ICD-10-CA/CCI coding | Medium | High | Build coding workflow and validation rules; integrate coding decision support; support HIM workflows |
| R8 | **Data migration from legacy systems** — migrating patient data from PS Suite, Accuro, OSCAR, Meditech, etc. is complex and risky | High | High | Develop vendor-specific migration tools; FHIR-based import; rigorous data validation and reconciliation |
| R9 | **Bilingual requirements for pan-Canadian expansion** — EN/FR for all UI, terminology displays, and documents when serving Quebec or federal clients | Medium | Medium | Internationalization (i18n) from day one; SNOMED CT Canadian Edition French designations; React i18n framework |
| R10 | **Terminology licensing and governance** — SNOMED CT, LOINC, ICD-10-CA, CCI have licensing requirements; pCLOCD and ICD-10-CA/CCI are Canadian-specific | Low | Medium | Secure appropriate licenses early; use Infoway terminology services; embed governance in terminology service design |
| R11 | **US market entry complexity** — ONC certification, HIPAA compliance, US Core conformance, state-level requirements | Medium | Medium | Design for dual-jurisdiction from architecture phase; US market entry as Phase 2; leverage FHIR-native advantage |
| R12 | **PrescribeIT transition uncertainty** — PrescribeIT planned conclusion May 29, 2026; transition to open standards in progress | High | Medium | Monitor Infoway announcements; design e-prescribing for open-standard approach; prepare for post-PrescribeIT landscape |

### 9.2 Critical Success Factors

1. **Privacy and consent engine must be a first-class architectural component** — not an afterthought.
2. **Ontario integration readiness (OLIS, DHDR, PCR, ONE ID) is a market entry requirement** — not a nice-to-have.
3. **Clinician UX must match or exceed existing EMR workflows** — adoption depends on usability.
4. **FHIR conformance must be verifiable** — load Canadian IGs into HAPI validation, run Infoway projectathon tests, demonstrate compliance.
5. **Dual-context (hospital + practice) architecture must not compromise either experience** — avoid lowest-common-denominator design.

---

## 10. References

### 10.1 Canadian Federal and Ontario Provincial

| Source | URL | Description |
|---|---|---|
| PIPEDA | `https://laws-lois.justice.gc.ca/eng/acts/p-8.6/` | Federal privacy legislation |
| PHIPA | `https://www.ontario.ca/laws/statute/04p03` | Ontario health privacy legislation |
| Health Care Consent Act | `https://www.ontario.ca/laws/statute/96h02` | Ontario consent to treatment legislation |
| Ontario IPC — PHIPA guidance | `https://www.ipc.on.ca/health/` | Privacy Commissioner PHIPA resources |
| Ontario Health | `https://www.ontariohealth.ca/` | Provincial health agency |
| Ontario Health Digital Standards | `https://www.ontariohealth.ca/digital-standards` | Provincial digital health standards |
| ConnectingOntario | `https://ehealthontario.on.ca/en/for-healthcare-professionals/connectingontario` | Provincial clinical viewer |
| ONE ID | `https://ehealthontario.on.ca/en/for-healthcare-professionals/one-id` | Provincial identity management |
| Ontario MD | `https://www.ontariomd.ca/` | Ontario physician EMR specifications |

### 10.2 Canada Health Infoway and Pan-Canadian

| Source | URL | Description |
|---|---|---|
| Canada Health Infoway | `https://www.infoway-inforoute.ca/` | National digital health organization |
| InfoCentral | `https://infocentral.infoway-inforoute.ca/` | Infoway's standards collaboration platform |
| Canadian FHIR Registry | `https://simplifier.net/organization/canadianfhirregistry` | Canadian FHIR profiles and IGs on Simplifier |
| PS-CA (Patient Summary) | `https://build.fhir.org/ig/HL7-Canada/ca-baseline/` | Pan-Canadian Patient Summary IG |
| CA Baseline | `https://build.fhir.org/ig/HL7-Canada/ca-baseline/` | Canadian Baseline FHIR profiles |
| CIHI | `https://www.cihi.ca/` | Canadian Institute for Health Information |
| ICD-10-CA / CCI | `https://www.cihi.ca/en/submit-data-and-view-standards/codes-and-classifications` | CIHI coding standards |

### 10.3 FHIR and HL7 Standards

| Source | URL | Description |
|---|---|---|
| HL7 FHIR R4 | `https://hl7.org/fhir/R4/` | FHIR R4 specification |
| FHIR Resource List | `https://hl7.org/fhir/resourcelist.html` | Complete resource index |
| US Core IG | `https://hl7.org/fhir/us/core/` | US Core FHIR profiles |
| SMART App Launch | `https://hl7.org/fhir/smart-app-launch/` | SMART authorization framework |
| IHE Profiles | `https://profiles.ihe.net/` | IHE integration profiles |
| HAPI FHIR | `https://hapifhir.io/` | HAPI FHIR server documentation |

### 10.4 Terminology

| Source | URL | Description |
|---|---|---|
| SNOMED International | `https://www.snomed.org/` | SNOMED CT terminology |
| SNOMED CT Canada | `https://www.infoway-inforoute.ca/en/solutions/digital-health-foundation/snomed-ct` | Canadian SNOMED CT distribution |
| LOINC | `https://loinc.org/` | Observation identifier standard |
| pCLOCD | `https://infocentral.infoway-inforoute.ca/` | Canadian LOINC subset (via Infoway) |
| UCUM | `https://ucum.org/` | Units of measure |

### 10.5 Ontario FHIR Implementation Guides

| IG | Source | Description |
|---|---|---|
| OLIS FHIR | Ontario Health / eHealth Ontario digital standards portal | Lab results query/retrieval |
| DHDR FHIR | Ontario Health / eHealth Ontario digital standards portal | Drug dispensing history |
| PCR FHIR | Ontario Health / eHealth Ontario digital standards portal | Patient registry |
| PHSD/PPR FHIR | Ontario Health / eHealth Ontario digital standards portal | Provider/health services directory |
| Ontario eReferral FHIR | Ontario Health / eHealth Ontario digital standards portal | Referral management |

---

## Appendix A: FHIR Resource Relationship Diagram (Text)

`
Patient ──────────────────────┬─── RelatedPerson (NOK, SDM)
  │                           ├─── Coverage (Insurance)
  │                           └─── Consent (Directives)
  │
  ├── Encounter ──────────────┬─── Location (Ward/Room/Clinic)
  │     │                     ├─── Participant → Practitioner/PractitionerRole
  │     │                     ├─── Diagnosis → Condition
  │     │                     └─── ServiceRequest (Orders)
  │     │
  │     ├── Condition (Problem List / Encounter Dx)
  │     ├── Observation (Vitals, Clinical Findings)
  │     ├── Procedure (Performed Procedures)
  │     ├── Composition (Clinical Notes, Discharge Summary)
  │     ├── DiagnosticReport + Observation (Lab/Imaging Results)
  │     ├── MedicationRequest (Medication Orders)
  │     ├── MedicationAdministration (Hospital MAR)
  │     ├── AllergyIntolerance
  │     ├── Immunization
  │     ├── DocumentReference (Attachments, Scanned Docs)
  │     └── QuestionnaireResponse (Assessments)
  │
  ├── EpisodeOfCare ──────────┬─── CareTeam
  │                           ├─── CarePlan → Goal
  │                           └─── Encounter(s)
  │
  └── Appointment ────────────── Schedule / Slot
`

---

## Appendix B: Jurisdiction Comparison Summary

| Dimension | Ontario (Primary) | Pan-Canadian | US (Secondary) |
|---|---|---|---|
| **Privacy Law** | PHIPA | PIPEDA + provincial acts | HIPAA + state laws |
| **Consent Model** | Implied (circle of care) + explicit + directives | Varies by province | Notice of Privacy Practices + opt-out TPO |
| **Patient ID** | OHIP Health Number (PCR) | Provincial health numbers | MRN, MBI, SSN |
| **Provider ID** | CPSO / college numbers (PHSD/PPR) | Provincial college IDs | NPI |
| **FHIR Profiles** | Ontario IGs (OLIS, DHDR, PCR, PHSD) | CA Baseline, PS-CA | US Core, USCDI |
| **Lab Integration** | OLIS (FHIR R4) | Provincial lab repositories | Lab Corp/Quest APIs, US Core DiagnosticReport |
| **Drug History** | DHDR (FHIR R4) | Provincial drug repositories | US Core MedicationRequest, PDMPs |
| **Terminology — Dx** | SNOMED CT CA + ICD-10-CA | SNOMED CT CA + ICD-10-CA | SNOMED CT US + ICD-10-CM |
| **Terminology — Px** | SNOMED CT CA + CCI | SNOMED CT CA + CCI | SNOMED CT US + CPT/HCPCS/ICD-10-PCS |
| **Terminology — Lab** | pCLOCD / LOINC | pCLOCD / LOINC | LOINC |
| **Terminology — Rx** | DIN / ATC | DIN / ATC | RxNorm / NDC |
| **Reporting** | CIHI (DAD, NACRS) | CIHI national | CMS quality reporting |
| **Authentication** | ONE ID (OAuth/SAML) | Provincial identity | SMART on FHIR / OIDC |
| **Data Residency** | Canada | Canada | US (HIPAA-compliant) |

---

*This document provides the domain research foundation for the EHR Core Clinical initiative. It should be used to inform PRD creation, architecture decisions, and implementation planning. All regulatory and standards information should be verified against current official sources before implementation commitments.*
