import {
  assertValidHsk4ArtsSportsExchangeLongFormPackBundle,
  loadHsk4ArtsSportsExchangeLongFormPackBundle,
} from "../../src/content/hsk4ArtsSportsExchangeLongFormPack.mjs";

const summary = assertValidHsk4ArtsSportsExchangeLongFormPackBundle(
  loadHsk4ArtsSportsExchangeLongFormPackBundle(),
).summary;

console.log(JSON.stringify(summary, null, 2));
