import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK1_UNIT_PROMOTION_HANDOFF_RELATIVE_PATH,
  loadHsk1UnitPromotionHandoffSources,
  projectHsk1UnitPromotionHandoff,
} from "../../src/content/hsk1UnitPromotionHandoff.mjs";

export const buildHsk1UnitPromotionHandoff = async (
  root = process.cwd(),
) => projectHsk1UnitPromotionHandoff(
  loadHsk1UnitPromotionHandoffSources(root),
);

export const serializeHsk1UnitPromotionHandoff = (handoff) =>
  `${JSON.stringify(handoff, null, 2)}\n`;

const main = async () => {
  const root = process.cwd();
  const outputPath = resolve(root, HSK1_UNIT_PROMOTION_HANDOFF_RELATIVE_PATH);
  const serialized = serializeHsk1UnitPromotionHandoff(
    await buildHsk1UnitPromotionHandoff(root),
  );
  const check = process.argv.includes("--check");
  if (check) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 atomic unit handoff is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_UNIT_PROMOTION_HANDOFF_RELATIVE_PATH,
    mode: check ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
