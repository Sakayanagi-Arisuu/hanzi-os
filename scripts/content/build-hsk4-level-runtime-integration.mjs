import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  HSK4_LEVEL_CORE_RELATIVE_PATH,
  HSK4_LEVEL_TARGET_VERSION,
} from "../../src/content/hsk4LevelBatch.mjs";
import { loadHskSyllabusBundle } from "../../src/content/hskSyllabusInventory.mjs";

const GRAPH_PATH = "content/curriculum/hsk0-4-graph.json";
const RELEASE_PATH = "content/curriculum/hsk0-4-unit-release-policy.json";
const readJson = (root, relativePath) => JSON.parse(readFileSync(
  resolve(root, relativePath),
  "utf8",
));
const serialized = (value) => `${JSON.stringify(value, null, 2)}\n`;
const normalizePinyin = (value) => value.normalize("NFKC")
  .toLocaleLowerCase("en")
  .replace(/[\s'’/-]/gu, "");

const project = (root) => {
  const core = readJson(root, HSK4_LEVEL_CORE_RELATIVE_PATH);
  const graph = readJson(root, GRAPH_PATH);
  const release = readJson(root, RELEASE_PATH);
  const runtime = readJson(
    root,
    `content/packages/${HSK4_LEVEL_TARGET_VERSION}/runtime-catalog.json`,
  );
  const syllabus = loadHskSyllabusBundle(root);
  const vocabularyById = new Map(runtime.vocabulary.map((item) => [item.id, item]));
  const officialByWord = new Map();
  for (const item of syllabus.inventory.vocabulary) {
    const candidates = officialByWord.get(item.word) ?? [];
    candidates.push(item);
    officialByWord.set(item.word, candidates);
  }
  const officialVocabularyIds = (lesson) => {
    const ids = [];
    for (const wordId of lesson.payload.wordIds) {
      const word = vocabularyById.get(wordId);
      const candidates = officialByWord.get(word.simplified) ?? [];
      const match = candidates.find((candidate) =>
        normalizePinyin(candidate.pinyin) === normalizePinyin(word.pinyin)
      ) ?? candidates[0];
      if (match && !ids.includes(match.id)) ids.push(match.id);
    }
    return ids;
  };
  const lessonsByUnit = new Map();
  for (const lesson of core.lessons) {
    const ids = lessonsByUnit.get(lesson.unitId) ?? [];
    ids.push(lesson.runtimeLessonId);
    lessonsByUnit.set(lesson.unitId, ids);
  }
  const projectedGraph = {
    ...graph,
    runtimeContentVersion: HSK4_LEVEL_TARGET_VERSION,
    units: graph.units.map((unit) => unit.pathId === "hsk4"
      ? { ...unit, status: "foundation" }
      : unit),
    lessonMappings: [
      ...graph.lessonMappings.filter((mapping) => !mapping.unitId.startsWith("hsk4-")),
      ...core.lessons.map((lesson) => ({
        lessonId: lesson.runtimeLessonId,
        unitId: lesson.unitId,
        mappingState: "partial",
        officialVocabularyIds: officialVocabularyIds(lesson),
        unmappedRuntimeWordIds: [],
      })),
    ],
  };
  const projectedRelease = {
    ...release,
    runtimeContentVersion: HSK4_LEVEL_TARGET_VERSION,
    units: [
      ...release.units.filter((unit) => !unit.unitId.startsWith("hsk4-")),
      ...projectedGraph.units.filter((unit) => unit.pathId === "hsk4").map((unit) => ({
        unitId: unit.unitId,
        lessonIds: lessonsByUnit.get(unit.unitId) ?? [],
      })),
    ],
  };
  return { graph: projectedGraph, release: projectedRelease };
};

const root = process.cwd();
const projected = project(root);
const outputs = [[GRAPH_PATH, projected.graph], [RELEASE_PATH, projected.release]];
const check = process.argv.includes("--check");
if (!check && !process.argv.includes("--write")) throw new Error("Use --write or --check");
for (const [relativePath, value] of outputs) {
  const outputPath = resolve(root, relativePath);
  const content = serialized(value);
  if (check) {
    if (readFileSync(outputPath, "utf8") !== content) throw new Error(`${relativePath} is stale`);
  } else writeFileSync(outputPath, content, "utf8");
}
console.log(JSON.stringify({
  valid: true,
  mode: check ? "check" : "write",
  summary: {
    hsk4Lessons: projected.graph.lessonMappings.filter(
      (mapping) => mapping.unitId.startsWith("hsk4-"),
    ).length,
    releasedUnits: projected.release.units.length,
    runtimeContentVersion: projected.graph.runtimeContentVersion,
  },
}, null, 2));
