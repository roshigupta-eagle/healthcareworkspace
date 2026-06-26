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
exports.Button = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Layer 2 â€” Primitive: Button
 *
 * The most fundamental interactive element. Supports five semantic variants
 * aligned to the healthcare action hierarchy, four sizes with touch-target
 * compliance (min 44px for sm/md/lg), loading state, and icon slots.
 *
 * Accessibility:
 *  - aria-busy on loading state
 *  - aria-label REQUIRED for icon-only buttons (no children) â€” WCAG 1.1.1
 *  - Focus ring via global :focus-visible (WCAG 2.1 AA)
 *  - disabled prevents pointer events and sets opacity
 *  - All interactive states (hover, active, focus) are visually distinct
 *  - Loading state maintains button dimensions to prevent layout shift
 */
const react_1 = __importDefault(require("react"));
const cn_1 = require("../utils/cn");
const Spinner_1 = require("./Spinner");
const variantClasses = {
    primary: 'bg-primary-600 text-white shadow-xs ' +
        'hover:bg-primary-700 active:bg-primary-800 ' +
        'focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
    secondary: 'bg-neutral-100 text-neutral-800 shadow-xs ' +
        'hover:bg-neutral-200 active:bg-neutral-300 ' +
        'focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2',
    outline: 'border border-primary-600 text-primary-600 bg-transparent ' +
        'hover:bg-primary-50 active:bg-primary-100 ' +
        'focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
    ghost: 'text-neutral-700 bg-transparent ' +
        'hover:bg-neutral-100 active:bg-neutral-200 ' +
        'focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2',
    destructive: 'bg-critical-600 text-white shadow-xs ' +
        'hover:bg-critical-700 active:bg-critical-800 ' +
        'focus-visible:ring-2 focus-visible:ring-critical-600 focus-visible:ring-offset-2',
};
/** Icon-only variant: square, equal padding on all sides */
const iconOnlySizeClasses = {
    xs: 'h-7 w-7 p-0 rounded',
    sm: 'h-9 w-9 p-0 rounded-md',
    md: 'h-11 w-11 p-0 rounded-md',
    lg: 'h-12 w-12 p-0 rounded-lg',
};
const sizeClasses = {
    xs: 'h-7 min-w-7 px-2.5 text-xs gap-1 rounded',
    sm: 'h-9 min-w-9 px-3 text-sm gap-1.5 rounded-md',
    md: 'h-11 min-w-11 px-4 text-sm gap-2 rounded-md',
    lg: 'h-12 min-w-12 px-6 text-base gap-2.5 rounded-lg',
};
exports.Button = react_1.default.forwardRef((_a, ref) => {
    var { variant = 'primary', size = 'md', loading = false, label, icon, iconPosition = 'left', fullWidth = false, disabled, children, className, type = 'button', 'aria-label': ariaLabel } = _a, props = __rest(_a, ["variant", "size", "loading", "label", "icon", "iconPosition", "fullWidth", "disabled", "children", "className", "type", 'aria-label']);
    const isDisabled = disabled || loading;
    const isIconOnly = !children && !!icon;
    // Prefer explicit aria-label prop, then the label shorthand, then nothing
    const computedAriaLabel = ariaLabel !== null && ariaLabel !== void 0 ? ariaLabel : label;
    return ((0, jsx_runtime_1.jsx)("button", Object.assign({ ref: ref, type: type, disabled: isDisabled, "aria-busy": loading || undefined, "aria-label": computedAriaLabel, className: (0, cn_1.cn)('inline-flex items-center justify-center', 'font-medium whitespace-nowrap select-none', 'transition-colors duration-[100ms]', 'focus-visible:outline-none', 'disabled:pointer-events-none disabled:opacity-50', variantClasses[variant], isIconOnly ? iconOnlySizeClasses[size] : sizeClasses[size], fullWidth && 'w-full', className) }, props, { children: loading ? (
        /* Spinner occupies the same space as icon+text to prevent layout shift */
        (0, jsx_runtime_1.jsx)(Spinner_1.Spinner, { size: size === 'lg' ? 'sm' : 'xs', className: "text-current" })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [icon && iconPosition === 'left' && ((0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: "flex-shrink-0", children: icon })), children && (0, jsx_runtime_1.jsx)("span", { children: children }), icon && iconPosition === 'right' && ((0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: "flex-shrink-0", children: icon }))] })) })));
});
exports.Button.displayName = 'Button';
