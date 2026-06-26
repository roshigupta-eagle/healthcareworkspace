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
exports.CardTitle = exports.Card = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../utils/cn");
const variantClasses = {
    default: 'bg-white border border-neutral-200 shadow-xs',
    flush: 'bg-white',
    outlined: 'bg-white border-2 border-neutral-300 shadow-sm',
    critical: 'bg-critical-50 border border-critical-300 shadow-xs',
    warning: 'bg-warning-50  border border-warning-300  shadow-xs',
};
const Card = (_a) => {
    var { variant = 'default', header, footer, noPadding = false, children, className } = _a, props = __rest(_a, ["variant", "header", "footer", "noPadding", "children", "className"]);
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, cn_1.cn)('rounded-xl overflow-hidden', variantClasses[variant], className) }, props, { children: [header && ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-between gap-4 px-5 py-4 border-b border-neutral-200", children: header })), (0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)(!noPadding && 'px-5 py-4'), children: children }), footer && ((0, jsx_runtime_1.jsx)("div", { className: "px-5 py-3 border-t border-neutral-200 bg-neutral-50", children: footer }))] })));
};
exports.Card = Card;
const CardTitle = ({ title, subtitle, action }) => ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-semibold text-neutral-900 truncate", children: title }), subtitle && ((0, jsx_runtime_1.jsx)("p", { className: "text-xs text-neutral-500 mt-0.5 truncate", children: subtitle }))] }), action && (0, jsx_runtime_1.jsx)("div", { className: "flex-shrink-0", children: action })] }));
exports.CardTitle = CardTitle;
