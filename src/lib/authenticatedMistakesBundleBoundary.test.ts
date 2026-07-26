import {
  existsSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const libraryDirectory = dirname(fileURLToPath(import.meta.url));
const repositorySource = realpathSync(resolve(libraryDirectory, ".."));
const authenticatedEntry = resolve(
  repositorySource,
  "screens/AuthenticatedMistakesPage.tsx",
);
const localEntry = realpathSync(resolve(
  repositorySource,
  "screens/LocalMistakesPage.tsx",
));
const routerEntry = resolve(repositorySource, "screens/MistakesPage.tsx");
const curriculum = realpathSync(resolve(
  repositorySource,
  "data/curriculum.ts",
));

const imports = (source: string) => [...source.matchAll(
  /(?:from\s+|import\s*\(\s*)["'](\.\.?\/[^"']+)["']/gu,
)].map((match) => match[1]!);

const staticImports = (source: string) => [...source.matchAll(
  /import\s+(?!\()(?:(?:type\s+)?[\s\S]*?\s+from\s+)?["']([^"']+)["'];/gu,
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

describe("authenticated remediation bundle boundary", () => {
  it("loads local and authenticated mistake surfaces through separate chunks", () => {
    const source = readFileSync(routerEntry, "utf8");
    const specifiers = staticImports(source);

    expect(specifiers).not.toContain("./LocalMistakesPage");
    expect(specifiers).not.toContain("./AuthenticatedMistakesPage");
    expect(source).toContain('import("./LocalMistakesPage")');
    expect(source).toContain('import("./AuthenticatedMistakesPage")');
  });

  it("keeps answer-bearing local state out of the authenticated surface", () => {
    const source = readFileSync(authenticatedEntry, "utf8");
    const specifiers = imports(source);

    expect(specifiers).not.toContain("../store/LearningStore");
    expect(specifiers).not.toContain("../data/curriculum");
    expect(specifiers).not.toContain("./LocalMistakesPage");
    expect(source).not.toMatch(/\bcorrectAnswer\b/u);
    expect(source).not.toMatch(/\bresolveMistake\b/u);
    expect(source).toContain("chưa khả dụng");
  });

  it("cannot transitively reach local remediation answers or curriculum", () => {
    const forbidden = new Set([localEntry, curriculum]);
    const pending = [authenticatedEntry];
    const visited = new Set<string>();

    while (pending.length) {
      const current = realpathSync(pending.pop()!);
      if (visited.has(current)) continue;
      visited.add(current);
      if (forbidden.has(current)) {
        throw new Error(
          `Authenticated remediation reached forbidden module: ${current}`,
        );
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
          pending.push(realpathSync(dependency));
        }
      }
    }
  });
});
