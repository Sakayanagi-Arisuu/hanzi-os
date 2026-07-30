import {
  assertValidHsk4LongFormDomainPackBundle,
  loadHsk4LongFormDomainPackBundle,
  validateHsk4LongFormDomainPackBundle,
} from "./hsk4LongFormDomainPack.mjs";
import {
  loadHsk4PersonalCommunityLongFormPackBundle,
} from "./hsk4PersonalCommunityLongFormPack.mjs";

export const HSK4_EDUCATION_WORK_LONG_FORM_RELATIVE_PATH =
  "content/drafts/hsk4-education-work-long-form-2026.07.json";

export const HSK4_EDUCATION_WORK_DOMAIN_ID =
  "hsk4-education-work-evaluation";

export const HSK4_EDUCATION_WORK_LESSON_IDS = [
  `${HSK4_EDUCATION_WORK_DOMAIN_ID}-concept-actor-map`,
  `${HSK4_EDUCATION_WORK_DOMAIN_ID}-process-timeline`,
  `${HSK4_EDUCATION_WORK_DOMAIN_ID}-cause-condition-result`,
  `${HSK4_EDUCATION_WORK_DOMAIN_ID}-comparison-variation`,
  `${HSK4_EDUCATION_WORK_DOMAIN_ID}-claim-evidence-inference`,
  `${HSK4_EDUCATION_WORK_DOMAIN_ID}-viewpoint-synthesis`,
];

export const HSK4_EDUCATION_WORK_LONG_FORM_CONFIG = {
  packId: "hsk4-education-work-long-form-2026.07",
  domainId: HSK4_EDUCATION_WORK_DOMAIN_ID,
  lessonIds: HSK4_EDUCATION_WORK_LESSON_IDS,
  completedLongFormDomains: 2,
  completedLongFormLessons: 12,
};

const prerequisiteBundles = (root) => [
  loadHsk4PersonalCommunityLongFormPackBundle(root),
];

export const loadHsk4EducationWorkLongFormPackBundle = (
  root = process.cwd(),
) => loadHsk4LongFormDomainPackBundle({
  root,
  relativePath: HSK4_EDUCATION_WORK_LONG_FORM_RELATIVE_PATH,
  prerequisiteBundles: prerequisiteBundles(root),
});

export const validateHsk4EducationWorkLongFormPackBundle = (bundle) =>
  validateHsk4LongFormDomainPackBundle({
    bundle,
    config: HSK4_EDUCATION_WORK_LONG_FORM_CONFIG,
  });

export const assertValidHsk4EducationWorkLongFormPackBundle = (bundle) =>
  assertValidHsk4LongFormDomainPackBundle({
    bundle,
    config: HSK4_EDUCATION_WORK_LONG_FORM_CONFIG,
  });
