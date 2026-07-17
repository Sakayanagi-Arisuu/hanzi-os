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
import { Link } from "react-router-dom";
import { COURSE_UNITS, LESSONS } from "../data/curriculum";
import { isLessonUnlocked } from "../lib/adaptive";
import { useLearning } from "../store/LearningStore";

export function PathPage() {
  const { state } = useLearning();
  const completedCount = Object.values(state.completedLessons).filter((item) => item.bestScore >= 70).length;
  const progress = Math.round((completedCount / LESSONS.length) * 100);

  return (
    <div className="content-page path-page">
      <header className="page-hero compact-hero">
        <div>
          <span className="system-kicker"><Map size={15} /> PERSONAL LEARNING GRAPH</span>
          <h1>Thiên Lộ</h1>
          <p>Mỗi nút chỉ khai mở khi bằng chứng truy hồi cho thấy bạn đã nắm vững năng lực nền.</p>
          {!state.diagnostic.completed && <Link className="hero-inline-action" to="/assessment">Khảo nghiệm căn cơ <ChevronRight size={16} /></Link>}
        </div>
        <div className="path-overview">
          <span><strong>{completedCount}</strong><small>đã hoàn tất</small></span>
          <span><strong>{LESSONS.length - completedCount}</strong><small>đang chờ</small></span>
          <span><strong>{progress}%</strong><small>đồng bộ</small></span>
        </div>
      </header>

      <div className="path-progress"><i style={{ width: `${progress}%` }} /><span>{progress}%</span></div>

      <div className="course-realms">
        {COURSE_UNITS.map((unit, unitIndex) => {
          const completedInUnit = unit.lessons.filter((item) => state.completedLessons[item.id]?.bestScore >= 70).length;
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
                  const completion = state.completedLessons[lesson.id];
                  const passed = Boolean(completion && completion.bestScore >= 70);
                  const locked = !isLessonUnlocked(lesson, state);
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
                        {completion && <b title={`Lần gần nhất: ${completion.score}%`}>BEST {completion.bestScore}%</b>}
                      </span>
                      {!locked && <ChevronRight size={20} />}
                    </>
                  );

                  return locked ? (
                    <div className="lesson-node locked" key={lesson.id} aria-disabled="true">{content}</div>
                  ) : (
                    <Link className={`lesson-node ${passed ? "completed" : completion ? "attempted" : ""}`} to={`/lesson/${lesson.id}`} key={lesson.id}>{content}</Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="path-footer-note">
        <Orbit size={18} />
        <p><strong>Các cảnh giới khóa sẽ mở theo dữ liệu thành thạo.</strong> Hãy củng cố các năng lực nền trước khi tiến sang vùng tiếp theo.</p>
      </footer>
    </div>
  );
}
