import registryJson from "../../content/registry.json";
import type { ContentRegistry, ContentRegistryEntry } from "./types";

const registry = registryJson as ContentRegistry;
const current = registry.packages.find(
  (entry) => entry.contentVersion === registry.currentContentVersion,
);

if (!current) {
  throw new Error(
    "The current content registry entry is missing.",
  );
}

/**
 * Answer-free package identity safe for authenticated client protocol code.
 * Curriculum data imports this identity; this module must never import the
 * curriculum or any authored answer bank in the opposite direction.
 */
export const CURRENT_CONTENT_PACKAGE_IDENTITY:
Readonly<ContentRegistryEntry> = current;
export const CURRENT_CONTENT_VERSION = current.contentVersion;
export const CURRENT_CONTENT_MANIFEST_SHA256 = current.manifestSha256;
export const CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE =
  current.closedAlphaEligible;
export const CURRENT_CONTENT_PRODUCTION_ELIGIBLE =
  current.productionEligible;
