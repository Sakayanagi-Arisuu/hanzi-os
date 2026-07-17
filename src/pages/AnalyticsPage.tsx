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
import { Link } from "react-router-dom";
import { LESSONS } from "../data/curriculum";
import { getGoalReadiness, GOAL_CONFIG } from "../lib/adaptive";
import { useLearning } from "../store/LearningStore";
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
  const { state, dueWordIds, level } = useLearning();
  const completions = Object.entries(state.completedLessons);
  const passedCompletions = completions.filter(([, result]) => result.bestScore >= 70);
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
  const masteryEntries = Object.entries(state.skillMastery) as Array<[Skill, number]>;
  const averageMastery = Math.round(masteryEntries.reduce((sum, [, value]) => sum + value, 0) / masteryEntries.length);
  const weakest = [...masteryEntries].sort((a, b) => a[1] - b[1]).slice(0, 3);
  const strongest = [...masteryEntries].sort((a, b) => b[1] - a[1])[0];
  const completionRate = Math.round((passedCompletions.length / LESSONS.length) * 100);
  const readiness = getGoalReadiness(state);
  const goal = GOAL_CONFIG[state.profile.goal];
  const unresolved = state.mistakes.filter((mistake) => !mistake.resolved).length;

  return (
    <div className="content-page analytics-page">
      <header className="page-hero analytics-hero">
        <div>
          <span className="system-kicker"><BarChart3 size={15} /> COGNITIVE TELEMETRY</span>
          <h1>Thiên Cơ Kính</h1>
          <p>Dữ liệu truy hồi được chuyển thành bản đồ năng lực, điểm nghẽn và độ sẵn sàng cho “{goal.label}”.</p>
        </div>
        <div className="analytics-rank">
          <span>RANK</span><strong>{String(level).padStart(2, "0")}</strong><small>{state.xp} XP tích lũy</small>
        </div>
      </header>

      <section className="analytics-metrics">
        <div><span className="metric-icon jade"><CircleGauge size={19} /></span><small>Sẵn sàng mục tiêu</small><strong>{readiness}%</strong><p><TrendingUp size={14} /> {strongest ? skillMeta[strongest[0]].label : "Đang khởi tạo"} dẫn đầu</p></div>
        <div><span className="metric-icon gold"><Flame size={19} /></span><small>Chuỗi hiện tại</small><strong>{state.streak} ngày</strong><p><Clock3 size={14} /> mục tiêu {state.profile.dailyMinutes} phút/ngày</p></div>
        <div><span className="metric-icon cyan"><BrainCircuit size={19} /></span><small>Lượt truy hồi</small><strong>{state.reviewCount}</strong><p><Zap size={14} /> {dueWordIds.length} thẻ đến hạn</p></div>
        <div><span className="metric-icon vermilion"><CheckCircle2 size={19} /></span><small>Nghịch cảnh mở</small><strong>{unresolved}</strong><p><Target size={14} /> Thiên Lộ {completionRate}% · {passedCompletions.length}/{LESSONS.length}</p></div>
      </section>

      <div className="analytics-grid">
        <section className="activity-chart-panel">
          <header className="section-heading">
            <div><span>SEVEN DAY SIGNAL</span><h2>Hoạt động 7 ngày</h2></div>
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
            <div><span>SKILL MASTERY GRAPH</span><h2>Bản đồ năng lực</h2></div>
            <CircleGauge size={21} />
          </header>
          <div className="mastery-map">
            <div className="mastery-core" style={{ "--progress": `${averageMastery * 3.6}deg` } as React.CSSProperties}><span><strong>{averageMastery}%</strong><small>SYNC</small></span></div>
            <div className="mastery-skill-list">
              {masteryEntries.map(([skill, value]) => {
                const meta = skillMeta[skill];
                const Icon = meta.icon;
                return (
                  <div className={meta.color} key={skill}>
                    <span><Icon size={15} /> {meta.label}</span>
                    <div><i style={{ width: `${value}%` }} /></div>
                    <strong>{value}%</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <section className="priority-protocol">
        <header className="section-heading">
          <div><span>ADAPTIVE DIRECTIVE</span><h2>Ưu tiên phiên kế tiếp</h2></div>
          <Sparkles size={21} />
        </header>
        <div className="priority-list">
          {weakest.map(([skill, value], index) => {
            const meta = skillMeta[skill];
            const Icon = meta.icon;
            const links: Partial<Record<Skill, string>> = { pronunciation: "/pronunciation", listening: "/pronunciation", speaking: "/pronunciation", reading: "/reader", writing: "/characters", vocabulary: "/review", grammar: "/path" };
            return (
              <Link to={links[skill] ?? "/path"} key={skill}>
                <span className="priority-index">0{index + 1}</span>
                <span className={`priority-icon ${meta.color}`}><Icon size={20} /></span>
                <span><strong>{meta.label}</strong><small>Năng lực hiện tại {value}% · ưu tiên {index === 0 ? "cao" : "bổ trợ"}</small></span>
                <ArrowUpRight size={19} />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
