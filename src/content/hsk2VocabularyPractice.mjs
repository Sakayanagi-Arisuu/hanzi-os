import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk2LessonBlueprintsBundle,
  loadHsk2LessonBlueprintsBundle,
} from "./hsk2LessonBlueprints.mjs";
import {
  assertValidHsk2VocabularyDraftBundle,
  loadHsk2VocabularyDraftBundle,
} from "./hsk2VocabularyDraft.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK2_VOCABULARY_PRACTICE_RELATIVE_PATH =
  "content/drafts/hsk2-vocabulary-practice-2026.07.json";

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactArray = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);
const exactSet = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};
const validText = (value, minimum = 1, maximum = 500) =>
  typeof value === "string"
  && value.length >= minimum
  && value.length <= maximum;

export const loadHsk2VocabularyPracticeBundle = (root = process.cwd()) => {
  const vocabularyBundle = loadHsk2VocabularyDraftBundle(root);
  const blueprintBundle = loadHsk2LessonBlueprintsBundle(root);
  const packPath = join(root, HSK2_VOCABULARY_PRACTICE_RELATIVE_PATH);
  return {
    vocabularyBundle,
    blueprintBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk2VocabularyPracticeBundle = ({
  vocabularyBundle,
  blueprintBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk2VocabularyDraftBundle(vocabularyBundle);
    assertValidHsk2LessonBlueprintsBundle(blueprintBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (!isRecord(pack) || pack.schemaVersion !== 1) {
    return {
      valid: false,
      errors: ["HSK2 vocabulary-practice pack schemaVersion must be 1"],
    };
  }
  if (
    pack.packId !== "hsk2-vocabulary-practice-2026.07"
    || pack.level !== 2
    || pack.state !== "ai-assisted-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push("HSK2 vocabulary practice must remain learner-hidden draft");
  }
  if (
    pack.derivedArtifactLicense !== "CC-BY-SA-4.0"
    || pack.source?.vocabularyDraftId !== vocabularyBundle.draft.draftId
    || pack.source?.vocabularyDraftSha256 !== fileSha256(
      vocabularyBundle.draftPath,
    )
    || pack.source?.lessonBlueprintPackId !== blueprintBundle.pack.packId
    || pack.source?.lessonBlueprintPackSha256 !== fileSha256(
      blueprintBundle.packPath,
    )
  ) {
    errors.push("HSK2 vocabulary-practice source or license binding is stale");
  }
  if (
    pack.authorship?.method !== "ai-assisted-translation-and-practice-draft"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.assessmentEditor !== null
  ) {
    errors.push("HSK2 vocabulary-practice authorship must not imply review");
  }
  if (
    pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.assessmentReviewRequiredForRelease !== true
    || pack.reviewPolicy?.reviewedAudioRequiredForMeasurement !== true
    || pack.reviewPolicy?.browserTtsPracticeOnly !== true
  ) {
    errors.push("HSK2 vocabulary-practice review policy must remain fail-closed");
  }
  if (
    pack.coverageClaims?.vocabularyDraftCoverageComplete !== true
    || pack.coverageClaims?.vocabularyPracticeDraftComplete !== true
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.assessmentCoverageComplete !== false
    || pack.coverageClaims?.hsk2Complete !== false
  ) {
    errors.push("HSK2 vocabulary-practice coverage claims are invalid");
  }

  const sourceById = new Map(
    vocabularyBundle.draft.entries.map(
      (entry) => [entry.officialId, entry],
    ),
  );
  const situationalLessons = blueprintBundle.pack.lessons.filter(
    (lesson) => lesson.blueprintKind === "situational-dialogue",
  );
  const blueprintLessonByVocabularyId = new Map(
    situationalLessons.flatMap((lesson) =>
      lesson.inventoryMappings.vocabularyIds.map(
        (officialId) => [officialId, lesson.lessonId],
      )
    ),
  );
  const lexemes = Array.isArray(pack.lexemes) ? pack.lexemes : [];
  if (lexemes.length !== 200) {
    errors.push("HSK2 vocabulary-practice pack must contain 200 lexemes");
  }
  if (
    duplicateValues(lexemes.map((lexeme) => lexeme.officialId)).length > 0
    || !exactSet(lexemes.map((lexeme) => lexeme.officialId), sourceById.keys())
  ) {
    errors.push("HSK2 lexemes must exactly partition the source draft");
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
      || lexeme.lessonId !== blueprintLessonByVocabularyId.get(
        lexeme.officialId,
      )
      || lexeme.simplified !== source.simplified
      || lexeme.pinyin !== source.officialPinyin
      || lexeme.officialPartOfSpeech !== source.officialPartOfSpeech
      || !validText(lexeme.vietnameseGlossDraft, 1, 160)
      || !exactSet(lexeme.sourceLineSha256 ?? [], expectedSourceDigests)
    ) {
      errors.push(`${lexeme.officialId} source, lesson or gloss binding is invalid`);
    }
    if (
      lexeme.review?.machineAssisted !== true
      || lexeme.review?.mandarinLinguisticReview !== "pending"
      || lexeme.review?.vietnameseEditorialReview !== "pending"
    ) {
      errors.push(`${lexeme.officialId} review state must remain pending`);
    }
  }

  const assignments = Array.isArray(pack.lessonAssignments)
    ? pack.lessonAssignments
    : [];
  const situationalLessonIds = situationalLessons.map(
    (lesson) => lesson.lessonId,
  );
  if (
    assignments.length !== 20
    || duplicateValues(assignments.map(
      (assignment) => assignment.lessonId,
    )).length > 0
    || !exactSet(
      assignments.map((assignment) => assignment.lessonId),
      situationalLessonIds,
    )
  ) {
    errors.push("HSK2 vocabulary assignments must cover 20 situational lessons");
  }
  for (const assignment of assignments) {
    const lesson = situationalLessons.find(
      (candidate) => candidate.lessonId === assignment.lessonId,
    );
    if (
      !lesson
      || !exactArray(
        assignment.vocabularyIds,
        lesson.inventoryMappings.vocabularyIds,
      )
      || !Array.isArray(assignment.practiceItemIds)
      || assignment.practiceItemIds.length
        !== assignment.vocabularyIds.length * 3
    ) {
      errors.push(`${assignment.lessonId} vocabulary assignment is invalid`);
    }
  }

  const practiceItems = Array.isArray(pack.practiceItems)
    ? pack.practiceItems
    : [];
  if (
    practiceItems.length !== 600
    || duplicateValues(practiceItems.map((item) => item.itemId)).length > 0
  ) {
    errors.push("HSK2 vocabulary practice must contain 600 unique items");
  }
  const itemById = new Map(
    practiceItems.map((item) => [item.itemId, item]),
  );
  for (const lexeme of lexemes) {
    const expectedItems = [
      {
        id: `${lexeme.lessonId}:${lexeme.officialId}:meaning`,
        kind: "meaning-recall",
      },
      {
        id: `${lexeme.lessonId}:${lexeme.officialId}:pinyin`,
        kind: "pinyin-recognition",
      },
      {
        id: `${lexeme.lessonId}:${lexeme.officialId}:listening`,
        kind: "listening-selection",
      },
    ];
    for (const expected of expectedItems) {
      const item = itemById.get(expected.id);
      if (
        !item
        || item.kind !== expected.kind
        || item.lessonId !== lexeme.lessonId
        || item.officialVocabularyId !== lexeme.officialId
        || item.review !== "pending"
        || item.releaseEligible !== false
        || item.measurementEligible !== false
        || item.masteryEligible !== false
      ) {
        errors.push(`${expected.id} identity or eligibility is invalid`);
        continue;
      }
      if (
        item.kind === "meaning-recall"
        && (
          item.prompt !== lexeme.simplified
          || item.answer !== lexeme.vietnameseGlossDraft
          || item.scoringPolicy !== "self-reveal-only"
        )
      ) {
        errors.push(`${item.itemId} meaning-recall content is invalid`);
      }
      if (
        item.kind === "pinyin-recognition"
        && (
          item.prompt !== lexeme.simplified
          || item.correctAnswer !== lexeme.pinyin
          || item.scoringPolicy !== "automatic-draft-only"
          || !Array.isArray(item.options)
          || item.options.length !== 4
          || new Set(item.options).size !== 4
          || !item.options.includes(item.correctAnswer)
        )
      ) {
        errors.push(`${item.itemId} pinyin options are invalid`);
      }
      if (
        item.kind === "listening-selection"
        && (
          item.prompt !== "Chọn từ bạn nghe được."
          || item.audio !== null
          || item.ttsText !== lexeme.simplified
          || item.ttsDisclosure !== "synthetic-browser-voice"
          || item.correctAnswer !== lexeme.simplified
          || item.scoringPolicy !== "automatic-draft-only"
          || !Array.isArray(item.options)
          || item.options.length !== 4
          || new Set(item.options).size !== 4
          || !item.options.includes(item.correctAnswer)
        )
      ) {
        errors.push(`${item.itemId} listening options or audio policy are invalid`);
      }
    }
  }
  const assignedPracticeIds = assignments.flatMap(
    (assignment) => assignment.practiceItemIds ?? [],
  );
  if (
    duplicateValues(assignedPracticeIds).length > 0
    || !exactSet(assignedPracticeIds, itemById.keys())
  ) {
    errors.push("HSK2 lesson assignments must exactly partition practice items");
  }

  const reviewBatches = Array.isArray(pack.reviewBatches)
    ? pack.reviewBatches
    : [];
  if (
    reviewBatches.length !== 20
    || duplicateValues(reviewBatches.map((batch) => batch.batchId)).length > 0
    || !exactSet(
      reviewBatches.map((batch) => batch.lessonId),
      situationalLessonIds,
    )
  ) {
    errors.push("HSK2 vocabulary review batches must cover all 20 lessons");
  }
  for (const batch of reviewBatches) {
    const assignment = assignments.find(
      (candidate) => candidate.lessonId === batch.lessonId,
    );
    if (
      !assignment
      || !exactArray(batch.lexemeIds, assignment.vocabularyIds)
      || !exactArray(batch.practiceItemIds, assignment.practiceItemIds)
      || !exactArray(batch.requiredRoles, [
        "native-mandarin-reviewer",
        "vietnamese-editor",
        "assessment-editor",
      ])
      || batch.state !== "pending"
      || !exactArray(batch.approvals, [])
    ) {
      errors.push(`${batch.batchId} vocabulary review batch is invalid`);
    }
  }

  const expectedCounts = {
    situationalLessons: assignments.length,
    vocabularyDrafts: lexemes.length,
    authoredPracticeItems: practiceItems.length,
    meaningRecallItems: practiceItems.filter(
      (item) => item.kind === "meaning-recall",
    ).length,
    pinyinRecognitionItems: practiceItems.filter(
      (item) => item.kind === "pinyin-recognition",
    ).length,
    listeningSelectionItems: practiceItems.filter(
      (item) => item.kind === "listening-selection",
    ).length,
    audioDependentItems: practiceItems.filter(
      (item) => item.kind === "listening-selection",
    ).length,
    reviewedAudioItems: 0,
    reviewBatches: reviewBatches.length,
    approvals: 0,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    releaseEligibleItems: 0,
  };
  if (!exactArray(pack.counts, expectedCounts)) {
    errors.push("HSK2 vocabulary-practice summary counts are stale");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk2VocabularyPracticeBundle = (bundle) => {
  const result = validateHsk2VocabularyPracticeBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK2 vocabulary practice:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
