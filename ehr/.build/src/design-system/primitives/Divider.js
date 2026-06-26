'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Divider = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../utils/cn");
const Divider = ({ orientation = 'horizontal', label, className, }) => {
    if (orientation === 'vertical') {
        return ((0, jsx_runtime_1.jsx)("div", { role: "separator", "aria-orientation": "vertical", className: (0, cn_1.cn)('w-px bg-neutral-200 self-stretch flex-shrink-0', className) }));
    }
    if (label) {
        return ((0, jsx_runtime_1.jsxs)("div", { role: "separator", "aria-label": label, className: (0, cn_1.cn)('relative flex items-center gap-3', className), children: [(0, jsx_runtime_1.jsx)("span", { className: "flex-grow border-t border-neutral-200", "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("span", { className: "flex-shrink-0 text-xs font-medium text-neutral-500", children: label }), (0, jsx_runtime_1.jsx)("span", { className: "flex-grow border-t border-neutral-200", "aria-hidden": "true" })] }));
    }
    return ((0, jsx_runtime_1.jsx)("hr", { role: "separator", className: (0, cn_1.cn)('border-0 border-t border-neutral-200', className) }));
};
exports.Divider = Divider;
