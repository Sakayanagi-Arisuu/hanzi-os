import { useEffect, useRef, useState } from 'react';
import type { LearningUnit, UnitTriple } from './learningUnit';
import type { AdaptiveJournal, AdaptivePracticeReceipt } from '../sync/adaptiveSession';
import './adaptiveUnit.css';

export type AdaptiveUnitRendererProps = {
  unit: LearningUnit; journal: AdaptiveJournal; busy: boolean; error: string;
  draft: { response: string; ime: boolean }; draftStatus: 'saved' | 'saving' | 'error';
  onDraft: (draft: { response: string; ime: boolean }) => void;
  onSupport: (kind: 'pinyin' | 'translation' | 'reveal' | 'syntheticTts') => Promise<unknown>;
  onPractice: (receipt: AdaptivePracticeReceipt) => Promise<unknown>;
  onAdvance: () => Promise<unknown>; onExit: () => void;
  onRetryDraft?: () => void;
  onOpenSource?: () => Promise<unknown>;
  playSynthetic?: (text: string) => void;
};

/** Content is supplied only by an exact source-policy adapter. No answer key or scoring lives here. */
export function AdaptiveUnitRenderer(props: AdaptiveUnitRendererProps) {
  const step = props.journal.snapshot.manifest.steps[props.journal.snapshot.cursor];
  if (props.journal.snapshot.manifest.shadowOnly || step?.kind !== 'unit' || step.unitId !== props.unit.id || step.unitBinding !== props.unit.binding
    || step.contentVersion !== props.unit.source.contentVersion || step.sourceLessonId !== props.unit.source.lessonId || step.taskType !== props.unit.taskType
    || step.skill !== props.unit.skill || step.modality !== props.unit.modality
    || props.journal.snapshot.manifest.graphBinding !== props.unit.graphBinding) {
    return <section className="adaptive-unit-unavailable" role="status"><h1>Chưa mở được bước luyện này</h1>
      <p>Phiên đã lưu được giữ nguyên. Quay về Thiên Lộ để chọn bài hiện có.</p><button onClick={props.onExit}>Về Thiên Lộ</button></section>;
  }
  return <UnitStep key={`${props.journal.snapshot.id}:${step.stepId}:${props.unit.binding}`} {...props} />;
}

function UnitStep({ unit, journal, busy, error, draft, draftStatus, onDraft, onSupport, onPractice, onAdvance, onExit, onRetryDraft, onOpenSource, playSynthetic }: AdaptiveUnitRendererProps) {
  const { snapshot } = journal;
  const step = snapshot.manifest.steps[snapshot.cursor]!;
  const support = snapshot.support[step.stepId];
  const receipt = snapshot.receipts[snapshot.cursor];
  const production = unit.scoringAdapter === 'self-review';
  const typed = production && unit.modality === 'text';
  const [selfReview, setSelfReview] = useState<'needs-practice' | 'compared' | null>(null);
  const [localError, setLocalError] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const act = async (work: () => Promise<unknown>, after?: () => void) => {
    setLocalError('');
    try { await work(); if (alive.current) after?.(); }
    catch { if (alive.current) setLocalError('Chưa lưu được thao tác. Giữ nguyên phiên và thử lại khi sẵn sàng.'); }
  };
  const triple = (row: UnitTriple, index: number) => <div className="adaptive-unit-line" key={`${index}:${row.hanzi}`}>
    {row.speaker && <strong>{row.speaker}</strong>}<p lang="zh-Hans">{row.hanzi}</p>
    {support?.pinyin && <p className="adaptive-unit-pinyin">{row.pinyin}</p>}
    {support?.translation && <p>{row.meaningVi}</p>}
  </div>;
  const save = () => onPractice({ stepId: step.stepId, unitBinding: unit.binding, kind: unit.scoringAdapter,
    response: typed ? draft.response : null, ime: typed ? draft.ime : null, selfReview: production ? selfReview : null });
  const canSave = !busy && (!production || selfReview !== null && (!typed || draft.response.trim().length > 0));
  return <section className="adaptive-unit-session" aria-labelledby="adaptive-unit-title">
    <header><button type="button" aria-label="Rời phiên và về Thiên Lộ" disabled={busy || draftStatus === 'saving'} onClick={onExit}>Về Thiên Lộ</button>
      <div><p>KHẢO LUYỆN · PHIÊN LUYỆN THEO MỤC TIÊU</p><h1 id="adaptive-unit-title">{production ? typed ? 'Viết lượt hỏi và trả lời' : 'Tự luyện lời hỏi và trả lời' : unit.taskType === 'explanation' ? 'Hiểu cách diễn đạt' : 'Đọc lượt hỏi đáp'}</h1>
        <span>Bước {snapshot.cursor + 1}/{snapshot.manifest.steps.length}</span></div></header>
    <div className="adaptive-unit-content" tabIndex={0} aria-label="Nội dung bước luyện">
      <div className="adaptive-unit-reading"><p>{unit.payload.instructionVi}</p>
        <p className="adaptive-unit-note">Đây là lượt luyện có ngữ cảnh và mẫu. Hoàn tất không tự xác nhận thành thạo hoặc thông qua cả bài nguồn.</p>
        {!unit.humanReviewed && <p className="adaptive-unit-note">Học liệu có AI hỗ trợ biên soạn, chưa được giáo viên hoặc người bản ngữ thẩm định.</p>}
        {onOpenSource && <details><summary>Học theo bài nguồn</summary><p>Nháp, câu trả lời và bước hiện tại được giữ khi mở bài. Quay lại Khảo Luyện để tiếp tục phiên đã lưu.</p>
          <button type="button" disabled={busy} onClick={() => void act(onOpenSource)}>Lưu nháp và mở bài nguồn</button></details>}
        <section aria-label="Ngữ cảnh đầy đủ">{unit.payload.dialogue.map(triple)}</section>
        {unit.payload.explanationVi && unit.payload.explanationVi !== unit.payload.instructionVi && <p>{unit.payload.explanationVi}</p>}
        <div className="adaptive-unit-support" aria-label="Hỗ trợ trong lượt luyện">
          <button type="button" disabled={busy || Boolean(support?.pinyin)} onClick={() => void act(() => onSupport('pinyin'))}>{support?.pinyin ? 'Đã hiện Pinyin' : 'Hiện Pinyin'}</button>
          <button type="button" disabled={busy || Boolean(support?.translation)} onClick={() => void act(() => onSupport('translation'))}>{support?.translation ? 'Đã hiện nghĩa' : 'Hiện nghĩa tiếng Việt'}</button>
          {playSynthetic && snapshot.manifest.context.audio && <button type="button" disabled={busy}
            onClick={() => void act(() => onSupport('syntheticTts'), () => playSynthetic(unit.payload.dialogue.map(row => row.hanzi).join(' ')))}>Nghe máy đọc · âm tổng hợp</button>}
        </div>
        {typed && <><label className="adaptive-unit-answer">Lượt hỏi và trả lời của bạn<textarea aria-label="Lượt hỏi và trả lời của bạn" value={receipt?.response ?? draft.response}
          maxLength={4000} rows={4} readOnly={Boolean(receipt)} onChange={event => onDraft({ ...draft, response: event.target.value })} /></label>
          <label className="adaptive-unit-check"><input type="checkbox" disabled={Boolean(receipt)} checked={receipt?.ime ?? draft.ime}
            onChange={event => onDraft({ ...draft, ime: event.target.checked })} />Có dùng bộ gõ tiếng Trung (IME)</label>
          <p role="status">{draftStatus === 'saving' ? 'Đang lưu nháp…' : draftStatus === 'error' ? 'Chưa lưu được nháp; giữ nguyên nội dung để thử lại.' : 'Nháp đã giữ trên thiết bị.'}</p></>}
        {unit.payload.models.length > 0 && <section aria-label="Đối chiếu với mẫu">
          <button type="button" disabled={busy || Boolean(support?.reveal)} onClick={() => void act(() => onSupport('reveal'))}>Đối chiếu với mẫu</button>
          {support?.reveal && unit.payload.models.map(triple)}</section>}
        {production && !receipt && <fieldset><legend>Tự đối chiếu lượt luyện · không phải điểm kiểm chứng</legend>
          <label><input type="radio" name="adaptive-self-review" checked={selfReview === 'needs-practice'} onChange={() => setSelfReview('needs-practice')} />Tôi còn cần luyện thêm</label>
          <label><input type="radio" name="adaptive-self-review" checked={selfReview === 'compared'} onChange={() => setSelfReview('compared')} />Tôi đã đối chiếu cách diễn đạt</label></fieldset>}
        {receipt && <p role="status">{receipt.kind === 'self-review' ? 'Đã giữ lượt tự đối chiếu; chưa phải bằng chứng thành thạo.' : 'Đã giữ lượt đọc và đối chiếu.'}</p>}
      </div>
    </div>
    <footer>{(error || localError) && <p role="alert">{error || localError}</p>}
      {draftStatus === 'error' && onRetryDraft && <button type="button" disabled={busy} onClick={onRetryDraft}>Thử lưu nháp lại</button>}
      {receipt ? <button className="adaptive-unit-primary" type="button" disabled={busy || journal.pending} onClick={() => void act(onAdvance)}>
        {journal.pending ? 'Đang chờ xác nhận lưu' : snapshot.cursor + 1 === snapshot.manifest.steps.length ? 'Khép phiên luyện' : 'Tiếp tục'}</button>
        : <button className="adaptive-unit-primary" type="button" disabled={!canSave} onClick={() => void act(save)}>{busy ? 'Đang lưu…' : production ? 'Lưu lượt tự đối chiếu' : 'Đã đọc · lưu lượt luyện'}</button>}
    </footer>
  </section>;
}
