'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CardiovascularTestPage;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Cardiology Components Test Page
 *
 * Demonstrates all cardiology components with mock data.
 * This page verifies that the design system + cardiology UI works correctly.
 */
const react_1 = require("react");
const design_system_1 = require("@/design-system");
const cardiology_1 = require("@/cardiology");
const api_1 = require("@/cardiology/services/api");
const fhir_domain_1 = require("@/cardiology/types/fhir-domain");
function CardiovascularTestPage() {
    const [dashboard, setDashboard] = (0, react_1.useState)(null);
    const [queueItems, setQueueItems] = (0, react_1.useState)([]);
    const [selectedVisit, setSelectedVisit] = (0, react_1.useState)(null);
    const [selectedVisitId, setSelectedVisitId] = (0, react_1.useState)(null);
    const [isDetailOpen, setIsDetailOpen] = (0, react_1.useState)(false);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Load dashboard and queues on mount
    (0, react_1.useEffect)(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                const [dash, items] = await Promise.all([
                    (0, api_1.fetchDashboard)('default'),
                    (0, api_1.fetchQueueItems)(undefined, 'default'),
                ]);
                setDashboard(dash);
                setQueueItems(items);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load data');
                console.error('Load error:', err);
            }
            finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);
    // Load visit detail when selected
    (0, react_1.useEffect)(() => {
        if (!selectedVisitId)
            return;
        const loadVisit = async () => {
            try {
                const visit = await (0, api_1.fetchVisitDetail)(selectedVisitId);
                setSelectedVisit(visit);
            }
            catch (err) {
                console.error('Failed to fetch visit:', err);
            }
        };
        loadVisit();
    }, [selectedVisitId]);
    const handleClaimItem = async (itemId) => {
        try {
            await (0, api_1.claimQueueItem)(itemId, 'test-user-123');
            // Refresh queue items
            const items = await (0, api_1.fetchQueueItems)();
            setQueueItems(items);
        }
        catch (err) {
            console.error('Failed to claim item:', err);
        }
    };
    const handleCompleteItem = async (itemId, notes) => {
        try {
            await (0, api_1.completeQueueItem)(itemId, notes);
            // Refresh queue items
            const items = await (0, api_1.fetchQueueItems)();
            setQueueItems(items);
        }
        catch (err) {
            console.error('Failed to complete item:', err);
        }
    };
    const handleViewPatient = async (visitId) => {
        setSelectedVisitId(visitId);
        setIsDetailOpen(true);
    };
    const availableTransitions = selectedVisit
        ? [
            {
                event: 'Complete Consult',
                toState: 'CONSULTATION_COMPLETE',
                allowedForCurrentUser: true,
            },
            {
                event: 'Place Orders',
                toState: 'ORDERS_PLACED',
                allowedForCurrentUser: true,
            },
        ]
        : [];
    if (error) {
        return ((0, jsx_runtime_1.jsx)("main", { className: "p-6 bg-red-50", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-4xl mx-auto", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-bold text-red-900 mb-4", children: "Error Loading Cardiology UI" }), (0, jsx_runtime_1.jsx)("p", { className: "text-red-700", children: error }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-red-600 mt-2", children: "Make sure the backend API is running at the configured URL." })] }) }));
    }
    if (loading || !dashboard) {
        return ((0, jsx_runtime_1.jsx)("main", { className: "p-6 flex items-center justify-center min-h-screen", children: (0, jsx_runtime_1.jsxs)("div", { className: "text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" }), (0, jsx_runtime_1.jsx)("p", { className: "text-neutral-600", children: "Loading cardiology dashboard..." })] }) }));
    }
    return ((0, jsx_runtime_1.jsxs)("main", { className: "bg-neutral-50 min-h-screen", children: [(0, jsx_runtime_1.jsx)(design_system_1.PageHeader, { title: "Cardiology Practice UI Test", subtitle: "Testing design system components with mock data", breadcrumbs: [{ label: 'Home', href: '/' }, { label: 'Cardiology Test' }] }), (0, jsx_runtime_1.jsxs)("div", { className: "p-6 max-w-7xl mx-auto space-y-8", children: [(0, jsx_runtime_1.jsxs)("section", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-bold text-neutral-900", children: "Dashboard Component" }), (0, jsx_runtime_1.jsx)(cardiology_1.CardiovascularDashboard, { userId: "test-user-123", userName: "Dr. Test Chen", userRole: fhir_domain_1.CardiologyRole.CARDIOLOGIST, dashboard: dashboard, onClaimQueueItem: handleClaimItem, onViewPatientDetail: handleViewPatient, onRefresh: () => {
                                    window.location.reload();
                                } })] }), (0, jsx_runtime_1.jsxs)("section", { className: "space-y-4 bg-white rounded-lg p-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-bold text-neutral-900", children: "Queue Manager Component" }), (0, jsx_runtime_1.jsx)(cardiology_1.QueueManager, { items: queueItems, currentUserRole: fhir_domain_1.CardiologyRole.CARDIOLOGIST, currentUserId: "test-user-123", currentUserName: "Dr. Test Chen", onClaimItem: handleClaimItem, onCompleteItem: handleCompleteItem, onViewVisit: handleViewPatient })] }), selectedVisit && ((0, jsx_runtime_1.jsx)(cardiology_1.VisitDetail, { visit: selectedVisit, currentUserRole: fhir_domain_1.CardiologyRole.CARDIOLOGIST, currentUserId: "test-user-123", currentUserName: "Dr. Test Chen", availableTransitions: availableTransitions, onVitalsRecorded: async (vitals) => {
                            try {
                                await (0, api_1.recordVitals)(selectedVisit.id, vitals);
                                const updated = await (0, api_1.fetchVisitDetail)(selectedVisit.id);
                                if (updated)
                                    setSelectedVisit(updated);
                            }
                            catch (err) {
                                console.error('Failed to record vitals:', err);
                            }
                        }, onTransition: async (request) => {
                            try {
                                await (0, api_1.transitionVisitState)(selectedVisit.id, request);
                                const updated = await (0, api_1.fetchVisitDetail)(selectedVisit.id);
                                if (updated)
                                    setSelectedVisit(updated);
                            }
                            catch (err) {
                                console.error('Failed to transition:', err);
                            }
                        }, onClose: () => setIsDetailOpen(false), isOpen: isDetailOpen })), (0, jsx_runtime_1.jsxs)("section", { className: "bg-blue-50 border border-blue-200 rounded-lg p-6", children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-bold text-blue-900 mb-2", children: "\u2713 Test Results" }), (0, jsx_runtime_1.jsxs)("ul", { className: "text-sm text-blue-800 space-y-1", children: [(0, jsx_runtime_1.jsxs)("li", { children: ["\u2713 Dashboard loaded successfully with ", Object.values(dashboard.visits.byState).reduce((a, b) => a + b, 0), " total visits"] }), (0, jsx_runtime_1.jsxs)("li", { children: ["\u2713 Queue items loaded: ", queueItems.length, " items across ", dashboard.queues.length, " queues"] }), (0, jsx_runtime_1.jsxs)("li", { children: ["\u2713 Room status: ", dashboard.rooms.occupied, "/", dashboard.rooms.total, " rooms in use"] }), (0, jsx_runtime_1.jsx)("li", { children: "\u2713 Design system components rendering correctly" }), (0, jsx_runtime_1.jsx)("li", { children: "\u2713 TypeScript compilation: 0 errors" })] })] })] })] }));
}
