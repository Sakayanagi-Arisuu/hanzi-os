import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

const assessmentDirectory = dirname(fileURLToPath(import.meta.url));
const repositorySource = realpathSync(resolve(assessmentDirectory, ".."));
const entry = resolve(repositorySource, "screens/AuthenticatedAssessmentPage.tsx");
const forbidden = new Set([
  realpathSync(resolve(repositorySource, "data/assessment.ts")),
  realpathSync(resolve(
    repositorySource,
    "server/authoritativeAssessmentItemBank.ts",
  )),
]);

const imports = (source: string) => [...source.matchAll(
  /(?:from\s+|import\s*\(\s*)["'](\.\.?\/[^"']+)["']/gu,
)].map((match) => match[1]!);

const resolveTypeScriptImport = (owner: string, specifier: string) => {
  const candidate = resolve(dirname(owner), specifier);
  const candidates = extname(candidate)
    ? [candidate]
    : [
        `${candidate}.ts`,
        `${candidate}.tsx`,
        resolve(candidate, "index.ts"),
        resolve(candidate, "index.tsx"),
      ];
  return candidates.find((path) => existsSync(path)) ?? null;
};

describe("authenticated assessment client bundle boundary", () => {
  it("cannot transitively import any answer-bearing assessment bank", () => {
    const pending = [entry];
    const visited = new Set<string>();
    const parent = new Map<string, string>();
    while (pending.length) {
      const current = realpathSync(pending.pop()!);
      if (visited.has(current)) continue;
      visited.add(current);
      if (forbidden.has(current)) {
        const chain = [current];
        let owner = parent.get(current);
        while (owner) {
          chain.unshift(owner);
          owner = parent.get(owner);
        }
        throw new Error(`Answer-bearing import chain:\n${chain.join("\n -> ")}`);
      }
      const source = readFileSync(current, "utf8");
      for (const specifier of imports(source)) {
        const dependency = resolveTypeScriptImport(current, specifier);
        if (
          dependency
          && dependency.startsWith(repositorySource)
          && !dependency.endsWith(".test.ts")
          && !dependency.endsWith(".test.tsx")
        ) {
          const resolvedDependency = realpathSync(dependency);
          if (!parent.has(resolvedDependency)) parent.set(resolvedDependency, current);
          pending.push(resolvedDependency);
        }
      }
    }
  });
});
