import {
  assertValidHsk4StructuredSpokenDefenseIntegrationPackBundle,
  loadHsk4StructuredSpokenDefenseIntegrationPackBundle,
} from "../../src/content/hsk4StructuredSpokenDefenseIntegrationPack.mjs";

const result =
  assertValidHsk4StructuredSpokenDefenseIntegrationPackBundle(
    loadHsk4StructuredSpokenDefenseIntegrationPackBundle(process.cwd()),
  );

for (const [key, value] of Object.entries(result.summary)) {
  console.log(`${key} ${JSON.stringify(value)}`);
}
