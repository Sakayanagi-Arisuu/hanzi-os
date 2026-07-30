import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK1_UNIT_EVIDENCE_READINESS_RELATIVE_PATH,
  loadHsk1UnitEvidenceIntakeSources,
  projectCheckedHsk1UnitEvidenceReadiness,
} from "../../src/content/hsk1UnitEvidenceIntake.mjs";

export const buildCheckedHsk1UnitEvidenceReadiness = async (
  root = process.cwd(),
) => projectCheckedHsk1UnitEvidenceReadiness(
  loadHsk1UnitEvidenceIntakeSources(root),
);

export const serializeHsk1UnitEvidenceReadiness = (report) =>
  `${JSON.stringify(report, null, 2)}\n`;

const main = async () => {
  const root = process.cwd();
  const outputPath = resolve(
    root,
    HSK1_UNIT_EVIDENCE_READINESS_RELATIVE_PATH,
  );
  const serialized = serializeHsk1UnitEvidenceReadiness(
    await buildCheckedHsk1UnitEvidenceReadiness(root),
  );
  const check = process.argv.includes("--check");
  if (check) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 unit evidence readiness report is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_UNIT_EVIDENCE_READINESS_RELATIVE_PATH,
    mode: check ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
