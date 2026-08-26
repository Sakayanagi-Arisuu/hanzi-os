import {
  readFileSync,
  readdirSync,
} from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const runtimeRoots = ["app", "worker", "src"];
const forbiddenRuntimeModules = [
  "outboxEventRepository",
  "outboxPublisher",
];

const collectRuntimeSources = (relativeDirectory: string): string[] => {
  const absoluteDirectory = join(repositoryRoot, relativeDirectory);
  return readdirSync(absoluteDirectory, { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = join(relativeDirectory, entry.name);
      if (entry.isDirectory()) return collectRuntimeSources(relativePath);
      if (![".ts", ".tsx"].includes(extname(entry.name))) return [];
      if (
        entry.name.endsWith(".test.ts")
        || entry.name.endsWith(".test.tsx")
        || relativePath.endsWith(join("server", "outboxEventRepository.ts"))
        || relativePath.endsWith(join("server", "outboxPublisher.ts"))
      ) {
        return [];
      }
      return [relativePath];
    });
};

describe("transactional outbox runtime boundary", () => {
  it("keeps the unfenced publisher and lease repository out of runtime entry points", () => {
    const violations: string[] = [];
    for (const relativePath of runtimeRoots.flatMap(collectRuntimeSources)) {
      const source = readFileSync(join(repositoryRoot, relativePath), "utf8");
      for (const moduleName of forbiddenRuntimeModules) {
        if (source.includes(moduleName)) {
          violations.push(`${relativePath}: ${moduleName}`);
        }
      }
    }

    expect(violations).toEqual([]);
  }, 30_000);
});
