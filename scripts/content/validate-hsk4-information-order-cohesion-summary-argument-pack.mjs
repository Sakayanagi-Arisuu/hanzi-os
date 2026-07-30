import {
  assertValidHsk4InformationOrderCohesionSummaryArgumentPackBundle,
  loadHsk4InformationOrderCohesionSummaryArgumentPackBundle,
} from "../../src/content/hsk4InformationOrderCohesionSummaryArgumentPack.mjs";

const result =
  assertValidHsk4InformationOrderCohesionSummaryArgumentPackBundle(
    loadHsk4InformationOrderCohesionSummaryArgumentPackBundle(
      process.cwd(),
    ),
  );

for (const [key, value] of Object.entries(result.summary)) {
  console.log(`${key} ${value}`);
}
