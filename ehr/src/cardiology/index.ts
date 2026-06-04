/**
 * Cardiology Practice Components & Services — Root Barrel
 *
 * Single import point for all cardiology domain code.
 *
 * Usage:
 *   import { CardiovascularDashboard, QueueManager } from '@/cardiology';
 *   import { CardiovascularVisit, VisitPriority } from '@/cardiology/types';
 *   import { fetchDashboard, claimQueueItem } from '@/cardiology/services';
 */

// ── Components ──────────────────────────────────────────────────────────────
export { CardiovascularDashboard } from './components/CardiovascularDashboard';
export { VisitDetail } from './components/VisitDetail';
export { QueueManager } from './components/QueueManager';

// ── Types ───────────────────────────────────────────────────────────────────
export * from './types/fhir-domain';

// ── Services (api.ts selects mock or client automatically) ─────────────────
export * from './services/api';
