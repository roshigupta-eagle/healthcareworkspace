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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Text = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../utils/cn");
const variantClasses = {
    display: 'text-4xl font-bold   tracking-tight leading-tight',
    heading1: 'text-3xl font-bold   tracking-tight leading-tight',
    heading2: 'text-2xl font-semibold tracking-tight leading-snug',
    heading3: 'text-xl  font-semibold leading-snug',
    heading4: 'text-lg  font-semibold leading-snug',
    body: 'text-sm  font-normal  leading-normal',
    'body-sm': 'text-xs  font-normal  leading-normal',
    caption: 'text-xs  font-normal  leading-normal',
    overline: 'text-xs  font-semibold uppercase tracking-widest leading-none',
    label: 'text-sm  font-medium  leading-none',
    code: 'text-sm  font-normal  font-mono leading-relaxed',
    clinicalValue: 'text-sm  font-medium  font-mono leading-none tabular-nums',
};
const colorClasses = {
    primary: 'text-neutral-900',
    secondary: 'text-neutral-700',
    muted: 'text-neutral-500',
    disabled: 'text-neutral-400',
    inverse: 'text-white',
    link: 'text-primary-600',
    critical: 'text-critical-700',
    warning: 'text-warning-700',
    stable: 'text-stable-700',
    info: 'text-info-700',
};
const defaultElements = {
    display: 'h1',
    heading1: 'h1',
    heading2: 'h2',
    heading3: 'h3',
    heading4: 'h4',
    body: 'p',
    'body-sm': 'p',
    caption: 'span',
    overline: 'span',
    label: 'span',
    code: 'code',
    clinicalValue: 'span',
};
const Text = (_a) => {
    var { variant = 'body', color = 'primary', as, truncate = false, srOnly = false, children, className } = _a, props = __rest(_a, ["variant", "color", "as", "truncate", "srOnly", "children", "className"]);
    const Component = as !== null && as !== void 0 ? as : defaultElements[variant];
    return ((0, jsx_runtime_1.jsx)(Component, Object.assign({ className: (0, cn_1.cn)(variantClasses[variant], colorClasses[color], truncate && 'truncate', srOnly && 'sr-only', className) }, props, { children: children })));
};
exports.Text = Text;
