import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK0_PRONUNCIATION_SOURCE_RELATIVE_PATH =
  "content/sources/official-hanyu-pinyin-scheme-1958/source.json";
export const HSK0_PRONUNCIATION_BOOTCAMP_RELATIVE_PATH =
  "content/drafts/hsk0-pronunciation-bootcamp-2026.07.json";

const EXPECTED_COUNTS = {
  lessons: 12,
  targets: 111,
  officialInitials: 21,
  officialFinalTableCells: 35,
  officialSpecialFinals: 1,
  toneCategories: 5,
  tonePairCells: 25,
  authoredActivities: 208,
  initialIdentificationActivities: 21,
  finalIdentificationActivities: 36,
  syllableAssemblyActivities: 36,
  initialContrastActivities: 20,
  orthographyActivities: 14,
  toneCategoryActivities: 20,
  tonePairActivities: 25,
  sandhiActivities: 12,
  shadowingActivities: 24,
  audioDependentActivities: 89,
  reviewedAudioActivities: 0,
  measurementEligibleActivities: 0,
  masteryEligibleActivities: 0,
  releaseEligibleActivities: 0,
  reviewBatches: 12,
};
const ACTIVITY_KIND_COUNTS = {
  "visual-initial-identification": 21,
  "visual-final-identification": 36,
  "guided-final-syllable-assembly": 36,
  "listening-initial-contrast-selection": 20,
  "guided-pinyin-orthography-rewrite": 14,
  "listening-tone-category-selection": 20,
  "listening-tone-pair-selection": 25,
  "guided-connected-speech-analysis": 12,
  "record-compare-shadowing-self-check": 24,
};
const AUDIO_DEPENDENT_KINDS = new Set([
  "listening-initial-contrast-selection",
  "listening-tone-category-selection",
  "listening-tone-pair-selection",
  "record-compare-shadowing-self-check",
]);
const BASE_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "pronunciation-pedagogy-reviewer",
];
const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactSet = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};
const validText = (value, minimum = 1, maximum = 500) =>
  typeof value === "string"
  && value.length >= minimum
  && value.length <= maximum;

export const loadHsk0PronunciationBootcampBundle = (
  root = process.cwd(),
) => {
  const sourcePath = join(root, HSK0_PRONUNCIATION_SOURCE_RELATIVE_PATH);
  const packPath = join(root, HSK0_PRONUNCIATION_BOOTCAMP_RELATIVE_PATH);
  return {
    sourcePath,
    source: JSON.parse(readFileSync(sourcePath, "utf8")),
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk0PronunciationBootcampBundle = ({
  sourcePath,
  source,
  pack,
}) => {
  const errors = [];
  if (
    !isRecord(source)
    || source.schemaVersion !== 1
    || source.sourceId !== "official-hanyu-pinyin-scheme-1958"
    || source.canonicalUrl
      !== "https://www.moe.gov.cn/jyb_sjzl/ziliao/A19/195802/t19580201_186000.html"
    || source.pdfUrl
      !== "https://www.moe.gov.cn/ewebeditor/uploadfile/2015/03/02/20150302165814246.pdf"
    || source.approved !== "1958-02-11"
    || source.pdf?.pages !== 5
    || source.pdf?.byteLength !== 2586611
    || source.pdf?.sha256
      !== "sha256:8b834d15c7456ce5def7b2c8c0d88cb7ed6ddd61db7b8ea508f9314a6c3edfa9"
    || source.orthographyStandard?.standardId !== "GB/T 16159-2012"
    || source.orthographyStandard?.status !== "active"
    || source.orthographyStandard?.effective !== "2012-10-01"
    || source.orthographyStandard?.reconfirmed !== "2025-09-05"
    || source.rights?.decision !== "pending"
    || source.rights?.license !== null
  ) {
    errors.push("official Pinyin source descriptor identity is invalid");
  }
  const sourceInitials = Array.isArray(source?.transcriptionScope?.initials)
    ? source.transcriptionScope.initials
    : [];
  const sourceFinals = Array.isArray(
      source?.transcriptionScope?.finalTableSpellings,
    )
    ? source.transcriptionScope.finalTableSpellings
    : [];
  const sourceSpecialFinals = Array.isArray(
      source?.transcriptionScope?.specialFinals,
    )
    ? source.transcriptionScope.specialFinals
    : [];
  const sourceTones = Array.isArray(
      source?.transcriptionScope?.toneCategories,
    )
    ? source.transcriptionScope.toneCategories
    : [];
  if (
    sourceInitials.length !== 21
    || duplicateValues(sourceInitials).length > 0
    || sourceFinals.length !== 35
    || duplicateValues(sourceFinals).length > 0
    || !exactSet(sourceSpecialFinals, ["er"])
    || !exactSet(
      sourceTones,
      ["tone-1", "tone-2", "tone-3", "tone-4", "neutral"],
    )
  ) {
    errors.push("official Pinyin transcription scope is incomplete");
  }

  if (!isRecord(pack) || pack.schemaVersion !== 1) {
    return {
      valid: false,
      errors: [...errors, "HSK0 pronunciation pack schemaVersion must be 1"],
    };
  }
  if (
    pack.packId !== "hsk0-pronunciation-bootcamp-2026.07"
    || pack.level !== "HSK0"
    || pack.state !== "ai-assisted-source-bound-draft"
    || pack.learnerVisible !== false
    || pack.runtimeImportEligible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push("HSK0 pronunciation pack must remain a hidden draft");
  }
  if (
    pack.source?.sourceId !== source.sourceId
    || pack.source?.sourceDescriptorSha256 !== fileSha256(sourcePath)
    || pack.source?.officialSchemePdfSha256 !== source.pdf?.sha256
    || pack.source?.orthographyStandardId
      !== source.orthographyStandard?.standardId
    || pack.source?.orthographyStandardStatus !== "active"
    || pack.source?.rightsDecision !== "pending"
  ) {
    errors.push("HSK0 pronunciation source binding is stale");
  }
  if (
    pack.authorship?.method
      !== "deterministic-source-bound-ai-assisted-pronunciation-draft"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.pronunciationPedagogyReviewer !== null
    || pack.authorship?.audioRightsReviewer !== null
  ) {
    errors.push("HSK0 pronunciation pack must not imply human review");
  }
  if (
    pack.policy?.reviewedNativeAudioRequiredForListening !== true
    || pack.policy?.browserTtsIsPreviewOnly !== true
    || pack.policy?.browserAsrMustNotScoreToneMastery !== true
    || pack.policy?.humanPronunciationRubricRequiredForSpeakingEvidence !== true
    || pack.policy?.linguisticAndPedagogyReviewRequiredForRelease !== true
    || pack.policy?.noRuntimeImportBeforeAllGates !== true
  ) {
    errors.push("HSK0 pronunciation policy must remain fail-closed");
  }
  if (
    pack.coverageClaims?.officialInitialDraftCoverage !== "21/21"
    || pack.coverageClaims?.officialFinalTableDraftCoverage !== "35/35"
    || pack.coverageClaims?.officialSpecialFinalDraftCoverage !== "1/1"
    || pack.coverageClaims?.toneCategoryDraftCoverage !== "5/5"
    || pack.coverageClaims?.tonePairMatrixDraftCoverage !== "25/25"
    || pack.coverageClaims?.bootcampLessonDraftCoverage !== "12/12"
    || pack.coverageClaims?.reviewedNativeAudioComplete !== false
    || pack.coverageClaims?.reviewedPronunciationContentComplete !== false
    || pack.coverageClaims?.runtimeBootcampComplete !== false
    || pack.coverageClaims?.hsk0Complete !== false
  ) {
    errors.push("HSK0 pronunciation coverage claims are invalid");
  }
  if (JSON.stringify(pack.counts) !== JSON.stringify(EXPECTED_COUNTS)) {
    errors.push("HSK0 pronunciation counts are invalid");
  }

  const targets = Array.isArray(pack.targets) ? pack.targets : [];
  const targetIds = targets.map((target) => target.targetId);
  const targetById = new Map(
    targets.map((target) => [target.targetId, target]),
  );
  if (
    targets.length !== EXPECTED_COUNTS.targets
    || duplicateValues(targetIds).length > 0
    || targets.some(
      (target) =>
        !validText(target.targetId, 5, 100)
        || !validText(target.kind, 5, 100)
        || !/^hsk0-pronunciation-(0[1-9]|1[0-2])$/.test(target.lessonId),
    )
  ) {
    errors.push("HSK0 pronunciation targets must have unique valid identities");
  }
  const initialSymbols = targets.filter(
    (target) => target.kind === "official-initial",
  ).map((target) => target.symbol);
  const tableFinalSpellings = targets.filter(
    (target) => target.kind === "official-final-table-cell",
  ).map((target) => target.tableSpelling);
  const specialFinalSpellings = targets.filter(
    (target) => target.kind === "official-special-final",
  ).map((target) => target.tableSpelling);
  const toneIds = targets.filter(
    (target) => target.kind === "official-tone-category",
  ).map((target) => target.id);
  const tonePairTargets = targets.filter(
    (target) => target.kind === "pedagogical-tone-pair-cell",
  );
  if (
    !exactSet(initialSymbols, sourceInitials)
    || !exactSet(tableFinalSpellings, sourceFinals)
    || !exactSet(specialFinalSpellings, sourceSpecialFinals)
    || !exactSet(toneIds, sourceTones)
    || tonePairTargets.length !== 25
    || !exactSet(
      tonePairTargets.map(
        (target) => `${target.firstTone}-${target.secondTone}`,
      ),
      [1, 2, 3, 4, 5].flatMap((first) =>
        [1, 2, 3, 4, 5].map((second) => `${first}-${second}`)
      ),
    )
  ) {
    errors.push("HSK0 pronunciation target inventory is incomplete");
  }

  const lessons = Array.isArray(pack.lessons) ? pack.lessons : [];
  const lessonIds = lessons.map((lesson) => lesson.lessonId);
  const lessonById = new Map(
    lessons.map((lesson) => [lesson.lessonId, lesson]),
  );
  const lessonTargetIds = lessons.flatMap(
    (lesson) => Array.isArray(lesson.targetIds) ? lesson.targetIds : [],
  );
  if (
    lessons.length !== 12
    || duplicateValues(lessonIds).length > 0
    || duplicateValues(lessonTargetIds).length > 0
    || !exactSet(lessonTargetIds, targetIds)
  ) {
    errors.push("HSK0 lessons must partition every target exactly once");
  }
  for (const [index, lesson] of lessons.entries()) {
    const expectedId =
      `hsk0-pronunciation-${String(index + 1).padStart(2, "0")}`;
    const expectedPrerequisites = index === 0
      ? []
      : [`hsk0-pronunciation-${String(index).padStart(2, "0")}`];
    if (
      lesson.lessonId !== expectedId
      || lesson.sequence !== index + 1
      || !validText(lesson.titleVi, 8, 100)
      || !validText(lesson.focus, 5, 100)
      || !exactSet(
        Array.isArray(lesson.prerequisiteLessonIds)
          ? lesson.prerequisiteLessonIds
          : [],
        expectedPrerequisites,
      )
      || lesson.exitEvidence?.currentlyAvailable !== false
      || !validText(lesson.exitEvidence?.mode, 10, 100)
    ) {
      errors.push(`${expectedId} lesson contract is invalid`);
    }
  }

  const activities = Array.isArray(pack.activities) ? pack.activities : [];
  const activityIds = activities.map((activity) => activity.activityId);
  const activityTargetIds = activities.flatMap(
    (activity) => Array.isArray(activity.targetIds) ? activity.targetIds : [],
  );
  const activityById = new Map(
    activities.map((activity) => [activity.activityId, activity]),
  );
  if (
    activities.length !== EXPECTED_COUNTS.authoredActivities
    || duplicateValues(activityIds).length > 0
  ) {
    errors.push("HSK0 pronunciation activities must have unique identities");
  }
  if (!exactSet(new Set(activityTargetIds), targetIds)) {
    errors.push("HSK0 pronunciation activities must exercise every target");
  }
  for (const [kind, expectedCount] of Object.entries(ACTIVITY_KIND_COUNTS)) {
    if (activities.filter((activity) => activity.kind === kind).length !==
      expectedCount) {
      errors.push(`${kind} activity count is invalid`);
    }
  }
  for (const activity of activities) {
    const targetReferences = Array.isArray(activity.targetIds)
      ? activity.targetIds
      : [];
    const lesson = lessonById.get(activity.lessonId);
    if (
      !validText(activity.activityId, 10, 150)
      || !validText(activity.activityVersion, 10, 250)
      || activity.activityVersion
        !== `hsk0-pronunciation-bootcamp-2026.07:${activity.activityId}:1`
      || !lesson
      || !validText(activity.promptVi, 10, 300)
      || targetReferences.length === 0
      || targetReferences.some((targetId) => !targetById.has(targetId))
      || !targetReferences.some(
        (targetId) => targetById.get(targetId)?.lessonId === activity.lessonId,
      )
      || activity.reviewStatus !== "pending"
      || activity.measurementEligible !== false
      || activity.masteryEligible !== false
      || activity.releaseEligible !== false
      || activity.prerequisiteWaiverEligible !== false
    ) {
      errors.push(`${activity.activityId} activity contract is invalid`);
    }
    if (AUDIO_DEPENDENT_KINDS.has(activity.kind)) {
      if (
        activity.stimulus?.audio !== null
        || activity.stimulus?.audioRequirement
          !== "reviewed-human-or-licensed-native-mandarin-recording"
        || activity.stimulus?.authoringPreview
          !== "synthetic-browser-voice-not-evidence"
        || activity.stimulus?.transcriptReview !== "pending"
        || !validText(activity.stimulus?.transcriptPinyin, 1, 300)
      ) {
        errors.push(`${activity.activityId} audio gate is invalid`);
      }
    }
    if (
      activity.kind === "record-compare-shadowing-self-check"
      && (
        activity.scoringPolicy !== "self-record-compare-no-acoustic-score"
        || activity.browserAsrAllowedForMastery !== false
        || !validText(activity.stimulus?.hanzi, 2, 100)
        || !validText(activity.stimulus?.meaningVi, 2, 200)
      )
    ) {
      errors.push(`${activity.activityId} shadowing policy is invalid`);
    }
    if (
      activity.kind === "listening-tone-pair-selection"
      && (
        !Array.isArray(activity.options)
        || activity.options.length !== 25
        || duplicateValues(activity.options).length > 0
        || !activity.options.includes(activity.modelAnswer)
      )
    ) {
      errors.push(`${activity.activityId} tone-pair options are invalid`);
    }
  }
  const lessonActivityIds = lessons.flatMap(
    (lesson) => Array.isArray(lesson.activityIds) ? lesson.activityIds : [],
  );
  if (
    duplicateValues(lessonActivityIds).length > 0
    || !exactSet(lessonActivityIds, activityIds)
    || lessons.some((lesson) =>
      (lesson.activityIds ?? []).some(
        (activityId) => activityById.get(activityId)?.lessonId !== lesson.lessonId,
      )
    )
  ) {
    errors.push("HSK0 lessons must partition every activity exactly once");
  }

  const batches = Array.isArray(pack.reviewBatches)
    ? pack.reviewBatches
    : [];
  const batchedActivityIds = batches.flatMap(
    (batch) => Array.isArray(batch.activityIds) ? batch.activityIds : [],
  );
  if (
    batches.length !== 12
    || duplicateValues(batchedActivityIds).length > 0
    || !exactSet(batchedActivityIds, activityIds)
    || !exactSet(batches.map((batch) => batch.lessonId), lessonIds)
  ) {
    errors.push("HSK0 review batches must partition all activities once");
  }
  for (const batch of batches) {
    const lesson = lessonById.get(batch.lessonId);
    const batchActivities = (batch.activityIds ?? []).map(
      (activityId) => activityById.get(activityId),
    );
    const needsAudio = batchActivities.some(
      (activity) => activity && AUDIO_DEPENDENT_KINDS.has(activity.kind),
    );
    const expectedRoles = [
      ...BASE_REVIEW_ROLES,
      ...(needsAudio ? ["audio-rights-reviewer"] : []),
    ];
    if (
      !lesson
      || !exactSet(batch.targetIds ?? [], lesson.targetIds ?? [])
      || !exactSet(batch.activityIds ?? [], lesson.activityIds ?? [])
      || JSON.stringify(batch.requiredRoles) !== JSON.stringify(expectedRoles)
      || batch.reviewedAudioRequired !== needsAudio
      || batch.state !== "pending"
      || !Array.isArray(batch.approvals)
      || batch.approvals.length !== 0
    ) {
      errors.push(`${batch.batchId} review batch is invalid`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: pack.counts,
  };
};

export const assertValidHsk0PronunciationBootcampBundle = (bundle) => {
  const result = validateHsk0PronunciationBootcampBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK0 pronunciation bootcamp:\n- ${
        result.errors.join("\n- ")
      }`,
    );
  }
  return result;
};
