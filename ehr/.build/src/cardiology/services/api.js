"use strict";
/**
 * Cardiology API Facade
 *
 * Exports appropriate API implementation based on environment:
 * - Development: api.mock.ts (realistic mock data)
 * - Production: api.client.ts (real HTTP backend)
 *
 * Usage is identical regardless of implementation.
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
exports.API_ENVIRONMENT = void 0;
// Re-export all API functions and types
__exportStar(require("./api.mock"), exports);
// In production, uncomment to use real API:
// export * from './api.client';
// To switch implementations:
// 1. Comment out api.mock export above
// 2. Uncomment api.client export
// 3. Set NEXT_PUBLIC_CARDIOLOGY_API_URL environment variable
// 4. Rebuild: npm run build
exports.API_ENVIRONMENT = process.env.NODE_ENV === 'production' ? 'production' : 'development';
