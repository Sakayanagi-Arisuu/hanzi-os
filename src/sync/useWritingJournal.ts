import { useCallback, useEffect, useRef, useState } from 'react';
import { parseCharacterForgeSession, type CharacterForgeSession } from '../characters/characterForgeSession';
import { getCharacterForgeSessionStorageKey } from '../lib/storageKeys';
import type { ActivityHistoryInput } from '../learning/activityHistory';
import type { ReleasedCharacterPracticeEntry } from '../learning/richLessonContent';
import type { ActiveOwnerLearningScope } from './indexedDb';
import { currentWorkspaceScope, WORKSPACE_CHANGED } from './workspaceSync';
import { readWritingSession, startWritingSession, updateWritingSession, recordWritingResponse, writingSourceVersion, writingChangeNeedsCommit, type WritingSession } from './writingSession';

export function useWritingJournal(ownerKey: string, contentVersion: string, entries: readonly ReleasedCharacterPracticeEntry[], presentation = 'simplified') {
  const [snapshot, setSnapshot] = useState<WritingSession | null>(null);
  const [legacyCandidate, setLegacyCandidate] = useState<CharacterForgeSession | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(0);
  const [reload, setReload] = useState(0);
  const currentRef = useRef<WritingSession | null>(null);
  const scopeRef = useRef<ActiveOwnerLearningScope | null>(null);
  const sourceRef = useRef('');
  const bindingRef = useRef(0);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const retryRef = useRef<(() => Promise<WritingSession>) | null>(null);
  const loadedRef = useRef<{ ownerKey: string; contentVersion: string; entries: readonly ReleasedCharacterPracticeEntry[]; presentation: string } | null>(null);

  useEffect(() => {
    const binding = ++bindingRef.current;
    setReady(false); setSnapshot(null); setLegacyCandidate(null); currentRef.current = null; scopeRef.current = null; retryRef.current = null;
    const load = async () => {
      const scope = await currentWorkspaceScope(ownerKey);
      if (!scope) throw new Error('Owner not ready');
      const source = await writingSourceVersion(contentVersion, [presentation, entries]);
      const saved = await readWritingSession(scope);
      const legacyRaw = !saved && scope.resetEpoch === 0 ? localStorage.getItem(getCharacterForgeSessionStorageKey(ownerKey)) : null;
      const legacy = legacyRaw === null ? null : parseCharacterForgeSession(legacyRaw);
      if (legacyRaw !== null && !legacy) throw new Error('Unsupported legacy writing session');
      if (bindingRef.current !== binding) return;
      scopeRef.current = scope; sourceRef.current = source;
      loadedRef.current = { ownerKey, contentVersion, entries, presentation };
      currentRef.current = saved; setSnapshot(saved); setLegacyCandidate(legacy); setReady(true); setError('');
    };
    void load().catch(() => {
      if (bindingRef.current === binding) setError('Chưa đọc được phiên luyện chữ. Dữ liệu cũ được giữ; hãy mở lại Sảnh.');
    });
    const refresh = () => {
      const scope = scopeRef.current;
      if (!scope) return;
      void currentWorkspaceScope(ownerKey).then(async currentScope => {
        if (!currentScope || currentScope.resetEpoch !== scope.resetEpoch || currentScope.ownerGeneration.generation !== scope.ownerGeneration.generation) {
          if (bindingRef.current === binding) { setReady(false); setReload(value => value + 1); }
          return;
        }
        const saved = await readWritingSession(scope);
        if (bindingRef.current !== binding) return;
        currentRef.current = saved; setSnapshot(saved);
      }).catch(() => {
        if (bindingRef.current === binding) setError('Chưa đọc được phiên mới. Phiên đang có được giữ; hãy mở lại Sảnh.');
      });
    };
    const reset = () => { setReady(false); setReload(value => value + 1); };
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('hanzi-writing-journal-v1');
    const syncChannel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('hanzi-os-sync-v1');
    channel?.addEventListener('message', refresh);
    syncChannel?.addEventListener('message', refresh);
    window.addEventListener('hanzi-learning-reset', reset);
    window.addEventListener('hanzi-workspace-received', refresh);
    window.addEventListener(WORKSPACE_CHANGED, refresh);
    return () => {
      if (bindingRef.current === binding) bindingRef.current = binding + 1;
      window.removeEventListener('hanzi-workspace-received', refresh);
      window.removeEventListener(WORKSPACE_CHANGED, refresh);
      window.removeEventListener('hanzi-learning-reset', reset);
      channel?.close(); syncChannel?.close();
    };
  }, [ownerKey, contentVersion, entries, presentation, reload]);

  const enqueue = useCallback((build: () => Promise<WritingSession>) => {
    const binding = bindingRef.current;
    setBusy(count => count + 1);
    const work = queueRef.current.then(async () => {
      if (bindingRef.current !== binding) throw new Error('Writing owner changed');
      return build();
    });
    queueRef.current = work.catch(() => undefined);
    return work.then(saved => {
      if (bindingRef.current === binding) { currentRef.current = saved; setSnapshot(saved); setError(''); }
      return saved;
    }).catch(reason => {
      if (bindingRef.current === binding) setError('Chưa lưu được thao tác. Giữ nguyên phiên; thử lưu lại trước khi tiếp tục.');
      throw reason;
    }).finally(() => setBusy(count => Math.max(0, count - 1)));
  }, []);

  const start = useCallback((session: CharacterForgeSession, legacy = false) => enqueue(async () => {
    if (!scopeRef.current || !sourceRef.current || retryRef.current) throw new Error('Writing journal not ready');
    const scope = scopeRef.current;
    const source = sourceRef.current;
    const sessionId = crypto.randomUUID();
    const itemSources = Object.fromEntries(session.hanzis.map(hanzi => {
      const entry = entries.find(candidate => candidate.hanzi === hanzi && candidate.lessonId === session.lessonId)
        ?? entries.find(candidate => candidate.hanzi === hanzi);
      if (!entry) throw new Error('Writing character source unavailable');
      return [hanzi, { id: entry.id, lessonId: entry.lessonId }];
    }));
    const save = () => startWritingSession(scope, session, contentVersion, source, legacy, sessionId, itemSources);
    retryRef.current = save;
    const saved = await save(); retryRef.current = null;
    return saved;
  }), [contentVersion, enqueue, entries]);

  const change = useCallback((update: (session: CharacterForgeSession) => CharacterForgeSession,
    category: ActivityHistoryInput['category'], details: ActivityHistoryInput['details']) => enqueue(async () => {
    const expected = currentRef.current;
    const scope = scopeRef.current;
    if (!scope || !expected || retryRef.current || expected.sourceVersion !== sourceRef.current
      || expected.contentVersion !== contentVersion) throw new Error('Writing source changed');
    const next = update(expected.session);
    if (!writingChangeNeedsCommit(expected.session, next, category, details)) return expected;
    const save = () => updateWritingSession(scope, expected, next, category, details);
    retryRef.current = save;
    const saved = await save(); retryRef.current = null;
    return saved;
  }), [contentVersion, enqueue]);

  const retry = useCallback(() => enqueue(async () => {
    const save = retryRef.current;
    if (!save) throw new Error('No pending writing mutation');
    const saved = await save(); retryRef.current = null;
    return saved;
  }), [enqueue]);

  const answer = useCallback((answer: string, correct: boolean) => enqueue(async () => {
    const expected = currentRef.current, scope = scopeRef.current;
    if (!scope || !expected || retryRef.current || expected.sourceVersion !== sourceRef.current
      || expected.contentVersion !== contentVersion) throw new Error('Writing source changed');
    const save = () => recordWritingResponse(scope, expected, answer, correct);
    retryRef.current = save;
    const saved = await save(); retryRef.current = null;
    return saved;
  }), [enqueue, contentVersion]);

  const bound = loadedRef.current?.ownerKey === ownerKey && loadedRef.current.contentVersion === contentVersion
    && loadedRef.current.entries === entries && loadedRef.current.presentation === presentation;
  return { snapshot: bound ? snapshot : null, legacyCandidate: bound ? legacyCandidate : null, ready: ready && bound, error,
    busy: busy > 0, start, change, answer, retry,
    compatible: ready && bound && snapshot?.contentVersion === contentVersion && snapshot.sourceVersion === sourceRef.current };
}
