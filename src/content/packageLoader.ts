import {
  canonicalJson as canonicalJsonRuntime,
  contentSourceArtifactNames as contentSourceArtifactNamesRuntime,
  sha256NormalizedText as sha256NormalizedTextRuntime,
  sha256Json as sha256JsonRuntime,
  validateContentBundle as validateContentBundleRuntime,
} from "./governance.mjs";
import type {
  ContentPackageBundle,
  ContentSourceArtifactName,
  ContentValidationResult,
  Sha256Digest,
} from "./types";

export const canonicalJson = canonicalJsonRuntime as (value: unknown) => string;

export const sha256Json = sha256JsonRuntime as (value: unknown) => Promise<Sha256Digest>;

export const sha256NormalizedText = sha256NormalizedTextRuntime as (
  value: string,
) => Promise<Sha256Digest>;

export const contentSourceArtifactNames = contentSourceArtifactNamesRuntime as (
  contentSchemaVersion: number,
) => ContentSourceArtifactName[];

export const validateContentBundle = validateContentBundleRuntime as (
  bundle: ContentPackageBundle,
) => Promise<ContentValidationResult>;
