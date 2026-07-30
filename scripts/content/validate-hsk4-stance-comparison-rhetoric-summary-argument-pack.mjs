import {
  assertValidHsk4StanceComparisonRhetoricSummaryArgumentPackBundle,
  loadHsk4StanceComparisonRhetoricSummaryArgumentPackBundle,
} from "../../src/content/hsk4StanceComparisonRhetoricSummaryArgumentPack.mjs";

const result =
  assertValidHsk4StanceComparisonRhetoricSummaryArgumentPackBundle(
    loadHsk4StanceComparisonRhetoricSummaryArgumentPackBundle(
      process.cwd(),
    ),
  );

for (const [key, value] of Object.entries(result.summary)) {
  console.log(`${key} ${value}`);
}
