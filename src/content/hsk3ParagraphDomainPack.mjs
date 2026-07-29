import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk3LessonBlueprintsBundle,
  loadHsk3LessonBlueprintsBundle,
} from "./hsk3LessonBlueprints.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

const ELIGIBILITY_FIELDS = {
  review: "pending",
  releaseEligible: false,
  measurementEligible: false,
  masteryEligible: false,
};
const REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
  "audio-rights-reviewer",
];
const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);
const exactSet = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
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
const failClosed = (item) => Object.entries(ELIGIBILITY_FIELDS).every(
  ([field, expected]) => item?.[field] === expected,
);

export const loadHsk3ParagraphDomainPackBundle = ({
  root = process.cwd(),
  relativePath,
  prerequisiteBundles,
}) => {
  const packPath = join(root, relativePath);
  return {
    blueprintBundle: loadHsk3LessonBlueprintsBundle(root),
    prerequisiteBundles,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk3ParagraphDomainPackBundle = ({
  bundle,
  config,
}) => {
  const {
    blueprintBundle,
    prerequisiteBundles,
    pack,
  } = bundle;
  const {
    packId,
    domainId,
    lessonIds,
    completedParagraphDomainCount,
    completedParagraphLessons,
  } = config;
  const errors = [];
  try {
    assertValidHsk3LessonBlueprintsBundle(blueprintBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (!isRecord(pack) || pack.schemaVersion !== 1) {
    return {
      valid: false,
      errors: ["HSK3 paragraph domain pack schemaVersion must be 1"],
    };
  }
  if (
    pack.packId !== packId
    || pack.level !== 3
    || pack.domainId !== domainId
    || pack.state !== "ai-assisted-content-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push("HSK3 paragraph domain content must remain learner-hidden");
  }
  const expectedPrerequisites = prerequisiteBundles.map((prior) => ({
    packId: prior.pack.packId,
    sha256: fileSha256(prior.packPath),
  }));
  if (
    pack.derivedArtifactLicense !== "CC-BY-SA-4.0"
    || pack.source?.lessonBlueprintPackId !== blueprintBundle.pack.packId
    || pack.source?.lessonBlueprintPackSha256
      !== fileSha256(blueprintBundle.packPath)
    || pack.source?.vocabularyDraftId
      !== blueprintBundle.vocabularyBundle.draft.draftId
    || pack.source?.vocabularyDraftSha256
      !== fileSha256(blueprintBundle.vocabularyBundle.draftPath)
    || !exact(pack.source?.prerequisitePacks, expectedPrerequisites)
  ) {
    errors.push("HSK3 paragraph domain source binding is stale");
  }
  if (
    pack.authorship?.method !== "ai-assisted-paragraph-and-practice-draft"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.assessmentEditor !== null
    || pack.authorship?.audioRightsReviewer !== null
  ) {
    errors.push("HSK3 paragraph domain authorship must not imply review");
  }
  if (
    pack.audioPolicy?.committedAudio !== false
    || pack.audioPolicy?.browserTtsPreviewOnly !== true
    || pack.audioPolicy?.reviewedHumanOrLicensedAudioRequiredForRelease
      !== true
    || pack.audioPolicy?.browserAsrCanScoreSpeakingMastery !== false
    || pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.assessmentReviewRequiredForRelease !== true
    || pack.reviewPolicy?.audioRightsRequiredWhereAudioDependent !== true
    || pack.reviewPolicy?.sourceExposedPracticeCannotCalibrateAssessment
      !== true
  ) {
    errors.push("HSK3 paragraph domain review/audio policy must fail closed");
  }
  if (
    pack.coverageClaims?.domainLessonDraftsComplete !== true
    || pack.coverageClaims?.completedParagraphDomainCount
      !== completedParagraphDomainCount
    || pack.coverageClaims?.completedParagraphLessons
      !== completedParagraphLessons
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.assessmentCoverageComplete !== false
    || pack.coverageClaims?.hsk3Complete !== false
  ) {
    errors.push("HSK3 paragraph domain coverage claims are invalid");
  }

  const lessons = Array.isArray(pack.lessons) ? pack.lessons : [];
  if (
    lessons.length !== lessonIds.length
    || !exact(lessons.map((lesson) => lesson.lessonId), lessonIds)
  ) {
    errors.push("HSK3 paragraph domain lesson partition is invalid");
  }
  const blueprintById = new Map(
    blueprintBundle.pack.lessons.map((lesson) => [
      lesson.lessonId,
      lesson,
    ]),
  );
  const sourceById = new Map(
    blueprintBundle.vocabularyBundle.draft.entries.map((entry) => [
      entry.officialId,
      entry,
    ]),
  );
  const allPracticeItems = [];
  const allTextIds = [];
  const allLexemeIds = [];
  for (const lesson of lessons) {
    const blueprint = blueprintById.get(lesson.lessonId);
    const expectedVocabularyIds =
      blueprint?.inventoryMappings.vocabularyIds ?? [];
    const lexemes = Array.isArray(lesson.lexemes) ? lesson.lexemes : [];
    const texts = Array.isArray(lesson.texts) ? lesson.texts : [];
    if (
      blueprint?.trackId !== domainId
      || !validText(lesson.blueprintTitleVi, 5, 140)
      || duplicates(lexemes.map((lexeme) => lexeme.officialId)).length > 0
      || !exactSet(
        lexemes.map((lexeme) => lexeme.officialId),
        expectedVocabularyIds,
      )
    ) {
      errors.push(`${lesson.lessonId} vocabulary partition is invalid`);
    }
    for (const lexeme of lexemes) {
      allLexemeIds.push(lexeme.officialId);
      const source = sourceById.get(lexeme.officialId);
      const sourceDigests = [
        ...new Set(source?.sourceMatches.map(
          (match) => match.sourceLineSha256,
        ) ?? []),
      ];
      if (
        !source
        || lexeme.sequence !== source.sequence
        || lexeme.simplified !== source.simplified
        || lexeme.pinyin !== source.officialPinyin
        || lexeme.officialPartOfSpeech !== source.officialPartOfSpeech
        || !validText(lexeme.vietnameseGlossDraft, 1, 180)
        || !exactSet(lexeme.sourceLineSha256 ?? [], sourceDigests)
        || lexeme.sourceSenseReview !== "pending"
        || lexeme.mandarinLinguisticReview !== "pending"
        || lexeme.vietnameseEditorialReview !== "pending"
      ) {
        errors.push(`${lexeme.officialId} source/gloss binding is invalid`);
      }
    }
    if (
      texts.length !== 2
      || !exact(
        texts.map((text) => text.kind),
        ["graded-reading", "graded-listening"],
      )
    ) {
      errors.push(`${lesson.lessonId} must contain reading and listening`);
    }
    const combinedHanzi = [];
    for (const text of texts) {
      allTextIds.push(text.textId);
      if (
        !text.textId.startsWith(`${lesson.lessonId}:`)
        || !validText(text.titleHanzi, 2, 80)
        || !validText(text.titleVi, 5, 120)
        || text.audio !== null
        || !Array.isArray(text.lines)
        || text.lines.length !== 8
      ) {
        errors.push(`${text.textId} text contract is invalid`);
      }
      for (const line of text.lines ?? []) {
        combinedHanzi.push(line.hanzi);
        if (
          !validText(line.lineId, 3, 20)
          || !validText(line.hanzi, 8, 180)
          || !validText(line.pinyin, 8, 320)
          || !validText(line.vietnamese, 10, 400)
        ) {
          errors.push(`${text.textId}:${line.lineId} text line is incomplete`);
        }
      }
    }
    const authoredHanzi = combinedHanzi.join("");
    for (const lexeme of lexemes) {
      if (!authoredHanzi.includes(lexeme.simplified)) {
        errors.push(`${lexeme.officialId} is absent from ${lesson.lessonId}`);
      }
    }

    const vocabularyItems = Array.isArray(lesson.vocabularyPracticeItems)
      ? lesson.vocabularyPracticeItems
      : [];
    const comprehensionItems = Array.isArray(lesson.comprehensionItems)
      ? lesson.comprehensionItems
      : [];
    const noteGrids = Array.isArray(lesson.noteGrids)
      ? lesson.noteGrids
      : [];
    const summaries = Array.isArray(lesson.guidedSummaries)
      ? lesson.guidedSummaries
      : [];
    if (
      vocabularyItems.length !== lexemes.length * 3
      || comprehensionItems.length !== 10
      || noteGrids.length !== 2
      || summaries.length !== 2
    ) {
      errors.push(`${lesson.lessonId} practice counts are incomplete`);
    }
    const vocabularyItemById = new Map(
      vocabularyItems.map((item) => [item.itemId, item]),
    );
    for (const lexeme of lexemes) {
      for (const [suffix, kind, answer] of [
        ["meaning", "meaning-selection", lexeme.vietnameseGlossDraft],
        ["pinyin", "pinyin-recognition", lexeme.pinyin],
        ["listening", "listening-selection", lexeme.simplified],
      ]) {
        const id = `${lesson.lessonId}:${lexeme.officialId}:${suffix}`;
        const item = vocabularyItemById.get(id);
        if (
          !item
          || item.kind !== kind
          || item.lessonId !== lesson.lessonId
          || item.officialVocabularyId !== lexeme.officialId
          || item.correctAnswer !== answer
          || !Array.isArray(item.options)
          || item.options.length !== 4
          || new Set(item.options).size !== 4
          || !item.options.includes(answer)
          || item.scoringPolicy !== "automatic-draft-only"
          || !failClosed(item)
          || (kind === "listening-selection"
            && (
              item.audio !== null
              || item.ttsText !== lexeme.simplified
              || item.ttsDisclosure !== "synthetic-browser-voice"
            ))
        ) {
          errors.push(`${id} vocabulary practice is invalid`);
        }
      }
    }
    for (const item of comprehensionItems) {
      const expectedText = item.skill === "reading"
        ? texts[0]?.textId
        : item.skill === "listening"
          ? texts[1]?.textId
          : null;
      if (
        item.lessonId !== lesson.lessonId
        || item.textId !== expectedText
        || !validText(item.promptVi, 10, 240)
        || !Array.isArray(item.optionsVi)
        || item.optionsVi.length !== 4
        || new Set(item.optionsVi).size !== 4
        || !Number.isInteger(item.correctOptionIndex)
        || item.correctOptionIndex < 0
        || item.correctOptionIndex > 3
        || !validText(item.rationaleVi, 10, 320)
        || item.scoringPolicy !== "source-exposed-practice-only"
        || !failClosed(item)
        || (item.skill === "listening"
          && (
            item.audio !== null
            || item.ttsDisclosure !== "synthetic-browser-voice"
          ))
      ) {
        errors.push(`${item.itemId} comprehension practice is invalid`);
      }
    }
    for (const item of noteGrids) {
      if (
        item.lessonId !== lesson.lessonId
        || !texts.some((text) => text.textId === item.textId)
        || !["reading", "listening"].includes(item.skill)
        || !Array.isArray(item.fields)
        || item.fields.length !== 4
        || item.fields.some(
          (field) =>
            !validText(field.key, 2, 40)
            || !validText(field.labelVi, 3, 100)
            || !validText(field.modelVi, 8, 240),
        )
        || item.responseMode !== "learner-notes-with-model-reveal"
        || item.scoringPolicy !== "source-exposed-practice-only"
        || !failClosed(item)
        || (item.skill === "listening" && item.audio !== null)
      ) {
        errors.push(`${item.itemId} note grid is invalid`);
      }
    }
    for (const item of summaries) {
      if (
        item.lessonId !== lesson.lessonId
        || !texts.some((text) => text.textId === item.textId)
        || !["writing", "speaking"].includes(item.skill)
        || !validText(item.promptVi, 15, 280)
        || !Array.isArray(item.requiredElements)
        || item.requiredElements.length < 4
        || !validText(item.modelHanzi, 30, 700)
        || !validText(item.modelPinyin, 30, 1000)
        || !validText(item.modelVi, 30, 1000)
        || item.reviewedRubric !== null
        || item.responseMode !== "self-record-or-write-with-model-reveal"
        || item.scoringPolicy !== "source-exposed-practice-only"
        || !failClosed(item)
      ) {
        errors.push(`${item.itemId} guided summary is invalid`);
      }
    }
    const practiceItems = [
      ...vocabularyItems,
      ...comprehensionItems,
      ...noteGrids,
      ...summaries,
    ];
    allPracticeItems.push(...practiceItems);
    if (
      !exact(lesson.reviewBatch, pack.reviewBatches?.find(
        (batch) => batch.lessonId === lesson.lessonId,
      ))
      || lesson.reviewBatch?.batchId
        !== `${lesson.lessonId}:content-review-v1`
      || !exact(
        lesson.reviewBatch?.lexemeIds,
        lexemes.map((lexeme) => lexeme.officialId),
      )
      || !exact(
        lesson.reviewBatch?.textIds,
        texts.map((text) => text.textId),
      )
      || !exact(
        lesson.reviewBatch?.practiceItemIds,
        practiceItems.map((item) => item.itemId),
      )
      || !exact(lesson.reviewBatch?.requiredRoles, REVIEW_ROLES)
      || lesson.reviewBatch?.state !== "pending"
      || !exact(lesson.reviewBatch?.approvals, [])
    ) {
      errors.push(`${lesson.lessonId} review batch is invalid`);
    }
  }
  if (
    duplicates(allLexemeIds).length > 0
    || duplicates(allTextIds).length > 0
    || duplicates(allPracticeItems.map((item) => item.itemId)).length > 0
  ) {
    errors.push("HSK3 paragraph domain IDs must be globally unique");
  }
  const vocabularyItems = allPracticeItems.filter((item) =>
    ["meaning-selection", "pinyin-recognition", "listening-selection"]
      .includes(item.kind)
  );
  const comprehensionItems = allPracticeItems.filter((item) =>
    "optionsVi" in item
  );
  const noteGrids = allPracticeItems.filter(
    (item) => item.responseMode === "learner-notes-with-model-reveal",
  );
  const summaries = allPracticeItems.filter(
    (item) => item.responseMode
      === "self-record-or-write-with-model-reveal",
  );
  const audioDependentItems =
    vocabularyItems.filter((item) =>
      item.kind === "listening-selection"
    ).length
    + comprehensionItems.filter((item) => item.skill === "listening").length
    + noteGrids.filter((item) => item.skill === "listening").length
    + summaries.filter((item) => item.skill === "speaking").length;
  const expectedCounts = {
    lessons: lessons.length,
    completedParagraphDomainCount,
    completedParagraphLessons,
    vocabularyDrafts: allLexemeIds.length,
    authoredTexts: allTextIds.length,
    authoredTextLines: lessons.flatMap((lesson) =>
      lesson.texts?.flatMap((text) => text.lines ?? []) ?? []
    ).length,
    vocabularyPracticeItems: vocabularyItems.length,
    comprehensionItems: comprehensionItems.length,
    readingComprehensionItems: comprehensionItems.filter(
      (item) => item.skill === "reading",
    ).length,
    listeningComprehensionItems: comprehensionItems.filter(
      (item) => item.skill === "listening",
    ).length,
    noteGridItems: noteGrids.length,
    guidedSummaryItems: summaries.length,
    authoredPracticeItems: allPracticeItems.length,
    audioDependentItems,
    reviewedAudioItems: 0,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    reviewBatches: pack.reviewBatches?.length ?? 0,
    approvals: 0,
    releaseEligibleItems: 0,
  };
  if (!exact(pack.counts, expectedCounts)) {
    errors.push("HSK3 paragraph domain summary counts are stale");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk3ParagraphDomainPackBundle = (input) => {
  const result = validateHsk3ParagraphDomainPackBundle(input);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK3 paragraph domain pack:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
