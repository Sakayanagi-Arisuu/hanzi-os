import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "config/hanzi-data-manifest.json");
const sourceRoot = resolve(root, "node_modules/hanzi-writer-data");
const outputRoot = resolve(root, "public/hanzi-data");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (
  manifest.schemaVersion !== 2
  || manifest.package !== "hanzi-writer-data"
  || manifest.inventory?.kind !== "released-rich-lesson-characters"
  || !Array.isArray(manifest.inventory.files)
  || manifest.policy?.practiceOnly !== true
  || manifest.policy?.masteryEligible !== false
) {
  throw new Error("Invalid Hanzi data manifest");
}

const inventoryArtifacts = await Promise.all(manifest.inventory.files.map(async (file) => {
  const artifact = JSON.parse(await readFile(resolve(root, file), "utf8"));
  if (
    artifact.state !== "authorized-for-personal-local-study"
    || artifact.policy?.learnerVisibleForPersonalLocalStudy !== true
    || !Array.isArray(artifact.lessons)
  ) throw new Error(`Hanzi inventory source is not locally authorized: ${file}`);
  return artifact;
}));
const uniqueCharacters = [...new Set(inventoryArtifacts.flatMap((artifact) =>
  artifact.lessons.flatMap((lesson) =>
    lesson.characters.flatMap((entry) => [...entry.hanzi]),
  ),
))].sort((left, right) => left.codePointAt(0) - right.codePointAt(0));
if (uniqueCharacters.length !== manifest.inventory.expectedCharacterCount) {
  throw new Error(`Expected ${manifest.inventory.expectedCharacterCount} released characters, got ${uniqueCharacters.length}`);
}
if (uniqueCharacters.some((character) => [...character].length !== 1)) {
  throw new Error("Every Hanzi data manifest entry must be one Unicode character");
}

await mkdir(outputRoot, { recursive: true });
const existingCharacterFiles = (await readdir(outputRoot, {
  withFileTypes: true,
}))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
await Promise.all(existingCharacterFiles.map((entry) =>
  unlink(resolve(outputRoot, entry.name))
));
await Promise.all(uniqueCharacters.map((character) =>
  copyFile(
    resolve(sourceRoot, `${character}.json`),
    resolve(outputRoot, `${character}.json`),
  )
));
await copyFile(
  resolve(sourceRoot, "ARPHICPL.TXT"),
  resolve(outputRoot, "ARPHICPL.TXT"),
);
await writeFile(
  resolve(outputRoot, "NOTICE.txt"),
  [
    "HANZI.OS self-hosted stroke data",
    "",
    `Package: ${manifest.package}@${manifest.packageVersion}`,
    `Package integrity: ${manifest.packageIntegrity}`,
    `Source: ${manifest.source}`,
    `Source revision: ${manifest.sourceRevision}`,
    `Upstream data: ${manifest.upstream}`,
    `Upstream revision: ${manifest.upstreamRevision}`,
    `License: ${manifest.license} (see ARPHICPL.TXT in this directory)`,
    `License file SHA-256: ${manifest.licenseFileSha256}`,
    "",
    `Inventory: ${manifest.inventory.kind} (${uniqueCharacters.length} characters)`,
    "Stroke geometry is available for guided local practice only. It does not create mastery or measurement evidence.",
    "",
  ].join("\n"),
  "utf8",
);

console.log(`Synced ${uniqueCharacters.length} self-hosted Hanzi data files.`);
