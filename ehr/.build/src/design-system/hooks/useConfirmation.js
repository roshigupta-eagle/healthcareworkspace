'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useConfirmation = useConfirmation;
/**
 * Layer 6 — Hook: useConfirmation
 *
 * Manages a two-step confirmation flow for irreversible clinical actions.
 * Prevents accidental execution of destructive operations by requiring
 * an explicit secondary confirmation.
 *
 * Pattern: request → confirm (within timeout) → execute
 *           request → timeout / cancel → idle
 *
 * Clinical use cases:
 *  - Discontinue a medication order
 *  - Discharge or transfer a patient
 *  - Delete a clinical note
 *  - Override a critical clinical alert
 *  - Administer a high-alert medication
 *
 * Usage:
 *   const { requested, request, confirm, cancel } = useConfirmation({
 *     onConfirm: () => discontinueMedication(orderId),
 *     timeout: 8000,  // auto-cancel after 8s if not confirmed
 *   });
 *
 *   return requested ? (
 *     <div>
 *       <p>Are you sure? This cannot be undone.</p>
 *       <Button variant="destructive" onClick={confirm}>Yes, discontinue</Button>
 *       <Button variant="ghost" onClick={cancel}>Cancel</Button>
 *     </div>
 *   ) : (
 *     <Button variant="destructive" onClick={request}>Discontinue</Button>
 *   );
 */
const react_1 = require("react");
function useConfirmation({ onConfirm, timeout = 10000, onCancel, }) {
    const [requested, setRequested] = (0, react_1.useState)(false);
    const timerRef = (0, react_1.useRef)(null);
    const clearTimer = (0, react_1.useCallback)(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);
    const cancel = (0, react_1.useCallback)(() => {
        clearTimer();
        setRequested(false);
        onCancel === null || onCancel === void 0 ? void 0 : onCancel();
    }, [clearTimer, onCancel]);
    const request = (0, react_1.useCallback)(() => {
        setRequested(true);
        clearTimer();
        if (timeout > 0) {
            timerRef.current = setTimeout(() => {
                setRequested(false);
                onCancel === null || onCancel === void 0 ? void 0 : onCancel();
            }, timeout);
        }
    }, [clearTimer, timeout, onCancel]);
    const confirm = (0, react_1.useCallback)(() => {
        clearTimer();
        setRequested(false);
        void Promise.resolve(onConfirm());
    }, [clearTimer, onConfirm]);
    // Cleanup on unmount
    (0, react_1.useEffect)(() => () => clearTimer(), [clearTimer]);
    return { requested, request, confirm, cancel };
}
