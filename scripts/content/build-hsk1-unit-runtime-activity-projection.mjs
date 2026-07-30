import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK1_UNIT_RUNTIME_ACTIVITY_PROJECTION_RELATIVE_PATH,
  loadHsk1UnitRuntimeActivityProjectionSources,
  projectHsk1UnitRuntimeActivityProjection,
} from "../../src/content/hsk1UnitRuntimeActivityProjection.mjs";

export const buildCheckedHsk1UnitRuntimeActivityProjection = async (
  root = process.cwd(),
) => projectHsk1UnitRuntimeActivityProjection(
  loadHsk1UnitRuntimeActivityProjectionSources(root),
);

export const serializeHsk1UnitRuntimeActivityProjection = (projection) =>
  `${JSON.stringify(projection, null, 2)}\n`;

const main = async () => {
  const root = process.cwd();
  const outputPath = resolve(
    root,
    HSK1_UNIT_RUNTIME_ACTIVITY_PROJECTION_RELATIVE_PATH,
  );
  const serialized = serializeHsk1UnitRuntimeActivityProjection(
    await buildCheckedHsk1UnitRuntimeActivityProjection(root),
  );
  const check = process.argv.includes("--check");
  if (check) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 runtime activity projection is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_UNIT_RUNTIME_ACTIVITY_PROJECTION_RELATIVE_PATH,
    mode: check ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
