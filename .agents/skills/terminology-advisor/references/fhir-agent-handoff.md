# FHIR agent handoff

Use this when another agent or teammate owns FHIR profiling, IG authoring, examples, validation, or server configuration.

## Handoff template

```markdown
## FHIR agent handoff

### Objective
[What the FHIR agent needs to build, change, validate, or decide.]

### Jurisdiction and program
- Country/province/state:
- Program/domain:
- Governing IG/package/version:
- FHIR release:

### Terminology recommendation
- Primary code system(s):
- Value set(s):
- Concept map(s):
- Binding strength recommendation:
- Display/designation requirements:
- Unit requirements:

### Canonical artifacts
| Artifact type | Canonical URL / identifier | Version | Source of truth | Notes |
|---|---|---:|---|---|
| CodeSystem |  |  |  |  |
| ValueSet |  |  |  |  |
| ConceptMap |  |  |  |  |

### FHIR elements affected
| Resource/Profile | Element path | Current binding/coding | Recommended binding/coding | Required action |
|---|---|---|---|---|
|  |  |  |  |  |

### Terminology-server validation
- Server/base URL:
- Operations to run:
  - `$lookup`:
  - `$validate-code`:
  - `$expand`:
  - `$translate`:
  - `$subsumes`:
- Parameters to pin:
  - system/version:
  - valueSet/version:
  - date:
  - language/display:

### Test cases
| Scenario | Coding / CodeableConcept | Expected result | Validation operation |
|---|---|---|---|
| Valid in required value set |  | pass | `$validate-code` |
| Wrong system or edition |  | fail | `$validate-code` |
| Inactive/deprecated concept |  | warning/fail per policy | `$lookup` + `$validate-code` |
| Display mismatch |  | warning or corrected display | `$validate-code` |

### Risks and open questions
- Licensing/access:
- Provincial/local variation:
- Version pinning:
- Mapping ambiguity:
- Required human review:
```

## Example: Canadian lab observation

```markdown
## FHIR agent handoff

### Objective
Bind laboratory observation identifiers and result units for Canadian exchange.

### Jurisdiction and program
- Country/province/state: Canada / [province]
- Program/domain: laboratory observations
- Governing IG/package/version: [provincial lab IG or Canadian FHIR Registry project]
- FHIR release: R4 unless project specifies otherwise

### Terminology recommendation
- Primary code system(s): pCLOCD or LOINC for Observation.code; UCUM for Observation.valueQuantity.code; SNOMED CT CA for coded result values/body sites/specimens when required.
- Value set(s): use project/provincial ValueSet first; otherwise pan-Canadian/Infoway artifact.
- Binding strength recommendation: follow IG; use required for constrained exchange value sets, extensible/preferred for UI/search sets as appropriate.
- Display/designation requirements: check Canadian English/French requirements.
- Unit requirements: UCUM, with pCLOCD recommended units where applicable.

### Terminology-server validation
Run `$lookup` for candidate LOINC/pCLOCD codes, `$validate-code` against the project ValueSet, and `$validate-code` for UCUM units where supported.
```

## Example: U.S. medication profile

```markdown
## FHIR agent handoff

### Objective
Confirm medication coding for a U.S. FHIR R4 implementation using US Core-aligned semantics.

### Jurisdiction and program
- Country/province/state: United States
- Program/domain: medication exchange
- Governing IG/package/version: published US Core version required by the project
- FHIR release: R4

### Terminology recommendation
- Primary code system(s): RxNorm for clinical drug concepts; NDC only when package/product identification is required by the IG.
- Value set(s): use US Core/VSAC value set referenced by the profile.
- Binding strength recommendation: follow US Core profile binding.
- Display/designation requirements: validate RxNorm display through NLM/VSAC terminology service.

### Terminology-server validation
Use VSAC/NLM or project-approved terminology service for `$lookup`, `$expand`, and `$validate-code` against the required value set.
```
