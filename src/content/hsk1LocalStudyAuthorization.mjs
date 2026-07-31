import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  assertValidHsk1LocalStudyReviewBundle,
  HSK1_LOCAL_STUDY_REVIEW_RELATIVE_PATH,
  loadHsk1LocalStudyReviewBundle,
} from "./hsk1LocalStudyReview.mjs";
import {
  HSK1_LOCAL_STUDY_PACKAGE_VERSION,
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
  "hsk0-4-local-study-authorizations-2026.07.1";

const GRAPH_RELATIVE_PATH = "content/curriculum/hsk0-4-graph.json";
const RELEASE_POLICY_RELATIVE_PATH =
  "content/curriculum/hsk0-4-unit-release-policy.json";
const PACKAGE_MANIFEST_RELATIVE_PATH =
  `content/packages/${HSK1_LOCAL_STUDY_PACKAGE_VERSION}/manifest.json`;
const PACKAGE_ITEM_CATALOG_RELATIVE_PATH =
  `content/packages/${HSK1_LOCAL_STUDY_PACKAGE_VERSION}/item-catalog.json`;

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
});

export const projectHsk1LocalStudyAuthorization = async (source) => {
  await assertValidHsk1LocalStudyReviewBundle(
    source.localStudyReviewBundle,
  );
  const packageValidation =
    await validateMaterializedHsk1LocalStudyPackage(source.root);
  if (!packageValidation.valid) {
    throw new Error(
      `HSK1 local-study package is invalid: ${packageValidation.errors.join(", ")}`,
    );
  }
  const review = source.localStudyReviewBundle.review;
  const unitId = review.unitId;
  const lessonIds = review.coverage.lessonIds.map((lessonId) =>
    lessonId.replaceAll(":", "-")
  );
  const graphUnit = source.graph.units.find((unit) => unit.unitId === unitId);
  const graphLessonIds = source.graph.lessonMappings
    .filter((mapping) => mapping.unitId === unitId)
    .map((mapping) => mapping.lessonId);
  const release = source.releasePolicy.units.find(
    (unit) => unit.unitId === unitId,
  );
  const packageLessonIds = source.packageItemCatalog.items
    .filter((item) => item.itemType === "lesson" && lessonIds.includes(item.itemId))
    .map((item) => item.itemId);
  const presentationTargetTypeCounts = Object.fromEntries(
    Object.entries(review.coverage.contentTargetTypeCounts).filter(
      ([targetType]) => !["lesson-blueprint", "vocabulary-draft"].includes(targetType),
    ),
  );
  const presentationTargetCount = Object.values(
    presentationTargetTypeCounts,
  ).reduce((sum, count) => sum + count, 0);
  if (
    source.graph.runtimeContentVersion !== HSK1_LOCAL_STUDY_PACKAGE_VERSION
    || source.releasePolicy.runtimeContentVersion
      !== HSK1_LOCAL_STUDY_PACKAGE_VERSION
    || source.packageManifest.packageId !== HSK1_LOCAL_STUDY_PACKAGE_VERSION
    || source.packageManifest.contentVersion !== HSK1_LOCAL_STUDY_PACKAGE_VERSION
    || source.packageManifest.artifacts?.["item-catalog.json"]
      !== await sha256Json(source.packageItemCatalog)
    || graphUnit?.status !== "foundation"
    || !exact(graphLessonIds, lessonIds)
    || !exact(release?.lessonIds, lessonIds)
    || !exact(packageLessonIds, lessonIds)
    || review.acceptance.readyForLocalStudyVisibility !== true
    || review.reviewer.humanReviewed !== false
    || review.acceptance.claims.productionEligible !== false
  ) {
    throw new Error("HSK1 local-study authorization sources are inconsistent");
  }

  const payload = {
    schemaVersion: 1,
    authorizationId: HSK1_LOCAL_STUDY_AUTHORIZATION_ID,
    profileId: HSK_LOCAL_STUDY_PROFILE_ID,
    runtimeContentVersion: HSK1_LOCAL_STUDY_PACKAGE_VERSION,
    scope: "personal-local-study-runtime-only",
    sourceBindings: [
      sourceBinding(
        source.root,
        "localStudyProfile",
        HSK_LOCAL_STUDY_PROFILE_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "localStudyReview",
        HSK1_LOCAL_STUDY_REVIEW_RELATIVE_PATH,
      ),
      sourceBinding(source.root, "curriculumGraph", GRAPH_RELATIVE_PATH),
      sourceBinding(source.root, "unitReleasePolicy", RELEASE_POLICY_RELATIVE_PATH),
      sourceBinding(source.root, "packageManifest", PACKAGE_MANIFEST_RELATIVE_PATH),
      sourceBinding(source.root, "packageItemCatalog", PACKAGE_ITEM_CATALOG_RELATIVE_PATH),
    ],
    authorizations: [
      {
        unitId,
        lessonIds,
        unitReleaseDigest: review.unitReleaseDigest,
        localStudyReviewId: review.reviewId,
        localStudyReviewSha256: review.reviewSha256,
        packageId: source.packageManifest.packageId,
        itemCatalogSha256:
          source.packageManifest.artifacts["item-catalog.json"],
        authorizationState: "authorized-for-personal-local-study",
        presentation: {
          authorizationState: "authorized-for-personal-local-study",
          sourceTargetCount: presentationTargetCount,
          sourceTargetTypeCounts: presentationTargetTypeCounts,
          aiAssistedReviewDisclosed: true,
          humanReviewed: false,
          measurementEligible: false,
          masteryEligible: false,
        },
      },
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
  if (
    !isRecord(authorization)
    || authorization.schemaVersion !== 1
    || authorization.authorizationId !== HSK1_LOCAL_STUDY_AUTHORIZATION_ID
    || authorization.profileId !== HSK_LOCAL_STUDY_PROFILE_ID
    || authorization.runtimeContentVersion !== HSK1_LOCAL_STUDY_PACKAGE_VERSION
    || authorization.scope !== "personal-local-study-runtime-only"
    || !Array.isArray(authorization.sourceBindings)
    || !Array.isArray(authorization.authorizations)
    || authorization.authorizations.length !== 1
    || authorization.authorizations[0]?.lessonIds?.length !== 6
    || authorization.authorizations[0]?.presentation?.sourceTargetCount !== 338
    || authorization.authorizations[0]?.presentation?.humanReviewed !== false
    || authorization.authorizations[0]?.presentation?.measurementEligible !== false
    || authorization.authorizations[0]?.presentation?.masteryEligible !== false
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
      lessons: expected.authorizations[0].lessonIds.length,
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
