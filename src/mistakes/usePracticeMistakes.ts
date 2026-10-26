import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveOwnerLearningScope } from '../sync/indexedDb';
import { currentWorkspaceScope, readWorkspace, saveWorkspaceChanges, WORKSPACE_CHANGED } from '../sync/workspaceSync';
import { collectPracticeMistakes, savePracticeMistakes, type PracticeMistake } from './practiceMistakes';
import { offlineRead } from '../sync/offlineRead';
import type { RemediationObservatoryFeedback, RemediationObservatoryItem } from './remediationObservatory';

export function usePracticeMistakes(ownerKey: string, authenticated = false, enabled = true) {
  const [entries, setEntries] = useState<ReturnType<typeof collectPracticeMistakes>>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteReady, setRemoteReady] = useState(!authenticated);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [scopeVersion, setScopeVersion] = useState(0);
  const [remoteVersion, setRemoteVersion] = useState(0);
  useEffect(() => {
    if (!enabled || !authenticated) return;
    const retry = () => setRemoteVersion(value => value + 1);
    window.addEventListener('online', retry); window.addEventListener('focus', retry);
    return () => { window.removeEventListener('online', retry); window.removeEventListener('focus', retry); };
  }, [enabled, authenticated]);
  useEffect(() => {
    const reset = () => setScopeVersion(value => value + 1);
    window.addEventListener('hanzi-learning-reset', reset);
    return () => window.removeEventListener('hanzi-learning-reset', reset);
  }, []);
  const loadedScope = useRef<ActiveOwnerLearningScope | null>(null);
  const submissions = useRef(new Map<string, { answer: string; usedHint: boolean; occurredAt: string }>());
  const load = useCallback(async () => {
    const scope = await currentWorkspaceScope(ownerKey);
    if (!scope) throw new Error('Learning owner changed');
    const result = collectPracticeMistakes((await readWorkspace(scope)).entries);
    loadedScope.current = scope;
    return result;
  }, [ownerKey]);
  useEffect(() => {
    if (!enabled || !ownerKey) return;
    let active = true;
    setReady(false);
    const refresh = () => { void load().then(value => {
      if (active) { setEntries(value); setReady(true); setError(null); }
    }).catch(() => { if (active) setError('Chưa đọc được câu sai từ các phiên luyện. Hãy tải lại để thử lại.'); }); };
    refresh();
    window.addEventListener(WORKSPACE_CHANGED, refresh);
    window.addEventListener('hanzi-workspace-received', refresh);
    return () => { active = false; window.removeEventListener(WORKSPACE_CHANGED, refresh); window.removeEventListener('hanzi-workspace-received', refresh); };
  }, [load, enabled, ownerKey, scopeVersion]);
  useEffect(() => {
    if (!enabled || !ownerKey) return;
    if (!authenticated) { setRemoteReady(true); setRemoteError(null); return; }
    setRemoteReady(false);
    setRemoteError(null);
    const controller = new AbortController();
    void (async () => {
      const scope = await currentWorkspaceScope(ownerKey);
      if (!scope) throw new Error('Owner changed');
      const response = await offlineRead('/api/learning/practice-mistakes', { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Practice history unavailable');
      const history = await response.json() as { protocolVersion: number; resetEpoch: number; items: PracticeMistake[] };
      if (history.protocolVersion !== 1 || history.resetEpoch !== scope.resetEpoch || !Array.isArray(history.items)) throw new Error('Practice history changed');
      if (controller.signal.aborted) return;
      await savePracticeMistakes(scope, history.items);
      const current = await load();
      if (!controller.signal.aborted) { setEntries(current); setRemoteReady(response.headers.get('x-hanzi-offline') !== '1'); }
    })().catch(() => { if (!controller.signal.aborted) setRemoteError('Chưa tải được đầy đủ câu sai từ khảo nghiệm. Kết nối lại rồi mở lại Nghịch Cảnh Lục để thử lại.'); });
    return () => controller.abort();
  }, [ownerKey, authenticated, enabled, load, scopeVersion, remoteVersion]);
  const submit = async (item: RemediationObservatoryItem, answer: string, usedHint: boolean): Promise<RemediationObservatoryFeedback> => {
    const entry = entries.find(candidate => candidate.item.id === item.id);
    const scope = await currentWorkspaceScope(ownerKey);
    if (!entry || !scope) throw new Error('Lượt luyện đã thay đổi. Hãy mở lại Nghịch Cảnh Lục.');
    if (loadedScope.current?.ownerGeneration.ownerKey !== scope.ownerGeneration.ownerKey
      || loadedScope.current.ownerGeneration.generation !== scope.ownerGeneration.generation
      || loadedScope.current.resetEpoch !== scope.resetEpoch) throw new Error('Tiến độ đã thay đổi. Hãy mở lại lượt luyện.');
    const correct = answer.trim().normalize('NFC') === entry.source.answer.trim().normalize('NFC');
    let submission = submissions.current.get(item.id);
    if (!submission || submission.answer !== answer || submission.usedHint !== usedHint) {
      submission = { answer, usedHint, occurredAt: new Date().toISOString() };
      submissions.current.set(item.id, submission);
    }
    try {
      await saveWorkspaceChanges(scope, [{ key: item.id.replace('practice.mistake:', 'practice.correction:'),
        value: { originAt: entry.source.occurredAt, ...(entry.source.originId ? { originId: entry.source.originId } : {}),
          activityId: entry.source.activityId, activityVersion: entry.source.activityVersion,
          correct, usedHint, occurredAt: submission.occurredAt } }]);
    } catch (caught) {
      setError('Chưa lưu được lượt luyện. Hãy giữ màn hình mở và thử lại.');
      throw caught;
    }
    setEntries(await load());
    submissions.current.delete(item.id);
    return { outcome: correct ? 'correct' : 'incorrect', resolved: correct && !usedHint, answer, usedHint,
      correctAnswer: entry.source.answer, explanation: entry.source.explanation };
  };
  return { items: entries.map(entry => entry.item), localReady: ready, ready: ready && remoteReady,
    error: error ?? remoteError ?? (authenticated && !remoteReady ? 'Các câu sai từ khảo nghiệm chưa được xác nhận đầy đủ. Hệ thống sẽ thử lại khi kết nối.' : null), submit };
}
