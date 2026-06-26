'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Badge = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../utils/cn");
const variantClasses = {
    critical: 'bg-critical-100 text-critical-800 ring-1 ring-inset ring-critical-300',
    warning: 'bg-warning-100  text-warning-800  ring-1 ring-inset ring-warning-300',
    stable: 'bg-stable-100   text-stable-800   ring-1 ring-inset ring-stable-300',
    info: 'bg-info-100     text-info-800     ring-1 ring-inset ring-info-300',
    primary: 'bg-primary-100  text-primary-800  ring-1 ring-inset ring-primary-300',
    neutral: 'bg-neutral-100  text-neutral-700  ring-1 ring-inset ring-neutral-300',
};
const dotColors = {
    critical: 'bg-critical-500',
    warning: 'bg-warning-500',
    stable: 'bg-stable-500',
    info: 'bg-info-500',
    primary: 'bg-primary-500',
    neutral: 'bg-neutral-400',
};
const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2.5 py-1   text-xs',
};
const Badge = ({ variant = 'neutral', size = 'md', dot = false, children, className, }) => ((0, jsx_runtime_1.jsxs)("span", { className: (0, cn_1.cn)('inline-flex items-center gap-1 rounded-full font-medium', sizeClasses[size], variantClasses[variant], className), children: [dot && ((0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: (0, cn_1.cn)('h-1.5 w-1.5 rounded-full flex-shrink-0', dotColors[variant]) })), children] }));
exports.Badge = Badge;
