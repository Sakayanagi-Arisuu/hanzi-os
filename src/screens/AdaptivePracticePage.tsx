import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLearning } from '../store/LearningContext';
import { CURRENT_CLIENT_CLOSED_ALPHA_AVAILABLE } from '../content/clientContentAvailability';
import { currentWorkspaceScope } from '../sync/workspaceSync';
import { archiveAdaptiveSession, listAdaptiveSessions, startAdaptiveSession, type AdaptiveJournal } from '../sync/adaptiveSession';
import { readAdaptiveDraftRecoveries, type AdaptiveDraftRecovery } from '../sync/adaptiveDraftRecovery';
import type { ActiveOwnerLearningScope } from '../sync/indexedDb';
import { AdaptiveSessionRunner } from '../personalization/AdaptiveSessionRunner';
import { buildGuestPilotPlan, materializeGuestPilotUnit } from '../personalization/guestPilotAdapter';
import { localAdaptivePilotAvailable, requestAccountPracticePlan } from '../personalization/adaptivePlanClient';
import type { PracticeSessionManifest } from '../personalization/practiceManifest';
import type { SessionIntent } from '../personalization/sessionComposer';
import { PilotCompetencyMap } from '../personalization/PilotCompetencyMapPanel';
import type { PilotCompetencyMap as CompetencyMapData } from '../personalization/pilotCompetencyMap';
import '../personalization/adaptiveUnit.css';

export function AdaptivePracticePage() {
  const { sync } = useLearning();
  return <PracticeEntry key={`${sync.ownerKey}:${sync.session?.authenticated}`} />;
}

function PracticeEntry() {
  const { state, sync } = useLearning();
  const navigate = useNavigate();
  const [scope, setScope] = useState<ActiveOwnerLearningScope | null>(null);
  const [saved, setSaved] = useState<AdaptiveJournal | null>(null);
  const [sessions, setSessions] = useState<AdaptiveJournal[]>([]);
  const [recoveries, setRecoveries] = useState<AdaptiveDraftRecovery[]>([]);
  const [ready, setReady] = useState(false), [allowed, setAllowed] = useState(false);
  const [running, setRunning] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [minutes, setMinutes] = useState<5 | 10 | 20>(state.profile.learningPreferences?.sessionMinutes ?? 10);
  const [goal, setGoal] = useState<SessionIntent['kind'] | 'automatic'>('quantity');
  const [audio, setAudio] = useState(state.profile.learningPreferences?.audio === 'available');
  const [microphone, setMicrophone] = useState(false);
  const [plan, setPlan] = useState<PracticeSessionManifest | null>(null), [empty, setEmpty] = useState(false);
  const [acceptsChange, setAcceptsChange] = useState(false);
  const [competencyMap, setCompetencyMap] = useState<CompetencyMapData | null>(null);
  const [reload, setReload] = useState(0);
  const alive = useRef(true);
  const requestRef = useRef<AbortController | null>(null);
  const sessionReady = sync.session !== null;
  useEffect(() => {
    const reset = () => {
      requestRef.current?.abort(); requestRef.current = null;
      setRunning(false); setReady(false); setScope(null); setSaved(null); setSessions([]); setRecoveries([]); setPlan(null); setBusy(false);
      setError(''); setEmpty(false); setAcceptsChange(false); setCompetencyMap(null); setReload(value => value + 1);
    };
    window.addEventListener('hanzi-learning-reset', reset);
    const received = () => { requestRef.current?.abort(); setCompetencyMap(null); setPlan(null); setReload(value => value + 1); };
    window.addEventListener('hanzi-workspace-received', received);
    window.addEventListener('focus', received);
    return () => { window.removeEventListener('hanzi-learning-reset', reset); window.removeEventListener('hanzi-workspace-received', received); window.removeEventListener('focus', received); };
  }, []);
  useEffect(() => { requestRef.current?.abort(); setPlan(null); setCompetencyMap(null); }, [state.profile.learningPreferences?.allowInference]);
  useEffect(() => {
    alive.current = true;
    let active = true;
    const permitted = localAdaptivePilotAvailable(location.hostname, CURRENT_CLIENT_CLOSED_ALPHA_AVAILABLE);
    setAllowed(permitted);
    if (!sessionReady) return;
    void (async () => {
      if (!permitted) { if (active) setReady(true); return; }
      try {
        const current = await currentWorkspaceScope(sync.ownerKey);
        if (!current) throw new Error('Owner unavailable');
        const journals = await listAdaptiveSessions(current);
        const drafts = await readAdaptiveDraftRecoveries(current);
        const open = journals.filter(journal => journal.status === 'active');
        const journal = open.length === 1 ? open[0]! : open.length ? null : journals[0] ?? null;
        if (active) { setScope(current); setSessions(journals); setRecoveries(drafts); setSaved(journal); setReady(true); }
      } catch { if (active) { setError('Chưa đọc được phiên đã lưu. Dữ liệu hiện có được giữ nguyên; hãy mở lại Thiên Lộ.'); setReady(true); } }
    })();
    return () => { active = false; alive.current = false; requestRef.current?.abort(); };
  }, [sync.ownerKey, sessionReady, reload]);
  const change = () => { requestRef.current?.abort(); setPlan(null); setCompetencyMap(null); setEmpty(false); setAcceptsChange(false); setError(''); };
  const compose = async () => {
    if (!scope || busy) return;
    change(); setBusy(true);
    const abort = new AbortController(); requestRef.current = abort;
    try {
      const context = { online: navigator.onLine, minutes, audio, microphone };
      const intent = goal === 'automatic' ? null : { kind: goal, origin: 'manual' as const };
      const presentMap = (map:CompetencyMapData) => { if (alive.current && !abort.signal.aborted) setCompetencyMap(map); };
      const result = sync.session?.authenticated
        ? await requestAccountPracticePlan(scope, { preferences: state.profile.learningPreferences ?? null, context, intent }, { signal: abort.signal, onCompetencyMap:presentMap })
        : await buildGuestPilotPlan(scope, { context, intent }, 'practice').then(result => {
          presentMap(result.competencyMap);
          return result.executionEnabled && !result.manifest.shadowOnly ? result.manifest : null;
        });
      if (alive.current && !abort.signal.aborted) { setPlan(result); setEmpty(!result); }
    } catch { if (alive.current && !abort.signal.aborted) setError('Chưa chọn được nguồn luyện phù hợp. Tiến độ và phiên đã lưu vẫn được giữ. Bạn có thể tiếp tục theo bài trên Thiên Lộ.'); }
    finally { if (alive.current && requestRef.current === abort) setBusy(false); }
  };
  const start = async () => {
    if (!scope || !plan || busy) return;
    setBusy(true); setError('');
    try {
      const journal = await startAdaptiveSession(scope, plan, { id: crypto.randomUUID(), acceptsTaskChange: acceptsChange });
      if (alive.current) { setSaved(journal); setRunning(true); }
    } catch { if (alive.current) setError('Chưa mở được phiên. Giữ nguyên dữ liệu và thử đọc lại phiên đã lưu trước khi tiếp tục.'); }
    finally { if (alive.current) setBusy(false); }
  };
  const archive = async (journal: AdaptiveJournal) => {
    if (!scope || busy) return;
    setBusy(true); setError('');
    try {
      await archiveAdaptiveSession(scope, journal.snapshot);
      if (alive.current) { setReady(false); setPlan(null); setReload(value => value + 1); }
    } catch { if (alive.current) setError('Chưa lưu trữ được phiên. Dữ liệu được giữ; hãy đọc lại phiên trước khi thử lại.'); }
    finally { if (alive.current) setBusy(false); }
  };
  if (running && scope) return <AdaptiveSessionRunner scope={scope} onExit={() => navigate('/path')}
    materialize={sync.session?.authenticated ? undefined : materializeGuestPilotUnit} />;
  const unfinished = saved && !['finished', 'archived'].includes(saved.status);
  const branches = sessions.filter(journal => journal.status === 'active');
  const awaitingArchive = sessions.some(journal => journal.snapshot.archived && journal.pending);
  return <section className="adaptive-unit-session" aria-labelledby="adaptive-entry-title">
    <header><Link to="/path">Về Thiên Lộ</Link><div><p>KHẢO LUYỆN · PHIÊN THEO MỤC TIÊU</p><h1 id="adaptive-entry-title">Chọn lượt luyện của bạn</h1></div></header>
    <div className="adaptive-unit-content"><div className="adaptive-unit-reading">
      {!ready ? <p role="status">Đang đọc tiến độ và phiên trên thiết bị…</p> : !allowed ? <p>Phiên luyện pilot chưa mở ở môi trường này. Hãy tiếp tục các bài hiện có trên Thiên Lộ.</p>
        : branches.length > 1 ? <><h2>Có nhiều phiên đang dở</h2><p>Giữ một phiên để tiếp tục bằng cách lưu trữ những phiên còn lại. Mỗi bản giữ nguyên nháp và lịch sử, không tự chọn theo thời gian đồng bộ.</p>
          {branches.map((journal, index) => <section key={journal.snapshot.id} aria-label={`Phiên đang dở ${index + 1}`}><h3>Phiên {index + 1} · bước {journal.snapshot.cursor + 1}</h3>
            <p>{journal.snapshot.manifest.steps[journal.snapshot.cursor]?.reasonVi}</p>
            {Object.entries(journal.snapshot.drafts ?? {}).map(([stepId, draft], draftIndex) => <label className="adaptive-unit-answer" key={stepId}>Nháp {draftIndex + 1}{draft.ime ? ' · có hỗ trợ bàn phím' : ''}<textarea readOnly value={draft.response} /></label>)}
            <button disabled={busy} onClick={() => void archive(journal)}>Lưu trữ phiên {index + 1} · giữ dữ liệu</button></section>)}</>
        : unfinished ? <><h2>Còn một phiên đã lưu</h2><p>Giữ nhiệm vụ và nội dung đã chọn; tiếp tục từ bước đang dở. Phiên cũ chưa chuyển thành điểm thành thạo.</p>
          {saved.snapshot.manifest.shadowOnly && <p>Phiên này là bản xem trước kỹ thuật, chưa mở để thực hiện. Bạn vẫn có thể học theo bài trên Thiên Lộ.</p>}</>
          : <><p>Pilot giá và số lượng dùng bài nguồn đã mở trong tiến độ của bạn. Nội dung có AI hỗ trợ, chưa qua thẩm định của giáo viên hoặc người bản ngữ.</p>
            <p>Lượt tự đối chiếu không thay bài kiểm chứng, không tự thông qua bài nguồn hoặc đổi lịch ôn.</p>
            <label className="adaptive-unit-answer">Mục tiêu lượt luyện<select disabled={busy} value={goal} onChange={event => { change(); setGoal(event.target.value as typeof goal); }}>
              <option value="quantity">Số lượng và lượng từ</option><option value="produce">Hỏi và trả lời giá</option><option value="listen">Luyện nghe giá</option><option value="transfer">Đọc tình huống mua sắm</option>
              <option value="automatic" disabled={state.profile.learningPreferences?.allowInference !== true}>Gợi ý từ lịch sử · tự nguyện</option>
            </select></label>
            {goal === 'automatic' && <p>Chỉ dùng lịch sử khi bạn cho phép trong Hồ sơ. Sau thời gian nghỉ, hệ thống có thể gợi ý phần mở đầu tối đa 5 phút; bạn luôn có thể tự chọn mục tiêu khác. Đây không phải kiểm tra trí nhớ.</p>}
            <label className="adaptive-unit-answer">Thời lượng<select disabled={busy} value={minutes} onChange={event => { change(); setMinutes(Number(event.target.value) as 5 | 10 | 20); }}>
              <option value={5}>5 phút</option><option value={10}>10 phút</option><option value={20}>20 phút</option></select></label>
            <label className="adaptive-unit-check"><input type="checkbox" disabled={busy} checked={audio} onChange={event => { change(); setAudio(event.target.checked); }} />Tôi có thể nghe âm thanh</label>
            <label className="adaptive-unit-check"><input type="checkbox" disabled={busy} checked={microphone} onChange={event => { change(); setMicrophone(event.target.checked); }} />Tôi có thể luyện nói thành tiếng</label>
            <p>Không yêu cầu quyền microphone ở bước chọn này. Nếu không thể nói, hệ thống chỉ chọn nhánh viết phù hợp.</p>
            {empty && <p role="status">Chưa có lượt pilot phù hợp với bài đã mở và điều kiện hiện tại. Hãy học theo bài trên Thiên Lộ rồi quay lại.</p>}
            {plan && <section aria-label="Kế hoạch lượt luyện"><h2>Lượt luyện dự kiến</h2><ol>{plan.steps.map(step => <li key={step.stepId}>{step.reasonVi}</li>)}</ol>
              <p>Khoảng {Math.ceil(plan.estimatedSeconds / 60)} phút dự kiến; đây chưa phải thời gian đã học.</p>
              {plan.unresolved.includes('native-listening-content-unavailable') && <p>Chưa có bản thu phù hợp để kiểm chứng nghe. Lượt đề xuất dùng đọc và đối chiếu bằng văn bản.</p>}
              {plan.unresolved.includes('reviewed-unseen-challenge-unavailable') && <p>Chưa có tình huống mới đã được thẩm định để kiểm chứng vận dụng. Lượt đề xuất dùng đọc theo ngữ cảnh.</p>}
              {plan.requiresTaskChange && <label className="adaptive-unit-check"><input type="checkbox" checked={acceptsChange} onChange={event => setAcceptsChange(event.target.checked)} />Tôi đồng ý đổi sang nhiệm vụ phù hợp đang được đề xuất</label>}</section>}
          </>}
      {ready && allowed && unfinished && <details><summary>Lưu trữ phiên để chọn lượt khác</summary><p>Nháp, câu trả lời và lịch sử vẫn đọc lại được. Phiên lưu trữ không tiếp tục chạy và không được tính hoàn thành bài.</p>
        <button disabled={busy} onClick={() => void archive(saved)}>Lưu trữ phiên này · giữ dữ liệu</button></details>}
      {awaitingArchive && <p role="status">Phiên đã lưu trữ trên thiết bị, đang chờ xác nhận đồng bộ trước khi mở phiên mới.</p>}
      {sessions.some(journal => journal.snapshot.archived) && <details><summary>Đọc các phiên đã lưu trữ</summary>
        {sessions.filter(journal => journal.snapshot.archived).map((journal, index) => <section key={journal.snapshot.id}><h3>Phiên lưu trữ {index + 1}</h3><p>Đã giữ {journal.snapshot.receipts.length} lượt trả lời; đây không phải số bài hoàn thành.</p>
          {journal.snapshot.receipts.filter(receipt => receipt.response !== null).map((receipt, receiptIndex) => <label key={receipt.stepId} className="adaptive-unit-answer">Câu trả lời đã gửi {receiptIndex + 1}<textarea readOnly value={receipt.response ?? ''} /></label>)}
          {Object.entries(journal.snapshot.drafts ?? {}).map(([stepId, draft], draftIndex) => <label key={stepId} className="adaptive-unit-answer">Nháp {draftIndex + 1}{draft.ime ? ' · có hỗ trợ bàn phím' : ''}<textarea readOnly value={draft.response} /></label>)}</section>)}</details>}
      {recoveries.length > 0 && <details><summary>Đọc nháp được giữ riêng khi phiên thay đổi</summary>{recoveries.map((recovery, index) => <label className="adaptive-unit-answer" key={index}>
        Nháp giữ riêng {index + 1} · bước {recovery.snapshot.cursor + 1}{recovery.draft.ime ? ' · có hỗ trợ bàn phím' : ''}<textarea readOnly value={recovery.draft.response} /></label>)}</details>}
      {competencyMap && <PilotCompetencyMap map={competencyMap} />}
    </div></div>
    <footer>{error && <p role="alert">{error}</p>}
      {!ready || !allowed || !scope || empty || branches.length > 1 ? <Link className="adaptive-unit-primary" to="/path">Tiếp tục theo bài trên Thiên Lộ</Link>
        : unfinished ? <button className="adaptive-unit-primary" disabled={saved.snapshot.manifest.shadowOnly} onClick={() => setRunning(true)}>Tiếp tục phiên đã lưu</button>
          : <button className="adaptive-unit-primary" disabled={busy || awaitingArchive || Boolean(plan?.requiresTaskChange && !acceptsChange)} onClick={() => void (plan ? start() : compose())}>
            {busy ? 'Đang chuẩn bị…' : plan ? 'Bắt đầu lượt luyện' : 'Xem lượt luyện phù hợp'}</button>}
    </footer>
  </section>;
}
