import {
  existsSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import ts from "typescript";

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

const imports = (source: string) => {
  const file = ts.createSourceFile("consumer.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly
      && ts.isStringLiteral(node.moduleSpecifier)) result.push(node.moduleSpecifier.text);
    if (ts.isExportDeclaration(node) && !node.isTypeOnly
      && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) result.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) result.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return result.filter(value => value.startsWith("."));
};

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
    // Post-answer receipts may carry correctAnswer. The boundary concerns
    // importing the answer bank before submission, not rendering that receipt.
    expect(source).not.toMatch(/\bresolveMistake\b/u);
    expect(source).toContain("/api/learning/mistakes");
    expect(source).toContain('source: "mistake"');
  });

  it("cannot transitively reach local remediation answers or curriculum", () => {
    const forbidden = new Set([
      localEntry,
      curriculum,
      realpathSync(resolve(repositorySource, "store/LearningStore.tsx")),
      realpathSync(resolve(repositorySource, "lib/exerciseGeneration.ts")),
      realpathSync(resolve(repositorySource, "lib/editorialExerciseGeneration.ts")),
      realpathSync(resolve(repositorySource, "server/authoritativeItemBank.ts")),
      realpathSync(resolve(repositorySource, "server/editorialItemBank.ts")),
      realpathSync(resolve(repositorySource, "server/remediationAttemptFeedback.ts")),
    ]);
    const pending = [authenticatedEntry];
    const consumer = new Map<string, string>();
    const visited = new Set<string>();

    while (pending.length) {
      const current = realpathSync(pending.pop()!);
      if (visited.has(current)) continue;
      visited.add(current);
      if (forbidden.has(current)) {
        const chain = [current];
        while (consumer.has(chain[0]!)) chain.unshift(consumer.get(chain[0]!)!);
        throw new Error(
          `Authenticated remediation reached forbidden module: ${chain.join(" -> ")}`,
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
          const target = realpathSync(dependency);
          if (!consumer.has(target)) consumer.set(target, current);
          pending.push(target);
        }
      }
    }
  });
});
