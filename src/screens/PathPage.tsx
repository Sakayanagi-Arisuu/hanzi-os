import {
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Crosshair,
  FlagTriangleRight,
  LockKeyhole,
  LibraryBig,
  Map,
  Orbit,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { NormalizedLearningAuthorityGate } from "../components/NormalizedLearningAuthorityGate";
import {
  loadPathExpansionIndex,
  type PathExpansionIndex,
} from "../content/megaLexicon";
import { COURSE_UNITS } from "../data/curriculum";
import {
  getNextHskRealmPreview,
  getProgressingHskCurriculumView,
  resolveHskPlacement,
} from "../data/hskCurriculumGraph";
import { getHskLearningPath } from "../data/hskLearningPaths";
import { resolveLearningPathAuthority } from "../learning/learningAuthority";
import { GOAL_PATHWAYS } from "../learning/goalPathways";
import { buildDailyLearningJourney } from "../learning/learningJourney";
import {
  isLessonReleased,
} from "../lib/adaptive";
import { useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";

export function PathPage() {
  const [expansionIndex, setExpansionIndex] = useState<PathExpansionIndex | null>(null);
  const { state, sync } = useLearning();
  useEffect(() => {
    let active = true;
    loadPathExpansionIndex()
      .then((index) => { if (active) setExpansionIndex(index); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  const expandedWordCountByLesson = useMemo(
    () => new globalThis.Map(expansionIndex?.lessonPacks.map((pack) => [pack.lessonId, pack.wordCount]) ?? []),
    [expansionIndex],
  );
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
  const passedLessonIds = new Set(
    [...lessonAuthority.values()]
      .filter((lesson) => lesson.passed)
      .map((lesson) => lesson.lessonId),
  );
  const curriculumView = getProgressingHskCurriculumView(
    state.profile.startingLevel,
    passedLessonIds,
  );
  const activeStartingLevel = curriculumView.path.pathId === "hsk0"
    ? "zero"
    : curriculumView.path.pathId;
  const selectedPath = getHskLearningPath(activeStartingLevel);
  const nextRealm = getNextHskRealmPreview(curriculumView, passedLessonIds);
  const nextRealmPath = nextRealm
    ? getHskLearningPath(nextRealm.pathId === "hsk0" ? "zero" : nextRealm.pathId)
    : null;
  const goalPathway = GOAL_PATHWAYS[state.profile.goal];
  const goalJourney = buildDailyLearningJourney({ state, dueWordIds: [] });
  const transferStep = goalJourney.steps[2];
  const visibleLessonIds = new Set(curriculumView.visibleLessonIds);
  const releasedCourseUnits = COURSE_UNITS
    .map((unit) => ({
      ...unit,
      lessons: unit.lessons.filter((lesson) =>
        isLessonReleased(lesson) && visibleLessonIds.has(lesson.id)
      ),
    }))
    .filter((unit) => unit.lessons.length > 0);
  const currentLesson = releasedCourseUnits
    .flatMap((unit) => unit.lessons)
    .find((lesson) => {
      const access = lessonAuthority.get(lesson.id);
      return access?.unlocked === true && access.passed !== true;
    }) ?? null;
  const placement = resolveHskPlacement({
    startingLevel: activeStartingLevel,
    diagnosticCompleted: state.diagnostic.completed,
    passedLessonIds,
  });

  return (
    <div className="content-page path-page">
      <header className="page-hero compact-hero">
        <div>
          <span className="system-kicker"><Map size={15} /> {selectedPath.label} · TINH ĐỒ TIÊN QUYẾT</span>
          <h1>Thiên Lộ</h1>
          <p><strong>{selectedPath.title}.</strong> {selectedPath.description} Mỗi bài nối liền phần học với luyện âm, luyện chữ và tra cứu đúng nội dung vừa gặp. {selectedPath.availabilityNote}</p>
          {currentLesson && (
            <Link
              className="path-current-lesson"
              to={`/lesson/${currentLesson.id}`}
              viewTransition
              aria-label={`Mở bài hiện tại ${currentLesson.title}; phiên đang dở sẽ được tự động khôi phục`}
            >
              <Sparkles size={19} />
              <span>
                <small>BÀI HIỆN TẠI · TỰ ĐỘNG KHÔI PHỤC</small>
                <strong>{currentLesson.title}</strong>
              </span>
              <ChevronRight size={19} />
            </Link>
          )}
          {mode === "anonymous" && !state.diagnostic.completed && <Link className="hero-inline-action" to="/assessment" viewTransition>Khảo Nghiệm Căn Cơ <ChevronRight size={16} /></Link>}
        </div>
        <div className="path-overview">
          <span><strong>{completedCount}</strong><small>Thử Luyện đã thông qua</small></span>
          <span><strong>{remainingCount}</strong><small>đang chờ khai mở</small></span>
          <span><strong>{progress}%</strong><small>{mode === "authoritative" ? "máy chủ" : "trên máy"}</small></span>
        </div>
      </header>

      <div className="path-progress"><i style={{ width: `${progress}%` }} /><span>{progress}%</span></div>

      <section className={`path-destiny-lane is-${goalPathway.accent}`} aria-labelledby="path-destiny-title">
        <header>
          <span><FlagTriangleRight size={15} /> THIÊN MỆNH ĐANG DẪN ĐƯỜNG</span>
          <h2 id="path-destiny-title">{goalPathway.title}</h2>
          <p>{goalPathway.promise}</p>
        </header>
        <ol>
          {goalPathway.stages.map((stage, index) => (
            <li key={stage} className={index === 1 ? "is-transfer" : ""}>
              <small>CHẶNG {index + 1}</small><strong>{stage}</strong>
            </li>
          ))}
        </ol>
        <Link to={transferStep.to} viewTransition>
          Vào nhánh {goalPathway.label} <ChevronRight size={17} />
        </Link>
        <small className="path-destiny-note">Nền HSK được giữ chung; nhánh vận dụng này đổi theo mục tiêu trong Hồ sơ.</small>
      </section>

      {placement.status === "prerequisite-evidence-required" && (
        <aside className="path-footer-note">
          <LockKeyhole size={18} />
          <p>
            <strong>Hãy hoàn thành chặng nền trước.</strong>{" "}
            Cấp độ bạn tự chọn giúp cá nhân hóa lộ trình, nhưng không tự bỏ qua
            những bài nền cần thiết.
          </p>
        </aside>
      )}

      {placement.status === "target-content-unavailable" && (
        <aside className="path-footer-note">
          <Orbit size={18} />
          <p>
            <strong>Chặng {selectedPath.label} chưa thể bắt đầu lúc này.</strong>{" "}
            HANZI.OS sẽ không tự thay bằng bài của cấp độ khác. {selectedPath.availabilityNote}
          </p>
        </aside>
      )}

      <div className="course-realms">
        {releasedCourseUnits.map((unit, unitIndex) => {
          const completedInUnit = unit.lessons.filter((item) =>
            lessonAuthority.get(item.id)?.passed === true
          ).length;
          return (
            <section className={`course-realm realm-${unit.color}`} key={unit.id} data-realm-status={completedInUnit === unit.lessons.length ? "cleared" : "active"}>
              <div className="realm-number"><span>{String(unitIndex + 1).padStart(2, "0")}</span></div>
              <header className="realm-header">
                <div>
                  <span>{unit.code} · {unit.stage}</span>
                  <h2>{unit.title} <small>{unit.chineseTitle}</small></h2>
                  <p>{unit.description}</p>
                </div>
                <div className="realm-completion">
                  <strong>{completedInUnit}/{unit.lessons.length}</strong>
                  <span>Thử Luyện thông quan</span>
                </div>
              </header>

              <div className="lesson-track">
                {unit.lessons.map((lesson, lessonIndex) => {
                  const access = lessonAuthority.get(lesson.id);
                  const passed = access?.passed === true;
                  const locked = access?.unlocked !== true;
                  const expandedWordCount = expandedWordCountByLesson.get(lesson.id) ?? 0;
                  const content = (
                    <>
                      <span className="lesson-node-icon">
                        {passed ? <Check size={20} /> : locked ? <LockKeyhole size={18} /> : lessonIndex === 0 ? <Sparkles size={19} /> : <CircleDot size={18} />}
                      </span>
                      <span className="lesson-node-copy">
                        <small>THỬ LUYỆN {unitIndex + 1}.{lessonIndex + 1} · {lesson.chineseTitle}</small>
                        <strong>{lesson.title}</strong>
                        <span>{lesson.objective}</span>
                      </span>
                      <span className="lesson-node-meta">
                        <span><Clock3 size={14} /> {lesson.minutes} phút</span>
                        <span><Zap size={14} /> {lesson.xp} XP</span>
                        {expandedWordCount > 0 && <span className="lesson-expansion-count"><LibraryBig size={14} /> +{expandedWordCount} từ trong bài</span>}
                        {access?.bestScore !== null && access?.bestScore !== undefined && <b>BEST {access.bestScore}%</b>}
                      </span>
                      {!locked && <ChevronRight size={20} />}
                    </>
                  );

                  return locked ? (
                    <div className="lesson-node locked" key={lesson.id} aria-disabled="true">{content}</div>
                  ) : (
                    <Link className={`lesson-node ${passed ? "completed" : access?.bestScore != null ? "attempted" : ""}`} to={`/lesson/${lesson.id}`} viewTransition key={lesson.id}>{content}</Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {nextRealm && nextRealmPath && (
        <section className="next-realm-preview" data-testid="next-hsk-realm-preview" aria-labelledby="next-realm-title">
          <div className="next-realm-sigil" aria-hidden="true"><LockKeyhole size={24} /><span>{nextRealm.pathId.replace("hsk", "")}</span></div>
          <div>
            <span>CẢNH GIỚI KẾ TIẾP · ĐÃ CÓ NỘI DUNG</span>
            <h2 id="next-realm-title">{nextRealmPath.label} đang chờ khai mở</h2>
            <p>
              Hoàn thành các Thử Luyện hiện tại với điểm đạt từ 70%. Khi đủ điều kiện,
              Thiên Lộ tự chuyển sang {nextRealmPath.label}; Đại Khảo không phải khóa mở.
            </p>
          </div>
          <div className="next-realm-meter" aria-label={`${nextRealm.completedPrerequisiteCount} trên ${curriculumView.targetLessonIds.length} bài tiên quyết đã đạt`}>
            <strong>{nextRealm.completedPrerequisiteCount}/{curriculumView.targetLessonIds.length}</strong>
            <span>{nextRealm.remainingPrerequisiteCount === 0 ? "Sẵn sàng khai mở" : `Còn ${nextRealm.remainingPrerequisiteCount} bài`}</span>
            <i><b style={{ width: `${nextRealm.progressPercent}%` }} /></i>
            <small>{nextRealm.lessonCount} bài của {nextRealmPath.label} đã sẵn sàng</small>
          </div>
        </section>
      )}

      {selectedPath.id === "hsk4" && <section className="path-advanced-vault" data-testid="path-advanced-vault">
        <div className="path-mega-sigil"><LibraryBig size={31} /></div>
        <div>
          <span className="system-kicker">SAU HSK4 · KHO NÂNG CAO</span>
          <h2>7.618 mục từ nâng cao · 390 ải và chuyên đề</h2>
          <p>HSK5–9 và tiếng Trung hiện đại được giữ ở đây để Thiên Lộ HSK1–4 không bị đội độ khó. Phần này là tự học tham chiếu, không tự cộng XP hoặc bằng chứng thông thạo.</p>
        </div>
        <Link className="secondary-button" to="/path/expansion" viewTransition>
          Mở kho nâng cao <ChevronRight size={17} />
        </Link>
      </section>}

      {selectedPath.id === "hsk1" && (
        <section className="hsk-level-check-card" data-testid="hsk1-level-check-card">
          <div className="hsk-level-check-icon"><Crosshair size={28} /></div>
          <div>
            <span className="system-kicker">ĐẠI KHẢO · TỰ KIỂM TRÊN THIẾT BỊ</span>
            <h2>Đại Khảo Cảnh Giới HSK1</h2>
            <p>
              50 câu phủ nghe, đọc, từ vựng và ngữ pháp. Kết quả chỉ gợi ý vùng
              ôn tập tiếp theo; đây không phải bài thi HSK chính thức.
            </p>
          </div>
          <Link className="primary-button" to="/assessment/hsk1" viewTransition>
            Bước vào Đại Khảo <ChevronRight size={17} />
          </Link>
        </section>
      )}

      {selectedPath.id === "hsk2" && (
        <section className="hsk-level-check-card" data-testid="hsk2-level-check-card">
          <div className="hsk-level-check-icon"><Crosshair size={28} /></div>
          <div>
            <span className="system-kicker">ĐẠI KHẢO · TỰ KIỂM TRÊN THIẾT BỊ</span>
            <h2>Đại Khảo Cảnh Giới HSK2</h2>
            <p>
              60 câu form A phủ nghe, đọc, từ vựng và ngữ pháp. Kết quả chỉ
              gợi ý vùng ôn tập tiếp theo; đây không phải bài thi HSK chính thức.
            </p>
          </div>
          <Link className="primary-button" to="/assessment/hsk2" viewTransition>
            Bước vào Đại Khảo <ChevronRight size={17} />
          </Link>
        </section>
      )}

      {selectedPath.id === "hsk3" && (
        <section className="hsk-level-check-card" data-testid="hsk3-level-check-card">
          <div className="hsk-level-check-icon"><Crosshair size={28} /></div>
          <div>
            <span className="system-kicker">ĐẠI KHẢO · TỰ KIỂM TRÊN THIẾT BỊ</span>
            <h2>Đại Khảo Cảnh Giới HSK3</h2>
            <p>
              54 câu form A phủ nghe, đọc, từ vựng và ngữ pháp. Kết quả chỉ
              gợi ý vùng ôn tập tiếp theo; đây không phải bài thi HSK chính thức.
            </p>
          </div>
          <Link className="primary-button" to="/assessment/hsk3" viewTransition>
            Bước vào Đại Khảo <ChevronRight size={17} />
          </Link>
        </section>
      )}

      {selectedPath.id === "hsk4" && (
        <section className="hsk-level-check-card" data-testid="hsk4-level-check-card">
          <div className="hsk-level-check-icon"><Crosshair size={28} /></div>
          <div>
            <span className="system-kicker">ĐẠI KHẢO · TỰ KIỂM TRÊN THIẾT BỊ</span>
            <h2>Đại Khảo Cảnh Giới HSK4</h2>
            <p>
              72 câu form A phủ nghe, đọc, từ vựng và ngữ pháp. Kết quả chỉ
              gợi ý vùng ôn tập tiếp theo; đây không phải bài thi HSK chính thức.
            </p>
          </div>
          <Link className="primary-button" to="/assessment/hsk4" viewTransition>
            Bước vào Đại Khảo <ChevronRight size={17} />
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
