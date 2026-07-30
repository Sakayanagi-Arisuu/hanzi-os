import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import {
  assertValidHsk4TimedSectionalRehearsalIntegrationPackBundle,
  loadHsk4TimedSectionalRehearsalIntegrationPackBundle,
} from "./hsk4TimedSectionalRehearsalIntegrationPack.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK4_LEVEL_ASSESSMENT_RELATIVE_PATH =
  "content/drafts/hsk4-level-assessment-2026.07.json";

const FORM_IDS = ["hsk4-level-form-a", "hsk4-level-form-b"];
const SECTION_COUNTS = {
  "listening-objective": 18,
  "reading-objective": 18,
  "vocabulary-objective": 18,
  "grammar-objective": 18,
  "speaking-performance": 12,
  "writing-performance": 12,
};
const MOCK_SECTION_COUNTS = {
  "listening-objective": 12,
  "reading-objective": 12,
  "vocabulary-objective": 12,
  "grammar-objective": 12,
  "speaking-performance": 3,
  "writing-performance": 3,
};
const FAMILY_SECTION_COUNTS = {
  "listening-objective": 3,
  "reading-objective": 3,
  "vocabulary-objective": 3,
  "grammar-objective": 3,
  "speaking-performance": 2,
  "writing-performance": 2,
};
const SECTION_SKILLS = {
  "listening-objective": "listening",
  "reading-objective": "reading",
  "vocabulary-objective": "vocabulary",
  "grammar-objective": "grammar",
  "speaking-performance": "speaking",
  "writing-performance": "writing",
};
const PERFORMANCE_SECTIONS = [
  "speaking-performance",
  "writing-performance",
];
const DIFFICULTY_COUNTS = {
  core: 24,
  standard: 48,
  stretch: 24,
};
const OPTION_IDS = ["A", "B", "C", "D"];
const BASE_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
];

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const validText = (value, minimum = 1, maximum = 8000) =>
  typeof value === "string"
  && value.trim().length >= minimum
  && value.length <= maximum;
const exact = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);
const exactSet = (left, right) =>
  exact([...(left ?? [])].sort(), [...(right ?? [])].sort());
const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};
const uniqueValues = (values) => [...new Set(values)];
const countBy = (values, key) =>
  values.reduce((counts, value) => {
    const bucket = value?.[key];
    counts[bucket] = (counts[bucket] ?? 0) + 1;
    return counts;
  }, {});
const normalizedHanzi = (value) =>
  String(value ?? "").normalize("NFKC").match(/\p{Script=Han}/gu)
    ?.join("") ?? "";
const validSha256 = (value) =>
  /^sha256:[0-9a-f]{64}$/u.test(String(value ?? ""));
const sha256 = (value) =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;

export const hsk4AssessmentTextSha256 = (value) =>
  `sha256:${
    createHash("sha256").update(JSON.stringify(value)).digest("hex")
  }`;

const sourceHashInput = (source) => ({
  textId: source.textId,
  kind: source.kind,
  titleHanzi: source.titleHanzi,
  titleVi: source.titleVi,
  paragraphs: source.paragraphs,
  contentHanzi: source.contentHanzi,
  contentVi: source.contentVi,
});

const fixedLengthChainFromTip = (tip, length) => {
  const chain = [];
  let current = tip;
  for (let index = 0; index < length; index += 1) {
    if (!current) return [];
    chain.push(current);
    current = current.prerequisiteBundles?.[0];
  }
  return chain.reverse();
};

const collectHsk4LearningContext = (integrationBundle) => {
  const integrationBundles = fixedLengthChainFromTip(
    integrationBundle,
    6,
  );
  const summaryArgumentBundles = fixedLengthChainFromTip(
    integrationBundle.summaryArgumentHeadBundle,
    5,
  );
  const longFormBundles = fixedLengthChainFromTip(
    integrationBundle.longFormHeadBundle,
    6,
  );
  const sourceBundles = [
    integrationBundle.blueprintBundle,
    ...longFormBundles,
    ...summaryArgumentBundles,
    ...integrationBundles,
  ];
  const blueprintBundle = integrationBundle.blueprintBundle;
  const sourceArtifacts = [
    {
      sourceId: blueprintBundle.scopeBundle.scope.scopeId,
      path: blueprintBundle.scopeBundle.scopePath,
    },
    {
      sourceId: blueprintBundle.vocabularyBundle.draft.draftId,
      path: blueprintBundle.vocabularyBundle.draftPath,
    },
    ...sourceBundles.map((bundle) => ({
      sourceId: bundle.pack.packId,
      path: bundle.packPath,
    })),
  ];
  const root = dirname(dirname(dirname(integrationBundle.packPath)));
  const sourceChainInput = sourceArtifacts.map((source) => ({
    sourceId: source.sourceId,
    relativePath: relative(root, source.path).replaceAll("\\", "/"),
    sha256: fileSha256(source.path),
  }));
  const sourceChain = sourceChainInput.map(
    ({ relativePath: _relativePath, ...source }) => source,
  );
  const learningTexts = longFormBundles.flatMap((bundle) =>
    bundle.pack.lessons.flatMap((lesson) =>
      lesson.texts.map((text) => {
        const contentHanzi = text.paragraphs
          .map((paragraph) => paragraph.hanzi)
          .join("");
        return {
          textId: text.textId,
          normalizedHanziSha256: sha256(
            normalizedHanzi(contentHanzi),
          ),
          normalizedContentHanzi: normalizedHanzi(contentHanzi),
        };
      })
    )
  );
  return {
    domains: longFormBundles.map((bundle) => bundle.pack.domainId),
    learningTexts,
    sourceChain,
    sourceChainSha256: hsk4AssessmentTextSha256(sourceChainInput),
  };
};

export const loadHsk4LevelAssessmentBundle = (
  root = process.cwd(),
) => {
  const integrationBundle =
    loadHsk4TimedSectionalRehearsalIntegrationPackBundle(root);
  const bankPath = join(root, HSK4_LEVEL_ASSESSMENT_RELATIVE_PATH);
  return {
    integrationBundle,
    bankPath,
    bank: JSON.parse(readFileSync(bankPath, "utf8")),
  };
};

export const validateHsk4LevelAssessmentBundle = ({
  integrationBundle,
  bank,
}) => {
  const errors = [];
  try {
    assertValidHsk4TimedSectionalRehearsalIntegrationPackBundle(
      integrationBundle,
    );
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }

  if (
    !isRecord(bank)
    || bank.schemaVersion !== 1
    || bank.bankId !== "hsk4-level-assessment-2026.07"
    || bank.level !== 4
  ) {
    return {
      valid: false,
      errors: ["HSK4 level assessment identity is invalid"],
    };
  }

  const context = collectHsk4LearningContext(integrationBundle);
  const blueprintBundle = integrationBundle.blueprintBundle;
  const scope = blueprintBundle.scopeBundle.scope;
  const inventory =
    blueprintBundle.scopeBundle.graphBundle.syllabus.inventory;
  const vocabularyDraft = blueprintBundle.vocabularyBundle.draft;
  const scopedVocabularyIds = new Set(
    scope.unitScopes.flatMap((unit) => unit.vocabularyIds ?? []),
  );
  const scopedGrammarRowIds = new Set(
    scope.unitScopes.flatMap((unit) => unit.grammarRowIds ?? []),
  );
  const officialVocabularyById = new Map(
    inventory.vocabulary
      .filter((entry) => entry.level === 4)
      .map((entry) => [entry.id, entry]),
  );
  const vocabularyDraftById = new Map(
    vocabularyDraft.entries.map((entry) => [entry.officialId, entry]),
  );
  const officialGrammarById = new Map(
    inventory.grammarRows
      .filter((row) => row.level === 4)
      .map((row) => [row.id, row]),
  );
  const tip = integrationBundle;
  const sourceTipPackId = bank.source?.sourceTipPackId
    ?? bank.source?.integrationTipPackId;
  const sourceTipPackSha256 = bank.source?.sourceTipPackSha256
    ?? bank.source?.integrationTipPackSha256;
  if (
    sourceTipPackId !== tip.pack.packId
    || sourceTipPackSha256 !== fileSha256(tip.packPath)
    || !exact(bank.source?.sourceChain, context.sourceChain)
    || bank.source?.sourceChainSha256 !== context.sourceChainSha256
    || bank.source?.sourceArtifactCount !== 20
    || bank.source?.learningTextCount !== 72
  ) {
    errors.push("HSK4 assessment source chain binding is stale");
  }

  if (
    bank.state
      !== "uncalibrated-assessment-authored-repository-exposed-draft"
    || bank.learnerVisible !== false
    || bank.runtimeImportEligible !== false
    || bank.releaseEligible !== false
  ) {
    errors.push(
      "HSK4 assessment must remain hidden, uncalibrated and unissuable",
    );
  }

  if (
    bank.authorship?.assistant !== "OpenAI Codex"
    || !validText(bank.authorship?.method)
    || Object.entries(bank.authorship).some(([key, value]) =>
      (
        key.endsWith("Reviewer")
        || key.endsWith("Editor")
      ) && value !== null
    )
  ) {
    errors.push("HSK4 assessment authorship implies invalid review");
  }

  if (
    bank.policy?.oneSkillPerItem !== true
    || bank.policy?.onePrimarySkillPerItem !== true
    || bank.policy?.dedicatedAssessmentSourcesRequired !== true
    || bank.policy?.zeroLearningSourceOverlapRequired !== true
    || bank.policy?.exactLearningTextReuseForbidden !== true
    || bank.policy?.sourceDisjointEquivalentFormsRequired !== true
    || bank.policy?.reviewedAudioRequiredForListeningAndSpeaking !== true
    || bank.policy?.reviewedRubricRequiredForSpeakingAndWriting !== true
    || bank.policy?.independentNonoverlappingFormsRequiredBeforeCalibration
      !== true
    || bank.policy?.repositorySourceExposureBlocksIssuance !== true
    || bank.policy?.answersMustBeServerConfidentialBeforeIssuance !== true
    || bank.policy?.repositoryExposureBlocksConfidentialIssuance !== true
    || bank.policy?.serverConfidentialAnswerKeyRequiredBeforeIssuance
      !== true
    || bank.policy?.humanReviewDoesNotCalibrate !== true
    || bank.policy?.calibrationRequiredForMeasurement !== true
    || bank.policy?.noRuntimeImportBeforeAllGates !== true
    || bank.policy?.assessmentCannotBackfillPracticeMastery !== true
    || bank.policy?.supportModalityCannotGrantAnotherSkill !== true
    || bank.policy?.timedPracticeCannotGrantMastery !== true
  ) {
    errors.push("HSK4 assessment policy must remain fail-closed");
  }

  if (
    bank.calibration?.required !== true
    || bank.calibration?.pilotSampleSize !== 0
    || bank.calibration?.reliabilityEstimate !== null
    || bank.calibration?.sectionReliabilityEstimates !== null
    || bank.calibration?.difficultyParameters !== null
    || bank.calibration?.itemDifficultyEstimates !== null
    || bank.calibration?.itemDiscriminationEstimates !== null
    || bank.calibration?.interRaterReliability !== null
    || bank.calibration?.timingPercentiles !== null
    || bank.calibration?.formEquating !== null
    || bank.calibration?.cutScore !== null
    || bank.calibration?.sectionMinimums !== null
    || bank.calibration?.scoringAuthority !== "none"
  ) {
    errors.push("HSK4 assessment calibration must remain empty");
  }

  const sources = Array.isArray(bank.sources) ? bank.sources : [];
  const items = Array.isArray(bank.items) ? bank.items : [];
  const forms = Array.isArray(bank.forms) ? bank.forms : [];
  const sourceById = new Map(
    sources.map((source) => [source.sourceFamilyId, source]),
  );
  if (
    sources.length !== 12
    || duplicateValues(sources.map((source) => source.sourceFamilyId))
      .length > 0
    || duplicateValues(sources.map((source) => source.exposureGroupId))
      .length > 0
  ) {
    errors.push(
      "HSK4 assessment must contain twelve unique source families",
    );
  }

  const assessmentTexts = [];
  const sourceFamiliesByForm = new Map(
    FORM_IDS.map((formId) => [formId, []]),
  );
  for (const family of sources) {
    if (
      !FORM_IDS.includes(family.formId)
      || !context.domains.includes(family.domainId)
      || family.learningReuse !== false
      || !validText(family.sourceFamilyId)
      || !validText(family.exposureGroupId)
      || !isRecord(family.authorship)
      || family.reviewStatus !== "pending"
      || family.learnerVisible !== false
      || family.releaseEligible !== false
      || Object.entries(family.authorship).some(([key, value]) =>
        (
          key.endsWith("Reviewer")
          || key.endsWith("Editor")
        ) && value !== null
      )
    ) {
      errors.push(
        `${family.sourceFamilyId ?? "unknown source family"} is invalid`,
      );
      continue;
    }
    sourceFamiliesByForm.get(family.formId).push(family);
    for (const [key, kind] of [
      ["readingSource", "assessment-reading"],
      ["listeningSource", "assessment-listening"],
    ]) {
      const source = family[key];
      const paragraphs = Array.isArray(source?.paragraphs)
        ? source.paragraphs
        : [];
        const contentHanzi = paragraphs
        .map((paragraph) => paragraph.hanzi)
        .join("");
      const contentVi = paragraphs
        .map((paragraph) => paragraph.vietnamese)
        .join("");
      if (
        !isRecord(source)
        || source.kind !== kind
        || !validText(source.textId)
        || !validText(source.titleHanzi, 2)
        || !validText(source.titleVi, 5)
        || paragraphs.length < 3
        || paragraphs.some((paragraph) =>
          !validText(paragraph.paragraphId)
          || !validText(paragraph.hanzi, 20)
          || !validText(paragraph.vietnamese, 20)
        )
        || source.contentHanzi !== contentHanzi
        || source.contentVi !== contentVi
        || source.textSha256
          !== hsk4AssessmentTextSha256(sourceHashInput(source))
        || source.reviewStatus !== "pending"
        || source.releaseEligible !== false
      ) {
        errors.push(
          `${family.sourceFamilyId ?? "unknown source family"}:${key} is invalid`,
        );
      }
      assessmentTexts.push({
        formId: family.formId,
        textId: source?.textId,
        textSha256: source?.textSha256,
        normalizedHanziSha256: sha256(
          normalizedHanzi(source?.contentHanzi),
        ),
        normalizedContentHanzi: normalizedHanzi(source?.contentHanzi),
      });
    }
    if (
      !exactSet(
        family.textIds,
        [family.readingSource?.textId, family.listeningSource?.textId],
      )
      || !exactSet(
        family.textSha256s,
        [
          family.readingSource?.textSha256,
          family.listeningSource?.textSha256,
        ],
      )
    ) {
      errors.push(`${family.sourceFamilyId} text manifest is invalid`);
    }
  }

  if (
    duplicateValues(assessmentTexts.map((source) => source.textId))
      .length > 0
    || duplicateValues(
      assessmentTexts.map((source) => source.textSha256),
    ).length > 0
    || duplicateValues(
      assessmentTexts.map(
        (source) => source.normalizedContentHanzi,
      ),
    ).length > 0
  ) {
    errors.push("HSK4 assessment source texts must be globally unique");
  }

  for (const formId of FORM_IDS) {
    const families = sourceFamiliesByForm.get(formId);
    if (
      families.length !== 6
      || !exactSet(
        families.map((family) => family.domainId),
        context.domains,
      )
    ) {
      errors.push(
        `${formId} must contain one source family for every HSK4 domain`,
      );
    }
  }

  const formATexts = assessmentTexts.filter(
    (source) => source.formId === FORM_IDS[0],
  );
  const formBTexts = assessmentTexts.filter(
    (source) => source.formId === FORM_IDS[1],
  );
  const formBTextIds = new Set(formBTexts.map((source) => source.textId));
  const formBTextHashes = new Set(
    formBTexts.map((source) => source.textSha256),
  );
  const formBTextContents = new Set(
    formBTexts.map((source) => source.normalizedContentHanzi),
  );
  const sourceIdOverlap = formATexts.filter(
    (source) => formBTextIds.has(source.textId),
  ).length;
  const sourceHashOverlap = formATexts.filter(
    (source) => formBTextHashes.has(source.textSha256),
  ).length;
  const sourceContentOverlap = formATexts.filter(
    (source) => formBTextContents.has(source.normalizedContentHanzi),
  ).length;
  const formAExposureIds = new Set(
    sourceFamiliesByForm.get(FORM_IDS[0])
      .map((source) => source.exposureGroupId),
  );
  const sourceExposureOverlap = sourceFamiliesByForm.get(FORM_IDS[1])
    .filter((source) => formAExposureIds.has(source.exposureGroupId))
    .length;

  const learningTextIds = new Set(
    context.learningTexts.map((source) => source.textId),
  );
  const learningTextHashes = new Set(
    context.learningTexts.map(
      (source) => source.normalizedHanziSha256,
    ),
  );
  const learningTextContents = new Set(
    context.learningTexts.map(
      (source) => source.normalizedContentHanzi,
    ),
  );
  const learningSourceIdOverlap = assessmentTexts.filter(
    (source) => learningTextIds.has(source.textId),
  ).length;
  const learningSourceHashOverlap = assessmentTexts.filter(
    (source) =>
      learningTextHashes.has(source.normalizedHanziSha256),
  ).length;
  const learningSourceContentOverlap = assessmentTexts.filter(
    (source) =>
      learningTextContents.has(source.normalizedContentHanzi),
  ).length;
  if (
    sourceIdOverlap > 0
    || sourceHashOverlap > 0
    || sourceContentOverlap > 0
    || sourceExposureOverlap > 0
  ) {
    errors.push(
      "HSK4 assessment forms must not share source, exposure or text content",
    );
  }
  if (
    learningSourceIdOverlap > 0
    || learningSourceHashOverlap > 0
    || learningSourceContentOverlap > 0
  ) {
    errors.push(
      "HSK4 assessment sources must not overlap HSK4 learning texts",
    );
  }
  if (
    !exact(bank.source?.overlapProof, {
      assessmentTextIdOverlapWithLearning: learningSourceIdOverlap,
      assessmentHanziContentOverlapWithLearning:
        learningSourceContentOverlap,
      crossFormSourceFamilyOverlap: 0,
      crossFormTextIdOverlap: sourceIdOverlap,
      crossFormTextSnapshotOverlap: sourceHashOverlap,
    })
  ) {
    errors.push("HSK4 assessment overlap proof is stale");
  }
  if (
    bank.coverageClaims?.assessmentAuthoredSourceFamilies !== "12/12"
    || bank.coverageClaims?.sourceDomainsPerForm !== "6/6"
    || bank.coverageClaims?.itemPoolPerForm !== "96/96"
    || bank.coverageClaims?.equivalentGroups !== "96/96"
    || bank.coverageClaims?.officialVocabularyBindings !== "36/36"
    || bank.coverageClaims?.officialGrammarBindings !== "36/36"
    || bank.coverageClaims?.officialInventoryBindingsComplete !== true
    || bank.coverageClaims?.timedMockSelectionPerForm !== "54/54"
    || bank.coverageClaims?.dedicatedSourceFamiliesDraftComplete !== true
    || bank.coverageClaims?.sourceDisjointFormPoolsDraftComplete !== true
    || bank.coverageClaims?.timedMockBlueprintDraftComplete !== true
    || bank.coverageClaims?.independentConfidentialFormsComplete !== false
    || bank.coverageClaims?.reviewedAssessmentComplete !== false
    || bank.coverageClaims?.reviewedAudioComplete !== false
    || bank.coverageClaims?.reviewedRubricsComplete !== false
    || bank.coverageClaims?.calibratedAssessmentComplete !== false
    || bank.coverageClaims?.hsk4LevelCheckComplete !== false
    || bank.coverageClaims?.hsk4Complete !== false
  ) {
    errors.push("HSK4 assessment coverage claims are invalid");
  }

  if (
    items.length !== 192
    || duplicateValues(items.map((item) => item.itemId)).length > 0
    || duplicateValues(items.map((item) => item.exposureGroupId))
      .length > 0
    || duplicateValues(items.map((item) => item.sourceEntityKey))
      .length > 0
  ) {
    errors.push("HSK4 assessment must contain 192 unique items");
  }

  const itemsByForm = new Map(
    FORM_IDS.map((formId) => [
      formId,
      items.filter((item) => item.formId === formId),
    ]),
  );
  const vocabularyItemIds = [];
  const grammarItemIds = [];
  for (const item of items) {
    const family = sourceById.get(item.sourceFamilyId);
    const expectedSkill = SECTION_SKILLS[item.sectionId];
    if (
      !family
      || family.formId !== item.formId
      || family.domainId !== item.domainId
      || !FORM_IDS.includes(item.formId)
      || !expectedSkill
      || item.skill !== expectedSkill
      || item.primarySkill !== expectedSkill
      || !exact(item.supportingSkills, [])
      || item.sourceExposureGroupId !== family.exposureGroupId
      || !validText(item.itemId)
      || item.itemVersion !== `${bank.bankId}:${item.itemId}:1`
      || !validText(item.equivalentGroupId)
      || !validText(item.exposureGroupId)
      || !validText(item.sourceEntityKey)
      || !item.sourceEntityKey.startsWith(`${family.sourceFamilyId}:`)
      || !validSha256(item.sourceSnapshotSha256)
      || item.exposureGroupId
        !== `${bank.bankId}:${item.itemId}:exposure-v1`
      || item.answerExposure !== "repository-authoring-only"
      || item.sourceExposure
        !== "assessment-authored-repository-exposed-draft"
      || item.independentFormStatus
        !== "source-disjoint-assessment-authored-draft"
      || !Object.hasOwn(DIFFICULTY_COUNTS, item.difficultyBand)
      || !validText(item.promptVi, 10)
    ) {
      errors.push(`${item.itemId ?? "unknown item"} binding is invalid`);
      continue;
    }
    if (
      item.reviewStatus !== "pending"
      || item.calibrationStatus !== "uncalibrated"
      || item.scoringPolicy !== "draft-only-not-for-issuance"
      || item.measurementEligible !== false
      || item.masteryEligible !== false
      || item.prerequisiteWaiverEligible !== false
      || item.releaseEligible !== false
    ) {
      errors.push(`${item.itemId} eligibility state is invalid`);
    }
    const evidenceRefs = Array.isArray(item.evidenceRefs)
      ? item.evidenceRefs
      : [];
    const familyTexts = [
      family.readingSource,
      family.listeningSource,
    ];
    if (
      evidenceRefs.length < 1
      || !exact(item.evidenceBindings, evidenceRefs)
      || !exact(
        item.sourceTextIds,
        evidenceRefs.map((reference) => reference.textId),
      )
      || evidenceRefs.some((reference) => {
        const source = familyTexts.find(
          (candidate) => candidate.textId === reference.textId,
        );
        const paragraphIds = new Set(
          source?.paragraphs.map((paragraph) => paragraph.paragraphId)
            ?? [],
        );
        return (
          reference.sourceFamilyId !== family.sourceFamilyId
          || !source
          || reference.textSha256 !== source.textSha256
          || !Array.isArray(reference.paragraphIds)
          || reference.paragraphIds.length < 1
          || duplicateValues(reference.paragraphIds).length > 0
          || reference.paragraphIds.some(
            (paragraphId) => !paragraphIds.has(paragraphId),
          )
        );
      })
    ) {
      errors.push(`${item.itemId} source evidence binding is invalid`);
    }
    if (
      (
        item.sectionId === "listening-objective"
        && evidenceRefs.some(
          (reference) =>
            reference.textId !== family.listeningSource.textId,
        )
      )
      || (
        item.sectionId === "reading-objective"
        && evidenceRefs.some(
          (reference) =>
            reference.textId !== family.readingSource.textId,
        )
      )
    ) {
      errors.push(`${item.itemId} evidence modality is invalid`);
    }
    if (item.sectionId.endsWith("-objective")) {
      if (
        !Array.isArray(item.options)
        || item.options.length !== 4
        || !exactSet(
          item.options.map((option) => option.optionId),
          OPTION_IDS,
        )
        || duplicateValues(
          item.options.map((option) => option.textHanzi),
        ).length > 0
        || item.options.some((option) => !validText(option.textHanzi))
        || !item.options.some(
          (option) => option.optionId === item.correctOptionId,
        )
        || !validText(item.rationaleVi, 10)
        || !validText(item.scopeBoundaryVi, 10)
        || item.evidencePolicy?.contributesOnlyTo !== expectedSkill
      ) {
        errors.push(`${item.itemId} objective evidence is invalid`);
      }
      if (
        item.sectionId === "listening-objective"
        && (
          item.modality !== "recorded-source-selection-pending"
          || item.stimulus?.sourceTextId
            !== family.listeningSource.textId
          || item.stimulus?.sourceTextSha256
            !== family.listeningSource.textSha256
          || item.stimulus?.audio !== null
          || item.stimulus?.audioRequirement
            !== "reviewed-human-or-licensed-recording"
          || item.stimulus?.transcriptVisibleDuringResponse !== false
        )
      ) {
        errors.push(`${item.itemId} listening stimulus is invalid`);
      } else if (
        item.sectionId === "reading-objective"
        && (
          item.modality !== "visual-selection"
          || item.stimulus?.sourceTextId !== family.readingSource.textId
          || item.stimulus?.sourceTextSha256
            !== family.readingSource.textSha256
          || item.stimulus?.pinyinVisible !== false
        )
      ) {
        errors.push(`${item.itemId} reading stimulus is invalid`);
      } else if (item.sectionId === "vocabulary-objective") {
        const official = officialVocabularyById.get(
          item.officialVocabularyId,
        );
        const draftEntry = vocabularyDraftById.get(
          item.officialVocabularyId,
        );
        const correctOption = item.options?.find(
          (option) => option.optionId === item.correctOptionId,
        );
        const evidenceParagraphs = evidenceRefs.flatMap((reference) => {
          const source = familyTexts.find(
            (candidate) => candidate.textId === reference.textId,
          );
          const ids = new Set(reference.paragraphIds ?? []);
          return source?.paragraphs.filter((paragraph) =>
            ids.has(paragraph.paragraphId)
          ) ?? [];
        });
        const restoredContext = item.stimulus?.contextHanzi?.replace(
          "____",
          item.stimulus?.targetHanzi ?? "",
        );
        vocabularyItemIds.push(item.officialVocabularyId);
        if (
          item.modality !== "visual-selection"
          || item.stimulus?.kind !== "hanzi-only-context"
          || !validText(item.stimulus?.contextHanzi, 5)
          || item.stimulus?.mixedLanguageInContext !== false
          || !official
          || official.level !== 4
          || !scopedVocabularyIds.has(item.officialVocabularyId)
          || !draftEntry
          || item.stimulus?.officialVocabularyId
            !== item.officialVocabularyId
          || item.stimulus?.targetHanzi !== official.word
          || item.stimulus?.targetHanzi !== draftEntry.simplified
          || item.stimulus?.officialPinyin !== official.pinyin
          || item.stimulus?.officialPinyin
            !== draftEntry.officialPinyin
          || item.stimulus?.officialPartOfSpeech
            !== official.partOfSpeech
          || item.stimulus?.officialPartOfSpeech
            !== draftEntry.officialPartOfSpeech
          || correctOption?.textHanzi !== item.stimulus?.targetHanzi
          || (item.stimulus?.contextHanzi.match(/____/gu)?.length ?? 0)
            !== 1
          || !validText(restoredContext, 5)
          || !evidenceParagraphs.some((paragraph) =>
            paragraph.hanzi.includes(restoredContext)
          )
        ) {
          errors.push(`${item.itemId} official vocabulary binding is invalid`);
        }
      } else if (item.sectionId === "grammar-objective") {
        const official = officialGrammarById.get(item.grammarRowId);
        grammarItemIds.push(item.grammarRowId);
        if (
          item.modality !== "visual-selection"
          || item.stimulus?.kind !== "hanzi-only-context"
          || !validText(item.stimulus?.contextHanzi, 5)
          || item.stimulus?.mixedLanguageInContext !== false
          || !official
          || official.level !== 4
          || !scopedGrammarRowIds.has(item.grammarRowId)
          || item.stimulus?.grammarRowId !== item.grammarRowId
          || item.stimulus?.grammarLabel !== official.content
          || item.stimulus?.officialGrammarContent !== official.content
          || item.stimulus?.officialGrammarCategory
            !== official.categoryName
          || (item.stimulus?.contextHanzi.match(/____/gu)?.length ?? 0)
            < 1
        ) {
          errors.push(`${item.itemId} official grammar binding is invalid`);
        }
      }
    } else {
      if (
        item.modality !== "reviewed-human-rated-performance-pending"
        || item.rubricDraft?.state !== "pending-review-and-calibration"
        || !Array.isArray(item.rubricDraft?.dimensions)
        || item.rubricDraft.dimensions.length < 4
        || item.rubricDraft?.scale !== null
        || item.rubricDraft?.passingStandard !== null
        || item.rubricId !== item.rubricDraft?.rubricId
        || !isRecord(item.responseContract)
        || item.evidencePolicy?.contributesOnlyTo !== expectedSkill
        || item.evidencePolicy?.humanRatingRequired !== true
      ) {
        errors.push(`${item.itemId} performance draft is invalid`);
      }
      if (
        item.sectionId === "speaking-performance"
        && (
          item.stimulus?.audio !== null
          || item.stimulus?.audioRequirement
            !== "reviewed-human-or-licensed-recording"
          || item.responseContract?.learnerRecordingRequired !== true
          || item.responseContract?.browserAsrCanScoreMastery !== false
          || item.responseContract?.modelResponseVisible !== false
        )
      ) {
        errors.push(`${item.itemId} speaking evidence is invalid`);
      }
      if (
        item.sectionId === "writing-performance"
        && (
          item.responseContract?.revisionPassesDuringScoredForm !== 0
          || item.responseContract?.modelResponseVisible !== false
        )
      ) {
        errors.push(`${item.itemId} writing evidence is invalid`);
      }
    }
  }
  if (
    vocabularyItemIds.length !== 36
    || uniqueValues(vocabularyItemIds).length !== 36
    || grammarItemIds.length !== 36
    || uniqueValues(grammarItemIds).length !== 36
  ) {
    errors.push(
      "HSK4 language items must bind 36 unique official vocabulary and grammar records",
    );
  }

  const equivalentGroups = new Map();
  for (const item of items) {
    const group = equivalentGroups.get(item.equivalentGroupId) ?? [];
    group.push(item);
    equivalentGroups.set(item.equivalentGroupId, group);
  }
  if (
    equivalentGroups.size !== 96
    || [...equivalentGroups.values()].some((group) =>
      group.length !== 2
      || !exactSet(group.map((item) => item.formId), FORM_IDS)
      || group[0].sectionId !== group[1].sectionId
      || group[0].skill !== group[1].skill
      || sourceById.get(group[0].sourceFamilyId)?.domainId
        !== sourceById.get(group[1].sourceFamilyId)?.domainId
      || group[0].difficultyBand !== group[1].difficultyBand
      || group[0].sourceFamilyId === group[1].sourceFamilyId
    )
  ) {
    errors.push("HSK4 equivalent form slots are invalid");
  }

  for (const formId of FORM_IDS) {
    const formItems = itemsByForm.get(formId);
    const sectionCounts = countBy(formItems, "sectionId");
    const difficultyCounts = countBy(formItems, "difficultyBand");
    if (
      formItems.length !== 96
      || !exact(sectionCounts, SECTION_COUNTS)
      || !exact(difficultyCounts, DIFFICULTY_COUNTS)
    ) {
      errors.push(`${formId} item distribution is invalid`);
    }
    for (const family of sourceFamiliesByForm.get(formId)) {
      const familyItems = formItems.filter(
        (item) => item.sourceFamilyId === family.sourceFamilyId,
      );
      if (
        familyItems.length !== 16
        || !exact(countBy(familyItems, "sectionId"), FAMILY_SECTION_COUNTS)
      ) {
        errors.push(
          `${family.sourceFamilyId} must bind exactly sixteen items`,
        );
      }
    }
  }

  const formManifestItemIds = [];
  if (
    forms.length !== 2
    || !exactSet(forms.map((form) => form.formId), FORM_IDS)
  ) {
    errors.push("HSK4 assessment must plan exactly two forms");
  }
  for (const form of forms) {
    const expectedItems = itemsByForm.get(form.formId) ?? [];
    const expectedSources = sourceFamiliesByForm.get(form.formId) ?? [];
    const sections = Array.isArray(form.sections) ? form.sections : [];
    if (
      form.state !== "assessment-authored-repository-exposed-draft"
      || form.learnerVisible !== false
      || form.eligibleForIssuance !== false
      || form.eligibleForCalibration !== false
      || form.timeLimitSeconds !== null
      || form.itemCount !== 96
      || form.passingStandard !== null
      || form.answerKeyServerConfidentialRequired !== true
      || form.sourceFamilyOverlapWithOtherForm !== 0
      || form.sourceTextOverlapWithOtherForm !== 0
      || !exactSet(
        form.sourceFamilyIds,
        expectedSources.map((source) => source.sourceFamilyId),
      )
      || !exactSet(
        form.sourceTextIds,
        expectedSources.flatMap((source) => source.textIds),
      )
      || !exact(form.difficultyCounts, DIFFICULTY_COUNTS)
      || sections.length !== 6
      || !exactSet(
        sections.map((section) => section.sectionId),
        Object.keys(SECTION_COUNTS),
      )
    ) {
      errors.push(`${form.formId ?? "unknown form"} manifest is invalid`);
      continue;
    }
    for (const section of sections) {
      const expectedSectionItems = expectedItems.filter(
        (item) => item.sectionId === section.sectionId,
      );
      if (
        section.skill !== SECTION_SKILLS[section.sectionId]
        || section.itemCount !== SECTION_COUNTS[section.sectionId]
        || !exactSet(
          section.itemIds,
          expectedSectionItems.map((item) => item.itemId),
        )
      ) {
        errors.push(`${form.formId}:${section.sectionId} is invalid`);
      }
      formManifestItemIds.push(...(section.itemIds ?? []));
    }
  }
  if (
    duplicateValues(formManifestItemIds).length > 0
    || !exactSet(
      formManifestItemIds,
      items.map((item) => item.itemId),
    )
  ) {
    errors.push("HSK4 form manifests must partition all items");
  }

  const mockForms = Array.isArray(bank.mockBlueprint?.forms)
    ? bank.mockBlueprint.forms
    : [];
  const mockSelectedIds = [];
  const mockAlternateIds = [];
  if (
    bank.mockBlueprint?.blueprintId
      !== "hsk4-timed-mock-blueprint-2026.07"
    || bank.mockBlueprint?.state !== "planned-uncalibrated-draft"
    || bank.mockBlueprint?.plannedDurationSeconds !== 6000
    || bank.mockBlueprint?.scoringAuthority
      !== "none-before-review-and-calibration"
    || bank.mockBlueprint?.answerKeyAuthority
      !== "repository-authoring-only-not-confidential"
    || bank.mockBlueprint?.equivalentSelectionRequiredAcrossForms
      !== true
    || bank.mockBlueprint?.sourceDisjointFormsRequired !== true
    || bank.mockBlueprint?.eligibleForIssuance !== false
    || (
      Object.hasOwn(bank.mockBlueprint ?? {}, "learnerVisible")
      && bank.mockBlueprint.learnerVisible !== false
    )
    || (
      Object.hasOwn(bank.mockBlueprint ?? {}, "passingStandard")
      && bank.mockBlueprint.passingStandard !== null
    )
    || mockForms.length !== 2
    || !exactSet(mockForms.map((form) => form.formId), FORM_IDS)
  ) {
    errors.push("HSK4 timed mock blueprint is invalid");
  }
  for (const mockForm of mockForms) {
    const formItems = itemsByForm.get(mockForm.formId) ?? [];
    const formItemIds = new Set(formItems.map((item) => item.itemId));
    const selectedIds = Array.isArray(mockForm.selectedItemIds)
      ? mockForm.selectedItemIds
      : [];
    const alternateIds = Array.isArray(mockForm.alternateItemIds)
      ? mockForm.alternateItemIds
      : [];
    const sections = Array.isArray(mockForm.sections)
      ? mockForm.sections
      : [];
    const selectedItems = selectedIds.map((itemId) =>
      formItems.find((item) => item.itemId === itemId)
    ).filter(Boolean);
    const formSources = sourceFamiliesByForm.get(mockForm.formId) ?? [];
    if (
      mockForm.state !== "source-exposed-timed-rehearsal-draft"
      || mockForm.learnerVisible !== false
      || mockForm.eligibleForIssuance !== false
      || mockForm.eligibleForScoring !== false
      || mockForm.plannedDurationSeconds !== 6000
      || mockForm.passingStandard !== null
      || selectedIds.length !== 54
      || alternateIds.length !== 42
      || mockForm.selectedItemCount !== 54
      || mockForm.alternateItemCount !== 42
      || duplicateValues(selectedIds).length > 0
      || duplicateValues(alternateIds).length > 0
      || selectedIds.some((itemId) => !formItemIds.has(itemId))
      || alternateIds.some((itemId) => !formItemIds.has(itemId))
      || selectedIds.some((itemId) => alternateIds.includes(itemId))
      || !exactSet([...selectedIds, ...alternateIds], [...formItemIds])
      || !exact(countBy(selectedItems, "sectionId"), MOCK_SECTION_COUNTS)
      || !exact(
        mockForm.difficultyCounts,
        countBy(selectedItems, "difficultyBand"),
      )
      || !exactSet(
        mockForm.sourceFamilyIds,
        formSources.map((source) => source.sourceFamilyId),
      )
      || !exactSet(
        mockForm.sourceTextIds,
        formSources.flatMap((source) => source.textIds),
      )
      || sections.length !== 6
    ) {
      errors.push(`${mockForm.formId} mock selection is invalid`);
    }
    const sectionItemIds = [];
    for (const section of sections) {
      const expectedSelected = selectedItems.filter(
        (item) => item.sectionId === section.sectionId,
      );
      if (
        section.skill !== SECTION_SKILLS[section.sectionId]
        || section.itemCount !== MOCK_SECTION_COUNTS[section.sectionId]
        || !Number.isInteger(section.timeLimitSeconds)
        || section.timeLimitSeconds <= 0
        || !exactSet(
          section.itemIds,
          expectedSelected.map((item) => item.itemId),
        )
      ) {
        errors.push(
          `${mockForm.formId}:${section.sectionId} mock section is invalid`,
        );
      }
      sectionItemIds.push(...(section.itemIds ?? []));
    }
    if (
      duplicateValues(sectionItemIds).length > 0
      || !exactSet(sectionItemIds, selectedIds)
      || sections.reduce(
        (total, section) => total + section.timeLimitSeconds,
        0,
      ) !== 6000
    ) {
      errors.push(`${mockForm.formId} mock timing or partition is invalid`);
    }
    mockSelectedIds.push(...selectedIds);
    mockAlternateIds.push(...alternateIds);
  }

  const reviewBatches = Array.isArray(bank.reviewBatches)
    ? bank.reviewBatches
    : [];
  const reviewItemIds = [];
  if (reviewBatches.length !== 12) {
    errors.push("HSK4 assessment must have twelve review batches");
  }
  for (const batch of reviewBatches) {
    const expectedItems = items.filter(
      (item) =>
        item.formId === batch.formId
        && item.sectionId === batch.sectionId,
    );
    const roles = [...BASE_REVIEW_ROLES];
    if (
      batch.sectionId === "listening-objective"
      || batch.sectionId === "speaking-performance"
    ) {
      roles.push("audio-rights-reviewer");
    }
    if (batch.sectionId === "speaking-performance") {
      roles.push("speaking-pedagogy-reviewer");
    }
    if (batch.sectionId === "writing-performance") {
      roles.push("writing-pedagogy-reviewer");
    }
    const expectedSourceTextIds = [
      ...new Set(expectedItems.flatMap((item) =>
        (item.evidenceRefs ?? []).map((reference) => reference.textId)
      )),
    ];
    const expectedRubricIds = [
      ...new Set(expectedItems.flatMap((item) =>
        item.rubricDraft?.rubricId
          ? [item.rubricDraft.rubricId]
          : []
      )),
    ];
    if (
      batch.batchId
        !== `${bank.bankId}:${batch.formId}:${batch.sectionId}:review-v1`
      || !FORM_IDS.includes(batch.formId)
      || !Object.hasOwn(SECTION_COUNTS, batch.sectionId)
      || !exactSet(
        batch.itemIds,
        expectedItems.map((item) => item.itemId),
      )
      || !exactSet(
        batch.sourceFamilyIds,
        [...new Set(
          expectedItems.map((item) => item.sourceFamilyId),
        )],
      )
      || !exactSet(batch.sourceTextIds, expectedSourceTextIds)
      || !exactSet(batch.rubricIds, expectedRubricIds)
      || !exactSet(batch.requiredRoles, roles)
      || batch.reviewedAudioRequired
        !== (
          batch.sectionId === "listening-objective"
          || batch.sectionId === "speaking-performance"
        )
      || batch.reviewedRubricRequired
        !== PERFORMANCE_SECTIONS.includes(batch.sectionId)
      || batch.state !== "pending"
      || !exact(batch.approvals, [])
    ) {
      errors.push(`${batch.batchId ?? "unknown batch"} is invalid`);
    }
    reviewItemIds.push(...(batch.itemIds ?? []));
  }
  if (
    duplicateValues(reviewItemIds).length > 0
    || !exactSet(reviewItemIds, items.map((item) => item.itemId))
  ) {
    errors.push("HSK4 assessment review batches must partition all items");
  }

  const countSection = (sectionId) =>
    items.filter((item) => item.sectionId === sectionId).length;
  const expectedCounts = {
    forms: forms.length,
    itemsPerForm: 96,
    totalItems: items.length,
    objectiveItems: items.filter(
      (item) => item.sectionId.endsWith("-objective"),
    ).length,
    constructedResponseItems: items.filter(
      (item) => item.sectionId.endsWith("-performance"),
    ).length,
    listeningItems: countSection("listening-objective"),
    readingItems: countSection("reading-objective"),
    vocabularyItems: countSection("vocabulary-objective"),
    grammarItems: countSection("grammar-objective"),
    officialVocabularyBindings: uniqueValues(vocabularyItemIds).length,
    officialGrammarBindings: uniqueValues(grammarItemIds).length,
    speakingItems: countSection("speaking-performance"),
    writingItems: countSection("writing-performance"),
    audioDependentItems:
      countSection("listening-objective")
      + countSection("speaking-performance"),
    sourceFamilies: sources.length,
    sourceFamiliesPerForm: 6,
    equivalentGroups: equivalentGroups.size,
    sourceIdOverlapBetweenForms: sourceIdOverlap,
    sourceExposureOverlapBetweenForms: sourceExposureOverlap,
    sourceTextHashOverlapBetweenForms: sourceHashOverlap,
    sourceContentOverlapBetweenForms: sourceContentOverlap,
    learningSourceIdOverlap: learningSourceIdOverlap,
    learningSourceTextHashOverlap: learningSourceHashOverlap,
    learningSourceContentOverlap: learningSourceContentOverlap,
    mockItemsPerForm: 54,
    mockAlternateItemsPerForm: 42,
    mockPlannedDurationSeconds: 6000,
    reviewBatches: reviewBatches.length,
    reviewedItems: 0,
    reviewedAudioItems: 0,
    calibratedItems: 0,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    prerequisiteWaiverEligibleItems: 0,
    releaseEligibleItems: 0,
  };
  if (
    expectedCounts.objectiveItems !== 144
    || expectedCounts.constructedResponseItems !== 48
    || expectedCounts.listeningItems !== 36
    || expectedCounts.readingItems !== 36
    || expectedCounts.vocabularyItems !== 36
    || expectedCounts.grammarItems !== 36
    || expectedCounts.speakingItems !== 24
    || expectedCounts.writingItems !== 24
    || expectedCounts.audioDependentItems !== 60
    || mockSelectedIds.length !== 108
    || mockAlternateIds.length !== 84
    || !exact(bank.counts, expectedCounts)
  ) {
    errors.push("HSK4 assessment counts are stale or invalid");
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk4LevelAssessmentBundle = (bundle) => {
  const result = validateHsk4LevelAssessmentBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `HSK4 level assessment validation failed:\n- ${
        result.errors.join("\n- ")
      }`,
    );
  }
  return result;
};
