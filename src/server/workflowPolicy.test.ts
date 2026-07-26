import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const workflowDirectory = join(repositoryRoot, ".github", "workflows");
const workflowFiles = readdirSync(workflowDirectory)
  .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
  .sort();
const workflows = workflowFiles.map((file) => ({
  file,
  source: readFileSync(join(workflowDirectory, file), "utf8"),
}));

describe("hosted workflow policy", () => {
  it("pins every remote action to a full immutable commit SHA", () => {
    const violations: string[] = [];
    for (const workflow of workflows) {
      for (const match of workflow.source.matchAll(
        /^\s*uses:\s*([^\s#]+).*$/gmu,
      )) {
        const action = match[1] ?? "";
        if (action.startsWith("./")) continue;
        if (!/@[0-9a-f]{40}$/u.test(action)) {
          violations.push(`${workflow.file}: ${action}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps checkout credentials disabled and avoids privileged trigger patterns", () => {
    const combined = workflows.map(({ source }) => source).join("\n");

    expect(combined).not.toMatch(/\bpull_request_target\s*:/u);
    expect(combined).not.toMatch(/\bpermissions\s*:\s*write-all\b/u);
    expect(combined).not.toMatch(/\bcontents\s*:\s*write\b/u);
    expect(combined).not.toMatch(/^\s*(?:run:\s*)?npx(?:\s|$)/gmu);
    for (const workflow of workflows.filter(({ source }) =>
      source.includes("actions/checkout@")
    )) {
      const checkoutCount = workflow.source.match(
        /actions\/checkout@[0-9a-f]{40}/gu,
      )?.length ?? 0;
      const disabledCredentialCount = workflow.source.match(
        /persist-credentials:\s*false/gu,
      )?.length ?? 0;
      expect(
        disabledCredentialCount,
        `${workflow.file} must disable credentials for every checkout`,
      ).toBe(checkoutCount);
    }
  });

  it("verifies the lockfile before npm ci in every dependency-installing job", () => {
    for (const workflow of workflows.filter(({ source }) =>
      source.includes("npm ci")
    )) {
      const sections = workflow.source.split(
        /(?=^ {2}[a-zA-Z0-9_-]+:\s*$)/gmu,
      );
      for (const section of sections.filter((value) => value.includes("npm ci"))) {
        expect(
          section.indexOf("node scripts/verify-lockfile-policy.mjs"),
          `${workflow.file} must verify dependency sources before npm ci`,
        ).toBeGreaterThanOrEqual(0);
        expect(section.indexOf("node scripts/verify-lockfile-policy.mjs"))
          .toBeLessThan(section.indexOf("npm ci"));
      }
    }
  });

  it("pins the local and CI Node toolchain through one version file", () => {
    const packageJson = JSON.parse(
      readFileSync(join(repositoryRoot, "package.json"), "utf8"),
    ) as {
      packageManager?: unknown;
      engines?: { node?: unknown };
    };
    const nodeVersion = readFileSync(
      join(repositoryRoot, ".node-version"),
      "utf8",
    ).trim();
    const ciWorkflow = readFileSync(
      join(workflowDirectory, "ci.yml"),
      "utf8",
    );

    expect(nodeVersion).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(packageJson.packageManager).toBe("npm@11.13.0");
    expect(packageJson.engines?.node).toBe(">=22.22.0");
    expect(ciWorkflow).toContain("node-version-file: .node-version");
    expect(ciWorkflow.match(/corepack enable npm/gu)?.length).toBe(2);
    expect(
      ciWorkflow.match(
        /test "\$\(npm --version\)" = "11\.13\.0"/gu,
      )?.length,
    ).toBe(2);
  });
});
