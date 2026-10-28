import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { ActiveOwnerLearningScope } from '../sync/indexedDb';
import type { AdaptiveSession } from '../sync/adaptiveSession';
import { WORKSPACE_CHANGED } from '../sync/workspaceSync';
import type { LearningUnit } from './learningUnit';
import { AdaptiveSessionController } from './adaptiveSessionController';
import { AdaptiveUnitRenderer } from './AdaptiveUnitRenderer';
import { fetchAdaptiveUnit } from './adaptiveUnitClient';

type Props = { scope: ActiveOwnerLearningScope; onExit: () => void;
  onOpenSource?: (href: string) => void;
  materialize?: (scope: ActiveOwnerLearningScope, snapshot: AdaptiveSession, signal: AbortSignal) => Promise<LearningUnit> };
const accountUnit = async (scope: ActiveOwnerLearningScope, snapshot: AdaptiveSession, signal: AbortSignal) =>
  (await fetchAdaptiveUnit(scope, snapshot, { signal })).unit;

/** Mount only after explicit plan selection/start. Guest adapters must supply their own source policy. */
export function AdaptiveSessionRunner(props: Props) {
  const { ownerKey, generation } = props.scope.ownerGeneration;
  return <Runner key={`${ownerKey}:${generation}:${props.scope.resetEpoch}`} {...props} />;
}

function RunnerStatus({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return <section className="adaptive-unit-session" role="status"><header><h1>{title}</h1></header>
    <div className="adaptive-unit-content"><div className="adaptive-unit-reading">{children}</div></div><footer>{actions}</footer></section>;
}

function Runner({ scope, onExit, onOpenSource, materialize = accountUnit }: Props) {
  // Parent rerenders may recreate the scope object without changing its identity.
  const ownerKey = scope.ownerGeneration.ownerKey, generation = scope.ownerGeneration.generation, resetEpoch = scope.resetEpoch;
  const stableScope = useMemo(() => ({ ownerGeneration: { ownerKey, generation }, resetEpoch }), [ownerKey, generation, resetEpoch]);
  const controller = useMemo(() => new AdaptiveSessionController(stableScope), [stableScope]);
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  const [source, setSource] = useState<{ key: string; unit: LearningUnit } | null>(null);
  const [sourceError, setSourceError] = useState('');
  const [sourceRevision, setSourceRevision] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshot = state.journal?.snapshot;
  const sourceKey = snapshot ? `${snapshot.id}:${snapshot.manifest.binding}:${snapshot.cursor}` : '';
  const snapshotRef = useRef(snapshot); snapshotRef.current = snapshot;
  useEffect(() => {
    let alive = true;
    const release = controller.retain();
    void controller.hydrate().catch(() => undefined);
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('hanzi-adaptive-journal');
    const refresh = () => {
      if (!alive) return;
      void controller.refresh().catch(() => undefined);
    };
    const revalidate = () => {
      if (!alive) return;
      // Revalidation hides the old payload while live access is being checked.
      setSource(null); setSourceRevision(value => value + 1);
      refresh();
    };
    const local = () => channel?.postMessage('changed');
    window.addEventListener(WORKSPACE_CHANGED, local);
    window.addEventListener('hanzi-workspace-received', refresh);
    window.addEventListener('focus', revalidate);
    window.addEventListener('hanzi-learning-reset', revalidate);
    if (channel) channel.onmessage = refresh;
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener(WORKSPACE_CHANGED, local);
      window.removeEventListener('hanzi-workspace-received', refresh);
      window.removeEventListener('focus', revalidate);
      window.removeEventListener('hanzi-learning-reset', revalidate);
      channel?.close(); release();
    };
  }, [controller]);
  useEffect(() => {
    const current = snapshotRef.current;
    const abort = new AbortController();
    setSource(null); setSourceError('');
    if (!current || current.archived || current.cursor >= current.manifest.steps.length || current.manifest.shadowOnly) return;
    void materialize(stableScope, current, abort.signal).then(unit => {
      if (!abort.signal.aborted) setSource({ key: sourceKey, unit });
    }).catch(() => {
      if (!abort.signal.aborted) setSourceError('Chưa mở được nguồn của bước luyện. Phiên đã lưu được giữ nguyên.');
    });
    return () => abort.abort();
  }, [sourceKey, sourceRevision, stableScope, materialize]);
  const exit = async () => {
    if (timer.current) clearTimeout(timer.current);
    try { await controller.flushDraft(); onExit(); } catch { /* Keep visible draft and recovery controls. */ }
  };
  const retry = () => { void controller.flushDraft().catch(() => undefined); };
  const openSource = async () => {
    if (timer.current) clearTimeout(timer.current);
    const href = await controller.sourceLessonPath();
    onOpenSource?.(href);
  };
  const reload = () => {
    if (timer.current) clearTimeout(timer.current);
    void controller.reloadSaved({ discardVisibleDraft: true }).then(() => setSourceRevision(value => value + 1)).catch(() => undefined);
  };
  if (state.conflict) return <RunnerStatus title="Cần đọc lại phiên đã lưu" actions={<>
    <button className="adaptive-unit-primary" onClick={() => void controller.keepDraftAndReload().catch(() => undefined)} disabled={state.busy}>Giữ nháp riêng và đọc phiên đã lưu</button>
    <button onClick={() => void controller.keepDraftForExit().then(onExit).catch(() => undefined)} disabled={state.busy}>Giữ nháp riêng và về Thiên Lộ</button></>}>
    <p>{state.error}</p>{state.draft.response && <label className="adaptive-unit-answer">Nháp giữ lại khi phiên thay đổi<textarea readOnly value={state.draft.response} /></label>}
    <p>Nháp giữ riêng có thể đọc lại ở màn chọn Khảo Luyện; không thay câu trả lời đã gửi.</p>
    <details><summary>Bỏ nháp đang hiển thị</summary><p>Chỉ dùng khi bạn không cần giữ nháp này.</p>
      <button onClick={reload} disabled={state.busy}>Bỏ nháp đang hiển thị và đọc phiên đã lưu</button></details></RunnerStatus>;
  if (!snapshot) return <RunnerStatus title="Đọc phiên luyện đã lưu" actions={<>
    <button onClick={() => void controller.hydrate().catch(() => undefined)} disabled={state.busy}>Thử đọc lại</button><button onClick={onExit}>Về Thiên Lộ</button></>}>
    <p>{state.error || (state.busy ? 'Đang đọc phiên trên thiết bị…' : 'Chưa có phiên luyện ở đây.')}</p></RunnerStatus>;
  if (snapshot.archived || snapshot.cursor >= snapshot.manifest.steps.length) return <RunnerStatus title={snapshot.archived ? 'Phiên đã được lưu trữ' : 'Đã khép lượt luyện'}
    actions={<button className="adaptive-unit-primary" onClick={() => void exit()} disabled={state.busy}>Về Thiên Lộ</button>}>
    <p>{state.journal?.pending ? 'Đang chờ xác nhận lưu.' : 'Lượt luyện đã lưu. Thành thạo và tiến độ bài nguồn cần bằng chứng riêng.'}</p></RunnerStatus>;
  if (sourceError || !source || source.key !== sourceKey) return <RunnerStatus title="Đọc nguồn của bước luyện" actions={<>
    <button onClick={() => setSourceRevision(value => value + 1)}>Thử mở lại</button><button onClick={() => void exit()}>Về Thiên Lộ</button></>}>
    <p>{sourceError || (snapshot.manifest.shadowOnly ? 'Kế hoạch này đang ở chế độ xem trước.' : 'Đang kiểm tra nguồn nội dung…')}</p>
    <details><summary>Lưu trữ phiên để chọn lượt khác</summary><p>Giữ toàn bộ nháp, câu trả lời và lịch sử. Phiên được lưu trữ để đọc lại, không được tính hoàn thành bài.</p>
      <button disabled={state.busy} onClick={() => void controller.archive().then(onExit).catch(() => undefined)}>Lưu trữ phiên này · giữ dữ liệu</button></details>
    {state.error && <p role="alert">{state.error}</p>}</RunnerStatus>;
  return <AdaptiveUnitRenderer unit={source.unit} journal={state.journal!} busy={state.busy} error={state.error}
    draft={state.draft} draftStatus={state.draftStatus} onDraft={draft => {
      controller.updateDraft(draft);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(retry, 350);
    }} onSupport={controller.support} onPractice={controller.practice} onAdvance={controller.advance} onExit={() => void exit()} onRetryDraft={retry}
    onOpenSource={onOpenSource ? openSource : undefined} />;
}
