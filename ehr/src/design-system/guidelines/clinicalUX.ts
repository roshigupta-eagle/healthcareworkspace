/**
 * Layer 7 — Design Guidelines: Clinical UX Principles
 *
 * Codified design decisions for the HealthOS EHR interface.
 * These rules guide component authoring, design reviews, and
 * product decisions. They are not enforced at runtime — they are
 * the shared language between design, engineering, and clinical informatics.
 */

/**
 * The seven immutable principles of the HealthOS design system.
 * No component or pattern may violate these.
 */
export const corePrinciples = [
  {
    id: 1,
    name: 'Safety First',
    statement:
      'Clinical risk information (allergies, critical values, isolation precautions) ' +
      'must always be visible, never hidden behind interaction, and colour-coded ' +
      'with a redundant non-colour signal (icon, text, pattern).',
  },
  {
    id: 2,
    name: 'Minimal Cognitive Load',
    statement:
      'Clinical workflows happen under time pressure and interruption. Every screen ' +
      'shows only what is needed for the current task. Progressive disclosure is ' +
      'preferred over information density.',
  },
  {
    id: 3,
    name: 'Irreversibility Requires Confirmation',
    statement:
      'Actions that cannot be undone — discontinuing a medication, discharging a ' +
      'patient, overriding a critical alert — require explicit confirmation and ' +
      'a documented reason where required by policy.',
  },
  {
    id: 4,
    name: 'Consistent Clinical Language',
    statement:
      'UI copy uses the same clinical terminology as the underlying FHIR resources. ' +
      'Avoid lay terms where clinical precision is required. Abbreviations are only ' +
      'used when universally understood in the clinical context (e.g. BP, MRN, PRN).',
  },
  {
    id: 5,
    name: 'Accessibility is Non-Negotiable',
    statement:
      'WCAG 2.1 AA is the minimum bar for every component. Touch targets, contrast, ' +
      'keyboard navigation, and screen reader support are verified before release. ' +
      'Clinical environments include users with situational impairments (gloves, ' +
      'bright ambient light, cognitive load).',
  },
  {
    id: 6,
    name: 'Performance is Patient Safety',
    statement:
      'Slow UIs cost clinical time. Components optimise for fast first-paint, minimal ' +
      'layout shift, and snappy interactions. Server components are preferred over ' +
      'client-side data fetching where possible.',
  },
  {
    id: 7,
    name: 'Audit by Default',
    statement:
      'Every significant clinical action is traceable. Components that perform ' +
      'overrides, acknowledgements, or chart modifications surface enough context ' +
      'for downstream audit log recording.',
  },
] as const;

/**
 * Colour usage rules — which token to reach for in each clinical scenario.
 */
export const colorUsageRules = {
  critical: {
    when: 'Critical lab values, allergy contraindications, critical vital signs, STAT orders',
    foreground: 'text-critical-700',
    background: 'bg-critical-50',
    border: 'border-critical-400',
    badge: 'variant="critical"',
    never: 'Do not use for general errors or low-priority warnings',
  },
  warning: {
    when: 'Borderline lab values, pending acknowledgements, held medications, caution flags',
    foreground: 'text-warning-700',
    background: 'bg-warning-50',
    border: 'border-warning-400',
    badge: 'variant="warning"',
    never: 'Do not use for informational notes or completed items',
  },
  stable: {
    when: 'Normal lab values, active and confirmed orders, positive outcomes',
    foreground: 'text-stable-700',
    background: 'bg-stable-50',
    border: 'border-stable-400',
    badge: 'variant="stable"',
    never: 'Do not use for success toasts unrelated to clinical data',
  },
  info: {
    when: 'Read-only informational data, system messages, non-critical notifications',
    foreground: 'text-info-700',
    background: 'bg-info-50',
    border: 'border-info-400',
    badge: 'variant="info"',
    never: 'Do not use when action is required from the clinician',
  },
  primary: {
    when: 'Primary actions (save, submit, confirm), navigation active state, links',
    foreground: 'text-primary-600',
    background: 'bg-primary-50',
    border: 'border-primary-600',
    never: 'Do not use for clinical severity — primary is brand, not status',
  },
  neutral: {
    when: 'Inactive records, archived items, disabled states, section dividers, metadata',
    foreground: 'text-neutral-500',
    background: 'bg-neutral-100',
    border: 'border-neutral-200',
    never: 'Do not use for items requiring clinician attention',
  },
} as const;

/**
 * Typography decision tree — which Text variant to use.
 */
export const typographyRules = {
  pageTitle:     { variant: 'heading1', element: 'h1', notes: 'One per page' },
  sectionTitle:  { variant: 'heading2', element: 'h2', notes: 'Card headers, modal titles' },
  groupLabel:    { variant: 'heading3', element: 'h3', notes: 'Within-section groupings' },
  fieldLabel:    { variant: 'label',    element: 'label', notes: 'All form fields — required' },
  bodyText:      { variant: 'body',     element: 'p',  notes: 'Descriptions, notes, instructions' },
  secondaryText: { variant: 'body-sm',  element: 'p',  notes: 'Metadata, timestamps, hints' },
  tableHeader:   { variant: 'overline', element: 'th', notes: 'Column headers — uppercase only in tables' },
  clinicalValue: { variant: 'clinicalValue', element: 'span', notes: 'Vitals, labs, dosages — always monospace tabular-nums' },
  caption:       { variant: 'caption', element: 'span', notes: 'Image captions, legal text, footnotes' },
} as const;

/**
 * Spacing rules — when to use which spacing step.
 */
export const spacingRules = [
  { step: '1 (4px)',   uses: 'Icon internal gaps, tight list item padding' },
  { step: '2 (8px)',   uses: 'Badge padding, button icon gap, chip gap' },
  { step: '3 (12px)',  uses: 'Input horizontal padding (sm), compact form rows' },
  { step: '4 (16px)',  uses: 'Input horizontal padding (md/lg), card padding (sm), list item vertical padding' },
  { step: '5 (20px)',  uses: 'Section header padding, table cell padding' },
  { step: '6 (24px)',  uses: 'Card body padding (default), modal body padding' },
  { step: '8 (32px)',  uses: 'Between form sections, between cards in a grid' },
  { step: '12 (48px)', uses: 'Page top/bottom padding, major section separation' },
] as const;

/**
 * Component selection guide — when to use which Layer 3/4 component.
 */
export const componentSelectionGuide = {
  feedbackMessages: {
    'Alert (Layer 3)': 'Inline page feedback — form errors, save confirmation, loading errors. Not dismissible by default for errors.',
    'ClinicalAlert (Layer 4)': 'CDS alerts requiring clinician action — drug interactions, allergy flags, duplicate therapy.',
    'useAnnouncer (Layer 6)': 'Screen-reader-only announcements for non-visual state changes.',
  },
  containers: {
    'Card (Layer 3)': 'Any grouping of related content — vitals section, medication card, lab panel.',
    'Modal (Layer 3)': 'Confirmations, forms, details views that do not require navigation.',
    'Tabs (Layer 3)': 'Patient chart section navigation (Overview / Medications / Labs).',
  },
  clinical: {
    'PatientBanner (Layer 4)': 'Required on all patient chart views. Never omit.',
    'VitalSignCard (Layer 4)': 'Individual vital sign display in vitals dashboard.',
    'MedicationRow (Layer 4)': 'Active medication list, MAR, order list.',
    'LabResultRow (Layer 4)': 'Lab results panel, result history list.',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Confirmation Pattern Rules
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rules governing when and how to apply the two-step useConfirmation pattern.
 */
export const confirmationRules = {
  requiredFor: [
    'Discontinue medication order',
    'Delete or retract a clinical note',
    'Discharge or transfer a patient',
    'Administer a high-alert medication (requires double-check)',
    'Override a critical (HH/LL) ClinicalAlert',
    'Remove a patient allergy record',
    'Cancel a pending lab or imaging order',
  ],
  notRequiredFor: [
    'Navigating away (unless unsaved changes are present)',
    'Read-only / view actions',
    'Acknowledging an informational alert',
    'Collapsing or expanding panels',
  ],
  pattern: {
    hook:           'useConfirmation — always use the hook; never build ad-hoc confirm patterns',
    timeout:        '10 seconds — auto-cancel if not confirmed within the window',
    buttonVariant:  'destructive for the confirm action; ghost for cancel',
    requireReason:  'Mandatory for critical ClinicalAlert overrides; optional for lower-risk confirms',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Error Recovery Guidelines
// ─────────────────────────────────────────────────────────────────────────────

export const errorRecoveryRules = {
  formErrors: {
    display:      'Inline below the specific field via FormField error prop',
    announcement: 'role="alert" on the error paragraph — auto-announced by screen readers',
    recovery:     'Error clears as soon as the field value becomes valid, not just on blur',
    summary:      'For multi-field forms, show a summary Alert at the top linking to each error',
  },
  networkErrors: {
    display:  'Alert with severity="critical" at the top of the affected content area',
    retry:    'Always provide a Retry action button — never a dead-end error state',
    preserve: 'Never clear user-entered form data on a network error',
  },
  asyncSearchErrors: {
    display:  'Empty state with error message — never a spinner hanging indefinitely',
    timeout:  'Maximum 15 seconds before auto-error for any clinical data fetch',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Safe Defaults for Clinical Modals
// ─────────────────────────────────────────────────────────────────────────────

export const safeDefaultRules = {
  medication: {
    defaultRoute:    'PO (oral) — never IV unless explicitly selected',
    defaultFrequency:'Once daily — never PRN as default',
    defaultDose:     'No pre-populated dose — clinician must enter explicitly',
  },
  orders: {
    priority:        'Routine — STAT must be actively selected',
    orderSet:        'No defaults pre-selected in order sets — each requires active choice',
  },
  alerts: {
    persistent:       'Critical and high-severity ClinicalAlerts are persistent = true by default',
    overrideRequired: 'requireOverrideReason defaults to true for critical and high severity',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Progress Indication Rules
// ─────────────────────────────────────────────────────────────────────────────

export const progressIndicationRules = {
  immediateLoading: {
    threshold:  '100ms — Spinner visible within 100ms of any async operation',
    component:  'Spinner (Layer 2) — inline with the content being loaded',
  },
  skeletonLoading: {
    threshold:  '300ms — Skeleton appears for operations expected to take > 300ms',
    pattern:    'Skeleton shapes mirror the content layout to prevent layout shift',
  },
  multiStep: {
    indicator:  'Step indicator above modal content for workflows with > 2 steps',
    pattern:    'Show: "Step X of Y — [Step Name]" in PageHeader or modal header',
    back:       'Always allow going back to previous step unless data was already saved',
  },
} as const;
