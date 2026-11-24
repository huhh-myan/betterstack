"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface QueryState<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
}

/**
 * Minimal fetch-on-mount hook. Re-runs when `key` changes and every
 * `refreshMs` (to pick up new checks), and exposes `reload`.
 */
export function useQuery<T>(key: string | null, fn: () => Promise<T>, refreshMs?: number) {
  const [state, setState] = useState<QueryState<T>>({ data: undefined, error: null, loading: true });
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  const run = useCallback(async () => {
    if (key === null) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await fnRef.current();
      setState({ data, error: null, loading: false });
    } catch (e) {
      setState((s) => ({ ...s, error: e as Error, loading: false }));
    }
  }, [key]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching on mount is the point
    void run();
    if (!refreshMs) return;
    const id = setInterval(run, refreshMs);
    return () => clearInterval(id);
  }, [run, refreshMs]);

  return { ...state, reload: run };
}
