import {
  ArrowRight,
  BookOpenCheck,
  Gem,
  Map,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

export function LessonQuestResult({
  lessonId,
  lessonTitle,
  chineseTitle,
  passed,
  correctCount,
  totalCount,
  gateScore,
  requiredPassed,
  rewardXp,
  rewardState,
  rewardError,
  onClaimReward,
  onRetry,
  onNavigate,
  retryDestination = "/path",
  retryDestinationLabel = "Trở về Thiên Lộ",
  continueDestination,
  continueDestinationLabel,
}: {
  lessonId: string;
  lessonTitle: string;
  chineseTitle: string;
  passed: boolean;
  correctCount: number;
  totalCount: number;
  gateScore: number;
  requiredPassed: boolean;
  rewardXp: number;
  rewardState: "unavailable" | "claimable" | "claiming" | "claimed";
  rewardError?: string | null;
  onClaimReward?: () => void;
  onRetry: () => void;
  onNavigate?: () => void;
  retryDestination?: string;
  retryDestinationLabel?: string;
  continueDestination?: string;
  continueDestinationLabel?: string;
}) {
  const resultRef = useRef<HTMLElement>(null);
  const previousRewardState = useRef(rewardState);
  const [justOpened, setJustOpened] = useState(false);
  const rawScore = Math.round((correctCount / Math.max(1, totalCount)) * 100);
  const hasAssistedCorrectAnswers = rawScore > gateScore;
  const resultDescription = passed
    ? "Cửa ải đã được ghi lên bản đồ. Bạn có thể luyện lại ngay hoặc mang bài này sang Vạn Âm Điện."
    : !requiredPassed
      ? "Phần cốt lõi còn thiếu dấu ấn. Xem lại manh mối rồi thử một lượt mới."
      : hasAssistedCorrectAnswers
        ? `Bạn đúng ${correctCount}/${totalCount}, nhưng phần có trợ giúp chưa được tính là tự lực.`
        : "Xem lại những câu còn vướng rồi bước vào một lượt thử sức mới.";

  useEffect(() => {
    resultRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const opened = rewardState === "claimed"
      && previousRewardState.current !== "claimed";
    previousRewardState.current = rewardState;
    if (!opened) return;
    setJustOpened(true);
    const timeout = window.setTimeout(() => setJustOpened(false), 720);
    return () => window.clearTimeout(timeout);
  }, [rewardState]);

  return (
    <section
      ref={resultRef}
      tabIndex={-1}
      className={`path-clear-screen ${passed ? "is-cleared" : "is-retry"}`}
      data-testid="lesson-quest-result"
      aria-labelledby="lesson-quest-result-title"
    >
      <div className="path-clear-atmosphere" aria-hidden="true">
        <span>天</span><i /><i /><i />
      </div>

      <header className="path-clear-topline">
        <span><Map aria-hidden="true" /> THIÊN LỘ · {lessonId.toUpperCase()}</span>
        <strong>
          {passed ? <ShieldCheck aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
          {passed ? "CỬA ẢI HOÀN TẤT" : "CỬA ẢI CHƯA MỞ"}
        </strong>
      </header>

      <div className="path-clear-content">
        <div className="path-clear-map">
          <svg viewBox="0 0 360 250" role="presentation">
            <path className="path-clear-route-shadow" d="M20 220 C78 220 72 150 132 150 S198 194 236 127 S294 93 340 28" />
            <path className="path-clear-route-line" d="M20 220 C78 220 72 150 132 150 S198 194 236 127 S294 93 340 28" />
            <circle cx="20" cy="220" r="8" />
            <circle cx="132" cy="150" r="8" />
            <circle cx="236" cy="127" r="8" />
            <circle className="path-clear-route-goal" cx="340" cy="28" r="12" />
          </svg>
          {passed ? rewardState === "claimable" || rewardState === "claiming" ? (
            <button
              className={`path-clear-portal is-claimable ${rewardState === "claiming" ? "is-opening" : ""}`}
              type="button"
              onClick={onClaimReward}
              disabled={rewardState === "claiming"}
              aria-label={`Mở rương nhận ${rewardXp} EXP`}
            >
              <span className="path-clear-chest" aria-hidden="true"><i /><i /><b /></span>
              {rewardState === "claiming" && <LoaderCircle className="path-clear-spinner" />}
              <small>RƯƠNG CỬA ẢI</small>
              <span>{rewardState === "claiming" ? "ĐANG MỞ" : `+${rewardXp} EXP`}</span>
              <i className="path-clear-chest-glint" aria-hidden="true" />
            </button>
          ) : (
            <div className={`path-clear-portal is-claimed ${justOpened ? "is-just-opened" : ""}`} role="status" aria-label={`Đã nhận ${rewardXp} EXP`}>
              <span className="path-clear-chest is-open" aria-hidden="true"><i /><i /><b /></span>
              <small>RƯƠNG ĐÃ MỞ</small>
              <span>ĐÃ NHẬN</span>
              <i className="path-clear-chest-glint" aria-hidden="true" />
              <i className="path-clear-chest-burst" aria-hidden="true" />
            </div>
          ) : (
            <div className="path-clear-portal is-locked" aria-hidden="true">
              <RotateCcw />
              <small>TỌA ĐỘ GIỮ LẠI</small>
              <span>{gateScore}%</span>
            </div>
          )}
        </div>

        <div className="path-clear-copy">
          <p>{passed ? "DẤU ẤN THIÊN LỘ" : "TỌA ĐỘ ĐÃ ĐƯỢC GIỮ"}</p>
          <h1 id="lesson-quest-result-title">{lessonTitle}</h1>
          <strong>{chineseTitle}</strong>
          <span>{resultDescription}</span>

          <aside className="path-clear-reward" aria-label={passed ? `Phần thưởng ${rewardXp} EXP` : "Tiến độ hiện tại"}>
            <Gem aria-hidden="true" />
            <div>
              <span>{passed ? "RƯƠNG THƯỞNG CỬA ẢI" : "DẤU ẤN HIỆN TẠI"}</span>
              <small>{passed
                ? rewardState === "claimable"
                  ? "Chạm rương trên bản đồ để nhận phần thưởng"
                  : rewardState === "claiming"
                    ? "Đang xác nhận phần thưởng của bạn"
                    : "Phần thưởng đã ghi vào hành trình; không thể nhận lại"
                : "Cần 70% dấu ấn tự lực để vượt ải"}</small>
            </div>
            <strong>{passed
              ? rewardState === "claimable"
                ? `+${rewardXp} EXP`
                : rewardState === "claiming" ? "ĐANG MỞ" : "ĐÃ NHẬN"
              : `${gateScore}%`}</strong>
          </aside>
          {rewardError && <p className="path-clear-reward-error" role="alert">{rewardError}</p>}
          <span className="sr-only" aria-live="polite">
            {justOpened ? `Đã nhận ${rewardXp} EXP.` : ""}
          </span>

          <dl className="path-clear-stats" aria-label="Kết quả cửa ải">
            <div><dt>Câu đúng</dt><dd>{correctCount}/{totalCount}</dd></div>
            <div><dt>Dấu ấn tự lực</dt><dd>{gateScore}%</dd></div>
          </dl>
        </div>
      </div>

      <footer className="path-clear-actions">
        {passed ? (
          <>
            <button className="path-clear-action is-quiet" type="button" onClick={onRetry}>
              <RotateCcw aria-hidden="true" /> Làm lại bài này
            </button>
            <Link className="path-clear-action is-quiet" to="/path" onClick={onNavigate}>
              <Map aria-hidden="true" /> Trở về Thiên Lộ
            </Link>
            <Link
              className="path-clear-action is-primary"
              to={continueDestination
                ?? `/pronunciation?lesson=${encodeURIComponent(lessonId)}`}
              onClick={onNavigate}
            >
              <Volume2 aria-hidden="true" /> {continueDestinationLabel
                ?? "Luyện tại Vạn Âm Điện"} <ArrowRight aria-hidden="true" />
            </Link>
          </>
        ) : (
          <>
            <Link className="path-clear-action is-quiet" to={retryDestination} onClick={onNavigate}>
              <BookOpenCheck aria-hidden="true" /> {retryDestinationLabel}
            </Link>
            <button className="path-clear-action is-primary" type="button" onClick={onRetry}>
              <RotateCcw aria-hidden="true" /> Làm lại không trợ giúp <ArrowRight aria-hidden="true" />
            </button>
          </>
        )}
      </footer>
    </section>
  );
}
