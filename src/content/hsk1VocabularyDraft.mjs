import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHskSyllabusBundle,
  loadHskSyllabusBundle,
} from "./hskSyllabusInventory.mjs";

export const HSK1_CEDICT_SOURCE_RELATIVE_PATH =
  "content/sources/cc-cedict-2026-07-28/source.json";
export const HSK1_VOCABULARY_DRAFT_RELATIVE_PATH =
  "content/drafts/hsk1-vocabulary-2026.07.28.json";

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const TONE_MARKS = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

export const sha256 = (value) =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;

const normalizeUmlaut = (value) =>
  value.replace(/u:/giu, "ü").replace(
    /v/giu,
    (match) => match === "V" ? "Ü" : "ü",
  );

const markVowel = (spelling, tone) => {
  if (tone === 5) return spelling;
  const lower = spelling.toLocaleLowerCase("en");
  let targetIndex = lower.indexOf("a");
  if (targetIndex < 0) targetIndex = lower.indexOf("e");
  if (targetIndex < 0) {
    const ouIndex = lower.indexOf("ou");
    if (ouIndex >= 0) targetIndex = ouIndex;
  }
  if (targetIndex < 0) {
    for (let index = lower.length - 1; index >= 0; index -= 1) {
      if ("aeiouü".includes(lower[index])) {
        targetIndex = index;
        break;
      }
    }
  }
  if (targetIndex < 0) return spelling;
  const marked = TONE_MARKS[lower[targetIndex]]?.[tone - 1];
  if (!marked) return spelling;
  const original = spelling[targetIndex];
  const replacement = original === original.toLocaleUpperCase("en")
    ? marked.toLocaleUpperCase("en")
    : marked;
  return `${spelling.slice(0, targetIndex)}${replacement}${spelling.slice(targetIndex + 1)}`;
};

const parseNumberedPinyinSyllables = (numberedPinyin) => {
  const compact = numberedPinyin.replace(/[\s'’.-]/gu, "");
  const matches = [...compact.matchAll(/([A-Za-züÜvV:]+)([1-5])/gu)];
  const consumed = matches.map((match) => match[0]).join("");
  if (
    matches.length === 0
    || consumed.toLocaleLowerCase("en") !== compact.toLocaleLowerCase("en")
  ) {
    throw new Error(`Invalid numbered pinyin: ${numberedPinyin}`);
  }
  return matches.map((match) => ({
    spelling: normalizeUmlaut(match[1]),
    tone: Number(match[2]),
  }));
};

const formatMarkedSyllables = (syllables) =>
  syllables.map(({ spelling, tone }) => markVowel(spelling, tone)).join("");

export const numberedPinyinToMarked = (numberedPinyin) =>
  formatMarkedSyllables(parseNumberedPinyinSyllables(numberedPinyin));

export const numberedPinyinToStandardSandhiMarked = (numberedPinyin) => {
  const syllables = parseNumberedPinyinSyllables(numberedPinyin);
  return formatMarkedSyllables(syllables.map((syllable, index) => {
    const nextTone = syllables[index + 1]?.tone;
    const spelling = syllable.spelling.toLocaleLowerCase("en");
    let tone = syllable.tone;
    if (spelling === "bu" && tone === 4 && nextTone === 4) tone = 2;
    if (spelling === "yi" && tone === 1 && nextTone && nextTone !== 5) {
      tone = nextTone === 4 ? 2 : 4;
    }
    return { ...syllable, tone };
  }));
};

export const canonicalMarkedPinyin = (value) =>
  value.normalize("NFKC").replace(/[\s'’.-]/gu, "");

export const canonicalTonelessPinyin = (value) => normalizeUmlaut(value)
  .normalize("NFD")
  .replace(/u\u0308/giu, (match) => match.startsWith("U") ? "V" : "v")
  .replace(/[\u0300-\u036f]/gu, "")
  .replace(/[^a-zv]/giu, "")
  .toLocaleLowerCase("en");

const officialPinyinVariants = (value) =>
  value.split("/").map(canonicalMarkedPinyin);

const matchCedictCandidates = (candidates, variants, caseFolded) => {
  const expected = new Set(
    variants.map((variant) =>
      caseFolded ? variant.toLocaleLowerCase("en") : variant
    ),
  );
  const canonical = (value) => {
    const normalized = canonicalMarkedPinyin(value);
    return caseFolded ? normalized.toLocaleLowerCase("en") : normalized;
  };
  return candidates.flatMap((candidate) => {
    if (
      candidate.markedPinyin !== null
      && expected.has(canonical(candidate.markedPinyin))
    ) {
      return [{ ...candidate, matchType: "lexical", caseFolded }];
    }
    if (
      candidate.standardSandhiPinyin !== null
      && expected.has(canonical(candidate.standardSandhiPinyin))
    ) {
      return [{ ...candidate, matchType: "standard-sandhi", caseFolded }];
    }
    return [];
  });
};

export const parseCedictText = (text) => {
  const entries = [];
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/$/u);
    if (!match) {
      throw new Error(`Invalid CC-CEDICT v1 entry at line ${index + 1}`);
    }
    let markedPinyin = null;
    let standardSandhiPinyin = null;
    try {
      markedPinyin = numberedPinyinToMarked(match[3]);
      standardSandhiPinyin =
        numberedPinyinToStandardSandhiMarked(match[3]);
    } catch {
      // CC-CEDICT includes a small number of non-Mandarin/name records. They
      // remain countable source rows but can never become an exact HSK match.
    }
    entries.push({
      traditional: match[1],
      simplified: match[2],
      numberedPinyin: match[3],
      markedPinyin,
      standardSandhiPinyin,
      senses: match[4].split("/").map((sense) => sense.trim()).filter(Boolean),
      sourceLineSha256: sha256(line),
    });
  }
  return entries;
};

export const buildVocabularyDraftForLevel = ({
  level,
  draftId,
  descriptor,
  inventory,
  inventorySha256,
  cedictEntries,
  allowedUnmatchedOfficialIds = [],
}) => {
  const allowedUnmatched = new Set(allowedUnmatchedOfficialIds);
  const levelVocabulary = inventory.vocabulary.filter(
    (item) => item.level === level,
  );
  const bySimplified = new Map();
  for (const entry of cedictEntries) {
    const candidates = bySimplified.get(entry.simplified) ?? [];
    candidates.push(entry);
    bySimplified.set(entry.simplified, candidates);
  }

  const entries = levelVocabulary.map((official) => {
    const variants = officialPinyinVariants(official.pinyin);
    const candidates = bySimplified.get(official.word) ?? [];
    const caseSensitiveMatches =
      matchCedictCandidates(candidates, variants, false);
    const pronunciationMatches = caseSensitiveMatches.length > 0
      ? caseSensitiveMatches
      : matchCedictCandidates(candidates, variants, true);
    const officialSurfaces = new Set(
      variants.map(canonicalTonelessPinyin),
    );
    const sourceMatches = pronunciationMatches.length > 0
      ? pronunciationMatches
      : candidates.filter(
        (candidate) => candidate.markedPinyin !== null
          && officialSurfaces.has(
            canonicalTonelessPinyin(candidate.markedPinyin),
          ),
      ).map((candidate) => ({
        ...candidate,
        matchType: "surface-only",
        caseFolded: true,
      }));
    if (
      sourceMatches.length === 0
      && !allowedUnmatched.has(official.id)
    ) {
      throw new Error(
        `${official.id} ${official.word} ${official.pinyin} has no CC-CEDICT surface match`,
      );
    }
    const issueCodes = [];
    if (sourceMatches.length > 1) issueCodes.push("multiple-source-matches");
    if (sourceMatches.some((source) => source.matchType === "surface-only")) {
      issueCodes.push("source-pronunciation-drift");
    }
    if (sourceMatches.length === 0) issueCodes.push("source-coverage-gap");
    return {
      officialId: official.id,
      sequence: official.sequence,
      simplified: official.word,
      displayWord: official.displayWord,
      officialPinyin: official.pinyin,
      officialPartOfSpeech: official.partOfSpeech,
      sourceMatches,
      editorial: {
        vietnameseGloss: null,
        definitionReview: "pending",
        partOfSpeechReview: "pending",
        usageExampleReview: "pending",
        issueCodes,
      },
    };
  });

  const sourceMatchCount = entries.reduce(
    (total, entry) => total + entry.sourceMatches.length,
    0,
  );
  const multipleSourceMatchEntries = entries.filter(
    (entry) => entry.sourceMatches.length > 1,
  ).length;

  return {
    schemaVersion: 1,
    draftId,
    level,
    state: "draft",
    learnerVisible: false,
    releaseEligible: false,
    createdAt: descriptor.retrievedAt,
    sourceId: descriptor.sourceId,
    sourceSnapshotSha256: descriptor.snapshot.sha256,
    syllabusSourceId: inventory.sourceId,
    syllabusInventorySha256: inventorySha256,
    derivedArtifactLicense: descriptor.rights.derivedArtifactLicense,
    editorialPolicy: {
      sourceLanguage: "en",
      learnerLanguage: "vi",
      sourceSensesAreReviewedVietnamese: false,
      nativeReviewRequiredForRelease: true,
      examplesRequiredForRelease: true,
    },
    counts: {
      officialVocabulary: entries.length,
      sourceMatched: entries.filter(
        (entry) => entry.sourceMatches.length > 0,
      ).length,
      sourceMatches: sourceMatchCount,
      multipleSourceMatchEntries,
      pronunciationReviewPending: entries.filter(
        (entry) => entry.sourceMatches.some(
          (source) => source.matchType === "surface-only",
        ),
      ).length,
      vietnameseGlossReviewed: 0,
      releaseEligible: 0,
    },
    entries,
  };
};

export const buildHsk1VocabularyDraft = (options) =>
  buildVocabularyDraftForLevel({
    ...options,
    level: 1,
    draftId: "hsk1-vocabulary-2026.07.28",
  });

export const serializeHsk1VocabularyDraft = (draft) =>
  `${JSON.stringify(draft)}\n`;

export const loadHsk1VocabularyDraftBundle = (root = process.cwd()) => {
  const descriptorPath = join(root, HSK1_CEDICT_SOURCE_RELATIVE_PATH);
  const draftPath = join(root, HSK1_VOCABULARY_DRAFT_RELATIVE_PATH);
  const syllabus = loadHskSyllabusBundle(root);
  return {
    descriptorPath,
    draftPath,
    descriptor: readJson(descriptorPath),
    draft: readJson(draftPath),
    syllabus,
  };
};

const requireString = (errors, value, field, maxLength = 2_000) => {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > maxLength
  ) {
    errors.push(`${field} must be a non-empty string <= ${maxLength} chars`);
  }
};

export const validateVocabularyDraftBundleForLevel = ({
  descriptor,
  draft,
  syllabus,
}, {
  level,
  draftId,
  expectedCount,
  label,
  expectedUpstreamStatus,
  expectedFormat,
  allowedUnmatchedOfficialIds = [],
}) => {
  const errors = [];
  const allowedUnmatched = new Set(allowedUnmatchedOfficialIds);
  try {
    assertValidHskSyllabusBundle(syllabus);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return { valid: false, errors };
  }
  if (!isRecord(descriptor) || descriptor.schemaVersion !== 1) {
    return { valid: false, errors: ["CC-CEDICT descriptor schemaVersion must be 1"] };
  }
  if (!isRecord(draft) || draft.schemaVersion !== 1) {
    return {
      valid: false,
      errors: [`${label} vocabulary draft schemaVersion must be 1`],
    };
  }
  requireString(errors, descriptor.sourceId, "descriptor.sourceId", 120);
  if (
    descriptor.upstreamStatus !== expectedUpstreamStatus
    || descriptor.format !== expectedFormat
  ) {
    errors.push("CC-CEDICT upstream status and format must remain explicit");
  }
  if (
    descriptor.rights?.declaredLicense !== "CC-BY-SA-4.0"
    || descriptor.rights?.derivedArtifactLicense !== "CC-BY-SA-4.0"
    || descriptor.rights?.legalReview !== "pending"
  ) {
    errors.push("CC-CEDICT rights and pending legal review must remain explicit");
  }
  if (!DIGEST_PATTERN.test(descriptor.snapshot?.sha256 ?? "")) {
    errors.push("descriptor.snapshot.sha256 must be a canonical digest");
  }
  if (
    !Number.isInteger(descriptor.snapshot?.entryCount)
    || descriptor.snapshot.entryCount < 100_000
    || !Number.isInteger(descriptor.snapshot?.byteLength)
    || descriptor.snapshot.byteLength < 1
  ) {
    errors.push("descriptor snapshot metrics must be pinned");
  }
  if (
    draft.draftId !== draftId
    || draft.level !== level
    || draft.state !== "draft"
    || draft.learnerVisible !== false
    || draft.releaseEligible !== false
  ) {
    errors.push(`${label} source enrichment must remain draft and learner-hidden`);
  }
  if (
    draft.sourceId !== descriptor.sourceId
    || draft.sourceSnapshotSha256 !== descriptor.snapshot.sha256
    || draft.derivedArtifactLicense !== "CC-BY-SA-4.0"
  ) {
    errors.push("draft does not match the pinned CC-CEDICT source identity");
  }
  if (
    draft.syllabusSourceId !== syllabus.source.sourceId
    || draft.syllabusInventorySha256 !== syllabus.inventorySha256
  ) {
    errors.push("draft does not match the pinned HSK syllabus inventory");
  }
  if (
    draft.editorialPolicy?.sourceSensesAreReviewedVietnamese !== false
    || draft.editorialPolicy?.nativeReviewRequiredForRelease !== true
    || draft.editorialPolicy?.examplesRequiredForRelease !== true
  ) {
    errors.push("draft editorial release policy must remain fail-closed");
  }

  const officialEntries = syllabus.inventory.vocabulary.filter(
    (item) => item.level === level,
  );
  if (
    !Array.isArray(draft.entries)
    || draft.entries.length !== expectedCount
  ) {
    errors.push(
      `draft.entries must contain exactly ${expectedCount} ${label} vocabulary items`,
    );
  } else {
    for (const [index, entry] of draft.entries.entries()) {
      const official = officialEntries[index];
      if (
        !isRecord(entry)
        || entry.officialId !== official.id
        || entry.sequence !== official.sequence
        || entry.simplified !== official.word
        || entry.displayWord !== official.displayWord
        || entry.officialPinyin !== official.pinyin
        || entry.officialPartOfSpeech !== official.partOfSpeech
      ) {
        errors.push(`draft entry ${index + 1} does not match ${official.id}`);
        continue;
      }
      const variants = officialPinyinVariants(official.pinyin);
      if (!Array.isArray(entry.sourceMatches)) {
        errors.push(`${official.id} must have at least one source match`);
      } else if (
        entry.sourceMatches.length === 0
        && !allowedUnmatched.has(official.id)
      ) {
        errors.push(`${official.id} must have at least one source match`);
      } else {
        for (const [sourceIndex, source] of entry.sourceMatches.entries()) {
          const field = `${official.id}.sourceMatches[${sourceIndex}]`;
          requireString(errors, source.traditional, `${field}.traditional`, 80);
          if (source.simplified !== official.word) {
            errors.push(`${field}.simplified does not match the official word`);
          }
          requireString(errors, source.numberedPinyin, `${field}.numberedPinyin`, 120);
          const normalizeForMatch = (value) => {
            const normalized = canonicalMarkedPinyin(value);
            return source.caseFolded
              ? normalized.toLocaleLowerCase("en")
              : normalized;
          };
          const expectedVariants = new Set(variants.map(
            (variant) => source.caseFolded
              ? variant.toLocaleLowerCase("en")
              : variant,
          ));
          const lexicalMatches = expectedVariants.has(
            normalizeForMatch(source.markedPinyin ?? ""),
          );
          const sandhiMatches = expectedVariants.has(
            normalizeForMatch(source.standardSandhiPinyin ?? ""),
          );
          const surfaceMatches = variants.some(
            (variant) => canonicalTonelessPinyin(variant)
              === canonicalTonelessPinyin(source.markedPinyin ?? ""),
          );
          if (
            numberedPinyinToMarked(source.numberedPinyin) !== source.markedPinyin
            || numberedPinyinToStandardSandhiMarked(source.numberedPinyin)
              !== source.standardSandhiPinyin
            || (source.matchType === "lexical" && !lexicalMatches)
            || (source.matchType === "standard-sandhi" && !sandhiMatches)
            || (source.matchType === "surface-only" && !surfaceMatches)
            || !["lexical", "standard-sandhi", "surface-only"]
              .includes(source.matchType)
            || typeof source.caseFolded !== "boolean"
          ) {
            errors.push(`${field}.pinyin is not an exact official pronunciation`);
          }
          if (
            !Array.isArray(source.senses)
            || source.senses.length < 1
            || source.senses.some(
              (sense) => typeof sense !== "string"
                || sense.length < 1
                || sense.length > 2_000,
            )
          ) {
            errors.push(`${field}.senses must contain bounded source definitions`);
          }
          if (!DIGEST_PATTERN.test(source.sourceLineSha256 ?? "")) {
            errors.push(`${field}.sourceLineSha256 must be a canonical digest`);
          }
        }
      }
      const expectedIssues = [];
      if (entry.sourceMatches?.length > 1) {
        expectedIssues.push("multiple-source-matches");
      }
      if (entry.sourceMatches?.some(
        (source) => source.matchType === "surface-only",
      )) {
        expectedIssues.push("source-pronunciation-drift");
      }
      if (
        entry.sourceMatches?.length === 0
        && allowedUnmatched.has(official.id)
      ) {
        expectedIssues.push("source-coverage-gap");
      }
      if (
        entry.editorial?.vietnameseGloss !== null
        || entry.editorial?.definitionReview !== "pending"
        || entry.editorial?.partOfSpeechReview !== "pending"
        || entry.editorial?.usageExampleReview !== "pending"
        || JSON.stringify(entry.editorial?.issueCodes) !== JSON.stringify(expectedIssues)
      ) {
        errors.push(`${official.id} editorial state must remain pending`);
      }
    }
  }

  if (Array.isArray(draft.entries)) {
    const expectedCounts = {
      officialVocabulary: draft.entries.length,
      sourceMatched: draft.entries.filter(
        (entry) => entry.sourceMatches?.length > 0,
      ).length,
      sourceMatches: draft.entries.reduce(
        (total, entry) => total + (entry.sourceMatches?.length ?? 0),
        0,
      ),
      multipleSourceMatchEntries: draft.entries.filter(
        (entry) => entry.sourceMatches?.length > 1,
      ).length,
      pronunciationReviewPending: draft.entries.filter(
        (entry) => entry.sourceMatches?.some(
          (source) => source.matchType === "surface-only",
        ),
      ).length,
      vietnameseGlossReviewed: draft.entries.filter(
        (entry) => typeof entry.editorial?.vietnameseGloss === "string",
      ).length,
      releaseEligible: 0,
    };
    if (JSON.stringify(draft.counts) !== JSON.stringify(expectedCounts)) {
      errors.push("draft summary counts do not match its entries");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    counts: draft.counts,
  };
};

export const validateHsk1VocabularyDraftBundle = (bundle) =>
  validateVocabularyDraftBundleForLevel(bundle, {
    level: 1,
    draftId: "hsk1-vocabulary-2026.07.28",
    expectedCount: 300,
    label: "HSK1",
    expectedUpstreamStatus: "latest-non-verified-editor-export",
    expectedFormat: "cedict-v1-gzip",
  });

export const assertValidHsk1VocabularyDraftBundle = (bundle) => {
  const result = validateHsk1VocabularyDraftBundle(bundle);
  if (!result.valid) {
    throw new Error(`Invalid HSK1 vocabulary draft:\n- ${result.errors.join("\n- ")}`);
  }
  return result;
};
