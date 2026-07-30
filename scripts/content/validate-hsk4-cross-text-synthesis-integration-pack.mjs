import {
  assertValidHsk4CrossTextSynthesisIntegrationPackBundle,
  loadHsk4CrossTextSynthesisIntegrationPackBundle,
} from "../../src/content/hsk4CrossTextSynthesisIntegrationPack.mjs";

const result = assertValidHsk4CrossTextSynthesisIntegrationPackBundle(
  loadHsk4CrossTextSynthesisIntegrationPackBundle(process.cwd()),
);

for (const [key, value] of Object.entries(result.summary)) {
  console.log(`${key} ${JSON.stringify(value)}`);
}
