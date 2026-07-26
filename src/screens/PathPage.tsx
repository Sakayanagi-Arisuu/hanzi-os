import {
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  LockKeyhole,
  Map,
  Orbit,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import { NormalizedLearningAuthorityGate } from "../components/NormalizedLearningAuthorityGate";
import { COURSE_UNITS } from "../data/curriculum";
import { resolveLearningPathAuthority } from "../learning/learningAuthority";
import {
  isLessonReleased,
} from "../lib/adaptive";
import { useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";

const releasedCourseUnits = COURSE_UNITS
  .map((unit) => ({
    ...unit,
    lessons: unit.lessons.filter(isLessonReleased),
  }))
  .filter((unit) => unit.lessons.length > 0);

export function PathPage() {
  const { state, sync } = useLearning();
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
    remainingCount,
    progress,
    lessons: lessonAuthority,
    mode,
  } = authority.view;

  return (
    <div className="content-page path-page">
      <header className="page-hero compact-hero">
        <div>
          <span className="system-kicker"><Map size={15} /> PERSONAL LEARNING GRAPH</span>
          <h1>Thiên Lộ</h1>
          <p>Mỗi nút chỉ khai mở khi kết quả truy hồi ở bài tiên quyết đạt ngưỡng 70%.</p>
          {mode === "anonymous" && !state.diagnostic.completed && <Link className="hero-inline-action" to="/assessment">Khảo nghiệm căn cơ <ChevronRight size={16} /></Link>}
        </div>
        <div className="path-overview">
          <span><strong>{completedCount}</strong><small>đã hoàn tất</small></span>
          <span><strong>{remainingCount}</strong><small>đang chờ</small></span>
          <span><strong>{progress}%</strong><small>{mode === "authoritative" ? "máy chủ" : "trên máy"}</small></span>
        </div>
      </header>

      <div className="path-progress"><i style={{ width: `${progress}%` }} /><span>{progress}%</span></div>

      <div className="course-realms">
        {releasedCourseUnits.map((unit, unitIndex) => {
          const completedInUnit = unit.lessons.filter((item) =>
            lessonAuthority.get(item.id)?.passed === true
          ).length;
          return (
            <section className={`course-realm realm-${unit.color}`} key={unit.id}>
              <header className="realm-header">
                <div className="realm-number"><span>{String(unitIndex + 1).padStart(2, "0")}</span></div>
                <div>
                  <span>{unit.code} · {unit.stage}</span>
                  <h2>{unit.title} <small>{unit.chineseTitle}</small></h2>
                  <p>{unit.description}</p>
                </div>
                <div className="realm-completion">
                  <strong>{completedInUnit}/{unit.lessons.length}</strong>
                  <span>nút hoàn tất</span>
                </div>
              </header>

              <div className="lesson-track">
                {unit.lessons.map((lesson, lessonIndex) => {
                  const access = lessonAuthority.get(lesson.id);
                  const passed = access?.passed === true;
                  const locked = access?.unlocked !== true;
                  const content = (
                    <>
                      <span className="lesson-node-icon">
                        {passed ? <Check size={20} /> : locked ? <LockKeyhole size={18} /> : lessonIndex === 0 ? <Sparkles size={19} /> : <CircleDot size={18} />}
                      </span>
                      <span className="lesson-node-copy">
                        <small>NODE {unitIndex + 1}.{lessonIndex + 1} · {lesson.chineseTitle}</small>
                        <strong>{lesson.title}</strong>
                        <span>{lesson.objective}</span>
                      </span>
                      <span className="lesson-node-meta">
                        <span><Clock3 size={14} /> {lesson.minutes} phút</span>
                        <span><Zap size={14} /> {lesson.xp} XP</span>
                        {access?.bestScore !== null && access?.bestScore !== undefined && <b>BEST {access.bestScore}%</b>}
                      </span>
                      {!locked && <ChevronRight size={20} />}
                    </>
                  );

                  return locked ? (
                    <div className="lesson-node locked" key={lesson.id} aria-disabled="true">{content}</div>
                  ) : (
                    <Link className={`lesson-node ${passed ? "completed" : access?.bestScore != null ? "attempted" : ""}`} to={`/lesson/${lesson.id}`} key={lesson.id}>{content}</Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="path-footer-note">
        <Orbit size={18} />
        <p><strong>Các cảnh giới khóa mở theo kết quả bài tiên quyết.</strong> Hãy củng cố phần còn sai trước khi tiến sang vùng tiếp theo.</p>
      </footer>
    </div>
  );
}
