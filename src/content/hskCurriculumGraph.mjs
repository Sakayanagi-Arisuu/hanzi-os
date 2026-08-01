import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  fileSha256,
  loadHskSyllabusBundle,
} from "./hskSyllabusInventory.mjs";

export const HSK_CURRICULUM_GRAPH_RELATIVE_PATH =
  "content/curriculum/hsk0-4-graph.json";

const PATH_IDS = ["hsk0", "hsk1", "hsk2", "hsk3", "hsk4"];
const RELEASED_STATES = new Set(["beta", "published"]);
const UNIT_STATES = new Set(["foundation", "planned"]);
const PLACEMENT_POLICIES = new Set([
  "open-foundation",
  "verified-placement-or-prerequisite-completion",
]);

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const normalizePinyin = (value) =>
  value.normalize("NFKC").toLocaleLowerCase("en")
    .replace(/[\s'’/-]/g, "");

const exactArray = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

const detectCycles = (nodes, dependencies, label) => {
  const errors = [];
  const visiting = new Set();
  const visited = new Set();
  const visit = (id) => {
    if (visiting.has(id)) {
      errors.push(`${label} cycle detected at ${id}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of dependencies(id)) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const node of nodes) visit(node);
  return errors;
};

export const loadHskCurriculumGraphBundle = (root = process.cwd()) => {
  const graphPath = join(root, HSK_CURRICULUM_GRAPH_RELATIVE_PATH);
  const syllabus = loadHskSyllabusBundle(root);
  const registry = readJson(join(root, "content/registry.json"));
  const current = registry.packages.find(
    (item) => item.contentVersion === registry.currentContentVersion,
  );
  if (!current) throw new Error("Current content package is missing from registry");
  const runtimePath = join(root, "content", current.relativePath, "runtime-catalog.json");
  return {
    graphPath,
    graph: readJson(graphPath),
    graphSha256: fileSha256(graphPath),
    syllabus,
    runtime: readJson(runtimePath),
  };
};

export const validateHskCurriculumGraphBundle = ({
  graph,
  syllabus,
  runtime,
}) => {
  const errors = [];
  if (!isRecord(graph) || graph.schemaVersion !== 1) {
    return { valid: false, errors: ["curriculum graph schemaVersion must be 1"] };
  }
  if (
    graph.source?.sourceId !== syllabus.source.sourceId
    || graph.source?.sourcePdfSha256 !== syllabus.source.pdfSha256
    || graph.source?.inventorySha256 !== syllabus.inventorySha256
  ) {
    errors.push("curriculum graph source binding does not match the pinned inventory");
  }
  if (
    graph.runtimeContentVersion !== runtime.contentVersion
    || runtime.contentVersion !== "foundation-2026.08.4"
  ) {
    errors.push("curriculum graph runtime content version is stale");
  }
  if (
    !isRecord(graph.coverageClaims)
    || ["hsk1", "hsk2", "hsk3", "hsk4"].some(
      (pathId) => graph.coverageClaims[pathId] !== false,
    )
  ) {
    errors.push("all HSK coverage claims must remain false");
  }
  if (!Array.isArray(graph.paths) || !Array.isArray(graph.units)) {
    errors.push("curriculum graph paths and units must be arrays");
    return { valid: false, errors };
  }
  if (!Array.isArray(graph.lessonMappings)) {
    errors.push("curriculum graph lessonMappings must be an array");
    return { valid: false, errors };
  }

  const pathIds = graph.paths.map((path) => path.pathId);
  if (!exactArray(pathIds, PATH_IDS)) {
    errors.push("curriculum paths must be exactly ordered HSK0 through HSK4");
  }
  for (const duplicate of duplicateValues(pathIds)) {
    errors.push(`duplicate curriculum path ${duplicate}`);
  }
  const pathById = new Map(graph.paths.map((path) => [path.pathId, path]));
  for (const [index, pathId] of PATH_IDS.entries()) {
    const path = pathById.get(pathId);
    if (!path) continue;
    if (path.stageIndex !== index) {
      errors.push(`${pathId} stageIndex must be ${index}`);
    }
    if (path.officialExamLevel !== (index === 0 ? null : index)) {
      errors.push(`${pathId} officialExamLevel is invalid`);
    }
    if (
      !Array.isArray(path.prerequisitePathIds)
      || !Array.isArray(path.unitIds)
      || !PLACEMENT_POLICIES.has(path.placementPolicy)
    ) {
      errors.push(`${pathId} path shape is invalid`);
      continue;
    }
    const expectedPrerequisites = index === 0 ? [] : [PATH_IDS[index - 1]];
    if (!exactArray(path.prerequisitePathIds, expectedPrerequisites)) {
      errors.push(`${pathId} must depend only on the immediately prior path`);
    }
    if (index === 0) {
      if (
        path.officialInventory !== null
        || path.placementPolicy !== "open-foundation"
      ) {
        errors.push("HSK0 must stay an internal open foundation path");
      }
    } else {
      const expected = Object.fromEntries(
        ["tasks", "topics", "vocabulary", "recognitionCharacters", "grammarRows"]
          .map((section) => [
            section,
            syllabus.inventory.counts[section][String(index)],
          ]),
      );
      if (JSON.stringify(path.officialInventory) !== JSON.stringify(expected)) {
        errors.push(`${pathId} official inventory counts are stale`);
      }
      if (
        path.placementPolicy
        !== "verified-placement-or-prerequisite-completion"
      ) {
        errors.push(`${pathId} cannot open from self-declaration alone`);
      }
    }
  }
  errors.push(...detectCycles(
    pathIds,
    (id) => pathById.get(id)?.prerequisitePathIds ?? [],
    "curriculum path",
  ));

  const unitIds = graph.units.map((unit) => unit.unitId);
  for (const duplicate of duplicateValues(unitIds)) {
    errors.push(`duplicate curriculum unit ${duplicate}`);
  }
  const unitById = new Map(graph.units.map((unit) => [unit.unitId, unit]));
  for (const path of graph.paths) {
    const orderedUnits = graph.units
      .filter((unit) => unit.pathId === path.pathId)
      .sort((left, right) => left.sequence - right.sequence);
    if (
      !exactArray(
        orderedUnits.map((unit) => unit.sequence),
        orderedUnits.map((_, index) => index + 1),
      )
    ) {
      errors.push(`${path.pathId} unit sequence must be contiguous from 1`);
    }
    if (!exactArray(path.unitIds, orderedUnits.map((unit) => unit.unitId))) {
      errors.push(`${path.pathId} unitIds do not match its ordered units`);
    }
  }
  for (const unit of graph.units) {
    if (!pathById.has(unit.pathId)) {
      errors.push(`${unit.unitId} references missing path ${unit.pathId}`);
    }
    if (
      !Number.isInteger(unit.sequence)
      || unit.sequence < 1
      || !UNIT_STATES.has(unit.status)
      || typeof unit.title !== "string"
      || unit.title.length === 0
      || typeof unit.objective !== "string"
      || unit.objective.length === 0
      || !Array.isArray(unit.prerequisiteUnitIds)
    ) {
      errors.push(`${unit.unitId} unit shape is invalid`);
      continue;
    }
    for (const prerequisiteId of unit.prerequisiteUnitIds) {
      const prerequisite = unitById.get(prerequisiteId);
      if (!prerequisite) {
        errors.push(`${unit.unitId} has missing prerequisite ${prerequisiteId}`);
        continue;
      }
      const prerequisitePath = pathById.get(prerequisite.pathId);
      const unitPath = pathById.get(unit.pathId);
      if (
        prerequisitePath
        && unitPath
        && (
          prerequisitePath.stageIndex > unitPath.stageIndex
          || (
            prerequisitePath.stageIndex === unitPath.stageIndex
            && prerequisite.sequence >= unit.sequence
          )
        )
      ) {
        errors.push(
          `${unit.unitId} prerequisite ${prerequisiteId} is not earlier in the graph`,
        );
      }
    }
  }
  errors.push(...detectCycles(
    unitIds,
    (id) => unitById.get(id)?.prerequisiteUnitIds ?? [],
    "curriculum unit",
  ));

  const releasedLessons = runtime.lessons.filter((lesson) =>
    RELEASED_STATES.has(lesson.releaseState)
  );
  const releasedLessonIds = releasedLessons.map((lesson) => lesson.id);
  const mappedLessonIds = graph.lessonMappings.map((mapping) => mapping.lessonId);
  for (const duplicate of duplicateValues(mappedLessonIds)) {
    errors.push(`duplicate lesson mapping ${duplicate}`);
  }
  if (
    !exactArray(
      [...mappedLessonIds].sort(),
      [...releasedLessonIds].sort(),
    )
  ) {
    errors.push("lesson mappings must cover every and only released lesson");
  }

  const vocabularyById = new Map(
    runtime.vocabulary.map((item) => [item.id, item]),
  );
  const officialByWord = new Map();
  for (const item of syllabus.inventory.vocabulary) {
    const matches = officialByWord.get(item.word) ?? [];
    matches.push(item);
    officialByWord.set(item.word, matches);
  }
  const lessonById = new Map(
    releasedLessons.map((lesson) => [lesson.id, lesson]),
  );
  for (const mapping of graph.lessonMappings) {
    const lesson = lessonById.get(mapping.lessonId);
    const unit = unitById.get(mapping.unitId);
    if (!lesson) continue;
    if (!unit || unit.status !== "foundation") {
      errors.push(`${mapping.lessonId} must map to a foundation unit`);
      continue;
    }
    if (
      mapping.mappingState !== "partial"
      || !Array.isArray(mapping.officialVocabularyIds)
      || !Array.isArray(mapping.unmappedRuntimeWordIds)
    ) {
      errors.push(`${mapping.lessonId} mapping shape is invalid`);
      continue;
    }
    const expectedOfficialIds = [];
    const expectedUnmappedIds = [];
    for (const wordId of lesson.wordIds) {
      const runtimeWord = vocabularyById.get(wordId);
      if (!runtimeWord) {
        errors.push(`${mapping.lessonId} references missing runtime word ${wordId}`);
        continue;
      }
      const candidates = officialByWord.get(runtimeWord.simplified) ?? [];
      const match = candidates.find((candidate) =>
        normalizePinyin(candidate.pinyin) === normalizePinyin(runtimeWord.pinyin)
      ) ?? candidates[0];
      if (match) {
        if (!expectedOfficialIds.includes(match.id)) {
          expectedOfficialIds.push(match.id);
        }
      } else {
        expectedUnmappedIds.push(wordId);
      }
    }
    if (!exactArray(mapping.officialVocabularyIds, expectedOfficialIds)) {
      errors.push(`${mapping.lessonId} official vocabulary mapping drifted`);
    }
    if (!exactArray(mapping.unmappedRuntimeWordIds, expectedUnmappedIds)) {
      errors.push(`${mapping.lessonId} unmapped runtime vocabulary drifted`);
    }
  }

  const mappedVocabularyIds = new Set(
    graph.lessonMappings.flatMap((mapping) => mapping.officialVocabularyIds),
  );
  return {
    valid: errors.length === 0,
    errors,
    summary: {
      paths: graph.paths.length,
      units: graph.units.length,
      releasedLessons: releasedLessons.length,
      mappedLessons: new Set(mappedLessonIds).size,
      officialVocabularyWithLessonMapping: mappedVocabularyIds.size,
    },
  };
};

export const assertValidHskCurriculumGraphBundle = (bundle) => {
  const result = validateHskCurriculumGraphBundle(bundle);
  if (!result.valid) {
    throw new Error(`Invalid HSK curriculum graph:\n- ${result.errors.join("\n- ")}`);
  }
  return result;
};
