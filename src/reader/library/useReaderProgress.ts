import { useEffect, useRef, useState } from "react";
import {
  adoptReaderProgressScope,
  initialReaderProgressScope,
  readReaderProgress,
  resolveReaderProgressScope,
  writeReaderProgress,
} from "./readerProgressStorage";
import { parseReaderProgress, type ReaderProgressDocument } from "./readerProgress";

export const useReaderProgress = ({
  ownerKey,
  authenticated,
}: {
  ownerKey: string;
  authenticated: boolean;
}) => {
  const [progress, setProgress] = useState<ReaderProgressDocument>(() => {
    const scope = initialReaderProgressScope(ownerKey);
    return readReaderProgress(scope);
  });
  const [storageError, setStorageError] = useState(false);
  const [scopeReady, setScopeReady] = useState(false);
  const previousOwnerRef = useRef(progress.ownerKey);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    setScopeReady(false);
    const fallback = initialReaderProgressScope(ownerKey);
    let active = true;
    void resolveReaderProgressScope(fallback).then(async (scope) => {
      if (!active) return;
      const stored = readReaderProgress(scope);
      const currentProgress = progressRef.current;
      const canAdoptGuestProgress = authenticated
        && previousOwnerRef.current.startsWith("anonymous:")
        && (Object.keys(currentProgress.chapters).length > 0
          || Object.keys(currentProgress.savedEntries).length > 0)
        && Object.keys(stored.chapters).length === 0
        && Object.keys(stored.savedEntries).length === 0;
      let next = canAdoptGuestProgress
        ? adoptReaderProgressScope(currentProgress, scope)
        : stored;
      if (process.env.NODE_ENV === 'development' && authenticated
        && !canAdoptGuestProgress && Object.keys(stored.chapters).length === 0
        && Object.keys(stored.savedEntries).length === 0) {
        try {
          const response = await fetch('/api/local-demo/reader-progress', { cache: 'no-store' });
          if (response.ok) {
            const data = await response.json();
            if (data.readerProgress?.resetEpoch === scope.resetEpoch) {
              next = parseReaderProgress({ ...data.readerProgress, ...scope }, scope);
            }
          }
        } catch { /* A missing local fixture never blocks the reader. */ }
      }
      if (!active) return;
      previousOwnerRef.current = scope.ownerKey;
      setProgress(next);
      setScopeReady(true);
      if (canAdoptGuestProgress && !writeReaderProgress(next)) setStorageError(true);
    });
    return () => {
      active = false;
    };
  }, [authenticated, ownerKey]);

  useEffect(() => {
    if (!writeReaderProgress(progress)) setStorageError(true);
  }, [progress]);

  return { progress, scopeReady, setProgress, storageError };
};
