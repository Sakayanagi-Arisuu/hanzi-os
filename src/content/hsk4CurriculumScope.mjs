import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHskCurriculumGraphBundle,
  loadHskCurriculumGraphBundle,
} from "./hskCurriculumGraph.mjs";
import { authoringGraphSha256ForPath } from "./hskAuthoringScopeBinding.mjs";

export const HSK4_CURRICULUM_SCOPE_RELATIVE_PATH =
  "content/curriculum/hsk4-scope.json";

const EXPECTED_UNIT_IDS = [
  "hsk4-deep-comprehension",
  "hsk4-summary-argument",
  "hsk4-timed-integration",
];
const EXPECTED_DOMAIN_IDS = [
  "hsk4-personal-community-analysis",
  "hsk4-education-work-evaluation",
  "hsk4-nature-technology-explanation",
  "hsk4-society-economy-argument",
  "hsk4-arts-sports-exchange-critique",
  "hsk4-culture-history-interpretation",
];
const EXPECTED_GRAMMAR_MODULE_IDS = [
  "hsk4-precision-reference-quantity",
  "hsk4-stance-comparison-rhetoric",
  "hsk4-event-agency-voice",
  "hsk4-information-order-cohesion",
  "hsk4-argument-logic-concession",
];
const EXPECTED_INTEGRATION_STAGE_IDS = [
  "hsk4-long-input-structure-map",
  "hsk4-inference-evidence-check",
  "hsk4-cross-text-synthesis",
  "hsk4-structured-written-argument",
  "hsk4-structured-spoken-defense",
  "hsk4-timed-sectional-rehearsal",
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

export const loadHsk4CurriculumScopeBundle = (root = process.cwd()) => {
  const graphBundle = loadHskCurriculumGraphBundle(root);
  const scopePath = join(root, HSK4_CURRICULUM_SCOPE_RELATIVE_PATH);
  return {
    graphBundle,
    scopePath,
    scope: JSON.parse(readFileSync(scopePath, "utf8")),
  };
};

export const validateHsk4CurriculumScopeBundle = ({
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
      errors: ["HSK4 curriculum scope schemaVersion must be 1"],
    };
  }
  if (
    scope.scopeId !== "hsk4-authoring-scope-2026.07"
    || scope.graphId !== graphBundle.graph.graphId
    || scope.graphSha256 !== authoringGraphSha256ForPath("hsk4")
    || scope.source?.sourceId !== graphBundle.syllabus.source.sourceId
    || scope.source?.inventorySha256 !== graphBundle.syllabus.inventorySha256
    || scope.source?.effective !== graphBundle.syllabus.source.effective
  ) {
    errors.push("HSK4 scope source or graph binding is stale");
  }
  if (
    scope.pathId !== "hsk4"
    || scope.state !== "authoring-scope"
    || scope.learnerVisible !== false
    || scope.releaseEligible !== false
  ) {
    errors.push("HSK4 scope must remain learner-hidden authoring input");
  }
  if (
    scope.mappingPolicy?.primaryUnitCardinality !== "exactly-one"
    || scope.mappingPolicy?.discourseDomainTaskCardinality !== "exactly-one"
    || scope.mappingPolicy?.discourseDomainTopicCardinality !== "exactly-one"
    || scope.mappingPolicy?.grammarModuleCardinality !== "exactly-one"
    || scope.mappingPolicy?.vocabularySemanticsRequireSourceReview !== true
    || scope.mappingPolicy?.timedPracticeRequiresConfidentialForms !== true
    || scope.mappingPolicy?.scopeIsLessonCoverage !== false
    || scope.mappingPolicy?.scopeGrantsMastery !== false
  ) {
    errors.push("HSK4 scope mapping policy must remain fail-closed");
  }
  if (
    scope.coverageClaims?.officialInventoryScoped !== true
    || scope.coverageClaims?.differentiatedHsk4BlueprintComplete !== true
    || scope.coverageClaims?.timedPracticeArchitecturePlanned !== true
    || scope.coverageClaims?.lessonPracticeCoverageComplete !== false
    || scope.coverageClaims?.reviewedContentComplete !== false
    || scope.coverageClaims?.calibratedMockComplete !== false
    || scope.coverageClaims?.hsk4Complete !== false
  ) {
    errors.push("HSK4 scope coverage claims are invalid");
  }

  const path = graphBundle.graph.paths.find(
    (candidate) => candidate.pathId === "hsk4",
  );
  const unitScopes = Array.isArray(scope.unitScopes) ? scope.unitScopes : [];
  const unitIds = unitScopes.map((unit) => unit.unitId);
  if (
    !path
    || !exactArray(path.unitIds, EXPECTED_UNIT_IDS)
    || !exactArray(unitIds, EXPECTED_UNIT_IDS)
    || duplicateValues(unitIds).length > 0
  ) {
    errors.push("HSK4 scope units must exactly follow its graph path");
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
      .filter((item) => item.level === 4)
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
      errors.push(`${field} must exactly partition the official HSK4 inventory`);
    }
    summary[section] = new Set(mappedIds).size;
  }

  const evidenceModes = [];
  for (const unit of unitScopes) {
    if (
      !validText(unit.focus, 50, 350)
      || !Number.isInteger(unit.plannedLessonBlueprints)
      || unit.plannedLessonBlueprints < 18
      || !isRecord(unit.exitEvidence)
      || !validText(unit.exitEvidence.mode, 25, 120)
      || !Array.isArray(unit.exitEvidence.skills)
      || unit.exitEvidence.skills.length < 2
      || unit.exitEvidence.skills.some((skill) => !SKILLS.has(skill))
      || unit.exitEvidence.reviewedRubricRequired !== true
      || typeof unit.exitEvidence.timedEvidenceRequired !== "boolean"
    ) {
      errors.push(`${unit.unitId} HSK4 authoring contract is invalid`);
    } else {
      evidenceModes.push(unit.exitEvidence.mode);
    }
  }
  if (duplicateValues(evidenceModes).length > 0) {
    errors.push("HSK4 units must use distinct exit-evidence modes");
  }

  const deep = unitScopes.find(
    (unit) => unit.unitId === "hsk4-deep-comprehension",
  );
  if (
    !deep
    || deep.taskIds?.length !== 0
    || deep.topicIds?.length !== 77
    || deep.vocabularyIds?.length !== 1_000
    || deep.grammarRowIds?.length !== 0
    || deep.recognitionCharacterIds?.length !== 441
    || deep.exitEvidence?.timedEvidenceRequired !== false
  ) {
    errors.push("HSK4 deep-comprehension scope is invalid");
  }

  const argument = unitScopes.find(
    (unit) => unit.unitId === "hsk4-summary-argument",
  );
  const grammarModules = Array.isArray(argument?.grammarModules)
    ? argument.grammarModules
    : [];
  if (
    !argument
    || argument.taskIds?.length !== 30
    || argument.topicIds?.length !== 0
    || argument.vocabularyIds?.length !== 0
    || argument.grammarRowIds?.length !== 95
    || argument.recognitionCharacterIds?.length !== 0
    || !exactArray(
      grammarModules.map((module) => module.moduleId),
      EXPECTED_GRAMMAR_MODULE_IDS,
    )
  ) {
    errors.push("HSK4 summary-argument scope is invalid");
  }
  const moduleGrammarIds = grammarModules.flatMap((module) =>
    Array.isArray(module.grammarRowIds) ? module.grammarRowIds : []
  );
  if (
    grammarModules.some(
      (module) =>
        !validText(module.focus, 50, 350)
        || !Array.isArray(module.grammarRowIds),
    )
    || duplicateValues(moduleGrammarIds).length > 0
    || !exactSet(moduleGrammarIds, argument?.grammarRowIds ?? [])
  ) {
    errors.push("HSK4 grammar modules must partition all grammar rows");
  }

  const domains = Array.isArray(scope.discourseDomains)
    ? scope.discourseDomains
    : [];
  if (!exactArray(
    domains.map((domain) => domain.domainId),
    EXPECTED_DOMAIN_IDS,
  )) {
    errors.push("HSK4 discourse domains are incomplete or reordered");
  }
  for (const [field, expected] of [
    ["taskIds", argument?.taskIds ?? []],
    ["topicIds", deep?.topicIds ?? []],
  ]) {
    const mapped = domains.flatMap((domain) =>
      Array.isArray(domain[field]) ? domain[field] : []
    );
    if (
      domains.some(
        (domain) =>
          !validText(domain.focus, 50, 350)
          || !Array.isArray(domain[field]),
      )
      || duplicateValues(mapped).length > 0
      || !exactSet(mapped, expected)
    ) {
      errors.push(`HSK4 discourse domains must partition ${field}`);
    }
  }

  const timed = unitScopes.find(
    (unit) => unit.unitId === "hsk4-timed-integration",
  );
  const stages = Array.isArray(timed?.integrationStages)
    ? timed.integrationStages
    : [];
  if (
    !timed
    || timed.taskIds?.length !== 0
    || timed.topicIds?.length !== 0
    || timed.vocabularyIds?.length !== 0
    || timed.grammarRowIds?.length !== 0
    || timed.recognitionCharacterIds?.length !== 0
    || timed.exitEvidence?.timedEvidenceRequired !== true
    || !exactArray(
      stages.map((stage) => stage.stageId),
      EXPECTED_INTEGRATION_STAGE_IDS,
    )
  ) {
    errors.push("HSK4 timed-integration scope is invalid");
  }
  if (
    stages.some(
      (stage) =>
        !validText(stage.mode, 25, 120)
        || !Array.isArray(stage.skills)
        || stage.skills.length < 2
        || stage.skills.some((skill) => !SKILLS.has(skill))
        || !Number.isInteger(stage.minimumPromptUnits)
        || stage.minimumPromptUnits < 12
        || typeof stage.timed !== "boolean",
    )
    || stages.filter((stage) => stage.timed).length !== 3
  ) {
    errors.push("HSK4 integration-stage contract is invalid");
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      units: unitScopes.length,
      discourseDomains: domains.length,
      grammarModules: grammarModules.length,
      integrationStages: stages.length,
      timedIntegrationStages: stages.filter((stage) => stage.timed).length,
      plannedLessonBlueprints: unitScopes.reduce(
        (total, unit) => total + (unit.plannedLessonBlueprints ?? 0),
        0,
      ),
      plannedMinimumPromptUnits: stages.reduce(
        (total, stage) => total + (stage.minimumPromptUnits ?? 0),
        0,
      ),
      ...summary,
    },
  };
};

export const assertValidHsk4CurriculumScopeBundle = (bundle) => {
  const result = validateHsk4CurriculumScopeBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK4 curriculum scope:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
