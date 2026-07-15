---
initiative: Healthcare Platform — Complete Feature Gap PRD
status: Draft
author: Alex (FHIR SME Architect) + John (PM)
contributors: Mary, Sally, Winston, Alex, Morgan, Jordan, Amelia
created: 2026-06-29
last_updated: 2026-06-29
version: 1.0.0
stepsCompleted: []
---

# PRD — Healthcare Platform: Complete Feature Gap & Roadmap
## All Applications · All Personas · 175 Features

---

## 1. Document Metadata

| Field | Value |
|---|---|
| **Initiative** | Healthcare Platform — Complete Feature Gap PRD |
| **Target applications** | EHR (Next.js) · PharmacyMS (Go) · LIMS (Go) · FHIR Server (Go) · Cross-app |
| **Author** | Alex (FHIR SME Architect) + John (PM) |
| **Contributors** | Mary (BA), Sally (UX), Winston (Architect), Morgan (Terminology), Jordan (UI Dev), Amelia (Backend Dev) |
| **Status** | Draft |
| **Created** | 2026-06-29 |
| **Last updated** | 2026-06-29 |
| **Priority** | Must / Should / Could / Won't (per story) |
| **Jurisdiction** | Ontario / Canada (primary) · US (secondary) |
| **FHIR version** | R4 |

---

## 2. Problem Statement

### 2.1 Business Problem

The healthcare platform consists of four interconnected applications (EHR, PharmacyMS, LIMS, FHIR Server) that together should support the full continuum of outpatient and inpatient care. A comprehensive gap analysis against 11 distinct clinical and operational personas has identified **175 missing or incomplete features** spanning:

- **Safety-critical gaps**: PHIPA-required PHI audit logging absent; self-registration security hole; no drug-utilisation review; no panic-value notification
- **Workflow gaps**: LIMS and PharmacyMS have database schemas but zero clinical API endpoints; patient portal does not exist
- **Integration gaps**: PrescribeIT, OLIS outbound, PCR, SMART on FHIR — none implemented
- **Clinical quality gaps**: No ICD-10-CA coding, no CTAS triage, no SOAP notes, no CDS Hooks

Cost of inaction: regulatory non-compliance (PHIPA fines up to $1M), patient safety incidents from missing critical-value escalation, and inability to onboard any real clinical site.

### 2.2 User Problem (Jobs-to-be-Done)

| Job statement | Primary persona | Current alternative | Pain level |
|---|---|---|---|
| Classify a patient by acuity so the sickest are seen first | Triage Nurse | Paper CTAS form | 5 |
| Write a structured clinical note linked to the encounter | Physician | Paper / external word processor | 5 |
| Review lab results in context of the patient visit | Physician / Nurse | Separate fax / HL7 feed | 5 |
| Dispense a prescription safely with DUR checks | Pharmacist | Separate pharmacy system | 5 |
| Enter and result a lab order end-to-end | Lab Technician | Separate LIS | 5 |
| Book, cancel, and reschedule an appointment | Patient | Phone call | 4 |
| View my own lab results and care plan | Patient | Printed paper | 4 |
| Verify OHIP eligibility at check-in | Receptionist | Manual phone call to MOHLTC | 4 |
| Code a visit for OHIP billing submission | Billing Specialist | Spreadsheet | 4 |
| Log every PHI access for PHIPA compliance | System Administrator | None (current gap) | 5 |
| Track specimen from collection to result | Lab Technician | Paper log | 5 |

### 2.3 Regulatory / Compliance Drivers

| Regulation | Jurisdiction | Deadline | Impact if missed |
|---|---|---|---|
| PHIPA (Personal Health Information Protection Act) — PHI audit log | Ontario | Immediate | Fines up to $1M; licence revocation |
| PHIPA §12 — access logging | Ontario | Immediate | Regulatory breach |
| AODA IASR — WCAG 2.2 AA accessibility | Ontario | Immediate | Legal liability |
| Health Canada Drug Identification Number (DIN) compliance | Canada | Pre-launch | Cannot dispense legally |
| NAPRA Model Standards — pharmacy DUR | Canada | Pre-launch | Professional liability |
| Ontario Schedule of Benefits — OHIP billing codes | Ontario | Pre-launch | Revenue loss |
| IPC Directive — isolation precautions documentation | Ontario | Immediate | Infection control failure |
| OLIS (Ontario Laboratories Information System) — result reporting | Ontario | Pre-launch | Duplicate testing, patient harm |
| WCAG 2.2 Level AA — patient-facing portal | Canada/US | Pre-launch | ADA/AODA violation |
| 21st Century Cures Act — patient access to records | US | Pre-launch (US sites) | ONC enforcement |

---

## 3. Target Personas

| Persona | Role | Context of use | Primary needs | Accessibility profile |
|---|---|---|---|---|
| **Triage Nurse** | RN at triage desk | High-volume, time-pressured | CTAS, vitals, allergy capture | Standard desktop/tablet |
| **Physician / Cardiologist** | MD in exam room or office | 15-min encounter slots | SOAP note, order entry, results review | Standard desktop |
| **Lab Technician / Analyst** | At bench or workstation | Specimen processing | Order queue, result entry, panic alerts | Desktop with barcode scanner |
| **Pharmacist** | Dispensary counter | Dispensing, DUR | Rx intake, DUR, dispense workflow | Desktop with label printer |
| **Pharmacy Technician** | Dispensary support | Filling, labelling | Work queue, label print | Desktop |
| **Patient** | Home or clinic | Self-service | Appointments, results, messaging | Variable — mobile, screen reader |
| **Patient Care Assistant (PCA)** | Bedside or clinic room | Basic care support | ADL documentation, I&O | Tablet |
| **Receptionist / Front Desk** | Check-in desk | Appointment & arrival management | Scheduling, check-in, OHIP verify | Desktop |
| **System Administrator** | Back-office | System config, security | User management, audit, config | Desktop |
| **Billing Specialist** | Billing office | Claim coding & submission | Encounter coding, claim submit | Desktop |
| **Cardiac Technician** | ECG/Echo/Holter lab | Procedure workflow | Result entry, DICOM, escalation | Desktop + specialized hardware |

---

## 4. Functional Requirements

> Stories are grouped by persona. Each story ID encodes the persona prefix and sequence number.
> Prefix key: TR = Triage Nurse · DR = Doctor/Physician · LT = Lab Technician · PH = Pharmacist · PT = Pharmacy Technician · PA = Patient · PC = Patient Care Assistant · RC = Receptionist · AD = Administrator · BI = Billing · TK = Cardiac Technician · CC = Cross-cutting

---

### 4.1 Triage Nurse (TR)

---

#### TR-001 — CTAS Triage Classification
**As a** triage nurse,
**I want to** assign a Canadian Triage and Acuity Scale (CTAS) level (1–5) to each arriving patient,
**So that** clinical staff can prioritise care appropriately and meet legislated wait-time targets.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Observation (LOINC 74033-4 — Triage acuity) / Encounter.priority |

**Acceptance Criteria:**

```
AC-TR-001-01 (Happy Path — CTAS assignment)
  Given: A patient has arrived and the triage nurse has opened the triage assessment form
  When: The nurse selects CTAS level 2 (Emergent) from a five-option selector
  Then:
    - The visit record is updated with priority = CTAS-2
    - An Observation resource is created with code LOINC 74033-4 and value CTAS-2
    - The patient row on the nursing queue turns amber (CTAS-2 colour) within 1 second
    - The visit moves to IN_WAITING_ROOM state with the CTAS level shown
    - An audit event is logged with actor, timestamp, and CTAS level assigned

AC-TR-001-02 (CTAS-1 Immediate escalation)
  Given: A patient arrives in cardiac arrest or with a CTAS-1 indicator
  When: The nurse selects CTAS level 1 (Resuscitation)
  Then:
    - The patient row is immediately promoted to the top of all queues
    - A real-time alert banner appears on all staff dashboards for the current tenant
    - The visit priority is set to URGENT (0)
    - An audio/visual alert fires in the nursing station view (configurable)
    - The system logs the escalation event with timestamp < 2 seconds of submission

AC-TR-001-03 (Re-triage)
  Given: A patient already assigned CTAS-3 has deteriorated while waiting
  When: The nurse changes the CTAS level to CTAS-2
  Then:
    - The previous CTAS level is retained in the audit trail
    - A new Observation supersedes the previous one (status = amended)
    - The queue re-sorts within 1 second
    - A domain event RETRIAGE_PERFORMED is emitted with from_level and to_level

AC-TR-001-04 (Mandatory field guard)
  Given: The nurse attempts to save the triage form without selecting a CTAS level
  When: The form is submitted
  Then:
    - Submission is blocked
    - An inline error message reads "CTAS level is required before saving"
    - Focus moves to the CTAS selector field
    - No partial record is written to the database

AC-TR-001-05 (Accessibility)
  Given: A triage nurse using keyboard navigation only
  When: They tab to the CTAS selector and press arrow keys
  Then:
    - All 5 CTAS levels are reachable by keyboard
    - The selected level is announced by screen readers (aria-label with level name and description)
    - Colour coding is supplemented by text labels (not colour alone)

AC-TR-001-06 (Time target display)
  Given: A CTAS level is assigned
  When: The patient appears in the waiting room queue
  Then:
    - The maximum wait target for that CTAS level is displayed (CTAS-1: immediate, CTAS-2: 15 min, CTAS-3: 30 min, CTAS-4: 60 min, CTAS-5: 120 min)
    - A countdown timer shows time remaining to target
    - When time to target < 5 min the row turns red
```

---

#### TR-002 — Structured Triage Form with Chief Complaint
**As a** triage nurse,
**I want to** record a structured chief complaint with body system, onset, severity, and duration,
**So that** the clinical team has actionable, coded reason-for-visit data rather than free text.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Encounter.reasonCode (SNOMED CT), Condition (initial presentation) |

**Acceptance Criteria:**

```
AC-TR-002-01 (Structured entry)
  Given: The triage form is open
  When: The nurse types "chest" in the chief complaint search field
  Then:
    - An autocomplete list of SNOMED CT coded complaints appears (e.g. 29857009 "Chest pain")
    - Selecting a code populates chief complaint with the SNOMED preferred term
    - The SNOMED code is stored in Encounter.reasonCode

AC-TR-002-02 (Free text fallback)
  Given: The nurse cannot find an appropriate SNOMED code
  When: They select "Other — enter free text" and type a description
  Then:
    - The free text is saved in Encounter.reasonCode.text
    - A flag marks the complaint as uncoded for later review
    - The system does not block submission

AC-TR-002-03 (Onset, severity, duration capture)
  Given: A chief complaint is entered
  When: The nurse completes onset (time picker), severity (NRS 0–10 slider), and duration (structured: hours/days/weeks)
  Then:
    - All three fields are saved to the visit record
    - Severity maps to Observation (LOINC 72514-3 "Pain severity")
    - Duration is stored in Encounter.period or Condition.onsetDateTime

AC-TR-002-04 (Bilingual chief complaint display)
  Given: The system locale is set to French (fr-CA)
  When: SNOMED preferred terms are displayed
  Then:
    - French SNOMED synonyms are shown where available (Canadian French edition)
    - If no French synonym exists, English term is shown with "(EN)" suffix

AC-TR-002-05 (Allergy pre-population check)
  Given: A chief complaint of "rash" or "anaphylaxis" is selected
  When: The form is saved
  Then:
    - The system checks the patient's AllergyIntolerance records
    - If relevant allergies exist, a ClinicalAlert banner appears ("Patient has known allergy to penicillin")
    - The alert is dismissible with mandatory acknowledgement logged

AC-TR-002-06 (Mandatory field guard)
  Given: The nurse attempts to complete triage without a chief complaint
  When: Saving the form
  Then:
    - Submission is blocked with error "Chief complaint is required"
    - The encounter state does not advance beyond PATIENT_ARRIVED
```

---

#### TR-003 — Full Vital Signs Capture (Extended Set)
**As a** triage nurse,
**I want to** record a complete vital signs set including weight, height, BMI, temperature, BP, HR, SpO2, RR, and pain score,
**So that** clinicians have a full baseline and calculated derived values are correct.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Observation panel (LOINC 85353-1 — Vital signs panel) |

**Acceptance Criteria:**

```
AC-TR-003-01 (Full vitals panel)
  Given: The vitals entry form is open for a patient
  When: The nurse enters all values: weight 80 kg, height 175 cm, temp 37.2°C, BP 130/85, HR 78, SpO2 98%, RR 16, pain 3/10
  Then:
    - BMI is auto-calculated (80 / 1.75^2 = 26.1) and displayed
    - Each value is saved as a separate FHIR Observation with LOINC code
    - The Observations are grouped in an Observation panel resource
    - All values appear in the VisitDetail vitals tab immediately

AC-TR-003-02 (Out-of-range alert)
  Given: The nurse enters BP systolic 210
  When: The form validates on blur
  Then:
    - An amber warning banner appears: "Systolic BP 210 is critically elevated — consider CTAS escalation"
    - The field border turns red
    - Submission is still possible but requires explicit acknowledgement checkbox

AC-TR-003-03 (NEWS2 score auto-calculation)
  Given: All six NEWS2 parameters are entered (RR, SpO2, supplemental O2, temp, BP systolic, HR, consciousness)
  When: The form is saved
  Then:
    - NEWS2 score is calculated and displayed (0–20 scale)
    - Score ≥ 7 triggers a CTAS escalation recommendation alert
    - NEWS2 score is stored as an Observation (LOINC 94558-4)

AC-TR-003-04 (Paediatric mode)
  Given: The patient's age is < 18 years (derived from DOB)
  When: The vitals form opens
  Then:
    - Age-appropriate reference ranges are applied (e.g. HR 100–160 for infant)
    - Out-of-range alerts use paediatric thresholds
    - Weight entry supports kg and g for neonates

AC-TR-003-05 (Imperial / metric toggle)
  Given: A triage nurse prefers to enter weight in lbs and height in feet/inches
  When: They toggle units to Imperial
  Then:
    - Conversion to metric (kg, cm) is applied automatically
    - The stored FHIR Observation always uses metric (UCUM kg, cm)
    - The display shows both Imperial and metric

AC-TR-003-06 (Historical vitals trend)
  Given: The patient has previous vitals from a past encounter
  When: The vitals form is open
  Then:
    - The last 3 vital sign sets are shown below the entry form in a mini-trend table
    - Changed fields (e.g. HR rose from 72 to 110) are highlighted

AC-TR-003-07 (Mandatory minimum for save)
  Given: The nurse has entered only BP
  When: Attempting to save
  Then:
    - A warning (non-blocking) indicates "Temperature, HR, RR, SpO2 are recommended"
    - The form saves with partial data
    - Missing fields are shown as "Not recorded" in the clinical view
```

---

#### TR-004 — Allergy Recording and Verification
**As a** triage nurse,
**I want to** record new allergies and verify or update existing ones during triage,
**So that** clinicians and pharmacists receive accurate allergy information before any medications are ordered or dispensed.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | AllergyIntolerance |

**Acceptance Criteria:**

```
AC-TR-004-01 (Add new allergy)
  Given: The triage allergy panel is open
  When: The nurse searches "penicillin", selects the coded drug allergy, enters reaction "Rash", severity "Moderate", and saves
  Then:
    - An AllergyIntolerance resource is created with code RxNorm (US) / DIN (CA), reaction SNOMED coded, severity moderate
    - The PatientBanner allergy section shows "Penicillin — Rash (Moderate)" in red
    - An audit event is logged: actor, timestamp, allergy added

AC-TR-004-02 (Verify existing allergy)
  Given: A patient has an unverified allergy on record from a previous encounter
  When: The nurse confirms it is still accurate and clicks "Verify"
  Then:
    - AllergyIntolerance.verificationStatus changes from "unconfirmed" to "confirmed"
    - The verification is logged with nurse's practitioner ID and timestamp
    - The PatientBanner verification warning banner is dismissed

AC-TR-004-03 (No known allergies)
  Given: The nurse asks the patient and confirms no allergies
  When: They click "Mark as No Known Allergies"
  Then:
    - An AllergyIntolerance record with code 716186003 (SNOMED "No known allergy") is created
    - The allergy panel shows "NKA — verified by [nurse] [timestamp]"
    - Any existing unverified allergy records are not deleted but flagged for review

AC-TR-004-04 (Duplicate allergy guard)
  Given: An allergy to penicillin already exists (confirmed)
  When: The nurse attempts to add another penicillin allergy
  Then:
    - A warning appears: "Penicillin allergy already recorded"
    - The nurse may update the existing record but cannot create a duplicate
    - If the reaction or severity differs, the nurse can amend (creates version history)

AC-TR-004-05 (Drug class allergy cross-reference)
  Given: A penicillin allergy is recorded
  When: The visit detail allergy panel is displayed
  Then:
    - A note appears: "Cross-reactivity with cephalosporins (~1–2%) — inform prescriber"
    - This cross-reference is informational only (not a hard block)

AC-TR-004-06 (Allergy propagation to PharmacyMS)
  Given: A new allergy is verified in EHR triage
  When: The pharmacist opens the patient's medication profile in PharmacyMS
  Then:
    - The allergy appears in the PharmacyMS DUR allergy list
    - The DUR engine will block or warn on dispensing any contraindicated drug
```

---

#### TR-005 — Fall Risk Assessment (Morse Fall Scale)
**As a** triage nurse,
**I want to** complete a standardised fall risk assessment (Morse Fall Scale) for eligible patients,
**So that** fall prevention measures are activated appropriately and documented for regulatory compliance.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Observation (LOINC 72133-2 — Fall risk assessment) / QuestionnaireResponse |

**Acceptance Criteria:**

```
AC-TR-005-01 (MFS completion)
  Given: The fall risk form is open for a patient ≥ 65 or flagged ambulatory risk
  When: The nurse completes all 6 Morse Fall Scale items and saves
  Then:
    - MFS score (0–125) is calculated
    - Score is stored as Observation LOINC 72133-2
    - Risk level displayed: 0–24 Low, 25–50 Moderate, ≥51 High
    - If High risk: automated care plan task "Activate fall prevention protocol" is created

AC-TR-005-02 (High risk alert)
  Given: MFS score ≥ 51 is calculated
  When: The record is saved
  Then:
    - A ClinicalAlert (severity=warning) appears on the nursing and physician dashboards
    - The patient row in the queue shows a fall-risk icon
    - A domain event FALL_RISK_IDENTIFIED is emitted

AC-TR-005-03 (Age-gated prompt)
  Given: A patient's age is ≥ 65
  When: The nurse opens the triage form
  Then:
    - A prompt appears: "Fall risk assessment recommended for patients ≥ 65"
    - The nurse can dismiss or open the MFS form directly from the prompt

AC-TR-005-04 (Documentation audit)
  Given: A fall risk assessment has been completed
  When: An auditor views the audit log
  Then:
    - The log contains nurse ID, patient ID, MFS score, risk level, and timestamp
    - The log entry is immutable (append-only)
```

---

#### TR-006 — Isolation Precautions Entry
**As a** triage nurse,
**I want to** set and document isolation precautions (contact, droplet, airborne) for infectious or immunocompromised patients,
**So that** all staff are alerted before entering the patient's room.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Flag (FHIR), Encounter.extension (isolation type) |

**Acceptance Criteria:**

```
AC-TR-006-01 (Set isolation flag)
  Given: A patient presents with suspected TB
  When: The nurse selects "Airborne" isolation and saves
  Then:
    - A FHIR Flag resource is created: status=active, code=SNOMED 409513000 "Airborne precautions"
    - The PatientBanner shows an amber isolation badge "AIRBORNE" in all views
    - A domain event ISOLATION_ACTIVATED is logged with actor and timestamp
    - A notification is sent to the room assignment queue to ensure a negative-pressure room

AC-TR-006-02 (Multi-precaution)
  Given: A patient requires both contact and droplet precautions
  When: The nurse selects both checkboxes and saves
  Then:
    - Two Flag resources are created (one per precaution type)
    - The PatientBanner shows both isolation badges
    - The room assignment queue is notified of combined precaution requirements

AC-TR-006-03 (Isolation lift)
  Given: A patient's isolation has been cleared by infection control
  When: An authorised nurse or physician clicks "Lift Isolation" and provides reason
  Then:
    - All active isolation Flag resources are set to status=inactive
    - A lift event is logged with actor, reason, and timestamp
    - The PatientBanner isolation badge is removed

AC-TR-006-04 (Role restriction)
  Given: A patient care assistant tries to lift isolation
  When: They click "Lift Isolation"
  Then:
    - The action is blocked with message "Only a registered nurse or physician may lift isolation precautions"
    - No Flag resource is modified
```

---

#### TR-007 — Medication Reconciliation at Triage
**As a** triage nurse,
**I want to** record and reconcile the patient's current home medications during triage,
**So that** prescribers have an accurate medication list before ordering and avoid duplicate therapy or interactions.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | MedicationStatement, MedicationRequest |

**Acceptance Criteria:**

```
AC-TR-007-01 (Add current medication)
  Given: The medication reconciliation panel is open
  When: The nurse searches "metformin", selects "Metformin 500mg tablet", enters dose "500mg", frequency "twice daily", route "oral", last dose "this morning"
  Then:
    - A MedicationStatement resource is created with status="active", medication.code RxNorm/DIN, dosage
    - The medication appears in the patient's home medication list
    - The medication is available to the prescribing physician in the Orders tab

AC-TR-007-02 (DHDR pre-population)
  Given: The patient has a DHDR (Ontario Drug Health Repository) record
  When: The triage nurse opens medication reconciliation for the patient
  Then:
    - Previously dispensed medications are pre-populated from DHDR via FHIR MedicationDispense query
    - Each pre-populated medication shows source: "DHDR" and last fill date
    - The nurse reviews and confirms or modifies each entry

AC-TR-007-03 (Discrepancy flagging)
  Given: A patient states they take atorvastatin 20mg but DHDR shows 40mg dispensed
  When: The nurse records 20mg
  Then:
    - A discrepancy flag is set on the MedicationStatement
    - The prescribing physician sees a ClinicalAlert: "Dose discrepancy — patient reports 20mg; DHDR shows 40mg"

AC-TR-007-04 (Discontinued medications)
  Given: The patient states they stopped taking a medication
  When: The nurse marks it as discontinued and records the reason
  Then:
    - MedicationStatement.status = "stopped"
    - Reason is stored in MedicationStatement.statusReason
    - The medication moves to a "Discontinued" section, not deleted

AC-TR-007-05 (OTC and supplements)
  Given: The patient takes aspirin 81mg OTC and vitamin D
  When: The nurse records these
  Then:
    - They are captured as MedicationStatement with category=OTC/supplement
    - They appear in the full medication list visible to physician and pharmacist
    - OTC medications are included in DUR checks

AC-TR-007-06 (Audit trail)
  Given: Medication reconciliation is completed
  When: An auditor queries the log
  Then:
    - All additions, modifications, and removals are logged with actor ID, timestamp, and changed values
    - The reconciliation is timestamped as "Triage Reconciliation — [date] by [nurse]"
```

---

#### TR-008 — OHIP / Health Card Verification at Triage
**As a** triage nurse or receptionist,
**I want to** verify a patient's Ontario Health Card Number (HCN) and eligibility in real time,
**So that** OHIP-insured services are correctly attributed and ineligible patients are flagged for billing.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Patient.identifier (system: https://fhir.infoway-inforoute.ca/NamingSystem/ca-on-patient-hcn) |

**Acceptance Criteria:**

```
AC-TR-008-01 (Successful OHIP eligibility check)
  Given: The check-in form is open and the patient hands their health card
  When: The receptionist/nurse enters or scans the 10-digit HCN and version code and submits
  Then:
    - The system calls the Ministry of Health EDT eligibility API
    - Response returns eligible=true with patient name and DOB
    - Patient demographics are pre-populated from the eligibility response
    - HCN is stored in Patient.identifier with the correct Ontario FHIR NamingSystem URI

AC-TR-008-02 (Ineligible card)
  Given: A patient presents with an expired or invalid health card
  When: The eligibility check returns eligible=false
  Then:
    - A red alert appears: "OHIP eligibility: NOT ELIGIBLE — [reason from API]"
    - The patient is flagged for self-pay billing
    - The visit proceeds (care is not denied) but billing team is notified

AC-TR-008-03 (Offline fallback)
  Given: The MOHLTC eligibility API is unreachable
  When: The check times out after 5 seconds
  Then:
    - A warning appears: "Eligibility check unavailable — proceed manually"
    - The nurse can manually enter HCN and mark as "Unverified — system offline"
    - A retry is queued for when connectivity is restored

AC-TR-008-04 (Health card scan)
  Given: A card reader is connected
  When: The health card is swiped/tapped
  Then:
    - HCN and version code are auto-populated from the magnetic stripe or chip
    - The verification call is triggered automatically

AC-TR-008-05 (HCN not stored in logs)
  Given: An eligibility check is performed
  When: The audit log records the event
  Then:
    - The full HCN is masked in log entries (show last 4 digits only)
    - The raw HCN is encrypted at rest in the patient record
    - Access to the HCN field is restricted to NURSE and ADMIN roles
```

---

#### TR-009 — Handoff Notes (SBAR Format)
**As a** triage nurse,
**I want to** write a structured SBAR (Situation, Background, Assessment, Recommendation) handoff note,
**So that** the receiving physician has a complete, standardised clinical summary without reading the entire chart.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Communication / DocumentReference (ClinicalDocument) |

**Acceptance Criteria:**

```
AC-TR-009-01 (SBAR entry)
  Given: The triage note form is open
  When: The nurse completes all four SBAR fields (each with character-limited text areas) and saves
  Then:
    - A DocumentReference resource is created with type LOINC 51855-5 (Patient note)
    - The SBAR text is stored in structured sections: situation, background, assessment, recommendation
    - The note appears in the physician's "Pending Handoffs" section of the dashboard

AC-TR-009-02 (Physician acknowledgement)
  Given: An SBAR note has been sent
  When: The physician reads and acknowledges it
  Then:
    - The note status changes from "Sent" to "Acknowledged"
    - Acknowledgement timestamp and physician ID are stored
    - The nurse is notified via in-app notification that the note was read

AC-TR-009-03 (Mandatory S and R fields)
  Given: The nurse tries to save an SBAR note without filling Situation
  When: The form is submitted
  Then:
    - Submission is blocked: "Situation is required"
    - Background, Assessment, Recommendation are optional but recommended

AC-TR-009-04 (Addendum)
  Given: The nurse needs to add information after the SBAR was sent
  When: They click "Add Addendum"
  Then:
    - An addendum is appended to the existing DocumentReference (not a new document)
    - The addendum is timestamped and signed by the nurse
    - The physician sees an "Updated" indicator on the handoff note

AC-TR-009-05 (Audit trail)
  Given: An SBAR note is created, read, and acknowledged
  When: The PHI audit log is queried
  Then:
    - Creation event: actor, timestamp, patient ID
    - Read event: actor (physician), timestamp
    - Acknowledgement event: actor, timestamp
    - All three are present and immutable
```

---

#### TR-010 — Early Warning Score Auto-Calculation (NEWS2)
**As a** triage nurse,
**I want to** have the National Early Warning Score 2 (NEWS2) calculated automatically from the vitals I entered,
**So that** deteriorating patients are escalated before they become critically ill.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Observation (LOINC 94558-4 — NEWS2 total score) |

**Acceptance Criteria:**

```
AC-TR-010-01 (Auto-calculation)
  Given: All 6 NEWS2 parameters have been entered in the vitals form
  When: The nurse saves the vitals
  Then:
    - NEWS2 score is computed server-side using the Royal College of Physicians algorithm
    - Score displayed immediately on the vitals tab (0–20)
    - FHIR Observation is created for the score with derivedFrom references to component Observations

AC-TR-010-02 (NEWS2 score ≥ 7 escalation)
  Given: NEWS2 score calculates as 8
  When: The record is saved
  Then:
    - A red ClinicalAlert fires: "NEWS2 = 8 — HIGH RISK — Immediate senior review required"
    - Alert appears on triage nurse, charge nurse, and attending physician dashboards
    - An escalation domain event is emitted: NEWS2_ESCALATION_REQUIRED

AC-TR-010-03 (NEWS2 score 5–6 medium risk)
  Given: NEWS2 score is 6
  When: The record is saved
  Then:
    - An amber ClinicalAlert fires: "NEWS2 = 6 — MEDIUM RISK — Increase monitoring frequency"
    - Alert is shown on the nursing queue

AC-TR-010-04 (Recalculation on vital re-entry)
  Given: A nurse corrects an SpO2 value from 96% to 88%
  When: They save the amended vital
  Then:
    - NEWS2 is recalculated automatically
    - If the new score crosses a threshold, a new escalation alert fires
    - The previous NEWS2 Observation is amended (status=amended) and a new one created

AC-TR-010-05 (COPD SpO2 target mode)
  Given: A patient has a documented COPD diagnosis in their problem list
  When: NEWS2 is calculated
  Then:
    - Scale 2 SpO2 thresholds (88–92% = 0 points) are applied automatically
    - A note "(COPD Scale 2)" is shown next to the NEWS2 score
```

---

#### TR-011 — Patient Identification Verification
**As a** triage nurse,
**I want to** verify patient identity using two identifiers (name + DOB, or HCN + name) before recording any clinical data,
**So that** PHI is never entered against the wrong patient record.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Patient.identifier, Patient.name, Patient.birthDate |

**Acceptance Criteria:**

```
AC-TR-011-01 (Two-identifier check)
  Given: A patient arrives and the nurse opens their record
  When: The nurse confirms name and DOB verbally and clicks "Verified"
  Then:
    - PatientBanner.verificationStatus changes to "verified"
    - An audit event is logged: PATIENT_IDENTITY_VERIFIED, actor, timestamp, method=verbal
    - The unverified amber warning banner is dismissed

AC-TR-011-02 (Photo ID verification)
  Given: A nurse verifies identity by photo ID (driver's licence)
  When: They select method "Photo ID" and click "Verified"
  Then:
    - verificationStatus = "verified", method = "photo-id" is stored
    - No photo is captured or stored (only method confirmation)

AC-TR-011-03 (Unknown patient)
  Given: An unconscious patient arrives with no identification
  When: The nurse clicks "Unknown Patient"
  Then:
    - A temporary MRN (TMP-xxxxx) is assigned
    - Patient.name is set to "UNKNOWN" and verificationStatus = "unverified"
    - A red banner "UNIDENTIFIED PATIENT" appears on all views
    - When identity is confirmed later, the TMP record is merged with the real patient record

AC-TR-011-04 (Mismatch detection)
  Given: The HCN the patient provides does not match the name on file
  When: The nurse runs the eligibility check
  Then:
    - A warning appears: "Name on health card does not match EHR record — verify before proceeding"
    - The nurse must acknowledge the discrepancy before continuing

AC-TR-011-05 (PHI access blocked before verification)
  Given: A patient record is open but verificationStatus = "unverified"
  When: A clinical user tries to view allergy or medication details
  Then:
    - They can see a limited demographic view
    - A banner reads: "Complete patient identity verification to view clinical details"
    - Clinical data is accessible only after verification for all roles except ADMIN
```

---

#### TR-012 — Pain Score Capture and Trending
**As a** triage nurse,
**I want to** record the patient's pain score on the Numeric Rating Scale (NRS 0–10) and see it alongside previous pain scores,
**So that** clinicians can evaluate pain trajectory and analgesic effectiveness.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Observation (LOINC 72514-3 — Pain severity NRS) |

**Acceptance Criteria:**

```
AC-TR-012-01 (NRS entry)
  Given: The vitals or triage form is open
  When: The nurse moves a slider or enters "7" for pain
  Then:
    - Observation is created: code=LOINC 72514-3, value=7, unit={score}
    - The value is displayed on the vitals tab with colour coding: 0–3 green, 4–6 amber, 7–10 red

AC-TR-012-02 (Paediatric FACES scale)
  Given: Patient age < 7 or nurse selects "Paediatric/Non-verbal"
  When: The pain assessment form opens
  Then:
    - The FACES pain scale (0–10 with emoji faces) is shown instead of NRS slider
    - Score still maps to numeric Observation value for consistency

AC-TR-012-03 (Non-verbal patient CPOT)
  Given: A patient is intubated or has a cognitive impairment flag
  When: Pain is assessed
  Then:
    - The Critical Care Pain Observation Tool (CPOT) form is offered
    - CPOT score (0–8) is stored with note "CPOT — non-verbal patient"

AC-TR-012-04 (Pain trend chart)
  Given: Three or more pain scores have been recorded for the current visit
  When: The vitals tab is open
  Then:
    - A mini line chart shows pain score vs time for the current encounter
    - Previous encounter pain data is shown as a separate line in lighter colour

AC-TR-012-05 (Goal pain level)
  Given: The physician has set a goal pain level of ≤ 4
  When: Pain is re-assessed as 7
  Then:
    - The vitals tab shows "Pain: 7/10 — above goal of 4 — consider analgesic review"
    - A task is created in the physician queue: "Pain reassessment needed"
```

---

#### TR-013 — Triage Queue Wall Board
**As a** triage nurse or charge nurse,
**I want to** view a real-time patient-status wall board showing all patients in the waiting area with CTAS level, wait time, and assigned state,
**So that** the entire triage team can monitor acuity and workload without refreshing individual patient records.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | N/A (operational view derived from cardiology_visit_state) |

**Acceptance Criteria:**

```
AC-TR-013-01 (Real-time board)
  Given: The wall board view is open on a large display
  When: A new patient is assigned CTAS-2
  Then:
    - The patient row appears on the board within 2 seconds (WebSocket push)
    - The row shows: CTAS badge, patient alias (first name + last initial), wait time elapsed, current state
    - No full PHI (DOB, HCN, MRN) is shown on the wall board

AC-TR-013-02 (Auto-sort)
  Given: Multiple patients are in the waiting room
  When: The board renders
  Then:
    - Rows are sorted by CTAS level (1 first) then by elapsed wait time (longest first)
    - CTAS-1 rows are always at the top regardless of arrival time

AC-TR-013-03 (SLA breach highlight)
  Given: A CTAS-3 patient has been waiting 35 minutes (target 30 min)
  When: The board updates
  Then:
    - The row background turns red
    - A pulsing indicator draws attention
    - The charge nurse receives an in-app notification: "CTAS-3 patient over wait target by 5 min"

AC-TR-013-04 (Kiosk mode)
  Given: The board is displayed on a public-facing waiting room screen
  When: The nurse enables kiosk mode
  Then:
    - Only tokenised identifiers (queue ticket numbers) are shown
    - No patient name, DOB, or clinical data is visible
    - The board shows estimated wait time per CTAS category
```

---

#### TR-014 — Glasgow Coma Scale (GCS) Entry
**As a** triage nurse,
**I want to** record the Glasgow Coma Scale for any patient with altered level of consciousness,
**So that** neurological baseline is documented and changes are tracked.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Observation (LOINC 9269-2 — GCS total, components 9268-4, 9267-6, 9270-0) |

**Acceptance Criteria:**

```
AC-TR-014-01 (GCS entry)
  Given: The nurse selects "Neurological Assessment" in the triage form
  When: They select Eye=3, Verbal=4, Motor=5 from dropdowns
  Then:
    - GCS total = 12 is auto-calculated
    - Three component Observations and one total Observation are created
    - GCS is displayed on the vitals tab: "GCS 12/15 (E3V4M5)"

AC-TR-014-02 (GCS ≤ 8 severe impairment alert)
  Given: GCS total = 7
  When: Saved
  Then:
    - A red ClinicalAlert fires: "GCS ≤ 8 — Severe impairment — immediate physician review"
    - Visit priority escalates to URGENT regardless of current CTAS
    - NEWS2 consciousness parameter is updated to "new confusion or agitation" (3 points)

AC-TR-014-03 (Intubated patient)
  Given: A patient is intubated
  When: The nurse records GCS
  Then:
    - Verbal score shows "T" (intubated) — value stored as 1 with modifier flag intubated=true
    - Displayed as "GCS 10T/15"
```

---

#### TR-015 — Intake Form Tracking (PRE_VISIT_FORMS)
**As a** triage nurse or receptionist,
**I want to** see which pre-visit intake forms a patient has completed vs outstanding,
**So that** triage can be expedited for patients who have already submitted their history.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | QuestionnaireResponse (linked to Encounter) |

**Acceptance Criteria:**

```
AC-TR-015-01 (Form status display)
  Given: A patient was sent a pre-visit intake questionnaire
  When: The triage form is opened
  Then:
    - A "Pre-Visit Forms" section shows each questionnaire with status: Sent / Completed / Not Sent
    - Completed forms show submission timestamp and a "View" link

AC-TR-015-02 (Send forms from triage)
  Given: A patient arrives without completing their intake form
  When: The nurse clicks "Send Intake Form" and selects delivery method (email/SMS)
  Then:
    - A QuestionnaireResponse request is created in status=in-progress
    - A secure link is sent to the patient's registered contact
    - The form status updates to "Sent — awaiting completion"

AC-TR-015-03 (Auto-populate from completed form)
  Given: A patient has completed a pre-visit intake form
  When: The nurse opens the triage form
  Then:
    - Relevant sections (chief complaint, medication list, allergy history) are pre-populated from QuestionnaireResponse
    - Pre-populated fields are highlighted "Pre-filled from patient form — please verify"

AC-TR-015-04 (Advance state on form completion)
  Given: The visit is in PRE_VISIT_FORMS state
  When: The patient submits their intake form online
  Then:
    - The visit state automatically advances to APPOINTMENT_CONFIRMED
    - The triage queue shows the patient as "Forms complete — ready for check-in"
```

---

#### TR-016 — Patient Education Materials Dispatch
**As a** triage nurse,
**I want to** send relevant patient education materials based on the chief complaint,
**So that** patients are informed while waiting and prepared for their consultation.

| Field | Value |
|---|---|
| Priority | Could |
| Target app | EHR |
| FHIR resource | Communication (informationProvided) |

**Acceptance Criteria:**

```
AC-TR-016-01 (Education material send)
  Given: A patient's chief complaint is "chest pain"
  When: The nurse clicks "Send Education Material" and the system suggests relevant materials
  Then:
    - A list of relevant materials is presented (e.g. "What to expect during your ECG", "Heart Health Guide")
    - The nurse selects and sends via email/SMS
    - A Communication resource is created recording what was sent, when, and to whom

AC-TR-016-02 (Language matching)
  Given: The patient's preferred language is French
  When: Materials are suggested
  Then:
    - French-language materials are shown first
    - If a material is only available in English, it is labelled "(Anglais seulement)"

AC-TR-016-03 (Confirmation of delivery)
  Given: A material was sent by email
  When: The email delivery receipt is received
  Then:
    - The Communication resource is updated: status=completed
    - A note shows "Delivered: [timestamp]" on the patient record
```

---

### 4.2 Physician / Cardiologist (DR)

---

#### DR-001 — Structured SOAP Clinical Note
**As a** physician,
**I want to** write a structured SOAP (Subjective, Objective, Assessment, Plan) clinical note linked to the current encounter,
**So that** the encounter is fully documented, billable, legally defensible, and retrievable by other care providers.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | DocumentReference (LOINC 11506-3 Progress note), Composition |

**Acceptance Criteria:**

```
AC-DR-001-01 (SOAP note creation)
  Given: A physician has opened the VisitDetail for a patient in PHYSICIAN_WITH_PATIENT state
  When: They complete all four SOAP sections (minimum Subjective and Assessment) and click Sign
  Then:
    - A FHIR Composition resource is created with type LOINC 11506-3
    - Sections map: section[0]=Subjective (LOINC 61150-9), section[1]=Objective, section[2]=Assessment, section[3]=Plan
    - The Composition is signed with the physician's Practitioner reference
    - Status transitions to "final"
    - The note appears in the Health Records list for the patient

AC-DR-001-02 (Rich text formatting)
  Given: The SOAP note editor is open
  When: The physician uses bold, bullet points, or numbered lists
  Then:
    - Formatting is preserved in the stored document (XHTML within FHIR Composition section text)
    - The note renders correctly in the clinical view with formatting intact

AC-DR-001-03 (Auto-save draft)
  Given: A physician is mid-note and the browser or session is accidentally closed
  When: They reopen the visit
  Then:
    - A draft note is recovered from auto-save (every 60 seconds)
    - A banner reads "Unsaved draft recovered — [timestamp]"
    - They can continue from where they left off or discard

AC-DR-001-04 (Addendum after signing)
  Given: A note is signed and finalised
  When: The physician realises an error or omission
  Then:
    - They can add an addendum (not edit the original)
    - The addendum is timestamped, attributed, and appended to the Composition
    - The original text is immutable; a version history shows original + addendum

AC-DR-001-05 (Template library)
  Given: A physician opens the SOAP editor
  When: They select a template (e.g. "Cardiology Follow-up", "Post-MI Review")
  Then:
    - Pre-defined headings and prompts populate the SOAP sections
    - Templates are tenant-configurable (admin can add/edit/delete)

AC-DR-001-06 (Mandatory minimum for sign-off)
  Given: The physician clicks Sign with only the Subjective section completed
  When: Assessment is empty
  Then:
    - A warning appears: "Assessment is required before signing"
    - The note is saved as draft but not finalised

AC-DR-001-07 (PHI audit — note access)
  Given: A physician opens and reads a signed clinical note
  When: The access event occurs
  Then:
    - A PHI audit event is logged: actor, patient ID, resource ID, action=read, timestamp
    - This log is immutable and accessible to ADMIN role only
```

---

#### DR-002 — ICD-10-CA Diagnosis Coding
**As a** physician,
**I want to** search for and apply ICD-10-CA diagnosis codes to an encounter,
**So that** clinical and billing documentation is accurate and consistent with Canadian coding standards.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Condition (clinicalStatus, verificationStatus, code), Encounter.diagnosis |

**Acceptance Criteria:**

```
AC-DR-002-01 (ICD-10-CA search)
  Given: The physician opens the diagnosis section
  When: They type "atrial fibrillation"
  Then:
    - An autocomplete list returns ICD-10-CA codes (e.g. I48 — Atrial fibrillation and flutter with subcategories)
    - Each result shows code, preferred term, and category
    - The list is filtered to ICD-10-CA (not ICD-10-CM for US)

AC-DR-002-02 (Primary vs secondary diagnosis)
  Given: A physician selects I48.0 as primary and I25.10 (CAD) as secondary
  When: Both are saved
  Then:
    - Encounter.diagnosis[0].use = "chief-complaint" (primary), rank=1
    - Encounter.diagnosis[1].use = "comorbidity", rank=2
    - The billing module can extract primary diagnosis for OHIP coding

AC-DR-002-03 (Problem list linkage)
  Given: The physician selects I10 (Hypertension) as a diagnosis
  When: They check "Add to problem list"
  Then:
    - A Condition resource is created with clinicalStatus=active and linked to the patient
    - The Condition appears in the active problem list visible on all subsequent visits
    - The Encounter.diagnosis references the Condition resource

AC-DR-002-04 (Suspected vs confirmed)
  Given: The physician is not certain of the diagnosis
  When: They select verificationStatus="provisional"
  Then:
    - The Condition is stored with verificationStatus=provisional
    - The problem list shows it as "? Atrial Fibrillation" with a provisional indicator
    - Billing is warned that provisional diagnoses may affect claim acceptance

AC-DR-002-05 (Duplicate detection)
  Given: The patient's problem list already contains I48.0
  When: The physician adds I48.0 again in the current encounter
  Then:
    - A notice appears: "This condition already exists in the problem list — would you like to update the existing record?"
    - No duplicate Condition resource is created unless the physician confirms intent
```

---

#### DR-003 — Problem List Management
**As a** physician,
**I want to** manage a structured active and historical problem list for each patient,
**So that** any clinician seeing the patient has immediate context of chronic conditions and past significant diagnoses.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Condition (clinicalStatus: active/inactive/resolved, verificationStatus) |

**Acceptance Criteria:**

```
AC-DR-003-01 (Add to problem list)
  Given: A physician has diagnosed hypertension (I10) during a visit
  When: They click "Add to Problem List" from the diagnosis section
  Then:
    - A Condition resource is created: code=ICD-10-CA I10, clinicalStatus=active, subject=Patient
    - The problem list (accessible from all encounter views) shows "Hypertension (I10) — Active — Onset: [today]"

AC-DR-003-02 (Mark as resolved)
  Given: A patient's acute knee sprain is now healed
  When: The physician clicks "Resolve" and enters resolution date
  Then:
    - Condition.clinicalStatus changes to "resolved"
    - Condition.abatementDateTime is set
    - The problem moves from "Active" to "Past Medical History" section
    - The change is versioned and audit-logged

AC-DR-003-03 (Problem list filtering)
  Given: A patient has 15 conditions on file
  When: A physician opens the problem list
  Then:
    - Active conditions are shown by default
    - Filter tabs: Active / Inactive / All
    - Search by ICD code or text is available
    - Problems are sortable by onset date, severity

AC-DR-003-04 (Chronic disease flags)
  Given: The problem list contains diabetes mellitus (E11)
  When: Any encounter is opened for this patient
  Then:
    - The PatientBanner shows a "Chronic Conditions" count badge
    - Diabetes appears in the "Key Conditions" summary panel
    - CDS Hooks for diabetes management fire during prescription entry
```

---

#### DR-004 — Electronic Prescription (e-Rx) with PrescribeIT
**As a** physician,
**I want to** create and send electronic prescriptions directly through PrescribeIT to any pharmacy in Canada,
**So that** patients receive their medications safely, prescriptions cannot be altered, and pharmacists have electronic DUR information.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR + PharmacyMS |
| FHIR resource | MedicationRequest (CA Baseline + PrescribeIT IG profile) |

**Acceptance Criteria:**

```
AC-DR-004-01 (Prescription creation)
  Given: The physician is in the Orders tab of VisitDetail
  When: They search "metoprolol", select 50mg tablet, enter dose "50mg", frequency "twice daily", route "oral", qty 60, refills 2, and sign
  Then:
    - A MedicationRequest resource is created with status=active, intent=order
    - Drug coded with Canadian DIN and/or RxNorm (for cross-jurisdiction)
    - MedicationRequest is transmitted to PrescribeIT network as HL7 FHIR MedicationRequest
    - Prescription ID and status "Sent to PrescribeIT" are shown

AC-DR-004-02 (DIN lookup)
  Given: The physician searches for a medication
  When: The search resolves
  Then:
    - Health Canada DIN is included in the medication code
    - For non-DIN drugs (e.g. compounding), a free-text description is captured
    - Brand and generic names are both shown

AC-DR-004-03 (Controlled substance workflow)
  Given: The physician prescribes an opioid (e.g. hydromorphone)
  When: The prescription is created
  Then:
    - A controlled substance flag is applied
    - The system requires the physician's prescriber number (DEA equivalent — Ontario narcotics number)
    - A duplicate prescriber check alerts if the patient has received opioids from another prescriber in the last 30 days (DHDR check)
    - Maximum 30-day supply is enforced for Schedule I narcotics

AC-DR-004-04 (Allergy safety check before send)
  Given: A physician prescribes amoxicillin and the patient has a penicillin allergy on file
  When: The prescription is created
  Then:
    - A hard-stop alert fires: "ALLERGY CONFLICT — Patient has Penicillin allergy. Amoxicillin is contraindicated."
    - The prescription cannot be signed without the physician explicitly overriding with a clinical reason
    - Override reason is stored in MedicationRequest.note

AC-DR-004-05 (Drug-drug interaction check)
  Given: A physician prescribes warfarin and the patient is already on aspirin
  When: The prescription is created
  Then:
    - A CDS alert fires: "Drug-Drug Interaction: Warfarin + Aspirin — increased bleeding risk (severe)"
    - The physician can accept, modify, or reject the prescription
    - Decision and reason are logged

AC-DR-004-06 (Pharmacy selection)
  Given: A patient has a preferred pharmacy on file
  When: The prescription is signed
  Then:
    - The default pharmacy is pre-selected
    - The physician can change pharmacy from a searchable list
    - Prescription is routed to the selected pharmacy via PrescribeIT

AC-DR-004-07 (Prescription status tracking)
  Given: A prescription was sent to the pharmacy
  When: The pharmacist dispenses it
  Then:
    - The MedicationRequest.status updates to "completed" via PrescribeIT callback
    - The physician sees "Dispensed — [pharmacy name] — [timestamp]" in the Orders tab
```

---

#### DR-005 — Lab Order Entry (Full Panel)
**As a** physician,
**I want to** order laboratory tests from a comprehensive catalogue (beyond the 4 cardiology procedures), including haematology, chemistry, microbiology, and toxicology,
**So that** patients receive the right diagnostic workup and lab orders flow electronically to the LIMS.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR + LIMS |
| FHIR resource | ServiceRequest (lab order), Specimen |

**Acceptance Criteria:**

```
AC-DR-005-01 (Lab order from catalogue)
  Given: The physician opens the Orders tab
  When: They search "CBC" and select "Complete Blood Count" (LOINC 58410-2)
  Then:
    - A ServiceRequest is created: code=LOINC 58410-2, status=active, intent=order, priority=routine
    - The order flows to the LIMS via a FHIR ServiceRequest POST
    - The lab queue in LIMS shows the new pending order
    - Order ID and "Pending — Lab" status appear in the Orders tab

AC-DR-005-02 (Priority / urgency)
  Given: The physician needs STAT troponin
  When: They select priority=STAT
  Then:
    - ServiceRequest.priority = stat
    - The LIMS queue highlights the order in red (STAT colour)
    - A notification is sent to the lab: "STAT order from Dr. [name] — Troponin — [patient]"

AC-DR-005-03 (Order panel)
  Given: The physician needs a full cardiac panel
  When: They select the "Cardiac Panel" order set (troponin, BNP, CBC, BMP, CK-MB)
  Then:
    - Five ServiceRequest resources are created in one action
    - Each is linked to the encounter
    - The physician sees all five in the Orders tab as a grouped panel

AC-DR-005-04 (Duplicate order guard)
  Given: A troponin was already ordered 30 minutes ago
  When: The physician orders troponin again
  Then:
    - A warning appears: "Troponin already ordered at [time] — result pending. Continue?"
    - The physician must confirm before a duplicate order is placed

AC-DR-005-05 (Order cancellation)
  Given: A lab order has not yet been collected
  When: The physician clicks "Cancel Order" and enters reason
  Then:
    - ServiceRequest.status = revoked
    - The LIMS is notified via FHIR update
    - The cancellation reason is logged in ServiceRequest.note

AC-DR-005-06 (pCLOCD coding for Ontario)
  Given: The system is configured for Ontario
  When: Lab tests are searched
  Then:
    - The catalogue uses pCLOCD codes (Ontario equivalent of LOINC) in addition to LOINC
    - Both codes are stored in ServiceRequest.code.coding[] (system=pCLOCD and system=LOINC)
```

---

#### DR-006 — Lab Result Review (In-Context)
**As a** physician,
**I want to** review laboratory results directly within the encounter view, with abnormal values highlighted and trend graphs available,
**So that** I can make clinical decisions without switching to a separate system.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | DiagnosticReport, Observation |

**Acceptance Criteria:**

```
AC-DR-006-01 (Results display)
  Given: Lab results have been resulted by the LIMS for the current encounter
  When: The physician opens the Results tab in VisitDetail
  Then:
    - All resulted observations are displayed in a structured table: test name, value, units, reference range, flag (H/HH/L/LL/A)
    - Abnormal values are highlighted: red for critical (HH/LL), amber for abnormal (H/L)
    - Normal values are shown in standard text

AC-DR-006-02 (Trend graph)
  Given: A patient has troponin measured at 3 time points
  When: The physician clicks "Trend" on the troponin result
  Then:
    - A line chart shows troponin values vs time for the current and last 2 encounters
    - Reference range band is shown on the chart
    - Values above upper reference limit are plotted in red

AC-DR-006-03 (OLIS integration — previous results)
  Given: A patient has previous lab results in the Ontario OLIS repository
  When: The physician opens the Results tab
  Then:
    - OLIS results are displayed alongside in-house results
    - Source of each result is labelled: "In-house LIMS" or "OLIS"
    - OLIS results that pre-date the current encounter are shown in a "Historical" section

AC-DR-006-04 (Critical value notification)
  Given: A troponin result comes back as critically elevated (HH)
  When: The result is received from LIMS
  Then:
    - A red ClinicalAlert fires immediately on the physician's dashboard
    - The alert content: "CRITICAL: Troponin = 4.2 µg/L (ref <0.04) — patient [name] — result received [timestamp]"
    - Physician must acknowledge the alert; acknowledgement is logged
    - If unacknowledged after 5 minutes, the charge nurse is also alerted

AC-DR-006-05 (Result acknowledge and co-sign)
  Given: A physician reviews a DiagnosticReport
  When: They click "Acknowledge Results"
  Then:
    - The DiagnosticReport is updated with the physician's Practitioner reference and timestamp
    - A PHI audit event is logged: actor, patient, resource, action=results-reviewed

AC-DR-006-06 (Corrected result handling)
  Given: The lab issues a corrected result (amended)
  When: The Results tab is opened
  Then:
    - The corrected result is shown with an "AMENDED" badge
    - The original result is shown in a collapsed "Previous version" section
    - The physician receives a notification: "Lab result amended — please review"
```

---

#### DR-007 — Medication List Management (Active Meds)
**As a** physician,
**I want to** view, add, discontinue, and modify the patient's active medication list during the encounter,
**So that** all prescribers and pharmacists have an accurate, current medication list.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | MedicationRequest, MedicationStatement |

**Acceptance Criteria:**

```
AC-DR-007-01 (View active meds)
  Given: A physician opens a patient's encounter
  When: They view the medication tab
  Then:
    - All active MedicationRequest and MedicationStatement resources are listed
    - Each shows: drug name, dose, frequency, route, start date, prescriber, source (EHR/DHDR/triage-reconciliation)

AC-DR-007-02 (Discontinue a medication)
  Given: The physician decides to stop metformin
  When: They click "Discontinue", select reason "Adverse effect — GI intolerance", and save
  Then:
    - MedicationRequest.status = stopped
    - MedicationStatement.status = stopped
    - Discontinuation reason and date are stored
    - PharmacyMS is notified via FHIR update so the pharmacist is aware

AC-DR-007-03 (Dose modification)
  Given: The physician changes atorvastatin dose from 20mg to 40mg
  When: They select "Modify Dose" and enter new dose
  Then:
    - A new MedicationRequest supersedes the old one (old: status=superseded)
    - The medication list shows 40mg with "Modified [date]"
    - A new e-prescription is created and sent to PrescribeIT

AC-DR-007-04 (Renew expiring prescription)
  Given: A prescription expires in 30 days
  When: The physician is notified and clicks "Renew"
  Then:
    - A new MedicationRequest is created with extended dispenseRequest.validityPeriod
    - Old prescription is linked via basedOn reference
    - Renewal is transmitted to PrescribeIT
```

---

#### DR-008 — Cardiology Risk Score Calculators
**As a** cardiologist,
**I want to** calculate validated clinical risk scores (CHADS-VASc, HAS-BLED, TIMI, HEART, CHA2DS2-VASc) from structured patient data,
**So that** treatment decisions (anticoagulation, discharge, stress test) are evidence-based and documented.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Observation (risk score), RiskAssessment |

**Acceptance Criteria:**

```
AC-DR-008-01 (CHADS-VASc calculation)
  Given: A patient has AF (from problem list), age 74, hypertension, diabetes, no prior stroke/TIA, no vascular disease, female
  When: The physician opens the CHADS-VASc calculator
  Then:
    - Score is auto-populated from problem list data: C=1 (CHF? No), H=1, A=1 (age 65-74), D=1, S=0, V=0, A (sex)=1 → score = 4
    - Missing fields prompt the physician to confirm (e.g. "Does patient have prior TIA?")
    - Result displayed: "CHA2DS2-VASc = 4 — Annual stroke risk ~4% — Anticoagulation recommended"
    - A RiskAssessment resource is created with prediction.outcome and probability
    - A CDS recommendation: "Consider direct oral anticoagulant"

AC-DR-008-02 (HEART score)
  Given: A chest pain patient presents to the ED component
  When: The physician opens the HEART score calculator and completes all 5 elements
  Then:
    - Score 0–3: Low risk — "Safe for early discharge"
    - Score 4–6: Moderate risk — "Observe 6 hours, serial troponins"
    - Score 7–10: High risk — "Early invasive strategy"
    - Score is documented as a RiskAssessment resource

AC-DR-008-03 (HAS-BLED bleeding risk)
  Given: The physician has calculated CHADS-VASc = 4 and is considering anticoagulation
  When: They open HAS-BLED calculator
  Then:
    - HAS-BLED score is computed from available structured data
    - Score ≥ 3 shows amber warning: "High bleeding risk — does not contraindicate anticoagulation but address modifiable risks"
    - Both risk scores appear together in a "Anticoagulation Decision Aid" panel

AC-DR-008-04 (Score history)
  Given: A CHADS-VASc was calculated 3 months ago
  When: The calculator is opened again
  Then:
    - Previous score with date is shown: "Previous CHA2DS2-VASc: 3 on [date]"
    - The physician can see what has changed (age birthday moved score up by 1)
```

---

#### DR-009 — Referral Generation (Outbound eReferral)
**As a** physician,
**I want to** create an electronic referral to another specialist or facility using a structured FHIR ServiceRequest,
**So that** the receiving provider has complete patient information, and the referral can be tracked through acceptance and scheduling.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | ServiceRequest (referral intent=referral), Task (referral tracking) |

**Acceptance Criteria:**

```
AC-DR-009-01 (Create referral)
  Given: A cardiologist needs to refer a patient to vascular surgery
  When: They complete the referral form (specialty, urgency, reason, clinical summary) and submit
  Then:
    - A ServiceRequest is created: intent=referral, code=specialty SNOMED code, priority, reasonReference=Condition
    - A Task is created: status=requested, owner=referred-to organisation
    - The patient's problem list, medication list, and relevant results are bundled in a DocumentReference
    - Referral confirmation number is shown

AC-DR-009-02 (Urgency routing)
  Given: The referral is marked "Urgent"
  When: The referral is submitted
  Then:
    - The receiving system / scheduler is notified immediately
    - A maximum response time SLA is set: Urgent = 24 hours, Semi-urgent = 1 week, Routine = 4 weeks
    - The Task shows an SLA countdown

AC-DR-009-03 (Referral status tracking)
  Given: A referral was sent
  When: The Task status updates (requested → accepted → appointment-booked → completed)
  Then:
    - The physician sees status changes in real time in the patient's Orders tab
    - At each step, the referring physician is notified

AC-DR-009-04 (Patient notification)
  Given: The referral has been accepted and an appointment booked
  When: The patient portal is opened
  Then:
    - The patient sees the referral appointment in their upcoming appointments list
    - They receive an email/SMS notification with appointment details
```

---

#### DR-010 — Discharge Summary Generation
**As a** physician,
**I want to** generate a structured discharge summary at the end of an encounter,
**So that** the patient and receiving care providers have a complete record of the visit, diagnosis, treatment, and follow-up plan.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Composition (LOINC 18842-5 — Discharge summary) |

**Acceptance Criteria:**

```
AC-DR-010-01 (Discharge summary creation)
  Given: A physician is completing a visit (CONSULTATION_COMPLETE state)
  When: They click "Generate Discharge Summary" and review the auto-populated fields
  Then:
    - A Composition is created with type LOINC 18842-5
    - Sections auto-populated: presenting complaint, diagnoses (from Encounter.diagnosis), procedures performed, medications at discharge (from MedicationRequest active list), follow-up instructions, next appointment
    - Physician reviews, edits, and signs

AC-DR-010-02 (Patient copy delivery)
  Given: A discharge summary is signed
  When: The patient's preferred communication method is email
  Then:
    - A PDF of the discharge summary is generated and sent to the patient's registered email
    - A DocumentReference is created linking to the PDF
    - The patient portal shows the discharge summary under "Documents"

AC-DR-010-03 (Referring physician copy)
  Given: The patient was referred by a family physician
  When: The discharge summary is signed
  Then:
    - A copy is electronically sent to the referring physician's registered fax/eReferral address
    - The send status is logged

AC-DR-010-04 (Mandatory elements)
  Given: The physician attempts to sign a discharge summary without specifying a follow-up plan
  When: The form is submitted
  Then:
    - A warning: "Follow-up plan is required for discharge summary"
    - Summary cannot be finalised without at minimum a follow-up date or "No follow-up required" explicit choice
```

---

#### DR-011 — Imaging / Radiology Order
**As a** physician,
**I want to** order radiology studies (CXR, CT, MRI, US) directly from the encounter,
**So that** imaging requests are electronically transmitted to the radiology department with complete clinical context.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | ServiceRequest (imaging order), ImagingStudy |

**Acceptance Criteria:**

```
AC-DR-011-01 (Imaging order entry)
  Given: The physician clicks "New Imaging Order"
  When: They select "CT Chest with contrast", enter clinical indication "Pulmonary embolism", and sign
  Then:
    - A ServiceRequest is created: code=RadLex/SNOMED, modality=CT, bodysite=chest, reasonCode=clinical indication
    - Order is transmitted to the radiology information system (RIS) via HL7 or FHIR
    - Order confirmation number is returned and shown

AC-DR-011-02 (Contrast allergy safety check)
  Given: A CT with contrast is ordered and the patient has an iodine/contrast allergy
  When: The order is signed
  Then:
    - A hard-stop alert: "Patient has contrast allergy — consider CT without contrast or pre-medication protocol"
    - Physician must acknowledge and document override reason before transmission

AC-DR-011-03 (Pregnancy safety check)
  Given: A female patient of reproductive age (15–50) is about to receive ionising radiation imaging
  When: The order is signed
  Then:
    - A prompt: "Has pregnancy been ruled out for this patient?"
    - Physician must confirm negative pregnancy test or last menstrual period
    - Confirmation is logged in ServiceRequest.note
```

---

#### DR-012 — Consent Management
**As a** physician,
**I want to** record, view, and update patient consent for procedures, treatment, and data sharing,
**So that** all clinical interventions are documented as having informed consent, satisfying legal and ethical obligations.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Consent |

**Acceptance Criteria:**

```
AC-DR-012-01 (Procedure consent recording)
  Given: A patient is about to undergo a stress test
  When: The physician/nurse records that verbal consent was obtained
  Then:
    - A Consent resource is created: status=active, scope=treatment, action=perform, category=procedure
    - Actor=Patient, consentDateTime is set
    - Method of consent: verbal / written / electronic
    - The Consent is linked to the ServiceRequest for the procedure

AC-DR-012-02 (Written consent upload)
  Given: A written consent form has been signed and scanned
  When: The nurse uploads the PDF
  Then:
    - The PDF is stored as a DocumentReference
    - The Consent resource references the DocumentReference as sourceReference
    - A thumbnail preview is visible in the consent section

AC-DR-012-03 (DNR / Advance directive)
  Given: A patient has a Do Not Resuscitate order
  When: The physician records the DNR status
  Then:
    - A Consent resource is created: scope=adr, category=dnr
    - A prominent red "DNR" badge appears on the PatientBanner in all clinical views
    - The DNR is viewable by all clinical roles but modifiable only by PHYSICIAN or ADMIN

AC-DR-012-04 (Consent withdrawal)
  Given: A patient withdraws consent for a procedure
  When: The nurse marks consent as withdrawn and records reason
  Then:
    - Consent.status = inactive
    - Withdrawal reason and date are stored
    - The linked ServiceRequest is cancelled automatically
    - A domain event CONSENT_WITHDRAWN is emitted and logged

AC-DR-012-05 (Data sharing consent — PHIPA)
  Given: A patient wants to restrict their data from being shared with certain providers
  When: They update their PHIPA consent preferences via the patient portal
  Then:
    - A Consent resource with scope=patient-privacy is created
    - The restriction is enforced: the restricted providers' FHIR queries for this patient return 403 or empty results
    - Audit log records every access attempt against a restricted record
```

---

#### DR-013 — CDS Hooks Integration
**As a** physician,
**I want to** receive evidence-based clinical decision support alerts at key workflow points (prescription, ordering, documentation),
**So that** best-practice guidelines are applied consistently without requiring me to look them up.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR + FHIR |
| FHIR resource | CDS Hooks specification, GuidanceResponse |

**Acceptance Criteria:**

```
AC-DR-013-01 (CDS Hook fires on prescription)
  Given: A physician is about to prescribe an anticoagulant to an AF patient
  When: The prescription is opened in the e-Rx form
  Then:
    - A CDS hook fires: "patient-view" and "medication-prescribe" hooks
    - CDS service returns a card: "CHA2DS2-VASc = 4 — Anticoagulation recommended — [link to guideline]"
    - The card is shown inline without blocking the workflow

AC-DR-013-02 (Duplicate therapy alert)
  Given: A patient is on aspirin 81mg and the physician prescribes aspirin 325mg
  When: The prescription is created
  Then:
    - CDS card fires: "Duplicate therapy detected — patient already on aspirin 81mg"
    - Physician can dismiss with reason or discontinue the original and continue

AC-DR-013-03 (Best practice advisory — preventive care)
  Given: A 65-year-old patient with diabetes has no pneumococcal vaccine on record
  When: The physician opens the encounter
  Then:
    - A CDS card fires: "Pneumococcal vaccination recommended for patients ≥ 65 with diabetes"
    - Physician can order the vaccine directly from the CDS card

AC-DR-013-04 (CDS alert dismissal logging)
  Given: A physician dismisses a CDS alert
  When: They select "Override — not applicable" or another reason
  Then:
    - The dismissal, reason, and actor are logged in a GuidanceResponse resource
    - This override log is auditable by QA teams

AC-DR-013-05 (CDS alert fatigue prevention)
  Given: The same CDS alert has been dismissed 3 times in the last 7 days by the same physician for the same patient
  When: The alert would fire a 4th time
  Then:
    - The alert is suppressed for 30 days with a note "Suppressed — previously acknowledged"
    - The suppression is logged
```

---

#### DR-014 — Telemedicine / Video Consult
**As a** physician,
**I want to** initiate or join a scheduled video consultation with a patient directly from the encounter screen,
**So that** telehealth visits are seamlessly integrated without requiring a separate platform.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Appointment (appointmentType=VIRTUAL), Communication |

**Acceptance Criteria:**

```
AC-DR-014-01 (Join video call from encounter)
  Given: An appointment of type "Telemedicine" is scheduled
  When: The physician clicks "Join Video Call" at the appointment time
  Then:
    - A secure video session (WebRTC or integrated provider) launches in a panel or new tab
    - The patient receives a join link by email/SMS 30 minutes before the appointment
    - The Appointment status updates to "fulfilled" when the call connects

AC-DR-014-02 (Patient join)
  Given: The patient has received a telemedicine appointment link
  When: They click the link and the time is within 15 minutes of the appointment
  Then:
    - They are placed in a virtual waiting room
    - The physician is notified: "Patient has joined the virtual waiting room"

AC-DR-014-03 (SOAP note during telemedicine)
  Given: A telemedicine visit is ongoing
  When: The physician opens the SOAP note editor in a side panel
  Then:
    - The video continues in a resizable picture-in-picture
    - The note is linked to the Encounter with Encounter.class=VR (virtual)

AC-DR-014-04 (Recording consent)
  Given: The physician wants to record the session for documentation
  When: Recording is initiated
  Then:
    - An explicit consent prompt is shown to the patient
    - Recording only begins after patient consent
    - Consent is stored as a Consent resource with scope=recording
```

---

#### DR-015 — Physician Schedule / Availability
**As a** physician,
**I want to** view my daily and weekly schedule, see assigned patients, and mark blocks of unavailability,
**So that** the receptionist can book appointments accurately and I can plan my day.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Schedule, Slot, Appointment |

**Acceptance Criteria:**

```
AC-DR-015-01 (Daily schedule view)
  Given: The physician opens the Schedule view
  When: The view loads for today
  Then:
    - A time-based day view shows all booked Appointments with patient name, appointment type, and room
    - Unbooked Slot resources appear as available (white/open)
    - The next patient to be seen is highlighted

AC-DR-015-02 (Block time)
  Given: The physician has a conference from 2–4pm
  When: They select that time range and mark as "Blocked"
  Then:
    - Slot resources for that period are set to status=busy-unavailable
    - The receptionist cannot book patients into blocked slots
    - The physician sees the block labelled "BLOCKED — [reason]"

AC-DR-015-03 (Run-time delay notification)
  Given: The physician is running 30 minutes behind
  When: They click "Running Late — 30 min"
  Then:
    - All waiting patients for the day are notified via SMS/email: "Your appointment may be delayed by approximately 30 minutes"
    - The waiting room board shows the updated estimated wait

AC-DR-015-04 (Multi-location)
  Given: The physician works at two clinic locations
  When: They view their schedule
  Then:
    - Location is shown for each appointment
    - A location filter allows viewing one site at a time
    - Schedule conflicts between locations are flagged
```

---

#### DR-016 — Second Opinion / Peer Review Flag
**As a** physician,
**I want to** flag a case for peer review or request a second opinion from a colleague,
**So that** complex or uncertain cases receive additional clinical oversight.

| Field | Value |
|---|---|
| Priority | Could |
| Target app | EHR |
| FHIR resource | Task (peer-review), Communication |

**Acceptance Criteria:**

```
AC-DR-016-01 (Flag for peer review)
  Given: A physician is unsure about a complex cardiac presentation
  When: They click "Request Second Opinion", select a colleague, and add notes
  Then:
    - A Task is created: code=peer-review, owner=selected-colleague, status=requested
    - The colleague receives an in-app and email notification
    - The case is marked "Peer Review Requested" on the physician dashboard

AC-DR-016-02 (Peer review response)
  Given: A colleague has been asked to review a case
  When: They open the case and submit their opinion
  Then:
    - Their opinion is stored as a DocumentReference linked to the encounter
    - The requesting physician is notified: "Second opinion submitted by Dr. [name]"
    - The Task status changes to completed
```

---

#### DR-017 — Clinical Note Template Library
**As a** physician,
**I want to** create and use reusable clinical note templates for common encounter types,
**So that** documentation is faster, more consistent, and complete across my practice.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Questionnaire (template definition) |

**Acceptance Criteria:**

```
AC-DR-017-01 (Use template)
  Given: A physician opens a SOAP note for a cardiology follow-up
  When: They select "Cardiology Follow-up" template
  Then:
    - Pre-defined section headers and prompts fill the SOAP editor
    - Auto-populated fields are drawn from the patient's current data (problem list, vitals, labs)
    - The physician edits and signs

AC-DR-017-02 (Create template)
  Given: A physician has designed a note structure they want to reuse
  When: They click "Save as Template", name it, and save
  Then:
    - The template is saved as a Questionnaire resource for the physician's scope
    - It appears in their template library for future encounters

AC-DR-017-03 (Tenant-wide template)
  Given: An admin has approved a note template for the whole clinic
  When: The admin marks it as "Clinic Template"
  Then:
    - All physicians in the tenant can see and use it
    - Individual physicians cannot modify clinic templates (only personal ones)
```

---

#### DR-018 — Voice Dictation / Transcription for Notes
**As a** physician,
**I want to** dictate clinical notes by voice and have them transcribed into the SOAP editor,
**So that** documentation time is reduced and I can maintain eye contact with the patient.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | DocumentReference (transcription) |

**Acceptance Criteria:**

```
AC-DR-018-01 (Voice transcription)
  Given: The SOAP editor is open and the physician clicks "Dictate"
  When: They speak for 2 minutes and click "Stop"
  Then:
    - Audio is transcribed to text (via server-side speech-to-text, audio not stored)
    - Transcribed text populates the appropriate SOAP section
    - The physician reviews and edits before signing
    - No audio recording is retained after transcription

AC-DR-018-02 (Medical vocabulary accuracy)
  Given: The physician dictates "The patient has atrial fibrillation with rapid ventricular response"
  When: The transcription completes
  Then:
    - "atrial fibrillation" and "ventricular response" are correctly transcribed (medical vocabulary model)
    - Common medical acronyms (AF, RVR, CHF) are expanded correctly

AC-DR-018-03 (PHI in transcription)
  Given: Dictation content includes patient name and DOB
  When: The transcription is saved
  Then:
    - Transcription is stored encrypted at rest
    - PHI audit log records: transcription saved for patient [ID], by physician [ID]
```

---

#### DR-019 — SMART on FHIR App Launch
**As a** physician,
**I want to** launch third-party SMART on FHIR applications from within the EHR in the context of the current patient encounter,
**So that** specialised tools (drug reference, CDS calculators, genomics apps) integrate seamlessly without re-authentication.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR + FHIR |
| FHIR resource | CapabilityStatement (SMART), OAuth 2.0 / SMART on FHIR |

**Acceptance Criteria:**

```
AC-DR-019-01 (App gallery)
  Given: A physician opens the "Apps" panel
  When: The gallery loads
  Then:
    - Approved SMART on FHIR apps are listed with name, description, and publisher
    - Only apps approved by the admin are shown
    - Apps are categorised: Drug Reference, Calculators, Patient Education, Specialty

AC-DR-019-02 (Launch in context)
  Given: A physician selects "Epic CDS Sandbox" from the gallery
  When: They click "Launch"
  Then:
    - The SMART EHR launch sequence fires: FHIR authorization server issues launch token
    - The app receives the current patient context (Patient.id, Encounter.id)
    - The app opens in an iframe or new tab without requiring separate login

AC-DR-019-03 (Scope restriction)
  Given: A SMART app requests write access to prescriptions
  When: The physician approves the launch
  Then:
    - Scope is restricted to what the admin pre-approved for that app
    - If the app requests a scope beyond approved, the launch is blocked with notification to admin

AC-DR-019-04 (Token expiry)
  Given: A SMART app session has been open for 60 minutes
  When: The app tries to refresh data
  Then:
    - The access token is refreshed automatically via refresh_token flow
    - If the physician's session has ended, the SMART app receives 401 and prompts re-auth
```

---

#### DR-020 — Outpatient Clinical Analytics Dashboard
**As a** physician or department head,
**I want to** view outcome and operational analytics for my patient panel (average wait time, readmission rate, top diagnoses, procedure volumes),
**So that** I can identify care gaps and improve clinic performance.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | MeasureReport (FHIR Quality Measure) |

**Acceptance Criteria:**

```
AC-DR-020-01 (Physician analytics dashboard)
  Given: A physician opens the Analytics portal
  When: The dashboard loads
  Then:
    - KPIs shown: patients seen this month, average consult duration, top 5 diagnoses, referral count
    - Data is scoped to the physician's own patients (not tenant-wide unless ADMIN)
    - Charts use accessible colour palettes with pattern fills (WCAG)

AC-DR-020-02 (Date range filter)
  Given: The analytics dashboard is open
  When: The physician selects "Last 6 months"
  Then:
    - All KPIs update to reflect the selected period
    - Trend lines show month-by-month progression

AC-DR-020-03 (Export to CSV)
  Given: The physician wants to share data with a quality committee
  When: They click "Export CSV"
  Then:
    - A CSV is generated with the current view data
    - PHI is de-identified before export (no names, DOBs, MRNs in aggregate export)
    - The export action is logged in the audit trail
```


---

### 4.3 Lab Technician / Analyst (LT)

---

#### LT-001 — LIMS REST API — Core Endpoints
**As a** lab technician,
**I want to** interact with lab orders and results through a functional REST API,
**So that** the LIMS system can receive orders from the EHR and return results electronically.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | LIMS (Go) |
| FHIR resource | ServiceRequest (order), Observation, DiagnosticReport |

**Acceptance Criteria:**

```
AC-LT-001-01 (Order retrieval endpoint)
  Given: A physician has created a lab ServiceRequest in the EHR
  When: The LIMS polls GET /api/v1/orders?status=pending
  Then:
    - Response is JSON array of pending lab orders with: order ID, patient FHIR ID, test name, LOINC code, priority, ordered-at timestamp
    - HTTP 200 with Content-Type application/json
    - Pagination via ?limit=50&offset=0
    - Orders are sorted by priority (STAT first) then by ordered_at

AC-LT-001-02 (Order status update)
  Given: A lab technician accepts a lab order
  When: PATCH /api/v1/orders/{id} with body {"status":"in-progress","assigned_to":"tech-001"}
  Then:
    - lab_orders.status updated to "in-progress"
    - lab_orders.assigned_analyst_id set
    - FHIR ServiceRequest.status updated to "active" via FHIR server PUT
    - HTTP 200 with updated order object
    - Event logged: LAB_ORDER_ACCEPTED

AC-LT-001-03 (Result entry endpoint)
  Given: A lab analyst has resulted a CBC
  When: POST /api/v1/results with result payload
  Then:
    - lab_results rows are inserted for each component
    - FHIR Observation resources are created for each component
    - FHIR DiagnosticReport is created referencing all Observations
    - ServiceRequest.status → "completed"
    - HTTP 201 Created
    - Ordering physician receives a result notification

AC-LT-001-04 (Authentication required)
  Given: Any request without a valid JWT
  When: The endpoint is called
  Then:
    - HTTP 401 Unauthorized is returned
    - No data is returned or modified
    - The failed request is logged with IP address and timestamp

AC-LT-001-05 (Rate limiting)
  Given: A client submits more than 100 requests per minute to the LIMS API
  When: The rate limit is exceeded
  Then:
    - HTTP 429 Too Many Requests is returned
    - Retry-After header indicates when to retry
    - No valid requests are processed beyond the limit
```

---

#### LT-002 — Specimen Collection Workflow
**As a** lab technician,
**I want to** register specimen collection including accession label printing, tube type, and collection time,
**So that** each specimen is traceable from collection to result.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | LIMS |
| FHIR resource | Specimen, ServiceRequest |

**Acceptance Criteria:**

```
AC-LT-002-01 (Accession creation)
  Given: A lab order is accepted
  When: The technician clicks "Register Specimen" and enters collection time and collector ID
  Then:
    - A Specimen resource is created: type=blood/urine/swab, collectedDateTime, collector (Practitioner reference)
    - A unique accession number (format: [tenant]-[year]-[sequence]) is generated
    - The ServiceRequest is updated with specimen reference
    - Accession label PDF is generated for printing (barcode + patient name + DOB + test name + accession number)

AC-LT-002-02 (Label print)
  Given: An accession is created
  When: The technician clicks "Print Label"
  Then:
    - A ZPL/PDF label is sent to the configured label printer
    - Label contains: 2D barcode of accession number, patient name (last, first), DOB, test name, collection date/time, tube type
    - Print confirmation is logged

AC-LT-002-03 (Barcode scan at receipt)
  Given: A specimen arrives at the lab with a barcode label
  When: The technician scans the barcode with a USB scanner
  Then:
    - The corresponding order and specimen are pulled up immediately
    - Specimen.status changes to "available"
    - Receipt timestamp is recorded: Specimen.receivedTime

AC-LT-002-04 (Wrong patient guard)
  Given: A barcode is scanned that belongs to a different patient than expected
  When: The scan is processed
  Then:
    - An alert fires: "Specimen mismatch — expected [Patient A] but scanned [Patient B] accession"
    - The specimen is NOT accepted
    - An incident is logged for quality review
```

---

#### LT-003 — Lab Order Work Queue
**As a** lab technician,
**I want to** view a work queue of pending lab orders sorted by priority, STAT first,
**So that** I can process the most urgent work first without manually sorting.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | LIMS |
| FHIR resource | ServiceRequest |

**Acceptance Criteria:**

```
AC-LT-003-01 (Queue view)
  Given: The technician opens the lab work queue
  When: The page loads
  Then:
    - Orders are displayed in a table: priority badge, accession number, patient name, test name, ordered-at time, elapsed time, status
    - STAT orders appear first (priority=stat), then urgent, then routine
    - Within same priority, oldest orders appear first (FIFO)

AC-LT-003-02 (Real-time updates)
  Given: A STAT order is placed by a physician while the technician has the queue open
  When: The order arrives
  Then:
    - The new STAT order appears at the top of the queue within 2 seconds (WebSocket push)
    - An audio alert sounds (configurable per workstation)

AC-LT-003-03 (Claim and progress)
  Given: A technician claims an order from the queue
  When: They click "Claim"
  Then:
    - The order status changes to "in-progress" and is assigned to them
    - Other technicians see it as "In Progress — [technician name]"
    - The technician cannot claim a second STAT order while one is in-progress (configurable restriction)

AC-LT-003-04 (Overdue highlighting)
  Given: A STAT order has been in the queue for > 30 minutes without being claimed
  When: The queue renders
  Then:
    - The row background turns red
    - The lab supervisor is notified via in-app alert: "STAT order unclaimed for >30 min"
```

---

#### LT-004 — Lab Result Entry
**As a** lab technician or analyst,
**I want to** enter quantitative, qualitative, and coded results for completed lab tests,
**So that** results are available to ordering physicians promptly and accurately.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | LIMS |
| FHIR resource | Observation, DiagnosticReport |

**Acceptance Criteria:**

```
AC-LT-004-01 (Quantitative result entry)
  Given: The technician has a glucose result of 7.2 mmol/L
  When: They enter the value and save
  Then:
    - Observation.valueQuantity = 7.2, unit=mmol/L (UCUM), code=LOINC 2339-0
    - Interpretation is auto-assigned: 7.2 < 11.1 mmol/L → "N" (normal fasting context)
    - Reference range (3.9–7.8 mmol/L fasting) is stored in Observation.referenceRange

AC-LT-004-02 (Qualitative result entry)
  Given: A urine culture result is "No growth"
  When: The analyst enters "No growth" from a coded dropdown
  Then:
    - Observation.valueCodeableConcept = SNOMED 264868006 "No growth"
    - Interpretation = "N"

AC-LT-004-03 (Panic value detection)
  Given: A potassium result of 6.8 mmol/L is entered (panic high: >6.5)
  When: Saved
  Then:
    - Interpretation flag = "HH" (critical high)
    - Observation.interpretation = HH
    - An immediate notification fires to the ordering physician and charge nurse
    - The technician is required to document that the ordering physician was notified (read-back confirmation)
    - Notification is logged with: recipient, method, time, technician ID

AC-LT-004-04 (Delta check)
  Given: A previous sodium result was 138 mmol/L and the new result is 118 mmol/L (delta = -20)
  When: The new result is entered
  Then:
    - A delta check alert fires: "Sodium dropped 20 mmol/L from previous — verify specimen integrity"
    - The technician must investigate (re-run or reject) before finalising

AC-LT-004-05 (Result authorisation)
  Given: A junior analyst enters a result
  When: They click "Submit for Review"
  Then:
    - The result status = "preliminary"
    - A senior analyst/pathologist must review and authorise
    - Only after authorisation does status = "final" and the result notify the ordering physician
```

---

#### LT-005 — Panic Value Escalation
**As a** lab technician,
**I want to** have automatic escalation workflows trigger when a critical value is detected,
**So that** no critical result goes unacknowledged and patient safety is maintained.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | LIMS + EHR |
| FHIR resource | CommunicationRequest, Communication |

**Acceptance Criteria:**

```
AC-LT-005-01 (Auto-escalation on critical result)
  Given: A critical potassium of 6.8 mmol/L is finalised
  When: The Observation is saved with interpretation=HH
  Then:
    - A CommunicationRequest is created targeting the ordering physician
    - A real-time notification fires in EHR: urgent red banner with result, patient name, test, value
    - Simultaneously an SMS alert is sent to the physician's registered mobile
    - The escalation is logged: channel, recipient, timestamp

AC-LT-005-02 (Physician acknowledgement required)
  Given: A critical value notification was sent
  When: The physician acknowledges in the EHR
  Then:
    - Communication.status = "completed"
    - Acknowledgement timestamp, physician ID are logged
    - The critical value alert banner is dismissed
    - Technician receives confirmation: "Critical value acknowledged by Dr. [name] at [time]"

AC-LT-005-03 (Escalation on non-acknowledgement)
  Given: A critical value was sent and not acknowledged within 10 minutes
  When: The escalation timer fires
  Then:
    - The notification is escalated to the charge nurse and on-call physician
    - A second CommunicationRequest is created for the escalation targets
    - The technician is notified: "Primary physician did not acknowledge — escalated to [charge nurse]"

AC-LT-005-04 (Read-back documentation)
  Given: The technician called the physician verbally to report the critical value
  When: They document the call in the LIMS
  Then:
    - Communication resource is created: medium=phone, payload=read-back text, sender=technician, recipient=physician
    - Required fields: time of call, physician name, read-back result value confirmed by physician
```

---

#### LT-006 — Specimen Rejection Workflow
**As a** lab technician,
**I want to** reject specimens that do not meet acceptance criteria and notify the ordering clinician,
**So that** results are not generated from compromised specimens.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | LIMS |
| FHIR resource | Specimen (status=unsatisfactory), ServiceRequest (status=revoked) |

**Acceptance Criteria:**

```
AC-LT-006-01 (Reject specimen)
  Given: A blood specimen arrives haemolysed
  When: The technician selects "Reject" and chooses reason "Haemolysis"
  Then:
    - Specimen.status = "unsatisfactory"
    - Specimen.condition = SNOMED 281510002 "Hemolysis"
    - ServiceRequest.status = "on-hold" (not revoked — new specimen may be collected)
    - Ordering clinician is notified: "Specimen rejected — haemolysis — please recollect"
    - Rejection reason, technician ID, and timestamp are logged

AC-LT-006-02 (Recollection request)
  Given: A specimen is rejected
  When: The ordering clinician receives the notification
  Then:
    - A "Request Recollect" action is available in the EHR Orders tab
    - A new Specimen collection workflow begins when initiated
    - The original ServiceRequest is retained with rejection history

AC-LT-006-03 (QNS — Quantity Not Sufficient)
  Given: Only 1 mL of blood was collected but the test requires 3 mL
  When: The technician flags as QNS
  Then:
    - Rejection reason = SNOMED 281268004 "Insufficient specimen"
    - Ordering clinician is notified with required volume for recollection
```

---

#### LT-007 — OLIS Outbound Result Submission
**As a** lab technician or LIMS system,
**I want to** send finalised results to the Ontario Laboratories Information System (OLIS),
**So that** any treating provider in Ontario can access the results through the provincial system.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | LIMS + FHIR |
| FHIR resource | DiagnosticReport (OLIS IG profile), Bundle (batch) |

**Acceptance Criteria:**

```
AC-LT-007-01 (Outbound OLIS submission)
  Given: A DiagnosticReport is finalised in the LIMS
  When: The OLIS adapter runs (scheduled every 5 minutes)
  Then:
    - The DiagnosticReport is transformed to the OLIS HL7 FHIR profile format
    - Submitted to the OLIS FHIR endpoint as a POST Bundle
    - OLIS response 200 → submission status = "Submitted"
    - OLIS accession number from response is stored in DiagnosticReport.identifier

AC-LT-007-02 (OLIS submission failure)
  Given: The OLIS endpoint is unavailable
  When: Submission fails
  Then:
    - The submission is queued for retry (exponential backoff: 5min, 15min, 60min)
    - After 3 retries the submission is flagged for manual review
    - The LIMS admin is alerted: "OLIS submission failed — [count] results pending"

AC-LT-007-03 (Duplicate prevention)
  Given: A result has already been submitted to OLIS
  When: The adapter runs again
  Then:
    - The OLIS accession number check prevents re-submission
    - No duplicate is sent
```

---

#### LT-008 — Amended / Corrected Result
**As a** lab analyst,
**I want to** issue a corrected result when an error is identified in a finalised report,
**So that** the ordering physician receives the accurate result and the original is preserved for audit.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | LIMS |
| FHIR resource | Observation (status=amended), DiagnosticReport (status=amended) |

**Acceptance Criteria:**

```
AC-LT-008-01 (Issue corrected result)
  Given: A glucose result of 7.2 was incorrectly finalised and should be 2.7 (hypoglycaemia)
  When: The analyst opens the result, corrects the value to 2.7, and marks as "Corrected"
  Then:
    - Original Observation is retained as version 1 (status=amended)
    - New Observation is created as version 2 with corrected value
    - DiagnosticReport.status = amended
    - The ordering physician receives urgent notification: "RESULT CORRECTED — Glucose now 2.7 mmol/L — CRITICAL LOW"
    - Both versions are visible in the EHR Results tab with clear labelling

AC-LT-008-02 (Correction reason required)
  Given: An analyst attempts to issue a corrected result without a reason
  When: They click "Save Correction"
  Then:
    - Submission is blocked: "Correction reason is required"
    - Reason is stored in Observation.note

AC-LT-008-03 (Audit immutability)
  Given: A correction has been issued
  When: An auditor views the audit log
  Then:
    - Original result (version 1), correction (version 2), and reason are all present
    - Both entries are immutable — no deletion is possible
```

---

#### LT-009 — Autoverification Rules
**As a** lab system administrator,
**I want to** define autoverification rules (delta checks, reference range checks, instrument quality checks) so that normal, non-critical results are automatically finalised without manual review,
**So that** turnaround time is reduced and analyst time is focused on abnormal results.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | LIMS |
| FHIR resource | Observation (status=final — autoverified) |

**Acceptance Criteria:**

```
AC-LT-009-01 (Autoverification rule)
  Given: A glucose result of 5.4 mmol/L is returned from the instrument
  When: The result passes all defined rules (within range, no delta alert, no QC failure)
  Then:
    - Observation.status = "final"
    - Observation.note includes "Autoverified — [rule set name] — [timestamp]"
    - No manual review is required
    - The result is immediately available to the ordering physician

AC-LT-009-02 (Autoverification blocked — delta check failure)
  Given: A sodium result of 118 triggers a delta check (previous was 140)
  When: The autoverification rule runs
  Then:
    - Autoverification is blocked
    - Result is placed in "Pending Manual Review" status
    - A work queue item is created for the analyst: "Delta check failure — Sodium — Manual review required"

AC-LT-009-03 (Rule configuration)
  Given: The lab administrator opens the autoverification rule editor
  When: They define a rule for "Glucose: autoverify if value 3.9–11.1 and no delta >3 mmol/L from previous"
  Then:
    - Rule is saved and active for all subsequent glucose results
    - Rule change is audit-logged with admin ID and timestamp
```

---

#### LT-010 — Microbiology Culture & Sensitivity
**As a** lab technician (microbiology),
**I want to** record culture results including organism identification and antibiotic sensitivity/resistance profiles,
**So that** physicians can prescribe targeted antibiotic therapy.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | LIMS |
| FHIR resource | Observation (culture), Observation (sensitivity panel) |

**Acceptance Criteria:**

```
AC-LT-010-01 (Culture result entry)
  Given: A urine culture grows E. coli at >100,000 CFU/mL
  When: The analyst enters the organism and colony count
  Then:
    - Observation.valueCodeableConcept = SNOMED 112283007 "Escherichia coli" 
    - Colony count is stored as a separate Observation component
    - Observation.interpretation = "A" (abnormal)

AC-LT-010-02 (Sensitivity panel)
  Given: E. coli sensitivity testing is complete
  When: The analyst enters the MIC values and S/I/R interpretation for each antibiotic
  Then:
    - Each antibiotic-MIC-interpretation triplet is stored as an Observation component
    - SNOMED codes for antibiotics are used
    - The physician sees a formatted sensitivity panel with S (green), I (amber), R (red) colouring

AC-LT-010-03 (Preliminary vs final)
  Given: A culture preliminary report is issued at 24h showing growth
  When: The final sensitivity panel is ready at 48h
  Then:
    - Initial Observation.status = "preliminary"
    - Physician is notified of preliminary: "Culture — growth detected — sensitivity pending"
    - Final Observation.status = "final"
    - Physician is notified of final with sensitivity panel
```

---

#### LT-011 — TAT (Turnaround Time) Monitoring
**As a** lab manager,
**I want to** view real-time TAT metrics for each test category,
**So that** SLA compliance is monitored and bottlenecks are identified.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | LIMS |
| FHIR resource | N/A (operational metrics) |

**Acceptance Criteria:**

```
AC-LT-011-01 (TAT dashboard)
  Given: The lab manager opens the TAT monitoring dashboard
  When: The view loads
  Then:
    - Average TAT is shown per test category (chemistry, hematology, microbiology) for today
    - STAT vs routine TAT are shown separately
    - TATs that exceed SLA targets are highlighted in red

AC-LT-011-02 (SLA targets)
  Given: STAT troponin SLA is 60 minutes (collection to result)
  When: A STAT troponin order is placed
  Then:
    - A TAT countdown is shown in the lab queue
    - If TAT exceeds 55 minutes (5 min warning), the lab manager is alerted

AC-LT-011-03 (Trend over time)
  Given: The manager selects "Last 30 days"
  When: The dashboard updates
  Then:
    - A trend line shows daily average TAT for the period
    - SLA breach days are marked on the chart
```

---

#### LT-012 — Quality Control (QC) Management
**As a** lab technician,
**I want to** enter daily QC results for each analyzer and see Levy-Jennings charts,
**So that** instrument performance is validated before patient results are reported.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | LIMS |
| FHIR resource | Observation (QC — non-patient) |

**Acceptance Criteria:**

```
AC-LT-012-01 (QC result entry)
  Given: A technician runs a Level 1 QC material for the glucose analyzer
  When: They enter the QC result (e.g. 5.6 mmol/L) and save
  Then:
    - QC result is stored separately from patient results (flagged as QC, not patient-linked)
    - Westgard rules are evaluated automatically
    - If all rules pass: QC status = "Passed" — patient testing may proceed
    - Levy-Jennings chart updates with new data point

AC-LT-012-02 (Westgard rule violation)
  Given: Three consecutive QC results show a systematic positive bias (10x rule violation)
  When: The third result is entered
  Then:
    - A QC failure alert fires: "Warning: 10x rule violation — systematic bias detected"
    - Patient results from this run are locked pending supervisor review
    - The technician cannot release patient results until QC is resolved
    - Incident is logged for root cause analysis

AC-LT-012-03 (QC chart)
  Given: 30 days of QC data exist for an analyzer
  When: The technician opens the Levy-Jennings chart
  Then:
    - Mean, ±1SD, ±2SD, ±3SD lines are shown
    - Each data point is plotted
    - Westgard rule violations are highlighted
```

---

#### LT-013 — Reflex Testing Rules
**As a** lab system administrator,
**I want to** configure reflex testing rules so that follow-on tests are automatically ordered when primary test results meet defined criteria,
**So that** clinicians receive comprehensive results without manual add-on ordering.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | LIMS |
| FHIR resource | ServiceRequest (reflex), PlanDefinition |

**Acceptance Criteria:**

```
AC-LT-013-01 (Reflex trigger)
  Given: A urine dipstick shows positive for nitrites and leucocytes
  When: The result is finalised
  Then:
    - A reflex ServiceRequest is auto-created for "Urine Culture and Sensitivity"
    - The reflex order references the original order (basedOn)
    - The physician is notified: "Reflex culture ordered automatically based on positive dipstick"

AC-LT-013-02 (Reflex rule configuration)
  Given: The admin opens the reflex rule editor
  When: They define "If TSH < 0.1 mIU/L → reflex Free T4"
  Then:
    - Rule is saved and active
    - Next TSH below threshold automatically triggers Free T4 ServiceRequest
    - Rule change is audit-logged
```

---

#### LT-014 — pCLOCD Test Catalogue
**As a** lab technician,
**I want to** search the lab test catalogue using pCLOCD (Ontario) and LOINC codes,
**So that** test orders from the EHR are correctly mapped and reported back with the correct coding.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | LIMS |
| FHIR resource | CodeSystem (pCLOCD), ConceptMap (pCLOCD → LOINC) |

**Acceptance Criteria:**

```
AC-LT-014-01 (pCLOCD search)
  Given: A technician searches the test catalogue
  When: They type "glucose"
  Then:
    - Results show pCLOCD codes and descriptions alongside LOINC equivalents
    - Selecting a test stores both pCLOCD and LOINC in the lab_tests record

AC-LT-014-02 (Code mapping on result)
  Given: A glucose result is entered for an order with pCLOCD code
  When: The Observation is created
  Then:
    - Observation.code.coding[] contains both pCLOCD (system=https://fhir.infoway-inforoute.ca/CodeSystem/pCLOCD) and LOINC entries
    - OLIS submission uses pCLOCD as primary coding

AC-LT-014-03 (Catalogue update)
  Given: Ontario Health releases an updated pCLOCD version
  When: The admin imports the new code system version
  Then:
    - New codes are added, deprecated codes are flagged
    - Existing orders retain their original coding
    - Import is version-stamped and audit-logged
```

---

#### LT-015 — Pathology / Anatomic Pathology Module
**As a** pathologist,
**I want to** receive biopsy and cytology requisitions and issue structured pathology reports,
**So that** surgical and oncology teams receive standardised diagnostic reports.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | LIMS |
| FHIR resource | DiagnosticReport (pathology), Observation (pathology findings) |

**Acceptance Criteria:**

```
AC-LT-015-01 (Pathology requisition receipt)
  Given: A surgical team sends a biopsy specimen with requisition
  When: The pathology lab receives and logs it
  Then:
    - Specimen is logged with: tissue type, anatomic site (SNOMED), fixative, clinical history
    - A pending DiagnosticReport is created with status=registered

AC-LT-015-02 (Pathology report issuance)
  Given: The pathologist has examined the specimen
  When: They complete the structured report (gross description, microscopic description, diagnosis)
  Then:
    - DiagnosticReport sections are populated with structured data
    - Diagnosis code: SNOMED morphology + topography codes
    - Reporting pathologist's signature and credentials are recorded
    - Final report PDF is generated and sent to the ordering physician
```

---

#### LT-016 — Order Amendment / Cancellation from EHR
**As a** lab technician,
**I want to** receive and process cancellation or amendment instructions from the ordering physician in real time,
**So that** unnecessary tests are not performed on collected specimens.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | LIMS |
| FHIR resource | ServiceRequest (status=revoked), Task |

**Acceptance Criteria:**

```
AC-LT-016-01 (Cancellation received)
  Given: A physician cancels a lab order in the EHR
  When: The FHIR ServiceRequest.status is updated to "revoked"
  Then:
    - LIMS receives the update via FHIR subscription or polling
    - If specimen not yet collected: order is removed from the queue
    - If specimen already collected but test not started: cancellation alert in LIMS — technician can discard
    - If test already in progress: cancellation cannot be processed; physician is notified

AC-LT-016-02 (Amendment — priority change)
  Given: A routine order is urgently needed and changed to STAT
  When: ServiceRequest.priority is updated to "stat"
  Then:
    - The LIMS order priority is updated in real time
    - The order jumps to the top of the work queue
    - A visual alert appears on the lab queue display
```

---

#### LT-017 — Patient-Facing Lab Result View
**As a** patient,
**I want to** view my finalised lab results in the patient portal with plain-language explanations,
**So that** I understand my health status without needing to contact my physician.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR (patient portal) |
| FHIR resource | Observation, DiagnosticReport |

**Acceptance Criteria:**

```
AC-LT-017-01 (Result visibility in patient portal)
  Given: A glucose result has been finalised and marked "patient-viewable" by the lab
  When: The patient opens their Health Records in the portal
  Then:
    - The result is shown: "Glucose — 5.4 mmol/L — Normal"
    - A plain-language explanation is shown: "Your glucose level is within the normal range. No action required."
    - The reference range and units are displayed

AC-LT-017-02 (Abnormal result patient notification)
  Given: A mildly elevated result (H, not HH) is released to the patient portal
  When: The patient logs in
  Then:
    - The result is shown with a yellow flag and message: "This result is slightly outside the normal range. Your doctor will review this."
    - A "Message your doctor" link is available

AC-LT-017-03 (Critical result hold)
  Given: A critical (HH) result exists
  When: The patient attempts to view it
  Then:
    - The critical result is NOT shown in the patient portal until the physician acknowledges it
    - The patient sees: "Your results are being reviewed by your care team. You will be notified."

AC-LT-017-04 (Result download)
  Given: A patient wants a copy of their results
  When: They click "Download PDF"
  Then:
    - A PDF is generated with all results from the selected encounter
    - The PDF includes clinic letterhead, physician name, and result values
    - PHI audit event is logged: patient self-served result download

AC-LT-017-05 (21st Century Cures — immediate release)
  Given: The system is deployed for a US site
  When: Results are finalised
  Then:
    - Results are made available to the patient within 24 hours unless explicitly held by the physician
    - Information blocking compliance is logged
```


---

### 4.4 Pharmacist (PH)

---

#### PH-001 — PharmacyMS Core REST API
**As a** pharmacist,
**I want to** access prescriptions, dispense records, and patient medication profiles through a functional REST API,
**So that** PharmacyMS operates as a real clinical system rather than an empty schema.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS (Go) |
| FHIR resource | MedicationRequest, MedicationDispense, MedicationStatement |

**Acceptance Criteria:**

```
AC-PH-001-01 (Prescription list endpoint)
  Given: A pharmacist opens the dispensing queue
  When: GET /api/v1/prescriptions?status=active
  Then:
    - Returns array of active prescriptions with: patient FHIR ID, medication name, DIN, dose, quantity, refills remaining, prescriber, issued_at, expires_at
    - Sorted by issued_at descending
    - Pagination: ?limit=25&offset=0
    - HTTP 200

AC-PH-001-02 (Prescription detail)
  Given: A pharmacist needs to review a specific prescription
  When: GET /api/v1/prescriptions/{id}
  Then:
    - Full prescription detail returned including dosage instructions, patient allergies (from EHR FHIR), notes
    - If the prescription is linked to a FHIR MedicationRequest, the MedicationRequest is fetched and merged

AC-PH-001-03 (Dispense recording)
  Given: A pharmacist dispenses a prescription
  When: POST /api/v1/dispenses with prescription_id, quantity, lot_number, expiry_date, dispensed_by
  Then:
    - dispenses row created
    - FHIR MedicationDispense resource created: status=completed, quantity, whenHandedOver
    - prescription.refills decremented
    - If refills = 0 and status = active: prescription.status = completed
    - HTTP 201 Created

AC-PH-001-04 (Authentication and role check)
  Given: Any request to /api/v1/prescriptions without a valid PHARMACIST or ADMIN role JWT
  When: The request is received
  Then:
    - HTTP 403 Forbidden
    - No data returned
    - Access attempt logged with actor, IP, timestamp
```

---

#### PH-002 — Electronic Prescription Intake (PrescribeIT)
**As a** pharmacist,
**I want to** receive electronic prescriptions from PrescribeIT-connected physicians automatically,
**So that** manual data entry is eliminated and prescription accuracy is guaranteed.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS |
| FHIR resource | MedicationRequest (PrescribeIT IG) |

**Acceptance Criteria:**

```
AC-PH-002-01 (Rx received from PrescribeIT)
  Given: A physician sends an e-prescription via PrescribeIT
  When: PharmacyMS receives the FHIR MedicationRequest
  Then:
    - The prescription is created in PharmacyMS prescriptions table
    - PrescribeIT prescription ID stored as identifier
    - Prescription appears in the dispensing queue within 30 seconds of transmission
    - Pharmacist sees: patient name, medication, dose, prescriber, pharmacy note

AC-PH-002-02 (Invalid or incomplete Rx rejection)
  Given: An incoming Rx is missing required fields (e.g. quantity)
  When: PharmacyMS receives the FHIR MedicationRequest
  Then:
    - Validation error is logged
    - The Rx is placed in an "Exception" queue for pharmacist review
    - A response is sent back to the prescribing system: "Prescription requires clarification — [field missing]"

AC-PH-002-03 (Fax / paper Rx entry)
  Given: A paper prescription is presented at the counter
  When: The pharmacist manually enters it
  Then:
    - All PrescribeIT fields are entered manually
    - A scan/image of the paper Rx is attached
    - Source is marked "Paper" (not electronic)
    - The pharmacist's credential number is stored as recorder

AC-PH-002-04 (Repeat Rx management)
  Given: A prescription has 3 refills authorised
  When: The patient requests a refill
  Then:
    - The refill count is checked: 2 remaining
    - A dispense is recorded and refills decremented to 1
    - At 0 refills: pharmacist is prompted "No refills remaining — contact prescriber"
    - A PrescribeIT refill request can be sent electronically to the prescriber
```

---

#### PH-003 — Drug Utilisation Review (DUR)
**As a** pharmacist,
**I want to** receive automated drug interaction, allergy, and duplicate therapy alerts when processing any prescription,
**So that** patient safety is maintained and I can exercise my professional judgment on each alert.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS |
| FHIR resource | DetectedIssue (FHIR DUR) |

**Acceptance Criteria:**

```
AC-PH-003-01 (Drug-allergy alert)
  Given: A patient with a penicillin allergy is prescribed amoxicillin
  When: The pharmacist opens the prescription for dispensing
  Then:
    - A hard-stop DUR alert fires: "DRUG-ALLERGY: Patient allergic to Penicillin — amoxicillin is a penicillin — CONTRAINDICATED"
    - A DetectedIssue resource is created: category=DALG, severity=high
    - The pharmacist cannot proceed without: (a) contacting prescriber, (b) documenting override reason
    - Override reason and pharmacist ID are logged

AC-PH-003-02 (Drug-drug interaction alert)
  Given: A patient is on warfarin and is prescribed fluconazole
  When: The DUR engine runs
  Then:
    - A DUR alert fires: "DDI: Warfarin + Fluconazole — increased INR risk (severe)"
    - DetectedIssue.severity = high
    - Pharmacist counselling note is required before dispensing

AC-PH-003-03 (Duplicate therapy)
  Given: A patient is already on metoprolol succinate and is prescribed metoprolol tartrate
  When: DUR runs
  Then:
    - Alert: "Duplicate therapy — two metoprolol formulations detected"
    - DetectedIssue.category = DUPE
    - Pharmacist must resolve before dispensing

AC-PH-003-04 (Drug-disease interaction)
  Given: A patient has COPD (from EHR problem list) and is prescribed propranolol
  When: DUR runs
  Then:
    - Alert: "Drug-Disease: Non-selective beta-blocker in COPD patient — may precipitate bronchospasm"
    - Pharmacist is informed but not hard-stopped (clinical judgment required)

AC-PH-003-05 (Alert severity levels)
  Given: DUR generates multiple alerts for one prescription
  When: The pharmacist views them
  Then:
    - Alerts are sorted: severe (red, hard-stop) first, moderate (amber, soft-stop) second, informational (blue) last
    - Each alert shows: type, drugs involved, severity, recommended action
    - Pharmacist can override soft-stop alerts with documented reason; hard-stop requires prescriber contact

AC-PH-003-06 (DUR engine drug database)
  Given: The DUR engine is configured
  When: Drug interactions are checked
  Then:
    - Database is sourced from a licensed interaction database (DrugBank CA or equivalent)
    - Database version and date are shown to pharmacist
    - Database is updated at minimum quarterly
```

---

#### PH-004 — Dispensing Workflow
**As a** pharmacist,
**I want to** follow a structured dispensing workflow (verify → fill → label → final check → dispense) with step-by-step documentation,
**So that** each dispensing event is fully traceable and errors are caught before the patient receives the medication.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS |
| FHIR resource | MedicationDispense |

**Acceptance Criteria:**

```
AC-PH-004-01 (Step 1 — Prescription verification)
  Given: A pharmacist opens a new prescription for dispensing
  When: They verify patient identity, Rx authenticity, and DUR completion
  Then:
    - Each verification step is checkmarked with pharmacist ID
    - DUR must show status=Reviewed before Step 2 is enabled
    - If paper Rx: pharmacist confirms it matches digital entry

AC-PH-004-02 (Step 2 — Pick and count)
  Given: Verification is complete
  When: The pharmacist fills the prescription (counts tablets, measures liquid)
  Then:
    - Lot number and expiry date are entered (mandatory)
    - Quantity dispensed is confirmed against prescribed quantity
    - If quantity differs (partial fill): reason is recorded (e.g. "stock shortage — remainder to follow")

AC-PH-004-03 (Step 3 — Label generation)
  Given: Fill quantities are confirmed
  When: The pharmacist clicks "Generate Label"
  Then:
    - Label is generated with: patient name, DOB, drug name (brand and generic), strength, dose instructions in plain English, prescriber name, pharmacy name, lot, expiry, dispensed by, date
    - Label is sent to the connected label printer
    - Auxiliary labels (e.g. "Take with food", "Avoid alcohol") are suggested based on drug class

AC-PH-004-04 (Step 4 — Final pharmacist check)
  Given: Label has been printed and applied to the bottle
  When: The pharmacist performs final visual check and clicks "Verified"
  Then:
    - Final check timestamp and pharmacist credential number are stored
    - MedicationDispense.performer includes pharmacist reference
    - Cannot be delegated to a technician (role check enforced)

AC-PH-004-05 (Step 5 — Patient counselling)
  Given: Dispensing is complete
  When: The pharmacist counsels the patient and clicks "Counselled"
  Then:
    - Counselling timestamp is stored
    - Key counselling points for the drug class are logged (e.g. "anticoagulant — bleeding risk discussed")
    - If patient declines counselling: "Patient declined counselling" is recorded
```

---

#### PH-005 — Ontario Drug Benefit (ODB) and Insurance Adjudication
**As a** pharmacist,
**I want to** adjudicate prescriptions against ODB and private insurance plans electronically,
**So that** the patient's co-pay is calculated correctly and the claim is submitted without manual billing.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS |
| FHIR resource | Claim, ClaimResponse (FHIR financial) |

**Acceptance Criteria:**

```
AC-PH-005-01 (ODB adjudication)
  Given: A patient is an ODB recipient (welfare, seniors, social assistance)
  When: The pharmacist submits the claim electronically to the Ontario Drug Program
  Then:
    - The claim is adjudicated in real time (< 5 seconds)
    - Approved: patient co-pay is calculated ($2–$6.11 per Rx)
    - Rejected: rejection reason code is shown and pharmacist is prompted to resolve

AC-PH-005-02 (Private insurance adjudication)
  Given: A patient has a group insurance plan
  When: The claim is submitted
  Then:
    - Real-time adjudication returns approved/denied and patient responsibility amount
    - Coordination of benefits (ODB first, private second) is handled automatically

AC-PH-005-03 (Prior authorisation)
  Given: A drug requires prior authorisation (e.g. biologic)
  When: The pharmacist attempts to adjudicate
  Then:
    - The adjudication response indicates PA required
    - The pharmacist can submit a PA request electronically
    - PA status is tracked: requested → pending → approved/denied

AC-PH-005-04 (Claim reversal)
  Given: A dispensed medication is returned (within policy)
  When: The pharmacist processes a return
  Then:
    - A claim reversal is submitted to ODB/insurer
    - MedicationDispense.status = entered-in-error
    - Inventory is restocked (if sealed and returnable per Health Canada)
```

---

#### PH-006 — Controlled Substance Tracking
**As a** pharmacist,
**I want to** track all controlled substance dispensing with double-count verification and report to Health Canada,
**So that** narcotics and controlled drugs are accounted for in compliance with the Controlled Drugs and Substances Act (CDSA).

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS |
| FHIR resource | MedicationDispense (extension: controlled-substance) |

**Acceptance Criteria:**

```
AC-PH-006-01 (Controlled substance flag)
  Given: A prescription for oxycodone is received
  When: The pharmacist opens it
  Then:
    - A "CONTROLLED SUBSTANCE — Schedule I" banner is prominently displayed
    - The dispensing workflow requires two staff members (pharmacist + tech double-count)
    - The narcotic register balance for oxycodone is shown: "On-hand: 124 tablets"

AC-PH-006-02 (Double count verification)
  Given: The pharmacist fills 30 oxycodone tablets
  When: The technician performs the count
  Then:
    - Technician enters their count: 30
    - If counts match: dispense proceeds; narcotic balance updated: 124 - 30 = 94
    - If counts differ: dispense is blocked; discrepancy report is created

AC-PH-006-03 (Narcotic register)
  Given: At end of day
  When: The narcotic register is reviewed
  Then:
    - A ledger shows all controlled dispensing events: drug, quantity, patient (last name + HCN last 4), pharmacist, time
    - Running balance is shown
    - The register is printable for Health Canada inspection

AC-PH-006-04 (Loss / theft reporting)
  Given: A narcotic count discrepancy is found
  When: The pharmacist initiates a loss report
  Then:
    - A loss/theft incident is recorded
    - Report is generated for submission to Health Canada (CDSA requirement)
    - Provincial regulatory body (OCP) is notified
```

---

#### PH-007 — Patient Medication Profile
**As a** pharmacist,
**I want to** view a complete medication profile for a patient including all active prescriptions, dispensing history, and DHDR data,
**So that** I can provide complete pharmaceutical care and identify therapy gaps.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS |
| FHIR resource | MedicationStatement, MedicationRequest, MedicationDispense |

**Acceptance Criteria:**

```
AC-PH-007-01 (Complete medication profile view)
  Given: A pharmacist opens a patient's medication profile
  When: The view loads
  Then:
    - All active prescriptions from PharmacyMS are shown
    - DHDR-sourced medications (dispensed at other pharmacies in Ontario) are shown with source label "DHDR"
    - Medications from EHR MedicationStatement (home medications, OTC) are shown with source label "EHR"
    - Allergies and intolerances from EHR are shown at the top

AC-PH-007-02 (DHDR query)
  Given: A patient presents at the pharmacy
  When: The pharmacist queries DHDR with the patient's HCN
  Then:
    - DHDR returns all medications dispensed in Ontario in the last 12 months (FHIR MedicationDispense query)
    - Results are displayed within 5 seconds
    - A consent check confirms the patient consents to the pharmacist accessing DHDR

AC-PH-007-03 (Therapy gap identification)
  Given: The pharmacist reviews the profile and sees metformin is listed but no diabetes-related supplies
  When: They flag a potential therapy gap
  Then:
    - A note is added: "Potential therapy gap — consider glucometer and test strips"
    - The note is visible to the prescribing physician via FHIR Communication
```

---

#### PH-008 — Medication Inventory and Stock Management
**As a** pharmacist or pharmacy manager,
**I want to** track drug inventory levels, receive low-stock alerts, and manage drug procurement,
**So that** the pharmacy never runs out of critical medications.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS |
| FHIR resource | N/A (inventory — operational) |

**Acceptance Criteria:**

```
AC-PH-008-01 (Stock level display)
  Given: The pharmacist opens the inventory module
  When: The page loads
  Then:
    - All stocked medications are shown with: DIN, drug name, strength, form, quantity on hand, reorder point, supplier
    - Medications below reorder point are highlighted in amber

AC-PH-008-02 (Stock decrement on dispense)
  Given: 30 metformin 500mg tablets are dispensed
  When: The dispense is confirmed
  Then:
    - Inventory for metformin 500mg decrements by 30 immediately
    - If remaining stock < reorder point (e.g. 100): a low-stock alert is generated

AC-PH-008-03 (Low-stock alert)
  Given: Amoxicillin drops below reorder threshold
  When: The next dispense pushes it below
  Then:
    - A notification is sent to the pharmacy manager: "LOW STOCK — Amoxicillin 250mg — 48 capsules remaining (reorder at 100)"
    - A suggested purchase order is created for manager approval

AC-PH-008-04 (Drug receipt)
  Given: A drug order from a wholesaler is received
  When: The manager enters the receipt (lot, quantity, expiry)
  Then:
    - Inventory is incremented
    - Lot number and expiry are stored for controlled substance tracking
    - Receipt is logged with supplier, invoice number, and timestamp
```

---

#### PH-009 — Compounding Module
**As a** pharmacist,
**I want to** document compounded preparations including formula, ingredients, and lot number,
**So that** compounded medications are traceable and NAPRA-compliant.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | PharmacyMS |
| FHIR resource | Medication (Medication.ingredient), MedicationDispense |

**Acceptance Criteria:**

```
AC-PH-009-01 (Compound formula recording)
  Given: A physician has prescribed a compounded cream (hydrocortisone 2.5% in aqueous cream)
  When: The pharmacist opens a new compound record
  Then:
    - Ingredients, strengths, quantities, and base are entered
    - Compounding pharmacist ID and date are recorded
    - BUD (beyond-use date) is calculated per USP/NAPRA guidelines and shown
    - A Medication resource is created with ingredient[] referencing each component

AC-PH-009-02 (Compound label)
  Given: A compound is prepared
  When: The label is generated
  Then:
    - Label includes: patient name, formula description, beyond-use date, storage conditions, compounding pharmacist
    - Matches NAPRA Model Standards for labelling

AC-PH-009-03 (Batch traceability)
  Given: Multiple units of a compound are prepared in one batch
  When: Individual units are dispensed
  Then:
    - Each dispense references the compound batch lot number
    - If a safety recall is needed, all units from the batch can be identified by lot number
```

---

#### PH-010 — Pharmacist-Initiated Therapy (Minor Ailment)
**As a** pharmacist in Ontario,
**I want to** assess, diagnose, and initiate treatment for minor ailments (as permitted under the Pharmacy Act 2021 expansion),
**So that** patients with UTI, allergic rhinitis, or other eligible conditions receive immediate care without waiting for a physician.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | PharmacyMS |
| FHIR resource | Encounter (pharmacist-led), Condition, MedicationRequest |

**Acceptance Criteria:**

```
AC-PH-010-01 (Minor ailment assessment)
  Given: A patient presents with symptoms of uncomplicated UTI
  When: The pharmacist selects "Minor Ailment Assessment" and completes the structured assessment form
  Then:
    - Assessment checklist (inclusion/exclusion criteria for UTI) is presented
    - If exclusion criteria met: "Refer to physician — outside scope of pharmacist therapy"
    - If eligible: pharmacist initiates a MedicationRequest for nitrofurantoin (first-line)

AC-PH-010-02 (Prescribing documentation)
  Given: A pharmacist initiates therapy
  When: The prescription is created
  Then:
    - The MedicationRequest.requester is the pharmacist's Practitioner resource
    - The Encounter type is "pharmacist-consultation"
    - ODB adjudication includes pharmacist prescriber number
    - The patient's family physician is notified via Communication resource

AC-PH-010-03 (Minor ailment scope guard)
  Given: A patient presents with chest pain
  When: The pharmacist opens the minor ailment module
  Then:
    - Chest pain is not in the Ontario-approved minor ailment list
    - The system prevents initiating therapy and shows: "Chest pain — outside minor ailment scope — refer immediately"
```

---

#### PH-011 — Pharmacy Billing and Adjudication Reporting
**As a** pharmacy owner / billing staff,
**I want to** generate ODB and private insurance claims reports and reconcile payments,
**So that** pharmacy revenue is accurately tracked and discrepancies identified.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS |
| FHIR resource | Claim, ClaimResponse, ExplanationOfBenefit |

**Acceptance Criteria:**

```
AC-PH-011-01 (Daily claims report)
  Given: The pharmacy has processed 120 prescriptions today
  When: The manager runs "Daily Claims Report"
  Then:
    - Report lists all claims: Rx number, drug, patient (anonymised), claim amount, ODB/insurer response, patient co-pay, paid amount
    - Totals by payer are shown
    - Export as CSV and PDF

AC-PH-011-02 (Rejected claims queue)
  Given: 5 claims were rejected by ODB today
  When: The billing staff opens the rejected claims queue
  Then:
    - Each rejected claim shows: Rx ID, rejection code, rejection reason in plain English, recommended action
    - Claims can be corrected and resubmitted from within the queue

AC-PH-011-03 (Reconciliation)
  Given: The ODB remittance advice has arrived
  When: The manager imports the remittance file
  Then:
    - Each remittance line is matched to a claim
    - Payment amounts are compared to adjudicated amounts
    - Discrepancies are flagged for review
```

---

#### PH-012 — Drug Recall Management
**As a** pharmacist,
**I want to** receive Health Canada drug recall alerts and identify affected patients automatically,
**So that** patients who received a recalled medication are notified promptly.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS |
| FHIR resource | DetectedIssue (recall), Communication |

**Acceptance Criteria:**

```
AC-PH-012-01 (Recall alert receipt)
  Given: Health Canada issues a Class I recall for a specific lot of metformin
  When: The recall is entered into PharmacyMS (manually or via automated Health Canada feed)
  Then:
    - All dispenses with the recalled DIN and lot number are identified
    - The affected patient list is shown with: patient name, contact, dispense date, quantity

AC-PH-012-02 (Patient notification)
  Given: 12 patients received the recalled lot
  When: The pharmacist initiates outreach
  Then:
    - SMS/email notifications are sent to all 12 patients: "Important — medication recall — please return your [drug name]"
    - Communication resources are created for each notification
    - A recall incident report is generated for Health Canada

AC-PH-012-03 (Recalled stock quarantine)
  Given: Recalled stock remains in inventory
  When: The pharmacist flags it
  Then:
    - Inventory is quarantined (cannot be dispensed)
    - A "RECALLED" label is applied to the inventory record
    - A return-to-wholesaler shipment is initiated
```

---

#### PH-013 — Medication Refill Reminder
**As a** pharmacist,
**I want to** configure automatic refill reminders for patients with chronic medications,
**So that** patients do not run out of essential medications like blood pressure pills or insulin.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | PharmacyMS |
| FHIR resource | CommunicationRequest (scheduled) |

**Acceptance Criteria:**

```
AC-PH-013-01 (Refill reminder configuration)
  Given: A patient has atorvastatin with refills remaining
  When: The pharmacist enables refill reminders and sets threshold to "5 days before estimated run-out"
  Then:
    - The system calculates estimated run-out based on quantity dispensed and frequency
    - A scheduled CommunicationRequest is created for 5 days before run-out

AC-PH-013-02 (Reminder delivery)
  Given: A refill reminder is due
  When: The scheduled date arrives
  Then:
    - SMS/email is sent: "Your [drug name] refill is due. Call us at [pharmacy phone] or use our online refill request."
    - Communication.status = completed when delivered

AC-PH-013-03 (Auto-refill option)
  Given: A patient has opted into auto-refill for a chronic medication
  When: The estimated run-out is 7 days away and refills remain
  Then:
    - The prescription is automatically queued for dispensing
    - Patient is notified: "Your [drug name] has been prepared. Pick up at [pharmacy] from [date]."
    - Auto-refill action is logged with reason "auto-refill" in dispense record

AC-PH-013-04 (Opt-out)
  Given: A patient wishes to opt out of refill reminders
  When: They indicate this preference (via portal or in-person)
  Then:
    - CommunicationRequest.status = revoked for future reminders
    - Opt-out preference is stored in patient record
    - The opt-out is logged with timestamp and method
```

---

#### PH-014 — Pharmacist Counselling Record
**As a** pharmacist,
**I want to** document patient counselling interactions including topics covered and patient understanding assessment,
**So that** professional documentation demonstrates duty of care and supports continuity of care.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | PharmacyMS |
| FHIR resource | Communication (counselling) |

**Acceptance Criteria:**

```
AC-PH-014-01 (Counselling record creation)
  Given: A pharmacist has counselled a patient on a new anticoagulant
  When: They complete the counselling record
  Then:
    - Topics covered are checked from a predefined list: mechanism, dosing, side effects, interactions, when to seek medical attention, missed dose, storage
    - Patient understanding assessment is recorded: Demonstrated understanding / Verbal acknowledgement / Written materials provided
    - A Communication resource is created with sender (pharmacist), recipient (patient), topic list, and timestamp

AC-PH-014-02 (Patient decline documentation)
  Given: A patient declines counselling (in a rush)
  When: The pharmacist records this
  Then:
    - Communication.status = stopped
    - Note: "Patient declined counselling — offered educational leaflet"
    - This protects the pharmacist from liability for undocumented outcomes

AC-PH-014-03 (Interpreter used)
  Given: The patient does not speak English and an interpreter was used
  When: The pharmacist records the counselling
  Then:
    - Interpreter language and method (in-person, telephone, relative) are documented
    - Communication.extension:interpreter-used is set
```

---

#### PH-015 — NAPRA / OCP Compliance Reporting
**As a** pharmacy manager,
**I want to** generate compliance reports for the Ontario College of Pharmacists (OCP),
**So that** the pharmacy meets its professional regulatory obligations.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | PharmacyMS |
| FHIR resource | N/A (regulatory reports) |

**Acceptance Criteria:**

```
AC-PH-015-01 (Narcotic reporting)
  Given: End of month
  When: The manager runs the narcotics report
  Then:
    - Report covers all CDSA Schedule I/II/III narcotics: DIN, opening balance, received, dispensed, closing balance
    - Format matches Health Canada reporting requirements
    - Report is exportable as PDF for filing

AC-PH-015-02 (DUR performance report)
  Given: OCP requests DUR statistics
  When: The manager runs the DUR report
  Then:
    - Report shows: number of DUR alerts generated, overridden, acted upon; by alert type and severity
    - Trend over rolling 12 months
    - Identifies prescriber patterns for pharmacist intervention
```

---

#### PH-016 — Blister Pack / Compliance Packaging
**As a** pharmacy technician or pharmacist,
**I want to** prepare compliance packaging (blister packs/bubble packs) for patients requiring medication management support,
**So that** patients with polypharmacy or cognitive impairment receive their correct medications at the right time.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | PharmacyMS |
| FHIR resource | MedicationDispense (packaging: blister-pack) |

**Acceptance Criteria:**

```
AC-PH-016-01 (Blister pack schedule)
  Given: A patient has 8 medications on their profile eligible for blister pack
  When: The pharmacist creates a blister pack schedule
  Then:
    - All eligible medications are listed by time-of-day slot: AM / Noon / PM / Bedtime
    - The schedule is saved and linked to the patient's medication profile
    - A printed blister pack schedule is generated for the patient

AC-PH-016-02 (Blister pack dispense)
  Given: A 4-week blister pack is prepared
  When: It is dispensed
  Then:
    - A MedicationDispense per medication is created for the 4-week period
    - Lot numbers and expiry dates are linked to each drug slot
    - Label on the blister pack: patient name, DOB, medications, dosing times, pharmacist

AC-PH-016-03 (Drug change in active pack)
  Given: A physician changes a patient's dose mid-blister-pack cycle
  When: The pharmacist receives the new prescription
  Then:
    - The pharmacist is alerted: "Blister pack in use — dose change requires pack remake"
    - The pharmacist documents whether the pack was remade or the patient was counselled on the change
    - The original pack is documented as superseded
```

---

#### PH-017 — Pharmacist-to-Prescriber Messaging
**As a** pharmacist,
**I want to** send a secure clinical message to the prescribing physician regarding a prescription concern,
**So that** DUR issues, clarifications, and therapy concerns are resolved quickly without using insecure fax.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | PharmacyMS + EHR |
| FHIR resource | Communication (pharmacist-to-physician) |

**Acceptance Criteria:**

```
AC-PH-017-01 (Send message to prescriber)
  Given: The pharmacist has a DUR concern about a prescription
  When: They click "Message Prescriber" and compose a message
  Then:
    - A Communication resource is created: sender=pharmacist Practitioner, recipient=prescriber Practitioner, payload=message text, about=MedicationRequest
    - The prescriber sees the message in their EHR Communications inbox within 60 seconds
    - The pharmacist receives read receipt when the prescriber opens it

AC-PH-017-02 (Response from prescriber)
  Given: A prescriber replies to the pharmacist message
  When: The reply is sent from EHR
  Then:
    - The pharmacist sees the reply in PharmacyMS Communications
    - A notification appears in PharmacyMS: "New reply from Dr. [name] regarding [drug]"

AC-PH-017-03 (Urgent flag)
  Given: A DUR concern is time-critical (patient is waiting to pick up)
  When: The pharmacist marks the message "URGENT"
  Then:
    - The prescriber receives an immediate push notification (not just inbox message)
    - An SLA timer starts: "Awaiting prescriber response — critical"
```

---

#### PH-018 — Patient Identity Verification at Pickup
**As a** pharmacist or technician,
**I want to** verify a patient's identity before releasing a prescription,
**So that** medications are never given to the wrong person.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS |
| FHIR resource | Patient |

**Acceptance Criteria:**

```
AC-PH-018-01 (Two-identifier check at pickup)
  Given: A person comes to pick up a prescription
  When: The technician asks for name and DOB
  Then:
    - The name and DOB are verified against the patient record
    - If match: prescription is released
    - If mismatch: prescription is held and supervisor is alerted

AC-PH-018-02 (Proxy pickup)
  Given: A patient's family member picks up their prescription
  When: The proxy presents authorisation (verbal or written)
  Then:
    - Proxy name and relationship are recorded in the MedicationDispense.destination.name
    - The prescription is released to the proxy
    - Note: "Picked up by [proxy name] — [relationship]"

AC-PH-018-03 (Photo ID for controlled substances)
  Given: A patient picks up a Schedule I narcotic
  When: The technician processes the pickup
  Then:
    - Photo ID is required (not optional for controlled substances)
    - ID type and last 4 digits are recorded (no full ID stored)
    - The pharmacist must be present for all narcotic dispensing — tech alone cannot complete
```


---

### 4.5 Pharmacy Technician (PT)

---

#### PT-001 — Technician Work Queue
**As a** pharmacy technician,
**I want to** see a work queue of prescriptions to fill, sorted by waiting time and prescription type,
**So that** I can work efficiently and prioritise urgent fills.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS |
| FHIR resource | MedicationRequest |

**Acceptance Criteria:**

```
AC-PT-001-01 (Queue view)
  Given: The technician opens the fill queue
  When: The page loads
  Then:
    - Prescriptions pending fill are shown: patient name, drug, qty, prescriber, wait time, type (new/refill/STAT)
    - STAT and urgent fills are at the top
    - Each row shows estimated fill time based on drug type

AC-PT-001-02 (Claim a fill)
  Given: The technician clicks "Claim" on a prescription
  When: The claim is registered
  Then:
    - The prescription is marked "In Progress — [technician name]"
    - Other technicians cannot claim the same prescription
    - Timer starts for the fill (SLA monitoring)

AC-PT-001-03 (Real-time queue updates)
  Given: A new electronic prescription arrives from PrescribeIT
  When: The technician has the queue open
  Then:
    - The new Rx appears within 5 seconds without page refresh (WebSocket)
    - If STAT: an audio alert sounds
```

---

#### PT-002 — Label Printing
**As a** pharmacy technician,
**I want to** print medication labels from within the dispensing workflow,
**So that** labels are generated automatically and accurately from the prescription data.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS |
| FHIR resource | MedicationDispense |

**Acceptance Criteria:**

```
AC-PT-002-01 (Label generation)
  Given: A prescription fill is in progress
  When: The technician clicks "Print Label"
  Then:
    - Label is generated with: patient name, DOB, drug (brand + generic), strength, dose instructions (plain English, both EN and FR for bilingual regions), prescriber, dispensing pharmacist, pharmacy address/phone, Rx number, quantity, lot, expiry, date dispensed
    - Label is sent to the connected Zebra or similar label printer via IPP/network print
    - Print confirmation is received within 5 seconds

AC-PT-002-02 (Auxiliary labels)
  Given: The drug is an anticoagulant
  When: The label is generated
  Then:
    - Auxiliary warning labels are suggested: "BLOOD THINNER — increases risk of bleeding"
    - Technician confirms which auxiliary labels to print
    - Selected auxiliary labels are printed automatically

AC-PT-002-03 (Label reprint)
  Given: A label is smudged or damaged
  When: The technician clicks "Reprint"
  Then:
    - An identical label is reprinted
    - Reprint event is logged with reason and technician ID
```

---

#### PT-003 — Pharmacist Final Verification Step
**As a** pharmacy technician,
**I want to** submit a completed fill for pharmacist final verification before release,
**So that** no prescription is released to a patient without a pharmacist check.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS |
| FHIR resource | Task (verification step) |

**Acceptance Criteria:**

```
AC-PT-003-01 (Submit for verification)
  Given: A technician has completed filling and labelling
  When: They click "Submit for Pharmacist Verification"
  Then:
    - A Task is created: code=final-check, owner=on-duty pharmacist, status=requested
    - The prescription moves to the pharmacist's verification queue
    - The technician cannot release the prescription to the patient

AC-PT-003-02 (Pharmacist passes verification)
  Given: The pharmacist checks the filled prescription
  When: They click "Verified — OK to Dispense"
  Then:
    - Task.status = completed
    - MedicationDispense.status = "in-progress" (ready for patient)
    - The prescription moves to the "Ready for Pickup" queue

AC-PT-003-03 (Pharmacist rejects fill)
  Given: The pharmacist finds an error (wrong tablet strength)
  When: They click "Reject — Return to Tech"
  Then:
    - Task.status = on-hold
    - The prescription is returned to the technician's queue with rejection reason
    - An alert fires to the technician: "Fill rejected — [reason] — please redo"
```

---

#### PT-004 — Ready for Pickup Queue
**As a** pharmacy technician,
**I want to** manage a "ready for pickup" queue so patients are served efficiently,
**So that** wait times at the counter are minimised.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS |
| FHIR resource | MedicationDispense |

**Acceptance Criteria:**

```
AC-PT-004-01 (Ready queue)
  Given: A prescription passes final pharmacist check
  When: The patient comes to the counter
  Then:
    - The technician can search by patient name or Rx number
    - Prescriptions for the patient are shown with status "Ready"
    - Multiple Rxs for same patient are grouped together

AC-PT-004-02 (Patient identity check at pickup)
  Given: A person requests a prescription
  When: The technician verifies name and DOB
  Then:
    - If identity confirmed: prescription is released, MedicationDispense.status = completed, whenHandedOver = now
    - If identity fails: prescription is withheld, technician calls pharmacist

AC-PT-004-03 (Waiting time display)
  Given: Prescriptions are waiting more than 20 minutes for pickup
  When: The queue is viewed
  Then:
    - Long-wait rows are highlighted
    - At 60+ minutes: a note prompt is shown "Contact patient to inform of ready status"
```

---

#### PT-005 — Fax / Image Prescription Entry
**As a** pharmacy technician,
**I want to** enter prescriptions received by fax or image (OCR-assisted),
**So that** paper-based prescriptions are digitised quickly and accurately.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | PharmacyMS |
| FHIR resource | MedicationRequest, DocumentReference |

**Acceptance Criteria:**

```
AC-PT-005-01 (Fax receipt and scan)
  Given: A fax arrives at the pharmacy fax machine
  When: The technician uploads the fax image
  Then:
    - OCR extracts: prescriber name, drug, dose, quantity, refills, patient name (when possible)
    - OCR fields are pre-populated in the Rx entry form
    - The original fax image is stored as a DocumentReference

AC-PT-005-02 (OCR accuracy review)
  Given: OCR has extracted data
  When: The technician reviews the form
  Then:
    - All OCR-populated fields are highlighted for review
    - Technician confirms or corrects each field
    - After review, source = "fax" is recorded on the MedicationRequest

AC-PT-005-03 (Pharmacist must verify fax Rx)
  Given: A fax prescription is entered by a technician
  When: Saved
  Then:
    - The Rx is automatically submitted to the pharmacist verification queue
    - The pharmacist must view the original fax image and confirm before any dispensing
```

---

#### PT-006 — Patient Delivery / Curbside Tracking
**As a** pharmacy technician,
**I want to** track medications that are being delivered to patients (curbside pickup, home delivery),
**So that** every prescription can be accounted for and proof of delivery is recorded.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | PharmacyMS |
| FHIR resource | MedicationDispense.destination, Task |

**Acceptance Criteria:**

```
AC-PT-006-01 (Delivery dispatch)
  Given: A patient has requested home delivery
  When: A delivery is scheduled
  Then:
    - MedicationDispense.destination is set to the patient's address
    - A delivery Task is created with expected delivery date
    - The delivery driver (or courier) is assigned to the Task

AC-PT-006-02 (Proof of delivery)
  Given: The medication is delivered
  When: The driver marks delivery complete (mobile app or scan)
  Then:
    - Task.status = completed
    - MedicationDispense.whenHandedOver = delivery timestamp
    - Patient is notified: "Your medication was delivered at [time]"

AC-PT-006-03 (Failed delivery)
  Given: A delivery attempt fails (no answer)
  When: The driver marks as failed
  Then:
    - A second delivery attempt is scheduled
    - After 2 failed attempts: the pharmacy is notified to contact the patient
    - Medication is returned to pharmacy inventory as "undelivered — pending return"
```

---

#### PT-007 — Scope of Practice Enforcement
**As a** pharmacy technician,
**I want to** have actions that require a pharmacist (DUR override, controlled substance dispense, final check) automatically flagged and routed,
**So that** I cannot accidentally perform actions outside my scope of practice.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | PharmacyMS |
| FHIR resource | Task (role-gated workflow) |

**Acceptance Criteria:**

```
AC-PT-007-01 (Action blocked — DUR override)
  Given: A technician fills a prescription that has a DUR alert
  When: They attempt to override the alert
  Then:
    - The override button is disabled for TECHNICIAN role
    - Message: "DUR override requires pharmacist authorisation"
    - A Task is created: "DUR override — pharmacist decision required"

AC-PT-007-02 (Controlled substance — pharmacist required)
  Given: A technician tries to complete a narcotic dispense
  When: They click "Complete Dispense" for a Schedule I drug
  Then:
    - The final complete step is blocked: "Pharmacist must authorise narcotic dispense"
    - On-duty pharmacist is alerted

AC-PT-007-03 (Audit trail of scope enforcement)
  Given: A blocked action was attempted
  When: The audit log is reviewed
  Then:
    - The attempt is logged: technician ID, action attempted, timestamp, block reason
    - These events are reportable to OCP for regulatory compliance
```

---

#### PT-008 — Medication Unit Dose Packaging (Hospital)
**As a** pharmacy technician (hospital pharmacy),
**I want to** prepare unit-dose medications for inpatient dispensing to specific patient wards,
**So that** nurses can administer the right medication at the right time from the correct unit-dose package.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | PharmacyMS |
| FHIR resource | MedicationDispense (inpatient), Location (ward) |

**Acceptance Criteria:**

```
AC-PT-008-01 (Unit dose preparation)
  Given: An inpatient MedicationRequest is received from the eMAR
  When: The technician prepares the unit dose
  Then:
    - Each dose is labelled individually: patient name, ward, drug, dose, time of administration, pharmacist verify stamp
    - The dose is associated with the patient's MedicationAdministration record via MedicationDispense

AC-PT-008-02 (Ward delivery tracking)
  Given: A batch of unit doses is prepared for a ward
  When: The delivery is confirmed at the ward
  Then:
    - All doses in the batch are marked as delivered to Location (ward)
    - Nursing eMAR is updated: "Medication available — ready to administer"

AC-PT-008-03 (Waste documentation)
  Given: A nurse administers only half a unit dose (e.g. partial ampule of morphine)
  When: The waste is documented
  Then:
    - Wastage amount is recorded with witness pharmacist/nurse ID
    - Controlled substance balance is updated
```

---

#### PT-009 — Auto-Refill Processing (Technician-Initiated)
**As a** pharmacy technician,
**I want to** process auto-refill prescriptions in a batch at the start of the day,
**So that** recurring patients' medications are ready without requiring them to call.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | PharmacyMS |
| FHIR resource | MedicationRequest, MedicationDispense |

**Acceptance Criteria:**

```
AC-PT-009-01 (Auto-refill batch)
  Given: It is 8:00 AM and 15 patients have auto-refill Rxs due today
  When: The technician opens the auto-refill queue
  Then:
    - The 15 Rxs are shown with: patient name, drug, days supply, refills remaining, last fill date
    - All are marked with auto-refill enabled status

AC-PT-009-02 (Batch processing)
  Given: The technician selects all 15 and clicks "Process All"
  When: Batch runs
  Then:
    - For each Rx: DUR check is run automatically; if any flags exist, that Rx is paused for pharmacist review
    - Rx with no DUR issues: fill workflow begins
    - A report shows: X processed successfully, Y flagged for review

AC-PT-009-03 (Refills exhausted guard)
  Given: A patient's Rx has 0 refills remaining in the auto-refill queue
  When: Processing is attempted
  Then:
    - The Rx is removed from auto-refill
    - Patient is notified: "Your refill for [drug] cannot be processed — no refills remaining. Contact your doctor."
    - Pharmacist is prompted to send a fax/electronic renewal request to the prescriber
```

---

### 4.6 Patient (PA)

---

#### PA-001 — Patient Portal — Dedicated Shell
**As a** patient,
**I want to** access a patient-specific portal (not the clinician EHR shell),
**So that** I have an appropriate, privacy-respecting interface designed for my needs, without seeing clinical staff tools.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Patient |

**Acceptance Criteria:**

```
AC-PA-001-01 (Patient-specific layout)
  Given: A user with role=PATIENT logs in
  When: They are redirected post-login
  Then:
    - They land on /patient/dashboard — not /dashboard (shared dashboard)
    - The shell has a simplified navigation: My Appointments / My Records / Messages / Profile
    - No clinical staff modules (encounters, orders, analytics) are visible or accessible
    - Attempting to navigate to /doctor/* or /admin/* returns 403

AC-PA-001-02 (Mobile responsive)
  Given: A patient opens the portal on a smartphone (375px wide)
  When: The page loads
  Then:
    - All content is readable and operable at 375px
    - Navigation collapses to a hamburger menu
    - Touch targets are minimum 44x44px

AC-PA-001-03 (Accessibility — patient portal)
  Given: A patient using a screen reader opens the portal
  When: They navigate the page
  Then:
    - All interactive elements have accessible names (aria-label or visible label)
    - Page structure uses proper heading hierarchy (h1 → h2 → h3)
    - Colour contrast meets WCAG 2.2 AA (4.5:1 for text)
    - Error messages are associated with form fields via aria-describedby

AC-PA-001-04 (Session timeout)
  Given: A patient session is idle for 15 minutes
  When: The timeout fires
  Then:
    - A modal warns: "Your session will expire in 2 minutes due to inactivity"
    - If no response: session is terminated and patient is redirected to /login
    - PHI is not left exposed on the screen
```

---

#### PA-002 — Appointment Self-Booking
**As a** patient,
**I want to** book, reschedule, and cancel appointments directly from the patient portal,
**So that** I do not need to call the clinic during business hours.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Appointment, Slot, Schedule |

**Acceptance Criteria:**

```
AC-PA-002-01 (View available slots)
  Given: A patient needs to book a cardiology follow-up
  When: They click "Book Appointment" and select appointment type "Follow-up"
  Then:
    - Available Slot resources for the requested specialty and appointment type are shown in a calendar view
    - Slots are shown in the patient's local timezone
    - Next 4 weeks of availability are shown by default

AC-PA-002-02 (Book a slot)
  Given: A patient selects a slot on Tuesday at 10:30 AM
  When: They confirm booking
  Then:
    - Appointment resource is created: status=booked, participant (patient + practitioner), start/end time, appointmentType
    - The patient receives a confirmation email/SMS with: date, time, clinic address, appointment type, cancellation instructions
    - The slot status changes to "busy"

AC-PA-002-03 (Reschedule)
  Given: An appointment is booked and the patient needs a different time
  When: They click "Reschedule" and select a new slot
  Then:
    - Original Appointment.status = cancelled (reason: patient-reschedule)
    - New Appointment is created for the new slot
    - Both patient and clinic receive notification of the change

AC-PA-002-04 (Cancellation with 24h notice)
  Given: A patient cancels an appointment >24 hours before the scheduled time
  When: They click "Cancel" and select a reason
  Then:
    - Appointment.status = cancelled
    - The slot is released back to available
    - Cancellation reason is stored in Appointment.cancelationReason
    - The clinic's receptionist is notified

AC-PA-002-05 (Late cancellation warning)
  Given: A patient tries to cancel within 24 hours of the appointment
  When: They click "Cancel"
  Then:
    - A warning: "Cancelling less than 24 hours before your appointment may result in a cancellation fee"
    - Patient must confirm to proceed
    - Cancellation is logged with timestamp and late-cancel flag

AC-PA-002-06 (Booking limit)
  Given: A patient already has 2 upcoming appointments
  When: They try to book a third appointment of the same type
  Then:
    - A check prevents more than [configurable] concurrent active appointments of the same type
    - Message: "You have upcoming appointments already booked — view them before booking another"

AC-PA-002-07 (Waitlist)
  Given: No slots are available in the next 4 weeks
  When: The patient requests to be added to the waitlist
  Then:
    - A waitlist entry is created
    - When a slot opens, the patient is automatically notified by email/SMS
    - Waitlist position is shown to the patient
```

---

#### PA-003 — Appointment Reminders
**As a** patient,
**I want to** receive automated reminders before my appointment,
**So that** I do not forget and the clinic reduces no-shows.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Communication (appointment reminder) |

**Acceptance Criteria:**

```
AC-PA-003-01 (Email reminder)
  Given: An appointment is booked 7+ days in advance
  When: The appointment date is 3 days away
  Then:
    - An email reminder is sent with: date, time, clinic location, physician name, appointment type, cancellation link
    - Communication resource is created: status=completed, medium=email, sent_at

AC-PA-003-02 (SMS reminder)
  Given: A patient has a registered mobile phone
  When: The appointment is 24 hours away
  Then:
    - An SMS is sent: "Reminder: appointment with Dr. [name] tomorrow at [time] at [clinic]. Reply CANCEL to cancel."
    - If patient replies CANCEL: appointment is cancelled, Communication logs the reply

AC-PA-003-03 (Reminder preferences)
  Given: A patient prefers no reminders
  When: They set preference to "No reminders" in their profile
  Then:
    - No reminder Communications are created for that patient
    - The preference is stored in Patient.communication.preferred = false for reminders
    - Preference is respected immediately (even for booked appointments)

AC-PA-003-04 (Bilingual reminder)
  Given: A patient's preferred language is French
  When: Reminders are generated
  Then:
    - Reminder content is in French
    - If patient bilingual: email in French, SMS in French
```

---

#### PA-004 — Pre-Visit Questionnaire (Online Intake)
**As a** patient,
**I want to** complete my intake questionnaire online before my appointment,
**So that** my visit is more efficient and the clinical team has my history before I arrive.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Questionnaire, QuestionnaireResponse |

**Acceptance Criteria:**

```
AC-PA-004-01 (Questionnaire access)
  Given: An appointment is booked and intake forms are enabled for the appointment type
  When: The patient receives a form link (email/portal notification)
  Then:
    - They can access the questionnaire without logging in (secure token link)
    - The questionnaire covers: reason for visit, symptom history, current medications, allergies, past medical history

AC-PA-004-02 (Progress save)
  Given: A patient is mid-way through the questionnaire and closes the browser
  When: They return using the same link
  Then:
    - Their saved responses are restored (draft QuestionnaireResponse.status=in-progress)
    - They can continue from where they left off

AC-PA-004-03 (Submission and acknowledgement)
  Given: The patient submits the completed form
  When: Submission is confirmed
  Then:
    - QuestionnaireResponse.status = completed
    - Confirmation screen: "Thank you — your information has been received"
    - The triage nurse and physician are notified the form is available
    - PRE_VISIT_FORMS state advances to APPOINTMENT_CONFIRMED in the visit FSM

AC-PA-004-04 (FHIR extraction)
  Given: A patient reports taking metformin 1000mg daily in the questionnaire
  When: Clinical staff review it
  Then:
    - The reported medication is extractable as a MedicationStatement draft
    - The nurse confirms it at triage before it becomes official
    - Allergies are extracted as AllergyIntolerance drafts for nurse verification

AC-PA-004-05 (Language support)
  Given: A patient selects French
  When: The questionnaire renders
  Then:
    - All questions are in French
    - Instructions and help text are in French
    - Response options use French SNOMED synonyms where available
```

---

#### PA-005 — Secure Messaging to Care Team
**As a** patient,
**I want to** send and receive secure messages with my care team through the patient portal,
**So that** I can ask questions and receive advice without using unsecured email or waiting for a phone appointment.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Communication |

**Acceptance Criteria:**

```
AC-PA-005-01 (Send message)
  Given: A patient opens the Messages section
  When: They compose a message to their care team and click "Send"
  Then:
    - A Communication resource is created: sender=Patient, recipient=care team (PractitionerRole), payload=message text
    - The message appears in the clinical team's message inbox within 30 seconds
    - Patient sees "Sent — [timestamp]"

AC-PA-005-02 (Receive reply)
  Given: The physician sends a reply
  When: The patient logs in or receives notification
  Then:
    - The reply appears in the patient's message thread
    - A push notification is sent to the patient's device or email: "New message from your care team"

AC-PA-005-03 (Emergency disclaimer)
  Given: A patient opens the messaging interface
  When: The compose box is shown
  Then:
    - A permanent disclaimer: "Do not use this service for emergencies. Call 911 or go to your nearest emergency room."
    - The disclaimer is not dismissible

AC-PA-005-04 (Message retention)
  Given: A message thread exists
  When: The patient views it 2 years later
  Then:
    - Messages are retained for a minimum of 10 years (Ontario PHIPA retention requirement)
    - Older messages are archived but still accessible

AC-PA-005-05 (Clinician response time SLA)
  Given: A patient sends a message
  When: 2 business days pass without a reply
  Then:
    - An automatic reminder fires to the clinical team: "Patient message unanswered — 2 business days"
    - The patient sees status: "Awaiting response from care team"
```

---

#### PA-006 — Lab Results Patient Access
**As a** patient,
**I want to** view my laboratory results in the patient portal with plain-language explanations,
**So that** I am informed about my health and can prepare questions for my next appointment.

**See LT-017 — cross-reference. Acceptance criteria are defined there.**

---

#### PA-007 — Medication List View (Patient-Facing)
**As a** patient,
**I want to** view my current medication list in the patient portal,
**So that** I can review what I am taking, understand the purpose of each medication, and report discrepancies.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | MedicationRequest, MedicationStatement |

**Acceptance Criteria:**

```
AC-PA-007-01 (Medication list view)
  Given: A patient opens "My Medications"
  When: The page loads
  Then:
    - All active MedicationRequest and MedicationStatement are shown
    - Each medication shows: drug name (brand and generic), dose, frequency, what it is for (indication), prescriber, start date
    - Discontinued medications are in a "Past Medications" section (collapsed by default)

AC-PA-007-02 (Plain-language indication)
  Given: The patient views metoprolol succinate 50mg
  When: Indication is shown
  Then:
    - Indication is "For your heart rate / atrial fibrillation" (plain English, not ICD-10 code)
    - A "Learn more" link opens a patient education resource about the drug

AC-PA-007-03 (Discrepancy report)
  Given: A patient sees a medication they are not taking
  When: They click "I am not taking this"
  Then:
    - A discrepancy flag is sent to the care team as a Communication
    - The patient sees: "Your care team has been notified of the discrepancy"
    - A task is created in the physician's queue: "Patient reports not taking [drug] — verify med rec"
```

---

#### PA-008 — Health Summary View (Patient)
**As a** patient,
**I want to** see a consolidated health summary including active conditions, allergies, immunisations, and recent results,
**So that** I have a complete picture of my health in one place.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Composition (IPS — FHIR International Patient Summary) |

**Acceptance Criteria:**

```
AC-PA-008-01 (Health summary display)
  Given: A patient opens "My Health Summary"
  When: The page loads
  Then:
    - Sections shown: Active Conditions (problem list), Allergies (AllergyIntolerance), Current Medications, Immunisations, Recent Results (last 90 days)
    - Each section uses plain language (no ICD codes, no LOINC codes shown to patient)

AC-PA-008-02 (IPS document generation)
  Given: A patient requests their International Patient Summary
  When: They click "Download Health Summary PDF"
  Then:
    - A FHIR IPS Bundle is generated (Composition type LOINC 60591-5)
    - The Bundle is rendered as a structured PDF
    - PHI audit event: patient self-served IPS document

AC-PA-008-03 (Share with another provider)
  Given: A patient sees a new specialist who is not in the same system
  When: The patient clicks "Share with Provider"
  Then:
    - A time-limited secure link (24h) is generated containing the IPS Bundle
    - The patient can share the link with any provider
    - Link access is logged
```

---

#### PA-009 — PHIPA Privacy Consent Management
**As a** patient,
**I want to** view and manage my privacy consents including who can access my records and what can be shared,
**So that** I have control over my personal health information as guaranteed by PHIPA.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Consent |

**Acceptance Criteria:**

```
AC-PA-009-01 (View consents)
  Given: A patient opens the Privacy section
  When: The page loads
  Then:
    - All active Consent records are shown: what they cover, who they are with, date granted, expiry
    - Consent types shown: treatment consent, data sharing consent, research consent, marketing

AC-PA-009-02 (Revoke consent)
  Given: A patient wants to revoke data sharing consent with a specific provider
  When: They click "Revoke" and confirm
  Then:
    - Consent.status = inactive
    - The restricted provider's access to the patient's FHIR resources is immediately blocked
    - A communication is sent to the restricted provider: "Patient has revoked consent"
    - Revocation is logged with timestamp

AC-PA-009-03 (Consent for research)
  Given: A patient is invited to participate in a research study
  When: They review and accept the consent form
  Then:
    - A Consent resource is created: scope=research, study reference included
    - Consent timestamp and electronic signature (checked box + IP) are stored

AC-PA-009-04 (Request copy of PHI)
  Given: A patient wants a copy of their health record
  When: They click "Request My Records"
  Then:
    - A request is queued for the privacy officer
    - Patient is notified of the expected timeline (PHIPA: within 30 days)
    - When fulfilled: a PDF/document is sent to the patient securely
```

---

#### PA-010 — Immunisation History View
**As a** patient,
**I want to** view my immunisation record in the patient portal,
**So that** I know which vaccines I have received and when.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Immunization |

**Acceptance Criteria:**

```
AC-PA-010-01 (Immunisation list)
  Given: A patient opens "My Immunisations"
  When: The page loads
  Then:
    - All recorded Immunization resources are listed: vaccine name, date given, lot number, administering provider
    - Ontario Immunization Connect (COVax / DHDR) data is included if available

AC-PA-010-02 (Missing vaccine alert)
  Given: A patient has not received a recommended adult immunisation (e.g. tetanus booster overdue by 2 years)
  When: The immunisation view loads
  Then:
    - An alert shows: "Tetanus booster may be overdue — last received [date] — recommended every 10 years"
    - A "Schedule appointment" button links directly to the appointment booking

AC-PA-010-03 (Immunisation PDF download)
  Given: A patient needs proof of vaccination for travel or employment
  When: They click "Download immunisation record"
  Then:
    - A PDF showing all vaccines with dates and lot numbers is generated
    - PHI audit event logged
```

---

#### PA-011 — Virtual Visit Join
**As a** patient,
**I want to** join a scheduled telemedicine video call directly from the patient portal,
**So that** I do not need to install separate software or manage separate login credentials.

**See DR-014 — cross-reference. Patient-side acceptance criteria:**

```
AC-PA-011-01 (Patient join link)
  Given: A telemedicine appointment is scheduled
  When: The patient opens their appointment detail
  Then:
    - A "Join Video Call" button appears 15 minutes before the appointment
    - Clicking launches the video call in-browser (WebRTC — no plugin required)
    - If the physician has not yet joined: patient is placed in a virtual waiting room with a message "Your doctor will join shortly"

AC-PA-011-02 (Technical check)
  Given: A patient clicks "Test my camera and microphone" before the appointment
  When: The test runs
  Then:
    - Camera, microphone, and speaker are tested
    - If any device fails: a help message guides troubleshooting

AC-PA-011-03 (Visit summary after telemedicine)
  Given: A telemedicine visit is completed
  When: The patient opens the portal the next day
  Then:
    - The discharge summary / visit summary from the encounter is available in Documents
    - Any new prescriptions appear in My Medications
```

---

#### PA-012 — Document Access (Reports, Summaries, Letters)
**As a** patient,
**I want to** view and download clinical documents (discharge summaries, referral letters, lab reports) from my patient portal,
**So that** I have access to my complete health information as required by PHIPA and 21st Century Cures Act.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | DocumentReference |

**Acceptance Criteria:**

```
AC-PA-012-01 (Document list)
  Given: A patient opens "My Documents"
  When: The page loads
  Then:
    - All DocumentReference resources linked to the patient are listed: type, date, author, status
    - Types shown: Discharge Summary, Lab Report, Referral Letter, Consultation Note, Imaging Report

AC-PA-012-02 (Document download)
  Given: A patient selects a discharge summary
  When: They click "View"
  Then:
    - The document opens as a PDF in-browser or downloads
    - PHI audit event logged: patient viewed own document

AC-PA-012-03 (21st Century Cures — immediate access)
  Given: A clinical note is signed by the physician (US deployment)
  When: The note is available in the EHR
  Then:
    - The note is published to the patient portal within 24 hours
    - Exceptions (psychotherapy notes, certain sensitive categories) are held per HIPAA

AC-PA-012-04 (Sensitive document protection)
  Given: A mental health clinical note is present
  When: The patient portal renders documents
  Then:
    - Mental health notes are shown only if the treating clinician has explicitly released them
    - By default: "Some documents are pending review by your care team" is shown without revealing the content type
```

---

#### PA-013 — Patient Profile and Demographics Self-Update
**As a** patient,
**I want to** update my contact information, communication preferences, and next of kin in the patient portal,
**So that** the clinic always has accurate information for reminders and emergencies.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Patient |

**Acceptance Criteria:**

```
AC-PA-013-01 (Update contact info)
  Given: A patient opens "My Profile"
  When: They update their mobile phone number and click "Save"
  Then:
    - Patient.telecom is updated with the new number
    - A verification SMS is sent to the new number
    - The change is effective only after the verification code is entered
    - Audit event: patient updated own contact info

AC-PA-013-02 (Preferred language)
  Given: A patient updates preferred language to French
  When: The next appointment reminder fires
  Then:
    - The reminder is in French (Patient.communication.language = fr-CA)

AC-PA-013-03 (Next of kin)
  Given: A patient adds an emergency contact
  When: Saved
  Then:
    - Patient.contact is updated with name, relationship, phone, and authorisation level (emergency only / full health proxy)

AC-PA-013-04 (Address update — PCR implication)
  Given: A patient updates their home address
  When: Saved
  Then:
    - The update is flagged for validation against PCR (Provincial Client Registry) if integrated
    - A notification is queued: "Address update — validate against provincial registry"
```

---

#### PA-014 — French Language Support (Bilingual Portal)
**As a** Francophone patient,
**I want to** use the patient portal entirely in French,
**So that** I can access my health information in my preferred language as guaranteed by the Official Languages Act.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Patient.communication |

**Acceptance Criteria:**

```
AC-PA-014-01 (Full French UI)
  Given: A patient selects French in their preferences or browser locale
  When: Any page of the patient portal loads
  Then:
    - All UI text is in Canadian French (not European French)
    - Dates are formatted: DD/MM/YYYY (French convention)
    - Error messages and notifications are in French

AC-PA-014-02 (Clinical content translation)
  Given: Medication names and conditions are shown
  When: The portal renders in French
  Then:
    - Generic drug names use Canadian French naming conventions
    - Condition names use French SNOMED synonyms where available
    - Where no French term exists: English term is shown with a (EN) indicator

AC-PA-014-03 (Language toggle without data loss)
  Given: A patient switches from English to French mid-form
  When: The language toggle is clicked
  Then:
    - The form relabels in French
    - Entered data is not lost
    - The language preference is saved for future sessions
```

---

#### PA-015 — Patient Bill Viewing
**As a** patient,
**I want to** view and pay any out-of-pocket fees from my patient portal,
**So that** I can manage my healthcare expenses.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Invoice (FHIR financial) |

**Acceptance Criteria:**

```
AC-PA-015-01 (Invoice view)
  Given: A patient is billed for an uninsured service ($35 uninsured note)
  When: They open "My Bills"
  Then:
    - Invoice is shown: date, service, amount billed, amount covered by OHIP, patient portion
    - Status: unpaid / paid

AC-PA-015-02 (Online payment)
  Given: A patient has an outstanding balance of $35
  When: They click "Pay Now" and complete the payment form (external payment gateway)
  Then:
    - Payment is processed securely (PCI-compliant gateway — card data never stored in EHR)
    - Invoice.status = paid
    - Receipt is emailed to the patient
```

---

#### PA-016 — Wearable / Remote Monitoring Data Upload
**As a** patient with a chronic condition,
**I want to** share wearable device data (blood pressure cuff, glucometer, smartwatch) with my care team,
**So that** my physician can monitor my condition between visits.

| Field | Value |
|---|---|
| Priority | Could |
| Target app | EHR |
| FHIR resource | Observation (device-sourced) |

**Acceptance Criteria:**

```
AC-PA-016-01 (Device data upload)
  Given: A patient has a Bluetooth BP cuff
  When: They sync their device via the patient portal
  Then:
    - BP readings are imported as Observation resources (LOINC 85354-9 — Blood pressure panel)
    - Device is identified in Observation.device
    - Readings are shown on a trend chart in the portal

AC-PA-016-02 (Threshold alert)
  Given: The physician has set an alert: "Notify me if BP systolic > 160"
  When: The patient syncs a reading of 168/94
  Then:
    - A ClinicalAlert fires for the physician: "Patient BP 168/94 — above monitoring threshold"
    - The physician's dashboard shows the alert
    - The patient sees: "Your care team has been notified of your recent reading"
```

---

#### PA-017 — MyHealth Ontario / Provincial SSO
**As a** Ontario patient,
**I want to** log in to the patient portal using my MyHealth Ontario account,
**So that** I do not need to create and manage a separate login.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | N/A (identity federation) |

**Acceptance Criteria:**

```
AC-PA-017-01 (SSO login)
  Given: A patient clicks "Sign in with MyHealth Ontario"
  When: The OAuth 2.0 / OIDC flow completes
  Then:
    - The patient is logged into the portal using their MyHealth Ontario identity
    - Their HCN and identity attributes are used for patient matching
    - No separate EHR username/password is required

AC-PA-017-02 (Account linking)
  Given: A patient already has an EHR portal account
  When: They log in with MyHealth Ontario for the first time
  Then:
    - A linking flow matches the MyHealth Ontario identity to the existing EHR patient record
    - After linking: either login method works
    - The HCN from MyHealth Ontario is stored in Patient.identifier

AC-PA-017-03 (Login fallback)
  Given: The MyHealth Ontario SSO is unavailable
  When: A patient tries to log in via SSO
  Then:
    - An error message is shown: "MyHealth Ontario sign-in is temporarily unavailable — use email/password instead"
    - Local email/password login is presented as fallback
```

---

#### PA-018 — Patient Symptom Checker (Pre-Triage)
**As a** patient who is unsure whether to seek care,
**I want to** complete a brief symptom assessment in the patient portal,
**So that** I receive guidance on the urgency of my symptoms.

| Field | Value |
|---|---|
| Priority | Could |
| Target app | EHR |
| FHIR resource | QuestionnaireResponse |

**Acceptance Criteria:**

```
AC-PA-018-01 (Symptom assessment)
  Given: A patient opens "Check My Symptoms"
  When: They complete the symptom questionnaire (chief complaint, duration, severity, associated symptoms)
  Then:
    - A recommendation is provided: "Seek emergency care now" / "Schedule urgent appointment (24h)" / "Schedule routine appointment" / "Self-care at home"
    - The recommendation is based on a validated clinical algorithm (not AI hallucination)
    - The algorithm source and limitations are disclosed

AC-PA-018-02 (Emergency escalation)
  Given: Symptom inputs suggest chest pain with shortness of breath
  When: The algorithm evaluates
  Then:
    - Immediate response: "Call 911 now — your symptoms may indicate a cardiac emergency"
    - A prominent 911 button is shown
    - The QuestionnaireResponse is NOT used as a clinical record — disclaimer is shown

AC-PA-018-03 (Appointment booking from recommendation)
  Given: The recommendation is "Schedule urgent appointment within 24 hours"
  When: The patient is shown the result
  Then:
    - A direct link to appointment booking pre-filtered to "urgent" slots is shown
    - Questionnaire responses are saved and can be shared with the booking system
```

---

### 4.7 Patient Care Assistant / PSW (PC)

---

#### PC-001 — PCA Role in Role Model
**As a** system administrator,
**I want to** add PCA/PSW as a distinct clinical role with appropriate permissions,
**So that** patient care assistants can access only the features relevant to their scope of practice.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Practitioner, PractitionerRole |

**Acceptance Criteria:**

```
AC-PC-001-01 (PCA role creation)
  Given: The admin opens User Management
  When: They create a new user and assign role=PCA
  Then:
    - PCA role is available in the role dropdown (alongside NURSE, DOCTOR, etc.)
    - PCA users can access: patient room list, ADL documentation, I&O tracking, patient transport requests
    - PCA users cannot access: medication orders, clinical notes, lab results, prescription data
    - All access is enforced at the API level (JWT role check)

AC-PC-001-02 (PCA navigation)
  Given: A PCA logs in
  When: They see the dashboard
  Then:
    - Navigation shows: My Patients (room list), Daily Tasks, I&O, ADL, Transport Requests
    - No Orders, Prescriptions, or Clinical Notes links are visible or accessible

AC-PC-001-03 (FHIR practitioner mapping)
  Given: A PCA is registered
  When: The PractitionerRole is created
  Then:
    - PractitionerRole.code includes SNOMED 768730001 "Personal support worker"
    - Role is stored in the JWT claim for API enforcement
```

---

#### PC-002 — ADL (Activities of Daily Living) Documentation
**As a** patient care assistant,
**I want to** document a patient's ADL status (bathing, dressing, mobility, continence, feeding),
**So that** nursing staff and therapists have current functional status information.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Observation (LOINC 85597-3 — ADL score) |

**Acceptance Criteria:**

```
AC-PC-002-01 (ADL assessment entry)
  Given: The PCA opens the ADL form for a patient
  When: They complete all 5 Barthel Index items and save
  Then:
    - Barthel Index total score (0–100) is calculated
    - Each item stored as Observation component
    - Total stored as Observation LOINC 85597-3
    - Timestamp and PCA ID are stored

AC-PC-002-02 (ADL score trending)
  Given: ADL scores have been recorded on 3 separate days
  When: The nursing staff view the patient chart
  Then:
    - A trend table shows: date, Barthel score, improvement/decline arrow
    - Significant decline (>10 points) triggers a nursing review alert

AC-PC-002-03 (ADL limitations documentation)
  Given: A patient requires full assistance with bathing
  When: The PCA records this
  Then:
    - Free text notes can be added per ADL item (e.g. "Right arm limited — stroke residual")
    - Notes are visible to nursing and therapy teams
```

---

#### PC-003 — Intake and Output (I&O) Tracking
**As a** patient care assistant,
**I want to** record all fluid intake and output throughout the shift,
**So that** nursing staff can monitor fluid balance and detect problems like dehydration or fluid overload.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Observation (fluid balance components) |

**Acceptance Criteria:**

```
AC-PC-003-01 (Intake recording)
  Given: A patient drinks 250 mL of water at 10:00 AM
  When: The PCA enters it in the I&O form
  Then:
    - Observation is created: type=intake, route=oral, volume=250mL, time=10:00, recorder=PCA ID

AC-PC-003-02 (Output recording)
  Given: A patient voids 300 mL of urine
  When: The PCA enters it
  Then:
    - Observation is created: type=output, type=urine, volume=300mL, time, recorder

AC-PC-003-03 (8-hour balance calculation)
  Given: Multiple I&O entries exist for the current shift
  When: The nurse opens the I&O summary
  Then:
    - Running balance = total intake - total output
    - If balance is negative by >500 mL in 8h: alert "Negative fluid balance — possible dehydration"
    - If positive by >1000 mL: alert "Positive fluid balance — monitor for fluid overload"

AC-PC-003-04 (24-hour cumulative view)
  Given: 24 hours of I&O data exist
  When: The physician opens the chart
  Then:
    - A bar chart shows intake vs output by 8h shift
    - Net 24h balance is shown prominently
```

---

#### PC-004 — Patient Transport Request
**As a** patient care assistant,
**I want to** submit a patient transport request (porter, wheelchair, stretcher) from the patient's room,
**So that** patients are moved safely and on time between departments.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Task (transport) |

**Acceptance Criteria:**

```
AC-PC-004-01 (Transport request)
  Given: A patient needs transport from Exam Room 1 to the Echo Lab
  When: The PCA submits a transport request
  Then:
    - A Task is created: code=transport, description="Patient to Echo Lab", from=Exam Room 1, to=Echo Lab, requiredBy=[time]
    - The transport team sees the request in their queue

AC-PC-004-02 (Priority transport)
  Given: A patient needs urgent transport (CTAS-2)
  When: The PCA marks the request as urgent
  Then:
    - Task.priority = urgent
    - Transport team is notified immediately with an alert
    - SLA timer: must respond within 5 minutes

AC-PC-004-03 (Completion confirmation)
  Given: The porter transports the patient
  When: They mark the task complete
  Then:
    - Task.status = completed
    - Visit state can now advance to appropriate room state
    - Time from request to completion is recorded (transport TAT)
```

---

#### PC-005 — Fall Prevention Task Checklist
**As a** patient care assistant,
**I want to** complete a fall prevention task checklist at the start of each shift for high-risk patients,
**So that** fall prevention measures are documented and consistently applied.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Task (fall prevention), CarePlan |

**Acceptance Criteria:**

```
AC-PC-005-01 (Checklist population)
  Given: A patient has MFS score ≥ 51 (high fall risk)
  When: The PCA opens the patient's daily task list
  Then:
    - A fall prevention checklist is shown: bed rails up / call bell within reach / non-slip footwear / room obstacles cleared / patient educated on call bell
    - Each item is a checkable Task

AC-PC-005-02 (Checklist completion)
  Given: The PCA checks all items
  When: They click "Complete"
  Then:
    - All Tasks are marked completed with PCA ID and timestamp
    - Completion is visible in the nursing chart
    - Next shift: a new checklist is auto-generated (reset)

AC-PC-005-03 (Uncompleted checklist alert)
  Given: 2 hours have passed in a shift and the fall prevention checklist is not completed
  When: The time threshold fires
  Then:
    - The charge nurse is alerted: "Fall prevention checklist not completed for high-risk patient [name]"
```

---

#### PC-006 — Vital Signs Assist (Limited Entry)
**As a** patient care assistant,
**I want to** enter basic vital signs (temperature, weight) that are then queued for nurse review,
**So that** vital sign collection is efficient while maintaining clinical oversight.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Observation (status=preliminary) |

**Acceptance Criteria:**

```
AC-PC-006-01 (PCA vitals entry)
  Given: The PCA measures a patient's weight as 82 kg and temperature 37.4°C
  When: They enter and save these values
  Then:
    - Observations are created with status=preliminary (not final)
    - Recorder = PCA ID
    - Observations appear in the nurse's review queue as "Pending nurse verification"
    - Full vital signs (BP, HR, SpO2) cannot be entered by PCA — those fields are disabled

AC-PC-006-02 (Nurse verification)
  Given: The nurse reviews PCA-entered vitals
  When: They confirm and click "Verify"
  Then:
    - Observation.status changes to final
    - Verifier (nurse ID) is added to Observation.performer
    - Vital is now official and visible in the clinical record

AC-PC-006-03 (PCA vitals scope restriction)
  Given: A PCA tries to enter a BP reading
  When: They open the vitals form
  Then:
    - BP, HR, SpO2, and RR fields are disabled with tooltip "This measurement must be performed by a registered nurse"
```

---

#### PC-007 — Patient Education Delivery Logging
**As a** patient care assistant,
**I want to** log when I have provided educational materials or spoken to a patient about self-care topics,
**So that** the care team is aware of what information the patient has received.

| Field | Value |
|---|---|
| Priority | Could |
| Target app | EHR |
| FHIR resource | Communication |

**Acceptance Criteria:**

```
AC-PC-007-01 (Log education delivery)
  Given: A PCA explains fall prevention to a patient
  When: They click "Log Education"
  Then:
    - They select topic from a predefined list (fall prevention, hand hygiene, dietary instructions, etc.)
    - A Communication resource is created: sender=PCA, recipient=Patient, topic, timestamp
    - Notes can be added (e.g. "Patient was drowsy — family member also educated")

AC-PC-007-02 (Patient understanding assessment)
  Given: The education is logged
  When: The form is saved
  Then:
    - PCA records patient's apparent understanding: "Understood" / "Needs reinforcement" / "Not alert"
    - If "Needs reinforcement": a follow-up task is created for the nurse
```

---

#### PC-008 — Turning / Repositioning Schedule
**As a** patient care assistant,
**I want to** follow and document a turning schedule for immobile patients to prevent pressure injuries,
**So that** pressure injury prevention is documented and auditable.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | CarePlan, Task |

**Acceptance Criteria:**

```
AC-PC-008-01 (Turning schedule setup)
  Given: A patient is assessed as immobile (Braden score <18)
  When: The nurse creates a turning schedule (every 2 hours)
  Then:
    - A CarePlan is created with scheduled Tasks at 2h intervals
    - PCA is assigned to each Task
    - The schedule appears in the PCA's task list

AC-PC-008-02 (Turn documentation)
  Given: The PCA turns the patient at 10:00 AM
  When: They click "Completed" on the Task
  Then:
    - Task.status = completed, timestamp recorded
    - Position documented: left lateral / right lateral / supine / prone
    - Next turn task is auto-scheduled 2 hours later

AC-PC-008-03 (Missed turn alert)
  Given: A turn task has not been completed within 30 minutes of the scheduled time
  When: The alert fires
  Then:
    - Charge nurse is notified: "Turning task overdue for immobile patient [room]"
    - The overdue task is highlighted in red in the PCA's task list
```


---

### 4.8 Receptionist / Front Desk (RC)

---

#### RC-001 — Appointment Scheduling Calendar
**As a** receptionist,
**I want to** book appointments using a visual day/week/month calendar showing real-time physician availability,
**So that** patients are scheduled correctly without double-booking.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Schedule, Slot, Appointment |

**Acceptance Criteria:**

```
AC-RC-001-01 (Calendar view)
  Given: The receptionist opens the scheduling calendar
  When: It loads
  Then:
    - A weekly calendar view shows each physician's schedule as a column
    - Available Slot resources render as clickable open slots (white)
    - Booked Appointment resources render as filled blocks (colour-coded by type)
    - Blocked times (physician leave/conference) are shown as hatched

AC-RC-001-02 (Book from calendar)
  Given: The receptionist clicks an open 10:30 AM slot for Dr. Chen
  When: The booking form opens
  Then:
    - Appointment form pre-fills: date, time, practitioner
    - Receptionist selects patient (from search), appointment type (new/follow-up/procedure/urgent), notes
    - On save: Appointment is created (status=booked), Slot.status = busy, patient receives confirmation notification

AC-RC-001-03 (Double-booking prevention)
  Given: A slot is in the process of being booked by Receptionist A
  When: Receptionist B tries to book the same slot simultaneously
  Then:
    - Optimistic concurrency control: the second booking fails with "Slot no longer available — please select another time"
    - No double-booking occurs

AC-RC-001-04 (Multi-location calendar)
  Given: Dr. Chen works at two clinic locations on different days
  When: The receptionist views the calendar
  Then:
    - Location is displayed on each slot/block
    - A location filter allows viewing one site at a time

AC-RC-001-05 (Patient timezone accommodation)
  Given: A patient in a different timezone books via the patient portal
  When: The receptionist views the booking
  Then:
    - Appointments display in clinic local time
    - The patient's confirmation email/SMS shows the appointment in their local timezone with explicit timezone label
```

---

#### RC-002 — New Patient Registration
**As a** receptionist,
**I want to** register a new patient including PCR lookup and MRN assignment,
**So that** new patients are correctly identified in the system with an accurate health card and demographics.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Patient |

**Acceptance Criteria:**

```
AC-RC-002-01 (New patient form)
  Given: A new patient presents at the front desk
  When: The receptionist opens "Register New Patient"
  Then:
    - Form fields: Legal first name, last name, DOB, sex at birth, HCN, address, phone, email, preferred language, emergency contact
    - All mandatory fields are validated before saving

AC-RC-002-02 (PCR lookup)
  Given: The receptionist enters the patient's HCN
  When: They click "Look Up in PCR"
  Then:
    - A query is sent to the Ontario PCR (Provincial Client Registry) FHIR endpoint
    - If found: demographics are returned and pre-populated (patient must confirm)
    - If not found: manual entry continues

AC-RC-002-03 (MRN assignment)
  Given: A new patient record is confirmed and saved
  When: The patient is created
  Then:
    - A unique MRN is assigned (format: [tenant prefix]-[sequence], e.g. CC-000001)
    - MRN is stored in Patient.identifier with system = tenant MRN namespace
    - MRN is printed on a wristband label (if in-clinic)

AC-RC-002-04 (Duplicate patient detection)
  Given: The receptionist tries to register a patient who already exists
  When: They enter the HCN or name+DOB combination
  Then:
    - A duplicate check fires: "Existing patient found — [name], DOB [date] — open their record?"
    - No duplicate Patient resource is created
    - The receptionist is directed to the existing record
```

---

#### RC-003 — OHIP Eligibility Verification at Check-In
**As a** receptionist,
**I want to** verify a patient's OHIP eligibility in real time at check-in,
**So that** insured services are billed correctly and ineligible patients are flagged.

**See TR-008 — OHIP verification acceptance criteria apply here also. Additional RC-specific criteria:**

```
AC-RC-003-01 (Check-in OHIP display)
  Given: A patient checks in for their appointment
  When: The receptionist opens their record and runs eligibility
  Then:
    - OHIP verification result is prominently displayed in the check-in workflow: "ELIGIBLE — Card valid to [date]" or "NOT ELIGIBLE"
    - Eligibility result is stored in Patient.identifier[HCN].extension:eligibility with check timestamp

AC-RC-003-02 (HCN version code update)
  Given: A patient has renewed their health card with a new version code
  When: The receptionist updates the version code
  Then:
    - Patient.identifier[HCN].value is updated (HCN unchanged, version updated)
    - New eligibility check is run automatically
    - Version update is audit-logged
```

---

#### RC-004 — Check-In Kiosk Mode
**As a** clinic patient,
**I want to** check in for my appointment via a self-service kiosk,
**So that** I do not have to wait in line at the reception desk.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Appointment (status=arrived), Patient |

**Acceptance Criteria:**

```
AC-RC-004-01 (Kiosk self check-in)
  Given: A patient approaches the kiosk and scans their health card or enters their DOB
  When: Their appointment is found
  Then:
    - Appointment name and time are shown for confirmation
    - Patient confirms "Yes, this is my appointment"
    - Appointment.status changes to "arrived"
    - Visit state advances to PATIENT_ARRIVED
    - The waiting room display shows their name (or queue number)

AC-RC-004-02 (No appointment found)
  Given: A patient scans but has no appointment found for today
  When: The kiosk fails to match
  Then:
    - Message: "No appointment found — please see reception"
    - No patient data is shown (privacy protection)

AC-RC-004-03 (Demographics confirmation)
  Given: The patient checks in on the kiosk
  When: Their record is found
  Then:
    - Kiosk shows limited demographics: first name, appointment date/time, physician
    - Kiosk does NOT show DOB, address, HCN, or clinical data
    - Patient confirms or reports a change

AC-RC-004-04 (Accessibility — kiosk)
  Given: A patient using a wheelchair approaches
  When: The kiosk is used
  Then:
    - The screen height is accessible from seated position
    - Large font option is available
    - Audio assistance option is available
    - High contrast mode is available
```

---

#### RC-005 — Patient Waitlist Management
**As a** receptionist,
**I want to** manage a waitlist for appointments when no immediate slots are available,
**So that** patients are contacted in order when cancellations occur.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Appointment (status=waitlist) |

**Acceptance Criteria:**

```
AC-RC-005-01 (Add to waitlist)
  Given: No slots are available for a patient
  When: The receptionist clicks "Add to Waitlist" and selects preferred date range and time
  Then:
    - Appointment resource is created with status=waitlist
    - Waitlist position is assigned (FIFO per appointment type and physician)

AC-RC-005-02 (Automated slot notification)
  Given: A booked slot is cancelled
  When: The slot is released
  Then:
    - The first eligible waitlist patient (matching type + practitioner preference) is notified: "A slot is now available — [date/time] — reply Y to confirm or N to decline"
    - If confirmed within 2 hours: appointment is booked
    - If no response or declined: next waitlist patient is notified

AC-RC-005-03 (Waitlist view)
  Given: The receptionist opens the waitlist
  When: The view loads
  Then:
    - All waitlisted patients are shown with: name, appointment type, requested dates, wait duration, position
    - Receptionist can manually book any waitlisted patient and remove them from the list
```

---

#### RC-006 — No-Show Management
**As a** receptionist,
**I want to** mark patients as no-shows and trigger follow-up communications,
**So that** no-show rates are tracked and abandoned slots are filled.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Appointment (status=noshow) |

**Acceptance Criteria:**

```
AC-RC-006-01 (Mark no-show)
  Given: A patient does not arrive within 15 minutes of their appointment
  When: The receptionist marks them as no-show
  Then:
    - Appointment.status = noshow
    - Visit state transitions to NO_SHOW
    - The slot is not automatically released (configurable: release after 30 min)
    - A no-show flag is added to the patient's record

AC-RC-006-02 (No-show follow-up)
  Given: A patient is marked no-show
  When: 30 minutes after the appointment time
  Then:
    - An automated SMS/email is sent: "We missed you today — would you like to reschedule?"
    - A rescheduling link is included
    - A task is created for the receptionist: "Follow up with [patient name] — no-show today"

AC-RC-006-03 (Repeat no-show alert)
  Given: A patient has been marked no-show 3 times in 6 months
  When: The next appointment is booked
  Then:
    - A flag appears on the booking: "Note: patient has 3 no-shows in the last 6 months"
    - The receptionist can choose to require a deposit or add a special confirmation step
```

---

#### RC-007 — Cancellation Workflow
**As a** receptionist,
**I want to** process appointment cancellations with reason codes and slot release,
**So that** the calendar is updated immediately and waitlisted patients are notified.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Appointment (status=cancelled), Slot |

**Acceptance Criteria:**

```
AC-RC-007-01 (Cancellation with reason)
  Given: A patient calls to cancel their appointment
  When: The receptionist clicks "Cancel Appointment" and selects reason
  Then:
    - Reason codes available: Patient request / Physician cancelled / Emergency / Illness / Administrative / Other
    - Appointment.status = cancelled, Appointment.cancelationReason = coded
    - Slot is released (Slot.status = free)
    - Waitlist check fires: first eligible waitlisted patient is notified

AC-RC-007-02 (Physician cancellation — notify all patients)
  Given: Dr. Chen cancels their entire afternoon due to an emergency
  When: The receptionist marks all afternoon slots cancelled
  Then:
    - All affected Appointments are cancelled (status=cancelled, reason=physician-unavailable)
    - All affected patients receive notification: "Your appointment on [date] with Dr. Chen has been cancelled — please reschedule"
    - A rescheduling link is included in the notification

AC-RC-007-03 (Cancellation audit trail)
  Given: An appointment is cancelled
  When: The audit log is reviewed
  Then:
    - Actor (who cancelled), reason, original time, cancellation timestamp are all recorded
    - This log supports billing dispute resolution
```

---

#### RC-008 — Room Assignment
**As a** receptionist,
**I want to** assign patients to rooms during check-in,
**So that** room occupancy is tracked in real time.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Encounter.location, Location |

**Acceptance Criteria:**

```
AC-RC-008-01 (Room assignment at check-in)
  Given: A patient has checked in
  When: The receptionist assigns them to Exam Room 2
  Then:
    - Encounter.location[current] is set to Location (room-exam-2)
    - The room dashboard shows Exam Room 2 as occupied with the patient's name (last, first)
    - The room assignment is visible to all clinical staff

AC-RC-008-02 (Room availability heatmap)
  Given: The receptionist opens the room dashboard
  When: It loads
  Then:
    - All rooms are shown as cards: green (available), yellow (in use), red (in cleaning / maintenance)
    - Clicking a room shows current occupant and estimated time remaining
    - The heatmap updates in real time (WebSocket)

AC-RC-008-03 (Room release)
  Given: A patient is discharged
  When: Visit state → DISCHARGED
  Then:
    - Room status automatically changes to "Needs cleaning" (amber)
    - The room appears as unavailable to receptionists until cleaning is confirmed
    - Housekeeping can mark the room clean, changing status back to available (green)
```

---

#### RC-009 — Interpreter Request at Booking
**As a** receptionist,
**I want to** request an interpreter for patients who require language support,
**So that** language is not a barrier to healthcare access.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Appointment.extension:interpreter-required |

**Acceptance Criteria:**

```
AC-RC-009-01 (Interpreter request at booking)
  Given: A patient's record shows preferred language = Mandarin
  When: The appointment is booked
  Then:
    - An interpreter request is auto-generated with language = Mandarin
    - The appointment shows an interpreter required badge
    - The request is sent to the interpreter coordination service

AC-RC-009-02 (Interpreter confirmed)
  Given: An interpreter is confirmed for the appointment
  When: The confirmation is received
  Then:
    - Appointment.extension:interpreter is updated with interpreter name/agency
    - Patient and physician are notified: "Interpreter confirmed for your appointment"

AC-RC-009-03 (Interpreter not available)
  Given: No interpreter is available for the requested language/time
  When: The coordination service responds
  Then:
    - Receptionist is notified: "Interpreter unavailable for [language] at [time] — options: telephone interpretation, reschedule"
    - Patient is offered alternatives
```

---

#### RC-010 — Appointment Type Catalogue Management
**As a** clinic administrator,
**I want to** define and manage appointment types (new, follow-up, procedure, urgent, telemedicine) with slot durations and booking rules,
**So that** scheduling is consistent and appropriate slots are allocated.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | HealthcareService, Schedule |

**Acceptance Criteria:**

```
AC-RC-010-01 (Appointment type creation)
  Given: The admin opens the Appointment Types configuration page
  When: They create "Cardiology Follow-up" with duration=30 min, appointment type code=FOLLOWUP, advance booking=12 weeks
  Then:
    - HealthcareService entry is created with type, duration, booking rules
    - Slots generated on the Schedule reflect 30-minute intervals for this type
    - Receptionists and patients can select this type when booking

AC-RC-010-02 (Type-based booking rules)
  Given: "New Patient Consultation" is defined as 60 minutes and requires referral
  When: A receptionist books a new patient appointment
  Then:
    - If no referral ServiceRequest is on file, a warning fires: "New patient consultation requires a referral — confirm referral received"
    - The 60-minute slot is automatically selected (not configurable by receptionist)
```

---

#### RC-011 — Referral Intake and Scheduling
**As a** receptionist,
**I want to** receive incoming referrals (electronic or fax), review them, and schedule the appointment,
**So that** referred patients are booked promptly and within wait-time targets.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | ServiceRequest (referral), Appointment |

**Acceptance Criteria:**

```
AC-RC-011-01 (Electronic referral receipt)
  Given: An electronic referral arrives (ServiceRequest FHIR from another system)
  When: It is received
  Then:
    - It appears in the "Incoming Referrals" queue
    - Referral details shown: referring physician, patient, reason for referral, urgency, date received

AC-RC-011-02 (Book from referral)
  Given: The receptionist reviews the referral and clicks "Book Appointment"
  When: They select an appropriate slot
  Then:
    - Appointment is created and linked to the ServiceRequest (basedOn reference)
    - Referring physician is notified: "Your referral for [patient] has been scheduled for [date]"
    - Patient is notified with appointment details

AC-RC-011-03 (Wait time compliance)
  Given: A referral marked urgent is received
  When: Booking is completed
  Then:
    - The system checks if the booked date meets the urgency wait-time target (e.g. urgent=14 days)
    - If it does not: a flag is raised: "Booking exceeds wait time target for urgent referral — supervisor review"

AC-RC-011-04 (Fax referral digitisation)
  Given: A referral arrives by fax
  When: The receptionist uploads the fax image
  Then:
    - The image is stored as a DocumentReference
    - Key fields are entered manually and validated
    - A ServiceRequest is created with source=fax (note in extension)
```

---

#### RC-012 — End-of-Day Reconciliation
**As a** receptionist or clinic manager,
**I want to** run an end-of-day reconciliation showing all visits opened, closed, no-showed, and pending,
**So that** the clinic has a complete daily summary for billing and operational review.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Encounter |

**Acceptance Criteria:**

```
AC-RC-012-01 (EOD report)
  Given: The receptionist clicks "End of Day Report"
  When: The report runs for today
  Then:
    - Summary shows: total scheduled, arrived, no-show, cancelled, completed, in progress (still open)
    - By physician
    - Any open encounters (not yet discharged) are flagged for immediate attention
    - Report is exportable as PDF

AC-RC-012-02 (Open encounter alert)
  Given: It is 6:00 PM and 2 encounters are still in IN_PROCEDURE state
  When: The EOD check runs
  Then:
    - Alert sent to charge nurse and physician: "2 encounters still open — please complete documentation and discharge"
```

---

#### RC-013 — Run-Time Delay Patient Notification
**As a** receptionist,
**I want to** quickly send a delay notification to all waiting patients when a physician is running late,
**So that** patients in the waiting room and those not yet arrived are informed.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Communication |

**Acceptance Criteria:**

```
AC-RC-013-01 (Delay notification)
  Given: Dr. Chen is running 30 minutes behind
  When: The receptionist clicks "Send Delay Notification", enters "30 minutes", and confirms
  Then:
    - All patients with appointments for Dr. Chen in the next 2 hours receive SMS/email: "Dr. Chen is running approximately 30 minutes behind schedule. We apologise for the inconvenience."
    - The waiting room display updates: "Running 30 min late — we apologise"
    - Communication resources are created for each notification

AC-RC-013-02 (Appointment rescheduling offer)
  Given: Delay exceeds 60 minutes
  When: The receptionist sends the delay notification
  Then:
    - Message includes: "If you are unable to wait, reply RESCHEDULE to arrange another time"
    - Patient replies are captured and a rescheduling task is created for the receptionist
```

---

#### RC-014 — Recall / Preventive Care Recall Management
**As a** receptionist or clinic manager,
**I want to** identify patients overdue for preventive care and send recall notices,
**So that** the patient panel maintains preventive care compliance.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Appointment, CommunicationRequest (recall) |

**Acceptance Criteria:**

```
AC-RC-014-01 (Recall list generation)
  Given: The clinic manager runs "Generate Recall List" for "Annual diabetic eye exam"
  When: The report runs
  Then:
    - All patients with diabetes (Condition=E11) and no ophthalmology appointment in the last 12 months are listed
    - List shows: patient name, phone, last exam date, responsible physician

AC-RC-014-02 (Bulk recall notices)
  Given: 45 patients are on the recall list
  When: The receptionist clicks "Send Recall Notices"
  Then:
    - A batch of CommunicationRequest resources is created
    - SMS/email is sent: "It's time for your annual diabetic eye exam — please call [clinic] to schedule"
    - A delivery report shows sent, delivered, and failed counts

AC-RC-014-03 (Recall response tracking)
  Given: A recall notice was sent
  When: A patient books an appointment within 30 days
  Then:
    - The recall for that patient is marked "Responded — appointment booked"
    - Remaining non-responders are listed for follow-up call
```

---

#### RC-015 — Patient Demographics Update at Check-In
**As a** receptionist,
**I want to** prompt patients to confirm their demographics at each check-in and update as needed,
**So that** the patient record is current and OHIP billing information is accurate.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Patient |

**Acceptance Criteria:**

```
AC-RC-015-01 (Demographic confirmation prompt)
  Given: A patient is checking in
  When: The check-in workflow reaches the demographics step
  Then:
    - Current demographics are shown: address, phone, email, HCN version code, emergency contact
    - Patient verbally confirms or indicates changes
    - If confirmed: a confirmation event is logged with timestamp (no change to record)

AC-RC-015-02 (Demographic update)
  Given: A patient has moved and provides a new address
  When: The receptionist updates the address field
  Then:
    - Patient.address is updated
    - Change is logged: actor, field changed, old value, new value, timestamp
    - If PCR integration is enabled: the update is queued for sync to PCR

AC-RC-015-03 (HCN expiry check)
  Given: A patient's health card expires in 30 days
  When: Check-in runs the OHIP check
  Then:
    - A notice appears: "Patient's health card expires [date] — remind to renew"
    - This notice is shown to the receptionist but not the patient (unless clinic policy)
```

---

#### RC-016 — Wait Time Display for Patients
**As a** patient in the waiting room,
**I want to** see an estimated wait time for my appointment on the waiting room display,
**So that** I can manage my time and know when to expect to be called.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Appointment, Slot |

**Acceptance Criteria:**

```
AC-RC-016-01 (Wait time display)
  Given: A patient has checked in
  When: The waiting room display updates
  Then:
    - The patient's appointment is shown (by queue number or first name + last initial)
    - Estimated wait: "Approximately [N] minutes" (calculated from: appointments ahead + average consult time)
    - Actual wait and estimated wait are compared and updated in real time

AC-RC-016-02 (No PHI on waiting room display)
  Given: The display is visible to the public
  When: Patient information is shown
  Then:
    - Only queue number or token (not full name, DOB, or clinical information) is displayed
    - Clinical status is not shown (no "John — chest pain")
    - Kiosk mode ensures no accidental PHI exposure

AC-RC-016-03 (Priority patient fast-track)
  Given: A CTAS-2 patient is in the waiting room
  When: The triage nurse escalates their priority
  Then:
    - The patient's wait indicator updates immediately: "You will be seen shortly — please approach the desk"
    - Their queue position moves to the front
```

---

#### RC-017 — Multi-Location / Multi-Provider Scheduling
**As a** receptionist at a multi-site clinic,
**I want to** schedule appointments across multiple locations and providers in a single interface,
**So that** I can direct patients to the best available option without switching between systems.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Location, Schedule, Appointment |

**Acceptance Criteria:**

```
AC-RC-017-01 (Multi-location slot view)
  Given: The receptionist searches for cardiology appointments in the next 2 weeks
  When: They filter by specialty (Cardiology)
  Then:
    - Available slots across all configured locations are shown
    - Each slot shows: date, time, physician, location name, appointment type

AC-RC-017-02 (Patient location preference)
  Given: A patient prefers the downtown location
  When: Booking
  Then:
    - Slots are filtered by patient's preferred location by default
    - Receptionist can override and show all locations

AC-RC-017-03 (Conflict detection)
  Given: A physician has slots at Location A and Location B on the same morning
  When: The schedule is configured
  Then:
    - A conflict alert fires: "Physician scheduled at two locations simultaneously"
    - Admin must resolve before slots are published
```

---

#### RC-018 — Appointment Type: Telemedicine Booking
**As a** receptionist,
**I want to** book telemedicine appointments with automated join-link generation,
**So that** patients receive all the information they need for a virtual visit.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Appointment (class=VR), Communication |

**Acceptance Criteria:**

```
AC-RC-018-01 (Telemedicine booking)
  Given: A receptionist books a "Telemedicine Follow-up" appointment
  When: The appointment is saved
  Then:
    - Appointment.appointmentType.coding = SNOMED 448337001 "Telemedicine consultation"
    - A video session link is generated (clinic-hosted WebRTC or integrated video platform)
    - Confirmation email/SMS includes the video join link and instructions

AC-RC-018-02 (Hardware requirements communicated)
  Given: A telemedicine appointment is booked for a patient
  When: The confirmation is sent
  Then:
    - The email includes: "To join, you will need a device with camera and microphone. Test your setup at [link]."
    - A 15-minute test session link is included

AC-RC-018-03 (Telemedicine fallback)
  Given: Technical issues prevent the video call from connecting
  When: The session fails
  Then:
    - Both parties receive a message: "Video connection failed — switching to phone consultation"
    - The physician's registered phone number is provided to the patient for fallback
```

---

### 4.9 System Administrator (AD)

---

#### AD-001 — PHIPA-Compliant PHI Audit Log
**As a** system administrator,
**I want to** have every access to patient health information logged immutably with actor, action, resource, and timestamp,
**So that** the organisation can demonstrate PHIPA §12 compliance and investigate privacy breaches.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | All |
| FHIR resource | AuditEvent |

**Acceptance Criteria:**

```
AC-AD-001-01 (PHI access logging)
  Given: Any authenticated user reads a Patient, Observation, Condition, MedicationRequest, or DiagnosticReport resource
  When: The read occurs
  Then:
    - An AuditEvent resource is created: agent (user), patient (subject), action=R (read), outcome=0 (success), recorded=timestamp, source=system
    - The event is written to an append-only audit store (not updatable or deleteable)
    - Event is stored within 100ms of the action

AC-AD-001-02 (Write / modify logging)
  Given: A user creates or updates a clinical resource
  When: The write occurs
  Then:
    - AuditEvent.action=C (create) or U (update)
    - Changed fields are listed in AuditEvent.entity.detail
    - Previous value is stored (for update events) if data is PHI

AC-AD-001-03 (Failed access logging)
  Given: A user attempts to access a record they do not have permission to view
  When: The request is blocked
  Then:
    - AuditEvent with outcome=8 (denied) is created
    - The attempted access (resource type, resource ID) is logged
    - Security team is notified of repeated failed access attempts (>5 in 1 hour to same patient)

AC-AD-001-04 (Audit log query — admin only)
  Given: An admin opens the Audit Log interface
  When: They search for all accesses to a specific patient in the last 30 days
  Then:
    - All matching AuditEvent records are returned: who, what, when, from which IP
    - Results are filterable by actor, action, date range, resource type
    - The audit query itself is logged

AC-AD-001-05 (Audit log immutability)
  Given: An admin attempts to delete an audit event
  When: DELETE is attempted on the audit collection
  Then:
    - HTTP 405 Method Not Allowed
    - No record is deleted
    - The attempt is logged as a security event

AC-AD-001-06 (10-year retention)
  Given: Audit logs are stored
  When: The retention policy is applied
  Then:
    - Audit events are retained for 10 years minimum (PHIPA record retention)
    - Events older than 10 years are archived (not deleted) to cold storage
```

---

#### AD-002 — Fix Self-Registration Role Exploit
**As a** system administrator,
**I want to** ensure that new registrations default to a PENDING role requiring admin approval,
**So that** unauthorized users cannot self-assign DOCTOR or ADMIN roles and access clinical data.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | PractitionerRole |

**Acceptance Criteria:**

```
AC-AD-002-01 (Default role = PENDING)
  Given: A new user completes registration
  When: The account is created
  Then:
    - user.role = PENDING regardless of what role was selected in the form
    - The role selector is removed from the registration form (role cannot be self-selected)
    - The user receives: "Your account is pending approval. You will be notified when access is granted."
    - An admin receives notification: "New registration pending approval: [name] [email]"

AC-AD-002-02 (Admin approval workflow)
  Given: A pending user exists
  When: The admin opens User Management and approves the user
  Then:
    - Admin selects the appropriate role from a dropdown
    - user.role is updated to the selected role
    - The user receives: "Your account has been approved as [role] — you can now log in"
    - Approval is logged: admin ID, approved user ID, assigned role, timestamp

AC-AD-002-03 (Rejection workflow)
  Given: An admin rejects a registration
  When: They click "Reject" with reason
  Then:
    - user.status = rejected
    - The user receives: "Your account registration was not approved — [reason]"
    - Rejected accounts cannot log in

AC-AD-002-04 (No login for PENDING)
  Given: A user with role=PENDING attempts to log in
  When: Credentials are correct but role=PENDING
  Then:
    - Login is rejected: "Your account is pending approval by an administrator"
    - No session is created
    - No PHI is accessible
```

---

#### AD-003 — API-Level RBAC Enforcement
**As a** system administrator,
**I want to** ensure that all API routes enforce role-based access control at the server level,
**So that** frontend restrictions cannot be bypassed by direct API calls.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | All |
| FHIR resource | N/A (infrastructure) |

**Acceptance Criteria:**

```
AC-AD-003-01 (Role check on every protected endpoint)
  Given: The LIMS API endpoint GET /api/v1/orders is protected (requires TECHNICIAN or ADMIN)
  When: A request with a valid JWT for a PATIENT role is made
  Then:
    - HTTP 403 Forbidden is returned
    - Response body: {"error":"Insufficient permissions for this resource"}
    - Access attempt is logged (actor=PATIENT, resource=lab-orders, outcome=denied)

AC-AD-003-02 (JWT validation)
  Given: A request uses an expired JWT
  When: Any protected endpoint is called
  Then:
    - HTTP 401 Unauthorized is returned
    - No resource data is leaked

AC-AD-003-03 (Cross-tenant protection)
  Given: A user from tenant A has a valid JWT
  When: They try to access a resource that belongs to tenant B
  Then:
    - HTTP 403 is returned regardless of the user's role
    - Multi-tenancy isolation is enforced at every query level

AC-AD-003-04 (FHIR server RBAC)
  Given: The FHIR server receives a request
  When: The request is for a Patient resource belonging to another tenant
  Then:
    - tenant_id claim in JWT is checked against resource tenant_id
    - If mismatch: 403 returned — resource content not revealed
```

---

#### AD-004 — User Management — Full CRUD
**As a** system administrator,
**I want to** create, read, update, deactivate, and manage all user accounts,
**So that** staff access is controlled accurately from day one to offboarding.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Practitioner, PractitionerRole |

**Acceptance Criteria:**

```
AC-AD-004-01 (Create user)
  Given: The admin creates a new nurse account
  When: They complete the user form and save
  Then:
    - User is created in the database with role=NURSE (set by admin, not user)
    - A Practitioner FHIR resource is created with the nurse's name and identifier
    - Welcome email is sent with temporary password and password change instructions

AC-AD-004-02 (Role change)
  Given: A receptionist has been promoted to clinic coordinator requiring ADMIN access
  When: The admin changes their role to ADMIN
  Then:
    - user.role is updated immediately
    - The user's active sessions are invalidated (they must re-login with new role)
    - Role change is audit-logged

AC-AD-004-03 (Deactivate / suspend)
  Given: A staff member has left the organisation
  When: The admin deactivates their account
  Then:
    - user.status = inactive
    - All active sessions for this user are invalidated immediately
    - Future login attempts with this account fail: "Account is deactivated — contact administrator"
    - Audit events still reference the deactivated user ID (immutable history)

AC-AD-004-04 (Password reset)
  Given: A user is locked out (3 failed login attempts)
  When: The admin clicks "Reset Password"
  Then:
    - A temporary password link is sent to the user's registered email
    - The link expires in 1 hour
    - The user is required to set a new password on first login (minimum 12 chars, 1 uppercase, 1 number, 1 special char)

AC-AD-004-05 (MFA enforcement)
  Given: MFA is configured as mandatory for ADMIN and DOCTOR roles
  When: A user with one of those roles logs in
  Then:
    - After credential verification, MFA challenge is presented (TOTP or SMS)
    - Login is not completed until MFA is verified
    - Failed MFA attempts are logged and the account is locked after 5 failures
```

---

#### AD-005 — Integration Monitoring Dashboard
**As a** system administrator,
**I want to** view the status of all integration endpoints (OLIS, PrescribeIT, FHIR, DHDR, PCR) in real time,
**So that** I can identify and resolve integration failures before they affect patient care.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | All |
| FHIR resource | N/A (operational) |

**Acceptance Criteria:**

```
AC-AD-005-01 (Integration status dashboard)
  Given: The admin opens the Integration Monitor
  When: The page loads
  Then:
    - Each integration endpoint is shown as a status tile: name, last successful call, status (green/amber/red)
    - Green: last call successful < 5 min ago
    - Amber: last call successful 5–30 min ago
    - Red: last call failed or > 30 min since last success

AC-AD-005-02 (Failed message queue)
  Given: OLIS submission has failed for 3 messages
  When: Admin opens the Failed Messages queue
  Then:
    - Each failed message shows: message ID, timestamp, error message, retry count, next retry time
    - Admin can manually retry or discard a message

AC-AD-005-03 (Lab ingestion log view)
  Given: The admin opens the Lab Ingestion Log
  When: They filter by status=FAILED
  Then:
    - All failed HL7v2 ingestion events are shown with error details
    - Admin can trigger manual reprocessing of failed messages
    - Duplicate messages are shown with status=DUPLICATE (not errors)
```

---

#### AD-006 — Tenant / Clinic Configuration
**As a** system administrator,
**I want to** configure clinic settings including working hours, appointment types, room list, and staff schedule templates,
**So that** the system reflects the real-world operations of each clinic.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR + FHIR |
| FHIR resource | Organization, Location, Schedule |

**Acceptance Criteria:**

```
AC-AD-006-01 (Clinic working hours)
  Given: The admin opens Clinic Configuration
  When: They set working hours to Mon–Fri 8:00–17:00 and Sat 9:00–13:00
  Then:
    - Schedule Slot resources are generated only within configured hours
    - Appointment booking rejects times outside working hours
    - Stat/urgent appointments can still be booked outside hours with explicit admin override

AC-AD-006-02 (Room configuration)
  Given: The admin adds a new Holter room
  When: They save the configuration
  Then:
    - A new cardiology_rooms record is created for the tenant
    - A FHIR Location resource is created with type=Holter
    - The room appears in the room assignment and dashboard views

AC-AD-006-03 (Holiday / closure configuration)
  Given: The admin sets a clinic closure for August 5 (Civic Holiday)
  When: A receptionist tries to book an appointment on August 5
  Then:
    - No slots are shown for August 5
    - Existing appointments on August 5 are flagged for rescheduling
    - Affected patients are notified: "Clinic is closed on [date] — your appointment has been rescheduled to [new date]" (if auto-reschedule is enabled)
```

---

#### AD-007 — Session Management
**As a** system administrator,
**I want to** view and terminate active user sessions,
**So that** I can respond to security incidents by immediately revoking access.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | All |
| FHIR resource | N/A (security infrastructure) |

**Acceptance Criteria:**

```
AC-AD-007-01 (Active sessions view)
  Given: The admin opens Session Management
  When: The page loads
  Then:
    - All active sessions are shown: user name, role, last activity, IP address, device/browser
    - Sessions older than 24 hours are highlighted

AC-AD-007-02 (Force logout)
  Given: A security incident requires an employee's immediate revocation
  When: The admin clicks "Terminate Session" for that user
  Then:
    - All active JWT tokens for that user are blacklisted
    - The user is immediately logged out on all devices
    - Next request from that user returns 401
    - Termination event is logged with admin ID and reason

AC-AD-007-03 (Concurrent session limit)
  Given: A user logs in from 3 simultaneous devices
  When: Their fourth session is initiated
  Then:
    - Configurable maximum sessions per user (default: 2 for clinical, 1 for admin)
    - Oldest session is terminated automatically when the limit is exceeded
    - User is notified: "Session terminated — maximum concurrent sessions reached"
```

---

#### AD-008 — System Health Dashboard
**As a** system administrator,
**I want to** view real-time system health metrics (CPU, memory, database connections, error rates, response times),
**So that** performance issues are identified before they affect users.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | All |
| FHIR resource | N/A (operational) |

**Acceptance Criteria:**

```
AC-AD-008-01 (Health dashboard)
  Given: The admin opens System Health
  When: The dashboard loads
  Then:
    - Metrics shown: CPU %, memory %, DB connection pool (used/max), avg response time (p50, p95, p99), error rate (% of requests)
    - Service tiles: EHR (Next.js), FHIR Server, LIMS, PharmacyMS, Redis, PostgreSQL — each with status

AC-AD-008-02 (Alert thresholds)
  Given: CPU usage exceeds 85% for 5 consecutive minutes
  When: The threshold fires
  Then:
    - Admin receives alert via email/SMS/in-app
    - Dashboard tile turns red
    - An incident record is created automatically

AC-AD-008-03 (Historical metrics)
  Given: Admin selects "Last 7 days"
  When: Historical view loads
  Then:
    - Trend charts show each metric over time
    - Known incident timestamps are annotated on the chart
```

---

#### AD-009 — Terminology / Value Set Management
**As a** system administrator or clinical informatics lead,
**I want to** manage the code systems, value sets, and concept maps used in the system,
**So that** clinical coding is consistent with current Canadian and international standards.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | FHIR |
| FHIR resource | CodeSystem, ValueSet, ConceptMap |

**Acceptance Criteria:**

```
AC-AD-009-01 (Value set view)
  Given: The admin opens the Terminology Manager
  When: They list value sets
  Then:
    - All ValueSet resources in the FHIR server are listed: name, version, status (active/draft/retired), concept count

AC-AD-009-02 (Value set import)
  Given: A new SNOMED CT Canadian release is available
  When: The admin imports the updated CodeSystem
  Then:
    - New concepts are added
    - Retired concepts are flagged
    - Dependent ValueSets are flagged for review
    - Import is versioned and audit-logged

AC-AD-009-03 (ConceptMap management)
  Given: pCLOCD codes need to be mapped to LOINC equivalents
  When: The admin opens the ConceptMap for pCLOCD→LOINC
  Then:
    - All mappings are shown in a table: pCLOCD code, LOINC code, equivalence (exact/wider/narrower/unmatched)
    - New mappings can be added
    - Unmapped pCLOCD codes are listed for clinical review
```

---

#### AD-010 — Data Export and Reporting
**As a** clinic manager,
**I want to** export de-identified operational data for quality improvement and regulatory reporting,
**So that** the clinic meets reporting obligations to OHQC, accreditation bodies, and funders.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | MeasureReport |

**Acceptance Criteria:**

```
AC-AD-010-01 (De-identified export)
  Given: The manager requests a patient volume export
  When: They click "Export" and select date range
  Then:
    - Export contains: visit count by day, appointment type breakdown, average wait time, no-show rate
    - No patient names, DOBs, HCNs, or MRNs are included in the export
    - Export is in CSV format

AC-AD-010-02 (FHIR Bulk Data export — $export)
  Given: An approved research partner requests de-identified FHIR data
  When: The admin initiates a Bulk Data export ($export operation)
  Then:
    - A de-identified FHIR Bundle is generated (dates shifted, names removed, postcodes truncated to 3 digits)
    - Export is available as NDJSON files at a secure download URL
    - Export is logged: who requested, what was exported, when, de-identification method applied
```

---

#### AD-011 — Backup and Restore Procedures
**As a** system administrator,
**I want to** have automated daily backups and a tested restore procedure,
**So that** in the event of data loss or disaster, the system can be recovered within the defined RTO/RPO.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | All |
| FHIR resource | N/A (infrastructure) |

**Acceptance Criteria:**

```
AC-AD-011-01 (Automated backup)
  Given: Daily backup schedule is configured
  When: The backup runs at 2:00 AM
  Then:
    - Full PostgreSQL backup (pg_dump or WAL-based) is completed
    - MongoDB backup (if used) is completed
    - Backup files are encrypted at rest (AES-256)
    - Backup is replicated to a geographically separate location

AC-AD-011-02 (Backup verification)
  Given: A backup has completed
  When: Automated verification runs
  Then:
    - A test restore is performed to a staging environment
    - Data integrity check verifies row counts and spot checks
    - Verification result (pass/fail) is emailed to the admin

AC-AD-011-03 (Recovery time objective)
  Given: A catastrophic failure occurs requiring full restore
  When: The restore is initiated
  Then:
    - RTO target: system operational within 4 hours
    - RPO target: no more than 24 hours of data loss (daily backup)
    - Restore procedure is documented in the runbook and tested quarterly
```

---

#### AD-012 — PHI Encryption at Rest
**As a** system administrator,
**I want to** ensure all PHI stored in the database is encrypted at rest,
**So that** even if a physical storage device is compromised, patient data cannot be read.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | All |
| FHIR resource | N/A (infrastructure) |

**Acceptance Criteria:**

```
AC-AD-012-01 (Database encryption)
  Given: PostgreSQL is configured for the production environment
  When: PHI tables (fhir_resources, lab_results, prescriptions, etc.) are created
  Then:
    - Transparent data encryption (TDE) or PostgreSQL pgcrypto is applied at the column level for HCN, name, DOB
    - Database files cannot be read without the encryption key
    - Keys are stored in a hardware security module (HSM) or managed key store (AWS KMS / Azure Key Vault)

AC-AD-012-02 (Encrypted in transit)
  Given: Any API call between services
  When: Data is transmitted
  Then:
    - TLS 1.3 is enforced on all connections (no TLS 1.2 fallback in production)
    - Certificate validity is monitored; expiry <30 days triggers an alert

AC-AD-012-03 (Key rotation)
  Given: Encryption keys are managed
  When: The annual key rotation is due
  Then:
    - Keys are rotated without downtime (key rotation procedure documented)
    - Old key is retained for historical data decryption during the transition period
    - Key rotation event is logged in the security audit trail
```

---

#### AD-013 — Rate Limiting and DDoS Protection
**As a** system administrator,
**I want to** enforce API rate limits to protect the system from abuse and denial-of-service attacks,
**So that** legitimate clinical users are not impacted by excessive automated requests.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | All |
| FHIR resource | N/A (infrastructure) |

**Acceptance Criteria:**

```
AC-AD-013-01 (Per-user rate limit)
  Given: An API client is configured with rate limit 100 requests/minute
  When: 101 requests are made within 60 seconds
  Then:
    - HTTP 429 Too Many Requests on the 101st request
    - Retry-After header specifies wait time
    - Rate limit state is tracked in Redis

AC-AD-013-02 (Per-IP rate limit for unauthenticated endpoints)
  Given: The /login and /api/auth endpoints are exposed
  When: An IP makes > 10 login attempts in 1 minute
  Then:
    - HTTP 429 is returned
    - IP is blocked for 15 minutes
    - Security alert is sent to admin: "Possible brute force on login from [IP]"

AC-AD-013-03 (FHIR server rate limiting)
  Given: A SMART app is making excessive FHIR queries
  When: Rate limit is exceeded
  Then:
    - HTTP 429 is returned with appropriate OperationOutcome
    - The SMART app token rate limit is tracked separately from other clients
```

---

#### AD-014 — System-Wide Announcements
**As a** system administrator,
**I want to** broadcast system announcements (planned maintenance, downtime, policy changes) to all logged-in users,
**So that** staff are informed without using external email.

| Field | Value |
|---|---|
| Priority | Could |
| Target app | EHR |
| FHIR resource | Communication |

**Acceptance Criteria:**

```
AC-AD-014-01 (Broadcast announcement)
  Given: The admin creates an announcement "System maintenance Sunday 2–4 AM"
  When: The announcement is published
  Then:
    - All currently logged-in users see a blue banner at the top of the screen
    - The banner shows announcement text with a close button
    - The announcement is also shown to users who log in until the expiry time

AC-AD-014-02 (Role-targeted announcement)
  Given: The admin creates an announcement for PHARMACIST role only
  When: Published
  Then:
    - Only users with role=PHARMACIST see the announcement
    - Other roles are unaffected

AC-AD-014-03 (Announcement expiry)
  Given: An announcement was created with expiry = 2 hours
  When: 2 hours pass
  Then:
    - The banner is automatically hidden
    - The announcement record remains in the admin console for reference
```

---

#### AD-015 — Error Boundaries and Clinical Fail-Safe UI
**As a** system administrator and developer,
**I want to** ensure that all clinical UI pages have error boundaries that degrade gracefully,
**So that** a crash in one component does not leave a clinician unable to access any patient information.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | N/A (frontend) |

**Acceptance Criteria:**

```
AC-AD-015-01 (React error boundary)
  Given: A component within the VisitDetail modal throws an unhandled exception
  When: The error occurs
  Then:
    - The error boundary catches the exception
    - A fallback UI is shown: "Unable to load this section — [Contact support link]"
    - The rest of the page continues to function
    - The error is logged to the monitoring system with stack trace

AC-AD-015-02 (Network failure graceful degradation)
  Given: The FHIR server is unreachable
  When: A clinical page tries to load patient data
  Then:
    - A banner is shown: "Some data is temporarily unavailable — displaying last cached information"
    - Cached data (if available) is shown
    - No blank/crashed page is presented to the clinician

AC-AD-015-03 (Critical page — no error boundary for auth)
  Given: The auth/login page encounters an error
  When: The error occurs
  Then:
    - The error boundary on the login page shows a full-page error with support contact
    - The error is logged without exposing PHI (no patient context at login)
```

---

### 4.10 Billing Specialist (BI)

---

#### BI-001 — Billing Work Queue
**As a** billing specialist,
**I want to** see a queue of completed encounters requiring coding and claim submission,
**So that** claims are processed promptly and revenue is not lost.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Claim, Encounter |

**Acceptance Criteria:**

```
AC-BI-001-01 (Billing queue)
  Given: An encounter reaches CHECKOUT_COMPLETE state
  When: The billing specialist opens the billing work queue
  Then:
    - The encounter appears in the queue: patient name, date, physician, appointment type, diagnosis (if coded), status=pending-billing
    - Queue is sorted by encounter date (oldest first)

AC-BI-001-02 (Claim from queue)
  Given: The billing specialist selects an encounter
  When: They open the claim form
  Then:
    - Patient demographics, HCN, appointment date, physician, and diagnosis codes are pre-populated
    - The billing specialist adds billing codes and submits

AC-BI-001-03 (Queue metrics)
  Given: The billing queue has 45 pending encounters
  When: The manager views the dashboard
  Then:
    - Total pending, total submitted today, average time in queue, and oldest pending date are shown
    - Encounters pending > 3 business days are highlighted
```

---

#### BI-002 — ICD-10-CA Coding Interface
**As a** billing specialist,
**I want to** code encounters with ICD-10-CA diagnosis codes for OHIP claim submission,
**So that** claims are accepted by the Ministry of Health.

**See DR-002 for diagnosis coding. Additional billing-specific criteria:**

```
AC-BI-002-01 (Billing code assignment)
  Given: The physician has coded I48.0 (AF) as primary diagnosis
  When: The billing specialist opens the claim form
  Then:
    - Primary diagnosis is pre-populated from Encounter.diagnosis
    - Billing specialist can add secondary and comorbidity codes
    - ICD-10-CA codes are validated against the Ontario Schedule of Benefits (some codes not OHIP-billable)

AC-BI-002-02 (Unbillable code alert)
  Given: The billing specialist adds a code that is not in the OHIP Schedule of Benefits
  When: The code is entered
  Then:
    - Alert: "Code X not billable under OHIP — consider alternative or self-pay billing"
    - The claim cannot be submitted with an unbillable code as primary
```

---

#### BI-003 — OHIP Fee Code Entry and Validation
**As a** billing specialist,
**I want to** select applicable OHIP fee codes for services rendered,
**So that** the claim reflects all billable services and the correct amount is submitted.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Claim (item.productOrService with OHIP fee codes) |

**Acceptance Criteria:**

```
AC-BI-003-01 (Fee code search)
  Given: The billing specialist opens fee code selection
  When: They type "ECG"
  Then:
    - OHIP fee codes matching ECG are shown: G038 (12-lead ECG), G039 (ECG interpretation), etc.
    - Each code shows: description, value (in units), whether specialist or GP applies

AC-BI-003-02 (Fee code validation — same day rules)
  Given: G038 and G039 are selected for the same encounter
  When: The claim is assembled
  Then:
    - OHIP same-day bundling rules are validated: G038 + G039 cannot be billed same day by same physician
    - An alert fires: "G038 and G039 cannot be billed together same day — remove one"

AC-BI-003-03 (Specialist vs GP codes)
  Given: The physician is a cardiologist (specialist)
  When: Fee codes are listed
  Then:
    - Specialist-eligible codes are shown (K codes for cardiology procedures)
    - GP-only codes are labelled "GP only — not applicable for specialist"
```

---

#### BI-004 — OHIP Claim Submission (MC EDT)
**As a** billing specialist,
**I want to** submit OHIP claims electronically via Ministry Connections Electronic Data Transfer (MC EDT),
**So that** claims are submitted within the billing period and payment is received.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Claim (submitted), ClaimResponse |

**Acceptance Criteria:**

```
AC-BI-004-01 (Electronic submission)
  Given: Claims are assembled for the month
  When: The billing specialist initiates submission via MC EDT
  Then:
    - Claims are exported in OHIP claim file format (S21)
    - File is transmitted to MC EDT
    - Submission confirmation number is received and stored
    - Each submitted Claim resource: status=active (submitted)

AC-BI-004-02 (Submission within billing period)
  Given: Claims must be submitted within 6 months of service date (OHIP rule)
  When: A claim's service date is approaching the 6-month limit
  Then:
    - A warning is shown: "This claim is approaching the OHIP submission deadline of [date] — submit now"
    - Claims past the deadline are flagged as "time-barred — cannot submit to OHIP"

AC-BI-004-03 (Remittance processing)
  Given: The OHIP remittance file arrives (RA file)
  When: The billing specialist imports it
  Then:
    - Each claim payment is matched to the submitted claim
    - Paid claims: Claim.status = completed
    - Rejected claims: move to rejected queue with error code and reason
```

---

#### BI-005 — Rejected Claim Management
**As a** billing specialist,
**I want to** manage rejected OHIP and insurance claims and resubmit after correction,
**So that** revenue that was initially rejected is recovered.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | ClaimResponse (outcome=error), Claim (corrected submission) |

**Acceptance Criteria:**

```
AC-BI-005-01 (Rejected claims queue)
  Given: Claims have been processed by OHIP and rejections returned
  When: The billing specialist opens Rejected Claims
  Then:
    - Each rejection shows: Claim ID, patient, service date, rejection code, rejection reason in plain English, recommended action

AC-BI-005-02 (Correction and resubmission)
  Given: A claim was rejected because the HCN was invalid
  When: The billing specialist corrects the HCN and resubmits
  Then:
    - Corrected Claim is created (based on original with corrections)
    - Resubmission is transmitted to MC EDT
    - Original claim is linked to the corrected one

AC-BI-005-03 (Write-off workflow)
  Given: A claim has been rejected and is irrecoverable (e.g. service outside OHIP scope)
  When: The billing specialist writes off the claim
  Then:
    - Claim.status = cancelled with reason "write-off"
    - Write-off amount is recorded for financial reporting
    - If patient is self-pay eligible, an invoice is generated for the patient
```

---

#### BI-006 — Private Insurance and Self-Pay Billing
**As a** billing specialist,
**I want to** generate invoices for patients whose services are not covered by OHIP,
**So that** the clinic receives payment for uninsured services.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Invoice, Claim (private insurer) |

**Acceptance Criteria:**

```
AC-BI-006-01 (Self-pay invoice generation)
  Given: A patient is not OHIP-eligible and receives a consultation
  When: The billing specialist creates an invoice
  Then:
    - Invoice is created with: service date, physician, service description, amount (per clinic fee schedule)
    - Invoice is sent to patient via email/mail
    - Patient can pay online via the patient portal

AC-BI-006-02 (Private insurance claim)
  Given: A patient has Blue Cross private insurance
  When: The billing specialist submits a claim
  Then:
    - Claim is submitted to the insurer's adjudication portal or clearinghouse
    - EOB response is recorded: approved amount, patient responsibility
    - Patient is invoiced for any remaining balance

AC-BI-006-03 (WSIB claim)
  Given: A patient was injured at work and the employer has WSIB coverage
  When: The billing specialist selects billing type = WSIB
  Then:
    - WSIB-specific fields are shown: employer name, claim number, injury date
    - WSIB claim form is generated and submitted to Ontario WSIB
```

---

#### BI-007 — Revenue Cycle Analytics
**As a** clinic manager,
**I want to** view revenue cycle KPIs including gross charges, collections, rejection rate, and accounts receivable aging,
**So that** the financial health of the clinic is visible and trends are tracked.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | MeasureReport (financial) |

**Acceptance Criteria:**

```
AC-BI-007-01 (Revenue dashboard)
  Given: The manager opens Revenue Analytics
  When: The dashboard loads for the current month
  Then:
    - KPIs: gross charges, net collections, collection rate %, OHIP rejection rate %, AR aging (30/60/90/90+ days)
    - Trend charts: monthly collections over 12 months

AC-BI-007-02 (AR aging detail)
  Given: AR aging shows $15,000 in 90+ day bucket
  When: The manager clicks on that bucket
  Then:
    - A list of all claims aged >90 days is shown: claim ID, patient, service date, amount, payer, last action
    - Individual claims can be exported for collections follow-up

AC-BI-007-03 (Physician productivity report)
  Given: The manager selects "Physician Productivity" report
  When: The report runs
  Then:
    - Each physician shows: billed encounters, billed value, collected value, collection rate, average claim value
    - Report is exportable as CSV
```

---

#### BI-008 — OHIP Billing Compliance — Time-Barred Claims Alert
**As a** billing specialist,
**I want to** receive alerts for claims approaching the OHIP 6-month submission deadline,
**So that** no billable encounter is lost due to missed submission.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Claim |

**Acceptance Criteria:**

```
AC-BI-008-01 (Deadline alert — 30 days)
  Given: A claim has a service date 5 months ago
  When: The daily deadline check runs
  Then:
    - A task is created in the billing queue: "DEADLINE APPROACHING — claim for [patient] service [date] — submit by [deadline date]"
    - Alert is also sent by email to the billing specialist

AC-BI-008-02 (Deadline alert — 7 days)
  Given: A claim has 7 days until the OHIP deadline
  When: The check runs
  Then:
    - URGENT flag added to the billing queue task
    - Email alert: "URGENT — OHIP submission deadline in 7 days for [claim]"
    - Clinic manager is also notified

AC-BI-008-03 (Time-barred claim lock)
  Given: A claim's service date is > 6 months ago
  When: The billing specialist tries to submit it to OHIP
  Then:
    - Submission is blocked: "This claim cannot be submitted to OHIP — service date more than 6 months ago (time-barred)"
    - Only private/self-pay billing is available
    - The time-barred claim is flagged in the revenue report as lost revenue
```

---

#### BI-009 — Superbill / Billing Summary from Encounter
**As a** billing specialist,
**I want to** generate a superbill (billing summary) directly from the encounter documentation,
**So that** billing accurately reflects the services documented by the physician.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | Claim (from Encounter) |

**Acceptance Criteria:**

```
AC-BI-009-01 (Superbill generation)
  Given: An encounter has a signed clinical note, ICD-10-CA diagnoses, and procedure orders
  When: The billing specialist clicks "Generate Superbill"
  Then:
    - A superbill is auto-populated: patient demographics, HCN, physician NPI/CPSO, service date, diagnoses, procedures, suggested OHIP fee codes (from procedure type → fee code mapping)
    - Billing specialist reviews and confirms before submission
    - Missing documentation is flagged: "No signed clinical note found — billing may be delayed"

AC-BI-009-02 (Procedure-to-fee-code mapping)
  Given: An ECG procedure was performed
  When: The superbill is generated
  Then:
    - ECG (procedure type=ECG) maps to OHIP G038 automatically
    - The mapping is configurable by admin (procedure type → fee code table)

AC-BI-009-03 (Incomplete documentation alert)
  Given: The physician has not yet signed the clinical note
  When: The billing specialist opens the superbill
  Then:
    - An amber warning: "Clinical note unsigned — some billing codes may not be supported by documentation"
    - Billing can be deferred until the note is signed
```

---

#### BI-010 — Patient Billing Statement
**As a** patient,
**I want to** receive a clear itemised billing statement for any services not fully covered by OHIP,
**So that** I understand what I am paying for and can resolve discrepancies.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR / Patient Portal |
| FHIR resource | Invoice |

**Acceptance Criteria:**

```
AC-BI-010-01 (Patient statement generation)
  Given: A patient has a balance owing after OHIP and insurance adjudication
  When: The billing specialist generates the patient statement
  Then:
    - Statement includes: service date, service description (plain English), OHIP coverage amount, insurance coverage, patient responsibility, amount paid, balance owing
    - No OHIP fee codes or ICD codes are shown (plain English only for patient)
    - Statement is sent via email with a secure payment link

AC-BI-010-02 (Payment plan)
  Given: A patient owes $350 and requests a payment plan
  When: The billing specialist creates a 3-month plan
  Then:
    - Three Invoice resources are created: $120, $120, $110 with due dates 30/60/90 days
    - Payment reminders are sent automatically before each due date
    - Patient portal shows the payment plan with amounts and due dates

AC-BI-010-03 (Dispute management)
  Given: A patient disputes a charge
  When: They click "Dispute This Charge" in the patient portal or call the clinic
  Then:
    - A dispute record is created linked to the Invoice
    - Billing specialist is notified: "Patient dispute for Invoice [ID] — [patient name] — amount [X]"
    - Invoice is put on hold (not sent to collections) pending resolution
```

---

### 4.11 Cardiac Technician (TK)

---

#### TK-001 — ECG Result Entry and Structured Interpretation
**As a** cardiac technician,
**I want to** enter a structured ECG result including rhythm, rate, intervals, and interpretation,
**So that** cardiologists can review a complete, standardised report without receiving a raw paper trace.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | DiagnosticReport (ECG), Observation (components) |

**Acceptance Criteria:**

```
AC-TK-001-01 (Structured ECG result)
  Given: The technician has completed an ECG
  When: They open the ECG result entry form
  Then:
    - Structured fields: rhythm (coded: sinus/AF/flutter/etc.), rate (bpm), PR interval (ms), QRS duration (ms), QTc (ms), axis, ST changes (present/absent + description)
    - Each field creates a corresponding FHIR Observation component
    - Free text interpretation field is also available
    - DiagnosticReport is created with effectiveDateTime, performer (technician)

AC-TK-001-02 (Critical ECG finding)
  Given: The ECG shows ST elevation > 2mm in 2 contiguous leads
  When: The technician enters this finding and checks "Critical — STEMI"
  Then:
    - criticalFindings = true
    - A STAT alert fires to the cardiologist: "CRITICAL ECG — STEMI pattern — patient [name] — immediate review required"
    - Alert cannot be dismissed without physician acknowledgement
    - Visit priority is escalated to URGENT automatically

AC-TK-001-03 (SCP-ECG / waveform storage)
  Given: The ECG machine outputs a digital file (SCP-ECG or HL7 aECG)
  When: The technician uploads the file
  Then:
    - The waveform file is stored as a DocumentReference attachment
    - A waveform viewer renders the ECG on screen (or links to a compatible viewer)
    - The DiagnosticReport.presentedForm references the waveform file
```

---

#### TK-002 — Echo Structured Result Form
**As a** cardiac technician (sonographer),
**I want to** enter a structured echocardiogram report with EF, wall motion, valve assessments, and dimensions,
**So that** cardiologists receive standardised echo data without free-text ambiguity.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | DiagnosticReport (Echo), Observation (components) |

**Acceptance Criteria:**

```
AC-TK-002-01 (Echo result form)
  Given: The sonographer opens the Echo result entry form
  When: They complete all fields and save
  Then:
    - Structural fields: LVEF % (method: visual/biplane/3D), LV dimensions (LVIDD, LVIDS mm), IVS and LVPW thickness, LA size, Mitral valve (normal/regurgitation/stenosis grade), Aortic valve (normal/regurgitation/stenosis grade/area), Tricuspid valve, Pericardial effusion (none/small/moderate/large)
    - Each field as Observation component with LOINC code
    - Interpretation: Normal / Mild / Moderate / Severe abnormality + free text
    - FHIR DiagnosticReport created with all Observations referenced

AC-TK-002-02 (EF classification)
  Given: EF is entered as 32%
  When: Saved
  Then:
    - Classification is auto-applied: EF <40% = reduced (HFrEF)
    - DiagnosticReport.conclusion includes the classification
    - An alert fires to the cardiologist: "Echo: LVEF 32% — Severely Reduced — HFrEF"

AC-TK-002-03 (Critical finding — pericardial tamponade)
  Given: The technician selects "Large pericardial effusion" and "Tamponade physiology present"
  When: Saved
  Then:
    - criticalFindings = true
    - Immediate STAT alert to cardiologist: "CRITICAL: Pericardial tamponade — patient [name]"
    - Visit priority escalated to URGENT
```

---

#### TK-003 — Stress Test Protocol Documentation
**As a** cardiac technician,
**I want to** document a stress test including protocol used, stages completed, symptoms, ECG changes, and haemodynamic response,
**So that** the cardiologist has complete data to interpret the test.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | DiagnosticReport, Observation, Procedure |

**Acceptance Criteria:**

```
AC-TK-003-01 (Protocol documentation)
  Given: A Bruce protocol stress test is performed
  When: The technician opens the stress test result form
  Then:
    - Fields: protocol (Bruce/modified Bruce/bicycle), max HR achieved (bpm), % of age-predicted max HR, METs achieved, duration (minutes), reason for stopping (completion/fatigue/symptoms/ECG changes/haemodynamic instability)
    - Stage-by-stage data entry: HR, BP, and ECG summary per stage

AC-TK-003-02 (Symptom and ECG changes)
  Given: The patient developed chest pain at Stage 3
  When: The technician documents this
  Then:
    - Symptom onset recorded: stage, time, description
    - ST changes at peak: documented (lead, magnitude, pattern)
    - If exercise-induced ST depression ≥ 1mm: auto-flag "Positive test — possible ischaemia"

AC-TK-003-03 (Test termination criteria)
  Given: The test was stopped due to ECG — VT
  When: The termination reason is selected
  Then:
    - "Ventricular tachycardia" is selected from the coded list
    - An urgent alert fires to the cardiologist
    - Emergency protocol note is visible in the report
```

---

#### TK-004 — Holter Monitor Assignment and Return
**As a** cardiac technician,
**I want to** assign a Holter monitor device to a patient, set the wear duration, and process the returned monitor,
**So that** Holter data is linked to the correct patient and processed for arrhythmia analysis.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | DeviceUseStatement, ServiceRequest, DiagnosticReport |

**Acceptance Criteria:**

```
AC-TK-004-01 (Monitor assignment)
  Given: A ServiceRequest for Holter monitoring is in the technician's queue
  When: They assign Monitor Serial Number HLT-00142 and set wear duration to 24 hours
  Then:
    - DeviceUseStatement is created: device=Holter HLT-00142, patient, timing=24h, recorded by technician
    - Patient is given instructions and the monitor
    - ServiceRequest.status = in-progress

AC-TK-004-02 (Monitor return and data upload)
  Given: The patient returns the monitor after 24 hours
  When: The technician uploads the Holter data file
  Then:
    - Data file is stored as a DocumentReference attachment
    - A preliminary DiagnosticReport is created for the cardiologist to review

AC-TK-004-03 (Holter report)
  Given: The cardiologist has interpreted the Holter recording
  When: They complete the interpretation form
  Then:
    - DiagnosticReport.status = final
    - Findings: dominant rhythm, maximum HR, minimum HR, significant arrhythmias (coded: AF burden, PVC count, pauses), patient-activated events
    - Critical finding (e.g. 6-second pause): alert fires immediately
```

---

#### TK-005 — DICOM Viewer Integration
**As a** cardiac technician or cardiologist,
**I want to** view DICOM imaging (Echo cine loops, stress test images) directly within the EHR,
**So that** clinical review does not require a separate PACS workstation.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | ImagingStudy, ImagingSelection |

**Acceptance Criteria:**

```
AC-TK-005-01 (DICOM viewer embedded)
  Given: An Echo DICOM study is linked to a patient encounter
  When: The cardiologist clicks "View Images"
  Then:
    - An embedded DICOM viewer (e.g. Cornerstone3D or OHIF Viewer) loads within the EHR
    - Cine loops play automatically
    - Standard DICOM tools are available: window/level, zoom, pan, length measurement, annotations

AC-TK-005-02 (PACS integration)
  Given: The clinic has a PACS server configured
  When: An ImagingStudy is created in the FHIR server
  Then:
    - The DICOM series is fetched from PACS via DICOMweb (WADO-RS) using StudyInstanceUID
    - No DICOM files are duplicated in the EHR database (DICOMweb streaming)

AC-TK-005-03 (Study comparison — previous vs current)
  Given: A patient has two Echo studies (current and 12 months ago)
  When: The cardiologist opens the DICOM viewer
  Then:
    - Both studies can be loaded side-by-side for comparison
    - Measurements from the previous study are overlaid for reference
```

---

#### TK-006 — Critical Finding Escalation
**As a** cardiac technician,
**I want to** flag critical findings and have an automated escalation workflow fire,
**So that** no critical cardiac finding goes unacknowledged by the responsible cardiologist.

**See LT-005 for panic value escalation pattern. TK-specific criteria:**

```
AC-TK-006-01 (Critical finding — technician initiates)
  Given: The technician identifies a critical finding during procedure
  When: They check "Critical Finding" and select reason
  Then:
    - A CommunicationRequest fires immediately to the ordering cardiologist
    - In-app red banner: "CRITICAL: [Procedure type] — [finding] — patient [name] — Room [X]"
    - SMS is sent to cardiologist mobile
    - The technician cannot mark the procedure complete until physician acknowledges

AC-TK-006-02 (Escalation if not acknowledged within 5 minutes)
  Given: Critical finding was sent 5 minutes ago and unacknowledged
  When: Timer fires
  Then:
    - Escalation to on-call cardiologist and charge nurse
    - A secondary CommunicationRequest is created

AC-TK-006-03 (Verbal acknowledgement documentation)
  Given: The cardiologist verbally acknowledged by phone
  When: The technician documents it
  Then:
    - Communication resource created: medium=phone, acknowledged_by=cardiologist ID (manual entry), time of verbal acknowledgement
    - This satisfies the acknowledgement requirement
```

---

#### TK-007 — Previous Study Comparison
**As a** cardiac technician or cardiologist,
**I want to** compare current procedure results against previous studies from the same patient,
**So that** progression or regression of disease is immediately visible.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | DiagnosticReport (previous), ImagingStudy |

**Acceptance Criteria:**

```
AC-TK-007-01 (Previous study display)
  Given: A patient has had 3 Echo studies in the past
  When: The technician or cardiologist opens the current study's result form
  Then:
    - A "Prior Studies" panel shows all previous DiagnosticReports for the same procedure type
    - Dates and key parameters (LVEF, LV dimensions) are shown for each prior study
    - Technician can load any prior study alongside the current for comparison

AC-TK-007-02 (Trend chart for quantitative parameters)
  Given: 3 Echo studies exist with LVEF measurements of 58%, 50%, 38% over 3 years
  When: The current study is being reviewed
  Then:
    - A trend chart shows LVEF vs date across all studies
    - The decline trend is visually apparent
    - The cardiologist can click any point to open the full report for that date
```

---

#### TK-008 — Technician Workload Management
**As a** cardiac technician or department manager,
**I want to** view the workload distribution across technicians and procedure queues,
**So that** work is balanced and no queue is overloaded.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Task (procedure queue), Practitioner |

**Acceptance Criteria:**

```
AC-TK-008-01 (Workload dashboard)
  Given: The technician manager opens the workload dashboard
  When: It loads
  Then:
    - Each technician is shown with: number of procedures assigned today, completed, pending, in-progress
    - Total queue depth per procedure type (ECG, Echo, Stress, Holter) is shown

AC-TK-008-02 (Manual reassignment)
  Given: James Lee has 8 pending ECGs and Sarah Kim has 2
  When: The manager reassigns 3 ECGs from James to Sarah
  Then:
    - Task.owner is updated to Sarah Kim for 3 procedures
    - Sarah receives a notification: "3 procedures reassigned to you"
    - James's queue updates in real time

AC-TK-008-03 (Auto-balance suggestion)
  Given: One technician has > 2x the workload of any other available technician
  When: A new procedure arrives
  Then:
    - The system suggests the technician with the lowest current workload
    - Manager can accept the suggestion or manually assign
```

---

#### TK-009 — FHIR DiagnosticReport Write-Back
**As a** cardiac technician,
**I want to** ensure that all completed procedure results are stored as FHIR DiagnosticReport resources in the FHIR server,
**So that** results are accessible via standard FHIR queries by any integrated system.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR + FHIR |
| FHIR resource | DiagnosticReport, Observation |

**Acceptance Criteria:**

```
AC-TK-009-01 (DiagnosticReport creation on save)
  Given: A technician saves a completed ECG result form
  When: The save completes
  Then:
    - A FHIR DiagnosticReport resource is created in the FHIR server
    - DiagnosticReport.result[] references all component Observations
    - DiagnosticReport.basedOn references the original ServiceRequest
    - DiagnosticReport.status = final
    - DiagnosticReport.subject = Patient FHIR ID

AC-TK-009-02 (Observation codes)
  Given: ECG rhythm = "Sinus tachycardia" is entered
  When: The Observation is created
  Then:
    - Observation.code = LOINC 8633-4 (ECG rhythm)
    - Observation.valueCodeableConcept = SNOMED 3424008 (Sinus tachycardia)
    - Observation.interpretation includes: "H" (heart rate above normal)

AC-TK-009-03 (FHIR write-back failure handling)
  Given: The FHIR server is temporarily unavailable
  When: The technician saves a result
  Then:
    - The result is saved locally in the EHR database
    - A background retry queue attempts to write to FHIR every 5 minutes
    - The technician sees: "Result saved — FHIR sync pending"
    - Admin is notified of pending FHIR writes
```

---

#### TK-010 — Procedure Room Equipment Status
**As a** cardiac technician,
**I want to** view equipment status (available / in use / maintenance) for each procedure room,
**So that** I can select the correct room and avoid scheduling conflicts.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | Location, Device |

**Acceptance Criteria:**

```
AC-TK-010-01 (Equipment status view)
  Given: The technician opens the Room/Equipment view
  When: It loads
  Then:
    - Each procedure room is shown with equipment list: ECG machine, ultrasound, treadmill, Holter recorder
    - Equipment status: available (green), in use (yellow with patient name), out of service (red)
    - Last maintenance date is shown for each device

AC-TK-010-02 (Flag equipment out of service)
  Given: An ECG machine malfunctions
  When: The technician flags it as "Out of Service"
  Then:
    - Device.status = inactive
    - Room availability is updated: "ECG machine unavailable"
    - The scheduling system prevents new ECG procedures from being booked in that room
    - The biomedical engineering team is notified via email

AC-TK-010-03 (Equipment return to service)
  Given: The ECG machine is repaired and tested
  When: The biomed team marks it as serviceable
  Then:
    - Device.status = active
    - Room availability updates to reflect equipment availability
    - Maintenance record with repair details is logged
```


---

### 4.12 Cross-Cutting Features (CC)

---

#### CC-001 — Real-Time WebSocket / SSE Notifications
**As a** clinical staff member,
**I want to** receive real-time push notifications for critical events (critical lab values, patient arrivals, new orders) without polling,
**So that** urgent clinical information reaches me immediately rather than after a 30-second polling delay.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | All |
| FHIR resource | AuditEvent, Communication (triggered) |

**Acceptance Criteria:**

```
AC-CC-001-01 (WebSocket connection)
  Given: A clinical user logs in
  When: The dashboard loads
  Then:
    - A WebSocket connection is established to the notification server
    - Connection status indicator is shown (green dot in UI corner)
    - If connection drops, automatic reconnection is attempted every 5 seconds
    - Maximum reconnect attempts: 10 before showing "Connection lost — please refresh"

AC-CC-001-02 (Critical value push)
  Given: A critical lab result is finalised
  When: The LIMS publishes the event to Redis pub/sub
  Then:
    - All WebSocket clients for the affected practitioner receive the notification within 2 seconds
    - The notification shows: patient name, test, critical value, flag
    - An audible alert sounds (configurable per user)

AC-CC-001-03 (New patient arrival push)
  Given: A patient checks in (Appointment.status → arrived)
  When: The event is published
  Then:
    - Nursing and receptionist dashboards update within 2 seconds
    - The patient appears in the nursing queue without page refresh

AC-CC-001-04 (SSE fallback)
  Given: WebSocket is blocked by a hospital firewall
  When: The connection falls back to Server-Sent Events (SSE)
  Then:
    - Unidirectional server-to-client events continue to function
    - The UI shows: "Live updates active (SSE mode)"

AC-CC-001-05 (Notification preferences)
  Given: A user wants to suppress non-critical notifications during a consultation
  When: They enable "Focus Mode"
  Then:
    - Non-critical notifications (new messages, routine queue items) are suppressed
    - Critical alerts (critical lab values, CTAS-1) still fire regardless of focus mode
    - Focus mode auto-disables after 30 minutes
```

---

#### CC-002 — Temporal Workflow Engine (Long-Running Processes)
**As a** system architect,
**I want to** implement Temporal.io for long-running clinical workflows (lab result routing, prescription lifecycle, appointment reminder chain),
**So that** complex multi-step processes are reliable, retryable, and observable without writing custom state machines.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | All backends |
| FHIR resource | N/A (infrastructure) |

**Acceptance Criteria:**

```
AC-CC-002-01 (Lab result routing workflow)
  Given: A lab result is finalised
  When: A Temporal workflow "LabResultRouting" is triggered
  Then:
    - Workflow steps execute in order: (1) check interpretation flags, (2) if critical → escalation workflow, (3) notify ordering physician, (4) update FHIR DiagnosticReport status, (5) OLIS submission
    - Each step is independently retryable on failure
    - Workflow history is visible in the Temporal UI

AC-CC-002-02 (Appointment reminder chain workflow)
  Given: An appointment is booked
  When: A Temporal workflow "AppointmentReminders" is triggered
  Then:
    - 72h before: send email reminder
    - 24h before: send SMS reminder
    - If no check-in by appointment + 15 min: trigger no-show workflow
    - Each scheduled activity is cancellable if the appointment is cancelled

AC-CC-002-03 (Workflow observability)
  Given: A critical value escalation workflow is running
  When: The admin opens the Temporal dashboard
  Then:
    - Workflow execution history is visible: each step with timestamp, status, retry count
    - If a step has failed 3 times: an alert is shown to the admin for manual intervention

AC-CC-002-04 (Idempotency)
  Given: A Temporal workflow activity is retried due to network failure
  When: The retry executes the same step again
  Then:
    - The FHIR resource is not created twice (idempotency key check)
    - The notification is not sent twice (deduplication check)
```

---

#### CC-003 — Patient Demographics Management (Create/Edit Patient FHIR Record)
**As a** receptionist or clinician,
**I want to** create and edit patient demographic records that are backed by FHIR Patient resources,
**So that** all applications share a consistent, authoritative patient identity.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR + FHIR |
| FHIR resource | Patient |

**Acceptance Criteria:**

```
AC-CC-003-01 (Create FHIR Patient on registration)
  Given: A new patient is registered in the EHR
  When: The registration is saved
  Then:
    - A FHIR Patient resource is created in the FHIR server
    - Patient.identifier includes: MRN (tenant-specific), HCN (with Ontario system URI)
    - Patient.name is structured: family, given, prefix
    - Patient.birthDate, Patient.gender, Patient.address, Patient.telecom are all populated
    - Patient.communication[0].language = patient preferred language

AC-CC-003-02 (Update FHIR Patient on demographics change)
  Given: A patient's address is updated at check-in
  When: The update is saved
  Then:
    - FHIR Patient resource is updated (PUT or PATCH) in the FHIR server
    - Patient resource versionId is incremented
    - The update is audited in AuditEvent with changed fields

AC-CC-003-03 (Patient search across all apps)
  Given: A pharmacist needs to find a patient by name or HCN
  When: They search in PharmacyMS
  Then:
    - The search queries the FHIR server (GET /fhir/R4/Patient?identifier=HCN or ?name=)
    - Results are displayed with: name, DOB, MRN, HCN (masked)
    - Selecting a patient loads their full FHIR profile

AC-CC-003-04 (Merge duplicate patients)
  Given: Two Patient resources were created for the same person
  When: The admin initiates a merge
  Then:
    - The duplicate is linked to the primary via Patient.link (replaces)
    - All clinical resources (Conditions, Observations, MedicationRequests) are re-linked to the primary patient
    - The duplicate Patient.active = false
    - Merge is logged with merged patient IDs and actor
```

---

#### CC-004 — Inter-Application FHIR Integration (EHR ↔ LIMS ↔ PharmacyMS)
**As a** system architect,
**I want to** define and implement standard FHIR API contracts between EHR, LIMS, and PharmacyMS,
**So that** data flows seamlessly across applications without proprietary point-to-point integrations.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | All |
| FHIR resource | ServiceRequest, MedicationRequest, DiagnosticReport |

**Acceptance Criteria:**

```
AC-CC-004-01 (EHR → LIMS: lab order)
  Given: A physician orders a CBC in the EHR
  When: The ServiceRequest is created
  Then:
    - The FHIR server notifies LIMS via Subscription (FHIR R4 topic-based subscription)
    - LIMS creates a lab_order record from the ServiceRequest
    - Round-trip latency: ServiceRequest created → LIMS order visible < 5 seconds

AC-CC-004-02 (LIMS → EHR: result)
  Given: LIMS results a DiagnosticReport
  When: The DiagnosticReport is created/updated in the FHIR server
  Then:
    - EHR receives notification via Subscription
    - The result appears in the physician's Results tab within 5 seconds
    - A real-time notification fires if interpretation is abnormal

AC-CC-004-03 (EHR → PharmacyMS: prescription)
  Given: A physician creates a MedicationRequest in the EHR
  When: The MedicationRequest status is set to "active"
  Then:
    - PharmacyMS is notified via FHIR Subscription
    - A prescription record is created in PharmacyMS prescriptions table
    - PharmacyMS acknowledges receipt to EHR within 10 seconds

AC-CC-004-04 (PharmacyMS → EHR: dispense)
  Given: A prescription is dispensed in PharmacyMS
  When: The MedicationDispense is created
  Then:
    - EHR MedicationRequest.status is updated to "completed" (if all refills used)
    - The physician sees "Dispensed — [pharmacy] — [timestamp]" in the Orders tab

AC-CC-004-05 (Integration failure visibility)
  Given: An EHR → LIMS order notification fails
  When: The subscription delivery fails 3 times
  Then:
    - An incident is created in the admin integration monitoring dashboard
    - The order is flagged in EHR: "Lab order pending — LIMS sync delayed"
    - A manual retry option is available to the admin
```

---

#### CC-005 — SMART on FHIR Authorization Server
**As a** FHIR server administrator,
**I want to** implement a standards-compliant SMART on FHIR authorization server,
**So that** third-party SMART apps can launch in context without requiring separate login credentials.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | FHIR |
| FHIR resource | CapabilityStatement (security endpoint) |

**Acceptance Criteria:**

```
AC-CC-005-01 (SMART well-known endpoint)
  Given: A SMART app queries the FHIR server for authorization details
  When: GET /.well-known/smart-configuration
  Then:
    - JSON response includes: authorization_endpoint, token_endpoint, scopes_supported, capabilities (launch-ehr, launch-standalone, client-public, permission-patient, permission-user)
    - Response conforms to SMART App Launch IG 2.0.0

AC-CC-005-02 (EHR launch flow)
  Given: A physician launches a SMART app from the EHR
  When: The launch sequence executes
  Then:
    - EHR redirects to SMART app with: iss (FHIR base URL), launch token
    - SMART app exchanges launch token for access token + patient context (patient ID, encounter ID)
    - Access is scoped to approved scopes only (e.g. patient/*.read)

AC-CC-005-03 (Token validation)
  Given: A SMART app makes a FHIR API call
  When: The request is received
  Then:
    - The JWT access token is validated: signature, expiry, iss, aud, scope
    - If invalid: HTTP 401 with WWW-Authenticate header
    - If scope insufficient: HTTP 403

AC-CC-005-04 (Refresh token)
  Given: A SMART app access token expires after 15 minutes
  When: The app refreshes using its refresh token
  Then:
    - New access token is issued
    - Refresh token rotation: old refresh token invalidated, new one issued
    - No re-authorisation prompt for the user
```

---

#### CC-006 — PCR (Provincial Client Registry) Integration
**As a** receptionist or triage nurse,
**I want to** look up and verify patient identity against the Ontario Provincial Client Registry,
**So that** patient records are linked to the provincial master patient index.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR + FHIR |
| FHIR resource | Patient (matched against PCR) |

**Acceptance Criteria:**

```
AC-CC-006-01 (PCR query)
  Given: A receptionist enters a patient's HCN at registration
  When: They click "Verify with PCR"
  Then:
    - A FHIR Patient $match or direct PCR API query is sent
    - Response returns: matched patient demographics (name, DOB, address, HCN validity)
    - Demographics are shown for the receptionist to confirm

AC-CC-006-02 (PCR match confidence)
  Given: The PCR returns a match with confidence < 70%
  When: The result is displayed
  Then:
    - Warning: "Low-confidence PCR match — verify additional identifiers"
    - Receptionist must manually verify before the PCR demographics are applied

AC-CC-006-03 (PCR update — address change)
  Given: A patient's address was updated in the EHR
  When: The update is saved
  Then:
    - A PCR update request is queued
    - PCR acknowledges the update
    - Patient.identifier[PCR-enterprise-ID] is stored linking EHR patient to PCR

AC-CC-006-04 (PCR offline handling)
  Given: The PCR service is unavailable
  When: Registration proceeds
  Then:
    - Registration continues without PCR verification
    - Patient is flagged: "PCR verification pending — complete when service is restored"
    - A batch PCR verification job runs when connectivity is restored
```

---

#### CC-007 — Bilingual Support (EN/FR) Completion
**As a** French-speaking healthcare worker or patient,
**I want to** use all features of the system in Canadian French,
**So that** the Official Languages Act obligation is met for any federal or Ontario francophone context.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR (all pages) |
| FHIR resource | N/A (UI) |

**Acceptance Criteria:**

```
AC-CC-007-01 (Complete French translation)
  Given: A user selects French (fr-CA) as their language
  When: Any page in the EHR renders
  Then:
    - All UI labels, buttons, error messages, navigation items, table headers, tooltips, and notifications are in French
    - No English text appears unless no French translation exists (in which case English is shown with EN indicator)
    - Language is persistent across sessions (stored in user preferences)

AC-CC-007-02 (Clinical terminology in French)
  Given: A nurse views a patient's allergy list in French
  When: The allergy names are displayed
  Then:
    - SNOMED CT Canadian French synonyms are used for display
    - Drug names use French Canadian naming conventions
    - If a French term does not exist: English term shown with "(EN)" label

AC-CC-007-03 (French date formats)
  Given: The system language is French
  When: Dates are displayed
  Then:
    - Dates are formatted: DD/MM/YYYY (e.g. 29/06/2026)
    - Month names are in French: janvier, février, mars...
    - Times use 24h format (French convention)

AC-CC-007-04 (Bilingual documents)
  Given: A clinic is required to produce bilingual documents
  When: A discharge summary is generated
  Then:
    - The document header is in both English and French
    - Section headings are bilingual
    - Clinical narrative remains in the language the note was written in
```

---

#### CC-008 — Offline / Progressive Web App Mode
**As a** clinical staff member in an area with intermittent connectivity,
**I want to** continue viewing patient information and recording basic data during network outages,
**So that** patient care is not disrupted by connectivity issues.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | N/A (PWA / service worker) |

**Acceptance Criteria:**

```
AC-CC-008-01 (Service worker caching)
  Given: A nurse has logged in and loaded today's patient queue
  When: Network connectivity is lost
  Then:
    - The patient queue data is served from the service worker cache
    - The UI shows: "Offline mode — data shown as of [last sync timestamp]"
    - Clinical actions that require network (FHIR writes) are queued

AC-CC-008-02 (Offline data capture)
  Given: A nurse records vitals while offline
  When: The vitals are saved
  Then:
    - Vitals are stored in IndexedDB (local cache)
    - The entry is marked "Pending sync — offline"
    - When connectivity is restored, vitals are synced to the server automatically

AC-CC-008-03 (Conflict resolution)
  Given: A vitals entry was made offline while another user updated the same record online
  When: Sync occurs
  Then:
    - A conflict resolution prompt shows both values
    - The nurse selects which value to keep
    - The chosen value is saved and both versions are logged in the history

AC-CC-008-04 (PWA installability)
  Given: A tablet-based nursing station needs the app installed as a PWA
  When: The manifest is served
  Then:
    - The browser prompts "Add to Home Screen"
    - The installed PWA opens full-screen without a browser address bar
    - The app icon is the clinic logo
```

---

#### CC-009 — Mobile and Tablet Optimised Layout
**As a** nurse or PCA using a tablet,
**I want to** use the clinical application comfortably on a 768px tablet screen,
**So that** bedside care documentation is practical on mobile devices.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | EHR |
| FHIR resource | N/A (responsive UI) |

**Acceptance Criteria:**

```
AC-CC-009-01 (Tablet layout — 768px)
  Given: The EHR is opened on a 768px wide tablet
  When: Any clinical page loads
  Then:
    - Navigation collapses to a sidebar toggle or bottom navigation
    - Data tables reflow to card view
    - All interactive elements are minimum 44x44px
    - No horizontal scrolling is required on any primary content

AC-CC-009-02 (Touch-optimised interactions)
  Given: A nurse is using a touchscreen
  When: They interact with the vitals entry form
  Then:
    - Sliders (pain score, SpO2) are large and respond to touch
    - Number inputs have a large keypad
    - Swipe gestures navigate between tabs (e.g. left/right swipe in VisitDetail)

AC-CC-009-03 (Touch-screen CTAS selector)
  Given: A triage nurse uses a touchscreen
  When: They select a CTAS level
  Then:
    - Each CTAS option is a large button (min 60x80px)
    - Selected CTAS is visually distinct (border + fill)
    - No hover-dependent interactions (hover is not available on touch)
```

---

#### CC-010 — FHIR R4 Profile Validation
**As a** FHIR server administrator,
**I want to** validate all FHIR resources against the appropriate Canadian (CA Baseline, ON Health IG) and US Core profiles before storage,
**So that** stored resources are interoperable with provincial and national health systems.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | FHIR |
| FHIR resource | StructureDefinition, OperationOutcome |

**Acceptance Criteria:**

```
AC-CC-010-01 (CA Baseline validation)
  Given: A Patient resource is submitted to the FHIR server
  When: The resource is validated against the CA Baseline Patient profile
  Then:
    - Mandatory elements (identifier with Canadian MRN or HCN, name.family, birthDate) are present
    - If validation fails: HTTP 422 with OperationOutcome listing each violation
    - If validation passes: resource is stored

AC-CC-010-02 (ON Health IG validation)
  Given: A DiagnosticReport is submitted with Ontario-specific extensions
  When: The resource is validated against the Ontario OLIS IG profile
  Then:
    - OLIS-required elements are validated (accession number, ordering facility, OHIP patient identifier)
    - Profile validation warnings (not errors) are returned in OperationOutcome.issue (severity=warning)
    - Resource is stored if only warnings exist (errors block storage)

AC-CC-010-03 (Terminology validation)
  Given: An Observation is submitted with an invalid LOINC code
  When: Validated
  Then:
    - OperationOutcome.issue: "Unknown code [code] in system LOINC — terminology validation failed"
    - Resource is rejected if terminology binding is required

AC-CC-010-04 (Profile selection by resource type)
  Given: A MedicationRequest is submitted
  When: Validation runs
  Then:
    - If the system is in PrescribeIT mode: PrescribeIT MedicationRequest profile is validated
    - If in CA Baseline mode: CA Baseline profile
    - Profile selection is configurable per tenant
```

---

#### CC-011 — Error Handling and User Feedback Standards
**As a** clinical user,
**I want to** receive clear, actionable error messages when something goes wrong,
**So that** I know what happened and what I can do to resolve it.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | All |
| FHIR resource | OperationOutcome |

**Acceptance Criteria:**

```
AC-CC-011-01 (Friendly error messages)
  Given: An API call fails with HTTP 500
  When: The frontend receives the error
  Then:
    - User sees: "Something went wrong — please try again or contact support if the problem persists"
    - A support reference code is shown (correlation ID)
    - Technical stack trace is NOT shown to the user

AC-CC-011-02 (FHIR OperationOutcome parsing)
  Given: A FHIR server returns a 422 with OperationOutcome
  When: The frontend processes it
  Then:
    - Each issue in OperationOutcome is shown as an inline field error or form error
    - Issues with location are shown next to the relevant field
    - Issues without location are shown as a form-level error banner

AC-CC-011-03 (Network error recovery)
  Given: A form submission fails due to a network timeout
  When: The user is notified
  Then:
    - Message: "Unable to save — check your connection and try again"
    - Form data is preserved (not cleared)
    - A "Retry" button is shown

AC-CC-011-04 (Concurrent edit conflict)
  Given: Two users edit the same record simultaneously
  When: The second save is attempted
  Then:
    - HTTP 409 Conflict is returned
    - User sees: "This record was modified by another user — please refresh to see the latest version and re-apply your changes"
    - No data is silently overwritten
```

---

#### CC-012 — End-to-End Test Suite (Playwright)
**As a** developer and QA engineer,
**I want to** have a comprehensive Playwright e2e test suite covering critical clinical workflows,
**So that** regressions in patient safety-critical paths are caught before production deployment.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | EHR |
| FHIR resource | N/A (test infrastructure) |

**Acceptance Criteria:**

```
AC-CC-012-01 (Critical path coverage)
  Given: The e2e test suite is run
  When: All tests execute
  Then:
    - Minimum coverage: login as each role, triage workflow (CTAS + vitals), physician note + order, lab result display, patient appointment booking
    - All critical path tests pass on every CI pipeline run
    - A failing critical path test blocks deployment

AC-CC-012-02 (Test isolation)
  Given: A Playwright test creates a patient
  When: The test completes
  Then:
    - Test data is cleaned up (patient deleted or test-flagged)
    - Tests can run in parallel without data conflicts

AC-CC-012-03 (Accessibility tests in e2e)
  Given: Key pages are loaded in Playwright
  When: Axe-core accessibility scan runs
  Then:
    - Zero WCAG 2.2 AA critical violations are acceptable
    - Any new violations fail the CI pipeline
    - Violations are reported with element selector, rule, and remediation guidance

AC-CC-012-04 (API contract tests)
  Given: FHIR API contract tests run
  When: LIMS and PharmacyMS APIs are tested
  Then:
    - All documented API endpoints are tested with valid and invalid inputs
    - Response shapes are validated against API contract (JSON Schema)
    - 100% endpoint coverage on all critical CRUD operations
```

---

#### CC-013 — Unit Test Coverage Targets (Vitest)
**As a** developer,
**I want to** maintain minimum unit test coverage on all clinical logic functions,
**So that** business rules (CTAS classification, NEWS2 calculation, DUR engine, billing rules) are verified automatically.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | All |
| FHIR resource | N/A (test infrastructure) |

**Acceptance Criteria:**

```
AC-CC-013-01 (Coverage threshold)
  Given: Unit tests are run with coverage reporting
  When: The CI pipeline runs
  Then:
    - Line coverage ≥ 80% for all clinical logic modules (NEWS2, CTAS, DUR, billing, dose calculation)
    - Branch coverage ≥ 75%
    - Any module below threshold fails the CI pipeline

AC-CC-013-02 (NEWS2 calculation unit tests)
  Given: The NEWS2 calculation function is tested
  When: Unit tests run
  Then:
    - All 6 parameter combinations are tested
    - Boundary values are tested: exact threshold values (e.g. SpO2 = 95%)
    - Both SpO2 Scale 1 and Scale 2 (COPD) are tested
    - All test cases pass

AC-CC-013-03 (DUR rule engine unit tests)
  Given: The DUR engine is tested
  When: Unit tests run
  Then:
    - Drug-allergy check tested for 10+ drug/allergy combinations including cross-class reactions
    - Drug-drug interaction tested for 10+ severe interaction pairs
    - Duplicate therapy detection tested for same drug / different formulation
    - All severity levels tested: hard-stop, soft-stop, informational
```

---

#### CC-014 — Performance and Load Testing
**As a** system administrator,
**I want to** know that the platform can handle peak clinical load without performance degradation,
**So that** the system does not slow down during busy clinic hours.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | All |
| FHIR resource | N/A (infrastructure) |

**Acceptance Criteria:**

```
AC-CC-014-01 (Response time targets)
  Given: The system is under normal load (50 concurrent users)
  When: API calls are made
  Then:
    - p95 response time ≤ 500ms for all read operations
    - p95 response time ≤ 1000ms for write operations (FHIR create/update)
    - 0% error rate under normal load

AC-CC-014-02 (Peak load test)
  Given: Load test simulates 200 concurrent users (clinic peak)
  When: The test runs for 30 minutes
  Then:
    - p95 response time ≤ 1000ms for reads
    - Error rate < 0.1%
    - No memory leaks (memory usage stable over 30 minutes)
    - Database connection pool not exhausted

AC-CC-014-03 (Graceful degradation under extreme load)
  Given: Load exceeds system capacity (500 concurrent users)
  When: The test runs
  Then:
    - HTTP 503 with Retry-After header returned for excess requests
    - No data corruption or loss
    - System recovers automatically when load drops
```

---

#### CC-015 — Comprehensive Audit Logging Architecture
**As a** system architect,
**I want to** define and implement a unified audit logging strategy using FHIR AuditEvent across all four applications,
**So that** PHIPA compliance is met and a single audit query can trace any PHI access across the entire platform.

| Field | Value |
|---|---|
| Priority | Must |
| Target app | All |
| FHIR resource | AuditEvent |

**Acceptance Criteria:**

```
AC-CC-015-01 (Centralized audit store)
  Given: PHI is accessed in EHR, LIMS, or PharmacyMS
  When: The access occurs
  Then:
    - All three applications write AuditEvent resources to the same central FHIR server audit collection
    - Each AuditEvent has: agent (who), entity (what), action (read/write/delete), outcome, recorded (when), source (which system)

AC-CC-015-02 (AuditEvent query for a specific patient)
  Given: A privacy officer investigates an alleged breach
  When: They query GET /fhir/R4/AuditEvent?patient=Patient/[id]&date=ge2026-06-01
  Then:
    - All AuditEvents involving that patient across all systems are returned in the Bundle
    - Results include: every EHR read, every lab result access, every pharmacy dispense access
    - The query itself is logged (meta-audit)

AC-CC-015-03 (AuditEvent retention)
  Given: AuditEvents are stored
  When: The retention policy runs
  Then:
    - Events are retained for 10 years minimum
    - Events cannot be modified or deleted by any role
    - After 10 years: events are archived to cold storage (not deleted)
    - Archived events are still queryable but with a delay

AC-CC-015-04 (Real-time SIEM export)
  Given: The organisation uses a SIEM (e.g. Splunk or Azure Sentinel)
  When: AuditEvents are created
  Then:
    - Events are streamed to the SIEM in near real-time (< 60 seconds)
    - SIEM can trigger alerts on suspicious access patterns (e.g. mass download of patient records)
```

---

#### CC-016 — FHIR Bulk Data Export ($export)
**As a** system administrator or data analyst,
**I want to** export large datasets of de-identified FHIR resources using the FHIR $export operation,
**So that** population health analytics and research can be conducted on the platform data.

| Field | Value |
|---|---|
| Priority | Should |
| Target app | FHIR |
| FHIR resource | Multiple (NDJSON export) |

**Acceptance Criteria:**

```
AC-CC-016-01 ($export operation)
  Given: An authorized admin or analyst initiates a bulk export
  When: POST /fhir/R4/$export is called with resource types and date filters
  Then:
    - HTTP 202 Accepted with Content-Location header pointing to the status endpoint
    - Export runs asynchronously as a background job

AC-CC-016-02 (Export completion)
  Given: The export job is complete
  When: The status endpoint is polled
  Then:
    - HTTP 200 with body containing links to NDJSON files (one per resource type)
    - Files are available for download for 24 hours then automatically deleted

AC-CC-016-03 (De-identification)
  Given: A de-identified export is requested
  When: The export runs
  Then:
    - Names are replaced with pseudonyms
    - Dates are shifted by a random offset (consistent within each patient)
    - Postcodes are truncated to 3 digits
    - HCN and MRN are replaced with research pseudoIDs
    - Resulting data meets Safe Harbour de-identification (HIPAA) and PHIPA equivalent

AC-CC-016-04 (Export access control)
  Given: Only ADMIN users with "export" permission can initiate bulk exports
  When: A non-admin user calls $export
  Then:
    - HTTP 403 Forbidden
    - Attempted export is logged in AuditEvent (outcome=denied)
```


---

## 5. FHIR Data Requirements

### 5.1 Core FHIR Resource Mapping

| Story ID | Feature | FHIR Resource | Key FHIR Paths | CA Baseline Profile | Ontario / Jurisdictional Profile |
|---|---|---|---|---|---|
| TR-001 | Nurse queue dashboard | Encounter | status, class, priority, subject, participant | CA Baseline Encounter | ON Health Encounter |
| TR-002 | Patient intake & registration | Patient | identifier (HCN, MRN), name, birthDate, gender, telecom | CA Baseline Patient | ON Health Patient (HCN identifier system) |
| TR-003 | CTAS triage | Encounter | priority (CTAS coded), reasonCode | CA Baseline Encounter | — |
| TR-004 | Vitals entry NEWS2 | Observation | code (LOINC), valueQuantity, effectiveDateTime, subject | CA Baseline Observation | pCLOCD codes preferred |
| TR-005 | Allergy documentation | AllergyIntolerance | code (SNOMED), patient, clinicalStatus, reaction.substance | CA Baseline AllergyIntolerance | — |
| TR-006 | Chief complaint | Condition | code (SNOMED/ICD-10-CA), category (problem-list-item), subject | CA Baseline Condition | — |
| TR-007 | Consent | Consent | status, scope, category, patient, provision | CA Baseline Consent | PHIPA consent (extension) |
| TR-008 | OHIP eligibility | Patient.identifier | identifier[type=HC] extension:eligibility | CA Baseline Patient | OHIP HCN identifier |
| TR-009 | Deterioration alert NEWS2 | Flag | code, subject, status, author | — | — |
| TR-010 | Handoff SBAR | Communication | category, subject, sender, recipient, payload | — | — |
| TR-011 | Wristband/label | Patient | identifier (MRN, HCN), name, DOB, allergies | CA Baseline Patient | — |
| TR-012 | Medication reconciliation | MedicationStatement | medication, status, subject, dateAsserted | CA Baseline MedicationStatement | — |
| TR-013 | Pain score | Observation | code (LOINC 72514-3), valueInteger, subject | CA Baseline Observation | — |
| TR-014 | Isolation precautions | Flag | code (SNOMED 409523008), subject | — | — |
| TR-015 | Interpreter request | Appointment.extension | extension:interpreter-required | — | — |
| TR-016 | ED dashboard | Encounter | status, priority, location | CA Baseline Encounter | — |
| DR-001 | Physician patient list | Patient, Encounter | Encounter.participant, Encounter.status | CA Baseline | — |
| DR-002 | ICD-10-CA coding | Condition | code.coding (ICD-10-CA), subject, clinicalStatus | CA Baseline Condition | ICD-10-CA (CCI for procedures) |
| DR-003 | Clinical notes | DocumentReference | type (LOINC note type), subject, author, content.attachment | CA Baseline DocumentReference | — |
| DR-004 | Lab ordering | ServiceRequest | code (pCLOCD/LOINC), subject, requester, priority, category | CA Baseline ServiceRequest | Ontario OLIS ordering |
| DR-005 | Lab results view | DiagnosticReport, Observation | DiagnosticReport.result, Observation.value, interpretation | CA Baseline DiagnosticReport | OLIS result profile |
| DR-006 | Medication prescribing | MedicationRequest | medication.code (DIN/RxNorm), subject, requester, dosage | CA Baseline MedicationRequest | PrescribeIT MedicationRequest IG |
| DR-007 | Drug interaction check | MedicationRequest | (check against formulary / knowledge base) | — | — |
| DR-008 | Referrals | ServiceRequest (referral) | category=referral, subject, requester, performer, reasonCode | CA Baseline ServiceRequest | — |
| DR-009 | Care plan | CarePlan | category, subject, activity, contributor | CA Baseline CarePlan | — |
| DR-010 | eConsult / messaging | Communication | category, subject, sender, recipient, payload | — | — |
| DR-011 | Telemedicine | Appointment | appointmentType (SNOMED 448337001), participant | CA Baseline Appointment | — |
| DR-012 | Decision support | GuidanceResponse | requestId, module, status, result | — | — |
| DR-013 | Risk assessment | RiskAssessment | subject, method, prediction, mitigation | CA Baseline RiskAssessment | — |
| DR-014 | Discharge summary | Composition | type (LOINC 18842-5), subject, section | CA Baseline Composition | — |
| DR-015 | CPOE | ServiceRequest | intent=order, category, code, subject, priority | CA Baseline ServiceRequest | — |
| DR-016 | Patient history timeline | Multiple | Condition, Observation, Procedure, Encounter | CA Baseline | — |
| DR-017 | Specialist consultation | ServiceRequest | category=consult, reasonCode, note | CA Baseline ServiceRequest | — |
| DR-018 | FHIR write-back (cardiology) | Encounter, DiagnosticReport | Encounter.identifier (fhirEncounterId) | CA Baseline | — |
| DR-019 | Imaging order | ImagingStudy, ServiceRequest | ServiceRequest.category=imaging, ImagingStudy.series | CA Baseline | — |
| DR-020 | Device management | Device, DeviceUseStatement | Device.type, DeviceUseStatement.subject | — | — |
| LT-001 | Lab order queue | ServiceRequest | status, priority, subject, requester | CA Baseline ServiceRequest | OLIS |
| LT-002 | Specimen collection | Specimen | type (SNOMED), subject, collection, container | CA Baseline Specimen | OLIS Specimen |
| LT-003 | Result entry | Observation | code (pCLOCD/LOINC), value, interpretation, referenceRange | CA Baseline Observation | pCLOCD binding |
| LT-004 | DiagnosticReport finalisation | DiagnosticReport | status=final, result[], performer | CA Baseline DiagnosticReport | OLIS DiagnosticReport |
| LT-005 | Critical value alert | Communication | category=critical-value, subject, recipient, payload | — | — |
| LT-006 | Specimen tracking | Specimen | status (available/unavailable/entered-in-error), container | CA Baseline Specimen | — |
| LT-007 | QC tracking | Observation.extension | extension:qc-status | — | — |
| LT-008 | OLIS outbound | DiagnosticReport | identifier[OLIS-accession], subject.identifier[HCN] | — | OLIS IG |
| LT-009 | HL7v2 ingestion | (lab_ingestion_log) | Mapped to DiagnosticReport on STORED | — | OLIS ORU/R01 |
| LT-010 | Lab catalogue | (internal) | ServiceRequest.code lookup | — | — |
| LT-011 | Reference ranges | Observation.referenceRange | low, high, text, age | — | — |
| LT-012 | Reflex testing | ServiceRequest | basedOn (parent order), intent=reflex-order | — | — |
| LT-013 | Audit trail | AuditEvent | action, agent, entity, outcome | — | — |
| LT-014 | Microbiology | Observation | component (organism, susceptibility, MIC) | CA Baseline Observation | — |
| LT-015 | Turnaround time | ServiceRequest.authoredOn vs DiagnosticReport.issued | TAT metric | — | — |
| LT-016 | Lab instrument interface | (HL7v2 ASTM) | (Mapped to Observation) | — | — |
| LT-017 | Batch specimen login | Specimen | multiple creates with batch ID | — | — |
| PH-001 | Pharmacist prescription queue | MedicationRequest | status=active, subject, requester, medication | CA Baseline MedicationRequest | PrescribeIT |
| PH-002 | DUR — drug interaction | MedicationRequest | (check) | — | — |
| PH-003 | DUR — allergy check | AllergyIntolerance, MedicationRequest | AllergyIntolerance.code, MedicationRequest.medication | CA Baseline | — |
| PH-004 | Dispense | MedicationDispense | medication, subject, quantity, daysSupply, whenDispensed, performer | CA Baseline MedicationDispense | — |
| PH-005 | Counsel documentation | MedicationStatement | note, dateAsserted | — | — |
| PH-006 | Medication history — DHDR | MedicationStatement | identifier[DHDR], medication, effective | CA Baseline MedicationStatement | DHDR IG |
| PH-007 | Controlled substance | MedicationRequest.extension | extension:controlled-substance-class | — | — |
| PH-008 | Refill management | MedicationRequest | dispenseRequest.numberOfRepeatsAllowed | CA Baseline MedicationRequest | PrescribeIT |
| PH-009 | Drug monograph | (external reference) | — | — | — |
| PH-010 | Compounding | MedicationRequest.extension | extension:compound | — | — |
| PH-011 | ODB adjudication | Claim | item (DIN, quantity), patient.identifier (HCN) | — | ODB IG |
| PH-012 | Inventory management | (PharmacyMS internal) | — | — | — |
| PH-013 | PrescribeIT messaging | MedicationRequest | identifier[PrescribeIT-Rx-ID] | — | PrescribeIT IG |
| PH-014 | Bereavement rx monitoring | (flag) | — | — | — |
| PH-015 | Dose calculator | (clinical logic) | Observation.valueQuantity (weight), MedicationRequest.dose | — | — |
| PH-016 | Immunisation record | Immunization | vaccineCode (CVX/SNOMED), occurrence, patient | CA Baseline Immunization | — |
| PH-017 | MAR | MedicationAdministration | medication, subject, effective, performer, status | CA Baseline MedicationAdministration | — |
| PH-018 | Medication reconciliation | MedicationStatement, MedicationRequest | status, subject | CA Baseline | — |
| PA-001 | Patient portal login | Patient | identifier (MRN for link) | — | — |
| PA-002 | Patient health record view | Patient, Condition, Observation, MedicationStatement | (read scope) | CA Baseline | — |
| PA-003 | Self-scheduling | Appointment, Slot | status, serviceType, participant | CA Baseline Appointment | — |
| PA-004 | Prescription history | MedicationRequest, MedicationDispense | status, medication, subject | CA Baseline | PrescribeIT, DHDR |
| PA-005 | Lab results — patient | DiagnosticReport, Observation | released=true, subject=Patient | CA Baseline | OLIS |
| PA-006 | Secure messaging | Communication | category=patient-message, sender, recipient | — | — |
| PA-007 | Pre-visit questionnaire | QuestionnaireResponse | subject, authored, questionnaire | CA Baseline | — |
| PA-008 | Consent management | Consent | status, scope, provision | CA Baseline Consent | PHIPA |
| RC-001 | Scheduling calendar | Schedule, Slot, Appointment | actor, planningHorizon, slot.status | CA Baseline | — |
| RC-004 | Kiosk check-in | Appointment | status=arrived | CA Baseline Appointment | — |
| RC-011 | Referral intake | ServiceRequest | category=referral, basedOn | CA Baseline ServiceRequest | — |
| AD-001 | PHI audit log | AuditEvent | agent, entity, action, outcome, recorded | — | PHIPA AuditEvent |
| AD-002 | Role-based registration | PractitionerRole | role, period, practitioner | CA Baseline PractitionerRole | — |
| BI-004 | OHIP submission | Claim | patient.identifier[HCN], item.productOrService[OHIP fee], billablePeriod | — | OHIP MC EDT mapping |
| BI-005 | Rejected claim | ClaimResponse | outcome, error.code | — | — |
| BI-009 | Superbill | Claim | (from Encounter + Condition + ServiceRequest) | — | — |
| TK-001 | ECG result | DiagnosticReport, Observation | code=LOINC ECG, component | CA Baseline DiagnosticReport | — |
| TK-002 | Echo result | DiagnosticReport, Observation | code=LOINC Echo, component (LVEF LOINC 10230-1) | CA Baseline | — |
| TK-004 | Holter monitor | DeviceUseStatement, DiagnosticReport | device, timing, subject | CA Baseline | — |
| TK-005 | DICOM viewer | ImagingStudy | series.uid, endpoint (DICOMweb) | — | — |
| CC-001 | Real-time notifications | AuditEvent, Communication | triggered events | — | — |
| CC-003 | Patient demographics | Patient | identifier, name, telecom, address, communication | CA Baseline Patient | ON Health Patient |
| CC-005 | SMART on FHIR | CapabilityStatement | rest.security.extension (SMART) | — | — |
| CC-006 | PCR integration | Patient | identifier[PCR-enterprise-ID], link | CA Baseline Patient | Ontario PCR |
| CC-010 | FHIR profile validation | StructureDefinition, OperationOutcome | — | CA Baseline all resources | ON Health IG |
| CC-015 | Audit architecture | AuditEvent | agent, entity, action, recorded, source | — | PHIPA |
| CC-016 | Bulk export | Multiple | NDJSON per resource type | — | — |

---

### 5.2 FHIR Identifier Systems

| Identifier | System URI | Used In |
|---|---|---|
| Ontario HCN | `https://fhir.infoway-inforoute.ca/NamingSystem/ca-on-patient-hcn` | Patient.identifier |
| Pan-Canadian HCN | `https://fhir.infoway-inforoute.ca/NamingSystem/ca-patient-hin` | Patient.identifier |
| MRN (tenant) | `https://[tenant].healthcareworkspace.ca/NamingSystem/mrn` | Patient.identifier |
| CPSO (physician) | `https://fhir.infoway-inforoute.ca/NamingSystem/ca-on-license-physician` | Practitioner.identifier |
| Health Canada DIN | `https://health.canada.ca/en/health-canada/services/drugs-health-products/drug-products/drug-product-database.html` | Medication.code |
| OLIS Accession | `https://ehealthontario.ca/NamingSystem/olis-accession-number` | DiagnosticReport.identifier |
| PCR Enterprise ID | `https://fhir.infoway-inforoute.ca/NamingSystem/ca-on-pcr-eid` | Patient.identifier |
| PrescribeIT Rx ID | `https://ehealthontario.ca/NamingSystem/prescribeit-rx-id` | MedicationRequest.identifier |
| OHIP Billing # | `https://ehealthontario.ca/NamingSystem/ohip-billing-number` | Practitioner.identifier |

---

## 6. Terminology Requirements

| Data Element | Code System | Canonical URI | Edition / Version | Binding Strength | Bilingual (EN/FR) |
|---|---|---|---|---|---|
| Diagnosis (primary) | ICD-10-CA | `http://hl7.org/fhir/sid/icd-10-ca` | 2023+ | Required | Yes — both official |
| Procedure codes | CCI (Canadian Classification of Health Interventions) | `http://hl7.org/fhir/sid/cci` | 2023+ | Required | Yes |
| Lab test code | pCLOCD | `https://fhir.infoway-inforoute.ca/CodeSystem/pCLOCD` | current | Required (ON) / Preferred (CA) | Yes |
| Lab test code (LOINC fallback) | LOINC | `http://loinc.org` | 2.77+ | Preferred | No (English only) |
| Clinical findings | SNOMED CT Canadian Edition | `https://fhir.infoway-inforoute.ca/CodeSystem/snomedct` | 20240301+ | Preferred | Yes (FR synonyms) |
| Drug product | Health Canada DIN | See above | Current | Required (CA) | Yes |
| Drug generic name (US fallback) | RxNorm | `http://www.nlm.nih.gov/research/umls/rxnorm` | Current | Preferred (US) | No |
| Vaccine codes | CVX | `http://hl7.org/fhir/sid/cvx` | Current | Required | No |
| Units of measure | UCUM | `http://unitsofmeasure.org` | 2.1 | Required | No |
| CTAS levels | SNOMED CT | 1269338007 (CTAS 1) … 1270427003 (CTAS 5) | — | Required | Yes |
| ECG rhythm | SNOMED CT | e.g. 3424008 (sinus tachycardia) | — | Preferred | Yes |
| LVEF (Echo) | LOINC | 10230-1 (left ventricular ejection fraction) | — | Required | No |
| Allergy substance | SNOMED CT | drug / food / environment | — | Preferred | Yes |
| Allergy reaction | SNOMED CT | e.g. 39579001 (anaphylaxis) | — | Preferred | Yes |
| Adverse reaction criticality | HL7 AllergyIntoleranceCriticality | `http://hl7.org/fhir/ValueSet/allergy-intolerance-criticality` | — | Required | No (translate display) |
| Appointment type | SNOMED CT | 406543005 (follow-up), 11429006 (consultation), 448337001 (telemedicine) | — | Preferred | Yes |
| Encounter class | HL7 v3 ActCode | AMB, IMP, EMER, VR | — | Required | No |
| Encounter priority (CTAS) | NUCCProviderTaxonomy / local CTAS value set | Defined per ON Health IG | — | Required | Yes |
| News2 parameters | LOINC | RR: 9279-1, SpO2: 2708-6, HR: 8867-4, systolic BP: 8480-6, temp: 8310-5, consciousness: 80288-4 | — | Required | No |
| Communication category | HL7 CommunicationCategory | `http://terminology.hl7.org/CodeSystem/communication-category` | — | Required | No |
| Consent scope | HL7 ConsentScopeCodes | treatment, patient-privacy, research | — | Required | No |
| Claim type | HL7 ClaimType | professional, institutional, oral, pharmacy | — | Required | No |
| OHIP fee code | (Ontario proprietary) | `https://ehealthontario.ca/NamingSystem/ohip-fee-code` | Current OHIP SoB | Required | — |
| Bilingual requirement note | All CodeSystems must have `designation.use = display` entries for both `en` and `fr-CA` in FHIR CodeSystem resources where French synonyms exist. | — | — | — | — |

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Metric | Target | Measurement Method |
|---|---|---|
| API p95 response time (reads) | ≤ 500ms | APM tool (Datadog / OpenTelemetry) |
| API p95 response time (writes) | ≤ 1000ms | APM |
| FHIR simple read | ≤ 200ms | APM |
| Real-time notification latency | ≤ 2000ms | WebSocket round-trip test |
| Page Time to Interactive (TTI) | ≤ 3000ms | Lighthouse CI |
| DB query p95 | ≤ 100ms | PostgreSQL pg_stat_statements |
| Concurrent users (normal load) | 100 | Load test (k6) |
| Concurrent users (peak load) | 250 | Load test (k6) |

### 7.2 Security

| Requirement | Standard / Control |
|---|---|
| Input validation | All inputs validated at API boundary (OWASP A03) |
| Authentication | NextAuth with bcrypt password hashing, JWT (RS256), 15-minute access token expiry |
| MFA | TOTP or SMS-OTP mandatory for ADMIN, DOCTOR roles |
| Authorisation | Role-based per endpoint; tenant-scoped at query level (OWASP A01) |
| Session management | Secure cookie (HttpOnly, Secure, SameSite=Strict); session invalidated on logout |
| Data in transit | TLS 1.3 minimum; HSTS enforced |
| Data at rest | AES-256 encryption; key in HSM or cloud KMS |
| PHI audit log | Immutable AuditEvent per PHIPA §12 |
| Rate limiting | Per-user and per-IP limits (OWASP A04) |
| Dependency scanning | npm audit + Snyk on CI pipeline |
| SAST | CodeQL / Semgrep on every PR |
| Penetration testing | Annual third-party pen test + quarterly DAST scan |
| Secrets management | No secrets in code; env vars via Kubernetes Secrets or Vault |

### 7.3 Accessibility

| Requirement | Standard |
|---|---|
| WCAG compliance | WCAG 2.2 Level AA (all public and clinical-facing pages) |
| Ontario AODA IASR | Full compliance (EN/FR toggle, keyboard navigation, screen reader support) |
| US Section 508 (if applicable) | Compliant for US clinic deployments |
| Screen reader support | Tested with NVDA (Windows), VoiceOver (macOS/iOS), TalkBack (Android) |
| Colour contrast | Minimum 4.5:1 (normal text), 3:1 (large text) |
| Focus management | Visible focus ring on all interactive elements; modal focus trapping |
| Animation | Respects `prefers-reduced-motion` |
| Keyboard navigation | All functions accessible via keyboard; no mouse-only interactions |
| Touch targets | Minimum 44×44px on all interactive elements (mobile) |

### 7.4 Scalability and Availability

| Requirement | Target |
|---|---|
| Availability SLA | 99.9% uptime (excluding planned maintenance) |
| Planned maintenance window | Sunday 02:00–06:00 EST; advance notice ≥ 7 days |
| Recovery Time Objective (RTO) | 4 hours |
| Recovery Point Objective (RPO) | 24 hours (daily backup) |
| Horizontal scaling | Kubernetes HPA on EHR, FHIR server, LIMS, PharmacyMS |
| Database connection pooling | PgBouncer with pool_size=20 per service |
| Cache layer | Redis for: session storage, rate limits, pub/sub, result caching |
| CDN | Static assets served via CDN (CloudFront / Azure CDN) |
| Multi-region | Primary region: Canada Central (Azure Toronto); DR region: Canada East (Quebec City) |

### 7.5 Data Retention

| Data Type | Retention Period | Basis |
|---|---|---|
| PHI (clinical records) | 10 years from last encounter (adult); 10 years from age 18 (minor) | PHIPA Record Retention |
| Audit logs (AuditEvent) | 10 years | PHIPA §12 |
| Billing records | 7 years | CRA / provincial tax requirement |
| Appointment/scheduling data | 3 years | Operational |
| System logs (non-PHI) | 1 year | Operational |
| Backup files | 30 days rolling + annual snapshot retained 7 years | Operational |

---

## 8. Open Questions and Decisions Required

| ID | Question | Owner | Target Resolution | Impact If Delayed |
|---|---|---|---|---|
| OQ-001 | PrescribeIT certification timeline: when can the clinic achieve PrescribeIT Production onboarding? | CTO / eHealth Ontario | Q3 2026 | PH-013 (PrescribeIT) cannot go live |
| OQ-002 | OLIS FHIR endpoint access: has the clinic signed the OLIS Data Sharing Agreement? | Legal / Privacy Officer | Q2 2026 | LT-008 (OLIS outbound) blocked |
| OQ-003 | PCR integration credentials: has the clinic applied for an Ontario PCR access agreement? | Privacy Officer | Q2 2026 | CC-006 (PCR lookup) blocked; RC-002 degraded |
| OQ-004 | MyHealth Ontario (MHO) SSO: is a patient identity federation with MHO in scope? | Product / CTO | Q2 2026 | PA-001 (patient portal login) UX |
| OQ-005 | DICOM viewer selection: OHIF (open source) vs commercial PACS viewer licence? | Radiologist / IT | Q2 2026 | TK-005 (DICOM viewer) build vs buy |
| OQ-006 | Video conferencing platform: build clinic-hosted WebRTC or integrate Zoom / MS Teams SDK? | Product / CTO | Q2 2026 | DR-011, RC-018 (telemedicine) architecture |
| OQ-007 | Controlled substance database licence: DrugBank Canada vs First DataBank vs CPS (CPhA)? | Pharmacy Lead / Legal | Q2 2026 | PH-007 (controlled substance classification) |
| OQ-008 | OHIP EDT API: does the clinic have a signed MC EDT agreement and test credentials? | Billing / Finance | Q1 2026 | BI-004 (OHIP submission) blocked |
| OQ-009 | OHIP fraud prevention: what is the per-submission audit sampling rate required by the Ministry? | Billing / Legal | Q2 2026 | BI-003 fee code validation rules |
| OQ-010 | ODB adjudication integration: does the clinic participate in ODB? Ontario formulary API access? | Pharmacy Lead | Q2 2026 | PH-011 (ODB adjudication) |
| OQ-011 | Temporal.io deployment: self-hosted Temporal cluster or Temporal Cloud? | DevOps / CTO | Q1 2026 | CC-002 (workflow engine) infrastructure cost |
| OQ-012 | HSM / KMS selection for encryption key management: Azure Key Vault vs AWS KMS vs on-prem HSM? | Security / DevOps | Q1 2026 | AD-012 (encryption at rest) |
| OQ-013 | Bilingual translation completeness: who is responsible for clinical terminology FR-CA translation validation? | Clinical Informatics | Q3 2026 | CC-007 (bilingual) accuracy |
| OQ-014 | HAPI FHIR vs custom Go FHIR server: should the existing Go FHIR server adopt HAPI as middleware? | Architect / Dev Lead | Q1 2026 | CC-010 (profile validation) effort |
| OQ-015 | Cardiology FHIR write-back: when will the 23-state FSM events write to the FHIR server live? | Dev Lead | Q2 2026 | DR-018, TK-009 |
| OQ-016 | Patient portal branding: will MyChart-style branding be used, or is a custom brand required? | Product / Marketing | Q2 2026 | PA-001 to PA-008 UI designs |

---

## Document Control

| Field | Value |
|---|---|
| Document ID | HC-PRD-2026-001 |
| Version | 1.0.0-draft |
| Author | Alex (FHIR SME Architect) |
| Reviewed By | Eagle (Product Lead) |
| Created | 2026-06-29 |
| Last Updated | 2026-06-29 |
| Status | DRAFT — Pending Stakeholder Review |
| Next Review | Q3 2026 |
| Classification | Confidential — Internal Use Only |

---

*End of Document — Healthcare Platform PRD v1.0.0-draft*
*Total User Stories: 175 (TR-016, DR-020, LT-017, PH-018, PT-009, PA-018, PC-008, RC-018, AD-015, BI-010, TK-010, CC-016)*
