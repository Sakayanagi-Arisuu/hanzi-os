import { createHash } from "node:crypto";
import {
  assertValidHsk4LessonBlueprintsBundle,
  loadHsk4LessonBlueprintsBundle,
} from "../../src/content/hsk4LessonBlueprints.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const BASE_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
  "skill-rubric-reviewer",
];

const RUBRIC_DIMENSIONS = {
  listening: [
    ["source-coverage", "Nắm đúng ý và chi tiết bắt buộc từ nguồn nghe"],
    ["note-accuracy", "Ghi chú không đổi dữ kiện, quan hệ hoặc độ chắc chắn"],
    ["evidence-bound-inference", "Suy luận chỉ trong phạm vi bằng chứng nghe"],
    ["response-control", "Trả lời đúng trọng tâm của nhiệm vụ"],
  ],
  reading: [
    ["source-coverage", "Nắm đúng ý và chi tiết bắt buộc từ nguồn đọc"],
    ["structure-awareness", "Nhận ra quan hệ giữa các đoạn và vai trò thông tin"],
    ["evidence-bound-inference", "Suy luận chỉ trong phạm vi bằng chứng đọc"],
    ["response-control", "Trả lời đúng trọng tâm của nhiệm vụ"],
  ],
  writing: [
    ["task-fulfillment", "Hoàn thành đủ các bước viết được giao"],
    ["source-evidence", "Dùng và giải thích bằng chứng nguồn chính xác"],
    ["organization", "Tổ chức lập luận và liên kết rõ ràng"],
    ["scope-boundary", "Giữ điều kiện, phản biện và giới hạn kết luận"],
    ["language-control", "Kiểm soát từ vựng và ngữ pháp HSK4"],
  ],
  speaking: [
    ["task-fulfillment", "Hoàn thành đủ các bước nói được giao"],
    ["source-evidence", "Dùng và giải thích bằng chứng nguồn chính xác"],
    ["organization", "Trình bày có mở, phát triển và kết rõ ràng"],
    ["response", "Phản hồi câu hỏi hoặc ý kiến đối lập công bằng"],
    ["intelligibility", "Phát âm và nhịp nói đủ rõ để hiểu"],
  ],
};

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

const makeRubric = (skill) => ({
  rubricId: `hsk4-integration-${skill}-rubric-draft-v1`,
  skill,
  reviewStatus: "pending",
  scoringAuthority: "none-before-human-review-and-calibration",
  dimensions: RUBRIC_DIMENSIONS[skill].map(
    ([dimensionId, descriptorVi]) => ({
      dimensionId,
      descriptorVi,
      bands: [
        {
          band: "needs-revision",
          descriptorVi:
            "Thiếu hoặc làm sai yêu cầu cốt lõi; cần quay lại bằng chứng.",
        },
        {
          band: "developing",
          descriptorVi:
            "Đáp ứng một phần nhưng còn thiếu liên kết hoặc giới hạn.",
        },
        {
          band: "controlled",
          descriptorVi:
            "Đáp ứng rõ, nhất quán và không vượt quá phạm vi nguồn.",
        },
      ],
    }),
  ),
});

const responseMode = (skill) => ({
  listening: "listen-answer-then-evidence-reveal",
  reading: "read-answer-then-evidence-reveal",
  writing: "write-compare-revise",
  speaking: "record-review-rerecord",
})[skill];

export const buildHsk4IntegrationStagePack = ({
  root = process.cwd(),
  config,
  content,
  summaryArgumentHeadBundle,
  prerequisitePackBundles = [],
}) => {
  const blueprintBundle = loadHsk4LessonBlueprintsBundle(root);
  assertValidHsk4LessonBlueprintsBundle(blueprintBundle);
  const longFormHeadBundle = summaryArgumentHeadBundle.longFormHeadBundle;
  const sourceCatalog = resolveSourceCatalog(longFormHeadBundle);
  const blueprintById = new Map(
    blueprintBundle.pack.lessons.map((lesson) => [
      lesson.lessonId,
      lesson,
    ]),
  );
  const rubricDrafts = config.skills.map((skill) => makeRubric(skill));
  const rubricBySkill = new Map(
    rubricDrafts.map((rubric) => [rubric.skill, rubric]),
  );

  const lessons = config.lessonIds.map((lessonId) => {
    const blueprint = blueprintById.get(lessonId);
    const authored = content[lessonId];
    if (
      !blueprint
      || blueprint.trackId !== config.trackId
      || blueprint.blueprintKind !== "timed-integration"
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
    const promptUnits = authored.promptUnits.map((prompt, index) => {
      const evidenceRefs = bindRefs(prompt.evidenceRefs);
      const listeningSources = evidenceRefs
        .map((ref) => sourceById.get(ref.textId))
        .filter((source) => source.kind === "long-form-listening");
      const primarySkillRubric = rubricBySkill.get(prompt.primarySkill);
      if (!primarySkillRubric) {
        throw new Error(
          `${lessonId} prompt ${index + 1} has an unknown primary skill`,
        );
      }
      return {
        promptUnitId:
          `${lessonId}:integration-prompt-${
            String(index + 1).padStart(2, "0")
          }`,
        lessonId,
        kind: prompt.kind,
        primarySkill: prompt.primarySkill,
        supportingSkills: prompt.supportingSkills,
        promptVi: prompt.promptVi,
        evidenceRefs,
        modelHanzi: prompt.modelHanzi,
        modelVi: prompt.modelVi,
        requiredMovesVi: prompt.requiredMovesVi,
        scopeBoundaryVi: prompt.scopeBoundaryVi,
        responseContract: prompt.responseContract,
        timedPractice: blueprint.promptPlan.timed,
        timeLimitSeconds: prompt.timeLimitSeconds,
        timingAuthority: blueprint.promptPlan.timed
          ? "rehearsal-only-until-calibrated"
          : "untimed-guided-practice",
        responseMode: responseMode(prompt.primarySkill),
        rubricId: primarySkillRubric.rubricId,
        evidencePolicy: {
          contributesOnlyTo: prompt.primarySkill,
          supportingInputsDoNotGrant: prompt.supportingSkills,
          reviewedRubricRequired:
            prompt.primarySkill === "writing"
            || prompt.primarySkill === "speaking",
          calibrationRequired: true,
          timedPracticeCannotGrantMeasurement: true,
        },
        audio: listeningSources.length > 0 ? null : undefined,
        ttsDisclosure: listeningSources.length > 0
          ? "synthetic-browser-voice"
          : undefined,
        transcriptRevealPolicies: listeningSources.length > 0
          ? listeningSources.map((source) => ({
            textId: source.textId,
            policy: source.transcriptRevealPolicy,
          }))
          : undefined,
        learnerRecordingRequired: prompt.primarySkill === "speaking",
        browserAsrCanScoreMastery: false,
        scoringPolicy: blueprint.promptPlan.timed
          ? "source-exposed-timed-rehearsal-only"
          : "source-exposed-guided-practice-only",
        ...failClosed(),
      };
    });
    const reviewBatch = {
      batchId: `${lessonId}:integration-review-v1`,
      lessonId,
      sourceTextIds: sourceBindings.map((source) => source.textId),
      promptUnitIds: promptUnits.map((prompt) => prompt.promptUnitId),
      rubricIds: [...new Set(
        promptUnits.map((prompt) => prompt.rubricId),
      )],
      requiredRoles: [
        ...BASE_REVIEW_ROLES,
        ...(sourceBindings.some(
          (source) => source.kind === "long-form-listening",
        )
          ? ["audio-rights-reviewer"]
          : []),
      ],
      state: "pending",
      approvals: [],
    };
    return {
      lessonId,
      blueprintTitleVi: blueprint.titleVi,
      blueprintObjectiveVi: blueprint.objectiveVi,
      contextDomainIds: blueprint.promptPlan.contextDomainIds,
      requiredPracticeKinds: blueprint.practicePlan.requiredKinds,
      assessmentSkills: blueprint.assessmentPlan.skills,
      timed: blueprint.promptPlan.timed,
      sourceBindings,
      promptUnits,
      reviewBatch,
    };
  });

  const promptUnits = lessons.flatMap((lesson) => lesson.promptUnits);
  const sourceBindings = lessons.flatMap((lesson) => lesson.sourceBindings);
  const skillEvidenceUnits = Object.fromEntries(
    ["listening", "reading", "speaking", "writing"].map((skill) => [
      skill,
      promptUnits.filter((prompt) => prompt.primarySkill === skill).length,
    ]),
  );

  return {
    schemaVersion: 1,
    packId: config.packId,
    level: 4,
    trackId: config.trackId,
    state: "ai-assisted-integration-content-draft",
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
      summaryArgumentHeadPackId: summaryArgumentHeadBundle.pack.packId,
      summaryArgumentHeadPackSha256:
        fileSha256(summaryArgumentHeadBundle.packPath),
      prerequisitePacks: prerequisitePackBundles.map((prior) => ({
        packId: prior.pack.packId,
        sha256: fileSha256(prior.packPath),
      })),
    },
    authorship: {
      method: "ai-assisted-source-bounded-integration-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      assessmentEditor: null,
      skillRubricReviewer: null,
      audioRightsReviewer: null,
    },
    pedagogyPolicy: {
      exactSourceBindingRequired: true,
      crossDomainEvidenceRequired: true,
      sourceExposureRequiresIndependentAssessmentForms: true,
      primarySkillEvidenceSeparated: true,
      supportingInputCannotGrantMastery: true,
      modelRevealStartsRevisionOnly: true,
    },
    timingPolicy: {
      timed: config.timed,
      rehearsalOnly: true,
      calibratedCutScore: null,
      confidentialFormId: null,
      mockScoringAuthority: "none",
    },
    audioPolicy: {
      reviewedAudioRequired: true,
      browserTtsPreviewOnly: true,
      browserAsrCanScoreMastery: false,
    },
    masteryPolicy: {
      listeningReadingWritingSpeakingEvidenceSeparated: true,
      reviewedProductiveRubricsRequired: true,
      calibrationRequired: true,
      prerequisiteWaiverAllowed: false,
    },
    coverageClaims: {
      stageLessonDraftsComplete: true,
      completedIntegrationStages: config.completedIntegrationStages,
      completedIntegrationLessons: config.completedIntegrationLessons,
      allIntegrationLessonDraftsComplete:
        config.completedIntegrationStages === 6
        && config.completedIntegrationLessons === 18,
      reviewedContentComplete: false,
      reviewedRubricsComplete: false,
      calibratedMockComplete: false,
      hsk4Complete: false,
    },
    counts: {
      lessons: lessons.length,
      completedIntegrationStages: config.completedIntegrationStages,
      completedIntegrationLessons: config.completedIntegrationLessons,
      sourceBindings: sourceBindings.length,
      uniqueSourceTexts: new Set(
        sourceBindings.map((source) => source.textId),
      ).size,
      readingSourceBindings: sourceBindings.filter(
        (source) => source.kind === "long-form-reading",
      ).length,
      listeningSourceBindings: sourceBindings.filter(
        (source) => source.kind === "long-form-listening",
      ).length,
      promptUnits: promptUnits.length,
      skillEvidenceUnits,
      timedPromptUnits: promptUnits.filter(
        (prompt) => prompt.timedPractice,
      ).length,
      audioDependentPromptUnits: promptUnits.filter(
        (prompt) => prompt.audio === null,
      ).length,
      learnerRecordingPromptUnits: promptUnits.filter(
        (prompt) => prompt.learnerRecordingRequired,
      ).length,
      reviewedRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: lessons.length,
      approvals: 0,
      releaseEligibleItems: 0,
    },
    rubricDrafts,
    lessons,
    reviewBatches: lessons.map((lesson) => lesson.reviewBatch),
  };
};

export const serializeHsk4IntegrationStagePack = (pack) =>
  `${JSON.stringify(pack)}\n`;
