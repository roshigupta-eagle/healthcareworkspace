# AI Clinical Summary — Low Level Design

Routes
------
- UI page (server+client): `/dashboard/records/:patientId/ai-summary`
- API: `GET /api/patients/:patientId/ai-summary` (latest)
- API: `POST /api/patients/:patientId/ai-summary` (generate)
- API: `POST /api/patients/:patientId/ai-summary/:summaryId/mutate` (mutations: review, accept/dismiss recommendations)
- API: `GET /api/patients/:patientId/ai-summary/:summaryId/fhir` (FHIR representation)

Component tree
--------------
- `AiClinicalSummaryPage` (server page) — loads patient context
  - `AiClinicalSummaryClient` (client) — orchestrates fetches and interactions
    - `AiSummaryHeader` (title + timestamp + regenerate + confidence card)
    - `AiConfidenceCard` + `AiConfidenceDrawer`
    - `AiMetricGrid` → `AiMetricCard` (5 cards)
    - `AiHealthTimeline`
    - `AiClinicalSummaryPanel` (findings + sources drawer)
    - `AiRecommendationsPanel`
    - `AiSummaryActions`
    - `AiSummaryDisclaimer`

TypeScript models (examples)
----------------------------
- `AiClinicalSummary` — id, version, patientId, generatedAt, findings[], metrics[], recommendations[], confidence, sources[], reviewed
- `AiSummaryFinding` — id, text, confidence, sources[]
- `AiSummaryMetric` — id, title, value, unit, trend[]
- `AiRecommendation` — id, text, priority, status, sources[]
- `AiSummarySourceReference` — resourceType, id, date

API contracts (selected)
------------------------
GET `/api/patients/:patientId/ai-summary`
- 200: { summary: AiClinicalSummary }
- 404: { error: 'not found' }

POST `/api/patients/:patientId/ai-summary`
- body: { force?: boolean }
- 201: { summary: AiClinicalSummary }

POST `/api/patients/:patientId/ai-summary/:summaryId/mutate`
- body: { action: 'markReviewed'|'acceptRecommendation'|'dismissRecommendation', payload }
- 200: { summary: AiClinicalSummary }

Persistence & versioning
------------------------
- Prototype: file-backed under `/ehr/data/ai-summaries/{patientId}.json` with an array of versions
- Production: replace with a DB-backed store and ensure transactional updates and provenance

Confidence & factors
---------------------
- Confidence is a score derived from: source completeness, recency, number of supporting resources, contradictory records, and data quality checks. The system exposes qualitative labels and a factor breakdown.

UI behaviors
------------
- Regenerate triggers server generation and preserves previous versions until the new version is successful
- Reviewed summaries cannot be silently regenerated; the user is prompted
- Each finding links to a sources drawer listing the supporting FHIR resources
- Export opens a print-optimized view; Share opens a secure dialog

Testing strategy
----------------
- Unit: models, confidence calculation, trend math
- Component: header, confidence card, metric cards, summary panel
- Integration: API -> file store flows (generate, mutate)
- E2E: route navigation, generate, review, export, share
