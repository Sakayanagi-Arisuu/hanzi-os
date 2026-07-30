import {
  assertValidHsk4LongInputStructureMapIntegrationPackBundle,
  loadHsk4LongInputStructureMapIntegrationPackBundle,
} from "../../src/content/hsk4LongInputStructureMapIntegrationPack.mjs";

const result =
  assertValidHsk4LongInputStructureMapIntegrationPackBundle(
    loadHsk4LongInputStructureMapIntegrationPackBundle(process.cwd()),
  );

for (const [key, value] of Object.entries(result.summary)) {
  console.log(`${key} ${JSON.stringify(value)}`);
}
