import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK1_UNIT_PACKAGE_PLAN_RELATIVE_PATH,
  loadHsk1UnitPackagePlanSources,
  projectCheckedHsk1UnitPackagePlan,
} from "../../src/content/hsk1UnitPackagePlan.mjs";

export const buildCheckedHsk1UnitPackagePlan = async (
  root = process.cwd(),
) => projectCheckedHsk1UnitPackagePlan(
  loadHsk1UnitPackagePlanSources(root),
);

export const serializeHsk1UnitPackagePlan = (plan) =>
  `${JSON.stringify(plan, null, 2)}\n`;

const main = async () => {
  const root = process.cwd();
  const outputPath = resolve(root, HSK1_UNIT_PACKAGE_PLAN_RELATIVE_PATH);
  const serialized = serializeHsk1UnitPackagePlan(
    await buildCheckedHsk1UnitPackagePlan(root),
  );
  const check = process.argv.includes("--check");
  if (check) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 unit package plan is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_UNIT_PACKAGE_PLAN_RELATIVE_PATH,
    mode: check ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
