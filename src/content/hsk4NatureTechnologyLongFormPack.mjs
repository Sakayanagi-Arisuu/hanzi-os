import {
  assertValidHsk4LongFormDomainPackBundle,
  loadHsk4LongFormDomainPackBundle,
  validateHsk4LongFormDomainPackBundle,
} from "./hsk4LongFormDomainPack.mjs";
import {
  loadHsk4EducationWorkLongFormPackBundle,
} from "./hsk4EducationWorkLongFormPack.mjs";

export const HSK4_NATURE_TECHNOLOGY_LONG_FORM_RELATIVE_PATH =
  "content/drafts/hsk4-nature-technology-long-form-2026.07.json";
export const HSK4_NATURE_TECHNOLOGY_DOMAIN_ID =
  "hsk4-nature-technology-explanation";
export const HSK4_NATURE_TECHNOLOGY_LESSON_IDS = [
  `${HSK4_NATURE_TECHNOLOGY_DOMAIN_ID}-concept-actor-map`,
  `${HSK4_NATURE_TECHNOLOGY_DOMAIN_ID}-process-timeline`,
  `${HSK4_NATURE_TECHNOLOGY_DOMAIN_ID}-cause-condition-result`,
  `${HSK4_NATURE_TECHNOLOGY_DOMAIN_ID}-comparison-variation`,
  `${HSK4_NATURE_TECHNOLOGY_DOMAIN_ID}-claim-evidence-inference`,
  `${HSK4_NATURE_TECHNOLOGY_DOMAIN_ID}-viewpoint-synthesis`,
];
export const HSK4_NATURE_TECHNOLOGY_LONG_FORM_CONFIG = {
  packId: "hsk4-nature-technology-long-form-2026.07",
  domainId: HSK4_NATURE_TECHNOLOGY_DOMAIN_ID,
  lessonIds: HSK4_NATURE_TECHNOLOGY_LESSON_IDS,
  completedLongFormDomains: 3,
  completedLongFormLessons: 18,
};

const prerequisiteBundles = (root) => [
  loadHsk4EducationWorkLongFormPackBundle(root),
];

export const loadHsk4NatureTechnologyLongFormPackBundle = (
  root = process.cwd(),
) => loadHsk4LongFormDomainPackBundle({
  root,
  relativePath: HSK4_NATURE_TECHNOLOGY_LONG_FORM_RELATIVE_PATH,
  prerequisiteBundles: prerequisiteBundles(root),
});

export const validateHsk4NatureTechnologyLongFormPackBundle = (bundle) =>
  validateHsk4LongFormDomainPackBundle({
    bundle,
    config: HSK4_NATURE_TECHNOLOGY_LONG_FORM_CONFIG,
  });

export const assertValidHsk4NatureTechnologyLongFormPackBundle = (bundle) =>
  assertValidHsk4LongFormDomainPackBundle({
    bundle,
    config: HSK4_NATURE_TECHNOLOGY_LONG_FORM_CONFIG,
  });
