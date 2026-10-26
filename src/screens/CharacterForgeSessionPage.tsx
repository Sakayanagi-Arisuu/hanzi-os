import {
  ArrowLeft,
  BookOpenText,
  Check,
  ChevronRight,
  CircleHelp,
  Layers3,
  LoaderCircle,
  PenLine,
  RotateCcw,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  advanceCharacterForgeSession,
  createCharacterForgeSession,
  createStrokeDirectionOptions,
  getAdaptiveAssistance,
  getUniqueReleasedCharacterEntries,
  getSessionAssistance,
  type CharacterForgePhase,
} from "../characters/characterForgeSession";
import { mergePublishedStudioCharacters } from "../content/publishedStudioClient";
import { usePublishedStudioCharacters } from "../content/usePublishedStudioCharacters";
import { loadHanziStrokeData, type HanziStrokeData } from "../characters/hanziStrokeData";
import { CharacterContextChallenge } from "../components/CharacterContextChallenge";
import { CharacterStructurePanel } from "../components/CharacterStructurePanel";
import { StrokeOrderPractice, type StrokePracticeResult } from "../components/StrokeOrderPractice";
import { LESSON_BY_ID, RELEASED_WORD_BY_ID, RELEASED_VOCABULARY } from "../data/curriculum";
import { GuildGlyph } from "../components/GuildGlyph";
import { GuildJourney } from "../components/GuildJourney";
import {
  RELEASED_CHARACTER_PRACTICE,
} from "../learning/richLessonContent";
import { useWritingJournal } from '../sync/useWritingJournal';
import { sha256Hex } from '../sync/canonicalHash';
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";
import { useLearningJourney } from "../store/LearningJourneyStore";
import { getCharacterScriptPresentation } from "./CharactersPage";
import { usePremiumCharacters } from "../commerce/usePremiumCharacters";
import "./CharactersPage.css";
import "./CharacterForgeSessionPage.css";
import "./GlyphGuild.css";
import "./GuildReference.css";

const phaseMeta: Record<CharacterForgePhase, { index: number; label: string; instruction: string }> = {
  structure: { index: 1, label: "Nhìn Xuyên Cấu Trúc", instruction: "Hiểu cấu trúc để viết đúng ngay từ đầu" },
  prediction: { index: 2, label: "Đoán Nét", instruction: "Quan sát và chọn hướng của nét tiếp theo" },
  guided: { index: 3, label: "Viết Theo Mẫu", instruction: "Đi theo nét mờ, bắt đầu từ điểm sáng" },
  recall: { index: 4, label: "Tự Viết", instruction: "Viết chữ từ trí nhớ, không có nét mờ" },
  context: { index: 5, label: "Văn Cảnh", instruction: "Nhận diện chữ trong ngữ cảnh từ bài học" },
};

type DrawingAlternative = "canvas" | "paper" | "choice";

function StrokePredictionStage({
  hanzi,
  displayHanzi,
  data,
  onReady,
  onMiss,
  initialAnswer,
  onResponse,
}: {
  hanzi: string;
  displayHanzi: string;
  data: HanziStrokeData | null;
  onReady: () => void;
  onMiss: () => void;
  initialAnswer?: string;
  onResponse: (answer: string, correct: boolean) => Promise<unknown>;
}) {
  const [answer, setAnswer] = useState<string | null>(initialAnswer ?? null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (initialAnswer !== undefined) setAnswer(initialAnswer); }, [initialAnswer]);
  const strokeIndex = data ? Math.min(Math.max(0, Math.floor(data.medians.length / 2)), data.medians.length - 1) : 0;
  const prediction = useMemo(() => data
    ? createStrokeDirectionOptions(data.medians[strokeIndex]!, hanzi.codePointAt(0) ?? 0)
    : null, [data, hanzi, strokeIndex]);
  const correct = answer === prediction?.answer;

  if (!data) return <div className="forge-stage-loading" role="status"><LoaderCircle className="is-spinning" /><strong>Đang chọn nét then chốt…</strong></div>;

  return (
    <section className="stroke-prediction" aria-labelledby="prediction-title">
      <div className="prediction-glyph">
        <svg className="guild-prediction-glyph" viewBox="0 0 1024 1024" role="img" aria-label={`${strokeIndex} nét đầu của chữ ${displayHanzi}`}>
          <path className="guild-writing-grid" d="M512 0V1024M0 512H1024M0 0L1024 1024M1024 0L0 1024" />
          <g transform="translate(0 900) scale(1 -1)">
            {data.strokes.slice(0, correct ? strokeIndex + 1 : strokeIndex).map((stroke, index) => <path key={index} d={stroke} />)}
          </g>
        </svg>
        <i>{strokeIndex + 1}</i>
      </div>
      <div className="prediction-copy">
        <span>TIÊN NÉT · DỰ ĐOÁN TRƯỚC KHI MỞ MẪU</span>
        <h2 id="prediction-title">Nét {strokeIndex + 1} đi theo hướng nào?</h2>
        <p>Chọn hướng của nét tiếp theo trước khi mở mẫu.</p>
        <div className="prediction-options" role="group" aria-label="Chọn hướng nét">
          {prediction!.options.map((option, index) => (
            <button
              key={option}
              type="button"
              className={answer ? option === prediction!.answer ? "is-correct" : option === answer ? "is-wrong" : "" : ""}
              disabled={saving}
              onClick={async () => {
                if (saving) return;
                setSaving(true);
                try {
                  await onResponse(option, option === prediction!.answer);
                  setAnswer(option);
                  if (option === prediction!.answer) onReady();
                  else onMiss();
                } catch { return; }
                finally { setSaving(false); }
              }}
            ><kbd>{index + 1}</kbd><span className={`direction-mark is-${option.replaceAll(" ", "-")}`} /><strong>{option}</strong></button>
          ))}
        </div>
        <p className="prediction-feedback" aria-live="polite">{answer === null ? "Hãy dự đoán trước khi sang bàn viết." : correct ? "Dự đoán đúng. Đường nét đã được ghi nhớ." : "Chưa đúng; quan sát quan hệ giữa điểm đầu và điểm cuối rồi thử lại."}</p>
      </div>
    </section>
  );
}

function DrawingFallbackStage({
  displayHanzi,
  contextWord,
  mode,
  prediction,
  onReady,
}: {
  displayHanzi: string;
  contextWord: string;
  mode: "paper" | "choice";
  prediction: ReturnType<typeof createStrokeDirectionOptions> | null;
  onReady: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const choiceCorrect = choice === prediction?.answer;
  return (
    <section className="drawing-fallback" aria-labelledby="drawing-fallback-title">
      <div className="fallback-seal"><span>{displayHanzi}</span><i /></div>
      <div>
        <span>{mode === "paper" ? "VIẾT TRÊN GIẤY" : "LỐI THAY THẾ KHÔNG CẦN VẼ"}</span>
        <h2 id="drawing-fallback-title">{mode === "paper" ? `Tự viết ${displayHanzi} trên giấy` : "Chọn hướng nét then chốt"}</h2>
        {mode === "paper" ? <>
          <ol><li>Che chữ mẫu, viết lại từ trí nhớ.</li><li>Mở mẫu và đối chiếu thứ tự, điểm đầu, hướng nét.</li><li>Đánh dấu nét đầu tiên cần sửa; không chấm độ đẹp.</li></ol>
          <button type="button" aria-pressed={confirmed} onClick={() => { setConfirmed(true); onReady(); }}><Check /> {confirmed ? "Đã ghi nhận đối chiếu" : "Tôi đã viết và đối chiếu"}</button>
        </> : <>
          <p>Với từ <strong>{contextWord}</strong>, hãy chọn hướng của một nét then chốt. Đây là lối luyện bằng bàn phím, không biến lựa chọn thành điểm thông thạo.</p>
          <div className="fallback-options">{prediction?.options.map((option, index) => <button key={option} type="button" className={choice ? option === prediction.answer ? "is-correct" : option === choice ? "is-wrong" : "" : ""} onClick={() => { setChoice(option); if (option === prediction.answer) onReady(); }}><kbd>{index + 1}</kbd>{option}</button>)}</div>
          <p aria-live="polite">{choice === null ? "Chọn một hướng nét." : choiceCorrect ? "Đúng hướng; có thể tiếp tục." : "Chưa đúng, thử một hướng khác."}</p>
        </>}
      </div>
    </section>
  );
}

export function CharacterForgeSessionPage() {
  const { state, actions, sync } = useLearning();
  const { recordReceipt } = useLearningJourney();
  const navigate = useNavigate();
  const publishedCharacters = usePublishedStudioCharacters();
  const premiumCharacters = usePremiumCharacters(sync.ownerKey);
  const characterEntries = useMemo(() => mergePublishedStudioCharacters(
    [...RELEASED_CHARACTER_PRACTICE, ...premiumCharacters],
    publishedCharacters.entries,
  ), [premiumCharacters, publishedCharacters.entries]);
  const uniqueCharacters = useMemo(
    () => getUniqueReleasedCharacterEntries(characterEntries),
    [characterEntries],
  );
  const journal = useWritingJournal(sync.ownerKey, state.contentVersion, characterEntries, state.profile.script);
  const { change: changeJournal } = journal;
  const session = journal.compatible ? journal.snapshot?.session ?? null : null;
  const [stageReady, setStageReady] = useState(false);
  const [strokeData, setStrokeData] = useState<HanziStrokeData | null>(null);
  const [drawingAlternative, setDrawingAlternative] = useState<DrawingAlternative>("canvas");
  const [currentNeedsReplay, setCurrentNeedsReplay] = useState(false);
  const [usedPaper, setUsedPaper] = useState(false);
  const [strokeResult, setStrokeResult] = useState<StrokePracticeResult | null>(null);
  const [resultPanel, setResultPanel] = useState("summary");
  const [practiceSave, setPracticeSave] = useState<'saving' | 'pending' | 'saved' | 'error'>('saving');

  const entryByHanzi = useMemo(() => new Map(uniqueCharacters.map((entry) => [entry.hanzi, entry])), [uniqueCharacters]);
  const currentHanzi = session?.hanzis[session.currentIndex] ?? "";
  const lesson = session?.lessonId ? LESSON_BY_ID.get(session.lessonId) ?? null : null;
  const currentEntry = useMemo(() => {
    if (!currentHanzi) return null;
    const exact = session?.lessonId
      ? characterEntries.find((entry) => entry.lessonId === session.lessonId && entry.hanzi === currentHanzi)
      : null;
    if (exact) return exact;
    const base = entryByHanzi.get(currentHanzi) ?? null;
    if (!base || !lesson) return base;
    const contextWord = lesson.wordIds
      .map((wordId) => RELEASED_WORD_BY_ID.get(wordId))
      .find((word) => word?.simplified.includes(currentHanzi));
    return contextWord ? {
      ...base,
      contextWord: contextWord.simplified,
      contextPinyin: contextWord.pinyin,
      contextMeaningVi: contextWord.meaning,
    } : base;
  }, [characterEntries, currentHanzi, entryByHanzi, lesson, session?.lessonId]);
  const currentView = currentEntry ? getCharacterScriptPresentation(currentEntry, state.profile.script) : null;
  const routeSource = session?.source;
  const routeIndex = session?.currentIndex;
  const routePhase = session?.phase;
  const stageRef = useRef<HTMLElement>(null);
  const advancingRef = useRef(false);
  const phaseResponse = session ? journal.snapshot?.responses[`${session.currentIndex}:${session.phase}`] : undefined;
  useEffect(() => {
    if (stageRef.current) stageRef.current.scrollTop = 0;
  }, [routePhase, routeIndex]);
  const routeLessonId = session?.lessonId;
  const challengeEntries = useMemo(() => uniqueCharacters.map((entry) => {
    const presentation = getCharacterScriptPresentation(entry, state.profile.script);
    return {
      id: entry.id,
      hanzi: entry.hanzi,
      displayHanzi: presentation.displayHanzi,
      contextWord: presentation.displayContextWord,
      contextPinyin: entry.contextPinyin,
      contextMeaningVi: entry.contextMeaningVi,
    };
  }), [state.profile.script, uniqueCharacters]);

  useEffect(() => {
    if (!routeSource || routeIndex === undefined || !routePhase) return;
    navigate(`/characters/session?source=${routeSource}&index=${routeIndex}&phase=${routePhase}${routeLessonId ? `&lesson=${encodeURIComponent(routeLessonId)}` : ""}`, { replace: true });
  }, [navigate, routeIndex, routeLessonId, routePhase, routeSource]);

  useEffect(() => {
    setStageReady(false);
    setDrawingAlternative("canvas");
    setCurrentNeedsReplay(false);
    setUsedPaper(false);
    setStrokeResult(null);
  }, [currentHanzi, session?.phase]);

  useEffect(() => {
    if (!phaseResponse) return;
    setStageReady(session?.phase === 'context' || phaseResponse.latestCorrect);
    if (!phaseResponse.firstCorrect) setCurrentNeedsReplay(true);
  }, [phaseResponse, session?.phase]);

  useEffect(() => {
    if (!currentHanzi || session?.phase === "result") return;
    let active = true;
    setStrokeData(null);
    loadHanziStrokeData(currentHanzi)
      .then((data) => { if (active) setStrokeData(data); })
      .catch(() => { if (active) setStrokeData(null); });
    return () => { active = false; };
  }, [currentHanzi, session?.phase]);

  useEffect(() => {
    if (!session || session.phase !== "result") return;
    if (journal.snapshot?.legacy && journal.snapshot.revision === 0) {
      setPracticeSave('saved');
      return;
    }
    let active = true;
    setPracticeSave('saving');
    const operationIds = session.completedHanzis.map(hanzi => `character-forge:${session.updatedAt}:${hanzi}`);
    const confirm = async () => {
      if (sync.session?.authenticated) {
        const { currentWorkspaceScope } = await import('../sync/workspaceSync');
        const { practiceObservationsConfirmed } = await import('../sync/practiceConfirmation');
        const { readWritingSession } = await import('../sync/writingSession');
        const scope = await currentWorkspaceScope(sync.ownerKey);
        const savedSession = scope ? await readWritingSession(scope) : null;
        if (!scope || !savedSession || savedSession.id !== journal.snapshot?.id || savedSession.pending || !await practiceObservationsConfirmed(scope, operationIds)) {
          if (active) setPracticeSave('pending');
          return;
        }
      }
      if (!active) return;
      setPracticeSave('saved');
      recordReceipt({ stage: 'transfer', source: 'writing', lessonId: session.lessonId,
        activityId: `character-forge:${session.updatedAt}:journey-transfer` });
    };
    void Promise.all(session.completedHanzis.map(hanzi => actions.recordPracticeEvidence({
        idempotencyKey: `character-forge:${session.updatedAt}:${hanzi}`,
        activityVersion: `${state.contentVersion}:character-forge:1`,
        source: "writing",
        method: "stroke-quiz",
        activityId: `character-forge:${session.lessonId ?? "free"}:${hanzi}`,
        skill: "writing",
        outcome: "unverified",
        score: null,
        metadata: {
          hanzi,
          sourceLessonId: session.lessonId,
          assistanceLevel: session.assistanceByHanzi[hanzi] ?? null,
          needsReplay: session.needsReplay.includes(hanzi),
          usedPaper: session.paperHanzis.includes(hanzi),
          sourceItemVersion: journal.snapshot?.sourceVersion ?? 'unknown',
          sessionSummary: true,
        },
      }))).then(confirm).catch(() => { if (active) setPracticeSave('error'); });
    const received = () => { void confirm().catch(() => { if (active) setPracticeSave('error'); }); };
    window.addEventListener('hanzi-workspace-received', received);
    return () => { active = false; window.removeEventListener('hanzi-workspace-received', received); };
  }, [actions, recordReceipt, session, state.contentVersion, sync.ownerKey, sync.session?.authenticated, journal.snapshot?.id, journal.snapshot?.legacy, journal.snapshot?.revision, journal.snapshot?.sourceVersion]);

  const recordAssistance = useCallback((level: number) => {
    if (!currentHanzi) return;
    void changeJournal(current => current.assistanceByHanzi[currentHanzi] === level ? current : ({
      ...current,
      assistanceByHanzi: { ...current.assistanceByHanzi, [currentHanzi]: level },
      updatedAt: new Date().toISOString(),
    }), 'support', { phase: 'assistance', hanzi: currentHanzi, assistanceLevel: level }).catch(() => undefined);
  }, [currentHanzi, changeJournal]);
  const acceptStrokeResult = useCallback((result: StrokePracticeResult) => {
    setStrokeResult(result);
    setStageReady(true);
    if (result.misses > 1 || result.assistedStrokes > 0) setCurrentNeedsReplay(true);
  }, []);
  const acceptStructure = useCallback(() => setStageReady(true), []);
  const acceptStrokeData = useCallback((data: HanziStrokeData) => setStrokeData(data), []);
  const recordSupport = async (kind: string, strokeIndex: number | null = null, stimulus: string | null = null) => {
    if (!session) throw new Error('Writing source unavailable');
    const strokeDataVersion = strokeData ? await sha256Hex(strokeData) : null;
    return journal.change(current => {
      if (current.phase !== session.phase || current.currentIndex !== session.currentIndex) throw new Error('Writing phase changed');
      return current;
    }, 'support', { phase: session.phase, kind, strokeIndex, stimulus,
      syntheticTts: kind === 'tts', playback: kind === 'tts' ? 'requested' : null, strokeDataVersion,
      strokeDataset: 'hanzi-writer-data@2.0.1', strokeProvenance: 'public/hanzi-data/NOTICE.txt' });
  };

  if (!session || !currentEntry || !currentView) return (
    <div className="forge-session-missing" role="status">
      <Layers3 />
      <h1>Chưa có phôi chữ trong lò</h1>
      <p>{journal.error || (!journal.ready ? 'Đang đọc phiên đã lưu…' : journal.snapshot ? 'Học liệu đã đổi phiên bản. Phiên cũ được giữ; về Sảnh để bắt đầu với nội dung hiện hành.' : 'Chưa có phiên đã lưu. Phiên cũ trên thiết bị vẫn được giữ trong Sảnh.')}</p>
      <Link to="/characters">Về Sảnh Thần Văn Lô <ChevronRight /></Link>
    </div>
  );

  if (session.phase === "result") {
    const resultEntries = session.hanzis.map((hanzi) => entryByHanzi.get(hanzi)).filter(Boolean);
    return (
      <div className="forge-result guild-theme" data-result-panel={resultPanel} aria-label="Mạch Chữ Hoàn Thành">
        <nav className="guild-result-tabs" aria-label="Nội dung kết quả"><button type="button" aria-pressed={resultPanel === "summary"} onClick={() => setResultPanel("summary")}>Kết quả</button><button type="button" aria-pressed={resultPanel === "journey"} onClick={() => setResultPanel("journey")}>Hành trình</button></nav>
        <div className="guild-result-left">
        {journal.error && <p role="alert">{journal.error}<button type="button" disabled={journal.busy} onClick={() => {
          void journal.retry().catch(() => undefined);
        }}>Thử lưu lại phiên</button></p>}
        <span className="forge-kicker">PHIÊN TÔI LUYỆN · ĐÃ TÁI HỢP</span>
        <h1 id="forge-result-title">{practiceSave === 'saved' ? 'Mạch Chữ Hoàn Thành' : 'Đang lưu mạch chữ'}</h1>
        <p>Hành trình luyện {session.completedHanzis.join(" · ")} đã đi hết năm bước.</p>
        <GuildJourney step={6} />
        <div className="guild-result-orbit guild-glyph-orbit"><GuildGlyph hanzi={session.hanzis.at(-1)!} /></div>
        <p className="guild-result-completed" role={practiceSave === 'error' ? 'alert' : 'status'}><ShieldCheck />
          {practiceSave === 'saved' ? 'Đã lưu 5/5 bước luyện' : practiceSave === 'error' ? 'Chưa lưu xong lượt luyện; dữ liệu cũ vẫn được giữ. Hãy mở lại để thử lưu tiếp.' : practiceSave === 'pending' ? 'Đã giữ lượt luyện trên thiết bị, đang chờ đồng bộ' : 'Đang lưu lượt luyện…'}
        </p>
        <div className="forge-result-glyphs">{resultEntries.map((entry) => <span key={entry!.id} className={session.needsReplay.includes(entry!.hanzi) ? "needs-replay" : ""}><strong>{getCharacterScriptPresentation(entry!, state.profile.script).displayHanzi}</strong><small>{session.needsReplay.includes(entry!.hanzi) ? "Nên luyện lại" : "Đã đi trọn vòng"}</small></span>)}</div>
        </div>
        <div className="guild-result-right">
        <section className="guild-result-summary guild-panel"><h2>TÓM TẮT HÀNH TRÌNH</h2>
        <dl>
          <div><dt>Chữ đã luyện</dt><dd>{session.completedHanzis.length}</dd></div>
          <div><dt>Cần luyện lại</dt><dd>{session.needsReplay.length}</dd></div>
          <div><dt>Viết trên giấy</dt><dd>{session.paperHanzis.length}</dd></div>
        </dl>
        <p><Check /> Đã đi qua Nhìn Xuyên, Đoán Nét và Văn Cảnh.</p>
        <p><PenLine /> Theo Mẫu và Tự Viết được ghi theo cách luyện đã chọn; hoàn tất không tự trở thành điểm thành thạo.</p>
        <p><BookOpenText /> Từ trong bài: {resultEntries.map((entry) => entry!.contextWord).join(" · ")}</p>
        </section>
        <section className="guild-result-next guild-panel"><h2>BƯỚC TIẾP THEO</h2><p>{session.needsReplay.length ? `Luyện lại ${session.needsReplay.join(" · ")} để củng cố nét còn vướng.` : "Tiếp tục bài học hoặc chọn một mạch chữ mới."}</p><small>Lịch ôn và mức thành thạo phụ thuộc bằng chứng học thực tế.</small></section>
        <div className="forge-result-actions">
          <Link className="primary" to="/characters">Về Sảnh Luyện Chữ <ChevronRight /></Link>
          {lesson && <Link className="primary" to={`/lesson/${encodeURIComponent(lesson.id)}`}><BookOpenText /> Trở về bài {lesson.title} <ChevronRight /></Link>}
          <button className={lesson ? "" : "primary"} type="button" disabled={practiceSave !== 'saved' || journal.busy || Boolean(journal.error)} onClick={() => {
            const next = createCharacterForgeSession({ entries: characterEntries, source: session.source, lessonId: session.lessonId, requestedHanzis: session.needsReplay.length ? session.needsReplay : session.hanzis, limit: session.hanzis.length });
            if (next) void journal.start(next).catch(() => undefined);
          }}><RotateCcw /> {session.needsReplay.length ? "Luyện lại chữ đang vướng" : "Tôi luyện thêm một vòng"}</button>
        </div>
        </div>
        <p className="guild-result-footnote">Hoàn thành hành trình không đồng nghĩa đã thành thạo; tiếp tục luyện trong bài học và lịch ôn.</p>
      </div>
    );
  }

  const meta = phaseMeta[session.phase];
  const prediction = strokeData
    ? createStrokeDirectionOptions(strokeData.medians[Math.min(Math.floor(strokeData.medians.length / 2), strokeData.medians.length - 1)]!, currentHanzi.codePointAt(0) ?? 0)
    : null;
  const isDrawingPhase = session.phase === "guided" || session.phase === "recall";
  const currentAssistance = getSessionAssistance(session, currentHanzi, session.phase === "guided" ? 3 : 0);
  const seenContextWords = new Set<string>();
  const relatedWords = RELEASED_VOCABULARY.filter((word) => {
    if (word.simplified.length < 2 || !word.simplified.includes(currentHanzi) || seenContextWords.has(word.simplified)) return false;
    seenContextWords.add(word.simplified);
    return true;
  }).slice(0, 3).map((word) => ({ word: word.simplified, pinyin: word.pinyin, meaning: word.meaning }));

  const advance = async () => {
    if (!stageReady || journal.busy || journal.error || advancingRef.current) return;
    advancingRef.current = true;
    try {
      const strokeDataVersion = strokeData ? await sha256Hex(strokeData) : null;
      await journal.change(current => {
        if (current.phase !== session.phase || current.currentIndex !== session.currentIndex) throw new Error('Writing phase changed');
        return advanceCharacterForgeSession(current, { needsReplay: currentNeedsReplay, usedPaper });
      }, session.phase === 'structure' ? 'exposure' : session.phase === 'guided' || session.phase === 'recall' ? 'self-review' : 'session',
      { phase: session.phase, hanzi: currentHanzi, usedPaper, needsReplay: currentNeedsReplay,
        assistanceLevel: session.assistanceByHanzi[currentHanzi] ?? null, practiceMode: drawingAlternative, answerVerified: false,
        strokeDataVersion, strokeMisses: drawingAlternative === 'canvas' ? strokeResult?.misses ?? null : null,
        assistedStrokes: drawingAlternative === 'canvas' ? strokeResult?.assistedStrokes ?? null : null });
    } catch { return; }
    finally { advancingRef.current = false; }
  };

  const primaryLabel = session.phase === "context"
    ? session.currentIndex === session.hanzis.length - 1 ? "Hoàn tất phiên" : "Tôi luyện chữ tiếp theo"
    : session.phase === "structure" ? "Tiếp tục: đoán nét"
      : session.phase === "prediction" ? "Tiếp tục: viết theo mẫu"
        : session.phase === "guided" ? "Tiếp tục: tự viết"
          : "Tiếp tục: dùng trong từ";

  return (
    <div className="forge-session guild-theme" data-phase={session.phase}>
      <header className="forge-session-command">
        <Link to="/characters" aria-label="Rời phiên và về Sảnh"><ArrowLeft /></Link>
        <div className="forge-session-identity"><div className="realm-emblem realm-emblem-compact" aria-hidden="true" />
          <h1>{meta.label} <small>· Chữ {session.currentIndex + 1}/{session.hanzis.length}</small></h1>
          <small>{meta.instruction}</small>
        </div>
        <div className="forge-session-progress" aria-label={`Bước ${meta.index} trên 5`}>
          <span>Bước {meta.index}/5</span>
          <progress max={5} value={meta.index}>{meta.index}/5</progress>
        </div>
      </header>

      <section ref={stageRef} className={`forge-session-stage${isDrawingPhase ? " is-drawing" : ""}`} tabIndex={-1} aria-label="Nội dung luyện chữ">
        {journal.error && <div role="alert">{journal.error}<button type="button" disabled={journal.busy} onClick={() => {
          void journal.retry().catch(() => undefined);
        }}>Thử lưu lại thao tác</button><Link to="/characters">Mở lại phiên đã lưu</Link></div>}
        {!isDrawingPhase && <div className="forge-stage-heading">
          <span>PHA {meta.index}/5</span>
          <h1>{meta.label}</h1>
          <p>{meta.instruction}</p>
          <div><button type="button" disabled={journal.busy} onClick={() => { void recordSupport('tts', null, currentHanzi).then(() => speakMandarin(currentHanzi)).catch(() => undefined); }} aria-label={`Nghe chữ ${currentHanzi}`}><Volume2 /> Nghe chữ</button><button type="button" disabled={journal.busy} onClick={() => { void recordSupport('tts', null, currentEntry.contextWord).then(() => speakMandarin(currentEntry.contextWord)).catch(() => undefined); }} aria-label={`Nghe từ ${currentEntry.contextWord}`}><Volume2 /> Nghe từ</button></div>
        </div>}

        <div className={`forge-stage-content${isDrawingPhase ? " is-drawing" : ""}`}>
          {session.phase === "structure" && <CharacterStructurePanel hanzi={currentHanzi} displayHanzi={currentView.displayHanzi} contextWord={currentView.displayContextWord} pinyin={currentEntry.contextPinyin} meaning={currentEntry.contextMeaningVi} onReady={acceptStrokeData} onComplete={acceptStructure} />}
          {session.phase === "prediction" && <StrokePredictionStage hanzi={currentHanzi} displayHanzi={currentView.displayHanzi} data={strokeData} initialAnswer={phaseResponse?.latestAnswer} onResponse={journal.answer} onReady={() => setStageReady(true)} onMiss={() => { setCurrentNeedsReplay(true); recordAssistance(getAdaptiveAssistance(currentAssistance, "miss")); }} />}
          {isDrawingPhase && drawingAlternative === "canvas" && <StrokeOrderPractice key={`${journal.snapshot?.id}:${currentHanzi}:${session.phase}`} hanzi={currentHanzi} cue={{ pinyin: currentEntry.pinyin, meaning: currentEntry.meaningVi }} variant={session.phase === "recall" ? "memory" : "guided"} initialAssistance={currentAssistance} onAssistanceChange={recordAssistance} onSupport={recordSupport} onComplete={acceptStrokeResult} />}
          {isDrawingPhase && drawingAlternative !== "canvas" && <DrawingFallbackStage displayHanzi={session.phase === "recall" ? "?" : currentView.displayHanzi} contextWord={currentView.displayContextWord} mode={drawingAlternative} prediction={prediction} onReady={() => { setStageReady(true); setUsedPaper(drawingAlternative === "paper"); }} />}
          {session.phase === "context" && <CharacterContextChallenge key={`${journal.snapshot?.id}:${currentHanzi}`} initialAnswer={phaseResponse?.firstAnswer} onBeforeResolve={journal.answer} entry={{ id: currentEntry.id, hanzi: currentEntry.hanzi, displayHanzi: currentView.displayHanzi, contextWord: currentView.displayContextWord, contextPinyin: currentEntry.contextPinyin, contextMeaningVi: currentEntry.contextMeaningVi }} entries={challengeEntries} contextWords={relatedWords} onResolved={(correct) => { setStageReady(true); setCurrentNeedsReplay(!correct); }} />}
        </div>
      </section>

      <footer className="forge-action-dock">
        {!isDrawingPhase && <div className="forge-action-note"><span><strong>{session.phase === "context" && !stageReady ? "Khôi phục từ còn thiếu" : currentView.displayContextWord}</strong><small>{currentEntry.contextPinyin} · {currentEntry.contextMeaningVi}</small></span></div>}
        {isDrawingPhase && <details className="forge-alternatives-menu">
          <summary><CircleHelp /> Cách luyện khác</summary>
          <div role="group" aria-label="Cách luyện thay thế">
            <button type="button" aria-pressed={drawingAlternative === "paper"} onClick={() => setDrawingAlternative((mode) => mode === "paper" ? "canvas" : "paper")}><PenLine /> {drawingAlternative === "paper" ? "Về bàn viết" : "Viết trên giấy"}</button>
            <button type="button" aria-pressed={drawingAlternative === "choice"} onClick={() => setDrawingAlternative((mode) => mode === "choice" ? "canvas" : "choice")}><CircleHelp /> {drawingAlternative === "choice" ? "Về bàn viết" : "Dùng bàn phím"}</button>
          </div>
        </details>}
        <button className="forge-advance" type="button" disabled={!stageReady || journal.busy || Boolean(journal.error)} onClick={advance}>{journal.busy ? 'Đang lưu…' : stageReady ? primaryLabel : session.phase === "structure" ? "Xem đủ các phần để tiếp tục" : session.phase === "prediction" ? "Chọn đúng hướng nét" : isDrawingPhase ? "Viết đủ các nét để tiếp tục" : "Chọn một đáp án"}<ChevronRight /></button>
      </footer>
    </div>
  );
}
