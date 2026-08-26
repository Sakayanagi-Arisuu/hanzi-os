import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK4_LEVEL_BASE_VERSION = "foundation-2026.08.3";
export const HSK4_LEVEL_TARGET_VERSION = "foundation-2026.08.4";
const CURRENT_LOCAL_STUDY_VERSION = "foundation-2026.08.7";
export const HSK4_LEVEL_REVIEW_RELATIVE_PATH =
  "content/review/hsk4-level-batch-local-study-review.json";
export const HSK4_LEVEL_CORE_RELATIVE_PATH =
  "content/runtime/hsk4-level-core-projection.json";
export const HSK4_LEVEL_RICH_RELATIVE_PATH =
  "content/runtime/hsk4-level-rich-lessons.json";
export const HSK4_LEVEL_CHECK_RELATIVE_PATH =
  "content/runtime/hsk4-level-check-local.json";
export const HSK4_LEVEL_PACKAGE_INPUT_DIRECTORY =
  "content/runtime/hsk4-level-package-input";

const LONG_NAMES = [
  "personal-community",
  "education-work",
  "nature-technology",
  "society-economy",
  "arts-sports-exchange",
  "culture-history",
];
const SUMMARY_NAMES = [
  "precision-reference-quantity",
  "stance-comparison-rhetoric",
  "event-agency-voice",
  "information-order-cohesion",
  "argument-logic-concession",
];
const INTEGRATION_NAMES = [
  "long-input-structure-map",
  "inference-evidence-check",
  "cross-text-synthesis",
  "structured-written-argument",
  "structured-spoken-defense",
  "timed-sectional-rehearsal",
];
const PATHS = {
  scope: "content/curriculum/hsk4-scope.json",
  blueprints: "content/drafts/hsk4-lesson-blueprints-2026.07.json",
  vocabulary: "content/drafts/hsk4-vocabulary-2026.07.29.json",
  languageSupport: "content/drafts/hsk4-local-language-support-2026.08.json",
  assessment: "content/drafts/hsk4-level-assessment-2026.07.json",
  inventory: "content/sources/hsk-syllabus-2026/inventory.json",
  ...Object.fromEntries(LONG_NAMES.map((name) => [
    `long:${name}`,
    `content/drafts/hsk4-${name}-long-form-2026.07.json`,
  ])),
  ...Object.fromEntries(SUMMARY_NAMES.map((name) => [
    `summary:${name}`,
    `content/drafts/hsk4-${name}-summary-argument-2026.07.json`,
  ])),
  ...Object.fromEntries(INTEGRATION_NAMES.map((name) => [
    `integration:${name}`,
    `content/drafts/hsk4-${name}-integration-2026.07.json`,
  ])),
  baseCatalog: `content/packages/${HSK4_LEVEL_BASE_VERSION}/item-catalog.json`,
  baseRuntimeIds: `content/packages/${HSK4_LEVEL_BASE_VERSION}/runtime-ids.json`,
  baseCoverageClaims:
    `content/packages/${HSK4_LEVEL_BASE_VERSION}/coverage-claims.json`,
};
const UNIT_ORDER = [
  "hsk4-deep-comprehension",
  "hsk4-summary-argument",
  "hsk4-timed-integration",
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
const duplicates = (values) => values.filter(
  (value, index) => values.indexOf(value) !== index,
);
const compactPinyin = (value) => value
  .replace(/[\s'’/-]/gu, "")
  .toLocaleLowerCase("en");
const primaryOfficialPinyin = (value) => value.split(/[/、]/u)[0].trim();
const stripMarkedPinyin = (value) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/gu, "")
  .replace(/[^a-z]/giu, "")
  .toLocaleLowerCase("en");
const numberedBase = (value) => value
  .replace(/[1-5\s'’/-]/gu, "")
  .replace(/u:|v/giu, "u")
  .toLocaleLowerCase("en");
const toneMark = (value) => {
  const normalized = value.normalize("NFD");
  if (normalized.includes("\u0304")) return 1;
  if (normalized.includes("\u0301")) return 2;
  if (normalized.includes("\u030C")) return 3;
  if (normalized.includes("\u0300")) return 4;
  return 5;
};
const numberedForOfficial = (officialPinyin, sourceNumbered) => {
  const primary = primaryOfficialPinyin(officialPinyin);
  const sourceSyllables = [...sourceNumbered.matchAll(
    /([A-Za-züÜvV:]+)[1-5]/gu,
  )].map((match) => match[1]);
  if (!sourceSyllables.length) return sourceNumbered;
  const characters = [];
  for (const character of primary.normalize("NFD")) {
    if (/^[a-z]$/iu.test(character)) characters.push([character]);
    else if (characters.length) characters.at(-1).push(character);
  }
  let cursor = 0;
  const projected = sourceSyllables.map((syllable) => {
    const length = numberedBase(syllable).length;
    const slice = characters.slice(cursor, cursor + length)
      .flat().join("").normalize("NFC");
    cursor += length;
    return `${syllable}${toneMark(slice)}`;
  }).join("");
  return numberedBase(projected) === stripMarkedPinyin(primary)
    ? projected
    : sourceNumbered;
};

export const loadHsk4LevelBatchSources = (root = process.cwd()) => ({
  root,
  ...Object.fromEntries(Object.entries(PATHS).map(([key, relativePath]) => [
    key,
    readJson(root, relativePath),
  ])),
});

const packsFor = (source, prefix) => Object.entries(source)
  .filter(([key]) => key.startsWith(`${prefix}:`))
  .map(([, pack]) => pack);
const longLessons = (source) => packsFor(source, "long")
  .flatMap((pack) => pack.lessons);
const summaryLessons = (source) => packsFor(source, "summary")
  .flatMap((pack) => pack.lessons);
const integrationLessons = (source) => packsFor(source, "integration")
  .flatMap((pack) => pack.lessons);
const allTexts = (source) => longLessons(source)
  .flatMap((lesson) => lesson.texts);

const assertSourceCoverage = (source) => {
  const blueprints = source.blueprints.lessons;
  const long = longLessons(source);
  const summaries = summaryLessons(source);
  const integrations = integrationLessons(source);
  const grammarRows = summaries.flatMap((lesson) => lesson.grammarTargets);
  const promptUnits = integrations.flatMap((lesson) => lesson.promptUnits);
  const objectiveItems = source.assessment.forms.find(
    (form) => form.formId === "hsk4-level-form-a",
  ).sections.filter((section) => section.sectionId.endsWith("-objective"))
    .flatMap((section) => section.itemIds);
  const counts = {
    lessons: blueprints.length,
    deepComprehension: long.length,
    summaryArgument: summaries.length,
    timedIntegration: integrations.length,
    vocabulary: source.languageSupport.vocabulary.length,
    characters: unique(source.blueprints.characterAssignments.map(
      (item) => item.characterId,
    )).length,
    grammar: unique(grammarRows.map((item) => item.grammarRowId)).length,
    tasks: unique(blueprints.flatMap(
      (item) => item.inventoryMappings.taskIds,
    )).length,
    topics: unique(blueprints.flatMap(
      (item) => item.inventoryMappings.topicIds,
    )).length,
    longParagraphs: long.reduce((sum, lesson) => sum
      + lesson.texts.reduce((textSum, text) => textSum + text.paragraphs.length, 0), 0),
    promptUnits: promptUnits.length,
    assessmentItems: source.assessment.items.length,
    objectiveItems: objectiveItems.length,
  };
  const expected = {
    lessons: 78,
    deepComprehension: 36,
    summaryArgument: 24,
    timedIntegration: 18,
    vocabulary: 1000,
    characters: 441,
    grammar: 95,
    tasks: 30,
    topics: 77,
    longParagraphs: 216,
    promptUnits: 106,
    assessmentItems: 192,
    objectiveItems: 72,
  };
  if (!exact(counts, expected)) {
    throw new Error(`HSK4 source coverage has drifted: ${JSON.stringify(counts)}`);
  }
  if (
    source.languageSupport.humanReviewed !== false
    || source.languageSupport.productionEligible !== false
    || source.languageSupport.counts.authoredVietnameseGlosses !== 360
    || source.languageSupport.counts.aiSupportedVietnameseGlosses !== 640
    || source.languageSupport.counts.pronunciations !== 417
  ) {
    throw new Error("HSK4 local language support disclosure has drifted");
  }
  const unitCounts = Object.fromEntries(UNIT_ORDER.map((unitId) => [
    unitId,
    blueprints.filter((lesson) => lesson.unitId === unitId).length,
  ]));
  if (!exact(unitCounts, {
    "hsk4-deep-comprehension": 36,
    "hsk4-summary-argument": 24,
    "hsk4-timed-integration": 18,
  })) {
    throw new Error("HSK4 lesson unit distribution has drifted");
  }
  for (const [index, blueprint] of blueprints.entries()) {
    const expectedPrerequisites = index === 0
      ? []
      : [blueprints[index - 1].lessonId];
    if (!exact(blueprint.prerequisiteLessonIds, expectedPrerequisites)) {
      throw new Error(`${blueprint.lessonId} prerequisite chain has drifted`);
    }
  }
  return { long, summaries, integrations, grammarRows, promptUnits, counts };
};

const selectedSourceMatch = (entry) => entry.sourceMatches.find((match) =>
  numberedBase(match.numberedPinyin)
    === stripMarkedPinyin(primaryOfficialPinyin(entry.officialPinyin))
) ?? entry.sourceMatches[0] ?? {
  traditional: entry.simplified,
  markedPinyin: entry.officialPinyin,
  numberedPinyin: entry.officialId === "hsk-vocab-01534" ? "ng4" : "",
};

const projectLexemes = async (source) => {
  const glossById = new Map(source.languageSupport.vocabulary.map(
    (item) => [item.officialId, item],
  ));
  const assignmentByVocabulary = new Map(source.blueprints.vocabularyAssignments.map(
    (item) => [item.vocabularyId, item.lessonId],
  ));
  return Promise.all(source.vocabulary.entries.map(async (entry) => {
    const support = glossById.get(entry.officialId);
    const match = selectedSourceMatch(entry);
    const displayPinyin = primaryOfficialPinyin(entry.officialPinyin);
    if (!support?.vietnameseGloss || !assignmentByVocabulary.has(entry.officialId)) {
      throw new Error(`${entry.officialId} lacks local HSK4 editorial support`);
    }
    const example = `${entry.simplified}是本课材料中的重点词语。`;
    const payload = {
      simplified: entry.simplified,
      traditional: match.traditional,
      pinyin: compactPinyin(displayPinyin),
      pinyinNumbered: compactPinyin(numberedForOfficial(
        displayPinyin,
        match.numberedPinyin,
      )),
      meaning: support.vietnameseGloss,
      partOfSpeech: entry.officialPartOfSpeech
        ? `HSK4 · ${entry.officialPartOfSpeech}`
        : "HSK4 · từ/cụm từ",
      example,
      examplePinyin:
        `${displayPinyin} shì běnkè cáiliào zhōng de zhòngdiǎn cíyǔ.`,
      exampleMeaning:
        `“${support.vietnameseGloss}” là từ trọng tâm trong ngữ liệu của bài.`,
      hsk: 4,
      tags: ["hsk4", "tự học local", "đọc-nghe-lập luận"],
    };
    return {
      authoringItemId: entry.officialId,
      sourceLessonId: assignmentByVocabulary.get(entry.officialId),
      payload,
      payloadSha256: await sha256Json({ itemType: "lexeme", payload }),
    };
  }));
};

const projectLessons = async (source, lexemes) => {
  const vocabularyIds = new Set(lexemes.map((item) => item.authoringItemId));
  return Promise.all(source.blueprints.lessons.map(async (blueprint, index) => {
    const authoredLesson = [
      ...longLessons(source),
      ...summaryLessons(source),
      ...integrationLessons(source),
    ].find((item) => item.lessonId === blueprint.lessonId);
    const textIds = authoredLesson?.texts?.map((item) => item.textId)
      ?? authoredLesson?.sourceBindings?.map((item) => item.textId)
      ?? unique(authoredLesson?.promptUnits?.flatMap((prompt) =>
        prompt.evidenceRefs?.map((ref) => ref.textId) ?? []
      ) ?? []);
    const textVocabularyIds = allTexts(source)
      .filter((text) => textIds.includes(text.textId))
      .flatMap((text) => text.targetVocabularyIds);
    const assignedVocabularyIds = source.blueprints.vocabularyAssignments
      .filter((item) => item.lessonId === blueprint.lessonId)
      .map((item) => item.vocabularyId);
    const wordIds = unique([
      ...blueprint.inventoryMappings.vocabularyIds,
      ...textVocabularyIds,
      ...assignedVocabularyIds,
    ]).filter((id) => vocabularyIds.has(id));
    if (!wordIds.length || wordIds.some((id) => !vocabularyIds.has(id))) {
      throw new Error(`${blueprint.lessonId} has incomplete vocabulary context`);
    }
    const payload = {
      unitId: blueprint.unitId,
      title: blueprint.titleVi,
      chineseTitle: `HSK四级 · ${String(index + 1).padStart(2, "0")}`,
      objective: blueprint.objectiveVi,
      minutes: blueprint.unitId === "hsk4-deep-comprehension"
        ? 48
        : blueprint.unitId === "hsk4-summary-argument" ? 52 : 58,
      xp: blueprint.unitId === "hsk4-deep-comprehension"
        ? 240
        : blueprint.unitId === "hsk4-summary-argument" ? 265 : 290,
      wordIds,
      skills: blueprint.unitId === "hsk4-deep-comprehension"
        ? ["vocabulary", "listening", "reading", "writing"]
        : ["vocabulary", "grammar", "listening", "reading", "speaking", "writing"],
    };
    const prerequisites = [{
      itemType: "lesson",
      itemId: index === 0
        ? "hsk3-structured-explanation-lesson-03"
        : blueprint.prerequisiteLessonIds[0],
    }];
    return {
      authoringLessonId: blueprint.lessonId,
      runtimeLessonId: blueprint.lessonId,
      unitId: blueprint.unitId,
      sequence: blueprint.sequence,
      prerequisites,
      knowledgeItems: wordIds.map((itemId) => ({ itemType: "lexeme", itemId })),
      officialVocabularyIds: wordIds,
      officialCharacterIds: blueprint.inventoryMappings.recognitionCharacterIds,
      officialGrammarRowIds: blueprint.inventoryMappings.grammarRowIds,
      officialTaskIds: blueprint.inventoryMappings.taskIds,
      officialTopicIds: blueprint.inventoryMappings.topicIds,
      payload,
      payloadSha256: await sha256Json({ itemType: "lesson", payload }),
    };
  }));
};

const projectReview = async (source, lexemes, lessons, materialized) => {
  const coverage = {
    lessons: lessons.length,
    deepComprehensionLessons: materialized.long.length,
    summaryArgumentLessons: materialized.summaries.length,
    timedIntegrationLessons: materialized.integrations.length,
    vocabulary: lexemes.length,
    recognitionCharacters: materialized.counts.characters,
    grammarRows: materialized.counts.grammar,
    tasks: materialized.counts.tasks,
    topics: materialized.counts.topics,
    longParagraphs: materialized.counts.longParagraphs,
    integrationPromptUnits: materialized.counts.promptUnits,
    localLevelCheckObjectiveItems: materialized.counts.objectiveItems,
    fullAssessmentDraftItems: materialized.counts.assessmentItems,
  };
  const payload = {
    schemaVersion: 1,
    reviewId: "hsk4-level-batch-local-study-review-2026.08.4",
    profileId: "hsk0-4-personal-study-2026.07.1",
    level: "HSK4",
    targetContentVersion: HSK4_LEVEL_TARGET_VERSION,
    reviewedAt: "2026-08-01T20:00:00.000Z",
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
      grammarIds: materialized.grammarRows.map((item) => item.grammarRowId),
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
          findingId: "hsk4-drafts-not-runtime-visible",
          pass: "source-and-level-coverage",
          resolution:
            "Đưa đủ 78 blueprint và toàn bộ inventory HSK4 vào package local kế tiếp.",
        },
        {
          findingId: "hsk4-vietnamese-and-pinyin-support-incomplete",
          pass: "vietnamese-context-and-clarity",
          resolution:
            "Giữ 360 nghĩa Việt đã viết theo ngữ cảnh, bổ sung 640 nghĩa Việt và 417 chuỗi Pinyin AI-assisted với disclosure humanReviewed=false.",
        },
        {
          findingId: "hsk4-constructed-response-not-calibrated",
          pass: "pedagogy-rubric-and-distractors",
          resolution:
            "Giữ nói/viết ở chế độ luyện có mẫu và tự sửa; level check chỉ chấm 72 câu khách quan, không cấp mastery hay miễn prerequisite.",
        },
        {
          findingId: "hsk4-browser-audio-synthetic",
          pass: "mandarin-accuracy-and-naturalness",
          resolution:
            "Browser TTS chỉ hỗ trợ luyện nghe/đọc, không phải audio người thật hoặc bằng chứng phát âm.",
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

export const projectHsk4LevelBatch = async (
  source = loadHsk4LevelBatchSources(),
) => {
  const materialized = assertSourceCoverage(source);
  const lexemes = await projectLexemes(source);
  const lessons = await projectLessons(source, lexemes);
  const review = await projectReview(source, lexemes, lessons, materialized);
  const corePayload = {
    schemaVersion: 1,
    projectionId: "hsk4-level-core-projection-2026.08.4",
    targetContentVersion: HSK4_LEVEL_TARGET_VERSION,
    state: "ai-reviewed-for-personal-local-study",
    lexemes,
    lessons,
    counts: {
      lessons: 78,
      deepComprehensionLessons: 36,
      summaryArgumentLessons: 24,
      timedIntegrationLessons: 18,
      vocabulary: 1000,
      recognitionCharacters: 441,
      grammarRows: 95,
      tasks: 30,
      topics: 77,
      levelCheckObjectiveItems: 72,
      longParagraphs: 216,
      integrationPromptUnits: 106,
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
    core: { ...corePayload, integritySha256: await sha256Json(corePayload) },
  };
};

export const loadHsk4LevelBatchBundle = (root = process.cwd()) => ({
  source: loadHsk4LevelBatchSources(root),
  review: readJson(root, HSK4_LEVEL_REVIEW_RELATIVE_PATH),
  core: readJson(root, HSK4_LEVEL_CORE_RELATIVE_PATH),
});

export const validateHsk4LevelBatchBundle = async (bundle) => {
  const errors = [];
  let expected;
  try {
    expected = await projectHsk4LevelBatch(bundle.source);
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
  ) errors.push("HSK4 level batch shape is invalid");
  if (!exact(bundle.review, expected.review)) {
    errors.push("HSK4 level review does not match exact selected sources");
  }
  if (!exact(bundle.core, expected.core)) {
    errors.push("HSK4 level core projection does not match reviewed payloads");
  }
  return { valid: errors.length === 0, errors, summary: expected.core.counts };
};

export const projectHsk4LevelPackageInputs = async (
  source = loadHsk4LevelBatchSources(),
) => {
  const { review, core } = await projectHsk4LevelBatch(source);
  const inheritedItems = source.baseCatalog.items.map((item) => ({
    ...structuredClone(item),
    itemVersion: HSK4_LEVEL_TARGET_VERSION,
  }));
  const lexemeItems = core.lexemes.map((lexeme) => ({
    itemKey: `lexeme:${lexeme.authoringItemId}`,
    itemType: "lexeme",
    itemId: lexeme.authoringItemId,
    itemVersion: HSK4_LEVEL_TARGET_VERSION,
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
    itemVersion: HSK4_LEVEL_TARGET_VERSION,
    releaseState: "beta",
    payload: lesson.payload,
    owner: null,
    sourceLicense: null,
    prerequisites: lesson.prerequisites,
    payloadSha256: lesson.payloadSha256,
    knowledgeItems: lesson.knowledgeItems,
  }));
  const items = [...inheritedItems, ...lexemeItems, ...lessonItems];
  if (duplicates(items.map((item) => item.itemKey)).length) {
    throw new Error("HSK4 level package item keys are duplicated");
  }
  const itemCatalog = {
    schemaVersion: 4,
    contentVersion: HSK4_LEVEL_TARGET_VERSION,
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
    contentVersion: HSK4_LEVEL_TARGET_VERSION,
    vocabularyIds: [
      ...source.baseRuntimeIds.vocabularyIds,
      ...lexemeItems.map((item) => item.itemId),
    ],
    unitIds: [...source.baseRuntimeIds.unitIds, ...UNIT_ORDER],
    lessons: [...source.baseRuntimeIds.lessons, ...runtimeLessons],
    stories: [...source.baseRuntimeIds.stories],
  };
  if (
    duplicates(runtimeIds.vocabularyIds).length
    || duplicates(runtimeIds.lessons.map((item) => item.id)).length
    || runtimeIds.vocabularyIds.length !== 2016
    || runtimeIds.lessons.length !== 217
  ) throw new Error("HSK4 level runtime IDs are invalid");
  const coverageClaims = {
    ...source.baseCoverageClaims,
    contentVersion: HSK4_LEVEL_TARGET_VERSION,
    itemCatalogSha256: await sha256Json(itemCatalog),
    coverageClaims: [
      ...source.baseCoverageClaims.coverageClaims,
      {
        claimId: "hsk4-personal-local-study-full-inventory-2026.08.4",
        framework: "CTI HSK 3.0 pinned 2026",
        level: "HSK4",
        evidenceRef: HSK4_LEVEL_REVIEW_RELATIVE_PATH,
        itemKeys: [
          ...lexemeItems.map((item) => item.itemKey),
          ...lessonItems.map((item) => item.itemKey),
        ],
        entryLessonKeys: [
          "lesson:hsk4-personal-community-analysis-concept-actor-map",
        ],
        terminalLessonKeys: [
          "lesson:hsk4-timed-sectional-rehearsal-lesson-03",
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
      hsk4Lessons: lessonItems.length,
      runtimeVocabularyIds: runtimeIds.vocabularyIds.length,
      runtimeLessons: runtimeIds.lessons.length,
      humanReviewed: review.reviewer.humanReviewed,
      productionEligible: review.claims.productionEligible,
    },
  };
};

export const validateMaterializedHsk4LevelPackage = async (
  root = process.cwd(),
) => {
  const expected = await projectHsk4LevelPackageInputs(
    loadHsk4LevelBatchSources(root),
  );
  const packageRoot = `content/packages/${HSK4_LEVEL_TARGET_VERSION}`;
  const actual = {
    itemCatalog: readJson(root, `${packageRoot}/item-catalog.json`),
    runtimeIds: readJson(root, `${packageRoot}/runtime-ids.json`),
    coverageClaims: readJson(root, `${packageRoot}/coverage-claims.json`),
  };
  const errors = [];
  if (!exact(actual.itemCatalog, expected.itemCatalog)) {
    errors.push("materialized HSK4 level item catalog has drifted");
  }
  if (!exact(actual.runtimeIds, expected.runtimeIds)) {
    errors.push("materialized HSK4 level runtime IDs have drifted");
  }
  if (!exact(actual.coverageClaims, expected.coverageClaims)) {
    errors.push("materialized HSK4 level coverage claims have drifted");
  }
  return { valid: errors.length === 0, errors, summary: expected.summary };
};

const sourceTextIds = (lesson) => lesson.sourceBindings?.map(
  (binding) => binding.textId,
) ?? unique(lesson.promptUnits?.flatMap((prompt) =>
  prompt.evidenceRefs?.map((ref) => ref.textId) ?? []
) ?? []);
const turn = (line, pinyin, speaker = "A") => ({
  speaker,
  hanzi: line.hanzi,
  pinyin,
  meaningVi: line.vietnamese,
});

export const projectHsk4LevelRichLessons = async (
  source = loadHsk4LevelBatchSources(),
) => {
  const { core, review } = await projectHsk4LevelBatch(source);
  const authorization = readJson(
    source.root,
    "content/curriculum/hsk0-4-local-study-authorizations.json",
  );
  const authorizations = authorization.authorizations?.filter(
    (item) => item.unitId.startsWith("hsk4-"),
  ) ?? [];
  if (
    authorization.runtimeContentVersion !== CURRENT_LOCAL_STUDY_VERSION
    || authorizations.length !== 3
    || authorizations.reduce((sum, item) => sum + item.lessonIds.length, 0) !== 78
    || authorization.policy?.humanReviewed !== false
  ) throw new Error("HSK4 rich lessons are not locally authorized");
  const materialized = assertSourceCoverage(source);
  const textById = new Map(allTexts(source).map((text) => [text.textId, text]));
  const longById = new Map(materialized.long.map((lesson) => [lesson.lessonId, lesson]));
  const summaryById = new Map(materialized.summaries.map(
    (lesson) => [lesson.lessonId, lesson],
  ));
  const integrationById = new Map(materialized.integrations.map(
    (lesson) => [lesson.lessonId, lesson],
  ));
  const pinyinByHanzi = new Map(source.languageSupport.pronunciations.map(
    (item) => [item.hanzi, item.pinyin],
  ));
  const taskById = new Map(source.inventory.tasks.map((item) => [item.id, item]));
  const topicById = new Map(source.inventory.topics.map((item) => [item.id, item]));
  const lexemeById = new Map(core.lexemes.map(
    (item) => [item.authoringItemId, item],
  ));
  const lessons = core.lessons.map((coreLesson) => {
    const blueprint = source.blueprints.lessons.find(
      (item) => item.lessonId === coreLesson.authoringLessonId,
    );
    const long = longById.get(blueprint.lessonId);
    const summary = summaryById.get(blueprint.lessonId);
    const integration = integrationById.get(blueprint.lessonId);
    const texts = long?.texts ?? sourceTextIds(summary ?? integration)
      .map((id) => textById.get(id)).filter(Boolean);
    const lines = texts.flatMap((text) => text.paragraphs).slice(0, 3);
    if (lines.length < 3) throw new Error(`${blueprint.lessonId} lacks source text`);
    const dialogue = lines.map((line, index) => turn(
      line,
      pinyinByHanzi.get(line.hanzi),
      index % 2 ? "B" : "A",
    ));
    if (dialogue.some((item) => !item.pinyin)) {
      throw new Error(`${blueprint.lessonId} lacks pinned Pinyin support`);
    }
    const grammar = summary?.grammarTargets.map((item) => {
      const practice = summary.grammarPracticeItems.find(
        (candidate) => candidate.grammarRowId === item.grammarRowId,
      );
      return {
        id: item.grammarRowId,
        category: item.categoryName ?? item.category,
        label: item.detail ?? item.officialContent,
        officialContent: item.officialContent,
        explanationVi: `${item.functionVi} ${item.scopeBoundaryVi}`,
        modelExample: {
          speaker: "A",
          hanzi: item.modelHanzi,
          pinyin: pinyinByHanzi.get(item.modelHanzi),
          meaningVi: item.modelVi,
        },
        guidedPractice: {
          promptVi: practice.promptVi,
          modelAnswerHanzi: practice.modelHanzi,
          modelAnswerPinyin: pinyinByHanzi.get(practice.modelHanzi),
          modelAnswerMeaningVi: practice.modelVi,
        },
      };
    }) ?? [{
      id: `hsk4-pattern:${blueprint.lessonId}`,
      category: "Đọc–nghe và lập luận HSK4",
      label: long ? "Dẫn chứng trước khi suy luận" : "Tích hợp nhiều nguồn có giới hạn",
      officialContent: "supplemental-local-study-pattern",
      explanationVi:
        "Tách dữ kiện, diễn giải và giới hạn; mọi kết luận phải quay lại đúng đoạn nguồn.",
      modelExample: dialogue[0],
      guidedPractice: {
        promptVi: "Nêu một dữ kiện, một diễn giải hợp lý và một giới hạn kết luận.",
        modelAnswerHanzi: dialogue[0].hanzi,
        modelAnswerPinyin: dialogue[0].pinyin,
        modelAnswerMeaningVi: dialogue[0].meaningVi,
      },
    }];
    const officialTasks = blueprint.inventoryMappings.taskIds.map(
      (id) => taskById.get(id),
    ).filter(Boolean).map((item) => ({
      id: item.id,
      titleVi: item.title,
      instructionVi:
        `Hoàn thành nhiệm vụ “${item.title}” bằng dẫn chứng từ ngữ liệu; tự đối chiếu với mẫu trước khi sửa.`,
      targetFunctions: ["evidence-bounded-response", "self-reveal-revision"],
      modelDialogue: dialogue.slice(0, 1),
    }));
    const prompt = integration?.promptUnits[0];
    const tasks = officialTasks.length ? officialTasks : [{
      id: prompt?.promptUnitId ?? `hsk4-local-task:${blueprint.lessonId}`,
      titleVi: blueprint.titleVi,
      instructionVi: prompt?.promptVi
        ?? long?.synthesisPrompt?.promptVi
        ?? "Lập sơ đồ ý chính, dẫn chứng và giới hạn rồi trình bày lại bằng lời của bạn.",
      targetFunctions: prompt
        ? [prompt.kind, prompt.primarySkill, "self-reveal-revision"]
        : ["long-form-comprehension", "evidence-map", "self-reveal-revision"],
      modelDialogue: dialogue.slice(0, 1),
    }];
    const topics = blueprint.inventoryMappings.topicIds.map((id) => {
      const item = topicById.get(id);
      return {
        id,
        group: item.group,
        officialTopic: item.topic,
        promptVi: `Đọc, ghi ý và trao đổi trong phạm vi chủ đề ${item.topic}.`,
      };
    });
    const characters = source.blueprints.characterAssignments
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
    return {
      lessonId: coreLesson.runtimeLessonId,
      authoringLessonId: coreLesson.authoringLessonId,
      dialogue,
      grammar,
      topics,
      tasks,
      characters,
    };
  });
  const counts = {
    lessons: lessons.length,
    deepComprehensionLessons: materialized.long.length,
    summaryArgumentLessons: materialized.summaries.length,
    timedIntegrationLessons: materialized.integrations.length,
    dialogueTurns: lessons.reduce((sum, lesson) => sum + lesson.dialogue.length, 0),
    richLessons: lessons.filter((lesson) =>
      lesson.dialogue.length && lesson.grammar.length && lesson.tasks.length
    ).length,
    officialGrammarRows: unique(lessons.flatMap((lesson) =>
      lesson.grammar.map((item) => item.id)
        .filter((id) => id.startsWith("hsk4-grammar-row-"))
    )).length,
    officialTasks: unique(lessons.flatMap((lesson) =>
      lesson.tasks.map((item) => item.id)
        .filter((id) => id.startsWith("hsk4-task-"))
    )).length,
    officialTopics: unique(lessons.flatMap((lesson) =>
      lesson.topics.map((item) => item.id)
    )).length,
    officialCharacters: unique(lessons.flatMap((lesson) =>
      lesson.characters.map((item) => item.id)
    )).length,
    integrationPromptUnits: materialized.promptUnits.length,
  };
  const expected = {
    lessons: 78,
    deepComprehensionLessons: 36,
    summaryArgumentLessons: 24,
    timedIntegrationLessons: 18,
    dialogueTurns: 234,
    richLessons: 78,
    officialGrammarRows: 95,
    officialTasks: 30,
    officialTopics: 77,
    officialCharacters: 441,
    integrationPromptUnits: 106,
  };
  if (!exact(counts, expected)) {
    throw new Error(`HSK4 rich coverage is incomplete: ${JSON.stringify(counts)}`);
  }
  const payload = {
    schemaVersion: 1,
    presentationId: "hsk4-level-rich-lessons-2026.08.4",
    contentVersion: CURRENT_LOCAL_STUDY_VERSION,
    level: "HSK4",
    state: "authorized-for-personal-local-study",
    disclosure: {
      reviewVi:
        "Nội dung được Codex rà soát bằng AI cho mục đích tự học; humanReviewed=false.",
      audioVi:
        "Nút nghe dùng giọng tổng hợp của trình duyệt, chỉ để luyện tập; không phải thu âm người thật và không chấm phát âm.",
      levelCheckVi:
        "Level check HSK4 là self-check local chưa nghiệm chuẩn; kết quả không cấp mastery, bỏ prerequisite hoặc chứng nhận HSK.",
      humanReviewed: false,
      browserTtsPracticeOnly: true,
      productionEligible: false,
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
      unitIds: authorizations.map((item) => item.unitId),
    },
    counts,
    lessons,
  };
  return { ...payload, integritySha256: await sha256Json(payload) };
};

export const validateHsk4LevelRichLessons = async (root = process.cwd()) => {
  const source = loadHsk4LevelBatchSources(root);
  const expected = await projectHsk4LevelRichLessons(source);
  const actual = readJson(root, HSK4_LEVEL_RICH_RELATIVE_PATH);
  const errors = [];
  if (!exact(actual, expected)) {
    errors.push("HSK4 rich lesson presentation has drifted");
  }
  if (
    actual.disclosure?.humanReviewed !== false
    || actual.disclosure?.browserTtsPracticeOnly !== true
    || actual.counts?.richLessons !== 78
  ) errors.push("HSK4 rich lesson disclosure or coverage is invalid");
  return { valid: errors.length === 0, errors, summary: expected.counts };
};

export const projectHsk4LocalLevelCheck = async (
  source = loadHsk4LevelBatchSources(),
) => {
  const objectiveIds = new Set(source.assessment.forms.find(
    (form) => form.formId === "hsk4-level-form-a",
  ).sections.filter((section) => section.sectionId.endsWith("-objective"))
    .flatMap((section) => section.itemIds));
  const sourceTextById = new Map(source.assessment.sources.flatMap((family) => [
    [family.readingSource.textId, family.readingSource.contentHanzi],
    [family.listeningSource.textId, family.listeningSource.contentHanzi],
  ]));
  const firstLessonByTrack = new Map();
  for (const lesson of source.blueprints.lessons) {
    if (!firstLessonByTrack.has(lesson.trackId)) {
      firstLessonByTrack.set(lesson.trackId, lesson);
    }
  }
  const items = source.assessment.items.filter((item) =>
    objectiveIds.has(item.itemId)
  ).map((item) => {
    const sourceLesson = firstLessonByTrack.get(item.domainId);
    const stimulusText = item.stimulus.contextHanzi
      ?? sourceTextById.get(item.stimulus.sourceTextId)
      ?? "";
    const options = item.options?.map((option) => ({
      optionId: option.optionId,
      text: option.textVi ?? option.textHanzi,
    })) ?? [];
    if (!sourceLesson || !stimulusText || options.some((option) => !option.text)) {
      throw new Error(`${item.itemId} has incomplete HSK4 level-check context`);
    }
    return {
      id: item.itemId,
      sourceItemVersion: item.itemVersion,
      skill: item.skill,
      construct: item.construct,
      promptVi: item.promptVi,
      stimulusText,
      pinyinReference: item.stimulus.officialPinyin ?? null,
      syntheticTtsText: item.skill === "listening" ? stimulusText : null,
      options,
      correctOptionId: item.correctOptionId,
      explanationVi: `${item.rationaleVi} ${item.scopeBoundaryVi}`,
      sourceLessonId: sourceLesson.lessonId,
      sourceUnitId: sourceLesson.unitId,
      measurementEligible: false,
      masteryEligible: false,
      prerequisiteWaiverEligible: false,
    };
  });
  const skillCounts = Object.fromEntries([
    "listening",
    "reading",
    "vocabulary",
    "grammar",
  ].map((skill) => [
    skill,
    items.filter((item) => item.skill === skill).length,
  ]));
  if (
    items.length !== 72
    || !exact(skillCounts, {
      listening: 18,
      reading: 18,
      vocabulary: 18,
      grammar: 18,
    })
  ) throw new Error("HSK4 local level-check objective coverage is incomplete");
  const payload = {
    schemaVersion: 1,
    bankId: source.assessment.bankId,
    formId: "hsk4-level-form-a",
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

export const validateHsk4LocalLevelCheck = async (root = process.cwd()) => {
  const expected = await projectHsk4LocalLevelCheck(
    loadHsk4LevelBatchSources(root),
  );
  const actual = readJson(root, HSK4_LEVEL_CHECK_RELATIVE_PATH);
  const errors = [];
  if (!exact(actual, expected)) {
    errors.push("HSK4 local level-check artifact has drifted");
  }
  if (
    actual.disclosure?.humanReviewed !== false
    || actual.disclosure?.browserTtsPracticeOnly !== true
    || actual.counts?.items !== 72
  ) errors.push("HSK4 local level-check disclosure is invalid");
  return { valid: errors.length === 0, errors, summary: expected.counts };
};
