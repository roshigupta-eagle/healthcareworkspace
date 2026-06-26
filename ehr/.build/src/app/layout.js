"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const jsx_runtime_1 = require("react/jsx-runtime");
const google_1 = require("next/font/google");
require("./globals.css");
const geistSans = (0, google_1.Geist)({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
const geistMono = (0, google_1.Geist_Mono)({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});
exports.metadata = {
    title: "Healthcare EHR",
    description: "Electronic Health Record System — FHIR-native, WCAG 2.2 AA compliant",
};
function RootLayout({ children, }) {
    return ((0, jsx_runtime_1.jsx)("html", { lang: "en", className: `${geistSans.variable} ${geistMono.variable} h-full antialiased`, children: (0, jsx_runtime_1.jsxs)("body", { className: "min-h-full flex flex-col bg-gray-50 text-gray-900", children: [(0, jsx_runtime_1.jsx)("a", { href: "#main-content", className: "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded", children: "Skip to main content" }), children] }) }));
}
