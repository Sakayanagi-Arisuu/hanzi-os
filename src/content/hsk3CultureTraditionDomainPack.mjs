import {
  assertValidHsk3SocietyArtsSportsDomainPackBundle,
  loadHsk3SocietyArtsSportsDomainPackBundle,
} from "./hsk3SocietyArtsSportsDomainPack.mjs";
import {
  assertValidHsk3ParagraphDomainPackBundle,
  loadHsk3ParagraphDomainPackBundle,
  validateHsk3ParagraphDomainPackBundle,
} from "./hsk3ParagraphDomainPack.mjs";

export const HSK3_CULTURE_TRADITION_DOMAIN_PACK_RELATIVE_PATH =
  "content/drafts/hsk3-culture-tradition-paragraph-domain-2026.07.json";
export const HSK3_CULTURE_TRADITION_DOMAIN_ID =
  "hsk3-culture-tradition-descriptions";
export const HSK3_CULTURE_TRADITION_LESSON_IDS = [
  `${HSK3_CULTURE_TRADITION_DOMAIN_ID}-regional-cuisine`,
  `${HSK3_CULTURE_TRADITION_DOMAIN_ID}-tableware-etiquette`,
  `${HSK3_CULTURE_TRADITION_DOMAIN_ID}-festivals-customs`,
  `${HSK3_CULTURE_TRADITION_DOMAIN_ID}-regional-differences`,
  `${HSK3_CULTURE_TRADITION_DOMAIN_ID}-customs-comparison`,
];
export const HSK3_CULTURE_TRADITION_PACK_CONFIG = {
  packId: "hsk3-culture-tradition-paragraph-domain-2026.07",
  domainId: HSK3_CULTURE_TRADITION_DOMAIN_ID,
  lessonIds: HSK3_CULTURE_TRADITION_LESSON_IDS,
  completedParagraphDomainCount: 5,
  completedParagraphLessons: 25,
};

export const loadHsk3CultureTraditionDomainPackBundle = (
  root = process.cwd(),
) => {
  const societyBundle = loadHsk3SocietyArtsSportsDomainPackBundle(root);
  assertValidHsk3SocietyArtsSportsDomainPackBundle(societyBundle);
  return loadHsk3ParagraphDomainPackBundle({
    root,
    relativePath: HSK3_CULTURE_TRADITION_DOMAIN_PACK_RELATIVE_PATH,
    prerequisiteBundles: [societyBundle],
  });
};

export const validateHsk3CultureTraditionDomainPackBundle = (bundle) =>
  validateHsk3ParagraphDomainPackBundle({
    bundle,
    config: HSK3_CULTURE_TRADITION_PACK_CONFIG,
  });

export const assertValidHsk3CultureTraditionDomainPackBundle = (bundle) =>
  assertValidHsk3ParagraphDomainPackBundle({
    bundle,
    config: HSK3_CULTURE_TRADITION_PACK_CONFIG,
  });
