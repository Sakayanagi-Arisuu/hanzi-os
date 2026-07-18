import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  CircleCheck,
  Crosshair,
  Gauge,
  Headphones,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LESSON_BY_ID } from "../data/curriculum";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";

type AssessmentQuestion = {
  prompt: string;
  meta: string;
  options: string[];
  correct: string;
  explanation: string;
  audio?: string;
};

const questions: AssessmentQuestion[] = [
  { prompt: "你", meta: "Chọn nghĩa", options: ["tôi", "bạn", "giáo viên", "người"], correct: "bạn", explanation: "你 (nǐ) là đại từ ngôi hai: bạn." },
  { prompt: "好", meta: "Chọn pinyin", options: ["hāo", "háo", "hǎo", "hào"], correct: "hǎo", explanation: "好 đọc hǎo, thanh 3, nghĩa là tốt hoặc khỏe." },
  { prompt: "我是学生。", meta: "Chọn nghĩa câu", options: ["Tôi là sinh viên.", "Bạn là giáo viên.", "Tôi không khỏe.", "Đây là sách."], correct: "Tôi là sinh viên.", explanation: "我 = tôi, 是 = là, 学生 = sinh viên." },
  { prompt: "你是老师___？", meta: "Chọn từ hoàn thiện câu hỏi", options: ["不", "吗", "有", "人"], correct: "吗", explanation: "Thêm 吗 cuối câu trần thuật để tạo câu hỏi có/không." },
  { prompt: "bù", meta: "不 mang thanh nào?", options: ["Thanh 1", "Thanh 2", "Thanh 3", "Thanh 4"], correct: "Thanh 4", explanation: "不 có thanh gốc 4; trước một thanh 4 khác, nó thường biến thành bú." },
  { prompt: "我是越南人。", meta: "Câu này nói điều gì?", options: ["Tôi đến Trung Quốc.", "Tôi là người Việt Nam.", "Nhà tôi có người.", "Tôi học tiếng Việt."], correct: "Tôi là người Việt Nam.", explanation: "Tên quốc gia + 人 tạo cách nói quốc tịch." },
  { prompt: "我的书", meta: "Chọn cấu trúc", options: ["sách đọc tôi", "tôi là sách", "sách của tôi", "tôi có ba sách"], correct: "sách của tôi", explanation: "Người sở hữu + 的 + vật: 我 + 的 + 书." },
  { prompt: "三个人", meta: "Chọn nghĩa", options: ["một gia đình", "hai giáo viên", "ba người", "ba quyển sách"], correct: "ba người", explanation: "三 = ba, 个 = lượng từ, 人 = người." },
  { prompt: "Nghe và chọn cụm đúng", meta: "Listening calibration", options: ["你好", "谢谢", "再见", "老师"], correct: "谢谢", explanation: "谢谢 (xièxie) nghĩa là cảm ơn.", audio: "谢谢" },
  { prompt: "你喝茶吗？", meta: "Chọn phản hồi phù hợp", options: ["是，我喝茶。", "我是茶。", "三个人。", "老师的书。"], correct: "是，我喝茶。", explanation: "Câu hỏi hỏi bạn có uống trà không; câu trả lời giữ động từ 喝." },
];

const resultForScore = (score: number) => score >= 75
  ? { lessonId: "characters-1", title: "Hán tự nền tảng", realm: "Thông qua sơ cấp" }
  : score >= 50
    ? { lessonId: "daily-1", title: "Đời sống hằng ngày", realm: "Nền HSK 1" }
    : score >= 25
      ? { lessonId: "survival-1", title: "Sinh tồn giao tiếp", realm: "Căn cơ cơ bản" }
      : { lessonId: "boot-1", title: "Bốn thanh điệu", realm: "Khởi đầu từ số 0" };

const ASSESSMENT_SESSION_KEY = "hanzi-os-assessment-session-v1";

type AssessmentSession = {
  index: number;
  selected: string | null;
  checked: boolean;
  correctCount: number;
};

const readAssessmentSession = (): AssessmentSession | null => {
  try {
    const raw = localStorage.getItem(ASSESSMENT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AssessmentSession;
    if (parsed.index < 0 || parsed.index >= questions.length) return null;
    return parsed;
  } catch {
    return null;
  }
};

export function AssessmentPage() {
  const { state, actions } = useLearning();
  const [restoredSession] = useState(readAssessmentSession);
  const [phase, setPhase] = useState<"intro" | "question" | "result">(restoredSession ? "question" : "intro");
  const [index, setIndex] = useState(restoredSession?.index ?? 0);
  const [selected, setSelected] = useState<string | null>(restoredSession?.selected ?? null);
  const [checked, setChecked] = useState(restoredSession?.checked ?? false);
  const [correctCount, setCorrectCount] = useState(restoredSession?.correctCount ?? 0);
  const [finalScore, setFinalScore] = useState(state.diagnostic.completed ? state.diagnostic.score : 0);

  const current = questions[index];

  useEffect(() => {
    if (phase !== "question") return;
    localStorage.setItem(ASSESSMENT_SESSION_KEY, JSON.stringify({ index, selected, checked, correctCount }));
  }, [checked, correctCount, index, phase, selected]);

  const startFromZero = () => {
    actions.completeDiagnostic(0);
    localStorage.removeItem(ASSESSMENT_SESSION_KEY);
    setFinalScore(0);
    setPhase("result");
  };

  const check = () => {
    if (!selected || checked) return;
    setChecked(true);
    if (selected === current.correct) setCorrectCount((value) => value + 1);
  };

  const next = () => {
    if (index < questions.length - 1) {
      setIndex((value) => value + 1);
      setSelected(null);
      setChecked(false);
      return;
    }
    const score = Math.round((correctCount / questions.length) * 100);
    setFinalScore(score);
    actions.completeDiagnostic(score);
    localStorage.removeItem(ASSESSMENT_SESSION_KEY);
    setPhase("result");
  };

  const restart = () => {
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setCorrectCount(0);
    localStorage.removeItem(ASSESSMENT_SESSION_KEY);
    setPhase("question");
  };

  if (phase === "intro") {
    return (
      <div className="assessment-intro">
        <div className="assessment-core"><Crosshair size={38} /><span /></div>
        <span className="system-kicker">FOUNDATION CALIBRATION · 10 NODES</span>
        <h1>Khảo nghiệm căn cơ</h1>
        <p>Hệ thống đo nhanh thanh điệu, từ vựng, ngữ pháp, nghe và đọc để mở đúng điểm xuất phát. Sai không trừ XP và không khóa nội dung đã học.</p>
        <div className="assessment-facts">
          <span><Gauge size={18} /><strong>4–6 phút</strong><small>thời lượng</small></span>
          <span><BrainCircuit size={18} /><strong>10 câu</strong><small>đa năng lực</small></span>
          <span><ShieldCheck size={18} /><strong>Không áp lực</strong><small>chỉ dùng để định tuyến</small></span>
        </div>
        <div className="assessment-actions">
          <button className="secondary-button" type="button" onClick={startFromZero}>Tôi bắt đầu từ số 0</button>
          <button className="primary-button" type="button" onClick={() => setPhase("question")}>Bắt đầu khảo nghiệm <ArrowRight size={18} /></button>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    const result = resultForScore(finalScore);
    const lesson = LESSON_BY_ID.get(result.lessonId);
    return (
      <div className="assessment-result">
        <div className="result-sigil passed"><CircleCheck size={38} /><span /></div>
        <span className="system-kicker">CALIBRATION COMPLETE</span>
        <h1>Căn cơ đã được định tuyến</h1>
        <div className="assessment-score"><strong>{finalScore}</strong><span>/100</span></div>
        <p>Điểm xuất phát đề xuất: <strong>{result.realm}</strong>. Hệ thống sẽ vẫn kiểm tra mastery trước mỗi lần mở cảnh giới mới.</p>
        <div className="assessment-destination">
          <small>ENTRY NODE</small>
          <strong>{lesson?.title ?? result.title}</strong>
          <span>{lesson?.objective}</span>
        </div>
        <div className="assessment-actions">
          <button className="secondary-button" type="button" onClick={restart}><RotateCcw size={17} /> Làm lại</button>
          <Link className="primary-button" to={`/lesson/${result.lessonId}`}>Đi đến điểm xuất phát <ArrowRight size={17} /></Link>
        </div>
      </div>
    );
  }

  const progress = Math.round(((index + 1) / questions.length) * 100);
  return (
    <div className="assessment-live">
      <header>
        <Link className="icon-button" to="/" aria-label="Rời khảo nghiệm"><ArrowLeft size={20} /></Link>
        <div><i style={{ width: `${progress}%` }} /></div>
        <span>{index + 1}/{questions.length}</span>
      </header>
      <section className="assessment-question">
        <span className="system-kicker"><Sparkles size={15} /> {current.meta}</span>
        {current.audio ? (
          <button className="sound-orb" type="button" onClick={() => speakMandarin(current.audio!)} aria-label="Nghe câu hỏi"><Volume2 size={37} /><span /></button>
        ) : <h1>{current.prompt}</h1>}
        {current.audio && <p>Nhấn để nghe lại</p>}
        <div className="assessment-options">
          {current.options.map((option, optionIndex) => {
            const correct = checked && option === current.correct;
            const wrong = checked && selected === option && option !== current.correct;
            return (
              <button className={`${selected === option ? "selected" : ""} ${correct ? "correct" : ""} ${wrong ? "wrong" : ""}`} disabled={checked} key={option} type="button" onClick={() => setSelected(option)}>
                <span>{String.fromCharCode(65 + optionIndex)}</span><strong>{option}</strong>{correct ? <Check size={18} /> : wrong ? <X size={18} /> : null}
              </button>
            );
          })}
        </div>
      </section>
      <footer className={checked ? (selected === current.correct ? "correct" : "wrong") : ""}>
        <div>
          {checked ? <><strong>{selected === current.correct ? "Nhận định chính xác" : `Đáp án: ${current.correct}`}</strong><p>{current.explanation}</p></> : <p>Chọn phương án gần nhất với hiểu biết hiện tại của bạn.</p>}
        </div>
        <button className="primary-button" disabled={!selected} type="button" onClick={checked ? next : check}>{checked ? (index === questions.length - 1 ? "Hoàn tất" : "Câu tiếp theo") : "Xác nhận"}<ArrowRight size={17} /></button>
      </footer>
    </div>
  );
}
