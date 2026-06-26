"use strict";
/**
 * Cardiology Practice Domain Types
 *
 * FHIR-aligned interfaces for the cardiology workflow simulator.
 * These types bridge the API domain model with React component contracts.
 *
 * Key Design:
 * - All resources include FHIR resource IDs (`resourceId`) for potential FHIR export
 * - Timestamps are ISO 8601 strings
 * - Enums use SCREAMING_SNAKE_CASE to match domain constants
 * - Tenant scoping is always implicit (from session context)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainEventType = exports.QueueItemStatus = exports.QueueName = exports.ProcedureStatus = exports.CardiovascularProcedureType = exports.VisitPriority = exports.CardiovascularVisitState = exports.RoomType = exports.CardiologyRole = void 0;
// ─────────────────────────────────────────────────────────────────────────────
// Roles & Permission Model
// ─────────────────────────────────────────────────────────────────────────────
var CardiologyRole;
(function (CardiologyRole) {
    CardiologyRole["RECEPTIONIST"] = "RECEPTIONIST";
    CardiologyRole["NURSE"] = "NURSE";
    CardiologyRole["CARDIOLOGIST"] = "CARDIOLOGIST";
    CardiologyRole["TECHNICIAN"] = "TECHNICIAN";
    CardiologyRole["BILLING"] = "BILLING";
    CardiologyRole["ADMIN"] = "ADMIN";
    CardiologyRole["PATIENT"] = "PATIENT";
    CardiologyRole["SYSTEM"] = "SYSTEM";
})(CardiologyRole || (exports.CardiologyRole = CardiologyRole = {}));
// ─────────────────────────────────────────────────────────────────────────────
// Room & Physical Space Model
// ─────────────────────────────────────────────────────────────────────────────
var RoomType;
(function (RoomType) {
    RoomType["WAITING_ROOM"] = "WAITING_ROOM";
    RoomType["CHECK_IN_DESK"] = "CHECK_IN_DESK";
    RoomType["EXAM_ROOM"] = "EXAM_ROOM";
    RoomType["ECG_ROOM"] = "ECG_ROOM";
    RoomType["ECHO_LAB"] = "ECHO_LAB";
    RoomType["STRESS_TEST_LAB"] = "STRESS_TEST_LAB";
    RoomType["HOLTER_ROOM"] = "HOLTER_ROOM";
    RoomType["CONSULT_ROOM"] = "CONSULT_ROOM";
    RoomType["BLOOD_DRAW"] = "BLOOD_DRAW";
    RoomType["CHECKOUT_DESK"] = "CHECKOUT_DESK";
    RoomType["BILLING_OFFICE"] = "BILLING_OFFICE";
})(RoomType || (exports.RoomType = RoomType = {}));
// ─────────────────────────────────────────────────────────────────────────────
// Visit Lifecycle & State Machine (23 states)
// ─────────────────────────────────────────────────────────────────────────────
var CardiovascularVisitState;
(function (CardiovascularVisitState) {
    // Referral & Scheduling
    CardiovascularVisitState["REFERRAL_RECEIVED"] = "REFERRAL_RECEIVED";
    CardiovascularVisitState["SCHEDULING"] = "SCHEDULING";
    CardiovascularVisitState["APPOINTMENT_SCHEDULED"] = "APPOINTMENT_SCHEDULED";
    CardiovascularVisitState["APPOINTMENT_CONFIRMED"] = "APPOINTMENT_CONFIRMED";
    CardiovascularVisitState["PRE_VISIT_FORMS"] = "PRE_VISIT_FORMS";
    // Arrival & Check-in
    CardiovascularVisitState["PATIENT_ARRIVED"] = "PATIENT_ARRIVED";
    CardiovascularVisitState["CHECKING_IN"] = "CHECKING_IN";
    CardiovascularVisitState["CHECKED_IN"] = "CHECKED_IN";
    CardiovascularVisitState["IN_WAITING_ROOM"] = "IN_WAITING_ROOM";
    // Nursing Assessment
    CardiovascularVisitState["NURSING_ASSESSMENT"] = "NURSING_ASSESSMENT";
    CardiovascularVisitState["IN_EXAM_ROOM"] = "IN_EXAM_ROOM";
    // Physician Consultation
    CardiovascularVisitState["PHYSICIAN_PENDING"] = "PHYSICIAN_PENDING";
    CardiovascularVisitState["PHYSICIAN_WITH_PATIENT"] = "PHYSICIAN_WITH_PATIENT";
    CardiovascularVisitState["ORDERS_PLACED"] = "ORDERS_PLACED";
    // Procedures
    CardiovascularVisitState["PROCEDURE_QUEUED"] = "PROCEDURE_QUEUED";
    CardiovascularVisitState["IN_PROCEDURE"] = "IN_PROCEDURE";
    CardiovascularVisitState["PROCEDURE_COMPLETE"] = "PROCEDURE_COMPLETE";
    CardiovascularVisitState["RESULTS_READY"] = "RESULTS_READY";
    // Results Review & Discharge
    CardiovascularVisitState["RESULTS_REVIEW"] = "RESULTS_REVIEW";
    CardiovascularVisitState["CONSULTATION_COMPLETE"] = "CONSULTATION_COMPLETE";
    CardiovascularVisitState["CHECKING_OUT"] = "CHECKING_OUT";
    CardiovascularVisitState["CHECKOUT_COMPLETE"] = "CHECKOUT_COMPLETE";
    CardiovascularVisitState["BILLING_PENDING"] = "BILLING_PENDING";
    CardiovascularVisitState["FOLLOW_UP_SCHEDULED"] = "FOLLOW_UP_SCHEDULED";
    CardiovascularVisitState["DISCHARGED"] = "DISCHARGED";
    // Exceptional states
    CardiovascularVisitState["ON_HOLD"] = "ON_HOLD";
    CardiovascularVisitState["CANCELLED"] = "CANCELLED";
    CardiovascularVisitState["NO_SHOW"] = "NO_SHOW";
})(CardiovascularVisitState || (exports.CardiovascularVisitState = CardiovascularVisitState = {}));
var VisitPriority;
(function (VisitPriority) {
    VisitPriority[VisitPriority["URGENT"] = 0] = "URGENT";
    VisitPriority[VisitPriority["HIGH"] = 25] = "HIGH";
    VisitPriority[VisitPriority["NORMAL"] = 50] = "NORMAL";
    VisitPriority[VisitPriority["LOW"] = 75] = "LOW";
})(VisitPriority || (exports.VisitPriority = VisitPriority = {}));
// ─────────────────────────────────────────────────────────────────────────────
// Procedures & Diagnostics
// ─────────────────────────────────────────────────────────────────────────────
var CardiovascularProcedureType;
(function (CardiovascularProcedureType) {
    CardiovascularProcedureType["ECG"] = "ECG";
    CardiovascularProcedureType["ECHO"] = "ECHO";
    CardiovascularProcedureType["STRESS_TEST"] = "STRESS_TEST";
    CardiovascularProcedureType["HOLTER"] = "HOLTER";
})(CardiovascularProcedureType || (exports.CardiovascularProcedureType = CardiovascularProcedureType = {}));
var ProcedureStatus;
(function (ProcedureStatus) {
    ProcedureStatus["ORDERED"] = "ORDERED";
    ProcedureStatus["QUEUED"] = "QUEUED";
    ProcedureStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ProcedureStatus["COMPLETE"] = "COMPLETE";
    ProcedureStatus["RESULT_AVAILABLE"] = "RESULT_AVAILABLE";
})(ProcedureStatus || (exports.ProcedureStatus = ProcedureStatus = {}));
// ─────────────────────────────────────────────────────────────────────────────
// Work Queue Model (13 queues)
// ─────────────────────────────────────────────────────────────────────────────
var QueueName;
(function (QueueName) {
    QueueName["REFERRAL_REVIEW"] = "REFERRAL_REVIEW";
    QueueName["SCHEDULING"] = "SCHEDULING";
    QueueName["CHECK_IN"] = "CHECK_IN";
    QueueName["NURSING_ASSESSMENT"] = "NURSING_ASSESSMENT";
    QueueName["PHYSICIAN_CONSULT"] = "PHYSICIAN_CONSULT";
    QueueName["PROCEDURE_ECG"] = "PROCEDURE_ECG";
    QueueName["PROCEDURE_ECHO"] = "PROCEDURE_ECHO";
    QueueName["PROCEDURE_STRESS_TEST"] = "PROCEDURE_STRESS_TEST";
    QueueName["PROCEDURE_HOLTER"] = "PROCEDURE_HOLTER";
    QueueName["RESULTS_REVIEW"] = "RESULTS_REVIEW";
    QueueName["CHECKOUT"] = "CHECKOUT";
    QueueName["BILLING"] = "BILLING";
    QueueName["FOLLOW_UP_SCHEDULING"] = "FOLLOW_UP_SCHEDULING";
})(QueueName || (exports.QueueName = QueueName = {}));
var QueueItemStatus;
(function (QueueItemStatus) {
    QueueItemStatus["PENDING"] = "PENDING";
    QueueItemStatus["IN_PROGRESS"] = "IN_PROGRESS";
    QueueItemStatus["COMPLETED"] = "COMPLETED";
})(QueueItemStatus || (exports.QueueItemStatus = QueueItemStatus = {}));
// ─────────────────────────────────────────────────────────────────────────────
// Domain Events (Append-Only Log)
// ─────────────────────────────────────────────────────────────────────────────
var DomainEventType;
(function (DomainEventType) {
    DomainEventType["STATE_TRANSITION"] = "STATE_TRANSITION";
    DomainEventType["VITALS_RECORDED"] = "VITALS_RECORDED";
    DomainEventType["PROCEDURE_ORDERED"] = "PROCEDURE_ORDERED";
    DomainEventType["PROCEDURE_STARTED"] = "PROCEDURE_STARTED";
    DomainEventType["PROCEDURE_COMPLETED"] = "PROCEDURE_COMPLETED";
    DomainEventType["QUEUE_ITEM_CLAIMED"] = "QUEUE_ITEM_CLAIMED";
    DomainEventType["QUEUE_ITEM_COMPLETED"] = "QUEUE_ITEM_COMPLETED";
    DomainEventType["NOTES_ADDED"] = "NOTES_ADDED";
})(DomainEventType || (exports.DomainEventType = DomainEventType = {}));
