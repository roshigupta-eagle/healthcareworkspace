'use client';
"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Input = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Layer 2 — Primitive: Input
 *
 * Base text input with healthcare-appropriate validation states.
 * Supports left/right addons (icon, prefix, unit label), four sizes,
 * and four visual states for clinical form validation feedback.
 *
 * Accessibility:
 *  - Always use with <FormField> for associated <label> and error messaging
 *  - aria-invalid is set automatically when state === 'error'
 *  - aria-describedby wired via FormField
 */
const react_1 = __importDefault(require("react"));
const cn_1 = require("../utils/cn");
const stateClasses = {
    default: 'border-neutral-300 focus:border-primary-600 focus:ring-primary-600',
    error: 'border-critical-500 focus:border-critical-600 focus:ring-critical-600',
    warning: 'border-warning-500  focus:border-warning-600  focus:ring-warning-600',
    success: 'border-stable-500   focus:border-stable-600   focus:ring-stable-600',
};
const sizeClasses = {
    sm: 'h-8  px-3 text-xs',
    md: 'h-10 px-3 text-sm',
    lg: 'h-12 px-4 text-base',
};
const addonSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
};
exports.Input = react_1.default.forwardRef((_a, ref) => {
    var { inputSize = 'md', state = 'default', leftAddon, rightAddon, fullWidth = false, className, 'aria-invalid': ariaInvalid } = _a, props = __rest(_a, ["inputSize", "state", "leftAddon", "rightAddon", "fullWidth", "className", 'aria-invalid']);
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, cn_1.cn)('relative inline-flex items-center', fullWidth && 'w-full'), children: [leftAddon && ((0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: (0, cn_1.cn)('pointer-events-none absolute left-3 flex items-center text-neutral-400', addonSizeClasses[inputSize]), children: leftAddon })), (0, jsx_runtime_1.jsx)("input", Object.assign({ ref: ref, "aria-invalid": ariaInvalid !== null && ariaInvalid !== void 0 ? ariaInvalid : (state === 'error' ? true : undefined), className: (0, cn_1.cn)('block w-full rounded-md border bg-white', 'text-neutral-900 placeholder:text-neutral-400', 'transition-colors duration-[100ms]', 'focus:outline-none focus:ring-2 focus:ring-offset-0', 'read-only:bg-neutral-50 read-only:text-neutral-600', 'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400', stateClasses[state], sizeClasses[inputSize], leftAddon ? 'pl-9' : undefined, rightAddon ? 'pr-9' : undefined, !fullWidth && 'w-auto', className) }, props)), rightAddon && ((0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: (0, cn_1.cn)('pointer-events-none absolute right-3 flex items-center text-neutral-400', addonSizeClasses[inputSize]), children: rightAddon }))] }));
});
exports.Input.displayName = 'Input';
