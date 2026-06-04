---
skill: hdl-diagrams
module: hdl
version: 1.0.0
type: workflow
description: >
  Generate six architecture diagrams (C4 Context, C4 Container, FHIR resource map,
  FHIR profile tree, terminology binding map, patient data flow sequence) as Mermaid
  markdown files and a Mermaid-CDN HTML report. Output to
  _bmad/memory/hdl/architecture/diagrams/.
---

# hdl-diagrams

Generate and refresh architecture diagrams for the active healthcare project.

---

## Capabilities

| User says | Capability |
|---|---|
| "generate diagrams", "create architecture diagrams", "generate all diagrams" | [Generate All Diagrams](#generate-all-diagrams) |
| "regenerate [diagram name]", "update [diagram name] diagram" | [Regenerate One Diagram](#regenerate-one-diagram) |
| "generate diagram report", "build diagram HTML" | [HTML Diagram Report](#html-diagram-report) |

---

## Generate All Diagrams

### Pre-conditions

Read these files before generating:

| File | Used for |
|---|---|
| `_bmad/memory/hdl/discovery/use-case-brief.md` | Actors, product context |
| `_bmad/memory/hdl/discovery/data-element-inventory.md` | FHIR resource candidates |
| `_bmad/memory/hdl/architecture/adrs/index.md` | Technology decisions |
| `_bmad/config.toml` `[modules.hdl]` | `project_name`, `fhir_version`, `jurisdiction` |

### Diagrams to Generate

Generate all six diagrams. Write each as a Markdown file with a single fenced `mermaid` block.
Target minimum content size: **150+ words of Mermaid DSL** per diagram (non-trivial, not skeleton).

| # | Filename | Diagram type | Gate rule |
|---|---|---|---|
| 1 | `c4-context.md` | C4 Context (system in its environment) | ARCH-004 |
| 2 | `c4-container.md` | C4 Container (major containers + protocols) | ARCH-004 |
| 3 | `fhir-resource-map.md` | FHIR resource relationship map | ARCH-004 |
| 4 | `fhir-profile-tree.md` | FHIR profile inheritance tree | ARCH-004 |
| 5 | `terminology-binding-map.md` | Terminology binding per element | ARCH-004 |
| 6 | `sequence.md` | Patient data flow sequence | ARCH-004 |

Output directory: `_bmad/memory/hdl/architecture/diagrams/`

---

## Diagram Specifications

### 1. C4 Context — `c4-context.md`

Show the system and every external actor or system it interacts with.

```markdown
# C4 Context — {project_name}

```mermaid
C4Context
  title {project_name} — System Context
  Person(patient, "Patient / Caregiver", "End user of the healthcare app")
  Person(clinician, "Clinician", "Reviews AI triage recommendations")
  System(app, "{project_name}", "AI-powered healthcare triage application")
  System_Ext(hapi, "HAPI FHIR R4 Server", "Stores FHIR resources")
  System_Ext(ai, "AI Vision API", "Analyses visual input; returns triage classification")
  System_Ext(auth, "Identity Provider", "SMART on FHIR / OAuth2 authentication")
  System_Ext(lab, "Lab Information System", "Returns lab results as FHIR Observations")
  System_Ext(pharmacy, "Pharmacy Management System", "Receives medication orders")

  Rel(patient, app, "Submits symptoms, images")
  Rel(clinician, app, "Reviews triage outcomes")
  Rel(app, hapi, "Reads/writes FHIR resources", "REST/JSON")
  Rel(app, ai, "Sends image + symptoms", "HTTPS/JSON")
  Rel(app, auth, "Authenticates users", "OIDC/SMART")
  Rel(app, lab, "Retrieves results", "FHIR R4")
  Rel(app, pharmacy, "Sends prescriptions", "FHIR R4 MedicationRequest")
```
```

Populate with actual systems from the use-case-brief and data-element-inventory. Expand or
reduce actors to match the project. Use Mermaid C4Context syntax.

---

### 2. C4 Container — `c4-container.md`

Show the internal containers of the system: frontend, backend, FHIR server, AI service, database.

```markdown
# C4 Container — {project_name}

```mermaid
C4Container
  title {project_name} — Container Diagram

  Person(user, "Patient / Caregiver")
  Person(clinician, "Clinician")

  Container_Boundary(app, "{project_name}") {
    Container(frontend, "Mobile / Web App", "React Native / React", "User interface; camera capture; triage result display")
    Container(api, "Backend API", "Node.js / FastAPI", "Business logic; FHIR resource orchestration; AI call delegation")
    Container(fhir_server, "HAPI FHIR R4", "Docker / Java", "FHIR resource storage and retrieval")
    Container(ai_service, "AI Triage Service", "Python / GPT-4o Vision", "Image + symptom classification; triage pathway recommendation")
    ContainerDb(db, "PostgreSQL", "RDBMS", "Audit logs; user accounts; non-FHIR operational data")
  }

  System_Ext(idp, "Identity Provider", "SMART on FHIR / OAuth2")

  Rel(user, frontend, "Uses", "HTTPS")
  Rel(clinician, frontend, "Reviews", "HTTPS")
  Rel(frontend, api, "API calls", "HTTPS/JSON")
  Rel(api, fhir_server, "FHIR CRUD", "HTTPS/JSON")
  Rel(api, ai_service, "POST image + symptoms", "HTTPS/JSON")
  Rel(api, db, "Reads/writes", "SQL")
  Rel(api, idp, "Token validation", "OIDC")
  Rel(ai_service, fhir_server, "Writes ClinicalImpression", "FHIR R4 REST")
```
```

Tailor containers to the actual tech stack in the project.

---

### 3. FHIR Resource Map — `fhir-resource-map.md`

Show the FHIR resources used and their relationships using an entity-relationship style.

```markdown
# FHIR Resource Map — {project_name}

```mermaid
erDiagram
  Patient ||--o{ Observation : "has"
  Patient ||--o{ ClinicalImpression : "subject of"
  Patient ||--o{ Media : "source of"
  Patient ||--o{ Encounter : "participates in"
  ClinicalImpression ||--o{ Observation : "based on"
  ClinicalImpression ||--|| Encounter : "context"
  Media ||--|| Observation : "evidence for"
  Encounter ||--o{ MedicationRequest : "results in"
  Encounter ||--o{ ServiceRequest : "triggers"
  ServiceRequest ||--o{ DiagnosticReport : "fulfilled by"
  DiagnosticReport ||--o{ Observation : "contains"
  MedicationRequest ||--|| Medication : "references"
```
```

Include all resources from the data-element-inventory. Label relationships with FHIR element names
where possible (e.g., `subject`, `context`, `basedOn`).

---

### 4. FHIR Profile Tree — `fhir-profile-tree.md`

Show profile inheritance: base FHIR resource → national profile → project profile.

```markdown
# FHIR Profile Tree — {project_name}

```mermaid
graph TD
  Patient --> CAPatient["CA Patient\n(Health Infoway)"]
  CAPatient --> ProjectPatient["{project_name} Patient Profile"]

  Observation --> CAObservation["CA Observation\n(Health Infoway)"]
  CAObservation --> TriageObservation["{project_name} Triage Observation"]
  CAObservation --> VitalObservation["{project_name} Vital Signs Observation"]

  Media --> CAMedia["CA Media"]
  CAMedia --> TriageMedia["{project_name} Triage Image"]

  ClinicalImpression --> ProjectClinicalImpression["{project_name} Triage Impression"]

  Encounter --> CAEncounter["CA Encounter"]
  CAEncounter --> TriageEncounter["{project_name} Triage Encounter"]

  MedicationRequest --> CAMedRequest["CA MedicationRequest\n(PrescribeIT)"]
  CAMedRequest --> ProjectMedRequest["{project_name} Medication Request"]
```
```

For US projects: replace CA profiles with US Core profiles (`hl7.org/fhir/us/core`).
For Canadian projects: reference Health Infoway CA Core profiles.
Show only resources actually used in this project.

---

### 5. Terminology Binding Map — `terminology-binding-map.md`

Show each FHIR element, its bound ValueSet, CodeSystem, and binding strength.

```markdown
# Terminology Binding Map — {project_name}

```mermaid
graph LR
  subgraph "Observation"
    obs_code["code\n(required)"]
    obs_interp["interpretation\n(extensible)"]
    obs_cat["category\n(preferred)"]
  end

  subgraph "ClinicalImpression"
    ci_code["code\n(example)"]
    ci_prog["prognosisCodeableConcept\n(example)"]
  end

  subgraph "Encounter"
    enc_type["type\n(preferred)"]
    enc_class["class\n(required)"]
  end

  obs_code --> LOINC["LOINC\nhttp://loinc.org"]
  obs_code --> pCLOCD["pCLOCD\n(pan-Canadian)"]
  obs_interp --> HL7ObsInterp["HL7 ObsInterpretationCodes"]
  obs_cat --> HL7ObsCat["HL7 ObservationCategoryCodes"]
  ci_code --> SNOMED["SNOMED CT\nCA Edition"]
  ci_prog --> SNOMED
  enc_type --> SNOMED
  enc_class --> HL7ActCode["HL7 v3 ActCode"]
```
```

Populate from the terminology-inventory if available. List every FHIR element that has a
terminology binding in the project's profiles.

---

### 6. Patient Data Flow Sequence — `sequence.md`

Show the end-to-end flow of a triage encounter: patient submits → AI processes → result stored → clinician notified.

```markdown
# Patient Data Flow Sequence — {project_name}

```mermaid
sequenceDiagram
  autonumber
  actor P as Patient
  participant App as Mobile App
  participant API as Backend API
  participant AI as AI Triage Service
  participant FHIR as HAPI FHIR R4
  participant Clinician as Clinician Dashboard

  P->>App: Opens app, authenticates (SMART on FHIR)
  App->>API: POST /auth/token (PKCE)
  API-->>App: Access token

  P->>App: Captures image + enters symptoms
  App->>API: POST /triage { image_b64, symptoms[] }
  API->>FHIR: POST Media (image)
  FHIR-->>API: Media/{id}
  API->>FHIR: POST Observation (symptoms)
  FHIR-->>API: Observation/{id}

  API->>AI: POST /classify { image_b64, symptoms[] }
  AI-->>API: { pathway, confidence, causes[], remedies[] }

  API->>FHIR: POST ClinicalImpression (triage result)
  FHIR-->>API: ClinicalImpression/{id}
  API->>FHIR: POST Encounter (triage encounter)
  FHIR-->>API: Encounter/{id}

  API-->>App: { pathway, confidence, causes[], remedies[], fhir_ids{} }
  App-->>P: Display triage result

  alt pathway == "emergency" or "doctor"
    API->>FHIR: POST ServiceRequest (referral)
    API->>Clinician: Notify via webhook
    Clinician->>FHIR: GET ClinicalImpression/{id}
    Clinician-->>P: Follow-up
  end
```
```

Adapt the sequence to match the actual product flow from the use-case-brief.

---

## Regenerate One Diagram

1. Identify which diagram the user wants to regenerate (by name or number).
2. Read the existing file.
3. Read updated source files (use-case-brief, ADRs, data-element-inventory).
4. Rewrite the diagram file with updated content.
5. Regenerate the HTML report.

---

## HTML Diagram Report

After generating or regenerating diagrams, produce an HTML report.

Write to: `_bmad-output/diagrams/architecture-diagrams-{date}.html`

**Requirements:**
- Load Mermaid.js from CDN: `https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js`
- One section per diagram with: diagram title, `<pre class="mermaid">` block, and a brief description
- Responsive layout, dark/light header, print-friendly
- `mermaid.initialize({ startOnLoad: true, theme: 'default' })` in `<script>`

**Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{project_name} — Architecture Diagrams</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
<script>mermaid.initialize({ startOnLoad: true, theme: 'default' });</script>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f5f5f5; }
  .header { background: #1e3a5f; color: white; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 1.4rem; }
  .header p { margin: 4px 0 0; opacity: 0.8; font-size: 0.9rem; }
  .container { max-width: 1100px; margin: 32px auto; padding: 0 16px; }
  .diagram-section { background: white; border-radius: 8px; margin-bottom: 32px;
                      padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .diagram-section h2 { margin-top: 0; color: #1e3a5f; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
  .diagram-section p { color: #555; font-size: 0.9rem; }
  .mermaid { overflow-x: auto; }
  .footer { text-align: center; color: #aaa; font-size: 0.75rem; padding: 16px 0 32px; }
</style>
</head>
<body>
<div class="header">
  <h1>{project_name} — Architecture Diagrams</h1>
  <p>Generated {date} by hdl-diagrams | FHIR {fhir_version} | {jurisdiction}</p>
</div>
<div class="container">

  <div class="diagram-section">
    <h2>1. C4 Context</h2>
    <p>The system in its external environment — actors, external systems, and relationships.</p>
    <pre class="mermaid">{c4_context_mermaid}</pre>
  </div>

  <div class="diagram-section">
    <h2>2. C4 Container</h2>
    <p>Internal containers: frontend, backend API, FHIR server, AI service, and data stores.</p>
    <pre class="mermaid">{c4_container_mermaid}</pre>
  </div>

  <div class="diagram-section">
    <h2>3. FHIR Resource Map</h2>
    <p>Relationships between FHIR resources used in this project.</p>
    <pre class="mermaid">{fhir_resource_map_mermaid}</pre>
  </div>

  <div class="diagram-section">
    <h2>4. FHIR Profile Tree</h2>
    <p>Profile inheritance: base FHIR resource → national profile → project-specific profile.</p>
    <pre class="mermaid">{fhir_profile_tree_mermaid}</pre>
  </div>

  <div class="diagram-section">
    <h2>5. Terminology Binding Map</h2>
    <p>FHIR elements, their bound ValueSets, CodeSystems, and binding strengths.</p>
    <pre class="mermaid">{terminology_binding_map_mermaid}</pre>
  </div>

  <div class="diagram-section">
    <h2>6. Patient Data Flow</h2>
    <p>End-to-end sequence: patient submits triage → AI classifies → FHIR records created → clinician notified.</p>
    <pre class="mermaid">{sequence_mermaid}</pre>
  </div>

</div>
<div class="footer">Healthcare SDLC Delivery Suite — hdl-diagrams — {date}</div>
</body>
</html>
```

Extract the Mermaid DSL content from each `.md` file (content inside the fenced block) and
substitute into the template. Write the completed HTML to the output path.

---

## Output Summary

After all diagrams and the HTML report are generated, print:

```
─────────────────────────────────────────────
  HDL DIAGRAMS COMPLETE
─────────────────────────────────────────────
  Diagrams : 6 files
  Output   : _bmad/memory/hdl/architecture/diagrams/
  Report   : _bmad-output/diagrams/architecture-diagrams-{date}.html
─────────────────────────────────────────────
  Files:
    c4-context.md
    c4-container.md
    fhir-resource-map.md
    fhir-profile-tree.md
    terminology-binding-map.md
    sequence.md
─────────────────────────────────────────────
  Next step: Gate ARCH-004 → verify all 6 diagrams are non-empty
             (run hdl-gate-validator --phase architecture)
```
