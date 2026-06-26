'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTable = DataTable;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../utils/cn");
const Spinner_1 = require("../primitives/Spinner");
function SortIcon({ direction }) {
    return ((0, jsx_runtime_1.jsxs)("span", { "aria-hidden": "true", className: "ml-1 inline-flex flex-col opacity-60", children: [(0, jsx_runtime_1.jsx)("svg", { className: (0, cn_1.cn)('h-3 w-3 -mb-1', direction === 'asc' ? 'opacity-100 text-primary-600' : ''), viewBox: "0 0 12 12", fill: "currentColor", children: (0, jsx_runtime_1.jsx)("path", { d: "M6 2l4 4H2z" }) }), (0, jsx_runtime_1.jsx)("svg", { className: (0, cn_1.cn)('h-3 w-3', direction === 'desc' ? 'opacity-100 text-primary-600' : ''), viewBox: "0 0 12 12", fill: "currentColor", children: (0, jsx_runtime_1.jsx)("path", { d: "M6 10L2 6h8z" }) })] }));
}
function DataTable({ columns, rows, sortKey, sortDirection = null, onSort, onRowClick, rowAction, selectedIds, onSelectionChange, striped = false, loading = false, emptyState, caption, className, }) {
    const selectable = !!onSelectionChange;
    const allSelected = selectable && rows.length > 0 && rows.every((r) => selectedIds === null || selectedIds === void 0 ? void 0 : selectedIds.has(r.id));
    const someSelected = selectable && rows.some((r) => selectedIds === null || selectedIds === void 0 ? void 0 : selectedIds.has(r.id));
    const toggleAll = () => {
        if (!onSelectionChange)
            return;
        if (allSelected) {
            onSelectionChange(new Set());
        }
        else {
            onSelectionChange(new Set(rows.map((r) => r.id)));
        }
    };
    const toggleRow = (id) => {
        if (!onSelectionChange || !selectedIds)
            return;
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        }
        else {
            next.add(id);
        }
        onSelectionChange(next);
    };
    const colSpanTotal = columns.length + (selectable ? 1 : 0) + (rowAction ? 1 : 0);
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)('overflow-x-auto rounded-xl border border-neutral-200', className), children: (0, jsx_runtime_1.jsxs)("table", { className: "min-w-full divide-y divide-neutral-200 text-sm", children: [caption && ((0, jsx_runtime_1.jsx)("caption", { className: "sr-only", children: caption })), (0, jsx_runtime_1.jsx)("thead", { className: "bg-neutral-50", children: (0, jsx_runtime_1.jsxs)("tr", { children: [selectable && ((0, jsx_runtime_1.jsx)("th", { scope: "col", className: "w-10 px-4 py-3", children: (0, jsx_runtime_1.jsx)("input", { type: "checkbox", "aria-label": "Select all rows", checked: allSelected, ref: (el) => { if (el)
                                        el.indeterminate = !allSelected && someSelected; }, onChange: toggleAll, className: "h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" }) })), columns.map((col) => {
                                const isActive = sortKey === col.key;
                                const ariaSort = isActive
                                    ? sortDirection === 'asc' ? 'ascending' : 'descending'
                                    : col.sortable ? 'none' : undefined;
                                return ((0, jsx_runtime_1.jsx)("th", { scope: "col", "aria-sort": ariaSort, style: col.width ? { width: col.width } : undefined, className: (0, cn_1.cn)('px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider', col.numeric ? 'text-right' : 'text-left'), children: col.sortable && onSort ? ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onSort(col.key), className: (0, cn_1.cn)('inline-flex items-center gap-1 w-full rounded', col.numeric ? 'justify-end' : 'justify-start', 'hover:text-neutral-900 transition-colors select-none', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600'), children: [col.header, (0, jsx_runtime_1.jsx)(SortIcon, { direction: isActive ? sortDirection : null })] })) : ((0, jsx_runtime_1.jsx)("span", { className: "inline-flex items-center", children: col.header })) }, col.key));
                            }), rowAction && ((0, jsx_runtime_1.jsx)("th", { scope: "col", className: "w-16 px-4 py-3", children: (0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: "Actions" }) }))] }) }), (0, jsx_runtime_1.jsxs)("tbody", { className: "divide-y divide-neutral-100 bg-white", children: [loading && ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: colSpanTotal, className: "py-12 text-center", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center gap-3 text-neutral-400", children: [(0, jsx_runtime_1.jsx)(Spinner_1.Spinner, { size: "md" }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs", children: "Loading data\u2026" })] }) }) })), !loading && rows.length === 0 && ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: colSpanTotal, className: "py-12 text-center text-sm text-neutral-500", children: emptyState !== null && emptyState !== void 0 ? emptyState : 'No records found.' }) })), !loading &&
                            rows.map((row, rowIdx) => {
                                var _a;
                                const isSelected = (_a = selectedIds === null || selectedIds === void 0 ? void 0 : selectedIds.has(row.id)) !== null && _a !== void 0 ? _a : false;
                                return ((0, jsx_runtime_1.jsxs)("tr", { onClick: onRowClick ? () => onRowClick(row) : undefined, onKeyDown: onRowClick
                                        ? (e) => { if (e.key === 'Enter')
                                            onRowClick(row); }
                                        : undefined, tabIndex: onRowClick ? 0 : undefined, role: onRowClick ? 'button' : undefined, "aria-selected": selectable ? isSelected : undefined, className: (0, cn_1.cn)(striped && rowIdx % 2 !== 0 && 'bg-neutral-50', isSelected && 'bg-primary-50', onRowClick && 'cursor-pointer hover:bg-primary-50 focus-visible:outline-none focus-visible:bg-primary-50 transition-colors'), children: [selectable && ((0, jsx_runtime_1.jsx)("td", { className: "w-10 px-4 py-3", onClick: (e) => e.stopPropagation(), children: (0, jsx_runtime_1.jsx)("input", { type: "checkbox", "aria-label": `Select row ${row.id}`, checked: isSelected, onChange: () => toggleRow(row.id), className: "h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" }) })), columns.map((col) => ((0, jsx_runtime_1.jsx)("td", { className: (0, cn_1.cn)('px-4 py-3 text-sm text-neutral-800', col.numeric && 'text-right font-mono tabular-nums'), children: col.render(row) }, col.key))), rowAction && ((0, jsx_runtime_1.jsx)("td", { className: "w-16 px-4 py-3 text-right", onClick: (e) => e.stopPropagation(), children: rowAction(row) }))] }, row.id));
                            })] })] }) }));
}
