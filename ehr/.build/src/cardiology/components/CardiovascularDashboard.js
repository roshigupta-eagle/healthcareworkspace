'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardiovascularDashboard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Cardiology Practice Dashboard
 *
 * Role-based dashboard component for the cardiology practice system.
 * Shows real-time patient flow, queue status, room occupancy, and urgent alerts.
 *
 * Features:
 * - Role-specific views (Receptionist, Nurse, Cardiologist, Technician, Billing, Admin)
 * - Real-time updates via WebSocket/polling
 * - Quick actions for claiming queue items
 * - Room occupancy heatmap
 * - Urgent patient alerts with visual priority indicators
 */
const react_1 = require("react");
const cn_1 = require("@/design-system/utils/cn");
const design_system_1 = require("@/design-system");
const fhir_domain_1 = require("../types/fhir-domain");
/**
 * Priority color classes for visual consistency
 */
const priorityColorMap = {
    [fhir_domain_1.VisitPriority.URGENT]: {
        bg: 'bg-critical-50 border-critical-200',
        text: 'text-critical-900',
        badge: 'critical',
    },
    [fhir_domain_1.VisitPriority.HIGH]: {
        bg: 'bg-warning-50 border-warning-200',
        text: 'text-warning-900',
        badge: 'warning',
    },
    [fhir_domain_1.VisitPriority.NORMAL]: {
        bg: 'bg-info-50 border-info-200',
        text: 'text-info-900',
        badge: 'info',
    },
    [fhir_domain_1.VisitPriority.LOW]: {
        bg: 'bg-neutral-50 border-neutral-200',
        text: 'text-neutral-700',
        badge: 'neutral',
    },
};
/**
 * Map state names to human-readable labels
 */
const stateLabels = {
    [fhir_domain_1.CardiovascularVisitState.REFERRAL_RECEIVED]: 'Referral Received',
    [fhir_domain_1.CardiovascularVisitState.SCHEDULING]: 'Scheduling',
    [fhir_domain_1.CardiovascularVisitState.APPOINTMENT_SCHEDULED]: 'Appointment Scheduled',
    [fhir_domain_1.CardiovascularVisitState.APPOINTMENT_CONFIRMED]: 'Appointment Confirmed',
    [fhir_domain_1.CardiovascularVisitState.PRE_VISIT_FORMS]: 'Pre-Visit Forms',
    [fhir_domain_1.CardiovascularVisitState.PATIENT_ARRIVED]: 'Patient Arrived',
    [fhir_domain_1.CardiovascularVisitState.CHECKING_IN]: 'Checking In',
    [fhir_domain_1.CardiovascularVisitState.CHECKED_IN]: 'Checked In',
    [fhir_domain_1.CardiovascularVisitState.IN_WAITING_ROOM]: 'In Waiting Room',
    [fhir_domain_1.CardiovascularVisitState.NURSING_ASSESSMENT]: 'Nursing Assessment',
    [fhir_domain_1.CardiovascularVisitState.IN_EXAM_ROOM]: 'In Exam Room',
    [fhir_domain_1.CardiovascularVisitState.PHYSICIAN_PENDING]: 'Physician Pending',
    [fhir_domain_1.CardiovascularVisitState.PHYSICIAN_WITH_PATIENT]: 'Physician With Patient',
    [fhir_domain_1.CardiovascularVisitState.ORDERS_PLACED]: 'Orders Placed',
    [fhir_domain_1.CardiovascularVisitState.PROCEDURE_QUEUED]: 'Procedure Queued',
    [fhir_domain_1.CardiovascularVisitState.IN_PROCEDURE]: 'In Procedure',
    [fhir_domain_1.CardiovascularVisitState.PROCEDURE_COMPLETE]: 'Procedure Complete',
    [fhir_domain_1.CardiovascularVisitState.RESULTS_READY]: 'Results Ready',
    [fhir_domain_1.CardiovascularVisitState.RESULTS_REVIEW]: 'Results Review',
    [fhir_domain_1.CardiovascularVisitState.CONSULTATION_COMPLETE]: 'Consultation Complete',
    [fhir_domain_1.CardiovascularVisitState.CHECKING_OUT]: 'Checking Out',
    [fhir_domain_1.CardiovascularVisitState.CHECKOUT_COMPLETE]: 'Checkout Complete',
    [fhir_domain_1.CardiovascularVisitState.BILLING_PENDING]: 'Billing Pending',
    [fhir_domain_1.CardiovascularVisitState.FOLLOW_UP_SCHEDULED]: 'Follow-up Scheduled',
    [fhir_domain_1.CardiovascularVisitState.DISCHARGED]: 'Discharged',
    [fhir_domain_1.CardiovascularVisitState.ON_HOLD]: 'On Hold',
    [fhir_domain_1.CardiovascularVisitState.CANCELLED]: 'Cancelled',
    [fhir_domain_1.CardiovascularVisitState.NO_SHOW]: 'No-Show',
};
const CardiovascularDashboard = ({ userId, userName, userRole, dashboard, onClaimQueueItem, onViewPatientDetail, onViewQueue, onRefresh, enableRealtime = true, className, }) => {
    const [activeTab, setActiveTab] = (0, react_1.useState)('overview');
    const [isRefreshing, setIsRefreshing] = (0, react_1.useState)(false);
    // Set up real-time polling
    (0, react_1.useEffect)(() => {
        if (!enableRealtime)
            return;
        const pollInterval = setInterval(() => {
            onRefresh === null || onRefresh === void 0 ? void 0 : onRefresh();
        }, 3000); // Poll every 3 seconds
        return () => clearInterval(pollInterval);
    }, [enableRealtime, onRefresh]);
    // Compute role-specific queue items for current user
    const userQueueItems = (0, react_1.useMemo)(() => {
        if (userRole === fhir_domain_1.CardiologyRole.ADMIN)
            return [];
        // Filter to queues owned by this role — simplified mapping
        const queuesByRole = {
            [fhir_domain_1.CardiologyRole.RECEPTIONIST]: [
                'CHECK_IN',
                'CHECKOUT',
                'SCHEDULING',
                'FOLLOW_UP_SCHEDULING',
            ],
            [fhir_domain_1.CardiologyRole.NURSE]: ['NURSING_ASSESSMENT'],
            [fhir_domain_1.CardiologyRole.CARDIOLOGIST]: ['PHYSICIAN_CONSULT', 'RESULTS_REVIEW'],
            [fhir_domain_1.CardiologyRole.TECHNICIAN]: [
                'PROCEDURE_ECG',
                'PROCEDURE_ECHO',
                'PROCEDURE_STRESS_TEST',
                'PROCEDURE_HOLTER',
            ],
            [fhir_domain_1.CardiologyRole.BILLING]: ['BILLING'],
            [fhir_domain_1.CardiologyRole.ADMIN]: [],
            [fhir_domain_1.CardiologyRole.PATIENT]: [],
            [fhir_domain_1.CardiologyRole.SYSTEM]: [],
        };
        const userQueues = queuesByRole[userRole] || [];
        return dashboard.queues
            .filter((q) => userQueues.includes(q.queueName))
            .reduce((sum, q) => sum + q.pendingCount, 0);
    }, [userRole, dashboard.queues]);
    const urgentVisits = (0, react_1.useMemo)(() => {
        return Object.values(dashboard.visits.byState).reduce((a, b) => a + b, 0);
    }, [dashboard.visits]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, cn_1.cn)('space-y-6 p-4 md:p-6 bg-neutral-50 min-h-screen', className), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-4 md:flex-row md:items-center md:justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-bold text-neutral-900", children: "HealthOS Cardiology" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-neutral-600", children: [userName, " \u2022 ", userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase()] })] }), (0, jsx_runtime_1.jsx)(design_system_1.Button, { variant: "secondary", size: "sm", loading: isRefreshing, onClick: () => {
                            setIsRefreshing(true);
                            onRefresh === null || onRefresh === void 0 ? void 0 : onRefresh();
                            setTimeout(() => setIsRefreshing(false), 500);
                        }, children: "Refresh" })] }), dashboard.visits.urgent.length > 0 && ((0, jsx_runtime_1.jsxs)(design_system_1.Alert, { severity: "critical", children: [(0, jsx_runtime_1.jsxs)("strong", { children: ["\u26A0\uFE0F Urgent Alerts (", dashboard.visits.urgent.length, ")"] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 space-y-1", children: dashboard.visits.urgent.map((visit) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between text-sm", children: [(0, jsx_runtime_1.jsxs)("span", { children: [visit.patientName, " \u2022 ", visit.chiefComplaint] }), (0, jsx_runtime_1.jsx)(design_system_1.Button, { variant: "ghost", size: "xs", onClick: () => onViewPatientDetail === null || onViewPatientDetail === void 0 ? void 0 : onViewPatientDetail(visit.id), children: "View" })] }, visit.id))) })] })), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-lg p-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex gap-2 border-b border-neutral-200 mb-4", children: ['overview', 'myQueue', 'rooms', 'allQueues'].map((tab) => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => setActiveTab(tab), className: `px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === tab
                                ? 'text-primary-600 border-primary-600'
                                : 'text-neutral-600 border-transparent hover:text-neutral-900'}`, children: [tab === 'overview' && 'Overview', tab === 'myQueue' && 'My Queue', tab === 'rooms' && 'Rooms', tab === 'allQueues' && 'All Queues'] }, tab))) }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [activeTab === 'overview' && ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-4", children: [(0, jsx_runtime_1.jsxs)(design_system_1.Card, { variant: "outlined", className: "p-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs font-medium text-neutral-600 uppercase", children: "Patients Today" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-3xl font-bold text-neutral-900", children: urgentVisits }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-xs text-neutral-500", children: "across all states" })] }), (0, jsx_runtime_1.jsxs)(design_system_1.Card, { variant: "outlined", className: "p-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs font-medium text-neutral-600 uppercase", children: "Your Queue" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-3xl font-bold text-primary-600", children: userQueueItems }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-xs text-neutral-500", children: "pending items" })] }), (0, jsx_runtime_1.jsxs)(design_system_1.Card, { variant: "outlined", className: "p-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs font-medium text-neutral-600 uppercase", children: "Rooms" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-3xl font-bold text-neutral-900", children: [dashboard.rooms.occupied, "/", dashboard.rooms.total] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-xs text-neutral-500", children: "in use" })] }), (0, jsx_runtime_1.jsxs)(design_system_1.Card, { variant: "outlined", className: "p-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs font-medium text-neutral-600 uppercase", children: "Avg Wait" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-3xl font-bold text-warning-600", children: [Math.round(dashboard.queues.reduce((sum, q) => sum + q.averageWaitMinutes, 0) /
                                                                dashboard.queues.length), "m"] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-xs text-neutral-500", children: "across queues" })] })] }), userRole !== fhir_domain_1.CardiologyRole.ADMIN && userRole !== fhir_domain_1.CardiologyRole.PATIENT && ((0, jsx_runtime_1.jsxs)(design_system_1.Card, { variant: "outlined", className: "p-4", children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-neutral-900", children: "My Queue" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-sm text-neutral-600", children: userQueueItems === 0 ? 'No pending items' : `${userQueueItems} items waiting` }), (0, jsx_runtime_1.jsx)(design_system_1.Button, { variant: "primary", size: "sm", className: "mt-4", onClick: () => setActiveTab('myQueue'), children: "View All Items" })] })), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "mb-3 font-semibold text-neutral-900", children: "Room Status" }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7", children: Object.values(dashboard.rooms.byType).flat().map((room) => ((0, jsx_runtime_1.jsxs)(design_system_1.Card, { variant: "outlined", className: `p-3 text-center cursor-pointer hover:shadow-md ${room.isAvailable
                                                        ? 'bg-success-50 border-2 border-success-200'
                                                        : 'bg-warning-50 border-2 border-warning-200'}`, onClick: () => onViewQueue === null || onViewQueue === void 0 ? void 0 : onViewQueue('ROOM_DETAIL'), children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs font-bold text-neutral-700", children: room.roomNumber }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-xs text-neutral-600", children: room.isAvailable ? '✓ Available' : `${room.currentOccupancy}/${room.capacity}` })] }, room.id))) })] }), (0, jsx_runtime_1.jsxs)(design_system_1.Card, { variant: "outlined", className: "p-4", children: [(0, jsx_runtime_1.jsx)("h3", { className: "mb-3 font-semibold text-neutral-900", children: "Recent Activity" }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: dashboard.recentEvents.slice(0, 10).map((event) => ((0, jsx_runtime_1.jsxs)("div", { className: `flex items-start justify-between border-b border-neutral-200 pb-2 text-sm ${event.eventType === 'STATE_TRANSITION' ? '' : ''}`, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium text-neutral-900", children: event.eventType }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-neutral-600", children: [event.fromState, " \u2192 ", event.toState, " by ", event.actorRole] })] }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-neutral-500 whitespace-nowrap", children: new Date(event.createdAt).toLocaleTimeString() })] }, event.id))) })] })] })), activeTab === 'myQueue' && ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-neutral-900", children: "My Pending Items" }), userQueueItems === 0 ? ((0, jsx_runtime_1.jsx)(design_system_1.Alert, { severity: "info", children: "No pending items in your queues." })) : ((0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: (0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-neutral-600", children: [userQueueItems, " total items. Claim highest priority items first."] }) }))] })), activeTab === 'rooms' && ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-neutral-900", children: "Room Management" }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-2", children: Object.values(dashboard.rooms.byType).flat().map((room) => ((0, jsx_runtime_1.jsx)(design_system_1.Card, { variant: "outlined", className: "p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium text-neutral-900", children: room.roomNumber }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-neutral-600", children: room.occupantNames.join(', ') || 'Empty' })] }), (0, jsx_runtime_1.jsx)(design_system_1.Badge, { variant: room.isAvailable ? 'info' : 'warning', size: "sm", children: room.isAvailable ? 'Available' : `${room.currentOccupancy}/${room.capacity}` })] }) }, room.id))) })] })), activeTab === 'allQueues' && ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-neutral-900", children: "All Work Queues" }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: dashboard.queues.map((queue) => ((0, jsx_runtime_1.jsx)(design_system_1.Card, { variant: "outlined", className: "p-4 cursor-pointer hover:shadow-md", onClick: () => onViewQueue === null || onViewQueue === void 0 ? void 0 : onViewQueue(queue.queueName), children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium text-neutral-900", children: queue.queueName }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-sm text-neutral-600", children: [queue.pendingCount, " pending \u2022 ", queue.inProgressCount, " in progress"] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 h-2 bg-neutral-200 rounded-full overflow-hidden", children: (0, jsx_runtime_1.jsx)("div", { className: "h-full bg-primary-600", style: {
                                                                        width: `${Math.min(100, (queue.pendingCount / 10) * 100)}%`,
                                                                    } }) })] }), (0, jsx_runtime_1.jsxs)(design_system_1.Badge, { variant: "info", size: "sm", children: [queue.oldestItemAgeMinutes, "m"] })] }) }, queue.queueName))) })] }))] })] })] }));
};
exports.CardiovascularDashboard = CardiovascularDashboard;
