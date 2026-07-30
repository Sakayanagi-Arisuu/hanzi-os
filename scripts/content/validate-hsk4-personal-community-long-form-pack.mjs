import { fileURLToPath } from "node:url";
import {
  assertValidHsk4PersonalCommunityLongFormPackBundle,
  loadHsk4PersonalCommunityLongFormPackBundle,
} from "../../src/content/hsk4PersonalCommunityLongFormPack.mjs";

const result = assertValidHsk4PersonalCommunityLongFormPackBundle(
  loadHsk4PersonalCommunityLongFormPackBundle(),
);
console.log(JSON.stringify(result.summary, null, 2));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = 0;
}
