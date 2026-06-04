# HAPI FHIR implementation guide

## Table of contents

1. HAPI FHIR source-of-truth approach
2. Plain server vs JPA server vs hybrid
3. JPA server architecture and database implications
4. Validation and IG package loading
5. Interceptors and security integration
6. Terminology and search
7. HAPI implementation checklist
8. Review templates

## 1. HAPI FHIR source-of-truth approach

Verify current details from official HAPI FHIR documentation:

- Main documentation: `https://hapifhir.io/docs/`
- FHIR and HAPI FHIR versions: `https://hapifhir.io/hapi-fhir/docs/getting_started/versions.html`
- JPA server introduction: `https://hapifhir.io/hapi-fhir/docs/server_jpa/introduction.html`
- JPA starter: `https://hapifhir.io/hapi-fhir/docs/server_jpa/get_started.html`
- JPA architecture/database schema: `https://hapifhir.io/hapi-fhir/docs/server_jpa/schema.html`
- Interceptors: `https://hapifhir.io/hapi-fhir/docs/interceptors/server_interceptors.html`
- Validation support modules: `https://hapifhir.io/hapi-fhir/docs/validation/validation_support_modules.html`

HAPI FHIR version support changes over time. Confirm Java/JDK support, FHIR version support, Spring Boot compatibility, and JPA schema changes for the chosen HAPI version.

## 2. Plain server vs JPA server vs hybrid

### Plain Server

Use HAPI FHIR Plain Server when:

- the system has an existing non-FHIR database or services
- you need to expose FHIR APIs over a domain model
- custom business logic is more important than general repository behavior
- resource providers map REST operations to application services

Risks:

- you implement persistence, search, history, references, validation, and operations yourself
- conformance can drift if providers are inconsistent

### JPA Server

Use HAPI FHIR JPA Server when:

- you need a general-purpose FHIR repository
- you want built-in REST operations, versioning, search indexing, history, conditional operations, transactions, terminology features, and validation integration
- you can accept HAPI's persistence schema and operational model

Risks:

- HAPI's schema is not your business domain model
- reporting queries over raw resources/search indexes need careful design
- upgrades can involve schema migrations and reindexing
- multi-tenancy, partitioning, MDM, terminology, and subscriptions need explicit architecture

### Hybrid

Use hybrid when:

- application workflow is domain-driven but FHIR is the interoperability contract
- you need a FHIR repository for exchange plus separate operational tables
- you need event-driven synchronization between domain services and FHIR resources

Define ownership rules carefully: which side is source of truth, how conflicts are resolved, how versioning works, and which API is authoritative.

## 3. JPA server architecture and database implications

HAPI FHIR JPA stores resources and versions in repository tables and maintains search indexes for FHIR search. Do not write directly to HAPI tables unless official HAPI APIs explicitly support the operation.

Implementation considerations:

- choose database platform supported by the target HAPI version, commonly PostgreSQL or other enterprise RDBMS options
- decide FHIR version at server startup with the correct `FhirContext`
- pin HAPI version and migration plan
- use database migrations recommended by HAPI
- plan reindexing after SearchParameter/profile changes
- size storage for resource versions and narrative/text payloads
- plan terminology tables and expansion/coding validation behavior
- plan partitioning/multitenancy before production data is loaded
- define backup/restore and point-in-time recovery
- ensure audit and access logs are outside resource storage when required

Key HAPI schema ideas:

- resources have internal persistent ids as implementation details
- resource versions are stored separately from current resource metadata
- search parameter indexes drive search behavior
- links/references are indexed according to SearchParameter definitions
- exact column types vary by database platform

## 4. Validation and IG package loading

For real IG conformance, base validation is not enough. Build a validation support chain.

Typical HAPI validation components:

- `DefaultProfileValidationSupport` for built-in base definitions
- `NpmPackageValidationSupport` for IG packages such as US Core, CA Baseline, PS-CA, or project IGs
- `SnapshotGeneratingValidationSupport` for differential profiles without snapshots
- `CommonCodeSystemsTerminologyService` for common code systems
- terminology service support for code validation and value set expansion
- `ValidationSupportChain` to combine modules
- `FhirInstanceValidator` for resource validation
- request/response or repository validation interceptors for server enforcement

Validation decisions:

- fail on errors only or also warnings?
- validate inbound creates/updates only or outbound responses too?
- validate terminology online, offline, or with pre-expanded value sets?
- load profiles by NPM package, local package, Simplifier download, or canonical source?
- cache snapshots and expansions?
- support multiple IG versions concurrently?

## 5. Interceptors and security integration

HAPI interceptors can enforce cross-cutting behavior.

Common uses:

- authorization and compartment-based access
- SMART token validation integration
- tenant partition selection
- request/response validation
- audit logging
- consent filtering
- repository validation
- data standardization
- response headers and operation outcomes
- subscription/event handling
- provenance enrichment

Security design reminders:

- HAPI does not replace identity provider, consent management, or enterprise authorization policy by itself.
- Enforce access at the server/service layer, not only at API gateway.
- Use interceptors for policy hooks, but keep complex policy decisions in a dedicated authorization service when needed.
- Include `AuditEvent` and platform logs for PHI access according to the deployment's policy.

## 6. Terminology and search

Terminology planning:

- identify code systems/value sets required by each IG
- decide whether to host terminology in HAPI, an external terminology server, or pre-expanded artifacts
- define update/version policy for SNOMED CT, LOINC, UCUM, RxNorm, Canadian drug terminologies, provincial value sets, and local code systems
- map local codes with `ConceptMap` when possible

Search planning:

- implement only the search parameters required by the IG and real use cases
- include `_include` and `_revinclude` only when needed and performant
- define paging, sorting, chained search, and summary behavior
- validate searches against CapabilityStatement claims
- reindex after enabling new SearchParameters

## 7. HAPI implementation checklist

- FHIR version selected and justified
- HAPI version pinned and checked against Java/Spring/database support
- Plain/JPA/hybrid decision documented
- IG packages and versions listed
- validation support chain designed
- terminology strategy defined
- SMART/OAuth integration defined
- authorization and consent interceptors designed
- audit/event strategy defined
- partitioning/multitenancy decision made early
- search parameters and indexes mapped to use cases
- transaction and conditional operation policy defined
- OperationOutcome behavior defined
- deployment topology, scaling, backup, monitoring, and migration plan documented
- conformance tests and sample Bundles created

## 8. Review templates

### HAPI server decision record

| Decision | Choice | Rationale | Risk | Mitigation |
|---|---|---|---|---|
| Server type | Plain/JPA/Hybrid |  |  |  |
| FHIR version | R4/R4B/R5 |  |  |  |
| HAPI version |  |  |  |  |
| Database |  |  |  |  |
| Validation |  |  |  |  |
| Terminology |  |  |  |  |
| Security |  |  |  |  |
| Multitenancy |  |  |  |  |
| Search |  |  |  |  |

### HAPI validation package inventory

| Package | Version | Source | FHIR version | Used for | Loaded in validator | Notes |
|---|---|---|---|---|---|---|
| hl7.fhir.us.core |  |  | R4 | US Core validation | yes/no |  |
| hl7.fhir.ca.baseline |  |  | R4 | Canadian baseline validation | yes/no |  |
| project package |  |  |  | local profiles | yes/no |  |
