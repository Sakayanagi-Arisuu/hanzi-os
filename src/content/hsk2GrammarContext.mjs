import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk2LessonBlueprintsBundle,
  loadHsk2LessonBlueprintsBundle,
} from "./hsk2LessonBlueprints.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK2_GRAMMAR_CONTEXT_RELATIVE_PATH =
  "content/drafts/hsk2-grammar-context-2026.07.json";

const REQUIRED_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "grammar-pedagogy-reviewer",
];
const HANZI_PATTERN = /\p{Script=Han}/u;
const PINYIN_PATTERN = /[A-Za-zÀ-žüÜ]/u;
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
const validDraftString = (value, minimum = 1, maximum = 600) =>
  typeof value === "string"
  && value.length >= minimum
  && value.length <= maximum;

export const loadHsk2GrammarContextBundle = (root = process.cwd()) => {
  const blueprintBundle = loadHsk2LessonBlueprintsBundle(root);
  const packPath = join(root, HSK2_GRAMMAR_CONTEXT_RELATIVE_PATH);
  return {
    blueprintBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk2GrammarContextBundle = ({
  blueprintBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk2LessonBlueprintsBundle(blueprintBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (
    !isRecord(pack)
    || pack.schemaVersion !== 1
    || pack.packId !== "hsk2-grammar-context-2026.07"
    || pack.level !== 2
  ) {
    return {
      valid: false,
      errors: ["HSK2 grammar-context identity is invalid"],
    };
  }
  if (
    pack.state !== "ai-assisted-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push(
      "HSK2 grammar-context pack must remain learner-hidden AI-assisted draft",
    );
  }
  if (
    pack.source?.scopeId !== blueprintBundle.scopeBundle.scope.scopeId
    || pack.source?.syllabusInventorySha256
      !== blueprintBundle.scopeBundle.graphBundle.syllabus.inventorySha256
    || pack.source?.lessonBlueprintPackId !== blueprintBundle.pack.packId
    || pack.source?.lessonBlueprintPackSha256
      !== fileSha256(blueprintBundle.packPath)
  ) {
    errors.push("HSK2 grammar-context source binding is stale");
  }
  if (
    pack.authorship?.method
      !== "ai-assisted-grammar-explanation-and-context-draft"
    || pack.authorship?.assistant !== "OpenAI Codex"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.grammarPedagogyReviewer !== null
  ) {
    errors.push("HSK2 grammar-context pack must not imply human review");
  }
  if (
    pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.grammarPedagogyReviewRequiredForRelease !== true
    || pack.reviewPolicy?.productiveScoringReviewRequiredForMeasurement
      !== true
  ) {
    errors.push("HSK2 grammar-context review policy must remain fail-closed");
  }
  if (
    pack.coverageClaims?.officialGrammarInventoryDraftMapped !== true
    || pack.coverageClaims?.grammarContextDraftComplete !== true
    || pack.coverageClaims?.reviewedGrammarContentComplete !== false
    || pack.coverageClaims?.measurementCoverageComplete !== false
    || pack.coverageClaims?.hsk2Complete !== false
  ) {
    errors.push("HSK2 grammar-context coverage claims are invalid");
  }

  const officialGrammarRows =
    blueprintBundle.scopeBundle.graphBundle.syllabus.inventory.grammarRows
      .filter((item) => item.level === 2);
  const officialGrammarById = new Map(
    officialGrammarRows.map((item) => [item.id, item]),
  );
  const sentenceChainLessons = blueprintBundle.pack.lessons.filter(
    (lesson) => lesson.blueprintKind === "sentence-chain",
  );
  const lessonById = new Map(
    sentenceChainLessons.map((lesson) => [lesson.lessonId, lesson]),
  );
  const expectedLessonByGrammarId = new Map(
    sentenceChainLessons.flatMap((lesson) =>
      lesson.inventoryMappings.grammarRowIds.map((grammarRowId) => [
        grammarRowId,
        {
          lessonId: lesson.lessonId,
          unitId: lesson.unitId,
          trackId: lesson.trackId,
        },
      ])
    ),
  );

  if (!Array.isArray(pack.grammarDrafts)) {
    errors.push("HSK2 grammar drafts must be an array");
  } else {
    const grammarIds = pack.grammarDrafts.map(
      (draft) => draft.officialGrammarRowId,
    );
    const exampleHanzi = pack.grammarDrafts.map(
      (draft) => draft.modelExample?.hanzi,
    );
    const guidedHanzi = pack.grammarDrafts.map(
      (draft) => draft.guidedPractice?.modelAnswerHanzi,
    );
    if (
      duplicateValues(grammarIds).length > 0
      || !exactSet(grammarIds, officialGrammarRows.map((row) => row.id))
    ) {
      errors.push(
        "HSK2 grammar drafts must exactly cover all 75 official grammar rows",
      );
    }
    if (
      duplicateValues(exampleHanzi).length > 0
      || duplicateValues(guidedHanzi).length > 0
    ) {
      errors.push("HSK2 grammar examples and guided answers must be unique");
    }
    for (const draft of pack.grammarDrafts) {
      const official = officialGrammarById.get(draft.officialGrammarRowId);
      const expectedLesson = expectedLessonByGrammarId.get(
        draft.officialGrammarRowId,
      );
      if (
        !official
        || draft.officialOrdinal !== official.ordinal
        || draft.sourcePage !== official.sourcePage
        || draft.category !== official.category
        || draft.categoryName !== official.categoryName
        || draft.detail !== official.detail
        || draft.officialContent !== official.content
      ) {
        errors.push(
          `${draft.officialGrammarRowId} official grammar binding is stale`,
        );
        continue;
      }
      if (
        !expectedLesson
        || draft.lessonId !== expectedLesson.lessonId
        || draft.unitId !== expectedLesson.unitId
        || draft.trackId !== expectedLesson.trackId
      ) {
        errors.push(`${draft.officialGrammarRowId} lesson mapping is stale`);
      }
      if (!validDraftString(draft.explanationViDraft, 30, 600)) {
        errors.push(
          `${draft.officialGrammarRowId} Vietnamese explanation is invalid`,
        );
      }
      if (
        !isRecord(draft.modelExample)
        || !validDraftString(draft.modelExample.hanzi, 2, 240)
        || !HANZI_PATTERN.test(draft.modelExample.hanzi)
        || !validDraftString(draft.modelExample.pinyin, 2, 360)
        || !PINYIN_PATTERN.test(draft.modelExample.pinyin)
        || !validDraftString(draft.modelExample.meaningVi, 2, 360)
      ) {
        errors.push(
          `${draft.officialGrammarRowId} model example is invalid`,
        );
      }
      if (
        !isRecord(draft.guidedPractice)
        || !validDraftString(draft.guidedPractice.promptVi, 8, 360)
        || !validDraftString(
          draft.guidedPractice.modelAnswerHanzi,
          2,
          240,
        )
        || !HANZI_PATTERN.test(draft.guidedPractice.modelAnswerHanzi)
        || !validDraftString(
          draft.guidedPractice.modelAnswerPinyin,
          2,
          360,
        )
        || !PINYIN_PATTERN.test(draft.guidedPractice.modelAnswerPinyin)
        || !validDraftString(
          draft.guidedPractice.modelAnswerMeaningVi,
          2,
          360,
        )
        || draft.guidedPractice.modelAnswerHanzi
          === draft.modelExample?.hanzi
      ) {
        errors.push(
          `${draft.officialGrammarRowId} guided practice is invalid`,
        );
      }
      if (
        draft.review?.machineAssisted !== true
        || draft.review?.nativeMandarinReview !== "pending"
        || draft.review?.vietnameseEditorialReview !== "pending"
        || draft.review?.grammarPedagogyReview !== "pending"
      ) {
        errors.push(
          `${draft.officialGrammarRowId} review state must remain pending`,
        );
      }
    }
  }

  const draftById = new Map(
    (pack.grammarDrafts ?? []).map((draft) => [
      draft.officialGrammarRowId,
      draft,
    ]),
  );
  if (!Array.isArray(pack.practiceItems) || pack.practiceItems.length !== 75) {
    errors.push(
      "HSK2 grammar-context pack must contain exactly 75 practice items",
    );
  } else {
    const itemIds = pack.practiceItems.map((item) => item.itemId);
    const itemGrammarIds = pack.practiceItems.map(
      (item) => item.officialGrammarRowId,
    );
    if (
      duplicateValues(itemIds).length > 0
      || duplicateValues(itemGrammarIds).length > 0
      || !exactSet(itemGrammarIds, officialGrammarRows.map((row) => row.id))
    ) {
      errors.push(
        "HSK2 grammar practice must cover every grammar row exactly once",
      );
    }
    for (const item of pack.practiceItems) {
      const draft = draftById.get(item.officialGrammarRowId);
      if (
        !draft
        || item.itemId
          !== `${draft.lessonId}:${draft.officialGrammarRowId}:guided`
        || item.lessonId !== draft.lessonId
        || item.kind !== "guided-pattern-production"
        || item.promptVi !== draft.guidedPractice.promptVi
        || item.modelAnswer?.hanzi
          !== draft.guidedPractice.modelAnswerHanzi
        || item.modelAnswer?.pinyin
          !== draft.guidedPractice.modelAnswerPinyin
        || item.modelAnswer?.meaningVi
          !== draft.guidedPractice.modelAnswerMeaningVi
        || item.scoringPolicy !== "self-reveal-only"
      ) {
        errors.push(`${item.itemId} grammar practice content is invalid`);
      }
      if (
        item.review !== "pending"
        || item.measurementEligible !== false
        || item.masteryEligible !== false
        || item.releaseEligible !== false
      ) {
        errors.push(
          `${item.itemId} must remain pending and mastery-ineligible`,
        );
      }
    }
  }

  if (
    !Array.isArray(pack.reviewBatches)
    || pack.reviewBatches.length !== sentenceChainLessons.length
  ) {
    errors.push(
      "HSK2 grammar-context pack must have one review batch per sentence-chain lesson",
    );
  } else {
    if (!exactSet(
      pack.reviewBatches.map((batch) => batch.lessonId),
      sentenceChainLessons.map((lesson) => lesson.lessonId),
    )) {
      errors.push(
        "HSK2 grammar review batches must cover every sentence-chain lesson",
      );
    }
    for (const batch of pack.reviewBatches) {
      const lesson = lessonById.get(batch.lessonId);
      const expectedItemIds = (pack.practiceItems ?? []).filter(
        (item) => item.lessonId === batch.lessonId,
      ).map((item) => item.itemId);
      if (
        !lesson
        || batch.batchId !== `${batch.lessonId}:grammar-review-v1`
        || !exactSet(
          batch.grammarRowIds ?? [],
          lesson.inventoryMappings.grammarRowIds,
        )
        || !exactSet(batch.practiceItemIds ?? [], expectedItemIds)
        || JSON.stringify(batch.requiredRoles)
          !== JSON.stringify(REQUIRED_ROLES)
        || batch.state !== "pending"
        || !Array.isArray(batch.approvals)
        || batch.approvals.length !== 0
      ) {
        errors.push(
          `${batch.batchId} review batch is incomplete or pre-approved`,
        );
      }
    }
  }

  if (
    Array.isArray(pack.grammarDrafts)
    && Array.isArray(pack.practiceItems)
    && Array.isArray(pack.reviewBatches)
  ) {
    const expectedCounts = {
      lessonBlueprints: blueprintBundle.pack.lessons.length,
      sentenceChainLessons: sentenceChainLessons.length,
      grammarDrafts: pack.grammarDrafts.length,
      modelExamples: pack.grammarDrafts.length,
      guidedPracticeItems: pack.practiceItems.length,
      reviewBatches: pack.reviewBatches.length,
      approvals: pack.reviewBatches.reduce(
        (sum, batch) => sum + (batch.approvals?.length ?? 0),
        0,
      ),
      measurementEligibleItems: pack.practiceItems.filter(
        (item) => item.measurementEligible === true,
      ).length,
      masteryEligibleItems: pack.practiceItems.filter(
        (item) => item.masteryEligible === true,
      ).length,
      releaseEligibleItems: pack.practiceItems.filter(
        (item) => item.releaseEligible === true,
      ).length,
    };
    if (JSON.stringify(pack.counts) !== JSON.stringify(expectedCounts)) {
      errors.push(
        "HSK2 grammar-context counts do not match its actual content",
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: pack.counts,
  };
};

export const assertValidHsk2GrammarContextBundle = (bundle) => {
  const result = validateHsk2GrammarContextBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK2 grammar-context pack:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
