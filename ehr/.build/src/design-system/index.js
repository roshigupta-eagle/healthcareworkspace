"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = void 0;
// ── Layer 1: Foundation Tokens ─────────────────────────────────────────────
__exportStar(require("./tokens"), exports);
// ── Layer 2: Atomic Primitives ─────────────────────────────────────────────
__exportStar(require("./primitives"), exports);
// ── Layer 3: Composed Components ──────────────────────────────────────────
__exportStar(require("./components"), exports);
// ── Layer 4: Clinical Patterns ─────────────────────────────────────────────
__exportStar(require("./clinical"), exports);
// ── Layer 5: Layout System ─────────────────────────────────────────────────
__exportStar(require("./layout"), exports);
// ── Layer 6: Interaction Hooks ─────────────────────────────────────────────
__exportStar(require("./hooks"), exports);
// ── Layer 7: Guidelines ────────────────────────────────────────────────────
__exportStar(require("./guidelines"), exports);
// ── Utilities ──────────────────────────────────────────────────────────────
var cn_1 = require("./utils/cn");
Object.defineProperty(exports, "cn", { enumerable: true, get: function () { return cn_1.cn; } });
