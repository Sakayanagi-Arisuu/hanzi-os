import { useCallback, useEffect, useState } from "react";
import { offlineRead } from '../sync/offlineRead';
import { parseMistakeQueue } from "../mistakes/mistakeProtocol";
import { parseAnalyticsActivity, type AnalyticsActivity } from "./analyticsActivity";
import { currentWorkspaceScope, readWorkspace } from '../sync/workspaceSync';
import { readPageAttemptOutbox } from '../sync/pageAttemptOutbox';
import { listLearningCommandRecords, LEARNING_COMMAND_QUEUE_CHANGED_EVENT } from '../sync/learningCommandOutbox';
import { WORKSPACE_CHANGED } from '../sync/workspaceSync';

export function useAnalyticsActivity(accountKey: string | null, epoch: number | null, revision: number | undefined, enabled = true) {
  const scope = accountKey ? `${accountKey}:${epoch}` : null;
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(n => n + 1), []);
  const [result, setResult] = useState<{ owner: string; activity: AnalyticsActivity | null; openCount: number | null; occurrences: number | null; error: boolean } | null>(null);
  useEffect(() => {
    if (!accountKey || !enabled) return;
    const controller = new AbortController();
    const read = async (url: string) => {
      const response = await offlineRead(url, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
      if (!response.ok) throw new Error("unavailable");
      return response.json() as Promise<unknown>;
    };
    void Promise.allSettled([read("/api/learning/analytics"), read("/api/learning/mistakes")]).then(async ([activity, mistakes]) => {
      if (controller.signal.aborted) return;
      const parsed = activity.status === "fulfilled" ? parseAnalyticsActivity(activity.value) : null;
      let hasPending = true;
      try {
        const workspaceScope = await currentWorkspaceScope(accountKey);
        if (workspaceScope) {
          hasPending = (await readPageAttemptOutbox(workspaceScope)).some(record => record.delivery?.status !== 'acknowledged')
            || (await listLearningCommandRecords(workspaceScope.ownerGeneration)).some(record => record.resetEpoch === workspaceScope.resetEpoch
              && record.status !== 'acknowledged' && (record.kind === 'objective-attempt' || record.kind === 'review-grade'));
          const workspace = await readWorkspace(workspaceScope);
          const days = workspace.entries.filter(entry => /^access:\d{4}-\d{2}-\d{2}$/.test(entry.key) && entry.value !== null).map(entry => entry.key.slice(7));
          if (parsed) parsed.accessDays = [...new Set([...parsed.accessDays, ...days])].sort();
        }
      } catch { /* Server analytics remain usable if device storage is unavailable. */ }
      if (controller.signal.aborted) return;
      const queue = mistakes.status === "fulfilled" ? parseMistakeQueue(mistakes.value) : null;
      setResult({ owner: scope!, activity: parsed, openCount: hasPending ? null : queue?.openCount ?? null,
        occurrences: queue ? queue.items.filter(item => !item.resolved).reduce((sum, item) => sum + item.occurrenceCount, 0) : null,
        error: !parsed || !queue });
    });
    return () => controller.abort();
  }, [accountKey, scope, revision, version, enabled]);
  useEffect(() => {
    window.addEventListener("focus", refresh);
    window.addEventListener("hanzi-access-recorded", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener('hanzi-workspace-received', refresh);
    window.addEventListener("hanzi-page-attempts-updated",refresh);
    window.addEventListener(LEARNING_COMMAND_QUEUE_CHANGED_EVENT, refresh);
    window.addEventListener(WORKSPACE_CHANGED, refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("hanzi-access-recorded", refresh); window.removeEventListener("online", refresh); window.removeEventListener("hanzi-page-attempts-updated",refresh); window.removeEventListener('hanzi-workspace-received', refresh);
      window.removeEventListener(LEARNING_COMMAND_QUEUE_CHANGED_EVENT, refresh); window.removeEventListener(WORKSPACE_CHANGED, refresh); };
  }, [refresh]);
  return { ...(result?.owner === scope ? result : { activity: null, openCount: null, occurrences: null, error: false }), refresh };
}
