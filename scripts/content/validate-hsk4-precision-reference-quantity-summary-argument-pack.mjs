import {
  assertValidHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle,
  loadHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle,
} from "../../src/content/hsk4PrecisionReferenceQuantitySummaryArgumentPack.mjs";

const result =
  assertValidHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle(
    loadHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle(
      process.cwd(),
    ),
  );

for (const [key, value] of Object.entries(result.summary)) {
  console.log(`${key} ${value}`);
}
