import { readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const assessmentDirectory = dirname(fileURLToPath(import.meta.url));
const roots = [
  "assessmentSessionProtocol.ts",
  "assessmentAttemptProtocol.ts",
  "assessmentSubmissionProtocol.ts",
  "assessmentAbandonmentProtocol.ts",
].map((file) => resolve(assessmentDirectory, file));
roots.push(resolve(
  assessmentDirectory,
  "../learning/assessmentResumeProtocol.ts",
));

const imports = (source: string) => [...source.matchAll(
  /(?:from\s+|import\s*)["'](\.\.?\/[^"']+)["']/gu,
)].map((match) => match[1]!);

const resolveTypeScriptImport = (owner: string, specifier: string) => {
  const candidate = resolve(dirname(owner), specifier);
  return extname(candidate) ? candidate : `${candidate}.ts`;
};

describe("assessment shared-protocol bundle boundary", () => {
  it("cannot transitively import the answer-bearing compatibility bank", () => {
    const pending = [...roots];
    const visited = new Set<string>();
    const forbidden = resolve(assessmentDirectory, "../data/assessment.ts");
    while (pending.length) {
      const current = pending.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      expect(current).not.toBe(forbidden);
      const source = readFileSync(current, "utf8");
      for (const specifier of imports(source)) {
        const dependency = resolveTypeScriptImport(current, specifier);
        if (!dependency.endsWith(".test.ts")) pending.push(dependency);
      }
    }
  });
});
