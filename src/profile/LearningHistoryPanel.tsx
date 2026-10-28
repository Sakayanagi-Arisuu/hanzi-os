import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useLearning } from '../store/LearningContext';
import { type HistoryModule, type LessonHistoryEventV1 } from '../learning/lessonHistory';
import { reconcileProfileHistoryGroups } from './historyReconciliation';
import { selectHistoryWindow } from './historyWindow';
import { readLocalLearningHistory } from '../sync/reviewHistory';
import { readAccountLessonHistoryPage } from '../sync/lessonHistory';
import { currentWorkspaceScope, WORKSPACE_CHANGED } from '../sync/workspaceSync';
import { LEARNING_COMMAND_QUEUE_CHANGED_EVENT } from '../sync/learningCommandOutbox';
import { HISTORY_MODULE_LABELS, HISTORY_SKILL_LABELS, historyActivityLabel, historyDay, historyOutcomeLabel, historySourceLink } from './historyPresentation';
import { advanceHistoryPage, emptyHistoryPage, hasMoreHistory, nextHistoryCursor, type HistoryLoadMode, type HistoryPageState } from './historyPaging';
import './learningHistory.css';

type Source = 'lesson' | 'review' | 'activity';
type Paging = Record<Source, HistoryPageState>;
const emptyPaging = (): Paging => ({ lesson: emptyHistoryPage(), review: emptyHistoryPage(), activity: emptyHistoryPage() });
const sources: Source[] = ['lesson', 'review', 'activity'];

export function LearningHistoryPanel() {
  const { sync } = useLearning();
  const [events, setEvents] = useState<LessonHistoryEventV1[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [module, setModule] = useState<HistoryModule | 'all'>('all');
  const [skill, setSkill] = useState('all');
  const [visibleCount, setVisibleCount] = useState(20);
  const [more, setMore] = useState(false);
  const pages = useRef(emptyPaging());
  const remoteEvents = useRef<LessonHistoryEventV1[]>([]);
  const request = useRef<AbortController | null>(null);
  const lifecycle = useRef(0);
  const failedMode = useRef<HistoryLoadMode | null>(null);
  const queuedRefresh = useRef(false);
  const cacheScope = useRef<string | null>(null);
  const authenticated = sync.session?.authenticated === true;
  const clearCache = useCallback(() => {
    cacheScope.current = null;
    pages.current = emptyPaging(); remoteEvents.current = []; failedMode.current = null;
    setEvents([]); setError(''); setReady(false); setVisibleCount(20); setMore(false);
  }, []);
  const invalidateRequest = useCallback(() => {
    ++lifecycle.current;
    request.current?.abort(); request.current = null; queuedRefresh.current = false;
  }, []);
  const load = useCallback(async function loadHistory(mode: HistoryLoadMode = 'refresh') {
    if (request.current) {
      if (mode === 'refresh') queuedRefresh.current = true;
      return;
    }
    const controller = new AbortController(); request.current = controller;
    const generation = lifecycle.current;
    setBusy(true); setError('');
    try {
      const scope = await currentWorkspaceScope(sync.ownerKey);
      if (generation !== lifecycle.current || controller.signal.aborted) return;
      if (!scope) throw new Error('Owner changed');
      const identity = JSON.stringify([scope.ownerGeneration.ownerKey, scope.ownerGeneration.generation, scope.resetEpoch]);
      if (cacheScope.current !== identity) {
        clearCache(); cacheScope.current = identity;
        // A cursor from a previous owner generation/reset cannot be reused.
        mode = 'refresh';
      }
      const local = await readLocalLearningHistory(scope);
      if (generation !== lifecycle.current || controller.signal.aborted) return;
      const requestIsCurrent = () => generation === lifecycle.current && !controller.signal.aborted;
      const initial = await reconcileProfileHistoryGroups(scope, [local, remoteEvents.current], requestIsCurrent);
      if (initial === null || !requestIsCurrent()) return;
      setEvents(initial);
      setReady(true);
      if (authenticated) {
        const selected = sources.filter(source => mode === 'refresh' || hasMoreHistory(pages.current[source]));
        const received = await Promise.all(selected.map(source => readAccountLessonHistoryPage(scope, {
          source, limit: 50, cursor: mode === 'more' ? nextHistoryCursor(pages.current[source]) : null,
          send: (input, init) => fetch(input, { ...init, signal: controller.signal }),
        })));
        if (generation !== lifecycle.current || controller.signal.aborted) return;
        const combined = await reconcileProfileHistoryGroups(scope, [remoteEvents.current, ...received.map(page => page.events)], requestIsCurrent);
        if (combined === null || !requestIsCurrent()) return;
        const paging = { ...pages.current };
        selected.forEach((source, index) => { paging[source] = advanceHistoryPage(paging[source], received[index], mode); });
        const reconciled = await reconcileProfileHistoryGroups(scope, [local, combined], requestIsCurrent);
        if (reconciled === null || !requestIsCurrent()) return;
        // Commit cursor and events together only after the final async fence.
        remoteEvents.current = combined; pages.current = paging;
        setEvents(reconciled);
        setMore(sources.some(source => hasMoreHistory(paging[source])));
      }
      failedMode.current = null;
    } catch {
      if (generation === lifecycle.current && !controller.signal.aborted) {
        failedMode.current = mode;
        setError('Chưa đọc đủ lịch sử. Các lượt đã lưu vẫn được giữ; thử lại khi kết nối hoặc bộ nhớ sẵn sàng.');
      }
    } finally {
      const ownedRequest = request.current === controller;
      if (ownedRequest) request.current = null;
      if (generation === lifecycle.current) {
        setBusy(false);
        if (ownedRequest && queuedRefresh.current && !controller.signal.aborted) {
          queuedRefresh.current = false;
          void loadHistory('refresh');
        }
      }
    }
  }, [authenticated, sync.ownerKey, clearCache]);
  useEffect(() => {
    invalidateRequest(); clearCache();
    void load();
    const refresh = () => { void load(); };
    const reset = () => {
      invalidateRequest(); clearCache();
      void load();
    };
    window.addEventListener('hanzi-workspace-received', refresh); window.addEventListener(LEARNING_COMMAND_QUEUE_CHANGED_EVENT, refresh);
    window.addEventListener(WORKSPACE_CHANGED, refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('hanzi-learning-reset', reset);
    return () => {
      invalidateRequest();
      window.removeEventListener('hanzi-workspace-received', refresh); window.removeEventListener(LEARNING_COMMAND_QUEUE_CHANGED_EVENT, refresh); window.removeEventListener('focus', refresh);
      window.removeEventListener(WORKSPACE_CHANGED, refresh);
      window.removeEventListener('hanzi-learning-reset', reset);
    };
  }, [load, clearCache, invalidateRequest]);
  const { count: filteredCount, displayed } = useMemo(() => selectHistoryWindow(events, module, skill, visibleCount), [events, module, skill, visibleCount]);
  const groups = new Map<string, LessonHistoryEventV1[]>();
  displayed.forEach(event => { const day = historyDay(event); const group = groups.get(day); if (group) group.push(event); else groups.set(day, [event]); });
  return <section className="learning-history" aria-labelledby="learning-history-heading">
    <h2 id="learning-history-heading">Nhật ký tu luyện · Lịch sử học tập</h2>
    <p>Ghi lại lượt học, hỗ trợ và tự ôn. Nhật ký không tự cấp XP, mở khóa hay kết luận mức thành thạo. Một số nguồn đang được nối tiếp; đây chưa phải toàn bộ lịch sử cũ.</p>
    <div className="history-filters"><label>Nguồn học<select aria-label="Nguồn học" value={module} onChange={event => { setModule(event.target.value as HistoryModule | 'all'); setVisibleCount(20); }}><option value="all">Tất cả nguồn</option>{Object.entries(HISTORY_MODULE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Kỹ năng<select aria-label="Kỹ năng" value={skill} onChange={event => { setSkill(event.target.value); setVisibleCount(20); }}><option value="all">Tất cả kỹ năng</option>{Object.entries(HISTORY_SKILL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}<option value="unknown">Chưa xác định kỹ năng</option></select></label></div>
    {busy && <p role="status">Đang đọc lịch sử đã lưu…</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" className="secondary-button" disabled={busy} onClick={() => void load(failedMode.current ?? 'refresh')}>Đọc lại lịch sử</button></div>}
    {ready && !error && !busy && !filteredCount && <p role="status">Chưa có hoạt động phù hợp trong phần lịch sử đã tải.</p>}
    {[...groups].map(([day, records]) => <section key={day} className="history-day"><h3>{day}</h3><ol>{records.map(event => {
      const source = historySourceLink(event);
      return <li key={event.eventId}><article><h4>{HISTORY_MODULE_LABELS[event.module]}</h4><p>{historyActivityLabel(event)}</p><p>{historyOutcomeLabel(event)}</p>
        <details><summary>Chi tiết lượt học</summary><p>{event.skill ? HISTORY_SKILL_LABELS[event.skill] : 'Chưa xác định kỹ năng'} · {event.modality === 'audio' ? 'Âm thanh' : event.modality === 'speech' ? 'Luyện nói' : event.modality === 'handwriting' ? 'Luyện chữ' : event.modality === 'text' ? 'Văn bản' : 'Chưa rõ hình thức'}</p>
          <p>{event.assistance.hint === true || event.assistance.reveal === true || event.assistance.tts === true ? 'Có gợi ý, mở đáp án hoặc âm tổng hợp; không coi là nhớ độc lập.' : 'Mức trợ giúp chỉ được kết luận khi nguồn có ghi nhận; thiếu dữ liệu không có nghĩa là không dùng hỗ trợ.'}</p>
          <p>{event.contentVersion === 'unknown' ? 'Chưa rõ phiên bản học liệu.' : 'Giữ liên kết với phiên bản học liệu của lượt này; bài hiện tại có thể đã đổi.'} Chưa đo thời lượng hoạt động.</p></details>
        <Link to={source.href}>{source.label}</Link></article></li>;
    })}</ol></section>)}
    {(filteredCount > visibleCount || more) && <button className="secondary-button" type="button" disabled={busy} onClick={() => { if (filteredCount > visibleCount) setVisibleCount(value => value + 20); else { setVisibleCount(value => value + 20); void load('more'); } }}>Xem thêm lịch sử</button>}
    {ready && <p role="status">Đang hiện {displayed.length} lượt trong {filteredCount} lượt phù hợp đã tải. Truy cập khu học khác với trả lời hoặc tự ôn.</p>}
  </section>;
}
