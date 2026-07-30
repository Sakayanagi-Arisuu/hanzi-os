import {
  assertValidHsk4LongFormDomainPackBundle,
  loadHsk4LongFormDomainPackBundle,
  validateHsk4LongFormDomainPackBundle,
} from "./hsk4LongFormDomainPack.mjs";
import {
  loadHsk4ArtsSportsExchangeLongFormPackBundle,
} from "./hsk4ArtsSportsExchangeLongFormPack.mjs";

export const HSK4_CULTURE_HISTORY_LONG_FORM_RELATIVE_PATH =
  "content/drafts/hsk4-culture-history-long-form-2026.07.json";
export const HSK4_CULTURE_HISTORY_DOMAIN_ID =
  "hsk4-culture-history-interpretation";
export const HSK4_CULTURE_HISTORY_LESSON_IDS = [
  `${HSK4_CULTURE_HISTORY_DOMAIN_ID}-concept-actor-map`,
  `${HSK4_CULTURE_HISTORY_DOMAIN_ID}-process-timeline`,
  `${HSK4_CULTURE_HISTORY_DOMAIN_ID}-cause-condition-result`,
  `${HSK4_CULTURE_HISTORY_DOMAIN_ID}-comparison-variation`,
  `${HSK4_CULTURE_HISTORY_DOMAIN_ID}-claim-evidence-inference`,
  `${HSK4_CULTURE_HISTORY_DOMAIN_ID}-viewpoint-synthesis`,
];
export const HSK4_CULTURE_HISTORY_LONG_FORM_CONFIG = {
  packId: "hsk4-culture-history-long-form-2026.07",
  domainId: HSK4_CULTURE_HISTORY_DOMAIN_ID,
  lessonIds: HSK4_CULTURE_HISTORY_LESSON_IDS,
  completedLongFormDomains: 6,
  completedLongFormLessons: 36,
};

const prerequisiteBundles = (root) => [
  loadHsk4ArtsSportsExchangeLongFormPackBundle(root),
];

export const loadHsk4CultureHistoryLongFormPackBundle = (
  root = process.cwd(),
) => loadHsk4LongFormDomainPackBundle({
  root,
  relativePath: HSK4_CULTURE_HISTORY_LONG_FORM_RELATIVE_PATH,
  prerequisiteBundles: prerequisiteBundles(root),
});

export const validateHsk4CultureHistoryLongFormPackBundle = (bundle) =>
  validateHsk4LongFormDomainPackBundle({
    bundle,
    config: HSK4_CULTURE_HISTORY_LONG_FORM_CONFIG,
  });

export const assertValidHsk4CultureHistoryLongFormPackBundle = (bundle) =>
  assertValidHsk4LongFormDomainPackBundle({
    bundle,
    config: HSK4_CULTURE_HISTORY_LONG_FORM_CONFIG,
  });
