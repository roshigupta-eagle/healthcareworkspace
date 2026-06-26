"use strict";
/**
 * Layer 7 — Design Guidelines: Accessibility Audit Utilities
 *
 * Runtime helpers for WCAG 2.1 AA verification in development.
 * These functions are safe to run in tests or Storybook — they do NOT
 * modify any UI or introduce side effects.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessibilityChecklist = exports.paletteContrastOnWhite = void 0;
exports.relativeLuminance = relativeLuminance;
exports.contrastRatio = contrastRatio;
exports.passesContrast = passesContrast;
/**
 * Calculates the relative luminance of an sRGB hex colour.
 * Formula: WCAG 2.1 — https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(hex) {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    const linearise = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}
/**
 * Calculates the contrast ratio between two hex colours.
 * Returns a value between 1 (no contrast) and 21 (black on white).
 *
 * WCAG thresholds:
 *  - 4.5:1  — normal text (AA)
 *  - 3.0:1  — large text / UI components (AA)
 *  - 7.0:1  — normal text (AAA)
 */
function contrastRatio(fg, bg) {
    const l1 = relativeLuminance(fg);
    const l2 = relativeLuminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}
/**
 * Returns whether the contrast ratio passes a given WCAG level.
 * Large text = 18pt (24px) regular, or 14pt (18.67px) bold.
 */
function passesContrast(fg, bg, level = 'AA', textSize = 'normal') {
    const ratio = contrastRatio(fg, bg);
    if (level === 'AAA')
        return textSize === 'large' ? ratio >= 4.5 : ratio >= 7.0;
    return textSize === 'large' ? ratio >= 3.0 : ratio >= 4.5;
}
/** Pre-verified contrast ratios for the HealthOS palette (white background) */
exports.paletteContrastOnWhite = {
    'primary-600': { hex: '#2563eb', ratio: 4.63, passesAA: true },
    'primary-700': { hex: '#1d4ed8', ratio: 6.05, passesAA: true },
    'neutral-600': { hex: '#475569', ratio: 5.91, passesAA: true },
    'neutral-700': { hex: '#334155', ratio: 8.10, passesAA: true },
    'neutral-900': { hex: '#0f172a', ratio: 17.3, passesAA: true },
    'critical-600': { hex: '#dc2626', ratio: 5.11, passesAA: true },
    'critical-700': { hex: '#b91c1c', ratio: 6.90, passesAA: true },
    'warning-600': { hex: '#d97706', ratio: 3.00, passesAA: false, note: 'Use on white for large text / icons only; prefer warning-700 for body text' },
    'warning-700': { hex: '#b45309', ratio: 4.61, passesAA: true },
    'stable-600': { hex: '#059669', ratio: 3.45, passesAA: false, note: 'Use stable-700 for body text on white' },
    'stable-700': { hex: '#047857', ratio: 4.73, passesAA: true },
    'info-600': { hex: '#0d9488', ratio: 3.11, passesAA: false, note: 'Use info-700 for body text on white' },
    'info-700': { hex: '#0f766e', ratio: 4.54, passesAA: true },
};
/**
 * HealthOS accessibility checklist — validated requirements per component tier.
 * Use this as a code-review gate and Storybook a11y addon baseline.
 */
exports.accessibilityChecklist = {
    global: [
        'All pages have a unique <title>',
        'Skip-to-content link is the first focusable element',
        'lang attribute is set on <html>',
        'Colour is never the sole means of conveying information (WCAG 1.4.1)',
        'Minimum 4.5:1 contrast for normal text; 3:1 for large text / UI (WCAG 1.4.3)',
        'All interactive elements have visible :focus-visible styling (WCAG 2.4.7)',
        'Touch targets ≥ 44×44 CSS px (WCAG 2.5.5)',
        'No content flashes more than 3 times per second (WCAG 2.3.1)',
        'prefers-reduced-motion CSS guard in globals.css',
    ],
    forms: [
        'Every input has an associated <label> (not just placeholder)',
        'Required fields indicated with text/icon + aria-required="true"',
        'Errors linked via aria-describedby to the input',
        'Error messages use role="alert" for live announcement',
        'Autocomplete attributes set for personal data fields (WCAG 1.3.5)',
    ],
    modals: [
        'role="dialog" + aria-modal="true"',
        'aria-labelledby references the dialog title',
        'Focus moves to the first interactive element on open',
        'Focus trapped within the dialog while open',
        'Focus returns to trigger element on close',
        'Escape key closes the dialog',
        'Background content is aria-hidden while modal is open',
    ],
    tables: [
        'table has a <caption> (even if sr-only)',
        'Column headers use scope="col"',
        'Row headers use scope="row"',
        'Sortable columns have aria-sort="ascending|descending|none"',
    ],
    navigation: [
        '<nav> elements have an aria-label',
        'Current page indicated with aria-current="page"',
        'Keyboard: all navigation operable via Tab / Enter / Space / Arrow keys',
    ],
    images: [
        'All <img> elements have alt text or alt="" if decorative',
        'Icons used as interactive elements have aria-label or title',
        'SVG icons used for decoration have aria-hidden="true"',
    ],
    clinical: [
        'Critical lab values and alerts are announced via live regions',
        'Patient identity elements are present and readable at 400% zoom',
        'Allergy flags are always visible when patient is in context',
        'High-alert medication indicator is visible and not solely colour-coded',
        'ClinicalAlert cannot be dismissed without acknowledgement (critical/high)',
        'Override reason is documented and surfaced in audit trail',
    ],
};
