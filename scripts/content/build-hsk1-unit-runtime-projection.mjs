import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK1_UNIT_RUNTIME_PROJECTION_RELATIVE_PATH,
  loadHsk1UnitRuntimeProjectionSources,
  projectHsk1UnitRuntimeProjection,
} from "../../src/content/hsk1UnitRuntimeProjection.mjs";

export const buildCheckedHsk1UnitRuntimeProjection = async (
  root = process.cwd(),
) => projectHsk1UnitRuntimeProjection(
  loadHsk1UnitRuntimeProjectionSources(root),
);

export const serializeHsk1UnitRuntimeProjection = (projection) =>
  `${JSON.stringify(projection, null, 2)}\n`;

const main = async () => {
  const root = process.cwd();
  const outputPath = resolve(
    root,
    HSK1_UNIT_RUNTIME_PROJECTION_RELATIVE_PATH,
  );
  const serialized = serializeHsk1UnitRuntimeProjection(
    await buildCheckedHsk1UnitRuntimeProjection(root),
  );
  const check = process.argv.includes("--check");
  if (check) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 unit runtime projection is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_UNIT_RUNTIME_PROJECTION_RELATIVE_PATH,
    mode: check ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
