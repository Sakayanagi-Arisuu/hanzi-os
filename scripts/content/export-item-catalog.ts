import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KNOWLEDGE_ITEM_BLUEPRINTS } from "../../src/data/knowledgeItemBlueprints";
import { LESSON_GUIDES } from "../../src/data/lessonGuides";
import { extractAuthoringContent } from "../../src/content/authoringCatalogProjection";
import {
  projectItemCatalog,
  projectItemCatalogV2,
} from "../../src/content/itemCatalogProjection";
import type {
  ContentRegistry,
  ItemCatalogArtifact,
} from "../../src/content/types";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const parseArguments = (args: string[]) => {
  const allowedFlags = new Set([
    "catalog-schema-version",
    "content-version",
    "from",
    "output",
    "write",
  ]);
  const flags = new Map<string, string | true>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${argument}`);
    }
    const name = argument.slice(2);
    if (!allowedFlags.has(name)) {
      throw new Error(`Unknown flag: --${name}`);
    }
    if (name === "write") {
      flags.set(name, true);
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`--${name} requires a value`);
    }
    flags.set(name, value);
    index += 1;
  }
  return flags;
};

const requiredString = (flags: Map<string, string | true>, name: string) => {
  const value = flags.get(name);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`--${name} is required`);
  }
  return value;
};

const flags = parseArguments(process.argv.slice(2));
if (flags.get("write") !== true) {
  throw new Error("Refusing to create a catalog without the explicit --write flag");
}

const contentVersion = requiredString(flags, "content-version");
const catalogSchemaVersion = Number(flags.get("catalog-schema-version") ?? "1");
if (![1, 2].includes(catalogSchemaVersion)) {
  throw new Error("--catalog-schema-version must be 1 or 2");
}
const output = resolve(repositoryRoot, requiredString(flags, "output"));
const relativeOutput = relative(repositoryRoot, output);
const draftsRoot = resolve(repositoryRoot, "content", "drafts");
const relativeToDrafts = relative(draftsRoot, output);
if (isAbsolute(relativeOutput) || relativeOutput.startsWith("..")) {
  throw new Error("--output must stay inside the repository");
}
if (isAbsolute(relativeToDrafts) || relativeToDrafts.startsWith("..")) {
  throw new Error("--output must stay inside content/drafts");
}
if (existsSync(output)) {
  throw new Error(`Refusing to overwrite existing catalog: ${relativeOutput}`);
}

const registry = JSON.parse(
  readFileSync(resolve(repositoryRoot, "content", "registry.json"), "utf8"),
) as ContentRegistry;
const sourceVersion = typeof flags.get("from") === "string"
  ? String(flags.get("from"))
  : registry.currentContentVersion;
const sourceEntry = registry.packages.find(
  (entry) => entry.contentVersion === sourceVersion,
);
if (!sourceEntry) {
  throw new Error(`Unknown source content version: ${sourceVersion}`);
}
if (sourceEntry.relativePath !== `packages/${sourceVersion}`) {
  throw new Error("Source registry entry does not use its direct immutable package path");
}
const sourceCatalogPath = resolve(
  repositoryRoot,
  "content",
  sourceEntry.relativePath,
  "item-catalog.json",
);
const relativeSourceCatalog = relative(repositoryRoot, sourceCatalogPath);
if (isAbsolute(relativeSourceCatalog) || relativeSourceCatalog.startsWith("..")) {
  throw new Error("Source item catalog must stay inside the repository");
}
if (!existsSync(sourceCatalogPath)) {
  throw new Error(`Source package has no item catalog: ${relativeSourceCatalog}`);
}
const sourceCatalog = JSON.parse(
  readFileSync(sourceCatalogPath, "utf8"),
) as ItemCatalogArtifact;
if (sourceCatalog.contentVersion !== sourceVersion) {
  throw new Error("Source item catalog contentVersion does not match --from");
}
const authoring = extractAuthoringContent(sourceCatalog);
if (authoring.lessons.length === 0) {
  throw new Error("The source authoring catalog has no lessons");
}

const catalog = catalogSchemaVersion === 2
  ? await projectItemCatalogV2({
      contentVersion,
      ...authoring,
      lessonGuides: LESSON_GUIDES,
      knowledgeItemBlueprints: KNOWLEDGE_ITEM_BLUEPRINTS,
    })
  : await projectItemCatalog({
      contentVersion,
      ...authoring,
    });

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(catalog, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
});
console.log(
  `Created pending item catalog ${relativeOutput} with ${catalog.items.length} concrete payloads and no approvals`,
);
