import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpenText,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Clock3,
  Crosshair,
  Flame,
  Headphones,
  Map,
  Mic2,
  PenTool,
  Search,
  Sparkles,
  Swords,
  Target,
  UserRound,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import { NormalizedLearningAuthorityGate } from "../components/NormalizedLearningAuthorityGate";
import {
  ANALYTICS_SKILL_DESTINATION,
  buildAnalyticsGateways,
  type AnalyticsGatewayId,
} from "../learning/analyticsJourney";
import { resolveLearningPathAuthority } from "../learning/learningAuthority";
import {
  deriveLocalLearnerActivityCoverage,
  deriveProjectedLearnerActivityCoverage,
  formatCoveragePercent,
  formatLearnerActivityCoverage,
  type LearnerActivityCoverageItem,
} from "../learning/learningCoverage";
import { summarizeNormalizedObjectiveEvidence } from "../learning/normalizedEvidenceSummary";
import {
  buildDailyMissions,
  GOAL_CONFIG,
  isMistakeFromActivePathContent,
  type DailyMission,
} from "../lib/adaptive";
import { useLearning } from "../store/LearningStore";
import { useInteractionXp } from "../store/InteractionXpStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import type { Skill } from "../types";
import "./AnalyticsPage.css";

const skillMeta: Record<Skill, {
  action: string;
  color: string;
  icon: typeof Mic2;
  label: string;
}> = {
  pronunciation: { action: "Luyện âm", label: "Âm / Pinyin", icon: Mic2, color: "jade" },
  listening: { action: "Luyện nghe", label: "Hội thoại nghe", icon: Headphones, color: "cyan" },
  speaking: { action: "Luyện nói", label: "Nhiệm vụ nói", icon: Activity, color: "gold" },
  reading: { action: "Luyện đọc", label: "Hội thoại đọc", icon: BookOpenText, color: "violet" },
  writing: { action: "Luyện chữ", label: "Hán tự", icon: PenTool, color: "vermilion" },
  vocabulary: { action: "Ôn từ", label: "Từ vựng", icon: BrainCircuit, color: "jade" },
  grammar: { action: "Học ngữ pháp", label: "Ngữ pháp", icon: Crosshair, color: "gold" },
};

const gatewayIcon: Record<AnalyticsGatewayId, typeof Map> = {
  path: Map,
  review: BrainCircuit,
  mistakes: Swords,
  pronunciation: Mic2,
  reader: BookOpenText,
  characters: PenTool,
  exams: Target,
  dictionary: Search,
};

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const visibleSignalState = (item: LearnerActivityCoverageItem) =>
  item.practiceAvailable && !item.supported ? "insufficient" : item.state;

const signalLabel = (
  item: LearnerActivityCoverageItem,
  authenticated: boolean,
) => {
  const state = visibleSignalState(item);
  if (state === "unavailable") return "Kênh luyện chưa có phép đo";
  if (state === "insufficient") {
    return authenticated
      ? "Đang hợp nhất bằng chứng"
      : item.practiceCount > 0
        ? `${item.practiceCount}/${item.target} hoạt động đã ghi nhận`
        : "Chưa đủ bằng chứng độc lập";
  }
  return `${formatCoveragePercent(item.percent)} tín hiệu`;
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
      count: events.length,
      dateLabel: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      key,
      label: date.toLocaleDateString("vi-VN", { weekday: "short" }).replace("Th ", "T"),
      xp,
    };
  });
  const chartMax = Math.max(40, ...week.map((day) => day.xp));
  const activeDays = week.filter((day) => day.count > 0).length;
  const weeklyXp = week.reduce((total, day) => total + day.xp, 0);
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
      ...breadth,
    };
  });
  const measuredSkillEvidence = skillEvidence.filter((item) =>
    item.supported && item.state === "measured");
  const hasMeasuredCoverage = measuredSkillEvidence.length > 0;
  const contentPortfolioDepth = hasMeasuredCoverage
    ? Math.round(
        (measuredSkillEvidence.reduce(
          (total, item) => total + (item.percent ?? 0),
          0,
        ) / measuredSkillEvidence.length) * 10,
      ) / 10
    : 0;
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
  const guestMission = buildDailyMissions(state, dueWordIds.length)[0]!;
  const primaryMission: DailyMission = authenticated
    ? {
        id: "account-path",
        code: "ASCEND-01",
        title: completionRate >= 100 ? "Ôn lại Thiên Lộ" : "Tiếp tục Thiên Lộ",
        description: `${completedCount}/${totalCount} bài đã hoàn tất trong lộ trình đang đồng bộ của tài khoản.`,
        to: "/path",
        minutes: state.profile.dailyMinutes,
        reward: "Mở đúng chặng hiện tại",
        kind: "lesson",
      }
    : guestMission;
  const gateways = buildAnalyticsGateways({
    authenticated,
    completedCount,
    completionRate,
    dueCount: dueWordIds.length,
    totalCount,
    unresolvedMistakes: unresolved,
  });

  return (
    <div className="content-page analytics-page oracle-page" data-testid="analytics-page">
      <header className="oracle-hero">
        <div className="oracle-hero-copy">
          <span className="oracle-kicker"><BarChart3 size={16} aria-hidden="true" /> MIRROR-10 · TRUNG TÂM ĐIỀU PHỐI</span>
          <h1>Thiên Cơ Kính</h1>
          <p>Quan sát tín hiệu học tập, hiểu việc cần làm tiếp theo và đi thẳng tới đúng điện luyện — không biến XP hay số lần làm bài thành Căn Cơ.</p>
          <div className="oracle-identity-line" aria-label={`Hành giả cấp ${displayedLevel}, Thiên Mệnh ${goal.label}`}>
            <span><UserRound size={16} aria-hidden="true" /> Cấp {String(displayedLevel).padStart(2, "0")}</span>
            <span>Thiên Mệnh · {goal.label}</span>
            <span>{interactionXp.pending ? "Đang hợp nhất XP" : `${interactionXp.totalXp.toLocaleString("vi-VN")} XP tương tác`}</span>
          </div>
        </div>

        <aside className="oracle-next-mission" aria-labelledby="oracle-next-title">
          <span><Sparkles size={16} aria-hidden="true" /> NÊN LÀM TIẾP</span>
          <h2 id="oracle-next-title">{primaryMission.title}</h2>
          <p>{primaryMission.description}</p>
          <div className="oracle-mission-meta">
            <span><Clock3 size={15} aria-hidden="true" /> khoảng {primaryMission.minutes} phút</span>
            <span><Zap size={15} aria-hidden="true" /> {primaryMission.reward}</span>
          </div>
          <Link className="oracle-primary-action" to={primaryMission.to} viewTransition>
            Bắt đầu ngay <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </aside>
      </header>

      <section className="oracle-metrics" aria-label="Tóm tắt tiến độ">
        <article>
          <span className="oracle-metric-icon jade"><Map size={19} aria-hidden="true" /></span>
          <div><small>THIÊN LỘ</small><strong>{completionRate}%</strong><p>{completedCount}/{totalCount} bài hoàn tất</p></div>
        </article>
        <article>
          <span className="oracle-metric-icon gold"><Flame size={19} aria-hidden="true" /></span>
          <div><small>NHỊP TU LUYỆN</small><strong>{state.streak} ngày</strong><p>Mục tiêu {state.profile.dailyMinutes} phút/ngày</p></div>
        </article>
        <article>
          <span className="oracle-metric-icon cyan"><BrainCircuit size={19} aria-hidden="true" /></span>
          <div><small>KÝ ỨC TRẬN</small><strong>{authenticated ? "Đồng bộ" : dueWordIds.length}</strong><p>{authenticated ? "Mở để xem lịch FSRS" : `${dueWordIds.length} thẻ đến hạn`}</p></div>
        </article>
        <article>
          <span className="oracle-metric-icon vermilion"><Swords size={19} aria-hidden="true" /></span>
          <div><small>NGHỊCH CẢNH</small><strong>{unresolved}</strong><p>Lỗi cục bộ đang chờ chữa</p></div>
        </article>
      </section>

      <section className="oracle-section oracle-gateway-section" aria-labelledby="oracle-gateway-title">
        <header className="oracle-section-heading">
          <div>
            <span>MẠCH TU LUYỆN LIÊN HOÀN</span>
            <h2 id="oracle-gateway-title">Từ tín hiệu đi thẳng tới hành động</h2>
            <p>Mỗi cửa giữ nguyên chức năng và dữ liệu riêng; Thiên Cơ Kính chỉ điều phối bạn tới đúng nơi.</p>
          </div>
          <CircleGauge size={24} aria-hidden="true" />
        </header>
        <div className="oracle-gateway-grid">
          {gateways.map((gateway) => {
            const Icon = gatewayIcon[gateway.id];
            return <Link
              className={`oracle-gateway-card is-${gateway.tone}`}
              key={gateway.id}
              to={gateway.to}
              viewTransition
              aria-label={`${gateway.plainLabel}: ${gateway.status}`}
            >
              <span className="oracle-gateway-icon"><Icon size={21} aria-hidden="true" /></span>
              <span className="oracle-gateway-copy">
                <small>{gateway.eyebrow}</small>
                <strong>{gateway.title}</strong>
                <span>{gateway.status}</span>
              </span>
              <ChevronRight size={19} aria-hidden="true" />
            </Link>;
          })}
        </div>
      </section>

      <div className="oracle-evidence-grid">
        <section className="oracle-section oracle-activity-panel" aria-labelledby="oracle-activity-title">
          <header className="oracle-section-heading">
            <div>
              <span>NHỊP HỆ THỐNG · 7 NGÀY</span>
              <h2 id="oracle-activity-title">Dấu chân hoạt động</h2>
              <p>{activeDays > 0
                ? `${activeDays}/7 ngày có hoạt động · ${weeklyXp.toLocaleString("vi-VN")} XP tương tác`
                : "Chưa có hoạt động trong bảy ngày gần nhất."}</p>
            </div>
            <Activity size={24} aria-hidden="true" />
          </header>
          <figure className="oracle-chart">
            <figcaption className="oracle-visually-hidden">Biểu đồ bảy ngày: {activeDays} ngày có hoạt động, tổng {weeklyXp} XP tương tác. Mỗi cột bên dưới ghi rõ ngày, XP và số hoạt động.</figcaption>
            <ol>
              {week.map((day) => <li
                key={day.key}
                aria-label={`${day.dateLabel}: ${day.xp} XP tương tác từ ${day.count} hoạt động`}
              >
                <span>{day.xp || "·"}</span>
                <i style={{ height: `${Math.max(4, (day.xp / chartMax) * 100)}%` }} aria-hidden="true" />
                <small>{day.label}</small>
              </li>)}
            </ol>
          </figure>
          <p className="oracle-disclosure"><CheckCircle2 size={15} aria-hidden="true" /> XP chỉ phản ánh nhịp tương tác; không được dùng làm mastery hay tín hiệu Căn Cơ.</p>
        </section>

        <section className="oracle-section oracle-pillar-panel" aria-labelledby="oracle-pillar-title">
          <header className="oracle-section-heading">
            <div>
              <span>THẤT TRỤ · BẰNG CHỨNG ĐỦ ĐIỀU KIỆN</span>
              <h2 id="oracle-pillar-title">Bản đồ Căn Cơ</h2>
              <p>Thanh chỉ kết tinh khi có đủ hoạt động khác nhau, đủ phiên và đủ thời gian.</p>
            </div>
            <CircleGauge size={24} aria-hidden="true" />
          </header>
          <div className="oracle-pillar-list">
            {skillEvidence.map((item) => {
              const meta = skillMeta[item.skill];
              const Icon = meta.icon;
              const visibleState = visibleSignalState(item);
              const valueText = signalLabel(item, authenticated);
              return <article className={`is-${meta.color}`} data-state={visibleState} key={item.skill}>
                <div className="oracle-pillar-copy">
                  <span><Icon size={17} aria-hidden="true" /><strong>{meta.label}</strong></span>
                  <small>{valueText}</small>
                </div>
                <div
                  className="oracle-pillar-meter"
                  role="progressbar"
                  aria-label={meta.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={visibleState === "measured" ? item.percent ?? undefined : undefined}
                  aria-valuetext={valueText}
                >
                  <i style={{ width: `${visibleState === "measured" ? item.percent ?? 0 : 0}%` }} />
                </div>
                <Link to={ANALYTICS_SKILL_DESTINATION[item.skill]} aria-label={`${meta.action}: ${meta.label}`} viewTransition>
                  {meta.action} <ChevronRight size={16} aria-hidden="true" />
                </Link>
              </article>;
            })}
          </div>
          <details className="oracle-pillar-details">
            <summary>Xem số liệu bằng chứng của từng trụ</summary>
            <div>
              <div className="oracle-signal-summary">
                <strong>{hasMeasuredCoverage ? formatCoveragePercent(contentPortfolioDepth) : "Chưa kết tinh"}</strong>
                <span>{hasMeasuredCoverage
                  ? "Tổng hợp riêng các trụ đã đủ điều kiện đo."
                  : authenticated
                    ? "Dữ liệu tài khoản đang chờ projection đủ điều kiện đo."
                    : "Cần tối thiểu sáu hoạt động khác nhau qua nhiều phiên và 24 giờ."}</span>
              </div>
              <dl>
                {skillEvidence.map((item) => <div key={item.skill}>
                  <dt>{skillMeta[item.skill].label}</dt>
                  <dd>{visibleSignalState(item) === "unavailable"
                    ? "Kênh luyện mở · chưa có phép đo"
                    : visibleSignalState(item) === "insufficient"
                      ? authenticated
                        ? "Đang hợp nhất bằng chứng"
                        : formatLearnerActivityCoverage(item.practiceCount, item.target)
                      : `${formatLearnerActivityCoverage(item.practiceCount, item.target)} · ${formatCoveragePercent(item.percent)}`}</dd>
                </div>)}
              </dl>
            </div>
          </details>
        </section>
      </div>

      <footer className="oracle-footer-note">
        <span><BarChart3 size={17} aria-hidden="true" /> Thiên Cơ Kính chỉ quan sát và điều phối.</span>
        <p>Học, Ôn, Nói, Đọc, Luyện chữ, Luyện đề và Tra cứu vẫn giữ nguyên dữ liệu, quy tắc hoàn thành và nguồn bằng chứng riêng.</p>
        <Link to="/profile" viewTransition>Điều chỉnh Thiên Mệnh <ArrowRight size={16} aria-hidden="true" /></Link>
      </footer>
    </div>
  );
}
