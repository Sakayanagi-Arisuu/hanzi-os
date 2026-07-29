import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk3GuidedParagraphPackBundle,
  loadHsk3GuidedParagraphPackBundle,
} from "./hsk3GuidedParagraphPack.mjs";
import {
  collectHsk3ParagraphTextCatalogFromCultureTip,
} from "./hsk3CohesionReconstructionPack.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK3_STRUCTURED_EXPLANATION_PACK_RELATIVE_PATH =
  "content/drafts/hsk3-structured-explanation-2026.07.json";
export const HSK3_STRUCTURED_EXPLANATION_TRACK_ID =
  "hsk3-structured-explanation";
export const HSK3_STRUCTURED_EXPLANATION_LESSON_IDS = [
  `${HSK3_STRUCTURED_EXPLANATION_TRACK_ID}-lesson-01`,
  `${HSK3_STRUCTURED_EXPLANATION_TRACK_ID}-lesson-02`,
  `${HSK3_STRUCTURED_EXPLANATION_TRACK_ID}-lesson-03`,
];

const PERSONAL_DOMAIN_ID = "hsk3-personal-life-narratives";
const PROMPT_KIND_BY_LESSON = new Map([
  [
    HSK3_STRUCTURED_EXPLANATION_LESSON_IDS[0],
    "choice-and-reason-spoken-explanation",
  ],
  [
    HSK3_STRUCTURED_EXPLANATION_LESSON_IDS[1],
    "criteria-based-spoken-comparison",
  ],
  [
    HSK3_STRUCTURED_EXPLANATION_LESSON_IDS[2],
    "bounded-viewpoint-spoken-explanation",
  ],
]);
const MINIMUM_SENTENCES_BY_KIND = new Map([
  ["choice-and-reason-spoken-explanation", 4],
  ["criteria-based-spoken-comparison", 6],
  ["bounded-viewpoint-spoken-explanation", 6],
]);
const REQUIRED_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
  "audio-rights-reviewer",
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

export const collectHsk3StructuredExplanationSourceCatalog = (
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
        if (source?.text?.kind === "graded-listening") {
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

export const loadHsk3StructuredExplanationPackBundle = (
  root = process.cwd(),
) => {
  const prerequisiteBundle = loadHsk3GuidedParagraphPackBundle(root);
  const paragraphBundle = prerequisiteBundle.paragraphBundle;
  const packPath = join(
    root,
    HSK3_STRUCTURED_EXPLANATION_PACK_RELATIVE_PATH,
  );
  return {
    blueprintBundle: prerequisiteBundle.blueprintBundle,
    prerequisiteBundle,
    paragraphBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk3StructuredExplanationPackBundle = ({
  blueprintBundle,
  prerequisiteBundle,
  paragraphBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk3GuidedParagraphPackBundle(prerequisiteBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (
    !isRecord(pack)
    || pack.schemaVersion !== 1
    || pack.packId !== "hsk3-structured-explanation-2026.07"
    || pack.level !== 3
    || pack.trackId !== HSK3_STRUCTURED_EXPLANATION_TRACK_ID
    || pack.state !== "ai-assisted-guided-production-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    return {
      valid: false,
      errors: ["HSK3 structured-explanation pack identity is invalid"],
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
    errors.push("HSK3 structured-explanation source binding is stale");
  }
  if (
    pack.authorship?.method !== "ai-assisted-structured-explanation-draft"
    || pack.authorship?.assistant !== "OpenAI Codex"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.assessmentEditor !== null
    || pack.authorship?.audioRightsReviewer !== null
  ) {
    errors.push(
      "HSK3 structured-explanation authorship must not imply review",
    );
  }
  if (
    pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.assessmentReviewRequiredForRelease !== true
    || pack.reviewPolicy?.audioRightsRequiredForRelease !== true
    || pack.reviewPolicy?.sourceExposedPracticeCannotCalibrateAssessment
      !== true
    || pack.masteryPolicy?.listeningSeparatedFromSpeakingEvidence !== true
    || pack.masteryPolicy?.modelRevealCannotGrantMastery !== true
    || pack.masteryPolicy?.browserTtsCannotGrantListeningMastery !== true
    || pack.masteryPolicy?.selfRecordingCannotGrantSpeakingMastery !== true
    || pack.masteryPolicy
      ?.reviewedSourceAudioRequiredForListeningMastery !== true
    || pack.masteryPolicy
      ?.reviewedLearnerRecordingRubricRequiredForSpeakingMastery !== true
    || pack.masteryPolicy?.newCharacterOwnershipClaims !== 0
    || pack.masteryPolicy?.sourceRecognitionCharacterMappings !== 284
  ) {
    errors.push(
      "HSK3 structured-explanation policy must remain fail-closed",
    );
  }
  if (
    pack.coverageClaims?.stagePromptDraftsComplete !== true
    || pack.coverageClaims?.completedGuidedProductionStages !== 5
    || pack.coverageClaims?.completedGuidedProductionLessons !== 15
    || pack.coverageClaims?.allGuidedProductionLessonsComplete !== true
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.assessmentCoverageComplete !== false
    || pack.coverageClaims?.hsk3Complete !== false
  ) {
    errors.push(
      "HSK3 structured-explanation coverage claims are invalid",
    );
  }

  const sourceCatalog =
    collectHsk3StructuredExplanationSourceCatalog(paragraphBundle);
  const sourceTexts = Array.isArray(pack.sourceTexts)
    ? pack.sourceTexts
    : [];
  if (
    sourceTexts.length !== 18
    || duplicates(sourceTexts.map((source) => source.textId)).length > 0
  ) {
    errors.push("HSK3 structured-explanation source partition is invalid");
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
      || source.text.kind !== "graded-listening"
      || source.sourceSummary.skill !== "speaking"
      || source.sourceSummary.review !== "pending"
      || source.sourceSummary.masteryEligible !== false
    ) {
      errors.push(
        `${source.textId ?? "unknown"} structured-explanation source is stale`,
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
    lessons.length !== HSK3_STRUCTURED_EXPLANATION_LESSON_IDS.length
    || !exact(
      lessons.map((lesson) => lesson.lessonId),
      HSK3_STRUCTURED_EXPLANATION_LESSON_IDS,
    )
  ) {
    errors.push("HSK3 structured-explanation lesson partition is invalid");
  }
  const allItems = [];
  const usedSourceTextIds = new Set();
  for (const lesson of lessons) {
    const blueprint = blueprintById.get(lesson.lessonId);
    const items = Array.isArray(lesson.promptUnits)
      ? lesson.promptUnits
      : [];
    if (
      blueprint?.trackId !== HSK3_STRUCTURED_EXPLANATION_TRACK_ID
      || blueprint?.blueprintKind !== "guided-production"
      || lesson.blueprintTitleVi !== blueprint.titleVi
      || lesson.blueprintObjectiveVi !== blueprint.objectiveVi
      || !exact(
        lesson.contextDomainIds,
        blueprint.promptPlan.contextDomainIds,
      )
      || items.length !== blueprint.promptPlan.minimumPromptUnits
      || items.length !== 4
    ) {
      errors.push(
        `${lesson.lessonId} structured-explanation blueprint is invalid`,
      );
    }
    const expectedKind = PROMPT_KIND_BY_LESSON.get(lesson.lessonId);
    const expectedMinimumSentences =
      MINIMUM_SENTENCES_BY_KIND.get(expectedKind);
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
      if (
        item.itemId
          !== `${lesson.lessonId}:prompt-${String(index + 1).padStart(2, "0")}`
        || item.lessonId !== lesson.lessonId
        || item.mode !== blueprint?.promptPlan.mode
        || item.promptKind !== expectedKind
        || inputRefs.length !== 2
        || !exact(
          inputRefs.map((ref) => ref.role),
          ["case-a", "case-b"],
        )
        || duplicates(inputRefs.map((ref) => ref.textId)).length > 0
        || sources.some((source) => !source)
        || sources.some(
          (source) =>
            !blueprint?.promptPlan.contextDomainIds.includes(
              source?.sourceDomainId,
            ),
        )
        || item.inputSkill !== "listening"
        || item.responseSkill !== "speaking"
        || !validText(item.promptVi, 30, 700)
        || !validText(item.decisionQuestionVi, 25, 500)
        || !exact(item.evidenceLineIdsByText, expectedEvidence)
        || !exact(item.requiredEvidenceElementsVi, expectedElements)
        || !exact(item.modelEvidenceSummaries, expectedModels)
        || !Array.isArray(item.criteriaVi)
        || item.criteriaVi.length !== 4
        || !Array.isArray(item.speakingTurnPlanVi)
        || item.speakingTurnPlanVi.length !== expectedMinimumSentences
        || item.minimumSpokenSentences !== expectedMinimumSentences
        || item.limitOrCounterpointRequired !== true
        || !Array.isArray(item.revisionChecklistVi)
        || item.revisionChecklistVi.length !== 4
        || item.minimumRecordingAttempts !== 2
        || item.responseMode
          !== "listen-plan-record-reveal-revise-record"
        || item.audio !== null
        || item.syntheticBrowserVoicePreviewOnly !== true
        || item.reviewedSourceAudioRequiredForRelease !== true
        || item.reviewedLearnerRecordingRubricRequiredForMastery !== true
        || item.scoringPolicy !== "source-exposed-practice-only"
        || item.reviewedRubric !== null
        || item.modelRevealCanGrantMastery !== false
        || !failClosed(item)
      ) {
        errors.push(
          `${
            item.itemId ?? "unknown"
          } structured-explanation item is invalid`,
        );
      }
    }
    const batch = lesson.reviewBatch;
    if (
      batch?.batchId
        !== `${lesson.lessonId}:structured-explanation-review-v1`
      || batch.lessonId !== lesson.lessonId
      || !exact(
        batch.promptItemIds,
        items.map((item) => item.itemId),
      )
      || !exact(batch.requiredRoles, REQUIRED_REVIEW_ROLES)
      || batch.state !== "pending"
      || !exact(batch.approvals, [])
    ) {
      errors.push(
        `${lesson.lessonId} structured-explanation review batch is invalid`,
      );
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
    errors.push(
      "HSK3 structured-explanation IDs or review batches are invalid",
    );
  }
  const expectedCounts = {
    lessons: lessons.length,
    completedGuidedProductionStages: 5,
    completedGuidedProductionLessons: 15,
    sourceTexts: sourceTexts.length,
    sourceTextLines: sourceTexts.flatMap(
      (source) => source.text?.lines ?? [],
    ).length,
    sourceInputBindings: allItems.reduce(
      (total, item) => total + item.inputRefs.length,
      0,
    ),
    sourceGuidedSummaries: sourceTexts.length,
    promptUnits: allItems.length,
    choiceReasonPromptUnits: allItems.filter(
      (item) =>
        item.promptKind === "choice-and-reason-spoken-explanation",
    ).length,
    criteriaComparisonPromptUnits: allItems.filter(
      (item) =>
        item.promptKind === "criteria-based-spoken-comparison",
    ).length,
    boundedViewpointPromptUnits: allItems.filter(
      (item) =>
        item.promptKind === "bounded-viewpoint-spoken-explanation",
    ).length,
    modelEvidenceSummaries: allItems.reduce(
      (total, item) => total + item.modelEvidenceSummaries.length,
      0,
    ),
    minimumSpokenSentences: allItems.reduce(
      (total, item) => total + item.minimumSpokenSentences,
      0,
    ),
    requiredRecordingAttempts: allItems.reduce(
      (total, item) => total + item.minimumRecordingAttempts,
      0,
    ),
    revisionChecklists: allItems.length,
    audioDependentPromptUnits: allItems.length,
    reviewedAudioPromptUnits: 0,
    learnerRecordingPromptUnits: allItems.length,
    reviewedLearnerRecordingRubrics: 0,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    reviewBatches: lessons.length,
    approvals: 0,
    releaseEligibleItems: 0,
  };
  if (!exact(pack.counts, expectedCounts)) {
    errors.push("HSK3 structured-explanation summary counts are stale");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk3StructuredExplanationPackBundle = (
  bundle,
) => {
  const result = validateHsk3StructuredExplanationPackBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK3 structured-explanation pack:\n- ${
        result.errors.join("\n- ")
      }`,
    );
  }
  return result;
};
