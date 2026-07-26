import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "config/hanzi-data-manifest.json");
const sourceRoot = resolve(root, "node_modules/hanzi-writer-data");
const outputRoot = resolve(root, "public/hanzi-data");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (
  manifest.schemaVersion !== 1
  || manifest.package !== "hanzi-writer-data"
  || !Array.isArray(manifest.characters)
  || manifest.characters.length === 0
) {
  throw new Error("Invalid Hanzi data manifest");
}

const uniqueCharacters = [...new Set(manifest.characters)];
if (uniqueCharacters.some((character) => [...character].length !== 1)) {
  throw new Error("Every Hanzi data manifest entry must be one Unicode character");
}

await mkdir(outputRoot, { recursive: true });
await Promise.all(uniqueCharacters.map((character) =>
  copyFile(
    resolve(sourceRoot, `${character}.json`),
    resolve(outputRoot, `${character}.json`),
  )
));
const licenseText = await readFile(
  resolve(sourceRoot, "ARPHICPL.TXT"),
  "utf8",
);
await writeFile(
  resolve(outputRoot, "ARPHICPL.TXT"),
  licenseText.replace(/[ \t]+$/gmu, ""),
  "utf8",
);
await writeFile(
  resolve(outputRoot, "NOTICE.txt"),
  [
    "HANZI.OS self-hosted stroke data",
    "",
    `Package: ${manifest.package}@${manifest.packageVersion}`,
    `Source: ${manifest.source}`,
    `Upstream data: ${manifest.upstream}`,
    `License: ${manifest.license} (see ARPHICPL.TXT in this directory)`,
    "",
    "Only the characters listed in config/hanzi-data-manifest.json are copied into the public build.",
    "",
  ].join("\n"),
  "utf8",
);

console.log(`Synced ${uniqueCharacters.length} self-hosted Hanzi data files.`);
