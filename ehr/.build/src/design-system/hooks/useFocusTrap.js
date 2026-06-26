'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFocusTrap = useFocusTrap;
/**
 * Layer 6 — Hook: useFocusTrap
 *
 * Traps keyboard focus within a container element while active.
 * Used by Modal and ClinicalAlert to prevent focus from escaping to
 * background content — required for WCAG 2.1 SC 2.1.2 (No Keyboard Trap)
 * and SC 1.3.1 (Info and Relationships).
 *
 * The trap:
 *  1. Finds all focusable elements within `containerRef`
 *  2. Intercepts Tab / Shift+Tab to cycle within the set
 *  3. Moves focus to the first focusable element on activation
 *  4. Restores focus to the trigger element on deactivation
 */
const react_1 = require("react");
const FOCUSABLE_SELECTORS = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
].join(', ');
function useFocusTrap(containerRef, active) {
    const previousFocusRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!active)
            return;
        // Save the element that triggered the trap
        previousFocusRef.current = document.activeElement;
        const container = containerRef.current;
        if (!container)
            return;
        // Move focus into the trap
        const first = container.querySelectorAll(FOCUSABLE_SELECTORS)[0];
        first === null || first === void 0 ? void 0 : first.focus();
        const handleKeyDown = (e) => {
            if (e.key !== 'Tab')
                return;
            const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).filter((el) => !el.closest('[aria-hidden="true"]'));
            if (focusable.length === 0) {
                e.preventDefault();
                return;
            }
            const firstEl = focusable[0];
            const lastEl = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === firstEl) {
                    e.preventDefault();
                    lastEl.focus();
                }
            }
            else {
                if (document.activeElement === lastEl) {
                    e.preventDefault();
                    firstEl.focus();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            var _a;
            document.removeEventListener('keydown', handleKeyDown);
            // Restore focus on deactivation
            (_a = previousFocusRef.current) === null || _a === void 0 ? void 0 : _a.focus();
        };
    }, [active, containerRef]);
}
