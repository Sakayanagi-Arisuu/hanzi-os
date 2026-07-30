import {
  assertValidHsk4TimedSectionalRehearsalIntegrationPackBundle,
  loadHsk4TimedSectionalRehearsalIntegrationPackBundle,
} from "../../src/content/hsk4TimedSectionalRehearsalIntegrationPack.mjs";

const result =
  assertValidHsk4TimedSectionalRehearsalIntegrationPackBundle(
    loadHsk4TimedSectionalRehearsalIntegrationPackBundle(process.cwd()),
  );

for (const [key, value] of Object.entries(result.summary)) {
  console.log(`${key} ${JSON.stringify(value)}`);
}
