import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { adoptReaderProgressScope, initialReaderProgressScope, readReaderProgress, writeReaderProgress } from './readerProgressStorage';
import { createEmptyReaderProgress, parseReaderProgress, type ReaderProgressDocument } from './readerProgress';
import { currentWorkspaceScope, readWorkspace, saveWorkspaceChanges } from '../../sync/workspaceSync';
import { applyReaderWorkspace, readerWorkspaceChanges } from './readerWorkspace';

export const useReaderProgress = ({ ownerKey, authenticated }: { ownerKey: string; authenticated: boolean }) => {
  const [initial] = useState(() => {
    const scope = initialReaderProgressScope(ownerKey);
    try { return { document: readReaderProgress(scope), error: false }; }
    catch { return { document: createEmptyReaderProgress(scope), error: true }; }
  });
  const [progress, setProgressState] = useState(initial.document);
  const [storageError, setStorageError] = useState(initial.error);
  const [scopeReady, setScopeReady] = useState(false);
  const previousOwnerRef = useRef(progress.ownerKey);
  const progressRef = useRef(progress);
  const writesRef = useRef(Promise.resolve());
  const readyRef = useRef(false);
  const lifecycleRef = useRef(0);

  useEffect(() => {
    const lifecycle = ++lifecycleRef.current;
    let active = true;
    readyRef.current = false; setScopeReady(false);
    void (async () => {
      const scope = await currentWorkspaceScope(ownerKey);
      if (!scope) throw new Error('Reader owner changed');
      const readerScope = { ownerKey, ownerGeneration: scope.ownerGeneration.generation, resetEpoch: scope.resetEpoch };
      const stored = readReaderProgress(readerScope);
      const current = progressRef.current;
      const canAdopt = authenticated && previousOwnerRef.current.startsWith('anonymous:')
        && (Object.keys(current.chapters).length > 0 || Object.keys(current.savedEntries).length > 0)
        && Object.keys(stored.chapters).length === 0 && Object.keys(stored.savedEntries).length === 0;
      let base = canAdopt ? adoptReaderProgressScope(current, readerScope) : stored;
      if (process.env.NODE_ENV === 'development' && authenticated && !canAdopt
        && Object.keys(stored.chapters).length === 0 && Object.keys(stored.savedEntries).length === 0) {
        try {
          const response = await fetch('/api/local-demo/reader-progress', { cache: 'no-store' });
          if (response.ok) {
            const data = await response.json();
            if (data.readerProgress?.resetEpoch === scope.resetEpoch) base = parseReaderProgress({ ...data.readerProgress, ...readerScope }, readerScope);
          }
        } catch { base = stored; }
      }
      const journal = await readWorkspace(scope);
      const next = applyReaderWorkspace(base, journal.entries);
      await saveWorkspaceChanges(scope, readerWorkspaceChanges(null, next));
      if (!active || lifecycle !== lifecycleRef.current) return;
      previousOwnerRef.current = ownerKey;
      progressRef.current = next; setProgressState(next);
      readyRef.current = true; setScopeReady(true);
      setStorageError(!writeReaderProgress(next));
    })().catch(() => { if (active) { setStorageError(true); setScopeReady(false); } });
    return () => { active = false; readyRef.current = false; };
  }, [authenticated, ownerKey]);

  const commitProgress = useCallback((update: SetStateAction<ReaderProgressDocument>) => {
    const lifecycle = lifecycleRef.current;
    const task = writesRef.current.then(async () => {
      if (!readyRef.current || lifecycle !== lifecycleRef.current) throw new Error('Reader scope is not ready');
      const scope = await currentWorkspaceScope(ownerKey);
      const current = progressRef.current;
      if (!scope || current.ownerKey !== ownerKey || current.ownerGeneration !== scope.ownerGeneration.generation
        || current.resetEpoch !== scope.resetEpoch) throw new Error('Reader scope changed');
      const journal = await readWorkspace(scope);
      const durable = applyReaderWorkspace(current, journal.entries);
      const next = typeof update === 'function' ? update(durable) : update;
      if (next.ownerKey !== ownerKey || next.resetEpoch !== scope.resetEpoch || next.ownerGeneration !== scope.ownerGeneration.generation) throw new Error('Reader update crossed scopes');
      await saveWorkspaceChanges(scope, readerWorkspaceChanges(durable, next));
      const committed = applyReaderWorkspace(next, (await readWorkspace(scope)).entries);
      if (lifecycle !== lifecycleRef.current) throw new Error('Reader owner changed after commit');
      progressRef.current = committed; setProgressState(committed);
      setStorageError(!writeReaderProgress(committed));
      return committed;
    });
    writesRef.current = task.then(() => undefined, () => undefined);
    return task;
  }, [ownerKey]);

  const setProgress = useCallback((update: SetStateAction<ReaderProgressDocument>) => {
    void commitProgress(update).catch(() => setStorageError(true));
  }, [commitProgress]);

  useEffect(() => {
    if (!scopeReady) return;
    let active = true;
    const receive = () => {
      void writesRef.current.then(async () => {
        const scope = await currentWorkspaceScope(ownerKey);
        const current = progressRef.current;
        if (!scope || current.ownerKey !== ownerKey || current.ownerGeneration !== scope.ownerGeneration.generation || current.resetEpoch !== scope.resetEpoch) return;
        const next = applyReaderWorkspace(current, (await readWorkspace(scope)).entries);
        if (!active) return;
        progressRef.current = next; setProgressState(next);
        setStorageError(!writeReaderProgress(next));
      }).catch(() => { if (active) setStorageError(true); });
    };
    window.addEventListener('hanzi-workspace-received', receive);
    window.addEventListener('focus', receive);
    return () => { active = false; window.removeEventListener('hanzi-workspace-received', receive); window.removeEventListener('focus', receive); };
  }, [ownerKey, scopeReady]);

  return { progress, scopeReady, setProgress, commitProgress, storageError };
};
