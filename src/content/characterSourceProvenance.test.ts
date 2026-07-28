import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = join(
  repositoryRoot,
  "content",
  "sources",
  "character-foundation-v1",
);
const candidateRoot = join(
  repositoryRoot,
  "content",
  "packages",
  "foundation-2026.07.6",
);

const readJson = (path: string) =>
  JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

const sha256Bytes = (bytes: Buffer | string) =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const sha256File = (path: string) => sha256Bytes(readFileSync(path));

type DescriptorSource = {
  sourceId: string;
  kind: "linguistic-reference" | "stroke-dataset";
  recordKey: string;
  citationRef: string;
  licenseId: string;
  licenseEvidenceRef: string;
  sourceFile: string;
  expectedFileSha256: string;
};

type DescriptorCharacter = {
  targetItemKey: string;
  decompositionKind: "independent" | "compound";
  radical: { glyph: string; sourceIds: string[] };
  components: Array<{
    glyph: string;
    role: string;
    position: string;
    sourceIds: string[];
  }>;
  structure: { kind: string; sourceIds: string[] };
  sources: DescriptorSource[];
  strokeSourceId: string;
};

type CharacterDescriptor = {
  schemaVersion: number;
  contentVersion: string;
  characters: DescriptorCharacter[];
};

type CandidateCatalog = {
  contentVersion: string;
  items: Array<{
    itemKey: string;
    itemType: string;
    releaseState: string;
    owner: unknown;
    sourceLicense: unknown;
    payload: {
      character?: string;
      analysis?: {
        decompositionKind: string;
        radical: { glyph: string };
        components: Array<{ glyph: string; role: string; position: string }>;
        structure: { kind: string };
        sources: Array<{
          sourceId: string;
          recordRef: string;
          recordSha256: string;
        }>;
      };
      strokeData?: {
        fileRef: string;
        fileSha256: string;
        sourceId: string;
      };
    };
  }>;
};

const descriptor = readJson(join(
  sourceRoot,
  "foundation-2026.07.6-character-descriptor.json",
)) as unknown as CharacterDescriptor;
const candidateCatalog = readJson(join(
  candidateRoot,
  "item-catalog.json",
)) as unknown as CandidateCatalog;

const expectedItemKeys = [
  "character:u4e00",
  "character:u4e09",
  "character:u4e8c",
  "character:u4eba",
  "character:u4f60",
  "character:u597d",
  "character:u5bb6",
];

const expectedRevisions = {
  makemeahanzi: "618dbab8a8ddefb958763c8b4afbaa741a4460de",
  cjkvi: "86b4d16159f0079437870408f0ca186e529015db",
  strokes: "ad1a9905cada18d07630acc27d438b070d753ec0",
};

describe("character source provenance", () => {
  it("binds the exact seven review targets to pinned, hash-checked inputs", () => {
    expect(descriptor.schemaVersion).toBe(1);
    expect(descriptor.contentVersion).toBe("foundation-2026.07.6");
    expect(descriptor.characters.map(({ targetItemKey }) => targetItemKey).sort())
      .toEqual(expectedItemKeys);

    for (const character of descriptor.characters) {
      const sources = new Map(
        character.sources.map((source) => [source.sourceId, source]),
      );
      expect([...sources.keys()].sort()).toEqual([
        "cjkvi-ids",
        "hanzi-writer-data",
        "makemeahanzi-dictionary",
      ]);
      expect(character.strokeSourceId).toBe("hanzi-writer-data");

      for (const source of sources.values()) {
        const sourcePath = join(repositoryRoot, source.sourceFile);
        expect(sha256File(sourcePath)).toBe(source.expectedFileSha256);
        if (source.kind === "linguistic-reference") {
          expect(source.recordKey).toBe(
            JSON.parse(readFileSync(sourcePath, "utf8")).character,
          );
        }
      }

      const radicalSource = sources.get("makemeahanzi-dictionary");
      expect(radicalSource?.kind).toBe("linguistic-reference");
      expect(radicalSource?.citationRef).toContain(expectedRevisions.makemeahanzi);
      expect(radicalSource?.licenseId).toBe("LGPL-3.0-or-later");
      const radicalRecord = readJson(join(repositoryRoot, radicalSource!.sourceFile));
      expect(radicalRecord.sourceRevision).toBe(expectedRevisions.makemeahanzi);
      expect(radicalRecord.radical).toBe(character.radical.glyph);

      const structureSource = sources.get("cjkvi-ids");
      expect(structureSource?.kind).toBe("linguistic-reference");
      expect(structureSource?.citationRef).toContain(expectedRevisions.cjkvi);
      expect(structureSource?.licenseId).toBe("CHISE-IDS-terms");
      const structureRecord = readJson(join(
        repositoryRoot,
        structureSource!.sourceFile,
      ));
      expect(structureRecord.sourceRevision).toBe(expectedRevisions.cjkvi);
      expect(sha256Bytes(`${String(structureRecord.sourceLine)}\n`))
        .toBe(structureRecord.sourceLineSha256);

      const sourceLine = String(structureRecord.sourceLine).split("\t");
      expect(sourceLine).toEqual([
        structureRecord.codepoint,
        structureRecord.character,
        structureRecord.ids,
      ]);
      const idsGlyphs = [...String(structureRecord.ids)];
      if (character.decompositionKind === "independent") {
        expect(idsGlyphs).toEqual([structureRecord.character]);
        expect(character.components).toEqual([]);
        expect(character.structure.kind).toBe("independent");
      } else {
        const [operator, ...components] = idsGlyphs;
        expect(["⿰", "⿱"]).toContain(operator);
        expect(operator === "⿰" ? "left-right" : "top-bottom")
          .toBe(character.structure.kind);
        expect(components).toEqual(
          character.components.map(({ glyph }) => glyph),
        );
        expect(character.components.every(({ role }) => role === "graphic"))
          .toBe(true);
      }

      const strokeSource = sources.get("hanzi-writer-data");
      expect(strokeSource?.kind).toBe("stroke-dataset");
      expect(strokeSource?.citationRef).toContain(expectedRevisions.strokes);
      expect(strokeSource?.licenseId).toBe("Arphic-Public-License");
    }
  });

  it("keeps copied artifacts immutable and every enriched item unpublished", () => {
    expect(candidateCatalog.contentVersion).toBe(descriptor.contentVersion);
    for (const character of descriptor.characters) {
      const item = candidateCatalog.items.find(
        ({ itemKey }) => itemKey === character.targetItemKey,
      );
      expect(item).toMatchObject({
        itemType: "character",
        releaseState: "review",
        owner: null,
        sourceLicense: null,
      });
      expect(item?.payload.analysis).toMatchObject({
        decompositionKind: character.decompositionKind,
        radical: { glyph: character.radical.glyph },
        components: character.components.map(({ glyph, role, position }) => ({
          glyph,
          role,
          position,
        })),
        structure: { kind: character.structure.kind },
      });

      const descriptorSources = new Map(
        character.sources.map((source) => [source.sourceId, source]),
      );
      for (const copiedSource of item!.payload.analysis!.sources) {
        const descriptorSource = descriptorSources.get(copiedSource.sourceId);
        expect(copiedSource.recordSha256)
          .toBe(descriptorSource?.expectedFileSha256);
        expect(sha256File(join(candidateRoot, copiedSource.recordRef)))
          .toBe(copiedSource.recordSha256);
      }
      expect(sha256File(join(candidateRoot, item!.payload.strokeData!.fileRef)))
        .toBe(item!.payload.strokeData!.fileSha256);
    }
  });
});
