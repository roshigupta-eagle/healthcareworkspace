"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
function Home() {
    return ((0, jsx_runtime_1.jsx)("main", { id: "main-content", className: "flex-1 flex items-center justify-center", children: (0, jsx_runtime_1.jsxs)("div", { className: "text-center max-w-2xl px-6", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl", children: "Healthcare EHR" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-4 text-lg text-gray-600", children: "FHIR-native Electronic Health Record System" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-sm text-gray-500", children: "WCAG 2.2 AA Compliant \u2022 Canadian Healthcare Standards" }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-8 flex gap-4 justify-center", children: [(0, jsx_runtime_1.jsx)(link_1.default, { href: "/login", className: "rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600", children: "Sign In" }), (0, jsx_runtime_1.jsx)(link_1.default, { href: "/register", className: "rounded-md bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600", children: "Register" })] })] }) }));
}
