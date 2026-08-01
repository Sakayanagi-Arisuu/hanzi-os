import runtimeCatalogJson from "../../content/packages/foundation-2026.08.2/runtime-catalog.json";
import type { CourseUnit, Lesson, Story, VocabularyItem } from "../types";
import type { RuntimeCatalogArtifact } from "../content/types";
import { parseNumberedPinyin } from "../lib/pinyin";
import { assertValidContentPackage } from "./contentValidation";

export const CONTENT_SCHEMA_VERSION = 1 as const;
export const CONTENT_VERSION = "foundation-2026.08.2";

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
    id: "hsk1-time-place-events",
    code: "HSK1-02",
    stage: "Thời gian và không gian",
    title: "Thời gian, địa điểm và sự kiện",
    chineseTitle: "时间、地点和事件",
    description: "Số đếm, lịch, giờ, vị trí, thời tiết và nơi ở qua sáu bài nối tiếp.",
    color: "cyan",
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
    code: "HSK1-04",
    stage: "Đi lại và giải trí",
    title: "Đi lại và giải trí",
    chineseTitle: "交通和休闲",
    description: "Phương tiện, sắp xếp di chuyển, truyền thông và hoạt động giải trí cơ bản.",
    color: "magenta",
  },
  {
    id: "professional",
    code: "HSK1-05",
    stage: "Học tập và công việc",
    title: "Học tập và công việc",
    chineseTitle: "学习和工作",
    description: "Trường lớp, tiếng Trung, tài liệu học, nghề nghiệp và lịch làm việc cơ bản.",
    color: "jade",
  },
  {
    id: "hsk2-situational-dialogue",
    code: "HSK2-01",
    stage: "Hội thoại tình huống",
    title: "Duy trì chuỗi hỏi đáp",
    chineseTitle: "情景会话",
    description: "Hai mươi bài hội thoại sáu lượt về cá nhân, đời sống, đi lại, học tập và công việc.",
    color: "gold",
  },
  {
    id: "hsk2-sentence-chains",
    code: "HSK2-02",
    stage: "Ngữ pháp trong chuỗi câu",
    title: "Nối câu có quan hệ",
    chineseTitle: "句子连接",
    description: "Mười bài dùng 75 điểm ngữ pháp để so sánh, định vị, diễn tả thời gian, aspect và bổ ngữ.",
    color: "cyan",
  },
  {
    id: "hsk2-short-text-production",
    code: "HSK2-03",
    stage: "Văn bản ngắn có hướng dẫn",
    title: "Nghe-chép, dựng câu và viết ngắn",
    chineseTitle: "短文练习",
    description: "Mười bài với 125 chữ trong ngữ cảnh và 104 prompt tự đối chiếu, không tự cấp mastery viết.",
    color: "magenta",
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
