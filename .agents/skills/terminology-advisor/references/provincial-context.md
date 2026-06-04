# Canadian provincial and territorial context

## General rule
Do not assume pan-Canadian guidance is sufficient for a provincial implementation. Provinces and territories may have program-specific FHIR profiles, local code systems, value sets, terminology server endpoints, bilingual requirements, lab/drug repositories, and validation rules.

Default to pan-Canadian terminology only when the provincial/program artifact is unavailable or silent. Mark that assumption clearly.

## Provincial discovery checklist
For any provincial request, identify:

- Province or territory.
- Program/domain: laboratory, medication, immunization, public health, referral, hospital reporting, claims, registry, etc.
- Owning organization and artifact source.
- Implementation guide/package/version.
- FHIR version.
- Terminology server base URL or package-based terminology source.
- CodeSystem, ValueSet, ConceptMap canonical URLs and versions.
- Required language displays.
- Whether local codes are permitted and how mappings are governed.

## Ontario
Likely sources and domains to check:

- Ontario Health / eHealth Ontario implementation guides.
- Ontario Digital Health Drug Repository (DHDR) for drug/pharmacy service exchange.
- Ontario Laboratories Information System (OLIS) provider query for lab-result viewing/exchange.
- Canadian FHIR Registry/Simplifier-hosted Ontario projects.

Guidance:

- For lab observations, check OLIS guidance, pCLOCD/LOINC use, UCUM units, and any Ontario-specific value sets.
- For medications, check DHDR and program-specific drug terminology requirements before assuming RxNorm or another system.
- Record the exact Ontario IG and version, because trial-use/balloted/public-access status can matter.

## Alberta
Likely sources to verify:

- Alberta Health, Alberta Health Services, Alberta Netcare, Connect Care, provincial registries, or program-specific specifications.

Guidance:

- Do not infer Alberta bindings from Ontario artifacts.
- Use pan-Canadian defaults only as provisional guidance until Alberta artifacts are available.
- Check medication, immunization, lab, and registry programs separately.

## British Columbia
Likely sources to verify:

- BC Ministry of Health, Provincial Health Services Authority, Health Gateway/Digital Health program artifacts, provincial lab/public-health systems, and Canadian FHIR Registry projects.

Guidance:

- Check whether a BC project mandates local value sets or pan-Canadian artifacts.
- For public health and lab exchange, expect program-specific requirements.

## Quebec
Likely sources to verify:

- MSSS/RAMQ or Quebec digital health program artifacts.

Guidance:

- Treat French display/designation requirements as first-class requirements.
- Do not assume English-only displays are acceptable.
- Check whether Quebec-specific identifiers, administrative classifications, or provincial value sets apply.

## Other provinces and territories
For Manitoba, Saskatchewan, Nova Scotia, New Brunswick, Newfoundland and Labrador, Prince Edward Island, Yukon, Northwest Territories, and Nunavut:

- Search for the program-specific implementation guide or terminology artifact first.
- If no source is available, recommend pan-Canadian defaults with a clear caveat.
- Flag local-code governance, bilingual requirements, and source-of-truth uncertainty.

## Local/provincial codes
Use local/provincial codes only when required by the implementation guide or no standard terminology covers the requirement.

Require:

- Canonical CodeSystem URL.
- Publisher/owner.
- Versioning policy.
- Concept lifecycle policy.
- Display language policy.
- ConceptMap to pan-Canadian/international terminology when interoperability or analytics require it.
