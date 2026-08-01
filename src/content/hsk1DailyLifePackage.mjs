import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  assertValidHsk1DailyLifeLocalStudyBundle,
  HSK1_DAILY_LIFE_TARGET_VERSION,
  loadHsk1DailyLifeLocalStudyBundle,
} from "./hsk1DailyLifeLocalStudy.mjs";

export const HSK1_DAILY_LIFE_BASE_VERSION = "foundation-2026.07.7";
export const HSK1_DAILY_LIFE_PACKAGE_INPUT_DIRECTORY =
  "content/runtime/daily-life-package-input";

const DAILY_LESSON_IDS = new Set(["daily-1", "daily-2", "daily-3", "daily-4"]);
const REPLACED_LEGACY_VOCABULARY_IDS = new Set(["cha", "he", "kan", "you"]);
const REPLACED_LEGACY_KNOWLEDGE_ITEM_KEYS = new Set([
  "grammar:you-quantity-ge",
  "grammar:time-expression-position",
  "grammar:de-possession",
  "communicative-function:state-and-ask-family-size",
  "communicative-function:state-and-ask-food-drink",
  "communicative-function:identify-possession",
]);
const readJson = (root, relativePath) => JSON.parse(readFileSync(
  resolve(root, relativePath),
  "utf8",
));
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const duplicates = (values) => values.filter(
  (value, index) => values.indexOf(value) !== index,
);

export const loadHsk1DailyLifePackageSources = (
  root = process.cwd(),
) => ({
  root,
  baseItemCatalog: readJson(
    root,
    `content/packages/${HSK1_DAILY_LIFE_BASE_VERSION}/item-catalog.json`,
  ),
  baseRuntimeIds: readJson(
    root,
    `content/packages/${HSK1_DAILY_LIFE_BASE_VERSION}/runtime-ids.json`,
  ),
  dailyLifeBundle: loadHsk1DailyLifeLocalStudyBundle(root),
});

export const projectHsk1DailyLifePackageInputs = async (source) => {
  await assertValidHsk1DailyLifeLocalStudyBundle(source.dailyLifeBundle);
  const { review, core } = source.dailyLifeBundle;
  if (
    source.baseItemCatalog.contentVersion !== HSK1_DAILY_LIFE_BASE_VERSION
    || source.baseRuntimeIds.contentVersion !== HSK1_DAILY_LIFE_BASE_VERSION
    || review.targetContentVersion !== HSK1_DAILY_LIFE_TARGET_VERSION
    || core.targetContentVersion !== HSK1_DAILY_LIFE_TARGET_VERSION
    || review.claims.readyForPersonalLocalStudyPackaging !== true
  ) {
    throw new Error("HSK1 daily-life package source identity has drifted");
  }
  const inheritedItems = await Promise.all(source.baseItemCatalog.items
    .filter((item) => !(
      item.itemType === "lesson" && DAILY_LESSON_IDS.has(item.itemId)
    ) && !(
      item.itemType === "lexeme"
      && REPLACED_LEGACY_VOCABULARY_IDS.has(item.itemId)
    ) && !REPLACED_LEGACY_KNOWLEDGE_ITEM_KEYS.has(item.itemKey))
    .map(async (item) => {
      const projected = structuredClone(item);
      projected.itemVersion = HSK1_DAILY_LIFE_TARGET_VERSION;
      if (
        projected.itemType === "lesson"
        && Array.isArray(projected.payload?.wordIds)
      ) {
        projected.payload.wordIds = projected.payload.wordIds.filter(
          (id) => !REPLACED_LEGACY_VOCABULARY_IDS.has(id),
        );
        projected.knowledgeItems = (projected.knowledgeItems ?? []).filter(
          (reference) => !REPLACED_LEGACY_VOCABULARY_IDS.has(reference.itemId),
        );
        projected.payloadSha256 = await sha256Json({
          itemType: "lesson",
          payload: projected.payload,
        });
      }
      return projected;
    }));
  const lexemeItems = core.lexemes.map((lexeme) => ({
    itemKey: `lexeme:${lexeme.runtimeItemId}`,
    itemType: "lexeme",
    itemId: lexeme.runtimeItemId,
    itemVersion: HSK1_DAILY_LIFE_TARGET_VERSION,
    releaseState: "beta",
    payload: lexeme.payload,
    owner: null,
    sourceLicense: null,
    prerequisites: null,
    payloadSha256: lexeme.payloadSha256,
  }));
  const lessonItems = core.lessons.map((lesson) => ({
    itemKey: `lesson:${lesson.runtimeLessonId}`,
    itemType: "lesson",
    itemId: lesson.runtimeLessonId,
    itemVersion: HSK1_DAILY_LIFE_TARGET_VERSION,
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
  if (duplicates(itemKeys).length > 0) {
    throw new Error("HSK1 daily-life package item keys are duplicated");
  }
  const itemCatalog = {
    schemaVersion: 4,
    contentVersion: HSK1_DAILY_LIFE_TARGET_VERSION,
    items,
    audioAssets: [...(source.baseItemCatalog.audioAssets ?? [])],
  };

  const baseLessons = source.baseRuntimeIds.lessons.filter(
    (lesson) => !DAILY_LESSON_IDS.has(lesson.id),
  ).map((lesson) => ({
    ...lesson,
    wordIds: lesson.wordIds.filter(
      (id) => !REPLACED_LEGACY_VOCABULARY_IDS.has(id),
    ),
  }));
  const projectedLessons = core.lessons.map((lesson) => ({
    id: lesson.runtimeLessonId,
    unitId: lesson.payload.unitId,
    prerequisiteIds: lesson.prerequisites.map((item) => item.itemId),
    wordIds: [...lesson.payload.wordIds],
    releaseState: "beta",
  }));
  const runtimeIds = {
    ...source.baseRuntimeIds,
    contentVersion: HSK1_DAILY_LIFE_TARGET_VERSION,
    vocabularyIds: [
      ...source.baseRuntimeIds.vocabularyIds.filter(
        (id) => !REPLACED_LEGACY_VOCABULARY_IDS.has(id),
      ),
      ...core.lexemes.map((lexeme) => lexeme.runtimeItemId),
    ],
    unitIds: [...source.baseRuntimeIds.unitIds],
    lessons: [...baseLessons, ...projectedLessons],
    stories: [...source.baseRuntimeIds.stories],
  };
  if (
    duplicates(runtimeIds.vocabularyIds).length > 0
    || duplicates(runtimeIds.lessons.map((lesson) => lesson.id)).length > 0
    || projectedLessons.some((lesson, index) =>
      lesson.id !== `daily-${index + 1}`
    )
  ) {
    throw new Error("HSK1 daily-life runtime IDs are invalid");
  }
  const coverageClaims = {
    schemaVersion: 2,
    itemCatalogSha256: await sha256Json(itemCatalog),
    coverageClaims: [],
    contentVersion: HSK1_DAILY_LIFE_TARGET_VERSION,
  };
  return {
    itemCatalog,
    runtimeIds,
    coverageClaims,
    summary: {
      inheritedItems: inheritedItems.length,
      replacedLessons: lessonItems.length,
      addedLexemes: lexemeItems.length,
      totalItems: items.length,
      runtimeVocabularyIds: runtimeIds.vocabularyIds.length,
      runtimeLessons: runtimeIds.lessons.length,
      humanReviewed: review.reviewer.humanReviewed,
      localStudyReady: review.claims.readyForPersonalLocalStudyPackaging,
      productionEligible: review.claims.productionEligible,
    },
  };
};

export const validateMaterializedHsk1DailyLifePackage = async (
  root = process.cwd(),
) => {
  const expected = await projectHsk1DailyLifePackageInputs(
    loadHsk1DailyLifePackageSources(root),
  );
  const packageRoot =
    `content/packages/${HSK1_DAILY_LIFE_TARGET_VERSION}`;
  const actual = {
    itemCatalog: readJson(root, `${packageRoot}/item-catalog.json`),
    runtimeIds: readJson(root, `${packageRoot}/runtime-ids.json`),
    coverageClaims: readJson(root, `${packageRoot}/coverage-claims.json`),
  };
  const errors = [];
  if (!exact(actual.itemCatalog, expected.itemCatalog)) {
    errors.push("materialized daily-life item catalog has drifted");
  }
  if (!exact(actual.runtimeIds, expected.runtimeIds)) {
    errors.push("materialized daily-life runtime IDs have drifted");
  }
  if (!exact(actual.coverageClaims, expected.coverageClaims)) {
    errors.push("materialized daily-life coverage claims have drifted");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expected.summary,
  };
};
