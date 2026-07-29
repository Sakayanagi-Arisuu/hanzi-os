import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildVocabularyDraftForLevel,
  parseCedictText,
  serializeHsk1VocabularyDraft,
  sha256,
  validateVocabularyDraftBundleForLevel,
} from "./hsk1VocabularyDraft.mjs";
import { loadHskSyllabusBundle } from "./hskSyllabusInventory.mjs";

export const HSK4_CEDICT_SOURCE_RELATIVE_PATH =
  "content/sources/cc-cedict-debian-2026-04-03/source.json";
export const HSK4_VOCABULARY_DRAFT_RELATIVE_PATH =
  "content/drafts/hsk4-vocabulary-2026.07.29.json";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

export { parseCedictText, sha256 };

export const buildHsk4VocabularyDraft = (options) =>
  buildVocabularyDraftForLevel({
    ...options,
    level: 4,
    draftId: "hsk4-vocabulary-2026.07.29",
    allowedUnmatchedOfficialIds: ["hsk-vocab-01534"],
  });

export const serializeHsk4VocabularyDraft = serializeHsk1VocabularyDraft;

export const loadHsk4VocabularyDraftBundle = (root = process.cwd()) => {
  const descriptorPath = join(root, HSK4_CEDICT_SOURCE_RELATIVE_PATH);
  const draftPath = join(root, HSK4_VOCABULARY_DRAFT_RELATIVE_PATH);
  return {
    descriptorPath,
    draftPath,
    descriptor: readJson(descriptorPath),
    draft: readJson(draftPath),
    syllabus: loadHskSyllabusBundle(root),
  };
};

export const validateHsk4VocabularyDraftBundle = (bundle) => {
  const result = validateVocabularyDraftBundleForLevel(bundle, {
    level: 4,
    draftId: "hsk4-vocabulary-2026.07.29",
    expectedCount: 1_000,
    label: "HSK4",
    expectedUpstreamStatus: "debian-source-repack-20260403",
    expectedFormat: "cedict-v1-tar-xz-with-utf8-payload",
    allowedUnmatchedOfficialIds: ["hsk-vocab-01534"],
  });
  const archive = bundle.descriptor?.archive;
  const snapshot = bundle.descriptor?.snapshot;
  const digestPattern = /^sha256:[a-f0-9]{64}$/u;
  const sourceMetadataValid =
    archive?.filename === "cc-cedict_0.0~repack20260403.orig.tar.xz"
    && Number.isInteger(archive.byteLength)
    && archive.byteLength > 0
    && digestPattern.test(archive.sha256 ?? "")
    && snapshot?.memberPath === "cedict_ts.u8"
    && Number.isInteger(snapshot.byteLength)
    && snapshot.byteLength > 0;
  if (!sourceMetadataValid) {
    result.errors.push(
      "HSK4 Debian archive and payload identities must remain pinned",
    );
  }
  return {
    ...result,
    valid: result.errors.length === 0,
  };
};

export const assertValidHsk4VocabularyDraftBundle = (bundle) => {
  const result = validateHsk4VocabularyDraftBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK4 vocabulary draft:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
