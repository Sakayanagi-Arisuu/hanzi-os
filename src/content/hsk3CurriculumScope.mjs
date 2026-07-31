import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHskCurriculumGraphBundle,
  loadHskCurriculumGraphBundle,
} from "./hskCurriculumGraph.mjs";
import { authoringGraphSha256ForPath } from "./hskAuthoringScopeBinding.mjs";

export const HSK3_CURRICULUM_SCOPE_RELATIVE_PATH =
  "content/curriculum/hsk3-scope.json";

const EXPECTED_UNIT_IDS = [
  "hsk3-paragraph-input",
  "hsk3-narration",
  "hsk3-guided-production",
];
const EXPECTED_DOMAIN_IDS = [
  "hsk3-personal-life-narratives",
  "hsk3-study-work-accounts",
  "hsk3-nature-environment-explanations",
  "hsk3-society-arts-sports-reports",
  "hsk3-culture-tradition-descriptions",
];
const EXPECTED_GRAMMAR_MODULE_IDS = [
  "hsk3-reference-quantity-phrase-building",
  "hsk3-modality-time-viewpoint-framing",
  "hsk3-event-complements-voice",
  "hsk3-comparison-description-evaluation",
  "hsk3-discourse-linking",
];
const EXPECTED_PRODUCTION_STAGE_IDS = [
  "hsk3-main-idea-detail-notes",
  "hsk3-cohesion-reconstruction",
  "hsk3-event-retelling",
  "hsk3-guided-paragraph",
  "hsk3-structured-explanation",
];
const SKILLS = new Set(["listening", "reading", "speaking", "writing"]);

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactArray = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);
const exactSet = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};
const validText = (value, minimum = 1, maximum = 500) =>
  typeof value === "string"
  && value.length >= minimum
  && value.length <= maximum;

export const loadHsk3CurriculumScopeBundle = (root = process.cwd()) => {
  const graphBundle = loadHskCurriculumGraphBundle(root);
  const scopePath = join(root, HSK3_CURRICULUM_SCOPE_RELATIVE_PATH);
  return {
    graphBundle,
    scopePath,
    scope: JSON.parse(readFileSync(scopePath, "utf8")),
  };
};

export const validateHsk3CurriculumScopeBundle = ({
  graphBundle,
  scope,
}) => {
  const errors = [];
  try {
    assertValidHskCurriculumGraphBundle(graphBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (!isRecord(scope) || scope.schemaVersion !== 1) {
    return {
      valid: false,
      errors: ["HSK3 curriculum scope schemaVersion must be 1"],
    };
  }
  if (
    scope.scopeId !== "hsk3-authoring-scope-2026.07"
    || scope.graphId !== graphBundle.graph.graphId
    || scope.graphSha256 !== authoringGraphSha256ForPath("hsk3")
    || scope.source?.sourceId !== graphBundle.syllabus.source.sourceId
    || scope.source?.inventorySha256 !== graphBundle.syllabus.inventorySha256
    || scope.source?.effective !== graphBundle.syllabus.source.effective
  ) {
    errors.push("HSK3 scope source or graph binding is stale");
  }
  if (
    scope.pathId !== "hsk3"
    || scope.state !== "authoring-scope"
    || scope.learnerVisible !== false
    || scope.releaseEligible !== false
  ) {
    errors.push("HSK3 scope must remain learner-hidden authoring input");
  }
  if (
    scope.mappingPolicy?.primaryUnitCardinality !== "exactly-one"
    || scope.mappingPolicy?.discourseDomainTaskCardinality !== "exactly-one"
    || scope.mappingPolicy?.discourseDomainTopicCardinality !== "exactly-one"
    || scope.mappingPolicy?.grammarModuleCardinality !== "exactly-one"
    || scope.mappingPolicy?.vocabularySemanticsRequireSourceReview !== true
    || scope.mappingPolicy?.scopeIsLessonCoverage !== false
    || scope.mappingPolicy?.scopeGrantsMastery !== false
  ) {
    errors.push("HSK3 scope mapping policy must remain fail-closed");
  }
  if (
    scope.coverageClaims?.officialInventoryScoped !== true
    || scope.coverageClaims?.differentiatedHsk3BlueprintComplete !== true
    || scope.coverageClaims?.lessonPracticeCoverageComplete !== false
    || scope.coverageClaims?.reviewedContentComplete !== false
    || scope.coverageClaims?.hsk3Complete !== false
  ) {
    errors.push("HSK3 scope coverage claims are invalid");
  }

  const path = graphBundle.graph.paths.find(
    (candidate) => candidate.pathId === "hsk3",
  );
  const unitScopes = Array.isArray(scope.unitScopes) ? scope.unitScopes : [];
  const unitIds = unitScopes.map((unit) => unit.unitId);
  if (
    !path
    || !exactArray(path.unitIds, EXPECTED_UNIT_IDS)
    || !exactArray(unitIds, EXPECTED_UNIT_IDS)
    || duplicateValues(unitIds).length > 0
  ) {
    errors.push("HSK3 scope units must exactly follow its graph path");
  }

  const fields = [
    ["taskIds", "tasks"],
    ["topicIds", "topics"],
    ["vocabularyIds", "vocabulary"],
    ["grammarRowIds", "grammarRows"],
    ["recognitionCharacterIds", "recognitionCharacters"],
  ];
  const summary = {};
  for (const [field, section] of fields) {
    const officialIds = graphBundle.syllabus.inventory[section]
      .filter((item) => item.level === 3)
      .map((item) => item.id);
    const mappedIds = unitScopes.flatMap((unit) =>
      Array.isArray(unit[field]) ? unit[field] : []
    );
    if (
      unitScopes.length !== 3
      || unitScopes.some((unit) => !Array.isArray(unit[field]))
      || duplicateValues(mappedIds).length > 0
      || !exactSet(mappedIds, officialIds)
    ) {
      errors.push(`${field} must exactly partition the official HSK3 inventory`);
    }
    summary[section] = new Set(mappedIds).size;
  }

  const evidenceModes = [];
  for (const unit of unitScopes) {
    if (
      !validText(unit.focus, 30, 300)
      || !Number.isInteger(unit.plannedLessonBlueprints)
      || unit.plannedLessonBlueprints < 15
      || !isRecord(unit.exitEvidence)
      || !validText(unit.exitEvidence.mode, 15, 100)
      || !Array.isArray(unit.exitEvidence.skills)
      || unit.exitEvidence.skills.length < 3
      || unit.exitEvidence.skills.some((skill) => !SKILLS.has(skill))
      || unit.exitEvidence.reviewedRubricRequired !== true
    ) {
      errors.push(`${unit.unitId} HSK3 authoring contract is invalid`);
    } else {
      evidenceModes.push(unit.exitEvidence.mode);
    }
  }
  if (duplicateValues(evidenceModes).length > 0) {
    errors.push("HSK3 units must use distinct exit-evidence modes");
  }

  const paragraphInput = unitScopes.find(
    (unit) => unit.unitId === "hsk3-paragraph-input",
  );
  if (
    !paragraphInput
    || paragraphInput.taskIds?.length !== 0
    || paragraphInput.topicIds?.length !== 54
    || paragraphInput.vocabularyIds?.length !== 500
    || paragraphInput.grammarRowIds?.length !== 0
    || paragraphInput.recognitionCharacterIds?.length !== 284
  ) {
    errors.push("HSK3 paragraph-input scope is invalid");
  }

  const narration = unitScopes.find(
    (unit) => unit.unitId === "hsk3-narration",
  );
  const grammarModules = Array.isArray(narration?.grammarModules)
    ? narration.grammarModules
    : [];
  if (
    !narration
    || narration.taskIds?.length !== 22
    || narration.topicIds?.length !== 0
    || narration.vocabularyIds?.length !== 0
    || narration.grammarRowIds?.length !== 96
    || narration.recognitionCharacterIds?.length !== 0
    || !exactArray(
      grammarModules.map((module) => module.moduleId),
      EXPECTED_GRAMMAR_MODULE_IDS,
    )
  ) {
    errors.push("HSK3 narration scope is invalid");
  }
  const moduleGrammarIds = grammarModules.flatMap((module) =>
    Array.isArray(module.grammarRowIds) ? module.grammarRowIds : []
  );
  if (
    grammarModules.some(
      (module) =>
        !validText(module.focus, 30, 300)
        || !Array.isArray(module.grammarRowIds),
    )
    || duplicateValues(moduleGrammarIds).length > 0
    || !exactSet(moduleGrammarIds, narration?.grammarRowIds ?? [])
  ) {
    errors.push("HSK3 grammar modules must partition all grammar rows");
  }

  const domains = Array.isArray(scope.discourseDomains)
    ? scope.discourseDomains
    : [];
  if (!exactArray(
    domains.map((domain) => domain.domainId),
    EXPECTED_DOMAIN_IDS,
  )) {
    errors.push("HSK3 discourse domains are incomplete or reordered");
  }
  for (const [field, expected] of [
    ["taskIds", narration?.taskIds ?? []],
    ["topicIds", paragraphInput?.topicIds ?? []],
  ]) {
    const mapped = domains.flatMap((domain) =>
      Array.isArray(domain[field]) ? domain[field] : []
    );
    if (
      domains.some(
        (domain) =>
          !validText(domain.focus, 30, 300)
          || !Array.isArray(domain[field]),
      )
      || duplicateValues(mapped).length > 0
      || !exactSet(mapped, expected)
    ) {
      errors.push(`HSK3 discourse domains must partition ${field}`);
    }
  }

  const guidedProduction = unitScopes.find(
    (unit) => unit.unitId === "hsk3-guided-production",
  );
  const productionStages = Array.isArray(guidedProduction?.productionStages)
    ? guidedProduction.productionStages
    : [];
  if (
    !guidedProduction
    || guidedProduction.taskIds?.length !== 0
    || guidedProduction.topicIds?.length !== 0
    || guidedProduction.vocabularyIds?.length !== 0
    || guidedProduction.grammarRowIds?.length !== 0
    || guidedProduction.recognitionCharacterIds?.length !== 0
    || !exactArray(
      productionStages.map((stage) => stage.stageId),
      EXPECTED_PRODUCTION_STAGE_IDS,
    )
  ) {
    errors.push("HSK3 guided-production scope is invalid");
  }
  if (productionStages.some(
    (stage) =>
      !validText(stage.mode, 15, 100)
      || !Array.isArray(stage.skills)
      || stage.skills.length < 2
      || stage.skills.some((skill) => !SKILLS.has(skill))
      || !Number.isInteger(stage.minimumPromptUnits)
      || stage.minimumPromptUnits < 12,
  )) {
    errors.push("HSK3 production-stage contract is invalid");
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      units: unitScopes.length,
      discourseDomains: domains.length,
      grammarModules: grammarModules.length,
      productionStages: productionStages.length,
      plannedLessonBlueprints: unitScopes.reduce(
        (total, unit) => total + (unit.plannedLessonBlueprints ?? 0),
        0,
      ),
      plannedMinimumPromptUnits: productionStages.reduce(
        (total, stage) => total + (stage.minimumPromptUnits ?? 0),
        0,
      ),
      ...summary,
    },
  };
};

export const assertValidHsk3CurriculumScopeBundle = (bundle) => {
  const result = validateHsk3CurriculumScopeBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK3 curriculum scope:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
