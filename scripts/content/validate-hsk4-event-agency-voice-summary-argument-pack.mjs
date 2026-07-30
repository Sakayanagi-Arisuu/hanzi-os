import {
  assertValidHsk4EventAgencyVoiceSummaryArgumentPackBundle,
  loadHsk4EventAgencyVoiceSummaryArgumentPackBundle,
} from "../../src/content/hsk4EventAgencyVoiceSummaryArgumentPack.mjs";

const result = assertValidHsk4EventAgencyVoiceSummaryArgumentPackBundle(
  loadHsk4EventAgencyVoiceSummaryArgumentPackBundle(process.cwd()),
);

for (const [key, value] of Object.entries(result.summary)) {
  console.log(`${key} ${value}`);
}
