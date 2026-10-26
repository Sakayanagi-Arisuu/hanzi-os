import { useCallback, useEffect, useSyncExternalStore } from "react";

export const createPublishedRuntimeStore = <T,>(
  empty: T,
  load: (fetcher?: typeof fetch) => Promise<T>,
) => {
  type State = { status: "loading" | "ready" | "fallback"; value: T };
  const initial: State = { status: "loading", value: empty };
  const listeners = new Set<() => void>();
  let snapshot = initial;
  let activeRequest: Promise<void> | null = null;
  const update = (next: State) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const refresh = (fetcher: typeof fetch = fetch) => {
    if (activeRequest) return activeRequest;
    activeRequest = load(fetcher).then(
      (value) => update({ status: "ready", value }),
      () => update({ status: "fallback", value: snapshot.value }),
    ).finally(() => {
      activeRequest = null;
    });
    return activeRequest;
  };
  const useStore = () => {
    const state = useSyncExternalStore(subscribe, () => snapshot, () => initial);
    useEffect(() => {
      const wake = () => { void refresh(); };
      wake();
      window.addEventListener('online', wake);
      const timer = window.setInterval(wake, 300_000);
      return () => { window.removeEventListener('online', wake); window.clearInterval(timer); };
    }, []);
    const retry = useCallback(() => { void refresh(); }, []);
    return { ...state, retry };
  };
  return {
    getSnapshot: () => snapshot,
    refresh,
    reset: () => {
      snapshot = initial;
      activeRequest = null;
    },
    useStore,
  };
};
