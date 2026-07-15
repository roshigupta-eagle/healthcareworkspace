# ADR-003: Multi-Service Architecture with Go Microservices and Next.js BFF

**Date:** 2025-07-15
**Status:** Accepted
**Context:** The platform must support concurrent development across clinical domains (lab, pharmacy, scheduling, patient portal) with different scaling characteristics.

## Decision
- **FHIR Server** (Go, port 8080): Canonical FHIR R4 store, PostgreSQL + JSONB
- **LIMS** (Go, port 8083): Lab order/result management, pCLOCD terminology
- **PharmacyMS** (Go, port 8084): Prescription/dispense/DUR, Health Canada DIN
- **EHR** (Next.js, port 3000): BFF + UI, aggregates all services, PHIPA audit layer

## Rationale
- Each service owns its domain data model and can be deployed independently
- Go services are lightweight and fast for API-heavy workloads
- Next.js BFF provides server-side auth, audit, and FHIR client caching

## Consequences
- **Positive:** Independent scaling; clear domain boundaries; Ontario provincial system integration per-service
- **Negative:** Increased operational complexity; cross-service calls require resilience
- **Mitigation:** Service health endpoints on all services; EHR falls back to mock data on FHIR server failure

## Service Ports
| Service    | Port | Protocol |
|------------|------|----------|
| EHR        | 3000 | HTTP/HTTPS |
| FHIR Server | 8080 | FHIR REST |
| LIMS       | 8083 | REST |
| PharmacyMS | 8084 | REST |