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
import { Link } from "react-router-dom";
import { COURSE_UNITS, LESSONS } from "../data/curriculum";
import {
  buildDailyMissions,
  getGoalReadiness,
  getRank,
  GOAL_CONFIG,
  isLessonUnlocked,
  type DailyMission,
} from "../lib/adaptive";
import { useLearning } from "../store/LearningStore";
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
  const { state, dueWordIds, level } = useLearning();
  const completedCount = Object.values(state.completedLessons).filter((item) => item.bestScore >= 70).length;
  const courseProgress = Math.round((completedCount / LESSONS.length) * 100);
  const readiness = getGoalReadiness(state);
  const dailyTarget = state.profile.dailyMinutes * 6;
  const dailyProgress = Math.min(100, Math.round((state.dailyXp / dailyTarget) * 100));
  const goal = GOAL_CONFIG[state.profile.goal];
  const rank = getRank(state.xp);
  const missions = buildDailyMissions(state, dueWordIds.length);
  const primaryMission = missions[0];
  const primaryLesson = LESSONS.find((lesson) => lesson.id === primaryMission.id);
  const primarySigil = primaryMission.kind === "correction"
    ? "解"
    : primaryLesson?.chineseTitle.slice(0, 1) ?? "命";
  const lowestSkill = Object.entries(state.skillMastery)
    .sort((a, b) => a[1] - b[1])[0][0] as Skill;

  return (
    <div className="dashboard-page">
      <section className="awakening-hero">
        <div className="hero-scan" aria-hidden="true" />
        <div className="hero-coordinates" aria-hidden="true">
          <span>NODE 31.2304° N</span>
          <span>DESTINY SYNC {String(readiness).padStart(2, "0")}%</span>
        </div>
        <div className="hero-copy">
          <div className="system-kicker"><Orbit size={15} /> DAILY DIRECTIVE · ONLINE</div>
          <p className="hero-chinese">觉醒，从第一声开始</p>
          <h1>Đánh thức<br /><span>tiếng Trung</span> trong bạn.</h1>
          <p className="hero-lead">
            Hệ thống đã chọn hành động có tác động lớn nhất tới mục tiêu của bạn hôm nay.
          </p>
          <div className="hero-actions">
            <Link className="primary-button hero-primary" to={primaryMission.to}>
              <Sparkles size={18} /> Kích hoạt nhiệm vụ
              <ArrowRight size={18} />
            </Link>
            <Link className="ghost-button" to="/path">
              Xem Thiên Lộ <ChevronRight size={17} />
            </Link>
          </div>
        </div>
        <div className="hero-core-meter">
          <span className="core-orbit" aria-hidden="true" />
          <div><small>{rank.chinese}</small><strong>{String(level).padStart(2, "0")}</strong></div>
          <p>{rank.title} · {state.xp % 500} / 500 XP đến bậc tiếp theo</p>
        </div>
      </section>

      <section className="status-strip" aria-label="Chỉ số hôm nay">
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
          <span className="status-copy"><small>Ký ức đến hạn</small><strong>{dueWordIds.length} mục</strong></span>
          <Link className="status-detail" to="/review">Ôn ngay <ChevronRight size={14} /></Link>
        </div>
        <div className="status-cell">
          <span className="metric-icon vermilion"><CircleGauge size={18} /></span>
          <span className="status-copy"><small>Sẵn sàng mục tiêu</small><strong>{readiness}%</strong></span>
          <p className="status-detail">{completedCount}/{LESSONS.length} cảnh giới đã vượt</p>
        </div>
      </section>

      <section className="destiny-directive">
        <div className="destiny-copy">
          <span className="system-kicker"><Target size={15} /> DESTINATION LOCKED</span>
          <h2>{goal.label}</h2>
          <p>{goal.destination}</p>
        </div>
        <div className="destiny-readiness" style={{ "--readiness": `${readiness * 3.6}deg` } as React.CSSProperties}>
          <span><strong>{readiness}%</strong><small>READY</small></span>
        </div>
        <div className="destiny-actions">
          <span><ShieldCheck size={16} /> Hệ thống đang bù năng lực yếu nhất: <strong>{skillLabels[lowestSkill]}</strong></span>
          <Link to={state.diagnostic.completed ? "/analytics" : "/assessment"}>
            {state.diagnostic.completed ? "Xem phân tích đích đến" : "Khảo nghiệm căn cơ"} <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="mission-console">
          <header className="section-heading">
            <div>
              <span>MISSION QUEUE · ADAPTIVE</span>
              <h2>Nhiệm vụ ưu tiên</h2>
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
            <Link className="icon-command" to={primaryMission.to} aria-label={`Bắt đầu ${primaryMission.title}`}>
              <ArrowRight size={22} />
            </Link>
          </div>
          <div className="mission-queue">
            {missions.slice(1).map((mission, index) => {
              const Icon = missionIcon(mission);
              return (
                <Link to={mission.to} key={mission.id}>
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
            <div><span>CAPABILITY MATRIX</span><h2>Ma trận năng lực</h2></div>
            <Link to="/analytics">Phân tích <ChevronRight size={15} /></Link>
          </header>
          <div className="mastery-orbit">
            <div className="mastery-dial" style={{ "--progress": `${readiness * 3.6}deg` } as React.CSSProperties}>
              <span><strong>{readiness}%</strong><small>GOAL SYNC</small></span>
            </div>
            <p>Phiên kế tiếp ưu tiên <strong>{skillLabels[lowestSkill]}</strong> vì đây là năng lực đang giới hạn tốc độ tiến tới mục tiêu.</p>
          </div>
          <div className="skill-bars">
            {Object.entries(state.skillMastery).map(([key, value]) => {
              const Icon = skillIcons[key as Skill] ?? Target;
              return (
                <div key={key}>
                  <span><Icon size={15} /> {skillLabels[key as Skill]}</span>
                  <div><i style={{ width: `${value}%` }} /></div>
                  <strong>{value}%</strong>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="realm-progress">
        <header className="section-heading">
          <div><span>REALM PROGRESSION</span><h2>Lộ trình tổng thể</h2></div>
          <strong>{courseProgress}% làm chủ</strong>
        </header>
        <div className="realm-line" style={{ "--course-progress": `${courseProgress}%` } as React.CSSProperties}>
          {COURSE_UNITS.map((unit, index) => {
            const unitCompleted = unit.lessons.every((item) => state.completedLessons[item.id]?.bestScore >= 70);
            const locked = unit.lessons.every((item) => !isLessonUnlocked(item, state));
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
