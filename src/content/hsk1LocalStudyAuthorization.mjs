import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  assertValidHsk1DailyLifeLocalStudyBundle,
  HSK1_DAILY_LIFE_CORE_RELATIVE_PATH,
  HSK1_DAILY_LIFE_REVIEW_RELATIVE_PATH,
  HSK1_DAILY_LIFE_TARGET_VERSION,
  HSK1_DAILY_LIFE_UNIT_ID,
  loadHsk1DailyLifeLocalStudyBundle,
} from "./hsk1DailyLifeLocalStudy.mjs";
import {
  validateMaterializedHsk1DailyLifePackage,
} from "./hsk1DailyLifePackage.mjs";
import {
  assertValidHsk1LocalStudyReviewBundle,
  HSK1_LOCAL_STUDY_REVIEW_RELATIVE_PATH,
  loadHsk1LocalStudyReviewBundle,
} from "./hsk1LocalStudyReview.mjs";
import {
  validateMaterializedHsk1LocalStudyPackage,
} from "./hsk1LocalStudyPackage.mjs";
import {
  HSK_LOCAL_STUDY_PROFILE_ID,
  HSK_LOCAL_STUDY_PROFILE_RELATIVE_PATH,
} from "./hskLocalStudyProfile.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_LOCAL_STUDY_AUTHORIZATION_RELATIVE_PATH =
  "content/curriculum/hsk0-4-local-study-authorizations.json";
export const HSK1_LOCAL_STUDY_AUTHORIZATION_ID =
  "hsk0-4-local-study-authorizations-2026.07.2";

const CURRENT_CONTENT_VERSION = HSK1_DAILY_LIFE_TARGET_VERSION;
const GRAPH_RELATIVE_PATH = "content/curriculum/hsk0-4-graph.json";
const RELEASE_POLICY_RELATIVE_PATH =
  "content/curriculum/hsk0-4-unit-release-policy.json";
const PACKAGE_MANIFEST_RELATIVE_PATH =
  `content/packages/${CURRENT_CONTENT_VERSION}/manifest.json`;
const PACKAGE_ITEM_CATALOG_RELATIVE_PATH =
  `content/packages/${CURRENT_CONTENT_VERSION}/item-catalog.json`;

const readJson = (root, relativePath) => JSON.parse(readFileSync(
  resolve(root, relativePath),
  "utf8",
));
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const sourceBinding = (root, id, relativePath) => ({
  id,
  relativePath,
  sha256: fileSha256(resolve(root, relativePath)),
});

export const loadHsk1LocalStudyAuthorizationSources = (
  root = process.cwd(),
) => ({
  root,
  graph: readJson(root, GRAPH_RELATIVE_PATH),
  releasePolicy: readJson(root, RELEASE_POLICY_RELATIVE_PATH),
  packageManifest: readJson(root, PACKAGE_MANIFEST_RELATIVE_PATH),
  packageItemCatalog: readJson(root, PACKAGE_ITEM_CATALOG_RELATIVE_PATH),
  localStudyReviewBundle: loadHsk1LocalStudyReviewBundle(root),
  dailyLifeBundle: loadHsk1DailyLifeLocalStudyBundle(root),
});

const presentationTargetCounts = (counts, includedTypes) => {
  const sourceTargetTypeCounts = Object.fromEntries(
    Object.entries(counts).filter(([targetType]) =>
      includedTypes.includes(targetType)
    ),
  );
  return {
    sourceTargetCount: Object.values(sourceTargetTypeCounts).reduce(
      (sum, count) => sum + count,
      0,
    ),
    sourceTargetTypeCounts,
  };
};

const assertAuthorizedUnitSources = ({
  source,
  unitId,
  lessonIds,
}) => {
  const graphUnit = source.graph.units.find((unit) => unit.unitId === unitId);
  const graphLessonIds = source.graph.lessonMappings
    .filter((mapping) => mapping.unitId === unitId)
    .map((mapping) => mapping.lessonId);
  const release = source.releasePolicy.units.find(
    (unit) => unit.unitId === unitId,
  );
  const packageLessonIds = source.packageItemCatalog.items
    .filter((item) =>
      item.itemType === "lesson" && lessonIds.includes(item.itemId)
    )
    .map((item) => item.itemId);
  if (
    graphUnit?.status !== "foundation"
    || !exact(graphLessonIds, lessonIds)
    || !exact(release?.lessonIds, lessonIds)
    || !exact(packageLessonIds, lessonIds)
  ) {
    throw new Error(`${unitId} local-study authorization sources are inconsistent`);
  }
};

export const projectHsk1LocalStudyAuthorization = async (source) => {
  await assertValidHsk1LocalStudyReviewBundle(
    source.localStudyReviewBundle,
  );
  await assertValidHsk1DailyLifeLocalStudyBundle(source.dailyLifeBundle);
  const historicalPackageValidation =
    await validateMaterializedHsk1LocalStudyPackage(source.root);
  const currentPackageValidation =
    await validateMaterializedHsk1DailyLifePackage(source.root);
  if (!historicalPackageValidation.valid || !currentPackageValidation.valid) {
    throw new Error("HSK1 local-study package lineage is invalid");
  }
  if (
    source.graph.runtimeContentVersion !== CURRENT_CONTENT_VERSION
    || source.releasePolicy.runtimeContentVersion !== CURRENT_CONTENT_VERSION
    || source.packageManifest.packageId !== CURRENT_CONTENT_VERSION
    || source.packageManifest.contentVersion !== CURRENT_CONTENT_VERSION
    || source.packageManifest.artifacts?.["item-catalog.json"]
      !== await sha256Json(source.packageItemCatalog)
  ) {
    throw new Error("HSK1 local-study current package identity is inconsistent");
  }

  const timeReview = source.localStudyReviewBundle.review;
  const timeLessonIds = timeReview.coverage.lessonIds.map((lessonId) =>
    lessonId.replaceAll(":", "-")
  );
  const dailyReview = source.dailyLifeBundle.review;
  const dailyLessonIds = [...dailyReview.coverage.lessonIds];
  assertAuthorizedUnitSources({
    source,
    unitId: timeReview.unitId,
    lessonIds: timeLessonIds,
  });
  assertAuthorizedUnitSources({
    source,
    unitId: dailyReview.unitId,
    lessonIds: dailyLessonIds,
  });
  if (
    timeReview.acceptance.readyForLocalStudyVisibility !== true
    || timeReview.reviewer.humanReviewed !== false
    || timeReview.acceptance.claims.productionEligible !== false
    || dailyReview.claims.readyForPersonalLocalStudyPackaging !== true
    || dailyReview.reviewer.humanReviewed !== false
    || dailyReview.claims.productionEligible !== false
  ) {
    throw new Error("HSK1 local-study reviewed unit policy is inconsistent");
  }
  const timePresentation = presentationTargetCounts(
    timeReview.coverage.contentTargetTypeCounts,
    [
      "dialogue-turn",
      "grammar-draft",
      "grammar-practice",
      "task-dialogue-turn",
      "task-practice",
      "task-scenario",
      "topic-draft",
      "vocabulary-practice",
    ],
  );
  const dailyPresentation = presentationTargetCounts(
    dailyReview.coverage.sourceTargetTypeCounts,
    [
      "dialogue-turn",
      "grammar-draft",
      "task-dialogue-turn",
      "task-scenario",
      "topic-draft",
    ],
  );
  const itemCatalogSha256 =
    source.packageManifest.artifacts["item-catalog.json"];
  const authorizationFor = ({
    unitId,
    lessonIds,
    unitReleaseDigest,
    reviewId,
    reviewSha256,
    presentation,
  }) => ({
    unitId,
    lessonIds,
    unitReleaseDigest,
    localStudyReviewId: reviewId,
    localStudyReviewSha256: reviewSha256,
    packageId: source.packageManifest.packageId,
    itemCatalogSha256,
    authorizationState: "authorized-for-personal-local-study",
    presentation: {
      authorizationState: "authorized-for-personal-local-study",
      ...presentation,
      aiAssistedReviewDisclosed: true,
      humanReviewed: false,
      measurementEligible: false,
      masteryEligible: false,
    },
  });

  const payload = {
    schemaVersion: 1,
    authorizationId: HSK1_LOCAL_STUDY_AUTHORIZATION_ID,
    profileId: HSK_LOCAL_STUDY_PROFILE_ID,
    runtimeContentVersion: CURRENT_CONTENT_VERSION,
    scope: "personal-local-study-runtime-only",
    sourceBindings: [
      sourceBinding(
        source.root,
        "localStudyProfile",
        HSK_LOCAL_STUDY_PROFILE_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "timePlaceEventsReview",
        HSK1_LOCAL_STUDY_REVIEW_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "dailyLifeReview",
        HSK1_DAILY_LIFE_REVIEW_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "dailyLifeCore",
        HSK1_DAILY_LIFE_CORE_RELATIVE_PATH,
      ),
      sourceBinding(source.root, "curriculumGraph", GRAPH_RELATIVE_PATH),
      sourceBinding(source.root, "unitReleasePolicy", RELEASE_POLICY_RELATIVE_PATH),
      sourceBinding(source.root, "packageManifest", PACKAGE_MANIFEST_RELATIVE_PATH),
      sourceBinding(source.root, "packageItemCatalog", PACKAGE_ITEM_CATALOG_RELATIVE_PATH),
    ],
    authorizations: [
      authorizationFor({
        unitId: timeReview.unitId,
        lessonIds: timeLessonIds,
        unitReleaseDigest: timeReview.unitReleaseDigest,
        reviewId: timeReview.reviewId,
        reviewSha256: timeReview.reviewSha256,
        presentation: timePresentation,
      }),
      authorizationFor({
        unitId: HSK1_DAILY_LIFE_UNIT_ID,
        lessonIds: dailyLessonIds,
        unitReleaseDigest: source.dailyLifeBundle.core.integritySha256,
        reviewId: dailyReview.reviewId,
        reviewSha256: dailyReview.reviewSha256,
        presentation: dailyPresentation,
      }),
    ],
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
  return {
    ...payload,
    authorizationSha256: await sha256Json(payload),
  };
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
  const time = authorization?.authorizations?.find(
    (item) => item.unitId === "hsk1-time-place-events",
  );
  const daily = authorization?.authorizations?.find(
    (item) => item.unitId === HSK1_DAILY_LIFE_UNIT_ID,
  );
  if (
    !isRecord(authorization)
    || authorization.schemaVersion !== 1
    || authorization.authorizationId !== HSK1_LOCAL_STUDY_AUTHORIZATION_ID
    || authorization.profileId !== HSK_LOCAL_STUDY_PROFILE_ID
    || authorization.runtimeContentVersion !== CURRENT_CONTENT_VERSION
    || authorization.scope !== "personal-local-study-runtime-only"
    || !Array.isArray(authorization.sourceBindings)
    || authorization.authorizations?.length !== 2
    || time?.lessonIds?.length !== 6
    || time?.presentation?.sourceTargetCount !== 338
    || daily?.lessonIds?.length !== 4
    || daily?.presentation?.sourceTargetCount !== 56
    || authorization.authorizations.some(
      (item) =>
        item.presentation?.humanReviewed !== false
        || item.presentation?.measurementEligible !== false
        || item.presentation?.masteryEligible !== false,
    )
    || authorization.policy?.humanReviewed !== false
    || authorization.policy?.grantsProductionEligibility !== false
    || authorization.policy?.sitesDeploymentAuthorized !== false
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
