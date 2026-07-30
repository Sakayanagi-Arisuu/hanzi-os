import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import {
  assertValidHskCurriculumGraphBundle,
  loadHskCurriculumGraphBundle,
} from "./hskCurriculumGraph.mjs";
import { canonicalJson } from "./governance.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK_RUNTIME_CATALOG_RELATIVE_PATH =
  "content/runtime/hsk0-4-runtime-catalog.json";
export const HSK_RUNTIME_CATALOG_ID =
  "hsk0-4-local-runtime-2026.07.1";
export const HSK_RUNTIME_COMPILER_VERSION =
  "hsk-runtime-curriculum-compiler-v1";

const RELEASED_STATES = new Set(["beta", "published"]);
const PATH_IDS = ["hsk0", "hsk1", "hsk2", "hsk3", "hsk4"];
const SAFE_PACKAGE_PATH = /^packages\/[a-z0-9][a-z0-9._-]*$/u;

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);
const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const sha256Json = (value) =>
  `sha256:${
    createHash("sha256").update(canonicalJson(value)).digest("hex")
  }`;
const repositoryRelativePath = (root, path) =>
  relative(root, path).replaceAll("\\", "/");

const resolveContainedPackagePath = (root, relativePath) => {
  if (
    typeof relativePath !== "string"
    || !SAFE_PACKAGE_PATH.test(relativePath.replaceAll("\\", "/"))
  ) {
    throw new Error("Current content package path is invalid");
  }
  const contentRoot = resolve(root, "content");
  const packageRoot = resolve(contentRoot, relativePath);
  const contentPrefix = `${contentRoot}${sep}`;
  if (
    packageRoot === contentRoot
    || !packageRoot.startsWith(contentPrefix)
  ) {
    throw new Error("Current content package escapes the content root");
  }
  return packageRoot;
};

export const loadHskRuntimeCatalogSourceBundle = (
  root = process.cwd(),
) => {
  const graphBundle = loadHskCurriculumGraphBundle(root);
  const registryPath = resolve(root, "content/registry.json");
  const registry = readJson(registryPath);
  const currentEntries = Array.isArray(registry.packages)
    ? registry.packages.filter(
      (entry) =>
        entry?.contentVersion === registry.currentContentVersion,
    )
    : [];
  if (currentEntries.length !== 1) {
    throw new Error(
      "Content registry must select exactly one current package",
    );
  }
  const registryEntry = currentEntries[0];
  const packageRoot = resolveContainedPackagePath(
    root,
    registryEntry.relativePath,
  );
  const manifestPath = resolve(packageRoot, "manifest.json");
  const itemCatalogPath = resolve(packageRoot, "item-catalog.json");
  const runtimeCatalogPath = resolve(
    packageRoot,
    "runtime-catalog.json",
  );
  return {
    root,
    graphBundle,
    registryPath,
    registry,
    registryEntry,
    manifestPath,
    manifest: readJson(manifestPath),
    itemCatalogPath,
    itemCatalog: readJson(itemCatalogPath),
    runtimeCatalogPath,
    runtimeCatalog: readJson(runtimeCatalogPath),
  };
};

const assertValidSourceBundle = (source) => {
  assertValidHskCurriculumGraphBundle(source.graphBundle);
  const {
    graph,
    graphPath,
  } = source.graphBundle;
  const {
    registry,
    registryEntry,
    manifest,
    itemCatalog,
    runtimeCatalog,
  } = source;
  if (
    !isRecord(registry)
    || registry.schemaVersion !== 1
    || registry.currentContentVersion !== registryEntry.contentVersion
    || registryEntry.packageId !== registryEntry.contentVersion
    || registryEntry.lifecycle !== manifest.lifecycle
    || registryEntry.audience !== manifest.audience
    || typeof registryEntry.closedAlphaEligible !== "boolean"
    || typeof registryEntry.productionEligible !== "boolean"
  ) {
    throw new Error("Current content registry entry is invalid");
  }
  if (
    !isRecord(manifest)
    || manifest.schemaVersion !== 1
    || manifest.packageId !== registryEntry.packageId
    || manifest.contentVersion !== registryEntry.contentVersion
    || !Number.isInteger(manifest.contentSchemaVersion)
    || manifest.contentSchemaVersion < 1
    || registryEntry.manifestSha256 !== sha256Json(manifest)
  ) {
    throw new Error("Current content package manifest is invalid");
  }
  if (
    !isRecord(itemCatalog)
    || !Number.isInteger(itemCatalog.schemaVersion)
    || itemCatalog.schemaVersion < 1
    || itemCatalog.contentVersion !== manifest.contentVersion
    || !Array.isArray(itemCatalog.items)
    || manifest.artifacts?.["item-catalog.json"]
      !== sha256Json(itemCatalog)
  ) {
    throw new Error("Current item catalog binding is invalid");
  }
  if (
    !isRecord(runtimeCatalog)
    || runtimeCatalog.schemaVersion !== 1
    || runtimeCatalog.contentVersion !== manifest.contentVersion
    || graph.runtimeContentVersion !== runtimeCatalog.contentVersion
    || manifest.artifacts?.["runtime-catalog.json"]
      !== sha256Json(runtimeCatalog)
    || !Array.isArray(runtimeCatalog.vocabulary)
    || !Array.isArray(runtimeCatalog.lessons)
    || !Array.isArray(runtimeCatalog.stories)
  ) {
    throw new Error("Current sanitized runtime catalog binding is invalid");
  }
  if (
    duplicateValues(runtimeCatalog.lessons.map((lesson) => lesson.id))
      .length > 0
    || runtimeCatalog.lessons.some(
      (lesson) =>
        !RELEASED_STATES.has(lesson.releaseState)
        || lesson.contentVersion !== runtimeCatalog.contentVersion,
    )
  ) {
    throw new Error(
      "Sanitized runtime catalog contains duplicate or non-released lessons",
    );
  }
  const releasedItemLessons = itemCatalog.items.filter(
    (item) =>
      item?.itemType === "lesson"
      && RELEASED_STATES.has(item.releaseState),
  );
  const releasedItemLessonIds = releasedItemLessons
    .map((lesson) => lesson.itemId)
    .sort();
  const runtimeLessonIds = runtimeCatalog.lessons
    .map((lesson) => lesson.id)
    .sort();
  if (
    duplicateValues(releasedItemLessonIds).length > 0
    || !exact(releasedItemLessonIds, runtimeLessonIds)
    || releasedItemLessons.some(
      (lesson) =>
        typeof lesson.itemVersion !== "string"
        || lesson.itemVersion.length === 0
        || lesson.releaseState
          !== runtimeCatalog.lessons.find(
            (runtimeLesson) => runtimeLesson.id === lesson.itemId,
          )?.releaseState,
    )
  ) {
    throw new Error(
      "Sanitized runtime lessons do not match released item catalog lessons",
    );
  }
  if (
    repositoryRelativePath(source.root, graphPath)
      !== "content/curriculum/hsk0-4-graph.json"
  ) {
    throw new Error("HSK curriculum graph path is unexpected");
  }
};

const buildSourceBindings = (source) => ({
  curriculumGraph: {
    graphId: source.graphBundle.graph.graphId,
    relativePath: repositoryRelativePath(
      source.root,
      source.graphBundle.graphPath,
    ),
    sha256: fileSha256(source.graphBundle.graphPath),
  },
  contentRegistry: {
    relativePath: repositoryRelativePath(
      source.root,
      source.registryPath,
    ),
    sha256: sha256Json(source.registry),
  },
  contentPackage: {
    packageId: source.manifest.packageId,
    contentVersion: source.manifest.contentVersion,
    contentSchemaVersion: source.manifest.contentSchemaVersion,
    itemCatalogSchemaVersion: source.itemCatalog.schemaVersion,
    manifestRelativePath: repositoryRelativePath(
      source.root,
      source.manifestPath,
    ),
    manifestSha256: sha256Json(source.manifest),
    itemCatalogRelativePath: repositoryRelativePath(
      source.root,
      source.itemCatalogPath,
    ),
    itemCatalogSha256: sha256Json(source.itemCatalog),
    runtimeCatalogRelativePath: repositoryRelativePath(
      source.root,
      source.runtimeCatalogPath,
    ),
    runtimeCatalogSha256: sha256Json(source.runtimeCatalog),
  },
});

export const projectHskRuntimeCatalog = (source) => {
  assertValidSourceBundle(source);
  const graph = source.graphBundle.graph;
  const runtime = source.runtimeCatalog;
  const runtimeLessonById = new Map(
    runtime.lessons.map((lesson) => [lesson.id, lesson]),
  );
  const graphUnitById = new Map(
    graph.units.map((unit) => [unit.unitId, unit]),
  );
  const itemLessonById = new Map(
    source.itemCatalog.items
      .filter((item) => item.itemType === "lesson")
      .map((item) => [item.itemId, item]),
  );
  const graphMappingByLessonId = new Map(
    graph.lessonMappings.map((mapping) => [mapping.lessonId, mapping]),
  );
  const mappedUnitIds = new Set(
    graph.lessonMappings.map((mapping) => mapping.unitId),
  );
  const runtimeEligibleUnitIds = new Set();
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const unit of graph.units) {
      if (
        mappedUnitIds.has(unit.unitId)
        && !runtimeEligibleUnitIds.has(unit.unitId)
        && unit.prerequisiteUnitIds.every((unitId) =>
          runtimeEligibleUnitIds.has(unitId)
        )
      ) {
        runtimeEligibleUnitIds.add(unit.unitId);
        expanded = true;
      }
    }
  }
  const prerequisiteUnitClosure = (unitId) => {
    const closure = new Set();
    const queue = [...(graphUnitById.get(unitId)?.prerequisiteUnitIds ?? [])];
    while (queue.length > 0) {
      const prerequisiteId = queue.shift();
      if (closure.has(prerequisiteId)) continue;
      closure.add(prerequisiteId);
      queue.push(
        ...(graphUnitById.get(prerequisiteId)?.prerequisiteUnitIds ?? []),
      );
    }
    return closure;
  };
  const allLessonMappings = graph.lessonMappings.map((mapping) => {
    const lesson = runtimeLessonById.get(mapping.lessonId);
    const itemLesson = itemLessonById.get(mapping.lessonId);
    const unit = graphUnitById.get(mapping.unitId);
    if (!lesson || !itemLesson || !unit) {
      throw new Error(
        `${mapping.lessonId} cannot be projected into the HSK runtime graph`,
      );
    }
    const projected = {
      lessonId: lesson.id,
      lessonVersion: itemLesson.itemVersion,
      unitId: unit.unitId,
      releaseState: lesson.releaseState,
      mappedOfficialVocabularyCount:
        new Set(mapping.officialVocabularyIds).size,
    };
    return projected;
  });
  const lessonMappings = allLessonMappings.filter((mapping) =>
    runtimeEligibleUnitIds.has(mapping.unitId)
  );
  const eligibleLessonIds = new Set(
    lessonMappings.map((mapping) => mapping.lessonId),
  );
  for (const lesson of runtime.lessons) {
    if (!eligibleLessonIds.has(lesson.id)) continue;
    const mapping = graphMappingByLessonId.get(lesson.id);
    const prerequisiteUnits = prerequisiteUnitClosure(mapping.unitId);
    for (const prerequisiteLessonId of lesson.prerequisiteIds) {
      const prerequisiteMapping = graphMappingByLessonId.get(
        prerequisiteLessonId,
      );
      if (
        !prerequisiteMapping
        || !eligibleLessonIds.has(prerequisiteLessonId)
        || (
          prerequisiteMapping.unitId !== mapping.unitId
          && !prerequisiteUnits.has(prerequisiteMapping.unitId)
        )
      ) {
        throw new Error(
          `${lesson.id} runtime lesson prerequisite is outside its eligible unit prerequisite closure`,
        );
      }
    }
  }
  const mappingsByUnit = new Map(
    graph.units.map((unit) => [unit.unitId, []]),
  );
  for (const mapping of lessonMappings) {
    mappingsByUnit.get(mapping.unitId).push(mapping);
  }
  const units = graph.units
    .filter((unit) => runtimeEligibleUnitIds.has(unit.unitId))
    .map((unit) => {
      const mappings = mappingsByUnit.get(unit.unitId) ?? [];
      const graphMappings = graph.lessonMappings.filter(
        (mapping) => mapping.unitId === unit.unitId,
      );
      return {
        unitId: unit.unitId,
        pathId: unit.pathId,
        sequence: unit.sequence,
        title: unit.title,
        objective: unit.objective,
        prerequisiteUnitIds: [...unit.prerequisiteUnitIds],
        runtimeState: "partial",
        lessonIds: mappings.map((mapping) => mapping.lessonId),
        releasedLessonCount: mappings.length,
        mappedOfficialVocabularyCount: new Set(
          graphMappings.flatMap(
            (mapping) => mapping.officialVocabularyIds,
          ),
        ).size,
      };
    });

  const paths = graph.paths.map((path) => {
    const pathMappings = path.unitIds.flatMap(
      (unitId) => mappingsByUnit.get(unitId) ?? [],
    );
    const graphMappings = graph.lessonMappings.filter((mapping) =>
      path.unitIds.includes(mapping.unitId)
      && runtimeEligibleUnitIds.has(mapping.unitId)
    );
    return {
      pathId: path.pathId,
      stageIndex: path.stageIndex,
      prerequisitePathIds: [...path.prerequisitePathIds],
      unitIds: path.unitIds.filter((unitId) =>
        runtimeEligibleUnitIds.has(unitId)
      ),
      placementPolicy: path.placementPolicy,
      runtimeState:
        pathMappings.length > 0 ? "partial" : "unavailable",
      targetLessonIds: pathMappings.map((mapping) => mapping.lessonId),
      releasedLessonCount: pathMappings.length,
      mappedOfficialVocabularyCount: new Set(
        graphMappings.flatMap(
          (mapping) => mapping.officialVocabularyIds,
        ),
      ).size,
      targetContentAvailable: pathMappings.length > 0,
      completionClaim: false,
    };
  });
  const projectedPathById = new Map(
    paths.map((path) => [path.pathId, path]),
  );
  for (const path of paths) {
    if (
      path.targetContentAvailable
      && path.prerequisitePathIds.some(
        (pathId) =>
          !projectedPathById.get(pathId)?.targetContentAvailable,
      )
    ) {
      throw new Error(
        `${path.pathId} has target content without released prerequisite path content`,
      );
    }
  }
  const sourceBindings = buildSourceBindings(source);
  const importIdempotencyKey = sha256Json({
    compilerVersion: HSK_RUNTIME_COMPILER_VERSION,
    sourceBindings,
  });
  const payload = {
    schemaVersion: 1,
    catalogId: HSK_RUNTIME_CATALOG_ID,
    compilerVersion: HSK_RUNTIME_COMPILER_VERSION,
    runtimeContentVersion: runtime.contentVersion,
    importIdempotencyKey,
    sourceBindings,
    policy: {
      sanitizedRuntimeCatalogOnly: true,
      requiresBetaOrPublishedLessonState: true,
      requiresCompleteUnitPrerequisiteClosure: true,
      draftArtifactImportsAllowed: false,
      reviewManifestApprovalPublishesContent: false,
      inventoryPresencePublishesContent: false,
      selfDeclarationGrantsMastery: false,
      uncalibratedAssessmentGrantsPrerequisiteWaiver: false,
      lessonAttemptsRequireContentAndActivityVersions: true,
      mutationCommandsRequireIdempotencyKeys: true,
    },
    paths,
    units,
    lessonMappings,
    counts: {
      paths: paths.length,
      units: units.length,
      sourceReleasedLessons: runtime.lessons.length,
      eligibleLessons: lessonMappings.length,
      mappedLessons: new Set(
        lessonMappings.map((mapping) => mapping.lessonId),
      ).size,
      prerequisiteBlockedLessons:
        allLessonMappings.length - lessonMappings.length,
      prerequisiteBlockedUnits:
        mappedUnitIds.size - runtimeEligibleUnitIds.size,
      pathsWithTargetContent: paths.filter(
        (path) => path.targetContentAvailable,
      ).length,
      pathsWithoutTargetContent: paths.filter(
        (path) => !path.targetContentAvailable,
      ).length,
      completionClaims: paths.filter(
        (path) => path.completionClaim,
      ).length,
      authoringUnitMetadataExcluded: graph.units.length - units.length,
      draftArtifactsImported: 0,
    },
  };
  return {
    ...payload,
    integritySha256: sha256Json(payload),
  };
};

export const loadHskRuntimeCatalogBundle = (
  root = process.cwd(),
) => {
  const catalogPath = resolve(root, HSK_RUNTIME_CATALOG_RELATIVE_PATH);
  return {
    source: loadHskRuntimeCatalogSourceBundle(root),
    catalogPath,
    catalog: readJson(catalogPath),
  };
};

export const validateHskRuntimeCatalogBundle = ({
  source,
  catalog,
}) => {
  const errors = [];
  let expected;
  try {
    expected = projectHskRuntimeCatalog(source);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }
  if (
    !isRecord(catalog)
    || catalog.schemaVersion !== 1
    || catalog.catalogId !== HSK_RUNTIME_CATALOG_ID
    || catalog.compilerVersion !== HSK_RUNTIME_COMPILER_VERSION
  ) {
    errors.push("HSK runtime catalog identity is invalid");
  }
  if (
    !isRecord(catalog)
    || !isRecord(catalog.sourceBindings)
    || !isRecord(catalog.policy)
    || !Array.isArray(catalog.paths)
    || !Array.isArray(catalog.units)
    || !Array.isArray(catalog.lessonMappings)
  ) {
    errors.push("HSK runtime catalog shape is invalid");
  } else {
    const {
      integritySha256: _integritySha256,
      ...payload
    } = catalog;
    if (catalog.integritySha256 !== sha256Json(payload)) {
      errors.push("HSK runtime catalog integrity digest is invalid");
    }
    if (
      catalog.policy.sanitizedRuntimeCatalogOnly !== true
      || catalog.policy.requiresBetaOrPublishedLessonState !== true
      || catalog.policy.requiresCompleteUnitPrerequisiteClosure !== true
      || catalog.policy.draftArtifactImportsAllowed !== false
      || catalog.policy.reviewManifestApprovalPublishesContent !== false
      || catalog.policy.inventoryPresencePublishesContent !== false
      || catalog.policy.selfDeclarationGrantsMastery !== false
      || catalog.policy.uncalibratedAssessmentGrantsPrerequisiteWaiver
        !== false
      || catalog.policy.lessonAttemptsRequireContentAndActivityVersions
        !== true
      || catalog.policy.mutationCommandsRequireIdempotencyKeys !== true
    ) {
      errors.push("HSK runtime catalog policy is not fail-closed");
    }
  }
  if (!exact(catalog, expected)) {
    errors.push(
      "HSK runtime catalog does not match its exact source projection",
    );
  }
  if (
    !exact(
      expected.paths.map((path) => path.pathId),
      PATH_IDS,
    )
    || expected.counts.paths !== 5
    || expected.counts.units !== 4
    || expected.counts.sourceReleasedLessons !== 14
    || expected.counts.eligibleLessons !== 8
    || expected.counts.mappedLessons !== 8
    || expected.counts.prerequisiteBlockedLessons !== 6
    || expected.counts.prerequisiteBlockedUnits !== 2
    || expected.counts.pathsWithTargetContent !== 2
    || expected.counts.pathsWithoutTargetContent !== 3
    || expected.counts.completionClaims !== 0
    || expected.counts.authoringUnitMetadataExcluded !== 14
    || expected.counts.draftArtifactsImported !== 0
  ) {
    errors.push("HSK runtime catalog release counts are invalid");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expected.counts,
  };
};

export const assertValidHskRuntimeCatalogBundle = (bundle) => {
  const result = validateHskRuntimeCatalogBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK runtime catalog:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
