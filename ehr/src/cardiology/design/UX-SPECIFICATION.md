# Cardiology Practice UX Design Specification

## Overview

**Product:** HealthOS Cardiology Practice Management System  
**Scope:** Multi-role workflow dashboard for cardiology clinics (50–200 patient visits/day)  
**Personas:** Receptionist, Nurse, Cardiologist, Technician, Billing Specialist, Practice Admin  
**Core Constraint:** Real-time state visibility + safe state transitions + role-based queue management

---

## Design Principles

1. **Primacy of patient safety** — every UI action that affects patient care (state transitions, order placement, procedure scheduling) requires explicit confirmation and audit trail
2. **Role-specific context** — each role sees only the work that belongs to them; navigation is task-centric, not hierarchy-based
3. **Queue-driven workflow** — staff claim work from their role's queue(s), eliminating "whose turn is it?" confusion
4. **Real-time occupancy** — room status and queue lengths update in near-real-time; staff always know where to send a patient
5. **Reducibility** — all views are reducible to a list of items with status badges; no complex multi-dimensional grids
6. **Error prevention** — invalid state transitions are blocked client-side with explanation; no silent failures

---

## User Personas

### 1. **Receptionist** (3 staff)
- **Role:** Front desk — patient check-in/out, scheduling, payment, follow-up booking
- **Queues:** CHECK_IN, CHECKOUT, SCHEDULING, FOLLOW_UP_SCHEDULING
- **Key screens:**
  - Arrival dashboard (PATIENT_ARRIVED items)
  - Checkout flow (CONSULTATION_COMPLETE items)
  - Room assignment (for check-in)
- **KPI:** Average check-in time < 3 min; checkout time < 5 min

### 2. **Nurse** (2 staff)
- **Role:** Vitals, rooming, procedure support, patient education
- **Queues:** NURSING_ASSESSMENT
- **Key screens:**
  - Waiting room roster (IN_WAITING_ROOM state)
  - Vitals entry form (height, weight, BP, HR, SpO₂)
  - Patient rooming (assign exam room, notify MD)
- **KPI:** Time from rooming to physician arrival < 10 min

### 3. **Cardiologist** (2 staff)
- **Role:** Physician consult, procedure ordering, result review, discharge disposition
- **Queues:** PHYSICIAN_CONSULT, RESULTS_REVIEW
- **Key screens:**
  - My queue (patients awaiting consult)
  - Patient detail (chief complaint, vitals, previous history, exam findings)
  - Order entry (ECG, echo, stress test, Holter)
  - Results review (procedures completed, waveforms, interpretation)
- **KPI:** Consult time 15–30 min; result review < 10 min

### 4. **Technician** (3 staff — 1 ECG, 1 Sonographer, 1 Stress Test/Holter)
- **Role:** Procedure setup, data capture, preliminary report
- **Queues:** PROCEDURE_ECG, PROCEDURE_ECHO, PROCEDURE_STRESS_TEST, PROCEDURE_HOLTER
- **Key screens:**
  - My queue (ordered procedures)
  - Procedure worklist (PROCEDURE_QUEUED items)
  - Capture interface (e.g., ECG waveform review, echo clips, Holter device pairing)
  - Handoff to MD (procedure complete, findings captured)
- **KPI:** Procedure completion time (ECG 5 min, echo 15 min, stress test 45 min, Holter 10 min)

### 5. **Billing Specialist** (1 staff)
- **Role:** Charge capture, insurance verification, claim submission
- **Queues:** BILLING
- **Key screens:**
  - Checkout complete items (insurance codes, copay reconciliation)
  - Claim submission form (procedure codes, diagnosis codes, provider signature)
- **KPI:** Claim submission < 2 hours post-visit

### 6. **Practice Admin** (1 staff)
- **Role:** Schedule management, referral triage, reports
- **Queues:** REFERRAL_REVIEW, SCHEDULING
- **Key screens:**
  - Referral inbox (new referrals, triage by urgency)
  - Schedule view (availability + blocking)
  - Daily census (patient flow, room utilization)
- **KPI:** Referral-to-scheduled < 2 business days for routine, < 1 day for urgent

---

## Main Screens & Workflows

### **Screen 1: Role-Based Dashboard**

**Accessibility:** All roles  
**Refresh:** Real-time (WebSocket or 3-second poll)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  [HealthOS] Cardiology Practice     [User: Dr. Chen] [Logout]│
├─────────────────────────────────────────────────────────────┤
│  Dashboard    My Queue    Rooms    Queues    Discharge    Help│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CARDIOLOGIST VIEW                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │ My Queue         │  │ Urgent Alerts    │  │ Room Map  │ │
│  │ 3 in PHYSICIAN_  │  │ ✓ John Smith URGT│  │ 6/14 used │ │
│  │    CONSULT       │  │ • Chest pain     │  │           │ │
│  │ 1 in RESULTS_    │  │ ✓ Wm Brown HIGH  │  │ Exam 1: S │ │
│  │    REVIEW        │  │ • New AF         │  │ Exam 2: J │ │
│  │ [Claim] 1 item   │  │ • ED referral    │  │ Exam 3: O │ │
│  │                  │  │                  │  │ Echo: In  │ │
│  │ [Sort: Priority] │  │                  │  │ ECG: Free │ │
│  └──────────────────┘  └──────────────────┘  └───────────┘ │
│                                                              │
│  Recent Events                                              │
│  └─ John Smith → IN_EXAM_ROOM (2 min ago, Nurse Patel)    │
│  └─ Mary Johnson → PROCEDURE_COMPLETE (5 min ago, Echo lab)│
│  └─ Robert Davis → RESULTS_READY (8 min ago, ECG tech)    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Components used:**
- **PatientBanner** (urgency, allergy flags)
- **Card** (my queue card, alerts card, room map card)
- **Badge** (priority, status)
- **Alert** (urgent items requiring attention)
- **DataTable** (recent events log, sortable by timestamp/role)
- **Tabs** (different dashboard views per role)

---

### **Screen 2: My Queue (Role-Specific)**

**Accessibility:** Each role sees their assigned queues  
**Example: Cardiologist's PHYSICIAN_CONSULT queue**

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ My Queue — PHYSICIAN_CONSULT                             │
├──────────────────────────────────────────────────────────┤
│ Filters: [All ▼] [Priority: High & Up ▼]  [Refresh]     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ ┌─ URGENT (0) ──────────────────────────────────────────┐
│                                                           │
│ ┌─ HIGH (1) ────────────────────────────────────────────┐
│ │ William Brown, 65M, New Atrial Fibrillation          │
│ │ Arrived 45 min ago | Room: Exam 1 | Priority: HIGH   │
│ │ Vitals: BP 152/88, HR 112, RR 18, SpO₂ 98%           │
│ │ [View Details] [Claim for me]                        │
│                                                           │
│ ┌─ NORMAL (2) ──────────────────────────────────────────┐
│ │ Mary Johnson, 58F, Post-MI Follow-up                 │
│ │ Arrived 2h ago | Room: Exam 2 | Priority: NORMAL    │
│ │ Vitals: BP 128/76, HR 72, RR 16, SpO₂ 99%           │
│ │ [View Details] [Skip for now]                        │
│                                                           │
│ │ Robert Davis, 72M, Cardiomyopathy Echo              │
│ │ Arrived 1h ago | Room: Exam 3 | Priority: NORMAL    │
│ │ Vitals: BP 136/80, HR 68, RR 16, SpO₂ 98%           │
│ │ [View Details] [Skip for now]                        │
└─────────────────────────────────────────────────────────┘
```

**Key features:**
- **Grouping by priority** — URGENT at top, LOW at bottom
- **Patient summary card** — name, age, chief complaint, vitals snapshot, time in state
- **Action buttons:**
  - **[Claim for me]** — transitions item to IN_PROGRESS, assigns to self
  - **[Skip for now]** — re-queues item (for taking urgent case first)
  - **[View Details]** — navigate to patient detail modal

**Components:**
- **Card** (queue item card)
- **Badge** (priority, state)
- **Button** (claim, skip, details)
- **DataTable** (optional: sortable by priority, time, patient name)

---

### **Screen 3: Patient Visit Detail**

**Accessibility:** Cardiologist, Nurse (different views)  
**Trigger:** Tap [View Details] on queue item or dashboard

**Layout:**
```
┌───────────────────────────────────────────────────────┐
│ [← Back] Patient: John Smith, 64M, MRN: 123456      │
├───────────────────────────────────────────────────────┤
│ Tabs: [Vitals] [History] [Orders] [Results] [Notes] │
├───────────────────────────────────────────────────────┤
│                                                       │
│ VITALS TAB (Nurse view)                              │
│ ┌──────────────────────────────────────┐             │
│ │ Last recorded: 2 min ago by Patel    │             │
│ │ BP:      [152 / 88] mmHg ⚠ elevated  │             │
│ │ HR:      [98] bpm                    │             │
│ │ RR:      [18] /min                   │             │
│ │ SpO₂:    [97]%                       │             │
│ │ Temp:    [37.2]°C                    │             │
│ │ Weight:  [78] kg (last visit: 76 kg) │             │
│ │                                      │             │
│ │ [Update Vitals] [Flag for Physician] │             │
│ └──────────────────────────────────────┘             │
│                                                       │
│ HISTORY TAB (Cardiologist view)                      │
│ ┌──────────────────────────────────────┐             │
│ │ Chief Complaint: Chest pain on ...   │             │
│ │ HPI: 3 days of substernal, ...       │             │
│ │ PMHx: Hypertension, high cholesterol │             │
│ │ Medications: Lisinopril, Atorvastatin│             │
│ │ Allergies: ⚠ Penicillin (rash)       │             │
│ │ Last visit: 6 months ago (routine)   │             │
│ │ Last ECG: Normal, 6 months ago       │             │
│ └──────────────────────────────────────┘             │
│                                                       │
│ ORDERS TAB                                           │
│ ┌──────────────────────────────────────┐             │
│ │ EKG — Ordered 10 min ago             │             │
│ │   Status: PROCEDURE_QUEUED           │             │
│ │   Technician: [Pending assignment]   │             │
│ │   [View waveform when ready]         │             │
│ │                                      │             │
│ │ [+ Order ECG] [+ Order Echo]         │             │
│ │ [+ Order Stress Test] [+ Holter]     │             │
│ └──────────────────────────────────────┘             │
│                                                       │
│ ACTIONS (locked until PHYSICIAN_WITH_PATIENT state) │
│ ┌──────────────────────────────────────┐             │
│ │ [Complete Consult] [Place Orders]    │             │
│ │ [Discharge] [Hold] [Cancel]          │             │
│ └──────────────────────────────────────┘             │
└───────────────────────────────────────────────────────┘
```

**Components:**
- **Tabs** (vitals, history, orders, results, notes)
- **FormField** (vital sign inputs with clinical validation)
- **Badge** (allergy alerts, critical values)
- **Alert** (abnormal findings, critical flags)
- **Card** (history, medication list, order list)
- **Button** (actions, transitions)
- **Text** (clinical value display with context)

---

### **Screen 4: Room Status & Occupancy Dashboard**

**Accessibility:** Admin, Receptionist, Cardiologist  
**Refresh:** Real-time

**Layout:**
```
┌────────────────────────────────────────────────────┐
│ Cardiology Rooms (6/14 occupied)                  │
├────────────────────────────────────────────────────┤
│ Filter: [All Rooms ▼] [Show: Available/In Use ▼] │
├────────────────────────────────────────────────────┤
│                                                    │
│ WAITING ROOM      [▼]    AVAILABLE  11 patients   │
│ Check-In Desk 1   [▼]    IN USE     Receptionist │
│ Check-In Desk 2   [▼]    AVAILABLE  (ready)      │
│ Exam Room 1       [▼]    IN USE     Smith, John  │
│ Exam Room 2       [▼]    IN USE     Johnson, M.  │
│ Exam Room 3       [▼]    AVAILABLE  (clean)      │
│ ECG Room          [▼]    IN USE     Tech: Davis  │
│ Echo Lab          [▼]    IN USE     Tech: Lee    │
│ Stress Test Lab   [▼]    AVAILABLE  (idle)       │
│ Holter Room       [▼]    AVAILABLE  (idle)       │
│ Consult Room      [▼]    AVAILABLE  (ready)      │
│ Blood Draw        [▼]    IN USE     Phlebotomist │
│ Checkout Desk     [▼]    IN USE     Receptionist │
│ Billing Office    [▼]    IN USE     Billing spec │
│                                                    │
│ [Room Map View] [Assign Room] [Manage Equipment] │
└────────────────────────────────────────────────────┘
```

**Components:**
- **Card** (one per room, collapsible detail)
- **Badge** (occupancy status, equipment type)
- **DataTable** (all rooms, sortable by type/status)

---

### **Screen 5: Work Queue Manager**

**Accessibility:** Admin, role supervisors  
**Refresh:** Real-time

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ All Work Queues (40 total items)                   │
├─────────────────────────────────────────────────────┤
│ Filter: [Queue ▼] [Status: All ▼] [Age >10 min ▼] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ CHECK_IN (5) ▀▀▀▀▀▀▀▀▀▀█████                      │
│ └ Pending: 3  In Progress: 2  Avg wait: 4 min     │
│   • Smith, John (URGENT, arrived 3 min ago)       │
│   • Chen, Susan (NORMAL, arrived 7 min ago)       │
│                                                     │
│ NURSING_ASSESSMENT (4) ▀▀▀▀▀▀▀▀████                │
│ └ Pending: 2  In Progress: 2  Avg wait: 8 min     │
│                                                     │
│ PHYSICIAN_CONSULT (3) ▀▀▀▀█████████                │
│ └ Pending: 3  In Progress: 0  Avg wait: 12 min    │
│                                                     │
│ PROCEDURE_ECHO (2) ▀▀▀▀▀▀▀████████                 │
│ │ └ Pending: 1  In Progress: 1  Est: 8 min left   │
│                                                     │
│ (9 more queues...)                                │
│                                                     │
│ [Queue Health Report] [Bottleneck Analysis]       │
└─────────────────────────────────────────────────────┘
```

**Components:**
- **Card** (queue stats card)
- **Spinner** (progress indicator for in-progress items)
- **Badge** (item priority, status)
- **DataTable** (all items, sortable)
- **Alert** (queues exceeding SLA)

---

### **Screen 6: Checkout & Billing Workflow**

**Accessibility:** Receptionist, Billing Specialist  
**Trigger:** Patient in CONSULTATION_COMPLETE state

**Layout:**
```
┌───────────────────────────────────────────────┐
│ Checkout: John Smith                         │
├───────────────────────────────────────────────┤
│ Steps: [1. Verify] [2. Payment] [3. Billing] │
├───────────────────────────────────────────────┤
│                                               │
│ STEP 1: VERIFY                                │
│ ┌─────────────────────────────────┐          │
│ │ Patient: John Smith             │          │
│ │ MRN: 123456                     │          │
│ │ DOB: 10/15/1959                 │          │
│ │ Procedures: ✓ ECG, ✓ Echo       │          │
│ │ [✓ Confirm details are correct] │          │
│ │                                 │          │
│ │ [Next Step →]                   │          │
│ └─────────────────────────────────┘          │
│                                               │
│ STEP 2: PAYMENT                               │
│ ┌─────────────────────────────────┐          │
│ │ Estimated cost: $450            │          │
│ │ Patient responsibility: $85     │          │
│ │ Insurance: [Verify]             │          │
│ │ Payment method: [Debit] [Cash]  │          │
│ │ Amount paid: [85.00]            │          │
│ │ [✓ Payment received]            │          │
│ │                                 │          │
│ │ [Back] [Next Step →]            │          │
│ └─────────────────────────────────┘          │
│                                               │
│ STEP 3: BILLING                               │
│ ┌─────────────────────────────────┐          │
│ │ Codes:                          │          │
│ │ • 93000 (ECG) ✓                 │          │
│ │ • 93306 (Echo) ✓                │          │
│ │ Diagnosis: I10 (HTN) ✓          │          │
│ │                                 │          │
│ │ [Submit to Insurance]           │          │
│ │ [Print Receipt] [Email Receipt] │          │
│ │                                 │          │
│ │ [Back] [Discharge Patient]      │          │
│ └─────────────────────────────────┘          │
│                                               │
│ [Need help?]                                  │
└───────────────────────────────────────────────┘
```

**Components:**
- **Modal** (checkout wizard)
- **FormField** (payment, insurance verification)
- **Card** (step summary)
- **Badge** (verification status)
- **Button** (next, back, complete)
- **Alert** (insurance issues, payment failures)

---

## State Transition Rules (Client-Side)

### **CARDIOLOGIST — from PHYSICIAN_WITH_PATIENT**

Allowed transitions (must show buttons for all):
- → ORDERS_PLACED (if procedures ordered)
- → CONSULTATION_COMPLETE (if no procedures, discharge path)
- → ON_HOLD (patient needs break)

Blocked transitions (show disabled with reason):
- → CHECKED_IN (only backward, invalid)
- → DISCHARGE (not from this state)

### **NURSE — from IN_WAITING_ROOM**

Allowed:
- → NURSING_ASSESSMENT (claim from queue)
- → IN_EXAM_ROOM (patient roomed, exam ready)

Blocked:
- → PHYSICIAN_WITH_PATIENT (MD only)

### **TECHNICIAN — from PROCEDURE_QUEUED**

Allowed:
- → IN_PROCEDURE (start procedure)
- → ON_HOLD (patient not ready)

Blocked:
- → RESULTS_READY (must go through IN_PROCEDURE first)

---

## Role-Based Access Control Matrix

| Screen | Receptionist | Nurse | Cardiologist | Technician | Billing | Admin |
|--------|---|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| My Queue | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Patient Detail | ✓ (read) | ✓ | ✓ | ✓ (limited) | ✓ (read) | ✓ (read) |
| Vitals Entry | ✗ | ✓ | ✓ (read) | ✗ | ✗ | ✗ |
| Order Entry | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Room Management | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ |
| Queue Manager | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ |
| Checkout | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Billing | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |

---

## Validation & Error Handling

### **Form Validation**

1. **Vitals entry:**
   - BP systolic/diastolic: 0–300 mmHg (warn if >180, <90)
   - HR: 0–200 bpm (warn if >120 or <40)
   - SpO₂: 70–100% (error if <90)
   - Temperature: 35–42°C (warn if <36 or >39)

2. **Order entry:**
   - Cannot order ECG if already has result from <30 min ago
   - Cannot order stress test if ejection fraction <20%
   - Requires MD signature (implicit from logged-in user)

3. **State transitions:**
   - Cannot move to PHYSICIAN_WITH_PATIENT if room not assigned
   - Cannot transition to DISCHARGED unless BILLING_PENDING state reached
   - Cannot CANCEL if patient is IN_PROCEDURE

### **Error Messages** (use Alert component with severity)

```
❌ CRITICAL: Cannot discharge — insurance claim not submitted
⚠️  WARNING: BP is elevated — confirm this is acceptable
ℹ️  INFO: Mr. Davis claims insurance verification is pending
```

---

## Accessibility Requirements

- **WCAG 2.1 AA compliance** across all forms, tables, and modals
- **Color + shape** for all status indicators (not color alone)
- **Keyboard navigation:** Tab through queue items, arrow keys in tables, Enter to open details
- **Screen reader announcements:** New queue items, state changes, alerts
- **High contrast:** Clinical Alert badges must pass WCAG contrast ratios
- **Touch targets:** All buttons ≥44px; queue item rows ≥48px tall

---

## Performance & Real-Time Targets

- **Dashboard load:** <2s (local state caching)
- **Queue item claim:** <500ms (optimistic UI update)
- **State transition:** <1s (confirm immediately, sync async)
- **WebSocket latency:** <3s (fall back to 5s polling if no WebSocket)
- **Concurrent users:** 20 staff + 200 patient visits on single clinic instance

---

## Mobile Responsiveness

- **Breakpoints:** sm: 640px | md: 768px | lg: 1024px | xl: 1280px
- **Tablet (768px):** Queue list + patient detail side-by-side (split view)
- **Phone (< 640px):** Stack vertically; queue list full-width, tap to expand detail modal
- **Buttons:** All interactive elements ≥44px touch target
- **Tables:** Horizontal scroll on phone (DataTable wrapper with scroll indicator)

---

## Icons & Visual Language

| State | Icon | Color |
|-------|------|-------|
| URGENT | 🚨 | #dc2626 (critical-600) |
| HIGH | ⚠️ | #ea580c (warning-600) |
| NORMAL | ℹ️ | #2563eb (info-600) |
| LOW | 💬 | #6b7280 (neutral-600) |
| AVAILABLE | ✓ | #059669 (success) |
| IN USE | ✖️ | #ea580c (warning-600) |
| COMPLETE | ✅ | #059669 (success) |
| PENDING | ⏳ | #6b7280 (neutral-600) |

---

## Success Metrics

1. **Efficiency:** Average visit duration ≤ 90 min (target from current 105 min)
2. **Safety:** Zero missed state transitions; 100% audit trail
3. **Satisfaction:** Staff NPS ≥ 8; <2 support tickets/day about workflow
4. **Accuracy:** <1% billing code errors post-visit
5. **Availability:** 99.9% uptime during business hours (8am–5pm)
