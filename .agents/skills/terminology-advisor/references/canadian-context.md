# Canadian terminology context

## Source hierarchy
Use this order for Canadian work:

1. Client or project implementation guide, conformance package, terminology package, or contract.
2. Provincial/territorial program artifacts and implementation guides.
3. Canadian FHIR Registry and Canada Health Infoway terminology assets.
4. CIHI classifications and Canadian Coding Standards for ICD-10-CA/CCI use cases.
5. International stewards such as SNOMED International, Regenstrief/LOINC, HL7 Terminology, UCUM, and WHO.

## Pan-Canadian defaults
Use these as defaults only when the project or province has not specified different artifacts:

- SNOMED CT Canadian Edition for Canadian clinical concepts and Canadian English/French designations/value sets.
- pCLOCD for Canadian laboratory and clinical observation coding where a Canadian LOINC constraint, display, or recommended unit is needed.
- LOINC for observation identifiers when the project expects international LOINC directly or pCLOCD does not add needed constraints.
- UCUM for machine-processable units; check pCLOCD recommended units in Canadian lab scenarios.
- ICD-10-CA for Canadian morbidity/diagnosis classification and reporting.
- CCI for Canadian health intervention classification.
- Canadian FHIR Registry for Canadian profiles, extensions, value sets, URIs, and jurisdictional/local FHIR projects.

## SNOMED CT Canadian Edition
Guidance:

- Prefer SNOMED CT Canadian Edition for Canadian clinical exchange when SNOMED is the selected terminology.
- Distinguish International Edition, Canadian Edition, and any provincial/local extensions.
- Use `http://snomed.info/sct` as `Coding.system`.
- Use the relevant edition/version URI in `Coding.version`, `ValueSet.compose.include.version`, expansion parameters, or terminology-server calls when the edition matters.
- Validate membership in Canadian value sets on the terminology server instead of assuming International Edition membership is enough.
- Use Canadian English and Canadian French designations when bilingual display requirements apply.
- Do not reproduce licensed release content beyond what the user is authorized to use.

## pCLOCD and LOINC
Guidance:

- Use pCLOCD when Canadian lab viewer names, Canadian French/English display names, Canadian constraints, or recommended units are relevant.
- Use LOINC for observation/test identifiers and LOINC panels/answer lists where the project requires LOINC directly.
- pCLOCD may include Canadian supplemental content and Canadian display conventions. Validate its CodeSystem URI and code membership through Infoway/Canadian FHIR artifacts or the applicable terminology server.
- Preserve LOINC semantics: component, property, timing, system, scale, and method matter. Do not choose a LOINC term from display text alone.
- For lab result units, use UCUM and check recommended units when pCLOCD is in scope.

Common URIs:

- LOINC: `http://loinc.org`
- UCUM: `http://unitsofmeasure.org`
- pCLOCD: `https://fhir.infoway-inforoute.ca/CodeSystem/pCLOCD`

## ICD-10-CA and CCI
Use CIHI classifications when the task is morbidity reporting, abstracting, administrative analytics, health intervention classification, or data submission tied to Canadian reporting.

Do not use ICD-10-CA/CCI as a substitute for detailed clinical reference terminology in exchange payloads unless the implementation guide requires it. If clinical exchange also needs computable concepts, consider dual coding or mappings, but validate governance and reporting implications.

## Bilingual and Indigenous/local considerations
- Check whether English, French, or both displays are required.
- For Quebec and federal/pan-Canadian products, French designations may be a functional requirement, not a presentation detail.
- If Indigenous, community, public health, or local program terminology is involved, treat it as governed local content and ask for the owning source or published artifact.

## Canadian answer checklist
Before finalizing a Canadian terminology recommendation, confirm:

- Country and province/territory.
- Program or implementation guide.
- FHIR release and package version.
- Code system URI and version/edition.
- ValueSet URL, version, and binding strength.
- Terminology server used for validation.
- English/French display requirements.
- Whether the term is clinical exchange, reporting, analytics, billing, or UI-only.
