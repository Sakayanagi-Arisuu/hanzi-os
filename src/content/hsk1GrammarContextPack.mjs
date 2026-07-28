import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk1CurriculumScopeBundle,
  loadHsk1CurriculumScopeBundle,
} from "./hsk1CurriculumScope.mjs";
import {
  assertValidHsk1PersonalExchangePackBundle,
  loadHsk1PersonalExchangePackBundle,
} from "./hsk1PersonalExchangePack.mjs";
import {
  assertValidHsk1CommunicativeUnitPacksBundle,
  loadHsk1CommunicativeUnitPacksBundle,
} from "./hsk1CommunicativeUnitPacks.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH =
  "content/drafts/hsk1-grammar-context-2026.07.json";

const REQUIRED_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "grammar-pedagogy-reviewer",
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
const validDraftString = (value, minimum = 1, maximum = 500) =>
  typeof value === "string"
  && value.length >= minimum
  && value.length <= maximum;

export const loadHsk1GrammarContextPackBundle = (
  root = process.cwd(),
) => {
  const scopeBundle = loadHsk1CurriculumScopeBundle(root);
  const personalBundle = loadHsk1PersonalExchangePackBundle(root);
  const communicativeBundle = loadHsk1CommunicativeUnitPacksBundle(root);
  const packPath = join(root, HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH);
  return {
    scopeBundle,
    personalBundle,
    communicativeBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk1GrammarContextPackBundle = ({
  scopeBundle,
  personalBundle,
  communicativeBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk1CurriculumScopeBundle(scopeBundle);
    assertValidHsk1PersonalExchangePackBundle(personalBundle);
    assertValidHsk1CommunicativeUnitPacksBundle(communicativeBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (!isRecord(pack) || pack.schemaVersion !== 1) {
    return { valid: false, errors: ["HSK1 grammar pack schemaVersion must be 1"] };
  }
  if (
    pack.state !== "ai-assisted-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push("grammar pack must remain learner-hidden AI-assisted draft");
  }
  if (
    pack.source?.scopeId !== scopeBundle.scope.scopeId
    || pack.source?.scopeSha256 !== fileSha256(scopeBundle.scopePath)
    || pack.source?.syllabusInventorySha256
      !== scopeBundle.graphBundle.syllabus.inventorySha256
    || pack.source?.personalExchangePackId !== personalBundle.pack.packId
    || pack.source?.personalExchangePackSha256
      !== fileSha256(personalBundle.packPath)
    || pack.source?.communicativeCollectionId
      !== communicativeBundle.collection.collectionId
    || pack.source?.communicativeCollectionSha256
      !== fileSha256(communicativeBundle.collectionPath)
  ) {
    errors.push("grammar pack source binding is stale");
  }
  if (
    pack.authorship?.method
      !== "ai-assisted-grammar-explanation-and-context-draft"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.grammarPedagogyReviewer !== null
  ) {
    errors.push("grammar pack must not imply human review");
  }
  if (
    pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.grammarPedagogyReviewRequiredForRelease !== true
    || pack.reviewPolicy?.productiveScoringReviewRequiredForMeasurement
      !== true
  ) {
    errors.push("grammar pack review policy must remain fail-closed");
  }
  if (
    pack.coverageClaims?.officialGrammarInventoryDraftMapped !== true
    || pack.coverageClaims?.grammarContextDraftComplete !== true
    || pack.coverageClaims?.reviewedGrammarContentComplete !== false
    || pack.coverageClaims?.measurementCoverageComplete !== false
    || pack.coverageClaims?.hsk1Complete !== false
  ) {
    errors.push("grammar pack coverage claims are invalid");
  }

  const officialGrammarRows = scopeBundle.graphBundle.syllabus.inventory
    .grammarRows.filter((item) => item.level === 1);
  const officialGrammarById = new Map(
    officialGrammarRows.map((item) => [item.id, item]),
  );
  const lessons = [
    ...personalBundle.pack.lessons.map((lesson) => ({
      ...lesson,
      unitId: personalBundle.pack.unitId,
    })),
    ...communicativeBundle.collection.packs.flatMap((unitPack) =>
      unitPack.lessons.map((lesson) => ({
        ...lesson,
        unitId: unitPack.unitId,
      }))
    ),
  ];
  const lessonById = new Map(
    lessons.map((lesson) => [lesson.lessonId, lesson]),
  );
  const expectedLessonByGrammarId = new Map(
    lessons.flatMap((lesson) =>
      lesson.grammarRowIds.map((grammarRowId) => [
        grammarRowId,
        { lessonId: lesson.lessonId, unitId: lesson.unitId },
      ])
    ),
  );

  if (!Array.isArray(pack.grammarDrafts)) {
    errors.push("grammar drafts must be an array");
  } else {
    const grammarIds = pack.grammarDrafts.map(
      (draft) => draft.officialGrammarRowId,
    );
    if (
      duplicateValues(grammarIds).length > 0
      || !exactSet(grammarIds, officialGrammarRows.map((row) => row.id))
    ) {
      errors.push("grammar drafts must exactly cover all 66 HSK1 grammar rows");
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
        errors.push(`${draft.officialGrammarRowId} official binding is stale`);
        continue;
      }
      if (
        !expectedLesson
        || draft.lessonId !== expectedLesson.lessonId
        || draft.unitId !== expectedLesson.unitId
      ) {
        errors.push(`${draft.officialGrammarRowId} lesson mapping is stale`);
      }
      if (!validDraftString(draft.explanationViDraft, 20, 500)) {
        errors.push(`${draft.officialGrammarRowId} Vietnamese explanation is invalid`);
      }
      if (
        !isRecord(draft.modelExample)
        || !validDraftString(draft.modelExample.hanzi, 2, 200)
        || !validDraftString(draft.modelExample.pinyin, 2, 300)
        || !validDraftString(draft.modelExample.meaningVi, 2, 300)
      ) {
        errors.push(`${draft.officialGrammarRowId} model example is invalid`);
      }
      if (
        !isRecord(draft.guidedPractice)
        || !validDraftString(draft.guidedPractice.promptVi, 5, 300)
        || !validDraftString(draft.guidedPractice.modelAnswerHanzi, 2, 200)
        || !validDraftString(draft.guidedPractice.modelAnswerPinyin, 2, 300)
        || !validDraftString(
          draft.guidedPractice.modelAnswerMeaningVi,
          2,
          300,
        )
      ) {
        errors.push(`${draft.officialGrammarRowId} guided practice is invalid`);
      }
      if (
        draft.review?.machineAssisted !== true
        || draft.review?.nativeMandarinReview !== "pending"
        || draft.review?.vietnameseEditorialReview !== "pending"
        || draft.review?.grammarPedagogyReview !== "pending"
      ) {
        errors.push(`${draft.officialGrammarRowId} review state must remain pending`);
      }
    }
  }

  const draftById = new Map(
    (pack.grammarDrafts ?? []).map((draft) => [
      draft.officialGrammarRowId,
      draft,
    ]),
  );
  if (!Array.isArray(pack.practiceItems) || pack.practiceItems.length !== 66) {
    errors.push("grammar pack must contain exactly 66 practice items");
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
      errors.push("grammar practice must cover every grammar row exactly once");
    }
    for (const item of pack.practiceItems) {
      const draft = draftById.get(item.officialGrammarRowId);
      if (
        !draft
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
      ) {
        errors.push(`${item.itemId} must remain pending and mastery-ineligible`);
      }
    }
  }

  const lessonsWithGrammar = lessons.filter(
    (lesson) => lesson.grammarRowIds.length > 0,
  );
  if (
    !Array.isArray(pack.reviewBatches)
    || pack.reviewBatches.length !== lessonsWithGrammar.length
  ) {
    errors.push("grammar pack must have one review batch per mapped lesson");
  } else {
    if (!exactSet(
      pack.reviewBatches.map((batch) => batch.lessonId),
      lessonsWithGrammar.map((lesson) => lesson.lessonId),
    )) {
      errors.push("grammar review batches must cover every mapped lesson once");
    }
    for (const batch of pack.reviewBatches) {
      const lesson = lessonById.get(batch.lessonId);
      const expectedItemIds = (pack.practiceItems ?? []).filter(
        (item) => item.lessonId === batch.lessonId,
      ).map((item) => item.itemId);
      if (
        !lesson
        || !exactSet(batch.grammarRowIds ?? [], lesson.grammarRowIds)
        || !exactSet(batch.practiceItemIds ?? [], expectedItemIds)
        || JSON.stringify(batch.requiredRoles)
          !== JSON.stringify(REQUIRED_ROLES)
        || batch.state !== "pending"
        || !Array.isArray(batch.approvals)
        || batch.approvals.length !== 0
      ) {
        errors.push(`${batch.batchId} review batch is incomplete or pre-approved`);
      }
    }
  }

  if (
    Array.isArray(pack.grammarDrafts)
    && Array.isArray(pack.practiceItems)
    && Array.isArray(pack.reviewBatches)
  ) {
    const expectedCounts = {
      communicativeLessonBlueprints: lessons.length,
      lessonsWithGrammarPractice: lessonsWithGrammar.length,
      grammarDrafts: pack.grammarDrafts.length,
      modelExamples: pack.grammarDrafts.length,
      guidedPracticeItems: pack.practiceItems.length,
      reviewBatches: pack.reviewBatches.length,
      measurementEligibleItems: pack.practiceItems.filter(
        (item) => item.measurementEligible === true,
      ).length,
      releaseEligibleItems: 0,
    };
    if (JSON.stringify(pack.counts) !== JSON.stringify(expectedCounts)) {
      errors.push("grammar pack counts do not match its content");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: pack.counts,
  };
};

export const assertValidHsk1GrammarContextPackBundle = (bundle) => {
  const result = validateHsk1GrammarContextPackBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 grammar-context pack:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
