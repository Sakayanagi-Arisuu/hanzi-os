import {
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import type { Stats } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  KNOWLEDGE_ITEM_BLUEPRINTS,
  type KnowledgeItemBlueprint,
} from "../../src/data/knowledgeItemBlueprints";
import {
  LESSON_GUIDES,
  type LessonGuide,
} from "../../src/data/lessonGuides";
import { extractAuthoringContent } from "../../src/content/authoringCatalogProjection";
import {
  projectItemCatalog,
  projectItemCatalogV2,
} from "../../src/content/itemCatalogProjection";
import { sha256Json } from "../../src/content/packageLoader";
import type {
  ContentCatalogItem,
  ContentRegistry,
  ItemCatalogArtifact,
} from "../../src/content/types";

const defaultRepositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const CONTROL_FILE_MAX_BYTE_LENGTH = 64 * 1024 * 1024;
type TrustedFileReader = (path: string) => Buffer;

const pathIsContained = (root: string, candidate: string) => {
  const relativePath = relative(root, candidate);
  return !isAbsolute(relativePath)
    && relativePath !== ".."
    && !relativePath.startsWith("..\\")
    && !relativePath.startsWith("../");
};

const pathsAreIdentical = (left: string, right: string) => {
  const normalizedLeft = resolve(left);
  const normalizedRight = resolve(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
};

const metadataIfPresent = (path: string) => {
  try {
    return lstatSync(path);
  } catch (error) {
    if (
      error instanceof Error
      && "code" in error
      && String(error.code) === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
};

const trustedRoot = (root: string, label: string) => {
  const metadata = lstatSync(root);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error(`${label} root must be a regular non-symlink directory`);
  }
  return realpathSync(root);
};

const assertTrustedExistingPath = (
  root: string,
  candidate: string,
  label: string,
  finalKind: "directory" | "file",
) => {
  const relativePath = relative(root, candidate);
  if (
    isAbsolute(relativePath)
    || relativePath === ".."
    || relativePath.startsWith("..\\")
    || relativePath.startsWith("../")
  ) {
    throw new Error(`${label} must stay inside its trusted root`);
  }
  const realRoot = trustedRoot(root, label);
  const pathParts = relativePath === "" ? [] : relativePath.split(/[\\/]/u);
  let currentPath = root;
  let expectedRealPath = realRoot;
  for (const part of pathParts) {
    currentPath = resolve(currentPath, part);
    expectedRealPath = resolve(expectedRealPath, part);
    const metadata = metadataIfPresent(currentPath);
    if (metadata === null) throw new Error(`${label} does not exist`);
    if (metadata.isSymbolicLink()) {
      throw new Error(`${label} must not traverse symlinks or junctions`);
    }
    const realCurrentPath = realpathSync(currentPath);
    if (
      !pathsAreIdentical(realCurrentPath, expectedRealPath)
      || !pathIsContained(realRoot, realCurrentPath)
    ) {
      throw new Error(`${label} must not traverse a junction or reparse point`);
    }
  }
  const metadata = lstatSync(candidate);
  if (
    metadata.isSymbolicLink()
    || (finalKind === "directory" && !metadata.isDirectory())
    || (finalKind === "file" && !metadata.isFile())
  ) {
    throw new Error(
      `${label} must be a regular non-symlink ${finalKind}`,
    );
  }
  return realpathSync(candidate);
};

const sameFileIdentity = (left: Stats, right: Stats) =>
  left.dev === right.dev
  && left.ino === right.ino
  && left.size === right.size
  && left.mtimeMs === right.mtimeMs
  && left.ctimeMs === right.ctimeMs;

const captureTrustedJson = <Value>(
  root: string,
  candidate: string,
  label: string,
  readTrustedFile: TrustedFileReader,
): Value => {
  const realPathBeforeRead = assertTrustedExistingPath(
    root,
    candidate,
    label,
    "file",
  );
  const metadataBeforeRead = lstatSync(candidate);
  if (
    metadataBeforeRead.isSymbolicLink()
    || !metadataBeforeRead.isFile()
  ) {
    throw new Error(`${label} changed before its bytes could be captured`);
  }
  if (metadataBeforeRead.size > CONTROL_FILE_MAX_BYTE_LENGTH) {
    throw new Error(
      `${label} exceeds the ${CONTROL_FILE_MAX_BYTE_LENGTH}-byte capture limit`,
    );
  }
  if (
    !pathsAreIdentical(realpathSync(candidate), realPathBeforeRead)
    || !pathIsContained(realpathSync(root), realPathBeforeRead)
  ) {
    throw new Error(`${label} changed before its bytes could be captured`);
  }

  const bytes = readTrustedFile(realPathBeforeRead);
  let metadataAfterRead: Stats;
  let realPathAfterRead: string;
  try {
    metadataAfterRead = lstatSync(candidate);
    realPathAfterRead = assertTrustedExistingPath(
      root,
      candidate,
      label,
      "file",
    );
  } catch (error) {
    throw new Error(`${label} changed while its bytes were being captured`, {
      cause: error,
    });
  }
  if (
    !Buffer.isBuffer(bytes)
    || bytes.byteLength > CONTROL_FILE_MAX_BYTE_LENGTH
    || bytes.byteLength !== metadataBeforeRead.size
    || metadataAfterRead.isSymbolicLink()
    || !metadataAfterRead.isFile()
    || !sameFileIdentity(metadataBeforeRead, metadataAfterRead)
    || !pathsAreIdentical(realPathBeforeRead, realPathAfterRead)
  ) {
    throw new Error(`${label} changed while its bytes were being captured`);
  }

  let sourceText: string;
  try {
    sourceText = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(bytes);
  } catch (error) {
    throw new Error(`${label} must contain valid UTF-8`, { cause: error });
  }
  try {
    return JSON.parse(sourceText) as Value;
  } catch (error) {
    throw new Error(`${label} must contain valid JSON`, { cause: error });
  }
};

const assertSafeExistingDirectoryPrefix = (
  root: string,
  candidate: string,
  label: string,
) => {
  const relativePath = relative(root, candidate);
  if (
    isAbsolute(relativePath)
    || relativePath === ".."
    || relativePath.startsWith("..\\")
    || relativePath.startsWith("../")
  ) {
    throw new Error(`${label} must stay inside its trusted root`);
  }
  const realRoot = trustedRoot(root, label);
  const pathParts = relativePath === "" ? [] : relativePath.split(/[\\/]/u);
  let currentPath = root;
  let expectedRealPath = realRoot;
  for (const part of pathParts) {
    currentPath = resolve(currentPath, part);
    expectedRealPath = resolve(expectedRealPath, part);
    const metadata = metadataIfPresent(currentPath);
    if (metadata === null) return;
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error(
        `${label} must contain only regular non-symlink directories`,
      );
    }
    const realCurrentPath = realpathSync(currentPath);
    if (
      !pathsAreIdentical(realCurrentPath, expectedRealPath)
      || !pathIsContained(realRoot, realCurrentPath)
    ) {
      throw new Error(`${label} must not traverse a junction or reparse point`);
    }
  }
};

const parseArguments = (args: string[]) => {
  const allowedFlags = new Set([
    "catalog-schema-version",
    "content-version",
    "from",
    "output",
    "write",
  ]);
  const flags = new Map<string, string | true>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${argument}`);
    }
    const name = argument.slice(2);
    if (!allowedFlags.has(name)) {
      throw new Error(`Unknown flag: --${name}`);
    }
    if (name === "write") {
      flags.set(name, true);
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`--${name} requires a value`);
    }
    flags.set(name, value);
    index += 1;
  }
  return flags;
};

const requiredString = (flags: Map<string, string | true>, name: string) => {
  const value = flags.get(name);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`--${name} is required`);
  }
  return value;
};

type CatalogV4 = Extract<ItemCatalogArtifact, { schemaVersion: 4 }>;
type CatalogItem = ContentCatalogItem;
type CharacterV4 = Extract<
  CatalogV4["items"][number],
  { itemType: "character" }
>;

const normalizeAudioText = (value: string) => value.replace(/\r\n?/gu, "\n");

const deterministicMandarinTargetTexts = (item: CatalogItem): string[] => {
  if (item.itemType === "lexeme") {
    return [item.payload.simplified, item.payload.example];
  }
  if (item.itemType === "lesson") {
    return [item.payload.chineseTitle];
  }
  if (item.itemType === "graded-text") {
    const sentences = item.payload.sentences.map((sentence) => sentence.chinese);
    return [...sentences, ...(sentences.length > 0 ? [sentences.join("\n")] : [])];
  }
  if (
    item.itemType === "grammar"
    || item.itemType === "pronunciation"
    || item.itemType === "communicative-function"
  ) {
    return item.payload.examples.map((example) => example.chinese);
  }
  return [item.payload.character];
};

const indexItems = (
  items: CatalogItem[],
  label: string,
): Map<string, CatalogItem> => {
  const itemMap = new Map<string, CatalogItem>();
  for (const item of items) {
    if (itemMap.has(item.itemKey)) {
      throw new Error(`${label} contains duplicate item key ${item.itemKey}`);
    }
    itemMap.set(item.itemKey, item);
  }
  return itemMap;
};

const characterArtifactIdentity = (item: CharacterV4) => ({
  itemId: item.itemId,
  character: item.payload.character,
});

export const rebuildCatalogV4 = async (
  sourceCatalog: ItemCatalogArtifact,
  contentVersion: string,
  {
    lessonGuides,
    knowledgeItemBlueprints,
    onIncompatibleAudio = () => undefined,
  }: {
    lessonGuides: Record<string, LessonGuide>;
    knowledgeItemBlueprints: KnowledgeItemBlueprint[];
    onIncompatibleAudio?: (assetId: string) => void;
  },
): Promise<CatalogV4> => {
  if (sourceCatalog.schemaVersion !== 4) {
    throw new Error(
      "--catalog-schema-version 4 requires a schema-v4 source catalog",
    );
  }

  const authoring = extractAuthoringContent(sourceCatalog);
  if (authoring.lessons.length === 0) {
    throw new Error("The source authoring catalog has no lessons");
  }
  const projected = await projectItemCatalogV2({
    contentVersion,
    ...authoring,
    lessonGuides,
    knowledgeItemBlueprints,
  });
  const sourceItems = indexItems(sourceCatalog.items, "Source schema-v4 catalog");
  indexItems(
    projected.items,
    "Projected schema-v4 catalog",
  );
  const sourceCharacters = new Map(
    sourceCatalog.items
      .filter((item): item is CharacterV4 => item.itemType === "character")
      .map((item) => [item.itemKey, item]),
  );
  const projectedCharacterKeys = projected.items
    .filter((item) => item.itemType === "character")
    .map((item) => item.itemKey);
  if (
    sourceCharacters.size
      !== sourceCatalog.items.filter((item) => item.itemType === "character").length
    || projectedCharacterKeys.length !== new Set(projectedCharacterKeys).size
    || sourceCharacters.size !== projectedCharacterKeys.length
    || projectedCharacterKeys.some((itemKey) => !sourceCharacters.has(itemKey))
  ) {
    throw new Error(
      "Schema-v4 character inventory changed during projection; use import-character-metadata for an explicit sourced-character transition",
    );
  }

  const items = await Promise.all(projected.items.map(async (projectedItem) => {
    if (projectedItem.itemType !== "character") return projectedItem;
    const sourceItem = sourceCharacters.get(projectedItem.itemKey);
    if (sourceItem === undefined) {
      throw new Error(
        `Projected character ${projectedItem.itemKey} has no source-addressed predecessor; use import-character-metadata`,
      );
    }
    const canonicalSourcePayloadSha256 = await sha256Json({
      itemType: sourceItem.itemType,
      payload: sourceItem.payload,
    });
    if (sourceItem.payloadSha256 !== canonicalSourcePayloadSha256) {
      throw new Error(
        `Source character ${sourceItem.itemKey} has a non-canonical payload digest`,
      );
    }
    const projectedIdentity = {
      itemId: projectedItem.itemId,
      character: projectedItem.payload.character,
    };
    if (
      await sha256Json(characterArtifactIdentity(sourceItem))
      !== await sha256Json(projectedIdentity)
    ) {
      throw new Error(
        `Character ${projectedItem.itemKey} changed item identity or glyph during projection; use import-character-metadata`,
      );
    }
    const payload: CharacterV4["payload"] = {
      character: projectedItem.payload.character,
      traditional: projectedItem.payload.traditional,
      pinyin: projectedItem.payload.pinyin,
      meaning: projectedItem.payload.meaning,
      sourceLexemeIds: structuredClone(
        projectedItem.payload.sourceLexemeIds,
      ),
      analysis: structuredClone(sourceItem.payload.analysis),
      strokeCount: sourceItem.payload.strokeCount,
      strokeData: structuredClone(sourceItem.payload.strokeData),
    };
    return {
      ...projectedItem,
      payload,
      payloadSha256: await sha256Json({
        itemType: projectedItem.itemType,
        payload,
      }),
    } satisfies CharacterV4;
  }));
  const targetItems = indexItems(items, "Rebuilt schema-v4 catalog");
  const audioAssetIds = new Set<string>();
  const audioAssets = await Promise.all(sourceCatalog.audioAssets.map(
    async (sourceAsset) => {
      if (audioAssetIds.has(sourceAsset.assetId)) {
        throw new Error(
          `Source schema-v4 catalog contains duplicate audio asset ${sourceAsset.assetId}`,
        );
      }
      audioAssetIds.add(sourceAsset.assetId);
      const sourceTarget = sourceItems.get(sourceAsset.targetItemKey);
      const target = targetItems.get(sourceAsset.targetItemKey);
      if (sourceTarget === undefined) {
        throw new Error(
          `Cannot preserve audio asset ${sourceAsset.assetId}: its source target ${sourceAsset.targetItemKey} is missing`,
        );
      }
      const canonicalSourcePayloadSha256 = await sha256Json({
        itemType: sourceTarget.itemType,
        payload: sourceTarget.payload,
      });
      if (
        sourceTarget.payloadSha256 !== canonicalSourcePayloadSha256
        || sourceAsset.targetPayloadSha256 !== canonicalSourcePayloadSha256
      ) {
        throw new Error(
          `Cannot preserve audio asset ${sourceAsset.assetId}: its source target binding is not canonical`,
        );
      }
      const transcript = normalizeAudioText(sourceAsset.transcript);
      const sourceTextMatches = deterministicMandarinTargetTexts(sourceTarget)
        .some((text) => normalizeAudioText(text) === transcript);
      if (!sourceTextMatches) {
        throw new Error(
          `Cannot preserve audio asset ${sourceAsset.assetId}: its transcript is not bound to a canonical source target text`,
        );
      }
      if (target === undefined) {
        throw new Error(
          `Cannot preserve audio asset ${sourceAsset.assetId}: target ${sourceAsset.targetItemKey} was removed; retain the target or use an explicit audio retirement workflow, which is not supported`,
        );
      }
      const targetTextMatches = deterministicMandarinTargetTexts(target)
        .some((text) => normalizeAudioText(text) === transcript);
      if (!targetTextMatches) {
        onIncompatibleAudio(sourceAsset.assetId);
        return structuredClone(sourceAsset);
      }
      return {
        ...structuredClone(sourceAsset),
        targetPayloadSha256: target.payloadSha256,
      };
    },
  ));

  return {
    schemaVersion: 4,
    contentVersion,
    items,
    audioAssets,
  };
};

export const runItemCatalogExport = async (
  args: string[],
  {
    repositoryRoot = defaultRepositoryRoot,
    log = console.log,
    lessonGuides = LESSON_GUIDES,
    knowledgeItemBlueprints = KNOWLEDGE_ITEM_BLUEPRINTS,
    readTrustedFile = (path) => readFileSync(path),
  }: {
    repositoryRoot?: string;
    log?: (message: string) => void;
    lessonGuides?: Record<string, LessonGuide>;
    knowledgeItemBlueprints?: KnowledgeItemBlueprint[];
    readTrustedFile?: TrustedFileReader;
  } = {},
): Promise<ItemCatalogArtifact> => {
  const flags = parseArguments(args);
  if (flags.get("write") !== true) {
    throw new Error(
      "Refusing to create a catalog without the explicit --write flag",
    );
  }

  const contentVersion = requiredString(flags, "content-version");
  const catalogSchemaVersion = Number(
    flags.get("catalog-schema-version") ?? "1",
  );
  if (![1, 2, 4].includes(catalogSchemaVersion)) {
    throw new Error("--catalog-schema-version must be 1, 2, or 4");
  }
  const output = resolve(repositoryRoot, requiredString(flags, "output"));
  const relativeOutput = relative(repositoryRoot, output);
  const contentRoot = resolve(repositoryRoot, "content");
  const draftsRoot = resolve(contentRoot, "drafts");
  const relativeToDrafts = relative(draftsRoot, output);
  if (isAbsolute(relativeOutput) || relativeOutput.startsWith("..")) {
    throw new Error("--output must stay inside the repository");
  }
  if (isAbsolute(relativeToDrafts) || relativeToDrafts.startsWith("..")) {
    throw new Error("--output must stay inside content/drafts");
  }
  if (metadataIfPresent(output) !== null) {
    throw new Error(`Refusing to overwrite existing catalog: ${relativeOutput}`);
  }
  assertTrustedExistingPath(
    repositoryRoot,
    contentRoot,
    "Content root",
    "directory",
  );
  assertSafeExistingDirectoryPrefix(
    contentRoot,
    dirname(output),
    "Catalog output parent",
  );

  const registryPath = resolve(contentRoot, "registry.json");
  const registry = captureTrustedJson<ContentRegistry>(
    contentRoot,
    registryPath,
    "Content registry",
    readTrustedFile,
  );
  const sourceVersion = typeof flags.get("from") === "string"
    ? String(flags.get("from"))
    : registry.currentContentVersion;
  const sourceEntry = registry.packages.find(
    (entry) => entry.contentVersion === sourceVersion,
  );
  if (!sourceEntry) {
    throw new Error(`Unknown source content version: ${sourceVersion}`);
  }
  if (sourceEntry.relativePath !== `packages/${sourceVersion}`) {
    throw new Error(
      "Source registry entry does not use its direct immutable package path",
    );
  }
  const packagesRoot = resolve(contentRoot, "packages");
  assertTrustedExistingPath(
    contentRoot,
    packagesRoot,
    "Content packages root",
    "directory",
  );
  const sourcePackageDirectory = resolve(
    contentRoot,
    sourceEntry.relativePath,
  );
  assertTrustedExistingPath(
    packagesRoot,
    sourcePackageDirectory,
    `Source package ${sourceVersion}`,
    "directory",
  );
  const sourceCatalogPath = resolve(
    sourcePackageDirectory,
    "item-catalog.json",
  );
  const relativeSourceCatalog = relative(repositoryRoot, sourceCatalogPath);
  if (
    isAbsolute(relativeSourceCatalog)
    || relativeSourceCatalog.startsWith("..")
  ) {
    throw new Error("Source item catalog must stay inside the repository");
  }
  const sourceCatalog = captureTrustedJson<ItemCatalogArtifact>(
    sourcePackageDirectory,
    sourceCatalogPath,
    `Source item catalog ${relativeSourceCatalog}`,
    readTrustedFile,
  );
  if (sourceCatalog.contentVersion !== sourceVersion) {
    throw new Error("Source item catalog contentVersion does not match --from");
  }
  if (sourceCatalog.schemaVersion === 4 && catalogSchemaVersion !== 4) {
    throw new Error(
      "Refusing to downgrade a schema-v4 authoring catalog; export it as schema v4",
    );
  }

  let catalog: ItemCatalogArtifact;
  const incompatibleAudioAssetIds: string[] = [];
  if (catalogSchemaVersion === 4) {
    catalog = await rebuildCatalogV4(sourceCatalog, contentVersion, {
      lessonGuides,
      knowledgeItemBlueprints,
      onIncompatibleAudio: (assetId) => {
        incompatibleAudioAssetIds.push(assetId);
      },
    });
  } else {
    const authoring = extractAuthoringContent(sourceCatalog);
    if (authoring.lessons.length === 0) {
      throw new Error("The source authoring catalog has no lessons");
    }
    catalog = catalogSchemaVersion === 2
      ? await projectItemCatalogV2({
          contentVersion,
          ...authoring,
          lessonGuides,
          knowledgeItemBlueprints,
        })
      : await projectItemCatalog({
          contentVersion,
          ...authoring,
        });
  }

  const outputParent = dirname(output);
  assertSafeExistingDirectoryPrefix(
    contentRoot,
    outputParent,
    "Catalog output parent",
  );
  mkdirSync(outputParent, { recursive: true });
  const realOutputParent = assertTrustedExistingPath(
    contentRoot,
    outputParent,
    "Catalog output parent",
    "directory",
  );
  const realDraftsRoot = assertTrustedExistingPath(
    contentRoot,
    draftsRoot,
    "Catalog drafts root",
    "directory",
  );
  if (!pathIsContained(realDraftsRoot, realOutputParent)) {
    throw new Error("Catalog output parent resolves outside content/drafts");
  }
  if (metadataIfPresent(output) !== null) {
    throw new Error(`Refusing to overwrite existing catalog: ${relativeOutput}`);
  }
  writeFileSync(output, `${JSON.stringify(catalog, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  log(
    catalog.schemaVersion === 4
      ? `Created pending item catalog ${relativeOutput} with ${catalog.items.length} concrete payloads and preserved governed media metadata`
      : `Created pending item catalog ${relativeOutput} with ${catalog.items.length} concrete payloads and no approvals`,
  );
  if (incompatibleAudioAssetIds.length > 0) {
    log(
      `Pending catalog contains ${incompatibleAudioAssetIds.length} incompatible audio asset(s) that must be replaced via import-audio; cannot use new-version: ${incompatibleAudioAssetIds.join(", ")}`,
    );
  }
  return catalog;
};

if (
  process.argv[1] !== undefined
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await runItemCatalogExport(process.argv.slice(2));
}
