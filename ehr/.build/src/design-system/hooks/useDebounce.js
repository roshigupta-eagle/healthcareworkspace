'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDebounce = useDebounce;
/**
 * Layer 6 — Hook: useDebounce
 *
 * Returns a debounced version of `value` that only updates after
 * `delay` ms of inactivity. Essential for clinical search fields and
 * real-time validation that should not fire on every keystroke
 * (e.g. MRN lookup, medication search, drug-interaction check).
 *
 * Usage:
 *   const debouncedQuery = useDebounce(searchQuery, 300);
 *   useEffect(() => { fetchResults(debouncedQuery); }, [debouncedQuery]);
 */
const react_1 = require("react");
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = (0, react_1.useState)(value);
    (0, react_1.useEffect)(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}
