'use client';
"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormField = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Layer 3 — Component: FormField
 *
 * Wrapper composing a form control with its label, optional hint text,
 * and validation error. Wires aria-describedby and aria-labelledby
 * correctly so screen readers announce field context automatically.
 *
 * Usage:
 *   <FormField id="mrn" label="MRN" required error={errors.mrn}>
 *     <Input id="mrn" state={errors.mrn ? 'error' : 'default'} />
 *   </FormField>
 */
const react_1 = __importStar(require("react"));
const cn_1 = require("../utils/cn");
const FormField = ({ id, label, hint, error, required = false, hideLabel = false, children, className, }) => {
    const generatedId = (0, react_1.useId)();
    const fieldId = id !== null && id !== void 0 ? id : generatedId;
    const hintId = `${fieldId}-hint`;
    const errorId = `${fieldId}-error`;
    const describedBy = [
        hint && hintId,
        error && errorId,
    ]
        .filter(Boolean)
        .join(' ') || undefined;
    const enrichedChild = react_1.default.cloneElement(children, Object.assign({ id: fieldId, 'aria-describedby': describedBy, 'aria-required': required || undefined }, (error ? { state: 'error', 'aria-invalid': true } : {})));
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, cn_1.cn)('flex flex-col gap-1.5', className), children: [(0, jsx_runtime_1.jsxs)("label", { htmlFor: fieldId, className: (0, cn_1.cn)('text-sm font-medium text-neutral-800', hideLabel && 'sr-only'), children: [label, required && ((0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: "ml-0.5 text-critical-600", children: "*" }))] }), enrichedChild, hint && !error && ((0, jsx_runtime_1.jsx)("p", { id: hintId, className: "text-xs text-neutral-500", children: hint })), error && ((0, jsx_runtime_1.jsxs)("p", { id: errorId, role: "alert", className: "flex items-center gap-1 text-xs text-critical-700", children: [(0, jsx_runtime_1.jsx)("svg", { className: "h-3.5 w-3.5 flex-shrink-0", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" }) }), error] }))] }));
};
exports.FormField = FormField;
