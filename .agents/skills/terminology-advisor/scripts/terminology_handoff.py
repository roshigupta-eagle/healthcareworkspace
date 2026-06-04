#!/usr/bin/env python3
"""Generate a Markdown handoff skeleton for terminology-to-FHIR collaboration."""

import argparse
from textwrap import dedent


def build_handoff(args: argparse.Namespace) -> str:
    return dedent(f"""
    ## FHIR agent handoff

    ### Objective
    {args.objective}

    ### Jurisdiction and program
    - Country/province/state: {args.jurisdiction}
    - Program/domain: {args.domain}
    - Governing IG/package/version: {args.ig}
    - FHIR release: {args.fhir_version}

    ### Terminology recommendation
    - Primary code system(s): [fill in after source validation]
    - Value set(s): [canonical URL, version, and source]
    - Concept map(s): [canonical URL, version, direction, and source]
    - Binding strength recommendation: [required | extensible | preferred | example]
    - Display/designation requirements: [language/locale]
    - Unit requirements: [UCUM/pCLOCD/other]

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
    - Server/base URL: [fill in]
    - Operations to run:
      - $lookup: [candidate code systems]
      - $validate-code: [value sets and candidate codings]
      - $expand: [value sets, filters, versions]
      - $translate: [concept maps]
      - $subsumes: [hierarchy checks]
    - Parameters to pin:
      - system/version:
      - valueSet/version:
      - date:
      - language/display:

    ### Test cases
    | Scenario | Coding / CodeableConcept | Expected result | Validation operation |
    |---|---|---|---|
    | Valid in required value set |  | pass | $validate-code |
    | Wrong system or edition |  | fail | $validate-code |
    | Inactive/deprecated concept |  | warning/fail per policy | $lookup + $validate-code |
    | Display mismatch |  | warning or corrected display | $validate-code |

    ### Risks and open questions
    - Licensing/access:
    - Provincial/local variation:
    - Version pinning:
    - Mapping ambiguity:
    - Required human review:
    """).strip()


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a terminology handoff skeleton for a FHIR agent.")
    parser.add_argument("--jurisdiction", default="[country/province/state]", help="Jurisdiction, e.g. Canada/Ontario or United States")
    parser.add_argument("--domain", default="[clinical domain]", help="Clinical/program domain, e.g. laboratory observations")
    parser.add_argument("--fhir-version", default="R4", help="FHIR release, e.g. R4, R4B, R5")
    parser.add_argument("--ig", default="[implementation guide/package/version]", help="Governing IG or package")
    parser.add_argument("--objective", default="[what the FHIR agent needs to do]", help="Objective for the FHIR agent")
    args = parser.parse_args()
    print(build_handoff(args))


if __name__ == "__main__":
    main()
