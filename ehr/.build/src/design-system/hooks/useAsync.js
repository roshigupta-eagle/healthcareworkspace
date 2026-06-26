'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAsync = useAsync;
/**
 * Layer 6 — Hook: useAsync
 *
 * Manages the full lifecycle of an async operation: idle → loading →
 * success | error. Returns stable state for rendering.
 *
 * Healthcare use cases:
 *  - Patient lookup by MRN
 *  - Medication search / drug interaction check
 *  - Lab result fetch
 *  - FHIR resource submission
 *
 * Usage:
 *   const { execute, status, data, error } = useAsync(fetchPatient);
 *   await execute(mrn);  // triggers the async fn with given args
 */
const react_1 = require("react");
const initialState = () => ({
    status: 'idle',
    data: null,
    error: null,
});
function useAsync(asyncFn) {
    const [state, setState] = (0, react_1.useState)(initialState());
    // Tracks whether the component is still mounted to avoid setState on unmount
    const mountedRef = (0, react_1.useRef)(true);
    // Track mounted state
    (0, react_1.useState)(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    });
    const execute = (0, react_1.useCallback)(async (...args) => {
        setState({ status: 'loading', data: null, error: null });
        try {
            const result = await asyncFn(...args);
            if (mountedRef.current) {
                setState({ status: 'success', data: result, error: null });
            }
            return result;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (mountedRef.current) {
                setState({ status: 'error', data: null, error });
            }
            return null;
        }
    }, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [asyncFn]);
    const reset = (0, react_1.useCallback)(() => setState(initialState()), []);
    return Object.assign(Object.assign({}, state), { execute,
        reset, isIdle: state.status === 'idle', isLoading: state.status === 'loading', isSuccess: state.status === 'success', isError: state.status === 'error' });
}
