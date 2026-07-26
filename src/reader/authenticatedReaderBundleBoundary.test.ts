import {
  existsSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const readerDirectory = dirname(fileURLToPath(import.meta.url));
const repositorySource = realpathSync(resolve(readerDirectory, ".."));
const authenticatedEntry = resolve(
  repositorySource,
  "screens/AuthenticatedReaderPage.tsx",
);
const readerRouterEntry = resolve(repositorySource, "screens/ReaderPage.tsx");
const authoritativeBank = realpathSync(resolve(
  repositorySource,
  "server/authoritativeReaderItemBank.ts",
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

describe("authenticated Reader client bundle boundary", () => {
  it("loads local and authenticated Reader surfaces through separate chunks", () => {
    const source = readFileSync(readerRouterEntry, "utf8");
    const specifiers = staticImports(source);

    expect(specifiers).not.toContain("./LocalReaderPage");
    expect(specifiers).not.toContain("./AuthenticatedReaderPage");
    expect(source).toContain('import("./LocalReaderPage")');
    expect(source).toContain('import("./AuthenticatedReaderPage")');
  });

  it("does not import the public answer-bearing story bank in the authenticated surface", () => {
    const source = readFileSync(authenticatedEntry, "utf8");
    const specifiers = imports(source);

    expect(specifiers).not.toContain("../data/curriculum");
    expect(specifiers).not.toContain(
      "../learning/normalizedReaderCommands",
    );
    expect(specifiers).not.toContain("./LocalReaderPage");
    expect(specifiers).toContain(
      "../learning/normalizedReaderSessionCommands",
    );
    expect(source).not.toMatch(/\bRELEASED_STORIES\b/u);
    expect(source).not.toMatch(/\bcorrectAnswer\b/u);
  });

  it("cannot transitively import the server-confidential Reader bank", () => {
    const pending = [authenticatedEntry];
    const visited = new Set<string>();
    const parent = new Map<string, string>();

    while (pending.length) {
      const current = realpathSync(pending.pop()!);
      if (visited.has(current)) continue;
      visited.add(current);
      if (current === authoritativeBank) {
        const chain = [current];
        let owner = parent.get(current);
        while (owner) {
          chain.unshift(owner);
          owner = parent.get(owner);
        }
        throw new Error(
          `Server-confidential Reader import chain:\n${chain.join("\n -> ")}`,
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
          const resolvedDependency = realpathSync(dependency);
          if (!parent.has(resolvedDependency)) {
            parent.set(resolvedDependency, current);
          }
          pending.push(resolvedDependency);
        }
      }
    }
  });
});
