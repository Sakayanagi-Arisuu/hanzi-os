import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  assertValidHsk1LocalStudyReviewBundle,
  loadHsk1LocalStudyReviewBundle,
} from "./hsk1LocalStudyReview.mjs";
import {
  assertValidHsk1UnitRuntimeProjectionBundle,
  loadHsk1UnitRuntimeProjectionBundle,
} from "./hsk1UnitRuntimeProjection.mjs";

export const HSK1_LOCAL_STUDY_PACKAGE_BASE_VERSION =
  "foundation-2026.07.6";
export const HSK1_LOCAL_STUDY_PACKAGE_VERSION =
  "foundation-2026.07.7";
export const HSK1_LOCAL_STUDY_PACKAGE_INPUT_DIRECTORY =
  "content/runtime/local-study-package-input";

const BASE_ITEM_CATALOG_RELATIVE_PATH =
  `content/packages/${HSK1_LOCAL_STUDY_PACKAGE_BASE_VERSION}/item-catalog.json`;
const BASE_RUNTIME_IDS_RELATIVE_PATH =
  `content/packages/${HSK1_LOCAL_STUDY_PACKAGE_BASE_VERSION}/runtime-ids.json`;

const readJson = (root, relativePath) => JSON.parse(readFileSync(
  resolve(root, relativePath),
  "utf8",
));
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

export const loadHsk1LocalStudyPackageSources = (
  root = process.cwd(),
) => ({
  root,
  baseItemCatalog: readJson(root, BASE_ITEM_CATALOG_RELATIVE_PATH),
  baseRuntimeIds: readJson(root, BASE_RUNTIME_IDS_RELATIVE_PATH),
  runtimeProjectionBundle: loadHsk1UnitRuntimeProjectionBundle(root),
  localStudyReviewBundle: loadHsk1LocalStudyReviewBundle(root),
});

export const projectHsk1LocalStudyPackageInputs = async (source) => {
  await assertValidHsk1UnitRuntimeProjectionBundle(
    source.runtimeProjectionBundle,
  );
  await assertValidHsk1LocalStudyReviewBundle(
    source.localStudyReviewBundle,
  );
  const projection = source.runtimeProjectionBundle.projection;
  const review = source.localStudyReviewBundle.review;
  if (
    source.baseItemCatalog.contentVersion
      !== HSK1_LOCAL_STUDY_PACKAGE_BASE_VERSION
    || source.baseRuntimeIds.contentVersion
      !== HSK1_LOCAL_STUDY_PACKAGE_BASE_VERSION
    || projection.targetPackageVersion !== HSK1_LOCAL_STUDY_PACKAGE_VERSION
    || review.unitReleaseDigest
      !== source.localStudyReviewBundle.source.reviewerPacket.unitReleaseDigest
    || review.acceptance.readyForLocalStudyVisibility !== true
  ) {
    throw new Error("HSK1 local-study package source identity has drifted");
  }

  const inheritedItems = source.baseItemCatalog.items.map((item) => ({
    ...item,
    itemVersion: HSK1_LOCAL_STUDY_PACKAGE_VERSION,
  }));
  const lexemeItems = projection.lexemes.map((lexeme) => ({
    itemKey: `lexeme:${lexeme.runtimeItemId}`,
    itemType: "lexeme",
    itemId: lexeme.runtimeItemId,
    itemVersion: HSK1_LOCAL_STUDY_PACKAGE_VERSION,
    releaseState: "beta",
    payload: lexeme.payload,
    owner: null,
    sourceLicense: null,
    prerequisites: null,
    payloadSha256: lexeme.payloadSha256,
  }));
  const lessonItems = projection.lessons.map((lesson) => ({
    itemKey: `lesson:${lesson.runtimeLessonId}`,
    itemType: "lesson",
    itemId: lesson.runtimeLessonId,
    itemVersion: HSK1_LOCAL_STUDY_PACKAGE_VERSION,
    releaseState: "beta",
    payload: lesson.payload,
    owner: null,
    sourceLicense: null,
    prerequisites: lesson.prerequisites,
    payloadSha256: lesson.payloadSha256,
    knowledgeItems: lesson.knowledgeItems,
  }));
  const items = [...inheritedItems, ...lexemeItems, ...lessonItems];
  const itemKeys = items.map((item) => item.itemKey);
  if (duplicateValues(itemKeys).length > 0) {
    throw new Error("HSK1 local-study package contains duplicate item keys");
  }
  const itemCatalog = {
    schemaVersion: 4,
    contentVersion: HSK1_LOCAL_STUDY_PACKAGE_VERSION,
    items,
    audioAssets: [...(source.baseItemCatalog.audioAssets ?? [])],
  };

  const runtimeIds = {
    ...source.baseRuntimeIds,
    contentVersion: HSK1_LOCAL_STUDY_PACKAGE_VERSION,
    vocabularyIds: [
      ...source.baseRuntimeIds.vocabularyIds,
      ...projection.lexemes.map((lexeme) => lexeme.runtimeItemId),
    ],
    unitIds: [
      ...source.baseRuntimeIds.unitIds,
      "hsk1-time-place-events",
    ],
    lessons: [
      ...source.baseRuntimeIds.lessons,
      ...projection.lessons.map((lesson) => ({
        id: lesson.runtimeLessonId,
        unitId: lesson.payload.unitId,
        prerequisiteIds: lesson.prerequisites.map(
          (prerequisite) => prerequisite.itemId,
        ),
        wordIds: [...lesson.payload.wordIds],
        releaseState: "beta",
      })),
    ],
    stories: [...source.baseRuntimeIds.stories],
  };
  if (
    duplicateValues(runtimeIds.vocabularyIds).length > 0
    || duplicateValues(runtimeIds.unitIds).length > 0
    || duplicateValues(runtimeIds.lessons.map((lesson) => lesson.id)).length > 0
  ) {
    throw new Error("HSK1 local-study runtime IDs are duplicated");
  }
  const coverageClaims = {
    schemaVersion: 2,
    itemCatalogSha256: await sha256Json(itemCatalog),
    coverageClaims: [],
    contentVersion: HSK1_LOCAL_STUDY_PACKAGE_VERSION,
  };
  return {
    itemCatalog,
    runtimeIds,
    coverageClaims,
    summary: {
      inheritedItems: inheritedItems.length,
      addedLexemes: lexemeItems.length,
      addedLessons: lessonItems.length,
      totalItems: items.length,
      runtimeVocabularyIds: runtimeIds.vocabularyIds.length,
      runtimeLessons: runtimeIds.lessons.length,
      humanReviewed: review.reviewer.humanReviewed,
      localStudyReady: review.acceptance.readyForLocalStudyVisibility,
      productionEligible: review.acceptance.claims.productionEligible,
    },
  };
};

export const validateMaterializedHsk1LocalStudyPackage = async (
  root = process.cwd(),
) => {
  const expected = await projectHsk1LocalStudyPackageInputs(
    loadHsk1LocalStudyPackageSources(root),
  );
  const packageRoot =
    `content/packages/${HSK1_LOCAL_STUDY_PACKAGE_VERSION}`;
  const actual = {
    itemCatalog: readJson(root, `${packageRoot}/item-catalog.json`),
    runtimeIds: readJson(root, `${packageRoot}/runtime-ids.json`),
    coverageClaims: readJson(root, `${packageRoot}/coverage-claims.json`),
  };
  const errors = [];
  if (!exact(actual.itemCatalog, expected.itemCatalog)) {
    errors.push("materialized local-study item catalog has drifted");
  }
  if (!exact(actual.runtimeIds, expected.runtimeIds)) {
    errors.push("materialized local-study runtime IDs have drifted");
  }
  if (!exact(actual.coverageClaims, expected.coverageClaims)) {
    errors.push("materialized local-study coverage claims have drifted");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expected.summary,
  };
};
