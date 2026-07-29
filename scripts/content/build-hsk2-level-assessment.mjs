import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk2VocabularyPracticeBundle,
  loadHsk2VocabularyPracticeBundle,
} from "../../src/content/hsk2VocabularyPractice.mjs";
import {
  assertValidHsk2GrammarContextBundle,
  loadHsk2GrammarContextBundle,
} from "../../src/content/hsk2GrammarContext.mjs";
import {
  assertValidHsk2SituationalDialoguesBundle,
  loadHsk2SituationalDialoguesBundle,
} from "../../src/content/hsk2SituationalDialogues.mjs";
import {
  assertValidHsk2ShortTextProductionBundle,
  loadHsk2ShortTextProductionBundle,
} from "../../src/content/hsk2ShortTextProduction.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK2_LEVEL_ASSESSMENT_RELATIVE_PATH =
  "content/drafts/hsk2-level-assessment-2026.07.json";

const BANK_ID = "hsk2-level-assessment-2026.07";
const FORM_IDS = ["hsk2-level-form-a", "hsk2-level-form-b"];
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

const objectiveOptions = (answerPool, correctIndex) => {
  const correct = answerPool[correctIndex];
  const distractors = [];
  for (let offset = 1; distractors.length < 3; offset += 1) {
    const candidate = answerPool[(correctIndex + offset) % answerPool.length];
    if (candidate !== correct && !distractors.includes(candidate)) {
      distractors.push(candidate);
    }
  }
  const raw = [correct, ...distractors];
  const shift = correctIndex % OPTION_IDS.length;
  const texts = [...raw.slice(shift), ...raw.slice(0, shift)];
  const options = texts.map((text, index) => ({
    optionId: OPTION_IDS[index],
    text,
  }));
  return {
    options,
    correctOptionId: options.find((option) => option.text === correct).optionId,
  };
};

const commonItemState = ({
  itemId,
  formId,
  sectionId,
  slot,
}) => ({
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

const buildObjectiveSection = ({
  sectionId,
  skill,
  construct,
  modality,
  candidates,
  promptVi,
  stimulusFor,
}) => {
  const selected = sampleEvenly(candidates, 30);
  const answerPool = selected.map((candidate) => candidate.answerVi);
  const buckets = splitAlternate(selected);
  return FORM_IDS.flatMap((formId) =>
    buckets[formId].map((candidate, index) => {
      const selectedIndex = selected.indexOf(candidate);
      const itemId = [
        "hsk2-level-check",
        formId.endsWith("-a") ? "form-a" : "form-b",
        sectionId.replace("-objective", ""),
        String(index + 1).padStart(2, "0"),
      ].join(":");
      return {
        itemId,
        sectionId,
        skill,
        construct,
        modality,
        source: candidate.source,
        sourceEntityKey: candidate.sourceEntityKey,
        promptVi,
        stimulus: stimulusFor(candidate),
        ...commonItemState({
          itemId,
          formId,
          sectionId,
          slot: index + 1,
        }),
        ...objectiveOptions(answerPool, selectedIndex),
      };
    })
  );
};

const buildSpeakingItems = (situationalBundle) => {
  const candidates = situationalBundle.pack.lessonDialogues;
  const buckets = splitAlternate(candidates);
  return FORM_IDS.flatMap((formId) =>
    buckets[formId].map((dialogue, index) => {
      const itemId = [
        "hsk2-level-check",
        formId.endsWith("-a") ? "form-a" : "form-b",
        "speaking",
        String(index + 1).padStart(2, "0"),
      ].join(":");
      return {
        itemId,
        sectionId: "speaking-performance",
        skill: "speaking",
        construct: "six-turn-situational-interaction",
        modality: "reviewed-human-rated-performance-pending",
        source: {
          artifactId: situationalBundle.pack.packId,
          entityType: "situational-dialogue-lesson",
          entityId: dialogue.lessonId,
          lessonId: dialogue.lessonId,
          officialTaskIds: dialogue.officialTaskIds,
          officialTopicIds: dialogue.officialTopicIds,
        },
        sourceEntityKey:
          `${situationalBundle.pack.packId}:${dialogue.lessonId}`,
        promptVi: dialogue.taskInstructionVi,
        responseConstraints: {
          minimumTurns: 6,
          followUpRequired: true,
          confirmationRequired: true,
          preparationSeconds: null,
          responseSeconds: null,
        },
        rubricDraft: {
          state: "pending-review-and-calibration",
          dimensions: [
            "task-completion",
            "interaction-and-follow-up",
            "intelligibility",
            "language-control",
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

const buildWritingItems = (productionBundle) => {
  const candidates = productionBundle.pack.lessons.flatMap((lesson) =>
    lesson.prompts
      .filter((item) =>
        item.kind === "three-sentence-guided-message"
        || item.kind === "guided-picture-description"
      )
      .map((item) => ({ lesson, item }))
  );
  const formBuckets = {
    [FORM_IDS[0]]: [],
    [FORM_IDS[1]]: [],
  };
  for (const lesson of productionBundle.pack.lessons.filter((item) =>
    item.trackId === "hsk2-guided-message"
    || item.trackId === "hsk2-picture-description"
  )) {
    const prompts = candidates.filter(
      (candidate) => candidate.lesson.lessonId === lesson.lessonId,
    );
    formBuckets[FORM_IDS[0]].push(...prompts.slice(0, 4));
    formBuckets[FORM_IDS[1]].push(...prompts.slice(4, 8));
  }
  return FORM_IDS.flatMap((formId) =>
    formBuckets[formId].map(({ lesson, item }, index) => {
      const itemId = [
        "hsk2-level-check",
        formId.endsWith("-a") ? "form-a" : "form-b",
        "writing",
        String(index + 1).padStart(2, "0"),
      ].join(":");
      return {
        itemId,
        sectionId: "writing-performance",
        skill: "writing",
        construct: item.kind === "three-sentence-guided-message"
          ? "three-sentence-functional-message"
          : "three-sentence-scene-description",
        modality: "reviewed-human-rated-performance-pending",
        source: {
          artifactId: productionBundle.pack.packId,
          entityType: "short-text-production-prompt",
          entityId: item.itemId,
          lessonId: lesson.lessonId,
          sourceKind: item.kind,
        },
        sourceEntityKey:
          `${productionBundle.pack.packId}:${item.itemId}`,
        promptVi: item.instructionVi,
        situationVi: item.situationVi,
        requiredElementsVi: item.requiredElementsVi,
        responseConstraints: {
          minimumSentences: 3,
          maximumSentences: 5,
          languageSupportVisible: false,
          modelResponseVisible: false,
        },
        rubricDraft: {
          state: "pending-review-and-calibration",
          dimensions: [
            "task-completion",
            "coherence",
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
        (item) => item.formId === formId && item.sectionId === sectionId,
      );
      const roles = [
        "native-mandarin-reviewer",
        "vietnamese-editor",
        "assessment-editor",
      ];
      if (sectionId === "listening-objective") {
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
        reviewedAudioRequired: sectionId === "listening-objective",
        reviewedRubricRequired: PERFORMANCE_SECTIONS.includes(sectionId),
        state: "pending",
        approvals: [],
      };
    })
  );

export const buildHsk2LevelAssessment = (root = process.cwd()) => {
  const vocabularyBundle = loadHsk2VocabularyPracticeBundle(root);
  assertValidHsk2VocabularyPracticeBundle(vocabularyBundle);
  const grammarBundle = loadHsk2GrammarContextBundle(root);
  assertValidHsk2GrammarContextBundle(grammarBundle);
  const situationalBundle = loadHsk2SituationalDialoguesBundle(root);
  assertValidHsk2SituationalDialoguesBundle(situationalBundle);
  const productionBundle = loadHsk2ShortTextProductionBundle(root);
  assertValidHsk2ShortTextProductionBundle(productionBundle);

  const listeningCandidates =
    situationalBundle.pack.lessonDialogues.flatMap((dialogue) =>
      Array.from({ length: 3 }, (_, pairIndex) => {
        const turns = dialogue.modelDialogue.turns.slice(
          pairIndex * 2,
          pairIndex * 2 + 2,
        );
        return {
          sourceEntityKey:
            `${situationalBundle.pack.packId}:${dialogue.lessonId}:turns-${pairIndex * 2}-${pairIndex * 2 + 1}`,
          source: {
            artifactId: situationalBundle.pack.packId,
            entityType: "dialogue-turn-pair",
            entityId: dialogue.lessonId,
            lessonId: dialogue.lessonId,
            turnIndexes: [pairIndex * 2, pairIndex * 2 + 1],
          },
          transcriptHanzi: turns.map((turn) =>
            `${turn.speaker}：${turn.hanzi}`
          ).join(" "),
          transcriptPinyin: turns.map((turn) =>
            `${turn.speaker}: ${turn.pinyin}`
          ).join(" "),
          answerVi: turns.map((turn) => turn.meaningVi).join(" "),
        };
      })
    );
  const readingCandidates = productionBundle.pack.lessons.flatMap((lesson) =>
    lesson.prompts
      .filter((item) =>
        item.kind === "three-sentence-guided-message"
        || item.kind === "guided-picture-description"
      )
      .map((item) => ({
        sourceEntityKey:
          `${productionBundle.pack.packId}:${item.itemId}:model-response`,
        source: {
          artifactId: productionBundle.pack.packId,
          entityType: "short-text-model-response",
          entityId: item.itemId,
          lessonId: lesson.lessonId,
        },
        textHanzi: item.modelResponse.sentences.map(
          (sentence) => sentence.hanzi,
        ).join(""),
        pinyinReference: item.modelResponse.sentences.map(
          (sentence) => sentence.pinyin,
        ).join(" "),
        answerVi: item.modelResponse.sentences.map(
          (sentence) => sentence.meaningVi,
        ).join(" "),
      }))
  );
  const vocabularyCandidates = vocabularyBundle.pack.lexemes.map((lexeme) => ({
    sourceEntityKey:
      `${vocabularyBundle.pack.packId}:${lexeme.officialId}`,
    source: {
      artifactId: vocabularyBundle.pack.packId,
      entityType: "vocabulary-draft",
      entityId: lexeme.officialId,
      lessonId: lexeme.lessonId,
    },
    simplified: lexeme.simplified,
    pinyinReference: lexeme.pinyin,
    answerVi: lexeme.vietnameseGlossDraft,
  }));
  const grammarCandidates = grammarBundle.pack.grammarDrafts.map((draft) => ({
    sourceEntityKey:
      `${grammarBundle.pack.packId}:${draft.officialGrammarRowId}`,
    source: {
      artifactId: grammarBundle.pack.packId,
      entityType: "grammar-model-example",
      entityId: draft.officialGrammarRowId,
      lessonId: draft.lessonId,
    },
    textHanzi: draft.modelExample.hanzi,
    pinyinReference: draft.modelExample.pinyin,
    officialGrammarContentAuthoringReference: draft.officialContent,
    answerVi: draft.modelExample.meaningVi,
  }));

  const objectiveItems = [
    ...buildObjectiveSection({
      sectionId: "listening-objective",
      skill: "listening",
      construct: "two-turn-meaning-recognition",
      modality: "recorded-audio-selection-pending",
      candidates: listeningCandidates,
      promptVi: "Nghe đoạn hội thoại hai lượt và chọn nghĩa phù hợp nhất.",
      stimulusFor: (candidate) => ({
        audio: null,
        audioRequirement: "reviewed-human-or-licensed-recording",
        authoringPreview: "synthetic-browser-voice",
        transcriptHanzi: candidate.transcriptHanzi,
        transcriptPinyin: candidate.transcriptPinyin,
        transcriptReview: "pending",
      }),
    }),
    ...buildObjectiveSection({
      sectionId: "reading-objective",
      skill: "reading",
      construct: "three-sentence-text-meaning-recognition",
      modality: "visual-selection",
      candidates: readingCandidates,
      promptVi: "Đọc đoạn ba câu và chọn phần tóm nghĩa phù hợp nhất.",
      stimulusFor: (candidate) => ({
        kind: "hanzi-short-text",
        text: candidate.textHanzi,
        pinyinAuthoringReference: candidate.pinyinReference,
      }),
    }),
    ...buildObjectiveSection({
      sectionId: "vocabulary-objective",
      skill: "vocabulary",
      construct: "word-meaning-recognition",
      modality: "visual-selection",
      candidates: vocabularyCandidates,
      promptVi: "Chọn nghĩa phù hợp nhất của từ.",
      stimulusFor: (candidate) => ({
        kind: "hanzi-text",
        text: candidate.simplified,
        pinyinAuthoringReference: candidate.pinyinReference,
      }),
    }),
    ...buildObjectiveSection({
      sectionId: "grammar-objective",
      skill: "grammar",
      construct: "grammar-in-context-meaning-recognition",
      modality: "visual-selection",
      candidates: grammarCandidates,
      promptVi: "Đọc câu và chọn nghĩa thể hiện đúng cấu trúc.",
      stimulusFor: (candidate) => ({
        kind: "hanzi-text",
        text: candidate.textHanzi,
        pinyinAuthoringReference: candidate.pinyinReference,
        officialGrammarContentAuthoringReference:
          candidate.officialGrammarContentAuthoringReference,
      }),
    }),
  ];
  const speakingItems = buildSpeakingItems(situationalBundle);
  const writingItems = buildWritingItems(productionBundle);
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
    level: 2,
    state: "uncalibrated-source-exposed-draft",
    learnerVisible: false,
    runtimeImportEligible: false,
    releaseEligible: false,
    source: {
      vocabularyPracticePackId: vocabularyBundle.pack.packId,
      vocabularyPracticePackSha256: fileSha256(vocabularyBundle.packPath),
      grammarContextPackId: grammarBundle.pack.packId,
      grammarContextPackSha256: fileSha256(grammarBundle.packPath),
      situationalDialoguePackId: situationalBundle.pack.packId,
      situationalDialoguePackSha256: fileSha256(
        situationalBundle.packPath,
      ),
      shortTextProductionPackId: productionBundle.pack.packId,
      shortTextProductionPackSha256: fileSha256(
        productionBundle.packPath,
      ),
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
      reviewedAudioRequiredForScoredListening: true,
      reviewedRubricRequiredForSpeakingAndWriting: true,
      independentNonoverlappingFormsRequiredBeforeCalibration: true,
      repositorySourceExposureBlocksIssuance: true,
      answersMustBeServerConfidentialBeforeIssuance: true,
      humanReviewDoesNotCalibrate: true,
      calibrationRequiredForMeasurement: true,
      noRuntimeImportBeforeAllGates: true,
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
        (item) => item.sectionId === "listening-objective",
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
      speakingScenarioPoolDraftCoverage: "20/20",
      officialTaskPoolDraftCoverage: "17/17",
      officialTopicPoolDraftCoverage: "34/34",
      guidedWritingPoolDraftCoverage: "32/32",
      vocabularyObjectiveSampleCoverage: "30/200",
      grammarObjectiveSampleCoverage: "30/75",
      independentFormsPlanned: true,
      independentAssessmentFormsComplete: false,
      reviewedAssessmentComplete: false,
      reviewedAudioComplete: false,
      calibratedAssessmentComplete: false,
      hsk2LevelCheckComplete: false,
    },
    forms,
    items,
    reviewBatches,
  };
};

export const serializeHsk2LevelAssessment = (bank) =>
  `${JSON.stringify(bank, null, 2)}\n`;

const main = () => {
  const outputPath = join(
    process.cwd(),
    HSK2_LEVEL_ASSESSMENT_RELATIVE_PATH,
  );
  const serialized = serializeHsk2LevelAssessment(
    buildHsk2LevelAssessment(),
  );
  if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK2 level assessment is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK2_LEVEL_ASSESSMENT_RELATIVE_PATH,
    mode: process.argv.includes("--check") ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
