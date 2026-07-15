# ADR-004: Drug Utilization Review (DUR) as In-Process Engine

**Date:** 2025-07-15
**Status:** Accepted
**Context:** Canadian pharmacies are legally required to perform DUR before dispensing (Drug Interchangeability and Dispensing Fee Act). External DUR APIs (e.g., First Databank Canada) have latency and cost implications.

## Decision
Embed a DUR engine (`pharmacyms/internal/handler/dur.go`) with a curated interaction database covering the highest-risk interactions (Warfarin/NSAID, SSRI/Tramadol, MAOI/SSRI, etc.), allergy class mapping, and duplicate therapy detection.

## Rationale
- Eliminates external API dependency in dev/staging
- Sub-millisecond latency for hard-stop alerts
- Severity tiers (hard-stop/soft-stop/informational) match Health Canada DUR guidelines

## Consequences
- **Positive:** Always available; no external API cost; auditable code
- **Negative:** Must be manually updated as new interactions are identified
- **Upgrade Path:** Replace internal table with First Databank Canada API call in production via feature flag (`DUR_EXTERNAL_API_URL` env var)

## Canadian Standards
- NAPRA (National Association of Pharmacy Regulatory Authorities) DUR Standards 2020
- Ontario College of Pharmacists — Professional Practice Standards for DUR