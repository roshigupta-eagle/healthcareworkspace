"use strict";
/**
 * Layer 1 — Foundation: Token Barrel Export
 *
 * Re-exports all design token modules. Import from here in product code:
 *   import { colorPalette, semanticColors, typeRoles, spacing, shadows, motionPresets } from '@/design-system/tokens';
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
__exportStar(require("./colors"), exports);
__exportStar(require("./typography"), exports);
__exportStar(require("./spacing"), exports);
__exportStar(require("./elevation"), exports);
__exportStar(require("./motion"), exports);
