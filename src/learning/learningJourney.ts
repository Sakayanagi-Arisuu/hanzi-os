import {
  RELEASED_LESSONS,
  RELEASED_WORD_BY_ID,
} from "../data/curriculum";
import {
  getActivePathReleasedLessons,
  getNextLesson,
  isLessonPassed,
  isMistakeFromActivePathContent,
} from "../lib/adaptive";
import type { LearningGoal, LearningState, Lesson } from "../types";

export type LearningJourneyStage = "learn" | "review" | "transfer" | "close";

export type LearningJourneyStepKind =
  | "lesson"
  | "path"
  | "mistakes"
  | "fsrs"
  | "pronunciation"
  | "assessment"
  | "reader"
  | "writing"
  | "dictionary";

export type LearningJourneyRoute =
  | `/lesson/${string}`
  | "/path"
  | "/review"
  | "/mistakes"
  | `/pronunciation?lesson=${string}`
  | "/assessment"
  | `/reader?lesson=${string}`
  | `/characters?lesson=${string}`
  | `/dictionary?lesson=${string}&challenge=1`;

export type LearningJourneyStep = {
  id: string;
  sequence: 1 | 2 | 3 | 4;
  stage: LearningJourneyStage;
  stageLabel: "Học" | "Ôn" | "Vận dụng" | "Khép phiên";
  kind: LearningJourneyStepKind;
  title: string;
  reason: string;
  to: LearningJourneyRoute;
  minutes: number;
  status: "action" | "clear";
  sourceLessonId: string | null;
  wordIds: readonly string[];
};

export type DailyLearningJourney = {
  id: string;
  goal: LearningGoal;
  targetMinutes: LearningState["profile"]["dailyMinutes"];
  learnLessonId: string | null;
  transferSourceLessonId: string | null;
  dueWordCount: number;
  unresolvedMistakeCount: number;
  steps: readonly [
    LearningJourneyStep,
    LearningJourneyStep,
    LearningJourneyStep,
    LearningJourneyStep,
  ];
  evidenceNotice: string;
};

export type BuildDailyLearningJourneyInput = {
  state: LearningState;
  dueWordIds: readonly string[];
};

const uniqueReleasedWordIds = (wordIds: readonly string[]) =>
  [...new Set(wordIds)]
    .filter((wordId) => RELEASED_WORD_BY_ID.has(wordId))
    .sort((left, right) => left.localeCompare(right));

const getStepMinutes = (
  targetMinutes: LearningState["profile"]["dailyMinutes"],
  hasReviewAction: boolean,
) => {
  const close = 1;
  const transfer = targetMinutes === 10 ? 3 : targetMinutes === 20 ? 5 : 8;
  const review = hasReviewAction
    ? targetMinutes === 10 ? 2 : targetMinutes === 20 ? 4 : 6
    : 0;

  return {
    learn: targetMinutes - close - transfer - review,
    review,
    transfer,
    close,
  };
};

const lessonSource = (lesson: Lesson | undefined) => ({
  sourceLessonId: lesson?.id ?? null,
  wordIds: uniqueReleasedWordIds(lesson?.wordIds ?? []),
});

const completionTime = (state: LearningState, lessonId: string) => {
  const timestamp = Date.parse(state.completedLessons[lessonId]?.completedAt ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getMostRecentPassedLesson = (state: LearningState) =>
  getActivePathReleasedLessons(state.profile.startingLevel)
    .filter((lesson) => isLessonPassed(lesson, state))
    .sort((left, right) =>
      completionTime(state, right.id) - completionTime(state, left.id)
      || left.id.localeCompare(right.id)
    )[0];

const buildLearnStep = (
  goal: LearningGoal,
  lesson: Lesson | undefined,
  minutes: number,
): LearningJourneyStep => lesson
  ? {
      id: `journey:${goal}:learn`,
      sequence: 1,
      stage: "learn",
      stageLabel: "Học",
      kind: "lesson",
      title: lesson.title,
      reason: `Học ${lesson.objective.toLocaleLowerCase("vi-VN")} trước khi dùng lại chính các từ này ở bước vận dụng.`,
      to: `/lesson/${lesson.id}`,
      minutes,
      status: "action",
      ...lessonSource(lesson),
    }
  : {
      id: `journey:${goal}:learn`,
      sequence: 1,
      stage: "learn",
      stageLabel: "Học",
      kind: "path",
      title: "Chọn chặng học tiếp theo",
      reason: "Thiên Lộ chưa có bài mở khóa phù hợp; xem điều kiện của chặng tiếp theo thay vì nhảy sang nội dung ngoài lộ trình.",
      to: "/path",
      minutes,
      status: "action",
      sourceLessonId: null,
      wordIds: [],
    };

const buildReviewStep = (
  goal: LearningGoal,
  state: LearningState,
  dueWordIds: readonly string[],
  minutes: number,
  anchorLesson: Lesson | undefined,
): LearningJourneyStep => {
  const unresolvedMistakes = state.mistakes.filter((mistake) =>
    !mistake.resolved
    && isMistakeFromActivePathContent(
      mistake,
      state.profile.startingLevel,
    )
  );
  const mistakeWordIds = uniqueReleasedWordIds(
    unresolvedMistakes.flatMap((mistake) => mistake.wordId ? [mistake.wordId] : []),
  );

  if (unresolvedMistakes.length > 0) {
    return {
      id: `journey:${goal}:review`,
      sequence: 2,
      stage: "review",
      stageLabel: "Ôn",
      kind: "mistakes",
      title: "Sửa lỗi đang mở",
      reason: `${unresolvedMistakes.length} lỗi từ nội dung đang học chưa được sửa xong; xử lý chúng trước khi thêm một lượt vận dụng mới.`,
      to: "/mistakes",
      minutes,
      status: "action",
      sourceLessonId: anchorLesson?.id ?? unresolvedMistakes[0]?.lessonId ?? null,
      wordIds: mistakeWordIds,
    };
  }

  if (dueWordIds.length > 0) {
    return {
      id: `journey:${goal}:review`,
      sequence: 2,
      stage: "review",
      stageLabel: "Ôn",
      kind: "fsrs",
      title: "Gọi lại từ đến hạn",
      reason: `${dueWordIds.length} từ đã tới lịch ôn theo FSRS; gọi lại trước khi gặp chúng trong ngữ cảnh mới.`,
      to: "/review",
      minutes,
      status: "action",
      sourceLessonId: anchorLesson?.id ?? null,
      wordIds: dueWordIds,
    };
  }

  return {
    id: `journey:${goal}:review`,
    sequence: 2,
    stage: "review",
    stageLabel: "Ôn",
    kind: "fsrs",
    title: "Chưa có mục cần ôn",
    reason: "Hôm nay chưa có từ phát hành nào tới lịch FSRS và cũng không còn lỗi mở trong lộ trình hiện tại.",
    to: "/review",
    minutes: 0,
    status: "clear",
    sourceLessonId: anchorLesson?.id ?? null,
    wordIds: [],
  };
};

const conversationTransfer = (
  lesson: Lesson | undefined,
  minutes: number,
): LearningJourneyStep => ({
  id: "journey:conversation:transfer",
  sequence: 3,
  stage: "transfer",
  stageLabel: "Vận dụng",
  kind: lesson ? "pronunciation" : "path",
  title: lesson ? "Đưa từ mới vào lời nói" : "Chọn nội dung để luyện nói",
  reason: lesson
    ? `Sau bài “${lesson.title}”, mở Vạn Âm Điện để luyện nghe và tự đọc; bản ghi chữ chỉ hỗ trợ đối chiếu, không phải điểm phát âm.`
    : "Luyện nghe và tự đọc nội dung đã mở; bản ghi chữ chỉ hỗ trợ đối chiếu, không phải điểm phát âm.",
  to: lesson ? `/pronunciation?lesson=${lesson.id}` : "/path",
  minutes,
  status: "action",
  ...lessonSource(lesson),
});

const travelTransfer = (
  lesson: Lesson | undefined,
  minutes: number,
): LearningJourneyStep => ({
  id: "journey:travel:transfer",
  sequence: 3,
  stage: "transfer",
  stageLabel: "Vận dụng",
  kind: lesson ? "dictionary" : "path",
  title: lesson ? "Phá bẫy từ vựng sinh tồn" : "Chọn tình huống hành trình",
  reason: lesson
    ? `Sau bài “${lesson.title}”, vào Mê Trận Từ Nghĩa với đúng kho từ của bài để phân biệt nhanh các lựa chọn dễ nhầm khi di chuyển.`
    : "Chọn một bài đã mở trước khi vào thử thách từ vựng theo tình huống.",
  to: lesson ? `/dictionary?lesson=${lesson.id}&challenge=1` : "/path",
  minutes,
  status: "action",
  ...lessonSource(lesson),
});

const hskTransfer = (
  state: LearningState,
  lesson: Lesson | undefined,
  minutes: number,
): LearningJourneyStep => {
  const hasPassedLesson = getActivePathReleasedLessons(
    state.profile.startingLevel,
  ).some((releasedLesson) => isLessonPassed(releasedLesson, state));
  const canUseReader = state.diagnostic.completed && hasPassedLesson && Boolean(lesson);

  return {
    id: "journey:hsk:transfer",
    sequence: 3,
    stage: "transfer",
    stageLabel: "Vận dụng",
    kind: canUseReader ? "reader" : "assessment",
    title: canUseReader ? "Đọc ngữ cảnh theo chặng" : "Xác định điểm bắt đầu",
    reason: canUseReader
      ? lesson
        ? `Điểm khởi hành đã được định tuyến và đã có bài qua ngưỡng mở khóa; tiếp tục bằng tác vụ đọc ngữ cảnh sau chặng “${lesson.title}”.`
        : "Điểm khởi hành đã được định tuyến; đọc một ngữ cảnh trong phạm vi nội dung đã phát hành."
      : "Chưa có cả kết quả định tuyến và một bài đã qua ngưỡng mở khóa; Khảo Nghiệm Căn Cơ giúp tránh chọn bài quá xa nền hiện có.",
    to: canUseReader && lesson
      ? `/reader?lesson=${lesson.id}`
      : "/assessment",
    minutes,
    status: "action",
    ...lessonSource(lesson),
  };
};

const careerTransfer = (
  state: LearningState,
  lesson: Lesson | undefined,
  minutes: number,
): LearningJourneyStep => {
  const hasOpenWritingMistake = state.mistakes.some((mistake) =>
    !mistake.resolved
    && mistake.skill === "writing"
    && isMistakeFromActivePathContent(
      mistake,
      state.profile.startingLevel,
    )
  );
  const useWriting = hasOpenWritingMistake || Boolean(lesson?.skills.includes("writing"));

  if (!lesson) {
    return {
      id: "journey:career:transfer",
      sequence: 3,
      stage: "transfer",
      stageLabel: "Vận dụng",
      kind: "path",
      title: "Chọn nội dung để vận dụng",
      reason: "Chưa có bài phát hành phù hợp làm neo; xem Thiên Lộ trước khi mở tác vụ đọc hoặc viết.",
      to: "/path",
      minutes,
      status: "action",
      sourceLessonId: null,
      wordIds: [],
    };
  }

  return {
    id: "journey:career:transfer",
    sequence: 3,
    stage: "transfer",
    stageLabel: "Vận dụng",
    kind: useWriting ? "writing" : "reader",
    title: useWriting ? "Dùng chữ trong tác vụ viết" : "Đọc để lấy thông tin",
    reason: useWriting
      ? lesson
        ? `Chặng “${lesson.title}” hoặc lỗi đang mở có yêu cầu viết; mở mô-đun luyện chữ và chỉ tập nét khi dữ liệu có nguồn gốc hợp lệ.`
        : "Có lỗi viết đang mở; mở mô-đun luyện chữ và chỉ tập nét khi dữ liệu có nguồn gốc hợp lệ."
      : lesson
        ? `Sau chặng “${lesson.title}”, mở một tác vụ đọc ngữ cảnh để luyện lấy thông tin phục vụ học tập và công việc.`
        : "Đọc một ngữ cảnh trong phạm vi nội dung đã phát hành để luyện lấy thông tin.",
    to: useWriting
      ? `/characters?lesson=${lesson.id}`
      : `/reader?lesson=${lesson.id}`,
    minutes,
    status: "action",
    ...lessonSource(lesson),
  };
};

const buildTransferStep = (
  state: LearningState,
  lesson: Lesson | undefined,
  minutes: number,
) => {
  switch (state.profile.goal) {
    case "conversation":
      return conversationTransfer(lesson, minutes);
    case "travel":
      return travelTransfer(lesson, minutes);
    case "hsk":
      return hskTransfer(state, lesson, minutes);
    case "career":
      return careerTransfer(state, lesson, minutes);
  }
};

const buildCloseStep = (
  goal: LearningGoal,
  lesson: Lesson | undefined,
  minutes: number,
): LearningJourneyStep => ({
  id: `journey:${goal}:close`,
  sequence: 4,
  stage: "close",
  stageLabel: "Khép phiên",
  kind: "path",
  title: "Nối sang chặng kế tiếp",
  reason: "Xem bài vừa học nằm ở đâu trên Thiên Lộ và điều kiện của bài kế tiếp; XP và số lượt chỉ là nhật ký hoạt động, không phải kết luận năng lực.",
  to: "/path",
  minutes,
  status: "action",
  ...lessonSource(lesson),
});

export const buildDailyLearningJourney = ({
  state,
  dueWordIds,
}: BuildDailyLearningJourneyInput): DailyLearningJourney => {
  const nextLesson = getNextLesson(state);
  const releasedNextLesson = nextLesson
    ? RELEASED_LESSONS.find((lesson) => lesson.id === nextLesson.id)
    : undefined;
  const transferSourceLesson = getMostRecentPassedLesson(state)
    ?? releasedNextLesson;
  const releasedDueWordIds = uniqueReleasedWordIds(dueWordIds);
  const unresolvedMistakeCount = state.mistakes.filter((mistake) =>
    !mistake.resolved
    && isMistakeFromActivePathContent(
      mistake,
      state.profile.startingLevel,
    )
  ).length;
  const minutes = getStepMinutes(
    state.profile.dailyMinutes,
    unresolvedMistakeCount > 0 || releasedDueWordIds.length > 0,
  );
  const steps = [
    buildLearnStep(state.profile.goal, releasedNextLesson, minutes.learn),
    buildReviewStep(
      state.profile.goal,
      state,
      releasedDueWordIds,
      minutes.review,
      transferSourceLesson,
    ),
    buildTransferStep(state, transferSourceLesson, minutes.transfer),
    buildCloseStep(state.profile.goal, transferSourceLesson, minutes.close),
  ] as const;

  return {
    id: `journey:${state.profile.goal}:${state.profile.startingLevel}:${releasedNextLesson?.id ?? "path"}:${transferSourceLesson?.id ?? "path"}`,
    goal: state.profile.goal,
    targetMinutes: state.profile.dailyMinutes,
    learnLessonId: releasedNextLesson?.id ?? null,
    transferSourceLessonId: transferSourceLesson?.id ?? null,
    dueWordCount: releasedDueWordIds.length,
    unresolvedMistakeCount,
    steps,
    evidenceNotice: "Lộ trình sắp xếp hoạt động từ dữ liệu đã phát hành. Hoàn thành bước, XP hay transcript không tự tạo kết luận thành thạo.",
  };
};
