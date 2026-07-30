import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK_RUNTIME_PROMOTION_QUEUE_RELATIVE_PATH,
  loadHskRuntimePromotionQueueSources,
  projectHskRuntimePromotionQueue,
} from "../../src/content/hskRuntimePromotionQueue.mjs";

export const buildHskRuntimePromotionQueue = (root = process.cwd()) =>
  projectHskRuntimePromotionQueue(
    loadHskRuntimePromotionQueueSources(root),
  );

export const serializeHskRuntimePromotionQueue = (report) =>
  `${JSON.stringify(report, null, 2)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = resolve(root, HSK_RUNTIME_PROMOTION_QUEUE_RELATIVE_PATH);
  const serialized = serializeHskRuntimePromotionQueue(
    buildHskRuntimePromotionQueue(root),
  );
  const check = process.argv.includes("--check");
  if (check) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK runtime promotion queue is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK_RUNTIME_PROMOTION_QUEUE_RELATIVE_PATH,
    mode: check ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
