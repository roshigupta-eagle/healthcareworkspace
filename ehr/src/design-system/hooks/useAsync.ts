'use client';

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

import { useState, useCallback, useRef } from 'react';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  status: AsyncStatus;
  data:   T | null;
  error:  Error | null;
}

export interface UseAsyncResult<T, Args extends unknown[]> extends AsyncState<T> {
  execute: (...args: Args) => Promise<T | null>;
  reset:   () => void;
  isIdle:    boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError:   boolean;
}

const initialState = <T>(): AsyncState<T> => ({
  status: 'idle',
  data:   null,
  error:  null,
});

export function useAsync<T, Args extends unknown[] = []>(
  asyncFn: (...args: Args) => Promise<T>,
): UseAsyncResult<T, Args> {
  const [state, setState] = useState<AsyncState<T>>(initialState<T>());
  // Tracks whether the component is still mounted to avoid setState on unmount
  const mountedRef = useRef(true);

  // Track mounted state
  useState(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  });

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState({ status: 'loading', data: null, error: null });
      try {
        const result = await asyncFn(...args);
        if (mountedRef.current) {
          setState({ status: 'success', data: result, error: null });
        }
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (mountedRef.current) {
          setState({ status: 'error', data: null, error });
        }
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [asyncFn],
  );

  const reset = useCallback(() => setState(initialState<T>()), []);

  return {
    ...state,
    execute,
    reset,
    isIdle:    state.status === 'idle',
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError:   state.status === 'error',
  };
}
