"use strict";
/**
 * Layer 1 — Foundation: Color Design Tokens
 *
 * TypeScript mirror of the CSS @theme color variables defined in globals.css.
 * Use these constants wherever Tailwind classes are insufficient —
 * e.g., SVG fills, canvas renderers, Recharts / Victory chart palettes,
 * inline style overrides, and test assertions.
 *
 * Naming follows the semantic intent used in the clinical context:
 *  - primary   : main actions, branding, links
 *  - neutral   : backgrounds, text, borders
 *  - critical  : emergencies, critical lab values, allergy flags
 *  - warning   : caution, borderline results, pending orders
 *  - stable    : normal values, confirmed stable status
 *  - info      : informational notices, read-only context
 *  - accent    : secondary brand highlights
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.semanticColors = exports.colorPalette = void 0;
exports.colorPalette = {
    primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb', // primary action default
        700: '#1d4ed8', // primary action hover
        800: '#1e40af', // primary action active
        900: '#1e3a8a',
        950: '#172554',
    },
    neutral: {
        50: '#f8fafc', // page background
        100: '#f1f5f9', // subtle section background
        200: '#e2e8f0', // border default
        300: '#cbd5e1', // border strong
        400: '#94a3b8', // placeholder, icon on light
        500: '#64748b', // secondary text
        600: '#475569',
        700: '#334155', // body text
        800: '#1e293b',
        900: '#0f172a', // heading text
        950: '#020617',
    },
    critical: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626', // critical default
        700: '#b91c1c', // critical hover
        800: '#991b1b',
        900: '#7f1d1d',
        950: '#450a0a',
    },
    warning: {
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#f59e0b',
        600: '#d97706', // warning default
        700: '#b45309', // warning hover
        800: '#92400e',
        900: '#78350f',
        950: '#451a03',
    },
    stable: {
        50: '#ecfdf5',
        100: '#d1fae5',
        200: '#a7f3d0',
        300: '#6ee7b7',
        400: '#34d399',
        500: '#10b981',
        600: '#059669', // stable default
        700: '#047857', // stable hover
        800: '#065f46',
        900: '#064e3b',
        950: '#022c22',
    },
    info: {
        50: '#f0fdfa',
        100: '#ccfbf1',
        200: '#99f6e4',
        300: '#5eead4',
        400: '#2dd4bf',
        500: '#14b8a6',
        600: '#0d9488', // info default
        700: '#0f766e', // info hover
        800: '#115e59',
        900: '#134e4a',
        950: '#042f2e',
    },
    accent: {
        50: '#ecfeff',
        100: '#cffafe',
        200: '#a5f3fc',
        300: '#67e8f9',
        400: '#22d3ee',
        500: '#06b6d4',
        600: '#0891b2', // accent default
        700: '#0e7490', // accent hover
        800: '#155e75',
        900: '#164e63',
        950: '#083344',
    },
};
/** Semantic aliases — preferred for product code over raw palette values. */
exports.semanticColors = {
    action: {
        primary: exports.colorPalette.primary[600],
        primaryHover: exports.colorPalette.primary[700],
        primaryMuted: exports.colorPalette.primary[100],
        danger: exports.colorPalette.critical[600],
        dangerHover: exports.colorPalette.critical[700],
    },
    status: {
        critical: exports.colorPalette.critical[600],
        warning: exports.colorPalette.warning[600],
        stable: exports.colorPalette.stable[600],
        info: exports.colorPalette.info[600],
        inactive: exports.colorPalette.neutral[400],
    },
    text: {
        primary: exports.colorPalette.neutral[900],
        secondary: exports.colorPalette.neutral[700],
        muted: exports.colorPalette.neutral[500],
        disabled: exports.colorPalette.neutral[400],
        inverse: '#ffffff',
        link: exports.colorPalette.primary[600],
        critical: exports.colorPalette.critical[700],
        warning: exports.colorPalette.warning[700],
        stable: exports.colorPalette.stable[700],
        info: exports.colorPalette.info[700],
    },
    background: {
        page: exports.colorPalette.neutral[50],
        surface: '#ffffff',
        subtle: exports.colorPalette.neutral[100],
        inverted: exports.colorPalette.neutral[900],
        criticalMuted: exports.colorPalette.critical[50],
        warningMuted: exports.colorPalette.warning[50],
        stableMuted: exports.colorPalette.stable[50],
        infoMuted: exports.colorPalette.info[50],
    },
    border: {
        default: exports.colorPalette.neutral[200],
        subtle: exports.colorPalette.neutral[100],
        strong: exports.colorPalette.neutral[300],
        focus: exports.colorPalette.primary[600],
        critical: exports.colorPalette.critical[400],
        warning: exports.colorPalette.warning[400],
        stable: exports.colorPalette.stable[400],
    },
};
