import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk1CurriculumScopeBundle,
  loadHsk1CurriculumScopeBundle,
} from "./hsk1CurriculumScope.mjs";
import {
  assertValidHsk1VocabularyDraftBundle,
  loadHsk1VocabularyDraftBundle,
} from "./hsk1VocabularyDraft.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH =
  "content/drafts/hsk1-communicative-units-2026.07.json";

const EXPECTED_UNITS = [
  "hsk1-time-place-events",
  "hsk1-daily-life",
  "hsk1-travel-leisure",
  "hsk1-study-work",
];
const EXPECTED_LESSON_COUNTS = new Map([
  ["hsk1-time-place-events", 6],
  ["hsk1-daily-life", 4],
  ["hsk1-travel-leisure", 2],
  ["hsk1-study-work", 4],
]);
const EXPECTED_KINDS = [
  "meaning-recall",
  "pinyin-recognition",
  "listening-selection",
];
const REQUIRED_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
];

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};
const exactSet = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
const exactPartition = ({ errors, label, actual, expected }) => {
  if (duplicateValues(actual).length > 0 || !exactSet(actual, expected)) {
    errors.push(`${label} must exactly partition its unit scope`);
  }
};

export const loadHsk1CommunicativeUnitPacksBundle = (
  root = process.cwd(),
) => {
  const scopeBundle = loadHsk1CurriculumScopeBundle(root);
  const vocabularyBundle = loadHsk1VocabularyDraftBundle(root);
  const collectionPath = join(
    root,
    HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH,
  );
  return {
    scopeBundle,
    vocabularyBundle,
    collectionPath,
    collection: JSON.parse(readFileSync(collectionPath, "utf8")),
  };
};

const validateLexemes = ({
  errors,
  pack,
  unitScope,
  officialVocabularyById,
  sourceDraftById,
}) => {
  if (!Array.isArray(pack.lexemes)) {
    errors.push(`${pack.unitId} lexemes must be an array`);
    return;
  }
  exactPartition({
    errors,
    label: `${pack.unitId} lexemes`,
    actual: pack.lexemes.map((lexeme) => lexeme.officialId),
    expected: unitScope.vocabularyIds,
  });
  for (const lexeme of pack.lexemes) {
    const official = officialVocabularyById.get(lexeme.officialId);
    const sourceDraft = sourceDraftById.get(lexeme.officialId);
    if (
      !official
      || !sourceDraft
      || lexeme.simplified !== official.word
      || lexeme.pinyin !== official.pinyin
      || lexeme.officialPartOfSpeech !== official.partOfSpeech
    ) {
      errors.push(`${lexeme.officialId} official vocabulary binding is stale`);
      continue;
    }
    if (
      typeof lexeme.vietnameseGlossDraft !== "string"
      || lexeme.vietnameseGlossDraft.length < 1
      || lexeme.vietnameseGlossDraft.length > 160
    ) {
      errors.push(`${lexeme.officialId} Vietnamese draft gloss is invalid`);
    }
    const expectedDigests = [
      ...new Set(sourceDraft.sourceMatches.map(
        (source) => source.sourceLineSha256,
      )),
    ];
    if (!exactSet(lexeme.sourceLineSha256 ?? [], expectedDigests)) {
      errors.push(`${lexeme.officialId} source-line provenance drifted`);
    }
    if (
      lexeme.review?.machineAssisted !== true
      || lexeme.review?.mandarinLinguisticReview !== "pending"
      || lexeme.review?.vietnameseEditorialReview !== "pending"
    ) {
      errors.push(`${lexeme.officialId} review state must remain pending`);
    }
  }
};

const validateLessons = ({ errors, pack, unitScope }) => {
  if (
    !Array.isArray(pack.lessons)
    || pack.lessons.length !== EXPECTED_LESSON_COUNTS.get(pack.unitId)
  ) {
    errors.push(`${pack.unitId} has an invalid lesson count`);
    return;
  }
  const lessonIds = pack.lessons.map((lesson) => lesson.lessonId);
  if (duplicateValues(lessonIds).length > 0) {
    errors.push(`${pack.unitId} lesson IDs must be unique`);
  }
  for (const [index, lesson] of pack.lessons.entries()) {
    const expectedPrerequisites = index === 0 ? [] : [lessonIds[index - 1]];
    if (
      lesson.sequence !== index + 1
      || JSON.stringify(lesson.prerequisiteLessonIds)
        !== JSON.stringify(expectedPrerequisites)
      || typeof lesson.titleVi !== "string"
      || lesson.titleVi.length < 3
      || typeof lesson.objectiveVi !== "string"
      || lesson.objectiveVi.length < 20
    ) {
      errors.push(`${lesson.lessonId} sequence, prerequisite or objective is invalid`);
    }
    if (
      lesson.modelDialogue?.audio !== null
      || lesson.modelDialogue?.audioPolicy !== "browser-tts-practice-only"
      || lesson.modelDialogue?.review !== "pending"
      || !Array.isArray(lesson.modelDialogue?.turns)
      || lesson.modelDialogue.turns.length !== 4
    ) {
      errors.push(`${lesson.lessonId} dialogue must have four pending-review turns`);
    } else {
      for (const [turnIndex, turn] of lesson.modelDialogue.turns.entries()) {
        if (
          !["A", "B"].includes(turn.speaker)
          || ["hanzi", "pinyin", "meaningVi"].some(
            (field) => typeof turn[field] !== "string"
              || turn[field].length < 1
              || turn[field].length > 300,
          )
        ) {
          errors.push(`${lesson.lessonId} dialogue turn ${turnIndex + 1} is invalid`);
        }
      }
    }
    if (
      lesson.practiceBlueprint?.vocabularyTarget
        !== "all-lesson-vocabulary"
      || lesson.practiceBlueprint?.grammarTarget !== "all-lesson-grammar"
      || JSON.stringify(lesson.practiceBlueprint?.requiredKinds)
        !== JSON.stringify(EXPECTED_KINDS)
      || lesson.practiceBlueprint?.authoredItemCount
        !== lesson.vocabularyIds.length * 3
      || lesson.practiceBlueprint?.grantsMastery !== false
    ) {
      errors.push(`${lesson.lessonId} practice blueprint is invalid`);
    }
  }
  for (const [field, expected] of [
    ["vocabularyIds", unitScope.vocabularyIds],
    ["taskIds", unitScope.taskIds],
    ["topicIds", unitScope.topicIds],
    ["grammarRowIds", unitScope.grammarRowIds],
  ]) {
    exactPartition({
      errors,
      label: `${pack.unitId} lesson ${field}`,
      actual: pack.lessons.flatMap((lesson) => lesson[field] ?? []),
      expected,
    });
  }
};

const validatePractice = ({ errors, pack }) => {
  const lexemeById = new Map(
    (pack.lexemes ?? []).map((lexeme) => [lexeme.officialId, lexeme]),
  );
  const lessonById = new Map(
    (pack.lessons ?? []).map((lesson) => [lesson.lessonId, lesson]),
  );
  if (
    !Array.isArray(pack.practiceItems)
    || pack.practiceItems.length !== (pack.lexemes?.length ?? 0) * 3
  ) {
    errors.push(`${pack.unitId} practice count must equal three per lexeme`);
    return;
  }
  if (duplicateValues(pack.practiceItems.map((item) => item.itemId)).length > 0) {
    errors.push(`${pack.unitId} practice item IDs must be unique`);
  }
  for (const lexeme of pack.lexemes) {
    const kinds = pack.practiceItems.filter(
      (item) => item.officialVocabularyId === lexeme.officialId,
    ).map((item) => item.kind);
    if (!exactSet(kinds, EXPECTED_KINDS)) {
      errors.push(`${lexeme.officialId} must have one item of each practice kind`);
    }
  }
  for (const item of pack.practiceItems) {
    const lexeme = lexemeById.get(item.officialVocabularyId);
    const lesson = lessonById.get(item.lessonId);
    if (
      !lexeme
      || !lesson
      || !lesson.vocabularyIds.includes(item.officialVocabularyId)
    ) {
      errors.push(`${item.itemId} target or lesson binding is invalid`);
      continue;
    }
    if (
      item.review !== "pending"
      || item.measurementEligible !== false
      || item.masteryEligible !== false
    ) {
      errors.push(`${item.itemId} must remain pending and mastery-ineligible`);
    }
    if (item.kind === "meaning-recall") {
      if (
        item.prompt !== lexeme.simplified
        || item.answer !== lexeme.vietnameseGlossDraft
        || item.scoringPolicy !== "self-reveal-only"
      ) {
        errors.push(`${item.itemId} meaning-recall content drifted`);
      }
    } else if (item.kind === "pinyin-recognition") {
      if (
        item.prompt !== lexeme.simplified
        || !Array.isArray(item.options)
        || item.options.length !== 4
        || new Set(item.options).size !== 4
        || item.correctAnswer !== lexeme.pinyin
        || !item.options.includes(lexeme.pinyin)
        || item.scoringPolicy !== "automatic-draft-only"
      ) {
        errors.push(`${item.itemId} pinyin-recognition content is invalid`);
      }
    } else if (item.kind === "listening-selection") {
      if (
        item.prompt !== "Chọn từ bạn nghe được."
        || item.ttsText !== lexeme.simplified
        || item.ttsDisclosure !== "synthetic-browser-voice"
        || !Array.isArray(item.options)
        || item.options.length !== 4
        || new Set(item.options).size !== 4
        || item.correctAnswer !== lexeme.simplified
        || !item.options.includes(lexeme.simplified)
        || item.scoringPolicy !== "automatic-draft-only"
      ) {
        errors.push(`${item.itemId} listening-selection content is invalid`);
      }
    } else {
      errors.push(`${item.itemId} has unsupported practice kind ${item.kind}`);
    }
  }

  if (
    !Array.isArray(pack.reviewBatches)
    || pack.reviewBatches.length !== pack.lessons.length
  ) {
    errors.push(`${pack.unitId} must have one review batch per lesson`);
    return;
  }
  if (!exactSet(
    pack.reviewBatches.map((batch) => batch.lessonId),
    [...lessonById.keys()],
  )) {
    errors.push(`${pack.unitId} review batches must cover every lesson once`);
  }
  for (const batch of pack.reviewBatches) {
    const expectedItemIds = pack.practiceItems.filter(
      (item) => item.lessonId === batch.lessonId,
    ).map((item) => item.itemId);
    if (
      !exactSet(batch.practiceItemIds ?? [], expectedItemIds)
      || JSON.stringify(batch.requiredRoles) !== JSON.stringify(REQUIRED_ROLES)
      || batch.state !== "pending"
      || !Array.isArray(batch.approvals)
      || batch.approvals.length !== 0
    ) {
      errors.push(`${batch.batchId} review batch is incomplete or pre-approved`);
    }
  }
};

const expectedPackCounts = (pack) => ({
  lessons: pack.lessons.length,
  vocabularyDrafts: pack.lexemes.length,
  taskBlueprintMappings:
    new Set(pack.lessons.flatMap((lesson) => lesson.taskIds)).size,
  topicBlueprintMappings:
    new Set(pack.lessons.flatMap((lesson) => lesson.topicIds)).size,
  grammarBlueprintMappings:
    new Set(pack.lessons.flatMap((lesson) => lesson.grammarRowIds)).size,
  dialogueTurns: pack.lessons.reduce(
    (total, lesson) => total + lesson.modelDialogue.turns.length,
    0,
  ),
  authoredPracticeItems: pack.practiceItems.length,
  reviewBatches: pack.reviewBatches.length,
  releaseEligibleItems: 0,
});

export const validateHsk1CommunicativeUnitPacksBundle = ({
  scopeBundle,
  vocabularyBundle,
  collection,
}) => {
  const errors = [];
  try {
    assertValidHsk1CurriculumScopeBundle(scopeBundle);
    assertValidHsk1VocabularyDraftBundle(vocabularyBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (!isRecord(collection) || collection.schemaVersion !== 1) {
    return { valid: false, errors: ["HSK1 communicative collection schemaVersion must be 1"] };
  }
  if (
    collection.state !== "ai-assisted-draft"
    || collection.learnerVisible !== false
    || collection.releaseEligible !== false
    || collection.derivedArtifactLicense !== "CC-BY-SA-4.0"
  ) {
    errors.push("communicative collection must remain a learner-hidden CC-BY-SA draft");
  }
  if (
    collection.source?.scopeId !== scopeBundle.scope.scopeId
    || collection.source?.scopeSha256 !== fileSha256(scopeBundle.scopePath)
    || collection.source?.vocabularyDraftId !== vocabularyBundle.draft.draftId
    || collection.source?.vocabularyDraftSha256
      !== fileSha256(vocabularyBundle.draftPath)
  ) {
    errors.push("communicative collection source binding is stale");
  }
  if (
    collection.authorship?.method
      !== "ai-assisted-translation-and-curriculum-draft"
    || collection.authorship?.nativeMandarinReviewer !== null
    || collection.authorship?.vietnameseEditor !== null
  ) {
    errors.push("communicative collection must not imply human review");
  }
  if (
    collection.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || collection.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || collection.reviewPolicy?.assessmentReviewRequiredForRelease !== true
    || collection.reviewPolicy?.dialoguePinyinReviewRequiredForRelease !== true
  ) {
    errors.push("communicative collection review policy must remain fail-closed");
  }
  if (
    collection.coverageClaims?.communicativeUnitBlueprintsMapped !== true
    || collection.coverageClaims?.vocabularyPracticeDraftComplete !== true
    || collection.coverageClaims?.authoredPracticeCoverageComplete !== false
    || collection.coverageClaims?.reviewedContentComplete !== false
    || collection.coverageClaims?.hsk1Complete !== false
  ) {
    errors.push("communicative collection coverage claims are invalid");
  }
  if (
    !Array.isArray(collection.packs)
    || JSON.stringify(collection.packs.map((pack) => pack.unitId))
      !== JSON.stringify(EXPECTED_UNITS)
  ) {
    errors.push("communicative collection must contain the four scoped units in order");
    return { valid: false, errors };
  }

  const officialVocabularyById = new Map(
    scopeBundle.graphBundle.syllabus.inventory.vocabulary.map(
      (item) => [item.id, item],
    ),
  );
  const sourceDraftById = new Map(
    vocabularyBundle.draft.entries.map((item) => [item.officialId, item]),
  );
  for (const pack of collection.packs) {
    const unitScope = scopeBundle.scope.unitScopes.find(
      (unit) => unit.unitId === pack.unitId,
    );
    if (!unitScope) {
      errors.push(`${pack.unitId} scope is missing`);
      continue;
    }
    validateLexemes({
      errors,
      pack,
      unitScope,
      officialVocabularyById,
      sourceDraftById,
    });
    validateLessons({ errors, pack, unitScope });
    validatePractice({ errors, pack });
    if (
      Array.isArray(pack.lexemes)
      && Array.isArray(pack.lessons)
      && Array.isArray(pack.practiceItems)
      && Array.isArray(pack.reviewBatches)
      && JSON.stringify(pack.counts) !== JSON.stringify(expectedPackCounts(pack))
    ) {
      errors.push(`${pack.unitId} counts do not match its content`);
    }
  }

  const allLexemeIds = collection.packs.flatMap(
    (pack) => pack.lexemes.map((lexeme) => lexeme.officialId),
  );
  const expectedLexemeIds = scopeBundle.scope.unitScopes.filter(
    (unit) => EXPECTED_UNITS.includes(unit.unitId),
  ).flatMap((unit) => unit.vocabularyIds);
  if (
    duplicateValues(allLexemeIds).length > 0
    || !exactSet(allLexemeIds, expectedLexemeIds)
  ) {
    errors.push("communicative packs must cover the remaining 193 vocabulary once");
  }

  const allLessons = collection.packs.flatMap((pack) => pack.lessons);
  const allItems = collection.packs.flatMap((pack) => pack.practiceItems);
  const allBatches = collection.packs.flatMap((pack) => pack.reviewBatches);
  const expectedCounts = {
    units: 4,
    lessons: allLessons.length,
    vocabularyDrafts: allLexemeIds.length,
    taskBlueprintMappings: new Set(
      allLessons.flatMap((lesson) => lesson.taskIds),
    ).size,
    topicBlueprintMappings: new Set(
      allLessons.flatMap((lesson) => lesson.topicIds),
    ).size,
    grammarBlueprintMappings: new Set(
      allLessons.flatMap((lesson) => lesson.grammarRowIds),
    ).size,
    dialogueTurns: allLessons.reduce(
      (total, lesson) => total + lesson.modelDialogue.turns.length,
      0,
    ),
    authoredPracticeItems: allItems.length,
    meaningRecallItems: allItems.filter(
      (item) => item.kind === "meaning-recall",
    ).length,
    pinyinRecognitionItems: allItems.filter(
      (item) => item.kind === "pinyin-recognition",
    ).length,
    listeningSelectionItems: allItems.filter(
      (item) => item.kind === "listening-selection",
    ).length,
    reviewBatches: allBatches.length,
    releaseEligibleItems: 0,
  };
  if (JSON.stringify(collection.counts) !== JSON.stringify(expectedCounts)) {
    errors.push("communicative collection counts do not match its content");
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: collection.counts,
  };
};

export const assertValidHsk1CommunicativeUnitPacksBundle = (bundle) => {
  const result = validateHsk1CommunicativeUnitPacksBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 communicative unit packs:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
