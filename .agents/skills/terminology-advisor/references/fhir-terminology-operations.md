# FHIR terminology operations

## Start with capabilities
Before relying on a terminology server, inspect its conformance/capability surface:

- `GET [base]/metadata`
- `GET [base]/metadata?mode=terminology` when supported
- `GET [base]/TerminologyCapabilities` or server-specific documentation when available

Check supported FHIR release, operations, code systems, versions, value set expansion behavior, supplements/designations, paging, filtering, authentication, and licensing.

## Core operations
Use these operations for most terminology work:

- `CodeSystem/$lookup`: retrieve display, designations, status, properties, and version for a code.
- `CodeSystem/$validate-code`: validate a code against a code system and optional display/version.
- `ValueSet/$expand`: generate candidate codes from a value set definition; use filter/count/offset/date/system-version where appropriate.
- `ValueSet/$validate-code`: test whether a Coding or CodeableConcept is valid for a value set.
- `ConceptMap/$translate`: map a source coding to target coding(s); inspect equivalence/relationship and comments.
- `CodeSystem/$subsumes`: test hierarchy relationships, especially in SNOMED CT.

## Validation pattern
For a candidate Coding:

1. Confirm code system URI.
2. Confirm code system version/edition.
3. Run `$lookup` to verify code existence, display, active status, and designations.
4. Run `$validate-code` against the required ValueSet URL and version.
5. Record result, server, timestamp, expansion parameters, and warnings.
6. If validation fails, determine whether the issue is wrong system, wrong edition, inactive concept, wrong value set, display mismatch, missing terminology content, or server configuration.

## Expansion pattern
When expanding a ValueSet:

- Use `count` and `offset` for large expansions.
- Use `filter` only for user-interface search or candidate discovery; do not treat filtered expansion as the full value set.
- Capture expansion timestamp and parameters.
- Use `system-version` or equivalent when an IG requires specific code system versions.
- Beware of inactive concepts, implicit value sets, post-coordinated expressions, and terminology server differences.

## Mapping pattern
For ConceptMap work:

1. Confirm source and target code systems and versions.
2. Determine map direction and use case: display translation, semantic equivalence, reporting roll-up, analytics, migration, or validation.
3. Run `$translate` if a ConceptMap is available.
4. Review relationship/equivalence and comments; do not treat all mappings as exact.
5. Mark unmapped, narrower, broader, related-to, and source-is-broader cases explicitly.
6. Recommend human clinical terminology review for material clinical decisions.

## Canonical URI reminders
Common systems:

- SNOMED CT: `http://snomed.info/sct`
- LOINC: `http://loinc.org`
- pCLOCD: `https://fhir.infoway-inforoute.ca/CodeSystem/pCLOCD`
- UCUM: `http://unitsofmeasure.org`
- RxNorm: `http://www.nlm.nih.gov/research/umls/rxnorm`
- CVX: `http://hl7.org/fhir/sid/cvx`
- ICD-10-CM: `http://hl7.org/fhir/sid/icd-10-cm`
- ICD-10-PCS: `http://www.cms.gov/Medicare/Coding/ICD10`
- CPT: `http://www.ama-assn.org/go/cpt`
- HCPCS: `https://www.cms.gov/Medicare/Coding/HCPCSReleaseCodeSets`

For Canadian ICD-10-CA/CCI and local/provincial systems, do not invent URIs. Use the URI from the governing IG, Canadian FHIR Registry, CIHI artifact, or project specification.

## SNOMED CT edition/version rules
- `Coding.system` remains `http://snomed.info/sct`.
- Edition/version is represented separately when needed.
- SNOMED edition URI pattern: `http://snomed.info/sct/{sctid}`.
- Versioned edition URI pattern: `http://snomed.info/sct/{sctid}/version/{yyyymmdd}`.
- Use the edition required by the jurisdiction: Canada, U.S., International, or project extension.

## Quality checks for FHIR artifacts
For ValueSet:

- Has stable `url`, `version`, `name`, `title`, `status`, `publisher`, `jurisdiction`, and `copyright` where needed.
- `compose.include.system` values use canonical URIs.
- Code system versions are pinned when the IG requires reproducible validation.
- Expansion is not treated as the only source unless the artifact is explicitly executable/point-in-time.

For CodeSystem:

- Has owner, versioning, case sensitivity, content mode, concept lifecycle, and display-language policy.
- Is not created for local codes when an existing standard code system should be used.

For ConceptMap:

- Has clear source/target scope, direction, relationship semantics, review status, and unmapped strategy.
