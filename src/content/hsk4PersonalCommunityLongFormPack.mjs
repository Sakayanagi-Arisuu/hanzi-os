import {
  assertValidHsk4LongFormDomainPackBundle,
  loadHsk4LongFormDomainPackBundle,
  validateHsk4LongFormDomainPackBundle,
} from "./hsk4LongFormDomainPack.mjs";

export const HSK4_PERSONAL_COMMUNITY_LONG_FORM_RELATIVE_PATH =
  "content/drafts/hsk4-personal-community-long-form-2026.07.json";

export const HSK4_PERSONAL_COMMUNITY_DOMAIN_ID =
  "hsk4-personal-community-analysis";

export const HSK4_PERSONAL_COMMUNITY_LESSON_IDS = [
  `${HSK4_PERSONAL_COMMUNITY_DOMAIN_ID}-concept-actor-map`,
  `${HSK4_PERSONAL_COMMUNITY_DOMAIN_ID}-process-timeline`,
  `${HSK4_PERSONAL_COMMUNITY_DOMAIN_ID}-cause-condition-result`,
  `${HSK4_PERSONAL_COMMUNITY_DOMAIN_ID}-comparison-variation`,
  `${HSK4_PERSONAL_COMMUNITY_DOMAIN_ID}-claim-evidence-inference`,
  `${HSK4_PERSONAL_COMMUNITY_DOMAIN_ID}-viewpoint-synthesis`,
];

export const HSK4_PERSONAL_COMMUNITY_LONG_FORM_CONFIG = {
  packId: "hsk4-personal-community-long-form-2026.07",
  domainId: HSK4_PERSONAL_COMMUNITY_DOMAIN_ID,
  lessonIds: HSK4_PERSONAL_COMMUNITY_LESSON_IDS,
  completedLongFormDomains: 1,
  completedLongFormLessons: 6,
};

export const loadHsk4PersonalCommunityLongFormPackBundle = (
  root = process.cwd(),
) => loadHsk4LongFormDomainPackBundle({
  root,
  relativePath: HSK4_PERSONAL_COMMUNITY_LONG_FORM_RELATIVE_PATH,
  prerequisiteBundles: [],
});

export const validateHsk4PersonalCommunityLongFormPackBundle = (bundle) =>
  validateHsk4LongFormDomainPackBundle({
    bundle,
    config: HSK4_PERSONAL_COMMUNITY_LONG_FORM_CONFIG,
  });

export const assertValidHsk4PersonalCommunityLongFormPackBundle = (bundle) =>
  assertValidHsk4LongFormDomainPackBundle({
    bundle,
    config: HSK4_PERSONAL_COMMUNITY_LONG_FORM_CONFIG,
  });
