'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spinner = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../utils/cn");
const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
};
const Spinner = ({ size = 'md', className, label = 'Loading…', }) => ((0, jsx_runtime_1.jsx)("span", { role: "status", "aria-label": label, className: "inline-flex", children: (0, jsx_runtime_1.jsxs)("svg", { className: (0, cn_1.cn)('animate-spin text-current', sizeClasses[size], className), xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", "aria-hidden": "true", children: [(0, jsx_runtime_1.jsx)("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), (0, jsx_runtime_1.jsx)("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })] }) }));
exports.Spinner = Spinner;
