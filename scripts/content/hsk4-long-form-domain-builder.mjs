import {
  assertValidHsk4LessonBlueprintsBundle,
  loadHsk4LessonBlueprintsBundle,
} from "../../src/content/hsk4LessonBlueprints.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
  "audio-rights-reviewer",
];

const failClosedState = () => ({
  review: "pending",
  releaseEligible: false,
  measurementEligible: false,
  masteryEligible: false,
});

const pickDistinct = (lexemes, index, field) => {
  const answer = lexemes[index][field];
  const distractors = [];
  for (
    let offset = 1;
    offset < lexemes.length * 2 && distractors.length < 3;
    offset += 1
  ) {
    const candidate = lexemes[(index + offset) % lexemes.length][field];
    if (candidate !== answer && !distractors.includes(candidate)) {
      distractors.push(candidate);
    }
  }
  if (distractors.length !== 3) {
    throw new Error(`Missing ${field} distractors`);
  }
  return distractors;
};

export const buildHsk4LongFormDomainPack = ({
  root = process.cwd(),
  packId,
  domainId,
  lessonIds,
  content,
  vietnameseGlossBySequence,
  prerequisitePackBundles = [],
  completedLongFormDomains,
  completedLongFormLessons,
}) => {
  const blueprintBundle = loadHsk4LessonBlueprintsBundle(root);
  assertValidHsk4LessonBlueprintsBundle(blueprintBundle);
  const vocabularyById = new Map(
    blueprintBundle.vocabularyBundle.draft.entries.map((entry) => [
      entry.officialId,
      entry,
    ]),
  );

  const lessons = lessonIds.map((lessonId) => {
    const blueprint = blueprintBundle.pack.lessons.find(
      (candidate) => candidate.lessonId === lessonId,
    );
    const lessonContent = content[lessonId];
    if (
      !blueprint
      || blueprint.trackId !== domainId
      || blueprint.blueprintKind !== "deep-comprehension"
      || !lessonContent
    ) {
      throw new Error(`${lessonId} blueprint or authored content is missing`);
    }

    const allowedVocabularyIds = new Set(
      blueprint.inventoryMappings.vocabularyIds,
    );
    const targetVocabularyIds = [
      ...new Set(
        lessonContent.texts.flatMap((text) => text.targetVocabularyIds),
      ),
    ];
    const targetLexemes = targetVocabularyIds.map((officialId) => {
      const source = vocabularyById.get(officialId);
      const gloss = vietnameseGlossBySequence[source?.sequence];
      if (!source || !allowedVocabularyIds.has(officialId) || !gloss) {
        throw new Error(`${lessonId}:${officialId} target lexeme is invalid`);
      }
      return {
        officialId,
        sequence: source.sequence,
        simplified: source.simplified,
        pinyin: source.officialPinyin,
        officialPartOfSpeech: source.officialPartOfSpeech,
        vietnameseGlossDraft: gloss,
        sourceLineSha256: [
          ...new Set(source.sourceMatches.map(
            (match) => match.sourceLineSha256,
          )),
        ],
        sourceSenseReview: "pending",
        mandarinLinguisticReview: "pending",
        vietnameseEditorialReview: "pending",
      };
    });
    const targetLexemeById = new Map(
      targetLexemes.map((lexeme) => [lexeme.officialId, lexeme]),
    );

    const texts = lessonContent.texts.map((sourceText, textIndex) => {
      const suffix = sourceText.kind === "long-form-reading"
        ? "reading-01"
        : "listening-01";
      const textId = `${lessonId}:${suffix}`;
      const paragraphs = sourceText.paragraphs.map(
        ([hanzi, vietnamese], paragraphIndex) => ({
          paragraphId:
            `${textIndex === 0 ? "r" : "l"}p${paragraphIndex + 1}`,
          hanzi,
          vietnamese,
        }),
      );
      const authoredHanzi = paragraphs.map((item) => item.hanzi).join("");
      for (const officialId of sourceText.targetVocabularyIds) {
        const lexeme = targetLexemeById.get(officialId);
        if (!lexeme || !authoredHanzi.includes(lexeme.simplified)) {
          throw new Error(`${textId} misses ${officialId}`);
        }
      }
      return {
        textId,
        kind: sourceText.kind,
        titleHanzi: sourceText.titleHanzi,
        titleVi: sourceText.titleVi,
        targetVocabularyIds: sourceText.targetVocabularyIds,
        pinyinSupportPolicy: "target-lexeme-on-demand",
        transcriptRevealPolicy:
          sourceText.kind === "long-form-listening"
            ? "after-first-response"
            : "always-visible",
        audio: null,
        paragraphs,
      };
    });

    const vocabularyPracticeItems = targetLexemes.flatMap((lexeme, index) => {
      const glossDistractors = pickDistinct(
        targetLexemes,
        index,
        "vietnameseGlossDraft",
      );
      const pinyinDistractors = pickDistinct(
        targetLexemes,
        index,
        "pinyin",
      );
      const hanziDistractors = pickDistinct(
        targetLexemes,
        index,
        "simplified",
      );
      const common = {
        lessonId,
        officialVocabularyId: lexeme.officialId,
        scoringPolicy: "automatic-draft-only",
        ...failClosedState(),
      };
      return [
        {
          ...common,
          itemId: `${lessonId}:${lexeme.officialId}:meaning`,
          kind: "meaning-selection",
          prompt: lexeme.simplified,
          options: [
            glossDistractors[0],
            lexeme.vietnameseGlossDraft,
            glossDistractors[1],
            glossDistractors[2],
          ],
          correctAnswer: lexeme.vietnameseGlossDraft,
        },
        {
          ...common,
          itemId: `${lessonId}:${lexeme.officialId}:pinyin`,
          kind: "pinyin-recognition",
          prompt: lexeme.simplified,
          options: [
            pinyinDistractors[0],
            lexeme.pinyin,
            pinyinDistractors[1],
            pinyinDistractors[2],
          ],
          correctAnswer: lexeme.pinyin,
        },
        {
          ...common,
          itemId: `${lessonId}:${lexeme.officialId}:listening`,
          kind: "listening-selection",
          prompt: "Chọn từ bạn nghe được.",
          audio: null,
          ttsText: lexeme.simplified,
          ttsDisclosure: "synthetic-browser-voice",
          options: [
            hanziDistractors[0],
            lexeme.simplified,
            hanziDistractors[1],
            hanziDistractors[2],
          ],
          correctAnswer: lexeme.simplified,
        },
      ];
    });

    const comprehensionItems = lessonContent.texts.flatMap(
      (sourceText, textIndex) => {
        const text = texts[textIndex];
        const skill = text.kind === "long-form-reading"
          ? "reading"
          : "listening";
        return sourceText.questions.map((
          [
            kind,
            promptVi,
            optionsVi,
            correctOptionIndex,
            evidenceParagraphIds,
            rationaleVi,
            inferenceBoundaryVi = null,
          ],
          questionIndex,
        ) => ({
          itemId:
            `${text.textId}:q${String(questionIndex + 1).padStart(2, "0")}`,
          lessonId,
          textId: text.textId,
          skill,
          kind,
          promptVi,
          optionsVi,
          correctOptionIndex,
          evidenceParagraphIds,
          rationaleVi,
          inferenceBoundaryVi,
          audio: skill === "listening" ? null : undefined,
          ttsDisclosure:
            skill === "listening" ? "synthetic-browser-voice" : undefined,
          scoringPolicy: "source-exposed-practice-only",
          ...failClosedState(),
        }));
      },
    );

    const noteMaps = lessonContent.texts.map((sourceText, textIndex) => {
      const text = texts[textIndex];
      const skill = text.kind === "long-form-reading"
        ? "reading"
        : "listening";
      return {
        itemId: `${text.textId}:note-map`,
        lessonId,
        textId: text.textId,
        skill,
        promptVi:
          "Lập bản đồ thông tin trước khi trả lời; mỗi nút phải dẫn đoạn nguồn.",
        nodes: sourceText.noteMap.nodes.map(
          ([nodeId, labelVi, modelVi, evidenceParagraphIds]) => ({
            nodeId,
            labelVi,
            modelVi,
            evidenceParagraphIds,
          }),
        ),
        relations: sourceText.noteMap.relations.map(
          ([fromNodeId, relationVi, toNodeId]) => ({
            fromNodeId,
            relationVi,
            toNodeId,
          }),
        ),
        audio: skill === "listening" ? null : undefined,
        ttsDisclosure:
          skill === "listening" ? "synthetic-browser-voice" : undefined,
        responseMode: "learner-evidence-map-with-model-reveal",
        scoringPolicy: "source-exposed-practice-only",
        ...failClosedState(),
      };
    });

    const synthesisPrompt = {
      itemId: `${lessonId}:cross-source-synthesis`,
      lessonId,
      sourceTextIds: texts.map((text) => text.textId),
      skill: "writing",
      promptVi: lessonContent.synthesis.promptVi,
      requiredElements: lessonContent.synthesis.requiredElements,
      evidenceRefs: lessonContent.synthesis.evidenceRefs.map(
        ([textIndex, paragraphId]) => ({
          textId: texts[textIndex].textId,
          paragraphId,
        }),
      ),
      minimumHanzi: 120,
      maximumHanzi: 220,
      modelHanzi: lessonContent.synthesis.modelHanzi,
      modelVi: lessonContent.synthesis.modelVi,
      reviewedRubric: null,
      responseMode: "write-revise-with-source-and-model-reveal",
      scoringPolicy: "source-exposed-practice-only",
      ...failClosedState(),
    };

    const practiceItemIds = [
      ...vocabularyPracticeItems,
      ...comprehensionItems,
      ...noteMaps,
      synthesisPrompt,
    ].map((item) => item.itemId);
    const reviewBatch = {
      batchId: `${lessonId}:long-form-review-v1`,
      lessonId,
      targetLexemeIds: targetLexemes.map((lexeme) => lexeme.officialId),
      textIds: texts.map((text) => text.textId),
      practiceItemIds,
      requiredRoles: REVIEW_ROLES,
      state: "pending",
      approvals: [],
    };
    return {
      lessonId,
      blueprintTitleVi: blueprint.titleVi,
      objectiveVi: blueprint.objectiveVi,
      mappedTopicIds: blueprint.inventoryMappings.topicIds,
      targetLexemes,
      texts,
      vocabularyPracticeItems,
      comprehensionItems,
      noteMaps,
      synthesisPrompt,
      reviewBatch,
    };
  });

  const all = (field) => lessons.flatMap((lesson) => lesson[field]);
  const vocabularyPracticeItems = all("vocabularyPracticeItems");
  const comprehensionItems = all("comprehensionItems");
  const noteMaps = all("noteMaps");
  const synthesisPrompts = lessons.map((lesson) => lesson.synthesisPrompt);
  const authoredPracticeItems =
    vocabularyPracticeItems.length
    + comprehensionItems.length
    + noteMaps.length
    + synthesisPrompts.length;
  const audioDependentItems =
    vocabularyPracticeItems.filter(
      (item) => item.kind === "listening-selection",
    ).length
    + comprehensionItems.filter((item) => item.skill === "listening").length
    + noteMaps.filter((item) => item.skill === "listening").length;

  return {
    schemaVersion: 1,
    packId,
    level: 4,
    domainId,
    state: "ai-assisted-long-form-content-draft",
    learnerVisible: false,
    releaseEligible: false,
    derivedArtifactLicense: "CC-BY-SA-4.0",
    source: {
      lessonBlueprintPackId: blueprintBundle.pack.packId,
      lessonBlueprintPackSha256: fileSha256(blueprintBundle.packPath),
      vocabularyDraftId: blueprintBundle.vocabularyBundle.draft.draftId,
      vocabularyDraftSha256: fileSha256(
        blueprintBundle.vocabularyBundle.draftPath,
      ),
      prerequisitePacks: prerequisitePackBundles.map((bundle) => ({
        packId: bundle.pack.packId,
        sha256: fileSha256(bundle.packPath),
      })),
      attribution:
        "content/sources/cc-cedict-debian-2026-04-03/ATTRIBUTION.md",
    },
    authorship: {
      method: "ai-assisted-long-form-and-evidence-practice-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      assessmentEditor: null,
      audioRightsReviewer: null,
    },
    pedagogyPolicy: {
      multipleParagraphsRequired: true,
      explicitEvidenceRequired: true,
      inferenceBoundaryRequired: true,
      noteMapRequired: true,
      crossSourceSynthesisRequired: true,
      fullTextPinyinShownByDefault: false,
      targetLexemePinyinOnDemand: true,
    },
    audioPolicy: {
      committedAudio: false,
      browserTtsPreviewOnly: true,
      reviewedHumanOrLicensedAudioRequiredForRelease: true,
      browserAsrCanScoreSpeakingMastery: false,
    },
    reviewPolicy: {
      nativeMandarinRequiredForRelease: true,
      vietnameseEditorialRequiredForRelease: true,
      assessmentReviewRequiredForRelease: true,
      audioRightsRequiredWhereAudioDependent: true,
      sourceExposedPracticeCannotCalibrateAssessment: true,
    },
    coverageClaims: {
      domainLongFormLessonDraftsComplete: true,
      completedLongFormDomains,
      completedLongFormLessons,
      fullHsk4VocabularyPracticeComplete: false,
      reviewedContentComplete: false,
      assessmentCoverageComplete: false,
      hsk4Complete: false,
    },
    counts: {
      lessons: lessons.length,
      completedLongFormDomains,
      completedLongFormLessons,
      mappedTopics: all("mappedTopicIds").length,
      targetLexemeContexts: all("targetLexemes").length,
      authoredTexts: all("texts").length,
      authoredParagraphs: all("texts").flatMap(
        (text) => text.paragraphs,
      ).length,
      vocabularyPracticeItems: vocabularyPracticeItems.length,
      comprehensionItems: comprehensionItems.length,
      evidenceBoundComprehensionItems: comprehensionItems.filter(
        (item) => item.evidenceParagraphIds.length > 0,
      ).length,
      inferenceItems: comprehensionItems.filter(
        (item) => item.kind === "bounded-inference",
      ).length,
      noteMapItems: noteMaps.length,
      noteMapNodes: noteMaps.flatMap((item) => item.nodes).length,
      synthesisPrompts: synthesisPrompts.length,
      authoredPracticeItems,
      audioDependentItems,
      reviewedAudioItems: 0,
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

export const serializeHsk4LongFormDomainPack = (pack) =>
  `${JSON.stringify(pack)}\n`;
