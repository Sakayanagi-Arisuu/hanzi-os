import {
  assertValidHsk3StudyWorkDomainPackBundle,
  loadHsk3StudyWorkDomainPackBundle,
} from "./hsk3StudyWorkDomainPack.mjs";
import {
  assertValidHsk3ParagraphDomainPackBundle,
  loadHsk3ParagraphDomainPackBundle,
  validateHsk3ParagraphDomainPackBundle,
} from "./hsk3ParagraphDomainPack.mjs";

export const HSK3_NATURE_ENVIRONMENT_DOMAIN_PACK_RELATIVE_PATH =
  "content/drafts/hsk3-nature-environment-paragraph-domain-2026.07.json";
export const HSK3_NATURE_ENVIRONMENT_DOMAIN_ID =
  "hsk3-nature-environment-explanations";
export const HSK3_NATURE_ENVIRONMENT_LESSON_IDS = [
  `${HSK3_NATURE_ENVIRONMENT_DOMAIN_ID}-climate-seasons`,
  `${HSK3_NATURE_ENVIRONMENT_DOMAIN_ID}-plants-animals`,
  `${HSK3_NATURE_ENVIRONMENT_DOMAIN_ID}-landscape-place`,
  `${HSK3_NATURE_ENVIRONMENT_DOMAIN_ID}-environment-state`,
  `${HSK3_NATURE_ENVIRONMENT_DOMAIN_ID}-environment-protection`,
];
export const HSK3_NATURE_ENVIRONMENT_PACK_CONFIG = {
  packId: "hsk3-nature-environment-paragraph-domain-2026.07",
  domainId: HSK3_NATURE_ENVIRONMENT_DOMAIN_ID,
  lessonIds: HSK3_NATURE_ENVIRONMENT_LESSON_IDS,
  completedParagraphDomainCount: 3,
  completedParagraphLessons: 15,
};

export const loadHsk3NatureEnvironmentDomainPackBundle = (
  root = process.cwd(),
) => {
  const studyWorkBundle = loadHsk3StudyWorkDomainPackBundle(root);
  assertValidHsk3StudyWorkDomainPackBundle(studyWorkBundle);
  return loadHsk3ParagraphDomainPackBundle({
    root,
    relativePath: HSK3_NATURE_ENVIRONMENT_DOMAIN_PACK_RELATIVE_PATH,
    prerequisiteBundles: [studyWorkBundle],
  });
};

export const validateHsk3NatureEnvironmentDomainPackBundle = (bundle) =>
  validateHsk3ParagraphDomainPackBundle({
    bundle,
    config: HSK3_NATURE_ENVIRONMENT_PACK_CONFIG,
  });

export const assertValidHsk3NatureEnvironmentDomainPackBundle = (bundle) =>
  assertValidHsk3ParagraphDomainPackBundle({
    bundle,
    config: HSK3_NATURE_ENVIRONMENT_PACK_CONFIG,
  });
