/**
 * Layer 1 — Foundation: Typography Design Tokens
 *
 * Font scale, weights, line heights, letter-spacing, and typographic
 * role assignments for the HealthOS design system.
 *
 * All rem values assume a 16px root font size.
 */

export const fontFamilies = {
  sans: '"Inter", "system-ui", "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
} as const;

/** Modular type scale — base 16px, ratio ~1.25 */
export const fontSizes = {
  '2xs': '0.625rem',  // 10px — micro labels, legal fine print
  xs:   '0.75rem',   // 12px — caption, badge text, data density
  sm:   '0.875rem',  // 14px — body, form labels (primary UI size)
  base: '1rem',      // 16px — body long-form
  lg:   '1.125rem',  // 18px — section intro, card titles
  xl:   '1.25rem',   // 20px — sub-headings
  '2xl': '1.5rem',   // 24px — page section headings
  '3xl': '1.875rem', // 30px — page headings
  '4xl': '2.25rem',  // 36px — display headings
  '5xl': '3rem',     // 48px — hero / marketing only
} as const;

export const fontWeights = {
  normal:   '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
} as const;

export const lineHeights = {
  none:     '1',      // single-line labels
  tight:    '1.25',   // headings
  snug:     '1.375',  // sub-headings
  normal:   '1.5',    // body copy
  relaxed:  '1.625',  // long-form reading
  loose:    '2',      // data tables with breathing room
} as const;

export const letterSpacings = {
  tighter: '-0.05em',
  tight:   '-0.025em',
  normal:  '0em',
  wide:    '0.025em',
  wider:   '0.05em',
  widest:  '0.1em',   // overline / label caps
} as const;

/**
 * Semantic typographic role assignments.
 * Each role maps to a consistent set of font properties for use in
 * the Text primitive and headings across the design system.
 */
export const typeRoles = {
  display: {
    fontSize:      fontSizes['4xl'],
    fontWeight:    fontWeights.bold,
    lineHeight:    lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  heading1: {
    fontSize:      fontSizes['3xl'],
    fontWeight:    fontWeights.bold,
    lineHeight:    lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  heading2: {
    fontSize:      fontSizes['2xl'],
    fontWeight:    fontWeights.semibold,
    lineHeight:    lineHeights.snug,
    letterSpacing: letterSpacings.tight,
  },
  heading3: {
    fontSize:      fontSizes.xl,
    fontWeight:    fontWeights.semibold,
    lineHeight:    lineHeights.snug,
    letterSpacing: letterSpacings.normal,
  },
  heading4: {
    fontSize:      fontSizes.lg,
    fontWeight:    fontWeights.semibold,
    lineHeight:    lineHeights.snug,
    letterSpacing: letterSpacings.normal,
  },
  body: {
    fontSize:      fontSizes.sm,
    fontWeight:    fontWeights.normal,
    lineHeight:    lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },
  bodySm: {
    fontSize:      fontSizes.xs,
    fontWeight:    fontWeights.normal,
    lineHeight:    lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },
  label: {
    fontSize:      fontSizes.sm,
    fontWeight:    fontWeights.medium,
    lineHeight:    lineHeights.none,
    letterSpacing: letterSpacings.normal,
  },
  caption: {
    fontSize:      fontSizes.xs,
    fontWeight:    fontWeights.normal,
    lineHeight:    lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },
  overline: {
    fontSize:      fontSizes.xs,
    fontWeight:    fontWeights.semibold,
    lineHeight:    lineHeights.none,
    letterSpacing: letterSpacings.widest,
    textTransform: 'uppercase' as const,
  },
  code: {
    fontFamily:    fontFamilies.mono,
    fontSize:      fontSizes.sm,
    fontWeight:    fontWeights.normal,
    lineHeight:    lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
  },
  /** Clinical data values — monospace for alignment in result tables */
  clinicalValue: {
    fontFamily:    fontFamilies.mono,
    fontSize:      fontSizes.sm,
    fontWeight:    fontWeights.medium,
    lineHeight:    lineHeights.none,
    letterSpacing: letterSpacings.normal,
  },
} as const;

export type FontSize     = keyof typeof fontSizes;
export type FontWeight   = keyof typeof fontWeights;
export type TypeRole     = keyof typeof typeRoles;
