import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHskCurriculumGraphBundle,
  loadHskCurriculumGraphBundle,
} from "./hskCurriculumGraph.mjs";

export const HSK2_CURRICULUM_SCOPE_RELATIVE_PATH =
  "content/curriculum/hsk2-scope.json";

const EXPECTED_UNIT_IDS = [
  "hsk2-situational-dialogue",
  "hsk2-sentence-chains",
  "hsk2-short-text-production",
];
const EXPECTED_STRAND_IDS = [
  "hsk2-person-events-environment",
  "hsk2-daily-needs-family",
  "hsk2-travel-leisure",
  "hsk2-study-work-culture",
];
const EXPECTED_GRAMMAR_MODULE_IDS = [
  "hsk2-reference-description-comparison",
  "hsk2-aspect-time-experience",
  "hsk2-complements-and-motion",
  "hsk2-clause-linking",
];
const EXPECTED_PRODUCTION_STAGES = [
  "hsk2-dictation",
  "hsk2-sentence-reconstruction",
  "hsk2-guided-message",
  "hsk2-picture-description",
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

export const loadHsk2CurriculumScopeBundle = (root = process.cwd()) => {
  const graphBundle = loadHskCurriculumGraphBundle(root);
  const scopePath = join(root, HSK2_CURRICULUM_SCOPE_RELATIVE_PATH);
  return {
    graphBundle,
    scopePath,
    scope: JSON.parse(readFileSync(scopePath, "utf8")),
  };
};

export const validateHsk2CurriculumScopeBundle = ({
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
      errors: ["HSK2 curriculum scope schemaVersion must be 1"],
    };
  }
  if (
    scope.scopeId !== "hsk2-authoring-scope-2026.07"
    || scope.graphId !== graphBundle.graph.graphId
    || scope.graphSha256 !== graphBundle.graphSha256
    || scope.source?.sourceId !== graphBundle.syllabus.source.sourceId
    || scope.source?.inventorySha256 !== graphBundle.syllabus.inventorySha256
    || scope.source?.effective !== graphBundle.syllabus.source.effective
  ) {
    errors.push("HSK2 scope source or graph binding is stale");
  }
  if (
    scope.pathId !== "hsk2"
    || scope.state !== "authoring-scope"
    || scope.learnerVisible !== false
    || scope.releaseEligible !== false
  ) {
    errors.push("HSK2 scope must remain learner-hidden authoring input");
  }
  if (
    scope.mappingPolicy?.primaryUnitCardinality !== "exactly-one"
    || scope.mappingPolicy?.situationalStrandCardinality !== "exactly-one"
    || scope.mappingPolicy?.grammarModuleCardinality !== "exactly-one"
    || scope.mappingPolicy?.scopeIsLessonCoverage !== false
    || scope.mappingPolicy?.scopeGrantsMastery !== false
  ) {
    errors.push("HSK2 scope mapping policy must remain fail-closed");
  }
  if (
    scope.coverageClaims?.officialInventoryScoped !== true
    || scope.coverageClaims?.differentiatedHsk2BlueprintComplete !== true
    || scope.coverageClaims?.lessonPracticeCoverageComplete !== false
    || scope.coverageClaims?.reviewedContentComplete !== false
    || scope.coverageClaims?.hsk2Complete !== false
  ) {
    errors.push("HSK2 scope coverage claims are invalid");
  }

  const path = graphBundle.graph.paths.find(
    (candidate) => candidate.pathId === "hsk2",
  );
  const unitScopes = Array.isArray(scope.unitScopes) ? scope.unitScopes : [];
  const unitIds = unitScopes.map((unit) => unit.unitId);
  if (
    !path
    || !exactArray(path.unitIds, EXPECTED_UNIT_IDS)
    || !exactArray(unitIds, EXPECTED_UNIT_IDS)
    || duplicateValues(unitIds).length > 0
  ) {
    errors.push("HSK2 scope units must exactly follow its graph path");
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
      .filter((item) => item.level === 2)
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
      errors.push(`${field} must exactly partition the official HSK2 inventory`);
    }
    summary[section] = new Set(mappedIds).size;
  }

  const evidenceModes = [];
  for (const unit of unitScopes) {
    if (
      !validText(unit.focus, 20, 300)
      || !Number.isInteger(unit.plannedLessonBlueprints)
      || unit.plannedLessonBlueprints < 8
      || !isRecord(unit.exitEvidence)
      || !validText(unit.exitEvidence.mode, 10, 100)
      || !Array.isArray(unit.exitEvidence.skills)
      || unit.exitEvidence.skills.length < 2
      || unit.exitEvidence.skills.some((skill) => !SKILLS.has(skill))
      || unit.exitEvidence.reviewedRubricRequired !== true
    ) {
      errors.push(`${unit.unitId} authoring contract is invalid`);
    } else {
      evidenceModes.push(unit.exitEvidence.mode);
    }
  }
  if (duplicateValues(evidenceModes).length > 0) {
    errors.push("HSK2 units must use distinct exit-evidence modes");
  }

  const situational = unitScopes.find(
    (unit) => unit.unitId === "hsk2-situational-dialogue",
  );
  const strands = Array.isArray(situational?.strands)
    ? situational.strands
    : [];
  if (
    !situational
    || situational.taskIds?.length !== 17
    || situational.topicIds?.length !== 34
    || situational.vocabularyIds?.length !== 200
    || situational.grammarRowIds?.length !== 0
    || situational.recognitionCharacterIds?.length !== 0
    || !exactArray(
      strands.map((strand) => strand.strandId),
      EXPECTED_STRAND_IDS,
    )
  ) {
    errors.push("HSK2 situational-dialogue scope is invalid");
  }
  for (const [field, unitField] of [
    ["taskIds", "taskIds"],
    ["topicIds", "topicIds"],
    ["vocabularyIds", "vocabularyIds"],
  ]) {
    const mapped = strands.flatMap((strand) =>
      Array.isArray(strand[field]) ? strand[field] : []
    );
    if (
      strands.some((strand) => !Array.isArray(strand[field]))
      || duplicateValues(mapped).length > 0
      || !exactSet(mapped, situational?.[unitField] ?? [])
    ) {
      errors.push(`HSK2 situational strands must partition ${field}`);
    }
  }
  if (strands.some((strand) => !validText(strand.focus, 20, 300))) {
    errors.push("HSK2 situational strand focus is invalid");
  }

  const sentenceChains = unitScopes.find(
    (unit) => unit.unitId === "hsk2-sentence-chains",
  );
  const grammarModules = Array.isArray(sentenceChains?.grammarModules)
    ? sentenceChains.grammarModules
    : [];
  if (
    !sentenceChains
    || sentenceChains.taskIds?.length !== 0
    || sentenceChains.topicIds?.length !== 0
    || sentenceChains.vocabularyIds?.length !== 0
    || sentenceChains.grammarRowIds?.length !== 75
    || sentenceChains.recognitionCharacterIds?.length !== 0
    || !exactArray(
      grammarModules.map((module) => module.moduleId),
      EXPECTED_GRAMMAR_MODULE_IDS,
    )
  ) {
    errors.push("HSK2 sentence-chain scope is invalid");
  }
  const moduleGrammarIds = grammarModules.flatMap((module) =>
    Array.isArray(module.grammarRowIds) ? module.grammarRowIds : []
  );
  if (
    grammarModules.some(
      (module) =>
        !validText(module.focus, 20, 300)
        || !Array.isArray(module.grammarRowIds),
    )
    || duplicateValues(moduleGrammarIds).length > 0
    || !exactSet(moduleGrammarIds, sentenceChains?.grammarRowIds ?? [])
  ) {
    errors.push("HSK2 grammar modules must partition all grammar rows");
  }

  const shortText = unitScopes.find(
    (unit) => unit.unitId === "hsk2-short-text-production",
  );
  const productionStages = Array.isArray(shortText?.productionStages)
    ? shortText.productionStages
    : [];
  if (
    !shortText
    || shortText.taskIds?.length !== 0
    || shortText.topicIds?.length !== 0
    || shortText.vocabularyIds?.length !== 0
    || shortText.grammarRowIds?.length !== 0
    || shortText.recognitionCharacterIds?.length !== 125
    || !exactArray(
      productionStages.map((stage) => stage.stageId),
      EXPECTED_PRODUCTION_STAGES,
    )
  ) {
    errors.push("HSK2 short-text production scope is invalid");
  }
  if (productionStages.some(
    (stage) =>
      !validText(stage.mode, 10, 100)
      || !Array.isArray(stage.skills)
      || stage.skills.length !== 2
      || stage.skills.some((skill) => !SKILLS.has(skill))
      || !Number.isInteger(stage.minimumPromptUnits)
      || stage.minimumPromptUnits < 8,
  )) {
    errors.push("HSK2 production-stage contract is invalid");
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      units: unitScopes.length,
      situationalStrands: strands.length,
      grammarModules: grammarModules.length,
      productionStages: productionStages.length,
      plannedLessonBlueprints: unitScopes.reduce(
        (total, unit) => total + (unit.plannedLessonBlueprints ?? 0),
        0,
      ),
      ...summary,
    },
  };
};

export const assertValidHsk2CurriculumScopeBundle = (bundle) => {
  const result = validateHsk2CurriculumScopeBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK2 curriculum scope:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
