"use strict";
/**
 * Layer 1 — Foundation: Spacing Design Tokens
 *
 * 4-point base grid. All spacing values are multiples of 4px.
 * This enforces visual rhythm and alignment consistency across
 * the entire clinical interface.
 *
 * Use via Tailwind utilities (p-4, gap-6, m-2, etc.) in components.
 * These constants are provided for algorithmic spacing in dynamic
 * layouts, charts, and custom CSS.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentWidths = exports.touchTargetMin = exports.spacingRoles = exports.spacing = void 0;
/** Core 4px grid — key values only (not exhaustive) */
exports.spacing = {
    0: '0px',
    px: '1px',
    0.5: '2px',
    1: '4px',
    1.5: '6px',
    2: '8px',
    2.5: '10px',
    3: '12px',
    3.5: '14px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    9: '36px',
    10: '40px',
    11: '44px',
    12: '48px',
    14: '56px',
    16: '64px',
    20: '80px',
    24: '96px',
    28: '112px',
    32: '128px',
    36: '144px',
    40: '160px',
    48: '192px',
    56: '224px',
    64: '256px',
};
/**
 * Semantic spacing roles — preferred names for consistent layout intent.
 * Maps semantic intent → Tailwind spacing class suffix.
 */
exports.spacingRoles = {
    /** Inline icon gap, tight list item gap */
    componentTight: '1', // 4px
    /** Button icon padding, badge internal gap */
    componentNormal: '2', // 8px
    /** Standard inset for compact inputs */
    inputPaddingX: '3', // 12px
    /** Standard inset for default inputs */
    inputPaddingXLg: '4', // 16px
    /** Card internal padding (compact) */
    cardPaddingSm: '4', // 16px
    /** Card internal padding (default) */
    cardPadding: '6', // 24px
    /** Section/panel separation */
    sectionGap: '8', // 32px
    /** Page-level section separation */
    pageGap: '12', // 48px
    /** Sidebar width base */
    sidebarWidth: '64', // 256px — customise per breakpoint
    /** Top navigation height */
    navHeight: '14', // 56px
    /** Modal max-width step */
    modalMaxWidthSm: '384px',
    modalMaxWidthMd: '512px',
    modalMaxWidthLg: '640px',
    modalMaxWidthXl: '768px',
};
/** Touch target minimum (WCAG 2.5.5 Target Size — 44×44px) */
exports.touchTargetMin = '44px';
/** Content max-widths for readable line lengths */
exports.contentWidths = {
    prose: '65ch', // ~65 characters — optimal reading width
    formSm: '384px', // narrow forms
    form: '512px', // standard form
    pageSm: '768px', // compact page
    page: '1024px', // standard page
    pageLg: '1280px', // wide dashboard
    full: '100%',
};
