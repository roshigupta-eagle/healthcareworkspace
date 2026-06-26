'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sidebar = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../utils/cn");
const Sidebar = ({ id, groups, collapsed = false, footer, className, onNavigate, }) => ((0, jsx_runtime_1.jsxs)("nav", { id: id, "aria-label": "Main navigation", className: (0, cn_1.cn)('flex flex-col h-full bg-white border-r border-neutral-200', 'transition-[width] duration-[200ms] ease-out', collapsed ? 'w-14' : 'w-60', className), children: [(0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4", children: groups.map((group, gi) => ((0, jsx_runtime_1.jsxs)("div", { className: "px-2", children: [group.label && !collapsed && ((0, jsx_runtime_1.jsx)("p", { className: "mb-1 px-2 text-xs font-semibold uppercase tracking-widest text-neutral-400", children: group.label })), (0, jsx_runtime_1.jsx)("ul", { role: "list", className: "space-y-0.5", children: group.items.map((item) => {
                            var _a;
                            return ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("a", { href: (_a = item.href) !== null && _a !== void 0 ? _a : '#', "aria-current": item.active ? 'page' : undefined, "aria-disabled": item.disabled || undefined, "aria-label": collapsed ? item.label : undefined, onClick: (e) => {
                                        if (item.disabled) {
                                            e.preventDefault();
                                            return;
                                        }
                                        if (onNavigate) {
                                            e.preventDefault();
                                            onNavigate(item);
                                        }
                                    }, className: (0, cn_1.cn)('group flex items-center gap-3 rounded-lg px-2 py-2', 'text-sm font-medium transition-colors duration-[100ms]', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600', item.active
                                        ? 'bg-primary-50 text-primary-700'
                                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900', item.disabled && 'pointer-events-none opacity-40'), children: [item.icon && ((0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: (0, cn_1.cn)('flex-shrink-0 h-5 w-5', item.active ? 'text-primary-600' : 'text-neutral-400 group-hover:text-neutral-600'), children: item.icon })), !collapsed && ((0, jsx_runtime_1.jsx)("span", { className: "flex-1 truncate", children: item.label })), !collapsed && item.badge !== undefined && item.badge > 0 && ((0, jsx_runtime_1.jsx)("span", { "aria-label": `${item.badge} notifications`, className: "ml-auto rounded-full bg-primary-600 px-1.5 py-0.5 text-xs font-semibold text-white leading-none", children: item.badge > 99 ? '99+' : item.badge }))] }) }, item.id));
                        }) })] }, gi))) }), footer && ((0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)('flex-shrink-0 border-t border-neutral-200 px-2 py-3', collapsed && 'flex justify-center'), children: footer }))] }));
exports.Sidebar = Sidebar;
