'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alert = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../utils/cn");
const severityConfig = {
    critical: {
        container: 'border-critical-400 bg-critical-50',
        icon: 'text-critical-600',
        title: 'text-critical-800',
        body: 'text-critical-700',
        defaultRole: 'alert',
    },
    warning: {
        container: 'border-warning-400 bg-warning-50',
        icon: 'text-warning-600',
        title: 'text-warning-800',
        body: 'text-warning-700',
        defaultRole: 'alert',
    },
    stable: {
        container: 'border-stable-400 bg-stable-50',
        icon: 'text-stable-600',
        title: 'text-stable-800',
        body: 'text-stable-700',
        defaultRole: 'status',
    },
    info: {
        container: 'border-info-400 bg-info-50',
        icon: 'text-info-600',
        title: 'text-info-800',
        body: 'text-info-700',
        defaultRole: 'status',
    },
    neutral: {
        container: 'border-neutral-300 bg-neutral-50',
        icon: 'text-neutral-500',
        title: 'text-neutral-800',
        body: 'text-neutral-700',
        defaultRole: 'status',
    },
};
const DefaultIcons = {
    critical: ((0, jsx_runtime_1.jsx)("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z", clipRule: "evenodd" }) })),
    warning: ((0, jsx_runtime_1.jsx)("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { fillRule: "evenodd", d: "M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" }) })),
    stable: ((0, jsx_runtime_1.jsx)("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z", clipRule: "evenodd" }) })),
    info: ((0, jsx_runtime_1.jsx)("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z", clipRule: "evenodd" }) })),
    neutral: ((0, jsx_runtime_1.jsx)("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z", clipRule: "evenodd" }) })),
};
const Alert = ({ severity = 'info', title, children, onDismiss, icon, className, }) => {
    const cfg = severityConfig[severity];
    const displayIcon = icon !== null && icon !== void 0 ? icon : DefaultIcons[severity];
    return ((0, jsx_runtime_1.jsxs)("div", { role: cfg.defaultRole, className: (0, cn_1.cn)('flex gap-3 rounded-lg border p-4', cfg.container, className), children: [(0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)('mt-0.5 flex-shrink-0', cfg.icon), children: displayIcon }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex-1", children: [title && ((0, jsx_runtime_1.jsx)("p", { className: (0, cn_1.cn)('mb-1 text-sm font-semibold', cfg.title), children: title })), (0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)('text-sm', cfg.body), children: children })] }), onDismiss && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onDismiss, "aria-label": "Dismiss notification", className: "flex-shrink-0 rounded p-1 -m-1 transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current", children: (0, jsx_runtime_1.jsx)("svg", { className: "h-4 w-4 opacity-60", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { d: "M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" }) }) }))] }));
};
exports.Alert = Alert;
