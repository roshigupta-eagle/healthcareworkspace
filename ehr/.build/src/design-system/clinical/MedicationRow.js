'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicationRow = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../utils/cn");
const Badge_1 = require("../primitives/Badge");
const statusBadge = {
    active: { variant: 'stable', label: 'Active' },
    discontinued: { variant: 'neutral', label: 'D/C' },
    held: { variant: 'warning', label: 'Held' },
    completed: { variant: 'neutral', label: 'Completed' },
    pending: { variant: 'info', label: 'Pending' },
    overridden: { variant: 'critical', label: 'Override' },
};
function formatDateTime(iso) {
    if (!iso)
        return '—';
    try {
        return new Date(iso).toLocaleString('en-CA', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    }
    catch (_a) {
        return iso;
    }
}
const MedicationRow = ({ drugName, genericName, dose, route, frequency, prescriber, status, highAlert = false, prn = false, lastAdministered, onSelect, className, }) => {
    const badge = statusBadge[status];
    const Tag = onSelect ? 'button' : 'div';
    return ((0, jsx_runtime_1.jsxs)(Tag, { type: onSelect ? 'button' : undefined, onClick: onSelect, className: (0, cn_1.cn)('w-full flex flex-wrap items-start gap-x-6 gap-y-1 px-4 py-3', 'border-b border-neutral-100 last:border-0 bg-white text-left', 'transition-colors duration-[100ms]', onSelect && 'cursor-pointer hover:bg-neutral-50 focus-visible:outline-none focus-visible:bg-primary-50', status === 'discontinued' && 'opacity-60', className), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col min-w-0 flex-1", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 flex-wrap", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm font-semibold text-neutral-900", children: drugName }), highAlert && ((0, jsx_runtime_1.jsx)("span", { "aria-label": "High-alert medication", title: "High-alert medication (ISMP)", className: "inline-flex items-center justify-center h-4 w-4 rounded-full bg-critical-600 text-white text-[9px] font-bold flex-shrink-0", children: "HA" })), prn && ((0, jsx_runtime_1.jsx)(Badge_1.Badge, { variant: "info", size: "sm", children: "PRN" }))] }), genericName && ((0, jsx_runtime_1.jsx)("span", { className: "text-xs text-neutral-500 mt-0.5", children: genericName }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4 text-sm text-neutral-700", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-mono font-medium", children: dose }), (0, jsx_runtime_1.jsx)("span", { className: "text-neutral-400", children: route }), (0, jsx_runtime_1.jsx)("span", { children: frequency })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-end gap-1 min-w-[130px]", children: [(0, jsx_runtime_1.jsx)(Badge_1.Badge, { variant: badge.variant, size: "sm", dot: true, children: badge.label }), lastAdministered && ((0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-neutral-400", children: ["Last: ", formatDateTime(lastAdministered)] })), prescriber && ((0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-neutral-400", children: ["Rx: ", prescriber] }))] })] }));
};
exports.MedicationRow = MedicationRow;
