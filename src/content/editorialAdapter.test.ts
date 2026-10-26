import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateEditorialAdapter } from "../../scripts/content/validate-editorial-adapter.mjs";

describe("editorial runtime integrity", () => {
  it("validates the derivative separately without changing the foundation manifest", () => {
    expect(validateEditorialAdapter()).toMatchObject({ valid: true, humanReviewed: false });
  });
  it("rejects scoring drift and missing bindings", () => {
    for (const target of ["src/server/editorialAttemptScoring.ts", "src/lib/editorialExerciseGeneration.ts"]) {
      expect(() => validateEditorialAdapter((path: string) =>
        readFileSync(path, "utf8") + (path === target ? "\n// changed" : ""),
      )).toThrow(/digest mismatch/);
    }
    expect(() => validateEditorialAdapter((path: string) => {
      const text = readFileSync(path, "utf8");
      return path.endsWith("lexical-editorial-adapter.json") ? text.replace('"humanReviewed": false', '"humanReviewed": true') : text;
    })).toThrow(/review binding/);
  });
});
