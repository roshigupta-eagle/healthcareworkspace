"use strict";
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
exports.QueueManager = exports.VisitDetail = exports.CardiovascularDashboard = void 0;
// ── Components ──────────────────────────────────────────────────────────────
var CardiovascularDashboard_1 = require("./components/CardiovascularDashboard");
Object.defineProperty(exports, "CardiovascularDashboard", { enumerable: true, get: function () { return CardiovascularDashboard_1.CardiovascularDashboard; } });
var VisitDetail_1 = require("./components/VisitDetail");
Object.defineProperty(exports, "VisitDetail", { enumerable: true, get: function () { return VisitDetail_1.VisitDetail; } });
var QueueManager_1 = require("./components/QueueManager");
Object.defineProperty(exports, "QueueManager", { enumerable: true, get: function () { return QueueManager_1.QueueManager; } });
// ── Types ───────────────────────────────────────────────────────────────────
__exportStar(require("./types/fhir-domain"), exports);
// ── Services (api.ts selects mock or client automatically) ─────────────────
__exportStar(require("./services/api"), exports);
