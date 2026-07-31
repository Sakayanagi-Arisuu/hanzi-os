import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHskCurriculumGraphBundle,
  loadHskCurriculumGraphBundle,
} from "./hskCurriculumGraph.mjs";
import { authoringGraphSha256ForPath } from "./hskAuthoringScopeBinding.mjs";

export const HSK1_CURRICULUM_SCOPE_RELATIVE_PATH =
  "content/curriculum/hsk1-scope.json";

const SKILLS = new Set(["listening", "reading", "speaking", "writing"]);

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

const exactSet = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());

export const loadHsk1CurriculumScopeBundle = (root = process.cwd()) => {
  const graphBundle = loadHskCurriculumGraphBundle(root);
  const scopePath = join(root, HSK1_CURRICULUM_SCOPE_RELATIVE_PATH);
  return {
    graphBundle,
    scopePath,
    scope: JSON.parse(readFileSync(scopePath, "utf8")),
  };
};

export const validateHsk1CurriculumScopeBundle = ({
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
    return { valid: false, errors: ["HSK1 curriculum scope schemaVersion must be 1"] };
  }
  if (
    scope.graphId !== graphBundle.graph.graphId
    || scope.graphSha256 !== authoringGraphSha256ForPath("hsk1")
    || scope.source?.sourceId !== graphBundle.syllabus.source.sourceId
    || scope.source?.inventorySha256 !== graphBundle.syllabus.inventorySha256
    || scope.source?.effective !== graphBundle.syllabus.source.effective
  ) {
    errors.push("HSK1 scope source or graph binding is stale");
  }
  if (
    scope.pathId !== "hsk1"
    || scope.state !== "authoring-scope"
    || scope.learnerVisible !== false
    || scope.releaseEligible !== false
  ) {
    errors.push("HSK1 scope must remain learner-hidden authoring input");
  }
  if (
    scope.mappingPolicy?.primaryUnitCardinality !== "exactly-one"
    || scope.mappingPolicy?.scopeIsLessonCoverage !== false
    || scope.mappingPolicy?.scopeGrantsMastery !== false
  ) {
    errors.push("HSK1 scope mapping policy must not imply learning coverage");
  }
  if (
    scope.coverageClaims?.officialInventoryScoped !== true
    || scope.coverageClaims?.lessonPracticeCoverageComplete !== false
    || scope.coverageClaims?.hsk1Complete !== false
  ) {
    errors.push("HSK1 scope coverage claims are invalid");
  }

  const hsk1Path = graphBundle.graph.paths.find(
    (path) => path.pathId === "hsk1",
  );
  if (!Array.isArray(scope.unitScopes)) {
    errors.push("HSK1 unitScopes must be an array");
    return { valid: false, errors };
  }
  const scopeUnitIds = scope.unitScopes.map((unit) => unit.unitId);
  if (
    !hsk1Path
    || JSON.stringify(scopeUnitIds) !== JSON.stringify(hsk1Path.unitIds)
  ) {
    errors.push("HSK1 scope units must exactly follow the graph path");
  }
  for (const duplicate of duplicateValues(scopeUnitIds)) {
    errors.push(`duplicate HSK1 scope unit ${duplicate}`);
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
      .filter((item) => item.level === 1)
      .map((item) => item.id);
    const mappedIds = scope.unitScopes.flatMap((unit) =>
      Array.isArray(unit[field]) ? unit[field] : []
    );
    if (
      scope.unitScopes.some((unit) => !Array.isArray(unit[field]))
      || duplicateValues(mappedIds).length > 0
      || !exactSet(mappedIds, officialIds)
    ) {
      errors.push(`${field} must exactly partition the official HSK1 inventory`);
    }
    summary[section] = new Set(mappedIds).size;
  }

  const evidenceModes = [];
  for (const unit of scope.unitScopes) {
    if (
      typeof unit.focus !== "string"
      || unit.focus.length < 20
      || !isRecord(unit.exitEvidence)
      || typeof unit.exitEvidence.mode !== "string"
      || unit.exitEvidence.mode.length < 3
      || !Array.isArray(unit.exitEvidence.skills)
      || unit.exitEvidence.skills.length < 2
      || unit.exitEvidence.skills.some((skill) => !SKILLS.has(skill))
      || unit.exitEvidence.reviewedRubricRequired !== true
    ) {
      errors.push(`${unit.unitId} authoring focus or exit evidence is invalid`);
      continue;
    }
    evidenceModes.push(unit.exitEvidence.mode);
  }
  if (duplicateValues(evidenceModes).length > 0) {
    errors.push("HSK1 units must use distinct exit-evidence modes");
  }

  const characterUnit = scope.unitScopes.find(
    (unit) => unit.unitId === "hsk1-character-foundation",
  );
  if (
    !characterUnit
    || characterUnit.recognitionCharacterIds.length !== 246
    || ["taskIds", "topicIds", "vocabularyIds", "grammarRowIds"].some(
      (field) => characterUnit[field].length !== 0,
    )
  ) {
    errors.push("HSK1 character inventory must remain isolated in its practice unit");
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      units: scope.unitScopes.length,
      ...summary,
    },
  };
};

export const assertValidHsk1CurriculumScopeBundle = (bundle) => {
  const result = validateHsk1CurriculumScopeBundle(bundle);
  if (!result.valid) {
    throw new Error(`Invalid HSK1 curriculum scope:\n- ${result.errors.join("\n- ")}`);
  }
  return result;
};
