const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const LOWERCASE_AUDIO_ASSET_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const WINDOWS_RESERVED_FILE_STEM_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const RELEASE_STATES = new Set(["draft", "review", "beta", "published", "retired"]);
const REVIEW_ROLES = new Set([
  "content-owner",
  "native-linguistic",
  "source-license",
  "audio-rights",
]);
const REVIEW_DECISIONS = new Set(["approved", "changes-requested"]);
const SUPPORTED_CONTENT_SCHEMA_VERSIONS = new Set([1, 2, 3, 4, 5, 6]);
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
const CHARACTER_DECOMPOSITION_KINDS = new Set(["independent", "compound"]);
const CHARACTER_COMPONENT_ROLES = new Set([
  "semantic",
  "phonetic",
  "semantic-phonetic",
  "graphic",
]);
const CHARACTER_COMPONENT_POSITIONS = new Set([
  "whole",
  "left",
  "right",
  "top",
  "bottom",
  "center",
  "enclosing",
  "enclosed",
  "overlaid",
]);
const CHARACTER_STRUCTURE_KINDS = new Set([
  "independent",
  "left-right",
  "top-bottom",
  "left-middle-right",
  "top-middle-bottom",
  "full-surround",
  "surround-from-above",
  "surround-from-below",
  "surround-from-left",
  "surround-from-upper-left",
  "surround-from-upper-right",
  "surround-from-lower-left",
  "overlaid",
]);
const CHARACTER_SOURCE_KINDS = new Set([
  "linguistic-reference",
  "stroke-dataset",
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

const pushDirectedCycleErrors = (
  graph,
  rootKeys,
  errorMessage,
  errors,
) => {
  const visiting = new Set();
  const visited = new Set();
  for (const rootKey of rootKeys) {
    if (visited.has(rootKey)) continue;
    visiting.add(rootKey);
    const stack = [{ key: rootKey, nextDependencyIndex: 0 }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const dependencies = graph.get(frame.key) ?? [];
      let descended = false;
      while (frame.nextDependencyIndex < dependencies.length) {
        const dependencyKey = dependencies[frame.nextDependencyIndex];
        frame.nextDependencyIndex += 1;
        if (!graph.has(dependencyKey)) continue;
        if (visiting.has(dependencyKey)) {
          errors.push(errorMessage(dependencyKey));
          continue;
        }
        if (visited.has(dependencyKey)) continue;
        visiting.add(dependencyKey);
        stack.push({ key: dependencyKey, nextDependencyIndex: 0 });
        descended = true;
        break;
      }
      if (descended) continue;
      visiting.delete(frame.key);
      visited.add(frame.key);
      stack.pop();
    }
  }
};

const impliedLessonDependencies = (itemMap, rootItem) => {
  const lessonIds = new Set();
  const missingItemKeys = new Set();
  const visited = new Set();
  const queue = directDependencyKeys(rootItem);
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const itemKey = queue[queueIndex];
    queueIndex += 1;
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
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const prerequisiteId = queue[queueIndex];
    queueIndex += 1;
    if (closure.has(prerequisiteId)) continue;
    closure.add(prerequisiteId);
    const prerequisite = runtimeLessonMap.get(prerequisiteId);
    if (Array.isArray(prerequisite?.prerequisiteIds)) {
      queue.push(...prerequisite.prerequisiteIds);
    }
  }
  return closure;
};

const LESSON_REACHABILITY_POLICY = Object.freeze({
  maxIndexBytes: 32 * 1024 * 1024,
  maxEdges: 200_000,
  maxExactFallbackNodes: 1_024,
  maxExactFallbackEdges: 10_000,
});

const dependencyFirstOrder = (keys, dependenciesByKey) => {
  const keySet = new Set(keys);
  const remainingDependencyCount = new Map();
  const dependentsByKey = new Map();
  keys.forEach((key) => {
    let knownDependencyCount = 0;
    (dependenciesByKey.get(key) ?? []).forEach((dependencyKey) => {
      if (!keySet.has(dependencyKey)) return;
      knownDependencyCount += 1;
      const dependents = dependentsByKey.get(dependencyKey) ?? [];
      dependents.push(key);
      dependentsByKey.set(dependencyKey, dependents);
    });
    remainingDependencyCount.set(key, knownDependencyCount);
  });
  const queue = keys.filter(
    (key) => remainingDependencyCount.get(key) === 0,
  );
  const ordered = [];
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const key = queue[queueIndex];
    queueIndex += 1;
    ordered.push(key);
    (dependentsByKey.get(key) ?? []).forEach((dependentKey) => {
      const remaining = remainingDependencyCount.get(dependentKey) - 1;
      remainingDependencyCount.set(dependentKey, remaining);
      if (remaining === 0) queue.push(dependentKey);
    });
  }
  return ordered.length === keys.length ? ordered : null;
};

const buildLessonReachabilityIndex = (itemMap, runtimeLessonMap) => {
  const itemKeys = [...itemMap.keys()];
  const runtimeLessonIds = [...runtimeLessonMap.keys()];
  const itemDependenciesByKey = new Map();
  const runtimeDependenciesById = new Map();
  let edgeCount = 0;
  itemMap.forEach((item, itemKey) => {
    const dependencies = directDependencyKeys(item);
    itemDependenciesByKey.set(itemKey, dependencies);
    edgeCount += dependencies.length;
  });
  runtimeLessonMap.forEach((lesson, lessonId) => {
    const dependencies = Array.isArray(lesson?.prerequisiteIds)
      ? lesson.prerequisiteIds
      : [];
    runtimeDependenciesById.set(lessonId, dependencies);
    edgeCount += dependencies.length;
  });
  const withinExactFallbackBound =
    itemKeys.length + runtimeLessonIds.length
      <= LESSON_REACHABILITY_POLICY.maxExactFallbackNodes
    && edgeCount <= LESSON_REACHABILITY_POLICY.maxExactFallbackEdges;
  if (edgeCount > LESSON_REACHABILITY_POLICY.maxEdges) {
    return {
      ok: false,
      exactFallbackAllowed: withinExactFallbackBound,
      error:
        `lesson dependency reachability exceeds ${LESSON_REACHABILITY_POLICY.maxEdges} edges`,
    };
  }
  const itemOrder = dependencyFirstOrder(itemKeys, itemDependenciesByKey);
  const runtimeOrder = dependencyFirstOrder(
    runtimeLessonIds,
    runtimeDependenciesById,
  );
  if (itemOrder === null || runtimeOrder === null) {
    return {
      ok: false,
      exactFallbackAllowed: withinExactFallbackBound,
      error: "lesson dependency reachability requires acyclic graphs",
    };
  }
  const runtimeBitByLessonId = new Map(
    runtimeLessonIds.map((lessonId, index) => [lessonId, index]),
  );
  const nonLessonItemKeys = itemKeys.filter(
    (itemKey) => itemMap.get(itemKey)?.itemType !== "lesson",
  );
  const wordCount = Math.ceil(runtimeLessonIds.length / 32);
  const rowCount = runtimeLessonIds.length + nonLessonItemKeys.length;
  const indexBytes = rowCount * wordCount * Uint32Array.BYTES_PER_ELEMENT;
  if (
    !Number.isSafeInteger(indexBytes)
    || indexBytes > LESSON_REACHABILITY_POLICY.maxIndexBytes
  ) {
    return {
      ok: false,
      exactFallbackAllowed: withinExactFallbackBound,
      error:
        `lesson dependency reachability index exceeds ${LESSON_REACHABILITY_POLICY.maxIndexBytes} bytes`,
    };
  }
  const rows = new Uint32Array(rowCount * wordCount);
  const runtimeRowByLessonId = new Map(
    runtimeLessonIds.map((lessonId, index) => [lessonId, index]),
  );
  const nonLessonRowByItemKey = new Map(
    nonLessonItemKeys.map(
      (itemKey, index) => [itemKey, runtimeLessonIds.length + index],
    ),
  );
  const setLessonBit = (rowIndex, lessonBit) => {
    if (wordCount === 0) return;
    const offset = rowIndex * wordCount + (lessonBit >>> 5);
    rows[offset] |= 1 << (lessonBit & 31);
  };
  const rowHasLessonBit = (rowIndex, lessonBit) => {
    if (wordCount === 0) return false;
    const offset = rowIndex * wordCount + (lessonBit >>> 5);
    return (rows[offset] & (1 << (lessonBit & 31))) !== 0;
  };
  const mergeRow = (targetRowIndex, sourceRowIndex) => {
    const targetOffset = targetRowIndex * wordCount;
    const sourceOffset = sourceRowIndex * wordCount;
    for (let wordIndex = 0; wordIndex < wordCount; wordIndex += 1) {
      rows[targetOffset + wordIndex] |= rows[sourceOffset + wordIndex];
    }
  };
  const rowIsSubset = (subsetRowIndex, supersetRowIndex) => {
    const subsetOffset = subsetRowIndex * wordCount;
    const supersetOffset = supersetRowIndex * wordCount;
    for (let wordIndex = 0; wordIndex < wordCount; wordIndex += 1) {
      if (
        (
          rows[subsetOffset + wordIndex]
          & ~rows[supersetOffset + wordIndex]
        ) !== 0
      ) {
        return false;
      }
    }
    return true;
  };

  runtimeOrder.forEach((lessonId) => {
    const targetRow = runtimeRowByLessonId.get(lessonId);
    (runtimeDependenciesById.get(lessonId) ?? []).forEach(
      (dependencyId) => {
        const dependencyBit = runtimeBitByLessonId.get(dependencyId);
        const dependencyRow = runtimeRowByLessonId.get(dependencyId);
        if (dependencyBit === undefined || dependencyRow === undefined) return;
        setLessonBit(targetRow, dependencyBit);
        mergeRow(targetRow, dependencyRow);
      },
    );
  });

  const hasMissingDependencyByItemKey = new Map();
  const hasUnindexedLessonByNonLessonKey = new Map();
  itemOrder.forEach((itemKey) => {
    const item = itemMap.get(itemKey);
    const dependencies = itemDependenciesByKey.get(itemKey) ?? [];
    hasMissingDependencyByItemKey.set(
      itemKey,
      dependencies.some(
        (dependencyKey) =>
          !itemMap.has(dependencyKey)
          || hasMissingDependencyByItemKey.get(dependencyKey) === true,
      ),
    );
    if (item?.itemType === "lesson") return;
    const targetRow = nonLessonRowByItemKey.get(itemKey);
    let hasUnindexedLesson = false;
    dependencies.forEach((dependencyKey) => {
      const dependency = itemMap.get(dependencyKey);
      if (!dependency) return;
      if (dependency.itemType === "lesson") {
        const lessonBit = runtimeBitByLessonId.get(dependency.itemId);
        if (lessonBit === undefined) {
          hasUnindexedLesson = true;
        } else {
          setLessonBit(targetRow, lessonBit);
        }
        return;
      }
      const dependencyRow = nonLessonRowByItemKey.get(dependencyKey);
      if (dependencyRow !== undefined) mergeRow(targetRow, dependencyRow);
      if (hasUnindexedLessonByNonLessonKey.get(dependencyKey) === true) {
        hasUnindexedLesson = true;
      }
    });
    hasUnindexedLessonByNonLessonKey.set(itemKey, hasUnindexedLesson);
  });

  return {
    ok: true,
    requiresExactTraversal(item, includeMissingDependencies) {
      if (
        includeMissingDependencies
        && hasMissingDependencyByItemKey.get(item.itemKey) === true
      ) {
        return true;
      }
      const runtimeRow = runtimeRowByLessonId.get(item.itemId);
      if (runtimeRow === undefined) return true;
      return (itemDependenciesByKey.get(item.itemKey) ?? []).some(
        (dependencyKey) => {
          const dependency = itemMap.get(dependencyKey);
          if (!dependency) return false;
          if (dependency.itemType === "lesson") {
            const lessonBit = runtimeBitByLessonId.get(dependency.itemId);
            return lessonBit === undefined
              || !rowHasLessonBit(runtimeRow, lessonBit);
          }
          if (
            hasUnindexedLessonByNonLessonKey.get(dependencyKey) === true
          ) {
            return true;
          }
          const dependencyRow = nonLessonRowByItemKey.get(dependencyKey);
          return dependencyRow !== undefined
            && !rowIsSubset(dependencyRow, runtimeRow);
        },
      );
    },
  };
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
  const lessonReachability = lessonItems.length > 0
    ? buildLessonReachabilityIndex(itemMap, runtimeLessonMap)
    : null;
  if (
    lessonReachability !== null
    && !lessonReachability.ok
    && !lessonReachability.exactFallbackAllowed
  ) {
    throw new Error(`Runtime projection ${lessonReachability.error}`);
  }
  for (const lesson of lessonItems) {
    if (
      lessonReachability?.ok
      && !lessonReachability.requiresExactTraversal(lesson, true)
    ) {
      continue;
    }
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
    errors.push("manifest.contentSchemaVersion must be a supported version (1, 2, 3, 4, 5, or 6)");
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
  if (manifest.governance.includesAudio) {
    if (!isRecord(manifest.governance.audioRights)) {
      errors.push("audioRights must be an object when the package includes audio artifacts");
    } else {
      validateAllowedKeys(
        manifest.governance.audioRights,
        ["ownerId", "licenseId", "evidenceRef"],
        "manifest.governance.audioRights",
        errors,
      );
      validateEvidenceObject(
        manifest.governance.audioRights,
        ["ownerId", "licenseId", "evidenceRef"],
        "manifest.governance.audioRights",
        errors,
      );
    }
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
  pushDirectedCycleErrors(
    graph,
    lessonIds,
    (lessonId) => `Prerequisite cycle detected at ${lessonId}`,
    errors,
  );

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

const isLowercaseSafeId = (value) =>
  typeof value === "string"
  && LOWERCASE_AUDIO_ASSET_ID_PATTERN.test(value)
  && !value.endsWith(".")
  && !WINDOWS_RESERVED_FILE_STEM_PATTERN.test(value);

const validateSingleUnicodeGlyph = (value, label, errors) => {
  if (!isNonEmptyString(value)) {
    errors.push(`${label} is required`);
    return false;
  }
  if ([...value].length !== 1) {
    errors.push(`${label} must contain one Unicode character`);
    return false;
  }
  return true;
};

const validateCharacterPayloadCommon = (item, payload, prefix, errors) => {
  ["pinyin", "meaning"].forEach((field) => {
    if (!isNonEmptyString(payload[field])) errors.push(`${prefix}.${field} is required`);
  });
  if (validateSingleUnicodeGlyph(payload.character, `${prefix}.character`, errors)) {
    const codePoint = payload.character.codePointAt(0);
    const expectedId = `u${codePoint.toString(16).padStart(4, "0")}`;
    if (item.itemId !== expectedId) {
      errors.push(`${prefix.replace(/\.payload$/u, "")}.itemId must be ${expectedId} for payload.character`);
    }
  }
  validateSingleUnicodeGlyph(payload.traditional, `${prefix}.traditional`, errors);
  const sourceLexemeIds = validateStringArray(
    payload.sourceLexemeIds,
    `${prefix} source lexeme id`,
    errors,
  );
  if (sourceLexemeIds.length === 0) {
    errors.push(`${prefix}.sourceLexemeIds must not be empty`);
  }
};

const validateCharacterSourceIds = (
  value,
  label,
  sourceMap,
  usedSourceIds,
  errors,
) => {
  const sourceIds = validateStringArray(value, `${label} source id`, errors);
  if (sourceIds.length === 0) errors.push(`${label}.sourceIds must not be empty`);
  let hasLinguisticReference = false;
  sourceIds.forEach((sourceId, sourceIndex) => {
    const source = sourceMap.get(sourceId);
    if (!source) {
      errors.push(`${label}.sourceIds[${sourceIndex}] references unknown source ${sourceId}`);
      return;
    }
    usedSourceIds.add(sourceId);
    if (source.kind === "linguistic-reference") hasLinguisticReference = true;
  });
  if (sourceIds.length > 0 && !hasLinguisticReference) {
    errors.push(`${label}.sourceIds must include a linguistic-reference source`);
  }
};

const validateCharacterStrokeInspection = (
  inspection,
  strokeData,
  strokeCount,
  prefix,
  errors,
) => {
  if (!isRecord(inspection)) {
    errors.push(`${prefix}.fileRef requires a successful character stroke inspection`);
    return;
  }
  if (inspection.ok === false) {
    validateAllowedKeys(inspection, ["ok", "error"], `${prefix}.fileInspection`, errors);
    if (!isNonEmptyString(inspection.error)) {
      errors.push(`${prefix}.fileInspection.error is required`);
    }
    errors.push(`${prefix}.fileRef character stroke inspection failed`);
    return;
  }
  if (inspection.ok !== true) {
    errors.push(`${prefix}.fileInspection.ok must be boolean`);
    return;
  }
  validateAllowedKeys(
    inspection,
    ["ok", "format", "strokeCount", "radicalStrokeIndices", "byteLength"],
    `${prefix}.fileInspection`,
    errors,
  );
  if (inspection.format !== "hanzi-writer-v1") {
    errors.push(`${prefix}.fileInspection.format must be hanzi-writer-v1`);
  }
  if (!Number.isSafeInteger(inspection.strokeCount) || inspection.strokeCount <= 0) {
    errors.push(`${prefix}.fileInspection.strokeCount must be a positive integer`);
  }
  if (!Number.isSafeInteger(inspection.byteLength) || inspection.byteLength <= 0) {
    errors.push(`${prefix}.fileInspection.byteLength must be a positive integer`);
  }
  const radicalStrokeIndices = Array.isArray(inspection.radicalStrokeIndices)
    ? inspection.radicalStrokeIndices
    : [];
  if (!Array.isArray(inspection.radicalStrokeIndices)) {
    errors.push(`${prefix}.fileInspection.radicalStrokeIndices must be an array`);
  } else {
    radicalStrokeIndices.forEach((strokeIndex, index) => {
      if (
        !Number.isSafeInteger(strokeIndex)
        || strokeIndex < 0
        || !Number.isSafeInteger(inspection.strokeCount)
        || strokeIndex >= inspection.strokeCount
      ) {
        errors.push(
          `${prefix}.fileInspection.radicalStrokeIndices[${index}] must reference an inspected stroke`,
        );
      }
    });
    pushDuplicateErrors(
      radicalStrokeIndices,
      `${prefix}.fileInspection radical stroke index`,
      errors,
    );
  }
  if (inspection.format !== strokeData?.format) {
    errors.push(`${prefix}.format does not match inspected package bytes`);
  }
  if (inspection.strokeCount !== strokeCount) {
    errors.push(`${prefix.replace(/\.strokeData$/u, "")}.strokeCount does not match inspected package bytes`);
  }
};

const validateCharacterLinguisticInspection = (
  inspection,
  character,
  prefix,
  errors,
) => {
  if (!isRecord(inspection)) {
    errors.push(
      `${prefix}.recordRef requires a successful linguistic JSON inspection`,
    );
    return;
  }
  if (inspection.ok === false) {
    validateAllowedKeys(
      inspection,
      ["ok", "error"],
      `${prefix}.fileInspection`,
      errors,
    );
    if (!isNonEmptyString(inspection.error)) {
      errors.push(`${prefix}.fileInspection.error is required`);
    }
    errors.push(`${prefix}.recordRef linguistic JSON inspection failed`);
    return;
  }
  if (inspection.ok !== true) {
    errors.push(`${prefix}.fileInspection.ok must be boolean`);
    return;
  }
  validateAllowedKeys(
    inspection,
    ["ok", "format", "character", "byteLength"],
    `${prefix}.fileInspection`,
    errors,
  );
  if (inspection.format !== "json-object-v1") {
    errors.push(`${prefix}.fileInspection.format must be json-object-v1`);
  }
  if (inspection.character !== character) {
    errors.push(
      `${prefix}.fileInspection.character must match the target character`,
    );
  }
  if (!Number.isSafeInteger(inspection.byteLength) || inspection.byteLength <= 0) {
    errors.push(`${prefix}.fileInspection.byteLength must be a positive integer`);
  }
};

const validateCharacterCatalogPayloadV2 = (
  item,
  index,
  characterSourceFileHashes,
  characterLinguisticFileInspections,
  characterStrokeFileInspections,
  errors,
) => {
  const itemPrefix = `item-catalog.items[${index}]`;
  const prefix = `${itemPrefix}.payload`;
  const payload = item.payload;
  if (!isRecord(payload)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  validateAllowedKeys(
    payload,
    [
      "character",
      "traditional",
      "pinyin",
      "meaning",
      "sourceLexemeIds",
      "analysis",
      "strokeCount",
      "strokeData",
    ],
    prefix,
    errors,
  );
  validateCharacterPayloadCommon(item, payload, prefix, errors);
  if (!Number.isSafeInteger(payload.strokeCount) || payload.strokeCount <= 0) {
    errors.push(`${prefix}.strokeCount must be a positive integer`);
  }

  const analysis = payload.analysis;
  const sourceMap = new Map();
  const usedSourceIds = new Set();
  if (!isRecord(analysis)) {
    errors.push(`${prefix}.analysis must be an object`);
  } else {
    validateAllowedKeys(
      analysis,
      ["schemaVersion", "decompositionKind", "radical", "components", "structure", "sources"],
      `${prefix}.analysis`,
      errors,
    );
    if (analysis.schemaVersion !== 1) {
      errors.push(`${prefix}.analysis.schemaVersion must be 1`);
    }
    if (!CHARACTER_DECOMPOSITION_KINDS.has(analysis.decompositionKind)) {
      errors.push(`${prefix}.analysis.decompositionKind is invalid`);
    }
    if (!Array.isArray(analysis.sources)) {
      errors.push(`${prefix}.analysis.sources must be an array`);
    } else {
      const sourceIds = [];
      const recordRefs = [];
      analysis.sources.forEach((source, sourceIndex) => {
        const sourcePrefix = `${prefix}.analysis.sources[${sourceIndex}]`;
        if (!isRecord(source)) {
          errors.push(`${sourcePrefix} must be an object`);
          return;
        }
        validateAllowedKeys(
          source,
          [
            "sourceId",
            "kind",
            "recordKey",
            "citationRef",
            "licenseId",
            "licenseEvidenceRef",
            "recordRef",
            "recordSha256",
          ],
          sourcePrefix,
          errors,
        );
        if (!isLowercaseSafeId(source.sourceId)) {
          errors.push(`${sourcePrefix}.sourceId must be a lowercase non-reserved safe id`);
        } else {
          sourceIds.push(source.sourceId);
          sourceMap.set(source.sourceId, source);
        }
        if (!CHARACTER_SOURCE_KINDS.has(source.kind)) {
          errors.push(`${sourcePrefix}.kind is invalid`);
        }
        validateSingleUnicodeGlyph(
          source.recordKey,
          `${sourcePrefix}.recordKey`,
          errors,
        );
        if (source.recordKey !== payload.character) {
          errors.push(
            `${sourcePrefix}.recordKey must match the target character`,
          );
        }
        ["citationRef", "licenseId", "licenseEvidenceRef"].forEach((field) => {
          if (!isNonEmptyString(source[field])) errors.push(`${sourcePrefix}.${field} is required`);
        });
        const expectedRecordRef = source.kind === "stroke-dataset"
          ? `stroke-data/${item.itemId}.json`
          : `character-sources/${item.itemId}/${String(source.sourceId)}.json`;
        if (source.recordRef !== expectedRecordRef) {
          errors.push(`${sourcePrefix}.recordRef must equal ${expectedRecordRef}`);
        } else {
          recordRefs.push(source.recordRef);
        }
        if (!DIGEST_PATTERN.test(source.recordSha256 ?? "")) {
          errors.push(`${sourcePrefix}.recordSha256 must be a SHA-256 digest`);
        }
        if (isNonEmptyString(source.recordRef)) {
          const fileHash = characterSourceFileHashes?.[source.recordRef] ?? null;
          if (fileHash === null) {
            errors.push(`${sourcePrefix}.recordRef is unavailable`);
          } else if (fileHash !== source.recordSha256) {
            errors.push(`${sourcePrefix}.recordSha256 does not match package bytes`);
          }
          if (source.kind === "linguistic-reference") {
            validateCharacterLinguisticInspection(
              characterLinguisticFileInspections?.[source.recordRef] ?? null,
              payload.character,
              sourcePrefix,
              errors,
            );
          }
        }
      });
      pushDuplicateErrors(sourceIds, `${prefix}.analysis source id`, errors);
      pushDuplicateErrors(recordRefs, `${prefix}.analysis source recordRef`, errors);
      if (analysis.sources.length === 0) {
        errors.push(`${prefix}.analysis.sources must not be empty`);
      }
      if (
        analysis.sources.filter((source) => source?.kind === "stroke-dataset").length !== 1
      ) {
        errors.push(`${prefix}.analysis.sources must contain exactly one stroke-dataset source`);
      }
    }

    if (!isRecord(analysis.radical)) {
      errors.push(`${prefix}.analysis.radical must be an object`);
    } else {
      validateAllowedKeys(
        analysis.radical,
        ["glyph", "sourceIds"],
        `${prefix}.analysis.radical`,
        errors,
      );
      validateSingleUnicodeGlyph(
        analysis.radical.glyph,
        `${prefix}.analysis.radical.glyph`,
        errors,
      );
      validateCharacterSourceIds(
        analysis.radical.sourceIds,
        `${prefix}.analysis.radical`,
        sourceMap,
        usedSourceIds,
        errors,
      );
    }

    if (!Array.isArray(analysis.components)) {
      errors.push(`${prefix}.analysis.components must be an array`);
    } else {
      const componentIds = [];
      analysis.components.forEach((component, componentIndex) => {
        const componentPrefix = `${prefix}.analysis.components[${componentIndex}]`;
        if (!isRecord(component)) {
          errors.push(`${componentPrefix} must be an object`);
          return;
        }
        validateAllowedKeys(
          component,
          ["componentId", "glyph", "role", "position", "sourceIds"],
          componentPrefix,
          errors,
        );
        if (!isLowercaseSafeId(component.componentId)) {
          errors.push(`${componentPrefix}.componentId must be a lowercase non-reserved safe id`);
        } else {
          componentIds.push(component.componentId);
        }
        validateSingleUnicodeGlyph(component.glyph, `${componentPrefix}.glyph`, errors);
        if (!CHARACTER_COMPONENT_ROLES.has(component.role)) {
          errors.push(`${componentPrefix}.role is invalid`);
        }
        if (!CHARACTER_COMPONENT_POSITIONS.has(component.position)) {
          errors.push(`${componentPrefix}.position is invalid`);
        }
        validateCharacterSourceIds(
          component.sourceIds,
          componentPrefix,
          sourceMap,
          usedSourceIds,
          errors,
        );
      });
      pushDuplicateErrors(componentIds, `${prefix}.analysis component id`, errors);
      if (
        analysis.decompositionKind === "independent"
        && analysis.components.length !== 0
      ) {
        errors.push(`${prefix}.analysis independent characters must have zero components`);
      }
      if (
        analysis.decompositionKind === "compound"
        && analysis.components.length === 0
      ) {
        errors.push(`${prefix}.analysis compound characters require at least one component`);
      }
    }

    if (!isRecord(analysis.structure)) {
      errors.push(`${prefix}.analysis.structure must be an object`);
    } else {
      validateAllowedKeys(
        analysis.structure,
        ["kind", "sourceIds"],
        `${prefix}.analysis.structure`,
        errors,
      );
      if (!CHARACTER_STRUCTURE_KINDS.has(analysis.structure.kind)) {
        errors.push(`${prefix}.analysis.structure.kind is invalid`);
      }
      validateCharacterSourceIds(
        analysis.structure.sourceIds,
        `${prefix}.analysis.structure`,
        sourceMap,
        usedSourceIds,
        errors,
      );
      if (
        analysis.decompositionKind === "independent"
        && analysis.structure.kind !== "independent"
      ) {
        errors.push(`${prefix}.analysis independent characters require independent structure`);
      }
      if (
        analysis.decompositionKind === "compound"
        && analysis.structure.kind === "independent"
      ) {
        errors.push(`${prefix}.analysis compound characters require non-independent structure`);
      }
    }
  }

  const strokeData = payload.strokeData;
  const strokePrefix = `${prefix}.strokeData`;
  if (!isRecord(strokeData)) {
    errors.push(`${strokePrefix} must be an object`);
  } else {
    validateAllowedKeys(
      strokeData,
      ["format", "fileRef", "fileSha256", "sourceId"],
      strokePrefix,
      errors,
    );
    if (strokeData.format !== "hanzi-writer-v1") {
      errors.push(`${strokePrefix}.format must be hanzi-writer-v1`);
    }
    const expectedFileRef = `stroke-data/${item.itemId}.json`;
    if (strokeData.fileRef !== expectedFileRef) {
      errors.push(`${strokePrefix}.fileRef must equal ${expectedFileRef}`);
    }
    if (!DIGEST_PATTERN.test(strokeData.fileSha256 ?? "")) {
      errors.push(`${strokePrefix}.fileSha256 must be a SHA-256 digest`);
    }
    if (!isLowercaseSafeId(strokeData.sourceId)) {
      errors.push(`${strokePrefix}.sourceId must be a lowercase non-reserved safe id`);
    }
    const strokeSource = sourceMap.get(strokeData.sourceId);
    if (!strokeSource) {
      errors.push(`${strokePrefix}.sourceId references unknown source ${String(strokeData.sourceId)}`);
    } else {
      usedSourceIds.add(strokeData.sourceId);
      if (strokeSource.kind !== "stroke-dataset") {
        errors.push(`${strokePrefix}.sourceId must reference a stroke-dataset source`);
      }
      if (strokeData.fileRef !== strokeSource.recordRef) {
        errors.push(`${strokePrefix}.fileRef must match its source recordRef`);
      }
      if (strokeData.fileSha256 !== strokeSource.recordSha256) {
        errors.push(`${strokePrefix}.fileSha256 must match its source recordSha256`);
      }
    }
    if (isNonEmptyString(strokeData.fileRef)) {
      const fileHash = characterSourceFileHashes?.[strokeData.fileRef] ?? null;
      if (fileHash === null) {
        errors.push(`${strokePrefix}.fileRef is unavailable`);
      } else if (fileHash !== strokeData.fileSha256) {
        errors.push(`${strokePrefix}.fileSha256 does not match package bytes`);
      }
      validateCharacterStrokeInspection(
        characterStrokeFileInspections?.[strokeData.fileRef] ?? null,
        strokeData,
        payload.strokeCount,
        strokePrefix,
        errors,
      );
    }
  }

  if (isRecord(analysis) && Array.isArray(analysis.sources)) {
    analysis.sources.forEach((source, sourceIndex) => {
      if (
        isRecord(source)
        && isNonEmptyString(source.sourceId)
        && !usedSourceIds.has(source.sourceId)
      ) {
        errors.push(
          `${prefix}.analysis.sources[${sourceIndex}].sourceId is not used by a character claim or strokeData`,
        );
      }
    });
  }
};

const validateCatalogPayload = (
  item,
  index,
  catalogSchemaVersion,
  characterSourceFileHashes,
  characterLinguisticFileInspections,
  characterStrokeFileInspections,
  errors,
) => {
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
    if (catalogSchemaVersion >= 4) {
      validateCharacterCatalogPayloadV2(
        item,
        index,
        characterSourceFileHashes,
        characterLinguisticFileInspections,
        characterStrokeFileInspections,
        errors,
      );
      return;
    }
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
    validateCharacterPayloadCommon(item, payload, `${prefix}.payload`, errors);
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

const AUDIO_MEDIA_FIELDS = [
  "container",
  "codec",
  "sampleRateHz",
  "channels",
  "bitDepth",
  "frameCount",
  "durationMs",
  "byteLength",
];

// Keep transcript, alignment, and target comparison identical to the canonical
// text hash normalization: newline spelling changes, no trimming or Unicode folding.
const normalizeAudioText = (value) => value.replace(/\r\n?/g, "\n");

const audioMediaEquals = (left, right) =>
  isRecord(left)
  && isRecord(right)
  && AUDIO_MEDIA_FIELDS.every((field) => left[field] === right[field]);

const validateAudioMedia = (media, prefix, errors) => {
  if (!isRecord(media)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  validateAllowedKeys(media, AUDIO_MEDIA_FIELDS, prefix, errors);
  if (media.container !== "wav") errors.push(`${prefix}.container must be wav`);
  if (media.codec !== "pcm-s16le") errors.push(`${prefix}.codec must be pcm-s16le`);
  if (media.channels !== 1) errors.push(`${prefix}.channels must be 1`);
  if (media.bitDepth !== 16) errors.push(`${prefix}.bitDepth must be 16`);
  for (const field of ["sampleRateHz", "frameCount", "durationMs", "byteLength"]) {
    if (!Number.isSafeInteger(media[field]) || media[field] <= 0) {
      errors.push(`${prefix}.${field} must be a positive integer`);
    }
  }
  if (
    Number.isSafeInteger(media.sampleRateHz)
    && media.sampleRateHz > 0
    && Number.isSafeInteger(media.frameCount)
    && media.frameCount > 0
    && Number.isSafeInteger(media.durationMs)
    && media.durationMs !== Math.round((media.frameCount * 1_000) / media.sampleRateHz)
  ) {
    errors.push(`${prefix}.durationMs must match frameCount and sampleRateHz`);
  }
  if (
    Number.isSafeInteger(media.frameCount)
    && media.frameCount > 0
    && Number.isSafeInteger(media.byteLength)
    && media.byteLength < media.frameCount * 2 + 44
  ) {
    errors.push(`${prefix}.byteLength is too small for mono PCM WAV frames`);
  }
};

const deterministicMandarinTargetTexts = (item) => {
  if (!isRecord(item?.payload)) return [];
  if (item.itemType === "lexeme") {
    return [item.payload.simplified, item.payload.example].filter(isNonEmptyString);
  }
  if (item.itemType === "lesson") {
    return [item.payload.chineseTitle].filter(isNonEmptyString);
  }
  if (item.itemType === "graded-text") {
    const sentenceTexts = (Array.isArray(item.payload.sentences)
      ? item.payload.sentences
      : [])
      .map((sentence) => sentence?.chinese)
      .filter(isNonEmptyString);
    return [
      ...sentenceTexts,
      ...(sentenceTexts.length > 0 ? [sentenceTexts.join("\n")] : []),
    ];
  }
  if (["grammar", "pronunciation", "communicative-function"].includes(item.itemType)) {
    return (Array.isArray(item.payload.examples) ? item.payload.examples : [])
      .map((example) => example?.chinese)
      .filter(isNonEmptyString);
  }
  if (item.itemType === "character") {
    return [item.payload.character].filter(isNonEmptyString);
  }
  return [];
};

const audioRightsEqual = (left, right) =>
  isRecord(left)
  && isRecord(right)
  && left.ownerId === right.ownerId
  && left.licenseId === right.licenseId
  && left.evidenceRef === right.evidenceRef;

const validateItemCatalog = async (
  itemCatalog,
  runtimeIds,
  audioAssetFileHashes,
  audioAssetFileInspections,
  characterSourceFileHashes,
  characterLinguisticFileInspections,
  characterStrokeFileInspections,
  manifestAudioRights,
  contentSchemaVersion,
  errors,
) => {
  const expectedSchemaVersion = contentSchemaVersion >= 6
    ? 4
    : contentSchemaVersion >= 5
      ? 3
      : contentSchemaVersion >= 4
        ? 2
        : 1;
  if (!isRecord(itemCatalog) || itemCatalog.schemaVersion !== expectedSchemaVersion) {
    errors.push(`item-catalog.schemaVersion must be ${expectedSchemaVersion}`);
    return;
  }
  const itemTypes = expectedSchemaVersion >= 2 ? ITEM_TYPES_V2 : ITEM_TYPES_V1;
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
  const catalogItemIndexByItem = new WeakMap();
  catalogItems.forEach((item, index) => {
    if (!catalogItemIndexByItem.has(item)) {
      catalogItemIndexByItem.set(item, index);
    }
  });
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
        ...(expectedSchemaVersion >= 2 && item.itemType === "lesson"
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
    validateCatalogPayload(
      item,
      index,
      expectedSchemaVersion,
      characterSourceFileHashes,
      characterLinguisticFileInspections,
      characterStrokeFileInspections,
      errors,
    );
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
  pushDirectedCycleErrors(
    prerequisiteGraph,
    itemKeys,
    (itemKey) => `Item prerequisite cycle detected at ${itemKey}`,
    errors,
  );

  const lexemeItems = catalogItems.filter((item) => item.itemType === "lexeme");
  const lessonItems = catalogItems.filter((item) => item.itemType === "lesson");
  const gradedTextItems = catalogItems.filter((item) => item.itemType === "graded-text");

  if (expectedSchemaVersion >= 2) {
    lessonItems.forEach((item) => {
      const index = catalogItemIndexByItem.get(item);
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
  const lessonReachabilityInputsAreUnique =
    itemMap.size === catalogItems.length
    && runtimeLessonMap.size === runtimeLessons.filter(isRecord).length;
  const exactDuplicateGraphFallbackAllowed =
    catalogItems.length + runtimeLessons.length
      <= LESSON_REACHABILITY_POLICY.maxExactFallbackNodes
    && (
      catalogItems.reduce(
        (count, item) => count + directDependencyKeys(item).length,
        0,
      )
      + runtimeLessons.reduce(
        (count, lesson) =>
          count
          + (Array.isArray(lesson?.prerequisiteIds)
            ? lesson.prerequisiteIds.length
            : 0),
        0,
      )
    ) <= LESSON_REACHABILITY_POLICY.maxExactFallbackEdges;
  const lessonReachability = lessonItems.length === 0
    ? {
        ok: true,
        requiresExactTraversal: () => false,
      }
    : lessonReachabilityInputsAreUnique
      ? buildLessonReachabilityIndex(itemMap, runtimeLessonMap)
      : {
          ok: false,
          exactFallbackAllowed: exactDuplicateGraphFallbackAllowed,
          error: "lesson dependency reachability requires unique graph keys",
        };
  if (!lessonReachability.ok && !lessonReachability.exactFallbackAllowed) {
    errors.push(`Item catalog ${lessonReachability.error}`);
  }
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
    const requiresExactReachability =
      lessonReachability.ok
        ? lessonReachability.requiresExactTraversal(item, false)
        : lessonReachability.exactFallbackAllowed;
    if (requiresExactReachability) {
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
    validateAllowedKeys(
      asset,
      [
        "assetId",
        "targetItemKey",
        "targetPayloadSha256",
        "fileRef",
        "fileSha256",
        "transcript",
        "transcriptSha256",
        "speaker",
        "rights",
        ...(expectedSchemaVersion >= 3 ? ["media", "alignment"] : []),
      ],
      prefix,
      errors,
    );
    const validAssetId = expectedSchemaVersion >= 3
      ? typeof asset.assetId === "string"
        && LOWERCASE_AUDIO_ASSET_ID_PATTERN.test(asset.assetId)
        && !asset.assetId.endsWith(".")
        && !WINDOWS_RESERVED_FILE_STEM_PATTERN.test(asset.assetId)
      : SAFE_ID_PATTERN.test(asset.assetId ?? "");
    if (!validAssetId) {
      errors.push(
        expectedSchemaVersion >= 3
          ? `${prefix}.assetId must be a lowercase non-reserved safe id`
          : `${prefix}.assetId is invalid`,
      );
    } else {
      assetIds.push(asset.assetId);
    }
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
    const validFileRef = expectedSchemaVersion >= 3
      ? validAssetId && asset.fileRef === `audio/${asset.assetId}.wav`
      : isNonEmptyString(asset.fileRef)
        && asset.fileRef.startsWith("audio/")
        && !asset.fileRef.includes("\\")
        && !asset.fileRef.split("/").some(
          (part) => part === "" || part === "." || part === "..",
        );
    if (!validFileRef) {
      errors.push(
        expectedSchemaVersion >= 3
          ? `${prefix}.fileRef must equal audio/<assetId>.wav`
          : `${prefix}.fileRef must be a safe package-local audio path`,
      );
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
      validateAllowedKeys(
        asset.speaker,
        ["id", "nativeSpeakerEvidenceRef"],
        `${prefix}.speaker`,
        errors,
      );
      validateEvidenceObject(
        asset.speaker,
        ["id", "nativeSpeakerEvidenceRef"],
        `${prefix}.speaker`,
        errors,
      );
    }
    if (asset.rights === null) errors.push(`${prefix}.rights is required`);
    else {
      validateAllowedKeys(
        asset.rights,
        ["ownerId", "licenseId", "evidenceRef"],
        `${prefix}.rights`,
        errors,
      );
      validateEvidenceObject(
        asset.rights,
        ["ownerId", "licenseId", "evidenceRef"],
        `${prefix}.rights`,
        errors,
      );
    }
    if (expectedSchemaVersion >= 3) {
      if (!audioRightsEqual(asset.rights, manifestAudioRights)) {
        errors.push(`${prefix}.rights must exactly match manifest.governance.audioRights`);
      }
      validateAudioMedia(asset.media, `${prefix}.media`, errors);

      if (!isRecord(asset.alignment)) {
        errors.push(`${prefix}.alignment must be an object`);
      } else {
        validateAllowedKeys(
          asset.alignment,
          ["schemaVersion", "targetTextSha256", "segments"],
          `${prefix}.alignment`,
          errors,
        );
        if (asset.alignment.schemaVersion !== 1) {
          errors.push(`${prefix}.alignment.schemaVersion must be 1`);
        }
        if (
          !DIGEST_PATTERN.test(asset.alignment.targetTextSha256 ?? "")
          || asset.alignment.targetTextSha256 !== transcriptHash
          || asset.alignment.targetTextSha256 !== asset.transcriptSha256
        ) {
          errors.push(`${prefix}.alignment.targetTextSha256 must match transcript`);
        }
        if (!Array.isArray(asset.alignment.segments)) {
          errors.push(`${prefix}.alignment.segments must be an array`);
        } else {
          if (asset.alignment.segments.length === 0) {
            errors.push(`${prefix}.alignment.segments must not be empty`);
          }
          let previousEndMs = null;
          const segmentTexts = [];
          asset.alignment.segments.forEach((segment, segmentIndex) => {
            const segmentPrefix = `${prefix}.alignment.segments[${segmentIndex}]`;
            if (!isRecord(segment)) {
              errors.push(`${segmentPrefix} must be an object`);
              return;
            }
            validateAllowedKeys(
              segment,
              ["startMs", "endMs", "text"],
              segmentPrefix,
              errors,
            );
            if (!Number.isSafeInteger(segment.startMs) || segment.startMs < 0) {
              errors.push(`${segmentPrefix}.startMs must be a non-negative integer`);
            }
            if (
              !Number.isSafeInteger(segment.endMs)
              || !Number.isSafeInteger(segment.startMs)
              || segment.endMs <= segment.startMs
            ) {
              errors.push(`${segmentPrefix}.endMs must be an integer after startMs`);
            }
            if (
              previousEndMs !== null
              && Number.isSafeInteger(segment.startMs)
              && segment.startMs < previousEndMs
            ) {
              errors.push(`${segmentPrefix} overlaps or precedes the previous segment`);
            }
            if (
              Number.isSafeInteger(segment.endMs)
              && Number.isSafeInteger(asset.media?.durationMs)
              && segment.endMs > asset.media.durationMs
            ) {
              errors.push(`${segmentPrefix}.endMs exceeds media duration`);
            }
            if (!isNonEmptyString(segment.text)) {
              errors.push(`${segmentPrefix}.text is required`);
            } else {
              segmentTexts.push(segment.text);
            }
            if (Number.isSafeInteger(segment.endMs)) previousEndMs = segment.endMs;
          });
          if (
            typeof asset.transcript === "string"
            && normalizeAudioText(segmentTexts.join(""))
              !== normalizeAudioText(asset.transcript)
          ) {
            errors.push(`${prefix}.alignment segment text must concatenate to transcript`);
          }
        }
        const targetTexts = deterministicMandarinTargetTexts(target);
        if (
          typeof asset.transcript === "string"
          && !targetTexts.some(
            (text) => normalizeAudioText(text) === normalizeAudioText(asset.transcript),
          )
        ) {
          errors.push(`${prefix}.transcript must equal a deterministic Mandarin target text`);
        }
      }

      const inspection = isNonEmptyString(asset.fileRef)
        ? audioAssetFileInspections?.[asset.fileRef] ?? null
        : null;
      if (!isRecord(inspection)) {
        errors.push(`${prefix}.fileRef requires a successful WAV inspection`);
      } else if (inspection.ok === true) {
        validateAllowedKeys(
          inspection,
          ["ok", "media"],
          `${prefix}.fileInspection`,
          errors,
        );
        validateAudioMedia(
          inspection.media,
          `${prefix}.fileInspection.media`,
          errors,
        );
        if (!audioMediaEquals(asset.media, inspection.media)) {
          errors.push(`${prefix}.media does not match inspected package bytes`);
        }
      } else if (inspection.ok === false) {
        validateAllowedKeys(
          inspection,
          ["ok", "error"],
          `${prefix}.fileInspection`,
          errors,
        );
        if (!isNonEmptyString(inspection.error)) {
          errors.push(`${prefix}.fileInspection.error is required`);
        }
        errors.push(`${prefix}.fileRef WAV inspection failed`);
      } else {
        errors.push(`${prefix}.fileInspection.ok must be boolean`);
      }
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
      bundle.audioAssetFileInspections,
      bundle.characterSourceFileHashes,
      bundle.characterLinguisticFileInspections,
      bundle.characterStrokeFileInspections,
      bundle.manifest?.governance?.audioRights,
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

const REVIEW_SCOPE_FIELDS = ["itemKeys", "audioAssetIds"];

const buildReviewIndexes = (reviews, manifestHash) => {
  const latestByRole = new Map();
  const latestByScope = new Map(
    REVIEW_SCOPE_FIELDS.map((scopeField) => [scopeField, new Map()]),
  );
  reviews.forEach((review) => {
    if (
      !isRecord(review)
      || review.packageManifestSha256 !== manifestHash
    ) {
      return;
    }
    const previousForRole = latestByRole.get(review.role);
    if (
      !previousForRole
      || Date.parse(review.reviewedAt) >= Date.parse(previousForRole.reviewedAt)
    ) {
      latestByRole.set(review.role, review);
    }
    REVIEW_SCOPE_FIELDS.forEach((scopeField) => {
      const targets = review.scope?.[scopeField];
      if (!Array.isArray(targets)) return;
      const byRole = latestByScope.get(scopeField);
      let byTarget = byRole.get(review.role);
      if (!byTarget) {
        byTarget = new Map();
        byRole.set(review.role, byTarget);
      }
      targets.forEach((target) => {
        const previous = byTarget.get(target);
        if (
          !previous
          || Date.parse(review.reviewedAt) > Date.parse(previous.reviewedAt)
        ) {
          byTarget.set(target, review);
        }
      });
    });
  });
  return { latestByRole, latestByScope };
};

const createReleaseEvaluationContext = (bundle, manifestHash) => {
  const items = Array.isArray(bundle.itemCatalog?.items)
    ? bundle.itemCatalog.items.filter(isRecord)
    : [];
  const itemMap = new Map(items.map((item) => [item.itemKey, item]));
  const reviews = Array.isArray(bundle.reviews?.reviews)
    ? bundle.reviews.reviews
    : [];
  const reviewIndexes = buildReviewIndexes(reviews, manifestHash);
  return {
    bundle,
    manifestHash,
    items,
    itemMap,
    itemKeysAreUnique: itemMap.size === items.length,
    itemReadiness: new Map(),
    directDependenciesByItem: new WeakMap(),
    releasedItems: null,
    ...reviewIndexes,
  };
};

const latestScopedReview = (
  context,
  role,
  scopeField,
  target,
) =>
  context.latestByScope
    .get(scopeField)
    ?.get(role)
    ?.get(target)
  ?? null;

const directDependenciesFor = (context, item) => {
  const cached = context.directDependenciesByItem.get(item);
  if (cached) return cached;
  const dependencies = directDependencyKeys(item);
  context.directDependenciesByItem.set(item, dependencies);
  return dependencies;
};

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
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const itemKey = queue[queueIndex];
    queueIndex += 1;
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

const releasedCatalogItems = (context) => {
  if (context.releasedItems !== null) return context.releasedItems;
  const activeKeys = context.items
    .filter((item) => RELEASED_STATES.has(item.releaseState))
    .map((item) => item.itemKey);
  const relevantKeys = transitiveItemClosure(context.itemMap, activeKeys);
  context.releasedItems = context.items.filter(
    (item) => relevantKeys.has(item.itemKey),
  );
  return context.releasedItems;
};

const characterPayloadIsReleaseComplete = (context, item) => {
  const { bundle } = context;
  if (item?.itemType !== "character") return true;
  if (
    bundle.manifest?.contentSchemaVersion !== 6
    || bundle.itemCatalog?.schemaVersion !== 4
  ) {
    return false;
  }
  const errors = [];
  validateCharacterCatalogPayloadV2(
    item,
    0,
    bundle.characterSourceFileHashes,
    bundle.characterLinguisticFileInspections,
    bundle.characterStrokeFileInspections,
    errors,
  );
  return errors.length === 0;
};

const itemPassesLocalReleaseRequirements = (context, item) => {
  let ready = true;
  if (!item.owner?.id || !item.owner?.evidenceRef) ready = false;
  if (!item.sourceLicense?.licenseId || !item.sourceLicense?.evidenceRef) ready = false;
  if (!Array.isArray(item.prerequisites)) ready = false;
  if (!characterPayloadIsReleaseComplete(context, item)) ready = false;
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
  for (const role of ["content-owner", "native-linguistic", "source-license"]) {
    const review = latestScopedReview(
      context,
      role,
      "itemKeys",
      item.itemKey,
    );
    if (!review || review.decision !== "approved") ready = false;
    if (role === "native-linguistic" && review?.reviewerId === item.owner?.id) {
      ready = false;
    }
  }
  return ready;
};

const itemIsReleaseReady = (context, item) => {
  if (!item || !RELEASED_STATES.has(item.releaseState)) return false;
  const memo = context.itemKeysAreUnique
    ? context.itemReadiness
    : new Map();
  if (memo.has(item.itemKey)) return memo.get(item.itemKey);
  const visiting = new Set();
  visiting.add(item.itemKey);
  const stack = [{
    item,
    dependencies: directDependenciesFor(context, item),
    nextDependencyIndex: 0,
    ready: itemPassesLocalReleaseRequirements(context, item),
  }];
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame.nextDependencyIndex < frame.dependencies.length) {
      const dependencyKey = frame.dependencies[frame.nextDependencyIndex];
      frame.nextDependencyIndex += 1;
      const dependency = context.itemMap.get(dependencyKey);
      if (!dependency || !RELEASED_STATES.has(dependency.releaseState)) {
        frame.ready = false;
        continue;
      }
      if (memo.has(dependency.itemKey)) {
        if (!memo.get(dependency.itemKey)) frame.ready = false;
        continue;
      }
      if (visiting.has(dependency.itemKey)) {
        frame.ready = false;
        continue;
      }
      visiting.add(dependency.itemKey);
      stack.push({
        item: dependency,
        dependencies: directDependenciesFor(context, dependency),
        nextDependencyIndex: 0,
        ready: itemPassesLocalReleaseRequirements(context, dependency),
      });
      continue;
    }
    visiting.delete(frame.item.itemKey);
    memo.set(frame.item.itemKey, frame.ready);
    stack.pop();
    if (stack.length > 0 && !frame.ready) {
      stack[stack.length - 1].ready = false;
    }
  }
  return memo.get(item.itemKey) ?? false;
};

const assessBaseReleaseEligibility = (
  bundle,
  validation,
  channel,
  context,
) => {
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
    const latestReviews = context.latestByRole;
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
    const relevantItems = releasedCatalogItems(context);
    const unreadyItems = relevantItems.filter(
      (item) => !itemIsReleaseReady(context, item),
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

const coverageClaimHasReachableReviewedPath = (context, claim) => {
  const { bundle, itemMap } = context;
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
  if (
    claim.itemKeys.some(
      (itemKey) => !itemIsReleaseReady(context, itemMap.get(itemKey)),
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
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const itemKey = queue[queueIndex];
    queueIndex += 1;
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

const claimHasReachableReviewedPath = (context, framework, level) => {
  const { bundle } = context;
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
      && coverageClaimHasReachableReviewedPath(context, claim),
  );
};

const isNonEmptyReviewedGradedText = (context, item) => {
  if (
    item?.itemType !== "graded-text"
    || !itemIsReleaseReady(context, item)
  ) {
    return false;
  }
  return gradedTextPayloadIsNonEmpty(item);
};

const audioAssetIsReleaseReady = (context, asset) => {
  const { bundle } = context;
  if (
    bundle.manifest?.contentSchemaVersion < 5
    || !isRecord(bundle.itemCatalog)
    || bundle.itemCatalog.schemaVersion < 3
    || bundle.manifest?.governance?.includesAudio !== true
    || !isRecord(asset)
  ) {
    return false;
  }
  const target = context.itemMap.get(asset.targetItemKey);
  const inspection = isNonEmptyString(asset.fileRef)
    ? bundle.audioAssetFileInspections?.[asset.fileRef]
    : null;
  const mediaErrors = [];
  validateAudioMedia(asset.media, "audio asset media", mediaErrors);
  const alignment = asset.alignment;
  const segments = Array.isArray(alignment?.segments)
    ? alignment.segments
    : [];
  let previousEndMs = null;
  const segmentTexts = [];
  const alignmentSegmentsAreValid = segments.length > 0 && segments.every((segment) => {
    if (
      !isRecord(segment)
      || !Number.isSafeInteger(segment.startMs)
      || segment.startMs < 0
      || !Number.isSafeInteger(segment.endMs)
      || segment.endMs <= segment.startMs
      || (previousEndMs !== null && segment.startMs < previousEndMs)
      || !Number.isSafeInteger(asset.media?.durationMs)
      || segment.endMs > asset.media.durationMs
      || !isNonEmptyString(segment.text)
    ) {
      return false;
    }
    previousEndMs = segment.endMs;
    segmentTexts.push(segment.text);
    return true;
  });
  const transcriptMatchesTarget = isNonEmptyString(asset.transcript)
    && deterministicMandarinTargetTexts(target).some(
      (text) => normalizeAudioText(text) === normalizeAudioText(asset.transcript),
    );
  if (
    !target
    || typeof asset.assetId !== "string"
    || !LOWERCASE_AUDIO_ASSET_ID_PATTERN.test(asset.assetId)
    || asset.assetId.endsWith(".")
    || WINDOWS_RESERVED_FILE_STEM_PATTERN.test(asset.assetId)
    || asset.fileRef !== `audio/${asset.assetId}.wav`
    || asset.targetPayloadSha256 !== target.payloadSha256
    || !DIGEST_PATTERN.test(asset.fileSha256 ?? "")
    || bundle.audioAssetFileHashes?.[asset.fileRef] !== asset.fileSha256
    || !isRecord(inspection)
    || inspection.ok !== true
    || !audioMediaEquals(asset.media, inspection.media)
    || mediaErrors.length > 0
    || !isRecord(alignment)
    || alignment.schemaVersion !== 1
    || !DIGEST_PATTERN.test(asset.transcriptSha256 ?? "")
    || alignment.targetTextSha256 !== asset.transcriptSha256
    || !alignmentSegmentsAreValid
    || !transcriptMatchesTarget
    || normalizeAudioText(segmentTexts.join("")) !== normalizeAudioText(asset.transcript)
    || !audioRightsEqual(asset.rights, bundle.manifest?.governance?.audioRights)
    || !isNonEmptyString(asset.speaker?.id)
    || !isNonEmptyString(asset.speaker?.nativeSpeakerEvidenceRef)
    || !isNonEmptyString(asset.rights?.ownerId)
    || !isNonEmptyString(asset.rights?.licenseId)
    || !isNonEmptyString(asset.rights?.evidenceRef)
  ) {
    return false;
  }
  for (const role of ["native-linguistic", "audio-rights"]) {
    const review = latestScopedReview(
      context,
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

const schemaV5AudioReleaseBlockers = (context) => {
  const { bundle } = context;
  const audioAssets = Array.isArray(bundle.itemCatalog?.audioAssets)
    ? bundle.itemCatalog.audioAssets
    : [];
  if (bundle.manifest?.contentSchemaVersion < 5 || audioAssets.length === 0) {
    return [];
  }
  const unreadyAssetCount = audioAssets.filter(
    (asset) => !audioAssetIsReleaseReady(context, asset),
  ).length;
  return unreadyAssetCount === 0
    ? []
    : [
        "Schema-v5 audio requires every declared asset to be release-ready "
          + "with exact scoped native-linguistic and audio-rights approvals "
          + `(unready ${unreadyAssetCount})`,
      ];
};

const assessClosedAlphaEligibilityWithContext = (
  bundle,
  validation,
  context,
) => {
  const base = assessBaseReleaseEligibility(
    bundle,
    validation,
    "closed-alpha",
    context,
  );
  const blockers = schemaV5AudioReleaseBlockers(context);
  const declaredClaims = Array.isArray(bundle.coverageClaims?.coverageClaims)
    ? bundle.coverageClaims.coverageClaims
    : [];
  if (
    declaredClaims.some(
      (claim) =>
        !coverageClaimHasReachableReviewedPath(
          context,
          claim,
        ),
    )
  ) {
    blockers.push(
      "Every declared coverage claim must bind a complete reachable reviewed item graph",
    );
  }
  const reviewedLexemeHashes = new Set(
    releasedCatalogItems(context)
      .filter(
        (item) =>
          item.itemType === "lexeme"
          && itemIsReleaseReady(context, item),
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
      context,
      "CEFR",
      "A0",
    )
  ) {
    blockers.push("Closed alpha requires an evidence-backed complete A0 coverage claim");
  }
  return withAdditionalBlockers(base, blockers);
};

export const assessClosedAlphaEligibility = (bundle, validation) => {
  const context = createReleaseEvaluationContext(
    bundle,
    validation.hashes.manifest,
  );
  return assessClosedAlphaEligibilityWithContext(bundle, validation, context);
};

export const assessPublicationEligibility = (bundle, validation) => {
  const context = createReleaseEvaluationContext(
    bundle,
    validation.hashes.manifest,
  );
  const closedAlpha = assessClosedAlphaEligibilityWithContext(
    bundle,
    validation,
    context,
  );
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
        context,
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
        isNonEmptyReviewedGradedText(context, item))
      .map((item) => item.payloadSha256),
  ).size;
  if (releasedStoryCount < 40) {
    blockers.push(
      `Public beta requires at least 40 non-empty, reviewed graded texts (found ${releasedStoryCount})`,
    );
  }
  const coreItems = releasedCatalogItems(context);
  const audioAssets = Array.isArray(bundle.itemCatalog?.audioAssets)
    ? bundle.itemCatalog.audioAssets
    : [];
  const readyAudioTargets = new Set(
    audioAssets
      .filter((asset) =>
        audioAssetIsReleaseReady(context, asset))
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
