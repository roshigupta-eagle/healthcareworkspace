'use client';
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardiovascularTestRunner = CardiovascularTestRunner;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Cardiology Integration Tests
 *
 * Run directly in browser at: http://localhost:3000/cardiology-test
 * Tests mock API responses and component integration
 */
const react_1 = require("react");
function CardiovascularTestRunner() {
    const [results, setResults] = (0, react_1.useState)([]);
    const [running, setRunning] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        async function runTests() {
            const testResults = [];
            // Test 1: Mock API functions exist
            try {
                const { fetchDashboard, fetchQueueItems, fetchVisitDetail } = await Promise.resolve().then(() => __importStar(require('@/cardiology/services/api.mock')));
                if (typeof fetchDashboard === 'function' &&
                    typeof fetchQueueItems === 'function' &&
                    typeof fetchVisitDetail === 'function') {
                    testResults.push({
                        name: 'API: Mock functions exported correctly',
                        status: 'pass',
                    });
                }
                else {
                    testResults.push({
                        name: 'API: Mock functions exported correctly',
                        status: 'fail',
                        message: 'Functions not properly exported',
                    });
                }
            }
            catch (error) {
                testResults.push({
                    name: 'API: Mock functions exported correctly',
                    status: 'fail',
                    message: error instanceof Error ? error.message : 'Import failed',
                });
            }
            // Test 2: Mock data contains required fields
            try {
                const { mockVisits, mockQueueItems } = await Promise.resolve().then(() => __importStar(require('@/cardiology/services/api.mock')));
                if (mockVisits.length > 0 && mockVisits[0].patientName && mockVisits[0].id) {
                    testResults.push({
                        name: 'Data: Mock visits have required fields',
                        status: 'pass',
                    });
                }
                else {
                    testResults.push({
                        name: 'Data: Mock visits have required fields',
                        status: 'fail',
                        message: 'Missing patientName or id',
                    });
                }
                if (mockQueueItems.length > 0 &&
                    mockQueueItems[0].queueName &&
                    mockQueueItems[0].status &&
                    mockQueueItems[0].priority) {
                    testResults.push({
                        name: 'Data: Mock queue items have required fields',
                        status: 'pass',
                    });
                }
                else {
                    testResults.push({
                        name: 'Data: Mock queue items have required fields',
                        status: 'fail',
                        message: 'Missing queue fields',
                    });
                }
            }
            catch (error) {
                testResults.push({
                    name: 'Data: Mock imports failed',
                    status: 'fail',
                    message: error instanceof Error ? error.message : 'Import error',
                });
            }
            // Test 3: Component types export correctly
            try {
                const { CardiovascularVisitState, CardiologyRole, QueueName, VisitPriority, } = await Promise.resolve().then(() => __importStar(require('@/cardiology/types/fhir-domain')));
                const stateCount = Object.keys(CardiovascularVisitState).length;
                const roleCount = Object.keys(CardiologyRole).length;
                const queueCount = Object.keys(QueueName).length;
                if (stateCount >= 23) {
                    testResults.push({
                        name: `Types: All ${stateCount} visit states defined`,
                        status: 'pass',
                    });
                }
                else {
                    testResults.push({
                        name: 'Types: Visit states defined',
                        status: 'fail',
                        message: `Expected 23+, got ${stateCount}`,
                    });
                }
                if (roleCount >= 8) {
                    testResults.push({
                        name: `Types: All ${roleCount} roles defined`,
                        status: 'pass',
                    });
                }
                else {
                    testResults.push({
                        name: 'Types: Roles defined',
                        status: 'fail',
                        message: `Expected 8+, got ${roleCount}`,
                    });
                }
                if (queueCount >= 13) {
                    testResults.push({
                        name: `Types: All ${queueCount} queues defined`,
                        status: 'pass',
                    });
                }
                else {
                    testResults.push({
                        name: 'Types: Queues defined',
                        status: 'fail',
                        message: `Expected 13+, got ${queueCount}`,
                    });
                }
            }
            catch (error) {
                testResults.push({
                    name: 'Types: Import failed',
                    status: 'fail',
                    message: error instanceof Error ? error.message : 'Import error',
                });
            }
            // Test 4: Components export correctly
            try {
                const { CardiovascularDashboard, QueueManager, VisitDetail } = await Promise.resolve().then(() => __importStar(require('@/cardiology')));
                if (typeof CardiovascularDashboard === 'function') {
                    testResults.push({
                        name: 'Components: CardiovascularDashboard exported',
                        status: 'pass',
                    });
                }
                else {
                    testResults.push({
                        name: 'Components: CardiovascularDashboard exported',
                        status: 'fail',
                        message: 'Not a function',
                    });
                }
                if (typeof QueueManager === 'function') {
                    testResults.push({
                        name: 'Components: QueueManager exported',
                        status: 'pass',
                    });
                }
                else {
                    testResults.push({
                        name: 'Components: QueueManager exported',
                        status: 'fail',
                        message: 'Not a function',
                    });
                }
                if (typeof VisitDetail === 'function') {
                    testResults.push({
                        name: 'Components: VisitDetail exported',
                        status: 'pass',
                    });
                }
                else {
                    testResults.push({
                        name: 'Components: VisitDetail exported',
                        status: 'fail',
                        message: 'Not a function',
                    });
                }
            }
            catch (error) {
                testResults.push({
                    name: 'Components: Import failed',
                    status: 'fail',
                    message: error instanceof Error ? error.message : 'Import error',
                });
            }
            // Test 5: Design system exports
            try {
                const { Button, Card, Alert, Tabs, Input, Modal } = await Promise.resolve().then(() => __importStar(require('@/design-system')));
                if (typeof Button === 'function') {
                    testResults.push({
                        name: 'Design System: Core components exported',
                        status: 'pass',
                    });
                }
                else {
                    testResults.push({
                        name: 'Design System: Core components exported',
                        status: 'fail',
                        message: 'Missing components',
                    });
                }
            }
            catch (error) {
                testResults.push({
                    name: 'Design System: Import failed',
                    status: 'fail',
                    message: error instanceof Error ? error.message : 'Import error',
                });
            }
            setResults(testResults);
            setRunning(false);
        }
        runTests();
    }, []);
    const passed = results.filter((r) => r.status === 'pass').length;
    const failed = results.filter((r) => r.status === 'fail').length;
    return ((0, jsx_runtime_1.jsx)("div", { className: "space-y-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-lg border border-neutral-200 p-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-neutral-900 mb-4", children: "Integration Test Results" }), running ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" }), (0, jsx_runtime_1.jsx)("p", { className: "text-neutral-600", children: "Running tests..." })] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-3 gap-4 mb-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bg-primary-50 border border-primary-200 rounded-lg p-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-2xl font-bold text-primary-600", children: passed }), (0, jsx_runtime_1.jsx)("div", { className: "text-sm text-primary-700", children: "Passed" })] }), (0, jsx_runtime_1.jsxs)("div", { className: failed > 0 ? 'bg-critical-50 border border-critical-200 rounded-lg p-3' : 'bg-neutral-50 border border-neutral-200 rounded-lg p-3', children: [(0, jsx_runtime_1.jsx)("div", { className: `text-2xl font-bold ${failed > 0 ? 'text-critical-600' : 'text-neutral-600'}`, children: failed }), (0, jsx_runtime_1.jsx)("div", { className: `text-sm ${failed > 0 ? 'text-critical-700' : 'text-neutral-700'}`, children: "Failed" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-neutral-50 border border-neutral-200 rounded-lg p-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-2xl font-bold text-neutral-600", children: results.length }), (0, jsx_runtime_1.jsx)("div", { className: "text-sm text-neutral-700", children: "Total" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-2", children: results.map((result, i) => ((0, jsx_runtime_1.jsxs)("div", { className: `p-3 rounded border flex items-start gap-3 ${result.status === 'pass'
                                    ? 'bg-success-50 border-success-200'
                                    : 'bg-critical-50 border-critical-200'}`, children: [(0, jsx_runtime_1.jsx)("div", { className: "pt-0.5", children: result.status === 'pass' ? ((0, jsx_runtime_1.jsx)("div", { className: "text-lg text-success-600", children: "\u2713" })) : ((0, jsx_runtime_1.jsx)("div", { className: "text-lg text-critical-600", children: "\u2717" })) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1", children: [(0, jsx_runtime_1.jsx)("div", { className: `font-medium ${result.status === 'pass' ? 'text-success-900' : 'text-critical-900'}`, children: result.name }), result.message && ((0, jsx_runtime_1.jsx)("div", { className: `text-sm ${result.status === 'pass' ? 'text-success-700' : 'text-critical-700'}`, children: result.message }))] })] }, i))) }), (0, jsx_runtime_1.jsx)("div", { className: "mt-6 pt-6 border-t border-neutral-200", children: failed === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "bg-success-50 border border-success-200 rounded-lg p-4 text-success-900", children: [(0, jsx_runtime_1.jsx)("strong", { children: "\u2713 All integration tests passed!" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm mt-1", children: "Design system, types, and components are properly integrated." })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "bg-critical-50 border border-critical-200 rounded-lg p-4 text-critical-900", children: [(0, jsx_runtime_1.jsx)("strong", { children: "\u2717 Some tests failed" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm mt-1", children: "Check the errors above and review component exports." })] })) })] }))] }) }));
}
exports.default = CardiovascularTestRunner;
