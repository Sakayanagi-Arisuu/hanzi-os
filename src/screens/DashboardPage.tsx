import {
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  Check,
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
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import { NormalizedLearningAuthorityGate } from "../components/NormalizedLearningAuthorityGate";
import { ResponsiveHeroBackdrop } from "../components/ResponsiveHeroBackdrop";
import { COURSE_UNITS, RELEASED_LESSONS } from "../data/curriculum";
import { getHskCurriculumView } from "../data/hskCurriculumGraph";
import { resolveLearningPathAuthority } from "../learning/learningAuthority";
import { summarizeNormalizedObjectiveEvidence } from "../learning/normalizedEvidenceSummary";
import {
  buildDailyMissions,
  GOAL_CONFIG,
  isLessonReleased,
  type DailyMission,
} from "../lib/adaptive";
import {
  formatObservedEstimate,
  formatObservedEstimateCompact,
  summarizeMasteryEligibleEvidence,
} from "../lib/assessment/skillEstimate";
import { useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import {
  deriveJourneyTitles,
  getInteractionRankProgress,
  getSystemClass,
} from "../system/systemProgression";
import type { Skill } from "../types";

const skillLabels: Record<Skill, string> = {
  pronunciation: "Phát âm",
  listening: "Nghe",
  speaking: "Nói",
  reading: "Đọc",
  writing: "Viết",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
};

const skillIcons: Partial<Record<Skill, typeof Mic2>> = {
  pronunciation: Mic2,
  listening: Headphones,
  reading: BookOpenText,
  writing: PenTool,
};

const missionIcon = (mission: DailyMission) => {
  if (mission.kind === "correction") return Swords;
  if (mission.kind === "review") return BrainCircuit;
  if (mission.kind === "goal") return Target;
  if (mission.kind === "diagnostic") return Radar;
  return Sparkles;
};

export function DashboardPage() {
  const { state, dueWordIds, level, sync } = useLearning();
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
  const {
    completedCount,
    totalCount,
    progress: courseProgress,
  } = pathView;
  const normalizedEvidence = authenticated
    ? summarizeNormalizedObjectiveEvidence(normalized.projection)
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
  const localEligibleEvidence = state.evidence.filter((item) => item.masteryEligible);
  const observedEvidence = authenticated
    ? normalizedEvidence!
    : summarizeMasteryEligibleEvidence(state.evidence);
  const eligibleEvidenceCount = normalizedEvidence?.masteryEligibleCount
    ?? localEligibleEvidence.length;
  const skillEvidence = (Object.keys(skillLabels) as Skill[]).map((skill) => {
    const estimate = observedEvidence.skills[skill];
    return {
      skill,
      count: estimate.n,
      accuracy: estimate.observedAccuracy,
      estimate,
    };
  });
  const skillsWithEvidence = skillEvidence.filter((item) => item.count > 0).length;
  const evidenceCoverage = Math.round((skillsWithEvidence / skillEvidence.length) * 100);
  const dailyTarget = state.profile.dailyMinutes * 6;
  const dailyProgress = Math.min(100, Math.round((state.dailyXp / dailyTarget) * 100));
  const authoritativeGoal = normalized.projection?.enrollment?.goal;
  const goal = GOAL_CONFIG[authoritativeGoal ?? state.profile.goal];
  const rank = getInteractionRankProgress(state.xp);
  const systemClass = getSystemClass(authoritativeGoal ?? state.profile.goal);
  const journeyTitle = deriveJourneyTitles(state.completedLessons)
    .filter((item) => item.completed)
    .at(-1)?.title ?? "Hành Giả Sơ Khởi";
  const channelLabel = authenticated
    ? sync.phase === "offline"
      ? "TÀI KHOẢN · NGOẠI TUYẾN"
      : "TÀI KHOẢN · ĐÃ XÁC NHẬN"
    : "TRÊN THIẾT BỊ · LOCAL-FIRST";
  const authoritativeNextLesson = RELEASED_LESSONS.find(
    (lesson) => lesson.id === pathView.nextLessonId,
  );
  const missions: DailyMission[] = authenticated
    ? [
        ...(authoritativeNextLesson ? [{
          id: authoritativeNextLesson.id,
          code: "ASCEND-01",
          title: authoritativeNextLesson.title,
          description: authoritativeNextLesson.objective,
          to: `/lesson/${authoritativeNextLesson.id}`,
          minutes: authoritativeNextLesson.minutes,
          reward: `+${authoritativeNextLesson.xp} XP tương tác`,
          kind: "lesson" as const,
        }] : []),
        {
          id: "goal-focus",
          code: "PRACTICE-02",
          title: goal.practiceLabel,
          description: `Luyện bổ trợ cho “${goal.label}”; chưa tự tạo mastery hoặc mở prerequisite.`,
          to: goal.practicePath,
          minutes: Math.max(4, state.profile.dailyMinutes),
          reward: "Practice-only",
          kind: "goal" as const,
        },
      ]
    : buildDailyMissions(state, dueWordIds.length);
  const primaryMission = missions[0];
  const primaryLesson = RELEASED_LESSONS.find((lesson) => lesson.id === primaryMission.id);
  const primarySigil = primaryMission.kind === "correction"
    ? "解"
    : primaryLesson?.chineseTitle.slice(0, 1) ?? "命";
  const coverageGap = skillEvidence.find((item) => item.count === 0);
  const lowestObserved = [...skillEvidence]
    .filter((item) => item.count > 0)
    .sort((a, b) =>
      (a.estimate.confidence95?.lower ?? -1) - (b.estimate.confidence95?.lower ?? -1)
      || a.count - b.count
    )[0];
  const priorityEvidence = coverageGap ?? lowestObserved ?? skillEvidence[0];

  return (
    <div className="dashboard-page">
      <section className="awakening-hero">
        <ResponsiveHeroBackdrop priority />
        <div className="hero-scan" aria-hidden="true" />
        <div className="hero-coordinates" aria-hidden="true">
          <span>NODE 31.2304° N</span>
          <span>EVIDENCE {eligibleEvidenceCount} · SKILLS {skillsWithEvidence}/7</span>
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
            <Link className="primary-button hero-primary" to={primaryMission.to} viewTransition>
              <Sparkles size={18} /> Kích hoạt nhiệm vụ
              <ArrowRight size={18} />
            </Link>
            <Link className="ghost-button" to="/path" viewTransition>
              Xem Thiên Lộ <ChevronRight size={17} />
            </Link>
          </div>
        </div>
        <div className="hero-core-meter">
          <span className="core-orbit" aria-hidden="true" />
          <div><small>{rank.chinese}</small><strong>{String(level).padStart(2, "0")}</strong></div>
          <p>{rank.title} · {rank.xpToNext === null ? "đã chạm ngưỡng cao nhất" : `còn ${rank.xpToNext.toLocaleString("vi-VN")} XP tương tác đến bậc tiếp theo`}</p>
          <span className="sys-core-progress" style={{ "--sys-core-progress": `${rank.progress * 3.6}deg` } as React.CSSProperties} aria-hidden="true" />
        </div>
      </section>

      <div className="sys-window-heading">
        <span>CỬA SỔ TRẠNG THÁI</span>
        <strong>Dữ liệu học thật trên thiết bị</strong>
      </div>
      <section className="status-strip sys-status-window" aria-label="Cửa Sổ Trạng Thái hôm nay">
        <div className="status-cell">
          <span className="metric-icon jade"><Zap size={18} /></span>
          <span className="status-copy"><small>Năng lượng hôm nay</small><strong>{state.dailyXp} / {dailyTarget} XP</strong></span>
          <div className="status-detail micro-progress"><i style={{ width: `${dailyProgress}%` }} /></div>
        </div>
        <div className="status-cell">
          <span className="metric-icon gold"><Flame size={18} /></span>
          <span className="status-copy"><small>Chuỗi đồng bộ</small><strong>{state.streak} ngày</strong></span>
          <p className="status-detail">{state.streak ? "Nhịp học đang ổn định" : "Hoàn thành một nhiệm vụ để khởi động"}</p>
        </div>
        <div className="status-cell">
          <span className="metric-icon cyan"><BrainCircuit size={18} /></span>
          <span className="status-copy"><small>Ký ức đến hạn</small><strong>{authenticated ? "—" : dueWordIds.length} mục</strong></span>
          {authenticated
            ? <p className="status-detail">Lịch server chưa được kích hoạt</p>
            : <Link className="status-detail" to="/review">Ôn ngay <ChevronRight size={14} /></Link>}
        </div>
        <div className="status-cell">
          <span className="metric-icon vermilion"><CircleGauge size={18} /></span>
          <span className="status-copy"><small>Kỹ năng có bằng chứng</small><strong>{skillsWithEvidence} / 7</strong></span>
          <p className="status-detail">{eligibleEvidenceCount} lượt đủ chuẩn · {completedCount}/{totalCount} nút đạt ngưỡng</p>
        </div>
      </section>

      <section className="destiny-directive">
        <div className="destiny-copy">
          <span className="system-kicker"><Target size={15} /> THIÊN MỆNH · CÓ THỂ ĐIỀU CHỈNH</span>
          <h2>{goal.label}</h2>
          <p>{goal.destination}</p>
        </div>
        <div className="destiny-readiness" style={{ "--readiness": `${evidenceCoverage * 3.6}deg` } as React.CSSProperties}>
          <span><strong>{skillsWithEvidence}/7</strong><small>EVIDENCE</small></span>
        </div>
        <div className="destiny-actions">
          <span><ShieldCheck size={16} /> Hệ thống đang thu thêm bằng chứng cho: <strong>{skillLabels[priorityEvidence.skill]}</strong></span>
          <Link to={authenticated || state.diagnostic.completed ? "/analytics" : "/assessment"} viewTransition>
            {authenticated || state.diagnostic.completed ? "Xem phân tích đích đến" : "Khảo nghiệm căn cơ"} <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="mission-console">
          <header className="section-heading">
            <div>
              <span>CHỈ THỊ NGÀY · ƯU TIÊN THEO TÍN HIỆU</span>
              <h2>Hàng Đợi Nhiệm Vụ</h2>
            </div>
            <Target size={22} />
          </header>
          <div className="mission-primary">
            <div className="mission-sigil"><span>{primarySigil}</span></div>
            <div className="mission-copy">
              <div><span>{primaryMission.code}</span><span>{primaryMission.kind.toUpperCase()}</span></div>
              <h3>{primaryMission.title}</h3>
              <p>{primaryMission.description}</p>
              <ul>
                <li><Clock3 size={14} /> {primaryMission.minutes} phút</li>
                <li><Zap size={14} /> {primaryMission.reward}</li>
                <li><BrainCircuit size={14} /> Ưu tiên theo bằng chứng</li>
              </ul>
            </div>
            <Link className="icon-command" to={primaryMission.to} viewTransition aria-label={`Bắt đầu ${primaryMission.title}`}>
              <ArrowRight size={22} />
            </Link>
          </div>
          <div className="mission-queue">
            {missions.slice(1).map((mission, index) => {
              const Icon = missionIcon(mission);
              return (
                <Link to={mission.to} key={mission.id} viewTransition>
                  <span className="queue-index">{String(index + 2).padStart(2, "0")}</span>
                  <Icon size={18} />
                  <span><strong>{mission.title}</strong><small>{mission.minutes} phút · {mission.reward}</small></span>
                  <ChevronRight size={17} />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="skill-matrix">
          <header className="section-heading">
            <div><span>TÍN HIỆU QUAN SÁT · 7 KỸ NĂNG</span><h2>Thất Trụ Học Tập</h2></div>
            <Link to="/analytics" viewTransition>Phân tích <ChevronRight size={15} /></Link>
          </header>
          <div className="mastery-orbit">
            <div className="mastery-dial" style={{ "--progress": `${evidenceCoverage * 3.6}deg` } as React.CSSProperties}>
              <span><strong>{eligibleEvidenceCount}</strong><small>VALID EVIDENCE</small></span>
            </div>
            <p>Phiên kế tiếp ưu tiên <strong>{skillLabels[priorityEvidence.skill]}</strong> vì {priorityEvidence.count === 0 ? "kỹ năng này chưa được đo" : `khoảng quan sát hiện tại là ${formatObservedEstimate(priorityEvidence.estimate)}`}.</p>
          </div>
          <div className="skill-bars">
            {skillEvidence.map(({ skill, accuracy, estimate }) => {
              const Icon = skillIcons[skill] ?? Target;
              return (
                <div key={skill}>
                  <span><Icon size={15} /> {skillLabels[skill]}</span>
                  <div><i style={{ width: `${accuracy ?? 0}%` }} /></div>
                  <strong>{formatObservedEstimateCompact(estimate)}</strong>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="realm-progress">
        <header className="section-heading">
          <div><span>CẢNH GIỚI HÀNH TRÌNH</span><h2>Tinh Đồ Thiên Lộ</h2></div>
          <strong>{courseProgress}% nút đạt ngưỡng</strong>
        </header>
        <div className="realm-line" style={{ "--course-progress": `${courseProgress}%` } as React.CSSProperties}>
          {releasedCourseUnits.map((unit, index) => {
            const unitCompleted = unit.lessons.every((item) =>
              pathView.lessons.get(item.id)?.passed === true
            );
            const locked = unit.lessons.every((item) =>
              pathView.lessons.get(item.id)?.unlocked !== true
            );
            return (
              <div className={`realm-node ${unit.color} ${unitCompleted ? "completed" : ""} ${locked ? "locked" : ""}`} key={unit.id}>
                <span className="realm-marker">
                  {unitCompleted ? <Check size={17} /> : locked ? <LockKeyhole size={15} /> : index + 1}
                </span>
                <small>{unit.code}</small>
                <strong>{unit.title}</strong>
                <span>{unit.chineseTitle}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
