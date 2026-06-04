# S-002 — Authenticated user can sign in via SMART on FHIR v2 with PKCE

**Epic:** E-001 — User Authentication & Onboarding
**Priority:** High
**Status:** not-started
**Assigned:** Amelia
**FHIR Resources:** Patient (read)
**Last Updated:** 2026-05-03

---

## User Story

As a **registered user**,
I want to **sign in to HealthTriage securely on my mobile device**,
so that **I can access my triage history and save new triage results**.

## Context

Follows SMART on FHIR v2 standalone app launch pattern with PKCE (ADR-006).
No client_secret is stored in the app binary. Token expiry is 1 hour; refresh tokens supported.

## Acceptance Criteria

### AC-001 — Sign-in navigates to Keycloak authorization page

**Given** the user taps "Sign In" on the app home screen
**When** the app initiates the SMART on FHIR authorization flow
**Then** the device browser opens the Keycloak authorization URL with a valid PKCE code_challenge

**Status:** pending

---

### AC-002 — Successful login returns scoped access token

**Given** the user authenticates successfully with Keycloak
**When** Keycloak redirects back to the app with an authorization code
**Then** the app exchanges the code + code_verifier for an access token scoped to `patient/*.read patient/*.write openid fhirUser`

**Status:** pending

---

### AC-003 — Expired token triggers silent refresh

**Given** the user has been logged in for 1 hour and their access token has expired
**When** they perform any action that requires a FHIR call
**Then** the app silently refreshes the access token using the refresh token without prompting the user to log in again

**Status:** pending

---

### AC-004 — Invalid credentials shows error without token leakage

**Given** the user enters incorrect credentials
**When** authentication fails
**Then** the app displays "Sign in failed. Please check your email and password." and no token is stored

**Status:** pending

---

## Technical Notes

- PKCE: `code_challenge_method = S256`; code_verifier generated per-login in secure memory
- React Native: use `expo-auth-session` or `react-native-app-auth` for PKCE flow
- Token storage: SecureStore (Expo) or Keychain (iOS) / Keystore (Android) — never AsyncStorage
- FHIR `fhirUser` claim links Keycloak user to FHIR Patient resource ID

## Definition of Done

- [ ] All AC items pass in automated tests
- [ ] No client_secret in app bundle (verified by static analysis)
- [ ] Token stored in Keychain/Keystore only
- [ ] Code reviewed
