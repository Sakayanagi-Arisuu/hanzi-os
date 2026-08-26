import {
  BookOpenCheck,
  Check,
  CloudUpload,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router";

export type LessonQuestTransitionKind =
  | "restoring"
  | "opening"
  | "submitting"
  | "abandoning";

const TRANSITION_COPY: Record<LessonQuestTransitionKind, {
  code: string;
  eyebrow: string;
  title: string;
  description: string;
  rune: string;
  steps: readonly [string, string, string];
}> = {
  restoring: {
    code: "QUEST RESUME",
    eyebrow: "ĐANG KHÔI PHỤC HÀNH TRÌNH",
    title: "Triệu hồi nhiệm vụ đang dở",
    description: "Đang đưa đúng câu hỏi và vị trí gần nhất trở lại Thí Luyện.",
    rune: "续",
    steps: ["Đọc hồ sơ", "Khôi phục vị trí", "Mở nhiệm vụ"],
  },
  opening: {
    code: "QUEST FORGE",
    eyebrow: "ĐANG KHỞI TẠO THÍ LUYỆN",
    title: "Rèn bản đồ nhiệm vụ",
    description: "Đang xác minh lộ trình và chuẩn bị đúng nội dung của bài này.",
    rune: "启",
    steps: ["Xác minh lộ trình", "Dựng thử luyện", "Đặt điểm tiếp tục"],
  },
  submitting: {
    code: "QUEST SEAL",
    eyebrow: "ĐANG NIÊM PHONG CHIẾN TÍCH",
    title: "Ghi chiến tích vào hành trình",
    description: "Các câu trả lời đã được giữ nguyên; hệ thống đang hoàn tất kết quả nhiệm vụ.",
    rune: "录",
    steps: ["Đối chiếu câu trả lời", "Ghi chiến tích", "Mở kết quả"],
  },
  abandoning: {
    code: "QUEST HOLD",
    eyebrow: "ĐANG CẤT GIỮ HÀNH TRÌNH",
    title: "Niêm phong phiên đang dở",
    description: "Những câu đã hoàn thành được giữ nguyên để bạn quay lại sau.",
    rune: "存",
    steps: ["Gom tiến độ", "Lưu điểm dừng", "Trở về Thiên Lộ"],
  },
};

export function LessonQuestTransition({
  kind,
  lessonTitle,
  itemCount,
  activeStep,
  delayed = false,
  retrying = false,
  onRetry,
}: {
  kind: LessonQuestTransitionKind;
  lessonTitle: string;
  itemCount?: number;
  activeStep?: 0 | 1 | 2;
  delayed?: boolean;
  retrying?: boolean;
  onRetry?: () => void;
}) {
  const copy = TRANSITION_COPY[kind];
  const currentStep = activeStep ?? 0;
  const progressValue = [18, 52, 86][currentStep];
  const visualState = delayed
    ? "retry"
    : (["verifying", "sealing", "syncing"] as const)[currentStep];

  return (
    <section
      className={`lesson-quest-transition is-${kind} ${delayed ? "is-delayed" : ""}`}
      data-state={visualState}
      aria-labelledby="lesson-transition-title"
    >
      <div className="quest-transition-atmosphere" aria-hidden="true">
        <span>{copy.rune}</span><i /><b />
      </div>

      <header className="quest-transition-header">
        <span>{copy.code} · HANZI.OS</span>
        <strong><ShieldCheck size={16} /> Tiến độ được bảo toàn</strong>
      </header>

      <div className="quest-transition-stage-body">
        <div className="quest-transition-core" data-state={visualState} aria-hidden="true">
          <span><ScrollText size={54} /></span>
          <i>{copy.rune}</i>
          <b />
          <em /><em /><em /><em />
        </div>

        <main className="quest-transition-copy">
          <span className="system-kicker"><Sparkles size={15} /> {copy.eyebrow}</span>
          <h1 id="lesson-transition-title">{copy.title}</h1>
          <p>{copy.description}</p>
          <strong>{lessonTitle}</strong>
        </main>
      </div>

      <div className="quest-transition-console">
        <div className="quest-transition-stage-label">
          <span>ẤN CHÚ {String(currentStep + 1).padStart(2, "0")} / 03</span>
          <strong>{delayed ? "Tiến trình tạm dừng" : copy.steps[currentStep]}</strong>
          <b>{progressValue}%</b>
        </div>
        <div
          className="quest-transition-progress"
          data-step={currentStep}
          role="progressbar"
          aria-label="Tiến độ xử lý nhiệm vụ"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressValue}
          aria-valuetext={delayed
            ? `Tiến trình tạm dừng tại bước ${currentStep + 1} trên 3: ${copy.steps[currentStep]}`
            : `Đang thực hiện bước ${currentStep + 1} trên 3: ${copy.steps[currentStep]}`}
        >
          <span><i /></span><b />
        </div>

        <ol className="quest-transition-steps" aria-label="Ba bước xử lý nhiệm vụ">
          {copy.steps.map((step, index) => (
            <li
              key={step}
              data-state={index < currentStep
                ? "complete"
                : index === currentStep
                  ? "active"
                  : "pending"}
            >
              <span>{index < currentStep ? <Check size={15} /> : String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </li>
          ))}
        </ol>

        {itemCount ? (
          <p className="quest-transition-ledger">
            <BookOpenCheck size={16} /> {itemCount} câu trong hồ sơ nhiệm vụ
          </p>
        ) : null}
      </div>

      {delayed ? (
        <div className="quest-transition-recovery" role="alert">
          <div>
            <strong>Ấn chú chưa hoàn tất</strong>
            <p>Câu trả lời vẫn an toàn. Hãy thử ghi lại chiến tích; bạn không cần làm lại nhiệm vụ.</p>
          </div>
          <div>
            <Link className="secondary-button" to="/path">Về Thiên Lộ</Link>
            <button className="primary-button" type="button" disabled={retrying} onClick={onRetry}>
              <RefreshCw size={17} /> {retrying ? "Đang thử lại..." : "Ghi lại chiến tích"}
            </button>
          </div>
        </div>
      ) : (
        <p className="quest-transition-live" aria-live="polite" aria-atomic="true">
          <CloudUpload size={16} /> Bước {currentStep + 1}/3 · {copy.steps[currentStep]}
        </p>
      )}
    </section>
  );
}
