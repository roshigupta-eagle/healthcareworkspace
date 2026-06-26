'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabResultRow = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../utils/cn");
const Badge_1 = require("../primitives/Badge");
const flagConfig = {
    HH: { label: 'Critical ↑', variant: 'critical', valueClass: 'text-critical-700 font-bold' },
    H: { label: 'High ↑', variant: 'warning', valueClass: 'text-warning-700 font-semibold' },
    N: { label: 'Normal', variant: 'stable', valueClass: 'text-stable-700' },
    L: { label: 'Low ↓', variant: 'warning', valueClass: 'text-warning-700 font-semibold' },
    LL: { label: 'Critical ↓', variant: 'critical', valueClass: 'text-critical-700 font-bold' },
    A: { label: 'Abnormal', variant: 'warning', valueClass: 'text-warning-700 font-semibold' },
};
const statusLabels = {
    final: '',
    preliminary: 'Prelim',
    corrected: 'Corrected',
    cancelled: 'Cancelled',
    pending: 'Pending',
};
function formatDate(iso) {
    if (!iso)
        return '—';
    try {
        return new Date(iso).toLocaleDateString('en-CA', {
            month: 'short', day: 'numeric', year: 'numeric',
        });
    }
    catch (_a) {
        return iso;
    }
}
const LabResultRow = ({ testName, value, unit, referenceRange, flag = null, status = 'final', collectedAt, resultedAt, onSelect, className, }) => {
    const flagInfo = flag ? flagConfig[flag] : null;
    const isCritical = flag === 'HH' || flag === 'LL';
    const Tag = onSelect ? 'button' : 'div';
    return ((0, jsx_runtime_1.jsxs)(Tag, { type: onSelect ? 'button' : undefined, onClick: onSelect, "aria-label": onSelect ? `View detail for ${testName}` : undefined, className: (0, cn_1.cn)('w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left', 'border-b border-neutral-100 last:border-0 bg-white', 'transition-colors duration-[100ms]', isCritical && 'bg-critical-50', onSelect && 'cursor-pointer hover:bg-neutral-50 focus-visible:outline-none focus-visible:bg-primary-50', className), children: [isCritical && ((0, jsx_runtime_1.jsx)("span", { className: "flex-shrink-0 h-2 w-2 rounded-full bg-critical-600 animate-pulse", "aria-hidden": "true" })), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 min-w-[140px]", children: (0, jsx_runtime_1.jsx)("span", { className: (0, cn_1.cn)('text-sm font-medium', isCritical ? 'text-critical-800' : 'text-neutral-800'), children: testName }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-baseline gap-1 min-w-[90px]", children: [(0, jsx_runtime_1.jsx)("span", { className: (0, cn_1.cn)('text-sm font-mono tabular-nums', flagInfo ? flagInfo.valueClass : 'text-neutral-800'), children: value }), unit && (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-neutral-400", children: unit })] }), (0, jsx_runtime_1.jsx)("div", { className: "min-w-[100px] text-xs text-neutral-400", children: referenceRange ? `Ref: ${referenceRange}` : '' }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 min-w-[100px]", children: [flagInfo && ((0, jsx_runtime_1.jsx)(Badge_1.Badge, { variant: flagInfo.variant, size: "sm", dot: true, children: flagInfo.label })), status !== 'final' && ((0, jsx_runtime_1.jsx)("span", { className: "text-xs text-neutral-400 italic", children: statusLabels[status] }))] }), (0, jsx_runtime_1.jsx)("div", { className: "text-xs text-neutral-400 min-w-[100px] text-right", children: resultedAt ? formatDate(resultedAt) : formatDate(collectedAt) }), onSelect && ((0, jsx_runtime_1.jsx)("svg", { className: "h-4 w-4 text-neutral-300 flex-shrink-0", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { fillRule: "evenodd", d: "M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z", clipRule: "evenodd" }) }))] }));
};
exports.LabResultRow = LabResultRow;
