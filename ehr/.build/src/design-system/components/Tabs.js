'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tabs = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Layer 3 — Component: Tabs
 *
 * Keyboard-navigable tab set. Follows ARIA Tabs pattern (WAI-ARIA 1.2):
 *  - role="tablist" on container
 *  - role="tab" with aria-selected on each tab
 *  - role="tabpanel" on content panel
 *  - Arrow keys navigate tabs; Enter/Space activate
 *
 * Used throughout the EHR for patient chart sections:
 * Overview | Medications | Labs | Imaging | Notes | Orders
 */
const react_1 = require("react");
const cn_1 = require("../utils/cn");
const listVariant = {
    underline: 'border-b border-neutral-200 gap-0',
    pills: 'gap-1 p-1 bg-neutral-100 rounded-xl w-fit',
    contained: 'border-b border-neutral-200 gap-0',
};
const tabBase = 'relative inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-[100ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40';
const tabVariants = {
    underline: {
        active: 'text-primary-600 border-b-2 border-primary-600 pb-3 pt-3 px-1 -mb-px',
        inactive: 'text-neutral-500 hover:text-neutral-700 border-b-2 border-transparent pb-3 pt-3 px-1 -mb-px hover:border-neutral-300',
    },
    pills: {
        active: 'bg-white text-neutral-900 shadow-xs rounded-lg px-3 py-1.5',
        inactive: 'text-neutral-500 hover:text-neutral-700 px-3 py-1.5 rounded-lg hover:bg-white/60',
    },
    contained: {
        active: 'text-primary-700 bg-primary-50 border-b-2 border-primary-600 pb-3 pt-3 px-4 -mb-px',
        inactive: 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 border-b-2 border-transparent pb-3 pt-3 px-4 -mb-px',
    },
};
const Tabs = ({ tabs, activeTab, onChange, variant = 'underline', className, }) => {
    var _a;
    const panelId = (0, react_1.useId)();
    const tabRefs = (0, react_1.useRef)([]);
    const handleKeyDown = (0, react_1.useCallback)((e, index) => {
        var _a, _b, _c, _d;
        const enabledTabs = tabs.filter((t) => !t.disabled);
        const enabledIdx = enabledTabs.findIndex((t) => t.id === tabs[index].id);
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = enabledTabs[(enabledIdx + 1) % enabledTabs.length];
            const nextIdx = tabs.findIndex((t) => t.id === next.id);
            (_a = tabRefs.current[nextIdx]) === null || _a === void 0 ? void 0 : _a.focus();
            onChange(next.id);
        }
        else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = enabledTabs[(enabledIdx - 1 + enabledTabs.length) % enabledTabs.length];
            const prevIdx = tabs.findIndex((t) => t.id === prev.id);
            (_b = tabRefs.current[prevIdx]) === null || _b === void 0 ? void 0 : _b.focus();
            onChange(prev.id);
        }
        else if (e.key === 'Home') {
            e.preventDefault();
            const first = enabledTabs[0];
            (_c = tabRefs.current[tabs.findIndex((t) => t.id === first.id)]) === null || _c === void 0 ? void 0 : _c.focus();
            onChange(first.id);
        }
        else if (e.key === 'End') {
            e.preventDefault();
            const last = enabledTabs[enabledTabs.length - 1];
            (_d = tabRefs.current[tabs.findIndex((t) => t.id === last.id)]) === null || _d === void 0 ? void 0 : _d.focus();
            onChange(last.id);
        }
    }, [tabs, onChange]);
    const activeContent = (_a = tabs.find((t) => t.id === activeTab)) === null || _a === void 0 ? void 0 : _a.content;
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, cn_1.cn)('flex flex-col', className), children: [(0, jsx_runtime_1.jsx)("div", { role: "tablist", className: (0, cn_1.cn)('flex', listVariant[variant]), "aria-orientation": "horizontal", children: tabs.map((tab, i) => {
                    const isActive = tab.id === activeTab;
                    return ((0, jsx_runtime_1.jsxs)("button", { ref: (el) => { tabRefs.current[i] = el; }, role: "tab", type: "button", id: `tab-${tab.id}`, "aria-selected": isActive, "aria-controls": `${panelId}-${tab.id}`, disabled: tab.disabled, tabIndex: isActive ? 0 : -1, onClick: () => onChange(tab.id), onKeyDown: (e) => handleKeyDown(e, i), className: (0, cn_1.cn)(tabBase, isActive
                            ? tabVariants[variant].active
                            : tabVariants[variant].inactive), children: [tab.label, tab.count !== undefined && ((0, jsx_runtime_1.jsx)("span", { className: "rounded-full bg-neutral-200 px-1.5 py-0.5 text-xs font-semibold text-neutral-600 leading-none", children: tab.count }))] }, tab.id));
                }) }), (0, jsx_runtime_1.jsx)("div", { role: "tabpanel", id: `${panelId}-${activeTab}`, "aria-labelledby": `tab-${activeTab}`, tabIndex: -1, className: "focus-visible:outline-none", children: activeContent })] }));
};
exports.Tabs = Tabs;
