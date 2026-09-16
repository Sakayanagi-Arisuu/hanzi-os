import { PracticeMilestone } from "../components/PracticeMilestone";
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
import { RELEASED_LESSONS, RELEASED_VOCABULARY } from "../data/curriculum";
import { useRef } from "react";
import { accessDay } from "../learning/analyticsActivity";
import { useLearnerOverview } from "../learning/useLearnerOverview";
import { Link } from "react-router";
import { NormalizedLearningAuthorityGate } from "../components/NormalizedLearningAuthorityGate";
import {
  ANALYTICS_SKILL_DESTINATION,
  buildAnalyticsGateways,
  type AnalyticsGatewayId,
} from "../learning/analyticsJourney";
import {
  deriveLocalLearnerActivityCoverage,
  deriveProjectedLearnerActivityCoverage,
  formatCoveragePercent,
  type LearnerActivityCoverageItem,
} from "../learning/learningCoverage";
import { summarizeNormalizedObjectiveEvidence } from "../learning/normalizedEvidenceSummary";
import {
  buildDailyMissions,
  GOAL_CONFIG,
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

const visibleSignalState = (item: LearnerActivityCoverageItem) =>
  item.practiceAvailable && !item.supported ? "insufficient" : item.state;

const signalLabel = (
  item: LearnerActivityCoverageItem,
) => {
  const state = visibleSignalState(item);
  if (state === "unavailable") return "Kênh luyện chưa có phép đo";
  if (state === "insufficient") {
    return `${item.covered} câu độc lập · chưa đủ điều kiện đo`;
  }
  return `${formatCoveragePercent(item.percent)} tín hiệu`;
};

export function AnalyticsPage() {
  const detailRef = useRef<HTMLDetailsElement>(null);
  const { state, dueWordIds, level } = useLearning();
  const interactionXp = useInteractionXp();
  const normalized = useNormalizedLearningProjection();
  const { authenticated, account, activity, accessDays, authority, unresolved } = useLearnerOverview();
  const displayedLevel = interactionXp.authoritative
    ? Math.floor(interactionXp.totalXp / 500) + 1
    : level;
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
    const key = accessDay(Date.now() - (6 - offset) * 86_400_000);
    const date = new Date(`${key}T12:00:00+07:00`);
    const count = activity?.days.find(day => day.day === key)?.count ?? 0;
    return {
      count,
      dateLabel: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }),
      key,
      label: date.toLocaleDateString("vi-VN", { weekday: "short", timeZone: "Asia/Ho_Chi_Minh" }).replace("Th ", "T"),
    };
  });
  const chartMax = Math.max(10, ...week.map((day) => day.count));
  const activeDays = week.filter((day) => day.count > 0).length;
  const weeklyAttempts = week.reduce((total, day) => total + day.count, 0);
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
          <span className="oracle-mirror-inscription" aria-hidden="true">天机镜</span>
          <span className="oracle-kicker"><BarChart3 size={16} aria-hidden="true" /> MIRROR-10 · TRUNG TÂM ĐIỀU PHỐI</span>
          <h1>Thiên Cơ Kính</h1>
          <p>Nhìn rõ hành trình, hiểu việc cần làm tiếp theo. Mỗi dấu chân hôm nay mở một đường tiến mới.</p>
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
          <div><small>NHỊP TU LUYỆN</small><strong>{accessDays === null ? "—" : `${accessDays.length} ngày`}</strong><p>Tổng ngày truy cập · mỗi ngày tính một lần</p></div>
        </article>
        <article>
          <span className="oracle-metric-icon cyan"><BrainCircuit size={19} aria-hidden="true" /></span>
          <div><small>KÝ ỨC TRẬN</small><strong>{authenticated ? "Đồng bộ" : dueWordIds.length}</strong><p>{authenticated ? "Mở để xem lịch FSRS" : `${dueWordIds.length} thẻ đến hạn`}</p></div>
        </article>
        <article>
          <span className="oracle-metric-icon vermilion"><Swords size={19} aria-hidden="true" /></span>
          <div><small>NGHỊCH CẢNH</small><strong>{unresolved ?? "—"}</strong><p>{unresolved === null ? "Chưa tải được hàng lỗi" : authenticated ? `Câu cần luyện · ${account.occurrences} dấu vết sai` : "Lỗi đang chờ phá giải"}</p></div>
        </article>
      </section>

      {account.error && authenticated && <p className="oracle-data-error" role="status">Một phần dữ liệu chưa tải được. <button type="button" onClick={account.refresh}>Thử lại</button></p>}

      <div className="oracle-evidence-grid">
        <section className="oracle-section oracle-activity-panel" aria-labelledby="oracle-activity-title">
          <header className="oracle-section-heading">
            <div>
              <span>NHỊP HỆ THỐNG · 7 NGÀY</span>
              <h2 id="oracle-activity-title">Dấu chân hoạt động</h2>
              <p>{authenticated && !activity ? "Chưa tải được lịch sử luyện tập." : activeDays > 0
                ? `${activeDays}/7 ngày có hoạt động · ${weeklyAttempts.toLocaleString("vi-VN")} lượt luyện`
                : "Chưa có hoạt động trong bảy ngày gần nhất."}</p>
            </div>
            <Activity size={24} aria-hidden="true" />
          </header>
          <figure className="oracle-chart">
            <figcaption className="oracle-visually-hidden">{authenticated && !activity ? "Chưa tải được biểu đồ luyện tập." : `Biểu đồ bảy ngày: ${activeDays} ngày có hoạt động, tổng ${weeklyAttempts} lượt luyện. Múi giờ Việt Nam.`}</figcaption>
            <ol>
              {week.map((day) => <li
                key={day.key}
                aria-label={`${day.dateLabel}: ${authenticated && !activity ? "chưa có dữ liệu" : `${day.count} lượt luyện`}`}
              >
                <span>{authenticated && !activity ? "—" : day.count}</span>
                <i style={{ height: `${(day.count / chartMax) * 100}%`, minHeight: day.count > 0 ? 3 : 0 }} aria-hidden="true" />
                <small>{day.label}</small>
              </li>)}
            </ol>
          </figure>
          <div className="oracle-week-summary"><span><Zap size={18} aria-hidden="true" /><strong>{authenticated && !activity ? "—" : weeklyAttempts.toLocaleString("vi-VN")} lượt</strong><small>Luyện tập trong tuần</small></span><span><Activity size={18} aria-hidden="true" /><strong>{authenticated && !activity ? "—" : activeDays}/7 ngày</strong><small>Có luyện tập</small></span></div>
          <p className="oracle-disclosure"><CheckCircle2 size={15} aria-hidden="true" /> Lượt luyện gồm cả lần thử lại và dùng gợi ý; không phải mức thành thạo.</p>
          {activity?.pagePractice&&activity.pagePractice.attempts>0&&<p className="oracle-disclosure">Thiên Lộ đã lưu {activity.pagePractice.unique} hoạt động khác nhau: {activity.pagePractice.correct} lượt đúng, {activity.pagePractice.incorrect} lượt cần sửa, {activity.pagePractice.selfReview} lượt tự đối chiếu. {authenticated?'Lịch ghi theo ngày đồng bộ':'Lịch ghi theo thời gian lưu trên thiết bị'}; chưa dùng các lượt này để tăng chỉ số kỹ năng.</p>}
        </section>

        <section className="oracle-section oracle-pillar-panel" aria-labelledby="oracle-pillar-title">
          <header className="oracle-section-heading">
            <div>
              <span>THẤT TRỤ · DẤU CHÂN THEO KỸ NĂNG</span>
              <h2 id="oracle-pillar-title">Bản đồ Căn Cơ</h2>
              <p>Mốc luyện: 1.000 câu mỗi kỹ năng · không phải điểm thành thạo.</p>
            </div>
            <a className="oracle-detail-link" href="#oracle-detail" onClick={() => { if (detailRef.current) detailRef.current.open = true; }}>Xem chi tiết <ArrowRight size={14} aria-hidden="true" /></a>
          </header>
          <div className="oracle-pillar-list">
            {skillEvidence.map((item) => {
              const meta = skillMeta[item.skill];
              const Icon = meta.icon;
              const visibleState = visibleSignalState(item);
              const practice = activity?.skills[item.skill];
              const valueText = practice ? `${practice.unique} câu · ${practice.attempts} lượt luyện` : "Chưa tải được lượt luyện";
              return <article className={`is-${meta.color}`} data-state={visibleState} key={item.skill}>
                <div className="oracle-pillar-copy">
                  <span><Icon size={17} aria-hidden="true" /><strong>{meta.label}</strong></span>
                  <small>{valueText}</small>
                </div>
                <Link to={ANALYTICS_SKILL_DESTINATION[item.skill]} aria-label={`${meta.action}: ${meta.label}`} viewTransition>
                  <span>{meta.action}</span><ChevronRight size={16} aria-hidden="true" />
                </Link>
                <PracticeMilestone count={practice?.unique ?? null} label={meta.label} compact />
              </article>;
            })}
          </div>

          <p className="oracle-disclosure">Số câu khác nhau đã luyện; lượt luyện gồm cả thử lại.</p>

        </section>
      </div>

      <section className="oracle-section oracle-gateway-section" aria-labelledby="oracle-gateway-title">
        <header className="oracle-section-heading">
          <div>
            <span>MẠCH TU LUYỆN LIÊN HOÀN</span>
            <h2 id="oracle-gateway-title">Từ tín hiệu đi thẳng tới hành động</h2>
            <p>Chọn một điện luyện phù hợp và tiếp nối hành trình của bạn.</p>
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


          <details className="oracle-pillar-details" id="oracle-detail" ref={detailRef}>
            <summary>Bản đồ Căn Cơ · Chi tiết bằng chứng</summary>
            <div>
              <p className="oracle-disclosure">Kho Thiên Lộ hiện có {RELEASED_LESSONS.length} bài học và {RELEASED_VOCABULARY.length.toLocaleString("vi-VN")} mục từ. Thanh tiến tới mốc luyện 1.000 câu khác nhau mỗi kỹ năng, không phải tỷ lệ thành thạo hoặc toàn bộ kho câu. Bài học và đọc hiểu theo tài khoản; luyện nói, nét chữ trên thiết bị này.</p>
              <div className="oracle-signal-summary">
                <strong>{hasMeasuredCoverage ? formatCoveragePercent(contentPortfolioDepth) : "Chưa kết tinh"}</strong>
                <span>{hasMeasuredCoverage
                  ? "Tổng hợp riêng các trụ đã đủ điều kiện đo."
                  : authenticated
                    ? "Lượt luyện được đếm ngay. Điểm thành thạo cần bằng chứng độc lập, đủ mẫu và phân tán theo thời gian."
                    : "Cần tối thiểu sáu hoạt động khác nhau qua nhiều phiên và 24 giờ."}</span>
              </div>
              <dl>
                {skillEvidence.map((item) => {
                  const meta = skillMeta[item.skill];
                  const Icon = meta.icon;
                  return <div key={item.skill}>
                  <dt><Icon size={21} aria-hidden="true" />{meta.label}</dt>
                  <dd>{activity ? `${activity.skills[item.skill].unique} câu khác nhau · ${activity.skills[item.skill].attempts} lượt · ${activity.skills[item.skill].correct} lượt đúng (gồm cả gợi ý/thử lại)` : "Chưa tải được lượt luyện"}</dd>
                  <dd>{item.skill === "speaking" ? "Chưa có phép đo nói đủ điều kiện. Bản chép lời không phải điểm phát âm." : authenticated ? `${item.covered} câu trả lời đúng lần đầu. Chưa có điểm thành thạo qua nhiều phiên.` : signalLabel(item)}</dd>
                  <dd><Link to={ANALYTICS_SKILL_DESTINATION[item.skill]}>{meta.action}<ArrowRight size={14} aria-hidden="true" /></Link></dd>
                </div>;
                })}
              </dl>
            </div>
          </details>

      <footer className="oracle-footer-note">
        <span><BarChart3 size={17} aria-hidden="true" /> Thiên Cơ Kính chỉ quan sát và điều phối.</span>
        <p>Học, Ôn, Nói, Đọc, Luyện chữ, Luyện đề và Tra cứu vẫn giữ nguyên dữ liệu, quy tắc hoàn thành và nguồn bằng chứng riêng.</p>
        <Link to="/profile" viewTransition>Điều chỉnh Thiên Mệnh <ArrowRight size={16} aria-hidden="true" /></Link>
      </footer>
    </div>
  );
}
