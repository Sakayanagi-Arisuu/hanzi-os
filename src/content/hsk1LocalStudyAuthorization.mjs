import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  HSK1_LEVEL_CORE_RELATIVE_PATH,
  HSK1_LEVEL_REVIEW_RELATIVE_PATH,
  HSK1_LEVEL_TARGET_VERSION,
  loadHsk1LevelBatchBundle,
  validateHsk1LevelBatchBundle,
  validateMaterializedHsk1LevelPackage,
} from "./hsk1LevelBatch.mjs";
import {
  HSK_LOCAL_STUDY_PROFILE_ID,
  HSK_LOCAL_STUDY_PROFILE_RELATIVE_PATH,
} from "./hskLocalStudyProfile.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_LOCAL_STUDY_AUTHORIZATION_RELATIVE_PATH =
  "content/curriculum/hsk0-4-local-study-authorizations.json";
export const HSK1_LOCAL_STUDY_AUTHORIZATION_ID =
  "hsk0-4-local-study-authorizations-2026.08.1";

const GRAPH_RELATIVE_PATH = "content/curriculum/hsk0-4-graph.json";
const RELEASE_POLICY_RELATIVE_PATH =
  "content/curriculum/hsk0-4-unit-release-policy.json";
const PACKAGE_MANIFEST_RELATIVE_PATH =
  `content/packages/${HSK1_LEVEL_TARGET_VERSION}/manifest.json`;
const PACKAGE_ITEM_CATALOG_RELATIVE_PATH =
  `content/packages/${HSK1_LEVEL_TARGET_VERSION}/item-catalog.json`;

const readJson = (root, relativePath) => JSON.parse(readFileSync(
  resolve(root, relativePath),
  "utf8",
));
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const sourceBinding = (root, id, relativePath) => ({
  id,
  relativePath,
  sha256: fileSha256(resolve(root, relativePath)),
});

const PRESENTATION_COUNTS = {
  "hsk1-personal-exchange": {
    lesson: 9,
    vocabulary: 107,
    vocabularyPractice: 321,
    dialogueTurn: 38,
    grammar: 32,
    grammarPractice: 32,
    topic: 5,
    task: 2,
    taskDialogueTurn: 8,
    taskPractice: 2,
  },
  "hsk1-time-place-events": {
    vocabularyPractice: 243,
    dialogueTurn: 24,
    grammar: 25,
    grammarPractice: 25,
    topic: 3,
    task: 3,
    taskDialogueTurn: 12,
    taskPractice: 3,
  },
  "hsk1-daily-life": {
    dialogueTurn: 16,
    grammar: 5,
    topic: 10,
    task: 5,
    taskDialogueTurn: 20,
  },
  "hsk1-travel-leisure": {
    lesson: 2,
    vocabulary: 23,
    vocabularyPractice: 69,
    dialogueTurn: 8,
    grammar: 3,
    grammarPractice: 3,
    topic: 4,
    task: 2,
    taskDialogueTurn: 8,
    taskPractice: 2,
  },
  "hsk1-study-work": {
    lesson: 4,
    vocabulary: 35,
    vocabularyPractice: 105,
    dialogueTurn: 16,
    grammar: 1,
    grammarPractice: 1,
    topic: 8,
    task: 3,
    taskDialogueTurn: 12,
    taskPractice: 3,
  },
  "hsk1-character-foundation": {
    lesson: 15,
    character: 246,
    characterPractice: 492,
  },
};

export const loadHsk1LocalStudyAuthorizationSources = (
  root = process.cwd(),
) => ({
  root,
  graph: readJson(root, GRAPH_RELATIVE_PATH),
  releasePolicy: readJson(root, RELEASE_POLICY_RELATIVE_PATH),
  packageManifest: readJson(root, PACKAGE_MANIFEST_RELATIVE_PATH),
  packageItemCatalog: readJson(root, PACKAGE_ITEM_CATALOG_RELATIVE_PATH),
  levelBundle: loadHsk1LevelBatchBundle(root),
});

export const projectHsk1LocalStudyAuthorization = async (source) => {
  const levelValidation = await validateHsk1LevelBatchBundle(source.levelBundle);
  const packageValidation = await validateMaterializedHsk1LevelPackage(
    source.root,
  );
  if (!levelValidation.valid || !packageValidation.valid) {
    throw new Error("HSK1 level review or package lineage is invalid");
  }
  const { core, review } = source.levelBundle;
  if (
    source.graph.runtimeContentVersion !== HSK1_LEVEL_TARGET_VERSION
    || source.releasePolicy.runtimeContentVersion !== HSK1_LEVEL_TARGET_VERSION
    || source.packageManifest.packageId !== HSK1_LEVEL_TARGET_VERSION
    || source.packageManifest.contentVersion !== HSK1_LEVEL_TARGET_VERSION
    || review.reviewer.humanReviewed !== false
    || review.reviewResult.unresolvedIssueCount !== 0
    || review.claims.productionEligible !== false
  ) {
    throw new Error("HSK1 level authorization source identity is inconsistent");
  }
  const itemCatalogSha256 = source.packageManifest.artifacts["item-catalog.json"];
  const authorizations = Object.entries(PRESENTATION_COUNTS).map(
    ([unitId, typeCounts]) => {
      const lessonIds = core.lessons
        .filter((lesson) => lesson.unitId === unitId)
        .map((lesson) => lesson.runtimeLessonId);
      const graphLessonIds = source.graph.lessonMappings
        .filter((mapping) => mapping.unitId === unitId)
        .map((mapping) => mapping.lessonId);
      const releaseLessonIds = source.releasePolicy.units.find(
        (unit) => unit.unitId === unitId,
      )?.lessonIds;
      const packageLessonIds = source.packageItemCatalog.items
        .filter((item) => item.itemType === "lesson" && lessonIds.includes(item.itemId))
        .map((item) => item.itemId);
      if (
        lessonIds.length === 0
        || !exact(graphLessonIds, lessonIds)
        || !exact(releaseLessonIds, lessonIds)
        || !exact(packageLessonIds, lessonIds)
      ) {
        throw new Error(`${unitId} local-study authorization sources are inconsistent`);
      }
      return {
        unitId,
        lessonIds,
        unitReleaseDigest: core.integritySha256,
        localStudyReviewId: review.reviewId,
        localStudyReviewSha256: review.reviewSha256,
        packageId: source.packageManifest.packageId,
        itemCatalogSha256,
        authorizationState: "authorized-for-personal-local-study",
        presentation: {
          authorizationState: "authorized-for-personal-local-study",
          sourceTargetCount: Object.values(typeCounts).reduce(
            (sum, value) => sum + value,
            0,
          ),
          sourceTargetTypeCounts: typeCounts,
          aiAssistedReviewDisclosed: true,
          humanReviewed: false,
          measurementEligible: false,
          masteryEligible: false,
        },
      };
    },
  );
  const payload = {
    schemaVersion: 1,
    authorizationId: HSK1_LOCAL_STUDY_AUTHORIZATION_ID,
    profileId: HSK_LOCAL_STUDY_PROFILE_ID,
    runtimeContentVersion: HSK1_LEVEL_TARGET_VERSION,
    scope: "personal-local-study-runtime-only",
    sourceBindings: [
      sourceBinding(source.root, "localStudyProfile", HSK_LOCAL_STUDY_PROFILE_RELATIVE_PATH),
      sourceBinding(source.root, "hsk1LevelReview", HSK1_LEVEL_REVIEW_RELATIVE_PATH),
      sourceBinding(source.root, "hsk1LevelCore", HSK1_LEVEL_CORE_RELATIVE_PATH),
      sourceBinding(source.root, "curriculumGraph", GRAPH_RELATIVE_PATH),
      sourceBinding(source.root, "unitReleasePolicy", RELEASE_POLICY_RELATIVE_PATH),
      sourceBinding(source.root, "packageManifest", PACKAGE_MANIFEST_RELATIVE_PATH),
      sourceBinding(source.root, "packageItemCatalog", PACKAGE_ITEM_CATALOG_RELATIVE_PATH),
    ],
    authorizations,
    policy: {
      aiAssistedReviewDisclosed: true,
      humanReviewed: false,
      browserSpeechSynthesisPracticeOnly: true,
      grantsListeningMastery: false,
      grantsPronunciationMastery: false,
      grantsOfficialHskCertification: false,
      grantsProductionEligibility: false,
      sitesDeploymentAuthorized: false,
    },
  };
  return { ...payload, authorizationSha256: await sha256Json(payload) };
};

export const validateHsk1LocalStudyAuthorizationBundle = async ({
  source,
  authorization,
}) => {
  const errors = [];
  let expected;
  try {
    expected = await projectHsk1LocalStudyAuthorization(source);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }
  if (
    authorization?.authorizationId !== HSK1_LOCAL_STUDY_AUTHORIZATION_ID
    || authorization?.runtimeContentVersion !== HSK1_LEVEL_TARGET_VERSION
    || authorization?.authorizations?.length !== 6
    || authorization?.authorizations?.reduce(
      (sum, item) => sum + item.lessonIds.length,
      0,
    ) !== 40
    || authorization?.authorizations?.some((item) =>
      item.presentation?.humanReviewed !== false
      || item.presentation?.measurementEligible !== false
      || item.presentation?.masteryEligible !== false
    )
    || authorization?.policy?.humanReviewed !== false
    || authorization?.policy?.grantsProductionEligibility !== false
    || authorization?.policy?.sitesDeploymentAuthorized !== false
  ) {
    errors.push("HSK1 local-study authorization shape is invalid");
  }
  if (!exact(authorization, expected)) {
    errors.push("HSK1 local-study authorization does not match exact sources");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: {
      units: expected.authorizations.length,
      lessons: expected.authorizations.reduce(
        (sum, item) => sum + item.lessonIds.length,
        0,
      ),
      runtimeContentVersion: expected.runtimeContentVersion,
      humanReviewed: expected.policy.humanReviewed,
      productionEligible: expected.policy.grantsProductionEligibility,
      sitesAuthorized: expected.policy.sitesDeploymentAuthorized,
    },
  };
};

export const assertValidHsk1LocalStudyAuthorizationBundle = async (bundle) => {
  const result = await validateHsk1LocalStudyAuthorizationBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 local-study authorization:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};

export const loadHsk1LocalStudyAuthorizationBundle = (
  root = process.cwd(),
) => ({
  source: loadHsk1LocalStudyAuthorizationSources(root),
  authorization: readJson(root, HSK1_LOCAL_STUDY_AUTHORIZATION_RELATIVE_PATH),
});
