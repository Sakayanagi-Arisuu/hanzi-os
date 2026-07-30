import {
  assertValidHsk4SocietyEconomyLongFormPackBundle,
  loadHsk4SocietyEconomyLongFormPackBundle,
} from "../../src/content/hsk4SocietyEconomyLongFormPack.mjs";

const result = assertValidHsk4SocietyEconomyLongFormPackBundle(
  loadHsk4SocietyEconomyLongFormPackBundle(),
);
console.log(JSON.stringify(result.summary, null, 2));
