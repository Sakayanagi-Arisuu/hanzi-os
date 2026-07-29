import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk3DiscourseLinkingNarrationPackBundle,
  loadHsk3DiscourseLinkingNarrationPackBundle,
} from "./hsk3DiscourseLinkingNarrationPack.mjs";
import {
  assertValidHsk3SocietyArtsSportsDomainPackBundle,
  loadHsk3SocietyArtsSportsDomainPackBundle,
} from "./hsk3SocietyArtsSportsDomainPack.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK3_GUIDED_NOTES_PACK_RELATIVE_PATH =
  "content/drafts/hsk3-main-idea-detail-notes-2026.07.json";
export const HSK3_GUIDED_NOTES_TRACK_ID = "hsk3-main-idea-detail-notes";
export const HSK3_GUIDED_NOTES_LESSON_IDS = [
  `${HSK3_GUIDED_NOTES_TRACK_ID}-lesson-01`,
  `${HSK3_GUIDED_NOTES_TRACK_ID}-lesson-02`,
  `${HSK3_GUIDED_NOTES_TRACK_ID}-lesson-03`,
];

const REQUIRED_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
  "audio-rights-reviewer",
];
const PROMPT_KIND_BY_LESSON = new Map([
  [HSK3_GUIDED_NOTES_LESSON_IDS[0], "main-idea-actor-action-place-grid"],
  [HSK3_GUIDED_NOTES_LESSON_IDS[1], "timeline-cause-note-grid"],
  [
    HSK3_GUIDED_NOTES_LESSON_IDS[2],
    "listening-reading-detail-comparison",
  ],
]);
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

const paragraphBundlesFromTip = (societyBundle) => {
  const natureBundle = societyBundle.prerequisiteBundles[0];
  const studyBundle = natureBundle.prerequisiteBundles[0];
  const personalDomainBundle = studyBundle.prerequisiteBundles[0];
  return [
    personalDomainBundle.priorLessonBundle,
    personalDomainBundle,
    studyBundle,
    natureBundle,
    societyBundle,
  ];
};

export const collectHsk3ParagraphTextCatalog = (societyBundle) => {
  const catalog = new Map();
  for (const bundle of paragraphBundlesFromTip(societyBundle)) {
    const lessons = Array.isArray(bundle.pack.lessons)
      ? bundle.pack.lessons
      : [{
          lessonId: bundle.pack.lessonId,
          texts: bundle.pack.texts,
        }];
    for (const lesson of lessons) {
      for (const text of lesson.texts ?? []) {
        catalog.set(text.textId, {
          sourcePackId: bundle.pack.packId,
          sourceLessonId: lesson.lessonId,
          text,
        });
      }
    }
  }
  return catalog;
};

export const loadHsk3GuidedNotesPackBundle = (root = process.cwd()) => {
  const narrationBundle =
    loadHsk3DiscourseLinkingNarrationPackBundle(root);
  const paragraphBundle =
    loadHsk3SocietyArtsSportsDomainPackBundle(root);
  const packPath = join(root, HSK3_GUIDED_NOTES_PACK_RELATIVE_PATH);
  return {
    blueprintBundle: narrationBundle.blueprintBundle,
    narrationBundle,
    paragraphBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk3GuidedNotesPackBundle = ({
  blueprintBundle,
  narrationBundle,
  paragraphBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk3DiscourseLinkingNarrationPackBundle(narrationBundle);
    assertValidHsk3SocietyArtsSportsDomainPackBundle(paragraphBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (
    !isRecord(pack)
    || pack.schemaVersion !== 1
    || pack.packId !== "hsk3-main-idea-detail-notes-2026.07"
    || pack.level !== 3
    || pack.trackId !== HSK3_GUIDED_NOTES_TRACK_ID
    || pack.state !== "ai-assisted-guided-production-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    return {
      valid: false,
      errors: ["HSK3 guided-notes pack identity is invalid"],
    };
  }
  if (
    pack.source?.lessonBlueprintPackId !== blueprintBundle.pack.packId
    || pack.source?.lessonBlueprintPackSha256
      !== fileSha256(blueprintBundle.packPath)
    || pack.source?.narrationPrerequisitePackId
      !== narrationBundle.pack.packId
    || pack.source?.narrationPrerequisitePackSha256
      !== fileSha256(narrationBundle.packPath)
    || pack.source?.paragraphSourceTipPackId
      !== paragraphBundle.pack.packId
    || pack.source?.paragraphSourceTipPackSha256
      !== fileSha256(paragraphBundle.packPath)
  ) {
    errors.push("HSK3 guided-notes source binding is stale");
  }
  if (
    pack.authorship?.method
      !== "ai-assisted-integrated-note-production-draft"
    || pack.authorship?.assistant !== "OpenAI Codex"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.assessmentEditor !== null
    || pack.authorship?.audioRightsReviewer !== null
  ) {
    errors.push("HSK3 guided-notes authorship must not imply review");
  }
  if (
    pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.assessmentReviewRequiredForRelease !== true
    || pack.reviewPolicy?.audioRightsRequiredWhereAudioDependent !== true
    || pack.reviewPolicy?.sourceExposedPracticeCannotCalibrateAssessment
      !== true
    || pack.masteryPolicy?.inputSkillsSeparatedFromWritingEvidence !== true
    || pack.masteryPolicy?.modelRevealCannotGrantMastery !== true
    || pack.masteryPolicy?.browserTtsCannotGrantListeningMastery !== true
    || pack.masteryPolicy?.newCharacterOwnershipClaims !== 0
    || pack.masteryPolicy?.sourceRecognitionCharacterMappings !== 284
  ) {
    errors.push("HSK3 guided-notes policy must remain fail-closed");
  }
  if (
    pack.coverageClaims?.stagePromptDraftsComplete !== true
    || pack.coverageClaims?.completedGuidedProductionStages !== 1
    || pack.coverageClaims?.completedGuidedProductionLessons !== 3
    || pack.coverageClaims?.allGuidedProductionLessonsComplete !== false
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.assessmentCoverageComplete !== false
    || pack.coverageClaims?.hsk3Complete !== false
  ) {
    errors.push("HSK3 guided-notes coverage claims are invalid");
  }

  const sourceCatalog = collectHsk3ParagraphTextCatalog(paragraphBundle);
  const sourceTexts = Array.isArray(pack.sourceTexts)
    ? pack.sourceTexts
    : [];
  if (
    sourceTexts.length !== 24
    || duplicates(sourceTexts.map((source) => source.textId)).length > 0
  ) {
    errors.push("HSK3 guided-notes source-text partition is invalid");
  }
  const selectedSourceById = new Map();
  for (const source of sourceTexts) {
    const expected = sourceCatalog.get(source.textId);
    if (
      !expected
      || source.sourcePackId !== expected.sourcePackId
      || source.sourceLessonId !== expected.sourceLessonId
      || !exact(source.text, expected.text)
    ) {
      errors.push(
        `${source.textId ?? "unknown"} guided-notes source text is stale`,
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
    lessons.length !== HSK3_GUIDED_NOTES_LESSON_IDS.length
    || !exact(
      lessons.map((lesson) => lesson.lessonId),
      HSK3_GUIDED_NOTES_LESSON_IDS,
    )
  ) {
    errors.push("HSK3 guided-notes lesson partition is invalid");
  }
  const allItems = [];
  for (const lesson of lessons) {
    const blueprint = blueprintById.get(lesson.lessonId);
    const items = Array.isArray(lesson.promptUnits)
      ? lesson.promptUnits
      : [];
    if (
      blueprint?.trackId !== HSK3_GUIDED_NOTES_TRACK_ID
      || blueprint?.blueprintKind !== "guided-production"
      || lesson.blueprintTitleVi !== blueprint.titleVi
      || lesson.blueprintObjectiveVi !== blueprint.objectiveVi
      || !exact(
        lesson.contextDomainIds,
        blueprint.promptPlan.contextDomainIds,
      )
      || items.length !== blueprint.promptPlan.minimumPromptUnits
      || items.length !== 8
    ) {
      errors.push(`${lesson.lessonId} guided-notes blueprint is invalid`);
    }
    const expectedKind = PROMPT_KIND_BY_LESSON.get(lesson.lessonId);
    for (const item of items) {
      allItems.push(item);
      const inputRefs = Array.isArray(item.inputRefs)
        ? item.inputRefs
        : [];
      const inputSources = inputRefs.map((ref) =>
        selectedSourceById.get(ref.textId)
      );
      const inputKinds = inputSources.map((source) => source?.text?.kind);
      const expectedInputCount = expectedKind
        === "listening-reading-detail-comparison"
        ? 2
        : 1;
      const expectedInputSkills = inputKinds.map((kind) =>
        kind === "graded-listening"
          ? "listening"
          : kind === "graded-reading"
            ? "reading"
            : "invalid"
      );
      const allEvidenceLineIds = new Set(inputSources.flatMap((source) =>
        source?.text?.lines?.map((line) => line.lineId) ?? []
      ));
      if (
        item.itemId
          !== `${lesson.lessonId}:prompt-${String(
            items.indexOf(item) + 1,
          ).padStart(2, "0")}`
        || item.lessonId !== lesson.lessonId
        || item.mode !== blueprint?.promptPlan.mode
        || item.promptKind !== expectedKind
        || inputRefs.length !== expectedInputCount
        || inputSources.some((source) => !source)
        || !exact(item.inputSkills, expectedInputSkills)
        || (expectedInputCount === 2
          && !exact(expectedInputSkills, ["reading", "listening"]))
        || item.responseSkill !== "writing"
        || !validText(item.promptVi, 15, 500)
        || !Array.isArray(item.requiredResponseFieldsVi)
        || item.requiredResponseFieldsVi.length !== 4
        || item.requiredResponseFieldsVi.some(
          (field) => !validText(field, 2, 100),
        )
        || !Array.isArray(item.answerGuideVi)
        || item.answerGuideVi.length !== 4
        || item.answerGuideVi.some(
          (answer) => !validText(answer, 5, 300),
        )
        || !Array.isArray(item.evidenceLineIds)
        || item.evidenceLineIds.length < expectedInputCount
        || item.evidenceLineIds.some(
          (lineId) => !allEvidenceLineIds.has(lineId),
        )
        || !Array.isArray(item.revisionChecklistVi)
        || item.revisionChecklistVi.length !== 3
        || item.revisionChecklistVi.some(
          (step) => !validText(step, 8, 240),
        )
        || item.responseMode
          !== "guided-notes-with-model-reveal-and-revision"
        || item.scoringPolicy !== "source-exposed-practice-only"
        || item.reviewedRubric !== null
        || item.modelRevealCanGrantMastery !== false
        || item.audio !== null
        || item.syntheticBrowserVoicePreviewOnly
          !== expectedInputSkills.includes("listening")
        || item.reviewedAudioRequiredForRelease
          !== expectedInputSkills.includes("listening")
        || !failClosed(item)
      ) {
        errors.push(`${item.itemId ?? "unknown"} guided-notes item is invalid`);
      }
    }
    const batch = lesson.reviewBatch;
    if (
      batch?.batchId !== `${lesson.lessonId}:guided-notes-review-v1`
      || batch.lessonId !== lesson.lessonId
      || !exact(
        batch.promptItemIds,
        items.map((item) => item.itemId),
      )
      || !exact(batch.requiredRoles, REQUIRED_REVIEW_ROLES)
      || batch.state !== "pending"
      || !exact(batch.approvals, [])
    ) {
      errors.push(`${lesson.lessonId} guided-notes review batch is invalid`);
    }
  }
  if (
    duplicates(allItems.map((item) => item.itemId)).length > 0
    || !exact(
      pack.reviewBatches,
      lessons.map((lesson) => lesson.reviewBatch),
    )
  ) {
    errors.push("HSK3 guided-notes IDs or review batches are invalid");
  }
  const expectedCounts = {
    lessons: lessons.length,
    completedGuidedProductionStages: 1,
    completedGuidedProductionLessons: 3,
    sourceTexts: sourceTexts.length,
    sourceTextLines: sourceTexts.flatMap(
      (source) => source.text?.lines ?? [],
    ).length,
    promptUnits: allItems.length,
    readingInputPromptUnits: allItems.filter((item) =>
      item.inputSkills?.includes("reading")
    ).length,
    listeningInputPromptUnits: allItems.filter((item) =>
      item.inputSkills?.includes("listening")
    ).length,
    integratedListeningReadingPromptUnits: allItems.filter(
      (item) => item.inputSkills?.length === 2,
    ).length,
    revisionChecklists: allItems.length,
    audioDependentPromptUnits: allItems.filter(
      (item) => item.reviewedAudioRequiredForRelease,
    ).length,
    reviewedAudioPromptUnits: 0,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    reviewBatches: lessons.length,
    approvals: 0,
    releaseEligibleItems: 0,
  };
  if (!exact(pack.counts, expectedCounts)) {
    errors.push("HSK3 guided-notes summary counts are stale");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk3GuidedNotesPackBundle = (bundle) => {
  const result = validateHsk3GuidedNotesPackBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK3 guided-notes pack:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
