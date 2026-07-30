import {
  assertValidHsk4InferenceEvidenceCheckIntegrationPackBundle,
  loadHsk4InferenceEvidenceCheckIntegrationPackBundle,
} from "../../src/content/hsk4InferenceEvidenceCheckIntegrationPack.mjs";

const result =
  assertValidHsk4InferenceEvidenceCheckIntegrationPackBundle(
    loadHsk4InferenceEvidenceCheckIntegrationPackBundle(process.cwd()),
  );

for (const [key, value] of Object.entries(result.summary)) {
  console.log(`${key} ${JSON.stringify(value)}`);
}
