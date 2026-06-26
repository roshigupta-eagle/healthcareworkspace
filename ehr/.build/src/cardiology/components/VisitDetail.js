'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitDetail = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Cardiovascular Visit Detail
 *
 * Comprehensive patient detail view for a single visit.
 * Shows vitals, history, orders, results, notes, and allowed state transitions.
 *
 * Features:
 * - Multi-tab interface (Vitals, History, Orders, Results, Notes)
 * - Vitals entry with clinical validation
 * - State transition UI with role-based access control
 * - FHIR resource links
 * - Real-time procedure status updates
 */
const react_1 = require("react");
const design_system_1 = require("@/design-system");
/**
 * Vital sign validation rules
 */
const validateVitals = (vitals) => {
    const errors = [];
    if (vitals.bpSystolic !== undefined) {
        if (vitals.bpSystolic < 0 || vitals.bpSystolic > 300) {
            errors.push('Systolic BP must be 0–300 mmHg');
        }
        else if (vitals.bpSystolic > 180) {
            errors.push('⚠️ Systolic BP is elevated (>180 mmHg)');
        }
        else if (vitals.bpSystolic < 90) {
            errors.push('⚠️ Systolic BP is low (<90 mmHg)');
        }
    }
    if (vitals.bpDiastolic !== undefined) {
        if (vitals.bpDiastolic < 0 || vitals.bpDiastolic > 200) {
            errors.push('Diastolic BP must be 0–200 mmHg');
        }
    }
    if (vitals.heartRateBpm !== undefined) {
        if (vitals.heartRateBpm < 0 || vitals.heartRateBpm > 200) {
            errors.push('Heart rate must be 0–200 bpm');
        }
        else if (vitals.heartRateBpm > 120) {
            errors.push('⚠️ Heart rate is elevated (>120 bpm)');
        }
        else if (vitals.heartRateBpm < 40) {
            errors.push('⚠️ Heart rate is low (<40 bpm)');
        }
    }
    if (vitals.oxygenSaturationPercent !== undefined) {
        if (vitals.oxygenSaturationPercent < 70 || vitals.oxygenSaturationPercent > 100) {
            errors.push('SpO₂ must be 70–100%');
        }
        else if (vitals.oxygenSaturationPercent < 90) {
            errors.push('❌ SpO₂ <90% — notify physician immediately');
        }
    }
    if (vitals.temperatureC !== undefined) {
        if (vitals.temperatureC < 35 || vitals.temperatureC > 42) {
            errors.push('Temperature must be 35–42°C');
        }
        else if (vitals.temperatureC > 39) {
            errors.push('⚠️ Fever detected (>39°C)');
        }
        else if (vitals.temperatureC < 36) {
            errors.push('⚠️ Hypothermia (<36°C)');
        }
    }
    return { valid: errors.filter((e) => e.startsWith('❌')).length === 0, errors };
};
const VisitDetail = ({ visit, currentUserRole, currentUserId, currentUserName, availableTransitions, onTransition, onVitalsRecorded, onClose, isOpen = true, }) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const [activeTabId, setActiveTabId] = (0, react_1.useState)('vitals');
    const [vitalsFormData, setVitalsFormData] = (0, react_1.useState)({});
    const [vitalsValidation, setVitalsValidation] = (0, react_1.useState)({
        valid: true,
        errors: [],
    });
    const [pendingTransition, setPendingTransition] = (0, react_1.useState)(null);
    const [isSubmittingTransition, setIsSubmittingTransition] = (0, react_1.useState)(false);
    const handleVitalsChange = (0, react_1.useCallback)((field, value) => {
        const numValue = value === '' ? undefined : parseFloat(value);
        const updated = Object.assign(Object.assign({}, vitalsFormData), { [field]: numValue });
        setVitalsFormData(updated);
        setVitalsValidation(validateVitals(updated));
    }, [vitalsFormData]);
    const handleSubmitVitals = (0, react_1.useCallback)(() => {
        const validation = validateVitals(vitalsFormData);
        if (!validation.valid) {
            setVitalsValidation(validation);
            return;
        }
        const vitals = Object.assign(Object.assign({}, vitalsFormData), { recordedAt: new Date().toISOString(), recordedBy: currentUserName });
        onVitalsRecorded === null || onVitalsRecorded === void 0 ? void 0 : onVitalsRecorded(vitals);
        setVitalsFormData({});
    }, [vitalsFormData, onVitalsRecorded, currentUserName]);
    const handleTransition = (0, react_1.useCallback)((transition) => {
        if (!transition.allowedForCurrentUser)
            return;
        setIsSubmittingTransition(true);
        const request = {
            event: transition.event,
            actorId: currentUserId,
            actorRole: currentUserRole,
            notes: undefined,
        };
        onTransition === null || onTransition === void 0 ? void 0 : onTransition(request);
        setTimeout(() => setIsSubmittingTransition(false), 500);
    }, [currentUserId, currentUserRole, onTransition]);
    if (!isOpen)
        return null;
    return ((0, jsx_runtime_1.jsx)(design_system_1.Modal, { open: isOpen, onClose: onClose || (() => { }), title: `Patient: ${visit.patientName}`, description: `MRN: ${visit.mrn} • DOB: ${visit.patientDOB}`, size: "lg", children: (0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsx)(design_system_1.Card, { variant: "outlined", className: "p-4 bg-blue-50 border-2 border-blue-200", children: (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-4 md:grid-cols-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "caption", className: "text-neutral-600 uppercase", children: "Current State" }), (0, jsx_runtime_1.jsx)(design_system_1.Badge, { variant: "info", size: "sm", className: "mt-1", children: visit.currentState })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "caption", className: "text-neutral-600 uppercase", children: "Priority" }), (0, jsx_runtime_1.jsx)(design_system_1.Badge, { variant: visit.priority === 0 ? 'critical' : visit.priority < 50 ? 'warning' : 'info', size: "sm", className: "mt-1", children: visit.priority === 0 ? 'URGENT' : visit.priority < 50 ? 'HIGH' : 'NORMAL' })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "caption", className: "text-neutral-600 uppercase", children: "Arrived" }), (0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "body-sm", className: "mt-1", children: visit.arrivedAt
                                            ? new Date(visit.arrivedAt).toLocaleTimeString()
                                            : 'Not yet arrived' })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "caption", className: "text-neutral-600 uppercase", children: "Room" }), (0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "body-sm", className: "mt-1", children: visit.currentRoomId || 'Not assigned' })] })] }) }), (0, jsx_runtime_1.jsx)(design_system_1.Tabs, { tabs: [
                        { id: 'vitals', label: 'Vitals', content: null },
                        { id: 'history', label: 'History', content: null },
                        { id: 'orders', label: 'Orders', content: null },
                        { id: 'results', label: 'Results', content: null },
                        { id: 'notes', label: 'Notes', content: null },
                    ], activeTab: activeTabId, onChange: setActiveTabId, variant: "underline" }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4", children: [activeTabId === 'vitals' && ((0, jsx_runtime_1.jsx)("div", { className: "space-y-4", children: (0, jsx_runtime_1.jsxs)(design_system_1.Card, { variant: "outlined", className: "p-4", children: [(0, jsx_runtime_1.jsx)("h4", { className: "font-semibold text-neutral-900 mb-4", children: "Record Vitals" }), vitalsValidation.errors.length > 0 && ((0, jsx_runtime_1.jsx)(design_system_1.Alert, { severity: vitalsValidation.valid ? 'warning' : 'critical', className: "mb-4", children: (0, jsx_runtime_1.jsx)("ul", { className: "space-y-1", children: vitalsValidation.errors.map((error) => ((0, jsx_runtime_1.jsx)("li", { className: "text-sm", children: error }, error))) }) })), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-4 md:grid-cols-3", children: [(0, jsx_runtime_1.jsx)(design_system_1.FormField, { label: "BP Systolic", hint: "mmHg", error: vitalsValidation.errors.find((e) => e.includes('Systolic')), children: (0, jsx_runtime_1.jsx)(design_system_1.Input, { type: "number", min: "0", max: "300", placeholder: "e.g. 130", value: (_a = vitalsFormData.bpSystolic) !== null && _a !== void 0 ? _a : '', onChange: (e) => handleVitalsChange('bpSystolic', e.target.value) }) }), (0, jsx_runtime_1.jsx)(design_system_1.FormField, { label: "BP Diastolic", hint: "mmHg", error: vitalsValidation.errors.find((e) => e.includes('Diastolic')), children: (0, jsx_runtime_1.jsx)(design_system_1.Input, { type: "number", min: "0", max: "200", placeholder: "e.g. 80", value: (_b = vitalsFormData.bpDiastolic) !== null && _b !== void 0 ? _b : '', onChange: (e) => handleVitalsChange('bpDiastolic', e.target.value) }) }), (0, jsx_runtime_1.jsx)(design_system_1.FormField, { label: "Heart Rate", hint: "bpm", error: vitalsValidation.errors.find((e) => e.includes('Heart rate')), children: (0, jsx_runtime_1.jsx)(design_system_1.Input, { type: "number", min: "0", max: "200", placeholder: "e.g. 72", value: (_c = vitalsFormData.heartRateBpm) !== null && _c !== void 0 ? _c : '', onChange: (e) => handleVitalsChange('heartRateBpm', e.target.value) }) }), (0, jsx_runtime_1.jsx)(design_system_1.FormField, { label: "SpO\u2082", hint: "%", error: vitalsValidation.errors.find((e) => e.includes('SpO₂')), children: (0, jsx_runtime_1.jsx)(design_system_1.Input, { type: "number", min: "70", max: "100", placeholder: "e.g. 98", value: (_d = vitalsFormData.oxygenSaturationPercent) !== null && _d !== void 0 ? _d : '', onChange: (e) => handleVitalsChange('oxygenSaturationPercent', e.target.value) }) }), (0, jsx_runtime_1.jsx)(design_system_1.FormField, { label: "Temperature", hint: "\u00B0C", error: vitalsValidation.errors.find((e) => e.includes('Temperature')), children: (0, jsx_runtime_1.jsx)(design_system_1.Input, { type: "number", min: "35", max: "42", step: "0.1", placeholder: "e.g. 37.2", value: (_e = vitalsFormData.temperatureC) !== null && _e !== void 0 ? _e : '', onChange: (e) => handleVitalsChange('temperatureC', e.target.value) }) }), (0, jsx_runtime_1.jsx)(design_system_1.FormField, { label: "RR", hint: "/min", children: (0, jsx_runtime_1.jsx)(design_system_1.Input, { type: "number", min: "0", max: "100", placeholder: "e.g. 16", value: (_f = vitalsFormData.respirationRate) !== null && _f !== void 0 ? _f : '', onChange: (e) => handleVitalsChange('respirationRate', e.target.value) }) })] }), (0, jsx_runtime_1.jsx)(design_system_1.Button, { variant: "primary", size: "sm", className: "mt-4", disabled: vitalsValidation.errors.filter((e) => e.startsWith('❌')).length > 0, onClick: handleSubmitVitals, children: "Save Vitals" }), visit.vitals && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4 pt-4 border-t border-neutral-200", children: [(0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "caption", className: "text-neutral-600 uppercase block mb-2", children: "Last Reading" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-2 md:grid-cols-4 text-sm", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("span", { className: "font-medium text-neutral-900", children: [visit.vitals.bpSystolic, "/", visit.vitals.bpDiastolic] }), (0, jsx_runtime_1.jsx)("span", { className: "text-neutral-600", children: " mmHg" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "font-medium text-neutral-900", children: visit.vitals.heartRateBpm }), (0, jsx_runtime_1.jsx)("span", { className: "text-neutral-600", children: " bpm" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "font-medium text-neutral-900", children: visit.vitals.oxygenSaturationPercent }), (0, jsx_runtime_1.jsx)("span", { className: "text-neutral-600", children: "%" })] }), (0, jsx_runtime_1.jsxs)(design_system_1.Text, { variant: "caption", className: "text-neutral-600", children: ["by ", visit.vitals.recordedBy] })] })] }))] }) })), activeTabId === 'history' && ((0, jsx_runtime_1.jsx)("div", { className: "space-y-4", children: (0, jsx_runtime_1.jsxs)(design_system_1.Card, { variant: "outlined", className: "p-4", children: [(0, jsx_runtime_1.jsx)("h4", { className: "font-semibold text-neutral-900 mb-3", children: "Medical History" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "label", className: "text-neutral-700", children: "Chief Complaint" }), (0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "body-sm", className: "text-neutral-600 mt-1", children: visit.chiefComplaint })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "label", className: "text-neutral-700", children: "New Patient" }), (0, jsx_runtime_1.jsx)(design_system_1.Badge, { variant: visit.isNewPatient ? 'warning' : 'info', size: "sm", className: "mt-1", children: visit.isNewPatient ? 'New' : 'Established' })] })] })] }) })), activeTabId === 'orders' && ((0, jsx_runtime_1.jsx)("div", { className: "space-y-4", children: visit.proceduresOrdered && visit.proceduresOrdered.length > 0 ? (visit.proceduresOrdered.map((proc) => ((0, jsx_runtime_1.jsx)(design_system_1.Card, { variant: "outlined", className: "p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "label", className: "text-neutral-900", children: proc.procedureType }), (0, jsx_runtime_1.jsxs)(design_system_1.Text, { variant: "body-sm", className: "text-neutral-600 mt-1", children: ["Ordered by ", proc.orderedBy] })] }), (0, jsx_runtime_1.jsx)(design_system_1.Badge, { variant: proc.status === 'COMPLETE' || proc.status === 'RESULT_AVAILABLE'
                                                ? 'info'
                                                : 'warning', size: "sm", children: proc.status })] }) }, proc.id)))) : ((0, jsx_runtime_1.jsx)(design_system_1.Alert, { severity: "info", children: "No procedures ordered yet." })) })), activeTabId === 'results' && ((0, jsx_runtime_1.jsx)("div", { className: "space-y-4", children: ((_g = visit.proceduresOrdered) === null || _g === void 0 ? void 0 : _g.filter((p) => p.status === 'RESULT_AVAILABLE').length) ? (visit.proceduresOrdered
                                .filter((p) => p.status === 'RESULT_AVAILABLE')
                                .map((proc) => ((0, jsx_runtime_1.jsxs)(design_system_1.Card, { variant: "outlined", className: "p-4", children: [(0, jsx_runtime_1.jsxs)(design_system_1.Text, { variant: "label", className: "text-neutral-900 block", children: [proc.procedureType, " Results"] }), (0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "body-sm", className: "text-neutral-600 mt-2", children: proc.findings || 'No findings documented' }), proc.criticalFindings && ((0, jsx_runtime_1.jsx)(design_system_1.Alert, { severity: "critical", className: "mt-3", children: "\u26A0\uFE0F Critical findings \u2014 notify physician immediately" }))] }, proc.id)))) : ((0, jsx_runtime_1.jsx)(design_system_1.Alert, { severity: "info", children: "No results available yet." })) })), activeTabId === 'notes' && ((0, jsx_runtime_1.jsxs)(design_system_1.Card, { variant: "outlined", className: "p-4", children: [(0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "label", className: "text-neutral-900 block mb-2", children: "Notes" }), (0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "body-sm", className: "text-neutral-600", children: visit.notes || 'No notes recorded' })] }))] }), (0, jsx_runtime_1.jsxs)(design_system_1.Card, { variant: "outlined", className: "p-4 border-l-4 border-l-primary-600", children: [(0, jsx_runtime_1.jsx)("h4", { className: "font-semibold text-neutral-900 mb-3", children: "Next Actions" }), availableTransitions.length === 0 ? ((0, jsx_runtime_1.jsx)(design_system_1.Text, { variant: "body-sm", className: "text-neutral-600", children: "No allowed transitions from current state." })) : ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-2", children: availableTransitions.map((transition) => ((0, jsx_runtime_1.jsx)(design_system_1.Button, { variant: transition.allowedForCurrentUser ? 'primary' : 'ghost', size: "sm", disabled: !transition.allowedForCurrentUser || isSubmittingTransition, loading: isSubmittingTransition, onClick: () => handleTransition(transition), title: transition.reason, children: transition.event }, transition.event))) }))] })] }) }));
};
exports.VisitDetail = VisitDetail;
