import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Headphones,
  ListChecks,
  Target,
  Volume2,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { mergePublishedStudioLessonEnhancement } from "../content/publishedStudioClient";
import type { PublishedStudioLessonEnhancement } from "../content/publishedStudioLessons";
import type { LessonGuide } from "../data/lessonGuides";
import { selectLessonTeachingWordIds } from "../learning/lessonTeachingFocus";
import {
  buildLessonTeachingFlow,
  learnerFacingCopy,
  learnerGrammarLabel,
} from "../learning/lessonTeachingFlow";
import {
  getRichLessonContent,
  RICH_LESSON_DISCLOSURE,
  type RichLessonContent,
} from "../learning/richLessonContent";
import { speakMandarin } from "../lib/speech";
import type { ExerciseKind, VocabularyItem } from "../types";

const TONE_PRIMER = [
  { number: 1, tone: "Thanh 1", points: "8,10 52,10", pinyin: "mā", hanzi: "妈", meaning: "mẹ", pitch: "55", gesture: "Giữ bàn tay ngang", copy: "Bắt đầu cao, giữ ngang và đều." },
  { number: 2, tone: "Thanh 2", points: "8,42 52,10", pinyin: "má", hanzi: "麻", meaning: "cây gai", pitch: "35", gesture: "Đưa tay đi lên", copy: "Bắt đầu vừa, kéo giọng đi lên rõ." },
  { number: 3, tone: "Thanh 3", points: "8,24 27,43 52,12", pinyin: "mǎ", hanzi: "马", meaning: "ngựa", pitch: "214", gesture: "Hạ tay; cuối mới nhấc", copy: "Hạ xuống thấp; dạng đọc riêng mới nhấc lên." },
  { number: 4, tone: "Thanh 4", points: "8,9 52,43", pinyin: "mà", hanzi: "骂", meaning: "mắng", pitch: "51", gesture: "Chém tay xuống", copy: "Bắt đầu cao, rơi nhanh và dứt khoát." },
] as const;

type TheoryStep = {
  id: "concept" | "words" | "context" | "practice";
  index: string;
  label: string;
  shortLabel: string;
};

const BASE_THEORY_STEPS: TheoryStep[] = [
  { id: "concept", index: "01", label: "Đích đến & nguyên tắc", shortLabel: "Hiểu" },
  { id: "words", index: "02", label: "Từ neo trong câu", shortLabel: "Từ neo" },
] as const;

const PRACTICE_THEORY_STEP: Omit<TheoryStep, "index"> = {
  id: "practice",
  label: "Tự diễn đạt",
  shortLabel: "Vận dụng",
} as const;

export const buildTheorySteps = (hasContext: boolean): TheoryStep[] => {
  const steps: TheoryStep[] = [...BASE_THEORY_STEPS.map((step) => ({ ...step }))];
  if (hasContext) steps.push({
    id: "context",
    index: "03",
    label: "Đọc/nghe trọn mẫu",
    shortLabel: "Xem mẫu",
  });
  steps.push({
    ...PRACTICE_THEORY_STEP,
    index: String(steps.length + 1).padStart(2, "0"),
  });
  return steps;
};

export const canAdvanceTheoryStep = ({
  lessonId,
  stepId,
  selectedTone,
}: {
  lessonId: string;
  stepId: TheoryStep["id"];
  selectedTone: number | null;
}) => lessonId !== "boot-1" || stepId !== "concept" || selectedTone === 4;

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

function ToneLearningPrimer({
  guide,
  selectedTone,
  onSelectTone,
}: {
  guide: LessonGuide;
  selectedTone: number | null;
  onSelectTone: (tone: number) => void;
}) {
  const passedCheck = selectedTone === 4;
  return (
    <div className="tone-learning-primer">
      <section className="tone-foundation" aria-labelledby="tone-foundation-title">
        <div>
          <span>ÂM TIẾT ĐƯỢC GHÉP NHƯ THẾ NÀO?</span>
          <h3 id="tone-foundation-title"><b>m</b><i>+</i><b>a</b><i>+</i><strong>đường giọng</strong></h3>
        </div>
        <p>Giữ nguyên phụ âm <b>m</b> và vần <b>a</b>, chỉ đổi đường giọng: từ và nghĩa đã đổi. Thanh điệu là một phần của âm tiết, không phải cảm xúc thêm vào sau.</p>
      </section>

      <div className="tone-scale-note">
        <Waves size={18} />
        <p><strong>Các số 1–5 chỉ độ cao tương đối:</strong> 1 là đáy quãng giọng thoải mái, 5 là đỉnh. Bạn không cần bắt chước đúng cao độ của người đọc; chỉ cần đúng hướng.</p>
      </div>

      <div className="tone-theory-grid" aria-label="Bốn đường thanh điệu cơ bản">
        {TONE_PRIMER.map((item) => (
          <article key={item.tone} data-tone={item.number}>
            <div className="tone-card-visual">
              <span>{item.number}</span>
              <svg viewBox="0 0 60 52" aria-hidden="true">
                <path d="M5 10H55M5 26H55M5 42H55" />
                <polyline points={item.points} />
              </svg>
              <small>{item.pitch}</small>
            </div>
            <div className="tone-card-copy">
              <span>{item.tone}</span>
              <strong>{item.copy}</strong>
              <small>{item.gesture}</small>
            </div>
            <button type="button" onClick={() => speakMandarin(item.hanzi)} aria-label={`Nghe mẫu tổng hợp ${item.pinyin}, ${item.meaning}`}>
              <Volume2 size={17} />
              <b>{item.hanzi}</b>
              <span>{item.pinyin}</span>
              <em>{item.meaning}</em>
            </button>
          </article>
        ))}
      </div>

      <section className="tone-listening-method" aria-labelledby="tone-method-title">
        <div>
          <span>NGHE MÀ KHÔNG ĐOÁN</span>
          <h3 id="tone-method-title">Mỗi lần nghe, làm đúng ba bước</h3>
        </div>
        <ol>
          <li><b>1</b><span><strong>Bỏ qua nghĩa</strong><small>Chỉ nghe giọng bắt đầu cao hay thấp.</small></span></li>
          <li><b>2</b><span><strong>Theo dõi hướng</strong><small>Ngang, đi lên, nằm thấp hay rơi xuống?</small></span></li>
          <li><b>3</b><span><strong>Dùng tay xác nhận</strong><small>Vẽ hướng vừa nghe rồi mới gọi số thanh.</small></span></li>
        </ol>
        <aside><AlertTriangle size={17} /><p><strong>Dễ nhầm:</strong> {guide.pitfall}</p></aside>
      </section>

      <fieldset className={`tone-concept-check ${selectedTone !== null ? (passedCheck ? "is-correct" : "is-wrong") : ""}`}>
        <legend>Tự kiểm: đường giọng bắt đầu cao rồi rơi nhanh là thanh nào?</legend>
        <div>
          {[1, 2, 3, 4].map((tone) => (
            <button key={tone} type="button" aria-pressed={selectedTone === tone} onClick={() => onSelectTone(tone)}>
              Thanh {tone}
            </button>
          ))}
        </div>
        <p role="status">{selectedTone === null
          ? "Chọn bằng hướng giọng, không nhìn dấu pinyin."
          : passedCheck
            ? "Đúng: thanh 4 đi từ cao xuống thấp rất nhanh. Bây giờ bạn có thể học từ mẫu."
            : "Chưa đúng. Hãy nhìn lại đường rơi từ mức 5 xuống mức 1 rồi chọn lại."}</p>
      </fieldset>

      <p className="tone-neutral-note"><strong>Còn thanh nhẹ “ma”?</strong> Đây không phải thanh thứ năm: âm ngắn, nhẹ và cao độ phụ thuộc âm đứng trước. Bạn chỉ cần nhận biết ở bài này; cách dùng sẽ học trong câu thật.</p>
    </div>
  );
}

export function LessonTheoryPanel({
  guide,
  lessonId,
  lessonObjective,
  preferGuide = false,
  lessonWords,
  script,
  practiceKinds,
  practiceWordIds,
  contentOverride,
  enhancement,
  compact = false,
  ready = false,
  onReadinessChange,
  onComplete,
  completionLabel = "Bước vào Thử Luyện",
  completionDisabled = false,
}: {
  guide: LessonGuide;
  lessonId: string;
  lessonObjective: string;
  preferGuide?: boolean;
  lessonWords: readonly VocabularyItem[];
  script: "simplified" | "traditional";
  practiceKinds?: readonly ExerciseKind[];
  practiceWordIds?: readonly (string | undefined)[];
  contentOverride?: RichLessonContent;
  enhancement?: PublishedStudioLessonEnhancement;
  compact?: boolean;
  ready?: boolean;
  onReadinessChange?: (ready: boolean) => void;
  onComplete?: () => void;
  completionLabel?: string;
  completionDisabled?: boolean;
}) {
  const richContent = useMemo(() => mergePublishedStudioLessonEnhancement(
    contentOverride ?? getRichLessonContent(lessonId),
    enhancement,
    lessonId,
  ), [contentOverride, enhancement, lessonId]);
  const hasContext = Boolean(
    richContent && (richContent.dialogue.length > 0 || richContent.grammar.length > 0),
  );
  const teachingFlow = useMemo(() => buildLessonTeachingFlow({
    lessonId,
    objective: lessonObjective,
    guide,
    richContent,
    preferGuide,
  }), [guide, lessonId, lessonObjective, preferGuide, richContent]);
  const theorySteps = useMemo(() => buildTheorySteps(hasContext), [hasContext]);
  const lastStep = theorySteps.length - 1;
  const [activeStep, setActiveStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(compact ? lastStep : 0);
  const [activeWord, setActiveWord] = useState(0);
  const [activeGrammar, setActiveGrammar] = useState(0);
  const [selectedTone, setSelectedTone] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const preparedKinds = useMemo(() => {
    const kinds = practiceKinds?.length
      ? practiceKinds
      : lessonId === "boot-1"
        ? (["pinyin", "tone", "listening"] as ExerciseKind[])
        : DEFAULT_PRACTICE_KINDS;
    return [...new Set(kinds)];
  }, [lessonId, practiceKinds]);
  const focusWordIds = useMemo(() => selectLessonTeachingWordIds(
    lessonWords.map((item) => item.id),
    practiceWordIds,
  ), [lessonWords, practiceWordIds]);
  const lessonWordById = useMemo(
    () => new Map(lessonWords.map((item) => [item.id, item] as const)),
    [lessonWords],
  );
  const teachingWords = useMemo(() => focusWordIds
    .map((wordId) => lessonWordById.get(wordId))
    .filter((item): item is VocabularyItem => Boolean(item)),
  [focusWordIds, lessonWordById]);
  const sourceBound = Boolean(practiceWordIds?.some(Boolean));
  const referenceWordCount = Math.max(0, lessonWords.length - teachingWords.length);
  const word = teachingWords[activeWord] ?? teachingWords[0];
  const grammar = richContent?.grammar[activeGrammar];
  const grammarTitle = grammar ? learnerGrammarLabel(grammar) : "";

  useEffect(() => {
    setActiveStep(0);
    setFurthestStep(compact ? lastStep : 0);
    setActiveWord(0);
    setActiveGrammar(0);
    setSelectedTone(null);
    onReadinessChange?.(false);
  }, [compact, lastStep, lessonId, onReadinessChange]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.scrollTop = 0;
    const frame = requestAnimationFrame(() => { stage.scrollTop = 0; });
    return () => cancelAnimationFrame(frame);
  }, [activeGrammar, activeStep, activeWord, compact, lessonId]);

  const goToStep = (nextStep: number) => {
    if (nextStep < 0 || nextStep > lastStep || (!compact && nextStep > furthestStep)) return;
    setActiveStep(nextStep);
  };

  const advance = () => {
    if (!canAdvanceTheoryStep({
      lessonId,
      stepId: theorySteps[activeStep]?.id ?? "concept",
      selectedTone,
    })) return;
    if (activeStep < lastStep) {
      const nextStep = activeStep + 1;
      setFurthestStep((current) => Math.max(current, nextStep));
      setActiveStep(nextStep);
      return;
    }
    if (ready) {
      onComplete?.();
      return;
    }
    onReadinessChange?.(true);
  };

  return (
    <div className={`lesson-theory-panel ${compact ? "is-compact" : ""}`}>
      <nav
        className="lesson-learning-progress"
        aria-label={`${theorySteps.length} chặng học trước khi làm bài`}
        style={{
          "--theory-progress": `${((activeStep + 1) / theorySteps.length) * 100}%`,
        } as CSSProperties}
      >
        <div className="lesson-learning-progress-current">
          <span>BƯỚC {activeStep + 1} / {theorySteps.length}</span>
          <strong>{theorySteps[activeStep]?.label}</strong>
        </div>
        <div className="lesson-learning-progress-track" role="progressbar" aria-label="Tiến độ phần học" aria-valuemin={1} aria-valuemax={theorySteps.length} aria-valuenow={activeStep + 1}>
          <i />
        </div>
        <ol>
          {theorySteps.map((step, stepIndex) => (
            <li key={step.id}>
              <button
                type="button"
                disabled={!compact && stepIndex > furthestStep}
                aria-current={activeStep === stepIndex ? "step" : undefined}
                aria-label={`Bước ${stepIndex + 1}: ${step.label}`}
                onClick={() => goToStep(stepIndex)}
              >
                {stepIndex < activeStep
                  ? <CheckCircle2 size={16} aria-hidden="true" />
                  : step.index}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="lesson-theory-stage-frame">
        <div
          className="lesson-theory-stage"
          ref={stageRef}
        >
        {activeStep === 0 && (
          <section className="theory-concept-stage" aria-labelledby="theory-concept-title">
            <header>
              <span><BrainCircuit size={17} /> CHỈ HỌC MỘT Ý CỐT LÕI</span>
              <h2 id="theory-concept-title">{teachingFlow.concept}</h2>
              <p>{teachingFlow.explanation}</p>
            </header>

            <div className="theory-learning-contract">
              <Target size={20} />
              <div>
                <span>ĐÍCH ĐẾN CỦA BÀI</span>
                <strong>{teachingFlow.goal}</strong>
              </div>
            </div>

            {lessonId === "boot-1" ? (
              <ToneLearningPrimer
                guide={guide}
                selectedTone={selectedTone}
                onSelectTone={setSelectedTone}
              />
            ) : <div className="theory-concept-support">
              <div className="guide-examples">
                {teachingFlow.examples.map((example) => (
                  <button
                    key={example.hanzi}
                    type="button"
                    onClick={() => speakMandarin(example.hanzi)}
                    aria-label={`Nghe mẫu tổng hợp ${example.hanzi}`}
                  >
                    <Volume2 size={17} />
                    <span><strong>{example.hanzi}</strong><small>{example.pinyin}</small></span>
                    <em>{example.meaningVi}</em>
                  </button>
                ))}
              </div>
              <aside>
                <div><span><AlertTriangle size={16} /> DỄ HỌC SAI</span><p>{teachingFlow.pitfall}</p></div>
                <div><span><Target size={16} /> ĐẠT KHI BẠN TỰ LÀM ĐƯỢC</span><p>{teachingFlow.successCheck}</p></div>
              </aside>
            </div>}
          </section>
        )}

        {activeStep === 1 && word && (
          <section className="theory-word-stage" aria-labelledby="theory-word-title">
            <header>
              <span><Target size={17} /> TỪ NEO {String(activeWord + 1).padStart(2, "0")} / {String(teachingWords.length).padStart(2, "0")}</span>
              <h2 id="theory-word-title">{sourceBound
                ? "Chỉ học những từ sẽ dùng trong lượt này"
                : lessonId === "boot-1"
                  ? "Bốn từ mẫu, mỗi từ neo một đường thanh"
                  : "Gắn từ với một câu có nghĩa, không học danh sách rời"}</h2>
              <p>{sourceBound
                ? "Mỗi từ đều đi cùng âm, nghĩa và một câu dùng thật. Đổi từ bằng nút bên dưới; chưa cần học toàn bộ kho nguồn."
                : lessonId === "boot-1"
                  ? "Đi theo thứ tự yī → rén → nǐ → èr để gặp lần lượt thanh 1 → 2 → 3 → 4. Nghe hướng trước, sau đó mới nối chữ và nghĩa."
                : `Bài có ${lessonWords.length} mục nguồn; phần học này chỉ giữ ${teachingWords.length} từ đầu mối để bạn còn đủ sức đọc ngữ cảnh.`}</p>
            </header>
            <div className="theory-word-picker" aria-label="Danh sách từ của bài">
              {teachingWords.map((item, itemIndex) => (
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
            {referenceWordCount > 0 && (
              <p className="theory-source-inventory-note">
                <CheckCircle2 size={16} /> {referenceWordCount} mục còn lại vẫn nằm trong hội thoại, bài đọc và kho tham khảo; không bị tính là danh sách phải học dồn ở bước này.
              </p>
            )}
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
          </section>
        )}

        {hasContext && activeStep === 2 && richContent && (
          <section className="theory-context-stage" aria-labelledby="theory-context-title">
            <header>
              <span><Headphones size={17} /> {teachingFlow.contextLabel}</span>
              <h2 id="theory-context-title">{teachingFlow.contextTitle}</h2>
              <p>Đi hết ngữ liệu của bài rồi mới rút quy tắc; không cắt còn bốn dòng hay bắt bạn đoán phần còn thiếu.</p>
            </header>
            <ol className="theory-reading-method" aria-label="Ba lượt học ngữ cảnh">
              {teachingFlow.contextMethod.map((item, itemIndex) => (
                <li key={item}><b>{itemIndex + 1}</b><span>{item}</span></li>
              ))}
            </ol>
            <div className="theory-context-stack">
              {richContent.dialogue.length > 0 && (
                <article className={`theory-dialogue-card is-${teachingFlow.level}`}>
                  <div className="theory-context-heading">
                    <span><Headphones size={16} /> NGỮ LIỆU ĐẦY ĐỦ · {richContent.dialogue.length} DÒNG</span>
                  </div>
                  <div className="theory-dialogue-turns">
                    {richContent.dialogue.map((turn, turnIndex) => (
                      <button
                        key={`${turn.speaker}-${turnIndex}-${turn.hanzi}`}
                        type="button"
                        onClick={() => speakMandarin(turn.hanzi)}
                        aria-label={`Nghe câu ${turn.hanzi}`}
                      >
                        <b>{turn.speaker}</b>
                        <span>
                          <strong>{turn.hanzi}</strong>
                          <small>{turn.pinyin}</small>
                          <em>{learnerFacingCopy(turn.meaningVi)}</em>
                        </span>
                        <Volume2 size={17} />
                      </button>
                    ))}
                  </div>
                </article>
              )}
              {grammar && (
                <article className="theory-grammar-card">
                  <div className="theory-context-heading">
                    <span><BrainCircuit size={16} /> {teachingFlow.grammarTitle}</span>
                    <small>{activeGrammar + 1}/{richContent.grammar.length}</small>
                  </div>
                  {richContent.grammar.length > 1 && (
                    <div className="theory-grammar-picker" role="group" aria-label="Chọn điểm ngữ pháp trong bài">
                      {richContent.grammar.map((point, pointIndex) => (
                        <button
                          key={point.id}
                          type="button"
                          aria-pressed={pointIndex === activeGrammar}
                          onClick={() => setActiveGrammar(pointIndex)}
                        >
                          <span>{String(pointIndex + 1).padStart(2, "0")}</span>
                          {learnerGrammarLabel(point)}
                        </button>
                      ))}
                    </div>
                  )}
                  <h3>{grammarTitle}</h3>
                  <p>{learnerFacingCopy(grammar.explanationVi)}</p>
                  <button
                    className="theory-grammar-example"
                    type="button"
                    onClick={() => speakMandarin(grammar.modelExample.hanzi)}
                  >
                    <Volume2 size={17} />
                    <span>
                      <strong>{grammar.modelExample.hanzi}</strong>
                      <small>{grammar.modelExample.pinyin}</small>
                      <em>{learnerFacingCopy(grammar.modelExample.meaningVi)}</em>
                    </span>
                  </button>
                  <div className="theory-guided-practice">
                    <span>TỰ NÓI TRƯỚC KHI XEM MẪU</span>
                    <p>{learnerFacingCopy(grammar.guidedPractice.promptVi)}</p>
                    <details>
                      <summary>Xem và nghe câu mẫu</summary>
                      <button
                        type="button"
                        onClick={() => speakMandarin(grammar.guidedPractice.modelAnswerHanzi)}
                      >
                        <Volume2 size={16} />
                        <span>
                          <strong>{grammar.guidedPractice.modelAnswerHanzi}</strong>
                          <small>{grammar.guidedPractice.modelAnswerPinyin}</small>
                          <em>{learnerFacingCopy(grammar.guidedPractice.modelAnswerMeaningVi)}</em>
                        </span>
                      </button>
                    </details>
                  </div>
                </article>
              )}
            </div>
            <p className="theory-review-disclosure"><AlertTriangle size={15} /> {RICH_LESSON_DISCLOSURE.reviewVi}</p>
          </section>
        )}

        {activeStep === lastStep && (
          <section className="theory-practice-stage" aria-labelledby="theory-practice-title">
            <header>
              <span><ListChecks size={17} /> NÓI HOẶC VIẾT TRƯỚC KHI CHỌN ĐÁP ÁN</span>
              <h2 id="theory-practice-title">{teachingFlow.transferTitle}</h2>
              <p>{teachingFlow.successCheck}</p>
            </header>
            <div className="theory-transfer-grid">
              {(richContent?.tasks.length ? richContent.tasks : [{
                id: `${lessonId}:guide-task`,
                titleVi: "Tự tạo một lượt mới",
                instructionVi: teachingFlow.successCheck,
                targetFunctions: [],
                modelDialogue: [],
              }]).map((task, taskIndex) => (
                <article className="theory-transfer-task" key={task.id}>
                  <div>
                    <span>NHIỆM VỤ {String(taskIndex + 1).padStart(2, "0")}</span>
                    <h3>{learnerFacingCopy(task.titleVi)}</h3>
                    <p>{learnerFacingCopy(task.instructionVi)}</p>
                  </div>
                  {task.modelDialogue.length > 0 && (
                    <details>
                      <summary>Chỉ mở mẫu sau khi đã tự thử</summary>
                      <div>
                        {task.modelDialogue.map((turn, turnIndex) => (
                          <button key={`${turn.speaker}:${turnIndex}:${turn.hanzi}`} type="button" onClick={() => speakMandarin(turn.hanzi)}>
                            <Volume2 size={16} />
                            <span><strong>{turn.hanzi}</strong><small>{turn.pinyin}</small><em>{learnerFacingCopy(turn.meaningVi)}</em></span>
                          </button>
                        ))}
                      </div>
                    </details>
                  )}
                </article>
              ))}
            </div>
            <details className="theory-exercise-preview">
              <summary>Xem trước {preparedKinds.length} dạng câu trong Thử Luyện</summary>
              <div className="theory-practice-grid">
                {preparedKinds.map((kind, kindIndex) => {
                  const guideItem = practiceGuide(
                    kind,
                    teachingWords[kindIndex % Math.max(1, teachingWords.length)],
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
            </details>
            <div className="theory-coverage-note">
              <CheckCircle2 size={20} />
              <div>
                <strong>Phần chọn đáp án chỉ kiểm tra nội dung vừa học</strong>
                <p>{sourceBound
                  ? `Lượt này dùng ${teachingWords.length} từ đã khóa phía trên và ${preparedKinds.length} dạng câu đã giải thích.`
                  : `Phần chuẩn bị giữ ${teachingWords.length} từ neo và ${preparedKinds.length} dạng câu ở mức dễ quét; đề chính xác được xác nhận khi phiên bắt đầu.`} Nếu mở lại lý thuyết giữa câu, lượt đó sẽ được ghi là có trợ giúp.</p>
              </div>
            </div>
          </section>
        )}
        </div>
      </div>

      <div className="lesson-theory-navigation">
        <button className="lesson-theory-back" type="button" disabled={activeStep === 0} onClick={() => goToStep(activeStep - 1)}>
          <ArrowLeft size={17} /> Chặng trước
        </button>
        {activeStep < lastStep ? (
          <button className="lesson-theory-next" type="button" onClick={advance} disabled={!canAdvanceTheoryStep({
            lessonId,
            stepId: theorySteps[activeStep]?.id ?? "concept",
            selectedTone,
          })}>
            {activeStep === 0
              ? lessonId === "boot-1" && selectedTone !== 4
                ? "Chọn đúng hướng thanh để tiếp tục"
                : "Tiếp: học từ trọng tâm"
              : hasContext && activeStep === 1
                ? "Tiếp: gặp trong ngữ cảnh"
                : "Tiếp: xem cách làm"} <ArrowRight size={17} />
          </button>
        ) : onReadinessChange || onComplete ? (
          <button className="lesson-theory-next" type="button" disabled={ready && completionDisabled} onClick={advance}>
            <CheckCircle2 size={17} /> {ready ? completionLabel : "Đã hiểu · sẵn sàng thử"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
