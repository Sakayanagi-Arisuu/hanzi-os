import {
  HSK_BUILT_IN_EXAM_FORM_KEYS,
  HSK_STANDARD_EXAM_STRUCTURE,
  hskStandardItemCount,
  isHskExamFormKey,
  isHskExamLevel,
  type HskExamFormKey,
} from "../assessment/hskExamStructure";

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
  lesson: {
    module: "Thiên Lộ",
    label: "Bài học",
    description: "Mục tiêu, từ mới, hội thoại, ngữ pháp và bài tập trong một bài.",
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
  } else {
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
  return ({
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
