import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertAllowedPostRunChanges,
  bindAcceptanceResults,
  buildLocalCandidateReceipt,
  canonicalJsonEqual,
  collectPlaywrightCases,
  LOCAL_CANDIDATE_CONTRACT_PATH,
  loadLocalCandidateContract,
  summarizeProductionBlockers,
  validateLocalCandidateContract,
  validateLocalCandidateInputs,
} from "../../scripts/graduation/local-release-candidate.mjs";

const loadCheckedContract = () => JSON.parse(readFileSync(
  resolve(process.cwd(), LOCAL_CANDIDATE_CONTRACT_PATH),
  "utf8",
));

describe("HSK0-4 local graduation candidate", () => {
  it("binds checked artifacts and every required local acceptance capability", async () => {
    const { contract } = await loadLocalCandidateContract();
    const inputs = await validateLocalCandidateInputs();

    expect(contract.claimBoundary).toEqual({
      environment: "local",
      productionReady: false,
      hostedEvidence: false,
      humanReviewEvidence: false,
      assessmentCalibrationEvidence: false,
      sitesVerified: false,
    });
    expect(inputs.artifacts).toHaveLength(10);
    expect(contract.gates.map((gate: { id: string }) => gate.id)).toEqual([
      "technical-baseline",
      "browser-acceptance",
      "local-lighthouse",
      "production-dependency-audit",
    ]);
    expect(contract.acceptanceMatrix.map((item: { id: string }) => item.id)).toEqual([
      "hsk0-hsk1-real-ui-demo",
      "mobile-layout-and-command-sheet",
      "keyboard-destructive-dialog",
      "keyboard-single-select",
      "reduced-motion",
      "offline-shell",
      "owner-safe-reset",
      "backup-export-import-reload",
    ]);
    expect(inputs.productionReadiness).toEqual({
      status: "blocked",
      pendingGateCount: 9,
      blockerCount: 23,
      productionEvidenceClaimed: false,
    });
  });

  it("rejects widened claims, missing acceptance coverage and command injection", () => {
    const productionClaim = loadCheckedContract();
    productionClaim.claimBoundary.productionReady = true;
    expect(validateLocalCandidateContract(productionClaim).errors).toContain(
      "Candidate may not claim production, hosted, review, calibration or Sites evidence",
    );

    const incomplete = loadCheckedContract();
    incomplete.acceptanceMatrix.pop();
    expect(validateLocalCandidateContract(incomplete).errors).toContain(
      "Candidate acceptance matrix does not cover the required G5 capabilities",
    );

    const injected = loadCheckedContract();
    injected.gates[0].npmArguments = ["run", "check", "&&", "echo", "bypass"];
    expect(validateLocalCandidateContract(injected).errors).toContain(
      "Candidate gate is not allow-listed: technical-baseline",
    );
  });

  it("extracts exact passed Playwright cases and refuses missing or failed cases", () => {
    const report = {
      suites: [
        {
          // Playwright's JSON reporter emits a basename when testDir is e2e.
          file: "example.spec.ts",
          specs: [
            {
              title: "passes the local boundary",
              tests: [{ results: [{ status: "passed" }] }],
            },
            {
              title: "fails the local boundary",
              tests: [{ results: [{ status: "failed" }] }],
            },
          ],
        },
      ],
    };
    expect(collectPlaywrightCases(report)).toEqual([
      {
        file: "e2e/example.spec.ts",
        title: "passes the local boundary",
        passed: true,
      },
      {
        file: "e2e/example.spec.ts",
        title: "fails the local boundary",
        passed: false,
      },
    ]);

    const matrix = [{
      id: "example",
      capability: "example capability",
      testFile: "e2e/example.spec.ts",
      testTitle: "passes the local boundary",
    }];
    expect(bindAcceptanceResults(matrix, report)).toEqual([
      { ...matrix[0], status: "passed" },
    ]);
    expect(() => bindAcceptanceResults([
      { ...matrix[0], testTitle: "fails the local boundary" },
    ], report)).toThrow(/did not pass exactly once/u);
    expect(() => bindAcceptanceResults([
      { ...matrix[0], testTitle: "missing" },
    ], report)).toThrow(/did not pass exactly once/u);
  });

  it("allows only the evidence receipt and progress documents after a gate run", () => {
    expect(() => assertAllowedPostRunChanges([
      "docs/HSK4_GRADUATION_PLAN.md",
      "docs/IMPLEMENTATION_CHECKPOINT.md",
      "local-release-candidate/evidence-index.json",
    ], [
      "docs/HSK4_GRADUATION_PLAN.md",
      "docs/IMPLEMENTATION_CHECKPOINT.md",
      "local-release-candidate/evidence-index.json",
    ])).not.toThrow();
    expect(() => assertAllowedPostRunChanges([
      "src/App.tsx",
    ], ["local-release-candidate/evidence-index.json"])).toThrow(
      /source revision is stale/u,
    );
  });

  it("keeps the receipt explicitly local even when all local gates pass", () => {
    const contract = loadCheckedContract();
    const receipt = buildLocalCandidateReceipt({
      contract,
      source: { revision: "a".repeat(40), tree: "b".repeat(40) },
      contractIdentity: { bytes: 1, sha256: "c".repeat(64) },
      artifacts: [],
      gates: contract.gates.map((gate: { id: string }) => ({
        id: gate.id,
        command: "npm placeholder",
        status: "passed",
      })),
      acceptanceMatrix: contract.acceptanceMatrix.map((item: object) => ({
        ...item,
        status: "passed",
      })),
      build: {
        root: "dist",
        artifactCount: 1,
        bytes: 1,
        sha256: "d".repeat(64),
      },
      productionReadiness: {
        status: "blocked",
        pendingGateCount: 9,
        blockerCount: 23,
        productionEvidenceClaimed: false,
      },
    });

    expect(receipt.claimBoundary.productionReady).toBe(false);
    expect(receipt.claimBoundary.hostedEvidence).toBe(false);
    expect(receipt.source).toEqual({
      revision: "a".repeat(40),
      tree: "b".repeat(40),
      cleanAtGateStart: true,
      cleanAtGateFinish: true,
    });
    expect(receipt.productionReadiness.status).toBe("blocked");
  });

  it("compares canonical receipt objects independently of JSON key order", () => {
    expect(canonicalJsonEqual(
      { zebra: 1, alpha: { two: 2, one: 1 } },
      { alpha: { one: 1, two: 2 }, zebra: 1 },
    )).toBe(true);
    expect(canonicalJsonEqual(
      [{ id: "gate", command: "npm run check", status: "passed" }],
      [{ status: "passed", command: "npm run check", id: "gate" }],
    )).toBe(true);
    expect(canonicalJsonEqual({ status: "passed" }, { status: "failed" })).toBe(false);
  });

  it("requires every production gate to remain pending for this local-only candidate", () => {
    expect(() => summarizeProductionBlockers({
      gates: {
        one: { status: "approved", blockers: [] },
      },
    })).toThrow(/production readiness to remain fail-closed/u);
  });
});
