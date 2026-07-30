import { createHash } from "node:crypto";
import {
  assertValidHsk4LessonBlueprintsBundle,
  loadHsk4LessonBlueprintsBundle,
} from "../../src/content/hsk4LessonBlueprints.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "grammar-pedagogy-reviewer",
  "assessment-editor",
  "audio-rights-reviewer",
];

const failClosed = () => ({
  review: "pending",
  measurementEligible: false,
  masteryEligible: false,
  releaseEligible: false,
});

const jsonSha256 = (value) =>
  `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;

const collectLongFormBundles = (headBundle) => {
  const bundles = [];
  const visit = (bundle) => {
    for (const prerequisite of bundle.prerequisiteBundles ?? []) {
      visit(prerequisite);
    }
    bundles.push(bundle);
  };
  visit(headBundle);
  return bundles;
};

const makeRubric = (kind) => {
  const dimensionsByKind = {
    summary: [
      ["source-coverage", "Bao quát đúng các ý nguồn bắt buộc"],
      ["factual-accuracy", "Giữ đúng dữ kiện, quan hệ và mức độ chắc chắn"],
      ["compression", "Lược chi tiết mà không đổi phạm vi"],
      ["cohesion", "Tổ chức mạch tóm tắt rõ ràng"],
      ["language-control", "Kiểm soát từ vựng và ngữ pháp HSK4"],
    ],
    argument: [
      ["claim", "Nêu luận điểm có phạm vi rõ"],
      ["evidence", "Dùng và giải thích bằng chứng nguồn"],
      ["counterargument", "Phản hồi ý kiến đối lập công bằng"],
      ["scope-boundary", "Giữ điều kiện và giới hạn kết luận"],
      ["language-control", "Kiểm soát từ vựng và ngữ pháp HSK4"],
    ],
    speaking: [
      ["organization", "Trình bày mở–thân–kết dễ theo dõi"],
      ["evidence", "Dẫn và giải thích bằng chứng nguồn"],
      ["counterpoint", "Phản hồi câu hỏi hoặc ý kiến đối lập"],
      ["intelligibility", "Phát âm và nhịp nói đủ rõ để hiểu"],
      ["language-control", "Kiểm soát từ vựng và ngữ pháp HSK4"],
    ],
  };
  return {
    rubricId: `hsk4-summary-argument-${kind}-rubric-draft-v1`,
    kind,
    reviewStatus: "pending",
    scoringAuthority: "none-before-human-review-and-calibration",
    dimensions: dimensionsByKind[kind].map(([dimensionId, descriptorVi]) => ({
      dimensionId,
      descriptorVi,
      bands: [
        {
          band: "needs-revision",
          descriptorVi: "Thiếu hoặc làm sai yêu cầu cốt lõi; cần sửa theo nguồn.",
        },
        {
          band: "developing",
          descriptorVi: "Đáp ứng một phần nhưng còn thiếu liên kết hoặc giới hạn.",
        },
        {
          band: "controlled",
          descriptorVi: "Đáp ứng rõ, nhất quán và không vượt quá nguồn.",
        },
      ],
    })),
  };
};

const resolveSourceCatalog = (longFormHeadBundle) => {
  const catalog = new Map();
  for (const bundle of collectLongFormBundles(longFormHeadBundle)) {
    for (const lesson of bundle.pack.lessons) {
      for (const text of lesson.texts) {
        catalog.set(text.textId, {
          sourcePackId: bundle.pack.packId,
          sourcePackSha256: fileSha256(bundle.packPath),
          text,
        });
      }
    }
  }
  return catalog;
};

const bindSource = (catalog, sourceTextId) => {
  const source = catalog.get(sourceTextId);
  if (!source) throw new Error(`Unknown HSK4 source text ${sourceTextId}`);
  return {
    sourcePackId: source.sourcePackId,
    sourcePackSha256: source.sourcePackSha256,
    textId: source.text.textId,
    textSha256: jsonSha256(source.text),
    kind: source.text.kind,
    titleHanzi: source.text.titleHanzi,
    titleVi: source.text.titleVi,
    paragraphIds: source.text.paragraphs.map(
      (paragraph) => paragraph.paragraphId,
    ),
    audio: source.text.audio,
    transcriptRevealPolicy: source.text.transcriptRevealPolicy,
  };
};

const makeSourceRefs = (values) => values.map((value) => ({
  textId: value.textId,
  paragraphIds: value.paragraphIds,
}));

export const buildHsk4SummaryArgumentModulePack = ({
  root = process.cwd(),
  config,
  content,
  longFormHeadBundle,
  prerequisitePackBundles = [],
}) => {
  const blueprintBundle = loadHsk4LessonBlueprintsBundle(root);
  assertValidHsk4LessonBlueprintsBundle(blueprintBundle);
  const sourceCatalog = resolveSourceCatalog(longFormHeadBundle);
  const grammarById = new Map(
    blueprintBundle.scopeBundle.graphBundle.syllabus.inventory.grammarRows
      .filter((row) => row.level === 4)
      .map((row) => [row.id, row]),
  );
  const blueprintById = new Map(
    blueprintBundle.pack.lessons.map((lesson) => [
      lesson.lessonId,
      lesson,
    ]),
  );

  const lessons = config.lessonIds.map((lessonId) => {
    const blueprint = blueprintById.get(lessonId);
    const authored = content[lessonId];
    if (
      !blueprint
      || blueprint.trackId !== config.trackId
      || blueprint.blueprintKind !== "summary-argument"
      || !authored
    ) {
      throw new Error(`${lessonId} blueprint or authored content is missing`);
    }
    const sourceBindings = authored.sourceTextIds.map(
      (sourceTextId) => bindSource(sourceCatalog, sourceTextId),
    );
    const sourceById = new Map(
      sourceBindings.map((source) => [source.textId, source]),
    );
    const bindRefs = (refs) => refs.map(({ textId, paragraphIds }) => {
      const source = sourceById.get(textId);
      if (
        !source
        || paragraphIds.some((id) => !source.paragraphIds.includes(id))
      ) {
        throw new Error(`${lessonId} has a stale source reference`);
      }
      return { textId, paragraphIds };
    });
    const grammarTargets = blueprint.inventoryMappings.grammarRowIds.map(
      (grammarRowId) => {
        const source = grammarById.get(grammarRowId);
        const application = authored.grammarApplications[grammarRowId];
        if (!source || !application) {
          throw new Error(`${lessonId}:${grammarRowId} application is missing`);
        }
        return {
          grammarRowId,
          ordinal: source.ordinal,
          category: source.category,
          categoryName: source.categoryName,
          detail: source.detail,
          officialContent: source.content,
          sourcePage: source.sourcePage,
          functionVi: application.functionVi,
          modelHanzi: application.modelHanzi,
          modelVi: application.modelVi,
          scopeBoundaryVi: application.scopeBoundaryVi,
          nativeMandarinReview: "pending",
          vietnameseEditorialReview: "pending",
          grammarPedagogyReview: "pending",
        };
      },
    );
    const grammarPracticeItems = grammarTargets.map((target) => ({
      itemId: `${lessonId}:${target.grammarRowId}:argument-application`,
      lessonId,
      grammarRowId: target.grammarRowId,
      kind: "grammar-in-source-bounded-argument",
      skill: "writing",
      sourceTextIds: sourceBindings.map((source) => source.textId),
      promptVi:
        `Viết một câu dùng mục ngữ pháp “${target.officialContent}” để diễn đạt bằng chứng hoặc giới hạn từ gói nguồn; sau đó đối chiếu câu mẫu.`,
      modelHanzi: target.modelHanzi,
      modelVi: target.modelVi,
      scopeBoundaryVi: target.scopeBoundaryVi,
      responseMode: "write-then-model-reveal",
      scoringPolicy: "source-exposed-practice-only",
      ...failClosed(),
    }));
    const sourceAuditItems = authored.sourceAudits.map((audit, index) => ({
      itemId: `${lessonId}:source-audit-${String(index + 1).padStart(2, "0")}`,
      lessonId,
      kind: "fact-interpretation-source-audit",
      skill: sourceById.get(audit.sourceRef.textId)?.kind
        === "long-form-listening"
        ? "listening"
        : "reading",
      claimHanzi: audit.claimHanzi,
      claimVi: audit.claimVi,
      classification: audit.classification,
      evidenceRefs: bindRefs([audit.sourceRef]),
      rationaleVi: audit.rationaleVi,
      inferenceBoundaryVi: audit.inferenceBoundaryVi,
      audio: sourceById.get(audit.sourceRef.textId)?.kind
        === "long-form-listening"
        ? null
        : undefined,
      ttsDisclosure: sourceById.get(audit.sourceRef.textId)?.kind
        === "long-form-listening"
        ? "synthetic-browser-voice"
        : undefined,
      scoringPolicy: "source-exposed-practice-only",
      ...failClosed(),
    }));
    const paraphraseItems = authored.paraphrases.map((item, index) => ({
      itemId: `${lessonId}:paraphrase-${String(index + 1).padStart(2, "0")}`,
      lessonId,
      kind: "source-bounded-paraphrase",
      skill: sourceById.get(item.sourceRef.textId)?.kind
        === "long-form-listening"
        ? "listening-writing"
        : "reading-writing",
      promptVi: item.promptVi,
      evidenceRefs: bindRefs([item.sourceRef]),
      modelHanzi: item.modelHanzi,
      modelVi: item.modelVi,
      preservedFactsVi: item.preservedFactsVi,
      prohibitedExpansionVi: item.prohibitedExpansionVi,
      transcriptRevealPolicy:
        sourceById.get(item.sourceRef.textId)?.transcriptRevealPolicy,
      audio: sourceById.get(item.sourceRef.textId)?.kind
        === "long-form-listening"
        ? null
        : undefined,
      ttsDisclosure: sourceById.get(item.sourceRef.textId)?.kind
        === "long-form-listening"
        ? "synthetic-browser-voice"
        : undefined,
      responseMode: "write-compare-revise",
      scoringPolicy: "source-exposed-practice-only",
      ...failClosed(),
    }));
    const summaryPrompt = {
      itemId: `${lessonId}:structured-summary`,
      lessonId,
      kind: "cross-source-structured-summary",
      skill: "integrated-listening-reading-writing",
      promptVi: authored.summary.promptVi,
      minimumHanzi: 100,
      maximumHanzi: 180,
      requiredElementsVi: authored.summary.requiredElementsVi,
      evidenceRefs: bindRefs(authored.summary.evidenceRefs),
      modelHanzi: authored.summary.modelHanzi,
      modelVi: authored.summary.modelVi,
      prohibitedExpansionVi: authored.summary.prohibitedExpansionVi,
      rubric: makeRubric("summary"),
      audio: null,
      ttsDisclosure: "synthetic-browser-voice",
      responseMode: "write-revise-with-source-and-model-reveal",
      scoringPolicy: "source-exposed-practice-only",
      ...failClosed(),
    };
    const argumentPrompt = {
      itemId: `${lessonId}:structured-argument`,
      lessonId,
      kind: "claim-evidence-counterargument",
      skill: "integrated-listening-reading-writing",
      promptVi: authored.argument.promptVi,
      minimumHanzi: 160,
      maximumHanzi: 280,
      requiredElementsVi: authored.argument.requiredElementsVi,
      evidenceRefs: bindRefs(authored.argument.evidenceRefs),
      modelHanzi: authored.argument.modelHanzi,
      modelVi: authored.argument.modelVi,
      counterargumentVi: authored.argument.counterargumentVi,
      conclusionBoundaryVi: authored.argument.conclusionBoundaryVi,
      rubric: makeRubric("argument"),
      audio: null,
      ttsDisclosure: "synthetic-browser-voice",
      responseMode: "write-revise-with-source-and-model-reveal",
      scoringPolicy: "source-exposed-practice-only",
      ...failClosed(),
    };
    const spokenDefensePrompt = {
      itemId: `${lessonId}:spoken-defense`,
      lessonId,
      kind: "structured-spoken-defense",
      skill: "integrated-listening-reading-speaking",
      promptVi: authored.spoken.promptVi,
      preparationSeconds: 120,
      responseSeconds: 180,
      requiredMovesVi: authored.spoken.requiredMovesVi,
      evidenceRefs: bindRefs(authored.spoken.evidenceRefs),
      modelOutlineHanzi: authored.spoken.modelOutlineHanzi,
      modelOutlineVi: authored.spoken.modelOutlineVi,
      rubric: makeRubric("speaking"),
      audio: null,
      ttsDisclosure: "synthetic-browser-voice",
      learnerRecordingRequired: true,
      reviewedHumanScoringRequired: true,
      browserAsrCanScoreMastery: false,
      responseMode: "self-record-then-outline-reveal",
      scoringPolicy: "self-reveal-only",
      ...failClosed(),
    };
    const practiceItemIds = [
      ...grammarPracticeItems,
      ...sourceAuditItems,
      ...paraphraseItems,
      summaryPrompt,
      argumentPrompt,
      spokenDefensePrompt,
    ].map((item) => item.itemId);
    const reviewBatch = {
      batchId: `${lessonId}:summary-argument-review-v1`,
      lessonId,
      sourceTextIds: sourceBindings.map((source) => source.textId),
      grammarRowIds: grammarTargets.map((target) => target.grammarRowId),
      practiceItemIds,
      requiredRoles: REVIEW_ROLES,
      state: "pending",
      approvals: [],
    };
    return {
      lessonId,
      blueprintTitleVi: blueprint.titleVi,
      blueprintObjectiveVi: blueprint.objectiveVi,
      mappedTaskIds: blueprint.inventoryMappings.taskIds,
      contextDomainIds: blueprint.contextDomainIds,
      sourceBindings,
      grammarTargets,
      grammarPracticeItems,
      sourceAuditItems,
      paraphraseItems,
      summaryPrompt,
      argumentPrompt,
      spokenDefensePrompt,
      reviewBatch,
    };
  });

  const grammarTargets = lessons.flatMap((lesson) => lesson.grammarTargets);
  const sourceAuditItems = lessons.flatMap(
    (lesson) => lesson.sourceAuditItems,
  );
  const paraphraseItems = lessons.flatMap(
    (lesson) => lesson.paraphraseItems,
  );
  const summaryPrompts = lessons.map((lesson) => lesson.summaryPrompt);
  const argumentPrompts = lessons.map((lesson) => lesson.argumentPrompt);
  const spokenDefensePrompts = lessons.map(
    (lesson) => lesson.spokenDefensePrompt,
  );
  const grammarPracticeItems = lessons.flatMap(
    (lesson) => lesson.grammarPracticeItems,
  );
  const authoredPracticeItems = [
    ...grammarPracticeItems,
    ...sourceAuditItems,
    ...paraphraseItems,
    ...summaryPrompts,
    ...argumentPrompts,
    ...spokenDefensePrompts,
  ];
  return {
    schemaVersion: 1,
    packId: config.packId,
    level: 4,
    trackId: config.trackId,
    state: "ai-assisted-summary-argument-content-draft",
    learnerVisible: false,
    releaseEligible: false,
    derivedArtifactLicense: "CC-BY-SA-4.0",
    source: {
      syllabusSourceId:
        blueprintBundle.scopeBundle.graphBundle.syllabus.source.sourceId,
      syllabusInventorySha256:
        blueprintBundle.scopeBundle.graphBundle.syllabus.inventorySha256,
      lessonBlueprintPackId: blueprintBundle.pack.packId,
      lessonBlueprintPackSha256: fileSha256(blueprintBundle.packPath),
      longFormHeadPackId: longFormHeadBundle.pack.packId,
      longFormHeadPackSha256: fileSha256(longFormHeadBundle.packPath),
      prerequisitePacks: prerequisitePackBundles.map((bundle) => ({
        packId: bundle.pack.packId,
        sha256: fileSha256(bundle.packPath),
      })),
    },
    authorship: {
      method: "ai-assisted-source-bounded-summary-argument-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      grammarPedagogyReviewer: null,
      assessmentEditor: null,
      audioRightsReviewer: null,
    },
    pedagogyPolicy: {
      exactSourceBindingRequired: true,
      factInterpretationBoundaryRequired: true,
      paraphraseScopePreservationRequired: true,
      counterargumentRequired: true,
      conclusionBoundaryRequired: true,
      skillSpecificProductiveRubricsRequired: true,
      transcriptHiddenUntilFirstResponse: true,
    },
    reviewPolicy: {
      nativeMandarinRequiredForRelease: true,
      vietnameseEditorialRequiredForRelease: true,
      grammarPedagogyReviewRequiredForRelease: true,
      assessmentReviewRequiredForRelease: true,
      audioRightsRequiredWhereAudioDependent: true,
      sourceExposedPracticeCannotCalibrateAssessment: true,
      draftRubricsCannotScoreMastery: true,
    },
    masteryPolicy: {
      listeningReadingWritingSpeakingEvidenceSeparated: true,
      selfRevealCannotGrantMastery: true,
      browserAsrCannotScoreSpeakingMastery: true,
    },
    coverageClaims: {
      moduleLessonDraftsComplete: true,
      completedSummaryArgumentModules:
        config.completedSummaryArgumentModules,
      completedSummaryArgumentLessons:
        config.completedSummaryArgumentLessons,
      reviewedContentComplete: false,
      reviewedRubricsComplete: false,
      calibratedAssessmentComplete: false,
      hsk4Complete: false,
    },
    counts: {
      lessons: lessons.length,
      completedSummaryArgumentModules:
        config.completedSummaryArgumentModules,
      completedSummaryArgumentLessons:
        config.completedSummaryArgumentLessons,
      sourceBindings: lessons.flatMap(
        (lesson) => lesson.sourceBindings,
      ).length,
      grammarTargets: grammarTargets.length,
      grammarPracticeItems: grammarPracticeItems.length,
      sourceAuditItems: sourceAuditItems.length,
      paraphraseItems: paraphraseItems.length,
      structuredSummaryPrompts: summaryPrompts.length,
      structuredArgumentPrompts: argumentPrompts.length,
      spokenDefensePrompts: spokenDefensePrompts.length,
      authoredPracticeItems: authoredPracticeItems.length,
      audioDependentItems: authoredPracticeItems.filter((item) =>
        item.audio === null
      ).length,
      learnerRecordingItems: spokenDefensePrompts.length,
      reviewedRubrics: 0,
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

export const serializeHsk4SummaryArgumentModulePack = (pack) =>
  `${JSON.stringify(pack)}\n`;

export const makeAllParagraphRefs = (sourceBindings) =>
  makeSourceRefs(sourceBindings);
