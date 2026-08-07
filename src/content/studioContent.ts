export const STUDIO_ITEM_TYPES = [
  "vocabulary",
  "character",
  "grammar",
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
  } else if (itemType === "character") {
    addRequired(errors, nonEmpty(content.hanzi, 4), "hanzi", "Thiếu Hán tự mục tiêu.");
    addRequired(errors, nonEmpty(content.pinyin, 80), "pinyin", "Thiếu Pinyin.");
    addRequired(errors, nonEmpty(content.meaningVi, 600), "meaningVi", "Thiếu nghĩa Việt.");
    contextualChinese = contextualExample(content.context);
    addRequired(errors, contextualChinese, "context", "Cần từ/câu ngữ cảnh có Hán tự, Pinyin và nghĩa Việt.");
  } else if (itemType === "grammar") {
    addRequired(errors, nonEmpty(content.pattern, 240), "pattern", "Thiếu mẫu ngữ pháp.");
    addRequired(errors, nonEmpty(content.explanationVi), "explanationVi", "Thiếu giải thích tiếng Việt.");
    contextualChinese = hasContextualExamples(content.examples);
    addRequired(errors, contextualChinese, "examples", "Cần ví dụ ngữ cảnh có Hán tự, Pinyin và nghĩa Việt.");
  } else if (itemType === "lesson") {
    addRequired(errors, nonEmpty(content.objectiveVi), "objectiveVi", "Thiếu mục tiêu bài học.");
    addRequired(errors, stringArray(content.prerequisites), "prerequisites", "Prerequisite phải là mảng ID.");
    addRequired(errors, Array.isArray(content.vocabulary) && content.vocabulary.length > 0, "vocabulary", "Bài học cần từ vựng.");
    contextualChinese = hasContextualExamples(content.dialogue, 2);
    addRequired(errors, contextualChinese, "dialogue", "Bài học cần hội thoại/văn bản có ít nhất hai lượt.");
    addRequired(errors, Array.isArray(content.grammar) && content.grammar.length > 0, "grammar", "Bài học cần điểm ngữ pháp.");
    const exercises = Array.isArray(content.exercises) ? content.exercises : [];
    answerIntegrity = exercises.length > 0 && exercises.every((exercise) => {
      const record = asRecord(exercise);
      return Boolean(
        record
        && nonEmpty(record.promptVi)
        && Array.isArray(record.distractors)
        && record.distractors.length >= 2
        && nonEmpty(record.answer)
        && nonEmpty(record.explanationVi),
      );
    });
    addRequired(errors, answerIntegrity, "exercises", "Bài tập cần đáp án, ít nhất hai distractor và giải thích.");
  } else if (itemType === "exam_item") {
    addRequired(errors, nonEmpty(content.promptVi), "promptVi", "Thiếu đề bài.");
    addRequired(errors, ["listening", "reading", "vocabulary", "grammar"].includes(String(content.skill)), "skill", "Kỹ năng thi không hợp lệ.");
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
  } else {
    addRequired(errors, ["hsk1", "hsk2", "hsk3", "hsk4"].includes(String(content.examLevel)), "examLevel", "Form thi cần level HSK1–4.");
    addRequired(errors, ["a", "b"].includes(String(content.formKey).toLowerCase()), "formKey", "Form thi cần version A hoặc B.");
    addRequired(errors, Number.isInteger(content.timeLimitMinutes) && Number(content.timeLimitMinutes) >= 10 && Number(content.timeLimitMinutes) <= 180, "timeLimitMinutes", "Thời gian form phải từ 10 đến 180 phút.");
    const itemStableKeys = Array.isArray(content.itemStableKeys) ? content.itemStableKeys : [];
    contextualChinese = itemStableKeys.length >= 12
      && itemStableKeys.every((key) => nonEmpty(key, 160))
      && new Set(itemStableKeys).size === itemStableKeys.length;
    addRequired(errors, contextualChinese, "itemStableKeys", "Form cần ít nhất 12 exam item không trùng.");
    const coverage = asRecord(content.coverage);
    answerIntegrity = Boolean(coverage)
      && ["listening", "reading", "vocabulary", "grammar"].every((skill) =>
        Number.isInteger(coverage?.[skill]) && Number(coverage?.[skill]) >= 3
      );
    addRequired(errors, answerIntegrity, "coverage", "Form cần tối thiểu ba câu cho nghe, đọc, từ vựng và ngữ pháp.");
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

export const studioStarterContent = (itemType: StudioItemType) => ({
  ...(itemType === "vocabulary" ? {
    hanzi: "你好",
    pinyin: "nǐ hǎo",
    meaningVi: "xin chào",
    examples: [{ hanzi: "你好！", pinyin: "Nǐ hǎo!", meaningVi: "Xin chào!" }],
  } : itemType === "character" ? {
    hanzi: "你",
    pinyin: "nǐ",
    meaningVi: "bạn",
    context: { hanzi: "你好", pinyin: "nǐ hǎo", meaningVi: "xin chào" },
  } : itemType === "grammar" ? {
    pattern: "A 是 B",
    explanationVi: "Dùng 是 để nối chủ ngữ với danh từ nhận diện.",
    examples: [{ hanzi: "我是学生。", pinyin: "Wǒ shì xuésheng.", meaningVi: "Tôi là học sinh." }],
  } : itemType === "lesson" ? {
    objectiveVi: "Giới thiệu bản thân bằng câu ngắn.",
    prerequisites: [],
    vocabulary: ["你好", "我", "是"],
    dialogue: [
      { hanzi: "你好！", pinyin: "Nǐ hǎo!", meaningVi: "Xin chào!" },
      { hanzi: "你好，我是安。", pinyin: "Nǐ hǎo, wǒ shì Ān.", meaningVi: "Xin chào, tôi là An." },
    ],
    grammar: [{ pattern: "A 是 B", explanationVi: "Dùng để giới thiệu danh tính." }],
    exercises: [{
      promptVi: "Chọn câu giới thiệu đúng.",
      distractors: ["我很好吗？", "你是学生吗？"],
      answer: "我是学生。",
      explanationVi: "我是学生 dùng 是 để giới thiệu danh tính.",
    }],
  } : itemType === "exam_item" ? {
    skill: "reading",
    promptVi: "Chọn nghĩa đúng của câu.",
    hanzi: "我是学生。",
    options: ["Tôi là học sinh.", "Bạn là giáo viên.", "Tôi không đi học."],
    answerIndex: 0,
    explanationVi: "我 là tôi, 是 là, 学生 là học sinh.",
  } : {
    examLevel: "hsk1",
    formKey: "a",
    timeLimitMinutes: 18,
    itemStableKeys: Array.from({ length: 12 }, (_value, index) =>
      `hsk1-mock-item-${String(index + 1).padStart(2, "0")}`
    ),
    coverage: { listening: 3, reading: 3, vocabulary: 3, grammar: 3 },
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
