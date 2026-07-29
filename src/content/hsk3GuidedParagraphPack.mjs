import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk3EventRetellingPackBundle,
  loadHsk3EventRetellingPackBundle,
} from "./hsk3EventRetellingPack.mjs";
import {
  collectHsk3ParagraphTextCatalogFromCultureTip,
} from "./hsk3CohesionReconstructionPack.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK3_GUIDED_PARAGRAPH_PACK_RELATIVE_PATH =
  "content/drafts/hsk3-guided-paragraph-2026.07.json";
export const HSK3_GUIDED_PARAGRAPH_TRACK_ID = "hsk3-guided-paragraph";
export const HSK3_GUIDED_PARAGRAPH_LESSON_IDS = [
  `${HSK3_GUIDED_PARAGRAPH_TRACK_ID}-lesson-01`,
  `${HSK3_GUIDED_PARAGRAPH_TRACK_ID}-lesson-02`,
  `${HSK3_GUIDED_PARAGRAPH_TRACK_ID}-lesson-03`,
];

const PERSONAL_DOMAIN_ID = "hsk3-personal-life-narratives";
const PROMPT_KIND_BY_LESSON = new Map([
  [
    HSK3_GUIDED_PARAGRAPH_LESSON_IDS[0],
    "six-sentence-question-guided-paragraph",
  ],
  [
    HSK3_GUIDED_PARAGRAPH_LESSON_IDS[1],
    "evidence-based-comparison-paragraph",
  ],
  [
    HSK3_GUIDED_PARAGRAPH_LESSON_IDS[2],
    "eight-sentence-cohesion-revision-paragraph",
  ],
]);
const SENTENCE_COUNT_BY_KIND = new Map([
  ["six-sentence-question-guided-paragraph", 6],
  ["evidence-based-comparison-paragraph", 6],
  ["eight-sentence-cohesion-revision-paragraph", 8],
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

const paragraphBundlesFromCultureTip = (cultureBundle) => {
  const societyBundle = cultureBundle.prerequisiteBundles[0];
  const natureBundle = societyBundle.prerequisiteBundles[0];
  const studyBundle = natureBundle.prerequisiteBundles[0];
  const personalBundle = studyBundle.prerequisiteBundles[0];
  return [
    {
      bundle: personalBundle.priorLessonBundle,
      domainId: PERSONAL_DOMAIN_ID,
    },
    { bundle: personalBundle, domainId: personalBundle.pack.domainId },
    { bundle: studyBundle, domainId: studyBundle.pack.domainId },
    { bundle: natureBundle, domainId: natureBundle.pack.domainId },
    { bundle: societyBundle, domainId: societyBundle.pack.domainId },
    { bundle: cultureBundle, domainId: cultureBundle.pack.domainId },
  ];
};

export const collectHsk3GuidedParagraphSourceCatalog = (
  cultureBundle,
) => {
  const textCatalog =
    collectHsk3ParagraphTextCatalogFromCultureTip(cultureBundle);
  const catalog = new Map();
  for (
    const { bundle, domainId } of paragraphBundlesFromCultureTip(
      cultureBundle,
    )
  ) {
    const lessons = Array.isArray(bundle.pack.lessons)
      ? bundle.pack.lessons
      : [{
          lessonId: bundle.pack.lessonId,
          guidedSummaries: bundle.pack.guidedSummaries,
        }];
    for (const lesson of lessons) {
      for (const summary of lesson.guidedSummaries ?? []) {
        const source = textCatalog.get(summary.textId);
        if (source?.text?.kind === "graded-reading") {
          catalog.set(summary.textId, {
            ...source,
            sourceDomainId: domainId,
            sourceSummary: summary,
          });
        }
      }
    }
  }
  return catalog;
};

export const loadHsk3GuidedParagraphPackBundle = (
  root = process.cwd(),
) => {
  const prerequisiteBundle = loadHsk3EventRetellingPackBundle(root);
  const paragraphBundle = prerequisiteBundle.paragraphBundle;
  const packPath = join(root, HSK3_GUIDED_PARAGRAPH_PACK_RELATIVE_PATH);
  return {
    blueprintBundle: prerequisiteBundle.blueprintBundle,
    prerequisiteBundle,
    paragraphBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk3GuidedParagraphPackBundle = ({
  blueprintBundle,
  prerequisiteBundle,
  paragraphBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk3EventRetellingPackBundle(prerequisiteBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (
    !isRecord(pack)
    || pack.schemaVersion !== 1
    || pack.packId !== "hsk3-guided-paragraph-2026.07"
    || pack.level !== 3
    || pack.trackId !== HSK3_GUIDED_PARAGRAPH_TRACK_ID
    || pack.state !== "ai-assisted-guided-production-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    return {
      valid: false,
      errors: ["HSK3 guided-paragraph pack identity is invalid"],
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
    errors.push("HSK3 guided-paragraph source binding is stale");
  }
  if (
    pack.authorship?.method !== "ai-assisted-guided-paragraph-draft"
    || pack.authorship?.assistant !== "OpenAI Codex"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.assessmentEditor !== null
  ) {
    errors.push("HSK3 guided-paragraph authorship must not imply review");
  }
  if (
    pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.assessmentReviewRequiredForRelease !== true
    || pack.reviewPolicy?.sourceExposedPracticeCannotCalibrateAssessment
      !== true
    || pack.masteryPolicy?.readingSeparatedFromWritingEvidence !== true
    || pack.masteryPolicy?.modelRevealCannotGrantMastery !== true
    || pack.masteryPolicy?.selfCheckCannotGrantWritingMastery !== true
    || pack.masteryPolicy?.reviewedWritingRubricRequiredForMastery !== true
    || pack.masteryPolicy?.newCharacterOwnershipClaims !== 0
    || pack.masteryPolicy?.sourceRecognitionCharacterMappings !== 284
  ) {
    errors.push("HSK3 guided-paragraph policy must remain fail-closed");
  }
  if (
    pack.coverageClaims?.stagePromptDraftsComplete !== true
    || pack.coverageClaims?.completedGuidedProductionStages !== 4
    || pack.coverageClaims?.completedGuidedProductionLessons !== 12
    || pack.coverageClaims?.allGuidedProductionLessonsComplete !== false
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.assessmentCoverageComplete !== false
    || pack.coverageClaims?.hsk3Complete !== false
  ) {
    errors.push("HSK3 guided-paragraph coverage claims are invalid");
  }

  const sourceCatalog =
    collectHsk3GuidedParagraphSourceCatalog(paragraphBundle);
  const sourceTexts = Array.isArray(pack.sourceTexts)
    ? pack.sourceTexts
    : [];
  if (
    sourceTexts.length !== 16
    || duplicates(sourceTexts.map((source) => source.textId)).length > 0
  ) {
    errors.push("HSK3 guided-paragraph source partition is invalid");
  }
  const selectedSourceById = new Map();
  for (const source of sourceTexts) {
    const expected = sourceCatalog.get(source.textId);
    if (
      !expected
      || source.sourcePackId !== expected.sourcePackId
      || source.sourceLessonId !== expected.sourceLessonId
      || source.sourceDomainId !== expected.sourceDomainId
      || !exact(source.text, expected.text)
      || !exact(source.sourceSummary, expected.sourceSummary)
      || source.text.kind !== "graded-reading"
      || source.sourceSummary.skill !== "writing"
      || source.sourceSummary.review !== "pending"
      || source.sourceSummary.masteryEligible !== false
    ) {
      errors.push(
        `${source.textId ?? "unknown"} guided-paragraph source is stale`,
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
    lessons.length !== HSK3_GUIDED_PARAGRAPH_LESSON_IDS.length
    || !exact(
      lessons.map((lesson) => lesson.lessonId),
      HSK3_GUIDED_PARAGRAPH_LESSON_IDS,
    )
  ) {
    errors.push("HSK3 guided-paragraph lesson partition is invalid");
  }
  const allItems = [];
  const usedSourceTextIds = new Set();
  for (const lesson of lessons) {
    const blueprint = blueprintById.get(lesson.lessonId);
    const items = Array.isArray(lesson.promptUnits)
      ? lesson.promptUnits
      : [];
    if (
      blueprint?.trackId !== HSK3_GUIDED_PARAGRAPH_TRACK_ID
      || blueprint?.blueprintKind !== "guided-production"
      || lesson.blueprintTitleVi !== blueprint.titleVi
      || lesson.blueprintObjectiveVi !== blueprint.objectiveVi
      || !exact(
        lesson.contextDomainIds,
        blueprint.promptPlan.contextDomainIds,
      )
      || items.length !== blueprint.promptPlan.minimumPromptUnits
    ) {
      errors.push(`${lesson.lessonId} guided-paragraph blueprint is invalid`);
    }
    const expectedKind = PROMPT_KIND_BY_LESSON.get(lesson.lessonId);
    const expectedInputCount =
      expectedKind === "evidence-based-comparison-paragraph" ? 2 : 1;
    const expectedSentenceCount = SENTENCE_COUNT_BY_KIND.get(expectedKind);
    for (const [index, item] of items.entries()) {
      allItems.push(item);
      const inputRefs = Array.isArray(item.inputRefs)
        ? item.inputRefs
        : [];
      const sources = inputRefs.map((ref) =>
        selectedSourceById.get(ref.textId)
      );
      sources.forEach((source) => {
        if (source) usedSourceTextIds.add(source.textId);
      });
      const expectedEvidence = sources.map((source) => ({
        textId: source?.textId,
        lineIds: source?.text?.lines?.map((line) => line.lineId),
      }));
      const expectedElements = sources.map((source) => ({
        textId: source?.textId,
        elementsVi: source?.sourceSummary?.requiredElements,
      }));
      const expectedModels = sources.map((source) => ({
        sourceSummaryItemId: source?.sourceSummary?.itemId,
        textId: source?.textId,
        hanzi: source?.sourceSummary?.modelHanzi,
        pinyin: source?.sourceSummary?.modelPinyin,
        vietnamese: source?.sourceSummary?.modelVi,
      }));
      const expectedRoles = expectedInputCount === 2
        ? ["case-a", "case-b"]
        : ["primary-source"];
      if (
        item.itemId
          !== `${lesson.lessonId}:prompt-${String(index + 1).padStart(2, "0")}`
        || item.lessonId !== lesson.lessonId
        || item.mode !== blueprint?.promptPlan.mode
        || item.promptKind !== expectedKind
        || inputRefs.length !== expectedInputCount
        || sources.some((source) => !source)
        || duplicates(inputRefs.map((ref) => ref.textId)).length > 0
        || !exact(inputRefs.map((ref) => ref.role), expectedRoles)
        || sources.some(
          (source) =>
            !blueprint?.promptPlan.contextDomainIds.includes(
              source?.sourceDomainId,
            ),
        )
        || item.inputSkill !== "reading"
        || item.responseSkill !== "writing"
        || !validText(item.promptVi, 30, 700)
        || !exact(item.evidenceLineIdsByText, expectedEvidence)
        || !exact(item.requiredEvidenceElementsVi, expectedElements)
        || !exact(item.modelEvidenceSummaries, expectedModels)
        || item.minimumSentenceCount !== expectedSentenceCount
        || item.maximumSentenceCount !== 8
        || !Array.isArray(item.sentenceGuideVi)
        || item.sentenceGuideVi.length !== expectedSentenceCount
        || item.sentenceGuideVi.some(
          (guide) => !validText(guide, 8, 240),
        )
        || (
          expectedInputCount === 2
          && (
            !Array.isArray(item.comparisonCriteriaVi)
            || item.comparisonCriteriaVi.length !== 4
          )
        )
        || (
          expectedInputCount === 1
          && item.comparisonCriteriaVi !== null
        )
        || !Array.isArray(item.cohesionSelfAuditVi)
        || item.cohesionSelfAuditVi.length !== 4
        || !Array.isArray(item.revisionChecklistVi)
        || item.revisionChecklistVi.length !== 4
        || item.writingDraftRequired !== true
        || item.revisedDraftRequired !== true
        || item.responseMode !== "read-plan-write-reveal-revise"
        || item.scoringPolicy !== "source-exposed-practice-only"
        || item.reviewedRubric !== null
        || item.reviewedWritingRubricRequiredForMastery !== true
        || item.modelRevealCanGrantMastery !== false
        || !failClosed(item)
      ) {
        errors.push(
          `${item.itemId ?? "unknown"} guided-paragraph item is invalid`,
        );
      }
    }
    const batch = lesson.reviewBatch;
    if (
      batch?.batchId !== `${lesson.lessonId}:guided-paragraph-review-v1`
      || batch.lessonId !== lesson.lessonId
      || !exact(
        batch.promptItemIds,
        items.map((item) => item.itemId),
      )
      || !exact(batch.requiredRoles, REQUIRED_REVIEW_ROLES)
      || batch.state !== "pending"
      || !exact(batch.approvals, [])
    ) {
      errors.push(`${lesson.lessonId} guided-paragraph review batch is invalid`);
    }
  }
  if (
    duplicates(allItems.map((item) => item.itemId)).length > 0
    || !exact(
      [...usedSourceTextIds].sort(),
      sourceTexts.map((source) => source.textId).sort(),
    )
    || !exact(
      pack.reviewBatches,
      lessons.map((lesson) => lesson.reviewBatch),
    )
  ) {
    errors.push("HSK3 guided-paragraph IDs or review batches are invalid");
  }
  const allInputRefs = allItems.flatMap((item) => item.inputRefs ?? []);
  const expectedCounts = {
    lessons: lessons.length,
    completedGuidedProductionStages: 4,
    completedGuidedProductionLessons: 12,
    sourceTexts: sourceTexts.length,
    sourceTextLines: sourceTexts.flatMap(
      (source) => source.text?.lines ?? [],
    ).length,
    sourceInputBindings: allInputRefs.length,
    sourceGuidedSummaries: sourceTexts.length,
    promptUnits: allItems.length,
    sixSentencePromptUnits: allItems.filter(
      (item) =>
        item.promptKind === "six-sentence-question-guided-paragraph",
    ).length,
    comparisonPromptUnits: allItems.filter(
      (item) =>
        item.promptKind === "evidence-based-comparison-paragraph",
    ).length,
    eightSentencePromptUnits: allItems.filter(
      (item) =>
        item.promptKind === "eight-sentence-cohesion-revision-paragraph",
    ).length,
    dualSourcePromptUnits: allItems.filter(
      (item) => item.inputRefs?.length === 2,
    ).length,
    modelEvidenceSummaries: allItems.reduce(
      (total, item) => total + item.modelEvidenceSummaries.length,
      0,
    ),
    minimumRequiredSentences: allItems.reduce(
      (total, item) => total + item.minimumSentenceCount,
      0,
    ),
    revisionChecklists: allItems.length,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    reviewBatches: lessons.length,
    approvals: 0,
    releaseEligibleItems: 0,
  };
  if (!exact(pack.counts, expectedCounts)) {
    errors.push("HSK3 guided-paragraph summary counts are stale");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk3GuidedParagraphPackBundle = (bundle) => {
  const result = validateHsk3GuidedParagraphPackBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK3 guided-paragraph pack:\n- ${
        result.errors.join("\n- ")
      }`,
    );
  }
  return result;
};
