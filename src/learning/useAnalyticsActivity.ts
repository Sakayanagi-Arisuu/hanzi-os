import { useCallback, useEffect, useState } from "react";
import { parseMistakeQueue } from "../mistakes/mistakeProtocol";
import { parseAnalyticsActivity, type AnalyticsActivity } from "./analyticsActivity";

export function useAnalyticsActivity(accountKey: string | null, epoch: number | null, revision: number | undefined, enabled = true) {
  const scope = accountKey ? `${accountKey}:${epoch}` : null;
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(n => n + 1), []);
  const [result, setResult] = useState<{ owner: string; activity: AnalyticsActivity | null; openCount: number | null; occurrences: number | null; error: boolean } | null>(null);
  useEffect(() => {
    if (!accountKey || !enabled) return;
    const controller = new AbortController();
    const read = async (url: string) => {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
      if (!response.ok) throw new Error("unavailable");
      return response.json() as Promise<unknown>;
    };
    void Promise.allSettled([read("/api/learning/analytics"), read("/api/learning/mistakes")]).then(([activity, mistakes]) => {
      if (controller.signal.aborted) return;
      const parsed = activity.status === "fulfilled" ? parseAnalyticsActivity(activity.value) : null;
      const queue = mistakes.status === "fulfilled" ? parseMistakeQueue(mistakes.value) : null;
      setResult({ owner: scope!, activity: parsed, openCount: queue?.openCount ?? null,
        occurrences: queue ? queue.items.filter(item => !item.resolved).reduce((sum, item) => sum + item.occurrenceCount, 0) : null,
        error: !parsed || !queue });
    });
    return () => controller.abort();
  }, [accountKey, scope, revision, version, enabled]);
  useEffect(() => {
    window.addEventListener("focus", refresh);
    window.addEventListener("hanzi-access-recorded", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("hanzi-page-attempts-updated",refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("hanzi-access-recorded", refresh); window.removeEventListener("online", refresh); window.removeEventListener("hanzi-page-attempts-updated",refresh); };
  }, [refresh]);
  return { ...(result?.owner === scope ? result : { activity: null, openCount: null, occurrences: null, error: false }), refresh };
}
