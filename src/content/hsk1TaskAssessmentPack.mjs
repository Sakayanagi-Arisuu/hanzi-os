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

export const HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH =
  "content/drafts/hsk1-task-assessment-2026.07.json";

const REQUIRED_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "task-pedagogy-reviewer",
];
const EXPECTED_SECTIONS = [
  ["listening-objective", "listening", 15, 15],
  ["reading-objective", "reading", 15, 15],
  ["vocabulary-grammar-objective", "vocabulary-grammar", 20, 20],
  ["task-performance", "integrated-task-performance", 5, 0],
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
const validText = (value, minimum = 1, maximum = 500) =>
  typeof value === "string"
  && value.length >= minimum
  && value.length <= maximum;

export const loadHsk1TaskAssessmentPackBundle = (root = process.cwd()) => {
  const scopeBundle = loadHsk1CurriculumScopeBundle(root);
  const personalBundle = loadHsk1PersonalExchangePackBundle(root);
  const communicativeBundle = loadHsk1CommunicativeUnitPacksBundle(root);
  const packPath = join(root, HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH);
  return {
    scopeBundle,
    personalBundle,
    communicativeBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk1TaskAssessmentPackBundle = ({
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
    return { valid: false, errors: ["HSK1 task pack schemaVersion must be 1"] };
  }
  if (
    pack.state !== "ai-assisted-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push("task pack must remain learner-hidden AI-assisted draft");
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
    errors.push("task pack source binding is stale");
  }
  if (
    pack.authorship?.method
      !== "ai-assisted-task-scenario-and-assessment-blueprint"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.taskPedagogyReviewer !== null
    || pack.authorship?.assessmentReviewer !== null
  ) {
    errors.push("task pack must not imply human review");
  }
  if (
    pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.taskPedagogyReviewRequiredForRelease !== true
    || pack.reviewPolicy?.assessmentCalibrationRequiredForMeasurement
      !== true
    || pack.reviewPolicy?.reviewedAudioRequiredForScoredListening !== true
  ) {
    errors.push("task and assessment policy must remain fail-closed");
  }
  if (
    pack.coverageClaims?.officialTaskInventoryDraftMapped !== true
    || pack.coverageClaims?.officialTopicInventoryDraftMapped !== true
    || pack.coverageClaims?.taskScenarioDraftComplete !== true
    || pack.coverageClaims?.levelAssessmentBlueprintComplete !== true
    || pack.coverageClaims?.calibratedAssessmentComplete !== false
    || pack.coverageClaims?.reviewedTaskContentComplete !== false
    || pack.coverageClaims?.hsk1Complete !== false
  ) {
    errors.push("task pack coverage claims are invalid");
  }

  const inventory = scopeBundle.graphBundle.syllabus.inventory;
  const officialTasks = inventory.tasks.filter((item) => item.level === 1);
  const officialTopics = inventory.topics.filter((item) => item.level === 1);
  const taskById = new Map(officialTasks.map((item) => [item.id, item]));
  const topicById = new Map(officialTopics.map((item) => [item.id, item]));
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
  const expectedTaskLesson = new Map(
    lessons.flatMap((lesson) =>
      lesson.taskIds.map((taskId) => [
        taskId,
        { lessonId: lesson.lessonId, unitId: lesson.unitId },
      ])
    ),
  );
  const expectedTopicLesson = new Map(
    lessons.flatMap((lesson) =>
      lesson.topicIds.map((topicId) => [
        topicId,
        { lessonId: lesson.lessonId, unitId: lesson.unitId },
      ])
    ),
  );

  if (!Array.isArray(pack.topicDrafts) || pack.topicDrafts.length !== 30) {
    errors.push("task pack must contain exactly 30 topic drafts");
  } else {
    const topicIds = pack.topicDrafts.map((item) => item.officialTopicId);
    if (
      duplicateValues(topicIds).length > 0
      || !exactSet(topicIds, officialTopics.map((item) => item.id))
    ) {
      errors.push("topic drafts must cover all official HSK1 topics exactly once");
    }
    for (const item of pack.topicDrafts) {
      const official = topicById.get(item.officialTopicId);
      const mapping = expectedTopicLesson.get(item.officialTopicId);
      if (
        !official
        || item.officialOrdinal !== official.ordinal
        || item.sourcePage !== official.sourcePage
        || item.domain !== official.domain
        || item.group !== official.group
        || item.officialTopic !== official.topic
      ) {
        errors.push(`${item.officialTopicId} official topic binding is stale`);
        continue;
      }
      if (
        !mapping
        || item.lessonId !== mapping.lessonId
        || item.unitId !== mapping.unitId
        || !validText(item.promptViDraft, 20, 300)
      ) {
        errors.push(`${item.officialTopicId} topic mapping or prompt is invalid`);
      }
      if (
        item.review?.machineAssisted !== true
        || item.review?.nativeMandarinReview !== "pending"
        || item.review?.vietnameseEditorialReview !== "pending"
        || item.review?.taskPedagogyReview !== "pending"
      ) {
        errors.push(`${item.officialTopicId} review state must remain pending`);
      }
    }
  }

  if (!Array.isArray(pack.taskScenarios) || pack.taskScenarios.length !== 15) {
    errors.push("task pack must contain exactly 15 task scenarios");
  } else {
    const taskIds = pack.taskScenarios.map((item) => item.officialTaskId);
    if (
      duplicateValues(taskIds).length > 0
      || !exactSet(taskIds, officialTasks.map((item) => item.id))
    ) {
      errors.push("task scenarios must cover all official HSK1 tasks exactly once");
    }
    for (const scenario of pack.taskScenarios) {
      const official = taskById.get(scenario.officialTaskId);
      const mapping = expectedTaskLesson.get(scenario.officialTaskId);
      const lesson = lessonById.get(scenario.lessonId);
      if (
        !official
        || scenario.officialOrdinal !== official.ordinal
        || scenario.sourcePage !== official.sourcePage
        || scenario.officialTitle !== official.title
        || scenario.officialBulletCount !== official.bulletCount
      ) {
        errors.push(`${scenario.officialTaskId} official task binding is stale`);
        continue;
      }
      if (
        !mapping
        || scenario.lessonId !== mapping.lessonId
        || scenario.unitId !== mapping.unitId
        || !lesson
        || !exactSet(scenario.relatedTopicIds ?? [], lesson.topicIds)
      ) {
        errors.push(`${scenario.officialTaskId} lesson/topic mapping is invalid`);
      }
      if (
        !validText(scenario.titleVi, 5, 200)
        || !validText(scenario.instructionVi, 20, 400)
        || !Array.isArray(scenario.targetFunctions)
        || scenario.targetFunctions.length !== 2
        || scenario.targetFunctions.some(
          (item) => !validText(item, 3, 100),
        )
      ) {
        errors.push(`${scenario.officialTaskId} scenario instruction is invalid`);
      }
      if (
        scenario.modelDialogue?.audio !== null
        || scenario.modelDialogue?.audioPolicy
          !== "reviewed-recording-required-for-assessment"
        || scenario.modelDialogue?.review !== "pending"
        || !Array.isArray(scenario.modelDialogue?.turns)
        || scenario.modelDialogue.turns.length !== 4
      ) {
        errors.push(`${scenario.officialTaskId} model dialogue is invalid`);
      } else {
        for (const turn of scenario.modelDialogue.turns) {
          if (
            !["A", "B"].includes(turn.speaker)
            || !validText(turn.hanzi, 1, 200)
            || !validText(turn.pinyin, 1, 300)
            || !validText(turn.meaningVi, 1, 300)
          ) {
            errors.push(`${scenario.officialTaskId} has an invalid dialogue turn`);
          }
        }
      }
      if (
        JSON.stringify(scenario.evidencePolicy?.observedSkills)
          !== JSON.stringify(["listening", "speaking"])
        || scenario.evidencePolicy?.grantsMastery !== false
        || scenario.evidencePolicy?.reviewedRubricRequired !== true
      ) {
        errors.push(`${scenario.officialTaskId} evidence policy is invalid`);
      }
      if (
        scenario.review?.machineAssisted !== true
        || scenario.review?.nativeMandarinReview !== "pending"
        || scenario.review?.vietnameseEditorialReview !== "pending"
        || scenario.review?.taskPedagogyReview !== "pending"
      ) {
        errors.push(`${scenario.officialTaskId} review state must remain pending`);
      }
    }
  }

  const scenarioByTaskId = new Map(
    (pack.taskScenarios ?? []).map((scenario) => [
      scenario.officialTaskId,
      scenario,
    ]),
  );
  if (!Array.isArray(pack.practiceItems) || pack.practiceItems.length !== 15) {
    errors.push("task pack must contain exactly 15 guided roleplay items");
  } else {
    const taskIds = pack.practiceItems.map((item) => item.officialTaskId);
    if (
      duplicateValues(pack.practiceItems.map((item) => item.itemId)).length > 0
      || duplicateValues(taskIds).length > 0
      || !exactSet(taskIds, officialTasks.map((item) => item.id))
    ) {
      errors.push("guided roleplay items must cover every task exactly once");
    }
    for (const item of pack.practiceItems) {
      const scenario = scenarioByTaskId.get(item.officialTaskId);
      if (
        !scenario
        || item.lessonId !== scenario.lessonId
        || item.kind !== "guided-roleplay-self-check"
        || item.instructionVi !== scenario.instructionVi
        || JSON.stringify(item.modelDialogue)
          !== JSON.stringify(scenario.modelDialogue.turns)
        || item.scoringPolicy !== "self-reveal-only"
      ) {
        errors.push(`${item.itemId} roleplay content is invalid`);
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

  const assessment = pack.levelAssessmentBlueprint;
  if (
    assessment?.blueprintId !== "hsk1-level-check-2026.07"
    || assessment?.objectiveItemBankId !== "hsk1-level-check-items-2026.07"
    || assessment?.state !== "uncalibrated-draft"
    || assessment?.learnerVisible !== false
    || assessment?.passingStandard !== null
    || assessment?.grantsMastery !== false
    || assessment?.grantsPrerequisiteWaiver !== false
    || !Array.isArray(assessment?.sections)
    || assessment.sections.length !== EXPECTED_SECTIONS.length
  ) {
    errors.push("HSK1 level assessment must remain an uncalibrated hidden blueprint");
  } else {
    for (const [index, [
      sectionId,
      skill,
      plannedItemCount,
      authoredItemCount,
    ]] of
      EXPECTED_SECTIONS.entries()) {
      const section = assessment.sections[index];
      if (
        section.sectionId !== sectionId
        || section.skill !== skill
        || section.plannedItemCount !== plannedItemCount
        || section.authoredItemCount !== authoredItemCount
      ) {
        errors.push(`${sectionId} assessment section is invalid`);
      }
    }
    if (
      assessment.sections[0].audioRequirement
        !== "reviewed-human-or-licensed-recording"
      || !exactSet(
        assessment.sections[3].scenarioPoolTaskIds ?? [],
        officialTasks.map((item) => item.id),
      )
      || assessment.sections[3].rubricState
        !== "pending-review-and-calibration"
      || assessment.calibration?.required !== true
      || assessment.calibration?.pilotSampleSize !== 0
      || assessment.calibration?.reliabilityEstimate !== null
      || assessment.calibration?.cutScore !== null
    ) {
      errors.push("HSK1 assessment calibration/audio policy is invalid");
    }
  }

  if (!Array.isArray(pack.reviewBatches) || pack.reviewBatches.length !== 15) {
    errors.push("task pack must have one review batch per task");
  } else {
    if (!exactSet(
      pack.reviewBatches.map((batch) => batch.officialTaskId),
      officialTasks.map((item) => item.id),
    )) {
      errors.push("task review batches must cover every task once");
    }
    for (const batch of pack.reviewBatches) {
      const scenario = scenarioByTaskId.get(batch.officialTaskId);
      const expectedItemIds = (pack.practiceItems ?? []).filter(
        (item) => item.officialTaskId === batch.officialTaskId,
      ).map((item) => item.itemId);
      if (
        !scenario
        || !exactSet(batch.topicIds ?? [], scenario.relatedTopicIds)
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
    Array.isArray(pack.topicDrafts)
    && Array.isArray(pack.taskScenarios)
    && Array.isArray(pack.practiceItems)
    && Array.isArray(pack.reviewBatches)
  ) {
    const expectedCounts = {
      communicativeLessonBlueprints: lessons.length,
      topicDrafts: pack.topicDrafts.length,
      taskScenarios: pack.taskScenarios.length,
      modelDialogueTurns: pack.taskScenarios.reduce(
        (total, scenario) =>
          total + scenario.modelDialogue.turns.length,
        0,
      ),
      guidedRoleplayItems: pack.practiceItems.length,
      reviewBatches: pack.reviewBatches.length,
      authoredLevelCheckItems: assessment.sections.reduce(
        (total, section) => total + section.authoredItemCount,
        0,
      ),
      measurementEligibleItems: pack.practiceItems.filter(
        (item) => item.measurementEligible === true,
      ).length,
      releaseEligibleItems: 0,
    };
    if (JSON.stringify(pack.counts) !== JSON.stringify(expectedCounts)) {
      errors.push("task pack counts do not match its content");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: pack.counts,
  };
};

export const assertValidHsk1TaskAssessmentPackBundle = (bundle) => {
  const result = validateHsk1TaskAssessmentPackBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 task-assessment pack:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
