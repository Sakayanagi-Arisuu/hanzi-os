import {
  assertValidHsk4ArgumentLogicConcessionSummaryArgumentPackBundle,
  loadHsk4ArgumentLogicConcessionSummaryArgumentPackBundle,
} from "../../src/content/hsk4ArgumentLogicConcessionSummaryArgumentPack.mjs";

const result =
  assertValidHsk4ArgumentLogicConcessionSummaryArgumentPackBundle(
    loadHsk4ArgumentLogicConcessionSummaryArgumentPackBundle(process.cwd()),
  );

for (const [key, value] of Object.entries(result.summary)) {
  console.log(`${key} ${value}`);
}
