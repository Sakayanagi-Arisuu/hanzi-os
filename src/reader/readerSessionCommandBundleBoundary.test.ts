import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const readerDirectory = dirname(fileURLToPath(import.meta.url));
const repositorySource = realpathSync(resolve(readerDirectory, ".."));
const entry = realpathSync(resolve(
  repositorySource,
  "learning/normalizedReaderSessionCommands.ts",
));
const forbidden = new Set([
  realpathSync(resolve(repositorySource, "data/curriculum.ts")),
  realpathSync(resolve(
    repositorySource,
    "learning/normalizedReaderCommands.ts",
  )),
]);

const hasRuntimeImportBindings = (clause: ts.ImportClause | undefined) => {
  if (!clause) return true;
  if (clause.isTypeOnly) return false;
  if (clause.name) return true;
  const bindings = clause.namedBindings;
  if (!bindings || ts.isNamespaceImport(bindings)) return Boolean(bindings);
  return bindings.elements.some((element) => !element.isTypeOnly);
};

const runtimeSpecifiers = (path: string) => {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  return source.statements.flatMap((statement) => {
    if (
      ts.isImportDeclaration(statement)
      && ts.isStringLiteral(statement.moduleSpecifier)
      && hasRuntimeImportBindings(statement.importClause)
    ) {
      return [statement.moduleSpecifier.text];
    }
    if (
      ts.isExportDeclaration(statement)
      && !statement.isTypeOnly
      && statement.moduleSpecifier
      && ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      return [statement.moduleSpecifier.text];
    }
    return [];
  });
};

const resolveTypeScriptImport = (owner: string, specifier: string) => {
  if (!specifier.startsWith(".")) return null;
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

describe("normalized Reader session command bundle boundary", () => {
  it("cannot transitively import the legacy answer-bearing curriculum", () => {
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
        throw new Error(
          `Answer-bearing Reader command import chain:\n${chain.join(
            "\n -> ",
          )}`,
        );
      }

      const source = readFileSync(current, "utf8");
      expect(source).not.toMatch(/\bRELEASED_STORIES\b/u);
      for (const specifier of runtimeSpecifiers(current)) {
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
