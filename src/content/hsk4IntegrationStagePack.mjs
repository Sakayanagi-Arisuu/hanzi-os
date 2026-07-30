import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk4LessonBlueprintsBundle,
  loadHsk4LessonBlueprintsBundle,
} from "./hsk4LessonBlueprints.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

const BASE_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
  "skill-rubric-reviewer",
];
const ELIGIBILITY = {
  review: "pending",
  measurementEligible: false,
  masteryEligible: false,
  releaseEligible: false,
};
const RUBRIC_DIMENSIONS = {
  listening: [
    "source-coverage",
    "note-accuracy",
    "evidence-bound-inference",
    "response-control",
  ],
  reading: [
    "source-coverage",
    "structure-awareness",
    "evidence-bound-inference",
    "response-control",
  ],
  writing: [
    "task-fulfillment",
    "source-evidence",
    "organization",
    "scope-boundary",
    "language-control",
  ],
  speaking: [
    "task-fulfillment",
    "source-evidence",
    "organization",
    "response",
    "intelligibility",
  ],
};
const RUBRIC_BANDS = ["needs-revision", "developing", "controlled"];
const RESPONSE_MODES = {
  listening: "listen-answer-then-evidence-reveal",
  reading: "read-answer-then-evidence-reveal",
  writing: "write-compare-revise",
  speaking: "record-review-rerecord",
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);
const exactSet = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
const validText = (value, minimum = 1, maximum = 4_000) =>
  typeof value === "string"
  && value.length >= minimum
  && value.length <= maximum;
const duplicates = (values) => {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
};
const failClosed = (item) => Object.entries(ELIGIBILITY).every(
  ([field, expected]) => item?.[field] === expected,
);
const jsonSha256 = (value) =>
  `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
const hanziCount = (value) =>
  Array.from(value ?? "").filter((character) =>
    /\p{Script=Han}/u.test(character)
  ).length;

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

const sourceCatalog = (headBundle) => {
  const catalog = new Map();
  for (const bundle of collectLongFormBundles(headBundle)) {
    for (const lesson of bundle.pack.lessons ?? []) {
      for (const text of lesson.texts ?? []) {
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

const collectPriorIntegrationPacks = (bundles) => {
  const packs = [];
  const seen = new Set();
  const visit = (bundle) => {
    for (const prerequisite of bundle.prerequisiteBundles ?? []) {
      visit(prerequisite);
    }
    if (!seen.has(bundle.pack.packId)) {
      seen.add(bundle.pack.packId);
      packs.push(bundle.pack);
    }
  };
  for (const bundle of bundles) visit(bundle);
  return packs;
};

const validRubric = (rubric, skill) =>
  rubric?.rubricId === `hsk4-integration-${skill}-rubric-draft-v1`
  && rubric.skill === skill
  && rubric.reviewStatus === "pending"
  && rubric.scoringAuthority === "none-before-human-review-and-calibration"
  && Array.isArray(rubric.dimensions)
  && exact(
    rubric.dimensions.map((dimension) => dimension.dimensionId),
    RUBRIC_DIMENSIONS[skill],
  )
  && rubric.dimensions.every((dimension) =>
    validText(dimension.descriptorVi, 15, 220)
    && Array.isArray(dimension.bands)
    && exact(
      dimension.bands.map((band) => band.band),
      RUBRIC_BANDS,
    )
    && dimension.bands.every((band) =>
      validText(band.descriptorVi, 20, 260)
    )
  );

const validEvidenceRefs = (refs, sourceById, contextDomainIds) => {
  if (!Array.isArray(refs) || refs.length < 2) return false;
  const sourceIds = refs.map((ref) => ref?.textId);
  if (duplicates(sourceIds).length > 0) return false;
  for (const ref of refs) {
    const source = sourceById.get(ref.textId);
    if (
      !source
      || !Array.isArray(ref.paragraphIds)
      || ref.paragraphIds.length < 1
      || ref.paragraphIds.some((id) => !source.paragraphIds.includes(id))
    ) {
      return false;
    }
  }
  return contextDomainIds.every((domainId) =>
    sourceIds.some((sourceId) => sourceId.startsWith(`${domainId}-`))
  );
};

const validResponseContract = (contract, skill, sourceCount) => {
  const unit = {
    listening: "evidence-notes",
    reading: "evidence-notes",
    writing: "hanzi",
    speaking: "spoken-seconds",
  }[skill];
  const bounds = {
    "evidence-notes": [2, 8],
    hanzi: [40, 400],
    "spoken-seconds": [30, 300],
  }[unit];
  return contract?.unit === unit
    && Number.isInteger(contract.minimum)
    && Number.isInteger(contract.maximum)
    && contract.minimum >= bounds[0]
    && contract.maximum <= bounds[1]
    && contract.maximum >= contract.minimum
    && Number.isInteger(contract.requiredSections)
    && contract.requiredSections >= 1
    && contract.requiredSections <= 5
    && Number.isInteger(contract.revisionPasses)
    && contract.revisionPasses >= 1
    && contract.revisionPasses <= 2
    && Number.isInteger(contract.minimumSources)
    && contract.minimumSources >= 2
    && contract.minimumSources <= sourceCount;
};

export const loadHsk4IntegrationStagePackBundle = ({
  root = process.cwd(),
  relativePath,
  summaryArgumentHeadBundle,
  prerequisiteBundles = [],
}) => {
  const packPath = join(root, relativePath);
  return {
    blueprintBundle: loadHsk4LessonBlueprintsBundle(root),
    summaryArgumentHeadBundle,
    longFormHeadBundle: summaryArgumentHeadBundle.longFormHeadBundle,
    prerequisiteBundles,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk4IntegrationStagePackBundle = ({
  bundle,
  config,
}) => {
  const {
    blueprintBundle,
    summaryArgumentHeadBundle,
    longFormHeadBundle,
    prerequisiteBundles,
    pack,
  } = bundle;
  const errors = [];
  try {
    assertValidHsk4LessonBlueprintsBundle(blueprintBundle);
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
    || pack.level !== 4
    || pack.trackId !== config.trackId
    || pack.state !== "ai-assisted-integration-content-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
    || pack.derivedArtifactLicense !== "CC-BY-SA-4.0"
  ) {
    return {
      valid: false,
      errors: ["HSK4 integration pack identity is invalid"],
    };
  }
  const expectedPrerequisites = prerequisiteBundles.map((prior) => ({
    packId: prior.pack.packId,
    sha256: fileSha256(prior.packPath),
  }));
  if (
    summaryArgumentHeadBundle.pack.coverageClaims
      ?.completedSummaryArgumentModules !== 5
    || summaryArgumentHeadBundle.pack.coverageClaims
      ?.completedSummaryArgumentLessons !== 24
    || pack.source?.syllabusSourceId
      !== blueprintBundle.scopeBundle.graphBundle.syllabus.source.sourceId
    || pack.source?.syllabusInventorySha256
      !== blueprintBundle.scopeBundle.graphBundle.syllabus.inventorySha256
    || pack.source?.lessonBlueprintPackId !== blueprintBundle.pack.packId
    || pack.source?.lessonBlueprintPackSha256
      !== fileSha256(blueprintBundle.packPath)
    || pack.source?.longFormHeadPackId !== longFormHeadBundle.pack.packId
    || pack.source?.longFormHeadPackSha256
      !== fileSha256(longFormHeadBundle.packPath)
    || pack.source?.summaryArgumentHeadPackId
      !== summaryArgumentHeadBundle.pack.packId
    || pack.source?.summaryArgumentHeadPackSha256
      !== fileSha256(summaryArgumentHeadBundle.packPath)
    || !exact(pack.source?.prerequisitePacks, expectedPrerequisites)
  ) {
    errors.push("HSK4 integration source chain is stale");
  }
  if (
    pack.authorship?.method
      !== "ai-assisted-source-bounded-integration-draft"
    || pack.authorship?.assistant !== "OpenAI Codex"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.assessmentEditor !== null
    || pack.authorship?.skillRubricReviewer !== null
    || pack.authorship?.audioRightsReviewer !== null
  ) {
    errors.push("HSK4 integration authorship must not imply review");
  }
  if (
    pack.pedagogyPolicy?.exactSourceBindingRequired !== true
    || pack.pedagogyPolicy?.crossDomainEvidenceRequired !== true
    || pack.pedagogyPolicy
      ?.sourceExposureRequiresIndependentAssessmentForms !== true
    || pack.pedagogyPolicy?.primarySkillEvidenceSeparated !== true
    || pack.pedagogyPolicy?.supportingInputCannotGrantMastery !== true
    || pack.pedagogyPolicy?.modelRevealStartsRevisionOnly !== true
    || pack.audioPolicy?.reviewedAudioRequired !== true
    || pack.audioPolicy?.browserTtsPreviewOnly !== true
    || pack.audioPolicy?.browserAsrCanScoreMastery !== false
    || pack.masteryPolicy
      ?.listeningReadingWritingSpeakingEvidenceSeparated !== true
    || pack.masteryPolicy?.reviewedProductiveRubricsRequired !== true
    || pack.masteryPolicy?.calibrationRequired !== true
    || pack.masteryPolicy?.prerequisiteWaiverAllowed !== false
  ) {
    errors.push("HSK4 integration pedagogy/mastery policy is invalid");
  }
  if (
    pack.timingPolicy?.timed !== config.timed
    || pack.timingPolicy?.rehearsalOnly !== true
    || pack.timingPolicy?.calibratedCutScore !== null
    || pack.timingPolicy?.confidentialFormId !== null
    || pack.timingPolicy?.mockScoringAuthority !== "none"
  ) {
    errors.push("HSK4 integration timing must remain rehearsal-only");
  }
  const complete =
    config.completedIntegrationStages === 6
    && config.completedIntegrationLessons === 18;
  if (
    pack.coverageClaims?.stageLessonDraftsComplete !== true
    || pack.coverageClaims?.completedIntegrationStages
      !== config.completedIntegrationStages
    || pack.coverageClaims?.completedIntegrationLessons
      !== config.completedIntegrationLessons
    || pack.coverageClaims?.allIntegrationLessonDraftsComplete !== complete
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.reviewedRubricsComplete !== false
    || pack.coverageClaims?.calibratedMockComplete !== false
    || pack.coverageClaims?.hsk4Complete !== false
  ) {
    errors.push("HSK4 integration coverage claims are invalid");
  }

  const rubrics = Array.isArray(pack.rubricDrafts)
    ? pack.rubricDrafts
    : [];
  if (
    !exact(rubrics.map((rubric) => rubric.skill), config.skills)
    || rubrics.some((rubric) => !validRubric(rubric, rubric.skill))
  ) {
    errors.push("HSK4 integration rubric drafts are invalid");
  }
  const rubricById = new Map(
    rubrics.map((rubric) => [rubric.rubricId, rubric]),
  );
  const lessons = Array.isArray(pack.lessons) ? pack.lessons : [];
  const expectedBlueprints = config.lessonIds.map((lessonId) =>
    blueprintBundle.pack.lessons.find((lesson) =>
      lesson.lessonId === lessonId
    )
  );
  if (
    expectedBlueprints.some((blueprint) =>
      !blueprint
      || blueprint.trackId !== config.trackId
      || blueprint.blueprintKind !== "timed-integration"
    )
    || !exact(
      lessons.map((lesson) => lesson.lessonId),
      config.lessonIds,
    )
  ) {
    errors.push("HSK4 integration lesson partition is invalid");
  }

  const catalog = sourceCatalog(longFormHeadBundle);
  const priorSourceIds = collectPriorIntegrationPacks(prerequisiteBundles)
    .flatMap((prior) =>
      (prior.lessons ?? []).flatMap((lesson) =>
        (lesson.sourceBindings ?? []).map((source) => source.textId)
      )
    );
  const allSourceIds = [];
  const allPromptIds = [];
  const allPromptUnits = [];
  const allReviewBatches = [];

  for (const [lessonIndex, lesson] of lessons.entries()) {
    const blueprint = expectedBlueprints[lessonIndex];
    if (!blueprint) continue;
    const contextDomainIds = blueprint.promptPlan.contextDomainIds;
    const sourceBindings = Array.isArray(lesson.sourceBindings)
      ? lesson.sourceBindings
      : [];
    const promptUnits = Array.isArray(lesson.promptUnits)
      ? lesson.promptUnits
      : [];
    const sourceById = new Map(
      sourceBindings.map((source) => [source.textId, source]),
    );
    allSourceIds.push(...sourceBindings.map((source) => source.textId));
    allPromptIds.push(...promptUnits.map((prompt) => prompt.promptUnitId));
    allPromptUnits.push(...promptUnits);
    allReviewBatches.push(lesson.reviewBatch);
    if (
      lesson.blueprintTitleVi !== blueprint.titleVi
      || lesson.blueprintObjectiveVi !== blueprint.objectiveVi
      || !exact(lesson.contextDomainIds, contextDomainIds)
      || !exact(
        lesson.requiredPracticeKinds,
        blueprint.practicePlan.requiredKinds,
      )
      || !exact(lesson.assessmentSkills, blueprint.assessmentPlan.skills)
      || lesson.timed !== blueprint.promptPlan.timed
      || sourceBindings.length
        !== contextDomainIds.length * config.sourceKindsByDomain.length
    ) {
      errors.push(`${lesson.lessonId} blueprint/source shape is invalid`);
    }
    for (const domainId of contextDomainIds) {
      for (const kind of config.sourceKindsByDomain) {
        if (
          sourceBindings.filter((source) =>
            source.textId.startsWith(`${domainId}-`)
            && source.kind === kind
          ).length !== 1
        ) {
          errors.push(
            `${lesson.lessonId} source domain/kind partition is invalid`,
          );
        }
      }
    }
    for (const binding of sourceBindings) {
      const source = catalog.get(binding.textId);
      if (
        !source
        || binding.sourcePackId !== source.sourcePackId
        || binding.sourcePackSha256 !== source.sourcePackSha256
        || binding.textSha256 !== jsonSha256(source.text)
        || binding.kind !== source.text.kind
        || !config.sourceKindsByDomain.includes(binding.kind)
        || binding.titleHanzi !== source.text.titleHanzi
        || binding.titleVi !== source.text.titleVi
        || !exact(
          binding.paragraphIds,
          source.text.paragraphs.map((paragraph) => paragraph.paragraphId),
        )
        || binding.audio !== source.text.audio
        || binding.transcriptRevealPolicy
          !== source.text.transcriptRevealPolicy
      ) {
        errors.push(`${lesson.lessonId}:${binding.textId} binding is stale`);
      }
    }
    if (
      promptUnits.length !== blueprint.promptPlan.minimumPromptUnits
      || !exactSet(
        new Set(promptUnits.map((prompt) => prompt.kind)),
        blueprint.practicePlan.requiredKinds,
      )
      || !exactSet(
        new Set(promptUnits.map((prompt) => prompt.primarySkill)),
        blueprint.assessmentPlan.skills,
      )
    ) {
      errors.push(`${lesson.lessonId} prompt partition is invalid`);
    }
    const usedSources = new Set();
    for (const [promptIndex, prompt] of promptUnits.entries()) {
      const expectedPromptId =
        `${lesson.lessonId}:integration-prompt-${
          String(promptIndex + 1).padStart(2, "0")
        }`;
      const refs = Array.isArray(prompt.evidenceRefs)
        ? prompt.evidenceRefs
        : [];
      const referencedSources = refs
        .map((ref) => sourceById.get(ref.textId))
        .filter(Boolean);
      refs.forEach((ref) => usedSources.add(ref.textId));
      const needsListening =
        prompt.primarySkill === "listening"
        || prompt.primarySkill === "speaking";
      const needsReading =
        prompt.primarySkill === "reading"
        || prompt.primarySkill === "writing";
      const supportingSkills = Array.isArray(prompt.supportingSkills)
        ? prompt.supportingSkills
        : [];
      const expectedRubricId =
        `hsk4-integration-${prompt.primarySkill}-rubric-draft-v1`;
      const timed = blueprint.promptPlan.timed;
      const hasListeningSource = referencedSources.some(
        (source) => source.kind === "long-form-listening",
      );
      const hasReadingSource = referencedSources.some(
        (source) => source.kind === "long-form-reading",
      );
      if (
        prompt.promptUnitId !== expectedPromptId
        || prompt.lessonId !== lesson.lessonId
        || !blueprint.practicePlan.requiredKinds.includes(prompt.kind)
        || !blueprint.assessmentPlan.skills.includes(prompt.primarySkill)
        || supportingSkills.length < 1
        || duplicates(supportingSkills).length > 0
        || supportingSkills.includes(prompt.primarySkill)
        || supportingSkills.some((skill) =>
          !blueprint.assessmentPlan.skills.includes(skill)
        )
        || !validText(prompt.promptVi, 30, 700)
        || !validEvidenceRefs(refs, sourceById, contextDomainIds)
        || (needsListening && !hasListeningSource)
        || (needsReading && !hasReadingSource)
        || hanziCount(prompt.modelHanzi) < 12
        || !validText(prompt.modelVi, 20, 1_200)
        || !Array.isArray(prompt.requiredMovesVi)
        || prompt.requiredMovesVi.length < 2
        || prompt.requiredMovesVi.length > 6
        || prompt.requiredMovesVi.some((move) => !validText(move, 8, 180))
        || !validText(prompt.scopeBoundaryVi, 30, 500)
        || !validResponseContract(
          prompt.responseContract,
          prompt.primarySkill,
          refs.length,
        )
        || prompt.timedPractice !== timed
        || (timed
          ? !Number.isInteger(prompt.timeLimitSeconds)
            || prompt.timeLimitSeconds < 60
            || prompt.timeLimitSeconds > 1_800
          : prompt.timeLimitSeconds !== null)
        || prompt.timingAuthority !== (timed
          ? "rehearsal-only-until-calibrated"
          : "untimed-guided-practice")
        || prompt.responseMode !== RESPONSE_MODES[prompt.primarySkill]
        || prompt.rubricId !== expectedRubricId
        || !rubricById.has(prompt.rubricId)
        || prompt.evidencePolicy?.contributesOnlyTo !== prompt.primarySkill
        || !exact(
          prompt.evidencePolicy?.supportingInputsDoNotGrant,
          supportingSkills,
        )
        || prompt.evidencePolicy?.reviewedRubricRequired
          !== (
            prompt.primarySkill === "writing"
            || prompt.primarySkill === "speaking"
          )
        || prompt.evidencePolicy?.calibrationRequired !== true
        || prompt.evidencePolicy
          ?.timedPracticeCannotGrantMeasurement !== true
        || prompt.learnerRecordingRequired
          !== (prompt.primarySkill === "speaking")
        || prompt.browserAsrCanScoreMastery !== false
        || prompt.scoringPolicy !== (timed
          ? "source-exposed-timed-rehearsal-only"
          : "source-exposed-guided-practice-only")
        || !failClosed(prompt)
      ) {
        errors.push(`${prompt.promptUnitId ?? expectedPromptId} is invalid`);
      }
      if (
        hasListeningSource
        ? (
          prompt.audio !== null
          || prompt.ttsDisclosure !== "synthetic-browser-voice"
          || !Array.isArray(prompt.transcriptRevealPolicies)
          || !exact(
            prompt.transcriptRevealPolicies,
            referencedSources
              .filter((source) => source.kind === "long-form-listening")
              .map((source) => ({
                textId: source.textId,
                policy: source.transcriptRevealPolicy,
              })),
          )
        )
        : (
          Object.hasOwn(prompt, "audio")
          || Object.hasOwn(prompt, "ttsDisclosure")
          || Object.hasOwn(prompt, "transcriptRevealPolicies")
        )
      ) {
        errors.push(`${prompt.promptUnitId} audio policy is invalid`);
      }
    }
    if (!exactSet(usedSources, sourceBindings.map((source) => source.textId))) {
      errors.push(`${lesson.lessonId} does not use every bound source`);
    }
    const batch = lesson.reviewBatch;
    const expectedReviewRoles = [
      ...BASE_REVIEW_ROLES,
      ...(sourceBindings.some(
        (source) => source.kind === "long-form-listening",
      )
        ? ["audio-rights-reviewer"]
        : []),
    ];
    if (
      batch?.batchId !== `${lesson.lessonId}:integration-review-v1`
      || batch.lessonId !== lesson.lessonId
      || !exact(
        batch.sourceTextIds,
        sourceBindings.map((source) => source.textId),
      )
      || !exact(
        batch.promptUnitIds,
        promptUnits.map((prompt) => prompt.promptUnitId),
      )
      || !exactSet(
        batch.rubricIds,
        new Set(promptUnits.map((prompt) => prompt.rubricId)),
      )
      || !exact(batch.requiredRoles, expectedReviewRoles)
      || batch.state !== "pending"
      || !Array.isArray(batch.approvals)
      || batch.approvals.length !== 0
    ) {
      errors.push(`${lesson.lessonId} review batch is invalid`);
    }
  }

  const priorAndCurrentSourceIds = [...priorSourceIds, ...allSourceIds];
  if (
    duplicates(allSourceIds).length > 0
    || duplicates(priorAndCurrentSourceIds).length > 0
    || duplicates(allPromptIds).length > 0
  ) {
    errors.push("HSK4 integration IDs or cumulative sources are duplicated");
  }
  const skillEvidenceUnits = Object.fromEntries(
    ["listening", "reading", "speaking", "writing"].map((skill) => [
      skill,
      allPromptUnits.filter((prompt) => prompt.primarySkill === skill).length,
    ]),
  );
  const expectedCounts = {
    lessons: lessons.length,
    completedIntegrationStages: config.completedIntegrationStages,
    completedIntegrationLessons: config.completedIntegrationLessons,
    sourceBindings: allSourceIds.length,
    uniqueSourceTexts: new Set(allSourceIds).size,
    readingSourceBindings: lessons.flatMap(
      (lesson) => lesson.sourceBindings ?? [],
    ).filter((source) => source.kind === "long-form-reading").length,
    listeningSourceBindings: lessons.flatMap(
      (lesson) => lesson.sourceBindings ?? [],
    ).filter((source) => source.kind === "long-form-listening").length,
    promptUnits: allPromptUnits.length,
    skillEvidenceUnits,
    timedPromptUnits: allPromptUnits.filter(
      (prompt) => prompt.timedPractice,
    ).length,
    audioDependentPromptUnits: allPromptUnits.filter(
      (prompt) => prompt.audio === null,
    ).length,
    learnerRecordingPromptUnits: allPromptUnits.filter(
      (prompt) => prompt.learnerRecordingRequired,
    ).length,
    reviewedRubrics: 0,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    reviewBatches: lessons.length,
    approvals: 0,
    releaseEligibleItems: 0,
  };
  if (!exact(pack.counts, expectedCounts)) {
    errors.push("HSK4 integration counts are stale");
  }
  if (
    !exact(
      (pack.reviewBatches ?? []).map((batch) => batch.batchId),
      allReviewBatches.map((batch) => batch?.batchId),
    )
    || allReviewBatches.some((batch) =>
      !batch || batch.state !== "pending" || batch.approvals.length !== 0
    )
  ) {
    errors.push("HSK4 integration review batch collection is invalid");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk4IntegrationStagePackBundle = (input) => {
  const result = validateHsk4IntegrationStagePackBundle(input);
  if (!result.valid) {
    throw new Error(result.errors.join("\n"));
  }
  return result;
};
