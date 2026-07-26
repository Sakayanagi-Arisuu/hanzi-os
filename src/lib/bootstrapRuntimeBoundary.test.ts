import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const readSource = (path: string) =>
  readFileSync(resolve(repositoryRoot, path), "utf8");

const staticSpecifiers = (source: string) => [
  ...source.matchAll(
    /import\s+(?!\()(?:(?:type\s+)?[\s\S]*?\s+from\s+)?["']([^"']+)["'];/gu,
  ),
].map((match) => match[1]!);

describe("cold bootstrap runtime boundary", () => {
  it("keeps onboarded routing and projection code behind a dynamic boundary", () => {
    const clientRuntime = readSource("app/client-runtime.tsx");
    const imports = staticSpecifiers(clientRuntime);

    expect(imports).not.toContain("react-router");
    expect(imports).not.toContain("../src/App");
    expect(imports).not.toContain(
      "../src/store/NormalizedLearningProjectionStore",
    );
    expect(imports).not.toContain("../src/sync/learningCommandOutbox");
    expect(clientRuntime).toContain(
      'import("../src/OnboardedLearningRuntime")',
    );
  });

  it("keeps identity/onboarding branching out of the onboarded route graph", () => {
    const app = readSource("src/App.tsx");
    const appImports = staticSpecifiers(app);
    expect(appImports).not.toContain("./components/SystemOnboarding");
    expect(appImports).not.toContain("./store/LearningStore");
    expect(appImports).not.toContain("./lib/bootstrapPrivacy");

    const onboardedRuntime = readSource("src/OnboardedLearningRuntime.tsx");
    const onboardedImports = staticSpecifiers(onboardedRuntime);
    expect(onboardedImports).toEqual(expect.arrayContaining([
      "react-router",
      "./App",
      "./store/NormalizedLearningProjectionStore",
    ]));
  });

  it("uses a lightweight event constant at projection bootstrap", () => {
    const projectionStore = readSource(
      "src/store/NormalizedLearningProjectionStore.tsx",
    );
    const imports = staticSpecifiers(projectionStore);
    expect(imports).toContain("../sync/learningCommandQueueEvent");
    expect(imports).not.toContain("../sync/learningCommandOutbox");
  });
});
