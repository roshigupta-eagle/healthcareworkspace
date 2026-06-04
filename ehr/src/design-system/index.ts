/**
 * Layer 7 — HealthOS Design System: Root Export
 *
 * Single import point for all design system layers.
 *
 * Usage in product code:
 *   import { Button, Badge, Card, PatientBanner, AppShell } from '@/design-system';
 *   import { colorPalette, semanticColors, typeRoles }       from '@/design-system/tokens';
 *
 * Prefer named imports over wildcard to optimise tree-shaking.
 */

// ── Layer 1: Foundation Tokens ─────────────────────────────────────────────
export * from './tokens';

// ── Layer 2: Atomic Primitives ─────────────────────────────────────────────
export * from './primitives';

// ── Layer 3: Composed Components ──────────────────────────────────────────
export * from './components';

// ── Layer 4: Clinical Patterns ─────────────────────────────────────────────
export * from './clinical';

// ── Layer 5: Layout System ─────────────────────────────────────────────────
export * from './layout';

// ── Layer 6: Interaction Hooks ─────────────────────────────────────────────
export * from './hooks';

// ── Layer 7: Guidelines ────────────────────────────────────────────────────
export * from './guidelines';

// ── Utilities ──────────────────────────────────────────────────────────────
export { cn } from './utils/cn';
