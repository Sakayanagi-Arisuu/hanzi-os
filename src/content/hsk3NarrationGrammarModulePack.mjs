import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk3LessonBlueprintsBundle,
  loadHsk3LessonBlueprintsBundle,
} from "./hsk3LessonBlueprints.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

const REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "grammar-pedagogy-reviewer",
  "assessment-editor",
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
const pending = (item) =>
  item?.review === "pending"
  && item?.measurementEligible === false
  && item?.masteryEligible === false
  && item?.releaseEligible === false;

export const loadHsk3NarrationGrammarModulePackBundle = ({
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

export const validateHsk3NarrationGrammarModulePackBundle = ({
  bundle,
  config,
}) => {
  const { blueprintBundle, prerequisiteBundles, pack } = bundle;
  const errors = [];
  try {
    assertValidHsk3LessonBlueprintsBundle(blueprintBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (
    !isRecord(pack)
    || pack.schemaVersion !== 1
    || pack.packId !== config.packId
    || pack.level !== 3
    || pack.trackId !== config.trackId
    || pack.state !== "ai-assisted-content-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    return {
      valid: false,
      errors: ["HSK3 narration/grammar pack identity is invalid"],
    };
  }
  const expectedPrerequisites = prerequisiteBundles.map((prior) => ({
    packId: prior.pack.packId,
    sha256: fileSha256(prior.packPath),
  }));
  if (
    pack.source?.syllabusSourceId
      !== blueprintBundle.scopeBundle.graphBundle.syllabus.source.sourceId
    || pack.source?.syllabusInventorySha256
      !== blueprintBundle.scopeBundle.graphBundle.syllabus.inventorySha256
    || pack.source?.lessonBlueprintPackId !== blueprintBundle.pack.packId
    || pack.source?.lessonBlueprintPackSha256
      !== fileSha256(blueprintBundle.packPath)
    || !exact(pack.source?.prerequisitePacks, expectedPrerequisites)
  ) {
    errors.push("HSK3 narration/grammar source binding is stale");
  }
  if (
    pack.authorship?.method
      !== "ai-assisted-grammar-narration-and-practice-draft"
    || pack.authorship?.assistant !== "OpenAI Codex"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.grammarPedagogyReviewer !== null
    || pack.authorship?.assessmentEditor !== null
  ) {
    errors.push("HSK3 narration/grammar pack must not imply human review");
  }
  if (
    pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.grammarPedagogyReviewRequiredForRelease !== true
    || pack.reviewPolicy?.assessmentReviewRequiredForRelease !== true
    || pack.reviewPolicy?.sourceExposedPracticeCannotCalibrateAssessment
      !== true
    || pack.masteryPolicy?.grammarEvidenceSeparatedFromSpeakingEvidence
      !== true
    || pack.masteryPolicy?.selfRevealCannotGrantMastery !== true
    || pack.masteryPolicy?.browserAsrCannotScoreSpeakingMastery !== true
  ) {
    errors.push("HSK3 narration/grammar policy must remain fail-closed");
  }
  if (
    pack.coverageClaims?.moduleLessonDraftsComplete !== true
    || pack.coverageClaims?.completedNarrationGrammarModules
      !== config.completedNarrationGrammarModules
    || pack.coverageClaims?.completedNarrationGrammarLessons
      !== config.completedNarrationGrammarLessons
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.assessmentCoverageComplete !== false
    || pack.coverageClaims?.hsk3Complete !== false
  ) {
    errors.push("HSK3 narration/grammar coverage claims are invalid");
  }

  const officialGrammarById = new Map(
    blueprintBundle.scopeBundle.graphBundle.syllabus.inventory.grammarRows
      .filter((row) => row.level === 3)
      .map((row) => [row.id, row]),
  );
  const blueprintById = new Map(
    blueprintBundle.pack.lessons.map((lesson) => [
      lesson.lessonId,
      lesson,
    ]),
  );
  const lessons = Array.isArray(pack.lessons) ? pack.lessons : [];
  if (
    lessons.length !== config.lessonIds.length
    || !exact(lessons.map((lesson) => lesson.lessonId), config.lessonIds)
  ) {
    errors.push("HSK3 narration/grammar lesson partition is invalid");
  }
  const allGrammarIds = [];
  const allPracticeIds = [];
  for (const lesson of lessons) {
    const blueprint = blueprintById.get(lesson.lessonId);
    const expectedGrammarIds =
      blueprint?.inventoryMappings.grammarRowIds ?? [];
    const grammar = Array.isArray(lesson.grammar) ? lesson.grammar : [];
    if (
      blueprint?.trackId !== config.trackId
      || blueprint?.blueprintKind !== "narration-grammar"
      || !exact(
        grammar.map((item) => item.grammarRowId),
        expectedGrammarIds,
      )
      || (blueprint?.inventoryMappings.recognitionCharacterIds?.length ?? 1)
        !== 0
    ) {
      errors.push(`${lesson.lessonId} blueprint binding is invalid`);
    }
    for (const item of grammar) {
      allGrammarIds.push(item.grammarRowId);
      const source = officialGrammarById.get(item.grammarRowId);
      if (
        !source
        || item.ordinal !== source.ordinal
        || item.category !== source.category
        || item.categoryName !== source.categoryName
        || item.detail !== source.detail
        || item.officialContent !== source.content
        || item.sourcePage !== source.sourcePage
        || !validText(item.explanationVi, 25, 600)
        || !validText(item.usageBoundaryVi, 15, 400)
        || !validText(item.example?.hanzi, 4, 180)
        || !validText(item.example?.pinyin, 8, 320)
        || !validText(item.example?.vietnamese, 8, 320)
        || !validText(item.correctionPair?.erroneousHanzi, 4, 180)
        || !validText(item.correctionPair?.correctedHanzi, 4, 180)
        || item.correctionPair.erroneousHanzi
          === item.correctionPair.correctedHanzi
        || !validText(item.correctionPair?.correctedPinyin, 8, 320)
        || !validText(item.correctionPair?.explanationVi, 15, 400)
        || !validText(item.paragraphPractice?.contextHanzi, 6, 240)
        || !validText(
          item.paragraphPractice?.correctAnswerHanzi,
          4,
          180,
        )
        || !validText(item.paragraphPractice?.answerPinyin, 8, 320)
        || item.nativeMandarinReview !== "pending"
        || item.vietnameseEditorialReview !== "pending"
        || item.grammarPedagogyReview !== "pending"
      ) {
        errors.push(`${item.grammarRowId} grammar draft is invalid`);
      }
    }
    const narration = lesson.modelNarration;
    if (
      narration?.narrationId !== `${lesson.lessonId}:model-narration`
      || !validText(narration?.titleHanzi, 2, 80)
      || !validText(narration?.titleVi, 5, 120)
      || !Array.isArray(narration?.lines)
      || narration.lines.length !== 6
      || narration.lines.some((line, index) =>
        line.lineId !== `n${String(index + 1).padStart(2, "0")}`
        || !validText(line.hanzi, 8, 180)
        || !validText(line.pinyin, 8, 320)
        || !validText(line.vietnamese, 10, 400)
      )
      || !Array.isArray(narration?.eventOrderVi)
      || narration.eventOrderVi.length !== 4
      || !Array.isArray(narration?.targetGrammarRowIds)
      || narration.targetGrammarRowIds.length < 3
      || !narration.targetGrammarRowIds.every((id) =>
        expectedGrammarIds.includes(id)
      )
    ) {
      errors.push(`${lesson.lessonId} model narration is invalid`);
    }
    const paragraphItems = Array.isArray(lesson.grammarInParagraphItems)
      ? lesson.grammarInParagraphItems
      : [];
    const correctionItems = Array.isArray(lesson.errorCorrectionItems)
      ? lesson.errorCorrectionItems
      : [];
    if (
      paragraphItems.length !== grammar.length
      || correctionItems.length !== grammar.length
    ) {
      errors.push(`${lesson.lessonId} grammar practice counts are invalid`);
    }
    const grammarById = new Map(
      grammar.map((item) => [item.grammarRowId, item]),
    );
    for (const item of paragraphItems) {
      allPracticeIds.push(item.itemId);
      const grammarDraft = grammarById.get(item.grammarRowId);
      if (
        item.itemId
          !== `${lesson.lessonId}:${item.grammarRowId}:paragraph`
        || item.lessonId !== lesson.lessonId
        || item.kind !== "grammar-in-paragraph"
        || item.skill !== "writing"
        || !grammarDraft
        || !validText(item.promptVi, 15, 320)
        || !validText(item.contextHanzi, 6, 240)
        || !validText(item.correctAnswerHanzi, 4, 180)
        || !validText(item.answerPinyin, 8, 320)
        || item.contextHanzi !== grammarDraft.paragraphPractice.contextHanzi
        || item.correctAnswerHanzi
          !== grammarDraft.paragraphPractice.correctAnswerHanzi
        || item.answerPinyin
          !== grammarDraft.paragraphPractice.answerPinyin
        || item.explanationVi !== grammarDraft.explanationVi
        || item.scoringPolicy !== "source-exposed-practice-only"
        || !pending(item)
      ) {
        errors.push(`${item.itemId} grammar-in-paragraph item is invalid`);
      }
    }
    for (const item of correctionItems) {
      allPracticeIds.push(item.itemId);
      const grammarDraft = grammarById.get(item.grammarRowId);
      if (
        item.itemId
          !== `${lesson.lessonId}:${item.grammarRowId}:correction`
        || item.lessonId !== lesson.lessonId
        || item.kind !== "discourse-error-correction"
        || item.skill !== "writing"
        || !grammarDraft
        || item.erroneousHanzi
          !== grammarDraft.correctionPair.erroneousHanzi
        || item.correctedHanzi
          !== grammarDraft.correctionPair.correctedHanzi
        || item.correctedPinyin
          !== grammarDraft.correctionPair.correctedPinyin
        || item.explanationVi
          !== grammarDraft.correctionPair.explanationVi
        || item.scoringPolicy !== "self-reveal-only"
        || !pending(item)
      ) {
        errors.push(`${item.itemId} discourse correction item is invalid`);
      }
    }
    const retelling = lesson.orderedRetellingItem;
    allPracticeIds.push(retelling?.itemId);
    if (
      retelling?.itemId !== `${lesson.lessonId}:ordered-retelling`
      || retelling.lessonId !== lesson.lessonId
      || retelling.narrationId !== narration?.narrationId
      || retelling.kind !== "ordered-event-retelling"
      || retelling.skill !== "speaking"
      || !validText(retelling.promptVi, 15, 320)
      || !exact(retelling.requiredEventOrderVi, narration?.eventOrderVi)
      || !exact(
        retelling.requiredGrammarRowIds,
        narration?.targetGrammarRowIds,
      )
      || retelling.responseMode !== "self-record-with-model-reveal"
      || retelling.reviewedRubric !== null
      || retelling.browserAsrCanScoreMastery !== false
      || retelling.scoringPolicy !== "self-reveal-only"
      || !pending(retelling)
    ) {
      errors.push(`${lesson.lessonId} ordered retelling item is invalid`);
    }
    const practiceItems = [
      ...paragraphItems,
      ...correctionItems,
      retelling,
    ];
    const batch = lesson.reviewBatch;
    if (
      !exact(batch, pack.reviewBatches?.find(
        (candidate) => candidate.lessonId === lesson.lessonId,
      ))
      || batch?.batchId
        !== `${lesson.lessonId}:narration-grammar-review-v1`
      || !exact(
        batch?.grammarRowIds,
        grammar.map((item) => item.grammarRowId),
      )
      || !exact(batch?.narrationIds, [narration?.narrationId])
      || !exact(
        batch?.practiceItemIds,
        practiceItems.map((item) => item.itemId),
      )
      || !exact(batch?.requiredRoles, REVIEW_ROLES)
      || batch?.state !== "pending"
      || !exact(batch?.approvals, [])
    ) {
      errors.push(`${lesson.lessonId} review batch is invalid`);
    }
  }
  const expectedGrammarIds = config.lessonIds.flatMap(
    (lessonId) =>
      blueprintById.get(lessonId)?.inventoryMappings.grammarRowIds ?? [],
  );
  if (
    duplicates(allGrammarIds).length > 0
    || !exactSet(allGrammarIds, expectedGrammarIds)
    || duplicates(allPracticeIds).length > 0
  ) {
    errors.push("HSK3 narration/grammar IDs or partition are invalid");
  }
  const grammarCount = allGrammarIds.length;
  const expectedCounts = {
    lessons: lessons.length,
    completedNarrationGrammarModules:
      config.completedNarrationGrammarModules,
    completedNarrationGrammarLessons:
      config.completedNarrationGrammarLessons,
    grammarDrafts: grammarCount,
    modelExamples: grammarCount,
    correctionPairs: grammarCount,
    modelNarrations: lessons.length,
    modelNarrationLines: lessons.length * 6,
    grammarInParagraphItems: grammarCount,
    discourseErrorCorrectionItems: grammarCount,
    orderedRetellingItems: lessons.length,
    authoredPracticeItems: grammarCount * 2 + lessons.length,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    reviewBatches: lessons.length,
    approvals: 0,
    releaseEligibleItems: 0,
  };
  if (!exact(pack.counts, expectedCounts)) {
    errors.push("HSK3 narration/grammar summary counts are stale");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk3NarrationGrammarModulePackBundle = (input) => {
  const result = validateHsk3NarrationGrammarModulePackBundle(input);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK3 narration/grammar module:\n- ${
        result.errors.join("\n- ")
      }`,
    );
  }
  return result;
};
