import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

const assessmentDirectory = dirname(fileURLToPath(import.meta.url));
const sourceRoot = realpathSync(resolve(assessmentDirectory, ".."));
const entry = resolve(sourceRoot, "screens/MockExamsPage.tsx");
const forbidden = new Set([
  realpathSync(resolve(sourceRoot, "server/hskMockExamBank.ts")),
  realpathSync(resolve(sourceRoot, "server/authoritativeAssessmentItemBank.ts")),
  ...[1, 2, 3, 4].map((level) =>
    realpathSync(resolve(sourceRoot, `data/hsk${level}LevelCheck.ts`))
  ),
]);

const imports = (source: string) => [...source.matchAll(
  /(?:from\s+|import\s*\(\s*)["'](\.\.?\/[^"']+)["']/gu,
)].map((match) => match[1]!);

const resolveImport = (owner: string, specifier: string) => {
  const candidate = resolve(dirname(owner), specifier);
  const candidates = extname(candidate)
    ? [candidate]
    : [`${candidate}.ts`, `${candidate}.tsx`, resolve(candidate, "index.ts")];
  return candidates.find((path) => existsSync(path)) ?? null;
};

describe("Mock Exam client bundle boundary", () => {
  it("cannot transitively import answer-bearing banks", () => {
    const pending = [entry];
    const visited = new Set<string>();
    while (pending.length) {
      const current = realpathSync(pending.pop()!);
      if (visited.has(current)) continue;
      visited.add(current);
      if (forbidden.has(current)) {
        throw new Error(`Mock Exam client imports answer-bearing source: ${current}`);
      }
      for (const specifier of imports(readFileSync(current, "utf8"))) {
        const dependency = resolveImport(current, specifier);
        if (dependency && dependency.startsWith(sourceRoot) && !dependency.includes(".test.")) {
          pending.push(dependency);
        }
      }
    }
  });
});
