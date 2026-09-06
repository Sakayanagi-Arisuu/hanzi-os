import { configDefaults, defineConfig } from "vitest/config";

export const DEFERRED_PRODUCTION_CONTENT_TESTS = [
  "src/content/hsk1LessonPromotionDryRun.test.ts",
  "src/content/hsk1LessonPromotionHandoff.test.ts",
  "src/content/hsk1UnitAudioEvidenceWorkflow.test.ts",
  "src/content/hsk1UnitEvidenceIntake.test.ts",
  "src/content/hsk1UnitPackagePlan.test.ts",
  "src/content/hsk1UnitPromotionDryRun.test.ts",
  "src/content/hsk1UnitPromotionHandoff.test.ts",
  "src/content/hsk1UnitReviewAssignmentSet.test.ts",
  "src/content/hsk1UnitReviewerPacket.test.ts",
] as const;

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "app/**/*.test.tsx"],
    exclude: [...configDefaults.exclude, ...DEFERRED_PRODUCTION_CONTENT_TESTS],
    passWithNoTests: false,
    restoreMocks: true,
    testTimeout: 10_000,
  },
});
