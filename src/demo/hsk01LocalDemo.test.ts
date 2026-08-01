import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk01LocalDemo,
  serializeHsk01LocalDemo,
} from "../../scripts/demo/build-hsk01-local-demo.mjs";
import {
  assertValidHsk01LocalDemoBundle,
  HSK01_LOCAL_DEMO_RELATIVE_PATH,
  loadHsk01LocalDemoBundle,
  validateHsk01LocalDemoBundle,
} from "./hsk01LocalDemo.mjs";

describe("no-progress HSK0-to-HSK1 local demo", () => {
  it("binds an HSK1 target to the exact checked HSK0 bridge", () => {
    const bundle = loadHsk01LocalDemoBundle();
    const result = assertValidHsk01LocalDemoBundle(bundle);

    expect(result.summary).toEqual({
      bridgeLessons: 4,
      targetLessons: 14,
      blockedLessons: 2,
      unavailablePaths: 3,
      forbiddenProgressFields: 0,
    });
    expect(bundle.manifest.scenario).toEqual({
      profileSelection: {
        startingLevel: "hsk1",
        goal: "hsk",
        script: "simplified",
      },
      targetPathId: "hsk1",
      bridgePathId: "hsk0",
      entryLessonId: "boot-1",
      bridgeLessonIds: ["boot-1", "boot-2", "boot-3", "boot-4"],
      boundaryUnlockLessonId: "survival-1",
      stillLockedLessonIds: [
        "survival-2",
        "survival-3",
        "survival-4",
        "hsk1-time-place-events-01-numbers",
        "hsk1-time-place-events-02-calendar",
        "hsk1-time-place-events-03-week-and-day-parts",
        "hsk1-time-place-events-04-clock-and-duration",
        "hsk1-time-place-events-05-location",
        "hsk1-time-place-events-06-weather-and-residence",
        "daily-1",
        "daily-2",
        "daily-3",
        "daily-4",
      ],
      blockedLessonIds: [
        "characters-1",
        "characters-2",
      ],
      unavailablePathIds: ["hsk2", "hsk3", "hsk4"],
    });
    expect(bundle.manifest.expectations).toEqual({
      lessonActivityCount: 10,
      intentionalIncorrectCount: 1,
      passingScore: 90,
      remediationAttempts: 2,
      totalLessonEvidence: 44,
      totalRemediationEvidence: 2,
    });
  });

  it("contains policy and expectations but no learner progress seed", () => {
    const { manifest } = loadHsk01LocalDemoBundle();
    const serialized = JSON.stringify(manifest);

    expect(manifest.policy).toEqual({
      learnerVisible: false,
      testContractOnly: true,
      storageMutationMode: "real-ui-only",
      exactRuntimeProvenanceRequired: true,
      skillSeparatedEvidenceRequired: true,
      remediationGrantsMastery: false,
      prerequisiteWaiverAllowed: false,
      completionClaim: false,
    });
    for (const forbidden of [
      "\"seed\"",
      "\"initialState\"",
      "\"learningState\"",
      "\"answers\"",
      "\"evidence\"",
      "\"completedLessons\"",
      "\"mistakes\"",
      "\"knowledge\"",
      "\"mastery\"",
      "\"xp\"",
      "\"streak\"",
      "\"lessonResumes\"",
      "\"assessmentSessions\"",
      "\"assessmentAttempts\"",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("rejects runtime binding drift and injected progress state", () => {
    const bundle = loadHsk01LocalDemoBundle();
    const stale = structuredClone(bundle.manifest);
    stale.runtimeCatalogBinding.integritySha256 =
      `sha256:${"0".repeat(64)}`;
    const staleResult = validateHsk01LocalDemoBundle({
      ...bundle,
      manifest: stale,
    });
    expect(staleResult.valid).toBe(false);
    expect(staleResult.errors).toEqual(expect.arrayContaining([
      "Local demo runtime catalog binding is stale or invalid",
      "Local demo does not match its exact checked projection",
    ]));

    const injected = structuredClone(bundle.manifest);
    injected.seed = {
      evidence: [{ id: "forged" }],
      completedLessons: { "boot-1": { bestScore: 100 } },
    };
    const injectedResult = validateHsk01LocalDemoBundle({
      ...bundle,
      manifest: injected,
    });
    expect(injectedResult.valid).toBe(false);
    expect(injectedResult.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("Local demo contains forbidden progress state"),
      "Local demo does not match its exact checked projection",
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      resolve(process.cwd(), HSK01_LOCAL_DEMO_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk01LocalDemo(buildHsk01LocalDemo()),
    );
  });
});
