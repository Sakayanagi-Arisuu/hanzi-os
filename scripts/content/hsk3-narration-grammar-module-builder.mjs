import {
  assertValidHsk3LessonBlueprintsBundle,
  loadHsk3LessonBlueprintsBundle,
} from "../../src/content/hsk3LessonBlueprints.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const pendingState = () => ({
  review: "pending",
  measurementEligible: false,
  masteryEligible: false,
  releaseEligible: false,
});

export const buildHsk3NarrationGrammarModulePack = ({
  root = process.cwd(),
  packId,
  trackId,
  lessonIds,
  grammarDrafts,
  narratives,
  prerequisitePackBundles,
  completedNarrationGrammarModules,
  completedNarrationGrammarLessons,
}) => {
  const blueprintBundle = loadHsk3LessonBlueprintsBundle(root);
  assertValidHsk3LessonBlueprintsBundle(blueprintBundle);
  const grammarById = new Map(
    blueprintBundle.scopeBundle.graphBundle.syllabus.inventory.grammarRows
      .filter((row) => row.level === 3)
      .map((row) => [row.id, row]),
  );
  const lessons = lessonIds.map((lessonId) => {
    const blueprint = blueprintBundle.pack.lessons.find(
      (candidate) => candidate.lessonId === lessonId,
    );
    const narration = narratives[lessonId];
    if (
      !blueprint
      || blueprint.trackId !== trackId
      || blueprint.blueprintKind !== "narration-grammar"
      || !narration
    ) {
      throw new Error(`${lessonId} blueprint or narration input is missing`);
    }
    const grammar = blueprint.inventoryMappings.grammarRowIds.map(
      (grammarRowId) => {
        const source = grammarById.get(grammarRowId);
        const draft = grammarDrafts[grammarRowId];
        if (!source || !draft) {
          throw new Error(`${grammarRowId} source or draft is missing`);
        }
        return {
          grammarRowId,
          ordinal: source.ordinal,
          category: source.category,
          categoryName: source.categoryName,
          detail: source.detail,
          officialContent: source.content,
          sourcePage: source.sourcePage,
          explanationVi: draft.explanationVi,
          usageBoundaryVi: draft.usageBoundaryVi,
          example: {
            hanzi: draft.example[0],
            pinyin: draft.example[1],
            vietnamese: draft.example[2],
          },
          correctionPair: {
            erroneousHanzi: draft.correction[0],
            correctedHanzi: draft.correction[1],
            correctedPinyin: draft.correction[2],
            explanationVi: draft.correction[3],
          },
          paragraphPractice: {
            contextHanzi: draft.practice[0],
            correctAnswerHanzi: draft.practice[1],
            answerPinyin: draft.practice[2],
          },
          nativeMandarinReview: "pending",
          vietnameseEditorialReview: "pending",
          grammarPedagogyReview: "pending",
        };
      },
    );
    const modelNarration = {
      narrationId: `${lessonId}:model-narration`,
      titleHanzi: narration.titleHanzi,
      titleVi: narration.titleVi,
      lines: narration.lines.map(([hanzi, pinyin, vietnamese], index) => ({
        lineId: `n${String(index + 1).padStart(2, "0")}`,
        hanzi,
        pinyin,
        vietnamese,
      })),
      eventOrderVi: narration.eventOrderVi,
      targetGrammarRowIds: narration.targetGrammarRowIds,
    };
    const grammarInParagraphItems = grammar.map((item) => ({
      itemId: `${lessonId}:${item.grammarRowId}:paragraph`,
      lessonId,
      grammarRowId: item.grammarRowId,
      kind: "grammar-in-paragraph",
      skill: "writing",
      promptVi:
        `Hoàn thành câu trong mạch kể bằng mẫu “${item.officialContent}”.`,
      contextHanzi: item.paragraphPractice.contextHanzi,
      correctAnswerHanzi: item.paragraphPractice.correctAnswerHanzi,
      answerPinyin: item.paragraphPractice.answerPinyin,
      explanationVi: item.explanationVi,
      scoringPolicy: "source-exposed-practice-only",
      ...pendingState(),
    }));
    const errorCorrectionItems = grammar.map((item) => ({
      itemId: `${lessonId}:${item.grammarRowId}:correction`,
      lessonId,
      grammarRowId: item.grammarRowId,
      kind: "discourse-error-correction",
      skill: "writing",
      promptVi: "Sửa câu để mẫu ngữ pháp phù hợp với mạch tường thuật.",
      erroneousHanzi: item.correctionPair.erroneousHanzi,
      correctedHanzi: item.correctionPair.correctedHanzi,
      correctedPinyin: item.correctionPair.correctedPinyin,
      explanationVi: item.correctionPair.explanationVi,
      scoringPolicy: "self-reveal-only",
      ...pendingState(),
    }));
    const orderedRetellingItem = {
      itemId: `${lessonId}:ordered-retelling`,
      lessonId,
      narrationId: modelNarration.narrationId,
      kind: "ordered-event-retelling",
      skill: "speaking",
      promptVi: narration.retellingPromptVi,
      requiredEventOrderVi: narration.eventOrderVi,
      requiredGrammarRowIds: narration.targetGrammarRowIds,
      responseMode: "self-record-with-model-reveal",
      reviewedRubric: null,
      browserAsrCanScoreMastery: false,
      scoringPolicy: "self-reveal-only",
      ...pendingState(),
    };
    const practiceItemIds = [
      ...grammarInParagraphItems,
      ...errorCorrectionItems,
      orderedRetellingItem,
    ].map((item) => item.itemId);
    return {
      lessonId,
      blueprintTitleVi: blueprint.titleVi,
      blueprintObjectiveVi: blueprint.objectiveVi,
      grammar,
      modelNarration,
      grammarInParagraphItems,
      errorCorrectionItems,
      orderedRetellingItem,
      reviewBatch: {
        batchId: `${lessonId}:narration-grammar-review-v1`,
        lessonId,
        grammarRowIds: grammar.map((item) => item.grammarRowId),
        narrationIds: [modelNarration.narrationId],
        practiceItemIds,
        requiredRoles: [
          "native-mandarin-reviewer",
          "vietnamese-editor",
          "grammar-pedagogy-reviewer",
          "assessment-editor",
        ],
        state: "pending",
        approvals: [],
      },
    };
  });
  const grammar = lessons.flatMap((lesson) => lesson.grammar);
  const paragraphItems = lessons.flatMap(
    (lesson) => lesson.grammarInParagraphItems,
  );
  const correctionItems = lessons.flatMap(
    (lesson) => lesson.errorCorrectionItems,
  );
  const retellingItems = lessons.map(
    (lesson) => lesson.orderedRetellingItem,
  );
  return {
    schemaVersion: 1,
    packId,
    level: 3,
    trackId,
    state: "ai-assisted-content-draft",
    learnerVisible: false,
    releaseEligible: false,
    source: {
      syllabusSourceId:
        blueprintBundle.scopeBundle.graphBundle.syllabus.source.sourceId,
      syllabusInventorySha256:
        blueprintBundle.scopeBundle.graphBundle.syllabus.inventorySha256,
      lessonBlueprintPackId: blueprintBundle.pack.packId,
      lessonBlueprintPackSha256: fileSha256(blueprintBundle.packPath),
      prerequisitePacks: prerequisitePackBundles.map((bundle) => ({
        packId: bundle.pack.packId,
        sha256: fileSha256(bundle.packPath),
      })),
    },
    authorship: {
      method: "ai-assisted-grammar-narration-and-practice-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      grammarPedagogyReviewer: null,
      assessmentEditor: null,
    },
    reviewPolicy: {
      nativeMandarinRequiredForRelease: true,
      vietnameseEditorialRequiredForRelease: true,
      grammarPedagogyReviewRequiredForRelease: true,
      assessmentReviewRequiredForRelease: true,
      sourceExposedPracticeCannotCalibrateAssessment: true,
    },
    masteryPolicy: {
      grammarEvidenceSeparatedFromSpeakingEvidence: true,
      selfRevealCannotGrantMastery: true,
      browserAsrCannotScoreSpeakingMastery: true,
    },
    coverageClaims: {
      moduleLessonDraftsComplete: true,
      completedNarrationGrammarModules,
      completedNarrationGrammarLessons,
      reviewedContentComplete: false,
      assessmentCoverageComplete: false,
      hsk3Complete: false,
    },
    counts: {
      lessons: lessons.length,
      completedNarrationGrammarModules,
      completedNarrationGrammarLessons,
      grammarDrafts: grammar.length,
      modelExamples: grammar.length,
      correctionPairs: grammar.length,
      modelNarrations: lessons.length,
      modelNarrationLines: lessons.flatMap(
        (lesson) => lesson.modelNarration.lines,
      ).length,
      grammarInParagraphItems: paragraphItems.length,
      discourseErrorCorrectionItems: correctionItems.length,
      orderedRetellingItems: retellingItems.length,
      authoredPracticeItems:
        paragraphItems.length + correctionItems.length + retellingItems.length,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: lessons.length,
      approvals: 0,
      releaseEligibleItems: 0,
    },
    lessons,
    reviewBatches: lessons.map((lesson) => lesson.reviewBatch),
  };
};
