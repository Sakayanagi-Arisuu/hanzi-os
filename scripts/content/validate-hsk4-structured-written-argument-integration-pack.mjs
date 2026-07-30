import {
  assertValidHsk4StructuredWrittenArgumentIntegrationPackBundle,
  loadHsk4StructuredWrittenArgumentIntegrationPackBundle,
} from "../../src/content/hsk4StructuredWrittenArgumentIntegrationPack.mjs";

const result = assertValidHsk4StructuredWrittenArgumentIntegrationPackBundle(
  loadHsk4StructuredWrittenArgumentIntegrationPackBundle(process.cwd()),
);

for (const [key, value] of Object.entries(result.summary)) {
  console.log(`${key} ${JSON.stringify(value)}`);
}
