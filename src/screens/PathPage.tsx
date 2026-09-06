import {
  AlertTriangle,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  LockKeyhole,
  LibraryBig,
  Orbit,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { NormalizedLearningAuthorityGate } from "../components/NormalizedLearningAuthorityGate";
import {
  loadPathExpansionIndex,
  type PathExpansionIndex,
} from "../content/megaLexicon";
import { usePublishedStudioLessons } from "../content/usePublishedStudioLessons";
import { COURSE_UNITS } from "../data/curriculum";
import {
  getProgressingHskCurriculumView,
  resolveHskPlacement,
} from "../data/hskCurriculumGraph";
import { getHskLearningPath } from "../data/hskLearningPaths";
import { resolveLearningPathAuthority } from "../learning/learningAuthority";
import { groupCourseUnitsByHsk } from "../learning/pathCatalog";
import {
  isLessonReleased,
} from "../lib/adaptive";
import { useLearning } from "../store/LearningStore";
import { useLearningJourney } from "../store/LearningJourneyStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";

function LessonSkillSigil({ index }: { index: number }) {
  const variant = index % 4;
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      {variant === 0 && <path d="M3 12c5 0 4-5 8-5s3 8 7 8 3-6 7-6 3 4 4 4M3 18c4 0 4 5 8 5s3-8 7-8 3 7 7 7 3-3 4-3" />}
      {variant === 1 && <path d="M22 23c-2 5-9 5-10-1-.8-4 4-5 4-9 0-3-4-4-6-1-3 5 2 9 5 5m-6-7c-2-7 8-11 13-5 5 7-1 10-4 13" />}
      {variant === 2 && <path d="M2 17h4l2-8 3 15 3-20 4 25 3-18 3 10 2-5h4" />}
      {variant === 3 && <path d="M5 7h22v15H15l-7 5 2-5H5zM10 14h2m4 0h2m4 0h2" />}
    </svg>
  );
}

function SpiritBeastSeal({ index }: { index: number }) {
  const realmGlyphs = ["零", "壹", "贰", "叁", "肆"];
  return (
    <svg className="spirit-beast-seal" viewBox="0 0 120 120" aria-hidden="true">
      <circle className="spirit-beast-seal-orbit" cx="60" cy="60" r="48" />
      <circle className="spirit-beast-seal-orbit is-inner" cx="60" cy="60" r="39" />
      <path className="spirit-beast-seal-flare" d="M60 2v13M60 105v13M2 60h13M105 60h13M18 18l9 9M93 93l9 9M102 18l-9 9M27 93l-9 9" />
      <path className="spirit-beast-seal-body" d="M77 29c-13-7-30-2-36 11-6 14 1 29 15 34 11 4 23-1 27-11 4-9 0-19-9-23-8-4-18 0-21 8-2 7 2 14 9 16 6 2 13-1 14-7" />
      <path className="spirit-beast-seal-body" d="M77 29l9-8-2 12 9 3-12 4M41 40l-10 3 8 6-7 8 13-2M55 75l-8 12 13-5 6 11 3-15" />
      <circle className="spirit-beast-seal-eye" cx="78" cy="35" r="2.4" />
      <text x="60" y="65" textAnchor="middle">{realmGlyphs[index] ?? String(index)}</text>
    </svg>
  );
}

function ChapterSeal() {
  return (
    <svg className="chapter-spirit-seal" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r="29" />
      <path d="M19 47c11-4 19-13 23-27M29 51c9-7 15-17 17-29M40 52c7-8 11-17 12-27" />
      <path d="M20 47l9-1-5-7M30 51l9-3-7-6M41 52l8-5-8-4" />
    </svg>
  );
}

const ROMAN_CHAPTER_NUMERALS = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
];

function formatChapterNumber(index: number) {
  return ROMAN_CHAPTER_NUMERALS[index] ?? String(index + 1);
}

function CurrentLessonAutoAnchor({ lessonId }: { lessonId: string }) {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(`path-lesson-${lessonId}`);
      if (!target) return;
      const bounds = target.getBoundingClientRect();
      const topSafeArea = 76;
      const bottomSafeArea = window.innerWidth <= 760 ? 76 : 20;
      const alreadyVisible = bounds.top >= topSafeArea && bounds.bottom <= window.innerHeight - bottomSafeArea;
      if (alreadyVisible) return;
      target.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [lessonId]);
  return null;
}

export function PathPage() {
  const [expansionIndex, setExpansionIndex] = useState<PathExpansionIndex | null>(null);
  const { state, sync } = useLearning();
  const { checkpoint, currentStep, recordReceipt } = useLearningJourney();
  const publishedLessons = usePublishedStudioLessons();
  useEffect(() => {
    if (currentStep?.stage !== "close" || !checkpoint) return;
    recordReceipt({
      stage: "close",
      source: "path",
      lessonId: checkpoint.anchorLessonId,
      activityId: `path:${checkpoint.journeyId}:close`,
    });
  }, [checkpoint, currentStep, recordReceipt]);
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
    progress,
    lessons: lessonAuthority,
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
  // Availability and visibility are deliberately separate. Every released
  // lesson remains visible in the catalog; the authority map alone decides
  // whether it can be opened.
  const releasedCourseUnits = COURSE_UNITS
    .map((unit) => ({
      ...unit,
      lessons: unit.lessons.filter((lesson) =>
        isLessonReleased(lesson)
      ).map((lesson) => publishedLessons.lessons.get(lesson.id)?.lesson ?? lesson),
    }))
    .filter((unit) => unit.lessons.length > 0);
  const catalogGroups = groupCourseUnitsByHsk(releasedCourseUnits);
  const catalogLessonCount = releasedCourseUnits.reduce(
    (total, unit) => total + unit.lessons.length,
    0,
  );
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
      {currentLesson && <CurrentLessonAutoAnchor lessonId={currentLesson.id} />}
      <header className="path-route-banner" aria-labelledby="path-route-title">
        <img className="path-route-art" src="/path-celestial-scroll-g.png" alt="" aria-hidden="true" />
        <div className="visually-hidden">
          <h1 id="path-route-title">Thiên Lộ</h1>
          <p>Lộ trình tu luyện HSK0–HSK4, từ khai âm nhập môn đến HSK4.</p>
          <ol aria-label="Năm chặng của Thiên Lộ">
            {catalogGroups.map(({ path }) => <li key={path.id}>{path.id.toUpperCase()}</li>)}
          </ol>
        </div>
        <span className="path-route-current" aria-live="polite">
          <small>{currentLesson ? "ĐANG TU LUYỆN" : "ĐÃ THÔNG QUAN"}</small>
          <strong>{currentLesson?.title ?? "Hoàn tất Thiên Lộ"}</strong>
        </span>
        <span className="path-route-total" aria-live="polite">
          <span><strong>{completedCount}</strong><i>/</i>{catalogLessonCount}</span>
          <small>bài đã<br />thông qua</small>
        </span>
      </header>
      <p className="visually-hidden">Toàn bộ {catalogLessonCount} bài từ HSK0 đến HSK4; {completedCount} bài đã thông qua, tiến độ chặng {selectedPath.label} là {progress}%.</p>

      {publishedLessons.status === "fallback" && (
        <aside className="path-footer-note" role="status">
          <AlertTriangle size={18} />
          <p><strong>Bản biên soạn mới đang ngoại tuyến.</strong> Thiên Lộ cốt lõi vẫn dùng được và toàn bộ tiến độ được giữ nguyên.</p>
          <button className="secondary-button" type="button" onClick={publishedLessons.retry}>Thử tải lại</button>
        </aside>
      )}

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

      <div className="path-realm-groups" data-testid="full-lesson-catalog">
        {catalogGroups.map(({ path, units }, groupIndex) => {
          const groupLessons = units.flatMap((unit) => unit.lessons);
          const completedInGroup = groupLessons.filter((item) => lessonAuthority.get(item.id)?.passed === true).length;
          const isActive = path.id === curriculumView.path.pathId;
          const isFuture = path.stageIndex > curriculumView.path.stageIndex;
          const levelCleared = groupLessons.length > 0 && completedInGroup === groupLessons.length;
          const levelStatus = isActive ? "active" : isFuture ? "locked" : levelCleared ? "cleared" : "foundation";
          const levelStatusLabel = isActive ? "TIÊN MÔN ĐANG KHAI MỞ" : isFuture ? "HIỆN ĐỂ XEM TRƯỚC · CHƯA MỞ" : levelCleared ? "ĐÃ THÔNG QUA" : "CĂN CƠ CẦN BỒI ĐẮP";
          const LevelStatusIcon = isActive ? Sparkles : isFuture ? LockKeyhole : levelCleared ? Check : CircleDot;
          const levelProgress = groupLessons.length === 0 ? 0 : Math.round((completedInGroup / groupLessons.length) * 100);
          return (
            <section className="path-realm-group" data-level-status={levelStatus} data-realm-index={groupIndex} key={path.id}>
              <header className="path-realm-level">
                <div className="path-realm-level-index" aria-hidden="true">
                  <SpiritBeastSeal index={groupIndex} />
                </div>
                <div className="path-realm-level-copy">
                  <span className="path-realm-level-status"><LevelStatusIcon size={15} /> {levelStatusLabel}</span>
                  <h2><span>MỤC HSK · </span>{path.label}</h2>
                  <strong className="path-realm-level-subtitle">{path.title}</strong>
                  <p>{path.description}</p>
                  <div className="gate-insignia">
                    <span><Orbit size={13} /> {units.length} cảnh giới</span>
                    <span><LibraryBig size={13} /> {groupLessons.length} bí quyển</span>
                  </div>
                </div>
                <div className="path-realm-level-count">
                  <span>TIẾN ĐỘ MỤC</span>
                  <strong>{completedInGroup}<i>/</i>{groupLessons.length}</strong>
                  <small>{levelProgress}% khai mở</small>
                  <div className="cultivation-progress" role="progressbar" aria-label={`Tiến độ ${path.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={levelProgress}>
                    <i style={{ width: `${levelProgress}%` }} />
                  </div>
                </div>
              </header>

              <div className="course-realms">
                {units.map((unit, unitIndex) => {
                  const completedInUnit = unit.lessons.filter((item) => lessonAuthority.get(item.id)?.passed === true).length;
                  const unlockedInUnit = unit.lessons.filter((item) => lessonAuthority.get(item.id)?.unlocked === true).length;
                  const isCurrentUnit = unit.lessons.some((item) => item.id === currentLesson?.id);
                  const realmStatusLabel = completedInUnit === unit.lessons.length ? "ĐÃ THÔNG QUAN" : isCurrentUnit ? "CẢNH GIỚI HIỆN TẠI" : unlockedInUnit > 0 ? "SẴN SÀNG TIẾN VÀO" : "ĐANG CHỜ CHẶNG TRƯỚC";
                  const realmStatus = completedInUnit === unit.lessons.length ? "cleared" : isCurrentUnit ? "active" : unlockedInUnit > 0 ? "available" : "locked";
                  const RealmStatusIcon = realmStatus === "cleared" ? Check : realmStatus === "active" ? Sparkles : realmStatus === "available" ? CircleDot : LockKeyhole;
                  const realmProgress = unit.lessons.length === 0 ? 0 : Math.round((completedInUnit / unit.lessons.length) * 100);
                  const realmHeadingId = `realm-heading-${unit.id}`;
                  return (
                    <section className={`course-realm realm-${unit.color}`} data-realm-status={realmStatus} aria-labelledby={realmHeadingId} key={unit.id}>
                      <div className="realm-number" aria-hidden="true">
                        <span>CHƯƠNG</span>
                        <strong>{formatChapterNumber(unitIndex)}</strong>
                        <ChapterSeal />
                      </div>
                      <header className="realm-header">
                        <div className="realm-header-copy">
                          <span className="realm-header-status"><RealmStatusIcon size={15} /> {realmStatusLabel}</span>
                          <span className="realm-header-code">{unit.code} · {unit.stage}</span>
                          <h3 id={realmHeadingId}>{unit.title} <small>{unit.chineseTitle}</small></h3>
                          <p>{unit.description}</p>
                          <div className="gate-insignia"><span><LibraryBig size={13} /> {unit.lessons.length} bí quyển trong cảnh giới</span></div>
                        </div>
                        <div className="realm-completion">
                          <span>ĐỘ THÔNG QUAN</span>
                          <strong>{completedInUnit}<i>/</i>{unit.lessons.length}</strong>
                          <small>{realmProgress}% lĩnh hội</small>
                          <div className="cultivation-progress" role="progressbar" aria-label={`Tiến độ cảnh giới ${unit.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={realmProgress}>
                            <i style={{ width: `${realmProgress}%` }} />
                          </div>
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
                              <span className="lesson-node-index" aria-hidden="true">{String(lessonIndex + 1).padStart(2, "0")}</span>
                              <span className={`lesson-node-icon sigil-${lessonIndex % 4}`} aria-hidden="true"><LessonSkillSigil index={lessonIndex} /></span>
                              <span className="lesson-node-copy">
                                <small>{lesson.chineseTitle} · {unit.stage}</small>
                                <strong>{lesson.title}</strong>
                                <span>{lesson.objective}</span>
                              </span>
                              <span className="lesson-node-meta">
                                <span className="lesson-node-evidence">{passed ? "1/1" : "0/1"}<small>{passed ? "đã lĩnh hội" : "để lĩnh hội"}</small></span>
                                <span className="lesson-node-duration"><Clock3 size={14} /> {lesson.minutes} phút</span>
                                {expandedWordCount > 0 && <span className="lesson-node-extension"><LibraryBig size={14} /> {expandedWordCount} từ mở rộng</span>}
                                <b>{passed ? "ĐÃ ĐẠT" : locked ? "CHƯA MỞ" : lesson.id === currentLesson?.id ? "HỌC TIẾP" : "SẴN SÀNG"}</b>
                              </span>
                              {!locked && <ChevronRight size={20} />}
                            </>
                          );
                          return locked ? (
                            <div className="lesson-node locked" key={lesson.id} aria-label={`${lesson.title}, bài chưa mở`}>{content}</div>
                          ) : (
                            <Link
                              id={lesson.id === currentLesson?.id ? `path-lesson-${lesson.id}` : undefined}
                              className={`lesson-node ${lesson.id === currentLesson?.id ? "current" : ""} ${passed ? "completed" : access?.bestScore != null ? "attempted" : ""}`}
                              to={`/lesson/${lesson.id}`}
                              aria-current={lesson.id === currentLesson?.id ? "step" : undefined}
                              viewTransition
                              key={lesson.id}
                            >
                              {content}
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="path-footer-note">
        <Orbit size={18} />
        <p><strong>Kho bài học luôn hiện đủ; quyền mở bài vẫn dựa trên bằng chứng tiên quyết.</strong> Bài mới được phát hành vào runtime sẽ tự xuất hiện trong đúng cảnh giới mà không cần cập nhật số đếm thủ công.</p>
      </footer>
    </div>
  );
}
