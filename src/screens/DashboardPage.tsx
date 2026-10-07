import { LevelRewardPanel } from "../components/LevelRewardPanel";
import { PracticeCoverageMeter } from "../components/PracticeCoverageMeter";
import { usePracticeCoverage } from "../learning/usePracticeCoverage";
import "./NgocDashboard.css";
import {
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Clock3,
  Headphones,
  LockKeyhole,
  Mic2,
  Orbit,
  PenTool,
  Radar,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  X,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import { useEffect, useRef, useState } from "react";
import { NormalizedLearningAuthorityGate } from "../components/NormalizedLearningAuthorityGate";
import { ResponsiveHeroBackdrop } from "../components/ResponsiveHeroBackdrop";
import { COURSE_UNITS, RELEASED_LESSONS } from "../data/curriculum";
import { resolveLearningPathAuthority } from "../learning/learningAuthority";
import {
  deriveLocalLearnerActivityCoverage,
  deriveProjectedLearnerActivityCoverage,
  formatCoveragePercent,
  formatLearnerActivityCoverage,
} from "../learning/learningCoverage";
import { summarizeNormalizedObjectiveEvidence } from "../learning/normalizedEvidenceSummary";
import {
  type LearningJourneyStep,
  type LearningJourneyStepKind,
} from "../learning/learningJourney";
import { summarizePronunciationPractice } from "../learning/pronunciationPractice";
import {
  buildPronunciationDailyMission,
  GOAL_CONFIG,
  isLessonReleased,
  type DailyMission,
} from "../lib/adaptive";
import { useLearning } from "../store/LearningStore";
import { useInteractionXp } from "../store/InteractionXpStore";
import { useLearningJourney } from "../store/LearningJourneyStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import { emitSystemSignal } from "../system/systemSignals";
import {
  deriveJourneyTitles,
  getInteractionRankProgress,
  getSystemClass,
} from "../system/systemProgression";
import type { Skill } from "../types";

const skillLabels: Record<Skill, string> = {
  pronunciation: "Âm / Pinyin",
  listening: "Hội thoại nghe",
  speaking: "Nhiệm vụ nói",
  reading: "Hội thoại đọc",
  writing: "Hán tự",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
};

const skillIcons: Partial<Record<Skill, typeof Mic2>> = {
  pronunciation: Mic2,
  listening: Headphones,
  speaking: Mic2,
  reading: BookOpenText,
  writing: PenTool,
};

const missionIcon = (mission: DailyMission) => {
  if (mission.kind === "correction") return Swords;
  if (mission.kind === "review") return BrainCircuit;
  if (mission.kind === "practice") return Mic2;
  if (mission.kind === "goal") return Target;
  if (mission.kind === "diagnostic") return Radar;
  return Sparkles;
};

const journeyStepIcon = (step: LearningJourneyStep) => {
  if (step.stage === "learn") return BookOpenText;
  if (step.stage === "review") return BrainCircuit;
  if (step.stage === "transfer") return Target;
  return Orbit;
};

const journeyDestinationLabels: Record<LearningJourneyStepKind, string> = {
  lesson: "Bài học",
  path: "Thiên Lộ",
  mistakes: "Nghịch Cảnh Lục",
  fsrs: "Ký Ức Trận",
  pronunciation: "Vạn Âm Điện",
  assessment: "Khảo Nghiệm Căn Cơ",
  reader: "Vạn Quyển Các",
  writing: "Thần Văn Lộ",
  dictionary: "Tàng Tự Khố",
};

const DASHBOARD_TABS = [
  { id: "awakening", code: "01", label: "Thức tỉnh", description: "Tổng quan hôm nay" },
  { id: "status", code: "02", label: "Bảo Khố", description: "Phần thưởng cấp độ" },
  { id: "missions", code: "03", label: "Chỉ thị", description: "Nhiệm vụ ưu tiên" },
  { id: "pillars", code: "04", label: "Thất Trụ", description: "Tín hiệu học tập" },
  { id: "path", code: "05", label: "Thiên Lộ", description: "Tiến độ bài học" },
] as const;

type DashboardTabId = (typeof DASHBOARD_TABS)[number]["id"];

const DASHBOARD_ROTATION_MS = 5_000;

const missionReasons: Record<DailyMission["kind"], string> = {
  correction: "Lỗ hổng chưa khép đang cản bước tiến tiếp theo.",
  review: "Ký ức đã đến đúng thời điểm cần được gọi lại.",
  diagnostic: "Hệ thống cần xác định đúng điểm khởi hành của bạn.",
  practice: "Lượt luyện được lưu trên thiết bị, không tự trở thành điểm phát âm.",
  goal: "Nhiệm vụ này bám sát thiên mệnh bạn đã chọn.",
  lesson: "Đây là nút tiếp theo đang mở trên Thiên Lộ.",
};

function DashboardWindowHeader({
  code,
  eyebrow,
  title,
  purpose,
  icon: Icon,
  meta,
}: {
  code: string;
  eyebrow: string;
  title: string;
  purpose: string;
  icon: typeof Target;
  meta?: React.ReactNode;
}) {
  return (
    <header className="dashboard-window-header">
      <span className="dashboard-window-token" aria-hidden="true">
        <small>{code}</small>
        <Icon size={19} strokeWidth={1.7} />
      </span>
      <div className="dashboard-window-heading-copy">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{purpose}</p>
      </div>
      {meta ? <div className="dashboard-window-meta">{meta}</div> : null}
    </header>
  );
}

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTabId>("awakening");
  const [carouselHovered, setCarouselHovered] = useState(false);
  const [carouselFocused, setCarouselFocused] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<"previous" | "next">("next");
  const [pageVisible, setPageVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const practiceCoverage = usePracticeCoverage(true);
  const [pillarDetailsOpen, setPillarDetailsOpen] = useState(false);
  const pillarDetailsTriggerRef = useRef<HTMLButtonElement>(null);
  const pillarDetailsCloseRef = useRef<HTMLButtonElement>(null);
  const { state, level, sync } = useLearning();
  const { journey: integratedJourney } = useLearningJourney();
  const interactionXp = useInteractionXp();
  const { uniqueActivityCount: localSpeechPracticeCount } =
    summarizePronunciationPractice(state.evidence);
  const releasedCourseUnits = COURSE_UNITS
    .map((unit) => ({
      ...unit,
      lessons: unit.lessons.filter((lesson) =>
        isLessonReleased(lesson)
      ),
    }))
    .filter((unit) => unit.lessons.length > 0);
  const normalized = useNormalizedLearningProjection();
  const activeTabIndex = DASHBOARD_TABS.findIndex((tab) => tab.id === activeTab);
  const previousWindow = DASHBOARD_TABS[(activeTabIndex - 1 + DASHBOARD_TABS.length) % DASHBOARD_TABS.length];
  const nextWindow = DASHBOARD_TABS[(activeTabIndex + 1) % DASHBOARD_TABS.length];
  const rotationRunning = !carouselHovered
    && !carouselFocused
    && !pillarDetailsOpen
    && pageVisible
    && !prefersReducedMotion;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (!rotationRunning) return;
    const timer = window.setTimeout(() => {
      setTransitionDirection("next");
      setActiveTab((currentTab) => {
        const currentIndex = DASHBOARD_TABS.findIndex((tab) => tab.id === currentTab);
        return DASHBOARD_TABS[(currentIndex + 1) % DASHBOARD_TABS.length].id;
      });
    }, DASHBOARD_ROTATION_MS);
    return () => window.clearTimeout(timer);
  }, [activeTab, rotationRunning]);

  useEffect(() => {
    if (pillarDetailsOpen) pillarDetailsCloseRef.current?.focus();
  }, [pillarDetailsOpen]);

  const closePillarDetails = () => {
    setPillarDetailsOpen(false);
    window.requestAnimationFrame(() => pillarDetailsTriggerRef.current?.focus());
  };

  const moveWindow = (direction: "previous" | "next") => {
    const offset = direction === "next" ? 1 : -1;
    const nextIndex = (activeTabIndex + offset + DASHBOARD_TABS.length) % DASHBOARD_TABS.length;
    setTransitionDirection(direction);
    setActiveTab(DASHBOARD_TABS[nextIndex].id);
  };

  const handleCarouselKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveWindow("next");
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveWindow("previous");
    } else if (event.key === "Home") {
      event.preventDefault();
      setTransitionDirection("previous");
      setActiveTab(DASHBOARD_TABS[0].id);
    } else if (event.key === "End") {
      event.preventDefault();
      setTransitionDirection("next");
      setActiveTab(DASHBOARD_TABS.at(-1)!.id);
    }
  };
  const authenticated = sync.session?.authenticated === true;
  const authority = resolveLearningPathAuthority({
    authenticated,
    localState: state,
    projection: normalized.projection,
    authoritativeProgress: normalized.authoritativeProgress,
  });
  if (authority.state === "blocked") {
    return (
      <NormalizedLearningAuthorityGate
        phase={normalized.phase}
        reason={normalized.reason}
        refresh={normalized.refresh}
      />
    );
  }
  const pathView = authority.view;
  const { progress: courseProgress } = pathView;
  const normalizedEvidence = authenticated
    ? summarizeNormalizedObjectiveEvidence(
        normalized.coverageProjection ?? normalized.projection,
      )
    : null;
  if (authenticated && !normalizedEvidence) {
    return (
      <NormalizedLearningAuthorityGate
        phase="unavailable"
        reason="invalid-response"
        refresh={normalized.refresh}
      />
    );
  }
  const contentCoverage = authenticated
    ? deriveProjectedLearnerActivityCoverage(
        normalizedEvidence!.gateEligibleCorrectActivityCounts,
      )
    : deriveLocalLearnerActivityCoverage(state.evidence);
  const skillEvidence = (Object.keys(skillLabels) as Skill[]).map((skill) => {
    const breadth = contentCoverage[skill];
    return {
      skill,
      count: breadth.practiceCount,
      target: breadth.target,
      coverage: breadth.percent,
      practiceAvailable: breadth.practiceAvailable,
      supported: breadth.supported,
      state: breadth.state,
    };
  });
  const supportedSkillEvidence = skillEvidence.filter((item) => item.supported);
  const measuredSkillEvidence = supportedSkillEvidence.filter(
    (item) => item.state === "measured",
  );
  const hasMeasuredCoverage = measuredSkillEvidence.length > 0;
  const contentCoveragePercent = hasMeasuredCoverage
    ? Math.round(
      (measuredSkillEvidence.reduce(
        (total, item) => total + (item.coverage ?? 0),
        0,
      ) / measuredSkillEvidence.length) * 10,
    ) / 10
    : 0;
  const authoritativeGoal = normalized.projection?.enrollment?.goal;
  const goal = GOAL_CONFIG[authoritativeGoal ?? state.profile.goal];
  const rank = getInteractionRankProgress(interactionXp.totalXp);
  const displayedLevel = interactionXp.authoritative
    ? Math.floor(interactionXp.totalXp / 500) + 1
    : level;
  const systemClass = getSystemClass(authoritativeGoal ?? state.profile.goal);
  const journeyTitle = deriveJourneyTitles(state.completedLessons)
    .filter((item) => item.completed)
    .at(-1)?.title ?? "Hành Giả Sơ Khởi";
  const channelLabel = authenticated
    ? sync.phase === "offline"
      ? "TÀI KHOẢN · NGOẠI TUYẾN"
      : "TÀI KHOẢN · ĐÃ XÁC NHẬN"
    : "TRÊN THIẾT BỊ · LOCAL-FIRST";
  const nextPathLesson = RELEASED_LESSONS.find(
    (lesson) => lesson.id === pathView.nextLessonId,
  );
  const missions: DailyMission[] = authenticated
    ? [
        ...(nextPathLesson ? [{
          id: nextPathLesson.id,
          code: "ASCEND-01",
          title: nextPathLesson.title,
          description: nextPathLesson.objective,
          to: `/lesson/${nextPathLesson.id}`,
          minutes: nextPathLesson.minutes,
          reward: `+${nextPathLesson.xp} XP tương tác`,
          kind: "lesson" as const,
        }] : []),
        buildPronunciationDailyMission(),
        ...(goal.practicePath !== "/pronunciation" ? [{
          id: "goal-focus",
          code: "PRACTICE-02",
          title: goal.practiceLabel,
          description: `Luyện bổ trợ cho “${goal.label}” và củng cố vùng còn yếu trước khi sang bài mới.`,
          to: goal.practicePath,
          minutes: Math.max(4, state.profile.dailyMinutes),
          reward: "Practice-only",
          kind: "goal" as const,
        }] : []),
      ]
    : [];
  const localJourney = integratedJourney;
  const primaryJourneyStep = localJourney?.steps.find((step) => step.status === "action")
    ?? localJourney?.steps[0]
    ?? null;
  const primaryMission = missions[0] ?? null;
  const heroPrimaryTo = primaryJourneyStep?.to ?? primaryMission?.to ?? "/path";
  const heroPrimaryLabel = primaryJourneyStep
    ? `Bắt đầu ${primaryJourneyStep.stageLabel}`
    : primaryMission ? "Kích hoạt nhiệm vụ" : "Mở Thiên Lộ";
  const primaryLesson = RELEASED_LESSONS.find((lesson) =>
    lesson.id === (primaryJourneyStep?.sourceLessonId ?? primaryMission?.id)
  );
  const primarySigil = primaryMission?.kind === "correction"
    ? "解"
    : primaryLesson?.chineseTitle.slice(0, 1) ?? "命";
  const coverageGap = supportedSkillEvidence.find((item) => item.count === 0);
  const lowestObserved = [...supportedSkillEvidence]
    .filter((item) => item.count > 0)
    .sort((a, b) =>
      (a.coverage ?? 0) - (b.coverage ?? 0) || a.count - b.count
    )[0];
  const priorityEvidence = coverageGap ?? lowestObserved
    ?? supportedSkillEvidence[0]!;
  const signalStatus = hasMeasuredCoverage
    ? `${formatCoveragePercent(contentCoveragePercent)} tín hiệu đã xác lập`
    : authenticated
      ? "Cần thêm bằng chứng đủ điều kiện"
      : "Cần thêm bằng chứng học tập";
  const realmNodes = releasedCourseUnits.map((unit) => {
    const completed = unit.lessons.every((item) =>
      pathView.lessons.get(item.id)?.passed === true
    );
    const locked = unit.lessons.every((item) =>
      pathView.lessons.get(item.id)?.unlocked !== true
    );
    const current = unit.lessons.some((item) => item.id === pathView.nextLessonId);
    return { ...unit, completed, locked, current };
  });
  const currentRealmIndex = Math.max(
    0,
    realmNodes.findIndex((unit) => unit.current),
  );
  const realmPreviewStart = Math.min(
    Math.max(0, currentRealmIndex - 1),
    Math.max(0, realmNodes.length - 4),
  );
  const realmPreview = realmNodes.slice(realmPreviewStart, realmPreviewStart + 4);
  const hiddenRealmCount = Math.max(0, realmNodes.length - realmPreview.length);

  return (
    <div
      className="dashboard-page dashboard-deck ngoc-deck"
      role="region"
      aria-roledescription="carousel"
      aria-label="Các cửa sổ hologram của Thức Tỉnh Điện. Dùng phím mũi tên trái hoặc phải để chuyển cửa sổ."
      tabIndex={0}
      data-rotation={rotationRunning ? "running" : "paused"}
      data-direction={transitionDirection}
      data-pillar-details={pillarDetailsOpen ? "open" : "closed"}
      onKeyDown={handleCarouselKeyDown}
      onMouseEnter={() => setCarouselHovered(true)}
      onMouseLeave={() => setCarouselHovered(false)}
      onFocusCapture={() => setCarouselFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setCarouselFocused(false);
      }}
    >
      <button
        className="dashboard-carousel-arrow is-previous"
        type="button"
        aria-label={`Cửa sổ trước: ${previousWindow.label}`}
        disabled={pillarDetailsOpen}
        onClick={() => moveWindow("previous")}
      >
        <ChevronLeft size={25} strokeWidth={1.7} aria-hidden="true" />
      </button>

      <button
        className="dashboard-carousel-arrow is-next"
        type="button"
        aria-label={`Cửa sổ tiếp theo: ${nextWindow.label}`}
        disabled={pillarDetailsOpen}
        onClick={() => moveWindow("next")}
      >
        <ChevronRight size={25} strokeWidth={1.7} aria-hidden="true" />
      </button>

      <section
        id="dashboard-panel-awakening"
        className="awakening-hero dashboard-tab-panel"
        data-dashboard-slide
        data-slide-id="awakening"
        role="group"
        aria-roledescription="slide"
        aria-label="Cửa sổ 1 trên 5 · Thức tỉnh · Tổng quan hôm nay"
        hidden={activeTab !== "awakening"}
      >
        <ResponsiveHeroBackdrop priority />
        <div className="hero-scan" aria-hidden="true" />
        <div className="hero-coordinates" aria-hidden="true">
          <span>NODE 31.2304° N</span>
          <span>THẤT TRỤ · TÍN HIỆU HỌC TẬP</span>
        </div>
        <div className="hero-copy">
          <div className="system-kicker"><Orbit size={15} /> CHỈ THỊ NGÀY · {channelLabel}</div>
          <p className="hero-chinese">觉醒，从第一声开始</p>
          <h1>Đánh thức<br /><span>tiếng Trung</span> trong bạn.</h1>
          <p className="hero-lead">
            Hệ thống đã chọn hành động có tác động lớn nhất tới mục tiêu của bạn hôm nay.
          </p>
          <div className="sys-identity-band" aria-label="Định hướng và danh hiệu nội bộ">
            <span><small>THIÊN MỆNH</small><strong>{systemClass.title}</strong></span>
            <i aria-hidden="true" />
            <span><small>HÀNH TRÌNH</small><strong>{journeyTitle}</strong></span>
          </div>
          <div className="hero-actions">
            <Link className="primary-button hero-primary" to={heroPrimaryTo} viewTransition>
              <Sparkles size={18} /> {heroPrimaryLabel}
              <ArrowRight size={18} />
            </Link>
            <Link className="ghost-button" to="/path" viewTransition>
              Xem Thiên Lộ <ChevronRight size={17} />
            </Link>
          </div>
        </div>
        <div className="hero-core-meter">
          <span className="core-orbit" aria-hidden="true" />
          <div><small>{rank.chinese}</small><strong>{String(displayedLevel).padStart(2, "0")}</strong></div>
          <p>{rank.title} · {rank.xpToNext === null ? "đã chạm ngưỡng cao nhất" : `còn ${rank.xpToNext.toLocaleString("vi-VN")} XP tương tác đến bậc tiếp theo`}</p>
          <span className="sys-core-progress" style={{ "--sys-core-progress": `${rank.progress * 3.6}deg` } as React.CSSProperties} aria-hidden="true" />
        </div>
      </section>

      <section
        id="dashboard-panel-status"
        className="dashboard-tab-panel dashboard-status-panel"
        data-dashboard-slide
        data-slide-id="status"
        role="group"
        aria-roledescription="slide"
        aria-label="Cửa sổ 2 trên 5 · Bảo Khố · Phần thưởng cấp độ"
        hidden={activeTab !== "status"}
      >
        <DashboardWindowHeader
          code="02"
          eyebrow="CẤP ĐỘ · HANZI XU"
          title="Bảo Khố Thăng Cấp"
          purpose="Tích lũy XP, nhận Hanzi xu và đổi trọn gói Premium."
          icon={CircleGauge}
          meta={<span>{channelLabel}</span>}
        />

        <LevelRewardPanel />
      </section>

      <section
        id="dashboard-panel-missions"
        className="mission-console dashboard-tab-panel"
        data-dashboard-slide
        data-slide-id="missions"
        role="group"
        aria-roledescription="slide"
        aria-label="Cửa sổ 3 trên 5 · Chỉ thị · Nhiệm vụ ưu tiên"
        hidden={activeTab !== "missions"}
      >
        <DashboardWindowHeader
          code="03"
          eyebrow={localJourney ? `LỘ TRÌNH PHIÊN · ${goal.label.toUpperCase()}` : "CHỈ THỊ NGÀY · ƯU TIÊN THEO TÁC ĐỘNG"}
          title="Nhiệm vụ nên làm ngay"
          purpose={localJourney
            ? "Đi lần lượt qua Học → Ôn → Vận dụng → Khép phiên; chỉ bước hiện tại có nút hành động."
            : "Hệ thống chọn đúng một hành động có ích nhất; các nhiệm vụ còn lại xếp sau."}
          icon={Target}
          meta={<span>{state.profile.dailyMinutes} PHÚT HÔM NAY</span>}
        />

        {localJourney && primaryJourneyStep ? (
          <div className="mission-command-layout dashboard-slide-body" data-testid="local-learning-journey">
            <article className="mission-primary dashboard-holo-card" data-glyph="令">
              <div className="mission-sigil"><span>{primarySigil}</span></div>
              <div className="mission-copy">
                <div>
                  <span>BƯỚC {String(primaryJourneyStep.sequence).padStart(2, "0")}</span>
                  <span>{primaryJourneyStep.stageLabel.toUpperCase()}</span>
                  <span>{journeyDestinationLabels[primaryJourneyStep.kind].toUpperCase()}</span>
                </div>
                <h3>{primaryJourneyStep.title}</h3>
                <p>{primaryJourneyStep.reason}</p>
                <ul>
                  <li><Clock3 size={14} /> {primaryJourneyStep.minutes} phút</li>
                  <li><Target size={14} /> Đích đến: {goal.label}</li>
                  <li><BrainCircuit size={14} /> {localJourney.evidenceNotice}</li>
                </ul>
              </div>
              <Link
                className="dashboard-window-cta mission-start-command"
                to={primaryJourneyStep.to}
                viewTransition
                aria-current="step"
                aria-label={`Bắt đầu bước ${primaryJourneyStep.stageLabel}: ${primaryJourneyStep.title}`}
                onClick={() => emitSystemSignal({
                  type: "quest.activated",
                  sourceId: `dashboard:${primaryJourneyStep.id}`,
                  message: `Bước ${primaryJourneyStep.stageLabel} đã kích hoạt.`,
                })}
              >
                <span><small>BƯỚC HIỆN TẠI</small><strong>Bắt đầu {primaryJourneyStep.stageLabel}</strong></span>
                <ArrowRight size={20} />
              </Link>
            </article>

            <aside className="mission-queue-panel dashboard-holo-card" aria-label="Ba bước tiếp theo của phiên học">
              <header><span>CÙNG MỘT MẠCH KIẾN THỨC</span><strong>Các bước tiếp theo</strong></header>
              <div className="mission-queue mission-journey-queue" role="list">
                {localJourney.steps
                  .filter((step) => step.id !== primaryJourneyStep.id)
                  .map((step) => {
                    const Icon = journeyStepIcon(step);
                    return (
                      <div
                        className="mission-journey-step"
                        data-status={step.status}
                        key={step.id}
                        role="listitem"
                      >
                        <span className="queue-index">{String(step.sequence).padStart(2, "0")}</span>
                        <Icon size={18} aria-hidden="true" />
                        <span>
                          <strong>{step.stageLabel} · {step.title}</strong>
                          <small>{journeyDestinationLabels[step.kind]} · {
                            step.status === "clear"
                              ? "chưa có mục đến hạn"
                              : step.status === "completed"
                                ? "đã hoàn tất"
                                : `${step.minutes} phút`
                          }</small>
                          <em>{step.reason}</em>
                        </span>
                        <span className="mission-journey-state">
                          {step.status === "clear"
                            ? "ĐÃ RÕ"
                            : step.status === "completed" ? "ĐÃ XONG" : "KẾ TIẾP"}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </aside>
          </div>
        ) : primaryMission ? (
          <div className="mission-command-layout dashboard-slide-body">
            <article className="mission-primary dashboard-holo-card" data-glyph="令">
              <div className="mission-sigil"><span>{primarySigil}</span></div>
              <div className="mission-copy">
                <div><span>ƯU TIÊN HÔM NAY</span><span>HỌC THEO MỤC TIÊU</span></div>
                <h3>{primaryMission.title}</h3>
                <p>{primaryMission.description}</p>
                <ul>
                  <li><Clock3 size={14} /> {primaryMission.minutes} phút</li>
                  <li><Zap size={14} /> {primaryMission.reward}</li>
                  <li><BrainCircuit size={14} /> {missionReasons[primaryMission.kind]}</li>
                </ul>
              </div>
              <Link
                className="dashboard-window-cta mission-start-command"
                to={primaryMission.to}
                viewTransition
                aria-label={`Bắt đầu ${primaryMission.title}`}
                onClick={() => emitSystemSignal({
                  type: "quest.activated",
                  sourceId: `dashboard:${primaryMission.id}`,
                  message: `Nhiệm vụ ${primaryMission.title} đã kích hoạt.`,
                })}
              >
                <span><small>KÍCH HOẠT</small><strong>Bắt đầu nhiệm vụ</strong></span>
                <ArrowRight size={20} />
              </Link>
            </article>

            <aside className="mission-queue-panel dashboard-holo-card" aria-label="Nhiệm vụ tiếp theo">
              <header><span>SAU KHI HOÀN TẤT</span><strong>Hàng đợi tiếp theo</strong></header>
              <div className="mission-queue">
                {missions.slice(1).length > 0 ? missions.slice(1).map((mission, index) => {
                  const Icon = missionIcon(mission);
                  return (
                    <Link to={mission.to} key={mission.id} viewTransition>
                      <span className="queue-index">{String(index + 2).padStart(2, "0")}</span>
                      <Icon size={18} />
                      <span><strong>{mission.title}</strong><small>{mission.minutes} phút · {mission.reward}</small></span>
                      <ChevronRight size={17} />
                    </Link>
                  );
                }) : (
                  <div className="mission-queue-empty"><Check size={18} /><span><strong>Hàng đợi đã tinh gọn</strong><small>Hoàn tất nhiệm vụ ưu tiên trước.</small></span></div>
                )}
              </div>
            </aside>
          </div>
        ) : null}
      </section>

      <section
        id="dashboard-panel-pillars"
        className="skill-matrix dashboard-tab-panel"
        data-dashboard-slide
        data-slide-id="pillars"
        role="group"
        aria-roledescription="slide"
        aria-label="Cửa sổ 4 trên 5 · Thất Trụ · Tín hiệu học tập"
        hidden={activeTab !== "pillars"}
      >
        <DashboardWindowHeader
          code="04"
          eyebrow="THẤT TRỤ · TIẾN ĐỘ LUYỆN TẬP"
          title="Thất Trụ · Dấu chân tu luyện"
          purpose="Số câu khác nhau đã luyện trên kho câu hiện có · không phải mức thành thạo."
          icon={Radar}
          meta={<span>KHÔNG DÙNG XP ĐỂ SUY RA NĂNG LỰC</span>}
        />

        <div className="pillar-command-layout dashboard-slide-body">
          <section className="pillar-focus-card dashboard-holo-card" data-glyph="柱">
            <div
              className="pillar-signal-core"
              aria-label="Bảy trụ tu luyện"
            >
              <span><strong>07</strong><small>TRỤ TU LUYỆN</small></span>
            </div>
            <div className="pillar-focus-copy">
              <span className="dashboard-card-kicker"><ShieldCheck size={15} /> CÁCH ĐỌC BẢN ĐỒ</span>
              <h3>Mỗi câu luyện, một dấu chân</h3>
              <p>Thất Trụ ghi nhận các câu khác nhau đã luyện. Luyện lại một câu không tăng độ phủ; bằng chứng năng lực được xem riêng trong phần chi tiết.</p>
              <Link className="dashboard-window-cta" to="/analytics" viewTransition>
                Mở phân tích Thất Trụ <ArrowRight size={17} />
              </Link>
            </div>
          </section>

          <div className="skill-bars">
            {skillEvidence.map(({ skill }) => {
              const Icon = skillIcons[skill] ?? Target;
              return <div className="pillar-signal-row" data-skill={skill} key={skill}>
                <span className="pillar-signal-label"><Icon size={15} /><span><strong>{skillLabels[skill]}</strong></span></span>
                <PracticeCoverageMeter value={practiceCoverage[skill]} label={skillLabels[skill]} />
              </div>;
            })}
          </div>
        </div>

        <button
          ref={pillarDetailsTriggerRef}
          className="pillar-details-trigger"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={pillarDetailsOpen}
          aria-controls="pillar-details-overlay"
          data-testid="pillar-details-trigger"
          onClick={() => setPillarDetailsOpen(true)}
        >
          <span><Radar size={15} aria-hidden="true" /> Chi tiết bằng chứng</span>
          <small>07 hồ sơ từng trụ</small>
          <ChevronRight size={16} aria-hidden="true" />
        </button>

        {pillarDetailsOpen ? (
          <section
            id="pillar-details-overlay"
            className="pillar-details-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pillar-details-title"
            data-testid="pillar-details-overlay"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closePillarDetails();
              } else if (event.key === "Tab") {
                event.preventDefault();
                pillarDetailsCloseRef.current?.focus();
              }
            }}
          >
            <header className="pillar-details-header">
              <span className="pillar-details-token" aria-hidden="true"><Radar size={19} /></span>
              <div>
                <small>HỒ SƠ PHÂN TÍCH · CỬA SỔ 04</small>
                <h3 id="pillar-details-title">Chi tiết bằng chứng Thất Trụ</h3>
                <p>Số liệu học được tách khỏi bản đồ chính để không nhầm tín hiệu với năng lực.</p>
              </div>
              <button
                ref={pillarDetailsCloseRef}
                type="button"
                aria-label="Đóng chi tiết Thất Trụ"
                onClick={closePillarDetails}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <div className="pillar-details-scroll" data-testid="pillar-details-scroll">
              <aside className="pillar-details-summary">
                <span><ShieldCheck size={17} aria-hidden="true" /> TRẠNG THÁI TỔNG HỢP</span>
                <strong>{signalStatus}</strong>
                <p>Thất Trụ ghi nhận các câu khác nhau đã luyện. Luyện lại một câu không tăng độ phủ; bằng chứng năng lực được xem riêng trong phần chi tiết.</p>
                <small>{hasMeasuredCoverage
                  ? `Ưu tiên mở rộng: ${skillLabels[priorityEvidence.skill]}`
                  : "Chưa đưa ra kết luận về trụ yếu."}</small>
              </aside>

              <dl className="pillar-evidence-grid" aria-label="Bằng chứng của bảy trụ">
                {skillEvidence.map(({ skill, count, target, practiceAvailable, supported, state }) => {
                  const Icon = skillIcons[skill] ?? Target;
                  const visibleSignalState = practiceAvailable && !supported
                    ? "insufficient"
                    : state;
                  const hasUnmeasuredSpeechPractice = skill === "speaking"
                    && localSpeechPracticeCount > 0
                    && visibleSignalState !== "measured";
                  const detail = hasUnmeasuredSpeechPractice
                    ? `${localSpeechPracticeCount} câu đã luyện trên thiết bị · chưa có phép đo phát âm`
                    : visibleSignalState === "unavailable"
                    ? "Trụ chưa khai mở"
                    : visibleSignalState === "insufficient"
                      ? authenticated
                        ? "Chưa có bằng chứng đủ điều kiện"
                        : "Chưa ghi nhận chiến tích"
                      : formatLearnerActivityCoverage(count, target);
                  return (
                    <div
                      className="pillar-evidence-row"
                      data-state={visibleSignalState}
                      data-skill={skill}
                      key={skill}
                    >
                      <dt><Icon size={16} /><span><strong>{skillLabels[skill]}</strong><small>{hasUnmeasuredSpeechPractice ? "Đã ghi nhận luyện tập" : visibleSignalState === "measured" ? "Đã có tín hiệu" : visibleSignalState === "unavailable" ? "Chưa thể đo" : "Cần thêm mẫu"}</small></span></dt>
                      <dd>{detail}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </section>
        ) : null}
      </section>

      <section
        id="dashboard-panel-path"
        className="realm-progress dashboard-tab-panel"
        data-dashboard-slide
        data-slide-id="path"
        role="group"
        aria-roledescription="slide"
        aria-label="Cửa sổ 5 trên 5 · Thiên Lộ · Tiến độ bài học"
        hidden={activeTab !== "path"}
      >
        <DashboardWindowHeader
          code="05"
          eyebrow="THIÊN LỘ · TIẾN ĐỘ BÀI HỌC"
          title="Tinh Đồ Cảnh Giới"
          purpose="Nhìn lại những chặng đã vượt qua và ranh giới tiếp theo trên Thiên Lộ."
          icon={Orbit}
          meta={<span>{pathView.completedCount} / {pathView.totalCount} BÀI VƯỢT NGƯỠNG</span>}
        />

        <div className="path-command-layout dashboard-slide-body">
          <article className="path-next-card dashboard-holo-card" data-glyph="路">
            <div className="path-progress-core" style={{ "--path-progress": `${courseProgress * 3.6}deg` } as React.CSSProperties}>
              <span><strong>{courseProgress}%</strong><small>TIẾN ĐỘ THIÊN LỘ</small></span>
            </div>
            <div className="path-next-copy">
              <span className="dashboard-card-kicker"><Orbit size={15} /> CẢNH GIỚI HIỆN TẠI</span>
              <h3>{realmNodes[currentRealmIndex]?.title ?? "Hành trình đã khai mở"}</h3>
              <p>{pathView.completedCount} / {pathView.totalCount} bài đã vượt ngưỡng. Mỗi chặng mở ra một miền kiến thức mới.</p>
              <ul>
                <li><Check size={14} /> {realmNodes.filter(unit => unit.completed).length} chặng đã vượt</li>
                <li><Orbit size={14} /> {realmNodes.filter(unit => !unit.completed && !unit.locked).length} chặng đang mở</li>
                <li><LockKeyhole size={14} /> {realmNodes.filter(unit => unit.locked).length} chặng phía trước</li>
              </ul>
              <div className="path-actions">
                <Link className="dashboard-window-cta" to="/path" viewTransition>Khám phá Thiên Lộ <ArrowRight size={17} /></Link>
              </div>
            </div>
          </article>

          <section className="realm-preview dashboard-holo-card" aria-label="Các cảnh giới gần vị trí hiện tại">
            <header><span>CẬN CẢNH TINH ĐỒ</span><strong>{hiddenRealmCount ? `${hiddenRealmCount} chặng khác trên Thiên Lộ` : "Toàn bộ chặng đang hiển thị"}</strong></header>
            <div
              className="realm-line"
              style={{
                "--course-progress": `${courseProgress}%`,
                "--realm-count": Math.max(1, realmPreview.length),
              } as React.CSSProperties}
            >
              {realmPreview.map((unit, index) => (
                <div
                  className={`realm-node ${unit.color} ${unit.completed ? "completed" : ""} ${unit.locked ? "locked" : ""} ${unit.current ? "current" : ""}`}
                  data-realm-state={unit.completed ? "completed" : unit.locked ? "locked" : unit.current ? "current" : "available"}
                  key={unit.id}
                >
                  <span className="realm-marker">
                    {unit.completed ? <Check size={17} /> : unit.locked ? <LockKeyhole size={15} /> : unit.current ? <Orbit size={16} /> : realmPreviewStart + index + 1}
                  </span>
                  <span className="realm-node-copy"><small>{unit.code}</small><strong>{unit.title}</strong><span>{unit.chineseTitle}</span></span>
                  <em>{unit.completed ? "Đã vượt ngưỡng" : unit.locked ? "Đang niêm phong" : unit.current ? "Chặng hiện tại" : "Có thể tiếp cận"}</em>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

    </div>
  );
}
