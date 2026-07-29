import {
  assertValidHsk3NatureEnvironmentDomainPackBundle,
  loadHsk3NatureEnvironmentDomainPackBundle,
} from "./hsk3NatureEnvironmentDomainPack.mjs";
import {
  assertValidHsk3ParagraphDomainPackBundle,
  loadHsk3ParagraphDomainPackBundle,
  validateHsk3ParagraphDomainPackBundle,
} from "./hsk3ParagraphDomainPack.mjs";

export const HSK3_SOCIETY_ARTS_SPORTS_DOMAIN_PACK_RELATIVE_PATH =
  "content/drafts/hsk3-society-arts-sports-paragraph-domain-2026.07.json";
export const HSK3_SOCIETY_ARTS_SPORTS_DOMAIN_ID =
  "hsk3-society-arts-sports-reports";
export const HSK3_SOCIETY_ARTS_SPORTS_LESSON_IDS = [
  `${HSK3_SOCIETY_ARTS_SPORTS_DOMAIN_ID}-modern-life`,
  `${HSK3_SOCIETY_ARTS_SPORTS_DOMAIN_ID}-city-development`,
  `${HSK3_SOCIETY_ARTS_SPORTS_DOMAIN_ID}-arts-activities`,
  `${HSK3_SOCIETY_ARTS_SPORTS_DOMAIN_ID}-sports-introduction`,
  `${HSK3_SOCIETY_ARTS_SPORTS_DOMAIN_ID}-competition-report`,
];
export const HSK3_SOCIETY_ARTS_SPORTS_PACK_CONFIG = {
  packId: "hsk3-society-arts-sports-paragraph-domain-2026.07",
  domainId: HSK3_SOCIETY_ARTS_SPORTS_DOMAIN_ID,
  lessonIds: HSK3_SOCIETY_ARTS_SPORTS_LESSON_IDS,
  completedParagraphDomainCount: 4,
  completedParagraphLessons: 20,
};

export const loadHsk3SocietyArtsSportsDomainPackBundle = (
  root = process.cwd(),
) => {
  const natureBundle = loadHsk3NatureEnvironmentDomainPackBundle(root);
  assertValidHsk3NatureEnvironmentDomainPackBundle(natureBundle);
  return loadHsk3ParagraphDomainPackBundle({
    root,
    relativePath: HSK3_SOCIETY_ARTS_SPORTS_DOMAIN_PACK_RELATIVE_PATH,
    prerequisiteBundles: [natureBundle],
  });
};

export const validateHsk3SocietyArtsSportsDomainPackBundle = (bundle) =>
  validateHsk3ParagraphDomainPackBundle({
    bundle,
    config: HSK3_SOCIETY_ARTS_SPORTS_PACK_CONFIG,
  });

export const assertValidHsk3SocietyArtsSportsDomainPackBundle = (bundle) =>
  assertValidHsk3ParagraphDomainPackBundle({
    bundle,
    config: HSK3_SOCIETY_ARTS_SPORTS_PACK_CONFIG,
  });
