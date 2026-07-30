import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHskRuntimeCatalog,
  serializeHskRuntimeCatalog,
} from "../../scripts/content/build-hsk-runtime-catalog.mjs";
import {
  assertValidHskRuntimeCatalogBundle,
  HSK_RUNTIME_CATALOG_RELATIVE_PATH,
  loadHskRuntimeCatalogBundle,
  projectHskRuntimeCatalog,
  validateHskRuntimeCatalogBundle,
} from "./hskRuntimeCatalog.mjs";

describe("sanitized HSK runtime curriculum catalog", () => {
  it("projects only released lessons and their learner-visible units", () => {
    const result = assertValidHskRuntimeCatalogBundle(
      loadHskRuntimeCatalogBundle(),
    );

    expect(result.summary).toEqual({
      paths: 5,
      units: 4,
      sourceReleasedLessons: 14,
      eligibleLessons: 8,
      mappedLessons: 8,
      prerequisiteBlockedLessons: 6,
      prerequisiteBlockedUnits: 2,
      pathsWithTargetContent: 2,
      pathsWithoutTargetContent: 3,
      completionClaims: 0,
      authoringUnitMetadataExcluded: 14,
      draftArtifactsImported: 0,
    });
  });

  it("keeps HSK2-4 fail-closed and strips authoring inventory identifiers", () => {
    const { catalog } = loadHskRuntimeCatalogBundle();
    const hsk0 = catalog.paths.find((path: {
      pathId: string;
    }) => path.pathId === "hsk0");
    const hsk1 = catalog.paths.find((path: {
      pathId: string;
    }) => path.pathId === "hsk1");
    const unavailable = catalog.paths.filter((path: {
      pathId: string;
    }) => ["hsk2", "hsk3", "hsk4"].includes(path.pathId));

    expect(hsk0).toMatchObject({
      runtimeState: "partial",
      releasedLessonCount: 4,
      targetContentAvailable: true,
      completionClaim: false,
    });
    expect(hsk1).toMatchObject({
      runtimeState: "partial",
      releasedLessonCount: 4,
      targetContentAvailable: true,
      completionClaim: false,
    });
    expect(unavailable).toHaveLength(3);
    expect(unavailable.every((path: {
      runtimeState: string;
      unitIds: string[];
      targetLessonIds: string[];
      targetContentAvailable: boolean;
      completionClaim: boolean;
    }) =>
      path.runtimeState === "unavailable"
      && path.unitIds.length === 0
      && path.targetLessonIds.length === 0
      && path.targetContentAvailable === false
      && path.completionClaim === false
    )).toBe(true);

    const serialized = JSON.stringify(catalog);
    expect(serialized).not.toContain("officialVocabularyIds");
    expect(serialized).not.toContain("officialInventory");
    expect(serialized).not.toContain("\"planned\"");
    expect(serialized).not.toContain("\"audience\"");
    expect(serialized).not.toContain("\"lifecycle\"");
    expect(serialized).not.toContain("closedAlphaEligible");
    expect(serialized).not.toContain("productionEligible");
    expect(catalog.policy).toMatchObject({
      sanitizedRuntimeCatalogOnly: true,
      requiresCompleteUnitPrerequisiteClosure: true,
      draftArtifactImportsAllowed: false,
      reviewManifestApprovalPublishesContent: false,
      inventoryPresencePublishesContent: false,
      selfDeclarationGrantsMastery: false,
      uncalibratedAssessmentGrantsPrerequisiteWaiver: false,
      lessonAttemptsRequireContentAndActivityVersions: true,
      mutationCommandsRequireIdempotencyKeys: true,
    });
  });

  it("binds each lesson to immutable content and source versions", () => {
    const { catalog } = loadHskRuntimeCatalogBundle();

    expect(catalog.importIdempotencyKey).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(catalog.integritySha256).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(catalog.lessonMappings).toHaveLength(8);
    expect(catalog.lessonMappings.every((mapping: {
      lessonVersion: string;
      releaseState: string;
    }) =>
      mapping.lessonVersion === catalog.runtimeContentVersion
      && ["beta", "published"].includes(mapping.releaseState)
    )).toBe(true);
    expect(catalog.sourceBindings.contentPackage).toMatchObject({
      contentVersion: catalog.runtimeContentVersion,
      contentSchemaVersion: 6,
      itemCatalogSchemaVersion: 4,
    });
  });

  it("rejects source binding drift and artifact tampering", () => {
    const bundle = loadHskRuntimeCatalogBundle();
    const source = structuredClone(bundle.source);
    source.runtimeCatalog.lessons[0].releaseState = "draft";

    const releaseDrift = validateHskRuntimeCatalogBundle({
      ...bundle,
      source,
    });
    expect(releaseDrift.valid).toBe(false);
    expect(releaseDrift.errors).toEqual([
      "Current sanitized runtime catalog binding is invalid",
    ]);

    const catalog = structuredClone(bundle.catalog);
    catalog.paths[0].completionClaim = true;
    const tampered = validateHskRuntimeCatalogBundle({
      ...bundle,
      catalog,
    });
    expect(tampered.valid).toBe(false);
    expect(tampered.errors).toEqual(expect.arrayContaining([
      "HSK runtime catalog integrity digest is invalid",
      "HSK runtime catalog does not match its exact source projection",
    ]));
  });

  it("rejects lesson mappings that bypass their unit prerequisites", () => {
    const { source } = loadHskRuntimeCatalogBundle();
    const unsafeSource = structuredClone(source);
    const dailyUnit = unsafeSource.graphBundle.graph.units.find(
      (unit: { unitId: string }) => unit.unitId === "hsk1-daily-life",
    );
    dailyUnit.prerequisiteUnitIds = [];

    expect(() => projectHskRuntimeCatalog(unsafeSource)).toThrow(
      "daily-1 runtime lesson prerequisite is outside its eligible unit prerequisite closure",
    );
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      resolve(process.cwd(), HSK_RUNTIME_CATALOG_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHskRuntimeCatalog(buildHskRuntimeCatalog()),
    );
  });
});
