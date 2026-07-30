import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK1_UNIT_PROMOTION_DRY_RUN_RELATIVE_PATH,
  loadHsk1UnitPromotionDryRunSources,
  projectCheckedHsk1UnitPromotionDryRun,
} from "../../src/content/hsk1UnitPromotionDryRun.mjs";

export const buildCheckedHsk1UnitPromotionDryRun = async (
  root = process.cwd(),
) => projectCheckedHsk1UnitPromotionDryRun(
  loadHsk1UnitPromotionDryRunSources(root),
);

export const serializeHsk1UnitPromotionDryRun = (report) =>
  `${JSON.stringify(report, null, 2)}\n`;

const main = async () => {
  const root = process.cwd();
  const outputPath = resolve(
    root,
    HSK1_UNIT_PROMOTION_DRY_RUN_RELATIVE_PATH,
  );
  const serialized = serializeHsk1UnitPromotionDryRun(
    await buildCheckedHsk1UnitPromotionDryRun(root),
  );
  const check = process.argv.includes("--check");
  if (check) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 atomic unit promotion dry-run is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_UNIT_PROMOTION_DRY_RUN_RELATIVE_PATH,
    mode: check ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
