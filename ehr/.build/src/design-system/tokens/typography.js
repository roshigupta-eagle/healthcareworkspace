"use strict";
/**
 * Layer 1 — Foundation: Typography Design Tokens
 *
 * Font scale, weights, line heights, letter-spacing, and typographic
 * role assignments for the HealthOS design system.
 *
 * All rem values assume a 16px root font size.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeRoles = exports.letterSpacings = exports.lineHeights = exports.fontWeights = exports.fontSizes = exports.fontFamilies = void 0;
exports.fontFamilies = {
    sans: '"Inter", "system-ui", "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
};
/** Modular type scale — base 16px, ratio ~1.25 */
exports.fontSizes = {
    '2xs': '0.625rem', // 10px — micro labels, legal fine print
    xs: '0.75rem', // 12px — caption, badge text, data density
    sm: '0.875rem', // 14px — body, form labels (primary UI size)
    base: '1rem', // 16px — body long-form
    lg: '1.125rem', // 18px — section intro, card titles
    xl: '1.25rem', // 20px — sub-headings
    '2xl': '1.5rem', // 24px — page section headings
    '3xl': '1.875rem', // 30px — page headings
    '4xl': '2.25rem', // 36px — display headings
    '5xl': '3rem', // 48px — hero / marketing only
};
exports.fontWeights = {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
};
exports.lineHeights = {
    none: '1', // single-line labels
    tight: '1.25', // headings
    snug: '1.375', // sub-headings
    normal: '1.5', // body copy
    relaxed: '1.625', // long-form reading
    loose: '2', // data tables with breathing room
};
exports.letterSpacings = {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em', // overline / label caps
};
/**
 * Semantic typographic role assignments.
 * Each role maps to a consistent set of font properties for use in
 * the Text primitive and headings across the design system.
 */
exports.typeRoles = {
    display: {
        fontSize: exports.fontSizes['4xl'],
        fontWeight: exports.fontWeights.bold,
        lineHeight: exports.lineHeights.tight,
        letterSpacing: exports.letterSpacings.tight,
    },
    heading1: {
        fontSize: exports.fontSizes['3xl'],
        fontWeight: exports.fontWeights.bold,
        lineHeight: exports.lineHeights.tight,
        letterSpacing: exports.letterSpacings.tight,
    },
    heading2: {
        fontSize: exports.fontSizes['2xl'],
        fontWeight: exports.fontWeights.semibold,
        lineHeight: exports.lineHeights.snug,
        letterSpacing: exports.letterSpacings.tight,
    },
    heading3: {
        fontSize: exports.fontSizes.xl,
        fontWeight: exports.fontWeights.semibold,
        lineHeight: exports.lineHeights.snug,
        letterSpacing: exports.letterSpacings.normal,
    },
    heading4: {
        fontSize: exports.fontSizes.lg,
        fontWeight: exports.fontWeights.semibold,
        lineHeight: exports.lineHeights.snug,
        letterSpacing: exports.letterSpacings.normal,
    },
    body: {
        fontSize: exports.fontSizes.sm,
        fontWeight: exports.fontWeights.normal,
        lineHeight: exports.lineHeights.normal,
        letterSpacing: exports.letterSpacings.normal,
    },
    bodySm: {
        fontSize: exports.fontSizes.xs,
        fontWeight: exports.fontWeights.normal,
        lineHeight: exports.lineHeights.normal,
        letterSpacing: exports.letterSpacings.normal,
    },
    label: {
        fontSize: exports.fontSizes.sm,
        fontWeight: exports.fontWeights.medium,
        lineHeight: exports.lineHeights.none,
        letterSpacing: exports.letterSpacings.normal,
    },
    caption: {
        fontSize: exports.fontSizes.xs,
        fontWeight: exports.fontWeights.normal,
        lineHeight: exports.lineHeights.normal,
        letterSpacing: exports.letterSpacings.normal,
    },
    overline: {
        fontSize: exports.fontSizes.xs,
        fontWeight: exports.fontWeights.semibold,
        lineHeight: exports.lineHeights.none,
        letterSpacing: exports.letterSpacings.widest,
        textTransform: 'uppercase',
    },
    code: {
        fontFamily: exports.fontFamilies.mono,
        fontSize: exports.fontSizes.sm,
        fontWeight: exports.fontWeights.normal,
        lineHeight: exports.lineHeights.relaxed,
        letterSpacing: exports.letterSpacings.normal,
    },
    /** Clinical data values — monospace for alignment in result tables */
    clinicalValue: {
        fontFamily: exports.fontFamilies.mono,
        fontSize: exports.fontSizes.sm,
        fontWeight: exports.fontWeights.medium,
        lineHeight: exports.lineHeights.none,
        letterSpacing: exports.letterSpacings.normal,
    },
};
