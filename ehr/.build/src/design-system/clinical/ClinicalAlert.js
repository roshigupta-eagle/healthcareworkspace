'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicalAlert = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Layer 4 — Clinical Pattern: ClinicalAlert
 *
 * High-priority clinical decision support (CDS) alert. Renders inline
 * within clinical workflows for:
 *  - Drug–drug interactions
 *  - Drug–allergy contraindications
 *  - Clinical guideline recommendations
 *  - Duplicate therapy warnings
 *  - Dose range checks
 *
 * Differs from the generic Alert component:
 *  - Mandatory action buttons (acknowledge / override / cancel)
 *  - Override requires a documented reason (reason input shown inline)
 *  - Critical/high severity cannot be dismissed without acknowledgement
 *  - Audit trail metadata (alert type, rule ID) for downstream logging
 *
 * Accessibility:
 *  - role="alertdialog" for modal-level CDS prompts
 *  - Focus moves to the primary action button on mount
 */
const react_1 = require("react");
const cn_1 = require("../utils/cn");
const Button_1 = require("../primitives/Button");
const Badge_1 = require("../primitives/Badge");
const severityConfig = {
    critical: { container: 'border-critical-400 bg-critical-50', header: 'bg-critical-100', badge: 'critical' },
    high: { container: 'border-warning-400  bg-warning-50', header: 'bg-warning-100', badge: 'warning' },
    moderate: { container: 'border-warning-300  bg-warning-50', header: 'bg-warning-50', badge: 'warning' },
    low: { container: 'border-info-300     bg-info-50', header: 'bg-info-50', badge: 'info' },
    info: { container: 'border-neutral-300  bg-neutral-50', header: 'bg-neutral-100', badge: 'neutral' },
};
const alertTypeLabels = {
    'drug-drug': 'Drug–Drug Interaction',
    'drug-allergy': 'Drug–Allergy Contraindication',
    'dose-range': 'Dose Range Check',
    'duplicate-therapy': 'Duplicate Therapy',
    'guideline-recommendation': 'Clinical Guideline',
    'contraindication': 'Contraindication',
};
const ClinicalAlert = ({ alertType, severity, title, message, detail, ruleId, onAcknowledge, onOverride, onCancel, requireOverrideReason = severity === 'critical' || severity === 'high', className, }) => {
    const [showOverrideInput, setShowOverrideInput] = (0, react_1.useState)(false);
    const [overrideReason, setOverrideReason] = (0, react_1.useState)('');
    const primaryBtnRef = (0, react_1.useRef)(null);
    const cfg = severityConfig[severity];
    /** Builds an audit metadata snapshot at the current instant. */
    const buildMetadata = () => ({
        timestamp: new Date().toISOString(),
        alertType,
        severity,
        ruleId,
    });
    (0, react_1.useEffect)(() => {
        var _a;
        (_a = primaryBtnRef.current) === null || _a === void 0 ? void 0 : _a.focus();
    }, []);
    const handleOverrideSubmit = () => {
        if (!overrideReason.trim())
            return;
        onOverride === null || onOverride === void 0 ? void 0 : onOverride(overrideReason.trim(), buildMetadata());
    };
    return ((0, jsx_runtime_1.jsxs)("div", { role: "alertdialog", "aria-live": severity === 'critical' ? 'assertive' : 'polite', "aria-atomic": "true", "aria-label": `${severityConfig[severity].badge.toUpperCase()} — ${title}`, className: (0, cn_1.cn)('rounded-xl border-2 overflow-hidden shadow-md', cfg.container, className), children: [(0, jsx_runtime_1.jsxs)("div", { className: (0, cn_1.cn)('flex items-center justify-between gap-3 px-4 py-3', cfg.header), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("svg", { className: (0, cn_1.cn)('h-5 w-5 flex-shrink-0', severity === 'critical' || severity === 'high'
                                    ? 'text-critical-600'
                                    : 'text-warning-600'), viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { fillRule: "evenodd", d: "M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" }) }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm font-semibold text-neutral-900", children: title })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(Badge_1.Badge, { variant: cfg.badge, size: "sm", dot: true, children: severity.charAt(0).toUpperCase() + severity.slice(1) }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-neutral-500", children: alertTypeLabels[alertType] }), ruleId && ((0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-neutral-400 font-mono", children: ["#", ruleId] }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "px-4 py-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm text-neutral-800", children: message }), detail && ((0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-xs text-neutral-500 border-l-2 border-neutral-300 pl-3", children: detail }))] }), showOverrideInput && ((0, jsx_runtime_1.jsxs)("div", { className: "px-4 pb-3", children: [(0, jsx_runtime_1.jsxs)("label", { className: "block text-xs font-medium text-neutral-700 mb-1", children: ["Override reason ", (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: "text-critical-600", children: "*" })] }), (0, jsx_runtime_1.jsx)("textarea", { value: overrideReason, onChange: (e) => setOverrideReason(e.target.value), rows: 2, maxLength: 500, placeholder: "Document clinical rationale for override\u2026", "aria-required": "true", className: "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 resize-none" })] })), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2 px-4 py-3 border-t border-neutral-200 bg-white/60", children: [onAcknowledge && !showOverrideInput && ((0, jsx_runtime_1.jsx)(Button_1.Button, { ref: primaryBtnRef, variant: severity === 'critical' || severity === 'high' ? 'destructive' : 'primary', size: "sm", onClick: () => onAcknowledge === null || onAcknowledge === void 0 ? void 0 : onAcknowledge(buildMetadata()), children: "Acknowledge" })), onOverride && !showOverrideInput && ((0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "outline", size: "sm", onClick: () => {
                            if (requireOverrideReason) {
                                setShowOverrideInput(true);
                            }
                            else {
                                onOverride === null || onOverride === void 0 ? void 0 : onOverride('', buildMetadata());
                            }
                        }, children: "Override" })), showOverrideInput && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "destructive", size: "sm", disabled: !overrideReason.trim(), onClick: handleOverrideSubmit, children: "Confirm Override" }), (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "ghost", size: "sm", onClick: () => { setShowOverrideInput(false); setOverrideReason(''); }, children: "Back" })] })), onCancel && !showOverrideInput && ((0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "ghost", size: "sm", onClick: onCancel, children: "Cancel Order" }))] })] }));
};
exports.ClinicalAlert = ClinicalAlert;
