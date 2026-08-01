import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  HSK1_LEVEL_CORE_RELATIVE_PATH,
  HSK1_LEVEL_REVIEW_RELATIVE_PATH,
  loadHsk1LevelBatchBundle,
  validateHsk1LevelBatchBundle,
  validateMaterializedHsk1LevelPackage,
} from "./hsk1LevelBatch.mjs";
import {
  HSK2_LEVEL_CORE_RELATIVE_PATH,
  HSK2_LEVEL_REVIEW_RELATIVE_PATH,
  loadHsk2LevelBatchBundle,
  validateHsk2LevelBatchBundle,
  validateMaterializedHsk2LevelPackage,
} from "./hsk2LevelBatch.mjs";
import {
  HSK3_LEVEL_CORE_RELATIVE_PATH,
  HSK3_LEVEL_REVIEW_RELATIVE_PATH,
  loadHsk3LevelBatchBundle,
  validateHsk3LevelBatchBundle,
  validateMaterializedHsk3LevelPackage,
} from "./hsk3LevelBatch.mjs";
import {
  HSK4_LEVEL_CORE_RELATIVE_PATH,
  HSK4_LEVEL_REVIEW_RELATIVE_PATH,
  loadHsk4LevelBatchBundle,
  validateHsk4LevelBatchBundle,
  validateMaterializedHsk4LevelPackage,
} from "./hsk4LevelBatch.mjs";
import {
  HSK_LOCAL_STUDY_PROFILE_ID,
  HSK_LOCAL_STUDY_PROFILE_RELATIVE_PATH,
} from "./hskLocalStudyProfile.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_LOCAL_STUDY_AUTHORIZATION_RELATIVE_PATH =
  "content/curriculum/hsk0-4-local-study-authorizations.json";
export const HSK1_LOCAL_STUDY_AUTHORIZATION_ID =
  "hsk0-4-local-study-authorizations-2026.08.5";

const CURRENT_LOCAL_STUDY_VERSION = "foundation-2026.08.5";

const GRAPH_RELATIVE_PATH = "content/curriculum/hsk0-4-graph.json";
const RELEASE_POLICY_RELATIVE_PATH =
  "content/curriculum/hsk0-4-unit-release-policy.json";
const PACKAGE_MANIFEST_RELATIVE_PATH =
  `content/packages/${CURRENT_LOCAL_STUDY_VERSION}/manifest.json`;
const PACKAGE_ITEM_CATALOG_RELATIVE_PATH =
  `content/packages/${CURRENT_LOCAL_STUDY_VERSION}/item-catalog.json`;

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
  "hsk2-situational-dialogue": {
    lesson: 20,
    vocabulary: 200,
    vocabularyPractice: 600,
    dialogueTurn: 120,
    task: 17,
    topic: 34,
    guidedRoleplay: 20,
  },
  "hsk2-sentence-chains": {
    lesson: 10,
    grammar: 75,
    grammarPractice: 75,
  },
  "hsk2-short-text-production": {
    lesson: 10,
    character: 125,
    characterPractice: 250,
    productionPrompt: 104,
  },
  "hsk3-paragraph-input": {
    lesson: 25,
    vocabulary: 500,
    character: 284,
    topic: 54,
    paragraphLine: 400,
  },
  "hsk3-narration": {
    lesson: 15,
    grammar: 96,
    task: 22,
    narrationLine: 90,
  },
  "hsk3-guided-production": {
    lesson: 15,
    productionPrompt: 92,
  },
  "hsk4-deep-comprehension": {
    lesson: 36,
    vocabulary: 1000,
    character: 441,
    topic: 77,
    paragraph: 216,
  },
  "hsk4-summary-argument": {
    lesson: 24,
    grammar: 95,
    task: 30,
  },
  "hsk4-timed-integration": {
    lesson: 18,
    productionPrompt: 106,
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
  hsk1LevelBundle: loadHsk1LevelBatchBundle(root),
  hsk2LevelBundle: loadHsk2LevelBatchBundle(root),
  hsk3LevelBundle: loadHsk3LevelBatchBundle(root),
  hsk4LevelBundle: loadHsk4LevelBatchBundle(root),
});

export const projectHsk1LocalStudyAuthorization = async (source) => {
  const [
    hsk1Validation,
    hsk2Validation,
    hsk3Validation,
    hsk4Validation,
    hsk1Package,
    hsk2Package,
    hsk3Package,
    hsk4Package,
  ] =
    await Promise.all([
      validateHsk1LevelBatchBundle(source.hsk1LevelBundle),
      validateHsk2LevelBatchBundle(source.hsk2LevelBundle),
      validateHsk3LevelBatchBundle(source.hsk3LevelBundle),
      validateHsk4LevelBatchBundle(source.hsk4LevelBundle),
      validateMaterializedHsk1LevelPackage(source.root),
      validateMaterializedHsk2LevelPackage(source.root),
      validateMaterializedHsk3LevelPackage(source.root),
      validateMaterializedHsk4LevelPackage(source.root),
    ]);
  if (
    !hsk1Validation.valid
    || !hsk2Validation.valid
    || !hsk3Validation.valid
    || !hsk4Validation.valid
    || !hsk1Package.valid
    || !hsk2Package.valid
    || !hsk3Package.valid
    || !hsk4Package.valid
  ) {
    throw new Error("HSK1/2/3/4 review or package lineage is invalid");
  }
  if (
    source.graph.runtimeContentVersion !== CURRENT_LOCAL_STUDY_VERSION
    || source.releasePolicy.runtimeContentVersion !== CURRENT_LOCAL_STUDY_VERSION
    || source.packageManifest.packageId !== CURRENT_LOCAL_STUDY_VERSION
    || source.packageManifest.contentVersion !== CURRENT_LOCAL_STUDY_VERSION
  ) {
    throw new Error("HSK1/2/3/4 local authorization source identity is inconsistent");
  }
  const itemCatalogSha256 = source.packageManifest.artifacts["item-catalog.json"];
  const authorizations = Object.entries(PRESENTATION_COUNTS).map(
    ([unitId, typeCounts]) => {
      const bundle = unitId.startsWith("hsk4-")
        ? source.hsk4LevelBundle
        : unitId.startsWith("hsk3-")
          ? source.hsk3LevelBundle
        : unitId.startsWith("hsk2-")
          ? source.hsk2LevelBundle
          : source.hsk1LevelBundle;
      const { core, review } = bundle;
      if (
        review.reviewer.humanReviewed !== false
        || review.reviewResult.unresolvedIssueCount !== 0
        || review.claims.productionEligible !== false
      ) {
        throw new Error(`${unitId} local review policy is inconsistent`);
      }
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
        .filter((item) =>
          item.itemType === "lesson" && lessonIds.includes(item.itemId)
        )
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
    runtimeContentVersion: CURRENT_LOCAL_STUDY_VERSION,
    scope: "personal-local-study-runtime-only",
    sourceBindings: [
      sourceBinding(source.root, "localStudyProfile", HSK_LOCAL_STUDY_PROFILE_RELATIVE_PATH),
      sourceBinding(source.root, "hsk1LevelReview", HSK1_LEVEL_REVIEW_RELATIVE_PATH),
      sourceBinding(source.root, "hsk1LevelCore", HSK1_LEVEL_CORE_RELATIVE_PATH),
      sourceBinding(source.root, "hsk2LevelReview", HSK2_LEVEL_REVIEW_RELATIVE_PATH),
      sourceBinding(source.root, "hsk2LevelCore", HSK2_LEVEL_CORE_RELATIVE_PATH),
      sourceBinding(source.root, "hsk3LevelReview", HSK3_LEVEL_REVIEW_RELATIVE_PATH),
      sourceBinding(source.root, "hsk3LevelCore", HSK3_LEVEL_CORE_RELATIVE_PATH),
      sourceBinding(source.root, "hsk4LevelReview", HSK4_LEVEL_REVIEW_RELATIVE_PATH),
      sourceBinding(source.root, "hsk4LevelCore", HSK4_LEVEL_CORE_RELATIVE_PATH),
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
  const hsk1 = authorization?.authorizations?.filter(
    (item) => item.unitId.startsWith("hsk1-"),
  ) ?? [];
  const hsk2 = authorization?.authorizations?.filter(
    (item) => item.unitId.startsWith("hsk2-"),
  ) ?? [];
  const hsk3 = authorization?.authorizations?.filter(
    (item) => item.unitId.startsWith("hsk3-"),
  ) ?? [];
  const hsk4 = authorization?.authorizations?.filter(
    (item) => item.unitId.startsWith("hsk4-"),
  ) ?? [];
  if (
    authorization?.authorizationId !== HSK1_LOCAL_STUDY_AUTHORIZATION_ID
    || authorization?.runtimeContentVersion !== CURRENT_LOCAL_STUDY_VERSION
    || authorization?.authorizations?.length !== 15
    || hsk1.length !== 6
    || hsk1.reduce((sum, item) => sum + item.lessonIds.length, 0) !== 40
    || hsk2.length !== 3
    || hsk2.reduce((sum, item) => sum + item.lessonIds.length, 0) !== 40
    || hsk3.length !== 3
    || hsk3.reduce((sum, item) => sum + item.lessonIds.length, 0) !== 55
    || hsk4.length !== 3
    || hsk4.reduce((sum, item) => sum + item.lessonIds.length, 0) !== 78
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
      hsk1Lessons: hsk1.reduce(
        (sum, item) => sum + item.lessonIds.length,
        0,
      ),
      hsk2Lessons: hsk2.reduce(
        (sum, item) => sum + item.lessonIds.length,
        0,
      ),
      hsk3Lessons: hsk3.reduce(
        (sum, item) => sum + item.lessonIds.length,
        0,
      ),
      hsk4Lessons: hsk4.reduce(
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
