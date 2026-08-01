import {
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Crosshair,
  LockKeyhole,
  Map,
  Orbit,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import { NormalizedLearningAuthorityGate } from "../components/NormalizedLearningAuthorityGate";
import { COURSE_UNITS } from "../data/curriculum";
import {
  getHskCurriculumView,
  resolveHskPlacement,
} from "../data/hskCurriculumGraph";
import { getHskLearningPath } from "../data/hskLearningPaths";
import { resolveLearningPathAuthority } from "../learning/learningAuthority";
import {
  isLessonReleased,
} from "../lib/adaptive";
import { useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";

export function PathPage() {
  const { state, sync } = useLearning();
  const selectedPath = getHskLearningPath(state.profile.startingLevel);
  const curriculumView = getHskCurriculumView(state.profile.startingLevel);
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
  const visibleLessonIds = new Set(curriculumView.visibleLessonIds);
  const releasedCourseUnits = COURSE_UNITS
    .map((unit) => ({
      ...unit,
      lessons: unit.lessons.filter((lesson) =>
        isLessonReleased(lesson) && visibleLessonIds.has(lesson.id)
      ),
    }))
    .filter((unit) => unit.lessons.length > 0);
  const placement = resolveHskPlacement({
    startingLevel: state.profile.startingLevel,
    diagnosticCompleted: state.diagnostic.completed,
    passedLessonIds: new Set(
      [...lessonAuthority.values()]
        .filter((lesson) => lesson.passed)
        .map((lesson) => lesson.lessonId),
    ),
  });

  return (
    <div className="content-page path-page">
      <header className="page-hero compact-hero">
        <div>
          <span className="system-kicker"><Map size={15} /> {selectedPath.label} · PERSONAL LEARNING GRAPH</span>
          <h1>Thiên Lộ</h1>
          <p><strong>{selectedPath.title}.</strong> {selectedPath.description} {selectedPath.availabilityNote}</p>
          {mode === "anonymous" && !state.diagnostic.completed && <Link className="hero-inline-action" to="/assessment">Khảo nghiệm căn cơ <ChevronRight size={16} /></Link>}
        </div>
        <div className="path-overview">
          <span><strong>{completedCount}</strong><small>đã hoàn tất</small></span>
          <span><strong>{remainingCount}</strong><small>đang chờ</small></span>
          <span><strong>{progress}%</strong><small>{mode === "authoritative" ? "máy chủ" : "trên máy"}</small></span>
        </div>
      </header>

      <div className="path-progress"><i style={{ width: `${progress}%` }} /><span>{progress}%</span></div>

      {placement.status === "prerequisite-evidence-required" && (
        <aside className="path-footer-note">
          <LockKeyhole size={18} />
          <p>
            <strong>Tự khai cấp độ không tự miễn prerequisite.</strong>{" "}
            Hãy hoàn thành bridge foundation; diagnostic hiện tại chỉ mô tả
            kết quả và chưa đủ chuẩn để cấp waiver hay mastery.
          </p>
        </aside>
      )}

      {placement.status === "target-content-unavailable" && (
        <aside className="path-footer-note">
          <Orbit size={18} />
          <p>
            <strong>{selectedPath.label} đã có graph riêng nhưng chưa có lesson được phát hành.</strong>{" "}
            Hệ thống không thay bằng lộ trình cấp thấp hơn và không tính
            inventory như nội dung đã học. {selectedPath.availabilityNote}
          </p>
        </aside>
      )}

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

      {selectedPath.id === "hsk1" && (
        <section className="hsk-level-check-card" data-testid="hsk1-level-check-card">
          <div className="hsk-level-check-icon"><Crosshair size={28} /></div>
          <div>
            <span className="system-kicker">LEVEL CHECK · LOCAL SELF-STUDY</span>
            <h2>Kiểm tra cuối chặng HSK1</h2>
            <p>
              50 câu phủ nghe, đọc, từ vựng và ngữ pháp. Kết quả chỉ gợi ý vùng
              ôn tập; không mở khóa bài, cấp mastery hay chứng nhận HSK.
            </p>
          </div>
          <Link className="primary-button" to="/assessment/hsk1">
            Mở level check <ChevronRight size={17} />
          </Link>
        </section>
      )}

      {selectedPath.id === "hsk2" && (
        <section className="hsk-level-check-card" data-testid="hsk2-level-check-card">
          <div className="hsk-level-check-icon"><Crosshair size={28} /></div>
          <div>
            <span className="system-kicker">LEVEL CHECK · LOCAL SELF-STUDY</span>
            <h2>Kiểm tra cuối chặng HSK2</h2>
            <p>
              60 câu form A phủ nghe, đọc, từ vựng và ngữ pháp. Kết quả chỉ
              gợi ý vùng ôn tập; không mở khóa bài, cấp mastery hay chứng nhận HSK.
            </p>
          </div>
          <Link className="primary-button" to="/assessment/hsk2">
            Mở level check <ChevronRight size={17} />
          </Link>
        </section>
      )}

      <footer className="path-footer-note">
        <Orbit size={18} />
        <p><strong>Các cảnh giới khóa mở theo kết quả bài tiên quyết.</strong> Hãy củng cố phần còn sai trước khi tiến sang vùng tiếp theo.</p>
      </footer>
    </div>
  );
}
