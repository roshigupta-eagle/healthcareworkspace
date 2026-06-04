'use client';

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

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
