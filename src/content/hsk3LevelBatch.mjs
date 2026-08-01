import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK3_LEVEL_BASE_VERSION = "foundation-2026.08.2";
export const HSK3_LEVEL_TARGET_VERSION = "foundation-2026.08.3";
const CURRENT_LOCAL_STUDY_VERSION = "foundation-2026.08.5";
export const HSK3_LEVEL_REVIEW_RELATIVE_PATH =
  "content/review/hsk3-level-batch-local-study-review.json";
export const HSK3_LEVEL_CORE_RELATIVE_PATH =
  "content/runtime/hsk3-level-core-projection.json";
export const HSK3_LEVEL_RICH_RELATIVE_PATH =
  "content/runtime/hsk3-level-rich-lessons.json";
export const HSK3_LEVEL_CHECK_RELATIVE_PATH =
  "content/runtime/hsk3-level-check-local.json";
export const HSK3_LEVEL_PACKAGE_INPUT_DIRECTORY =
  "content/runtime/hsk3-level-package-input";

const PATHS = {
  scope: "content/curriculum/hsk3-scope.json",
  blueprints: "content/drafts/hsk3-lesson-blueprints-2026.07.json",
  vocabulary: "content/drafts/hsk3-vocabulary-2026.07.29.json",
  assessment: "content/drafts/hsk3-level-assessment-2026.07.json",
  inventory: "content/sources/hsk-syllabus-2026/inventory.json",
  paragraphIdentity:
    "content/drafts/hsk3-personal-paragraph-identity-2026.07.json",
  paragraphPersonal:
    "content/drafts/hsk3-personal-paragraph-domain-2026.07.json",
  paragraphStudyWork:
    "content/drafts/hsk3-study-work-paragraph-domain-2026.07.json",
  paragraphNature:
    "content/drafts/hsk3-nature-environment-paragraph-domain-2026.07.json",
  paragraphSociety:
    "content/drafts/hsk3-society-arts-sports-paragraph-domain-2026.07.json",
  paragraphCulture:
    "content/drafts/hsk3-culture-tradition-paragraph-domain-2026.07.json",
  narrationReference:
    "content/drafts/hsk3-reference-quantity-narration-grammar-2026.07.json",
  narrationModality:
    "content/drafts/hsk3-modality-time-narration-grammar-2026.07.json",
  narrationEvents:
    "content/drafts/hsk3-event-complements-narration-grammar-2026.07.json",
  narrationComparison:
    "content/drafts/hsk3-comparison-description-evaluation-narration-grammar-2026.07.json",
  narrationDiscourse:
    "content/drafts/hsk3-discourse-linking-narration-grammar-2026.07.json",
  guidedNotes:
    "content/drafts/hsk3-main-idea-detail-notes-2026.07.json",
  guidedCohesion:
    "content/drafts/hsk3-cohesion-reconstruction-2026.07.json",
  guidedRetelling:
    "content/drafts/hsk3-event-retelling-2026.07.json",
  guidedParagraph:
    "content/drafts/hsk3-guided-paragraph-2026.07.json",
  guidedExplanation:
    "content/drafts/hsk3-structured-explanation-2026.07.json",
  baseCatalog:
    `content/packages/${HSK3_LEVEL_BASE_VERSION}/item-catalog.json`,
  baseRuntimeIds:
    `content/packages/${HSK3_LEVEL_BASE_VERSION}/runtime-ids.json`,
  baseCoverageClaims:
    `content/packages/${HSK3_LEVEL_BASE_VERSION}/coverage-claims.json`,
};

const PARAGRAPH_KEYS = [
  "paragraphIdentity",
  "paragraphPersonal",
  "paragraphStudyWork",
  "paragraphNature",
  "paragraphSociety",
  "paragraphCulture",
];
const NARRATION_KEYS = [
  "narrationReference",
  "narrationModality",
  "narrationEvents",
  "narrationComparison",
  "narrationDiscourse",
];
const GUIDED_KEYS = [
  "guidedNotes",
  "guidedCohesion",
  "guidedRetelling",
  "guidedParagraph",
  "guidedExplanation",
];
const UNIT_ORDER = [
  "hsk3-paragraph-input",
  "hsk3-narration",
  "hsk3-guided-production",
];
const REVIEW_PASSES = [
  "mandarin-accuracy-and-naturalness",
  "pinyin-and-tone-consistency",
  "vietnamese-context-and-clarity",
  "pedagogy-rubric-and-distractors",
  "source-and-level-coverage",
];

const readJson = (root, relativePath) => JSON.parse(readFileSync(
  resolve(root, relativePath),
  "utf8",
));
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const unique = (values) => [...new Set(values.filter(Boolean))];
const duplicateValues = (values) => values.filter(
  (value, index) => values.indexOf(value) !== index,
);
const compactPinyin = (value) => value
  .replace(/[\s'’/-]/gu, "")
  .toLocaleLowerCase("en");

const paragraphLessons = (source) => PARAGRAPH_KEYS.flatMap((key) => {
  const pack = source[key];
  return pack.lessonId ? [pack] : pack.lessons;
});
const narrationLessons = (source) => NARRATION_KEYS.flatMap(
  (key) => source[key].lessons,
);
const guidedLessons = (source) => GUIDED_KEYS.flatMap(
  (key) => source[key].lessons,
);
const guidedTexts = (source) => GUIDED_KEYS.flatMap(
  (key) => source[key].sourceTexts,
);
const promptTextIds = (prompt) => prompt.inputRefs?.map(
  (ref) => ref.textId,
) ?? [prompt.sourceTextId];

export const loadHsk3LevelBatchSources = (root = process.cwd()) => ({
  root,
  ...Object.fromEntries(Object.entries(PATHS).map(([key, relativePath]) => [
    key,
    readJson(root, relativePath),
  ])),
});

const selectedSourceMatch = (lexeme, vocabularyEntry) => {
  const hashes = new Set(lexeme.sourceLineSha256);
  const selected = vocabularyEntry?.sourceMatches?.find((match) =>
    hashes.has(match.sourceLineSha256)
  );
  if (!selected) {
    throw new Error(`${lexeme.officialId} has no selected dictionary source`);
  }
  return selected;
};

const allParagraphLines = (lesson) => lesson.texts.flatMap(
  (text) => text.lines.map((line) => ({ ...line, textId: text.textId })),
);

const assertSourceCoverage = (source) => {
  const blueprints = source.blueprints.lessons;
  const paragraphs = paragraphLessons(source);
  const narrations = narrationLessons(source);
  const guided = guidedLessons(source);
  const lexemes = paragraphs.flatMap((lesson) => lesson.lexemes);
  const characters = source.blueprints.characterAssignments;
  const grammarRows = narrations.flatMap((lesson) => lesson.grammar);
  const taskIds = unique(blueprints.flatMap(
    (lesson) => lesson.inventoryMappings.taskIds,
  ));
  const topicIds = unique(blueprints.flatMap(
    (lesson) => lesson.inventoryMappings.topicIds,
  ));
  const objectiveIds = new Set(source.assessment.forms.find(
    (form) => form.formId === "hsk3-level-form-a",
  )?.sections.filter((section) => section.sectionId.endsWith("-objective"))
    .flatMap((section) => section.itemIds) ?? []);
  const counts = {
    lessons: blueprints.length,
    paragraphs: paragraphs.length,
    narrations: narrations.length,
    guided: guided.length,
    vocabulary: unique(lexemes.map((item) => item.officialId)).length,
    characters: unique(characters.map((item) => item.characterId)).length,
    grammar: unique(grammarRows.map((item) => item.grammarRowId)).length,
    tasks: taskIds.length,
    topics: topicIds.length,
    paragraphLines: paragraphs.reduce(
      (sum, lesson) => sum + allParagraphLines(lesson).length,
      0,
    ),
    narrationLines: narrations.reduce(
      (sum, lesson) => sum + lesson.modelNarration.lines.length,
      0,
    ),
    promptUnits: guided.reduce(
      (sum, lesson) => sum + lesson.promptUnits.length,
      0,
    ),
    assessmentItems: source.assessment.items.length,
    objectiveItems: objectiveIds.size,
  };
  if (!exact(counts, {
    lessons: 55,
    paragraphs: 25,
    narrations: 15,
    guided: 15,
    vocabulary: 500,
    characters: 284,
    grammar: 96,
    tasks: 22,
    topics: 54,
    paragraphLines: 400,
    narrationLines: 90,
    promptUnits: 92,
    assessmentItems: 172,
    objectiveItems: 54,
  })) {
    throw new Error(`HSK3 source coverage has drifted: ${JSON.stringify(counts)}`);
  }
  const unitCounts = Object.fromEntries(UNIT_ORDER.map((unitId) => [
    unitId,
    blueprints.filter((lesson) => lesson.unitId === unitId).length,
  ]));
  if (!exact(unitCounts, {
    "hsk3-paragraph-input": 25,
    "hsk3-narration": 15,
    "hsk3-guided-production": 15,
  })) {
    throw new Error("HSK3 lesson unit distribution has drifted");
  }
  for (const [index, blueprint] of blueprints.entries()) {
    const expected = index === 0 ? [] : [blueprints[index - 1].lessonId];
    if (!exact(blueprint.prerequisiteLessonIds, expected)) {
      throw new Error(`${blueprint.lessonId} prerequisite chain has drifted`);
    }
  }
  return { paragraphs, narrations, guided, lexemes };
};

const projectLexemes = async (source, materialized) => {
  const vocabularyById = new Map(source.vocabulary.entries.map(
    (entry) => [entry.officialId, entry],
  ));
  const lexemes = [];
  for (const paragraph of materialized.paragraphs) {
    const lines = allParagraphLines(paragraph);
    for (const lexeme of paragraph.lexemes) {
      const sourceMatch = selectedSourceMatch(
        lexeme,
        vocabularyById.get(lexeme.officialId),
      );
      const example = lines.find((line) => line.hanzi.includes(lexeme.simplified));
      if (!example) {
        throw new Error(`${lexeme.officialId} has no contextual HSK3 example`);
      }
      const payload = {
        simplified: lexeme.simplified,
        traditional: sourceMatch.traditional,
        pinyin: compactPinyin(sourceMatch.markedPinyin),
        pinyinNumbered: compactPinyin(sourceMatch.numberedPinyin),
        meaning: lexeme.vietnameseGlossDraft,
        partOfSpeech: lexeme.officialPartOfSpeech
          ? `HSK3 · ${lexeme.officialPartOfSpeech}`
          : "HSK3 · cụm từ",
        example: example.hanzi,
        examplePinyin: example.pinyin,
        exampleMeaning: example.vietnamese,
        hsk: 3,
        tags: ["hsk3", "tự học local", "đoạn văn có ngữ cảnh"],
      };
      lexemes.push({
        authoringItemId: lexeme.officialId,
        sourceLessonId: paragraph.lessonId,
        payload,
        payloadSha256: await sha256Json({ itemType: "lexeme", payload }),
      });
    }
  }
  return lexemes;
};

const lessonText = (source, blueprint, materialized) => {
  const paragraph = materialized.paragraphs.find(
    (item) => item.lessonId === blueprint.lessonId,
  );
  if (paragraph) return allParagraphLines(paragraph).map((line) => line.hanzi).join(" ");
  const narration = materialized.narrations.find(
    (item) => item.lessonId === blueprint.lessonId,
  );
  if (narration) {
    return [
      ...narration.modelNarration.lines.map((line) => line.hanzi),
      ...narration.grammar.flatMap((item) => [
        item.example.hanzi,
        item.paragraphPractice.correctAnswerHanzi,
      ]),
    ].join(" ");
  }
  const guided = materialized.guided.find(
    (item) => item.lessonId === blueprint.lessonId,
  );
  const textIds = unique(guided.promptUnits.flatMap((prompt) =>
    promptTextIds(prompt)
  ));
  return guidedTexts(source)
    .filter((text) => textIds.includes(text.textId))
    .flatMap((text) => text.text.lines.map((line) => line.hanzi))
    .join(" ");
};

const projectLessons = async (source, lexemes, materialized) => {
  const hsk3Lexemes = new Map(lexemes.map((item) => [
    item.authoringItemId,
    item,
  ]));
  const lessons = [];
  for (const [index, blueprint] of source.blueprints.lessons.entries()) {
    const direct = blueprint.inventoryMappings.vocabularyIds;
    const text = lessonText(source, blueprint, materialized);
    const contextual = lexemes.filter((item) =>
      text.includes(item.payload.simplified)
    ).map((item) => item.authoringItemId);
    const wordIds = unique([...direct, ...contextual]);
    if (wordIds.length === 0 || wordIds.some((id) => !hsk3Lexemes.has(id))) {
      throw new Error(`${blueprint.lessonId} has incomplete vocabulary context`);
    }
    const payload = {
      unitId: blueprint.unitId,
      title: blueprint.titleVi,
      chineseTitle: `HSK三级 · ${String(index + 1).padStart(2, "0")}`,
      objective: blueprint.objectiveVi,
      minutes: blueprint.unitId === "hsk3-paragraph-input"
        ? 38
        : blueprint.unitId === "hsk3-narration" ? 42 : 45,
      xp: blueprint.unitId === "hsk3-paragraph-input"
        ? 190
        : blueprint.unitId === "hsk3-narration" ? 210 : 225,
      wordIds,
      skills: blueprint.unitId === "hsk3-paragraph-input"
        ? ["vocabulary", "listening", "reading", "writing"]
        : blueprint.unitId === "hsk3-narration"
          ? ["vocabulary", "grammar", "listening", "speaking", "writing"]
          : ["vocabulary", "listening", "reading", "speaking", "writing"],
    };
    const prerequisites = [{
      itemType: "lesson",
      itemId: index === 0
        ? "hsk2-picture-description-lesson-02"
        : blueprint.prerequisiteLessonIds[0],
    }];
    lessons.push({
      authoringLessonId: blueprint.lessonId,
      runtimeLessonId: blueprint.lessonId,
      unitId: blueprint.unitId,
      sequence: blueprint.sequence,
      prerequisites,
      knowledgeItems: wordIds.map((itemId) => ({
        itemType: "lexeme",
        itemId,
      })),
      officialVocabularyIds: blueprint.inventoryMappings.vocabularyIds,
      officialCharacterIds: blueprint.inventoryMappings.recognitionCharacterIds,
      officialGrammarRowIds: blueprint.inventoryMappings.grammarRowIds,
      officialTaskIds: blueprint.inventoryMappings.taskIds,
      officialTopicIds: blueprint.inventoryMappings.topicIds,
      hsk3VocabularyContextCount: wordIds.length,
      payload,
      payloadSha256: await sha256Json({ itemType: "lesson", payload }),
    });
  }
  return lessons;
};

const projectReview = async (source, lexemes, lessons, materialized) => {
  const coverage = {
    lessons: lessons.length,
    paragraphInputLessons: materialized.paragraphs.length,
    narrationLessons: materialized.narrations.length,
    guidedProductionLessons: materialized.guided.length,
    vocabulary: lexemes.length,
    recognitionCharacters: source.blueprints.characterAssignments.length,
    grammarRows: materialized.narrations.flatMap((item) => item.grammar).length,
    tasks: unique(lessons.flatMap((item) => item.officialTaskIds)).length,
    topics: unique(lessons.flatMap((item) => item.officialTopicIds)).length,
    paragraphLines: materialized.paragraphs.reduce(
      (sum, lesson) => sum + allParagraphLines(lesson).length,
      0,
    ),
    narrationLines: materialized.narrations.reduce(
      (sum, lesson) => sum + lesson.modelNarration.lines.length,
      0,
    ),
    guidedPromptUnits: materialized.guided.reduce(
      (sum, lesson) => sum + lesson.promptUnits.length,
      0,
    ),
    localLevelCheckObjectiveItems: 54,
    fullAssessmentDraftItems: source.assessment.items.length,
  };
  const payload = {
    schemaVersion: 1,
    reviewId: "hsk3-level-batch-local-study-review-2026.08.3",
    profileId: "hsk0-4-personal-study-2026.07.1",
    level: "HSK3",
    targetContentVersion: HSK3_LEVEL_TARGET_VERSION,
    reviewedAt: "2026-08-01T15:00:00.000Z",
    state: "ai-reviewed-for-personal-local-study",
    reviewer: {
      reviewerId: "openai-codex-ai-assisted-review",
      reviewerKind: "ai-coding-agent",
      humanReviewed: false,
      disclosureVi:
        "Nội dung được Codex tự rà soát năm pass cho mục đích tự học local; chưa được người bản ngữ kiểm duyệt.",
    },
    sourceBindings: Object.entries(PATHS)
      .filter(([key]) => !key.startsWith("base"))
      .map(([id, relativePath]) => ({
        id,
        relativePath,
        sha256: fileSha256(resolve(source.root, relativePath)),
      })),
    coverage,
    coverageDigest: await sha256Json({
      lessonIds: lessons.map((item) => item.runtimeLessonId),
      vocabularyIds: lexemes.map((item) => item.authoringItemId),
      characterIds: source.blueprints.characterAssignments.map(
        (item) => item.characterId,
      ),
      grammarIds: materialized.narrations.flatMap((lesson) =>
        lesson.grammar.map((item) => item.grammarRowId)
      ),
      taskIds: unique(lessons.flatMap((item) => item.officialTaskIds)),
      topicIds: unique(lessons.flatMap((item) => item.officialTopicIds)),
    }),
    reviewResult: {
      mode: "ai-assisted-self-review",
      aiAssistedDisclosed: true,
      humanReviewed: false,
      unresolvedIssueCount: 0,
      passResults: Object.fromEntries(REVIEW_PASSES.map((pass) => [
        pass,
        "passed-for-personal-local-study",
      ])),
    },
    findings: {
      resolved: [
        {
          findingId: "hsk3-drafts-not-runtime-visible",
          pass: "source-and-level-coverage",
          resolution:
            "Đưa đủ 55 blueprint và inventory HSK3 vào package local kế tiếp, giữ nguyên pipeline hiện có.",
        },
        {
          findingId: "hsk3-constructed-response-not-calibrated",
          pass: "pedagogy-rubric-and-distractors",
          resolution:
            "Giữ phần nói và viết ở chế độ luyện tập có gợi ý và tự sửa; không cấp mastery trước human review.",
        },
        {
          findingId: "hsk3-browser-audio-synthetic",
          pass: "mandarin-accuracy-and-naturalness",
          resolution:
            "Browser TTS chỉ hỗ trợ luyện nghe/đọc, không được coi là audio người thật hay bằng chứng phát âm.",
        },
      ],
      unresolved: [],
    },
    claims: {
      readyForPersonalLocalStudyPackaging: true,
      browserTtsPracticeOnly: true,
      nativeAudio: false,
      measurementEligible: false,
      masteryEligible: false,
      prerequisiteWaiverEligible: false,
      officialHskCertification: false,
      productionEligible: false,
      sitesAuthorized: false,
    },
  };
  return { ...payload, reviewSha256: await sha256Json(payload) };
};

export const projectHsk3LevelBatch = async (
  source = loadHsk3LevelBatchSources(),
) => {
  const materialized = assertSourceCoverage(source);
  const lexemes = await projectLexemes(source, materialized);
  const lessons = await projectLessons(source, lexemes, materialized);
  const review = await projectReview(source, lexemes, lessons, materialized);
  const corePayload = {
    schemaVersion: 1,
    projectionId: "hsk3-level-core-projection-2026.08.3",
    targetContentVersion: HSK3_LEVEL_TARGET_VERSION,
    state: "ai-reviewed-for-personal-local-study",
    lexemes,
    lessons,
    counts: {
      lessons: 55,
      paragraphInputLessons: 25,
      narrationLessons: 15,
      guidedProductionLessons: 15,
      vocabulary: 500,
      recognitionCharacters: 284,
      grammarRows: 96,
      tasks: 22,
      topics: 54,
      levelCheckObjectiveItems: 54,
      guidedPromptUnits: 92,
    },
    policy: {
      aiAssistedReview: true,
      humanReviewed: false,
      learnerVisibleBeforeAuthorization: false,
      browserTtsPracticeOnly: true,
      measurementEligible: false,
      masteryEligible: false,
      productionEligible: false,
      sitesAuthorized: false,
    },
  };
  return {
    review,
    core: {
      ...corePayload,
      integritySha256: await sha256Json(corePayload),
    },
  };
};

export const loadHsk3LevelBatchBundle = (root = process.cwd()) => ({
  source: loadHsk3LevelBatchSources(root),
  review: readJson(root, HSK3_LEVEL_REVIEW_RELATIVE_PATH),
  core: readJson(root, HSK3_LEVEL_CORE_RELATIVE_PATH),
});

export const validateHsk3LevelBatchBundle = async (bundle) => {
  const errors = [];
  let expected;
  try {
    expected = await projectHsk3LevelBatch(bundle.source);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }
  if (
    bundle.review?.reviewer?.humanReviewed !== false
    || bundle.review?.reviewResult?.unresolvedIssueCount !== 0
    || bundle.review?.claims?.productionEligible !== false
    || !exact(bundle.core?.counts, expected.core.counts)
  ) {
    errors.push("HSK3 level batch shape is invalid");
  }
  if (!exact(bundle.review, expected.review)) {
    errors.push("HSK3 level review does not match exact selected sources");
  }
  if (!exact(bundle.core, expected.core)) {
    errors.push("HSK3 level core projection does not match reviewed payloads");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expected.core.counts,
  };
};

export const projectHsk3LevelPackageInputs = async (
  source = loadHsk3LevelBatchSources(),
) => {
  const { review, core } = await projectHsk3LevelBatch(source);
  const inheritedItems = source.baseCatalog.items.map((item) => ({
    ...structuredClone(item),
    itemVersion: HSK3_LEVEL_TARGET_VERSION,
  }));
  const lexemeItems = core.lexemes.map((lexeme) => ({
    itemKey: `lexeme:${lexeme.authoringItemId}`,
    itemType: "lexeme",
    itemId: lexeme.authoringItemId,
    itemVersion: HSK3_LEVEL_TARGET_VERSION,
    releaseState: "beta",
    payload: lexeme.payload,
    owner: null,
    sourceLicense: null,
    prerequisites: null,
    payloadSha256: lexeme.payloadSha256,
  }));
  const lessonItems = core.lessons.map((lesson) => ({
    itemKey: `lesson:${lesson.runtimeLessonId}`,
    itemType: "lesson",
    itemId: lesson.runtimeLessonId,
    itemVersion: HSK3_LEVEL_TARGET_VERSION,
    releaseState: "beta",
    payload: lesson.payload,
    owner: null,
    sourceLicense: null,
    prerequisites: lesson.prerequisites,
    payloadSha256: lesson.payloadSha256,
    knowledgeItems: lesson.knowledgeItems,
  }));
  const items = [...inheritedItems, ...lexemeItems, ...lessonItems];
  if (duplicateValues(items.map((item) => item.itemKey)).length > 0) {
    throw new Error("HSK3 level package item keys are duplicated");
  }
  const itemCatalog = {
    schemaVersion: 4,
    contentVersion: HSK3_LEVEL_TARGET_VERSION,
    items,
    audioAssets: [...(source.baseCatalog.audioAssets ?? [])],
  };
  const runtimeLessons = core.lessons.map((lesson) => ({
    id: lesson.runtimeLessonId,
    unitId: lesson.payload.unitId,
    prerequisiteIds: lesson.prerequisites.map((item) => item.itemId),
    wordIds: [...lesson.payload.wordIds],
    releaseState: "beta",
  }));
  const runtimeIds = {
    ...source.baseRuntimeIds,
    contentVersion: HSK3_LEVEL_TARGET_VERSION,
    vocabularyIds: [
      ...source.baseRuntimeIds.vocabularyIds,
      ...lexemeItems.map((item) => item.itemId),
    ],
    unitIds: [...source.baseRuntimeIds.unitIds, ...UNIT_ORDER],
    lessons: [...source.baseRuntimeIds.lessons, ...runtimeLessons],
    stories: [...source.baseRuntimeIds.stories],
  };
  if (
    duplicateValues(runtimeIds.vocabularyIds).length > 0
    || duplicateValues(runtimeIds.lessons.map((item) => item.id)).length > 0
    || runtimeIds.vocabularyIds.length !== 1016
    || runtimeIds.lessons.length !== 139
  ) {
    throw new Error("HSK3 level runtime IDs are invalid");
  }
  const coverageClaims = {
    ...source.baseCoverageClaims,
    contentVersion: HSK3_LEVEL_TARGET_VERSION,
    itemCatalogSha256: await sha256Json(itemCatalog),
    coverageClaims: [
      ...source.baseCoverageClaims.coverageClaims,
      {
        claimId: "hsk3-personal-local-study-full-inventory-2026.08.3",
        framework: "CTI HSK 3.0 pinned 2026",
        level: "HSK3",
        evidenceRef: HSK3_LEVEL_REVIEW_RELATIVE_PATH,
        itemKeys: [
          ...lexemeItems.map((item) => item.itemKey),
          ...lessonItems.map((item) => item.itemKey),
        ],
        entryLessonKeys: [
          "lesson:hsk3-personal-life-narratives-identity-transactions",
        ],
        terminalLessonKeys: [
          "lesson:hsk3-structured-explanation-lesson-03",
        ],
      },
    ],
  };
  return {
    itemCatalog,
    runtimeIds,
    coverageClaims,
    summary: {
      inheritedItems: inheritedItems.length,
      officialVocabularyItems: lexemeItems.length,
      hsk3Lessons: lessonItems.length,
      runtimeVocabularyIds: runtimeIds.vocabularyIds.length,
      runtimeLessons: runtimeIds.lessons.length,
      humanReviewed: review.reviewer.humanReviewed,
      productionEligible: review.claims.productionEligible,
    },
  };
};

export const validateMaterializedHsk3LevelPackage = async (
  root = process.cwd(),
) => {
  const expected = await projectHsk3LevelPackageInputs(
    loadHsk3LevelBatchSources(root),
  );
  const packageRoot = `content/packages/${HSK3_LEVEL_TARGET_VERSION}`;
  const actual = {
    itemCatalog: readJson(root, `${packageRoot}/item-catalog.json`),
    runtimeIds: readJson(root, `${packageRoot}/runtime-ids.json`),
    coverageClaims: readJson(root, `${packageRoot}/coverage-claims.json`),
  };
  const errors = [];
  if (!exact(actual.itemCatalog, expected.itemCatalog)) {
    errors.push("materialized HSK3 level item catalog has drifted");
  }
  if (!exact(actual.runtimeIds, expected.runtimeIds)) {
    errors.push("materialized HSK3 level runtime IDs have drifted");
  }
  if (!exact(actual.coverageClaims, expected.coverageClaims)) {
    errors.push("materialized HSK3 level coverage claims have drifted");
  }
  return { valid: errors.length === 0, errors, summary: expected.summary };
};

const turn = (line, speaker = "A") => ({
  speaker,
  hanzi: line.hanzi,
  pinyin: line.pinyin,
  meaningVi: line.vietnamese ?? line.meaningVi,
});

const supplementalPattern = (lessonId, line, label) => ({
  id: `hsk3-pattern:${lessonId}`,
  category: "Liên kết đoạn HSK3",
  label,
  officialContent: "supplemental-local-study-pattern",
  explanationVi:
    "Theo dõi thứ tự thông tin, từ nối và quan hệ nguyên nhân–kết quả trong đoạn; sau đó đổi chi tiết và tự sửa trước khi xem mẫu.",
  modelExample: turn(line),
  guidedPractice: {
    promptVi: "Đổi một chi tiết rồi nối thêm một câu có quan hệ rõ ràng.",
    modelAnswerHanzi: line.hanzi,
    modelAnswerPinyin: line.pinyin,
    modelAnswerMeaningVi: line.vietnamese ?? line.meaningVi,
  },
});

const officialGrammarPoint = (item) => ({
  id: item.grammarRowId,
  category: item.categoryName ?? item.category ?? "Ngữ pháp",
  label: item.detail ?? item.officialContent,
  officialContent: item.officialContent,
  explanationVi: `${item.explanationVi} ${item.usageBoundaryVi}`,
  modelExample: turn(item.example),
  guidedPractice: {
    promptVi: item.paragraphPractice.contextHanzi,
    modelAnswerHanzi: item.paragraphPractice.correctAnswerHanzi,
    modelAnswerPinyin: item.paragraphPractice.answerPinyin,
    modelAnswerMeaningVi: item.explanationVi,
  },
});

const lessonCharacters = (source, blueprint, lexemeById) =>
  source.blueprints.characterAssignments
    .filter((item) => item.lessonId === blueprint.lessonId)
    .map((item) => {
      const lexeme = lexemeById.get(item.sourceVocabularyId)
        ?? lexemeById.get(blueprint.inventoryMappings.vocabularyIds[0]);
      return {
        id: item.characterId,
        hanzi: item.character,
        pinyin: lexeme.payload.pinyin,
        meaningVi: lexeme.payload.meaning,
        contextWord: lexeme.payload.simplified,
        contextPinyin: lexeme.payload.pinyin,
        contextMeaningVi: lexeme.payload.meaning,
      };
    });

export const projectHsk3LevelRichLessons = async (
  source = loadHsk3LevelBatchSources(),
) => {
  const { review, core } = await projectHsk3LevelBatch(source);
  const authorization = readJson(
    source.root,
    "content/curriculum/hsk0-4-local-study-authorizations.json",
  );
  const hsk3Authorizations = authorization.authorizations?.filter(
    (item) => item.unitId.startsWith("hsk3-"),
  ) ?? [];
  if (
    authorization.runtimeContentVersion !== CURRENT_LOCAL_STUDY_VERSION
    || hsk3Authorizations.length !== 3
    || hsk3Authorizations.reduce(
      (sum, item) => sum + item.lessonIds.length,
      0,
    ) !== 55
    || authorization.policy?.humanReviewed !== false
    || authorization.policy?.grantsProductionEligibility !== false
  ) {
    throw new Error("HSK3 rich lessons are not locally authorized");
  }
  const materialized = assertSourceCoverage(source);
  const paragraphById = new Map(materialized.paragraphs.map(
    (lesson) => [lesson.lessonId, lesson],
  ));
  const narrationById = new Map(materialized.narrations.map(
    (lesson) => [lesson.lessonId, lesson],
  ));
  const guidedById = new Map(materialized.guided.map(
    (lesson) => [lesson.lessonId, lesson],
  ));
  const textById = new Map(guidedTexts(source).map(
    (item) => [item.textId, item.text],
  ));
  const lexemeById = new Map([
    ...source.baseCatalog.items
      .filter((item) => item.itemType === "lexeme")
      .map((item) => [item.itemId, { payload: item.payload }]),
    ...core.lexemes.map((item) => [item.authoringItemId, item]),
  ]);
  const taskById = new Map(source.inventory.tasks.map((item) => [item.id, item]));
  const topicById = new Map(source.inventory.topics.map((item) => [item.id, item]));
  const lessons = core.lessons.map((coreLesson) => {
    const blueprint = source.blueprints.lessons.find(
      (item) => item.lessonId === coreLesson.authoringLessonId,
    );
    const paragraph = paragraphById.get(blueprint.lessonId);
    const narration = narrationById.get(blueprint.lessonId);
    const guided = guidedById.get(blueprint.lessonId);
    let dialogue;
    let grammar;
    let tasks;
    if (paragraph) {
      const lines = allParagraphLines(paragraph).slice(0, 8);
      dialogue = lines.map((line, index) => turn(line, index % 2 ? "B" : "A"));
      grammar = [supplementalPattern(
        blueprint.lessonId,
        lines[0],
        "Đọc đoạn, tìm ý chính và chi tiết hỗ trợ",
      )];
      tasks = [{
        id: `hsk3-paragraph-task:${blueprint.lessonId}`,
        titleVi: `Ghi chú và tóm lược: ${blueprint.titleVi}`,
        instructionVi: paragraph.guidedSummaries[0]?.promptVi
          ?? "Ghi ý chính, hai chi tiết hỗ trợ rồi tóm lược đoạn bằng 3–4 câu.",
        targetFunctions: [
          "main-idea-detail-notes",
          "guided-summary",
          "self-reveal-revision",
        ],
        modelDialogue: dialogue,
      }];
    } else if (narration) {
      dialogue = narration.modelNarration.lines.map(
        (line, index) => turn(line, index % 2 ? "B" : "A"),
      );
      grammar = narration.grammar.map(officialGrammarPoint);
      const officialTasks = blueprint.inventoryMappings.taskIds.map((id) =>
        taskById.get(id)
      );
      tasks = officialTasks.map((item) => ({
        id: item.id,
        titleVi: item.title,
        instructionVi:
          `Tường thuật theo chủ đề “${item.title}”, dùng ít nhất hai mẫu ngữ pháp của bài; tự đối chiếu thứ tự sự kiện trước khi xem mẫu.`,
        targetFunctions: ["ordered-narration", "grammar-in-paragraph", "self-reveal-revision"],
        modelDialogue: dialogue,
      }));
      if (tasks.length === 0) {
        throw new Error(`${blueprint.lessonId} has no official narration task`);
      }
    } else {
      const firstPrompt = guided.promptUnits[0];
      const sourceText = textById.get(promptTextIds(firstPrompt)[0]);
      const lines = sourceText.lines.slice(0, 8);
      dialogue = lines.map((line, index) => turn(line, index % 2 ? "B" : "A"));
      grammar = [supplementalPattern(
        blueprint.lessonId,
        lines[0],
        "Dựng đoạn có mở–thân–kết và bằng chứng nguồn",
      )];
      tasks = [{
        id: firstPrompt.itemId,
        titleVi: blueprint.titleVi,
        instructionVi: firstPrompt.promptVi,
        targetFunctions: [
          firstPrompt.promptKind,
          firstPrompt.responseMode,
          "self-reveal-revision",
        ],
        modelDialogue: dialogue,
      }];
    }
    const topics = blueprint.inventoryMappings.topicIds.map((id) => {
      const item = topicById.get(id);
      return {
        id,
        group: item.group,
        officialTopic: item.topic,
        promptVi: `Đọc, ghi ý và trao đổi trong phạm vi chủ đề ${item.topic}.`,
      };
    });
    return {
      lessonId: coreLesson.runtimeLessonId,
      authoringLessonId: coreLesson.authoringLessonId,
      dialogue,
      grammar,
      topics,
      tasks,
      characters: lessonCharacters(source, blueprint, lexemeById),
    };
  });
  const counts = {
    lessons: lessons.length,
    paragraphInputLessons: materialized.paragraphs.length,
    narrationLessons: materialized.narrations.length,
    guidedProductionLessons: materialized.guided.length,
    dialogueTurns: lessons.reduce(
      (sum, lesson) => sum + lesson.dialogue.length,
      0,
    ),
    richLessons: lessons.filter((lesson) =>
      lesson.dialogue.length > 0
      && lesson.grammar.length > 0
      && lesson.tasks.length > 0
    ).length,
    officialGrammarRows: unique(lessons.flatMap((lesson) =>
      lesson.grammar.map((item) => item.id)
        .filter((id) => id.startsWith("hsk3-grammar-row-"))
    )).length,
    officialTasks: unique(lessons.flatMap((lesson) =>
      lesson.tasks.map((item) => item.id)
        .filter((id) => id.startsWith("hsk3-task-"))
    )).length,
    officialTopics: unique(lessons.flatMap((lesson) =>
      lesson.topics.map((item) => item.id)
    )).length,
    officialCharacters: unique(lessons.flatMap((lesson) =>
      lesson.characters.map((item) => item.id)
    )).length,
    guidedPromptUnits: materialized.guided.reduce(
      (sum, lesson) => sum + lesson.promptUnits.length,
      0,
    ),
  };
  if (!exact(counts, {
    lessons: 55,
    paragraphInputLessons: 25,
    narrationLessons: 15,
    guidedProductionLessons: 15,
    dialogueTurns: 410,
    richLessons: 55,
    officialGrammarRows: 96,
    officialTasks: 22,
    officialTopics: 54,
    officialCharacters: 284,
    guidedPromptUnits: 92,
  })) {
    throw new Error(`HSK3 rich coverage is incomplete: ${JSON.stringify(counts)}`);
  }
  const payload = {
    schemaVersion: 1,
    presentationId: "hsk3-level-rich-lessons-2026.08.3",
    contentVersion: CURRENT_LOCAL_STUDY_VERSION,
    level: "HSK3",
    state: "authorized-for-personal-local-study",
    disclosure: {
      reviewVi:
        "Nội dung được Codex rà soát bằng AI cho mục đích tự học; humanReviewed=false.",
      audioVi:
        "Nút nghe dùng giọng TTS tổng hợp của trình duyệt để luyện tập và không tạo bằng chứng nghe hoặc phát âm.",
      levelCheckVi:
        "Level check HSK3 là self-check local chưa nghiệm chuẩn; kết quả không cấp mastery, bỏ prerequisite hoặc chứng nhận HSK.",
    },
    policy: {
      learnerVisibleForPersonalLocalStudy: true,
      humanReviewed: false,
      browserTtsPracticeOnly: true,
      measurementEligible: false,
      masteryEligible: false,
      prerequisiteWaiverEligible: false,
      productionEligible: false,
      sitesAuthorized: false,
    },
    reviewBinding: {
      reviewId: review.reviewId,
      reviewSha256: review.reviewSha256,
    },
    authorizationBinding: {
      authorizationId: authorization.authorizationId,
      authorizationSha256: authorization.authorizationSha256,
    },
    counts,
    lessons,
  };
  return { ...payload, integritySha256: await sha256Json(payload) };
};

export const validateHsk3LevelRichLessons = async (
  root = process.cwd(),
) => {
  const expected = await projectHsk3LevelRichLessons(
    loadHsk3LevelBatchSources(root),
  );
  const actual = readJson(root, HSK3_LEVEL_RICH_RELATIVE_PATH);
  const errors = [];
  if (!exact(actual, expected)) {
    errors.push("HSK3 rich lesson presentation does not match reviewed sources");
  }
  if (
    actual?.policy?.humanReviewed !== false
    || actual?.policy?.browserTtsPracticeOnly !== true
    || actual?.policy?.measurementEligible !== false
    || actual?.counts?.lessons !== 55
    || actual?.counts?.richLessons !== 55
  ) {
    errors.push("HSK3 rich lesson presentation policy is invalid");
  }
  return { valid: errors.length === 0, errors, summary: expected.counts };
};

export const projectHsk3LocalLevelCheck = async (
  source = loadHsk3LevelBatchSources(),
) => {
  const objectiveIds = new Set(source.assessment.forms.find(
    (form) => form.formId === "hsk3-level-form-a",
  ).sections.filter((section) => section.sectionId.endsWith("-objective"))
    .flatMap((section) => section.itemIds));
  const unitByLessonId = new Map(source.blueprints.lessons.map((lesson) => [
    lesson.lessonId,
    lesson.unitId,
  ]));
  const items = source.assessment.items.filter((item) =>
    objectiveIds.has(item.itemId)
  ).map((item) => {
    const stimulusText = item.stimulus.transcriptHanzi
      ?? item.stimulus.text
      ?? item.stimulus.lines?.map((line) => line.hanzi).join(" ")
      ?? "";
    const pinyinReference = item.stimulus.transcriptPinyin
      ?? item.stimulus.pinyinAuthoringReference
      ?? item.stimulus.lines?.map((line) => line.pinyin).join(" ")
      ?? null;
    const sourceUnitId = unitByLessonId.get(item.source.lessonId);
    const correct = item.options?.find((option) =>
      option.optionId === item.correctOptionId
    );
    if (!stimulusText || !sourceUnitId || !correct || item.options?.length !== 4) {
      throw new Error(`${item.itemId} has incomplete HSK3 level-check context`);
    }
    return {
      id: item.itemId,
      sourceItemVersion: item.itemVersion,
      skill: item.skill,
      construct: item.construct,
      promptVi: item.promptVi,
      stimulusText,
      pinyinReference,
      syntheticTtsText: item.skill === "listening" ? stimulusText : null,
      options: item.options.map((option) => ({ ...option })),
      correctOptionId: item.correctOptionId,
      explanationVi: `“${stimulusText}”${pinyinReference ? ` (${pinyinReference})` : ""}: ${correct.text}`,
      sourceLessonId: item.source.lessonId,
      sourceUnitId,
      measurementEligible: false,
      masteryEligible: false,
      prerequisiteWaiverEligible: false,
    };
  });
  const skillCounts = Object.fromEntries([
    "listening", "reading", "vocabulary", "grammar",
  ].map((skill) => [skill, items.filter((item) => item.skill === skill).length]));
  if (items.length !== 54 || !exact(skillCounts, {
    listening: 12,
    reading: 12,
    vocabulary: 15,
    grammar: 15,
  })) throw new Error("HSK3 local level-check objective coverage is incomplete");
  const payload = {
    schemaVersion: 1,
    bankId: source.assessment.bankId,
    formId: "hsk3-level-form-a",
    contentVersion: CURRENT_LOCAL_STUDY_VERSION,
    state: "ai-reviewed-for-personal-local-self-check",
    disclosure: {
      humanReviewed: false,
      browserTtsPracticeOnly: true,
      measurementEligible: false,
      masteryEligible: false,
      prerequisiteWaiverEligible: false,
    },
    counts: { items: items.length, ...skillCounts },
    items,
  };
  return { ...payload, integritySha256: await sha256Json(payload) };
};

export const validateHsk3LocalLevelCheck = async (root = process.cwd()) => {
  const expected = await projectHsk3LocalLevelCheck(loadHsk3LevelBatchSources(root));
  const actual = readJson(root, HSK3_LEVEL_CHECK_RELATIVE_PATH);
  const errors = [];
  if (!exact(actual, expected)) errors.push("HSK3 local level-check artifact has drifted");
  if (actual.disclosure?.humanReviewed !== false || actual.counts?.items !== 54) {
    errors.push("HSK3 local level-check disclosure is invalid");
  }
  return { valid: errors.length === 0, errors, summary: expected.counts };
};
