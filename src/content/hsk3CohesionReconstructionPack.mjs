import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk3CultureTraditionDomainPackBundle,
  loadHsk3CultureTraditionDomainPackBundle,
} from "./hsk3CultureTraditionDomainPack.mjs";
import {
  assertValidHsk3GuidedNotesPackBundle,
  collectHsk3ParagraphTextCatalog,
  loadHsk3GuidedNotesPackBundle,
} from "./hsk3GuidedNotesPack.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK3_COHESION_RECONSTRUCTION_PACK_RELATIVE_PATH =
  "content/drafts/hsk3-cohesion-reconstruction-2026.07.json";
export const HSK3_COHESION_RECONSTRUCTION_TRACK_ID =
  "hsk3-cohesion-reconstruction";
export const HSK3_COHESION_RECONSTRUCTION_LESSON_IDS = [
  `${HSK3_COHESION_RECONSTRUCTION_TRACK_ID}-lesson-01`,
  `${HSK3_COHESION_RECONSTRUCTION_TRACK_ID}-lesson-02`,
  `${HSK3_COHESION_RECONSTRUCTION_TRACK_ID}-lesson-03`,
];

const KIND_BY_LESSON = new Map([
  [
    HSK3_COHESION_RECONSTRUCTION_LESSON_IDS[0],
    "temporal-order-reconstruction",
  ],
  [
    HSK3_COHESION_RECONSTRUCTION_LESSON_IDS[1],
    "reference-linker-restoration",
  ],
  [
    HSK3_COHESION_RECONSTRUCTION_LESSON_IDS[2],
    "order-rationale-explanation",
  ],
]);
const REQUIRED_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
];
const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);
const duplicates = (values) => {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
};
const validText = (value, minimum = 1, maximum = 1000) =>
  typeof value === "string"
  && value.length >= minimum
  && value.length <= maximum;
const failClosed = (item) =>
  item?.review === "pending"
  && item?.measurementEligible === false
  && item?.masteryEligible === false
  && item?.releaseEligible === false;

export const collectHsk3ParagraphTextCatalogFromCultureTip = (
  cultureBundle,
) => {
  const societyBundle = cultureBundle.prerequisiteBundles[0];
  const catalog = collectHsk3ParagraphTextCatalog(societyBundle);
  for (const lesson of cultureBundle.pack.lessons) {
    for (const text of lesson.texts ?? []) {
      catalog.set(text.textId, {
        sourcePackId: cultureBundle.pack.packId,
        sourceLessonId: lesson.lessonId,
        text,
      });
    }
  }
  return catalog;
};

export const loadHsk3CohesionReconstructionPackBundle = (
  root = process.cwd(),
) => {
  const prerequisiteBundle = loadHsk3GuidedNotesPackBundle(root);
  const paragraphBundle =
    loadHsk3CultureTraditionDomainPackBundle(root);
  const packPath = join(
    root,
    HSK3_COHESION_RECONSTRUCTION_PACK_RELATIVE_PATH,
  );
  return {
    blueprintBundle: prerequisiteBundle.blueprintBundle,
    prerequisiteBundle,
    paragraphBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk3CohesionReconstructionPackBundle = ({
  blueprintBundle,
  prerequisiteBundle,
  paragraphBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk3GuidedNotesPackBundle(prerequisiteBundle);
    assertValidHsk3CultureTraditionDomainPackBundle(paragraphBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (
    !isRecord(pack)
    || pack.schemaVersion !== 1
    || pack.packId !== "hsk3-cohesion-reconstruction-2026.07"
    || pack.level !== 3
    || pack.trackId !== HSK3_COHESION_RECONSTRUCTION_TRACK_ID
    || pack.state !== "ai-assisted-guided-production-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    return {
      valid: false,
      errors: ["HSK3 cohesion-reconstruction pack identity is invalid"],
    };
  }
  if (
    pack.source?.lessonBlueprintPackId !== blueprintBundle.pack.packId
    || pack.source?.lessonBlueprintPackSha256
      !== fileSha256(blueprintBundle.packPath)
    || pack.source?.prerequisitePackId !== prerequisiteBundle.pack.packId
    || pack.source?.prerequisitePackSha256
      !== fileSha256(prerequisiteBundle.packPath)
    || pack.source?.paragraphSourceTipPackId !== paragraphBundle.pack.packId
    || pack.source?.paragraphSourceTipPackSha256
      !== fileSha256(paragraphBundle.packPath)
  ) {
    errors.push("HSK3 cohesion-reconstruction source binding is stale");
  }
  if (
    pack.authorship?.method
      !== "ai-assisted-cohesion-reconstruction-draft"
    || pack.authorship?.assistant !== "OpenAI Codex"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.assessmentEditor !== null
  ) {
    errors.push(
      "HSK3 cohesion-reconstruction authorship must not imply review",
    );
  }
  if (
    pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.assessmentReviewRequiredForRelease !== true
    || pack.reviewPolicy?.sourceExposedPracticeCannotCalibrateAssessment
      !== true
    || pack.masteryPolicy?.readingSeparatedFromWritingEvidence !== true
    || pack.masteryPolicy?.modelRevealCannotGrantMastery !== true
    || pack.masteryPolicy?.automaticOrderingCannotGrantWritingMastery !== true
    || pack.masteryPolicy?.newCharacterOwnershipClaims !== 0
    || pack.masteryPolicy?.sourceRecognitionCharacterMappings !== 284
  ) {
    errors.push("HSK3 cohesion-reconstruction policy must fail closed");
  }
  if (
    pack.coverageClaims?.stagePromptDraftsComplete !== true
    || pack.coverageClaims?.completedGuidedProductionStages !== 2
    || pack.coverageClaims?.completedGuidedProductionLessons !== 6
    || pack.coverageClaims?.allGuidedProductionLessonsComplete !== false
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.assessmentCoverageComplete !== false
    || pack.coverageClaims?.hsk3Complete !== false
  ) {
    errors.push("HSK3 cohesion-reconstruction coverage claims are invalid");
  }

  const sourceCatalog =
    collectHsk3ParagraphTextCatalogFromCultureTip(paragraphBundle);
  const sourceTexts = Array.isArray(pack.sourceTexts)
    ? pack.sourceTexts
    : [];
  if (
    sourceTexts.length !== 18
    || duplicates(sourceTexts.map((source) => source.textId)).length > 0
  ) {
    errors.push("HSK3 cohesion source-text partition is invalid");
  }
  const selectedSourceById = new Map();
  for (const source of sourceTexts) {
    const expected = sourceCatalog.get(source.textId);
    if (
      !expected
      || source.sourcePackId !== expected.sourcePackId
      || source.sourceLessonId !== expected.sourceLessonId
      || !exact(source.text, expected.text)
      || source.text.kind !== "graded-reading"
    ) {
      errors.push(
        `${source.textId ?? "unknown"} cohesion source text is stale`,
      );
    }
    selectedSourceById.set(source.textId, source);
  }

  const blueprintById = new Map(
    blueprintBundle.pack.lessons.map((lesson) => [
      lesson.lessonId,
      lesson,
    ]),
  );
  const lessons = Array.isArray(pack.lessons) ? pack.lessons : [];
  if (
    lessons.length !== HSK3_COHESION_RECONSTRUCTION_LESSON_IDS.length
    || !exact(
      lessons.map((lesson) => lesson.lessonId),
      HSK3_COHESION_RECONSTRUCTION_LESSON_IDS,
    )
  ) {
    errors.push("HSK3 cohesion lesson partition is invalid");
  }
  const allItems = [];
  for (const lesson of lessons) {
    const blueprint = blueprintById.get(lesson.lessonId);
    const items = Array.isArray(lesson.promptUnits)
      ? lesson.promptUnits
      : [];
    if (
      blueprint?.trackId !== HSK3_COHESION_RECONSTRUCTION_TRACK_ID
      || blueprint?.blueprintKind !== "guided-production"
      || lesson.blueprintTitleVi !== blueprint.titleVi
      || lesson.blueprintObjectiveVi !== blueprint.objectiveVi
      || !exact(
        lesson.contextDomainIds,
        blueprint.promptPlan.contextDomainIds,
      )
      || items.length !== blueprint.promptPlan.minimumPromptUnits
    ) {
      errors.push(`${lesson.lessonId} cohesion blueprint is invalid`);
    }
    const expectedKind = KIND_BY_LESSON.get(lesson.lessonId);
    for (const [index, item] of items.entries()) {
      allItems.push(item);
      const source = selectedSourceById.get(item.sourceTextId);
      const sourceLineById = new Map(
        source?.text?.lines?.map((line) => [line.lineId, line]) ?? [],
      );
      const commonInvalid =
        item.itemId
          !== `${lesson.lessonId}:prompt-${String(index + 1).padStart(2, "0")}`
        || item.lessonId !== lesson.lessonId
        || item.mode !== blueprint?.promptPlan.mode
        || item.promptKind !== expectedKind
        || !source
        || item.inputSkill !== "reading"
        || item.responseSkill !== "writing"
        || !validText(item.promptVi, 15, 500)
        || !Array.isArray(item.revisionChecklistVi)
        || item.revisionChecklistVi.length !== 3
        || item.responseMode
          !== "cohesion-reconstruction-with-model-reveal-and-revision"
        || item.scoringPolicy !== "source-exposed-practice-only"
        || item.reviewedRubric !== null
        || item.modelRevealCanGrantMastery !== false
        || !failClosed(item);
      let kindInvalid;
      if (
        expectedKind === "temporal-order-reconstruction"
        || expectedKind === "order-rationale-explanation"
      ) {
        const blocks = Array.isArray(item.blocks) ? item.blocks : [];
        const blockIds = blocks.map((block) => block.blockId);
        const presentedOrder = Array.isArray(item.presentedOrder)
          ? item.presentedOrder
          : [];
        kindInvalid =
          blocks.length !== 4
          || blocks.some(
            (block, blockIndex) =>
              block.blockId !== `b${blockIndex + 1}`
              || !Array.isArray(block.sourceLineIds)
              || block.sourceLineIds.length !== 2
              || block.sourceLineIds.some(
                (lineId) => !sourceLineById.has(lineId),
              )
              || block.hanzi !== block.sourceLineIds.map(
                (lineId) => sourceLineById.get(lineId)?.hanzi,
              ).join("")
          )
          || !exact(item.correctOrder, ["b1", "b2", "b3", "b4"])
          || !exact([...presentedOrder].sort(), [...blockIds].sort())
          || exact(presentedOrder, item.correctOrder)
          || !Array.isArray(item.orderingSignalsVi)
          || item.orderingSignalsVi.length !== 4
          || item.orderingSignalsVi.some(
            (signal) => !validText(signal, 8, 300),
          )
          || (expectedKind === "order-rationale-explanation"
            && (
              !Array.isArray(item.explanationFrameVi)
              || item.explanationFrameVi.length !== 4
            ));
      } else {
        const line = sourceLineById.get(item.sourceLineId);
        kindInvalid =
          !line
          || !validText(item.correctAnswerHanzi, 1, 20)
          || !line.hanzi.includes(item.correctAnswerHanzi)
          || item.clozeLineHanzi
            !== line.hanzi.replace(item.correctAnswerHanzi, "____")
          || !Array.isArray(item.optionsHanzi)
          || item.optionsHanzi.length !== 4
          || new Set(item.optionsHanzi).size !== 4
          || !item.optionsHanzi.includes(item.correctAnswerHanzi)
          || !validText(item.functionVi, 8, 300)
          || !validText(item.antecedentOrRelationVi, 8, 300);
      }
      if (commonInvalid || kindInvalid) {
        errors.push(`${item.itemId ?? "unknown"} cohesion item is invalid`);
      }
    }
    const batch = lesson.reviewBatch;
    if (
      batch?.batchId !== `${lesson.lessonId}:cohesion-review-v1`
      || batch.lessonId !== lesson.lessonId
      || !exact(
        batch.promptItemIds,
        items.map((item) => item.itemId),
      )
      || !exact(batch.requiredRoles, REQUIRED_REVIEW_ROLES)
      || batch.state !== "pending"
      || !exact(batch.approvals, [])
    ) {
      errors.push(`${lesson.lessonId} cohesion review batch is invalid`);
    }
  }
  if (
    duplicates(allItems.map((item) => item.itemId)).length > 0
    || !exact(
      pack.reviewBatches,
      lessons.map((lesson) => lesson.reviewBatch),
    )
  ) {
    errors.push("HSK3 cohesion IDs or review batches are invalid");
  }
  const expectedCounts = {
    lessons: lessons.length,
    completedGuidedProductionStages: 2,
    completedGuidedProductionLessons: 6,
    sourceTexts: sourceTexts.length,
    sourceTextLines: sourceTexts.flatMap(
      (source) => source.text?.lines ?? [],
    ).length,
    promptUnits: allItems.length,
    temporalOrderingPromptUnits: allItems.filter(
      (item) => item.promptKind === "temporal-order-reconstruction",
    ).length,
    referenceLinkerPromptUnits: allItems.filter(
      (item) => item.promptKind === "reference-linker-restoration",
    ).length,
    orderRationalePromptUnits: allItems.filter(
      (item) => item.promptKind === "order-rationale-explanation",
    ).length,
    revisionChecklists: allItems.length,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    reviewBatches: lessons.length,
    approvals: 0,
    releaseEligibleItems: 0,
  };
  if (!exact(pack.counts, expectedCounts)) {
    errors.push("HSK3 cohesion-reconstruction summary counts are stale");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk3CohesionReconstructionPackBundle = (bundle) => {
  const result = validateHsk3CohesionReconstructionPackBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK3 cohesion-reconstruction pack:\n- ${
        result.errors.join("\n- ")
      }`,
    );
  }
  return result;
};
