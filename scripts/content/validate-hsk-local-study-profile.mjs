import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  loadHskLocalStudyProfile,
  validateHskLocalStudyProfile,
} from "../../src/content/hskLocalStudyProfile.mjs";

export const validateCheckedHskLocalStudyProfile = (
  root = process.cwd(),
) => validateHskLocalStudyProfile(loadHskLocalStudyProfile(root));

const main = () => {
  const result = validateCheckedHskLocalStudyProfile();
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
