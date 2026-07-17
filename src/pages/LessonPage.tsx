import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  Check,
  CircleCheck,
  CircleX,
  Headphones,
  Lightbulb,
  LockKeyhole,
  PenLine,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LESSON_BY_ID, VOCABULARY, WORD_BY_ID } from "../data/curriculum";
import { getLessonGuide } from "../data/lessonGuides";
import { isLessonUnlocked } from "../lib/adaptive";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";
import type { ExerciseKind, Lesson, Skill, VocabularyItem } from "../types";

type Exercise = {
  id: string;
  wordId?: string;
  kind: ExerciseKind;
  skill: Skill;
  instruction: string;
  prompt: string;
  promptMeta?: string;
  options: string[];
  correct: string;
  explanation: string;
  spokenText?: string;
};

type LessonPhase = "briefing" | "exercise";

type SavedLessonSession = {
  version: 2;
  lessonId: string;
  script: "simplified" | "traditional";
  phase: LessonPhase;
  exercises: Exercise[];
  index: number;
  selected: string | null;
  checked: boolean;
  correctCount: number;
  finished: boolean;
  earnedXp: number;
};

const toneLabels = [
  "Thanh nhẹ · không có đường thanh cố định",
  "Thanh 1 · cao và ngang",
  "Thanh 2 · đi lên",
  "Thanh 3 · hạ rồi nhấc lên",
  "Thanh 4 · rơi nhanh và dứt",
];

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const makeOptions = (correct: string, candidates: string[], count = 4) => {
  const distractors = shuffle(candidates.filter((item) => item !== correct))
    .filter((item, index, values) => values.indexOf(item) === index)
    .slice(0, count - 1);
  return shuffle([correct, ...distractors]);
};

const displayCharacter = (word: VocabularyItem, script: "simplified" | "traditional") =>
  script === "traditional" ? word.traditional : word.simplified;

function buildExercises(lesson: Lesson, script: "simplified" | "traditional") {
  const words = lesson.wordIds
    .map((id) => WORD_BY_ID.get(id))
    .filter((word): word is VocabularyItem => Boolean(word));
  const allMeanings = VOCABULARY.map((word) => word.meaning);
  const allPinyin = VOCABULARY.map((word) => word.pinyin);
  const exercises: Exercise[] = [];

  words.forEach((word) => {
    const character = displayCharacter(word, script);
    exercises.push({
      id: `${word.id}-meaning`,
      wordId: word.id,
      kind: "meaning",
      skill: "vocabulary",
      instruction: "Giải mã ý nghĩa",
      prompt: character,
      promptMeta: word.partOfSpeech,
      options: makeOptions(word.meaning, allMeanings),
      correct: word.meaning,
      explanation: `${character} đọc là ${word.pinyin}, là ${word.partOfSpeech} mang nghĩa “${word.meaning}”. Trong câu “${word.example}”, từ này được dùng với nghĩa “${word.exampleMeaning.toLowerCase()}”.`,
    });
    exercises.push({
      id: `${word.id}-pinyin`,
      wordId: word.id,
      kind: "pinyin",
      skill: "pronunciation",
      instruction: "Chọn cách đọc chính xác",
      prompt: character,
      promptMeta: word.meaning,
      options: makeOptions(word.pinyin, allPinyin),
      correct: word.pinyin,
      explanation: `${character} được ghi là ${word.pinyin}. Dấu trên nguyên âm thể hiện thanh ${word.tone === 0 ? "nhẹ" : word.tone}; đổi thanh có thể đổi nghĩa hoặc khiến người nghe khó nhận ra từ.`,
      spokenText: character,
    });
  });

  words.slice(0, 2).forEach((word) => {
    const character = displayCharacter(word, script);
    exercises.push({
      id: `${word.id}-tone`,
      wordId: word.id,
      kind: "tone",
      skill: "pronunciation",
      instruction: "Nhận diện đường thanh",
      prompt: word.pinyin,
      promptMeta: character,
      options: toneLabels,
      correct: toneLabels[word.tone],
      explanation: `${word.pinyin} mang ${toneLabels[word.tone].toLowerCase()}. Hãy bắt chước cả độ cao lẫn hướng chuyển động, thay vì chỉ đọc mạnh hơn.`,
      spokenText: character,
    });
    exercises.push({
      id: `${word.id}-listening`,
      wordId: word.id,
      kind: "listening",
      skill: "listening",
      instruction: "Nghe và chọn nghĩa",
      prompt: "Tín hiệu âm thanh đã sẵn sàng",
      promptMeta: "Bạn có thể nghe lại trước khi trả lời",
      options: makeOptions(word.meaning, allMeanings),
      correct: word.meaning,
      explanation: `Bạn vừa nghe “${character}” (${word.pinyin}), nghĩa là “${word.meaning}”. Ví dụ: ${word.example} — ${word.exampleMeaning}.`,
      spokenText: character,
    });
    exercises.push({
      id: `${word.id}-recall`,
      wordId: word.id,
      kind: "recall",
      skill: "writing",
      instruction: "Tự gọi lại Hán tự",
      prompt: word.meaning,
      promptMeta: "Nhập chữ Hán tương ứng, không xem lại danh sách từ",
      options: [],
      correct: character,
      explanation: `Đáp án là ${character} (${word.pinyin}). Hãy dựng lại chữ từ âm, nghĩa và các thành phần thay vì ghi nhớ như một hình ảnh liền khối.`,
      spokenText: character,
    });
  });

  words.slice(0, 2).forEach((word) => {
    exercises.push({
      id: `${word.id}-sentence`,
      wordId: word.id,
      kind: "sentence",
      skill: "reading",
      instruction: "Đọc trong ngữ cảnh",
      prompt: word.example,
      promptMeta: word.examplePinyin,
      options: makeOptions(word.exampleMeaning, VOCABULARY.map((item) => item.exampleMeaning)),
      correct: word.exampleMeaning,
      explanation: `Câu “${word.example}” đọc là “${word.examplePinyin}” và có nghĩa “${word.exampleMeaning}”. Từ trọng tâm ${displayCharacter(word, script)} giữ vai trò ${word.partOfSpeech}.`,
      spokenText: word.example,
    });
  });

  return shuffle(exercises).slice(0, Math.min(10, exercises.length));
}

const exerciseIcon = (kind: ExerciseKind) => {
  if (kind === "listening") return Headphones;
  if (kind === "sentence") return BookOpenText;
  if (kind === "recall") return PenLine;
  return Sparkles;
};

const normalizeAnswer = (value: string) =>
  value.trim().toLocaleLowerCase("vi").replace(/[\s.,!?;:'"“”‘’]/g, "");

const answersMatch = (answer: string | null, correct: string) =>
  Boolean(answer && normalizeAnswer(answer) === normalizeAnswer(correct));

const sessionKey = (lessonId: string) => `hanzi-os-lesson-session-v2:${lessonId}`;

const readSession = (
  lesson: Lesson | undefined,
  script: "simplified" | "traditional",
): SavedLessonSession | null => {
  if (!lesson) return null;
  try {
    const raw = localStorage.getItem(sessionKey(lesson.id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedLessonSession;
    if (
      parsed.version !== 2 ||
      parsed.lessonId !== lesson.id ||
      parsed.script !== script ||
      !Array.isArray(parsed.exercises) ||
      parsed.exercises.length === 0
    ) return null;
    return parsed;
  } catch {
    return null;
  }
};

export function LessonPage() {
  const { lessonId } = useParams();
  const lesson = lessonId ? LESSON_BY_ID.get(lessonId) : undefined;
  const { state, actions } = useLearning();
  const initialSession = useMemo(
    () => readSession(lesson, state.profile.script),
    [lesson, state.profile.script],
  );
  const [activeLessonId, setActiveLessonId] = useState(lesson?.id ?? "");
  const [phase, setPhase] = useState<LessonPhase>(initialSession?.phase ?? "briefing");
  const [exercises, setExercises] = useState<Exercise[]>(
    initialSession?.exercises ?? (lesson ? buildExercises(lesson, state.profile.script) : []),
  );
  const [index, setIndex] = useState(initialSession?.index ?? 0);
  const [selected, setSelected] = useState<string | null>(initialSession?.selected ?? null);
  const [checked, setChecked] = useState(initialSession?.checked ?? false);
  const [correctCount, setCorrectCount] = useState(initialSession?.correctCount ?? 0);
  const [finished, setFinished] = useState(initialSession?.finished ?? false);
  const [earnedXp, setEarnedXp] = useState(initialSession?.earnedXp ?? 0);

  const guide = useMemo(() => getLessonGuide(lesson?.id ?? ""), [lesson?.id]);
  const lessonWords = useMemo(
    () => lesson?.wordIds.map((id) => WORD_BY_ID.get(id)).filter((word): word is VocabularyItem => Boolean(word)) ?? [],
    [lesson],
  );

  useEffect(() => {
    if (!lesson || lesson.id === activeLessonId) return;
    const restored = readSession(lesson, state.profile.script);
    setActiveLessonId(lesson.id);
    setPhase(restored?.phase ?? "briefing");
    setExercises(restored?.exercises ?? buildExercises(lesson, state.profile.script));
    setIndex(restored?.index ?? 0);
    setSelected(restored?.selected ?? null);
    setChecked(restored?.checked ?? false);
    setCorrectCount(restored?.correctCount ?? 0);
    setFinished(restored?.finished ?? false);
    setEarnedXp(restored?.earnedXp ?? 0);
  }, [activeLessonId, lesson, state.profile.script]);

  useEffect(() => {
    if (!lesson || activeLessonId !== lesson.id || exercises.length === 0) return;
    const snapshot: SavedLessonSession = {
      version: 2,
      lessonId: lesson.id,
      script: state.profile.script,
      phase,
      exercises,
      index,
      selected,
      checked,
      correctCount,
      finished,
      earnedXp,
    };
    localStorage.setItem(sessionKey(lesson.id), JSON.stringify(snapshot));
  }, [activeLessonId, checked, correctCount, earnedXp, exercises, finished, index, lesson, phase, selected, state.profile.script]);

  if (!lesson) {
    return (
      <div className="lesson-state-screen">
        <CircleX size={44} />
        <h1>Không tìm thấy thử luyện</h1>
        <Link className="primary-button" to="/path"><ArrowLeft size={17} /> Trở về Thiên Lộ</Link>
      </div>
    );
  }

  if (!isLessonUnlocked(lesson, state)) {
    return (
      <div className="lesson-state-screen locked-screen">
        <LockKeyhole size={44} />
        <span>ACCESS DENIED · MASTERY REQUIRED</span>
        <h1>Cảnh giới này chưa mở</h1>
        <p>Đạt ít nhất 70% ở nút trước đó để hệ thống xác nhận năng lực nền.</p>
        <Link className="primary-button" to="/path"><ArrowLeft size={17} /> Trở về Thiên Lộ</Link>
      </div>
    );
  }

  const clearSession = () => localStorage.removeItem(sessionKey(lesson.id));

  const restart = () => {
    clearSession();
    setPhase("briefing");
    setExercises(buildExercises(lesson, state.profile.script));
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setCorrectCount(0);
    setFinished(false);
    setEarnedXp(0);
  };

  if (phase === "briefing" && !finished) {
    return (
      <div className="lesson-briefing-page">
        <header className="briefing-topbar">
          <Link className="icon-button" to="/path" aria-label="Trở về Thiên Lộ"><ArrowLeft size={20} /></Link>
          <span>KNOWLEDGE TRANSFER · 01/02</span>
          <strong>{lesson.minutes} phút · {lesson.xp} XP</strong>
        </header>

        <section className="briefing-hero">
          <div>
            <span className="system-kicker"><BrainCircuit size={16} /> LĨNH HỘI TRƯỚC · TRUY HỒI SAU</span>
            <h1>{lesson.title}</h1>
            <p className="briefing-chinese">{lesson.chineseTitle}</p>
            <p>{lesson.objective}</p>
          </div>
          <div className="mastery-gate">
            <Target size={26} />
            <span>Ngưỡng khai mở</span>
            <strong>70%</strong>
            <small>Hiểu quy tắc rồi tự gọi lại, không học bằng đoán đáp án.</small>
          </div>
        </section>

        <div className="briefing-grid">
          <section className="briefing-concept">
            <header><span>01 · CỐT LÕI</span><BrainCircuit size={20} /></header>
            <h2>{guide.concept}</h2>
            <p>{guide.rule}</p>
            <div className="guide-examples">
              {guide.examples.map((example) => (
                <button key={example.chinese} type="button" onClick={() => speakMandarin(example.chinese)}>
                  <Volume2 size={17} />
                  <span><strong>{example.chinese}</strong><small>{example.pinyin}</small></span>
                  <em>{example.meaning}</em>
                </button>
              ))}
            </div>
          </section>

          <aside className="briefing-intel">
            <div className="pitfall-panel">
              <span><AlertTriangle size={17} /> ĐIỂM MÙ THƯỜNG GẶP</span>
              <p>{guide.pitfall}</p>
            </div>
            <div className="checkpoint-panel">
              <span><Target size={17} /> TỰ KIỂM TRƯỚC KHI VÀO TRẬN</span>
              <p>{guide.checkpoint}</p>
            </div>
          </aside>
        </div>

        <section className="briefing-lexicon">
          <header><span>02 · TÍN HIỆU MỤC TIÊU</span><small>{lessonWords.length} mục trong bài</small></header>
          <div>
            {lessonWords.map((word) => {
              const character = displayCharacter(word, state.profile.script);
              return (
                <button key={word.id} type="button" onClick={() => speakMandarin(character)}>
                  <strong>{character}</strong>
                  <span>{word.pinyin}</span>
                  <small>{word.meaning}</small>
                  <Volume2 size={15} />
                </button>
              );
            })}
          </div>
        </section>

        <footer className="briefing-actions">
          <p><Lightbulb size={17} /> Phiên làm bài sẽ tự lưu sau mỗi lựa chọn và tiếp tục đúng vị trí khi tải lại trang.</p>
          <button className="primary-button" type="button" onClick={() => setPhase("exercise")}>
            Bước vào Thử Luyện <Play size={17} />
          </button>
        </footer>
      </div>
    );
  }

  const current = exercises[index];
  if (!current) {
    return (
      <div className="lesson-state-screen">
        <CircleX size={44} />
        <h1>Phiên thử luyện chưa thể khởi tạo</h1>
        <button className="primary-button" type="button" onClick={restart}><RotateCcw size={17} /> Khởi tạo lại</button>
      </div>
    );
  }

  const score = Math.round((correctCount / Math.max(1, exercises.length)) * 100);
  const isCorrect = answersMatch(selected, current.correct);

  const checkAnswer = () => {
    if (!selected?.trim() || checked) return;
    setChecked(true);
    if (isCorrect) setCorrectCount((count) => count + 1);
    actions.recordAnswer({
      lessonId: lesson.id,
      questionId: current.id,
      wordId: current.wordId,
      kind: current.kind,
      skill: current.skill,
      prompt: current.kind === "listening" ? current.spokenText ?? current.prompt : current.prompt,
      selectedAnswer: selected,
      correctAnswer: current.correct,
      explanation: current.explanation,
      isCorrect,
    });
  };

  const next = () => {
    if (index < exercises.length - 1) {
      setIndex((currentIndex) => currentIndex + 1);
      setSelected(null);
      setChecked(false);
      return;
    }
    const previous = state.completedLessons[lesson.id];
    const firstMastery = score >= 70 && (!previous || previous.bestScore < 70);
    const reward = firstMastery
      ? lesson.xp
      : previous
        ? Math.round(lesson.xp * 0.2)
        : Math.round(lesson.xp * 0.25);
    setEarnedXp(reward);
    actions.completeLesson(lesson.id, score);
    setFinished(true);
  };

  if (finished) {
    const passed = score >= 70;
    const bestScore = Math.max(score, state.completedLessons[lesson.id]?.bestScore ?? 0);
    return (
      <div className="lesson-result-screen">
        <div className={`result-sigil ${passed ? "passed" : "retry"}`}>
          {passed ? <CircleCheck size={38} /> : <RotateCcw size={38} />}
          <span />
        </div>
        <span className="system-kicker">TRIAL COMPLETE · EVIDENCE SYNCHRONIZED</span>
        <h1>{passed ? "Cảnh giới đã khai mở" : "Nghịch cảnh đã được ghi nhận"}</h1>
        <p>{passed ? "Hệ thống đã xác nhận bạn vượt ngưỡng làm chủ và mở nút kế tiếp." : "Các câu sai đã vào Nghịch Cảnh Lục. Chữa đúng hai lần liên tiếp trước khi tái thử luyện."}</p>
        <div className="result-metrics">
          <div><small>Độ chính xác</small><strong>{score}%</strong></div>
          <div><small>Thành tích tốt nhất</small><strong>{bestScore}%</strong></div>
          <div><small>Năng lượng nhận</small><strong>+{earnedXp} XP</strong></div>
        </div>
        <div className="mastery-threshold"><span style={{ width: `${score}%` }} /><i style={{ left: "70%" }}>70% · KHAI MỞ</i></div>
        <div className="result-actions">
          <button className="secondary-button" type="button" onClick={restart}><RotateCcw size={17} /> Học và thử lại</button>
          {passed ? (
            <Link className="primary-button" to="/path" onClick={clearSession}>Tiếp tục Thiên Lộ <ArrowRight size={17} /></Link>
          ) : (
            <Link className="primary-button" to="/mistakes" onClick={clearSession}>Phá giải Nghịch Cảnh <ArrowRight size={17} /></Link>
          )}
        </div>
      </div>
    );
  }

  const ExerciseIcon = exerciseIcon(current.kind);
  const progress = Math.round(((index + 1) / exercises.length) * 100);

  return (
    <div className="lesson-live-page">
      <header className="lesson-live-header">
        <Link className="icon-button" to="/path" aria-label="Thoát bài học"><X size={20} /></Link>
        <div className="lesson-progress-track"><i style={{ width: `${progress}%` }} /></div>
        <span>{index + 1} / {exercises.length}</span>
        <span className="lesson-xp"><Zap size={15} /> {lesson.xp} XP</span>
      </header>

      <div className="lesson-context">
        <span><ExerciseIcon size={16} /> {current.instruction}</span>
        <strong>{lesson.title} · {lesson.chineseTitle}</strong>
      </div>

      <section className="exercise-stage">
        <div className={`exercise-prompt kind-${current.kind}`}>
          {current.kind === "listening" ? (
            <button className="sound-orb" type="button" onClick={() => current.spokenText && speakMandarin(current.spokenText)} aria-label="Phát âm thanh">
              <Volume2 size={38} />
              <span aria-hidden="true" />
            </button>
          ) : (
            <>
              <h1>{current.prompt}</h1>
              {current.promptMeta && <p>{current.promptMeta}</p>}
              {current.spokenText && current.kind !== "recall" && (
                <button className="listen-inline" type="button" onClick={() => speakMandarin(current.spokenText!)}>
                  <Volume2 size={17} /> Nghe
                </button>
              )}
            </>
          )}
          {current.kind === "listening" && <p>{current.promptMeta}</p>}
        </div>

        {current.kind === "recall" ? (
          <div className={`recall-answer ${checked ? (isCorrect ? "correct" : "wrong") : ""}`}>
            <label htmlFor="recall-input">Hán tự bạn tự gọi lại</label>
            <input
              id="recall-input"
              value={selected ?? ""}
              disabled={checked}
              autoComplete="off"
              autoFocus
              inputMode="text"
              placeholder="Nhập chữ Hán..."
              onChange={(event) => setSelected(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && selected?.trim()) checkAnswer();
              }}
            />
            <small>Không chấp nhận pinyin: mục tiêu là tự tái tạo chữ từ trí nhớ.</small>
          </div>
        ) : (
          <div className="answer-grid">
            {current.options.map((option, optionIndex) => {
              const chosen = selected === option;
              const revealCorrect = checked && option === current.correct;
              const revealWrong = checked && chosen && option !== current.correct;
              return (
                <button
                  className={`${chosen ? "selected" : ""} ${revealCorrect ? "correct" : ""} ${revealWrong ? "wrong" : ""}`}
                  disabled={checked}
                  key={option}
                  type="button"
                  onClick={() => setSelected(option)}
                >
                  <span>{String.fromCharCode(65 + optionIndex)}</span>
                  <strong>{option}</strong>
                  {revealCorrect && <Check size={19} />}
                  {revealWrong && <X size={19} />}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <footer className={`answer-console ${checked ? (isCorrect ? "correct" : "wrong") : ""}`}>
        {checked ? (
          <div className="answer-explanation">
            {isCorrect ? <CircleCheck size={23} /> : <Lightbulb size={23} />}
            <div>
              <strong>{isCorrect ? "Phán định chính xác" : `Đáp án đúng: ${current.correct}`}</strong>
              <p>{current.explanation}</p>
            </div>
          </div>
        ) : (
          <p><Lightbulb size={17} /> {current.kind === "recall" ? "Tự gọi lại trước khi xác nhận; đừng mở từ điển." : "Chọn một đáp án để hệ thống phân tích."}</p>
        )}
        <button className="primary-button" disabled={!selected?.trim()} type="button" onClick={checked ? next : checkAnswer}>
          {checked ? (index === exercises.length - 1 ? "Hoàn tất thử luyện" : "Câu tiếp theo") : "Xác nhận"}
          <ArrowRight size={17} />
        </button>
      </footer>
    </div>
  );
}
