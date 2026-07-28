import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk1CurriculumScopeBundle,
  loadHsk1CurriculumScopeBundle,
} from "./hsk1CurriculumScope.mjs";
import {
  assertValidHsk1VocabularyDraftBundle,
  loadHsk1VocabularyDraftBundle,
} from "./hsk1VocabularyDraft.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_PERSONAL_EXCHANGE_PACK_RELATIVE_PATH =
  "content/drafts/hsk1-personal-exchange-2026.07.json";

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

export const loadHsk1PersonalExchangePackBundle = (root = process.cwd()) => {
  const scopeBundle = loadHsk1CurriculumScopeBundle(root);
  const vocabularyBundle = loadHsk1VocabularyDraftBundle(root);
  const packPath = join(root, HSK1_PERSONAL_EXCHANGE_PACK_RELATIVE_PATH);
  return {
    scopeBundle,
    vocabularyBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

const validateExactPartition = ({
  errors,
  label,
  actual,
  expected,
}) => {
  if (
    duplicateValues(actual).length > 0
    || !exactSet(actual, expected)
  ) {
    errors.push(`${label} must exactly partition its personal-exchange scope`);
  }
};

export const validateHsk1PersonalExchangePackBundle = ({
  scopeBundle,
  vocabularyBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk1CurriculumScopeBundle(scopeBundle);
    assertValidHsk1VocabularyDraftBundle(vocabularyBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (!isRecord(pack) || pack.schemaVersion !== 1) {
    return { valid: false, errors: ["HSK1 personal-exchange pack schemaVersion must be 1"] };
  }
  const personalScope = scopeBundle.scope.unitScopes.find(
    (unit) => unit.unitId === "hsk1-personal-exchange",
  );
  if (
    pack.unitId !== "hsk1-personal-exchange"
    || pack.state !== "ai-assisted-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push("personal-exchange pack must remain learner-hidden AI-assisted draft");
  }
  if (
    pack.derivedArtifactLicense !== "CC-BY-SA-4.0"
    || pack.source?.scopeId !== scopeBundle.scope.scopeId
    || pack.source?.scopeSha256 !== fileSha256(scopeBundle.scopePath)
    || pack.source?.vocabularyDraftId !== vocabularyBundle.draft.draftId
    || pack.source?.vocabularyDraftSha256 !== fileSha256(
      vocabularyBundle.draftPath,
    )
  ) {
    errors.push("personal-exchange pack source or license binding is stale");
  }
  if (
    pack.authorship?.method !== "ai-assisted-translation-and-curriculum-draft"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
  ) {
    errors.push("personal-exchange pack authorship must not imply human review");
  }
  if (
    pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.assessmentReviewRequiredForRelease !== true
    || pack.reviewPolicy?.dialoguePinyinReviewRequiredForRelease !== true
  ) {
    errors.push("personal-exchange pack review policy must remain fail-closed");
  }
  if (
    pack.coverageClaims?.unitBlueprintMapped !== true
    || pack.coverageClaims?.authoredPracticeCoverageComplete !== false
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.hsk1Complete !== false
  ) {
    errors.push("personal-exchange pack coverage claims are invalid");
  }
  if (!personalScope) {
    errors.push("personal-exchange scope is missing");
    return { valid: false, errors };
  }

  const officialVocabularyById = new Map(
    scopeBundle.graphBundle.syllabus.inventory.vocabulary.map(
      (item) => [item.id, item],
    ),
  );
  const sourceDraftById = new Map(
    vocabularyBundle.draft.entries.map((item) => [item.officialId, item]),
  );
  if (!Array.isArray(pack.lexemes)) {
    errors.push("personal-exchange lexemes must be an array");
  } else {
    validateExactPartition({
      errors,
      label: "lexeme drafts",
      actual: pack.lexemes.map((item) => item.officialId),
      expected: personalScope.vocabularyIds,
    });
    for (const lexeme of pack.lexemes) {
      const official = officialVocabularyById.get(lexeme.officialId);
      const sourceDraft = sourceDraftById.get(lexeme.officialId);
      if (
        !official
        || lexeme.simplified !== official.word
        || lexeme.pinyin !== official.pinyin
        || lexeme.officialPartOfSpeech !== official.partOfSpeech
      ) {
        errors.push(`${lexeme.officialId} official vocabulary binding is stale`);
        continue;
      }
      if (
        typeof lexeme.vietnameseGlossDraft !== "string"
        || lexeme.vietnameseGlossDraft.length < 1
        || lexeme.vietnameseGlossDraft.length > 160
      ) {
        errors.push(`${lexeme.officialId} Vietnamese draft gloss is invalid`);
      }
      const expectedDigests = [
        ...new Set(sourceDraft.sourceMatches.map(
          (source) => source.sourceLineSha256,
        )),
      ];
      if (!exactSet(lexeme.sourceLineSha256 ?? [], expectedDigests)) {
        errors.push(`${lexeme.officialId} source-line provenance drifted`);
      }
      if (
        lexeme.review?.machineAssisted !== true
        || lexeme.review?.mandarinLinguisticReview !== "pending"
        || lexeme.review?.vietnameseEditorialReview !== "pending"
      ) {
        errors.push(`${lexeme.officialId} review state must remain pending`);
      }
    }
  }

  if (!Array.isArray(pack.lessons) || pack.lessons.length !== 9) {
    errors.push("personal-exchange pack must contain exactly nine lesson blueprints");
  } else {
    const lessonIds = pack.lessons.map((lesson) => lesson.lessonId);
    if (duplicateValues(lessonIds).length > 0) {
      errors.push("personal-exchange lesson IDs must be unique");
    }
    for (const [index, lesson] of pack.lessons.entries()) {
      const expectedPrerequisites = index === 0 ? [] : [lessonIds[index - 1]];
      if (
        lesson.sequence !== index + 1
        || JSON.stringify(lesson.prerequisiteLessonIds)
          !== JSON.stringify(expectedPrerequisites)
        || typeof lesson.titleVi !== "string"
        || lesson.titleVi.length < 3
        || typeof lesson.objectiveVi !== "string"
        || lesson.objectiveVi.length < 20
      ) {
        errors.push(`${lesson.lessonId} sequence, prerequisite or objective is invalid`);
      }
      if (
        !isRecord(lesson.modelDialogue)
        || lesson.modelDialogue.audio !== null
        || lesson.modelDialogue.audioPolicy !== "browser-tts-practice-only"
        || lesson.modelDialogue.review !== "pending"
        || !Array.isArray(lesson.modelDialogue.turns)
        || lesson.modelDialogue.turns.length < 2
      ) {
        errors.push(`${lesson.lessonId} model dialogue must remain review-pending`);
      } else {
        for (const [turnIndex, turn] of lesson.modelDialogue.turns.entries()) {
          if (
            !["A", "B"].includes(turn.speaker)
            || ["hanzi", "pinyin", "meaningVi"].some(
              (field) => typeof turn[field] !== "string"
                || turn[field].length < 1
                || turn[field].length > 300,
            )
          ) {
            errors.push(`${lesson.lessonId} dialogue turn ${turnIndex + 1} is invalid`);
          }
        }
      }
      if (
        lesson.practiceBlueprint?.vocabularyTarget
          !== "all-lesson-vocabulary"
        || lesson.practiceBlueprint?.grammarTarget !== "all-lesson-grammar"
        || JSON.stringify(lesson.practiceBlueprint?.requiredKinds)
          !== JSON.stringify([
            "meaning-recall",
            "pinyin-recognition",
            "listening-selection",
            "context-selection",
          ])
        || lesson.practiceBlueprint?.authoredItemCount !== 0
        || lesson.practiceBlueprint?.grantsMastery !== false
      ) {
        errors.push(`${lesson.lessonId} practice blueprint must not imply authored items`);
      }
    }

    validateExactPartition({
      errors,
      label: "lesson vocabulary",
      actual: pack.lessons.flatMap((lesson) => lesson.vocabularyIds ?? []),
      expected: personalScope.vocabularyIds,
    });
    validateExactPartition({
      errors,
      label: "lesson tasks",
      actual: pack.lessons.flatMap((lesson) => lesson.taskIds ?? []),
      expected: personalScope.taskIds,
    });
    validateExactPartition({
      errors,
      label: "lesson topics",
      actual: pack.lessons.flatMap((lesson) => lesson.topicIds ?? []),
      expected: personalScope.topicIds,
    });
    validateExactPartition({
      errors,
      label: "lesson grammar",
      actual: pack.lessons.flatMap((lesson) => lesson.grammarRowIds ?? []),
      expected: personalScope.grammarRowIds,
    });
  }

  if (Array.isArray(pack.lexemes) && Array.isArray(pack.lessons)) {
    const expectedCounts = {
      lessons: pack.lessons.length,
      vocabularyDrafts: pack.lexemes.length,
      taskBlueprintMappings: new Set(
        pack.lessons.flatMap((lesson) => lesson.taskIds),
      ).size,
      topicBlueprintMappings: new Set(
        pack.lessons.flatMap((lesson) => lesson.topicIds),
      ).size,
      grammarBlueprintMappings: new Set(
        pack.lessons.flatMap((lesson) => lesson.grammarRowIds),
      ).size,
      dialogueTurns: pack.lessons.reduce(
        (total, lesson) => total + lesson.modelDialogue.turns.length,
        0,
      ),
      authoredPracticeItems: 0,
      releaseEligibleItems: 0,
    };
    if (JSON.stringify(pack.counts) !== JSON.stringify(expectedCounts)) {
      errors.push("personal-exchange pack counts do not match its content");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: pack.counts,
  };
};

export const assertValidHsk1PersonalExchangePackBundle = (bundle) => {
  const result = validateHsk1PersonalExchangePackBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 personal-exchange pack:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
