import {
  assertValidHsk4LongFormDomainPackBundle,
  loadHsk4LongFormDomainPackBundle,
  validateHsk4LongFormDomainPackBundle,
} from "./hsk4LongFormDomainPack.mjs";
import {
  loadHsk4SocietyEconomyLongFormPackBundle,
} from "./hsk4SocietyEconomyLongFormPack.mjs";

export const HSK4_ARTS_SPORTS_EXCHANGE_LONG_FORM_RELATIVE_PATH =
  "content/drafts/hsk4-arts-sports-exchange-long-form-2026.07.json";
export const HSK4_ARTS_SPORTS_EXCHANGE_DOMAIN_ID =
  "hsk4-arts-sports-exchange-critique";
export const HSK4_ARTS_SPORTS_EXCHANGE_LESSON_IDS = [
  `${HSK4_ARTS_SPORTS_EXCHANGE_DOMAIN_ID}-concept-actor-map`,
  `${HSK4_ARTS_SPORTS_EXCHANGE_DOMAIN_ID}-process-timeline`,
  `${HSK4_ARTS_SPORTS_EXCHANGE_DOMAIN_ID}-cause-condition-result`,
  `${HSK4_ARTS_SPORTS_EXCHANGE_DOMAIN_ID}-comparison-variation`,
  `${HSK4_ARTS_SPORTS_EXCHANGE_DOMAIN_ID}-claim-evidence-inference`,
  `${HSK4_ARTS_SPORTS_EXCHANGE_DOMAIN_ID}-viewpoint-synthesis`,
];
export const HSK4_ARTS_SPORTS_EXCHANGE_LONG_FORM_CONFIG = {
  packId: "hsk4-arts-sports-exchange-long-form-2026.07",
  domainId: HSK4_ARTS_SPORTS_EXCHANGE_DOMAIN_ID,
  lessonIds: HSK4_ARTS_SPORTS_EXCHANGE_LESSON_IDS,
  completedLongFormDomains: 5,
  completedLongFormLessons: 30,
};

const prerequisiteBundles = (root) => [
  loadHsk4SocietyEconomyLongFormPackBundle(root),
];

export const loadHsk4ArtsSportsExchangeLongFormPackBundle = (
  root = process.cwd(),
) => loadHsk4LongFormDomainPackBundle({
  root,
  relativePath: HSK4_ARTS_SPORTS_EXCHANGE_LONG_FORM_RELATIVE_PATH,
  prerequisiteBundles: prerequisiteBundles(root),
});

export const validateHsk4ArtsSportsExchangeLongFormPackBundle = (bundle) =>
  validateHsk4LongFormDomainPackBundle({
    bundle,
    config: HSK4_ARTS_SPORTS_EXCHANGE_LONG_FORM_CONFIG,
  });

export const assertValidHsk4ArtsSportsExchangeLongFormPackBundle = (bundle) =>
  assertValidHsk4LongFormDomainPackBundle({
    bundle,
    config: HSK4_ARTS_SPORTS_EXCHANGE_LONG_FORM_CONFIG,
  });
