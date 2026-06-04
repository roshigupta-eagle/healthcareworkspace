# United States terminology context

## Source hierarchy
Use this order for U.S. work:

1. User-supplied project IG, payer/provider agreement, certification criterion, or program guidance.
2. Published HL7 U.S. Realm implementation guide such as US Core, QI-Core, Da Vinci, eCR, or public-health IGs.
3. VSAC/NLM value sets and terminology services when the value set is stewarded or distributed through VSAC.
4. ASTP/ONC USCDI and Interoperability Standards Platform vocabulary guidance.
5. Terminology stewards: SNOMED CT U.S. Edition, Regenstrief/LOINC, NLM RxNorm, CDC CVX/MVX/PHIN VADS, AMA CPT, CMS HCPCS, WHO/CDC ICD-10-CM/PCS, HL7 Terminology, UCUM.

## US Core and USCDI
- Use the current published US Core release for production guidance, not the continuous build, unless the user explicitly asks about ballot or CI content.
- US Core terminology bindings often reference value sets from VSAC, FHIR, THO, PHIN VADS, CDC, or US Core itself.
- US Core terminology may be effectively unpinned through canonical URLs even when published packages contain point-in-time expansions. Record the package, expansion date, and code system versions used by validation.
- USCDI identifies required data classes/elements and applicable vocabulary standards. Check the version that the user or regulatory program requires.

## VSAC/NLM
Use VSAC for many U.S. value sets, especially eCQMs, US Core-linked sets, and federal program artifacts.

Guidance:

- VSAC access can require a UMLS license/API key.
- VSAC value sets may be identified by OID, but FHIR resources should use the correct FHIR `Coding.system` URI for the member code system, not a VSAC display name or OID as the code system URI.
- Validate expansions through the VSAC FHIR terminology service or official downloadable packages when available.
- Record value set OID/URL, version, expansion profile/date, and code system versions.

## Common U.S. terminology choices
- Problems/conditions, allergies, procedures in clinical exchange: SNOMED CT U.S. Edition unless the IG requires another system.
- Lab and clinical observations: LOINC.
- Observation values, findings, organisms, body sites, qualifiers: often SNOMED CT.
- Medication clinical drug semantics: RxNorm.
- Vaccine administered: CVX; manufacturer often MVX.
- Units: UCUM.
- Diagnosis reporting and claims: ICD-10-CM.
- Inpatient procedure reporting: ICD-10-PCS.
- Physician/professional services and procedures: CPT/HCPCS, subject to licensing and program rules.
- Race/ethnicity and public-health vocabulary: CDC/PHIN VADS or the specific IG's referenced value set.

## U.S. pitfalls
- Do not mix ICD-10-CM with ICD-10-CA or ICD-10-WHO.
- Do not use NDC as a substitute for RxNorm clinical drug semantics unless package/product identification is the actual requirement.
- Do not reproduce CPT content unless the user has appropriate licensing and the output is permitted.
- Do not assume US Core CI build content is final.
- Do not treat a value set OID as the `Coding.system` for member codes.
