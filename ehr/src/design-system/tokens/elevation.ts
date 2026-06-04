/**
 * Layer 1 — Foundation: Elevation Design Tokens
 *
 * Five-step elevation scale modelling physical depth. Higher elevation
 * levels convey modal, overlay, and floating panel hierarchy.
 *
 * Clinical rule: avoid excessive shadow depth in dense data views —
 * prefer subtle xs/sm shadows to keep the interface readable.
 */

export const shadows = {
  none:  'none',
  xs:    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm:    '0 1px 3px 0 rgb(0 0 0 / 0.10), 0 1px 2px -1px rgb(0 0 0 / 0.10)',
  md:    '0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10)',
  lg:    '0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.10)',
  xl:    '0 20px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.10)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

/** Focus rings — must meet WCAG 2.1 AA 3:1 non-text contrast */
export const focusRings = {
  primary:  '0 0 0 3px rgb(37 99 235 / 0.40)',   // --color-primary-600
  critical: '0 0 0 3px rgb(220 38 38 / 0.40)',   // --color-critical-600
  warning:  '0 0 0 3px rgb(217 119 6 / 0.40)',   // --color-warning-600
  stable:   '0 0 0 3px rgb(5 150 105 / 0.40)',   // --color-stable-600
  neutral:  '0 0 0 3px rgb(100 116 139 / 0.40)', // --color-neutral-500
} as const;

/**
 * Semantic elevation roles
 *
 * Maps component type → shadow token.
 * Keeps elevation consistent without per-component shadow decisions.
 */
export const elevationRoles = {
  card:        shadows.xs,
  cardHover:   shadows.sm,
  dropdown:    shadows.lg,
  tooltip:     shadows.md,
  modal:       shadows.xl,
  notification: shadows['2xl'],
  inputInset:  shadows.inner,
} as const;

/** z-index layer stack */
export const zIndex = {
  base:         0,
  raised:       10,
  dropdown:     100,
  sticky:       200,
  overlay:      300,
  modal:        400,
  notification: 500,
  tooltip:      600,
} as const;

export type ShadowKey      = keyof typeof shadows;
export type FocusRingKey   = keyof typeof focusRings;
export type ZIndexKey      = keyof typeof zIndex;
