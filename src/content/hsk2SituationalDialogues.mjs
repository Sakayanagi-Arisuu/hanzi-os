import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk2LessonBlueprintsBundle,
  loadHsk2LessonBlueprintsBundle,
} from "./hsk2LessonBlueprints.mjs";
import {
  assertValidHsk2VocabularyPracticeBundle,
  loadHsk2VocabularyPracticeBundle,
} from "./hsk2VocabularyPractice.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK2_SITUATIONAL_DIALOGUES_RELATIVE_PATH =
  "content/drafts/hsk2-situational-dialogues-2026.07.json";

const REQUIRED_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "task-pedagogy-reviewer",
  "audio-rights-reviewer",
];
const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const validText = (value, minimum = 1, maximum = 600) =>
  typeof value === "string"
  && value.length >= minimum
  && value.length <= maximum;
const exactSet = (left, right) =>
  JSON.stringify([...(left ?? [])].sort())
    === JSON.stringify([...(right ?? [])].sort());
const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

export const loadHsk2SituationalDialoguesBundle = (
  root = process.cwd(),
) => {
  const blueprintBundle = loadHsk2LessonBlueprintsBundle(root);
  const vocabularyBundle = loadHsk2VocabularyPracticeBundle(root);
  const packPath = join(root, HSK2_SITUATIONAL_DIALOGUES_RELATIVE_PATH);
  return {
    blueprintBundle,
    vocabularyBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk2SituationalDialoguesBundle = ({
  blueprintBundle,
  vocabularyBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk2LessonBlueprintsBundle(blueprintBundle);
    assertValidHsk2VocabularyPracticeBundle(vocabularyBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (
    !isRecord(pack)
    || pack.schemaVersion !== 1
    || pack.packId !== "hsk2-situational-dialogues-2026.07"
    || pack.level !== 2
  ) {
    return {
      valid: false,
      errors: ["HSK2 situational-dialogue identity is invalid"],
    };
  }
  if (
    pack.state !== "ai-assisted-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push(
      "HSK2 situational-dialogue pack must remain learner-hidden draft",
    );
  }
  if (
    pack.source?.syllabusInventorySha256
      !== blueprintBundle.scopeBundle.graphBundle.syllabus.inventorySha256
    || pack.source?.lessonBlueprintPackId !== blueprintBundle.pack.packId
    || pack.source?.lessonBlueprintPackSha256
      !== fileSha256(blueprintBundle.packPath)
    || pack.source?.vocabularyPracticePackId !== vocabularyBundle.pack.packId
    || pack.source?.vocabularyPracticePackSha256
      !== fileSha256(vocabularyBundle.packPath)
  ) {
    errors.push("HSK2 situational-dialogue source binding is stale");
  }
  if (
    pack.authorship?.method
      !== "ai-assisted-six-turn-dialogue-and-task-draft"
    || pack.authorship?.assistant !== "OpenAI Codex"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.taskPedagogyReviewer !== null
    || pack.authorship?.audioRightsReviewer !== null
  ) {
    errors.push("HSK2 situational-dialogue pack must not imply human review");
  }
  if (
    pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.taskPedagogyReviewRequiredForRelease !== true
    || pack.reviewPolicy?.reviewedHumanOrLicensedAudioRequiredForListening
      !== true
    || pack.reviewPolicy?.reviewedRubricRequiredForMeasurement !== true
  ) {
    errors.push("HSK2 situational-dialogue review policy must fail closed");
  }
  if (
    pack.coverageClaims?.officialTaskInventoryDraftMapped !== true
    || pack.coverageClaims?.officialTopicInventoryDraftMapped !== true
    || pack.coverageClaims?.situationalDialogueDraftComplete !== true
    || pack.coverageClaims?.reviewedTaskContentComplete !== false
    || pack.coverageClaims?.measurementCoverageComplete !== false
    || pack.coverageClaims?.hsk2Complete !== false
  ) {
    errors.push("HSK2 situational-dialogue coverage claims are invalid");
  }

  const inventory = blueprintBundle.scopeBundle.graphBundle.syllabus.inventory;
  const officialTasks = inventory.tasks.filter((item) => item.level === 2);
  const officialTopics = inventory.topics.filter((item) => item.level === 2);
  const taskById = new Map(officialTasks.map((item) => [item.id, item]));
  const topicById = new Map(officialTopics.map((item) => [item.id, item]));
  const situationalLessons = blueprintBundle.pack.lessons.filter(
    (lesson) => lesson.blueprintKind === "situational-dialogue",
  );
  const lessonById = new Map(
    situationalLessons.map((lesson) => [lesson.lessonId, lesson]),
  );
  const expectedTaskLesson = new Map(situationalLessons.flatMap((lesson) =>
    lesson.inventoryMappings.taskIds.map((taskId) => [taskId, lesson])
  ));
  const expectedTopicLesson = new Map(situationalLessons.flatMap((lesson) =>
    lesson.inventoryMappings.topicIds.map((topicId) => [topicId, lesson])
  ));
  const lexemeById = new Map(
    vocabularyBundle.pack.lexemes.map((lexeme) => [lexeme.officialId, lexeme]),
  );

  if (
    !Array.isArray(pack.lessonDialogues)
    || pack.lessonDialogues.length !== 20
  ) {
    errors.push("HSK2 situational pack must contain exactly 20 dialogues");
  } else {
    const lessonIds = pack.lessonDialogues.map((item) => item.lessonId);
    if (
      duplicateValues(lessonIds).length > 0
      || !exactSet(
        lessonIds,
        situationalLessons.map((lesson) => lesson.lessonId),
      )
    ) {
      errors.push(
        "HSK2 dialogues must cover every situational lesson exactly once",
      );
    }
    for (const dialogue of pack.lessonDialogues) {
      const lesson = lessonById.get(dialogue.lessonId);
      if (
        !lesson
        || dialogue.trackId !== lesson.trackId
        || dialogue.titleVi !== lesson.titleVi
        || !exactSet(
          dialogue.officialTaskIds,
          lesson.inventoryMappings.taskIds,
        )
        || !exactSet(
          dialogue.officialTopicIds,
          lesson.inventoryMappings.topicIds,
        )
      ) {
        errors.push(`${dialogue.lessonId} blueprint mapping is invalid`);
        continue;
      }
      if (
        !validText(dialogue.scenarioVi, 20, 400)
        || !validText(dialogue.taskInstructionVi, 30, 500)
        || !Array.isArray(dialogue.targetFunctions)
        || dialogue.targetFunctions.length !== 3
        || dialogue.targetFunctions.some(
          (item) => !validText(item, 5, 100),
        )
        || !Array.isArray(dialogue.usedVocabularyIds)
        || dialogue.usedVocabularyIds.length < 2
        || duplicateValues(dialogue.usedVocabularyIds).length > 0
      ) {
        errors.push(`${dialogue.lessonId} scenario contract is invalid`);
      }
      const dialogueText = dialogue.modelDialogue?.turns
        ?.map((turn) => turn.hanzi).join("") ?? "";
      for (const vocabularyId of dialogue.usedVocabularyIds ?? []) {
        const lexeme = lexemeById.get(vocabularyId);
        if (
          !lexeme
          || !lesson.inventoryMappings.vocabularyIds.includes(vocabularyId)
          || !dialogueText.includes(lexeme.simplified)
        ) {
          errors.push(
            `${dialogue.lessonId} vocabulary use ${vocabularyId} is invalid`,
          );
        }
      }
      if (
        dialogue.modelDialogue?.audio !== null
        || dialogue.modelDialogue?.audioPolicy
          !== "reviewed-human-or-licensed-recording-required"
        || dialogue.modelDialogue?.review !== "pending"
        || !Array.isArray(dialogue.modelDialogue?.turns)
        || dialogue.modelDialogue.turns.length !== 6
      ) {
        errors.push(`${dialogue.lessonId} model dialogue is invalid`);
      } else {
        const hanziTurns = dialogue.modelDialogue.turns.map(
          (turn) => turn.hanzi,
        );
        if (duplicateValues(hanziTurns).length > 0) {
          errors.push(`${dialogue.lessonId} dialogue turns must be distinct`);
        }
        dialogue.modelDialogue.turns.forEach((turn, index) => {
          const expectedSpeaker = index % 2 === 0 ? "A" : "B";
          if (
            turn.speaker !== expectedSpeaker
            || !validText(turn.hanzi, 2, 240)
            || !/\p{Script=Han}/u.test(turn.hanzi)
            || !validText(turn.pinyin, 2, 360)
            || !/[A-Za-zÀ-žüÜ]/u.test(turn.pinyin)
            || !validText(turn.meaningVi, 2, 360)
          ) {
            errors.push(
              `${dialogue.lessonId} turn ${index + 1} is invalid`,
            );
          }
        });
      }
      if (
        JSON.stringify(dialogue.evidencePolicy?.observedSkills)
          !== JSON.stringify(["listening", "speaking", "reading"])
        || dialogue.evidencePolicy?.minimumTurns !== 6
        || dialogue.evidencePolicy?.followUpRequired !== true
        || dialogue.evidencePolicy?.confirmationRequired !== true
        || dialogue.evidencePolicy?.reviewedRubricRequired !== true
        || dialogue.evidencePolicy?.grantsMastery !== false
      ) {
        errors.push(`${dialogue.lessonId} evidence policy is invalid`);
      }
      if (
        dialogue.review?.machineAssisted !== true
        || dialogue.review?.nativeMandarinReview !== "pending"
        || dialogue.review?.vietnameseEditorialReview !== "pending"
        || dialogue.review?.taskPedagogyReview !== "pending"
        || dialogue.review?.audioRightsReview !== "blocked-no-audio"
      ) {
        errors.push(`${dialogue.lessonId} review state must remain pending`);
      }
    }
  }

  if (!Array.isArray(pack.taskDrafts) || pack.taskDrafts.length !== 17) {
    errors.push("HSK2 situational pack must contain all 17 task drafts");
  } else {
    const taskIds = pack.taskDrafts.map((item) => item.officialTaskId);
    if (
      duplicateValues(taskIds).length > 0
      || !exactSet(taskIds, officialTasks.map((item) => item.id))
    ) {
      errors.push("HSK2 task drafts must exactly cover official tasks");
    }
    for (const draft of pack.taskDrafts) {
      const official = taskById.get(draft.officialTaskId);
      const lesson = expectedTaskLesson.get(draft.officialTaskId);
      if (
        !official
        || draft.officialOrdinal !== official.ordinal
        || draft.sourcePage !== official.sourcePage
        || draft.officialTitle !== official.title
        || draft.officialBulletCount !== official.bulletCount
        || !lesson
        || draft.lessonId !== lesson.lessonId
        || draft.trackId !== lesson.trackId
        || !exactSet(
          draft.relatedTopicIds,
          lesson.inventoryMappings.topicIds,
        )
        || !validText(draft.instructionViDraft, 30, 500)
        || !Array.isArray(draft.targetFunctions)
        || draft.targetFunctions.length !== 3
        || draft.evidencePolicy?.grantsMastery !== false
      ) {
        errors.push(`${draft.officialTaskId} task binding is invalid`);
      }
      if (
        draft.review?.machineAssisted !== true
        || draft.review?.nativeMandarinReview !== "pending"
        || draft.review?.vietnameseEditorialReview !== "pending"
        || draft.review?.taskPedagogyReview !== "pending"
      ) {
        errors.push(`${draft.officialTaskId} review state must remain pending`);
      }
    }
  }

  if (!Array.isArray(pack.topicDrafts) || pack.topicDrafts.length !== 34) {
    errors.push("HSK2 situational pack must contain all 34 topic drafts");
  } else {
    const topicIds = pack.topicDrafts.map((item) => item.officialTopicId);
    if (
      duplicateValues(topicIds).length > 0
      || !exactSet(topicIds, officialTopics.map((item) => item.id))
    ) {
      errors.push("HSK2 topic drafts must exactly cover official topics");
    }
    for (const draft of pack.topicDrafts) {
      const official = topicById.get(draft.officialTopicId);
      const lesson = expectedTopicLesson.get(draft.officialTopicId);
      if (
        !official
        || draft.officialOrdinal !== official.ordinal
        || draft.sourcePage !== official.sourcePage
        || draft.domain !== official.domain
        || draft.group !== official.group
        || draft.officialTopic !== official.topic
        || !lesson
        || draft.lessonId !== lesson.lessonId
        || draft.trackId !== lesson.trackId
        || !validText(draft.promptViDraft, 20, 400)
        || !Array.isArray(draft.supportQuestionsVi)
        || draft.supportQuestionsVi.length !== 2
        || draft.supportQuestionsVi.some(
          (item) => !validText(item, 10, 250),
        )
      ) {
        errors.push(`${draft.officialTopicId} topic binding is invalid`);
      }
      if (
        draft.review?.machineAssisted !== true
        || draft.review?.nativeMandarinReview !== "pending"
        || draft.review?.vietnameseEditorialReview !== "pending"
        || draft.review?.taskPedagogyReview !== "pending"
      ) {
        errors.push(`${draft.officialTopicId} review state must remain pending`);
      }
    }
  }

  const dialogueByLessonId = new Map(
    (pack.lessonDialogues ?? []).map((item) => [item.lessonId, item]),
  );
  if (
    !Array.isArray(pack.practiceItems)
    || pack.practiceItems.length !== 20
  ) {
    errors.push("HSK2 situational pack must contain 20 roleplay items");
  } else {
    const itemIds = pack.practiceItems.map((item) => item.itemId);
    const lessonIds = pack.practiceItems.map((item) => item.lessonId);
    if (
      duplicateValues(itemIds).length > 0
      || duplicateValues(lessonIds).length > 0
      || !exactSet(
        lessonIds,
        situationalLessons.map((lesson) => lesson.lessonId),
      )
    ) {
      errors.push("HSK2 roleplays must cover every dialogue lesson once");
    }
    for (const item of pack.practiceItems) {
      const dialogue = dialogueByLessonId.get(item.lessonId);
      if (
        !dialogue
        || item.itemId !== `${item.lessonId}:guided-roleplay-v1`
        || !exactSet(item.officialTaskIds, dialogue.officialTaskIds)
        || !exactSet(item.officialTopicIds, dialogue.officialTopicIds)
        || item.kind !== "six-turn-guided-roleplay-self-check"
        || item.instructionVi !== dialogue.taskInstructionVi
        || !Array.isArray(item.successChecklist)
        || item.successChecklist.length !== 3
        || JSON.stringify(item.modelDialogue)
          !== JSON.stringify(dialogue.modelDialogue.turns)
        || item.scoringPolicy !== "self-reveal-only"
        || item.review !== "pending"
        || item.measurementEligible !== false
        || item.masteryEligible !== false
        || item.releaseEligible !== false
      ) {
        errors.push(`${item.itemId} guided roleplay is invalid`);
      }
    }
  }

  if (
    !Array.isArray(pack.reviewBatches)
    || pack.reviewBatches.length !== 20
  ) {
    errors.push("HSK2 situational pack must have 20 review batches");
  } else {
    if (!exactSet(
      pack.reviewBatches.map((batch) => batch.lessonId),
      situationalLessons.map((lesson) => lesson.lessonId),
    )) {
      errors.push("HSK2 situational review batches must cover every lesson");
    }
    for (const batch of pack.reviewBatches) {
      const dialogue = dialogueByLessonId.get(batch.lessonId);
      if (
        !dialogue
        || batch.batchId !== `${batch.lessonId}:situational-review-v1`
        || !exactSet(batch.taskIds, dialogue.officialTaskIds)
        || !exactSet(batch.topicIds, dialogue.officialTopicIds)
        || !exactSet(batch.dialogueIds, [dialogue.lessonId])
        || !exactSet(
          batch.practiceItemIds,
          [`${dialogue.lessonId}:guided-roleplay-v1`],
        )
        || JSON.stringify(batch.requiredRoles)
          !== JSON.stringify(REQUIRED_ROLES)
        || batch.state !== "pending"
        || !Array.isArray(batch.approvals)
        || batch.approvals.length !== 0
      ) {
        errors.push(`${batch.batchId} review batch is invalid`);
      }
    }
  }

  if (
    Array.isArray(pack.lessonDialogues)
    && Array.isArray(pack.taskDrafts)
    && Array.isArray(pack.topicDrafts)
    && Array.isArray(pack.practiceItems)
    && Array.isArray(pack.reviewBatches)
  ) {
    const expectedCounts = {
      situationalLessons: pack.lessonDialogues.length,
      officialTaskDrafts: pack.taskDrafts.length,
      officialTopicDrafts: pack.topicDrafts.length,
      modelDialogueTurns: pack.lessonDialogues.reduce(
        (sum, dialogue) => sum + dialogue.modelDialogue.turns.length,
        0,
      ),
      guidedRoleplayItems: pack.practiceItems.length,
      audioDependentDialogues: pack.lessonDialogues.filter(
        (dialogue) => dialogue.modelDialogue.audio === null,
      ).length,
      reviewedAudioDialogues: 0,
      reviewBatches: pack.reviewBatches.length,
      approvals: pack.reviewBatches.reduce(
        (sum, batch) => sum + batch.approvals.length,
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
      errors.push("HSK2 situational-dialogue counts are stale");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: pack.counts,
  };
};

export const assertValidHsk2SituationalDialoguesBundle = (bundle) => {
  const result = validateHsk2SituationalDialoguesBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK2 situational-dialogue pack:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
