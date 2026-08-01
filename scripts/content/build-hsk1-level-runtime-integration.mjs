import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK1_LEVEL_CORE_RELATIVE_PATH,
} from "../../src/content/hsk1LevelBatch.mjs";

const CURRENT_LOCAL_STUDY_VERSION = "foundation-2026.08.3";

const GRAPH_PATH = "content/curriculum/hsk0-4-graph.json";
const RELEASE_PATH = "content/curriculum/hsk0-4-unit-release-policy.json";
const serialized = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (root, relativePath) => JSON.parse(readFileSync(
  resolve(root, relativePath),
  "utf8",
));

const project = (root) => {
  const core = readJson(root, HSK1_LEVEL_CORE_RELATIVE_PATH);
  const graph = readJson(root, GRAPH_PATH);
  const release = readJson(root, RELEASE_PATH);
  const hsk1LessonIdsByUnit = new Map();
  for (const lesson of core.lessons) {
    const lessonIds = hsk1LessonIdsByUnit.get(lesson.unitId) ?? [];
    lessonIds.push(lesson.runtimeLessonId);
    hsk1LessonIdsByUnit.set(lesson.unitId, lessonIds);
  }
  const projectedGraph = {
    ...graph,
    runtimeContentVersion: CURRENT_LOCAL_STUDY_VERSION,
    units: graph.units.map((unit) => unit.pathId === "hsk1"
      ? { ...unit, status: "foundation" }
      : unit),
    lessonMappings: [
      ...graph.lessonMappings.filter((mapping) =>
        graph.units.find((unit) => unit.unitId === mapping.unitId)?.pathId
          === "hsk0"
      ),
      ...core.lessons.map((lesson) => ({
        lessonId: lesson.runtimeLessonId,
        unitId: lesson.unitId,
        mappingState: "partial",
        officialVocabularyIds: [...lesson.payload.wordIds],
        unmappedRuntimeWordIds: [],
      })),
      ...graph.lessonMappings.filter((mapping) => {
        const pathId = graph.units.find(
          (unit) => unit.unitId === mapping.unitId,
        )?.pathId;
        return pathId !== "hsk0" && pathId !== "hsk1";
      }),
    ],
  };
  const projectedRelease = {
    ...release,
    runtimeContentVersion: CURRENT_LOCAL_STUDY_VERSION,
    units: [
      ...release.units.filter((unit) => graph.units.find(
        (candidate) => candidate.unitId === unit.unitId,
      )?.pathId === "hsk0"),
      ...projectedGraph.units
        .filter((unit) => unit.pathId === "hsk1")
        .map((unit) => ({
          unitId: unit.unitId,
          lessonIds: hsk1LessonIdsByUnit.get(unit.unitId) ?? [],
        })),
      ...release.units.filter((unit) => {
        const pathId = graph.units.find(
          (candidate) => candidate.unitId === unit.unitId,
        )?.pathId;
        return pathId !== "hsk0" && pathId !== "hsk1";
      }),
    ],
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
      hsk1Lessons: projected.graph.lessonMappings.filter((mapping) =>
        mapping.unitId.startsWith("hsk1-")
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
