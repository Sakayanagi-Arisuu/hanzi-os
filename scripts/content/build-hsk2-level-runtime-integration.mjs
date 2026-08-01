import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK2_LEVEL_CORE_RELATIVE_PATH,
  HSK2_LEVEL_TARGET_VERSION,
} from "../../src/content/hsk2LevelBatch.mjs";
import { loadHskSyllabusBundle } from "../../src/content/hskSyllabusInventory.mjs";

const CURRENT_LOCAL_STUDY_VERSION = "foundation-2026.08.5";

const GRAPH_PATH = "content/curriculum/hsk0-4-graph.json";
const RELEASE_PATH = "content/curriculum/hsk0-4-unit-release-policy.json";
const serialized = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (root, relativePath) => JSON.parse(readFileSync(
  resolve(root, relativePath),
  "utf8",
));
const normalizePinyin = (value) => value.normalize("NFKC")
  .toLocaleLowerCase("en")
  .replace(/[\s'’/-]/gu, "");

const project = (root) => {
  const core = readJson(root, HSK2_LEVEL_CORE_RELATIVE_PATH);
  const graph = readJson(root, GRAPH_PATH);
  const release = readJson(root, RELEASE_PATH);
  const runtime = readJson(
    root,
    `content/packages/${HSK2_LEVEL_TARGET_VERSION}/runtime-catalog.json`,
  );
  const syllabus = loadHskSyllabusBundle(root);
  const vocabularyById = new Map(runtime.vocabulary.map((item) => [
    item.id,
    item,
  ]));
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
    const lessonIds = lessonsByUnit.get(lesson.unitId) ?? [];
    lessonIds.push(lesson.runtimeLessonId);
    lessonsByUnit.set(lesson.unitId, lessonIds);
  }
  const projectedGraph = {
    ...graph,
    runtimeContentVersion: CURRENT_LOCAL_STUDY_VERSION,
    units: graph.units.map((unit) => unit.pathId === "hsk2"
      ? { ...unit, status: "foundation" }
      : unit),
    lessonMappings: graph.units.flatMap((unit) => unit.pathId === "hsk2"
      ? core.lessons
        .filter((lesson) => lesson.unitId === unit.unitId)
        .map((lesson) => ({
          lessonId: lesson.runtimeLessonId,
          unitId: lesson.unitId,
          mappingState: "partial",
          officialVocabularyIds: officialVocabularyIds(lesson),
          unmappedRuntimeWordIds: [],
        }))
      : graph.lessonMappings.filter((mapping) => mapping.unitId === unit.unitId)),
  };
  const projectedRelease = {
    ...release,
    runtimeContentVersion: CURRENT_LOCAL_STUDY_VERSION,
    units: projectedGraph.units
      .filter((unit) => release.units.some(
        (candidate) => candidate.unitId === unit.unitId,
      ) || unit.pathId === "hsk2")
      .map((unit) => unit.pathId === "hsk2"
        ? ({
          unitId: unit.unitId,
          lessonIds: lessonsByUnit.get(unit.unitId) ?? [],
        })
        : release.units.find((candidate) => candidate.unitId === unit.unitId)),
  };
  return { graph: projectedGraph, release: projectedRelease };
};

const main = () => {
  const root = process.cwd();
  const projected = project(root);
  const outputs = [
    [GRAPH_PATH, projected.graph],
    [RELEASE_PATH, projected.release],
  ];
  const check = process.argv.includes("--check");
  if (!check && !process.argv.includes("--write")) {
    throw new Error("Use --write or --check");
  }
  for (const [relativePath, value] of outputs) {
    const outputPath = resolve(root, relativePath);
    const content = serialized(value);
    if (check) {
      if (readFileSync(outputPath, "utf8") !== content) {
        throw new Error(`${relativePath} is stale`);
      }
    } else {
      writeFileSync(outputPath, content, "utf8");
    }
  }
  console.log(JSON.stringify({
    valid: true,
    mode: check ? "check" : "write",
    summary: {
      hsk2Lessons: projected.graph.lessonMappings.filter((mapping) =>
        mapping.unitId.startsWith("hsk2-")
      ).length,
      releasedUnits: projected.release.units.length,
      runtimeContentVersion: projected.graph.runtimeContentVersion,
    },
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
