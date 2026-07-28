import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk2LessonBlueprintsBundle,
  loadHsk2LessonBlueprintsBundle,
} from "./hsk2LessonBlueprints.mjs";
import {
  assertValidHsk2CharacterPracticeBundle,
  loadHsk2CharacterPracticeBundle,
} from "./hsk2CharacterPractice.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK2_SHORT_TEXT_PRODUCTION_RELATIVE_PATH =
  "content/drafts/hsk2-short-text-production-2026.07.json";

const REQUIRED_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "writing-pedagogy-reviewer",
  "assessment-editor",
];

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const validText = (value, minimum = 1, maximum = 800) =>
  typeof value === "string"
  && value.trim().length >= minimum
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
const normalizedCharacters = (value) =>
  [...value.replace(/[\s，。？！、“”‘’：；,.?!:;'"()-]/g, "")].sort().join("");

export const loadHsk2ShortTextProductionBundle = (
  root = process.cwd(),
) => {
  const blueprintBundle = loadHsk2LessonBlueprintsBundle(root);
  const characterBundle = loadHsk2CharacterPracticeBundle(root);
  const packPath = join(root, HSK2_SHORT_TEXT_PRODUCTION_RELATIVE_PATH);
  return {
    blueprintBundle,
    characterBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk2ShortTextProductionBundle = ({
  blueprintBundle,
  characterBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk2LessonBlueprintsBundle(blueprintBundle);
    assertValidHsk2CharacterPracticeBundle(characterBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }

  if (
    !isRecord(pack)
    || pack.schemaVersion !== 1
    || pack.packId !== "hsk2-short-text-production-2026.07"
    || pack.level !== 2
  ) {
    return {
      valid: false,
      errors: ["HSK2 short-text production identity is invalid"],
    };
  }

  if (
    pack.state !== "ai-assisted-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push(
      "HSK2 short-text production must remain learner-hidden and release-ineligible",
    );
  }

  if (
    pack.source?.lessonBlueprintPackId !== blueprintBundle.pack.packId
    || pack.source?.lessonBlueprintPackSha256
      !== fileSha256(blueprintBundle.packPath)
    || pack.source?.characterPracticePackId !== characterBundle.pack.packId
    || pack.source?.characterPracticePackSha256
      !== fileSha256(characterBundle.packPath)
  ) {
    errors.push("HSK2 short-text production source identity is stale");
  }

  if (
    pack.authorship?.method !== "ai-assisted-bounded-production-authoring"
    || pack.authorship?.assistant !== "OpenAI Codex"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.writingPedagogyReviewer !== null
    || pack.authorship?.assessmentEditor !== null
  ) {
    errors.push("HSK2 short-text production authorship is invalid");
  }

  if (
    pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.writingPedagogyReviewRequiredForRelease !== true
    || pack.reviewPolicy?.assessmentReviewRequiredForScoring !== true
    || pack.reviewPolicy?.reviewedAudioRequiredForDictation !== true
    || pack.reviewPolicy?.reviewedRubricRequiredForWritingMastery !== true
  ) {
    errors.push("HSK2 short-text production review policy is incomplete");
  }

  if (
    pack.mappingPolicy?.lessonCardinality
      !== "exactly-ten-short-text-blueprints"
    || pack.mappingPolicy?.promptMinimumsComeFromBlueprint !== true
    || pack.mappingPolicy?.targetCharactersCoveredExactlyOncePerLesson !== true
    || pack.mappingPolicy?.recognitionDoesNotInferWriting !== true
    || pack.mappingPolicy?.selfRevealDoesNotGrantMastery !== true
  ) {
    errors.push("HSK2 short-text production mapping policy is invalid");
  }

  if (
    pack.coverageClaims?.promptMinimumCoverageComplete !== true
    || pack.coverageClaims?.targetCharacterDraftCoverageComplete !== true
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.reviewedAudioComplete !== false
    || pack.coverageClaims?.scoredWritingCoverageComplete !== false
    || pack.coverageClaims?.writingMasteryCoverageComplete !== false
    || pack.coverageClaims?.hsk2Complete !== false
  ) {
    errors.push("HSK2 short-text production claims are invalid");
  }

  const expectedLessons = blueprintBundle.pack.lessons.filter(
    (lesson) => lesson.blueprintKind === "short-text-production",
  );
  const lessons = Array.isArray(pack.lessons) ? pack.lessons : [];
  if (
    lessons.length !== 10
    || !exactSet(
      lessons.map((lesson) => lesson.lessonId),
      expectedLessons.map((lesson) => lesson.lessonId),
    )
  ) {
    errors.push(
      "HSK2 short-text production must cover exactly ten production blueprints",
    );
  }

  const expectedLessonById = new Map(
    expectedLessons.map((lesson) => [lesson.lessonId, lesson]),
  );
  const characterById = new Map(
    characterBundle.pack.characters.map((item) => [
      item.officialCharacterId,
      item,
    ]),
  );
  const allPrompts = [];
  const allTargetIds = [];

  for (const lesson of lessons) {
    const expected = expectedLessonById.get(lesson.lessonId);
    if (!expected) continue;
    const expectedCharacterIds =
      expected.inventoryMappings.recognitionCharacterIds;
    const expectedCharacters = expectedCharacterIds.map(
      (id) => characterById.get(id)?.character,
    );
    if (
      lesson.trackId !== expected.trackId
      || lesson.titleVi !== expected.titleVi
      || lesson.objectiveVi !== expected.objectiveVi
      || lesson.minimumPromptUnits
        !== expected.assessmentPlan.minimumPromptUnits
      || !Array.isArray(lesson.targetCharacters)
      || !exactSet(
        lesson.targetCharacters.map((item) => item.officialCharacterId),
        expectedCharacterIds,
      )
    ) {
      errors.push(`${lesson.lessonId} blueprint binding is invalid`);
    }
    for (const target of lesson.targetCharacters ?? []) {
      const expectedCharacter = characterById.get(
        target.officialCharacterId,
      );
      if (
        !expectedCharacter
        || target.character !== expectedCharacter.character
        || target.contextState !== expectedCharacter.contextState
        || JSON.stringify(target.primaryContext)
          !== JSON.stringify(expectedCharacter.primaryContext)
      ) {
        errors.push(
          `${lesson.lessonId}:${target.officialCharacterId} character binding is invalid`,
        );
      }
    }

    const prompts = Array.isArray(lesson.prompts) ? lesson.prompts : [];
    if (prompts.length !== expected.assessmentPlan.minimumPromptUnits) {
      errors.push(`${lesson.lessonId} prompt minimum is not satisfied`);
    }
    const lessonTargetIds = [];
    prompts.forEach((item, index) => {
      allPrompts.push(item);
      const expectedId =
        `${lesson.lessonId}:production-${String(index + 1).padStart(2, "0")}`;
      if (
        item.itemId !== expectedId
        || item.lessonId !== lesson.lessonId
        || item.state !== "ai-assisted-draft"
        || item.learnerVisible !== false
        || item.releaseEligible !== false
      ) {
        errors.push(`${expectedId} identity or state is invalid`);
      }
      if (
        item.evidencePolicy?.responseMode !== "self-reveal-revision-only"
        || item.evidencePolicy?.reviewedRubricRequiredForScoring !== true
        || item.evidencePolicy?.measurementEligible !== false
        || item.evidencePolicy?.masteryEligible !== false
      ) {
        errors.push(`${expectedId} evidence policy is invalid`);
      }
      if (
        !validText(item.instructionVi, 20)
        || !Array.isArray(item.targetCharacterRefs)
        || item.targetCharacterRefs.length < 1
      ) {
        errors.push(`${expectedId} instruction or target mapping is invalid`);
      }
      const targetIds = (item.targetCharacterRefs ?? []).map(
        (target) => target.officialCharacterId,
      );
      lessonTargetIds.push(...targetIds);
      allTargetIds.push(...targetIds);
      for (const target of item.targetCharacterRefs ?? []) {
        const expectedCharacter = characterById.get(
          target.officialCharacterId,
        );
        if (
          !expectedCharacterIds.includes(target.officialCharacterId)
          || target.character !== expectedCharacter?.character
        ) {
          errors.push(`${expectedId} target character reference is invalid`);
        }
      }

      let answerHanzi;
      if (expected.trackId === "hsk2-dictation") {
        if (
          item.kind !== "reviewed-audio-dictation"
          || !validText(item.stimulus?.hanzi)
          || !validText(item.stimulus?.pinyin)
          || !validText(item.stimulus?.meaningVi)
          || item.stimulus?.audio !== null
          || item.stimulus?.browserTtsPolicy !== "draft-preview-only"
          || !Array.isArray(item.revisionChecklistVi)
          || item.revisionChecklistVi.length !== 3
        ) {
          errors.push(`${expectedId} dictation content is invalid`);
        }
        answerHanzi = item.stimulus?.hanzi ?? "";
      } else if (expected.trackId === "hsk2-sentence-reconstruction") {
        if (
          item.kind !== "ordered-sentence-reconstruction"
          || !Array.isArray(item.segments)
          || item.segments.length < 3
          || item.segments.some((segment) => !validText(segment))
          || item.segments.join("") === item.modelAnswer?.hanzi
          || normalizedCharacters(item.segments.join(""))
            !== normalizedCharacters(item.modelAnswer?.hanzi ?? "")
          || !validText(item.modelAnswer?.pinyin)
          || !validText(item.modelAnswer?.meaningVi)
          || !Array.isArray(item.revisionChecklistVi)
          || item.revisionChecklistVi.length !== 3
        ) {
          errors.push(`${expectedId} reconstruction content is invalid`);
        }
        answerHanzi = item.modelAnswer?.hanzi ?? "";
      } else {
        const expectedKind = expected.trackId === "hsk2-guided-message"
          ? "three-sentence-guided-message"
          : "guided-picture-description";
        const sentences = item.modelResponse?.sentences;
        if (
          item.kind !== expectedKind
          || !validText(item.situationVi, 20)
          || !Array.isArray(item.requiredElementsVi)
          || item.requiredElementsVi.length !== 3
          || item.requiredElementsVi.some((value) => !validText(value))
          || !Array.isArray(item.languageSupport)
          || item.languageSupport.length !== 3
          || item.languageSupport.some((value) => !validText(value))
          || !Array.isArray(sentences)
          || sentences.length !== 3
          || sentences.some((sentence) =>
            !validText(sentence?.hanzi)
            || !validText(sentence?.pinyin)
            || !validText(sentence?.meaningVi)
          )
          || item.modelResponse?.reviewState !== "pending"
          || !Array.isArray(item.revisionChecklistVi)
          || item.revisionChecklistVi.length !== 3
        ) {
          errors.push(`${expectedId} guided production content is invalid`);
        }
        answerHanzi = (sentences ?? []).map(
          (sentence) => sentence.hanzi,
        ).join("");
      }

      for (const target of item.targetCharacterRefs ?? []) {
        if (!answerHanzi.includes(target.character)) {
          errors.push(
            `${expectedId} does not use target character ${target.character}`,
          );
        }
      }
    });

    if (
      duplicateValues(lessonTargetIds).length > 0
      || !exactSet(lessonTargetIds, expectedCharacterIds)
      || !exactSet(
        lesson.targetCharacters.map((item) => item.character),
        expectedCharacters,
      )
    ) {
      errors.push(
        `${lesson.lessonId} target characters must be covered exactly once`,
      );
    }

    const isDictation = expected.trackId === "hsk2-dictation";
    if (
      lesson.review?.machineAssisted !== true
      || lesson.review?.nativeMandarinReview !== "pending"
      || lesson.review?.vietnameseEditorialReview !== "pending"
      || lesson.review?.writingPedagogyReview !== "pending"
      || lesson.review?.assessmentReview !== "pending"
      || lesson.review?.audioRightsReview
        !== (isDictation ? "blocked-no-audio" : "not-applicable")
    ) {
      errors.push(`${lesson.lessonId} review state is invalid`);
    }
  }

  if (
    duplicateValues(allPrompts.map((item) => item.itemId)).length > 0
  ) {
    errors.push("HSK2 short-text production prompt IDs must be unique");
  }

  const reviewBatches = Array.isArray(pack.reviewBatches)
    ? pack.reviewBatches
    : [];
  if (
    reviewBatches.length !== 10
    || !exactSet(
      reviewBatches.map((batch) => batch.lessonId),
      expectedLessons.map((lesson) => lesson.lessonId),
    )
  ) {
    errors.push("HSK2 short-text production review batches are incomplete");
  }
  for (const batch of reviewBatches) {
    const lesson = lessons.find((item) => item.lessonId === batch.lessonId);
    const expected = expectedLessonById.get(batch.lessonId);
    const requiredRoles = [
      ...REQUIRED_REVIEW_ROLES,
      ...(expected?.trackId === "hsk2-dictation"
        ? ["audio-rights-reviewer"]
        : []),
    ];
    if (
      batch.batchId
        !== `${batch.lessonId}:short-text-production-review-v1`
      || !lesson
      || !exactSet(
        batch.promptIds,
        lesson.prompts.map((item) => item.itemId),
      )
      || !exactSet(batch.requiredRoles, requiredRoles)
      || batch.state !== "pending"
      || !Array.isArray(batch.approvals)
      || batch.approvals.length !== 0
    ) {
      errors.push(`${batch.batchId ?? "unknown batch"} review batch is invalid`);
    }
  }

  const countKind = (kind) =>
    allPrompts.filter((item) => item.kind === kind).length;
  const modelSentences = allPrompts.reduce((count, item) => {
    if (
      item.kind === "reviewed-audio-dictation"
      || item.kind === "ordered-sentence-reconstruction"
    ) {
      return count + 1;
    }
    return count + (item.modelResponse?.sentences?.length ?? 0);
  }, 0);
  const expectedCounts = {
    lessons: 10,
    promptUnits: 104,
    dictationPrompts: countKind("reviewed-audio-dictation"),
    reconstructionPrompts: countKind("ordered-sentence-reconstruction"),
    guidedMessagePrompts: countKind("three-sentence-guided-message"),
    pictureDescriptionPrompts: countKind("guided-picture-description"),
    modelSentences,
    targetCharacterPromptMappings: new Set(allTargetIds).size,
    audioDependentPrompts: countKind("reviewed-audio-dictation"),
    reviewedAudioPrompts: 0,
    reviewBatches: reviewBatches.length,
    approvals: reviewBatches.reduce(
      (count, batch) => count + (batch.approvals?.length ?? 0),
      0,
    ),
    measurementEligibleItems: allPrompts.filter(
      (item) => item.evidencePolicy?.measurementEligible,
    ).length,
    masteryEligibleItems: allPrompts.filter(
      (item) => item.evidencePolicy?.masteryEligible,
    ).length,
    releaseEligibleItems: allPrompts.filter(
      (item) => item.releaseEligible,
    ).length,
  };
  if (
    expectedCounts.dictationPrompts !== 36
    || expectedCounts.reconstructionPrompts !== 36
    || expectedCounts.guidedMessagePrompts !== 16
    || expectedCounts.pictureDescriptionPrompts !== 16
    || expectedCounts.modelSentences !== 168
    || expectedCounts.targetCharacterPromptMappings !== 125
    || JSON.stringify(pack.counts) !== JSON.stringify(expectedCounts)
  ) {
    errors.push("HSK2 short-text production counts are stale or invalid");
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: pack.counts,
  };
};

export const assertValidHsk2ShortTextProductionBundle = (bundle) => {
  const result = validateHsk2ShortTextProductionBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `HSK2 short-text production validation failed:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
