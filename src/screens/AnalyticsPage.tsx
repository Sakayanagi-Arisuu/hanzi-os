import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpenText,
  BrainCircuit,
  CheckCircle2,
  CircleGauge,
  Clock3,
  Crosshair,
  Flame,
  Headphones,
  Mic2,
  PenTool,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import { NormalizedLearningAuthorityGate } from "../components/NormalizedLearningAuthorityGate";
import { resolveLearningPathAuthority } from "../learning/learningAuthority";
import {
  deriveLocalLearnerActivityCoverage,
  deriveProjectedLearnerActivityCoverage,
  formatCoveragePercent,
  formatLearnerActivityCoverage,
} from "../learning/learningCoverage";
import { summarizeNormalizedObjectiveEvidence } from "../learning/normalizedEvidenceSummary";
import {
  GOAL_CONFIG,
  isMistakeFromActivePathContent,
} from "../lib/adaptive";
import { useLearning } from "../store/LearningStore";
import { useInteractionXp } from "../store/InteractionXpStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import type { Skill } from "../types";

const skillMeta: Record<Skill, { label: string; icon: typeof Mic2; color: string }> = {
  pronunciation: { label: "Âm / Pinyin", icon: Mic2, color: "jade" },
  listening: { label: "Hội thoại nghe", icon: Headphones, color: "cyan" },
  speaking: { label: "Nhiệm vụ nói", icon: Activity, color: "gold" },
  reading: { label: "Hội thoại đọc", icon: BookOpenText, color: "magenta" },
  writing: { label: "Hán tự", icon: PenTool, color: "vermilion" },
  vocabulary: { label: "Từ vựng", icon: BrainCircuit, color: "jade" },
  grammar: { label: "Ngữ pháp", icon: Crosshair, color: "gold" },
};

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function AnalyticsPage() {
  const { state, dueWordIds, level, sync } = useLearning();
  const interactionXp = useInteractionXp();
  const normalized = useNormalizedLearningProjection();
  const authenticated = sync.session?.authenticated === true;
  const displayedLevel = interactionXp.authoritative
    ? Math.floor(interactionXp.totalXp / 500) + 1
    : level;
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
  const {
    completedCount,
    totalCount,
    progress: completionRate,
  } = authority.view;
  const week = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - offset));
    const key = dateKey(date);
    const events = state.activityLog.filter((event) => dateKey(new Date(event.occurredAt)) === key);
    const xp = events.reduce((total, event) => total + event.xp, 0);
    return {
      key,
      label: date.toLocaleDateString("vi-VN", { weekday: "short" }).replace("Th ", "T"),
      xp,
      count: events.length,
    };
  });
  const chartMax = Math.max(40, ...week.map((day) => day.xp));
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
  const skillEvidence = (Object.keys(skillMeta) as Skill[]).map((skill) => {
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
  const contentPortfolioDepth = hasMeasuredCoverage
    ? Math.round(
      (measuredSkillEvidence.reduce(
        (total, item) => total + (item.coverage ?? 0),
        0,
      ) / measuredSkillEvidence.length) * 10,
    ) / 10
    : 0;
  const weakest = [...supportedSkillEvidence]
    .sort((a, b) =>
      (a.coverage ?? 0) - (b.coverage ?? 0) || a.count - b.count
    )
    .slice(0, 3);
  const goal = GOAL_CONFIG[
    normalized.projection?.enrollment?.goal ?? state.profile.goal
  ];
  const unresolved = state.mistakes.filter((mistake) =>
    !mistake.resolved
    && isMistakeFromActivePathContent(
      mistake,
      state.profile.startingLevel,
    )
  ).length;

  return (
    <div className="content-page analytics-page">
      <header className="page-hero analytics-hero">
        <div>
          <span className="system-kicker"><BarChart3 size={15} /> THẤT TRỤ · DÒ XÉT CĂN CƠ</span>
          <h1>Thất Trụ Học Tập</h1>
          <p>Theo dõi căn cơ từng trụ cho Thiên Mệnh “{goal.label}”. Mở “Chi tiết” khi hành giả muốn xem trạng thái từng trụ.</p>
        </div>
        <div className="analytics-rank">
          <span>RANK</span><strong>{String(displayedLevel).padStart(2, "0")}</strong><small>{interactionXp.pending ? "Đang hợp nhất EXP" : `${interactionXp.totalXp} XP tương tác${authenticated ? " đã xác nhận" : " cục bộ"}`}</small>
        </div>
      </header>

      <section className="analytics-metrics">
        <div><span className="metric-icon jade"><CircleGauge size={19} /></span><small>Tín hiệu Thất Trụ</small><strong>{hasMeasuredCoverage ? "Căn cơ đã kết tinh" : authenticated ? "Đang hợp nhất" : "Đang dò xét"}</strong><p><TrendingUp size={14} /> Xem bản đồ căn cơ bên dưới</p></div>
        <div><span className="metric-icon gold"><Flame size={19} /></span><small>Chuỗi hiện tại</small><strong>{state.streak} ngày</strong><p><Clock3 size={14} /> mục tiêu {state.profile.dailyMinutes} phút/ngày</p></div>
          <div><span className="metric-icon cyan"><BrainCircuit size={19} /></span><small>Lượt truy hồi</small><strong>{authenticated ? "—" : state.reviewCount}</strong><p><Zap size={14} /> {authenticated ? "Chưa có lượt ôn đến hạn" : `${dueWordIds.length} thẻ đến hạn`}</p></div>
        <div><span className="metric-icon vermilion"><CheckCircle2 size={19} /></span><small>{authenticated ? "Lỗi practice cục bộ" : "Nghịch cảnh mở"}</small><strong>{unresolved}</strong><p><Target size={14} /> Thiên Lộ {completionRate}% · {completedCount}/{totalCount}</p></div>
      </section>

      <div className="analytics-grid">
        <section className="activity-chart-panel">
          <header className="section-heading">
            <div><span>NHỊP HỆ THỐNG · 7 NGÀY</span><h2>Hoạt động 7 ngày</h2></div>
            <span className="live-indicator"><i /> LIVE PROFILE</span>
          </header>
          <div className="activity-chart">
            <div className="chart-y-axis"><span>{chartMax}</span><span>{Math.round(chartMax / 2)}</span><span>0 XP</span></div>
            <div className="chart-bars">
              {week.map((day) => (
                <div key={day.key}>
                  <span className="bar-value">{day.xp || "·"}</span>
                  <i style={{ height: `${Math.max(4, (day.xp / chartMax) * 100)}%` }}><b /></i>
                  <small>{day.label}</small>
                </div>
              ))}
            </div>
          </div>
          <footer><Activity size={15} /> Biểu đồ tổng hợp bài học, truy hồi FSRS, chữa lỗi và khảo nghiệm đã lưu trên thiết bị này.</footer>
        </section>

        <section className="mastery-map-panel">
          <header className="section-heading">
            <div><span>THẤT TRỤ · HỆ THỐNG DÒ XÉT</span><h2>Bản Đồ Căn Cơ</h2></div>
            <CircleGauge size={21} />
          </header>
          <div className="mastery-map">
            <div className="mastery-skill-list">
              {skillEvidence.map(({ skill, coverage, practiceAvailable, supported, state }) => {
                const meta = skillMeta[skill];
                const Icon = meta.icon;
                const visibleSignalState = practiceAvailable && !supported
                  ? "insufficient"
                  : state;
                const valueText = visibleSignalState === "unavailable"
                  ? "Trụ chưa khai mở"
                  : visibleSignalState === "insufficient"
                    ? authenticated
                      ? "Đang hợp nhất chiến tích"
                      : "Căn cơ đang được dò xét"
                    : formatCoveragePercent(coverage);
                return (
                  <div
                    className={meta.color}
                    data-skill={skill}
                    key={skill}
                  >
                    <span><Icon size={15} /> {meta.label}</span>
                    <div
                      className="pillar-meter"
                      data-state={visibleSignalState}
                      role="progressbar"
                      aria-label={meta.label}
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
          <details className="pillar-details">
            <summary>Chi tiết</summary>
            <div>
              {hasMeasuredCoverage
                ? (
                  <div className="mastery-orbit pillar-details-overview">
                    <div className="mastery-core" style={{ "--progress": `${contentPortfolioDepth * 3.6}deg` } as React.CSSProperties}>
                      <span><strong>{formatCoveragePercent(contentPortfolioDepth)}</strong><small>TÍN HIỆU CĂN CƠ</small></span>
                    </div>
                    <p>Vòng tổng hợp phản ánh tín hiệu trên những trụ đã đủ chiến tích khảo luyện.</p>
                  </div>
                )
                : (
                  <div className="pillar-details-overview is-insufficient">
                    <p>{authenticated
                      ? "Hệ thống đang hợp nhất chiến tích của hành giả trên tài khoản này."
                      : "Căn cơ đang được dò xét qua những nhiệm vụ khác nhau."}</p>
                  </div>
                )}
              <dl>
                {skillEvidence.map(({ skill, count, target, practiceAvailable, supported, state }) => {
                  const visibleSignalState = practiceAvailable && !supported
                    ? "insufficient"
                    : state;
                  return (
                    <div
                      data-skill={skill}
                      key={skill}
                    >
                      <dt>{skillMeta[skill].label}</dt>
                      <dd>{visibleSignalState === "unavailable"
                        ? "Trụ chưa khai mở"
                        : visibleSignalState === "insufficient"
                          ? authenticated
                            ? "Đang hợp nhất chiến tích"
                            : "Chưa ghi nhận chiến tích"
                          : formatLearnerActivityCoverage(count, target)}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </details>
        </section>
      </div>

      <section className="priority-protocol">
        <header className="section-heading">
          <div><span>CHỈ THỊ THÍCH ỨNG</span><h2>Ưu tiên phiên kế tiếp</h2></div>
          <Sparkles size={21} />
        </header>
        <div className="priority-list">
          {weakest.map(({ skill }, index) => {
            const meta = skillMeta[skill];
            const Icon = meta.icon;
            const links: Partial<Record<Skill, string>> = { pronunciation: "/pronunciation", listening: "/pronunciation", speaking: "/pronunciation", reading: "/reader", writing: "/characters", vocabulary: "/review", grammar: "/path" };
            return (
              <Link to={links[skill] ?? "/path"} key={skill}>
                <span className="priority-index">0{index + 1}</span>
                <span className={`priority-icon ${meta.color}`}><Icon size={20} /></span>
                <span><strong>{meta.label}</strong><small>Ưu tiên hoạt động chưa được xác nhận · mức {index === 0 ? "cao" : "bổ trợ"}</small></span>
                <ArrowUpRight size={19} />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
