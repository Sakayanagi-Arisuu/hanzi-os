import {
  assertValidHsk3ModalityTimeNarrationPackBundle,
  loadHsk3ModalityTimeNarrationPackBundle,
} from "../../src/content/hsk3ModalityTimeNarrationPack.mjs";

const result = assertValidHsk3ModalityTimeNarrationPackBundle(
  loadHsk3ModalityTimeNarrationPackBundle(),
);
console.log(JSON.stringify({ valid: true, ...result.summary }, null, 2));
