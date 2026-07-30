import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk4LessonBlueprintsBundle,
  loadHsk4LessonBlueprintsBundle,
} from "./hsk4LessonBlueprints.mjs";
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
const QUESTION_KINDS = [
  "main-claim",
  "supported-detail",
  "cross-paragraph-evidence",
  "bounded-inference",
  "scope-limit",
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
const validText = (value, minimum = 1, maximum = 2_000) =>
  typeof value === "string"
  && value.length >= minimum
  && value.length <= maximum;
const failClosed = (item) => Object.entries(ELIGIBILITY_FIELDS).every(
  ([field, expected]) => item?.[field] === expected,
);

export const loadHsk4LongFormDomainPackBundle = ({
  root = process.cwd(),
  relativePath,
  prerequisiteBundles = [],
}) => {
  const packPath = join(root, relativePath);
  return {
    blueprintBundle: loadHsk4LessonBlueprintsBundle(root),
    prerequisiteBundles,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk4LongFormDomainPackBundle = ({
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
    completedLongFormDomains,
    completedLongFormLessons,
  } = config;
  const errors = [];
  try {
    assertValidHsk4LessonBlueprintsBundle(blueprintBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (!isRecord(pack) || pack.schemaVersion !== 1) {
    return {
      valid: false,
      errors: ["HSK4 long-form domain pack schemaVersion must be 1"],
    };
  }
  if (
    pack.packId !== packId
    || pack.level !== 4
    || pack.domainId !== domainId
    || pack.state !== "ai-assisted-long-form-content-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push("HSK4 long-form content must remain learner-hidden");
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
    errors.push("HSK4 long-form source binding is stale");
  }
  if (
    pack.authorship?.method
      !== "ai-assisted-long-form-and-evidence-practice-draft"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.assessmentEditor !== null
    || pack.authorship?.audioRightsReviewer !== null
  ) {
    errors.push("HSK4 long-form authorship must not imply review");
  }
  if (
    pack.pedagogyPolicy?.multipleParagraphsRequired !== true
    || pack.pedagogyPolicy?.explicitEvidenceRequired !== true
    || pack.pedagogyPolicy?.inferenceBoundaryRequired !== true
    || pack.pedagogyPolicy?.noteMapRequired !== true
    || pack.pedagogyPolicy?.crossSourceSynthesisRequired !== true
    || pack.pedagogyPolicy?.fullTextPinyinShownByDefault !== false
    || pack.pedagogyPolicy?.targetLexemePinyinOnDemand !== true
  ) {
    errors.push("HSK4 long-form pedagogy policy is invalid");
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
    errors.push("HSK4 long-form review/audio policy must fail closed");
  }
  if (
    pack.coverageClaims?.domainLongFormLessonDraftsComplete !== true
    || pack.coverageClaims?.completedLongFormDomains
      !== completedLongFormDomains
    || pack.coverageClaims?.completedLongFormLessons
      !== completedLongFormLessons
    || pack.coverageClaims?.fullHsk4VocabularyPracticeComplete !== false
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.assessmentCoverageComplete !== false
    || pack.coverageClaims?.hsk4Complete !== false
  ) {
    errors.push("HSK4 long-form coverage claims are invalid");
  }

  const lessons = Array.isArray(pack.lessons) ? pack.lessons : [];
  if (
    lessons.length !== lessonIds.length
    || !exact(lessons.map((lesson) => lesson.lessonId), lessonIds)
  ) {
    errors.push("HSK4 long-form lesson partition is invalid");
  }
  const blueprintById = new Map(
    blueprintBundle.pack.lessons.map((lesson) => [
      lesson.lessonId,
      lesson,
    ]),
  );
  const vocabularyById = new Map(
    blueprintBundle.vocabularyBundle.draft.entries.map((entry) => [
      entry.officialId,
      entry,
    ]),
  );
  const allPracticeItems = [];
  const allTextIds = [];
  const allTargetLexemeIds = [];

  for (const lesson of lessons) {
    const blueprint = blueprintById.get(lesson.lessonId);
    const allowedVocabularyIds = new Set(
      blueprint?.inventoryMappings.vocabularyIds ?? [],
    );
    const targetLexemes = Array.isArray(lesson.targetLexemes)
      ? lesson.targetLexemes
      : [];
    const texts = Array.isArray(lesson.texts) ? lesson.texts : [];
    const targetIds = targetLexemes.map((lexeme) => lexeme.officialId);
    if (
      blueprint?.trackId !== domainId
      || blueprint?.blueprintKind !== "deep-comprehension"
      || lesson.blueprintTitleVi !== blueprint?.titleVi
      || lesson.objectiveVi !== blueprint?.objectiveVi
      || !exact(
        lesson.mappedTopicIds,
        blueprint?.inventoryMappings.topicIds ?? [],
      )
      || targetLexemes.length < 10
      || duplicates(targetIds).length > 0
      || targetIds.some((id) => !allowedVocabularyIds.has(id))
    ) {
      errors.push(`${lesson.lessonId} blueprint/target binding is invalid`);
    }
    for (const lexeme of targetLexemes) {
      allTargetLexemeIds.push(lexeme.officialId);
      const source = vocabularyById.get(lexeme.officialId);
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
        ["long-form-reading", "long-form-listening"],
      )
    ) {
      errors.push(`${lesson.lessonId} must contain reading and listening`);
    }

    const textById = new Map();
    for (const text of texts) {
      allTextIds.push(text.textId);
      textById.set(text.textId, text);
      const paragraphs = Array.isArray(text.paragraphs)
        ? text.paragraphs
        : [];
      const paragraphIds = paragraphs.map((item) => item.paragraphId);
      const authoredHanzi = paragraphs.map((item) => item.hanzi).join("");
      if (
        !text.textId.startsWith(`${lesson.lessonId}:`)
        || !validText(text.titleHanzi, 2, 100)
        || !validText(text.titleVi, 5, 160)
        || text.pinyinSupportPolicy !== "target-lexeme-on-demand"
        || text.transcriptRevealPolicy !== (
          text.kind === "long-form-listening"
            ? "after-first-response"
            : "always-visible"
        )
        || text.audio !== null
        || paragraphs.length !== 3
        || duplicates(paragraphIds).length > 0
        || authoredHanzi.length < 220
        || !Array.isArray(text.targetVocabularyIds)
        || text.targetVocabularyIds.length < 5
        || duplicates(text.targetVocabularyIds).length > 0
        || text.targetVocabularyIds.some((id) => !targetIds.includes(id))
      ) {
        errors.push(`${text.textId} long-form contract is invalid`);
      }
      for (const paragraph of paragraphs) {
        if (
          !validText(paragraph.paragraphId, 3, 20)
          || !validText(paragraph.hanzi, 55, 700)
          || !validText(paragraph.vietnamese, 90, 1_200)
        ) {
          errors.push(`${text.textId}:${paragraph.paragraphId} is incomplete`);
        }
      }
      for (const officialId of text.targetVocabularyIds ?? []) {
        const lexeme = targetLexemes.find(
          (candidate) => candidate.officialId === officialId,
        );
        if (!lexeme || !authoredHanzi.includes(lexeme.simplified)) {
          errors.push(`${text.textId} misses target ${officialId}`);
        }
      }
    }
    const textTargetIds = texts.flatMap(
      (text) => text.targetVocabularyIds ?? [],
    );
    if (
      duplicates(textTargetIds).length > 0
      || !exactSet(textTargetIds, targetIds)
    ) {
      errors.push(`${lesson.lessonId} text targets must match its lexemes`);
    }

    const vocabularyPracticeItems =
      Array.isArray(lesson.vocabularyPracticeItems)
        ? lesson.vocabularyPracticeItems
        : [];
    const comprehensionItems = Array.isArray(lesson.comprehensionItems)
      ? lesson.comprehensionItems
      : [];
    const noteMaps = Array.isArray(lesson.noteMaps)
      ? lesson.noteMaps
      : [];
    const synthesisPrompt = lesson.synthesisPrompt;
    if (
      vocabularyPracticeItems.length !== targetLexemes.length * 3
      || comprehensionItems.length !== 10
      || noteMaps.length !== 2
      || !isRecord(synthesisPrompt)
    ) {
      errors.push(`${lesson.lessonId} practice counts are incomplete`);
    }

    const vocabularyItemById = new Map(
      vocabularyPracticeItems.map((item) => [item.itemId, item]),
    );
    for (const lexeme of targetLexemes) {
      for (const [suffix, kind, answer] of [
        ["meaning", "meaning-selection", lexeme.vietnameseGlossDraft],
        ["pinyin", "pinyin-recognition", lexeme.pinyin],
        ["listening", "listening-selection", lexeme.simplified],
      ]) {
        const itemId = `${lesson.lessonId}:${lexeme.officialId}:${suffix}`;
        const item = vocabularyItemById.get(itemId);
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
          errors.push(`${itemId} vocabulary practice is invalid`);
        }
      }
    }

    for (const text of texts) {
      const items = comprehensionItems.filter(
        (item) => item.textId === text.textId,
      );
      const paragraphIds = new Set(
        text.paragraphs.map((paragraph) => paragraph.paragraphId),
      );
      if (
        items.length !== 5
        || !exact(items.map((item) => item.kind), QUESTION_KINDS)
      ) {
        errors.push(`${text.textId} question lens coverage is invalid`);
      }
      for (const item of items) {
        const expectedSkill = text.kind === "long-form-reading"
          ? "reading"
          : "listening";
        if (
          item.lessonId !== lesson.lessonId
          || item.skill !== expectedSkill
          || !validText(item.promptVi, 15, 300)
          || !Array.isArray(item.optionsVi)
          || item.optionsVi.length !== 4
          || new Set(item.optionsVi).size !== 4
          || !Number.isInteger(item.correctOptionIndex)
          || item.correctOptionIndex < 0
          || item.correctOptionIndex > 3
          || !Array.isArray(item.evidenceParagraphIds)
          || item.evidenceParagraphIds.length < 1
          || item.evidenceParagraphIds.some((id) => !paragraphIds.has(id))
          || !validText(item.rationaleVi, 15, 500)
          || (
            item.kind === "cross-paragraph-evidence"
            && item.evidenceParagraphIds.length < 2
          )
          || (
            item.kind === "bounded-inference"
            && !validText(item.inferenceBoundaryVi, 15, 400)
          )
          || (
            item.kind !== "bounded-inference"
            && item.inferenceBoundaryVi !== null
          )
          || item.scoringPolicy !== "source-exposed-practice-only"
          || !failClosed(item)
          || (
            expectedSkill === "listening"
            && (
              item.audio !== null
              || item.ttsDisclosure !== "synthetic-browser-voice"
            )
          )
        ) {
          errors.push(`${item.itemId} comprehension item is invalid`);
        }
      }
    }

    for (const noteMap of noteMaps) {
      const text = textById.get(noteMap.textId);
      const paragraphIds = new Set(
        text?.paragraphs.map((paragraph) => paragraph.paragraphId) ?? [],
      );
      const nodeIds = Array.isArray(noteMap.nodes)
        ? noteMap.nodes.map((node) => node.nodeId)
        : [];
      if (
        noteMap.lessonId !== lesson.lessonId
        || !text
        || noteMap.skill !== (
          text.kind === "long-form-reading" ? "reading" : "listening"
        )
        || noteMap.nodes?.length !== 5
        || duplicates(nodeIds).length > 0
        || noteMap.nodes.some(
          (node) =>
            !validText(node.nodeId, 2, 40)
            || !validText(node.labelVi, 3, 120)
            || !validText(node.modelVi, 12, 400)
            || !Array.isArray(node.evidenceParagraphIds)
            || node.evidenceParagraphIds.length < 1
            || node.evidenceParagraphIds.some(
              (id) => !paragraphIds.has(id),
            ),
        )
        || !Array.isArray(noteMap.relations)
        || noteMap.relations.length < 4
        || noteMap.relations.some(
          (relation) =>
            !nodeIds.includes(relation.fromNodeId)
            || !nodeIds.includes(relation.toNodeId)
            || !validText(relation.relationVi, 3, 100),
        )
        || noteMap.responseMode
          !== "learner-evidence-map-with-model-reveal"
        || noteMap.scoringPolicy !== "source-exposed-practice-only"
        || !failClosed(noteMap)
        || (
          noteMap.skill === "listening"
          && (
            noteMap.audio !== null
            || noteMap.ttsDisclosure !== "synthetic-browser-voice"
          )
        )
      ) {
        errors.push(`${noteMap.itemId} note map is invalid`);
      }
    }

    const expectedTextIds = texts.map((text) => text.textId);
    const synthesisEvidence = Array.isArray(synthesisPrompt?.evidenceRefs)
      ? synthesisPrompt.evidenceRefs
      : [];
    if (
      synthesisPrompt?.lessonId !== lesson.lessonId
      || !exact(synthesisPrompt?.sourceTextIds, expectedTextIds)
      || synthesisPrompt?.skill !== "writing"
      || !validText(synthesisPrompt?.promptVi, 30, 500)
      || !Array.isArray(synthesisPrompt?.requiredElements)
      || synthesisPrompt.requiredElements.length < 5
      || synthesisEvidence.length < 4
      || !exactSet(
        [...new Set(synthesisEvidence.map((item) => item.textId))],
        expectedTextIds,
      )
      || synthesisEvidence.some((item) => {
        const source = textById.get(item.textId);
        return !source?.paragraphs.some(
          (paragraph) => paragraph.paragraphId === item.paragraphId,
        );
      })
      || synthesisPrompt?.minimumHanzi !== 120
      || synthesisPrompt?.maximumHanzi !== 220
      || !validText(synthesisPrompt?.modelHanzi, 100, 600)
      || !validText(synthesisPrompt?.modelVi, 150, 1_000)
      || synthesisPrompt?.reviewedRubric !== null
      || synthesisPrompt?.responseMode
        !== "write-revise-with-source-and-model-reveal"
      || synthesisPrompt?.scoringPolicy !== "source-exposed-practice-only"
      || !failClosed(synthesisPrompt)
    ) {
      errors.push(`${lesson.lessonId} synthesis prompt is invalid`);
    }

    const practiceItems = [
      ...vocabularyPracticeItems,
      ...comprehensionItems,
      ...noteMaps,
      synthesisPrompt,
    ];
    allPracticeItems.push(...practiceItems);
    const expectedReviewBatch = pack.reviewBatches?.find(
      (batch) => batch.lessonId === lesson.lessonId,
    );
    if (
      !exact(lesson.reviewBatch, expectedReviewBatch)
      || lesson.reviewBatch?.batchId
        !== `${lesson.lessonId}:long-form-review-v1`
      || !exact(lesson.reviewBatch?.targetLexemeIds, targetIds)
      || !exact(lesson.reviewBatch?.textIds, expectedTextIds)
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
    duplicates(allTargetLexemeIds).length > 0
    || duplicates(allTextIds).length > 0
    || duplicates(allPracticeItems.map((item) => item.itemId)).length > 0
  ) {
    errors.push("HSK4 long-form IDs must be globally unique");
  }
  const vocabularyItems = allPracticeItems.filter((item) =>
    ["meaning-selection", "pinyin-recognition", "listening-selection"]
      .includes(item?.kind)
  );
  const comprehensionItems = allPracticeItems.filter(
    (item) => QUESTION_KINDS.includes(item?.kind),
  );
  const noteMaps = allPracticeItems.filter(
    (item) => item?.responseMode
      === "learner-evidence-map-with-model-reveal",
  );
  const synthesisPrompts = allPracticeItems.filter(
    (item) => item?.responseMode
      === "write-revise-with-source-and-model-reveal",
  );
  const audioDependentItems =
    vocabularyItems.filter(
      (item) => item.kind === "listening-selection",
    ).length
    + comprehensionItems.filter((item) => item.skill === "listening").length
    + noteMaps.filter((item) => item.skill === "listening").length;
  const expectedCounts = {
    lessons: lessons.length,
    completedLongFormDomains,
    completedLongFormLessons,
    mappedTopics: lessons.flatMap((lesson) => lesson.mappedTopicIds ?? [])
      .length,
    targetLexemeContexts: allTargetLexemeIds.length,
    authoredTexts: allTextIds.length,
    authoredParagraphs: lessons.flatMap((lesson) =>
      lesson.texts?.flatMap((text) => text.paragraphs ?? []) ?? []
    ).length,
    vocabularyPracticeItems: vocabularyItems.length,
    comprehensionItems: comprehensionItems.length,
    evidenceBoundComprehensionItems: comprehensionItems.filter(
      (item) => item.evidenceParagraphIds.length > 0,
    ).length,
    inferenceItems: comprehensionItems.filter(
      (item) => item.kind === "bounded-inference",
    ).length,
    noteMapItems: noteMaps.length,
    noteMapNodes: noteMaps.flatMap((item) => item.nodes ?? []).length,
    synthesisPrompts: synthesisPrompts.length,
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
    errors.push("HSK4 long-form summary counts are stale");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk4LongFormDomainPackBundle = (input) => {
  const result = validateHsk4LongFormDomainPackBundle(input);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK4 long-form domain pack:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
