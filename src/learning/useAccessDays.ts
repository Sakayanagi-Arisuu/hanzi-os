import { useEffect } from "react";
import { accessDay } from "./analyticsActivity";

const GUEST_ACCESS_KEY = "hanzi-os-guest-access-days-v1";
export function readGuestAccessDays(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(GUEST_ACCESS_KEY) ?? "[]");
    return Array.isArray(value) ? [...new Set(value.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)))] : [];
  } catch { return []; }
}

/** Track visible website use, once per day, across all learner routes. */
export function useAccessDays(accountKey: string | null | undefined, resolved: boolean) {
  useEffect(() => {
    if (!resolved) return;
    let recorded = "";
    let pending = false;
    const controller = new AbortController();
    const record = async () => {
      const day = accessDay();
      if (document.visibilityState !== "visible" || recorded === day || pending) return;
      pending = true;
      try {
        if (accountKey) {
          const response = await fetch("/api/learning/analytics", { method: "POST", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
          if (!response.ok) return;
        } else {
          localStorage.setItem(GUEST_ACCESS_KEY, JSON.stringify([...new Set([...readGuestAccessDays(), day])]));
        }
        recorded = day;
        window.dispatchEvent(new Event("hanzi-access-recorded"));
      } catch { /* Retry on next visible tick; never interrupt learning. */ }
      finally { pending = false; }
    };
    void record();
    const onVisible = () => { void record(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const timer = window.setInterval(onVisible, 60_000);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onVisible); };
  }, [accountKey, resolved]);
}
