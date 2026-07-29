import {
  assertValidHsk3CohesionReconstructionPackBundle,
  loadHsk3CohesionReconstructionPackBundle,
} from "../../src/content/hsk3CohesionReconstructionPack.mjs";

const result = assertValidHsk3CohesionReconstructionPackBundle(
  loadHsk3CohesionReconstructionPackBundle(),
);
console.log(JSON.stringify({ valid: true, ...result.summary }, null, 2));
