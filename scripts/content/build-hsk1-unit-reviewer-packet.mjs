import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK1_UNIT_REVIEWER_PACKET_RELATIVE_PATH,
  loadHsk1UnitReviewerPacketSources,
  projectHsk1UnitReviewerPacket,
} from "../../src/content/hsk1UnitReviewerPacket.mjs";

export const buildHsk1UnitReviewerPacket = async (
  root = process.cwd(),
) => projectHsk1UnitReviewerPacket(
  loadHsk1UnitReviewerPacketSources(root),
);

export const serializeHsk1UnitReviewerPacket = (packet) =>
  `${JSON.stringify(packet, null, 2)}\n`;

const main = async () => {
  const root = process.cwd();
  const outputPath = resolve(root, HSK1_UNIT_REVIEWER_PACKET_RELATIVE_PATH);
  const serialized = serializeHsk1UnitReviewerPacket(
    await buildHsk1UnitReviewerPacket(root),
  );
  const check = process.argv.includes("--check");
  if (check) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 atomic unit reviewer packet is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_UNIT_REVIEWER_PACKET_RELATIVE_PATH,
    mode: check ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
