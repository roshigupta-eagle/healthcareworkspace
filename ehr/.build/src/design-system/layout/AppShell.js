'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppShell = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Layer 5 — Layout: AppShell
 *
 * Root application shell. Composes the full-screen layout:
 *   ┌─────────────────────────────────────────┐
 *   │              TopBar (56px)              │
 *   ├──────────┬──────────────────────────────┤
 *   │ Sidebar  │       Content Area           │
 *   │  (240px) │   (scrollable, flex-col)     │
 *   └──────────┴──────────────────────────────┘
 *
 * The shell is the single source of truth for:
 *  - Sidebar collapsed state
 *  - Global notification / toast region
 *  - Skip-to-content link (WCAG 2.1 2.4.1)
 */
const react_1 = require("react");
const cn_1 = require("../utils/cn");
const Sidebar_1 = require("./Sidebar");
const MAIN_CONTENT_ID = 'main-content';
const AppShell = ({ navGroups, topBar, sidebarFooter, children, onNavigate, className, }) => {
    const [collapsed, setCollapsed] = (0, react_1.useState)(false);
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, cn_1.cn)('flex flex-col h-screen overflow-hidden bg-neutral-50', className), children: [(0, jsx_runtime_1.jsx)("a", { href: `#${MAIN_CONTENT_ID}`, className: "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[600] focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg", children: "Skip to main content" }), topBar && ((0, jsx_runtime_1.jsxs)("header", { className: "flex-shrink-0 h-14 flex items-center px-4 gap-4 bg-white border-b border-neutral-200 shadow-xs z-[200]", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", "aria-label": collapsed ? 'Expand sidebar' : 'Collapse sidebar', "aria-expanded": !collapsed, "aria-controls": "app-sidebar", onClick: () => setCollapsed((c) => !c), className: "flex-shrink-0 rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 transition-colors", children: (0, jsx_runtime_1.jsx)("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { fillRule: "evenodd", d: "M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 15.25z", clipRule: "evenodd" }) }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 min-w-0", children: topBar })] })), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-1 min-h-0 overflow-hidden", children: [(0, jsx_runtime_1.jsx)(Sidebar_1.Sidebar, { id: "app-sidebar", groups: navGroups, collapsed: collapsed, footer: sidebarFooter, onNavigate: onNavigate, className: "flex-shrink-0" }), (0, jsx_runtime_1.jsx)("main", { id: MAIN_CONTENT_ID, tabIndex: -1, className: "flex-1 min-w-0 overflow-y-auto overflow-x-hidden focus-visible:outline-none", children: children })] })] }));
};
exports.AppShell = AppShell;
