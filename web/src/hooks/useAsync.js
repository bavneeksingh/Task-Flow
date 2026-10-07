import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs an async function and tracks { data, error, loading }.
 * Re-runs when `deps` change. If a slow older request finishes after a newer one
 * (easy to hit when typing in a search box), its result is ignored.
 */
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const latest = useRef(0);

  const run = useCallback(() => {
    const id = ++latest.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then(
      (data) => id === latest.current && setState({ data, error: null, loading: false }),
      (error) => id === latest.current && setState((s) => ({ data: s.data, error, loading: false }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => {
      latest.current++; // ignore results that arrive after unmount / dependency change
    };
  }, [run]);

  return { ...state, reload: run };
}

export function useDebounce(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
