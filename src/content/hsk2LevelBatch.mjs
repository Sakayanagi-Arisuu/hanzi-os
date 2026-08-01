import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK2_LEVEL_BASE_VERSION = "foundation-2026.08.1";
export const HSK2_LEVEL_TARGET_VERSION = "foundation-2026.08.2";
const CURRENT_LOCAL_STUDY_VERSION = "foundation-2026.08.3";
export const HSK2_LEVEL_REVIEW_RELATIVE_PATH =
  "content/review/hsk2-level-batch-local-study-review.json";
export const HSK2_LEVEL_CORE_RELATIVE_PATH =
  "content/runtime/hsk2-level-core-projection.json";
export const HSK2_LEVEL_RICH_RELATIVE_PATH =
  "content/runtime/hsk2-level-rich-lessons.json";
export const HSK2_LEVEL_PACKAGE_INPUT_DIRECTORY =
  "content/runtime/hsk2-level-package-input";

const PATHS = {
  scope: "content/curriculum/hsk2-scope.json",
  blueprints: "content/drafts/hsk2-lesson-blueprints-2026.07.json",
  vocabularyPractice: "content/drafts/hsk2-vocabulary-practice-2026.07.json",
  vocabulary: "content/drafts/hsk2-vocabulary-2026.07.28.json",
  characters: "content/drafts/hsk2-character-practice-2026.07.json",
  grammar: "content/drafts/hsk2-grammar-context-2026.07.json",
  dialogues: "content/drafts/hsk2-situational-dialogues-2026.07.json",
  shortText: "content/drafts/hsk2-short-text-production-2026.07.json",
  assessment: "content/drafts/hsk2-level-assessment-2026.07.json",
  baseCatalog:
    `content/packages/${HSK2_LEVEL_BASE_VERSION}/item-catalog.json`,
  baseRuntimeIds:
    `content/packages/${HSK2_LEVEL_BASE_VERSION}/runtime-ids.json`,
  baseCoverageClaims:
    `content/packages/${HSK2_LEVEL_BASE_VERSION}/coverage-claims.json`,
};

const REVIEW_PASSES = [
  "mandarin-accuracy-and-naturalness",
  "pinyin-and-tone-consistency",
  "vietnamese-context-and-clarity",
  "pedagogy-rubric-and-distractors",
  "source-and-level-coverage",
];

const UNIT_ORDER = [
  "hsk2-situational-dialogue",
  "hsk2-sentence-chains",
  "hsk2-short-text-production",
];

const CUSTOM_EXAMPLES = {
  "hsk-vocab-00303": ["我想买一件白色的衣服。", "Wǒ xiǎng mǎi yí jiàn báisè de yīfu.", "Tôi muốn mua một bộ quần áo màu trắng."],
  "hsk-vocab-00317": ["他明年要出国学习。", "Tā míngnián yào chūguó xuéxí.", "Năm sau anh ấy sẽ ra nước ngoài học."],
  "hsk-vocab-00325": ["她从小就喜欢唱歌。", "Tā cóngxiǎo jiù xǐhuan chànggē.", "Cô ấy thích hát từ nhỏ."],
  "hsk-vocab-00340": ["飞机马上要飞了。", "Fēijī mǎshàng yào fēi le.", "Máy bay sắp cất cánh rồi."],
  "hsk-vocab-00348": ["你过来看看这张照片。", "Nǐ guòlái kànkan zhè zhāng zhàopiàn.", "Bạn qua đây xem bức ảnh này đi."],
  "hsk-vocab-00362": ["太晚了，我们回去吧。", "Tài wǎn le, wǒmen huíqù ba.", "Muộn quá rồi, chúng ta về thôi."],
  "hsk-vocab-00390": ["房间里面有一张桌子。", "Fángjiān lǐmiàn yǒu yì zhāng zhuōzi.", "Bên trong phòng có một cái bàn."],
  "hsk-vocab-00398": ["这个电影没意思。", "Zhège diànyǐng méi yìsi.", "Bộ phim này không thú vị."],
  "hsk-vocab-00402": ["我已经买好门票了。", "Wǒ yǐjīng mǎihǎo ménpiào le.", "Tôi đã mua xong vé vào cửa rồi."],
  "hsk-vocab-00408": ["她想喝一杯热奶茶。", "Tā xiǎng hē yì bēi rè nǎichá.", "Cô ấy muốn uống một cốc trà sữa nóng."],
  "hsk-vocab-00425": ["请上来坐一会儿。", "Qǐng shànglái zuò yíhuìr.", "Mời lên đây ngồi một lát."],
  "hsk-vocab-00428": ["我晚上常上网看新闻。", "Wǒ wǎnshang cháng shàngwǎng kàn xīnwén.", "Buổi tối tôi thường lên mạng xem tin tức."],
  "hsk-vocab-00459": ["书在桌子下面。", "Shū zài zhuōzi xiàmiàn.", "Sách ở dưới bàn."],
  "hsk-vocab-00460": ["你先下去，我马上来。", "Nǐ xiān xiàqù, wǒ mǎshàng lái.", "Bạn xuống trước đi, tôi tới ngay."],
};

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
  .replace(/[\s'’-]/gu, "")
  .toLocaleLowerCase("en");

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

const promptSentences = (prompt) => {
  if (prompt.stimulus?.hanzi) {
    return [{
      hanzi: prompt.stimulus.hanzi,
      pinyin: prompt.stimulus.pinyin,
      meaningVi: prompt.stimulus.meaningVi,
    }];
  }
  if (prompt.modelAnswer?.hanzi) return [prompt.modelAnswer];
  return prompt.modelResponse?.sentences ?? [];
};

const sentenceBank = (source) => {
  const sentences = [];
  const add = (hanzi, pinyin, meaningVi, kind) => {
    if (hanzi && pinyin && meaningVi) {
      sentences.push({ hanzi, pinyin, meaningVi, kind });
    }
  };
  for (const lesson of source.dialogues.lessonDialogues) {
    for (const turn of lesson.modelDialogue.turns) {
      add(turn.hanzi, turn.pinyin, turn.meaningVi, "situational-dialogue");
    }
  }
  for (const item of source.grammar.grammarDrafts) {
    add(
      item.modelExample.hanzi,
      item.modelExample.pinyin,
      item.modelExample.meaningVi,
      "grammar-example",
    );
    add(
      item.guidedPractice.modelAnswerHanzi,
      item.guidedPractice.modelAnswerPinyin,
      item.guidedPractice.modelAnswerMeaningVi,
      "guided-grammar",
    );
  }
  for (const lesson of source.shortText.lessons) {
    for (const prompt of lesson.prompts) {
      for (const sentence of promptSentences(prompt)) {
        add(sentence.hanzi, sentence.pinyin, sentence.meaningVi, prompt.kind);
      }
    }
  }
  for (const item of source.assessment.items) {
    const correct = item.options?.find((option) =>
      option.optionId === item.correctOptionId
    );
    add(
      item.stimulus?.transcriptHanzi ?? item.stimulus?.text,
      item.stimulus?.transcriptPinyin
        ?? item.stimulus?.pinyinAuthoringReference,
      correct?.text,
      "level-check",
    );
  }
  return sentences.sort((left, right) =>
    left.hanzi.length - right.hanzi.length
    || left.hanzi.localeCompare(right.hanzi, "zh-CN")
  );
};

export const loadHsk2LevelBatchSources = (root = process.cwd()) => ({
  root,
  ...Object.fromEntries(Object.entries(PATHS).map(([key, relativePath]) => [
    key,
    readJson(root, relativePath),
  ])),
});

const assertSourceCoverage = (source) => {
  const blueprintIds = source.blueprints.lessons.map((item) => item.lessonId);
  const vocabularyIds = source.vocabularyPractice.lexemes.map(
    (item) => item.officialId,
  );
  const characterIds = source.characters.characters.map(
    (item) => item.officialCharacterId,
  );
  const grammarIds = source.grammar.grammarDrafts.map(
    (item) => item.officialGrammarRowId,
  );
  const taskIds = source.dialogues.taskDrafts.map(
    (item) => item.officialTaskId,
  );
  const topicIds = source.dialogues.topicDrafts.map(
    (item) => item.officialTopicId,
  );
  const objectiveFormAIds = new Set(source.assessment.forms
    .find((form) => form.formId === "hsk2-level-form-a")
    ?.sections.filter((section) => section.sectionId.endsWith("-objective"))
    .flatMap((section) => section.itemIds) ?? []);
  if (
    blueprintIds.length !== 40
    || unique(blueprintIds).length !== 40
    || vocabularyIds.length !== 200
    || unique(vocabularyIds).length !== 200
    || characterIds.length !== 125
    || unique(characterIds).length !== 125
    || grammarIds.length !== 75
    || unique(grammarIds).length !== 75
    || taskIds.length !== 17
    || unique(taskIds).length !== 17
    || topicIds.length !== 34
    || unique(topicIds).length !== 34
    || source.dialogues.lessonDialogues.length !== 20
    || source.dialogues.lessonDialogues.reduce(
      (sum, lesson) => sum + lesson.modelDialogue.turns.length,
      0,
    ) !== 120
    || source.shortText.lessons.length !== 10
    || source.shortText.lessons.reduce(
      (sum, lesson) => sum + lesson.prompts.length,
      0,
    ) !== 104
    || source.assessment.items.length !== 172
    || objectiveFormAIds.size !== 60
  ) {
    throw new Error("HSK2 level source coverage has drifted");
  }
  const unitCounts = Object.fromEntries(UNIT_ORDER.map((unitId) => [
    unitId,
    source.blueprints.lessons.filter((lesson) => lesson.unitId === unitId)
      .length,
  ]));
  if (!exact(unitCounts, {
    "hsk2-situational-dialogue": 20,
    "hsk2-sentence-chains": 10,
    "hsk2-short-text-production": 10,
  })) {
    throw new Error("HSK2 lesson unit distribution has drifted");
  }
};

const projectLexemes = async (source) => {
  const vocabularyById = new Map(source.vocabulary.entries.map(
    (entry) => [entry.officialId, entry],
  ));
  const sentences = sentenceBank(source);
  const lexemes = [];
  for (const lexeme of source.vocabularyPractice.lexemes) {
    const sourceMatch = selectedSourceMatch(
      lexeme,
      vocabularyById.get(lexeme.officialId),
    );
    const custom = CUSTOM_EXAMPLES[lexeme.officialId];
    const sourced = sentences.find((sentence) =>
      sentence.hanzi.includes(lexeme.simplified)
    );
    if (!custom && !sourced) {
      throw new Error(`${lexeme.officialId} has no contextual HSK2 example`);
    }
    const payload = {
      simplified: lexeme.simplified,
      traditional: sourceMatch.traditional,
      pinyin: compactPinyin(sourceMatch.markedPinyin),
      pinyinNumbered: compactPinyin(sourceMatch.numberedPinyin),
      meaning: lexeme.vietnameseGlossDraft,
      partOfSpeech: lexeme.officialPartOfSpeech
        ? `HSK2 · ${lexeme.officialPartOfSpeech}`
        : "HSK2 · cụm từ",
      example: custom?.[0] ?? sourced.hanzi,
      examplePinyin: custom?.[1] ?? sourced.pinyin,
      exampleMeaning: custom?.[2] ?? sourced.meaningVi,
      hsk: 2,
      tags: ["hsk2", "tự học local"],
    };
    lexemes.push({
      authoringItemId: lexeme.officialId,
      sourceLessonId: lexeme.lessonId,
      payload,
      payloadSha256: await sha256Json({ itemType: "lexeme", payload }),
    });
  }
  return lexemes;
};

const lessonWordIds = (source, blueprint, vocabularySet) => {
  if (blueprint.unitId === "hsk2-situational-dialogue") {
    return [...blueprint.inventoryMappings.vocabularyIds];
  }
  if (blueprint.unitId === "hsk2-sentence-chains") {
    const grammar = source.grammar.grammarDrafts.filter(
      (item) => item.lessonId === blueprint.lessonId,
    );
    const text = grammar.flatMap((item) => [
      item.modelExample.hanzi,
      item.guidedPractice.modelAnswerHanzi,
    ]).join(" ");
    return source.vocabularyPractice.lexemes
      .filter((lexeme) => text.includes(lexeme.simplified))
      .map((lexeme) => lexeme.officialId);
  }
  const lesson = source.shortText.lessons.find(
    (item) => item.lessonId === blueprint.lessonId,
  );
  return unique(lesson.targetCharacters.flatMap((item) => {
    const id = item.primaryContext?.officialVocabularyId;
    return id && vocabularySet.has(id) ? [id] : [];
  }));
};

const projectLessons = async (source, lexemes) => {
  const catalogVocabularyIds = new Set(source.baseCatalog.items
    .filter((item) => item.itemType === "lexeme")
    .map((item) => item.itemId));
  for (const lexeme of lexemes) catalogVocabularyIds.add(lexeme.authoringItemId);
  const hsk2VocabularyIds = new Set(lexemes.map(
    (item) => item.authoringItemId,
  ));
  const lessons = [];
  for (const [index, blueprint] of source.blueprints.lessons.entries()) {
    const wordIds = lessonWordIds(source, blueprint, catalogVocabularyIds);
    if (
      wordIds.length === 0
      || wordIds.some((id) => !catalogVocabularyIds.has(id))
    ) {
      throw new Error(`${blueprint.lessonId} has incomplete vocabulary context`);
    }
    const expectedPrerequisites = index === 0
      ? []
      : [source.blueprints.lessons[index - 1].lessonId];
    if (!exact(blueprint.prerequisiteLessonIds, expectedPrerequisites)) {
      throw new Error(`${blueprint.lessonId} prerequisite chain has drifted`);
    }
    const isDialogue = blueprint.unitId === "hsk2-situational-dialogue";
    const isGrammar = blueprint.unitId === "hsk2-sentence-chains";
    const payload = {
      unitId: blueprint.unitId,
      title: blueprint.titleVi,
      chineseTitle: `HSK二级 · ${String(index + 1).padStart(2, "0")}`,
      objective: blueprint.objectiveVi,
      minutes: isDialogue ? 28 : isGrammar ? 32 : 36,
      xp: isDialogue ? 140 : isGrammar ? 160 : 180,
      wordIds,
      skills: isDialogue
        ? ["vocabulary", "listening", "reading", "speaking"]
        : isGrammar
          ? ["vocabulary", "grammar", "reading", "writing"]
          : ["vocabulary", "listening", "reading", "writing"],
    };
    const prerequisites = [{
      itemType: "lesson",
      itemId: index === 0
        ? "characters-15"
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
      hsk2VocabularyContextCount: wordIds.filter((id) =>
        hsk2VocabularyIds.has(id)
      ).length,
      payload,
      payloadSha256: await sha256Json({ itemType: "lesson", payload }),
    });
  }
  return lessons;
};

const projectReview = async (source, lexemes, lessons) => {
  const coverage = {
    lessons: lessons.length,
    vocabulary: lexemes.length,
    recognitionCharacters: source.characters.characters.length,
    grammarRows: source.grammar.grammarDrafts.length,
    tasks: source.dialogues.taskDrafts.length,
    topics: source.dialogues.topicDrafts.length,
    dialogueTurns: source.dialogues.lessonDialogues.reduce(
      (sum, lesson) => sum + lesson.modelDialogue.turns.length,
      0,
    ),
    vocabularyPracticeItems: source.vocabularyPractice.practiceItems.length,
    characterPracticeItems: source.characters.practiceItems.length,
    grammarPracticeItems: source.grammar.practiceItems.length,
    shortTextPromptUnits: source.shortText.lessons.reduce(
      (sum, lesson) => sum + lesson.prompts.length,
      0,
    ),
    localLevelCheckObjectiveItems: 60,
    fullAssessmentDraftItems: source.assessment.items.length,
  };
  const payload = {
    schemaVersion: 1,
    reviewId: "hsk2-level-batch-local-study-review-2026.08.2",
    profileId: "hsk0-4-personal-study-2026.07.1",
    level: "HSK2",
    targetContentVersion: HSK2_LEVEL_TARGET_VERSION,
    reviewedAt: "2026-08-01T12:30:00.000Z",
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
      characterIds: source.characters.characters.map(
        (item) => item.officialCharacterId,
      ),
      grammarIds: source.grammar.grammarDrafts.map(
        (item) => item.officialGrammarRowId,
      ),
      taskIds: source.dialogues.taskDrafts.map((item) => item.officialTaskId),
      topicIds: source.dialogues.topicDrafts.map((item) => item.officialTopicId),
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
          findingId: "hsk2-drafts-not-runtime-visible",
          pass: "source-and-level-coverage",
          resolution:
            "Chiếu đủ 40 blueprint và inventory HSK2 vào package local kế tiếp, không thay đổi pipeline production.",
        },
        {
          findingId: "hsk2-audio-and-rubric-production-gates-open",
          pass: "pedagogy-rubric-and-distractors",
          resolution:
            "Giữ audio người thật và rubric chấm nói/viết ngoài phạm vi; browser TTS và self-reveal chỉ dùng luyện tập, không cấp mastery.",
        },
        {
          findingId: "hsk2-level-check-source-exposed",
          pass: "pedagogy-rubric-and-distractors",
          resolution:
            "Chỉ dùng 60 câu objective form A như local self-check; không công bố đây là form đo lường, không cấp waiver hoặc chứng nhận.",
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

export const projectHsk2LevelBatch = async (
  source = loadHsk2LevelBatchSources(),
) => {
  assertSourceCoverage(source);
  const lexemes = await projectLexemes(source);
  const lessons = await projectLessons(source, lexemes);
  const review = await projectReview(source, lexemes, lessons);
  const corePayload = {
    schemaVersion: 1,
    projectionId: "hsk2-level-core-projection-2026.08.2",
    targetContentVersion: HSK2_LEVEL_TARGET_VERSION,
    state: "ai-reviewed-for-personal-local-study",
    lexemes,
    lessons,
    counts: {
      lessons: lessons.length,
      vocabulary: lexemes.length,
      recognitionCharacters: source.characters.characters.length,
      grammarRows: source.grammar.grammarDrafts.length,
      tasks: source.dialogues.taskDrafts.length,
      topics: source.dialogues.topicDrafts.length,
      levelCheckObjectiveItems: 60,
      shortTextPromptUnits: source.shortText.lessons.reduce(
        (sum, lesson) => sum + lesson.prompts.length,
        0,
      ),
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

export const loadHsk2LevelBatchBundle = (root = process.cwd()) => ({
  source: loadHsk2LevelBatchSources(root),
  review: readJson(root, HSK2_LEVEL_REVIEW_RELATIVE_PATH),
  core: readJson(root, HSK2_LEVEL_CORE_RELATIVE_PATH),
});

export const validateHsk2LevelBatchBundle = async (bundle) => {
  const errors = [];
  let expected;
  try {
    expected = await projectHsk2LevelBatch(bundle.source);
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
    || !exact(bundle.core?.counts, {
      lessons: 40,
      vocabulary: 200,
      recognitionCharacters: 125,
      grammarRows: 75,
      tasks: 17,
      topics: 34,
      levelCheckObjectiveItems: 60,
      shortTextPromptUnits: 104,
    })
  ) {
    errors.push("HSK2 level batch shape is invalid");
  }
  if (!exact(bundle.review, expected.review)) {
    errors.push("HSK2 level review does not match exact selected sources");
  }
  if (!exact(bundle.core, expected.core)) {
    errors.push("HSK2 level core projection does not match reviewed payloads");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expected.core.counts,
  };
};

export const projectHsk2LevelPackageInputs = async (
  source = loadHsk2LevelBatchSources(),
) => {
  const { review, core } = await projectHsk2LevelBatch(source);
  const inheritedItems = source.baseCatalog.items.map((item) => ({
    ...structuredClone(item),
    itemVersion: HSK2_LEVEL_TARGET_VERSION,
  }));
  const lexemeItems = core.lexemes.map((lexeme) => ({
    itemKey: `lexeme:${lexeme.authoringItemId}`,
    itemType: "lexeme",
    itemId: lexeme.authoringItemId,
    itemVersion: HSK2_LEVEL_TARGET_VERSION,
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
    itemVersion: HSK2_LEVEL_TARGET_VERSION,
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
    throw new Error("HSK2 level package item keys are duplicated");
  }
  const itemCatalog = {
    schemaVersion: 4,
    contentVersion: HSK2_LEVEL_TARGET_VERSION,
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
    contentVersion: HSK2_LEVEL_TARGET_VERSION,
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
    || runtimeIds.vocabularyIds.length !== 516
    || runtimeIds.lessons.length !== 84
  ) {
    throw new Error("HSK2 level runtime IDs are invalid");
  }
  const coverageClaims = {
    ...source.baseCoverageClaims,
    contentVersion: HSK2_LEVEL_TARGET_VERSION,
    itemCatalogSha256: await sha256Json(itemCatalog),
    coverageClaims: [
      ...source.baseCoverageClaims.coverageClaims,
      {
        claimId: "hsk2-personal-local-study-full-inventory-2026.08.2",
        framework: "CTI HSK 3.0 pinned 2026",
        level: "HSK2",
        evidenceRef: HSK2_LEVEL_REVIEW_RELATIVE_PATH,
        itemKeys: [
          ...lexemeItems.map((item) => item.itemKey),
          ...lessonItems.map((item) => item.itemKey),
        ],
        entryLessonKeys: [
          "lesson:hsk2-person-events-environment-lesson-01",
        ],
        terminalLessonKeys: [
          "lesson:hsk2-picture-description-lesson-02",
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
      hsk2Lessons: lessonItems.length,
      runtimeVocabularyIds: runtimeIds.vocabularyIds.length,
      runtimeLessons: runtimeIds.lessons.length,
      humanReviewed: review.reviewer.humanReviewed,
      productionEligible: review.claims.productionEligible,
    },
  };
};

export const validateMaterializedHsk2LevelPackage = async (
  root = process.cwd(),
) => {
  const expected = await projectHsk2LevelPackageInputs(
    loadHsk2LevelBatchSources(root),
  );
  const packageRoot = `content/packages/${HSK2_LEVEL_TARGET_VERSION}`;
  const actual = {
    itemCatalog: readJson(root, `${packageRoot}/item-catalog.json`),
    runtimeIds: readJson(root, `${packageRoot}/runtime-ids.json`),
    coverageClaims: readJson(root, `${packageRoot}/coverage-claims.json`),
  };
  const errors = [];
  if (!exact(actual.itemCatalog, expected.itemCatalog)) {
    errors.push("materialized HSK2 level item catalog has drifted");
  }
  if (!exact(actual.runtimeIds, expected.runtimeIds)) {
    errors.push("materialized HSK2 level runtime IDs have drifted");
  }
  if (!exact(actual.coverageClaims, expected.coverageClaims)) {
    errors.push("materialized HSK2 level coverage claims have drifted");
  }
  return { valid: errors.length === 0, errors, summary: expected.summary };
};

const dialogueTurn = (turn, speaker = turn.speaker) => ({
  speaker,
  hanzi: turn.hanzi,
  pinyin: turn.pinyin,
  meaningVi: turn.meaningVi,
});

const grammarPoint = (item) => ({
  id: item.officialGrammarRowId,
  category: item.categoryName ?? item.category ?? "Ngữ pháp",
  label: item.detail ?? item.officialContent,
  officialContent: item.officialContent,
  explanationVi: item.explanationViDraft,
  modelExample: {
    hanzi: item.modelExample.hanzi,
    pinyin: item.modelExample.pinyin,
    meaningVi: item.modelExample.meaningVi,
  },
  guidedPractice: {
    promptVi: item.guidedPractice.promptVi,
    modelAnswerHanzi: item.guidedPractice.modelAnswerHanzi,
    modelAnswerPinyin: item.guidedPractice.modelAnswerPinyin,
    modelAnswerMeaningVi: item.guidedPractice.modelAnswerMeaningVi,
  },
});

const supplementalPattern = (lessonId, model, category) => ({
  id: `hsk2-pattern:${lessonId}`,
  category,
  label: "Nối thông tin thành chuỗi có ngữ cảnh",
  officialContent: "supplemental-local-study-pattern",
  explanationVi:
    "Quan sát trật tự thông tin trong mẫu, đổi một chi tiết rồi nối thêm một câu có quan hệ rõ ràng; hoạt động tự kiểm không cấp mastery.",
  modelExample: {
    hanzi: model.hanzi,
    pinyin: model.pinyin,
    meaningVi: model.meaningVi,
  },
  guidedPractice: {
    promptVi: "Đổi một chi tiết trong câu mẫu rồi thêm một câu giải thích hoặc phản hồi.",
    modelAnswerHanzi: model.hanzi,
    modelAnswerPinyin: model.pinyin,
    modelAnswerMeaningVi: model.meaningVi,
  },
});

export const projectHsk2LevelRichLessons = async (
  source = loadHsk2LevelBatchSources(),
) => {
  const { review, core } = await projectHsk2LevelBatch(source);
  const authorization = readJson(
    source.root,
    "content/curriculum/hsk0-4-local-study-authorizations.json",
  );
  const hsk2Authorizations = authorization.authorizations?.filter(
    (item) => item.unitId.startsWith("hsk2-"),
  ) ?? [];
  const authorizedLessonIds = new Set(hsk2Authorizations.flatMap(
    (item) => item.lessonIds,
  ));
  if (
    authorization.runtimeContentVersion !== CURRENT_LOCAL_STUDY_VERSION
    || hsk2Authorizations.length !== 3
    || authorizedLessonIds.size !== 40
    || core.lessons.some((lesson) =>
      !authorizedLessonIds.has(lesson.runtimeLessonId)
    )
    || authorization.policy?.humanReviewed !== false
    || authorization.policy?.grantsProductionEligibility !== false
  ) {
    throw new Error("HSK2 rich lesson content is not locally authorized");
  }
  const dialogueByLessonId = new Map(source.dialogues.lessonDialogues.map(
    (lesson) => [lesson.lessonId, lesson],
  ));
  const shortTextByLessonId = new Map(source.shortText.lessons.map(
    (lesson) => [lesson.lessonId, lesson],
  ));
  const lessons = core.lessons.map((coreLesson) => {
    const blueprint = source.blueprints.lessons.find(
      (item) => item.lessonId === coreLesson.authoringLessonId,
    );
    const dialogueSource = dialogueByLessonId.get(blueprint.lessonId);
    const grammarRows = source.grammar.grammarDrafts.filter(
      (item) => item.lessonId === blueprint.lessonId,
    );
    const shortText = shortTextByLessonId.get(blueprint.lessonId);
    let dialogue;
    let grammar;
    let tasks;
    let characters = [];
    if (dialogueSource) {
      dialogue = dialogueSource.modelDialogue.turns.map((turn) =>
        dialogueTurn(turn)
      );
      grammar = [supplementalPattern(
        blueprint.lessonId,
        dialogueSource.modelDialogue.turns[1],
        "Chuỗi lượt thoại theo tình huống",
      )];
      const officialTasks = source.dialogues.taskDrafts.filter(
        (item) => item.lessonId === blueprint.lessonId,
      );
      tasks = officialTasks.length > 0
        ? officialTasks.map((item) => ({
          id: item.officialTaskId,
          titleVi: item.officialTitle,
          instructionVi: item.instructionViDraft,
          targetFunctions: [...item.targetFunctions],
          modelDialogue: dialogue,
        }))
        : [{
          id: `hsk2-guided-roleplay:${blueprint.lessonId}`,
          titleVi: `Hội thoại sáu lượt: ${blueprint.titleVi}`,
          instructionVi: dialogueSource.taskInstructionVi,
          targetFunctions: [...dialogueSource.targetFunctions],
          modelDialogue: dialogue,
        }];
    } else if (grammarRows.length > 0) {
      dialogue = grammarRows.slice(0, 2).flatMap((item, index) => [
        dialogueTurn(item.modelExample, index % 2 === 0 ? "A" : "B"),
        dialogueTurn({
          hanzi: item.guidedPractice.modelAnswerHanzi,
          pinyin: item.guidedPractice.modelAnswerPinyin,
          meaningVi: item.guidedPractice.modelAnswerMeaningVi,
        }, index % 2 === 0 ? "B" : "A"),
      ]);
      grammar = grammarRows.map(grammarPoint);
      tasks = [{
        id: `hsk2-sentence-chain-task:${blueprint.lessonId}`,
        titleVi: `Dựng chuỗi câu: ${blueprint.titleVi}`,
        instructionVi:
          "Dùng hai mẫu ngữ pháp trong bài để tạo chuỗi 2–3 câu, tự đối chiếu trật tự và sửa trước khi xem lại mẫu.",
        targetFunctions: ["sentence-chain-production", "self-reveal-revision"],
        modelDialogue: dialogue,
      }];
    } else {
      const models = shortText.prompts.flatMap(promptSentences).slice(0, 4);
      dialogue = models.map((item, index) =>
        dialogueTurn(item, index % 2 === 0 ? "A" : "B")
      );
      grammar = [supplementalPattern(
        blueprint.lessonId,
        models[0],
        "Dựng và liên kết văn bản ngắn",
      )];
      tasks = [{
        id: `hsk2-short-text-task:${blueprint.lessonId}`,
        titleVi: blueprint.titleVi,
        instructionVi: shortText.prompts[0].instructionVi,
        targetFunctions: [
          shortText.prompts[0].kind,
          "self-reveal-revision",
        ],
        modelDialogue: dialogue,
      }];
      characters = shortText.targetCharacters.map((item) => {
        const context = item.primaryContext ?? {
          simplified: item.character,
          pinyin: "—",
          vietnameseGlossDraft: "nhận diện chữ trong câu mẫu của bài",
        };
        return {
          id: item.officialCharacterId,
          hanzi: item.character,
          pinyin: context.pinyin,
          meaningVi: context.vietnameseGlossDraft,
          contextWord: context.simplified,
          contextPinyin: context.pinyin,
          contextMeaningVi: context.vietnameseGlossDraft,
        };
      });
    }
    const topics = source.dialogues.topicDrafts
      .filter((item) => item.lessonId === blueprint.lessonId)
      .map((item) => ({
        id: item.officialTopicId,
        group: item.group,
        officialTopic: item.officialTopic,
        promptVi: item.promptViDraft,
      }));
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
        .filter((id) => id.startsWith("hsk2-grammar-row-"))
    )).length,
    officialTasks: unique(lessons.flatMap((lesson) =>
      lesson.tasks.map((item) => item.id)
        .filter((id) => id.startsWith("hsk2-task-"))
    )).length,
    officialTopics: unique(lessons.flatMap((lesson) =>
      lesson.topics.map((item) => item.id)
    )).length,
    officialCharacters: unique(lessons.flatMap((lesson) =>
      lesson.characters.map((item) => item.id)
    )).length,
    shortTextPromptUnits: source.shortText.lessons.reduce(
      (sum, lesson) => sum + lesson.prompts.length,
      0,
    ),
  };
  if (
    counts.lessons !== 40
    || counts.richLessons !== 40
    || counts.officialGrammarRows !== 75
    || counts.officialTasks !== 17
    || counts.officialTopics !== 34
    || counts.officialCharacters !== 125
    || counts.shortTextPromptUnits !== 104
  ) {
    throw new Error(`HSK2 rich coverage is incomplete: ${JSON.stringify(counts)}`);
  }
  const payload = {
    schemaVersion: 1,
    presentationId: "hsk2-level-rich-lessons-2026.08.2",
    contentVersion: CURRENT_LOCAL_STUDY_VERSION,
    level: "HSK2",
    state: "authorized-for-personal-local-study",
    disclosure: {
      reviewVi:
        "Nội dung được Codex rà soát bằng AI cho mục đích tự học; humanReviewed=false.",
      audioVi:
        "Nút nghe dùng giọng TTS tổng hợp của trình duyệt để luyện tập và không tạo bằng chứng nghe hoặc phát âm.",
      levelCheckVi:
        "Level check HSK2 là self-check local chưa nghiệm chuẩn; kết quả không cấp mastery, bỏ prerequisite hoặc chứng nhận HSK.",
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

export const validateHsk2LevelRichLessons = async (
  root = process.cwd(),
) => {
  const expected = await projectHsk2LevelRichLessons(
    loadHsk2LevelBatchSources(root),
  );
  const actual = readJson(root, HSK2_LEVEL_RICH_RELATIVE_PATH);
  const errors = [];
  if (!exact(actual, expected)) {
    errors.push("HSK2 rich lesson presentation does not match reviewed sources");
  }
  if (
    actual?.policy?.humanReviewed !== false
    || actual?.policy?.browserTtsPracticeOnly !== true
    || actual?.policy?.measurementEligible !== false
    || actual?.counts?.lessons !== 40
    || actual?.counts?.richLessons !== 40
  ) {
    errors.push("HSK2 rich lesson presentation policy is invalid");
  }
  return { valid: errors.length === 0, errors, summary: expected.counts };
};
