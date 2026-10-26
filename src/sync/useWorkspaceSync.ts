import { useEffect } from 'react';
import { currentWorkspaceScope, syncWorkspace, WORKSPACE_CHANGED } from './workspaceSync';
import { syncMockPractice } from './offlineMockPractice';
import { MOCK_PRACTICE_CHANGED } from '../assessment/offlineMockPractice';
import { flushInteractionXp, XP_QUEUE_CHANGED } from './offlineInteractionXp';
import { flushIndependentQueues } from './flushIndependentQueues';
export function useWorkspaceSync(ownerKey: string | null) {
  useEffect(() => {
    if (!ownerKey) return;
    const controller = new AbortController();
    let running = false;
    const run = async () => {
      if (running || !navigator.onLine || controller.signal.aborted) return;
      running = true;
      try {
        const scope = await currentWorkspaceScope(ownerKey);
        if (scope) {
          await flushIndependentQueues([
            () => flushInteractionXp(scope, AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)])),
            () => syncMockPractice(scope, AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)])),
            () => syncWorkspace(scope, AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)])),
          ]);
        }
      } catch { /* Keep the journal for reconnect, sign-in or conflict resolution. */ }
      finally { running = false; }
    };
    const wake = () => { void run(); };
    wake();
    const timer = window.setInterval(wake, 30_000);
    window.addEventListener('online', wake); window.addEventListener('focus', wake); window.addEventListener(WORKSPACE_CHANGED, wake);
    window.addEventListener(MOCK_PRACTICE_CHANGED, wake);
    window.addEventListener(XP_QUEUE_CHANGED, wake);
    return () => { controller.abort(); window.clearInterval(timer);
      window.removeEventListener('online', wake); window.removeEventListener('focus', wake); window.removeEventListener(WORKSPACE_CHANGED, wake);
      window.removeEventListener(MOCK_PRACTICE_CHANGED, wake); window.removeEventListener(XP_QUEUE_CHANGED, wake); };
  }, [ownerKey]);
}
