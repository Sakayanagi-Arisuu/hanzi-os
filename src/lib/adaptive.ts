import { LESSONS } from "../data/curriculum";
import type { LearningGoal, LearningState, Lesson, Skill } from "../types";

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
    practiceLabel: "Hiệu chỉnh phản xạ nói",
  },
  hsk: {
    label: "Chinh phục HSK",
    destination: "Đạt độ phủ từ vựng, ngữ pháp và kỹ năng làm bài",
    weights: { pronunciation: 0.08, listening: 0.17, speaking: 0.08, reading: 0.22, writing: 0.14, vocabulary: 0.19, grammar: 0.12 },
    practicePath: "/assessment",
    practiceLabel: "Khảo nghiệm chuẩn HSK",
  },
  career: {
    label: "Tiếng Trung công việc",
    destination: "Đọc, viết và trao đổi rõ ràng trong môi trường chuyên nghiệp",
    weights: { pronunciation: 0.08, listening: 0.18, speaking: 0.2, reading: 0.18, writing: 0.14, vocabulary: 0.12, grammar: 0.1 },
    practicePath: "/reader",
    practiceLabel: "Đọc ngữ cảnh chuyên môn",
  },
  travel: {
    label: "Sinh tồn khi du lịch",
    destination: "Xử lý nhanh các tình huống di chuyển, mua sắm và dịch vụ",
    weights: { pronunciation: 0.16, listening: 0.24, speaking: 0.24, reading: 0.08, writing: 0.02, vocabulary: 0.17, grammar: 0.09 },
    practicePath: "/pronunciation",
    practiceLabel: "Mô phỏng tình huống thật",
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
  const completed = Object.values(state.completedLessons).filter((item) => item.bestScore >= 70).length;
  const pathScore = Math.min(100, (completed / Math.max(1, LESSONS.length)) * 100);
  return Math.round(skillScore * 0.86 + pathScore * 0.14);
};

const startingUnlockIndex: Record<LearningState["profile"]["startingLevel"], number> = {
  zero: 0,
  basic: 3,
  hsk1: 7,
  hsk2: 11,
};

export const isLessonUnlocked = (lesson: Lesson, state: LearningState) => {
  const index = LESSONS.findIndex((item) => item.id === lesson.id);
  if (index <= 0 || state.completedLessons[lesson.id]) return true;

  let unlockedThrough = startingUnlockIndex[state.profile.startingLevel];
  if (state.diagnostic.completed) {
    const recommendedIndex = LESSONS.findIndex(
      (item) => item.id === state.diagnostic.recommendedLessonId,
    );
    unlockedThrough = Math.max(unlockedThrough, recommendedIndex);
  }
  if (index <= unlockedThrough) return true;

  const previous = state.completedLessons[LESSONS[index - 1].id];
  return Boolean(previous && previous.bestScore >= 70);
};

export const getNextLesson = (state: LearningState) =>
  LESSONS.find((lesson) =>
    isLessonUnlocked(lesson, state) &&
    (!state.completedLessons[lesson.id] || state.completedLessons[lesson.id].bestScore < 70),
  ) ?? LESSONS.find((lesson) => isLessonUnlocked(lesson, state)) ?? LESSONS[0];

export type DailyMission = {
  id: string;
  code: string;
  title: string;
  description: string;
  to: string;
  minutes: number;
  reward: string;
  kind: "lesson" | "correction" | "review" | "goal" | "diagnostic";
};

export const buildDailyMissions = (
  state: LearningState,
  dueCount: number,
): DailyMission[] => {
  const unresolved = state.mistakes.filter((mistake) => !mistake.resolved);
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
  } else {
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

  return missions;
};
