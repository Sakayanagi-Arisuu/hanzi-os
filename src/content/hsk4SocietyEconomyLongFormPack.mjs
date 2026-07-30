import {
  assertValidHsk4LongFormDomainPackBundle,
  loadHsk4LongFormDomainPackBundle,
  validateHsk4LongFormDomainPackBundle,
} from "./hsk4LongFormDomainPack.mjs";
import {
  loadHsk4NatureTechnologyLongFormPackBundle,
} from "./hsk4NatureTechnologyLongFormPack.mjs";

export const HSK4_SOCIETY_ECONOMY_LONG_FORM_RELATIVE_PATH =
  "content/drafts/hsk4-society-economy-long-form-2026.07.json";
export const HSK4_SOCIETY_ECONOMY_DOMAIN_ID =
  "hsk4-society-economy-argument";
export const HSK4_SOCIETY_ECONOMY_LESSON_IDS = [
  `${HSK4_SOCIETY_ECONOMY_DOMAIN_ID}-concept-actor-map`,
  `${HSK4_SOCIETY_ECONOMY_DOMAIN_ID}-process-timeline`,
  `${HSK4_SOCIETY_ECONOMY_DOMAIN_ID}-cause-condition-result`,
  `${HSK4_SOCIETY_ECONOMY_DOMAIN_ID}-comparison-variation`,
  `${HSK4_SOCIETY_ECONOMY_DOMAIN_ID}-claim-evidence-inference`,
  `${HSK4_SOCIETY_ECONOMY_DOMAIN_ID}-viewpoint-synthesis`,
];
export const HSK4_SOCIETY_ECONOMY_LONG_FORM_CONFIG = {
  packId: "hsk4-society-economy-long-form-2026.07",
  domainId: HSK4_SOCIETY_ECONOMY_DOMAIN_ID,
  lessonIds: HSK4_SOCIETY_ECONOMY_LESSON_IDS,
  completedLongFormDomains: 4,
  completedLongFormLessons: 24,
};

const prerequisiteBundles = (root) => [
  loadHsk4NatureTechnologyLongFormPackBundle(root),
];

export const loadHsk4SocietyEconomyLongFormPackBundle = (
  root = process.cwd(),
) => loadHsk4LongFormDomainPackBundle({
  root,
  relativePath: HSK4_SOCIETY_ECONOMY_LONG_FORM_RELATIVE_PATH,
  prerequisiteBundles: prerequisiteBundles(root),
});

export const validateHsk4SocietyEconomyLongFormPackBundle = (bundle) =>
  validateHsk4LongFormDomainPackBundle({
    bundle,
    config: HSK4_SOCIETY_ECONOMY_LONG_FORM_CONFIG,
  });

export const assertValidHsk4SocietyEconomyLongFormPackBundle = (bundle) =>
  assertValidHsk4LongFormDomainPackBundle({
    bundle,
    config: HSK4_SOCIETY_ECONOMY_LONG_FORM_CONFIG,
  });
