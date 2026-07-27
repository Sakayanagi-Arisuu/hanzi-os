const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const RELEASE_STATES = new Set(["draft", "review", "beta", "published", "retired"]);
const REVIEW_ROLES = new Set([
  "content-owner",
  "native-linguistic",
  "source-license",
  "audio-rights",
]);
const REVIEW_DECISIONS = new Set(["approved", "changes-requested"]);
const SUPPORTED_CONTENT_SCHEMA_VERSIONS = new Set([1, 2, 3, 4]);
const ITEM_TYPES_V1 = new Set(["lexeme", "lesson", "graded-text"]);
const KNOWLEDGE_ITEM_TYPES = new Set([
  "lexeme",
  "grammar",
  "pronunciation",
  "character",
  "communicative-function",
]);
const ITEM_TYPES_V2 = new Set([
  ...ITEM_TYPES_V1,
  ...KNOWLEDGE_ITEM_TYPES,
]);
const RELEASED_STATES = new Set(["beta", "published"]);
const LEARNING_SKILLS = new Set([
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
]);
const CONTENT_SCHEMA_V1_SOURCE_ARTIFACTS = [
  "src/data/assessment.ts",
  "src/data/curriculum.ts",
  "src/lib/exerciseGeneration.ts",
  "src/server/attemptScoring.ts",
  "src/server/authoritativeItemBank.ts",
  "src/server/lessonCompletionPolicy.ts",
];
const CONTENT_SCHEMA_V2_POLICY_ARTIFACTS = [
  "src/server/authoritativeAssessmentItemBank.ts",
  "src/server/assessmentScoring.ts",
];
const CONTENT_SCHEMA_V4_SOURCE_ARTIFACTS = [
  "src/data/knowledgeItemBlueprints.ts",
  "src/data/lessonGuides.ts",
];

export const contentSourceArtifactNames = (contentSchemaVersion) => [
  ...CONTENT_SCHEMA_V1_SOURCE_ARTIFACTS,
  ...(contentSchemaVersion >= 2 ? CONTENT_SCHEMA_V2_POLICY_ARTIFACTS : []),
  ...(contentSchemaVersion >= 4 ? CONTENT_SCHEMA_V4_SOURCE_ARTIFACTS : []),
];

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const isValidDate = (value) => {
  if (!isNonEmptyString(value)) return false;
  const epoch = Date.parse(value);
  return !Number.isNaN(epoch) && new Date(epoch).toISOString() === value;
};

const pushDuplicateErrors = (values, label, errors) => {
  const seen = new Set();
  values.forEach((value) => {
    if (seen.has(value)) errors.push(`Duplicate ${label}: ${value}`);
    seen.add(value);
  });
};

const validateStringArray = (value, label, errors) => {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return [];
  }
  const strings = value.filter(isNonEmptyString);
  if (strings.length !== value.length) errors.push(`${label} must contain non-empty strings`);
  pushDuplicateErrors(strings, label, errors);
  return strings;
};

const validateRegistryPackageEntry = (entry, errors, prefix = "") => {
  const push = (message) => errors.push(`${prefix}${message}`);
  if (!isRecord(entry)) {
    push("Registry package entry must be an object");
    return;
  }
  if (!SAFE_ID_PATTERN.test(entry.packageId ?? "")) {
    push("registryEntry.packageId is not a safe immutable package id");
  }
  if (!SAFE_ID_PATTERN.test(entry.contentVersion ?? "")) {
    push("registryEntry.contentVersion is not a safe content version");
  }
  if (entry.contentVersion !== entry.packageId) {
    push("registryEntry.contentVersion must equal packageId");
  }
  if (entry.relativePath !== `packages/${entry.packageId}`) {
    push("registryEntry.relativePath must be the package's direct registry path");
  }
  if (!DIGEST_PATTERN.test(entry.manifestSha256 ?? "")) {
    push("registryEntry.manifestSha256 must be a SHA-256 digest");
  }
  if (!["closed-alpha", "public"].includes(entry.audience)) {
    push("registryEntry.audience is invalid");
  }
  if (!["candidate", "published", "retired"].includes(entry.lifecycle)) {
    push("registryEntry.lifecycle is invalid");
  }
  if (typeof entry.closedAlphaEligible !== "boolean") {
    push("registryEntry.closedAlphaEligible must be boolean");
  }
  if (typeof entry.productionEligible !== "boolean") {
    push("registryEntry.productionEligible must be boolean");
  }
  if (
    (entry.closedAlphaEligible || entry.productionEligible)
    && entry.lifecycle !== "published"
  ) {
    push("Only a published registry entry may be release eligible");
  }
  if (entry.productionEligible && !entry.closedAlphaEligible) {
    push("A production-eligible registry entry must also be closedAlphaEligible");
  }
  if (entry.productionEligible && entry.audience !== "public") {
    push("Only a public package may be productionEligible");
  }
  const releaseEligible = entry.closedAlphaEligible || entry.productionEligible;
  if (releaseEligible && !isRecord(entry.promotion)) {
    push("A release-eligible registry entry requires promotion provenance");
  }
  if (releaseEligible && isRecord(entry.promotion)) {
    const expectedChannel = entry.productionEligible ? "production" : "closed-alpha";
    if (entry.promotion.channel !== expectedChannel) {
      push(`Promotion provenance channel must be ${expectedChannel}`);
    }
    if (!isNonEmptyString(entry.promotion.actorId)) {
      push("Promotion provenance requires actorId");
    }
    if (!isValidDate(entry.promotion.promotedAt)) {
      push("Promotion provenance requires a valid promotedAt date");
    }
    if (entry.promotion.packageManifestSha256 !== entry.manifestSha256) {
      push("Promotion provenance must bind the registered manifest digest");
    }
    if (!DIGEST_PATTERN.test(entry.promotion.reviewEnvelopeSha256 ?? "")) {
      push("Promotion provenance must bind a review envelope digest");
    }
  }
  if (!releaseEligible && entry.promotion !== null) {
    push("A release-ineligible registry entry cannot retain promotion provenance");
  }
};

export const canonicalJson = (value) => {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical JSON cannot contain non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  throw new TypeError(`Unsupported canonical JSON value: ${typeof value}`);
};

export const sha256Json = async (value) => {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable");
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
};

export const sha256NormalizedText = async (value) => {
  if (typeof value !== "string") throw new TypeError("SHA-256 text input must be a string");
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable");
  const bytes = new TextEncoder().encode(value.replace(/\r\n?/g, "\n"));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
};

export const sha256Bytes = async (value) => {
  if (!(value instanceof Uint8Array)) {
    throw new TypeError("SHA-256 binary input must be a Uint8Array");
  }
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", value);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
};

const referenceKey = (reference) =>
  isRecord(reference)
  && isNonEmptyString(reference.itemType)
  && isNonEmptyString(reference.itemId)
    ? `${reference.itemType}:${reference.itemId}`
    : null;

const embeddedKnowledgeKeys = (item) => {
  if (item?.itemType === "lesson") {
    if (Array.isArray(item.knowledgeItems)) {
      return item.knowledgeItems.map(referenceKey).filter(isNonEmptyString);
    }
    return (Array.isArray(item.payload?.wordIds) ? item.payload.wordIds : [])
      .filter(isNonEmptyString)
      .map((wordId) => `lexeme:${wordId}`);
  }
  if (item?.itemType === "graded-text") {
    return [
      ...new Set(
        (Array.isArray(item.payload?.sentences) ? item.payload.sentences : [])
          .flatMap((sentence) =>
            Array.isArray(sentence?.wordIds) ? sentence.wordIds : [])
          .filter(isNonEmptyString)
          .map((wordId) => `lexeme:${wordId}`),
      ),
    ];
  }
  return [];
};

const directDependencyKeys = (item) => [
  ...(Array.isArray(item?.prerequisites)
    ? item.prerequisites.map(referenceKey).filter(isNonEmptyString)
    : []),
  ...embeddedKnowledgeKeys(item),
];

const impliedLessonDependencies = (itemMap, rootItem) => {
  const lessonIds = new Set();
  const missingItemKeys = new Set();
  const visited = new Set();
  const queue = directDependencyKeys(rootItem);
  while (queue.length > 0) {
    const itemKey = queue.shift();
    if (visited.has(itemKey)) continue;
    visited.add(itemKey);
    const dependency = itemMap.get(itemKey);
    if (!dependency) {
      missingItemKeys.add(itemKey);
      continue;
    }
    if (dependency.itemType === "lesson") lessonIds.add(dependency.itemId);
    directDependencyKeys(dependency).forEach((dependencyKey) => {
      if (!visited.has(dependencyKey)) queue.push(dependencyKey);
    });
  }
  return { lessonIds, missingItemKeys };
};

const runtimeLessonPrerequisiteClosure = (runtimeLessonMap, lessonId) => {
  const closure = new Set();
  const queue = [
    ...(Array.isArray(runtimeLessonMap.get(lessonId)?.prerequisiteIds)
      ? runtimeLessonMap.get(lessonId).prerequisiteIds
      : []),
  ];
  while (queue.length > 0) {
    const prerequisiteId = queue.shift();
    if (closure.has(prerequisiteId)) continue;
    closure.add(prerequisiteId);
    const prerequisite = runtimeLessonMap.get(prerequisiteId);
    if (Array.isArray(prerequisite?.prerequisiteIds)) {
      queue.push(...prerequisite.prerequisiteIds);
    }
  }
  return closure;
};

export const projectSanitizedRuntimeCatalog = (itemCatalog) => {
  if (!isRecord(itemCatalog) || !Array.isArray(itemCatalog.items)) {
    throw new Error("A valid item catalog is required for runtime projection");
  }
  const items = itemCatalog.items.filter(isRecord);
  if (items.length !== itemCatalog.items.length) {
    throw new Error("Runtime projection requires object catalog items");
  }
  const itemMap = new Map(items.map((item) => [item.itemKey, item]));
  if (itemMap.size !== items.length) {
    throw new Error("Runtime projection requires unique catalog item keys");
  }
  const released = (item) => RELEASED_STATES.has(item.releaseState);
  const lessonItems = items.filter(
    (item) => item.itemType === "lesson" && released(item),
  );
  const storyItems = items.filter(
    (item) => item.itemType === "graded-text" && released(item),
  );
  const requiredLexemeIds = new Set([
    ...lessonItems.flatMap((item) =>
      Array.isArray(item.payload?.wordIds) ? item.payload.wordIds : []),
    ...storyItems.flatMap((item) =>
      Array.isArray(item.payload?.sentences)
        ? item.payload.sentences.flatMap((sentence) =>
            Array.isArray(sentence?.wordIds) ? sentence.wordIds : [])
        : []),
  ]);
  const lexemeItems = items.filter(
    (item) =>
      item.itemType === "lexeme"
      && requiredLexemeIds.has(item.itemId),
  );
  const projectedLexemeIds = new Set(
    lexemeItems.filter(released).map((item) => item.itemId),
  );
  const missingLexemeIds = [...requiredLexemeIds].filter(
    (itemId) => !projectedLexemeIds.has(itemId),
  );
  if (missingLexemeIds.length > 0) {
    throw new Error(
      `Released runtime content references unavailable lexemes: ${missingLexemeIds.join(", ")}`,
    );
  }
  const releasedLessonIds = new Set(lessonItems.map((item) => item.itemId));
  for (const lesson of lessonItems) {
    const unsupportedPrerequisites = Array.isArray(lesson.prerequisites)
      ? lesson.prerequisites.filter(
          (reference) => !isRecord(reference) || reference.itemType !== "lesson",
        )
      : [];
    if (unsupportedPrerequisites.length > 0) {
      throw new Error(
        `Released lesson ${lesson.itemId} has prerequisites the runtime schema cannot represent`,
      );
    }
    const prerequisiteIds = Array.isArray(lesson.prerequisites)
      ? lesson.prerequisites
        .filter((reference) => isRecord(reference) && reference.itemType === "lesson")
        .map((reference) => reference.itemId)
      : [];
    const missingPrerequisites = prerequisiteIds.filter(
      (itemId) => !releasedLessonIds.has(itemId),
    );
    if (missingPrerequisites.length > 0) {
      throw new Error(
        `Released lesson ${lesson.itemId} depends on unavailable lessons: ${missingPrerequisites.join(", ")}`,
      );
    }
  }
  for (const story of storyItems) {
    if (Array.isArray(story.prerequisites) && story.prerequisites.length > 0) {
      throw new Error(
        `Released graded text ${story.itemId} has prerequisites the runtime schema cannot represent`,
      );
    }
  }
  const runtimeLessonMap = new Map(
    lessonItems.map((lesson) => [
      lesson.itemId,
      {
        prerequisiteIds: Array.isArray(lesson.prerequisites)
          ? lesson.prerequisites
            .filter((reference) => isRecord(reference) && reference.itemType === "lesson")
            .map((reference) => reference.itemId)
          : [],
      },
    ]),
  );
  for (const lesson of lessonItems) {
    const implied = impliedLessonDependencies(itemMap, lesson);
    if (implied.missingItemKeys.size > 0) {
      throw new Error(
        `Released lesson ${lesson.itemId} has unavailable knowledge dependencies: ${[...implied.missingItemKeys].join(", ")}`,
      );
    }
    const runtimeClosure = runtimeLessonPrerequisiteClosure(
      runtimeLessonMap,
      lesson.itemId,
    );
    const unrepresentedLessonIds = [...implied.lessonIds].filter(
      (lessonId) => !runtimeClosure.has(lessonId),
    );
    if (unrepresentedLessonIds.length > 0) {
      throw new Error(
        `Released lesson ${lesson.itemId} has implied lesson prerequisites absent from the runtime graph: ${unrepresentedLessonIds.join(", ")}`,
      );
    }
  }
  const projectVocabulary = (item) => ({
    id: item.itemId,
    simplified: item.payload.simplified,
    traditional: item.payload.traditional,
    pinyin: item.payload.pinyin,
    pinyinNumbered: item.payload.pinyinNumbered,
    meaning: item.payload.meaning,
    partOfSpeech: item.payload.partOfSpeech,
    example: item.payload.example,
    examplePinyin: item.payload.examplePinyin,
    exampleMeaning: item.payload.exampleMeaning,
    hsk: item.payload.hsk,
    tags: [...item.payload.tags],
  });
  const projectLesson = (item) => ({
    id: item.itemId,
    unitId: item.payload.unitId,
    title: item.payload.title,
    chineseTitle: item.payload.chineseTitle,
    objective: item.payload.objective,
    minutes: item.payload.minutes,
    xp: item.payload.xp,
    skills: [...item.payload.skills],
    wordIds: [...item.payload.wordIds],
    prerequisiteIds: Array.isArray(item.prerequisites)
      ? item.prerequisites
        .filter((reference) => isRecord(reference) && reference.itemType === "lesson")
        .map((reference) => reference.itemId)
      : [],
    releaseState: item.releaseState,
    contentVersion: itemCatalog.contentVersion,
  });
  const projectStory = (item) => ({
    id: item.itemId,
    level: item.payload.level,
    title: item.payload.title,
    chineseTitle: item.payload.chineseTitle,
    summary: item.payload.summary,
    estimatedMinutes: item.payload.estimatedMinutes,
    sentences: item.payload.sentences.map((sentence) => ({
      chinese: sentence.chinese,
      pinyin: sentence.pinyin,
      translation: sentence.translation,
      wordIds: [...sentence.wordIds],
    })),
    comprehension: item.payload.comprehension.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: [...question.options],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    })),
    releaseState: item.releaseState,
    contentVersion: itemCatalog.contentVersion,
  });
  return {
    schemaVersion: 1,
    contentVersion: itemCatalog.contentVersion,
    vocabulary: lexemeItems
      .filter(released)
      .map(projectVocabulary)
      .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    lessons: lessonItems
      .map(projectLesson)
      .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    stories: storyItems
      .map(projectStory)
      .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
  };
};

const validateRegistry = (registry, registryEntry, errors) => {
  if (!isRecord(registry) || registry.schemaVersion !== 1) {
    errors.push("registry.schemaVersion must be 1");
    return;
  }
  if (!isNonEmptyString(registry.currentContentVersion)) {
    errors.push("registry.currentContentVersion is required");
  }
  if (!Array.isArray(registry.packages)) {
    errors.push("registry.packages must be an array");
    return;
  }

  const versions = registry.packages.map((entry) => entry?.contentVersion).filter(isNonEmptyString);
  const packageIds = registry.packages.map((entry) => entry?.packageId).filter(isNonEmptyString);
  pushDuplicateErrors(versions, "registry contentVersion", errors);
  pushDuplicateErrors(packageIds, "registry packageId", errors);
  if (!versions.includes(registry.currentContentVersion)) {
    errors.push("registry.currentContentVersion must reference a registered package");
  }

  const selectedEntryIsRegistered =
    isRecord(registryEntry) && registry.packages.includes(registryEntry);
  if (!selectedEntryIsRegistered) {
    errors.push("Selected registry entry is not present in registry.packages");
  }
  registry.packages.forEach((entry, index) => {
    const prefix = entry === registryEntry ? "" : `registry.packages[${index}]: `;
    validateRegistryPackageEntry(entry, errors, prefix);
  });
};

const validateManifest = (manifest, errors) => {
  if (!isRecord(manifest) || manifest.schemaVersion !== 1) {
    errors.push("manifest.schemaVersion must be 1");
    return;
  }
  if (!SAFE_ID_PATTERN.test(manifest.packageId ?? "")) {
    errors.push("manifest.packageId is not a safe immutable package id");
  }
  if (manifest.contentVersion !== manifest.packageId) {
    errors.push("manifest.contentVersion must equal packageId");
  }
  if (!SUPPORTED_CONTENT_SCHEMA_VERSIONS.has(manifest.contentSchemaVersion)) {
    errors.push("manifest.contentSchemaVersion must be a supported version (1, 2, 3, or 4)");
  }
  if (!["closed-alpha", "public"].includes(manifest.audience)) {
    errors.push("manifest.audience is invalid");
  }
  if (!["candidate", "published", "retired"].includes(manifest.lifecycle)) {
    errors.push("manifest.lifecycle is invalid");
  }
  if (!isValidDate(manifest.createdAt)) errors.push("manifest.createdAt must be an ISO date");
  if (
    manifest.createdFromManifestSha256 !== null &&
    !DIGEST_PATTERN.test(manifest.createdFromManifestSha256 ?? "")
  ) {
    errors.push("manifest.createdFromManifestSha256 must be null or a SHA-256 digest");
  }
  if (!isRecord(manifest.artifacts)) {
    errors.push("manifest.artifacts is required");
  } else {
    const requiredArtifacts = [
      "coverage-claims.json",
      "runtime-ids.json",
      ...contentSourceArtifactNames(manifest.contentSchemaVersion),
      ...(manifest.contentSchemaVersion >= 3 ? ["item-catalog.json"] : []),
      ...(manifest.contentSchemaVersion >= 4 ? ["runtime-catalog.json"] : []),
    ];
    requiredArtifacts.forEach((name) => {
      if (!DIGEST_PATTERN.test(manifest.artifacts[name] ?? "")) {
        errors.push(`manifest.artifacts.${name} must be a SHA-256 digest`);
      }
    });
  }
  if (!isRecord(manifest.governance)) {
    errors.push("manifest.governance is required");
    return;
  }
  if (manifest.governance.nativeLinguisticReviewRequired !== true) {
    errors.push("nativeLinguisticReviewRequired must remain true");
  }
  if (typeof manifest.governance.includesAudio !== "boolean") {
    errors.push("manifest.governance.includesAudio must be boolean");
  }
  if (!manifest.governance.includesAudio && manifest.governance.audioRights !== null) {
    errors.push("audioRights must be null when the package has no audio artifacts");
  }
};

const validateRuntimeIds = (runtimeIds, errors) => {
  if (!isRecord(runtimeIds) || runtimeIds.schemaVersion !== 1) {
    errors.push("runtime-ids.schemaVersion must be 1");
    return;
  }
  const vocabularyIds = validateStringArray(
    runtimeIds.vocabularyIds,
    "runtime vocabulary id",
    errors,
  );
  const unitIds = validateStringArray(runtimeIds.unitIds, "runtime unit id", errors);
  const vocabularySet = new Set(vocabularyIds);
  const unitSet = new Set(unitIds);

  if (!Array.isArray(runtimeIds.lessons)) {
    errors.push("runtime-ids.lessons must be an array");
    return;
  }
  const lessons = runtimeIds.lessons.filter(isRecord);
  if (lessons.length !== runtimeIds.lessons.length) {
    errors.push("runtime-ids.lessons must contain objects");
  }
  const lessonIds = lessons.map((lesson) => lesson.id).filter(isNonEmptyString);
  if (lessonIds.length !== lessons.length) errors.push("Every runtime lesson requires an id");
  pushDuplicateErrors(lessonIds, "runtime lesson id", errors);
  const lessonSet = new Set(lessonIds);

  lessons.forEach((lesson) => {
    if (!unitSet.has(lesson.unitId)) {
      errors.push(`${lesson.id}: unknown unitId ${String(lesson.unitId)}`);
    }
    if (!RELEASE_STATES.has(lesson.releaseState)) {
      errors.push(`${lesson.id}: invalid releaseState ${String(lesson.releaseState)}`);
    }
    const prerequisiteIds = validateStringArray(
      lesson.prerequisiteIds,
      `${lesson.id} prerequisite id`,
      errors,
    );
    prerequisiteIds.forEach((id) => {
      if (!lessonSet.has(id)) errors.push(`${lesson.id}: unknown prerequisite ${id}`);
      if (id === lesson.id) errors.push(`${lesson.id}: cannot depend on itself`);
    });
    validateStringArray(lesson.wordIds, `${lesson.id} word id`, errors).forEach((id) => {
      if (!vocabularySet.has(id)) errors.push(`${lesson.id}: unknown vocabulary id ${id}`);
    });
  });

  const graph = new Map(
    lessons.map((lesson) => [
      lesson.id,
      Array.isArray(lesson.prerequisiteIds) ? lesson.prerequisiteIds : [],
    ]),
  );
  const visiting = new Set();
  const visited = new Set();
  const visit = (lessonId) => {
    if (visiting.has(lessonId)) {
      errors.push(`Prerequisite cycle detected at ${lessonId}`);
      return;
    }
    if (visited.has(lessonId)) return;
    visiting.add(lessonId);
    (graph.get(lessonId) ?? []).forEach((dependencyId) => {
      if (graph.has(dependencyId)) visit(dependencyId);
    });
    visiting.delete(lessonId);
    visited.add(lessonId);
  };
  lessonIds.forEach(visit);

  if (!Array.isArray(runtimeIds.stories)) {
    errors.push("runtime-ids.stories must be an array");
    return;
  }
  const stories = runtimeIds.stories.filter(isRecord);
  if (stories.length !== runtimeIds.stories.length) {
    errors.push("runtime-ids.stories must contain objects");
  }
  const storyIds = stories.map((story) => story.id).filter(isNonEmptyString);
  if (storyIds.length !== stories.length) errors.push("Every runtime story requires an id");
  pushDuplicateErrors(storyIds, "runtime story id", errors);
  stories.forEach((story) => {
    if (!RELEASE_STATES.has(story.releaseState)) {
      errors.push(`${story.id}: invalid releaseState ${String(story.releaseState)}`);
    }
    validateStringArray(story.wordIds, `${story.id} word id`, errors).forEach((id) => {
      if (!vocabularySet.has(id)) errors.push(`${story.id}: unknown vocabulary id ${id}`);
    });
  });
};

const arraysEqual = (left, right) =>
  Array.isArray(left)
  && Array.isArray(right)
  && left.length === right.length
  && left.every((value, index) => value === right[index]);

const sortedValues = (values) => [...values].sort((left, right) =>
  left.localeCompare(right, "en-US"));

const validateExactSet = (actual, expected, label, errors) => {
  if (!arraysEqual(sortedValues(actual), sortedValues(expected))) {
    errors.push(`${label} must exactly match runtime-ids.json`);
  }
};

const validateEvidenceObject = (value, fields, label, errors) => {
  if (value === null) return;
  if (!isRecord(value)) {
    errors.push(`${label} must be null or an object`);
    return;
  }
  fields.forEach((field) => {
    if (!isNonEmptyString(value[field])) errors.push(`${label}.${field} is required`);
  });
};

const validateAllowedKeys = (value, allowedKeys, label, errors) => {
  if (!isRecord(value)) return;
  const allowed = new Set(allowedKeys);
  Object.keys(value).forEach((key) => {
    if (!allowed.has(key)) errors.push(`${label} has unknown field ${key}`);
  });
};

const validateCatalogExamples = (value, label, errors) => {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return [];
  }
  if (value.length === 0) errors.push(`${label} must not be empty`);
  return value.filter((example, index) => {
    const prefix = `${label}[${index}]`;
    if (!isRecord(example)) {
      errors.push(`${prefix} must be an object`);
      return false;
    }
    validateAllowedKeys(example, ["chinese", "pinyin", "meaning"], prefix, errors);
    ["chinese", "pinyin", "meaning"].forEach((field) => {
      if (!isNonEmptyString(example[field])) errors.push(`${prefix}.${field} is required`);
    });
    return true;
  });
};

const validateCatalogPayload = (item, index, errors) => {
  const prefix = `item-catalog.items[${index}]`;
  const payload = item.payload;
  if (!isRecord(payload)) {
    errors.push(`${prefix}.payload must be an object`);
    return;
  }
  if (item.itemType === "lexeme") {
    const fields = [
      "simplified",
      "traditional",
      "pinyin",
      "pinyinNumbered",
      "meaning",
      "partOfSpeech",
      "example",
      "examplePinyin",
      "exampleMeaning",
    ];
    validateAllowedKeys(
      payload,
      [...fields, "hsk", "tags"],
      `${prefix}.payload`,
      errors,
    );
    fields.forEach((field) => {
      if (!isNonEmptyString(payload[field])) errors.push(`${prefix}.payload.${field} is required`);
    });
    if (!Number.isInteger(payload.hsk) || payload.hsk < 0) {
      errors.push(`${prefix}.payload.hsk must be a non-negative integer`);
    }
    validateStringArray(payload.tags, `${prefix}.payload tag`, errors);
    return;
  }
  if (item.itemType === "lesson") {
    validateAllowedKeys(
      payload,
      [
        "unitId",
        "title",
        "chineseTitle",
        "objective",
        "minutes",
        "xp",
        "skills",
        "wordIds",
      ],
      `${prefix}.payload`,
      errors,
    );
    ["unitId", "title", "chineseTitle", "objective"].forEach((field) => {
      if (!isNonEmptyString(payload[field])) errors.push(`${prefix}.payload.${field} is required`);
    });
    if (!Number.isFinite(payload.minutes) || payload.minutes <= 0) {
      errors.push(`${prefix}.payload.minutes must be positive`);
    }
    if (!Number.isFinite(payload.xp) || payload.xp < 0) {
      errors.push(`${prefix}.payload.xp must be non-negative`);
    }
    validateStringArray(payload.skills, `${prefix}.payload skill`, errors)
      .forEach((skill) => {
        if (!LEARNING_SKILLS.has(skill)) {
          errors.push(`${prefix}.payload has unknown skill ${skill}`);
        }
      });
    validateStringArray(payload.wordIds, `${prefix}.payload word id`, errors);
    return;
  }
  if (item.itemType === "graded-text") {
    validateAllowedKeys(
      payload,
      [
        "level",
        "title",
        "chineseTitle",
        "summary",
        "estimatedMinutes",
        "sentences",
        "comprehension",
      ],
      `${prefix}.payload`,
      errors,
    );
    ["level", "title", "chineseTitle", "summary"].forEach((field) => {
      if (!isNonEmptyString(payload[field])) errors.push(`${prefix}.payload.${field} is required`);
    });
    if (!Number.isFinite(payload.estimatedMinutes) || payload.estimatedMinutes <= 0) {
      errors.push(`${prefix}.payload.estimatedMinutes must be positive`);
    }
    if (!Array.isArray(payload.sentences)) {
      errors.push(`${prefix}.payload.sentences must be an array`);
    } else {
      payload.sentences.forEach((sentence, sentenceIndex) => {
        if (!isRecord(sentence)) {
          errors.push(`${prefix}.payload.sentences[${sentenceIndex}] must be an object`);
          return;
        }
        validateAllowedKeys(
          sentence,
          ["chinese", "pinyin", "translation", "wordIds"],
          `${prefix}.payload.sentences[${sentenceIndex}]`,
          errors,
        );
        ["chinese", "pinyin", "translation"].forEach((field) => {
          if (!isNonEmptyString(sentence[field])) {
            errors.push(`${prefix}.payload.sentences[${sentenceIndex}].${field} is required`);
          }
        });
        validateStringArray(
          sentence.wordIds,
          `${prefix}.payload.sentences[${sentenceIndex}] word id`,
          errors,
        );
      });
    }
    if (!Array.isArray(payload.comprehension)) {
      errors.push(`${prefix}.payload.comprehension must be an array`);
    } else {
      const comprehensionIds = [];
      payload.comprehension.forEach((question, questionIndex) => {
        if (!isRecord(question)) {
          errors.push(`${prefix}.payload.comprehension[${questionIndex}] must be an object`);
          return;
        }
        validateAllowedKeys(
          question,
          ["id", "prompt", "options", "correctAnswer", "explanation"],
          `${prefix}.payload.comprehension[${questionIndex}]`,
          errors,
        );
        ["id", "prompt", "correctAnswer", "explanation"].forEach((field) => {
          if (!isNonEmptyString(question[field])) {
            errors.push(`${prefix}.payload.comprehension[${questionIndex}].${field} is required`);
          }
        });
        if (isNonEmptyString(question.id)) comprehensionIds.push(question.id);
        const options = validateStringArray(
          question.options,
          `${prefix}.payload.comprehension[${questionIndex}] option`,
          errors,
        );
        if (options.length < 2) {
          errors.push(`${prefix}.payload.comprehension[${questionIndex}] requires at least two options`);
        }
        if (
          isNonEmptyString(question.correctAnswer)
          && !options.includes(question.correctAnswer)
        ) {
          errors.push(`${prefix}.payload.comprehension[${questionIndex}] correctAnswer must be an option`);
        }
      });
      pushDuplicateErrors(comprehensionIds, `${prefix} comprehension id`, errors);
    }
    return;
  }
  if (item.itemType === "grammar") {
    validateAllowedKeys(
      payload,
      [
        "concept",
        "rule",
        "examples",
        "pitfall",
        "checkpoint",
        "sourceLessonIds",
      ],
      `${prefix}.payload`,
      errors,
    );
    ["concept", "rule", "pitfall", "checkpoint"].forEach((field) => {
      if (!isNonEmptyString(payload[field])) errors.push(`${prefix}.payload.${field} is required`);
    });
    validateCatalogExamples(payload.examples, `${prefix}.payload.examples`, errors);
    const sourceLessonIds = validateStringArray(
      payload.sourceLessonIds,
      `${prefix}.payload source lesson id`,
      errors,
    );
    if (sourceLessonIds.length === 0) {
      errors.push(`${prefix}.payload.sourceLessonIds must not be empty`);
    }
    return;
  }
  if (item.itemType === "pronunciation") {
    validateAllowedKeys(
      payload,
      [
        "targetKind",
        "targets",
        "concept",
        "rule",
        "examples",
        "pitfall",
        "checkpoint",
        "sourceLessonIds",
      ],
      `${prefix}.payload`,
      errors,
    );
    if (!new Set(["tone-system", "initial-contrast", "tone-sandhi"]).has(payload.targetKind)) {
      errors.push(`${prefix}.payload.targetKind is invalid`);
    }
    const targets = validateStringArray(payload.targets, `${prefix}.payload target`, errors);
    if (targets.length === 0) errors.push(`${prefix}.payload.targets must not be empty`);
    ["concept", "rule", "pitfall", "checkpoint"].forEach((field) => {
      if (!isNonEmptyString(payload[field])) errors.push(`${prefix}.payload.${field} is required`);
    });
    validateCatalogExamples(payload.examples, `${prefix}.payload.examples`, errors);
    const sourceLessonIds = validateStringArray(
      payload.sourceLessonIds,
      `${prefix}.payload source lesson id`,
      errors,
    );
    if (sourceLessonIds.length === 0) {
      errors.push(`${prefix}.payload.sourceLessonIds must not be empty`);
    }
    return;
  }
  if (item.itemType === "character") {
    validateAllowedKeys(
      payload,
      [
        "character",
        "traditional",
        "pinyin",
        "meaning",
        "sourceLexemeIds",
        "radical",
        "strokeCount",
        "components",
        "structure",
        "strokeDataRef",
        "strokeDataSha256",
      ],
      `${prefix}.payload`,
      errors,
    );
    ["character", "traditional", "pinyin", "meaning"].forEach((field) => {
      if (!isNonEmptyString(payload[field])) errors.push(`${prefix}.payload.${field} is required`);
    });
    if (isNonEmptyString(payload.character)) {
      if ([...payload.character].length !== 1) {
        errors.push(`${prefix}.payload.character must contain one Unicode character`);
      } else {
        const codePoint = payload.character.codePointAt(0);
        const expectedId = `u${codePoint.toString(16).padStart(4, "0")}`;
        if (item.itemId !== expectedId) {
          errors.push(`${prefix}.itemId must be ${expectedId} for payload.character`);
        }
      }
    }
    if (isNonEmptyString(payload.traditional) && [...payload.traditional].length !== 1) {
      errors.push(`${prefix}.payload.traditional must contain one Unicode character`);
    }
    const sourceLexemeIds = validateStringArray(
      payload.sourceLexemeIds,
      `${prefix}.payload source lexeme id`,
      errors,
    );
    if (sourceLexemeIds.length === 0) {
      errors.push(`${prefix}.payload.sourceLexemeIds must not be empty`);
    }
    for (const field of ["radical", "structure", "strokeDataRef"]) {
      if (payload[field] !== null && !isNonEmptyString(payload[field])) {
        errors.push(`${prefix}.payload.${field} must be null or a non-empty string`);
      }
    }
    if (
      payload.strokeCount !== null
      && (!Number.isInteger(payload.strokeCount) || payload.strokeCount <= 0)
    ) {
      errors.push(`${prefix}.payload.strokeCount must be null or a positive integer`);
    }
    if (payload.components !== null) {
      const components = validateStringArray(
        payload.components,
        `${prefix}.payload component`,
        errors,
      );
      if (components.length === 0) {
        errors.push(`${prefix}.payload.components must be null or non-empty`);
      }
    }
    if (
      payload.strokeDataSha256 !== null
      && !DIGEST_PATTERN.test(payload.strokeDataSha256 ?? "")
    ) {
      errors.push(`${prefix}.payload.strokeDataSha256 must be null or a SHA-256 digest`);
    }
    if ((payload.strokeDataRef === null) !== (payload.strokeDataSha256 === null)) {
      errors.push(`${prefix}.payload strokeDataRef and strokeDataSha256 must be supplied together`);
    }
    return;
  }
  if (item.itemType === "communicative-function") {
    validateAllowedKeys(
      payload,
      ["canDo", "context", "examples", "sourceLessonIds"],
      `${prefix}.payload`,
      errors,
    );
    ["canDo", "context"].forEach((field) => {
      if (!isNonEmptyString(payload[field])) errors.push(`${prefix}.payload.${field} is required`);
    });
    validateCatalogExamples(payload.examples, `${prefix}.payload.examples`, errors);
    const sourceLessonIds = validateStringArray(
      payload.sourceLessonIds,
      `${prefix}.payload source lesson id`,
      errors,
    );
    if (sourceLessonIds.length === 0) {
      errors.push(`${prefix}.payload.sourceLessonIds must not be empty`);
    }
  }
};

const validateItemCatalog = async (
  itemCatalog,
  runtimeIds,
  audioAssetFileHashes,
  contentSchemaVersion,
  errors,
) => {
  const expectedSchemaVersion = contentSchemaVersion >= 4 ? 2 : 1;
  if (!isRecord(itemCatalog) || itemCatalog.schemaVersion !== expectedSchemaVersion) {
    errors.push(`item-catalog.schemaVersion must be ${expectedSchemaVersion}`);
    return;
  }
  const itemTypes = expectedSchemaVersion === 2 ? ITEM_TYPES_V2 : ITEM_TYPES_V1;
  validateAllowedKeys(
    itemCatalog,
    ["schemaVersion", "contentVersion", "items", "audioAssets"],
    "item-catalog",
    errors,
  );
  if (!Array.isArray(itemCatalog.items)) {
    errors.push("item-catalog.items must be an array");
    return;
  }
  if (!Array.isArray(itemCatalog.audioAssets)) {
    errors.push("item-catalog.audioAssets must be an array");
    return;
  }
  if (!SAFE_ID_PATTERN.test(itemCatalog.contentVersion ?? "")) {
    errors.push("item-catalog.contentVersion is invalid");
  }
  const runtimeVocabularyIds = Array.isArray(runtimeIds?.vocabularyIds)
    ? runtimeIds.vocabularyIds
    : [];
  const runtimeUnitIds = Array.isArray(runtimeIds?.unitIds)
    ? runtimeIds.unitIds
    : [];
  const runtimeLessons = Array.isArray(runtimeIds?.lessons)
    ? runtimeIds.lessons
    : [];
  const runtimeStories = Array.isArray(runtimeIds?.stories)
    ? runtimeIds.stories
    : [];

  const catalogItems = itemCatalog.items.filter(isRecord);
  if (catalogItems.length !== itemCatalog.items.length) {
    errors.push("item-catalog.items must contain objects");
  }
  const itemKeys = [];
  const itemMap = new Map();
  for (const [index, item] of catalogItems.entries()) {
    const prefix = `item-catalog.items[${index}]`;
    validateAllowedKeys(
      item,
      [
        "itemKey",
        "itemType",
        "itemId",
        "itemVersion",
        "releaseState",
        "payload",
        "payloadSha256",
        "owner",
        "sourceLicense",
        "prerequisites",
        ...(expectedSchemaVersion === 2 && item.itemType === "lesson"
          ? ["knowledgeItems"]
          : []),
      ],
      prefix,
      errors,
    );
    if (!itemTypes.has(item.itemType)) errors.push(`${prefix}.itemType is invalid`);
    if (!SAFE_ID_PATTERN.test(item.itemId ?? "")) errors.push(`${prefix}.itemId is invalid`);
    if (!SAFE_ID_PATTERN.test(item.itemVersion ?? "")) errors.push(`${prefix}.itemVersion is invalid`);
    else if (item.itemVersion !== itemCatalog.contentVersion) {
      errors.push(`${prefix}.itemVersion must match item-catalog.contentVersion`);
    }
    const expectedKey = `${String(item.itemType)}:${String(item.itemId)}`;
    if (item.itemKey !== expectedKey) errors.push(`${prefix}.itemKey must be ${expectedKey}`);
    if (isNonEmptyString(item.itemKey)) {
      itemKeys.push(item.itemKey);
      itemMap.set(item.itemKey, item);
    }
    if (!RELEASE_STATES.has(item.releaseState)) {
      errors.push(`${prefix}.releaseState is invalid`);
    }
    validateCatalogPayload(item, index, errors);
    if (!DIGEST_PATTERN.test(item.payloadSha256 ?? "")) {
      errors.push(`${prefix}.payloadSha256 is invalid`);
    } else if (
      item.payloadSha256
      !== await sha256Json({
        itemType: item.itemType,
        payload: item.payload,
      })
    ) {
      errors.push(`${prefix}.payloadSha256 does not match its canonical payload`);
    }
    validateEvidenceObject(item.owner, ["id", "evidenceRef"], `${prefix}.owner`, errors);
    validateEvidenceObject(
      item.sourceLicense,
      ["licenseId", "evidenceRef"],
      `${prefix}.sourceLicense`,
      errors,
    );
    if (item.prerequisites !== null && !Array.isArray(item.prerequisites)) {
      errors.push(`${prefix}.prerequisites must be null or an array`);
    }
  }
  pushDuplicateErrors(itemKeys, "item catalog key", errors);

  const prerequisiteGraph = new Map();
  catalogItems.forEach((item, index) => {
    if (!Array.isArray(item.prerequisites)) return;
    const keys = [];
    item.prerequisites.forEach((reference, referenceIndex) => {
      const prefix = `item-catalog.items[${index}].prerequisites[${referenceIndex}]`;
      if (!isRecord(reference) || !itemTypes.has(reference.itemType)) {
        errors.push(`${prefix}.itemType is invalid`);
        return;
      }
      validateAllowedKeys(reference, ["itemType", "itemId"], prefix, errors);
      if (!SAFE_ID_PATTERN.test(reference.itemId ?? "")) {
        errors.push(`${prefix}.itemId is invalid`);
        return;
      }
      const key = `${reference.itemType}:${reference.itemId}`;
      keys.push(key);
      if (!itemMap.has(key)) errors.push(`${prefix} references unknown item ${key}`);
      if (key === item.itemKey) errors.push(`${prefix} cannot reference itself`);
    });
    pushDuplicateErrors(keys, `${item.itemKey} prerequisite`, errors);
    prerequisiteGraph.set(item.itemKey, keys);
  });
  const visiting = new Set();
  const visited = new Set();
  const visit = (itemKey) => {
    if (visiting.has(itemKey)) {
      errors.push(`Item prerequisite cycle detected at ${itemKey}`);
      return;
    }
    if (visited.has(itemKey)) return;
    visiting.add(itemKey);
    (prerequisiteGraph.get(itemKey) ?? []).forEach((dependencyKey) => {
      if (prerequisiteGraph.has(dependencyKey)) visit(dependencyKey);
    });
    visiting.delete(itemKey);
    visited.add(itemKey);
  };
  itemKeys.forEach(visit);

  const lexemeItems = catalogItems.filter((item) => item.itemType === "lexeme");
  const lessonItems = catalogItems.filter((item) => item.itemType === "lesson");
  const gradedTextItems = catalogItems.filter((item) => item.itemType === "graded-text");

  if (expectedSchemaVersion === 2) {
    lessonItems.forEach((item) => {
      const index = catalogItems.indexOf(item);
      const prefix = `item-catalog.items[${index}].knowledgeItems`;
      if (!Array.isArray(item.knowledgeItems)) {
        errors.push(`${prefix} must be an array`);
        return;
      }
      const keys = [];
      item.knowledgeItems.forEach((reference, referenceIndex) => {
        const referencePrefix = `${prefix}[${referenceIndex}]`;
        if (!isRecord(reference) || !KNOWLEDGE_ITEM_TYPES.has(reference.itemType)) {
          errors.push(`${referencePrefix}.itemType is invalid`);
          return;
        }
        validateAllowedKeys(
          reference,
          ["itemType", "itemId"],
          referencePrefix,
          errors,
        );
        if (!SAFE_ID_PATTERN.test(reference.itemId ?? "")) {
          errors.push(`${referencePrefix}.itemId is invalid`);
          return;
        }
        const key = `${reference.itemType}:${reference.itemId}`;
        keys.push(key);
        if (!itemMap.has(key)) {
          errors.push(`${referencePrefix} references unknown item ${key}`);
        }
      });
      pushDuplicateErrors(keys, `${item.itemKey} knowledge item`, errors);
      const mappedLexemeIds = keys
        .filter((key) => key.startsWith("lexeme:"))
        .map((key) => key.slice("lexeme:".length));
      if (!arraysEqual(mappedLexemeIds, item.payload?.wordIds)) {
        errors.push(`${item.itemKey}: lexeme knowledgeItems must match payload.wordIds`);
      }
    });

    const membershipLessonIdsByItemKey = new Map();
    lessonItems.forEach((lesson) => {
      (Array.isArray(lesson.knowledgeItems) ? lesson.knowledgeItems : [])
        .map(referenceKey)
        .filter(isNonEmptyString)
        .forEach((itemKey) => {
          const lessonIds = membershipLessonIdsByItemKey.get(itemKey) ?? [];
          lessonIds.push(lesson.itemId);
          membershipLessonIdsByItemKey.set(itemKey, lessonIds);
        });
    });
    catalogItems.forEach((item) => {
      if (["grammar", "pronunciation", "communicative-function"].includes(item.itemType)) {
        const declaredSourceLessonIds = Array.isArray(item.payload?.sourceLessonIds)
          ? item.payload.sourceLessonIds.filter(isNonEmptyString)
          : [];
        const membershipLessonIds = membershipLessonIdsByItemKey.get(item.itemKey) ?? [];
        if (
          !arraysEqual(
            sortedValues(declaredSourceLessonIds),
            sortedValues(membershipLessonIds),
          )
        ) {
          errors.push(
            `${item.itemKey}: payload.sourceLessonIds must exactly match lesson knowledgeItems membership`,
          );
        }
      }
      if (item.itemType === "character") {
        const membershipLessonIds = membershipLessonIdsByItemKey.get(item.itemKey) ?? [];
        if (membershipLessonIds.length === 0) {
          errors.push(`${item.itemKey}: character must belong to at least one lesson knowledgeItems list`);
        }
      }
    });

    catalogItems.forEach((item, index) => {
      const sourceIds = item.itemType === "character"
        ? item.payload?.sourceLexemeIds
        : ["grammar", "pronunciation", "communicative-function"].includes(item.itemType)
          ? item.payload?.sourceLessonIds
          : null;
      if (!Array.isArray(sourceIds)) return;
      const sourceType = item.itemType === "character" ? "lexeme" : "lesson";
      sourceIds.forEach((sourceId, sourceIndex) => {
        if (!itemMap.has(`${sourceType}:${sourceId}`)) {
          errors.push(
            `item-catalog.items[${index}].payload source ${sourceType} id[${sourceIndex}] references unknown item ${sourceType}:${sourceId}`,
          );
        }
      });
    });
  }
  validateExactSet(
    lexemeItems.map((item) => item.itemId),
    runtimeVocabularyIds,
    "Catalog lexeme inventory",
    errors,
  );
  validateExactSet(
    lessonItems.map((item) => item.itemId),
    runtimeLessons.map((lesson) => lesson?.id).filter(isNonEmptyString),
    "Catalog lesson inventory",
    errors,
  );
  validateExactSet(
    gradedTextItems.map((item) => item.itemId),
    runtimeStories.map((story) => story?.id).filter(isNonEmptyString),
    "Catalog graded-text inventory",
    errors,
  );
  validateExactSet(
    [
      ...new Set(
        lessonItems.map((item) => item.payload?.unitId).filter(isNonEmptyString),
      ),
    ],
    runtimeUnitIds,
    "Catalog unit inventory",
    errors,
  );

  const runtimeLessonMap = new Map(
    runtimeLessons.filter(isRecord).map((lesson) => [lesson.id, lesson]),
  );
  lessonItems.forEach((item) => {
    const runtimeLesson = runtimeLessonMap.get(item.itemId);
    if (!runtimeLesson || !isRecord(item.payload)) return;
    if (item.payload.unitId !== runtimeLesson.unitId) {
      errors.push(`${item.itemKey}: unitId does not match runtime-ids.json`);
    }
    if (!arraysEqual(item.payload.wordIds, runtimeLesson.wordIds)) {
      errors.push(`${item.itemKey}: wordIds do not match runtime-ids.json`);
    }
    if (item.releaseState !== runtimeLesson.releaseState) {
      errors.push(`${item.itemKey}: releaseState does not match runtime-ids.json`);
    }
    if (!Array.isArray(item.prerequisites)) {
      errors.push(`${item.itemKey}: lesson prerequisites require an explicit mapping`);
    } else {
      const lessonPrerequisites = item.prerequisites
        .filter(isRecord)
        .filter((reference) => reference.itemType === "lesson")
        .map((reference) => reference.itemId);
      if (
        !arraysEqual(lessonPrerequisites, runtimeLesson.prerequisiteIds)
        || (
          expectedSchemaVersion === 1
          && item.prerequisites.some(
            (reference) => !isRecord(reference) || reference.itemType !== "lesson",
          )
        )
      ) {
        errors.push(`${item.itemKey}: prerequisites do not match runtime-ids.json`);
      }
    }
    const implied = impliedLessonDependencies(itemMap, item);
    const runtimeClosure = runtimeLessonPrerequisiteClosure(
      runtimeLessonMap,
      item.itemId,
    );
    const unrepresentedLessonIds = [...implied.lessonIds].filter(
      (lessonId) => !runtimeClosure.has(lessonId),
    );
    if (unrepresentedLessonIds.length > 0) {
      errors.push(
        `${item.itemKey}: implied lesson prerequisites are absent from runtime-ids.json: ${unrepresentedLessonIds.join(", ")}`,
      );
    }
  });

  const runtimeStoryMap = new Map(
    runtimeStories.filter(isRecord).map((story) => [story.id, story]),
  );
  gradedTextItems.forEach((item) => {
    const runtimeStory = runtimeStoryMap.get(item.itemId);
    if (!runtimeStory || !isRecord(item.payload)) return;
    const wordIds = [
      ...new Set(
        Array.isArray(item.payload.sentences)
          ? item.payload.sentences.flatMap((sentence) =>
              Array.isArray(sentence?.wordIds) ? sentence.wordIds : [])
          : [],
      ),
    ];
    if (!arraysEqual(wordIds, runtimeStory.wordIds)) {
      errors.push(`${item.itemKey}: sentence wordIds do not match runtime-ids.json`);
    }
    if (item.releaseState !== runtimeStory.releaseState) {
      errors.push(`${item.itemKey}: releaseState does not match runtime-ids.json`);
    }
    if (Array.isArray(item.prerequisites) && item.prerequisites.length > 0) {
      errors.push(`${item.itemKey}: graded-text prerequisites are unsupported by runtime schema`);
    }
  });

  const audioAssets = itemCatalog.audioAssets.filter(isRecord);
  if (audioAssets.length !== itemCatalog.audioAssets.length) {
    errors.push("item-catalog.audioAssets must contain objects");
  }
  const assetIds = [];
  const fileRefs = [];
  for (const [index, asset] of audioAssets.entries()) {
    const prefix = `item-catalog.audioAssets[${index}]`;
    if (!SAFE_ID_PATTERN.test(asset.assetId ?? "")) errors.push(`${prefix}.assetId is invalid`);
    else assetIds.push(asset.assetId);
    if (!isNonEmptyString(asset.targetItemKey) || !itemMap.has(asset.targetItemKey)) {
      errors.push(`${prefix}.targetItemKey is unknown`);
    }
    const target = itemMap.get(asset.targetItemKey);
    if (
      !DIGEST_PATTERN.test(asset.targetPayloadSha256 ?? "")
      || asset.targetPayloadSha256 !== target?.payloadSha256
    ) {
      errors.push(`${prefix}.targetPayloadSha256 does not match the target item`);
    }
    if (
      !isNonEmptyString(asset.fileRef)
      || !asset.fileRef.startsWith("audio/")
      || asset.fileRef.includes("\\")
      || asset.fileRef.split("/").some((part) => part === "" || part === "." || part === "..")
    ) {
      errors.push(`${prefix}.fileRef must be a safe package-local audio path`);
    } else {
      fileRefs.push(asset.fileRef);
      const fileHash = audioAssetFileHashes?.[asset.fileRef] ?? null;
      if (fileHash === null) errors.push(`${prefix}.fileRef is unavailable`);
      else if (fileHash !== asset.fileSha256) {
        errors.push(`${prefix}.fileSha256 does not match package bytes`);
      }
    }
    if (!DIGEST_PATTERN.test(asset.fileSha256 ?? "")) {
      errors.push(`${prefix}.fileSha256 is invalid`);
    }
    const transcriptHash = typeof asset.transcript === "string"
      ? await sha256NormalizedText(asset.transcript)
      : null;
    if (!isNonEmptyString(asset.transcript)) errors.push(`${prefix}.transcript is required`);
    if (
      !DIGEST_PATTERN.test(asset.transcriptSha256 ?? "")
      || asset.transcriptSha256 !== transcriptHash
    ) {
      errors.push(`${prefix}.transcriptSha256 does not match transcript`);
    }
    if (asset.speaker === null) errors.push(`${prefix}.speaker is required`);
    else {
      validateEvidenceObject(
        asset.speaker,
        ["id", "nativeSpeakerEvidenceRef"],
        `${prefix}.speaker`,
        errors,
      );
    }
    if (asset.rights === null) errors.push(`${prefix}.rights is required`);
    else {
      validateEvidenceObject(
        asset.rights,
        ["ownerId", "licenseId", "evidenceRef"],
        `${prefix}.rights`,
        errors,
      );
    }
  }
  pushDuplicateErrors(assetIds, "audio asset id", errors);
  pushDuplicateErrors(fileRefs, "audio fileRef", errors);
};

const validateRuntimeCatalog = (runtimeCatalog, itemCatalog, errors) => {
  if (!isRecord(runtimeCatalog) || runtimeCatalog.schemaVersion !== 1) {
    errors.push("runtime-catalog.schemaVersion must be 1");
    return;
  }
  validateAllowedKeys(
    runtimeCatalog,
    ["schemaVersion", "contentVersion", "vocabulary", "lessons", "stories"],
    "runtime-catalog",
    errors,
  );
  for (const field of ["vocabulary", "lessons", "stories"]) {
    if (!Array.isArray(runtimeCatalog[field])) {
      errors.push(`runtime-catalog.${field} must be an array`);
    }
  }
  let expected;
  try {
    expected = projectSanitizedRuntimeCatalog(itemCatalog);
  } catch (error) {
    errors.push(
      `runtime-catalog projection failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }
  if (canonicalJson(runtimeCatalog) !== canonicalJson(expected)) {
    errors.push("runtime-catalog.json must equal the sanitized released projection");
  }
};

const validateCoverageClaims = (
  coverageClaims,
  itemCatalog,
  itemCatalogHash,
  requiresScopedClaims,
  errors,
) => {
  const supportedSchema = requiresScopedClaims ? 2 : 1;
  if (!isRecord(coverageClaims) || coverageClaims.schemaVersion !== supportedSchema) {
    errors.push(`coverage-claims.schemaVersion must be ${supportedSchema}`);
    return;
  }
  if (
    requiresScopedClaims
    && coverageClaims.itemCatalogSha256 !== itemCatalogHash
  ) {
    errors.push("coverage-claims.itemCatalogSha256 does not match item-catalog.json");
  }
  if (!Array.isArray(coverageClaims.coverageClaims)) {
    errors.push("coverageClaims must be an array");
    return;
  }
  const itemKeys = new Set(
    (Array.isArray(itemCatalog?.items) ? itemCatalog.items : [])
      .filter(isRecord)
      .map((item) => item.itemKey),
  );
  const claimIds = [];
  coverageClaims.coverageClaims.forEach((claim, index) => {
    if (!isRecord(claim)) {
      errors.push(`coverageClaims[${index}] must be an object`);
      return;
    }
    ["claimId", "framework", "level", "evidenceRef"].forEach((field) => {
      if (!isNonEmptyString(claim[field])) errors.push(`coverageClaims[${index}].${field} is required`);
    });
    if (isNonEmptyString(claim.claimId)) claimIds.push(claim.claimId);
    if (!requiresScopedClaims) return;
    const scopedItemKeys = validateStringArray(
      claim.itemKeys,
      `coverageClaims[${index}] item key`,
      errors,
    );
    const entryLessonKeys = validateStringArray(
      claim.entryLessonKeys,
      `coverageClaims[${index}] entry lesson key`,
      errors,
    );
    const terminalLessonKeys = validateStringArray(
      claim.terminalLessonKeys,
      `coverageClaims[${index}] terminal lesson key`,
      errors,
    );
    if (
      scopedItemKeys.length === 0
      || entryLessonKeys.length === 0
      || terminalLessonKeys.length === 0
    ) {
      errors.push(`coverageClaims[${index}] requires non-empty item, entry, and terminal scopes`);
    }
    scopedItemKeys.forEach((key) => {
      if (!itemKeys.has(key)) errors.push(`coverageClaims[${index}] references unknown item ${key}`);
    });
    [...entryLessonKeys, ...terminalLessonKeys].forEach((key) => {
      if (!key.startsWith("lesson:") || !itemKeys.has(key)) {
        errors.push(`coverageClaims[${index}] references unknown lesson ${key}`);
      }
      if (!scopedItemKeys.includes(key)) {
        errors.push(`coverageClaims[${index}] lesson ${key} is outside itemKeys`);
      }
    });
  });
  pushDuplicateErrors(claimIds, "coverage claim id", errors);
  if (requiresScopedClaims) {
    const scopedClaims = coverageClaims.coverageClaims.filter(
      (claim) =>
        isRecord(claim)
        && isNonEmptyString(claim.framework)
        && isNonEmptyString(claim.level)
        && Array.isArray(claim.itemKeys)
        && claim.itemKeys.every(isNonEmptyString)
        && Array.isArray(claim.entryLessonKeys)
        && claim.entryLessonKeys.every(isNonEmptyString)
        && Array.isArray(claim.terminalLessonKeys)
        && claim.terminalLessonKeys.every(isNonEmptyString),
    );
    const frameworkScopeKeys = scopedClaims.map((claim) =>
      [
        claim.framework?.trim().toLocaleLowerCase("en-US"),
        sortedValues(claim.itemKeys).join(","),
        sortedValues(claim.entryLessonKeys).join(","),
        sortedValues(claim.terminalLessonKeys).join(","),
      ].join("|"));
    pushDuplicateErrors(
      frameworkScopeKeys,
      "coverage framework path scope",
      errors,
    );
    pushDuplicateErrors(
      scopedClaims.map((claim) =>
        `${claim.framework.trim().toLocaleLowerCase("en-US")}|${claim.level.trim().toLocaleUpperCase("en-US")}`),
      "coverage framework level",
      errors,
    );
    const hskOne = scopedClaims.find(
      (claim) =>
        typeof claim.framework === "string"
        && claim.framework.trim().toLocaleLowerCase("en-US") === "hsk"
        && typeof claim.level === "string"
        && claim.level.trim().toLocaleUpperCase("en-US") === "1",
    );
    const hskTwo = scopedClaims.find(
      (claim) =>
        typeof claim.framework === "string"
        && claim.framework.trim().toLocaleLowerCase("en-US") === "hsk"
        && typeof claim.level === "string"
        && claim.level.trim().toLocaleUpperCase("en-US") === "2",
    );
    if (hskOne && hskTwo) {
      const hskOneItems = new Set(hskOne.itemKeys);
      const hskTwoItems = new Set(hskTwo.itemKeys);
      const hskOneLessons = new Set(
        hskOne.itemKeys.filter((itemKey) => itemKey.startsWith("lesson:")),
      );
      const hskTwoLessons = new Set(
        hskTwo.itemKeys.filter((itemKey) => itemKey.startsWith("lesson:")),
      );
      const catalogItemsByKey = new Map(
        (Array.isArray(itemCatalog?.items) ? itemCatalog.items : [])
          .filter(isRecord)
          .map((item) => [item.itemKey, item]),
      );
      const hskOneLessonPayloads = new Set(
        [...hskOneLessons]
          .map((itemKey) => catalogItemsByKey.get(itemKey)?.payloadSha256)
          .filter(isNonEmptyString),
      );
      const hskTwoLessonPayloads = new Set(
        [...hskTwoLessons]
          .map((itemKey) => catalogItemsByKey.get(itemKey)?.payloadSha256)
          .filter(isNonEmptyString),
      );
      if (
        hskTwoItems.size <= hskOneItems.size
        || [...hskOneItems].some((itemKey) => !hskTwoItems.has(itemKey))
      ) {
        errors.push("HSK 2 coverage scope must be a strict superset of HSK 1");
      }
      if (
        hskTwoLessons.size <= hskOneLessons.size
        || [...hskOneLessons].some(
          (itemKey) => !hskTwoLessons.has(itemKey),
        )
        || hskTwo.terminalLessonKeys.every((itemKey) =>
          hskOne.terminalLessonKeys.includes(itemKey))
        || hskTwoLessonPayloads.size <= hskOneLessonPayloads.size
        || [...hskOneLessonPayloads].some(
          (payloadHash) => !hskTwoLessonPayloads.has(payloadHash),
        )
      ) {
        errors.push("HSK 2 lesson path must extend beyond HSK 1");
      }
    }
  }
};

const validateReviews = (
  reviews,
  itemCatalog,
  itemCatalogHash,
  requiresScopedReviews,
  errors,
) => {
  const supportedSchema = requiresScopedReviews ? 2 : 1;
  if (!isRecord(reviews) || reviews.schemaVersion !== supportedSchema) {
    errors.push(`reviews.schemaVersion must be ${supportedSchema}`);
    return;
  }
  if (!DIGEST_PATTERN.test(reviews.packageManifestSha256 ?? "")) {
    errors.push("reviews.packageManifestSha256 must be a SHA-256 digest");
  }
  if (
    requiresScopedReviews
    && reviews.itemCatalogSha256 !== itemCatalogHash
  ) {
    errors.push("reviews.itemCatalogSha256 does not match item-catalog.json");
  }
  if (!Array.isArray(reviews.reviews)) {
    errors.push("reviews.reviews must be an array");
    return;
  }
  const itemKeys = new Set(
    (Array.isArray(itemCatalog?.items) ? itemCatalog.items : [])
      .filter(isRecord)
      .map((item) => item.itemKey),
  );
  const audioAssetIds = new Set(
    (Array.isArray(itemCatalog?.audioAssets) ? itemCatalog.audioAssets : [])
      .filter(isRecord)
      .map((asset) => asset.assetId),
  );
  const reviewIds = [];
  const precedenceKeys = [];
  reviews.reviews.forEach((review, index) => {
    if (!isRecord(review)) {
      errors.push(`reviews[${index}] must be an object`);
      return;
    }
    if (!isNonEmptyString(review.reviewId)) errors.push(`reviews[${index}].reviewId is required`);
    else reviewIds.push(review.reviewId);
    if (!REVIEW_ROLES.has(review.role)) errors.push(`reviews[${index}].role is invalid`);
    if (!REVIEW_DECISIONS.has(review.decision)) {
      errors.push(`reviews[${index}].decision is invalid`);
    }
    if (!isNonEmptyString(review.reviewerId)) {
      errors.push(`reviews[${index}].reviewerId is required`);
    }
    if (!isValidDate(review.reviewedAt)) errors.push(`reviews[${index}].reviewedAt is invalid`);
    else if (Date.parse(review.reviewedAt) > Date.now() + 5 * 60 * 1000) {
      errors.push(`reviews[${index}].reviewedAt cannot be in the future`);
    }
    if (!isNonEmptyString(review.evidenceRef)) {
      errors.push(`reviews[${index}].evidenceRef is required`);
    }
    if (!DIGEST_PATTERN.test(review.packageManifestSha256 ?? "")) {
      errors.push(`reviews[${index}].packageManifestSha256 is invalid`);
    }
    if (!requiresScopedReviews) return;
    if (!isRecord(review.scope)) {
      errors.push(`reviews[${index}].scope is required`);
      return;
    }
    if (review.scope.itemCatalogSha256 !== itemCatalogHash) {
      errors.push(`reviews[${index}].scope.itemCatalogSha256 does not match item-catalog.json`);
    }
    const scopedItemKeys = validateStringArray(
      review.scope.itemKeys,
      `reviews[${index}] item key`,
      errors,
    );
    const scopedAudioAssetIds = validateStringArray(
      review.scope.audioAssetIds,
      `reviews[${index}] audio asset id`,
      errors,
    );
    if (scopedItemKeys.length + scopedAudioAssetIds.length === 0) {
      errors.push(`reviews[${index}].scope cannot be empty`);
    }
    if (review.role === "audio-rights" && scopedAudioAssetIds.length === 0) {
      errors.push(`reviews[${index}] audio-rights review requires audioAssetIds`);
    }
    if (review.role !== "audio-rights" && scopedItemKeys.length === 0) {
      errors.push(`reviews[${index}] ${String(review.role)} review requires itemKeys`);
    }
    scopedItemKeys.forEach((key) => {
      if (!itemKeys.has(key)) errors.push(`reviews[${index}] references unknown item ${key}`);
      precedenceKeys.push(
        `${String(review.role)}:item:${key}:${String(Date.parse(review.reviewedAt))}`,
      );
    });
    scopedAudioAssetIds.forEach((assetId) => {
      if (!audioAssetIds.has(assetId)) {
        errors.push(`reviews[${index}] references unknown audio asset ${assetId}`);
      }
      precedenceKeys.push(
        `${String(review.role)}:audio:${assetId}:${String(Date.parse(review.reviewedAt))}`,
      );
    });
  });
  pushDuplicateErrors(reviewIds, "review id", errors);
  pushDuplicateErrors(precedenceKeys, "review role/target/timestamp", errors);
};

const SOURCE_ARTIFACT_BINDINGS = [
  {
    name: "src/data/assessment.ts",
    liveField: "runtimeAssessmentSourceText",
    hashField: "assessmentSource",
  },
  {
    name: "src/data/curriculum.ts",
    liveField: "runtimeSourceText",
    hashField: "runtimeSource",
  },
  {
    name: "src/data/lessonGuides.ts",
    liveField: "runtimeLessonGuidesSourceText",
    hashField: "lessonGuidesSource",
  },
  {
    name: "src/data/knowledgeItemBlueprints.ts",
    liveField: "runtimeKnowledgeItemBlueprintsSourceText",
    hashField: "knowledgeItemBlueprintsSource",
  },
  {
    name: "src/lib/exerciseGeneration.ts",
    liveField: "runtimeExerciseGenerationSourceText",
    hashField: "exerciseGenerationSource",
  },
  {
    name: "src/server/attemptScoring.ts",
    liveField: "runtimeAttemptScoringSourceText",
    hashField: "attemptScoringSource",
  },
  {
    name: "src/server/authoritativeItemBank.ts",
    liveField: "runtimeAuthoritativeItemBankSourceText",
    hashField: "authoritativeItemBankSource",
  },
  {
    name: "src/server/lessonCompletionPolicy.ts",
    liveField: "runtimeLessonCompletionPolicySourceText",
    hashField: "lessonCompletionPolicySource",
  },
  {
    name: "src/server/authoritativeAssessmentItemBank.ts",
    liveField: "runtimeAuthoritativeAssessmentItemBankSourceText",
    hashField: "authoritativeAssessmentItemBankSource",
  },
  {
    name: "src/server/assessmentScoring.ts",
    liveField: "runtimeAssessmentScoringSourceText",
    hashField: "assessmentScoringSource",
  },
];

export const validateContentBundle = async (bundle) => {
  const errors = [];
  const warnings = [];
  const manifestHash = await sha256Json(bundle.manifest);
  const runtimeIdsHash = await sha256Json(bundle.runtimeIds);
  const itemCatalogHash = isRecord(bundle.itemCatalog)
    ? await sha256Json(bundle.itemCatalog)
    : null;
  const runtimeCatalogHash = isRecord(bundle.runtimeCatalog)
    ? await sha256Json(bundle.runtimeCatalog)
    : null;
  const coverageClaimsHash = await sha256Json(bundle.coverageClaims);
  const reviewsHash = await sha256Json(bundle.reviews);
  const immutableSourceTexts = isRecord(bundle.immutableSourceTexts)
    ? bundle.immutableSourceTexts
    : {};
  const immutableSourceHashes = {};
  const liveSourceHashes = {};
  await Promise.all(
    SOURCE_ARTIFACT_BINDINGS.map(async ({ name, liveField }) => {
      const immutableText = immutableSourceTexts[name];
      const liveText = bundle[liveField];
      immutableSourceHashes[name] =
        typeof immutableText === "string"
          ? await sha256NormalizedText(immutableText)
          : null;
      liveSourceHashes[name] =
        typeof liveText === "string"
          ? await sha256NormalizedText(liveText)
          : null;
    }),
  );

  validateRegistry(bundle.registry, bundle.registryEntry, errors);
  validateManifest(bundle.manifest, errors);
  validateRuntimeIds(bundle.runtimeIds, errors);
  const requiresItemCatalog = bundle.manifest?.contentSchemaVersion >= 3;
  const requiresRuntimeCatalog = bundle.manifest?.contentSchemaVersion >= 4;
  if (requiresItemCatalog) {
    await validateItemCatalog(
      bundle.itemCatalog,
      bundle.runtimeIds,
      bundle.audioAssetFileHashes,
      bundle.manifest.contentSchemaVersion,
      errors,
    );
  }
  if (requiresRuntimeCatalog) {
    validateRuntimeCatalog(bundle.runtimeCatalog, bundle.itemCatalog, errors);
  }
  validateCoverageClaims(
    bundle.coverageClaims,
    bundle.itemCatalog,
    itemCatalogHash,
    requiresItemCatalog,
    errors,
  );
  validateReviews(
    bundle.reviews,
    bundle.itemCatalog,
    itemCatalogHash,
    requiresItemCatalog,
    errors,
  );

  const version = bundle.manifest?.contentVersion;
  [
    ["registry entry", bundle.registryEntry?.contentVersion],
    ["runtime ids", bundle.runtimeIds?.contentVersion],
    ...(requiresItemCatalog
      ? [["item catalog", bundle.itemCatalog?.contentVersion]]
      : []),
    ...(requiresRuntimeCatalog
      ? [["runtime catalog", bundle.runtimeCatalog?.contentVersion]]
      : []),
    ["coverage claims", bundle.coverageClaims?.contentVersion],
    ["reviews", bundle.reviews?.contentVersion],
  ].forEach(([label, artifactVersion]) => {
    if (artifactVersion !== version) errors.push(`${label} contentVersion does not match manifest`);
  });
  if (bundle.registryEntry?.packageId !== bundle.manifest?.packageId) {
    errors.push("Registry packageId does not match manifest");
  }
  const selectedRegistryIndex = bundle.registry?.packages?.indexOf(bundle.registryEntry) ?? -1;
  const parentManifestHash = bundle.manifest?.createdFromManifestSha256;
  if (selectedRegistryIndex === 0 && parentManifestHash !== null) {
    errors.push("The first registered package must not declare a parent manifest");
  }
  if (selectedRegistryIndex > 0) {
    const parentRegistryIndex = bundle.registry.packages.findIndex(
      (entry) => entry.manifestSha256 === parentManifestHash,
    );
    if (parentRegistryIndex < 0) {
      errors.push("Package lineage parent manifest is not registered");
    } else if (parentRegistryIndex >= selectedRegistryIndex) {
      errors.push("Package lineage parent must precede the selected package");
    }
  }
  if (bundle.registryEntry?.manifestSha256 !== manifestHash) {
    errors.push("Registry manifest digest does not match immutable manifest bytes");
  }
  if (bundle.manifest?.artifacts?.["runtime-ids.json"] !== runtimeIdsHash) {
    errors.push("runtime-ids.json digest does not match manifest");
  }
  if (
    requiresItemCatalog
    && bundle.manifest?.artifacts?.["item-catalog.json"] !== itemCatalogHash
  ) {
    errors.push("item-catalog.json digest does not match manifest");
  }
  if (
    requiresRuntimeCatalog
    && bundle.manifest?.artifacts?.["runtime-catalog.json"] !== runtimeCatalogHash
  ) {
    errors.push("runtime-catalog.json digest does not match manifest");
  }
  if (bundle.manifest?.artifacts?.["coverage-claims.json"] !== coverageClaimsHash) {
    errors.push("coverage-claims.json digest does not match manifest");
  }
  if (
    requiresItemCatalog
    && bundle.manifest?.governance?.includesAudio
      !== ((bundle.itemCatalog?.audioAssets?.length ?? 0) > 0)
  ) {
    errors.push(
      "manifest.governance.includesAudio must equal the presence of catalog audio assets",
    );
  }
  const requiredSourceArtifacts = contentSourceArtifactNames(
    bundle.manifest?.contentSchemaVersion,
  );
  const isRuntimeBoundPackage =
    bundle.registry?.currentContentVersion === version
    || bundle.runtimeContentVersion === version;
  requiredSourceArtifacts.forEach((name) => {
    const immutableHash = immutableSourceHashes[name];
    if (immutableHash === null) {
      errors.push(`Immutable package snapshot for ${name} is unavailable`);
    } else if (bundle.manifest?.artifacts?.[name] !== immutableHash) {
      errors.push(`${name} snapshot digest does not match manifest`);
    }
    if (!isRuntimeBoundPackage) return;
    const liveHash = liveSourceHashes[name];
    if (liveHash === null) {
      errors.push(`Checked-in ${name} source is unavailable`);
    } else if (bundle.manifest?.artifacts?.[name] !== liveHash) {
      errors.push(`${name} digest does not match manifest`);
    }
  });
  if (requiresItemCatalog) {
    const curriculumSnapshot =
      immutableSourceTexts["src/data/curriculum.ts"];
    const catalogFileName = requiresRuntimeCatalog
      ? "runtime-catalog"
      : "item-catalog";
    const catalogImportPattern = requiresRuntimeCatalog
      ? /^import runtimeCatalogJson from "\.\.\/\.\.\/content\/packages\/([a-zA-Z0-9][a-zA-Z0-9._-]*)\/runtime-catalog\.json";$/gmu
      : /^import itemCatalogJson from "\.\.\/\.\.\/content\/packages\/([a-zA-Z0-9][a-zA-Z0-9._-]*)\/item-catalog\.json";$/gmu;
    const catalogImportMatches =
      typeof curriculumSnapshot === "string"
        ? [
            ...curriculumSnapshot.matchAll(
              catalogImportPattern,
            ),
          ]
        : [];
    if (
      catalogImportMatches.length !== 1
      || catalogImportMatches[0][1] !== version
    ) {
      errors.push(
        `src/data/curriculum.ts must import the selected package ${catalogFileName}.json`,
      );
    }
    if (requiresRuntimeCatalog && typeof curriculumSnapshot === "string") {
      const packageJsonImports = [
        ...curriculumSnapshot.matchAll(
          /["'][^"']*content\/packages\/([^"']+\.json)["']/gmu,
        ),
      ].map((match) => match[1]);
      const allowedPackageJson = `${version}/runtime-catalog.json`;
      if (packageJsonImports.some((path) => path !== allowedPackageJson)) {
        errors.push(
          "Schema-v4 runtime source may import only the selected runtime-catalog.json package artifact",
        );
      }
    }
  }
  if (bundle.reviews?.packageManifestSha256 !== manifestHash) {
    warnings.push("Review envelope is stale for the current manifest digest");
  }
  if (
    bundle.registryEntry?.promotion !== null
    && bundle.registryEntry?.promotion?.reviewEnvelopeSha256 !== reviewsHash
  ) {
    errors.push("Promotion provenance does not bind the current review envelope");
  }
  const reviewEntries = Array.isArray(bundle.reviews?.reviews)
    ? bundle.reviews.reviews
    : [];
  reviewEntries.forEach((review) => {
    if (review.packageManifestSha256 !== manifestHash) {
      warnings.push(`Review ${review.reviewId} is stale for the current manifest digest`);
    }
  });
  if (
    bundle.registry?.currentContentVersion === version &&
    bundle.runtimeContentVersion !== null &&
    bundle.runtimeContentVersion !== version
  ) {
    errors.push("Current registry package is not bound to the checked-in runtime contentVersion");
  }
  if (bundle.registryEntry?.audience !== bundle.manifest?.audience) {
    errors.push("Registry audience does not match manifest");
  }

  return {
    errors,
    warnings,
    hashes: {
      manifest: manifestHash,
      runtimeIds: runtimeIdsHash,
      itemCatalog: itemCatalogHash,
      runtimeCatalog: runtimeCatalogHash,
      coverageClaims: coverageClaimsHash,
      reviews: reviewsHash,
      ...Object.fromEntries(
        SOURCE_ARTIFACT_BINDINGS.map(({ name, hashField }) => [
          hashField,
          immutableSourceHashes[name],
        ]),
      ),
    },
  };
};

const latestReviewByRole = (reviews, manifestHash) => {
  const latest = new Map();
  reviews
    .filter((review) => review.packageManifestSha256 === manifestHash)
    .forEach((review) => {
      const previous = latest.get(review.role);
      if (!previous || Date.parse(review.reviewedAt) >= Date.parse(previous.reviewedAt)) {
        latest.set(review.role, review);
      }
    });
  return latest;
};

const latestScopedReview = (
  reviews,
  manifestHash,
  role,
  scopeField,
  target,
) => {
  let latest = null;
  reviews
    .filter(
      (review) =>
        review.packageManifestSha256 === manifestHash
        && review.role === role
        && Array.isArray(review.scope?.[scopeField])
        && review.scope[scopeField].includes(target),
    )
    .forEach((review) => {
      if (!latest || Date.parse(review.reviewedAt) > Date.parse(latest.reviewedAt)) {
        latest = review;
      }
    });
  return latest;
};

const itemMapFor = (bundle) =>
  new Map(
    (Array.isArray(bundle.itemCatalog?.items) ? bundle.itemCatalog.items : [])
      .filter(isRecord)
      .map((item) => [item.itemKey, item]),
  );

const gradedTextPayloadIsNonEmpty = (item) => {
  if (item?.itemType !== "graded-text") return false;
  const sentences = item.payload?.sentences;
  const comprehension = item.payload?.comprehension;
  return Array.isArray(sentences)
    && sentences.length > 0
    && sentences.every(
      (sentence) =>
        isNonEmptyString(sentence?.chinese)
        && isNonEmptyString(sentence?.pinyin)
        && isNonEmptyString(sentence?.translation),
    )
    && sentences.some(
      (sentence) => Array.isArray(sentence?.wordIds) && sentence.wordIds.length > 0,
    )
    && Array.isArray(comprehension)
    && comprehension.length > 0
    && comprehension.every(
      (question) =>
        isNonEmptyString(question?.prompt)
        && Array.isArray(question?.options)
        && new Set(question.options).size >= 2
        && question.options.includes(question.correctAnswer)
        && isNonEmptyString(question.explanation),
    );
};

const transitiveItemClosure = (itemMap, initialKeys) => {
  const closure = new Set();
  const queue = [...initialKeys];
  while (queue.length > 0) {
    const itemKey = queue.shift();
    if (closure.has(itemKey)) continue;
    closure.add(itemKey);
    const item = itemMap.get(itemKey);
    if (!item) continue;
    directDependencyKeys(item).forEach((dependencyKey) => {
      if (!closure.has(dependencyKey)) queue.push(dependencyKey);
    });
  }
  return closure;
};

const releasedCatalogItems = (bundle) => {
  const items = Array.isArray(bundle.itemCatalog?.items)
    ? bundle.itemCatalog.items.filter(isRecord)
    : [];
  const itemMap = new Map(items.map((item) => [item.itemKey, item]));
  const activeKeys = items
    .filter((item) => RELEASED_STATES.has(item.releaseState))
    .map((item) => item.itemKey);
  const relevantKeys = transitiveItemClosure(itemMap, activeKeys);
  return items.filter((item) => relevantKeys.has(item.itemKey));
};

const characterPayloadIsReleaseComplete = (item) =>
  item?.itemType !== "character"
  || (
    isNonEmptyString(item.payload?.radical)
    && Number.isInteger(item.payload?.strokeCount)
    && item.payload.strokeCount > 0
    && Array.isArray(item.payload?.components)
    && item.payload.components.length > 0
    && item.payload.components.every(isNonEmptyString)
    && isNonEmptyString(item.payload?.structure)
    && isNonEmptyString(item.payload?.strokeDataRef)
    && DIGEST_PATTERN.test(item.payload?.strokeDataSha256 ?? "")
  );

const itemIsReleaseReady = (
  bundle,
  manifestHash,
  item,
  memo = new Map(),
  visiting = new Set(),
) => {
  if (!item || !RELEASED_STATES.has(item.releaseState)) return false;
  if (memo.has(item.itemKey)) return memo.get(item.itemKey);
  if (visiting.has(item.itemKey)) return false;
  visiting.add(item.itemKey);
  let ready = true;
  if (!item.owner?.id || !item.owner?.evidenceRef) ready = false;
  if (!item.sourceLicense?.licenseId || !item.sourceLicense?.evidenceRef) ready = false;
  if (!Array.isArray(item.prerequisites)) ready = false;
  if (!characterPayloadIsReleaseComplete(item)) ready = false;
  if (
    item.itemType === "lesson"
    && Array.isArray(item.prerequisites)
    && item.prerequisites.some(
      (reference) => !isRecord(reference) || reference.itemType !== "lesson",
    )
  ) {
    ready = false;
  }
  if (
    item.itemType === "graded-text"
    && Array.isArray(item.prerequisites)
    && item.prerequisites.length > 0
  ) {
    ready = false;
  }
  const itemMap = itemMapFor(bundle);
  for (const dependencyKey of directDependencyKeys(item)) {
    const dependency = itemMap.get(dependencyKey);
    if (
      !dependency
      || !itemIsReleaseReady(bundle, manifestHash, dependency, memo, visiting)
    ) {
      ready = false;
    }
  }
  for (const role of ["content-owner", "native-linguistic", "source-license"]) {
    const review = latestScopedReview(
      Array.isArray(bundle.reviews?.reviews) ? bundle.reviews.reviews : [],
      manifestHash,
      role,
      "itemKeys",
      item.itemKey,
    );
    if (!review || review.decision !== "approved") ready = false;
    if (role === "native-linguistic" && review?.reviewerId === item.owner?.id) {
      ready = false;
    }
  }
  visiting.delete(item.itemKey);
  memo.set(item.itemKey, ready);
  return ready;
};

const assessBaseReleaseEligibility = (bundle, validation, channel) => {
  const blockers = [...validation.errors];
  const warnings = [...validation.warnings];
  const missingMetadata = [];
  const manifestHash = validation.hashes.manifest;
  const governance = bundle.manifest.governance;

  if (!governance.contentOwner?.id || !governance.contentOwner?.evidenceRef) {
    missingMetadata.push("contentOwner");
  }
  if (!governance.sourceLicense?.licenseId || !governance.sourceLicense?.evidenceRef) {
    missingMetadata.push("sourceLicense");
  }
  if (
    governance.includesAudio &&
    (!governance.audioRights?.ownerId ||
      !governance.audioRights?.licenseId ||
      !governance.audioRights?.evidenceRef)
  ) {
    missingMetadata.push("audioRights");
  }
  missingMetadata.forEach((field) => blockers.push(`Missing governance metadata: ${field}`));

  if (bundle.registryEntry.lifecycle === "retired") {
    blockers.push("Retired packages cannot be promoted");
  }
  if (bundle.runtimeContentVersion !== bundle.manifest.contentVersion) {
    blockers.push("Package is not bound to the checked-in runtime contentVersion");
  }
  if (bundle.reviews.packageManifestSha256 !== manifestHash) {
    blockers.push("Review envelope does not bind the current manifest digest");
  }

  const reviewEntries = Array.isArray(bundle.reviews?.reviews)
    ? bundle.reviews.reviews
    : [];
  const staleReviewIds = reviewEntries
    .filter((review) => review.packageManifestSha256 !== manifestHash)
    .map((review) => review.reviewId);
  if (bundle.manifest.contentSchemaVersion < 3 || bundle.itemCatalog === null) {
    blockers.push("Release eligibility requires a schema-v3+ item catalog");
    const latestReviews = latestReviewByRole(reviewEntries, manifestHash);
    const requiredRoles = ["content-owner", "native-linguistic", "source-license"];
    if (governance.includesAudio) requiredRoles.push("audio-rights");
    requiredRoles.forEach((role) => {
      const review = latestReviews.get(role);
      if (!review) blockers.push(`Missing exact-hash approval: ${role}`);
      else if (review.decision !== "approved") {
        blockers.push(`Latest ${role} review is not approved`);
      }
    });
    const linguisticReview = latestReviews.get("native-linguistic");
    if (
      linguisticReview?.decision === "approved"
      && linguisticReview.reviewerId === governance.contentOwner?.id
    ) {
      blockers.push("Native linguistic reviewer must be independent from the content owner");
    }
  } else {
    const relevantItems = releasedCatalogItems(bundle);
    const unreadyItems = relevantItems.filter(
      (item) => !itemIsReleaseReady(bundle, manifestHash, item),
    );
    if (unreadyItems.length > 0) {
      blockers.push(
        `Released catalog items missing item-level governance or exact scoped review: ${unreadyItems.length}`,
      );
    }
    const emptyReleasedGradedTexts = relevantItems.filter(
      (item) =>
        item.itemType === "graded-text" && !gradedTextPayloadIsNonEmpty(item),
    );
    if (emptyReleasedGradedTexts.length > 0) {
      blockers.push(
        `Released graded texts must contain sentences and comprehension: ${emptyReleasedGradedTexts.length}`,
      );
    }
  }
  if (
    !Array.isArray(bundle.coverageClaims?.coverageClaims)
    || bundle.coverageClaims.coverageClaims.length === 0
  ) {
    warnings.push("No framework, HSK, A0, or goal coverage claim is declared");
  }
  return {
    channel,
    eligible: blockers.length === 0,
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
    missingMetadata,
    staleReviewIds,
  };
};

const withAdditionalBlockers = (assessment, blockers, warnings = []) => ({
  ...assessment,
  eligible: assessment.blockers.length + blockers.length === 0,
  blockers: [...new Set([...assessment.blockers, ...blockers])],
  warnings: [...new Set([...assessment.warnings, ...warnings])],
});

const coverageClaimHasReachableReviewedPath = (
  bundle,
  manifestHash,
  claim,
) => {
  if (
    bundle.coverageClaims?.schemaVersion !== 2
    || !isRecord(claim)
    || !isNonEmptyString(claim.framework)
    || !isNonEmptyString(claim.level)
    || !isNonEmptyString(claim.evidenceRef)
    || !Array.isArray(claim.itemKeys)
    || !claim.itemKeys.every(isNonEmptyString)
    || !Array.isArray(claim.entryLessonKeys)
    || !claim.entryLessonKeys.every(isNonEmptyString)
    || !Array.isArray(claim.terminalLessonKeys)
    || !claim.terminalLessonKeys.every(isNonEmptyString)
    || claim.itemKeys.length === 0
    || claim.entryLessonKeys.length === 0
    || claim.terminalLessonKeys.length === 0
  ) {
    return false;
  }
  const itemMap = itemMapFor(bundle);
  if (
    claim.itemKeys.some(
      (itemKey) => !itemIsReleaseReady(bundle, manifestHash, itemMap.get(itemKey)),
    )
  ) {
    return false;
  }
  const scopedLessonKeys = new Set(
    claim.itemKeys.filter((itemKey) => itemKey.startsWith("lesson:")),
  );
  if (scopedLessonKeys.size < 2) return false;
  const adjacency = new Map(
    [...scopedLessonKeys].map((itemKey) => [itemKey, []]),
  );
  const prerequisiteKeysByLesson = new Map();
  scopedLessonKeys.forEach((itemKey) => {
    const item = itemMap.get(itemKey);
    const prerequisites = Array.isArray(item?.prerequisites)
      ? item.prerequisites
      : [];
    const prerequisiteKeys = prerequisites
      .filter(
        (reference) => isRecord(reference) && reference.itemType === "lesson",
      )
      .map((reference) => `lesson:${reference.itemId}`);
    prerequisiteKeysByLesson.set(itemKey, prerequisiteKeys);
    prerequisiteKeys.forEach((prerequisiteKey) => {
      if (scopedLessonKeys.has(prerequisiteKey)) {
        adjacency.get(prerequisiteKey)?.push(itemKey);
      }
    });
  });
  if (
    [...prerequisiteKeysByLesson.values()]
      .flat()
      .some((prerequisiteKey) => !scopedLessonKeys.has(prerequisiteKey))
  ) {
    return false;
  }
  const roots = [...scopedLessonKeys].filter(
    (itemKey) => (prerequisiteKeysByLesson.get(itemKey)?.length ?? 0) === 0,
  );
  const sinks = [...scopedLessonKeys].filter(
    (itemKey) => (adjacency.get(itemKey)?.length ?? 0) === 0,
  );
  if (
    !arraysEqual(sortedValues(roots), sortedValues(claim.entryLessonKeys))
    || !arraysEqual(sortedValues(sinks), sortedValues(claim.terminalLessonKeys))
  ) {
    return false;
  }
  const reachable = new Set();
  const queue = [...claim.entryLessonKeys];
  while (queue.length > 0) {
    const itemKey = queue.shift();
    if (reachable.has(itemKey) || !scopedLessonKeys.has(itemKey)) continue;
    reachable.add(itemKey);
    queue.push(...(adjacency.get(itemKey) ?? []));
  }
  if (reachable.size !== scopedLessonKeys.size) return false;
  const scopeRoots = claim.itemKeys.filter((itemKey) => {
    const item = itemMap.get(itemKey);
    return item?.itemType === "lesson" || item?.itemType === "graded-text";
  });
  const requiredItemKeys = transitiveItemClosure(itemMap, scopeRoots);
  return arraysEqual(
    sortedValues(claim.itemKeys),
    sortedValues(requiredItemKeys),
  );
};

const claimHasReachableReviewedPath = (
  bundle,
  manifestHash,
  framework,
  level,
) => {
  const normalizedFramework = framework.toLocaleLowerCase("en-US");
  const normalizedLevel = level.toLocaleUpperCase("en-US");
  const coverageClaims = Array.isArray(bundle.coverageClaims?.coverageClaims)
    ? bundle.coverageClaims.coverageClaims
    : [];
  return coverageClaims.some(
    (claim) =>
      isRecord(claim)
      && isNonEmptyString(claim.framework)
      && claim.framework.trim().toLocaleLowerCase("en-US") === normalizedFramework
      && isNonEmptyString(claim.level)
      && claim.level.trim().toLocaleUpperCase("en-US") === normalizedLevel
      && coverageClaimHasReachableReviewedPath(bundle, manifestHash, claim),
  );
};

const isNonEmptyReviewedGradedText = (bundle, manifestHash, item) => {
  if (
    item?.itemType !== "graded-text"
    || !itemIsReleaseReady(bundle, manifestHash, item)
  ) {
    return false;
  }
  return gradedTextPayloadIsNonEmpty(item);
};

const audioAssetIsReleaseReady = (bundle, manifestHash, asset) => {
  const target = itemMapFor(bundle).get(asset.targetItemKey);
  if (
    !target
    || asset.targetPayloadSha256 !== target.payloadSha256
    || bundle.audioAssetFileHashes?.[asset.fileRef] !== asset.fileSha256
    || !asset.speaker?.nativeSpeakerEvidenceRef
    || !asset.rights?.ownerId
    || !asset.rights?.licenseId
    || !asset.rights?.evidenceRef
  ) {
    return false;
  }
  for (const role of ["native-linguistic", "audio-rights"]) {
    const review = latestScopedReview(
      Array.isArray(bundle.reviews?.reviews) ? bundle.reviews.reviews : [],
      manifestHash,
      role,
      "audioAssetIds",
      asset.assetId,
    );
    if (!review || review.decision !== "approved") return false;
    if (role === "native-linguistic" && review.reviewerId === target.owner?.id) {
      return false;
    }
  }
  return true;
};

export const assessClosedAlphaEligibility = (bundle, validation) => {
  const base = assessBaseReleaseEligibility(bundle, validation, "closed-alpha");
  const blockers = [];
  const declaredClaims = Array.isArray(bundle.coverageClaims?.coverageClaims)
    ? bundle.coverageClaims.coverageClaims
    : [];
  if (
    declaredClaims.some(
      (claim) =>
        !coverageClaimHasReachableReviewedPath(
          bundle,
          validation.hashes.manifest,
          claim,
        ),
    )
  ) {
    blockers.push(
      "Every declared coverage claim must bind a complete reachable reviewed item graph",
    );
  }
  const reviewedLexemeHashes = new Set(
    releasedCatalogItems(bundle)
      .filter(
        (item) =>
          item.itemType === "lexeme"
          && itemIsReleaseReady(bundle, validation.hashes.manifest, item),
      )
      .map((item) => item.payloadSha256),
  );
  if (reviewedLexemeHashes.size < 300) {
    blockers.push(
      `Closed alpha requires at least 300 released, catalog-backed, native-reviewed lexemes (found ${reviewedLexemeHashes.size})`,
    );
  }
  if (
    !claimHasReachableReviewedPath(
      bundle,
      validation.hashes.manifest,
      "CEFR",
      "A0",
    )
  ) {
    blockers.push("Closed alpha requires an evidence-backed complete A0 coverage claim");
  }
  return withAdditionalBlockers(base, blockers);
};

export const assessPublicationEligibility = (bundle, validation) => {
  const closedAlpha = assessClosedAlphaEligibility(bundle, validation);
  const base = {
    ...closedAlpha,
    channel: "production",
  };
  const blockers = [];
  if (bundle.manifest.audience !== "public") {
    blockers.push("Package audience is closed-alpha, not public");
  }
  for (const level of ["1", "2"]) {
    if (
      !claimHasReachableReviewedPath(
        bundle,
        validation.hashes.manifest,
        "HSK",
        level,
      )
    ) {
      blockers.push(`Public beta requires an evidence-backed HSK ${level} coverage claim`);
    }
  }
  const releasedStoryCount = new Set(
    (bundle.itemCatalog?.items ?? [])
      .filter((item) =>
        isNonEmptyReviewedGradedText(bundle, validation.hashes.manifest, item))
      .map((item) => item.payloadSha256),
  ).size;
  if (releasedStoryCount < 40) {
    blockers.push(
      `Public beta requires at least 40 non-empty, reviewed graded texts (found ${releasedStoryCount})`,
    );
  }
  const coreItems = releasedCatalogItems(bundle);
  const readyAudioTargets = new Set(
    (bundle.itemCatalog?.audioAssets ?? [])
      .filter((asset) =>
        audioAssetIsReleaseReady(bundle, validation.hashes.manifest, asset))
      .map((asset) => asset.targetItemKey),
  );
  const missingAudioTargets = coreItems.filter(
    (item) => !readyAudioTargets.has(item.itemKey),
  );
  if (missingAudioTargets.length > 0 || coreItems.length === 0) {
    blockers.push(
      `Public beta requires licensed native audio for released core content (missing ${missingAudioTargets.length} targets)`,
    );
  }
  return withAdditionalBlockers(base, blockers);
};
