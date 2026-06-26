"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
/**
 * Lightweight class-name merger.
 * Filters falsy values and joins remaining strings with a single space.
 * No external dependency required — compatible with Tailwind v4.
 */
function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
