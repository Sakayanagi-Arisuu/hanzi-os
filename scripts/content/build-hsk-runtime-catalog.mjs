import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK_RUNTIME_CATALOG_RELATIVE_PATH,
  loadHskRuntimeCatalogSourceBundle,
  projectHskRuntimeCatalog,
} from "../../src/content/hskRuntimeCatalog.mjs";

export const buildHskRuntimeCatalog = (root = process.cwd()) =>
  projectHskRuntimeCatalog(loadHskRuntimeCatalogSourceBundle(root));

export const serializeHskRuntimeCatalog = (catalog) =>
  `${JSON.stringify(catalog, null, 2)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = resolve(root, HSK_RUNTIME_CATALOG_RELATIVE_PATH);
  const serialized = serializeHskRuntimeCatalog(
    buildHskRuntimeCatalog(root),
  );
  const check = process.argv.includes("--check");
  if (check) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK runtime catalog is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK_RUNTIME_CATALOG_RELATIVE_PATH,
    mode: check ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
