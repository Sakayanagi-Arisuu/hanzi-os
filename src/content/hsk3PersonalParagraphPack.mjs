import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk3LessonBlueprintsBundle,
  loadHsk3LessonBlueprintsBundle,
} from "./hsk3LessonBlueprints.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK3_PERSONAL_PARAGRAPH_PACK_RELATIVE_PATH =
  "content/drafts/hsk3-personal-paragraph-identity-2026.07.json";

const LESSON_ID =
  "hsk3-personal-life-narratives-identity-transactions";
const TEXT_IDS = [
  `${LESSON_ID}:reading-01`,
  `${LESSON_ID}:listening-01`,
];
const PRACTICE_STATE = {
  review: "pending",
  releaseEligible: false,
  measurementEligible: false,
  masteryEligible: false,
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);
const exactSet = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
const duplicates = (values) => {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
};
const validText = (value, minimum = 1, maximum = 800) =>
  typeof value === "string"
  && value.length >= minimum
  && value.length <= maximum;
const hasPracticeState = (item) =>
  Object.entries(PRACTICE_STATE).every(
    ([field, expected]) => item?.[field] === expected,
  );

export const loadHsk3PersonalParagraphPackBundle = (
  root = process.cwd(),
) => {
  const blueprintBundle = loadHsk3LessonBlueprintsBundle(root);
  const packPath = join(
    root,
    HSK3_PERSONAL_PARAGRAPH_PACK_RELATIVE_PATH,
  );
  return {
    blueprintBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk3PersonalParagraphPackBundle = ({
  blueprintBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk3LessonBlueprintsBundle(blueprintBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (!isRecord(pack) || pack.schemaVersion !== 1) {
    return {
      valid: false,
      errors: ["HSK3 personal paragraph pack schemaVersion must be 1"],
    };
  }
  if (
    pack.packId !== "hsk3-personal-paragraph-identity-2026.07"
    || pack.level !== 3
    || pack.lessonId !== LESSON_ID
    || pack.state !== "ai-assisted-content-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push("HSK3 paragraph content must remain learner-hidden draft");
  }
  if (
    pack.derivedArtifactLicense !== "CC-BY-SA-4.0"
    || pack.source?.lessonBlueprintPackId !== blueprintBundle.pack.packId
    || pack.source?.lessonBlueprintPackSha256
      !== fileSha256(blueprintBundle.packPath)
    || pack.source?.vocabularyDraftId
      !== blueprintBundle.vocabularyBundle.draft.draftId
    || pack.source?.vocabularyDraftSha256
      !== fileSha256(blueprintBundle.vocabularyBundle.draftPath)
  ) {
    errors.push("HSK3 paragraph source or license binding is stale");
  }
  if (
    pack.authorship?.method
      !== "ai-assisted-paragraph-and-practice-draft"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.assessmentEditor !== null
    || pack.authorship?.audioRightsReviewer !== null
  ) {
    errors.push("HSK3 paragraph authorship must not imply human review");
  }
  if (
    pack.audioPolicy?.committedAudio !== false
    || pack.audioPolicy?.browserTtsPreviewOnly !== true
    || pack.audioPolicy?.reviewedHumanOrLicensedAudioRequiredForRelease
      !== true
    || pack.audioPolicy?.browserAsrCanScoreSpeakingMastery !== false
    || pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.assessmentReviewRequiredForRelease !== true
    || pack.reviewPolicy?.audioRightsRequiredWhereAudioDependent !== true
    || pack.reviewPolicy?.sourceExposedPracticeCannotCalibrateAssessment
      !== true
  ) {
    errors.push("HSK3 paragraph review and audio policy must fail closed");
  }
  if (
    pack.coverageClaims?.lessonVocabularyDrafted !== true
    || pack.coverageClaims?.lessonVocabularyAppearsInAuthoredText !== true
    || pack.coverageClaims?.paragraphPracticeDrafted !== true
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.assessmentCoverageComplete !== false
    || pack.coverageClaims?.hsk3Complete !== false
  ) {
    errors.push("HSK3 paragraph coverage claims are invalid");
  }

  const lesson = blueprintBundle.pack.lessons.find(
    (candidate) => candidate.lessonId === LESSON_ID,
  );
  const sourceById = new Map(
    blueprintBundle.vocabularyBundle.draft.entries.map((entry) => [
      entry.officialId,
      entry,
    ]),
  );
  const lexemes = Array.isArray(pack.lexemes) ? pack.lexemes : [];
  const expectedVocabularyIds =
    lesson?.inventoryMappings.vocabularyIds ?? [];
  if (
    !lesson
    || lexemes.length !== 20
    || duplicates(lexemes.map((lexeme) => lexeme.officialId)).length > 0
    || !exactSet(
      lexemes.map((lexeme) => lexeme.officialId),
      expectedVocabularyIds,
    )
  ) {
    errors.push("HSK3 paragraph lexemes must cover the exact lesson vocabulary");
  }
  for (const lexeme of lexemes) {
    const source = sourceById.get(lexeme.officialId);
    const expectedSourceDigests = [
      ...new Set(source?.sourceMatches.map(
        (match) => match.sourceLineSha256,
      ) ?? []),
    ];
    if (
      !source
      || lexeme.sequence !== source.sequence
      || lexeme.simplified !== source.simplified
      || lexeme.pinyin !== source.officialPinyin
      || lexeme.officialPartOfSpeech !== source.officialPartOfSpeech
      || !validText(lexeme.vietnameseGlossDraft, 1, 180)
      || !exactSet(lexeme.sourceLineSha256 ?? [], expectedSourceDigests)
      || lexeme.sourceSenseReview !== "pending"
      || lexeme.mandarinLinguisticReview !== "pending"
      || lexeme.vietnameseEditorialReview !== "pending"
    ) {
      errors.push(`${lexeme.officialId} lexeme binding or review is invalid`);
    }
  }

  const texts = Array.isArray(pack.texts) ? pack.texts : [];
  if (
    texts.length !== 2
    || !exact(texts.map((text) => text.textId), TEXT_IDS)
    || !exact(
      texts.map((text) => text.kind),
      ["graded-reading", "graded-listening"],
    )
  ) {
    errors.push("HSK3 paragraph pack must contain one reading and one listening");
  }
  const lineIds = [];
  for (const text of texts) {
    if (
      !validText(text.titleHanzi, 2, 80)
      || !validText(text.titleVi, 5, 120)
      || text.audio !== null
      || !Array.isArray(text.lines)
      || text.lines.length !== 8
    ) {
      errors.push(`${text.textId} paragraph contract is invalid`);
      continue;
    }
    for (const line of text.lines) {
      lineIds.push(`${text.textId}:${line.lineId}`);
      if (
        !validText(line.lineId, 3, 20)
        || !validText(line.hanzi, 8, 160)
        || !validText(line.pinyin, 8, 300)
        || !validText(line.vietnamese, 10, 350)
      ) {
        errors.push(`${text.textId}:${line.lineId} line is incomplete`);
      }
    }
  }
  if (duplicates(lineIds).length > 0) {
    errors.push("HSK3 paragraph line IDs must be unique within their texts");
  }
  const combinedHanzi = texts.flatMap((text) =>
    text.lines?.map((line) => line.hanzi) ?? []
  ).join("");
  for (const lexeme of lexemes) {
    if (!combinedHanzi.includes(lexeme.simplified)) {
      errors.push(`${lexeme.officialId} is absent from the authored paragraphs`);
    }
  }

  const vocabularyItems = Array.isArray(pack.vocabularyPracticeItems)
    ? pack.vocabularyPracticeItems
    : [];
  if (
    vocabularyItems.length !== 60
    || duplicates(vocabularyItems.map((item) => item.itemId)).length > 0
  ) {
    errors.push("HSK3 paragraph vocabulary practice must contain 60 items");
  }
  const vocabularyItemById = new Map(
    vocabularyItems.map((item) => [item.itemId, item]),
  );
  for (const lexeme of lexemes) {
    for (const [suffix, kind] of [
      ["meaning", "meaning-selection"],
      ["pinyin", "pinyin-recognition"],
      ["listening", "listening-selection"],
    ]) {
      const itemId = `${LESSON_ID}:${lexeme.officialId}:${suffix}`;
      const item = vocabularyItemById.get(itemId);
      if (
        !item
        || item.kind !== kind
        || item.lessonId !== LESSON_ID
        || item.officialVocabularyId !== lexeme.officialId
        || !hasPracticeState(item)
        || item.scoringPolicy !== "automatic-draft-only"
        || !Array.isArray(item.options)
        || item.options.length !== 4
        || new Set(item.options).size !== 4
        || !item.options.includes(item.correctAnswer)
      ) {
        errors.push(`${itemId} vocabulary practice contract is invalid`);
        continue;
      }
      if (
        (kind === "meaning-selection"
          && (
            item.prompt !== lexeme.simplified
            || item.correctAnswer !== lexeme.vietnameseGlossDraft
          ))
        || (kind === "pinyin-recognition"
          && (
            item.prompt !== lexeme.simplified
            || item.correctAnswer !== lexeme.pinyin
          ))
        || (kind === "listening-selection"
          && (
            item.prompt !== "Chọn từ bạn nghe được."
            || item.correctAnswer !== lexeme.simplified
            || item.audio !== null
            || item.ttsText !== lexeme.simplified
            || item.ttsDisclosure !== "synthetic-browser-voice"
          ))
      ) {
        errors.push(`${itemId} vocabulary practice content is invalid`);
      }
    }
  }

  const comprehensionItems = Array.isArray(pack.comprehensionItems)
    ? pack.comprehensionItems
    : [];
  const comprehensionKinds = new Set([
    "main-idea",
    "detail",
    "sequence",
    "reference",
    "simple-inference",
  ]);
  if (
    comprehensionItems.length !== 10
    || duplicates(comprehensionItems.map((item) => item.itemId)).length > 0
  ) {
    errors.push("HSK3 paragraph pack must contain 10 comprehension items");
  }
  for (const item of comprehensionItems) {
    const expectedTextId = item.skill === "reading"
      ? TEXT_IDS[0]
      : item.skill === "listening"
        ? TEXT_IDS[1]
        : null;
    if (
      item.textId !== expectedTextId
      || !comprehensionKinds.has(item.kind)
      || !validText(item.promptVi, 10, 220)
      || !Array.isArray(item.optionsVi)
      || item.optionsVi.length !== 4
      || new Set(item.optionsVi).size !== 4
      || !Number.isInteger(item.correctOptionIndex)
      || item.correctOptionIndex < 0
      || item.correctOptionIndex > 3
      || !validText(item.rationaleVi, 10, 300)
      || item.scoringPolicy !== "source-exposed-practice-only"
      || !hasPracticeState(item)
      || (item.skill === "listening"
        && (
          item.audio !== null
          || item.ttsDisclosure !== "synthetic-browser-voice"
        ))
    ) {
      errors.push(`${item.itemId} comprehension item is invalid`);
    }
  }

  const noteGrids = Array.isArray(pack.noteGrids) ? pack.noteGrids : [];
  if (
    noteGrids.length !== 2
    || !exactSet(noteGrids.map((item) => item.textId), TEXT_IDS)
  ) {
    errors.push("HSK3 paragraph pack must contain two note grids");
  }
  for (const item of noteGrids) {
    if (
      !["reading", "listening"].includes(item.skill)
      || !validText(item.promptVi, 10, 200)
      || !Array.isArray(item.fields)
      || item.fields.length !== 4
      || item.fields.some(
        (field) =>
          !validText(field.key, 2, 40)
          || !validText(field.labelVi, 3, 100)
          || !validText(field.modelVi, 8, 220),
      )
      || item.responseMode !== "learner-notes-with-model-reveal"
      || item.scoringPolicy !== "source-exposed-practice-only"
      || !hasPracticeState(item)
      || (item.skill === "listening" && item.audio !== null)
    ) {
      errors.push(`${item.itemId} note-grid item is invalid`);
    }
  }

  const summaries = Array.isArray(pack.guidedSummaries)
    ? pack.guidedSummaries
    : [];
  if (
    summaries.length !== 2
    || !exactSet(summaries.map((item) => item.textId), TEXT_IDS)
  ) {
    errors.push("HSK3 paragraph pack must contain two guided summaries");
  }
  for (const item of summaries) {
    if (
      !["writing", "speaking"].includes(item.skill)
      || !validText(item.promptVi, 15, 250)
      || !Array.isArray(item.requiredElements)
      || item.requiredElements.length < 3
      || !validText(item.modelHanzi, 30, 600)
      || !validText(item.modelPinyin, 30, 900)
      || !validText(item.modelVi, 30, 900)
      || item.responseMode
        !== "self-record-or-write-with-model-reveal"
      || item.reviewedRubric !== null
      || item.scoringPolicy !== "source-exposed-practice-only"
      || !hasPracticeState(item)
    ) {
      errors.push(`${item.itemId} guided summary is invalid`);
    }
  }

  const allPracticeItems = [
    ...vocabularyItems,
    ...comprehensionItems,
    ...noteGrids,
    ...summaries,
  ];
  if (
    duplicates(allPracticeItems.map((item) => item.itemId)).length > 0
  ) {
    errors.push("HSK3 paragraph practice item IDs must be globally unique");
  }
  const reviewBatches = Array.isArray(pack.reviewBatches)
    ? pack.reviewBatches
    : [];
  const batch = reviewBatches[0];
  if (
    reviewBatches.length !== 1
    || batch?.batchId !== `${LESSON_ID}:content-review-v1`
    || batch?.lessonId !== LESSON_ID
    || !exact(batch.lexemeIds, lexemes.map((lexeme) => lexeme.officialId))
    || !exact(batch.textIds, TEXT_IDS)
    || !exact(
      batch.practiceItemIds,
      allPracticeItems.map((item) => item.itemId),
    )
    || !exact(batch.requiredRoles, [
      "native-mandarin-reviewer",
      "vietnamese-editor",
      "assessment-editor",
      "audio-rights-reviewer",
    ])
    || batch.state !== "pending"
    || !exact(batch.approvals, [])
  ) {
    errors.push("HSK3 paragraph review batch is invalid");
  }

  const audioDependentItems =
    vocabularyItems.filter((item) =>
      item.kind === "listening-selection"
    ).length
    + comprehensionItems.filter((item) => item.skill === "listening").length
    + noteGrids.filter((item) => item.skill === "listening").length
    + summaries.filter((item) => item.skill === "speaking").length;
  const expectedCounts = {
    lessons: 1,
    vocabularyDrafts: lexemes.length,
    authoredTexts: texts.length,
    authoredTextLines: texts.flatMap((text) => text.lines ?? []).length,
    vocabularyPracticeItems: vocabularyItems.length,
    comprehensionItems: comprehensionItems.length,
    readingComprehensionItems: comprehensionItems.filter(
      (item) => item.skill === "reading",
    ).length,
    listeningComprehensionItems: comprehensionItems.filter(
      (item) => item.skill === "listening",
    ).length,
    noteGridItems: noteGrids.length,
    guidedSummaryItems: summaries.length,
    authoredPracticeItems: allPracticeItems.length,
    audioDependentItems,
    reviewedAudioItems: 0,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    reviewBatches: reviewBatches.length,
    approvals: 0,
    releaseEligibleItems: 0,
  };
  if (!exact(pack.counts, expectedCounts)) {
    errors.push("HSK3 paragraph summary counts are stale");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk3PersonalParagraphPackBundle = (bundle) => {
  const result = validateHsk3PersonalParagraphPackBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK3 personal paragraph pack:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
