import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const rich = JSON.parse(readFileSync(join(root, "content/runtime/hsk4-level-rich-lessons.json"), "utf8"));
const markers = [
  ...rich.lessons.flatMap(lesson => [
    lesson.topics?.[0]?.id,
    lesson.grammar?.[0]?.id,
    lesson.tasks?.[0]?.id,
  ].filter(Boolean)),
];
if (markers.some(marker => typeof marker !== "string" || marker.length < 12)) {
  throw new Error("Premium content markers are missing from the source artifacts.");
}
if (rich.lessons.length !== 78) {
  throw new Error("Premium content inventory changed; review the bundle boundary before building.");
}
if (rich.lessons.some(lesson => !lesson.topics?.[0]?.id && !lesson.grammar?.[0]?.id && !lesson.tasks?.[0]?.id)) {
  throw new Error("At least one HSK4 lesson has no stable payload marker.");
}
const uniqueMarkers = [...new Set(markers)];

const assetsDirectory = join(root, "dist/client/assets");
const javascriptAssets = readdirSync(assetsDirectory).filter(file => file.endsWith(".js"));
if (!javascriptAssets.length) throw new Error("Client assets are missing; run a build first.");
const leaks = [];
for (const file of javascriptAssets) {
  const content = readFileSync(join(assetsDirectory, file), "utf8");
  for (const marker of uniqueMarkers) if (content.includes(marker)) leaks.push(`${file}: ${marker}`);
}
if (leaks.length) throw new Error(`HSK4 paid content leaked into public client assets:\n${leaks.join("\n")}`);
console.log(`Premium client bundle boundary passed: ${javascriptAssets.length} JS assets, ${uniqueMarkers.length} content markers absent.`);
