"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLearning } from '../store/LearningStore';
import { readLessonResume, writeLessonResume, type OwnerScopedCacheScope } from '../sync/indexedDb';
import { ownerScopedResumeCacheScope, resolveLearningResumeOwnerScope } from '../sync/learningResumeStore';
import { emptyReadingPosition, lessonReadingEntryKey, parseLessonReadingSession, type LessonReadingSession, type ReadingPosition } from '../learning/lessonReadingSession';
import { LessonPageReader } from './LessonPageReader';
import { LessonContentLoading } from './LessonContentLoading';
import {matchLessonPageBindings,type LessonPageBinding} from '../learning/lessonPageBinding';
import {queueReadingPageAttempts} from '../sync/queueReadingPageAttempts';

type Props = React.ComponentProps<typeof LessonPageReader> & { lessonId: string; sourceStatus?: 'loading'|'ready'|'fallback' };
type SavedProps = Omit<Props, 'document'> & { fallback: React.ReactNode };

// A published-only lesson may have no bundled document during an API outage.
// Resolve the same owner-scoped snapshot before choosing the legacy reader.
export function SavedLessonReader(props: SavedProps) {
  const { sync } = useLearning();
  return <OwnerSavedLessonReader key={JSON.stringify([sync.ownerKey, props.lessonId])} {...props} ownerKey={sync.ownerKey} />;
}

function OwnerSavedLessonReader({ ownerKey, fallback, ...props }: SavedProps & { ownerKey: string }) {
  const [saved, setSaved] = useState<LessonReadingSession | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const scope = ownerScopedResumeCacheScope(await resolveLearningResumeOwnerScope(ownerKey), lessonReadingEntryKey(props.lessonId));
        const record = await readLessonResume<unknown>(scope);
        const session = parseLessonReadingSession(record?.value, props.lessonId);
        if (!cancelled) setSaved(session ?? null);
      } catch {
        if (!cancelled) setSaved(null);
      }
    })();
    return () => { cancelled = true; };
  }, [ownerKey, props.lessonId]);
  if (saved === undefined) return <LessonContentLoading title={props.title} restoring />;
  // Missing, invalid and future-version records are never written by this probe.
  if (!saved) return fallback;
  return <ResumableLessonReader {...props} sourceStatus="fallback" document={saved.document} title={saved.title} objective={saved.objective} />;
}

export function ResumableLessonReader(props: Props) {
  const { sync } = useLearning();
  // An owner change unmounts all draft state before another learner can see it.
  return <OwnerLessonReader key={JSON.stringify([sync.ownerKey, props.lessonId])} {...props} ownerKey={sync.ownerKey} />;
}

function OwnerLessonReader({ ownerKey, sourceStatus = 'ready', ...props }: Props & { ownerKey: string }) {
  const [loaded, setLoaded] = useState<{ session: LessonReadingSession; scope: OwnerScopedCacheScope | null } | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [queueFailed, setQueueFailed] = useState(false);
  const [switching, setSwitching] = useState(false);
  const initial = useRef(props);
  initial.current = props;
  const latest = useRef<ReadingPosition | null>(null);
  const writes = useRef(Promise.resolve());
  const queuedSnapshot = useRef<LessonReadingSession | undefined>(undefined);
  const [bindingState,setBindingState]=useState<{document:Props['document'];bindings:Record<string,LessonPageBinding>}|null>(null);
  useEffect(()=>{
    if(!loaded?.scope)return;
    const {scope,session}=loaded;
    let cancelled=false;
    writes.current=writes.current.then(async()=>{
      await queueReadingPageAttempts(scope,session);
      queuedSnapshot.current=session;
      if(!cancelled)setQueueFailed(false);
    }).catch(()=>{if(!cancelled)setQueueFailed(true);});
    return ()=>{cancelled=true;};
  },[loaded]);
  useEffect(()=>{
    if(!loaded)return;
    const controller=new AbortController();
    const document=loaded.session.document;
    void fetch(`/api/learning/page-activities?lessonId=${encodeURIComponent(props.lessonId)}`,{signal:controller.signal})
      .then(async response=>response.ok?matchLessonPageBindings(await response.json(),props.lessonId,document):{})
      .then(bindings=>{if(!controller.signal.aborted)setBindingState({document,bindings});})
      .catch(()=>{ /* Offline reading and saved drafts remain usable without a binding. */ });
    return ()=>controller.abort();
  },[loaded,props.lessonId]);
  useEffect(() => {
    if (loaded || sourceStatus === 'loading') return;
    let cancelled = false;
    const current = initial.current;
    const fresh: LessonReadingSession = { ...emptyReadingPosition(), version: 1, lessonId: current.lessonId, document: current.document, title: current.title, objective: current.objective };
    void (async () => {
      try {
        const scope = ownerScopedResumeCacheScope(await resolveLearningResumeOwnerScope(ownerKey), lessonReadingEntryKey(current.lessonId));
        const record = await readLessonResume<unknown>(scope);
        const restored = parseLessonReadingSession(record?.value, current.lessonId);
        if (!cancelled) {
          // Preserve an unreadable or future-version snapshot rather than overwrite it.
          setLoaded({ session: restored ?? fresh, scope: record && !restored ? null : scope });
          if (record && !restored) setSaveFailed(true);
        }
      } catch {
        if (!cancelled) { setLoaded({ session: fresh, scope: null }); setSaveFailed(true); }
      }
    })();
    return () => { cancelled = true; };
  }, [ownerKey, sourceStatus, loaded]);
  const save = useCallback((position: ReadingPosition) => {
    const bindings=bindingState&&bindingState.document===loaded?.session.document?bindingState.bindings:{};
    position={...position,drafts:Object.fromEntries(Object.entries(position.drafts).map(([id,draft])=>{
      // Never retrofit a newly fetched version to a first attempt from an older
      // save or from a time when its source could not be verified.
      const previous=(latest.current??loaded?.session)?.drafts[id];
      return [id,draft.firstAttempt&&!previous?.firstAttempt&&bindings[id]?{...draft,firstAttempt:{...draft.firstAttempt,binding:bindings[id]}}:previous?.firstAttempt?{...draft,firstAttempt:previous.firstAttempt}:draft];
    }))};
    latest.current = position;
    if (!loaded?.scope) return;
    const scope = loaded.scope;
    const snapshot = { ...loaded.session, ...position };
    // Serialize writes so a slower earlier keystroke cannot replace the last answer.
    writes.current = writes.current.then(async () => {
      await writeLessonResume({ ...scope, value: snapshot });
      window.dispatchEvent(new Event('hanzi-reading-saved'));
      setSaveFailed(false);
      try {
        await queueReadingPageAttempts(scope,snapshot,queuedSnapshot.current);
        queuedSnapshot.current=snapshot;
        setQueueFailed(false);
      } catch { setQueueFailed(true); }
    }).catch(() => setSaveFailed(true));
  }, [loaded,bindingState]);
  const startUpdatedContent = async () => {
    if (!loaded?.scope || switching || sourceStatus !== 'ready') return;
    setSwitching(true);
    try {
      await writes.current;
      const snapshot = { ...loaded.session, ...latest.current };
      // Do not leave the old revision until its saved responses are recoverable
      // through the queue as well as the archived reading snapshot.
      await queueReadingPageAttempts(loaded.scope,snapshot);
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([snapshot.document, snapshot.title, snapshot.objective])));
      const revision = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2,'0')).join('');
      await writeLessonResume({ ...loaded.scope, entryKey: `${loaded.scope.entryKey}:history:${revision}`, value: snapshot });
      const fresh: LessonReadingSession = { ...emptyReadingPosition(), version: 1, lessonId: props.lessonId, document: props.document, title: props.title, objective: props.objective };
      await writeLessonResume({ ...loaded.scope, value: fresh });
      latest.current = fresh;
      setLoaded({ session: fresh, scope: loaded.scope });
      setSaveFailed(false);
    } catch { setSaveFailed(true); }
    finally { setSwitching(false); }
  };
  if (!loaded) return <LessonContentLoading title={props.title} restoring />;
  return <>
    {sourceStatus === 'ready' && JSON.stringify([props.document, props.title, props.objective]) !== JSON.stringify([loaded.session.document, loaded.session.title, loaded.session.objective]) && <p role="status">Bài có nội dung cập nhật. Bạn đang tiếp tục phần đã học. <button type="button" disabled={switching || !loaded.scope} onClick={()=>void startUpdatedContent()}>Bắt đầu bản cập nhật</button> <small>Bản nháp cũ được giữ riêng trên thiết bị.</small></p>}
    <LessonPageReader key={JSON.stringify([loaded.session.document,loaded.session.title,loaded.session.objective])} {...props} inputDisabled={switching} document={loaded.session.document} title={loaded.session.title} objective={loaded.session.objective} initialPosition={loaded.session} onPositionChange={save} />
    {saveFailed && <p role="status">Chưa lưu được phần lĩnh hội trên thiết bị này. Hãy giữ trang mở để không mất câu trả lời.</p>}
    {queueFailed && !saveFailed && <p role="status">Câu trả lời vẫn được giữ trong bài trên thiết bị. Chưa chuẩn bị được bản chờ lưu vào tài khoản; hãy mở lại bài để thử lại.</p>}
  </>;
}
