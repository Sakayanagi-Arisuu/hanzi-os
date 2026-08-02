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
import { summarizeNormalizedObjectiveEvidence } from "../learning/normalizedEvidenceSummary";
import {
  GOAL_CONFIG,
  isMistakeFromActivePathContent,
} from "../lib/adaptive";
import {
  formatObservedEstimate,
  formatObservedEstimateCompact,
  summarizeMasteryEligibleEvidence,
} from "../lib/assessment/skillEstimate";
import { useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import type { Skill } from "../types";

const skillMeta: Record<Skill, { label: string; icon: typeof Mic2; color: string }> = {
  pronunciation: { label: "Phát âm", icon: Mic2, color: "jade" },
  listening: { label: "Nghe", icon: Headphones, color: "cyan" },
  speaking: { label: "Nói", icon: Activity, color: "gold" },
  reading: { label: "Đọc", icon: BookOpenText, color: "magenta" },
  writing: { label: "Viết", icon: PenTool, color: "vermilion" },
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
  const skillEvidence = (Object.keys(skillMeta) as Skill[]).map((skill) => {
    const estimate = observedEvidence.skills[skill];
    return {
      skill,
      count: estimate.n,
      accuracy: estimate.observedAccuracy,
      estimate,
    };
  });
  const evidenceAccuracy = observedEvidence.overall.observedAccuracy;
  const skillsWithEvidence = skillEvidence.filter((item) => item.count > 0).length;
  const weakest = [...skillEvidence]
    .filter((item) => item.count > 0)
    .sort((a, b) =>
      (a.estimate.confidence95?.lower ?? -1) - (b.estimate.confidence95?.lower ?? -1)
      || a.count - b.count
    )
    .slice(0, 3);
  const strongest = [...skillEvidence]
    .filter((item) => item.count > 0)
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0) || b.count - a.count)[0];
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
          <span className="system-kicker"><BarChart3 size={15} /> THẤT TRỤ · TÍN HIỆU QUAN SÁT</span>
          <h1>Thất Trụ Học Tập</h1>
          <p>Hiển thị số bằng chứng cùng khoảng Wilson 95% theo từng kỹ năng cho Thiên Mệnh “{goal.label}”. Đây là mô tả quan sát, chưa phải độ tinh thông đã hiệu chuẩn hay chứng nhận trình độ.</p>
        </div>
        <div className="analytics-rank">
          <span>RANK</span><strong>{String(level).padStart(2, "0")}</strong><small>{state.xp} XP tương tác cục bộ</small>
        </div>
      </header>

      <section className="analytics-metrics">
        <div><span className="metric-icon jade"><CircleGauge size={19} /></span><small>Bằng chứng đủ chuẩn</small><strong>{eligibleEvidenceCount}</strong><p><TrendingUp size={14} /> {strongest ? skillMeta[strongest.skill].label : "Đang khởi tạo"} · {skillsWithEvidence}/7 kỹ năng có dữ liệu</p></div>
        <div><span className="metric-icon gold"><Flame size={19} /></span><small>Chuỗi hiện tại</small><strong>{state.streak} ngày</strong><p><Clock3 size={14} /> mục tiêu {state.profile.dailyMinutes} phút/ngày</p></div>
        <div><span className="metric-icon cyan"><BrainCircuit size={19} /></span><small>Lượt truy hồi</small><strong>{authenticated ? "—" : state.reviewCount}</strong><p><Zap size={14} /> {authenticated ? "Lịch server chưa kích hoạt" : `${dueWordIds.length} thẻ đến hạn`}</p></div>
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
            <div><span>THẤT TRỤ · BẰNG CHỨNG</span><h2>Bản đồ bằng chứng</h2></div>
            <CircleGauge size={21} />
          </header>
          <div className="mastery-map">
            <div className="mastery-core" style={{ "--progress": `${(evidenceAccuracy ?? 0) * 3.6}deg` } as React.CSSProperties}><span><strong>{evidenceAccuracy === null ? "—" : `${evidenceAccuracy}%`}</strong><small>{formatObservedEstimate(observedEvidence.overall)}</small></span></div>
            <div className="mastery-skill-list">
              {skillEvidence.map(({ skill, accuracy, estimate }) => {
                const meta = skillMeta[skill];
                const Icon = meta.icon;
                return (
                  <div className={meta.color} key={skill}>
                    <span><Icon size={15} /> {meta.label}</span>
                    <div><i style={{ width: `${accuracy ?? 0}%` }} /></div>
                    <strong>{formatObservedEstimateCompact(estimate)}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <section className="priority-protocol">
        <header className="section-heading">
          <div><span>CHỈ THỊ THÍCH ỨNG</span><h2>Ưu tiên phiên kế tiếp</h2></div>
          <Sparkles size={21} />
        </header>
        <div className="priority-list">
          {weakest.length === 0 && (
            <p>Chưa có bằng chứng đủ chuẩn để gọi kỹ năng nào là yếu. Hệ thống chỉ có thể ưu tiên thu thêm dữ liệu.</p>
          )}
          {weakest.map(({ skill, estimate }, index) => {
            const meta = skillMeta[skill];
            const Icon = meta.icon;
            const links: Partial<Record<Skill, string>> = { pronunciation: "/pronunciation", listening: "/pronunciation", speaking: "/pronunciation", reading: "/reader", writing: "/characters", vocabulary: "/review", grammar: "/path" };
            return (
              <Link to={links[skill] ?? "/path"} key={skill}>
                <span className="priority-index">0{index + 1}</span>
                <span className={`priority-icon ${meta.color}`}><Icon size={20} /></span>
                <span><strong>{meta.label}</strong><small>{formatObservedEstimate(estimate)} · ưu tiên quan sát {index === 0 ? "cao" : "bổ trợ"}</small></span>
                <ArrowUpRight size={19} />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
