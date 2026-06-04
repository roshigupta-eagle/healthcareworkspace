# SMART apps, security, and open API guidance

## Table of contents

1. SMART source-of-truth approach
2. App launch patterns
3. Scopes and permissions
4. Discovery and capability metadata
5. Backend services
6. Security checklist
7. SMART output template

## 1. SMART source-of-truth approach

Verify current details from official SMART/HL7 publications. Useful references:

- SMART App Launch current published guide: `https://hl7.org/fhir/smart-app-launch/`
- App launch and authorization: `https://hl7.org/fhir/smart-app-launch/STU2.2/app-launch.html`
- SMART apps chapter: `https://www.hl7.org/fhir/smart-app-launch/apps.html`
- HL7 Bulk Data Access: `https://hl7.org/fhir/uv/bulkdata/`
- FHIRcast, when context synchronization is needed: `https://fhircast.org/`

## 2. App launch patterns

SMART App Launch commonly involves:

- **standalone launch**: app starts outside the EHR and discovers/authorizes against a FHIR server.
- **EHR launch**: app is launched from within an EHR/POS context and receives launch context.
- **patient-facing app**: patient authorizes access to their own data.
- **clinician-facing app**: authenticated clinical user authorizes or receives context for patient or user-level access.
- **backend services**: system-to-system access with client credentials/JWT-based authentication, often for population or server-side workflows.

When designing a SMART app, identify:

- launch mode
- user type: patient, clinician, administrator, system
- launch context: patient, encounter, tenant, organization, location
- resource access scope
- refresh token and offline access needs
- whether granular scopes are required
- whether app uses write access, not just read access
- whether app needs `fhirUser`, OpenID Connect identity, or user profile claims

## 3. Scopes and permissions

Common scope families:

- `launch` and `launch/patient` for launch context
- `openid`, `profile`, `fhirUser` for identity
- `patient/*.read`, `patient/Observation.read`, etc. for patient-scoped access
- `user/*.read`, `user/Patient.read`, etc. for user-scoped access
- `system/*.read` for backend services
- `offline_access` for refresh token use when supported

Design scopes minimally. Avoid `*.write` unless the app really writes resources and the server policy permits it.

For US certification and US Core contexts, verify granular scope requirements and approved SMART versions using ONC/ASTP sources.

## 4. Discovery and capability metadata

FHIR servers should expose:

- `GET [base]/metadata` for `CapabilityStatement`
- `GET [base]/.well-known/smart-configuration` for SMART authorization metadata

Check:

- authorization endpoint
- token endpoint
- introspection endpoint, if used
- revocation endpoint, if used
- supported grant types
- supported scopes
- code challenge methods such as S256 for PKCE
- token endpoint authentication methods
- capabilities advertised by the server

## 5. Backend services

For backend services, define:

- client identity and registration process
- JWT signing key lifecycle and rotation
- token audience
- system scopes
- tenant or organization partition
- bulk data export authorization, if used
- audit and non-repudiation requirements
- job lifecycle for asynchronous operations such as `$export`

## 6. Security checklist

- Use Authorization Code flow with PKCE for public/native/browser apps.
- Register exact redirect URIs. Avoid wildcard redirect URIs.
- Validate `iss`, `aud`, `state`, `nonce`, and token expiration.
- Use TLS everywhere. Use mTLS, UDAP, or signed registration where the network/IG requires it.
- Do not put access tokens in logs, URLs, or browser storage that exposes them unnecessarily.
- Restrict scopes and resource access by user role, patient context, organization, consent, and purpose of use.
- Return `OperationOutcome` for authorization or validation failures where FHIR API behavior is expected.
- Generate `AuditEvent` and/or platform audit records for PHI access and writes.
- Treat SMART authorization as necessary but not sufficient; still enforce server-side business authorization.

## 7. SMART output template

Use this structure when asked to design or review a SMART app:

1. App type and launch mode
2. Actors and user journeys
3. FHIR server and IG assumptions
4. SMART discovery and endpoints
5. Authorization flow
6. Scopes and launch context
7. Resource/API access matrix
8. Token, refresh, logout, and revocation behavior
9. Security, consent, audit, and privacy controls
10. Test plan and edge cases
