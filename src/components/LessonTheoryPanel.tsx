import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Database,
  Headphones,
  LibraryBig,
  ListChecks,
  PenTool,
  Target,
  Volume2,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  getLessonExpansionPack,
  loadMegaLexicon,
  type MegaVocabularyItem,
} from "../content/megaLexicon";
import type { LessonGuide } from "../data/lessonGuides";
import { speakMandarin } from "../lib/speech";
import type { ExerciseKind, VocabularyItem } from "../types";

const TONE_PRIMER = [
  { tone: "Thanh 1", points: "8,10 52,10", pinyin: "mā", copy: "cao và ngang" },
  { tone: "Thanh 2", points: "8,42 52,10", pinyin: "má", copy: "đi từ thấp lên cao" },
  { tone: "Thanh 3", points: "8,24 27,43 52,12", pinyin: "mǎ", copy: "hạ thấp; cuối cụm mới nhấc" },
  { tone: "Thanh 4", points: "8,9 52,43", pinyin: "mà", copy: "rơi nhanh và dứt" },
  { tone: "Thanh nhẹ", points: "29,24 31,24", pinyin: "ma", copy: "ngắn, nhẹ, phụ thuộc âm trước" },
] as const;

const THEORY_STEPS = [
  { id: "concept", index: "01", label: "Hiểu nguyên tắc", shortLabel: "Hiểu" },
  { id: "words", index: "02", label: "Học từ sẽ gặp", shortLabel: "Học từ" },
  { id: "practice", index: "03", label: "Xem cách làm", shortLabel: "Thử mẫu" },
] as const;

const DEFAULT_PRACTICE_KINDS: ExerciseKind[] = [
  "meaning",
  "pinyin",
  "tone",
  "listening",
  "recall",
  "sentence",
];

const toneLabel = (tone: number) => tone === 0 ? "thanh nhẹ" : `thanh ${tone}`;

const displayCharacter = (
  word: VocabularyItem,
  script: "simplified" | "traditional",
) => script === "traditional" ? word.traditional : word.simplified;

function practiceGuide(
  kind: ExerciseKind,
  word: VocabularyItem | undefined,
  script: "simplified" | "traditional",
) {
  const character = word ? displayCharacter(word, script) : "chữ mục tiêu";
  const syllable = word?.syllables[0];
  switch (kind) {
    case "meaning":
      return { title: "Nhìn chữ → nhớ nghĩa", cue: character, response: word?.meaning ?? "nghĩa đã học" };
    case "pinyin":
      return { title: "Nhìn chữ → chọn Pinyin", cue: character, response: word?.pinyin ?? "cách đọc đã học" };
    case "tone":
      return { title: "Nhìn dấu → nhận hướng thanh", cue: syllable?.marked ?? word?.pinyin ?? "âm tiết", response: syllable ? toneLabel(syllable.lexicalTone) : "hướng cao độ" };
    case "listening":
      return { title: "Nghe từ → chọn nghĩa", cue: `Nghe “${character}”`, response: word?.meaning ?? "nghĩa đã học" };
    case "recall":
      return { title: "Nhìn nghĩa → tự gọi chữ", cue: word?.meaning ?? "nghĩa đã học", response: character };
    case "sentence":
      return { title: "Đọc câu → hiểu nội dung", cue: word?.example ?? "câu mẫu đã học", response: word?.exampleMeaning ?? "nghĩa câu mẫu" };
    case "tone-pair":
      return { title: "Nhìn hai thanh → nhận biến điệu", cue: "thanh từ điển", response: "cách đọc trong cụm" };
  }
}

export function LessonTheoryPanel({
  guide,
  lessonId,
  lessonWords,
  script,
  practiceKinds,
  compact = false,
  onReadinessChange,
}: {
  guide: LessonGuide;
  lessonId: string;
  lessonWords: readonly VocabularyItem[];
  script: "simplified" | "traditional";
  practiceKinds?: readonly ExerciseKind[];
  compact?: boolean;
  onReadinessChange?: (ready: boolean) => void;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(compact ? 2 : 0);
  const [activeWord, setActiveWord] = useState(0);
  const [wordSource, setWordSource] = useState<"core" | "expanded">("core");
  const [expandedWords, setExpandedWords] = useState<MegaVocabularyItem[] | null>(null);
  const [expandedWordIndex, setExpandedWordIndex] = useState(0);
  const [expansionError, setExpansionError] = useState("");
  const [canScrollFurther, setCanScrollFurther] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const preparedKinds = useMemo(() => {
    const kinds = practiceKinds?.length
      ? practiceKinds
      : lessonId === "boot-1"
        ? (["pinyin", "tone", "listening"] as ExerciseKind[])
        : DEFAULT_PRACTICE_KINDS;
    return [...new Set(kinds)];
  }, [lessonId, practiceKinds]);
  const word = lessonWords[activeWord] ?? lessonWords[0];

  useEffect(() => {
    setActiveStep(0);
    setFurthestStep(compact ? 2 : 0);
    setActiveWord(0);
    setWordSource("core");
    setExpandedWords(null);
    setExpandedWordIndex(0);
    setExpansionError("");
    onReadinessChange?.(false);
  }, [compact, lessonId, onReadinessChange]);

  useEffect(() => {
    if (activeStep !== 1 || expandedWords || expansionError) return;
    let active = true;
    loadMegaLexicon()
      .then((artifact) => {
        if (!active) return;
        setExpandedWords(getLessonExpansionPack(artifact, lessonId)?.words ?? []);
      })
      .catch(() => { if (active) setExpansionError("Kho từ mở rộng của bài chưa tải được."); });
    return () => { active = false; };
  }, [activeStep, expandedWords, expansionError, lessonId]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.scrollTop = 0;
    const frame = requestAnimationFrame(() => {
      setCanScrollFurther(stage.scrollHeight - stage.clientHeight > 16);
      setScrollProgress(0);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeStep, activeWord, compact, lessonId]);

  useEffect(() => {
    const handleResize = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const maximum = Math.max(0, stage.scrollHeight - stage.clientHeight);
      setCanScrollFurther(
        stage.scrollHeight - stage.scrollTop - stage.clientHeight > 16,
      );
      setScrollProgress(maximum === 0 ? 100 : (stage.scrollTop / maximum) * 100);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const updateScrollAffordance = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const maximum = Math.max(0, stage.scrollHeight - stage.clientHeight);
    setCanScrollFurther(
      stage.scrollHeight - stage.scrollTop - stage.clientHeight > 16,
    );
    setScrollProgress(maximum === 0 ? 100 : (stage.scrollTop / maximum) * 100);
  };

  const revealMoreTheory = () => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.scrollTo({
      top: Math.min(
        stage.scrollHeight,
        stage.scrollTop + Math.max(120, stage.clientHeight * 0.72),
      ),
    });
    requestAnimationFrame(updateScrollAffordance);
  };

  const goToStep = (nextStep: number) => {
    if (nextStep < 0 || nextStep > 2 || (!compact && nextStep > furthestStep)) return;
    setActiveStep(nextStep);
  };

  const advance = () => {
    if (activeStep < 2) {
      const nextStep = activeStep + 1;
      setFurthestStep((current) => Math.max(current, nextStep));
      setActiveStep(nextStep);
      return;
    }
    onReadinessChange?.(true);
  };

  return (
    <div className={`lesson-theory-panel ${compact ? "is-compact" : ""}`}>
      <nav className="lesson-theory-steps" aria-label="Ba chặng học trước khi làm bài">
        {THEORY_STEPS.map((step, stepIndex) => (
          <button
            key={step.id}
            type="button"
            disabled={!compact && stepIndex > furthestStep}
            aria-current={activeStep === stepIndex ? "step" : undefined}
            onClick={() => goToStep(stepIndex)}
          >
            <span>{step.index}</span>
            <strong>{step.label}</strong>
            <small>{step.shortLabel}</small>
            {stepIndex < furthestStep && <CheckCircle2 size={15} aria-hidden="true" />}
          </button>
        ))}
      </nav>

      <div className={`lesson-theory-stage-frame ${canScrollFurther ? "has-more" : ""}`}>
        <div
          className="lesson-theory-stage"
          ref={stageRef}
          onScroll={updateScrollAffordance}
        >
        {activeStep === 0 && (
          <section className="theory-concept-stage" aria-labelledby="theory-concept-title">
            <header>
              <span><BrainCircuit size={17} /> NGUYÊN TẮC CẦN BIẾT</span>
              <h2 id="theory-concept-title">{guide.concept}</h2>
              <p>{guide.rule}</p>
            </header>

            {lessonId === "boot-1" && (
              <div className="tone-theory-primer">
                <header>
                  <span><Waves size={17} /> NHÌN ĐƯỜNG GIỌNG</span>
                  <strong>Cao độ đi theo hướng nào thì thanh điệu đi theo hướng đó</strong>
                </header>
                <div className="tone-theory-grid">
                  {TONE_PRIMER.map((item) => (
                    <article key={item.tone}>
                      <svg viewBox="0 0 60 52" aria-hidden="true">
                        <path d="M5 10H55M5 26H55M5 42H55" />
                        <polyline points={item.points} />
                      </svg>
                      <div><strong>{item.tone}</strong><small>{item.copy}</small></div>
                      <b>{item.pinyin}</b>
                    </article>
                  ))}
                </div>
              </div>
            )}

            <div className="theory-concept-support">
              <div className="guide-examples">
                {guide.examples.map((example) => (
                  <button
                    key={example.chinese}
                    type="button"
                    onClick={() => speakMandarin(example.chinese)}
                    aria-label={`Nghe ví dụ ${example.chinese}`}
                  >
                    <Volume2 size={17} />
                    <span><strong>{example.chinese}</strong><small>{example.pinyin}</small></span>
                    <em>{example.meaning}</em>
                  </button>
                ))}
              </div>
              <aside>
                <div><span><AlertTriangle size={16} /> DỄ NHẦM</span><p>{guide.pitfall}</p></div>
                <div><span><Target size={16} /> TỰ KIỂM</span><p>{guide.checkpoint}</p></div>
              </aside>
            </div>
          </section>
        )}

        {activeStep === 1 && word && (
          <section className="theory-word-stage" aria-labelledby="theory-word-title">
            <div className="theory-word-source-tabs" role="group" aria-label="Chọn nhóm từ trong bài">
              <button type="button" aria-pressed={wordSource === "core"} onClick={() => setWordSource("core")}>
                <Target size={16} /> Trọng tâm thử luyện <small>{lessonWords.length}</small>
              </button>
              <button
                type="button"
                aria-pressed={wordSource === "expanded"}
                disabled={!expandedWords?.length}
                onClick={() => setWordSource("expanded")}
              >
                <LibraryBig size={16} /> Mở rộng trong bài <small>{expandedWords?.length ?? "…"}</small>
              </button>
            </div>
            {wordSource === "core" ? <>
            <header>
              <span>TRỌNG TÂM {String(activeWord + 1).padStart(2, "0")} / {String(lessonWords.length).padStart(2, "0")}</span>
              <h2 id="theory-word-title">Học đúng những từ sẽ xuất hiện trong lượt làm bài</h2>
            </header>
            <div className="theory-word-picker" aria-label="Danh sách từ của bài">
              {lessonWords.map((item, itemIndex) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={itemIndex === activeWord}
                  onClick={() => setActiveWord(itemIndex)}
                >
                  <strong>{displayCharacter(item, script)}</strong>
                  <span>{item.pinyin}</span>
                </button>
              ))}
            </div>
            <article className="theory-word-focus">
              <div className="theory-word-identity">
                <strong>{displayCharacter(word, script)}</strong>
                <div>
                  <span>{word.pinyin}</span>
                  <b>{word.meaning}</b>
                  <small>{word.partOfSpeech}</small>
                </div>
                <button type="button" onClick={() => speakMandarin(displayCharacter(word, script))}>
                  <Volume2 size={18} /> Nghe từ
                </button>
              </div>
              <div className="theory-syllable-map">
                {word.syllables.map((syllable) => (
                  <div key={`${word.id}:${syllable.index}`}>
                    <strong>{syllable.marked}</strong>
                    <span>{toneLabel(syllable.lexicalTone)}</span>
                    <small>thanh từ điển</small>
                  </div>
                ))}
              </div>
              <div className="theory-example-sentence">
                <span>CÂU SẮP GẶP</span>
                <strong>{word.example}</strong>
                <b>{word.examplePinyin}</b>
                <p>{word.exampleMeaning}</p>
                <button type="button" onClick={() => speakMandarin(word.example)}>
                  <Headphones size={18} /> Nghe cả câu
                </button>
              </div>
              {lessonId === "boot-1" && word.id === "yi" && (
                <p className="theory-context-note">
                  <strong>Đừng nhầm:</strong> 一 có thanh từ điển <b>yī</b>, nhưng trong cụm 一个人 được đọc gần <b>yí ge rén</b>. Bài này chỉ hỏi thanh từ điển; biến điệu sẽ học ở bài 4.
                </p>
              )}
            </article>
            </> : expandedWords?.length ? (
              <ExpandedLessonWords
                lessonId={lessonId}
                words={expandedWords}
                activeIndex={expandedWordIndex}
                onChange={setExpandedWordIndex}
                script={script}
              />
            ) : (
              <div className="theory-expansion-state" role="status">
                <Database size={24} />
                <strong>{expansionError || "Đang nối kho từ của bài…"}</strong>
                <p>Từ HSK1–4 được nạp theo đúng bài; không tính là câu thi hay tự cộng điểm.</p>
              </div>
            )}
          </section>
        )}

        {activeStep === 2 && (
          <section className="theory-practice-stage" aria-labelledby="theory-practice-title">
            <header>
              <span><ListChecks size={17} /> DẠNG BÀI ĐÃ ĐƯỢC CHUẨN BỊ</span>
              <h2 id="theory-practice-title">Đề cho gì, bạn cần làm gì?</h2>
              <p>Nhìn theo chiều từ trái sang phải. Đây là mẫu có lời giải; lượt Thử Luyện sau đó mới là phần tự làm.</p>
            </header>
            <div className="theory-practice-grid">
              {preparedKinds.map((kind, kindIndex) => {
                const guideItem = practiceGuide(
                  kind,
                  lessonWords[kindIndex % Math.max(1, lessonWords.length)],
                  script,
                );
                return (
                  <article key={kind} data-exercise-kind={kind}>
                    <span>{String(kindIndex + 1).padStart(2, "0")}</span>
                    <div><small>DẠNG CÂU</small><strong>{guideItem.title}</strong></div>
                    <p>{guideItem.cue}</p>
                    <ArrowRight size={18} aria-hidden="true" />
                    <b>{guideItem.response}</b>
                  </article>
                );
              })}
            </div>
            <div className="theory-coverage-note">
              <CheckCircle2 size={20} />
              <div>
                <strong>Không hỏi kiến thức ngoài phần vừa học</strong>
                <p>Lượt này chỉ dùng {lessonWords.length} từ phía trên và {preparedKinds.length} dạng câu đã giải thích. Nếu mở lại lý thuyết giữa câu, lượt đó sẽ được ghi là có trợ giúp.</p>
              </div>
            </div>
          </section>
        )}
        </div>
        {canScrollFurther && (
          <>
            <div className="lesson-theory-scroll-beacon" aria-hidden="true">
              <span><i style={{ transform: `scaleY(${Math.max(.08, scrollProgress / 100)})` }} /></span>
              <b>{String(Math.round(scrollProgress)).padStart(2, "0")}</b>
            </div>
            <button
              className="lesson-theory-scroll-jump"
              type="button"
              onClick={revealMoreTheory}
              aria-label="Cuộn xuống phần lý thuyết kế tiếp"
            >
              <ChevronDown size={20} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <div className="lesson-theory-navigation">
        <button type="button" disabled={activeStep === 0} onClick={() => goToStep(activeStep - 1)}>
          <ArrowLeft size={17} /> Chặng trước
        </button>
        {activeStep < 2 ? (
          <button type="button" onClick={advance}>
            {activeStep === 0 ? "Tiếp: học từ trong bài" : "Tiếp: xem cách làm"} <ArrowRight size={17} />
          </button>
        ) : !compact && onReadinessChange ? (
          <button type="button" onClick={advance}>
            <CheckCircle2 size={17} /> Đã hiểu · sẵn sàng thử
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ExpandedLessonWords({
  lessonId,
  words,
  activeIndex,
  onChange,
  script,
}: {
  lessonId: string;
  words: MegaVocabularyItem[];
  activeIndex: number;
  onChange: (index: number) => void;
  script: "simplified" | "traditional";
}) {
  const word = words[Math.min(activeIndex, words.length - 1)];
  const display = script === "traditional" ? word.traditional : word.simplified;
  const firstCharacter = [...word.simplified][0] ?? word.simplified;
  return (
    <>
      <header>
        <span>MỞ RỘNG {String(activeIndex + 1).padStart(2, "0")} / {String(words.length).padStart(2, "0")}</span>
        <h2 id="theory-word-title">Từ cùng cấp đã được gắn vào bài này</h2>
        <p>Học thêm để tăng độ phủ; phần này không xuất hiện bất ngờ trong lượt Thử Luyện hiện tại.</p>
      </header>
      <div className="theory-word-picker" aria-label="Từ mở rộng của bài">
        {words.map((item, itemIndex) => (
          <button key={item.id} type="button" aria-pressed={itemIndex === activeIndex} onClick={() => onChange(itemIndex)}>
            <strong>{script === "traditional" ? item.traditional : item.simplified}</strong>
            <span>{item.pinyin}</span>
          </button>
        ))}
      </div>
      <article className="theory-word-focus is-expanded">
        <div className="theory-word-identity">
          <strong>{display}</strong>
          <div><span>{word.pinyin}</span><b>{word.meaning}</b><small>{word.partOfSpeech}</small></div>
          <button type="button" onClick={() => speakMandarin(word.simplified)}><Volume2 size={18} /> Nghe từ</button>
        </div>
        <ol className="theory-expanded-senses" aria-label="Các nghĩa tham chiếu">
          {word.senses.slice(0, 4).map((sense) => <li key={sense}>{sense}</li>)}
        </ol>
        <div className="theory-expanded-handoffs">
          <Link to={`/dictionary?lesson=${encodeURIComponent(lessonId)}&q=${encodeURIComponent(word.simplified)}`}>
            <Database size={17} /> Xem hồ sơ từ điển
          </Link>
          <Link to={`/characters?lesson=${encodeURIComponent(lessonId)}&char=${encodeURIComponent(firstCharacter)}`}>
            <PenTool size={17} /> Luyện chữ trong từ
          </Link>
        </div>
      </article>
    </>
  );
}
