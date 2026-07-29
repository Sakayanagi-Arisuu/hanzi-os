import {
  assertValidHsk3LessonBlueprintsBundle,
  loadHsk3LessonBlueprintsBundle,
} from "../../src/content/hsk3LessonBlueprints.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const pickDistinct = (lexemes, index, field) => {
  const target = lexemes[index][field];
  const values = [];
  for (
    let offset = 1;
    offset < lexemes.length * 2 && values.length < 3;
    offset += 1
  ) {
    const candidate = lexemes[(index + offset) % lexemes.length][field];
    if (candidate !== target && !values.includes(candidate)) {
      values.push(candidate);
    }
  }
  if (values.length !== 3) {
    throw new Error(`Missing ${field} distractors`);
  }
  return values;
};

const makePracticeState = () => ({
  review: "pending",
  releaseEligible: false,
  measurementEligible: false,
  masteryEligible: false,
});

export const buildHsk3ParagraphDomainPack = ({
  root = process.cwd(),
  packId,
  domainId,
  lessonIds,
  vietnameseGlossBySequence,
  content,
  prerequisitePackBundles,
  completedParagraphDomainCount,
  completedParagraphLessons,
}) => {
  const blueprintBundle = loadHsk3LessonBlueprintsBundle(root);
  assertValidHsk3LessonBlueprintsBundle(blueprintBundle);
  const vocabularyById = new Map(
    blueprintBundle.vocabularyBundle.draft.entries.map((entry) => [
      entry.officialId,
      entry,
    ]),
  );
  const lessonPacks = lessonIds.map((lessonId) => {
    const blueprint = blueprintBundle.pack.lessons.find(
      (candidate) => candidate.lessonId === lessonId,
    );
    const lessonContent = content[lessonId];
    if (!blueprint || !lessonContent) {
      throw new Error(`${lessonId} input is missing`);
    }
    const lexemes = blueprint.inventoryMappings.vocabularyIds.map(
      (officialId) => {
        const source = vocabularyById.get(officialId);
        const gloss = vietnameseGlossBySequence[source?.sequence];
        if (!source || !gloss) {
          throw new Error(
            `${officialId} source or Vietnamese gloss is missing`,
          );
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
      },
    );
    const texts = lessonContent.texts.map((sourceText, textIndex) => {
      const suffix = sourceText.kind === "graded-reading"
        ? "reading-01"
        : "listening-01";
      const textId = `${lessonId}:${suffix}`;
      return {
        textId,
        kind: sourceText.kind,
        titleHanzi: sourceText.titleHanzi,
        titleVi: sourceText.titleVi,
        audio: null,
        lines: sourceText.lines.map(([hanzi, pinyin, vietnamese], index) => ({
          lineId: `${textIndex === 0 ? "r" : "l"}${String(index + 1).padStart(2, "0")}`,
          hanzi,
          pinyin,
          vietnamese,
        })),
      };
    });
    const combinedHanzi = texts.flatMap((text) =>
      text.lines.map((line) => line.hanzi)
    ).join("");
    for (const lexeme of lexemes) {
      if (!combinedHanzi.includes(lexeme.simplified)) {
        throw new Error(`${lessonId} text misses ${lexeme.officialId}`);
      }
    }
    const vocabularyPracticeItems = lexemes.flatMap((lexeme, index) => {
      const pinyin = pickDistinct(lexemes, index, "pinyin");
      const hanzi = pickDistinct(lexemes, index, "simplified");
      const gloss = pickDistinct(lexemes, index, "vietnameseGlossDraft");
      const common = {
        lessonId,
        officialVocabularyId: lexeme.officialId,
        ...makePracticeState(),
        scoringPolicy: "automatic-draft-only",
      };
      return [
        {
          ...common,
          itemId: `${lessonId}:${lexeme.officialId}:meaning`,
          kind: "meaning-selection",
          prompt: lexeme.simplified,
          options: [gloss[0], lexeme.vietnameseGlossDraft, gloss[1], gloss[2]],
          correctAnswer: lexeme.vietnameseGlossDraft,
        },
        {
          ...common,
          itemId: `${lessonId}:${lexeme.officialId}:pinyin`,
          kind: "pinyin-recognition",
          prompt: lexeme.simplified,
          options: [pinyin[0], lexeme.pinyin, pinyin[1], pinyin[2]],
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
          options: [hanzi[0], lexeme.simplified, hanzi[1], hanzi[2]],
          correctAnswer: lexeme.simplified,
        },
      ];
    });
    const comprehensionItems = lessonContent.texts.flatMap(
      (sourceText, textIndex) => {
        const text = texts[textIndex];
        const skill = text.kind === "graded-reading" ? "reading" : "listening";
        return sourceText.questions.map(
          (
            [kind, promptVi, optionsVi, correctOptionIndex, rationaleVi],
            index,
          ) => ({
            itemId: `${text.textId}:q${String(index + 1).padStart(2, "0")}`,
            lessonId,
            textId: text.textId,
            kind,
            skill,
            promptVi,
            optionsVi,
            correctOptionIndex,
            rationaleVi,
            audio: skill === "listening" ? null : undefined,
            ttsDisclosure:
              skill === "listening" ? "synthetic-browser-voice" : undefined,
            ...makePracticeState(),
            scoringPolicy: "source-exposed-practice-only",
          }),
        );
      },
    );
    const noteGrids = lessonContent.texts.map((sourceText, textIndex) => {
      const text = texts[textIndex];
      const skill = text.kind === "graded-reading" ? "reading" : "listening";
      return {
        itemId: `${text.textId}:note-grid`,
        lessonId,
        textId: text.textId,
        skill,
        promptVi: skill === "reading"
          ? "Điền bốn ô ghi chú trước khi tóm tắt đoạn đọc."
          : "Nghe và điền bốn ô theo diễn biến sự việc.",
        fields: sourceText.noteFields.map(([key, labelVi, modelVi]) => ({
          key,
          labelVi,
          modelVi,
        })),
        audio: skill === "listening" ? null : undefined,
        ttsDisclosure:
          skill === "listening" ? "synthetic-browser-voice" : undefined,
        responseMode: "learner-notes-with-model-reveal",
        ...makePracticeState(),
        scoringPolicy: "source-exposed-practice-only",
      };
    });
    const guidedSummaries = lessonContent.texts.map(
      (sourceText, textIndex) => ({
        itemId: `${texts[textIndex].textId}:summary`,
        lessonId,
        textId: texts[textIndex].textId,
        ...sourceText.summary,
        responseMode: "self-record-or-write-with-model-reveal",
        reviewedRubric: null,
        ...makePracticeState(),
        scoringPolicy: "source-exposed-practice-only",
      }),
    );
    const practiceItemIds = [
      ...vocabularyPracticeItems,
      ...comprehensionItems,
      ...noteGrids,
      ...guidedSummaries,
    ].map((item) => item.itemId);
    return {
      lessonId,
      blueprintTitleVi: blueprint.titleVi,
      lexemes,
      texts,
      vocabularyPracticeItems,
      comprehensionItems,
      noteGrids,
      guidedSummaries,
      reviewBatch: {
        batchId: `${lessonId}:content-review-v1`,
        lessonId,
        lexemeIds: lexemes.map((lexeme) => lexeme.officialId),
        textIds: texts.map((text) => text.textId),
        practiceItemIds,
        requiredRoles: [
          "native-mandarin-reviewer",
          "vietnamese-editor",
          "assessment-editor",
          "audio-rights-reviewer",
        ],
        state: "pending",
        approvals: [],
      },
    };
  });
  const all = (field) => lessonPacks.flatMap((lesson) => lesson[field]);
  const vocabularyItems = all("vocabularyPracticeItems");
  const comprehensionItems = all("comprehensionItems");
  const noteGrids = all("noteGrids");
  const guidedSummaries = all("guidedSummaries");
  const authoredPracticeItems =
    vocabularyItems.length + comprehensionItems.length
    + noteGrids.length + guidedSummaries.length;
  const audioDependentItems =
    vocabularyItems.filter((item) => item.kind === "listening-selection").length
    + comprehensionItems.filter((item) => item.skill === "listening").length
    + noteGrids.filter((item) => item.skill === "listening").length
    + guidedSummaries.filter((item) => item.skill === "speaking").length;
  return {
    schemaVersion: 1,
    packId,
    level: 3,
    domainId,
    state: "ai-assisted-content-draft",
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
      method: "ai-assisted-paragraph-and-practice-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      assessmentEditor: null,
      audioRightsReviewer: null,
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
      domainLessonDraftsComplete: true,
      completedParagraphDomainCount,
      completedParagraphLessons,
      reviewedContentComplete: false,
      assessmentCoverageComplete: false,
      hsk3Complete: false,
    },
    counts: {
      lessons: lessonPacks.length,
      completedParagraphDomainCount,
      completedParagraphLessons,
      vocabularyDrafts: all("lexemes").length,
      authoredTexts: all("texts").length,
      authoredTextLines: all("texts").flatMap((text) => text.lines).length,
      vocabularyPracticeItems: vocabularyItems.length,
      comprehensionItems: comprehensionItems.length,
      readingComprehensionItems: comprehensionItems.filter(
        (item) => item.skill === "reading",
      ).length,
      listeningComprehensionItems: comprehensionItems.filter(
        (item) => item.skill === "listening",
      ).length,
      noteGridItems: noteGrids.length,
      guidedSummaryItems: guidedSummaries.length,
      authoredPracticeItems,
      audioDependentItems,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: lessonPacks.length,
      approvals: 0,
      releaseEligibleItems: 0,
    },
    lessons: lessonPacks,
    reviewBatches: lessonPacks.map((lesson) => lesson.reviewBatch),
  };
};
