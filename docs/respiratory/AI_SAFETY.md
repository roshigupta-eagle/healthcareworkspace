# Respiratory AI Safety

## Allowed assistance
Summarize documented respiratory events, source-linked reports, existing tasks, incomplete follow-up, medication history, device history, and data-quality inconsistencies.

## Prohibited behavior
AI must not invent SpO2, respiratory rate, PFT values, imaging findings, lesions, diagnoses, severity, prescriptions, oxygen changes, ventilator settings, or guideline eligibility. It must not acknowledge critical results or place orders.

## UI requirements
Every generated statement must be labelled `AI-generated`, require clinician review, and expose source references. Missing source data must be stated explicitly. No patient PHI is sent to an unapproved third-party service.
