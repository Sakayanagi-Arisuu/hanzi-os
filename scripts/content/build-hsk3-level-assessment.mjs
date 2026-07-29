import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectHsk3AssessmentSources,
  hsk3AssessmentSourceSnapshotSha256,
  HSK3_LEVEL_ASSESSMENT_RELATIVE_PATH,
} from "../../src/content/hsk3LevelAssessment.mjs";
import {
  assertValidHsk3StructuredExplanationPackBundle,
  loadHsk3StructuredExplanationPackBundle,
} from "../../src/content/hsk3StructuredExplanationPack.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const BANK_ID = "hsk3-level-assessment-2026.07";
const FORM_IDS = ["hsk3-level-form-a", "hsk3-level-form-b"];
const OPTION_IDS = ["A", "B", "C", "D"];
const OBJECTIVE_SECTIONS = [
  "listening-objective",
  "reading-objective",
  "vocabulary-objective",
  "grammar-objective",
];
const PERFORMANCE_SECTIONS = [
  "speaking-performance",
  "writing-performance",
];
const sampleEvenly = (values, count) => {
  if (count > values.length) {
    throw new Error(`Cannot sample ${count} values from ${values.length}`);
  }
  return Array.from({ length: count }, (_, index) =>
    values[Math.floor(index * values.length / count)]
  );
};
const splitAlternate = (values) => ({
  [FORM_IDS[0]]: values.filter((_, index) => index % 2 === 0),
  [FORM_IDS[1]]: values.filter((_, index) => index % 2 === 1),
});
const rotateOptions = (texts, correctText, shift) => {
  const uniqueTexts = [...new Set(texts)];
  if (uniqueTexts.length !== 4 || !uniqueTexts.includes(correctText)) {
    throw new Error("Assessment objective options must contain four choices");
  }
  const offset = shift % OPTION_IDS.length;
  const rotated = [
    ...uniqueTexts.slice(offset),
    ...uniqueTexts.slice(0, offset),
  ];
  const options = rotated.map((text, index) => ({
    optionId: OPTION_IDS[index],
    text,
  }));
  return {
    options,
    correctOptionId: options.find(
      (option) => option.text === correctText,
    ).optionId,
  };
};
const generatedOptions = (answerPool, correctIndex) => {
  const correct = answerPool[correctIndex];
  const distractors = [];
  for (let offset = 1; distractors.length < 3; offset += 1) {
    const candidate = answerPool[(correctIndex + offset) % answerPool.length];
    if (candidate !== correct && !distractors.includes(candidate)) {
      distractors.push(candidate);
    }
  }
  return rotateOptions([correct, ...distractors], correct, correctIndex);
};
const commonItemState = ({ itemId, formId, sectionId, slot }) => ({
  itemVersion: `${BANK_ID}:${itemId}:1`,
  formId,
  exposureGroupId: `${BANK_ID}:${itemId}`,
  equivalentGroupId:
    `${BANK_ID}:${sectionId}:slot-${String(slot).padStart(2, "0")}`,
  answerExposure: "repository-authoring-only",
  sourceExposure: "practice-source-exposed-draft",
  reviewStatus: "pending",
  calibrationStatus: "uncalibrated",
  independentFormStatus: "planned-nonoverlapping-source-draft",
  scoringPolicy: "draft-only-not-for-issuance",
  measurementEligible: false,
  masteryEligible: false,
  prerequisiteWaiverEligible: false,
  releaseEligible: false,
});
const sourceFields = (candidate, entityType) => ({
  source: {
    artifactId: candidate.sourcePackId,
    entityType,
    entityId: candidate.item.itemId,
    lessonId: candidate.sourceLessonId,
  },
  sourceEntityKey:
    `${candidate.sourcePackId}:${candidate.item.itemId}`,
  sourceSnapshotSha256: hsk3AssessmentSourceSnapshotSha256({
    item: candidate.item,
    ...(candidate.sourceText
      ? { sourceText: candidate.sourceText }
      : {}),
  }),
});
const itemIdFor = (formId, section, index) => [
  "hsk3-level-check",
  formId.endsWith("-a") ? "form-a" : "form-b",
  section,
  String(index + 1).padStart(2, "0"),
].join(":");

const buildParagraphObjectiveItems = ({
  sectionId,
  skill,
  modality,
  entityType,
  candidates,
  promptVi,
}) => {
  const selected = sampleEvenly(candidates, 24);
  const buckets = splitAlternate(selected);
  return FORM_IDS.flatMap((formId) =>
    buckets[formId].map((candidate, index) => {
      const itemId = itemIdFor(
        formId,
        sectionId.replace("-objective", ""),
        index,
      );
      const text = candidate.sourceText;
      const correctText =
        candidate.item.optionsVi[candidate.item.correctOptionIndex];
      return {
        itemId,
        sectionId,
        skill,
        construct: skill === "listening"
          ? "eight-line-paragraph-listening-comprehension"
          : "eight-line-paragraph-reading-comprehension",
        modality,
        ...sourceFields(candidate, entityType),
        promptVi,
        stimulus: skill === "listening"
          ? {
              audio: null,
              audioRequirement: "reviewed-human-or-licensed-recording",
              authoringPreview: "synthetic-browser-voice",
              titleVi: text.titleVi,
              lines: text.lines.map((line) => ({
                lineId: line.lineId,
                hanzi: line.hanzi,
                pinyin: line.pinyin,
              })),
              transcriptReview: "pending",
            }
          : {
              kind: "hanzi-paragraph",
              titleVi: text.titleVi,
              text: text.lines.map((line) => line.hanzi).join(""),
              pinyinAuthoringReference: text.lines.map(
                (line) => line.pinyin,
              ).join(" "),
            },
        ...commonItemState({
          itemId,
          formId,
          sectionId,
          slot: index + 1,
        }),
        ...rotateOptions(
          candidate.item.optionsVi,
          correctText,
          index,
        ),
      };
    })
  );
};

const buildVocabularyItems = (candidates) => {
  const selected = sampleEvenly(candidates, 30);
  const buckets = splitAlternate(selected);
  return FORM_IDS.flatMap((formId) =>
    buckets[formId].map((candidate, index) => {
      const itemId = itemIdFor(formId, "vocabulary", index);
      return {
        itemId,
        sectionId: "vocabulary-objective",
        skill: "vocabulary",
        construct: "hsk3-word-meaning-recognition",
        modality: "visual-selection",
        ...sourceFields(candidate, "vocabulary-meaning-practice"),
        promptVi: "Chọn nghĩa phù hợp nhất của từ HSK3.",
        stimulus: {
          kind: "hanzi-text",
          text: candidate.item.prompt,
          officialVocabularyId: candidate.item.officialVocabularyId,
        },
        ...commonItemState({
          itemId,
          formId,
          sectionId: "vocabulary-objective",
          slot: index + 1,
        }),
        ...rotateOptions(
          candidate.item.options,
          candidate.item.correctAnswer,
          index,
        ),
      };
    })
  );
};

const buildGrammarItems = (candidates) => {
  const selected = sampleEvenly(candidates, 30);
  const answerPool = selected.map(
    (candidate) => candidate.item.correctAnswerHanzi,
  );
  const buckets = splitAlternate(selected);
  return FORM_IDS.flatMap((formId) =>
    buckets[formId].map((candidate, index) => {
      const selectedIndex = selected.indexOf(candidate);
      const itemId = itemIdFor(formId, "grammar", index);
      return {
        itemId,
        sectionId: "grammar-objective",
        skill: "grammar",
        construct: "hsk3-grammar-in-paragraph-completion",
        modality: "visual-selection",
        ...sourceFields(candidate, "grammar-in-paragraph-practice"),
        promptVi:
          "Đọc ngữ cảnh và chọn câu hoàn thành đúng cấu trúc HSK3.",
        stimulus: {
          kind: "hanzi-context",
          text: candidate.item.contextHanzi,
          grammarRowId: candidate.item.grammarRowId,
        },
        ...commonItemState({
          itemId,
          formId,
          sectionId: "grammar-objective",
          slot: index + 1,
        }),
        ...generatedOptions(answerPool, selectedIndex),
      };
    })
  );
};

const buildSpeakingItems = (candidates) => {
  const buckets = splitAlternate(candidates);
  return FORM_IDS.flatMap((formId) =>
    buckets[formId].map((candidate, index) => {
      const itemId = itemIdFor(formId, "speaking", index);
      const sourceTextIds = candidate.item.inputRefs?.map(
        (ref) => ref.textId,
      ) ?? [candidate.item.sourceTextId];
      return {
        itemId,
        sectionId: "speaking-performance",
        skill: "speaking",
        construct: candidate.item.promptKind,
        modality: "reviewed-human-rated-performance-pending",
        ...sourceFields(candidate, "guided-speaking-prompt"),
        promptVi: candidate.item.promptVi,
        stimulus: {
          audio: null,
          audioRequirement: "reviewed-human-or-licensed-recording",
          sourceTextIds,
          sourceTranscriptVisible: false,
          authoringPreview: "synthetic-browser-voice",
        },
        responseConstraints: {
          minimumSentences: candidate.item.minimumSpokenSentences ?? 4,
          minimumEvidenceSources: sourceTextIds.length,
          limitOrCounterpointRequired:
            candidate.item.limitOrCounterpointRequired ?? false,
          preparationSeconds: null,
          responseSeconds: null,
          sourceTranscriptVisible: false,
          modelResponseVisible: false,
        },
        rubricDraft: {
          state: "pending-review-and-calibration",
          dimensions: [
            "task-completion",
            "source-evidence-accuracy",
            "coherence-and-linking",
            "language-control",
            "intelligibility",
          ],
          scale: null,
          passingStandard: null,
        },
        ...commonItemState({
          itemId,
          formId,
          sectionId: "speaking-performance",
          slot: index + 1,
        }),
      };
    })
  );
};

const buildWritingItems = (sources) => {
  const selectedCohesion = sampleEvenly(sources.cohesionWriting, 16);
  const candidates = [
    ...selectedCohesion,
    ...sources.guidedWriting,
  ];
  const buckets = splitAlternate(candidates);
  return FORM_IDS.flatMap((formId) =>
    buckets[formId].map((candidate, index) => {
      const itemId = itemIdFor(formId, "writing", index);
      const sourceTextIds = candidate.item.inputRefs?.map(
        (ref) => ref.textId,
      ) ?? [candidate.item.sourceTextId];
      const guidedParagraph =
        candidate.sourcePackId === sources.guidedParagraphBundle.pack.packId;
      return {
        itemId,
        sectionId: "writing-performance",
        skill: "writing",
        construct: candidate.item.promptKind,
        modality: "reviewed-human-rated-performance-pending",
        ...sourceFields(candidate, "guided-writing-prompt"),
        promptVi: candidate.item.promptVi,
        sourceTextIds,
        responseConstraints: {
          minimumSentences: guidedParagraph
            ? candidate.item.minimumSentenceCount
            : 4,
          maximumSentences: 8,
          minimumEvidenceSources: sourceTextIds.length,
          sourceTextVisible: true,
          modelResponseVisible: false,
        },
        rubricDraft: {
          state: "pending-review-and-calibration",
          dimensions: [
            "task-completion",
            "source-evidence-accuracy",
            "coherence-and-linking",
            "grammar-and-vocabulary-control",
            "character-accuracy",
          ],
          scale: null,
          passingStandard: null,
        },
        ...commonItemState({
          itemId,
          formId,
          sectionId: "writing-performance",
          slot: index + 1,
        }),
      };
    })
  );
};

const buildReviewBatches = (items) =>
  FORM_IDS.flatMap((formId) =>
    [...OBJECTIVE_SECTIONS, ...PERFORMANCE_SECTIONS].map((sectionId) => {
      const batchItems = items.filter(
        (item) =>
          item.formId === formId && item.sectionId === sectionId,
      );
      const roles = [
        "native-mandarin-reviewer",
        "vietnamese-editor",
        "assessment-editor",
      ];
      if (
        sectionId === "listening-objective"
        || sectionId === "speaking-performance"
      ) {
        roles.push("audio-rights-reviewer");
      }
      if (sectionId === "speaking-performance") {
        roles.push("speaking-pedagogy-reviewer");
      }
      if (sectionId === "writing-performance") {
        roles.push("writing-pedagogy-reviewer");
      }
      return {
        batchId: `${BANK_ID}:${formId}:${sectionId}:review-v1`,
        formId,
        sectionId,
        itemIds: batchItems.map((item) => item.itemId),
        requiredRoles: roles,
        reviewedAudioRequired:
          sectionId === "listening-objective"
          || sectionId === "speaking-performance",
        reviewedRubricRequired:
          PERFORMANCE_SECTIONS.includes(sectionId),
        state: "pending",
        approvals: [],
      };
    })
  );

export const buildHsk3LevelAssessment = (root = process.cwd()) => {
  const sourceBundle = loadHsk3StructuredExplanationPackBundle(root);
  assertValidHsk3StructuredExplanationPackBundle(sourceBundle);
  const sources = collectHsk3AssessmentSources(sourceBundle);
  const objectiveItems = [
    ...buildParagraphObjectiveItems({
      sectionId: "listening-objective",
      skill: "listening",
      modality: "recorded-paragraph-selection-pending",
      entityType: "paragraph-listening-comprehension",
      candidates: sources.listeningComprehension,
      promptVi: "Nghe đoạn tám dòng và chọn ý chính phù hợp nhất.",
    }),
    ...buildParagraphObjectiveItems({
      sectionId: "reading-objective",
      skill: "reading",
      modality: "visual-selection",
      entityType: "paragraph-reading-comprehension",
      candidates: sources.readingComprehension,
      promptVi: "Đọc đoạn tám dòng và chọn ý chính phù hợp nhất.",
    }),
    ...buildVocabularyItems(sources.vocabulary),
    ...buildGrammarItems(sources.grammar),
  ];
  const speakingItems = buildSpeakingItems(sources.speaking);
  const writingItems = buildWritingItems(sources);
  const items = [...objectiveItems, ...speakingItems, ...writingItems];
  const reviewBatches = buildReviewBatches(items);
  const forms = FORM_IDS.map((formId) => {
    const formItems = items.filter((item) => item.formId === formId);
    return {
      formId,
      state: "planned-source-exposed-draft",
      learnerVisible: false,
      eligibleForIssuance: false,
      timeLimitMinutes: null,
      passingStandard: null,
      answerKeyServerConfidentialRequired: true,
      sourceEntityOverlapWithOtherForm: 0,
      sections: [...OBJECTIVE_SECTIONS, ...PERFORMANCE_SECTIONS].map(
        (sectionId) => {
          const sectionItems = formItems.filter(
            (item) => item.sectionId === sectionId,
          );
          return {
            sectionId,
            skill: sectionItems[0]?.skill,
            itemIds: sectionItems.map((item) => item.itemId),
            itemCount: sectionItems.length,
          };
        },
      ),
      itemCount: formItems.length,
    };
  });
  return {
    schemaVersion: 1,
    bankId: BANK_ID,
    level: 3,
    state: "uncalibrated-source-exposed-draft",
    learnerVisible: false,
    runtimeImportEligible: false,
    releaseEligible: false,
    source: {
      sourceTipPackId: sourceBundle.pack.packId,
      sourceTipPackSha256: fileSha256(sourceBundle.packPath),
    },
    authorship: {
      method: "deterministic-source-bound-ai-assisted-assessment-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      assessmentEditor: null,
      speakingPedagogyReviewer: null,
      writingPedagogyReviewer: null,
      audioRightsReviewer: null,
    },
    policy: {
      oneSkillPerItem: true,
      reviewedAudioRequiredForListeningAndSpeaking: true,
      reviewedRubricRequiredForSpeakingAndWriting: true,
      independentNonoverlappingFormsRequiredBeforeCalibration: true,
      repositorySourceExposureBlocksIssuance: true,
      answersMustBeServerConfidentialBeforeIssuance: true,
      humanReviewDoesNotCalibrate: true,
      calibrationRequiredForMeasurement: true,
      noRuntimeImportBeforeAllGates: true,
      assessmentCannotBackfillPracticeMastery: true,
    },
    calibration: {
      required: true,
      pilotSampleSize: 0,
      reliabilityEstimate: null,
      sectionReliabilityEstimates: null,
      cutScore: null,
      sectionMinimums: null,
    },
    counts: {
      forms: forms.length,
      itemsPerForm: forms[0].itemCount,
      totalItems: items.length,
      objectiveItems: objectiveItems.length,
      constructedResponseItems: speakingItems.length + writingItems.length,
      listeningItems: items.filter(
        (item) => item.sectionId === "listening-objective",
      ).length,
      readingItems: items.filter(
        (item) => item.sectionId === "reading-objective",
      ).length,
      vocabularyItems: items.filter(
        (item) => item.sectionId === "vocabulary-objective",
      ).length,
      grammarItems: items.filter(
        (item) => item.sectionId === "grammar-objective",
      ).length,
      speakingItems: speakingItems.length,
      writingItems: writingItems.length,
      audioDependentItems: items.filter(
        (item) =>
          item.sectionId === "listening-objective"
          || item.sectionId === "speaking-performance",
      ).length,
      reviewedAudioItems: 0,
      sourceEntityOverlapBetweenForms: 0,
      reviewBatches: reviewBatches.length,
      reviewedItems: 0,
      calibratedItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      prerequisiteWaiverEligibleItems: 0,
      releaseEligibleItems: 0,
    },
    coverageClaims: {
      objectiveFormPairDraftComplete: true,
      paragraphListeningSourceCoverage: "24/25",
      paragraphReadingSourceCoverage: "24/25",
      vocabularyObjectiveSampleCoverage: "30/500",
      grammarObjectiveSampleCoverage: "30/96",
      guidedSpeakingPoolDraftCoverage: "32/32",
      guidedWritingPoolDraftCoverage: "32/36",
      allLearningSourcePartitionsComplete: true,
      independentFormsPlanned: true,
      independentAssessmentFormsComplete: false,
      reviewedAssessmentComplete: false,
      reviewedAudioComplete: false,
      calibratedAssessmentComplete: false,
      hsk3LevelCheckComplete: false,
      hsk3Complete: false,
    },
    forms,
    items,
    reviewBatches,
  };
};

export const serializeHsk3LevelAssessment = (bank) =>
  `${JSON.stringify(bank, null, 2)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK3_LEVEL_ASSESSMENT_RELATIVE_PATH,
  );
  const serialized = serializeHsk3LevelAssessment(
    buildHsk3LevelAssessment(),
  );
  if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK3 level assessment is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK3_LEVEL_ASSESSMENT_RELATIVE_PATH,
    mode: process.argv.includes("--check") ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
