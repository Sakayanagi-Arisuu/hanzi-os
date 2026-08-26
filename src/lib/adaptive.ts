import { RELEASED_LESSONS, RELEASED_WORD_BY_ID } from "../data/curriculum";
import {
  getHskCurriculumView,
  getProgressingHskCurriculumView,
} from "../data/hskCurriculumGraph";
import type {
  LearningGoal,
  LearningState,
  Lesson,
  MistakeRecord,
  Skill,
} from "../types";

const RELEASED_LESSON_BY_ID = new Map(
  RELEASED_LESSONS.map((lesson) => [lesson.id, lesson]),
);

export const getActivePathReleasedLessons = (
  startingLevel: LearningState["profile"]["startingLevel"],
) => {
  const visibleLessonIds = new Set(
    getHskCurriculumView(startingLevel).visibleLessonIds,
  );
  return RELEASED_LESSONS.filter((lesson) => visibleLessonIds.has(lesson.id));
};

export const isLessonIdAvailableForStartingLevel = (
  lessonId: string,
  startingLevel: LearningState["profile"]["startingLevel"],
) => getHskCurriculumView(startingLevel).visibleLessonIds.includes(lessonId);

export const isLessonReleased = (lesson: Lesson) =>
  lesson.releaseState === "beta" || lesson.releaseState === "published";

export const isLessonIdReleased = (lessonId: string) =>
  RELEASED_LESSON_BY_ID.has(lessonId);

export const isMistakeFromReleasedContent = (
  mistake: Pick<MistakeRecord, "lessonId" | "wordId">,
) => mistake.lessonId === "review"
  ? Boolean(mistake.wordId && RELEASED_WORD_BY_ID.has(mistake.wordId))
  : isLessonIdReleased(mistake.lessonId);

export const isMistakeFromActivePathContent = (
  mistake: Pick<MistakeRecord, "lessonId" | "wordId">,
  startingLevel: LearningState["profile"]["startingLevel"],
) => mistake.lessonId === "review"
  ? isMistakeFromReleasedContent(mistake)
  : isMistakeFromReleasedContent(mistake)
    && isLessonIdAvailableForStartingLevel(mistake.lessonId, startingLevel);

export const isLessonPassed = (lesson: Lesson, state: LearningState) =>
  isLessonReleased(lesson) &&
  RELEASED_LESSON_BY_ID.has(lesson.id) &&
  (state.completedLessons[lesson.id]?.bestScore ?? 0) >= 70;

export const getProgressingPathReleasedLessons = (state: LearningState) => {
  const passedLessonIds = new Set(
    RELEASED_LESSONS
      .filter((lesson) => isLessonPassed(lesson, state))
      .map((lesson) => lesson.id),
  );
  const visibleLessonIds = new Set(
    getProgressingHskCurriculumView(
      state.profile.startingLevel,
      passedLessonIds,
    ).visibleLessonIds,
  );
  return RELEASED_LESSONS.filter((lesson) => visibleLessonIds.has(lesson.id));
};

export const getProgressingReleasedLessonProgress = (state: LearningState) => {
  const activeLessons = getProgressingPathReleasedLessons(state);
  const completedCount = activeLessons.filter((lesson) =>
    isLessonPassed(lesson, state)
  ).length;
  const totalCount = activeLessons.length;

  return {
    completedCount,
    totalCount,
    remainingCount: Math.max(0, totalCount - completedCount),
    progress: totalCount === 0
      ? 0
      : Math.round((completedCount / totalCount) * 100),
  };
};

export const getReleasedLessonProgress = (state: LearningState) => {
  const activeLessons = getActivePathReleasedLessons(
    state.profile.startingLevel,
  );
  const completedCount = activeLessons.filter((lesson) =>
    isLessonPassed(lesson, state)
  ).length;
  const totalCount = activeLessons.length;

  return {
    completedCount,
    totalCount,
    remainingCount: Math.max(0, totalCount - completedCount),
    progress: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
  };
};

export const GOAL_CONFIG: Record<LearningGoal, {
  label: string;
  destination: string;
  weights: Record<Skill, number>;
  practicePath: string;
  practiceLabel: string;
}> = {
  conversation: {
    label: "Giao tiếp tự nhiên",
    destination: "Nghe hiểu và phản xạ trong hội thoại đời sống",
    weights: { pronunciation: 0.18, listening: 0.22, speaking: 0.24, reading: 0.08, writing: 0.04, vocabulary: 0.14, grammar: 0.1 },
    practicePath: "/pronunciation",
    practiceLabel: "Luyện nghe và đường thanh",
  },
  hsk: {
    label: "Hướng tới HSK",
    destination: "Xây kỹ năng nền; kho hiện tại chưa tuyên bố độ phủ luyện thi",
    weights: { pronunciation: 0.08, listening: 0.17, speaking: 0.08, reading: 0.22, writing: 0.14, vocabulary: 0.19, grammar: 0.12 },
    practicePath: "/assessment",
    practiceLabel: "Khảo sát kỹ năng nền",
  },
  career: {
    label: "Tiếng Trung công việc",
    destination: "Đọc, viết và trao đổi rõ ràng trong môi trường chuyên nghiệp",
    weights: { pronunciation: 0.08, listening: 0.18, speaking: 0.2, reading: 0.18, writing: 0.14, vocabulary: 0.12, grammar: 0.1 },
    practicePath: "/reader",
    practiceLabel: "Đọc hiểu nền tảng",
  },
  travel: {
    label: "Sinh tồn khi du lịch",
    destination: "Xử lý nhanh các tình huống di chuyển, mua sắm và dịch vụ",
    weights: { pronunciation: 0.16, listening: 0.24, speaking: 0.24, reading: 0.08, writing: 0.02, vocabulary: 0.17, grammar: 0.09 },
    practicePath: "/pronunciation",
    practiceLabel: "Luyện nghe và đường thanh",
  },
};

const rankTitles = [
  { min: 0, title: "Khai Ngôn", chinese: "开言境" },
  { min: 500, title: "Tụ Âm", chinese: "聚音境" },
  { min: 1400, title: "Ngưng Ý", chinese: "凝意境" },
  { min: 2800, title: "Thông Văn", chinese: "通文境" },
  { min: 5000, title: "Linh Ngôn", chinese: "灵言境" },
  { min: 8000, title: "Hóa Cảnh", chinese: "化境" },
];

export const getRank = (xp: number) =>
  [...rankTitles].reverse().find((rank) => xp >= rank.min) ?? rankTitles[0];

export const getGoalReadiness = (state: LearningState) => {
  const config = GOAL_CONFIG[state.profile.goal];
  const skillScore = (Object.entries(config.weights) as Array<[Skill, number]>)
    .reduce((sum, [skill, weight]) => sum + state.skillMastery[skill] * weight, 0);
  const pathScore = getReleasedLessonProgress(state).progress;
  return Math.round(skillScore * 0.86 + pathScore * 0.14);
};

export const isLessonUnlocked = (lesson: Lesson, state: LearningState) => {
  const releasedLesson = RELEASED_LESSON_BY_ID.get(lesson.id);
  if (
    !isLessonReleased(lesson)
    || !releasedLesson
    || !isLessonReleased(releasedLesson)
  ) return false;
  if (!Array.isArray(releasedLesson.prerequisiteIds)) return false;

  return releasedLesson.prerequisiteIds.every((prerequisiteId) => {
    const prerequisite = RELEASED_LESSON_BY_ID.get(prerequisiteId);
    return Boolean(prerequisite && isLessonPassed(prerequisite, state));
  });
};

export const getNextLesson = (state: LearningState) => {
  const activeLessons = getProgressingPathReleasedLessons(state);
  return activeLessons.find((lesson) =>
    isLessonUnlocked(lesson, state) &&
    (!state.completedLessons[lesson.id] || state.completedLessons[lesson.id].bestScore < 70),
  ) ?? activeLessons.find((lesson) => isLessonUnlocked(lesson, state));
};

export type DailyMission = {
  id: string;
  code: string;
  title: string;
  description: string;
  to: string;
  minutes: number;
  reward: string;
  kind: "lesson" | "correction" | "review" | "goal" | "diagnostic" | "practice";
};

export const buildPronunciationDailyMission = (): DailyMission => ({
  id: "voice-daily",
  code: "VOICE-03",
  title: "Vạn Âm Điện · Ải đọc hôm nay",
  description: "Đọc 6 câu ngắn lấy từ nội dung HSK đang mở; lượt luyện được ghi vào Thất Trụ nhưng chưa phải phép đo phát âm.",
  to: "/pronunciation",
  minutes: 6,
  reward: "+10 XP tương tác · 1 lần/ngày",
  kind: "practice",
});

export const buildDailyMissions = (
  state: LearningState,
  dueCount: number,
): DailyMission[] => {
  const unresolved = state.mistakes.filter((mistake) =>
    !mistake.resolved &&
    isMistakeFromActivePathContent(
      mistake,
      state.profile.startingLevel,
    )
  );
  const nextLesson = getNextLesson(state);
  const goal = GOAL_CONFIG[state.profile.goal];
  const minutes = state.profile.dailyMinutes;
  const missions: DailyMission[] = [];

  if (unresolved.length) {
    missions.push({
      id: "correction",
      code: "REMEDY-01",
      title: "Phá giải Nghịch Cảnh",
      description: `${unresolved.length} lỗ hổng đang cản tiến độ. Sửa đúng liên tiếp để đóng chúng.`,
      to: "/mistakes",
      minutes: Math.min(8, Math.max(3, unresolved.length * 2)),
      reward: "+8 XP/lỗi",
      kind: "correction",
    });
  } else if (nextLesson) {
    missions.push({
      id: nextLesson.id,
      code: "ASCEND-01",
      title: nextLesson.title,
      description: nextLesson.objective,
      to: `/lesson/${nextLesson.id}`,
      minutes: nextLesson.minutes,
      reward: `+${nextLesson.xp} XP`,
      kind: "lesson",
    });
  }

  if (dueCount > 0) {
    missions.push({
      id: "memory",
      code: "MEMORY-02",
      title: "Củng cố ký ức đến hạn",
      description: `${dueCount} mục được FSRS chọn theo thời điểm quên dự kiến.`,
      to: "/review",
      minutes: Math.min(8, Math.max(3, Math.round(minutes * 0.3))),
      reward: "+5 XP/thẻ",
      kind: "review",
    });
  } else if (!state.diagnostic.completed) {
    missions.push({
      id: "diagnostic",
      code: "ORIGIN-02",
      title: "Khảo nghiệm căn cơ",
      description: "Định tuyến đúng điểm xuất phát để tránh học lại phần đã vững hoặc nhảy quá nền.",
      to: "/assessment",
      minutes: 5,
      reward: "Mở đúng điểm xuất phát",
      kind: "diagnostic",
    });
  }

  missions.push(buildPronunciationDailyMission());

  if (goal.practicePath !== "/pronunciation") {
    missions.push({
      id: "goal-focus",
      code: "DESTINY-03",
      title: goal.practiceLabel,
      description: `Bài bổ trợ được ưu tiên cho thiên mệnh “${goal.label}”.`,
      to: goal.practicePath,
      minutes: Math.max(4, minutes - missions.reduce((sum, mission) => sum + mission.minutes, 0)),
      reward: "Tăng độ sẵn sàng",
      kind: "goal",
    });
  }

  return missions;
};
