# Health Trends — Low Level Design

## Component Tree
- HealthTrendsPage (route)
  - Breadcrumbs
  - PatientBanner (compact)
  - Header (title, subtitle, actions)
  - TrendOverviewStrip
  - MetricCategorySelector
  - TimeRangeControl
  - MainTrendChart (switches specialization based on metric family)
    - BloodPressureChart (systolic + diastolic)
    - LaboratoryTrendChart (LDL, HDL, etc.)
    - WeightTrendChart
  - SelectedDataPointPanel (sticky)
  - MetricSummaryGrid
  - MeasurementTable (virtualized)
  - RelatedClinicalData
  - DataQualityPanel
  - FHIRInspector (lazy)
  - ExportDialog

## Route Behavior
- Path: /dashboard/records/:patientId/trends
- Query params: metric, range, start, end, point
- Page loads server-side patient context, then hydrates client app

## TypeScript Models
- ClinicalMetricDefinition
- ClinicalTrendPoint
- BloodPressureTrendPoint (systolic, diastolic components)
- TrendSeries
- TrendDateRange
- TrendPermissionSet

## Metric Configuration
- Registry maps metricId to unit, category, loinc, preferCombine (eg. sbp+dbp)

## Chart Configuration
- Height: 420px (desktop), 340px (tablet), 280px (mobile)
- Axis padding and ticks; y-axis labeled with unit
- Tooltip format for timestamp, source, performer, encounter link
- No shared scale for unrelated metrics

## Data Adapters
- trendService: queryObservations(patientId, metricIds, range)
- adapter normalizes Observations -> TrendObservationPoint

## FHIR Mapping
- Use mapTrendsToFHIR to create Observation resources per point
- Track derived Bundle with Patient entry

## Query Hooks
- useTrendData(patientId, metric, range)
- useTrendDataPoint(patientId, observationId)
- useTrendPermissions(patientId)

## Selected-Point Behavior
- Keyboard and pointer navigation
- Updates URL and focus management

## Export & Print
- Export service endpoints: /api/patients/:patientId/trends/export
- Audit call for export: /api/patients/:patientId/trends/audit

## Accessibility
- ARIA roles, visible focus rings, keyboard operations
- Text summary block with latest value and interpretation

## Error & Loading Handling
- Individual skeletons per component
- Graceful error messages with retry actions

## Tests
- Unit tests for metric grouping, unit handling, trend calc
- Component tests for selector, chart, tooltip
- Integration tests for URL state and selection sync
- Playwright for end-to-end flows
