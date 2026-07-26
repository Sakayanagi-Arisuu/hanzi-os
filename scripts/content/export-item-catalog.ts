import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COURSE_UNITS,
  LESSONS,
  STORIES,
  VOCABULARY,
} from "../../src/data/curriculum";
import { projectItemCatalog } from "../../src/content/itemCatalogProjection";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const parseArguments = (args: string[]) => {
  const flags = new Map<string, string | true>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${argument}`);
    }
    const name = argument.slice(2);
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
if (COURSE_UNITS.length === 0) {
  throw new Error("The checked-in curriculum has no course units");
}

const catalog = await projectItemCatalog({
  contentVersion,
  vocabulary: VOCABULARY,
  lessons: LESSONS,
  stories: STORIES,
});

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(catalog, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
});
console.log(
  `Created pending item catalog ${relativeOutput} with ${catalog.items.length} concrete payloads and no approvals`,
);
