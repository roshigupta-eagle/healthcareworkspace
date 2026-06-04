# Canadian, provincial, US, and PrescribeIT interoperability guide

## Table of contents

1. How to compare jurisdictions
2. Canada and pan-Canadian landscape
3. Provincial examples and patterns
4. PrescribeIT and e-prescribing
5. United States landscape
6. Canada vs US differences
7. Cross-jurisdiction design checklist
8. Official source pointers

## 1. How to compare jurisdictions

Always compare at these levels:

1. governance and regulation
2. FHIR version and implementation guide version
3. actor obligations and Must Support meaning
4. supported resources and profiles
5. identifiers and assigning authorities
6. terminology and value sets
7. security and consent model
8. API pattern and conformance tests
9. operational workflows and exceptions
10. provincial/state/local overlays

Do not assume that a Canadian provincial guide, Canadian Baseline, PS-CA, US Core, or IPS can be implemented without local constraints.

## 2. Canada and pan-Canadian landscape

Canadian interoperability is federated. Pan-Canadian standards can guide national consistency, while provinces and territories often define the operational services, registries, consent practices, and implementation details.

Key concepts:

- **Canadian Baseline / CA Baseline**: Canadian baseline profiles provide common Canadian expectations and a starting point for jurisdictional and use-case profiles. They are not normally used out-of-the-box as a complete implementation contract.
- **Pan-Canadian Patient Summary (PS-CA)**: Canada-localized patient summary work aligned to IPS concepts; often document-style exchange using `Bundle` and `Composition` with referenced clinical resources.
- **CACDI / pan-Canadian health data content framework / CA Core+ direction**: emerging pan-Canadian data content and logical model work; verify current release and how it maps to FHIR profiles before using it as a contract.
- **Canadian FHIR Registry / Simplifier**: many Canadian and provincial IGs are published through Simplifier or the Canadian FHIR Registry.
- **Terminology**: use pan-Canadian, provincial, and international terminology as specified. Watch for Canadian-specific identifiers, code systems, bilingual display requirements, and provincial value sets.
- **Privacy and consent**: confirm federal/provincial requirements, role-based access, circle-of-care rules, consent directives, data residency, audit, and patient access obligations for the province/territory.

Common Canadian data domains:

- patient identity and demographics
- provider and organization directories
- medications, dispenses, and drug repositories
- labs and diagnostic results
- patient summary
- eReferral/eConsult
- forms/questionnaires
- immunizations
- clinical documents and attachments
- consent, audit, and provenance

## 3. Provincial examples and patterns

Use provincial details as implementation-specific, not universal.

### Ontario examples

Ontario Health/eHealth Ontario has published multiple FHIR implementation guides and standards pages. Common assets and guides include:

- Digital Health Drug Repository (DHDR): medication/drug and pharmacy service information, FHIR R4-based IGs, resources such as `Medication`, `MedicationDispense`, `MedicationRequest`, `MedicationAdministration`, `Organization`, `Patient`, `Practitioner`, `PractitionerRole`, `Location`, `Encounter`, and `Composition` depending on release.
- OLIS: lab result access/query through FHIR specifications.
- Provincial Client Registry (PCR): patient query and matching using provincial and point-of-service identifiers.
- Provincial Health Services Directory (PHSD) / Provincial Provider Registry (PPR): practitioner, organization, services, FHIR RESTful APIs, bulk import/export, and pub/sub patterns in newer guidance.
- Ontario eReferral/eConsult: workflow patterns including SMART on FHIR launch, direct FHIR messaging/API exchange, and RESTful FHIR APIs.
- Ontario eForms: Structured Data Capture (SDC), Questionnaire/QuestionnaireResponse and rendering/processing guidance.

### Alberta examples

Alberta Netcare is Alberta's provincial EHR ecosystem. Public FHIR examples include Alberta Patient Summary implementation guides aligned to pan-Canadian patient summary concepts and provincial EHR workflows. Patient Summary for Alberta uses FHIR R4, patient summary Bundles/Compositions, and provincial source-of-truth assumptions.

### Other provinces and territories

When working outside Ontario/Alberta, do not infer. Search the provincial digital health authority, health ministry, vendor portal, Infoway/InfoCentral, and Canadian FHIR Registry/Simplifier. Ask for the local integration package if it is private.

## 4. PrescribeIT and e-prescribing

PrescribeIT is Canada Health Infoway's national e-prescribing service and related specification ecosystem. Treat PrescribeIT as a specific e-prescribing integration program, not as generic FHIR medication modeling.

Important handling rules:

- Verify the current PrescribeIT service status before advising implementation, onboarding, or production integration. Public Infoway materials in 2026 announced a transition toward open standards and a planned conclusion of the centrally operated PrescribeIT service on May 29, 2026.
- If the user asks about legacy or current PrescribeIT implementation, check the vendor portal/specification version and local access permissions.
- Distinguish PrescribeIT clinical FHIR messaging from Shared Health/API/provider registry/polling components where the specification separates them.
- Treat prescription create, renew, cancel, status, clinical messaging, provider/pharmacy identity, formulary, and controlled-substance handling as separate requirements.
- Use synthetic examples only; prescription payloads are high-risk PHI and may include regulated drug data.

Typical e-prescribing concepts to model:

- prescriber, clinic, pharmacy, patient, medication, prescription order, renewal request/response, cancellation, dispense/status, adaptations, pharmacist-prescribed notification, clinical communication, attachments, audit, and provenance.

FHIR resource candidates, depending on the IG:

- `MedicationRequest` for prescription/order intent
- `Medication` for coded medication product or ingredient where required
- `MedicationDispense` for pharmacy dispense/status concepts
- `Communication` or message resources for clinical communications where specified
- `Task` for workflow where the IG uses task state
- `Bundle` and `MessageHeader` for message-style exchange where specified
- `Practitioner`, `PractitionerRole`, `Organization`, `Location`, `Endpoint` for prescriber/pharmacy identity and routing
- `Provenance` and `AuditEvent` for traceability

For the United States, do not assume FHIR replaces e-prescribing standards. US e-prescribing for Medicare Part D uses NCPDP SCRIPT and related NCPDP standards in regulation; FHIR resources such as US Core `MedicationRequest` are often used for medication access/history and clinical interoperability, not necessarily prescription transmission to pharmacies. Verify CMS and ONC rules for the specific use case.

## 5. United States landscape

The US environment commonly combines federal rules, ONC/ASTP certification standards, CMS payer rules, HL7 US Realm IGs, and network frameworks.

Key components:

- **US Core**: US realm FHIR profiles, based on FHIR R4, aligned to USCDI and used by many downstream IGs. Always verify current version and SVAP/certification allowances.
- **USCDI**: baseline data classes/elements adopted or referenced by ONC/CMS programs. Match the required version for the program.
- **ONC/ASTP certification g(10)**: standardized API criterion for patient and population services; uses FHIR R4, US Core, SMART App Launch, Bulk Data, and OIDC requirements depending on the adopted/required version.
- **Inferno**: common official test method for ONC API certification and US Core/API conformance testing.
- **CMS Interoperability and Prior Authorization rule**: payer APIs for Patient Access, Provider Access, Payer-to-Payer, and Prior Authorization; check exact compliance dates and implementation guides for impacted payer type.
- **Da Vinci IGs**: payer/provider interoperability such as PDex, Plan-Net, CRD, DTR, and PAS.
- **TEFCA**: nationwide network-of-networks framework; FHIR is being incorporated through TEFCA roadmap and technical requirements. Check Common Agreement, QTF, SOPs, UDAP/security, Provenance, and US Core requirements for current state.
- **US e-prescribing**: NCPDP SCRIPT and related NCPDP standards remain central for regulated prescription transmission; use FHIR Medication resources for FHIR-based medication access and clinical data exchange where applicable.

## 6. Canada vs US differences

| Area | Canada | United States |
|---|---|---|
| Governance | federated provincial/territorial delivery with pan-Canadian coordination | federal ONC/ASTP and CMS rules plus state, payer, EHR, and network programs |
| Core FHIR guidance | Canadian Baseline, PS-CA, CA Core+/CACDI direction, provincial IGs | US Core, USCDI, ONC certification, CMS payer APIs, Da Vinci, TEFCA |
| Provincial/state variation | very strong; provinces define many production services | strong but federal certification/payer programs create common API baselines |
| Patient identity | provincial health numbers, client registries, local MRNs | MRNs, MPI, payer member ids, NPI for providers, state/local identifiers |
| Provider identity | provincial colleges, provider registries, organizational roles | NPI, directories, payer/provider networks, state licenses |
| Medication/eRx | PrescribeIT history/open-standard transition, provincial drug repositories, pharmacy systems | NCPDP SCRIPT for eRx; US Core/Da Vinci/CMS APIs for medication and payer data |
| Patient summary | PS-CA and provincial patient summary implementations | IPS, C-CDA history, US Core data access, TEFCA exchange |
| Security | provincial identity/access systems plus OAuth/SMART where adopted | SMART/OIDC, ONC API criteria, TEFCA/UDAP in network contexts |
| Testing | project/provincial conformance, Infoway projectathon, FHIR validation | Inferno, US Core tests, ONC certification, payer implementation testing |

## 7. Cross-jurisdiction design checklist

- Name the jurisdiction and program in every design decision.
- Pin the FHIR version and IG version.
- Identify if the guide is published, trial-use, ballot, CI build, draft, private, or superseded.
- Map identifiers and assigning authorities explicitly.
- Define translations between Canadian and US code systems/value sets where cross-border exchange is required.
- State actor obligations separately for client, server, source system, repository, app, and user.
- Include a conformance test plan for each IG.
- For HAPI FHIR, load the correct package dependencies into validation support.
- Avoid using one country's profile canonical URL in another country's production payload unless the exchange contract requires it.

## 8. Official source pointers

Verify current details from these sources:

- Canadian Baseline: `https://build.fhir.org/ig/HL7-Canada/ca-baseline/`
- Canadian FHIR/InfoCentral: `https://infocentral.infoway-inforoute.ca/en/standards/canadian/fhir`
- Canada Health Infoway interoperability: `https://www.infoway-inforoute.ca/en/digital-health-initiatives/interoperability`
- CIHI pan-Canadian health data content framework/CACDI: `https://www.cihi.ca/en/connected-care/products-of-the-pan-canadian-health-data-content-framework`
- Pan-Canadian Patient Summary: `https://www.infoway-inforoute.ca/en/featured-initiatives/patient-summary`
- PrescribeIT public site: `https://www.prescribeit.ca/`
- PrescribeIT partner/specification portal: `https://partner.infoway-inforoute.ca/` and `https://specs.prescribeit.ca/`
- Ontario FHIR standards: `https://ehealthontario.on.ca/en/standards`
- Alberta Netcare: `https://www.albertanetcare.ca/`
- US Core: `https://hl7.org/fhir/us/core/`
- ONC/ASTP standardized API criterion: `https://www.healthit.gov/test-method/standardized-api-patient-and-population-services`
- ONC SVAP: `https://healthit.gov/certification-health-it/certification-criteria/standards-version-advancement-process-svap/`
- CMS interoperability/prior authorization: `https://www.cms.gov/cms-interoperability-and-prior-authorization-final-rule-cms-0057-f`
- CMS e-prescribing: `https://www.cms.gov/medicare/regulations-guidance/electronic-prescribing`
- TEFCA: `https://healthit.gov/policy/tefca/` and `https://rce.sequoiaproject.org/`
