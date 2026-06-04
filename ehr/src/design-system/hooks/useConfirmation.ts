'use client';

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

import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseConfirmationOptions {
  /** Called when the user confirms the action */
  onConfirm: () => void | Promise<void>;
  /** Auto-cancel timeout in ms (default: 10000 — 10 seconds) */
  timeout?: number;
  /** Called when the confirmation is cancelled or times out */
  onCancel?: () => void;
}

export interface UseConfirmationResult {
  /** Whether confirmation has been requested (second-step UI should show) */
  requested: boolean;
  /** Step 1: Request confirmation — triggers the confirmation UI */
  request: () => void;
  /** Step 2: Execute the action */
  confirm: () => void;
  /** Dismiss the confirmation without executing */
  cancel: () => void;
}

export function useConfirmation({
  onConfirm,
  timeout = 10_000,
  onCancel,
}: UseConfirmationOptions): UseConfirmationResult {
  const [requested, setRequested] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    clearTimer();
    setRequested(false);
    onCancel?.();
  }, [clearTimer, onCancel]);

  const request = useCallback(() => {
    setRequested(true);
    clearTimer();
    if (timeout > 0) {
      timerRef.current = setTimeout(() => {
        setRequested(false);
        onCancel?.();
      }, timeout);
    }
  }, [clearTimer, timeout, onCancel]);

  const confirm = useCallback(() => {
    clearTimer();
    setRequested(false);
    void Promise.resolve(onConfirm());
  }, [clearTimer, onConfirm]);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  return { requested, request, confirm, cancel };
}
