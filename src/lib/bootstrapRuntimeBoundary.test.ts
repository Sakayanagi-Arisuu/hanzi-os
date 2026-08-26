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
  it("keeps the full application stylesheet behind route-specific boundaries", () => {
    const rootLayout = readSource("app/layout.tsx");
    const onboardedRuntime = readSource("src/OnboardedLearningRuntime.tsx");

    expect(rootLayout).toContain('import "../src/critical.css"');
    expect(rootLayout).not.toContain('import "../src/styles.css"');
    expect(onboardedRuntime).toContain(
      'import { FullStyleBoundary } from "./components/FullStyleBoundary"',
    );
    expect(readSource("src/components/FullStyleBoundary.tsx")).toContain(
      'import "../styles.css"',
    );
  });

  it("recovers localhost before a stale worker can serve the client bundle", () => {
    const rootLayout = readSource("app/layout.tsx");
    const app = readSource("src/App.tsx");
    const recoveryPage = readSource("public/dev-recover.html");

    expect(rootLayout).toContain("DEVELOPMENT_SERVICE_WORKER_RECOVERY_SCRIPT");
    expect(rootLayout).toContain("navigator.serviceWorker.getRegistrations()");
    expect(rootLayout).toContain('key.startsWith("hanzi-os-")');
    expect(rootLayout).toContain("window.location.reload()");
    expect(rootLayout).toContain("<head>");
    expect(rootLayout.indexOf("<head>")).toBeLessThan(
      rootLayout.indexOf("<body>"),
    );
    expect(app).toContain("recoverLocalLazyRoute");
    expect(app).toContain("/dev-recover.html?returnTo=");
    expect(app).toContain('recoverLocalLazyRoute("mock-exam", error)');
    expect(app).toContain('recoverLocalLazyRoute("review", error)');
    expect(recoveryPage).toContain("navigator.serviceWorker.getRegistrations()");
    expect(recoveryPage).toContain('key.startsWith("hanzi-os-")');
    expect(recoveryPage).toContain('searchParams.set("dev-recovered", "v15")');
    expect(recoveryPage).not.toContain("localStorage");
    expect(recoveryPage).not.toContain("indexedDB");
  });

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
    expect(clientRuntime).toContain(
      'import("../src/components/FirstRunExperience")',
    );
  });

  it("keeps the public landing and setup outside the onboarded route graph", () => {
    const firstRun = readSource("src/components/FirstRunExperience.tsx");
    const firstRunImports = staticSpecifiers(firstRun);

    expect(firstRunImports).toEqual(expect.arrayContaining([
      "./PublicLanding",
      "./SystemOnboarding",
    ]));
    expect(firstRunImports).not.toContain("react-router");
    expect(firstRunImports).not.toContain("../App");
    expect(firstRunImports).not.toContain("../styles.css");
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
