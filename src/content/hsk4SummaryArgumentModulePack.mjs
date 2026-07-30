import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk4LessonBlueprintsBundle,
  loadHsk4LessonBlueprintsBundle,
} from "./hsk4LessonBlueprints.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

const REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "grammar-pedagogy-reviewer",
  "assessment-editor",
  "audio-rights-reviewer",
];
const ELIGIBILITY = {
  review: "pending",
  measurementEligible: false,
  masteryEligible: false,
  releaseEligible: false,
};
const RUBRIC_DIMENSIONS = {
  summary: [
    "source-coverage",
    "factual-accuracy",
    "compression",
    "cohesion",
    "language-control",
  ],
  argument: [
    "claim",
    "evidence",
    "counterargument",
    "scope-boundary",
    "language-control",
  ],
  speaking: [
    "organization",
    "evidence",
    "counterpoint",
    "intelligibility",
    "language-control",
  ],
};
const RUBRIC_BANDS = ["needs-revision", "developing", "controlled"];

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

const validRubric = (rubric, kind) =>
  rubric?.rubricId === `hsk4-summary-argument-${kind}-rubric-draft-v1`
  && rubric.kind === kind
  && rubric.reviewStatus === "pending"
  && rubric.scoringAuthority === "none-before-human-review-and-calibration"
  && Array.isArray(rubric.dimensions)
  && exact(
    rubric.dimensions.map((dimension) => dimension.dimensionId),
    RUBRIC_DIMENSIONS[kind],
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

const validEvidenceRefs = (refs, sourceById, minimumSources = 1) => {
  if (!Array.isArray(refs) || refs.length < minimumSources) return false;
  const uniqueSources = new Set();
  for (const ref of refs) {
    const source = sourceById.get(ref?.textId);
    if (
      !source
      || !Array.isArray(ref.paragraphIds)
      || ref.paragraphIds.length < 1
      || ref.paragraphIds.some((id) => !source.paragraphIds.includes(id))
    ) {
      return false;
    }
    uniqueSources.add(ref.textId);
  }
  return uniqueSources.size >= minimumSources;
};

export const loadHsk4SummaryArgumentModulePackBundle = ({
  root = process.cwd(),
  relativePath,
  longFormHeadBundle,
  prerequisiteBundles = [],
}) => {
  const packPath = join(root, relativePath);
  return {
    blueprintBundle: loadHsk4LessonBlueprintsBundle(root),
    longFormHeadBundle,
    prerequisiteBundles,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk4SummaryArgumentModulePackBundle = ({
  bundle,
  config,
}) => {
  const {
    blueprintBundle,
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
    || pack.state !== "ai-assisted-summary-argument-content-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
    || pack.derivedArtifactLicense !== "CC-BY-SA-4.0"
  ) {
    return {
      valid: false,
      errors: ["HSK4 summary/argument pack identity is invalid"],
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
    || pack.source?.longFormHeadPackId !== longFormHeadBundle.pack.packId
    || pack.source?.longFormHeadPackSha256
      !== fileSha256(longFormHeadBundle.packPath)
    || !exact(pack.source?.prerequisitePacks, expectedPrerequisites)
  ) {
    errors.push("HSK4 summary/argument source chain is stale");
  }
  if (
    pack.authorship?.method
      !== "ai-assisted-source-bounded-summary-argument-draft"
    || pack.authorship?.assistant !== "OpenAI Codex"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.grammarPedagogyReviewer !== null
    || pack.authorship?.assessmentEditor !== null
    || pack.authorship?.audioRightsReviewer !== null
  ) {
    errors.push("HSK4 summary/argument authorship must not imply review");
  }
  if (
    pack.pedagogyPolicy?.exactSourceBindingRequired !== true
    || pack.pedagogyPolicy?.factInterpretationBoundaryRequired !== true
    || pack.pedagogyPolicy?.paraphraseScopePreservationRequired !== true
    || pack.pedagogyPolicy?.counterargumentRequired !== true
    || pack.pedagogyPolicy?.conclusionBoundaryRequired !== true
    || pack.pedagogyPolicy?.skillSpecificProductiveRubricsRequired !== true
    || pack.pedagogyPolicy?.transcriptHiddenUntilFirstResponse !== true
    || pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.grammarPedagogyReviewRequiredForRelease !== true
    || pack.reviewPolicy?.assessmentReviewRequiredForRelease !== true
    || pack.reviewPolicy?.audioRightsRequiredWhereAudioDependent !== true
    || pack.reviewPolicy?.sourceExposedPracticeCannotCalibrateAssessment
      !== true
    || pack.reviewPolicy?.draftRubricsCannotScoreMastery !== true
    || pack.masteryPolicy?.listeningReadingWritingSpeakingEvidenceSeparated
      !== true
    || pack.masteryPolicy?.selfRevealCannotGrantMastery !== true
    || pack.masteryPolicy?.browserAsrCannotScoreSpeakingMastery !== true
  ) {
    errors.push("HSK4 summary/argument policy must remain fail-closed");
  }
  if (
    pack.coverageClaims?.moduleLessonDraftsComplete !== true
    || pack.coverageClaims?.completedSummaryArgumentModules
      !== config.completedSummaryArgumentModules
    || pack.coverageClaims?.completedSummaryArgumentLessons
      !== config.completedSummaryArgumentLessons
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.reviewedRubricsComplete !== false
    || pack.coverageClaims?.calibratedAssessmentComplete !== false
    || pack.coverageClaims?.hsk4Complete !== false
  ) {
    errors.push("HSK4 summary/argument coverage claims are invalid");
  }

  const lessons = Array.isArray(pack.lessons) ? pack.lessons : [];
  if (
    lessons.length !== config.lessonIds.length
    || !exact(lessons.map((lesson) => lesson.lessonId), config.lessonIds)
  ) {
    errors.push("HSK4 summary/argument lesson partition is invalid");
  }
  const blueprintById = new Map(
    blueprintBundle.pack.lessons.map((lesson) => [
      lesson.lessonId,
      lesson,
    ]),
  );
  const officialGrammarById = new Map(
    blueprintBundle.scopeBundle.graphBundle.syllabus.inventory.grammarRows
      .filter((row) => row.level === 4)
      .map((row) => [row.id, row]),
  );
  const catalog = sourceCatalog(longFormHeadBundle);
  const allItemIds = [];
  const allGrammarIds = [];
  const allSourceBindings = [];

  for (const lesson of lessons) {
    const blueprint = blueprintById.get(lesson.lessonId);
    const sourceBindings = Array.isArray(lesson.sourceBindings)
      ? lesson.sourceBindings
      : [];
    const grammarTargets = Array.isArray(lesson.grammarTargets)
      ? lesson.grammarTargets
      : [];
    const grammarPracticeItems =
      Array.isArray(lesson.grammarPracticeItems)
        ? lesson.grammarPracticeItems
        : [];
    const sourceAuditItems = Array.isArray(lesson.sourceAuditItems)
      ? lesson.sourceAuditItems
      : [];
    const paraphraseItems = Array.isArray(lesson.paraphraseItems)
      ? lesson.paraphraseItems
      : [];
    if (
      blueprint?.trackId !== config.trackId
      || blueprint?.blueprintKind !== "summary-argument"
      || lesson.blueprintTitleVi !== blueprint.titleVi
      || lesson.blueprintObjectiveVi !== blueprint.objectiveVi
      || !exact(lesson.mappedTaskIds, blueprint.inventoryMappings.taskIds)
      || !exact(lesson.contextDomainIds, blueprint.contextDomainIds)
      || sourceBindings.length !== 2
      || !exact(
        sourceBindings.map((source) => source.kind),
        ["long-form-reading", "long-form-listening"],
      )
    ) {
      errors.push(`${lesson.lessonId} blueprint/source binding is invalid`);
    }
    const sourceById = new Map(
      sourceBindings.map((source) => [source.textId, source]),
    );
    for (const binding of sourceBindings) {
      allSourceBindings.push(binding);
      const source = catalog.get(binding.textId);
      if (
        !source
        || binding.sourcePackId !== source.sourcePackId
        || binding.sourcePackSha256 !== source.sourcePackSha256
        || binding.textSha256 !== jsonSha256(source.text)
        || binding.kind !== source.text.kind
        || binding.titleHanzi !== source.text.titleHanzi
        || binding.titleVi !== source.text.titleVi
        || !exact(
          binding.paragraphIds,
          source.text.paragraphs.map((paragraph) => paragraph.paragraphId),
        )
        || binding.audio !== null
        || binding.transcriptRevealPolicy
          !== source.text.transcriptRevealPolicy
      ) {
        errors.push(`${lesson.lessonId}:${binding.textId} source is stale`);
      }
    }

    const expectedGrammarIds =
      blueprint?.inventoryMappings.grammarRowIds ?? [];
    if (
      grammarTargets.length !== expectedGrammarIds.length
      || !exact(
        grammarTargets.map((target) => target.grammarRowId),
        expectedGrammarIds,
      )
      || grammarPracticeItems.length !== grammarTargets.length
    ) {
      errors.push(`${lesson.lessonId} grammar partition is invalid`);
    }
    const grammarTargetById = new Map(
      grammarTargets.map((target) => [target.grammarRowId, target]),
    );
    for (const target of grammarTargets) {
      allGrammarIds.push(target.grammarRowId);
      const source = officialGrammarById.get(target.grammarRowId);
      if (
        !source
        || target.ordinal !== source.ordinal
        || target.category !== source.category
        || target.categoryName !== source.categoryName
        || target.detail !== source.detail
        || target.officialContent !== source.content
        || target.sourcePage !== source.sourcePage
        || !validText(target.functionVi, 20, 500)
        || !validText(target.modelHanzi, 8, 240)
        || !validText(target.modelVi, 15, 500)
        || !validText(target.scopeBoundaryVi, 20, 500)
        || target.nativeMandarinReview !== "pending"
        || target.vietnameseEditorialReview !== "pending"
        || target.grammarPedagogyReview !== "pending"
      ) {
        errors.push(`${lesson.lessonId}:${target.grammarRowId} is invalid`);
      }
    }
    for (const item of grammarPracticeItems) {
      allItemIds.push(item.itemId);
      const target = grammarTargetById.get(item.grammarRowId);
      if (
        item.itemId
          !== `${lesson.lessonId}:${item.grammarRowId}:argument-application`
        || item.lessonId !== lesson.lessonId
        || item.kind !== "grammar-in-source-bounded-argument"
        || item.skill !== "writing"
        || !target
        || !exact(
          item.sourceTextIds,
          sourceBindings.map((source) => source.textId),
        )
        || !validText(item.promptVi, 30, 500)
        || item.modelHanzi !== target.modelHanzi
        || item.modelVi !== target.modelVi
        || item.scopeBoundaryVi !== target.scopeBoundaryVi
        || item.responseMode !== "write-then-model-reveal"
        || item.scoringPolicy !== "source-exposed-practice-only"
        || !failClosed(item)
      ) {
        errors.push(`${item.itemId} grammar application is invalid`);
      }
    }

    if (
      sourceAuditItems.length !== 2
      || !exactSet(
        sourceAuditItems.flatMap((item) =>
          item.evidenceRefs.map((ref) => ref.textId)
        ),
        sourceBindings.map((source) => source.textId),
      )
      || !new Set(sourceAuditItems.map((item) => item.classification))
        .has("fact")
      || !new Set(sourceAuditItems.map((item) => item.classification))
        .has("interpretation")
    ) {
      errors.push(`${lesson.lessonId} source audits are incomplete`);
    }
    for (const item of sourceAuditItems) {
      allItemIds.push(item.itemId);
      const source = sourceById.get(item.evidenceRefs?.[0]?.textId);
      const listening = source?.kind === "long-form-listening";
      if (
        !item.itemId.startsWith(`${lesson.lessonId}:source-audit-`)
        || item.lessonId !== lesson.lessonId
        || item.kind !== "fact-interpretation-source-audit"
        || item.skill !== (listening ? "listening" : "reading")
        || !validText(item.claimHanzi, 6, 240)
        || !validText(item.claimVi, 15, 500)
        || !["fact", "interpretation"].includes(item.classification)
        || !validEvidenceRefs(item.evidenceRefs, sourceById)
        || !validText(item.rationaleVi, 20, 600)
        || !validText(item.inferenceBoundaryVi, 20, 600)
        || item.scoringPolicy !== "source-exposed-practice-only"
        || !failClosed(item)
        || (listening && (
          item.audio !== null
          || item.ttsDisclosure !== "synthetic-browser-voice"
        ))
      ) {
        errors.push(`${item.itemId} source audit is invalid`);
      }
    }

    if (
      paraphraseItems.length !== 2
      || !exactSet(
        paraphraseItems.flatMap((item) =>
          item.evidenceRefs.map((ref) => ref.textId)
        ),
        sourceBindings.map((source) => source.textId),
      )
    ) {
      errors.push(`${lesson.lessonId} paraphrases are incomplete`);
    }
    for (const item of paraphraseItems) {
      allItemIds.push(item.itemId);
      const source = sourceById.get(item.evidenceRefs?.[0]?.textId);
      const listening = source?.kind === "long-form-listening";
      if (
        !item.itemId.startsWith(`${lesson.lessonId}:paraphrase-`)
        || item.lessonId !== lesson.lessonId
        || item.kind !== "source-bounded-paraphrase"
        || item.skill !== (
          listening ? "listening-writing" : "reading-writing"
        )
        || !validText(item.promptVi, 20, 500)
        || !validEvidenceRefs(item.evidenceRefs, sourceById)
        || !validText(item.modelHanzi, 35, 500)
        || !validText(item.modelVi, 60, 900)
        || !Array.isArray(item.preservedFactsVi)
        || item.preservedFactsVi.length < 2
        || item.preservedFactsVi.some((fact) => !validText(fact, 10, 240))
        || !validText(item.prohibitedExpansionVi, 20, 500)
        || item.transcriptRevealPolicy
          !== source?.transcriptRevealPolicy
        || item.responseMode !== "write-compare-revise"
        || item.scoringPolicy !== "source-exposed-practice-only"
        || !failClosed(item)
        || (listening && (
          item.audio !== null
          || item.ttsDisclosure !== "synthetic-browser-voice"
        ))
      ) {
        errors.push(`${item.itemId} paraphrase is invalid`);
      }
    }

    const summary = lesson.summaryPrompt;
    allItemIds.push(summary?.itemId);
    if (
      summary?.itemId !== `${lesson.lessonId}:structured-summary`
      || summary.lessonId !== lesson.lessonId
      || summary.kind !== "cross-source-structured-summary"
      || summary.skill !== "integrated-listening-reading-writing"
      || !validText(summary.promptVi, 25, 600)
      || summary.minimumHanzi !== 100
      || summary.maximumHanzi !== 180
      || !Array.isArray(summary.requiredElementsVi)
      || summary.requiredElementsVi.length < 4
      || summary.requiredElementsVi.some((item) => !validText(item, 8, 240))
      || !validEvidenceRefs(summary.evidenceRefs, sourceById, 2)
      || hanziCount(summary.modelHanzi) < summary.minimumHanzi
      || hanziCount(summary.modelHanzi) > summary.maximumHanzi
      || !validText(summary.modelVi, 120, 1_500)
      || !validText(summary.prohibitedExpansionVi, 20, 500)
      || !validRubric(summary.rubric, "summary")
      || summary.audio !== null
      || summary.ttsDisclosure !== "synthetic-browser-voice"
      || summary.responseMode
        !== "write-revise-with-source-and-model-reveal"
      || summary.scoringPolicy !== "source-exposed-practice-only"
      || !failClosed(summary)
    ) {
      errors.push(`${lesson.lessonId} structured summary is invalid`);
    }

    const argument = lesson.argumentPrompt;
    allItemIds.push(argument?.itemId);
    if (
      argument?.itemId !== `${lesson.lessonId}:structured-argument`
      || argument.lessonId !== lesson.lessonId
      || argument.kind !== "claim-evidence-counterargument"
      || argument.skill !== "integrated-listening-reading-writing"
      || !validText(argument.promptVi, 25, 700)
      || argument.minimumHanzi !== 160
      || argument.maximumHanzi !== 280
      || !Array.isArray(argument.requiredElementsVi)
      || argument.requiredElementsVi.length < 5
      || argument.requiredElementsVi.some((item) => !validText(item, 8, 240))
      || !validEvidenceRefs(argument.evidenceRefs, sourceById, 2)
      || hanziCount(argument.modelHanzi) < argument.minimumHanzi
      || hanziCount(argument.modelHanzi) > argument.maximumHanzi
      || !validText(argument.modelVi, 180, 2_000)
      || !validText(argument.counterargumentVi, 20, 600)
      || !validText(argument.conclusionBoundaryVi, 20, 600)
      || !validRubric(argument.rubric, "argument")
      || argument.audio !== null
      || argument.ttsDisclosure !== "synthetic-browser-voice"
      || argument.responseMode
        !== "write-revise-with-source-and-model-reveal"
      || argument.scoringPolicy !== "source-exposed-practice-only"
      || !failClosed(argument)
    ) {
      errors.push(`${lesson.lessonId} structured argument is invalid`);
    }

    const spoken = lesson.spokenDefensePrompt;
    allItemIds.push(spoken?.itemId);
    if (
      spoken?.itemId !== `${lesson.lessonId}:spoken-defense`
      || spoken.lessonId !== lesson.lessonId
      || spoken.kind !== "structured-spoken-defense"
      || spoken.skill !== "integrated-listening-reading-speaking"
      || !validText(spoken.promptVi, 25, 600)
      || spoken.preparationSeconds !== 120
      || spoken.responseSeconds !== 180
      || !Array.isArray(spoken.requiredMovesVi)
      || spoken.requiredMovesVi.length < 4
      || spoken.requiredMovesVi.some((item) => !validText(item, 8, 240))
      || !validEvidenceRefs(spoken.evidenceRefs, sourceById, 2)
      || !Array.isArray(spoken.modelOutlineHanzi)
      || spoken.modelOutlineHanzi.length < 5
      || spoken.modelOutlineHanzi.some((item) => !validText(item, 8, 240))
      || !Array.isArray(spoken.modelOutlineVi)
      || spoken.modelOutlineVi.length !== spoken.modelOutlineHanzi.length
      || spoken.modelOutlineVi.some((item) => !validText(item, 15, 400))
      || !validRubric(spoken.rubric, "speaking")
      || spoken.audio !== null
      || spoken.ttsDisclosure !== "synthetic-browser-voice"
      || spoken.learnerRecordingRequired !== true
      || spoken.reviewedHumanScoringRequired !== true
      || spoken.browserAsrCanScoreMastery !== false
      || spoken.responseMode !== "self-record-then-outline-reveal"
      || spoken.scoringPolicy !== "self-reveal-only"
      || !failClosed(spoken)
    ) {
      errors.push(`${lesson.lessonId} spoken defense is invalid`);
    }

    const practiceItems = [
      ...grammarPracticeItems,
      ...sourceAuditItems,
      ...paraphraseItems,
      summary,
      argument,
      spoken,
    ];
    const batch = lesson.reviewBatch;
    if (
      !exact(
        batch,
        pack.reviewBatches?.find(
          (candidate) => candidate.lessonId === lesson.lessonId,
        ),
      )
      || batch?.batchId
        !== `${lesson.lessonId}:summary-argument-review-v1`
      || !exact(
        batch.sourceTextIds,
        sourceBindings.map((source) => source.textId),
      )
      || !exact(
        batch.grammarRowIds,
        grammarTargets.map((target) => target.grammarRowId),
      )
      || !exact(
        batch.practiceItemIds,
        practiceItems.map((item) => item.itemId),
      )
      || !exact(batch.requiredRoles, REVIEW_ROLES)
      || batch.state !== "pending"
      || !exact(batch.approvals, [])
    ) {
      errors.push(`${lesson.lessonId} review batch is invalid`);
    }
  }

  const expectedGrammarIds = config.lessonIds.flatMap(
    (lessonId) =>
      blueprintById.get(lessonId)?.inventoryMappings.grammarRowIds ?? [],
  );
  if (
    duplicates(allItemIds).length > 0
    || duplicates(allGrammarIds).length > 0
    || !exactSet(allGrammarIds, expectedGrammarIds)
    || duplicates(
      allSourceBindings.map((source) =>
        `${source.sourcePackId}:${source.textId}`
      ),
    ).length > 0
  ) {
    errors.push("HSK4 summary/argument IDs or source partition are invalid");
  }
  const expectedCounts = {
    lessons: lessons.length,
    completedSummaryArgumentModules:
      config.completedSummaryArgumentModules,
    completedSummaryArgumentLessons:
      config.completedSummaryArgumentLessons,
    sourceBindings: lessons.length * 2,
    grammarTargets: expectedGrammarIds.length,
    grammarPracticeItems: expectedGrammarIds.length,
    sourceAuditItems: lessons.length * 2,
    paraphraseItems: lessons.length * 2,
    structuredSummaryPrompts: lessons.length,
    structuredArgumentPrompts: lessons.length,
    spokenDefensePrompts: lessons.length,
    authoredPracticeItems: expectedGrammarIds.length + lessons.length * 7,
    audioDependentItems: lessons.length * 5,
    learnerRecordingItems: lessons.length,
    reviewedRubrics: 0,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    reviewBatches: lessons.length,
    approvals: 0,
    releaseEligibleItems: 0,
  };
  if (!exact(pack.counts, expectedCounts)) {
    errors.push("HSK4 summary/argument summary counts are stale");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk4SummaryArgumentModulePackBundle = (input) => {
  const result = validateHsk4SummaryArgumentModulePackBundle(input);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK4 summary/argument module:\n- ${
        result.errors.join("\n- ")
      }`,
    );
  }
  return result;
};
