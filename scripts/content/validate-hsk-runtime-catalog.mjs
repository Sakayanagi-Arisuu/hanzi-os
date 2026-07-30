import {
  assertValidHskRuntimeCatalogBundle,
  loadHskRuntimeCatalogBundle,
} from "../../src/content/hskRuntimeCatalog.mjs";

const result = assertValidHskRuntimeCatalogBundle(
  loadHskRuntimeCatalogBundle(),
);

console.log(JSON.stringify({
  valid: true,
  ...result.summary,
}, null, 2));
