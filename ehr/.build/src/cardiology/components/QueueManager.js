'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Queue Manager
 *
 * Comprehensive work queue interface for all 13 cardiology queues.
 * Allows staff to:
 * - View queue items sorted by priority
 * - Claim items (assign to self)
 * - Mark items complete
 * - Filter and search
 * - Track SLA metrics
 */
const react_1 = require("react");
const cn_1 = require("@/design-system/utils/cn");
const design_system_1 = require("@/design-system");
const fhir_domain_1 = require("../types/fhir-domain");
const priorityOrder = {
    [fhir_domain_1.VisitPriority.URGENT]: 0,
    [fhir_domain_1.VisitPriority.HIGH]: 1,
    [fhir_domain_1.VisitPriority.NORMAL]: 2,
    [fhir_domain_1.VisitPriority.LOW]: 3,
};
const priorityLabels = {
    [fhir_domain_1.VisitPriority.URGENT]: 'URGENT',
    [fhir_domain_1.VisitPriority.HIGH]: 'HIGH',
    [fhir_domain_1.VisitPriority.NORMAL]: 'NORMAL',
    [fhir_domain_1.VisitPriority.LOW]: 'LOW',
};
const priorityVariants = {
    [fhir_domain_1.VisitPriority.URGENT]: 'critical',
    [fhir_domain_1.VisitPriority.HIGH]: 'warning',
    [fhir_domain_1.VisitPriority.NORMAL]: 'info',
    [fhir_domain_1.VisitPriority.LOW]: 'neutral',
};
const QueueManager = ({ items, currentUserRole, currentUserId, currentUserName, onClaimItem, onCompleteItem, onViewVisit, queueFilter, statusFilter, className, }) => {
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [activeStatus, setActiveStatus] = (0, react_1.useState)(fhir_domain_1.QueueItemStatus.PENDING);
    const [selectedItem, setSelectedItem] = (0, react_1.useState)(null);
    const [completeModalOpen, setCompleteModalOpen] = (0, react_1.useState)(false);
    const [completeNotes, setCompleteNotes] = (0, react_1.useState)('');
    // Filter and sort items
    const filteredItems = (0, react_1.useMemo)(() => {
        return items
            .filter((item) => {
            // Queue filter
            if (queueFilter) {
                const queues = Array.isArray(queueFilter) ? queueFilter : [queueFilter];
                if (!queues.includes(item.queueName))
                    return false;
            }
            // Status filter
            if (statusFilter) {
                const statuses = Array.isArray(statusFilter) ? statusFilter : [statusFilter];
                if (!statuses.includes(item.status))
                    return false;
            }
            // Active tab filter
            if (item.status !== activeStatus)
                return false;
            // Search filter
            if (searchTerm.trim()) {
                const lower = searchTerm.toLowerCase();
                return (item.patientName.toLowerCase().includes(lower) ||
                    item.queueName.toLowerCase().includes(lower) ||
                    item.visitId.toLowerCase().includes(lower));
            }
            return true;
        })
            .sort((a, b) => {
            // Sort by priority first
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0)
                return priorityDiff;
            // Then by age (oldest first)
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
    }, [items, queueFilter, statusFilter, activeStatus, searchTerm]);
    const handleClaimItem = (item) => {
        onClaimItem === null || onClaimItem === void 0 ? void 0 : onClaimItem(item.id, currentUserId);
    };
    const handleOpenComplete = (item) => {
        setSelectedItem(item);
        setCompleteNotes('');
        setCompleteModalOpen(true);
    };
    const handleSubmitComplete = () => {
        if (selectedItem) {
            onCompleteItem === null || onCompleteItem === void 0 ? void 0 : onCompleteItem(selectedItem.id, completeNotes.trim() || undefined);
            setCompleteModalOpen(false);
        }
    };
    // Summary statistics
    const stats = (0, react_1.useMemo)(() => {
        const pending = filteredItems.filter((i) => i.status === 'PENDING');
        const inProgress = filteredItems.filter((i) => i.status === 'IN_PROGRESS');
        const completed = filteredItems.filter((i) => i.status === 'COMPLETED');
        const avgWaitPending = pending.length > 0
            ? Math.round(pending.reduce((sum, item) => sum +
                (Date.now() - new Date(item.createdAt).getTime()) / 1000 / 60, 0) / pending.length)
            : 0;
        return { pending: pending.length, inProgress: inProgress.length, completed: completed.length, avgWaitPending };
    }, [filteredItems]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, cn_1.cn)('space-y-6', className), children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-bold text-neutral-900", children: "Work Queues" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-neutral-600 mt-1", children: "Manage patient workflow items across all cardiology roles." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3 md:flex-row md:items-end md:justify-between", children: [(0, jsx_runtime_1.jsx)(design_system_1.FormField, { label: "Search", className: "flex-1", children: (0, jsx_runtime_1.jsx)(design_system_1.Input, { placeholder: "Search by patient name, queue, or visit ID\u2026", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value) }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex gap-2", children: [fhir_domain_1.QueueItemStatus.PENDING, fhir_domain_1.QueueItemStatus.IN_PROGRESS, fhir_domain_1.QueueItemStatus.COMPLETED].map((status) => ((0, jsx_runtime_1.jsxs)(design_system_1.Button, { variant: activeStatus === status ? 'primary' : 'secondary', size: "sm", onClick: () => setActiveStatus(status), children: [status.replace(/_/g, ' '), " (", filteredItems.filter((i) => i.status === status).length, ")"] }, status))) })] }), activeStatus === fhir_domain_1.QueueItemStatus.PENDING && ((0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-3 gap-3", children: [(0, jsx_runtime_1.jsxs)(design_system_1.Card, { variant: "outlined", className: "p-3", children: [(0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "caption", className: "text-neutral-600 uppercase block", children: "Pending" }), (0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "heading4", className: "text-primary-600 mt-1", children: stats.pending })] }), (0, jsx_runtime_1.jsxs)(design_system_1.Card, { variant: "outlined", className: "p-3", children: [(0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "caption", className: "text-neutral-600 uppercase block", children: "Avg Wait" }), (0, jsx_runtime_1.jsxs)(design_system_1.Text, { variant: "heading4", className: "text-warning-600 mt-1", children: [stats.avgWaitPending, "m"] })] }), (0, jsx_runtime_1.jsxs)(design_system_1.Card, { variant: "outlined", className: "p-3", children: [(0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "caption", className: "text-neutral-600 uppercase block", children: "In Progress" }), (0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "heading4", className: "text-info-600 mt-1", children: stats.inProgress })] })] })), filteredItems.length === 0 ? ((0, jsx_runtime_1.jsxs)(design_system_1.Alert, { severity: "info", children: ["No items found ", searchTerm && `matching "${searchTerm}"`, ". Check back soon!"] })) : ((0, jsx_runtime_1.jsx)("div", { className: "space-y-2", children: filteredItems.map((item) => {
                    const ageMinutes = Math.round((Date.now() - new Date(item.createdAt).getTime()) / 1000 / 60);
                    const isOwnItem = item.claimedBy === currentUserId;
                    const isClaimed = item.status === 'IN_PROGRESS' && !!item.claimedBy;
                    return ((0, jsx_runtime_1.jsx)(design_system_1.Card, { variant: "outlined", className: `p-4 cursor-pointer hover:shadow-md transition-shadow ${isOwnItem ? 'bg-primary-50 border-2 border-primary-200 shadow-md' : ''}`, children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3 md:flex-row md:items-start md:justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-w-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 flex-wrap", children: [(0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "body", className: "font-semibold text-neutral-900", children: item.patientName }), (0, jsx_runtime_1.jsx)(design_system_1.Badge, { variant: priorityVariants[item.priority], size: "sm", children: priorityLabels[item.priority] }), isOwnItem && ((0, jsx_runtime_1.jsx)(design_system_1.Badge, { variant: "info", size: "sm", children: "\u2190 Your Item" }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 flex items-center gap-3 flex-wrap text-sm text-neutral-600", children: [(0, jsx_runtime_1.jsx)("span", { children: item.queueName }), (0, jsx_runtime_1.jsx)("span", { children: "\u2022" }), (0, jsx_runtime_1.jsxs)("span", { children: [ageMinutes, " min ago"] }), isClaimed && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { children: "\u2022" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-neutral-700 font-medium", children: ["Claimed by ", item.claimedBy === currentUserId ? 'you' : 'someone else'] })] }))] }), item.notes && ((0, jsx_runtime_1.jsxs)(design_system_1.Text, { variant: "body-sm", className: "mt-2 text-neutral-700 italic", children: ["\"", item.notes, "\""] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-2 md:flex-col md:items-end", children: [activeStatus === fhir_domain_1.QueueItemStatus.PENDING && !isClaimed && ((0, jsx_runtime_1.jsx)(design_system_1.Button, { variant: "primary", size: "sm", onClick: () => handleClaimItem(item), children: "Claim for Me" })), activeStatus === fhir_domain_1.QueueItemStatus.IN_PROGRESS && isOwnItem && ((0, jsx_runtime_1.jsx)(design_system_1.Button, { variant: "primary", size: "sm", onClick: () => handleOpenComplete(item), children: "Mark Complete" })), activeStatus === fhir_domain_1.QueueItemStatus.IN_PROGRESS && !isOwnItem && isClaimed && ((0, jsx_runtime_1.jsx)(design_system_1.Button, { variant: "ghost", size: "sm", disabled: true, children: item.claimedBy ? '⏳ In Progress' : 'Unclaimed' })), (0, jsx_runtime_1.jsx)(design_system_1.Button, { variant: "outline", size: "sm", onClick: () => onViewVisit === null || onViewVisit === void 0 ? void 0 : onViewVisit(item.visitId), children: "View Visit" })] })] }) }, item.id));
                }) })), (0, jsx_runtime_1.jsx)(design_system_1.Modal, { open: completeModalOpen, onClose: () => setCompleteModalOpen(false), title: "Complete Queue Item", description: `Patient: ${selectedItem === null || selectedItem === void 0 ? void 0 : selectedItem.patientName}`, size: "sm", footer: (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)(design_system_1.Button, { variant: "ghost", onClick: () => setCompleteModalOpen(false), children: "Cancel" }), (0, jsx_runtime_1.jsx)(design_system_1.Button, { variant: "primary", onClick: handleSubmitComplete, children: "Mark Complete" })] }), children: (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)(design_system_1.FormField, { label: "Completion Notes (optional)", hint: "Document any relevant information", children: (0, jsx_runtime_1.jsx)("textarea", { value: completeNotes, onChange: (e) => setCompleteNotes(e.target.value), rows: 3, maxLength: 500, placeholder: "e.g. Vitals recorded, patient roomed, awaiting physician", className: "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 resize-none" }) }), (0, jsx_runtime_1.jsx)(design_system_1.Alert, { severity: "info", children: "\u2713 Item will be marked complete and moved out of your queue." })] }) })] }));
};
exports.QueueManager = QueueManager;
