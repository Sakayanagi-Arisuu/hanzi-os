import {
  HSK_BUILT_IN_EXAM_FORM_KEYS,
  HSK_STANDARD_EXAM_STRUCTURE,
  hskStandardItemCount,
  isHskExamFormKey,
  isHskExamLevel,
  type HskExamFormKey,
} from "../assessment/hskExamStructure";
import { RELEASED_LESSONS, RELEASED_VOCABULARY } from "../data/curriculum";
import { studioLessonMatchesLevel } from "./studioLessonIdentity";

export const STUDIO_ITEM_TYPES = [
  "vocabulary",
  "character",
  "grammar",
  "pronunciation",
  "communicative_function",
  "graded_text",
  "lesson",
  "exam_item",
  "exam_form",
] as const;

export const STUDIO_LEVELS = ["hsk0", "hsk1", "hsk2", "hsk3", "hsk4"] as const;

export const STUDIO_WORKFLOW_STATES = [
  "draft",
  "validated",
  "submitted",
  "approved",
  "published",
  "archived",
] as const;

export type StudioItemType = typeof STUDIO_ITEM_TYPES[number];
export type StudioLevel = typeof STUDIO_LEVELS[number];
export type StudioWorkflowState = typeof STUDIO_WORKFLOW_STATES[number];

export const STUDIO_ITEM_PRESENTATION: Record<StudioItemType, {
  module: string;
  label: string;
  description: string;
}> = {
  vocabulary: {
    module: "Tàng Tự Khố",
    label: "Từ và cụm từ",
    description: "Hán tự, Pinyin, nghĩa Việt và ví dụ dùng từ trong ngữ cảnh.",
  },
  character: {
    module: "Thần Văn Lô",
    label: "Hán tự",
    description: "Một chữ, cách đọc, nghĩa và từ hoặc câu giúp nhận diện chữ ấy.",
  },
  grammar: {
    module: "Pháp Tắc Điện",
    label: "Ngữ pháp",
    description: "Mẫu câu, giải thích tiếng Việt và ví dụ đúng cấp độ.",
  },
  pronunciation: {
    module: "Vạn Âm Điện",
    label: "Bài luyện phát âm",
    description: "Mục tiêu âm, quy tắc, cặp đối chiếu và checkpoint tự nghe.",
  },
  communicative_function: {
    module: "Thiên Lộ · Vạn Âm Điện",
    label: "Nhiệm vụ giao tiếp",
    description: "Tình huống, hội thoại mẫu và đầu ra nghe–nói–đọc có thể quan sát.",
  },
  graded_text: {
    module: "Vạn Quyển Các",
    label: "Bài đọc ngắn",
    description: "Văn bản Trung–Pinyin–Việt và câu hỏi đọc hiểu theo cấp độ.",
  },
  lesson: {
    module: "Thiên Lộ",
    label: "Bài học",
    description: "Chọn bài đích rồi biên soạn mục tiêu, lý thuyết, hội thoại, ngữ pháp và thực hành hướng dẫn.",
  },
  exam_item: {
    module: "Phòng Luyện Đề",
    label: "Câu hỏi luyện đề",
    description: "Một câu hỏi có ngữ liệu, lựa chọn, đáp án và lời giải.",
  },
  exam_form: {
    module: "Phòng Luyện Đề",
    label: "Bộ đề",
    description: "Ghép các câu hỏi đã kiểm định thành một cửa dungeon cân bằng.",
  },
};

export const STUDIO_WORKFLOW_LABELS: Record<StudioWorkflowState, string> = {
  draft: "Bản nháp",
  validated: "Đã kiểm định",
  submitted: "Chờ phê duyệt",
  approved: "Đã phê duyệt",
  published: "Đang phát hành",
  archived: "Đã lưu trữ",
};

export type StudioValidationIssue = {
  path: string;
  message: string;
};

export type StudioValidationResult = {
  schemaVersion: 1;
  valid: boolean;
  itemType: StudioItemType;
  contentSha256: string;
  errors: StudioValidationIssue[];
  warnings: StudioValidationIssue[];
  checks: {
    structure: boolean;
    contextualChinese: boolean;
    answerIntegrity: boolean;
    fivePassAiReview: boolean;
    localStudyDisclosure: boolean;
  };
};

export const isStudioItemType = (value: unknown): value is StudioItemType =>
  typeof value === "string"
  && STUDIO_ITEM_TYPES.includes(value as StudioItemType);

export const isStudioLevel = (value: unknown): value is StudioLevel =>
  typeof value === "string" && STUDIO_LEVELS.includes(value as StudioLevel);

export const isStudioWorkflowState = (
  value: unknown,
): value is StudioWorkflowState =>
  typeof value === "string"
  && STUDIO_WORKFLOW_STATES.includes(value as StudioWorkflowState);

const canonicalize = (value: unknown): string => {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("JSON numbers must be finite.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalize(entry)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => {
        if (record[key] === undefined) {
          throw new TypeError("Undefined values are not valid canonical JSON.");
        }
        return `${JSON.stringify(key)}:${canonicalize(record[key])}`;
      })
      .join(",")}}`;
  }
  throw new TypeError(`Unsupported JSON value: ${typeof value}.`);
};

export const canonicalStudioJson = (value: unknown) => canonicalize(value);

export const studioSha256 = async (canonicalJson: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalJson),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")).join("")}`;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const nonEmpty = (value: unknown, max = 10_000) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;

const stringArray = (value: unknown, minimum = 0) =>
  Array.isArray(value)
  && value.length >= minimum
  && value.every((entry) => nonEmpty(entry, 240));

const RELEASED_LESSON_IDS = new Set(RELEASED_LESSONS.map((lesson) => lesson.id));
const RELEASED_VOCABULARY_IDS = new Set(RELEASED_VOCABULARY.map((word) => word.id));
const COMMUNICATIVE_SKILLS = new Set(["listening", "speaking", "reading"]);
const LEARNING_SKILLS = new Set([
  "pronunciation", "listening", "speaking", "reading", "writing", "vocabulary", "grammar",
]);
const containsHanScript = (value: unknown) =>
  typeof value === "string" && /\p{Script=Han}/u.test(value);

const linkedReleasedLessons = (value: unknown) =>
  stringArray(value, 1)
  && new Set(value as string[]).size === (value as string[]).length
  && (value as string[]).every((lessonId) => RELEASED_LESSON_IDS.has(lessonId));

const linkedReleasedVocabulary = (value: unknown) =>
  stringArray(value, 1)
  && new Set(value as string[]).size === (value as string[]).length
  && (value as string[]).every((wordId) => RELEASED_VOCABULARY_IDS.has(wordId));

const exactSkillSelection = (value: unknown, allowed: ReadonlySet<string>) =>
  Array.isArray(value)
  && value.length > 0
  && new Set(value).size === value.length
  && value.every((skill) => typeof skill === "string" && allowed.has(skill));

const contextualExample = (value: unknown) => {
  const record = asRecord(value);
  return Boolean(
    record
    && nonEmpty(record.hanzi, 600)
    && nonEmpty(record.pinyin, 1_200)
    && nonEmpty(record.meaningVi, 1_200),
  );
};

const hasContextualExamples = (value: unknown, minimum = 1) =>
  Array.isArray(value)
  && value.length >= minimum
  && value.every(contextualExample);

const addRequired = (
  errors: StudioValidationIssue[],
  condition: boolean,
  path: string,
  message: string,
) => {
  if (!condition) errors.push({ path, message });
};

const validateReviewDisclosure = (
  content: Record<string, unknown>,
  errors: StudioValidationIssue[],
) => {
  const review = asRecord(content.review);
  const passes = asRecord(review?.aiSelfReview);
  const fivePass = Boolean(
    passes?.accuracy === true
    && passes.levelFit === true
    && passes.pedagogy === true
    && passes.answerIntegrity === true
    && passes.originality === true,
  );
  addRequired(
    errors,
    review?.humanReviewed === false,
    "review.humanReviewed",
    "Phải công bố humanReviewed=false cho nội dung tự học local.",
  );
  addRequired(
    errors,
    fivePass,
    "review.aiSelfReview",
    "Cần hoàn tất năm pass AI: accuracy, levelFit, pedagogy, answerIntegrity, originality.",
  );
  return fivePass && review?.humanReviewed === false;
};

export async function validateStudioContent(
  itemType: StudioItemType,
  value: unknown,
): Promise<{ canonicalJson: string; result: StudioValidationResult }> {
  const canonicalJson = canonicalStudioJson(value);
  if (canonicalJson.length > 1_048_576) {
    throw new TypeError("Studio content exceeds 1 MiB.");
  }
  const contentSha256 = await studioSha256(canonicalJson);
  const errors: StudioValidationIssue[] = [];
  const warnings: StudioValidationIssue[] = [];
  const content = asRecord(value);
  addRequired(errors, Boolean(content), "$", "Nội dung phải là một JSON object.");
  if (!content) {
    return {
      canonicalJson,
      result: {
        schemaVersion: 1,
        valid: false,
        itemType,
        contentSha256,
        errors,
        warnings,
        checks: {
          structure: false,
          contextualChinese: false,
          answerIntegrity: false,
          fivePassAiReview: false,
          localStudyDisclosure: false,
        },
      },
    };
  }

  const reviewReady = validateReviewDisclosure(content, errors);
  let contextualChinese: boolean;
  let answerIntegrity = true;

  if (itemType === "vocabulary") {
    addRequired(errors, nonEmpty(content.hanzi, 32), "hanzi", "Thiếu từ/cụm từ Hán tự.");
    addRequired(errors, nonEmpty(content.pinyin, 160), "pinyin", "Thiếu Pinyin.");
    addRequired(errors, nonEmpty(content.meaningVi, 600), "meaningVi", "Thiếu nghĩa Việt.");
    contextualChinese = hasContextualExamples(content.examples);
    addRequired(errors, contextualChinese, "examples", "Cần ít nhất một ví dụ Hán tự/Pinyin/nghĩa Việt.");
    addRequired(errors, linkedReleasedLessons(content.sourceLessonIds), "sourceLessonIds", "Chọn ít nhất một bài học nguồn để mục từ đi đúng vào lộ trình.");
  } else if (itemType === "character") {
    addRequired(
      errors,
      nonEmpty(content.hanzi, 4)
        && [...String(content.hanzi).trim()].length === 1
        && containsHanScript(content.hanzi),
      "hanzi",
      "Hồ sơ Hán tự cần đúng một chữ giản thể.",
    );
    addRequired(errors, nonEmpty(content.pinyin, 80), "pinyin", "Thiếu Pinyin.");
    addRequired(errors, nonEmpty(content.meaningVi, 600), "meaningVi", "Thiếu nghĩa Việt.");
    contextualChinese = contextualExample(content.context);
    addRequired(errors, contextualChinese, "context", "Cần từ/câu ngữ cảnh có Hán tự, Pinyin và nghĩa Việt.");
    addRequired(errors, linkedReleasedLessons(content.sourceLessonIds), "sourceLessonIds", "Chọn ít nhất một bài học nguồn để Hán tự xuất hiện đúng ngữ cảnh.");
    const strokeProvenance = asRecord(content.strokeProvenance);
    const hasStrokeMetadata = content.strokeCount !== undefined || Boolean(strokeProvenance);
    if (hasStrokeMetadata) {
      addRequired(errors, Number.isInteger(content.strokeCount) && Number(content.strokeCount) >= 1 && Number(content.strokeCount) <= 64, "strokeCount", "Số nét phải từ 1 đến 64 khi khai báo dữ liệu nét.");
      addRequired(errors, Boolean(strokeProvenance && nonEmpty(strokeProvenance.sourceName, 240)), "strokeProvenance.sourceName", "Cần tên bộ dữ liệu nét.");
      addRequired(errors, Boolean(strokeProvenance && nonEmpty(strokeProvenance.sourceUrl, 1_000) && (/^https:\/\//u.test(String(strokeProvenance.sourceUrl)) || /^\/[^/]/u.test(String(strokeProvenance.sourceUrl)))), "strokeProvenance.sourceUrl", "Nguồn dữ liệu nét phải là HTTPS hoặc đường dẫn nội bộ bắt đầu bằng /.");
      addRequired(errors, Boolean(strokeProvenance && nonEmpty(strokeProvenance.licenseVi, 600)), "strokeProvenance.licenseVi", "Cần ghi giấy phép hoặc quyền sử dụng dữ liệu nét.");
    }
  } else if (itemType === "grammar") {
    addRequired(errors, nonEmpty(content.pattern, 240), "pattern", "Thiếu mẫu ngữ pháp.");
    addRequired(errors, nonEmpty(content.explanationVi), "explanationVi", "Thiếu giải thích tiếng Việt.");
    contextualChinese = hasContextualExamples(content.examples);
    addRequired(errors, contextualChinese, "examples", "Cần ví dụ ngữ cảnh có Hán tự, Pinyin và nghĩa Việt.");
    addRequired(errors, nonEmpty(content.pitfallVi), "pitfallVi", "Thiếu lỗi ngữ pháp thường gặp.");
    addRequired(errors, nonEmpty(content.checkpointVi), "checkpointVi", "Thiếu checkpoint tự tạo câu.");
    addRequired(errors, linkedReleasedLessons(content.sourceLessonIds), "sourceLessonIds", "Chọn ít nhất một bài học nguồn để mẫu ngữ pháp đi đúng vào lộ trình.");
  } else if (itemType === "pronunciation") {
    addRequired(
      errors,
      ["tone-system", "initial-contrast", "tone-sandhi"].includes(String(content.targetKind)),
      "targetKind",
      "Chọn đúng loại mục tiêu phát âm.",
    );
    addRequired(errors, stringArray(content.targets, 1), "targets", "Cần ít nhất một âm hoặc cặp âm mục tiêu.");
    addRequired(errors, nonEmpty(content.conceptVi), "conceptVi", "Thiếu mục tiêu giải thích bằng tiếng Việt.");
    addRequired(errors, nonEmpty(content.ruleVi), "ruleVi", "Thiếu quy tắc luyện âm.");
    contextualChinese = hasContextualExamples(content.examples, 2);
    addRequired(errors, contextualChinese, "examples", "Cần ít nhất hai mẫu Trung–Pinyin–Việt để nghe và đối chiếu.");
    addRequired(errors, nonEmpty(content.pitfallVi), "pitfallVi", "Thiếu lỗi thường gặp.");
    addRequired(errors, nonEmpty(content.checkpointVi), "checkpointVi", "Thiếu checkpoint tự nghe hoặc tự đọc.");
    addRequired(errors, linkedReleasedLessons(content.sourceLessonIds), "sourceLessonIds", "Chọn ít nhất một bài học nguồn đang phát hành; không dùng mã trùng hoặc không tồn tại.");
  } else if (itemType === "communicative_function") {
    addRequired(errors, nonEmpty(content.functionVi), "functionVi", "Thiếu chức năng giao tiếp.");
    addRequired(errors, nonEmpty(content.scenarioVi), "scenarioVi", "Thiếu tình huống sử dụng.");
    addRequired(errors, nonEmpty(content.outcomeVi), "outcomeVi", "Thiếu đầu ra người học cần thực hiện.");
    contextualChinese = hasContextualExamples(content.dialogue, 2);
    addRequired(errors, contextualChinese, "dialogue", "Cần ít nhất hai lượt hội thoại Trung–Pinyin–Việt.");
    const tasks = Array.isArray(content.tasks) ? content.tasks : [];
    answerIntegrity = tasks.length > 0 && tasks.every((task) => {
      const row = asRecord(task);
      return Boolean(row && nonEmpty(row.promptVi) && nonEmpty(row.answer) && nonEmpty(row.explanationVi));
    });
    addRequired(errors, answerIntegrity, "tasks", "Cần ít nhất một nhiệm vụ có đáp án mẫu và hướng dẫn tự kiểm.");
    const validSkills = exactSkillSelection(content.skills, COMMUNICATIVE_SKILLS);
    addRequired(errors, validSkills, "skills", "Chọn ít nhất một kỹ năng đích hợp lệ: nghe, nói hoặc đọc.");
    addRequired(errors, linkedReleasedLessons(content.sourceLessonIds), "sourceLessonIds", "Chọn ít nhất một bài học nguồn đang phát hành; không dùng mã trùng hoặc không tồn tại.");
  } else if (itemType === "graded_text") {
    const rights = asRecord(content.rights);
    addRequired(errors, nonEmpty(content.titleZh, 120) && containsHanScript(content.titleZh), "titleZh", "Tiêu đề tiếng Trung cần có ít nhất một Hán tự.");
    addRequired(errors, nonEmpty(content.summaryVi), "summaryVi", "Thiếu tóm tắt tiếng Việt.");
    addRequired(
      errors,
      Number.isInteger(content.estimatedMinutes)
        && Number(content.estimatedMinutes) >= 1
        && Number(content.estimatedMinutes) <= 60,
      "estimatedMinutes",
      "Thời lượng đọc phải từ 1 đến 60 phút.",
    );
    contextualChinese = hasContextualExamples(content.sentences, 2);
    addRequired(errors, contextualChinese, "sentences", "Cần ít nhất hai đoạn Trung–Pinyin–Việt.");
    const comprehension = Array.isArray(content.comprehension) ? content.comprehension : [];
    answerIntegrity = comprehension.length > 0 && comprehension.every((question) => {
      const row = asRecord(question);
      const distractors = row && Array.isArray(row.distractors)
        ? row.distractors
        : [];
      return Boolean(
        row
        && nonEmpty(row.promptVi)
        && nonEmpty(row.answer)
        && distractors.length >= 2
        && distractors.every((item) => nonEmpty(item, 1_000))
        && new Set([row.answer, ...distractors]).size === distractors.length + 1
        && nonEmpty(row.explanationVi),
      );
    });
    addRequired(errors, answerIntegrity, "comprehension", "Cần câu đọc hiểu có đáp án, ít nhất hai lựa chọn nhiễu và lời giải.");
    addRequired(errors, linkedReleasedLessons(content.sourceLessonIds), "sourceLessonIds", "Chọn ít nhất một bài học nguồn đang phát hành; không dùng mã trùng hoặc không tồn tại.");
    addRequired(
      errors,
      typeof content.readerSeriesId === "string"
        && /^studio-text-[0-9a-f]{16}$/u.test(content.readerSeriesId),
      "readerSeriesId",
      "ID phát hành Reader chưa hợp lệ; hãy lưu lại bản nháp từ biểu mẫu.",
    );
    addRequired(
      errors,
      Boolean(
        rights
        && (rights.sourceKind === "original-hanzi-os" || rights.sourceKind === "licensed-third-party")
        && nonEmpty(rights.textProvenanceVi, 1_000)
        && (rights.sourceKind !== "licensed-third-party" || nonEmpty(rights.licenseVi, 500))
        && rights.editorAttestsRights === true,
      ),
      "rights",
      "Ghi rõ provenance và xác nhận quyền dùng văn bản trước khi gửi duyệt.",
    );
  } else if (itemType === "lesson") {
    const targetLesson = typeof content.targetLessonId === "string"
      ? RELEASED_LESSONS.find((lesson) => lesson.id === content.targetLessonId)
      : undefined;
    addRequired(errors, Boolean(targetLesson), "targetLessonId", "Chọn một bài học đích đang phát hành trên Thiên Lộ.");
    addRequired(errors, nonEmpty(content.titleZh, 120) && containsHanScript(content.titleZh), "titleZh", "Tiêu đề tiếng Trung cần có ít nhất một Hán tự.");
    addRequired(errors, nonEmpty(content.objectiveVi), "objectiveVi", "Thiếu mục tiêu bài học.");
    addRequired(errors, nonEmpty(content.conceptVi), "conceptVi", "Thiếu khái niệm cốt lõi trước Thử Luyện.");
    addRequired(errors, nonEmpty(content.ruleVi), "ruleVi", "Thiếu quy tắc áp dụng.");
    addRequired(errors, nonEmpty(content.pitfallVi), "pitfallVi", "Thiếu lỗi thường gặp.");
    addRequired(errors, nonEmpty(content.checkpointVi), "checkpointVi", "Thiếu checkpoint tự kiểm.");
    const exactList = (value: unknown, expected: readonly string[]) => Array.isArray(value)
      && value.length === expected.length
      && value.every((entry, index) => entry === expected[index]);
    addRequired(errors, Boolean(targetLesson && exactList(content.prerequisites, targetLesson.prerequisiteIds)), "prerequisites", "Khóa tiên quyết phải giữ đúng theo bài học đích.");
    addRequired(errors, Boolean(targetLesson && linkedReleasedVocabulary(content.vocabulary) && exactList(content.vocabulary, targetLesson.wordIds)), "vocabulary", "Từ cốt lõi phải giữ đúng theo bài học đích.");
    addRequired(errors, Boolean(targetLesson && exactSkillSelection(content.skills, LEARNING_SKILLS) && exactList(content.skills, targetLesson.skills)), "skills", "Kỹ năng runtime phải giữ đúng theo bài học đích.");
    contextualChinese = hasContextualExamples(content.dialogue, 2);
    addRequired(errors, contextualChinese, "dialogue", "Bài học cần hội thoại/văn bản có ít nhất hai lượt.");
    addRequired(errors, Array.isArray(content.grammar) && content.grammar.length > 0 && content.grammar.every((entry) => {
      const grammar = asRecord(entry);
      return Boolean(grammar && nonEmpty(grammar.pattern, 240) && nonEmpty(grammar.explanationVi));
    }), "grammar", "Bài học cần điểm ngữ pháp có mẫu câu và giải thích.");
    const exercises = Array.isArray(content.exercises) ? content.exercises : [];
    answerIntegrity = exercises.length > 0 && exercises.every((exercise) => {
      const record = asRecord(exercise);
      return Boolean(
        record
        && nonEmpty(record.promptVi)
        && nonEmpty(record.answer, 600)
        && nonEmpty(record.answerPinyin, 1_200)
        && nonEmpty(record.answerMeaningVi, 1_200)
        && Array.isArray(record.distractors)
        && record.distractors.length >= 2
        && record.distractors.every((item) => nonEmpty(item, 1_000))
        && new Set([record.answer, ...record.distractors]).size === record.distractors.length + 1
        && nonEmpty(record.explanationVi),
      );
    });
    addRequired(errors, answerIntegrity, "exercises", "Thực hành cần đáp án Trung–Pinyin–Việt, ít nhất hai lựa chọn nhiễu khác nhau và lời giải.");
  } else if (itemType === "exam_item") {
    addRequired(errors, nonEmpty(content.promptVi), "promptVi", "Thiếu đề bài.");
    addRequired(errors, ["listening", "reading", "vocabulary", "grammar", "writing"].includes(String(content.skill)), "skill", "Kỹ năng thi không hợp lệ.");
    const options = Array.isArray(content.options) ? content.options : [];
    answerIntegrity = options.length >= 3
      && options.every((option) => nonEmpty(option, 1_000))
      && Number.isInteger(content.answerIndex)
      && Number(content.answerIndex) >= 0
      && Number(content.answerIndex) < options.length
      && nonEmpty(content.explanationVi);
    addRequired(errors, answerIntegrity, "options", "Câu thi cần ít nhất ba lựa chọn, answerIndex và giải thích hợp lệ.");
    contextualChinese = nonEmpty(content.hanzi, 2) || nonEmpty(content.passageHanzi, 2);
    addRequired(errors, contextualChinese, "hanzi", "Câu thi cần ngữ liệu tiếng Trung gốc.");
    addRequired(errors, linkedReleasedLessons(content.sourceLessonIds), "sourceLessonIds", "Chọn ít nhất một bài học nguồn cho gợi ý ôn sau khi làm đề.");
  } else if (itemType === "exam_form") {
    const examLevel = isHskExamLevel(content.examLevel)
      ? content.examLevel
      : null;
    addRequired(errors, Boolean(examLevel), "examLevel", "Form thi cần level HSK1–4.");
    const formKey = isHskExamFormKey(content.formKey)
      ? content.formKey.toLowerCase() as HskExamFormKey
      : null;
    addRequired(errors, Boolean(formKey), "formKey", "Cửa luyện đề cần ký hiệu từ A đến L.");
    addRequired(
      errors,
      Boolean(formKey && !HSK_BUILT_IN_EXAM_FORM_KEYS.includes(
        formKey as typeof HSK_BUILT_IN_EXAM_FORM_KEYS[number],
      )),
      "formKey",
      "Cửa A–F đã có sẵn; Biên Tập Viện mở cửa mới từ G đến L.",
    );
    const structure = examLevel ? HSK_STANDARD_EXAM_STRUCTURE[examLevel] : null;
    addRequired(
      errors,
      Boolean(structure && content.timeLimitMinutes === structure.timeLimitMinutes),
      "timeLimitMinutes",
      "Thời gian phải khớp cấu trúc chuẩn của cấp HSK đã chọn.",
    );
    const itemStableKeys = Array.isArray(content.itemStableKeys) ? content.itemStableKeys : [];
    const expectedItemCount = examLevel ? hskStandardItemCount(examLevel) : 0;
    contextualChinese = itemStableKeys.length === expectedItemCount
      && itemStableKeys.every((key) => nonEmpty(key, 160))
      && new Set(itemStableKeys).size === itemStableKeys.length;
    addRequired(
      errors,
      contextualChinese,
      "itemStableKeys",
      `Form cần đúng ${expectedItemCount || "số"} mã câu đã kiểm định và không trùng.`,
    );
    const coverage = asRecord(content.coverage);
    answerIntegrity = Boolean(coverage && structure)
      && structure!.sections.every((section) =>
        coverage?.[section.skill] === section.itemCount
      )
      && Number(coverage?.writing ?? 0) === (
        structure!.sections.find((section) => section.skill === "writing")?.itemCount ?? 0
      );
    addRequired(errors, answerIntegrity, "coverage", "Phân bố Nghe–Đọc–Viết phải khớp cấu trúc chuẩn của cấp HSK.");
  } else {
    contextualChinese = false;
    answerIntegrity = false;
    addRequired(errors, false, "$", "Loại nội dung chưa có validator.");
  }

  if (content.audioSource === "browser-tts") {
    warnings.push({
      path: "audioSource",
      message: "Browser TTS chỉ dùng để luyện nghe/đọc, không phải bằng chứng phát âm hay mastery nói.",
    });
  }

  return {
    canonicalJson,
    result: {
      schemaVersion: 1,
      valid: errors.length === 0,
      itemType,
      contentSha256,
      errors,
      warnings,
      checks: {
        structure: errors.every((issue) => issue.path !== "$"),
        contextualChinese,
        answerIntegrity,
        fivePassAiReview: reviewReady,
        localStudyDisclosure: reviewReady,
      },
    },
  };
}

export const studioStarterContent = (
  itemType: StudioItemType,
  level: StudioLevel = "hsk1",
) => {
  const examLevel = isHskExamLevel(level) ? level : "hsk1";
  const examStructure = HSK_STANDARD_EXAM_STRUCTURE[examLevel];
  const lessonTarget = RELEASED_LESSONS.find((lesson) =>
    studioLessonMatchesLevel(lesson.unitId, level)
  );
  return ({
  ...(itemType === "vocabulary" ? {
    hanzi: "你好",
    pinyin: "nǐ hǎo",
    meaningVi: "xin chào",
    examples: [{ hanzi: "你好！", pinyin: "Nǐ hǎo!", meaningVi: "Xin chào!" }],
    sourceLessonIds: lessonTarget ? [lessonTarget.id] : [],
  } : itemType === "character" ? {
    hanzi: "你",
    pinyin: "nǐ",
    meaningVi: "bạn",
    context: { hanzi: "你好", pinyin: "nǐ hǎo", meaningVi: "xin chào" },
    sourceLessonIds: lessonTarget ? [lessonTarget.id] : [],
  } : itemType === "grammar" ? {
    pattern: "A 是 B",
    explanationVi: "Dùng 是 để nối chủ ngữ với danh từ nhận diện.",
    examples: [{ hanzi: "我是学生。", pinyin: "Wǒ shì xuésheng.", meaningVi: "Tôi là học sinh." }],
    pitfallVi: "Không thêm 吗 vào cuối câu kể dùng để giới thiệu.",
    checkpointVi: "Tự tạo một câu A 是 B không nhìn mẫu.",
    sourceLessonIds: lessonTarget ? [lessonTarget.id] : [],
  } : itemType === "pronunciation" ? {
    targetKind: "tone-system",
    targets: ["mā / má / mǎ / mà"],
    conceptVi: "Nhận ra và tái tạo đường cao độ của bốn thanh cơ bản.",
    ruleVi: "Nghe toàn âm tiết, đối chiếu đường cao độ rồi mới tự đọc.",
    examples: [
      { hanzi: "妈", pinyin: "mā", meaningVi: "mẹ" },
      { hanzi: "马", pinyin: "mǎ", meaningVi: "ngựa" },
    ],
    pitfallVi: "Không dùng độ mạnh của giọng để thay cho đường cao độ.",
    checkpointVi: "Nghe hai mẫu không nhìn Pinyin, chọn thanh rồi tự đọc lại.",
    sourceLessonIds: ["boot-1"],
    audioSource: "browser-tts",
  } : itemType === "communicative_function" ? {
    functionVi: "Chào hỏi và giới thiệu bản thân",
    scenarioVi: "Gặp một người mới trong lớp học tiếng Trung.",
    outcomeVi: "Người học tự nói được lời chào và một câu giới thiệu ngắn.",
    skills: ["listening", "speaking"],
    sourceLessonIds: ["boot-2"],
    dialogue: [
      { hanzi: "你好！", pinyin: "Nǐ hǎo!", meaningVi: "Xin chào!" },
      { hanzi: "你好，我是安。", pinyin: "Nǐ hǎo, wǒ shì Ān.", meaningVi: "Xin chào, tôi là An." },
    ],
    tasks: [{
      promptVi: "Hãy chào và tự giới thiệu bằng một câu.",
      distractors: [],
      answer: "你好，我是安。",
      explanationVi: "Dùng 你好 để chào và 我是… để giới thiệu.",
    }],
  } : itemType === "graded_text" ? {
    readerSeriesId: "studio-text-0000000000000000",
    titleZh: "第一天",
    summaryVi: "Một cuộc gặp ngắn trong ngày đầu đi học.",
    estimatedMinutes: 4,
    sourceLessonIds: ["boot-2"],
    sentences: [
      { hanzi: "今天是我上中文课的第一天。", pinyin: "Jīntiān shì wǒ shàng Zhōngwén kè de dì-yī tiān.", meaningVi: "Hôm nay là ngày đầu tôi học tiếng Trung." },
      { hanzi: "老师说：你好！", pinyin: "Lǎoshī shuō: Nǐ hǎo!", meaningVi: "Giáo viên nói: Xin chào!" },
    ],
    comprehension: [{
      promptVi: "Hôm nay là ngày gì?",
      distractors: ["Ngày thi", "Ngày nghỉ"],
      answer: "Ngày đầu học tiếng Trung",
      explanationVi: "Câu đầu có 第一 天 và 中文课.",
    }],
    rights: {
      sourceKind: "original-hanzi-os",
      textProvenanceVi: "Bản thảo nguyên bản do biên tập viên HANZI.OS soạn; không sao chép hoặc chuyển thể nội dung đóng.",
      licenseVi: "",
      editorAttestsRights: false,
    },
  } : itemType === "lesson" ? {
    targetLessonId: lessonTarget?.id ?? "",
    titleZh: lessonTarget?.chineseTitle ?? "自我介绍",
    objectiveVi: lessonTarget?.objective ?? "Giới thiệu bản thân bằng câu ngắn.",
    conceptVi: "Dùng lời chào và mẫu A 是 B để giới thiệu danh tính trong một lượt nói ngắn.",
    ruleVi: "Nói lời chào trước, dùng 我是 + tên hoặc vai trò, rồi dừng để người đối thoại đáp lại.",
    pitfallVi: "Không thêm 吗 vào câu kể giới thiệu; 吗 sẽ biến câu thành câu hỏi.",
    checkpointVi: "Tự nói một lời chào và một câu giới thiệu không nhìn mẫu.",
    prerequisites: lessonTarget?.prerequisiteIds ?? [],
    vocabulary: lessonTarget?.wordIds ?? [],
    skills: lessonTarget?.skills ?? [],
    dialogue: [
      { hanzi: "你好！", pinyin: "Nǐ hǎo!", meaningVi: "Xin chào!" },
      { hanzi: "你好，我是安。", pinyin: "Nǐ hǎo, wǒ shì Ān.", meaningVi: "Xin chào, tôi là An." },
    ],
    grammar: [{ pattern: "A 是 B", explanationVi: "Dùng để giới thiệu danh tính." }],
    exercises: [{
      promptVi: "Chọn câu giới thiệu đúng.",
      distractors: ["我很好吗？", "你是学生吗？"],
      answer: "我是学生。",
      answerPinyin: "Wǒ shì xuésheng.",
      answerMeaningVi: "Tôi là học sinh.",
      explanationVi: "我是学生 dùng 是 để giới thiệu danh tính.",
    }],
  } : itemType === "exam_item" ? {
    skill: "reading",
    promptVi: "Chọn nghĩa đúng của câu.",
    hanzi: "我是学生。",
    options: ["Tôi là học sinh.", "Bạn là giáo viên.", "Tôi không đi học."],
    answerIndex: 0,
    explanationVi: "我 là tôi, 是 là, 学生 là học sinh.",
    sourceLessonIds: lessonTarget ? [lessonTarget.id] : [],
  } : {
    examLevel,
    formKey: "g",
    timeLimitMinutes: examStructure.timeLimitMinutes,
    itemStableKeys: Array.from({ length: hskStandardItemCount(examLevel) }, (_value, index) =>
      `${examLevel}-mock-item-${String(index + 1).padStart(3, "0")}`
    ),
    coverage: {
      listening: examStructure.sections.find((section) => section.skill === "listening")?.itemCount ?? 0,
      reading: examStructure.sections.find((section) => section.skill === "reading")?.itemCount ?? 0,
      writing: examStructure.sections.find((section) => section.skill === "writing")?.itemCount ?? 0,
    },
  }),
  review: {
    humanReviewed: false,
    aiSelfReview: {
      accuracy: false,
      levelFit: false,
      pedagogy: false,
      answerIntegrity: false,
      originality: false,
    },
  },
  });
};

/**
 * A deliberately incomplete seed for a real editor session.
 *
 * `studioStarterContent` is a complete example used by validators, previews and
 * test fixtures. Reusing that example in the authoring UI made plausible demo
 * copy look like lesson-specific material. A new draft must therefore preserve
 * only safe structural metadata and stay invalid until an editor authors and
 * reviews the learning content.
 */
export const studioBlankDraftContent = (
  itemType: StudioItemType,
  level: StudioLevel = "hsk1",
): Record<string, unknown> => {
  const examLevel = isHskExamLevel(level) ? level : "hsk1";
  const examStructure = HSK_STANDARD_EXAM_STRUCTURE[examLevel];
  const lessonTarget = RELEASED_LESSONS.find((lesson) =>
    studioLessonMatchesLevel(lesson.unitId, level)
  );
  const review = {
    humanReviewed: false,
    aiSelfReview: {
      accuracy: false,
      levelFit: false,
      pedagogy: false,
      answerIntegrity: false,
      originality: false,
    },
  };

  const draft = itemType === "vocabulary" ? {
    hanzi: "",
    pinyin: "",
    meaningVi: "",
    examples: [],
    sourceLessonIds: [],
  } : itemType === "character" ? {
    hanzi: "",
    pinyin: "",
    meaningVi: "",
    context: { hanzi: "", pinyin: "", meaningVi: "" },
    sourceLessonIds: [],
  } : itemType === "grammar" ? {
    pattern: "",
    explanationVi: "",
    examples: [],
    pitfallVi: "",
    checkpointVi: "",
    sourceLessonIds: [],
  } : itemType === "pronunciation" ? {
    targetKind: "tone-system",
    targets: [],
    conceptVi: "",
    ruleVi: "",
    examples: [],
    pitfallVi: "",
    checkpointVi: "",
    sourceLessonIds: [],
  } : itemType === "communicative_function" ? {
    functionVi: "",
    scenarioVi: "",
    outcomeVi: "",
    skills: [],
    sourceLessonIds: [],
    dialogue: [],
    tasks: [],
  } : itemType === "graded_text" ? {
    readerSeriesId: "",
    titleZh: "",
    summaryVi: "",
    estimatedMinutes: 4,
    sourceLessonIds: [],
    sentences: [],
    comprehension: [],
    rights: {
      sourceKind: "original-hanzi-os",
      textProvenanceVi: "",
      licenseVi: "",
      editorAttestsRights: false,
    },
  } : itemType === "lesson" ? {
    targetLessonId: lessonTarget?.id ?? "",
    titleZh: lessonTarget?.chineseTitle ?? "",
    objectiveVi: lessonTarget?.objective ?? "",
    conceptVi: "",
    ruleVi: "",
    pitfallVi: "",
    checkpointVi: "",
    prerequisites: lessonTarget?.prerequisiteIds ?? [],
    vocabulary: lessonTarget?.wordIds ?? [],
    skills: lessonTarget?.skills ?? [],
    dialogue: [],
    grammar: [],
    exercises: [],
  } : itemType === "exam_item" ? {
    skill: "reading",
    promptVi: "",
    hanzi: "",
    passageHanzi: "",
    options: [],
    answerIndex: 0,
    explanationVi: "",
    sourceLessonIds: [],
  } : {
    examLevel,
    formKey: "g",
    timeLimitMinutes: examStructure.timeLimitMinutes,
    itemStableKeys: [],
    coverage: {
      listening: examStructure.sections.find((section) => section.skill === "listening")?.itemCount ?? 0,
      reading: examStructure.sections.find((section) => section.skill === "reading")?.itemCount ?? 0,
      writing: examStructure.sections.find((section) => section.skill === "writing")?.itemCount ?? 0,
    },
  };

  return { ...draft, review };
};
