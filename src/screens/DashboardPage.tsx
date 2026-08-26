import {
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Clock3,
  Flame,
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
import { getHskCurriculumView } from "../data/hskCurriculumGraph";
import { resolveLearningPathAuthority } from "../learning/learningAuthority";
import {
  deriveLocalLearnerActivityCoverage,
  deriveProjectedLearnerActivityCoverage,
  formatCoveragePercent,
  formatLearnerActivityCoverage,
} from "../learning/learningCoverage";
import { summarizeNormalizedObjectiveEvidence } from "../learning/normalizedEvidenceSummary";
import {
  buildDailyLearningJourney,
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
  { id: "status", code: "02", label: "Trạng thái", description: "Dữ liệu học hôm nay" },
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
  const [pillarDetailsOpen, setPillarDetailsOpen] = useState(false);
  const pillarDetailsTriggerRef = useRef<HTMLButtonElement>(null);
  const pillarDetailsCloseRef = useRef<HTMLButtonElement>(null);
  const { state, dueWordIds, level, sync } = useLearning();
  const interactionXp = useInteractionXp();
  const { uniqueActivityCount: localSpeechPracticeCount } =
    summarizePronunciationPractice(state.evidence);
  const curriculumView = getHskCurriculumView(state.profile.startingLevel);
  const visibleLessonIds = new Set(curriculumView.visibleLessonIds);
  const releasedCourseUnits = COURSE_UNITS
    .map((unit) => ({
      ...unit,
      lessons: unit.lessons.filter((lesson) =>
        isLessonReleased(lesson) && visibleLessonIds.has(lesson.id)
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
      count: breadth.covered,
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
  const dailyTarget = state.profile.dailyMinutes * 6;
  const dailyProgress = Math.min(100, Math.round((state.dailyXp / dailyTarget) * 100));
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
  const localJourney = authenticated
    ? null
    : buildDailyLearningJourney({ state, dueWordIds });
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
  const statusActionTo = authenticated || state.diagnostic.completed ? "/analytics" : "/assessment";
  const statusActionLabel = authenticated || state.diagnostic.completed
    ? "Mở phân tích đích đến"
    : "Khảo Nghiệm Căn Cơ";
  const signalStatus = hasMeasuredCoverage
    ? `${formatCoveragePercent(contentCoveragePercent)} tín hiệu đã xác lập`
    : authenticated
      ? "Đang hợp nhất chiến tích"
      : "Cần thêm bằng chứng học tập";
  const signalGuidance = hasMeasuredCoverage
    ? `Mở rộng tiếp trụ ${skillLabels[priorityEvidence.skill]}.`
    : authenticated
      ? "Chưa đủ dữ liệu đã xác minh để đề xuất một trụ yếu."
      : "Hoàn thành các nhiệm vụ khác nhau để hệ thống nhận diện vùng cần mở rộng.";
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
      className="dashboard-page dashboard-deck"
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
        aria-label="Cửa sổ 2 trên 5 · Trạng thái · Dữ liệu học hôm nay"
        hidden={activeTab !== "status"}
      >
        <DashboardWindowHeader
          code="02"
          eyebrow="TRẠNG THÁI HÔM NAY"
          title="Bản đồ nhịp học"
          purpose="Nhìn một lần để biết hôm nay nên giữ nhịp, ôn lại hay khảo nghiệm tiếp."
          icon={CircleGauge}
          meta={<span>{channelLabel}</span>}
        />

        <div className="dashboard-status-body dashboard-slide-body">
          <section className="status-focus-card dashboard-holo-card" data-glyph="势">
            <div className="status-focus-copy">
              <span className="dashboard-card-kicker"><Target size={15} /> THIÊN MỆNH ĐANG THEO ĐUỔI</span>
              <h3>{goal.label}</h3>
              <p>{goal.destination}</p>
              <div className="status-signal-note" data-state={hasMeasuredCoverage ? "measured" : "insufficient"}>
                <ShieldCheck size={17} />
                <span><strong>{signalStatus}</strong><small>{signalGuidance}</small></span>
              </div>
              <Link className="dashboard-window-cta" to={statusActionTo} viewTransition>
                {statusActionLabel} <ArrowRight size={17} />
              </Link>
            </div>
            <div
              className="dashboard-signal-orbit"
              data-state={hasMeasuredCoverage ? "measured" : "insufficient"}
              style={{ "--signal-progress": `${contentCoveragePercent * 3.6}deg` } as React.CSSProperties}
              aria-label={`Tín hiệu Thất Trụ: ${signalStatus}`}
            >
              <span aria-hidden="true">
                <strong>THẤT TRỤ</strong>
                <small><span>TÍN HIỆU</span><span>HỌC TẬP</span></small>
              </span>
              <em>{hasMeasuredCoverage ? formatCoveragePercent(contentCoveragePercent) : "ĐANG DÒ"}</em>
            </div>
          </section>

          <section className="dashboard-metric-grid" aria-label="Các chỉ số học hôm nay">
            <article className="dashboard-metric-card is-jade">
              <span className="metric-icon jade"><Zap size={18} /></span>
              {interactionXp.dailyXp === null ? (
                <div><small>NĂNG LƯỢNG ĐÃ GHI NHẬN</small><strong>{interactionXp.pending ? "—" : interactionXp.totalXp} XP</strong><p>{interactionXp.pending ? "Đang hợp nhất tiến độ tài khoản" : `${interactionXp.totalXp} EXP từ các ải đã vượt`}</p></div>
              ) : (
                <div><small>NĂNG LƯỢNG HÔM NAY</small><strong>{interactionXp.dailyXp} / {dailyTarget} XP</strong><p>{dailyProgress}% mục tiêu ngày</p></div>
              )}
              {interactionXp.dailyXp !== null && <span className="dashboard-metric-progress" aria-hidden="true"><i style={{ width: `${dailyProgress}%` }} /></span>}
            </article>
            <article className="dashboard-metric-card is-gold">
              <span className="metric-icon gold"><Flame size={18} /></span>
              <div><small>CHUỖI ĐỒNG BỘ</small><strong>{state.streak} ngày</strong><p>{state.streak ? "Nhịp học đang ổn định" : "Hoàn thành một nhiệm vụ để khởi động"}</p></div>
            </article>
            <article className="dashboard-metric-card is-cyan">
              <span className="metric-icon cyan"><BrainCircuit size={18} /></span>
              <div>
                <small>KÝ ỨC ĐẾN HẠN</small>
                <strong>{authenticated ? "—" : dueWordIds.length} mục</strong>
                {authenticated
                  ? <p>Chưa có lượt ôn đến hạn</p>
                  : dueWordIds.length > 0
                    ? <Link to="/review" viewTransition>Vào Ký Ức Trận <ChevronRight size={13} /></Link>
                    : <p>Chưa có lượt ôn đến hạn</p>}
              </div>
            </article>
            <article className="dashboard-metric-card is-vermilion">
              <span className="metric-icon vermilion"><Radar size={18} /></span>
              <div><small>TÍN HIỆU THẤT TRỤ</small><strong>{hasMeasuredCoverage ? "Đã xác lập" : authenticated ? "Đang hợp nhất" : "Đang dò xét"}</strong><p>Chỉ tính bằng chứng học đủ điều kiện</p></div>
            </article>
          </section>
        </div>
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
                          <small>{journeyDestinationLabels[step.kind]} · {step.status === "clear" ? "chưa có mục đến hạn" : `${step.minutes} phút`}</small>
                          <em>{step.reason}</em>
                        </span>
                        <span className="mission-journey-state">
                          {step.status === "clear" ? "ĐÃ RÕ" : "KẾ TIẾP"}
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
                <div><span>ƯU TIÊN 01</span><span>{primaryMission.code}</span><span>{primaryMission.kind.toUpperCase()}</span></div>
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
          eyebrow="THẤT TRỤ · TÍN HIỆU TỪ BẰNG CHỨNG HỌC"
          title="Bản đồ bảy vùng kỹ năng"
          purpose="Phân biệt vùng đã có tín hiệu, vùng còn thiếu mẫu và trụ chưa thể đo."
          icon={Radar}
          meta={<span>KHÔNG DÙNG XP ĐỂ SUY RA NĂNG LỰC</span>}
        />

        <div className="pillar-command-layout dashboard-slide-body">
          <section className="pillar-focus-card dashboard-holo-card" data-glyph="柱">
            <div
              className="pillar-signal-core"
              data-state={hasMeasuredCoverage ? "measured" : "insufficient"}
              style={{ "--signal-progress": `${contentCoveragePercent * 3.6}deg` } as React.CSSProperties}
              aria-label={signalStatus}
            >
              <span><strong>{hasMeasuredCoverage ? formatCoveragePercent(contentCoveragePercent) : "07"}</strong><small>{hasMeasuredCoverage ? "TÍN HIỆU CĂN CƠ" : "TRỤ ĐANG DÒ XÉT"}</small></span>
            </div>
            <div className="pillar-focus-copy">
              <span className="dashboard-card-kicker"><ShieldCheck size={15} /> CÁCH ĐỌC BẢN ĐỒ</span>
              <h3>{hasMeasuredCoverage ? `Mở rộng ${skillLabels[priorityEvidence.skill]}` : "Chưa đủ tín hiệu để kết luận"}</h3>
              <p>{signalGuidance}</p>
              <Link className="dashboard-window-cta" to="/analytics" viewTransition>
                Mở phân tích Thất Trụ <ArrowRight size={17} />
              </Link>
            </div>
          </section>

          <div className="skill-bars">
            {skillEvidence.map(({ skill, coverage, practiceAvailable, supported, state }) => {
              const Icon = skillIcons[skill] ?? Target;
              const visibleSignalState = practiceAvailable && !supported
                ? "insufficient"
                : state;
              const hasUnmeasuredSpeechPractice = skill === "speaking"
                && localSpeechPracticeCount > 0
                && visibleSignalState !== "measured";
              const valueText = hasUnmeasuredSpeechPractice
                ? `${localSpeechPracticeCount} lượt luyện đã ghi nhận; chưa có phép đo phát âm`
                : visibleSignalState === "unavailable"
                ? "Trụ chưa khai mở"
                : visibleSignalState === "insufficient"
                  ? authenticated
                    ? "Đang hợp nhất chiến tích"
                    : "Căn cơ đang được dò xét"
                  : formatCoveragePercent(coverage);
              const visibleState = hasUnmeasuredSpeechPractice
                ? `${localSpeechPracticeCount} lượt luyện đã ghi nhận`
                : visibleSignalState === "unavailable"
                ? "Chưa khai mở"
                : visibleSignalState === "insufficient"
                  ? authenticated ? "Đang hợp nhất" : "Chưa đủ tín hiệu"
                  : `${formatCoveragePercent(coverage)} tín hiệu`;
              return (
                <div
                  className="pillar-signal-row"
                  data-skill={skill}
                  key={skill}
                >
                  <span className="pillar-signal-label"><Icon size={15} /><span><strong>{skillLabels[skill]}</strong><small>{visibleState}</small></span></span>
                  <div
                    className="pillar-meter"
                    data-state={visibleSignalState}
                    role="progressbar"
                    aria-label={skillLabels[skill]}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={visibleSignalState === "measured" ? coverage ?? undefined : undefined}
                    aria-valuetext={valueText}
                  >
                    <i style={{ width: `${visibleSignalState === "measured" ? coverage ?? 0 : 0}%` }} />
                  </div>
                </div>
              );
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
                <p>{signalGuidance}</p>
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
                        ? "Đang hợp nhất chiến tích"
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
          title="Biết mình đang ở đâu"
          purpose="Chặng đang mở, bài kế tiếp và toàn bộ đường đi được gom vào một quyết định rõ ràng."
          icon={Orbit}
          meta={<span>{pathView.completedCount} / {pathView.totalCount} BÀI VƯỢT NGƯỠNG</span>}
        />

        <div className="path-command-layout dashboard-slide-body">
          <article className="path-next-card dashboard-holo-card" data-glyph="路">
            <div className="path-progress-core" style={{ "--path-progress": `${courseProgress * 3.6}deg` } as React.CSSProperties}>
              <span><strong>{courseProgress}%</strong><small>TIẾN ĐỘ THIÊN LỘ</small></span>
            </div>
            <div className="path-next-copy">
              <span className="dashboard-card-kicker"><BookOpenText size={15} /> {nextPathLesson ? "BƯỚC KẾ TIẾP ĐÃ MỞ" : "TINH ĐỒ HÀNH TRÌNH"}</span>
              <h3>{nextPathLesson?.title ?? "Mở toàn bộ Thiên Lộ"}</h3>
              <p>{nextPathLesson?.objective ?? "Xem lại các cảnh giới đã vượt qua và chọn thử luyện phù hợp tiếp theo."}</p>
              {nextPathLesson ? (
                <ul>
                  <li><Clock3 size={14} /> {nextPathLesson.minutes} phút</li>
                  <li><Zap size={14} /> +{nextPathLesson.xp} XP tương tác</li>
                  <li><span lang="zh-Hans">{nextPathLesson.chineseTitle}</span></li>
                </ul>
              ) : null}
              <div className="path-actions">
                <Link className="dashboard-window-cta" to={nextPathLesson ? `/lesson/${nextPathLesson.id}` : "/path"} viewTransition>
                  {nextPathLesson ? "Tiếp tục Thử Luyện" : "Mở Thiên Lộ"} <ArrowRight size={17} />
                </Link>
                {nextPathLesson ? <Link className="dashboard-secondary-link" to="/path" viewTransition>Xem toàn bộ lộ trình <ChevronRight size={15} /></Link> : null}
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
