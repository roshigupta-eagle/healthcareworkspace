'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Modal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Layer 3 — Component: Modal
 *
 * Accessible dialog for confirmations, forms, and critical clinical
 * decision overlays. Implements:
 *  - Focus trap (via useFocusTrap hook)
 *  - Escape key to close
 *  - aria-modal, aria-labelledby, aria-describedby
 *  - Scroll lock on body
 *  - Backdrop click to close (optional)
 *
 * Sizes: xs (320px) | sm (384px) | md (512px) | lg (640px) | xl (768px) | full
 */
const react_1 = require("react");
const cn_1 = require("../utils/cn");
const useFocusTrap_1 = require("../hooks/useFocusTrap");
const sizeClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    full: 'max-w-full mx-4',
};
const Modal = ({ open, onClose, title, description, size = 'md', persistent = false, footer, children, className, }) => {
    const titleId = (0, react_1.useId)();
    const descriptionId = (0, react_1.useId)();
    const panelRef = (0, react_1.useRef)(null);
    (0, useFocusTrap_1.useFocusTrap)(panelRef, open);
    // Escape key handler
    const handleKeyDown = (0, react_1.useCallback)((e) => {
        if (e.key === 'Escape' && !persistent)
            onClose();
    }, [onClose, persistent]);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        document.addEventListener('keydown', handleKeyDown);
        // Compensate for scrollbar disappearing to prevent layout shift
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        const prevOverflow = document.body.style.overflow;
        const prevPaddingRight = document.body.style.paddingRight;
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${scrollbarWidth}px`;
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = prevOverflow;
            document.body.style.paddingRight = prevPaddingRight;
        };
    }, [open, handleKeyDown]);
    if (!open)
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-[400] flex items-center justify-center p-4", "aria-modal": "true", role: "dialog", "aria-labelledby": titleId, "aria-describedby": description ? descriptionId : undefined, children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 bg-neutral-900/50 backdrop-blur-sm transition-opacity", "aria-hidden": "true", onClick: !persistent ? onClose : undefined }), (0, jsx_runtime_1.jsxs)("div", { ref: panelRef, className: (0, cn_1.cn)('relative w-full rounded-2xl bg-white shadow-2xl', 'flex flex-col max-h-[90vh]', sizeClasses[size], className), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-4 px-6 py-5 border-b border-neutral-200", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { id: titleId, className: "text-lg font-semibold text-neutral-900", children: title }), description && ((0, jsx_runtime_1.jsx)("p", { id: descriptionId, className: "mt-1 text-sm text-neutral-500", children: description }))] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, "aria-label": "Close dialog", className: "flex-shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 transition-colors", children: (0, jsx_runtime_1.jsx)("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { d: "M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" }) }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-y-auto px-6 py-5", children: children }), footer && ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50 rounded-b-2xl", children: footer }))] })] }));
};
exports.Modal = Modal;
