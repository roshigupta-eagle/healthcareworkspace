'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAnnouncer = useAnnouncer;
/**
 * Layer 6 — Hook: useAnnouncer
 *
 * Manages an ARIA live region for programmatic announcements to
 * screen readers. Prevents duplicate announcements with debouncing.
 *
 * Usage:
 *   const { announce } = useAnnouncer();
 *   announce('Patient saved successfully');   // polite
 *   announce('Critical alert: high potassium', 'assertive');
 *
 * The live region element is created once and injected into the body.
 * Multiple `useAnnouncer` instances share the same singleton regions.
 */
const react_1 = require("react");
const REGION_ID = {
    polite: 'ds-announcer-polite',
    assertive: 'ds-announcer-assertive',
};
function getOrCreateRegion(politeness) {
    const id = REGION_ID[politeness];
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', politeness);
        el.setAttribute('aria-atomic', 'true');
        el.setAttribute('aria-relevant', 'additions text');
        // Visually hidden but accessible to screen readers
        Object.assign(el.style, {
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            whiteSpace: 'nowrap',
            border: '0',
        });
        document.body.appendChild(el);
    }
    return el;
}
function useAnnouncer() {
    const timeoutRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        return () => {
            if (timeoutRef.current)
                clearTimeout(timeoutRef.current);
        };
    }, []);
    const announce = (0, react_1.useCallback)((message, politeness = 'polite') => {
        if (typeof document === 'undefined')
            return;
        const region = getOrCreateRegion(politeness);
        // Clear first so repeat messages are re-announced
        region.textContent = '';
        if (timeoutRef.current)
            clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            region.textContent = message;
        }, 50);
    }, []);
    return { announce };
}
