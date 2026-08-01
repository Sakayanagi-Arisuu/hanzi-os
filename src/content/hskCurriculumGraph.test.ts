import { describe, expect, it } from "vitest";
import {
  assertValidHskCurriculumGraphBundle,
  loadHskCurriculumGraphBundle,
  validateHskCurriculumGraphBundle,
} from "./hskCurriculumGraph.mjs";

describe("HSK0-4 curriculum graph contract", () => {
  it("binds five paths, eighteen units and every released lesson", () => {
    const result = assertValidHskCurriculumGraphBundle(
      loadHskCurriculumGraphBundle(),
    );

    expect(result.summary).toEqual({
      paths: 5,
      units: 18,
      releasedLessons: 139,
      mappedLessons: 139,
      officialVocabularyWithLessonMapping: 995,
    });
  });

  it("fails closed on source or official-count drift", () => {
    const bundle = loadHskCurriculumGraphBundle();
    const graph = structuredClone(bundle.graph);
    graph.source.inventorySha256 = `sha256:${"0".repeat(64)}`;
    graph.paths[1].officialInventory.vocabulary = 299;

    const result = validateHskCurriculumGraphBundle({ ...bundle, graph });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "curriculum graph source binding does not match the pinned inventory",
      "hsk1 official inventory counts are stale",
    ]));
  });

  it("rejects path/unit cycles and missing prerequisites", () => {
    const bundle = loadHskCurriculumGraphBundle();
    const graph = structuredClone(bundle.graph);
    graph.paths[0].prerequisitePathIds = ["hsk4"];
    graph.units[0].prerequisiteUnitIds = ["missing-unit"];

    const result = validateHskCurriculumGraphBundle({ ...bundle, graph });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "hsk0 must depend only on the immediately prior path",
      "curriculum path cycle detected at hsk0",
      "hsk0-tone-basics has missing prerequisite missing-unit",
    ]));
  });

  it("rejects invented or stale lesson vocabulary mappings", () => {
    const bundle = loadHskCurriculumGraphBundle();
    const graph = structuredClone(bundle.graph);
    graph.lessonMappings[0].officialVocabularyIds = ["hsk-vocab-02000"];
    graph.lessonMappings[1].unmappedRuntimeWordIds = ["ni"];

    const result = validateHskCurriculumGraphBundle({ ...bundle, graph });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "boot-1 official vocabulary mapping drifted",
      "boot-2 unmapped runtime vocabulary drifted",
    ]));
  });
});
