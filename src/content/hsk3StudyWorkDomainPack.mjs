import {
  assertValidHsk3PersonalDomainPackBundle,
  loadHsk3PersonalDomainPackBundle,
} from "./hsk3PersonalDomainPack.mjs";
import {
  assertValidHsk3ParagraphDomainPackBundle,
  loadHsk3ParagraphDomainPackBundle,
  validateHsk3ParagraphDomainPackBundle,
} from "./hsk3ParagraphDomainPack.mjs";

export const HSK3_STUDY_WORK_DOMAIN_PACK_RELATIVE_PATH =
  "content/drafts/hsk3-study-work-paragraph-domain-2026.07.json";
export const HSK3_STUDY_WORK_DOMAIN_ID = "hsk3-study-work-accounts";
export const HSK3_STUDY_WORK_LESSON_IDS = [
  `${HSK3_STUDY_WORK_DOMAIN_ID}-courses-learning`,
  `${HSK3_STUDY_WORK_DOMAIN_ID}-campus-education`,
  `${HSK3_STUDY_WORK_DOMAIN_ID}-office-tasks`,
  `${HSK3_STUDY_WORK_DOMAIN_ID}-colleague-workplace`,
  `${HSK3_STUDY_WORK_DOMAIN_ID}-career-experience`,
];
export const HSK3_STUDY_WORK_PACK_CONFIG = {
  packId: "hsk3-study-work-paragraph-domain-2026.07",
  domainId: HSK3_STUDY_WORK_DOMAIN_ID,
  lessonIds: HSK3_STUDY_WORK_LESSON_IDS,
  completedParagraphDomainCount: 2,
  completedParagraphLessons: 10,
};

export const loadHsk3StudyWorkDomainPackBundle = (
  root = process.cwd(),
) => {
  const personalBundle = loadHsk3PersonalDomainPackBundle(root);
  assertValidHsk3PersonalDomainPackBundle(personalBundle);
  return loadHsk3ParagraphDomainPackBundle({
    root,
    relativePath: HSK3_STUDY_WORK_DOMAIN_PACK_RELATIVE_PATH,
    prerequisiteBundles: [personalBundle],
  });
};

export const validateHsk3StudyWorkDomainPackBundle = (bundle) =>
  validateHsk3ParagraphDomainPackBundle({
    bundle,
    config: HSK3_STUDY_WORK_PACK_CONFIG,
  });

export const assertValidHsk3StudyWorkDomainPackBundle = (bundle) =>
  assertValidHsk3ParagraphDomainPackBundle({
    bundle,
    config: HSK3_STUDY_WORK_PACK_CONFIG,
  });
