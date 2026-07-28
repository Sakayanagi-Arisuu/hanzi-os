import runtimeCatalogJson from "../../content/packages/foundation-2026.07.6/runtime-catalog.json";
import type { CourseUnit, Lesson, Story, VocabularyItem } from "../types";
import type { RuntimeCatalogArtifact } from "../content/types";
import { parseNumberedPinyin } from "../lib/pinyin";
import { assertValidContentPackage } from "./contentValidation";

export const CONTENT_SCHEMA_VERSION = 1 as const;
export const CONTENT_VERSION = "foundation-2026.07.6";

const RUNTIME_CATALOG = runtimeCatalogJson as unknown as RuntimeCatalogArtifact;
if (RUNTIME_CATALOG.contentVersion !== CONTENT_VERSION) {
  throw new Error(
    `Runtime content version ${CONTENT_VERSION} does not match runtime catalog ${RUNTIME_CATALOG.contentVersion}`,
  );
}

export const VOCABULARY: VocabularyItem[] = RUNTIME_CATALOG.vocabulary
  .map((item) => ({
    ...item,
    syllables: parseNumberedPinyin(item.pinyinNumbered),
  }));

export const LESSONS: Lesson[] = RUNTIME_CATALOG.lessons.map((item) => ({
  ...item,
}));

export const STORIES: Story[] = RUNTIME_CATALOG.stories.map((item) => ({
  ...item,
}));

const COURSE_UNIT_METADATA: Array<Omit<CourseUnit, "lessons">> = [
  {
    id: "boot",
    code: "REALM-00",
    stage: "Khởi âm",
    title: "Khai âm nhập môn",
    chineseTitle: "语音觉醒",
    description: "Pinyin, khẩu hình và thanh điệu trước khi tích lũy từ.",
    color: "jade",
  },
  {
    id: "survival",
    code: "REALM-01",
    stage: "Nền tảng giao tiếp",
    title: "Sinh tồn giao tiếp",
    chineseTitle: "初见之境",
    description: "Giới thiệu, hỏi đáp, số đếm và những lượt thoại đầu tiên.",
    color: "gold",
  },
  {
    id: "daily",
    code: "REALM-02",
    stage: "Nền tảng đời sống",
    title: "Đời sống hằng ngày",
    chineseTitle: "日常回路",
    description: "Gia đình, ăn uống, thời gian và hoạt động thường ngày.",
    color: "vermilion",
  },
  {
    id: "characters",
    code: "REALM-03",
    stage: "Hán tự nền tảng",
    title: "Cấu tạo Hán tự",
    chineseTitle: "汉字铸造",
    description: "Nét, bộ phận, âm-nghĩa và khả năng viết từ trí nhớ.",
    color: "cyan",
  },
  {
    id: "journey",
    code: "REALM-04",
    stage: "Chưa phát hành",
    title: "Hành trình đô thị",
    chineseTitle: "城市行者",
    description: "Di chuyển, mua sắm, hẹn giờ và xử lý tình huống.",
    color: "magenta",
  },
  {
    id: "professional",
    code: "REALM-05",
    stage: "Chưa phát hành",
    title: "Học thuật và công việc",
    chineseTitle: "专业领域",
    description: "Ngôn ngữ lớp học, email, họp và thuyết trình.",
    color: "jade",
  },
];

export const COURSE_UNITS: CourseUnit[] = COURSE_UNIT_METADATA.map((unit) => ({
  ...unit,
  lessons: LESSONS.filter((lesson) => lesson.unitId === unit.id),
}));

export const WORD_BY_ID = new Map(VOCABULARY.map((word) => [word.id, word]));
const RELEASED_LEXEME_IDS = new Set(
  RUNTIME_CATALOG.vocabulary.map((item) => item.id),
);
export const RELEASED_VOCABULARY = VOCABULARY.filter((word) =>
  RELEASED_LEXEME_IDS.has(word.id)
);
export const RELEASED_WORD_BY_ID = new Map(
  RELEASED_VOCABULARY.map((word) => [word.id, word]),
);
export const RELEASED_LESSONS = LESSONS.filter((lesson) =>
  (lesson.releaseState === "beta" || lesson.releaseState === "published")
  && lesson.wordIds.every((wordId) => RELEASED_LEXEME_IDS.has(wordId))
);
export const LESSON_BY_ID = new Map(LESSONS.map((item) => [item.id, item]));
export const RELEASED_STORIES = STORIES.filter((story) =>
  (story.releaseState === "beta" || story.releaseState === "published")
  && story.sentences.every((sentence) =>
    sentence.wordIds.every((wordId) => RELEASED_LEXEME_IDS.has(wordId))
  )
);

assertValidContentPackage({
  contentVersion: CONTENT_VERSION,
  vocabulary: VOCABULARY,
  courseUnits: COURSE_UNITS,
  stories: STORIES,
});
