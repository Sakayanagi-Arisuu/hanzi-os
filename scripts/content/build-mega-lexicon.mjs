import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADVANCED_EXTENSION_GROUPS,
  ADVANCED_EXTENSION_VERSION,
} from "../../content/editorial/advanced-extension-2026.08.1.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT_PATH = join(ROOT, "public/content/mandarin-mega-lexicon-2026.08.1.json");
const PATH_INDEX_OUTPUT = join(ROOT, "public/content/mandarin-path-packs-2026.08.1.json");
const LOOKUP_OUTPUT_DIR = join(ROOT, "public/content/mandarin-mega-lexicon-2026.08.1");
const LOOKUP_INDEX_OUTPUT = join(LOOKUP_OUTPUT_DIR, "lookup-index.json");
const LOOKUP_SHARD_COUNT = 64;
const SOURCE_DIR = join(ROOT, "content/sources/mandarin-mega-lexicon-2026.08.1");
const SOURCE_METADATA_PATH = join(SOURCE_DIR, "source.json");
const ATTRIBUTION_PATH = join(SOURCE_DIR, "ATTRIBUTION.md");
const CORE_CATALOG_PATH = join(
  ROOT,
  "content/packages/foundation-2026.08.7/runtime-catalog.json",
);

const HSK_SOURCE = {
  url: "https://raw.githubusercontent.com/ivankra/hsk30/4ff9e3915ce87baaecd7ebe263085573a4ea3192/hsk30.csv",
  revision: "4ff9e3915ce87baaecd7ebe263085573a4ea3192",
  license: "MIT",
  expectedSha256: "8c2b73f74776240bcf154624730fc6fb2c42c254d5c5d0f88943878b8e575b9b",
};

const CVDICT_SOURCE = {
  url: "https://raw.githubusercontent.com/ph0ngp/CVDICT/c379d909e308343a247e51619f7839a2060a271c/CVDICT.u8",
  revision: "c379d909e308343a247e51619f7839a2060a271c",
  license: "CC BY-SA 4.0",
  expectedSha256: "4dde4b204193efa9c192d7f7daeab1bb579c8ccd7c41ed90d1b6caee22ba0948",
};

// Five modern compounds landed in the 2026-08-21 CC-CEDICT snapshot after the
// pinned CVDICT translation. Their Vietnamese glosses live in the editorial
// file; this table only preserves the source spelling and pronunciation.
const CURATED_CEDICT_FALLBACKS = new Map(Object.entries({
  "取件": ["取件", "qu3jian4"],
  "垃圾分类": ["垃圾分類", "la1ji1fen1lei4"],
  "租车": ["租車", "zu1che1"],
  "充电站": ["充電站", "chong1dian4zhan4"],
  "评论区": ["評論區", "ping2lun4qu1"],
}));

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalJson = (value) => `${JSON.stringify(value)}\n`;

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/u, ""));
    rows.push(row);
  }
  const [headers, ...values] = rows;
  return values
    .filter((value) => value.some(Boolean))
    .map((value) => Object.fromEntries(headers.map((header, index) => [header, value[index] ?? ""])));
};

const normalizeNumberedPinyin = (value) => value
  .replace(/u:/giu, "v")
  .replace(/[\s'’.-]/gu, "")
  .toLocaleLowerCase("en");

const cleanDisplayWord = (row) => {
  if (row.Variants) {
    try {
      const variants = JSON.parse(row.Variants);
      if (variants[0]?.Simplified) return variants[0].Simplified.replace(/[0-9]+$/u, "");
    } catch {
      // Fall back to the official surface below; malformed source is caught by
      // the row-count and output validator.
    }
  }
  return row.Simplified.replace(/[0-9]+$/u, "");
};

const firstTraditional = (row, displayWord) => {
  if (row.Variants) {
    try {
      const variants = JSON.parse(row.Variants);
      const matching = variants.find((variant) => variant.Simplified === displayWord) ?? variants[0];
      if (matching?.Traditional) return matching.Traditional;
    } catch {
      // Fall through to the primary field.
    }
  }
  return (row.Traditional.split("|")[0] || displayWord).replace(/[0-9]+$/u, "");
};

const cedictPronunciations = (row, displayWord) => {
  const matches = [...row.CEDICT.matchAll(/([^/|]+)\|([^[]+)\[([^\]]+)\]/gu)];
  const exact = matches.filter((match) => match[2] === displayWord);
  return (exact.length ? exact : matches).map((match) => match[3]);
};

const parseCvdict = (text) => {
  const bySurface = new Map();
  const bySurfaceAndPinyin = new Map();
  for (const line of text.split(/\r?\n/gu)) {
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/$/u);
    if (!match) continue;
    const rawSenses = match[4]
      .split("/")
      .map((sense) => sense.trim())
      .filter(Boolean);
    const senses = rawSenses.filter((sense) => !/^(LT|CL):/iu.test(sense));
    const classifiers = rawSenses
      .filter((sense) => /^(LT|CL):/iu.test(sense))
      .flatMap((sense) => sense.replace(/^(LT|CL):\s*/iu, "").split(/[,，;；]/u))
      .map((classifier) => classifier.trim())
      .filter(Boolean);
    if (!senses.length) continue;
    const entry = {
      traditional: match[1],
      simplified: match[2],
      pinyinNumbered: normalizeNumberedPinyin(match[3]),
      senses,
      classifiers,
    };
    const surfaceEntries = bySurface.get(entry.simplified) ?? [];
    surfaceEntries.push(entry);
    bySurface.set(entry.simplified, surfaceEntries);
    const key = `${entry.simplified}|${entry.pinyinNumbered}`;
    const pronunciationEntries = bySurfaceAndPinyin.get(key) ?? [];
    pronunciationEntries.push(entry);
    bySurfaceAndPinyin.set(key, pronunciationEntries);
  }
  return { bySurface, bySurfaceAndPinyin };
};

const dictionarySenses = (entries, limit = 8) => {
  const seen = new Set();
  const senses = [];
  for (const entry of entries) {
    for (const sense of entry.senses) {
      const normalized = sense.replace(/\s+/gu, " ").trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      senses.push(normalized);
      if (senses.length === limit) return senses;
    }
  }
  return senses;
};

const dictionaryClassifiers = (entries, limit = 6) => [...new Set(
  entries.flatMap((entry) => entry.classifiers ?? []),
)].slice(0, limit);

const compactMeaning = (entries) => {
  const senses = dictionarySenses(entries, 4);
  const joined = senses.join("; ");
  return joined.length <= 320 ? joined : `${joined.slice(0, 317).trimEnd()}…`;
};

const lookupShardId = (surface) => {
  const codePoint = surface.codePointAt(0) ?? 0;
  return String(codePoint % LOOKUP_SHARD_COUNT).padStart(2, "0");
};

const buildLookupShards = (cvdict) => {
  const shards = new Map(
    Array.from({ length: LOOKUP_SHARD_COUNT }, (_, index) => [String(index).padStart(2, "0"), []]),
  );
  for (const [simplified, entries] of cvdict.bySurface) {
    const senses = dictionarySenses(entries);
    if (!senses.length) continue;
    shards.get(lookupShardId(simplified)).push({
      id: `cvdict-${[...simplified].map((character) => character.codePointAt(0).toString(16)).join("-")}`,
      simplified,
      traditional: entries[0]?.traditional ?? simplified,
      pinyin: rowPinyinFromNumbered(entries[0]?.pinyinNumbered ?? ""),
      pinyinNumbered: entries[0]?.pinyinNumbered ?? "",
      meaning: compactMeaning(entries),
      senses,
      classifiers: dictionaryClassifiers(entries),
      partOfSpeech: "từ/cụm từ",
      referenceLevel: "CVDICT",
      sourceId: "cvdict",
      editorialDepth: "reference",
    });
  }
  for (const entries of shards.values()) {
    entries.sort((left, right) => left.simplified.localeCompare(right.simplified, "zh-CN"));
  }
  return shards;
};

const findCvdictEntries = (index, simplified, pronunciations = []) => {
  for (const pronunciation of pronunciations) {
    const exact = index.bySurfaceAndPinyin.get(
      `${simplified}|${normalizeNumberedPinyin(pronunciation)}`,
    );
    if (exact?.length) return exact;
  }
  return index.bySurface.get(simplified) ?? [];
};

const posVi = (value) => {
  const mapping = {
    N: "danh từ",
    V: "động từ",
    Adj: "tính từ",
    Adv: "phó từ",
    Pron: "đại từ",
    Num: "số từ",
    M: "lượng từ",
    Prep: "giới từ",
    Conj: "liên từ",
    Aux: "trợ từ",
    Int: "thán từ",
    Prefix: "tiền tố",
    Suffix: "hậu tố",
    Phonetic: "từ tượng thanh",
  };
  const translated = value
    .split("/")
    .map((part) => mapping[part] ?? part)
    .filter(Boolean);
  return translated.length ? translated.join("/") : "từ/cụm từ";
};

const fetchVerifiedText = async (source) => {
  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`Cannot fetch ${source.url}: ${response.status}`);
  const text = await response.text();
  const digest = sha256(text);
  if (digest !== source.expectedSha256) {
    throw new Error(`Source hash mismatch for ${source.url}: ${digest}`);
  }
  return text;
};

const levelLabel = (level) => level === "7-9" ? "Nâng cao 7–9" : `Cấp ${level}`;

const HSK1_UNIT_IDS = new Set([
  "characters",
  "daily",
  "hsk1-time-place-events",
  "journey",
  "professional",
  "survival",
]);

const lessonLevel = (lesson) => {
  if (lesson.id.startsWith("hsk4-")) return "4";
  if (lesson.id.startsWith("hsk3-")) return "3";
  if (lesson.id.startsWith("hsk2-")) return "2";
  if (lesson.id.startsWith("hsk1-") || HSK1_UNIT_IDS.has(lesson.unitId)) return "1";
  return null;
};

const vietnameseTokens = (value) => new Set(
  value.toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .split(/[^a-zđ]+/u)
    .filter((token) => token.length >= 4),
);

const buildPathLessonPacks = (vocabulary, coreCatalog) => {
  const coreWordById = new Map(coreCatalog.vocabulary.map((item) => [item.id, item]));
  const packs = [];
  for (const level of ["1", "2", "3", "4"]) {
    const lessons = coreCatalog.lessons
      .filter((lesson) => lessonLevel(lesson) === level)
      .map((lesson) => {
        const coreWords = lesson.wordIds
          .map((wordId) => coreWordById.get(wordId))
          .filter(Boolean);
        return {
          lessonId: lesson.id,
          level,
          wordIds: [],
          characterSet: new Set(coreWords.flatMap((word) => [...word.simplified])),
          meaningTokens: vietnameseTokens([
            lesson.title,
            lesson.objective,
            ...coreWords.flatMap((word) => [word.meaning, ...(word.tags ?? [])]),
          ].join(" ")),
        };
      });
    const candidates = vocabulary.filter((item) => item.referenceLevel === level);
    const softCapacity = Math.ceil(candidates.length / lessons.length);
    for (const item of candidates) {
      const itemCharacters = [...item.simplified];
      const itemMeaningTokens = vietnameseTokens(item.meaning);
      const scored = lessons.map((lesson, index) => {
        const sharedCharacters = itemCharacters.filter((character) => lesson.characterSet.has(character)).length;
        const sharedMeaning = [...itemMeaningTokens].filter((token) => lesson.meaningTokens.has(token)).length;
        const overCapacity = lesson.wordIds.length >= softCapacity ? 1 : 0;
        return {
          lesson,
          index,
          score: (sharedCharacters * 8) + (sharedMeaning * 3) - (lesson.wordIds.length * 0.35) - (overCapacity * 4),
        };
      }).sort((left, right) => right.score - left.score || left.index - right.index);
      scored[0].lesson.wordIds.push(item.id);
    }
    for (const emptyLesson of lessons.filter((lesson) => lesson.wordIds.length === 0)) {
      const donor = lessons
        .filter((lesson) => lesson.wordIds.length > 1)
        .toSorted((left, right) => right.wordIds.length - left.wordIds.length)[0];
      const donatedWordId = donor?.wordIds.pop();
      if (!donatedWordId) throw new Error(`Cannot balance Path vocabulary pack for ${emptyLesson.lessonId}`);
      emptyLesson.wordIds.push(donatedWordId);
    }
    packs.push(...lessons.map(({ characterSet: _characterSet, meaningTokens: _meaningTokens, ...pack }) => pack));
  }
  return packs;
};

const buildArtifact = async () => {
  const [hskText, cvdictText, coreCatalogText] = await Promise.all([
    fetchVerifiedText(HSK_SOURCE),
    fetchVerifiedText(CVDICT_SOURCE),
    readFile(CORE_CATALOG_PATH, "utf8"),
  ]);
  const hskRows = parseCsv(hskText);
  if (hskRows.length !== 11_092) throw new Error(`Expected 11092 HSK rows, got ${hskRows.length}`);
  const coreCatalog = JSON.parse(coreCatalogText);
  const coreSurfaces = new Set(coreCatalog.vocabulary.map((item) => item.simplified));
  const cvdict = parseCvdict(cvdictText);
  const curatedBySurface = new Map(
    ADVANCED_EXTENSION_GROUPS.flatMap((group) => group.entries.map((entry) => [entry[0], { group, entry }])),
  );
  const vocabulary = [];
  const includedSurfaces = new Set(coreSurfaces);

  for (const row of hskRows) {
    const simplified = cleanDisplayWord(row);
    if (coreSurfaces.has(simplified)) continue;
    const traditional = firstTraditional(row, simplified);
    const sourceEntries = findCvdictEntries(cvdict, simplified, cedictPronunciations(row, simplified));
    const curated = curatedBySurface.get(simplified);
    const sourceMeaning = compactMeaning(sourceEntries);
    const meaning = curated?.entry[1] ?? sourceMeaning;
    if (!meaning) continue;
    const pinyinNumbered = cedictPronunciations(row, simplified)[0]
      ? normalizeNumberedPinyin(cedictPronunciations(row, simplified)[0])
      : sourceEntries[0]?.pinyinNumbered ?? "";
    vocabulary.push({
      id: `mega-${row.ID.toLocaleLowerCase("en")}`,
      simplified,
      traditional: sourceEntries[0]?.traditional ?? traditional,
      pinyin: row.Pinyin.split("|")[0],
      pinyinNumbered,
      meaning,
      senses: curated ? [curated.entry[1], ...dictionarySenses(sourceEntries)].filter((sense, index, all) => all.indexOf(sense) === index).slice(0, 8) : dictionarySenses(sourceEntries),
      classifiers: dictionaryClassifiers(sourceEntries),
      partOfSpeech: curated?.entry[2] ?? posVi(row.POS),
      referenceLevel: row.Level,
      sourceId: row.ID,
      editorialDepth: curated ? "curated" : "reference",
      ...(curated ? {
        example: curated.entry[3],
        examplePinyin: curated.entry[4],
        exampleMeaning: curated.entry[5],
        themeId: curated.group.id,
      } : {}),
    });
    includedSurfaces.add(simplified);
  }

  for (const group of ADVANCED_EXTENSION_GROUPS) {
    for (const entry of group.entries) {
      if (includedSurfaces.has(entry[0])) continue;
      const sourceEntries = findCvdictEntries(cvdict, entry[0]);
      const fallback = CURATED_CEDICT_FALLBACKS.get(entry[0]);
      if (!sourceEntries.length && !fallback) throw new Error(`No dictionary source for curated entry ${entry[0]}`);
      const sourceEntry = sourceEntries[0] ?? {
        traditional: fallback[0],
        pinyinNumbered: fallback[1],
      };
      vocabulary.push({
        id: `mega-curated-${[...entry[0]].map((character) => character.codePointAt(0).toString(16)).join("-")}`,
        simplified: entry[0],
        traditional: sourceEntry.traditional,
        pinyin: rowPinyinFromNumbered(sourceEntry.pinyinNumbered),
        pinyinNumbered: sourceEntry.pinyinNumbered,
        meaning: entry[1],
        senses: [entry[1], ...dictionarySenses(sourceEntries)].filter((sense, index, all) => all.indexOf(sense) === index).slice(0, 8),
        classifiers: dictionaryClassifiers(sourceEntries),
        partOfSpeech: entry[2],
        referenceLevel: "mở rộng",
        sourceId: `curated-${group.id}`,
        editorialDepth: "curated",
        example: entry[3],
        examplePinyin: entry[4],
        exampleMeaning: entry[5],
        themeId: group.id,
      });
      includedSurfaces.add(entry[0]);
    }
  }

  const hskVocabulary = vocabulary.filter((item) => item.sourceId.startsWith("L"));
  const pathLessonPacks = buildPathLessonPacks(hskVocabulary, coreCatalog);
  const missions = [];
  for (const level of ["1", "2", "3", "4", "5", "6", "7-9"]) {
    const items = hskVocabulary.filter((item) => item.referenceLevel === level);
    for (let index = 0; index < items.length; index += 20) {
      const sequence = Math.floor(index / 20) + 1;
      missions.push({
        id: `mega-${level.replace("-", "")}-${String(sequence).padStart(3, "0")}`,
        level,
        sequence,
        title: `${levelLabel(level)} · Chặng từ vựng ${String(sequence).padStart(2, "0")}`,
        objective: "Nhận diện, nghe và tự kiểm tra 20 mục từ theo thứ tự tham chiếu.",
        wordIds: items.slice(index, index + 20).map((item) => item.id),
      });
    }
  }

  const curatedLessons = ADVANCED_EXTENSION_GROUPS.map((group) => ({
    id: `curated-${group.id}`,
    title: group.titleVi,
    chineseTitle: group.titleZh,
    objective: group.objectiveVi,
    wordIds: group.entries.map((entry) => {
      const item = vocabulary.find((candidate) => candidate.simplified === entry[0]);
      if (!item) throw new Error(`Curated word ${entry[0]} missing from vocabulary`);
      return item.id;
    }),
    grammar: {
      pattern: group.grammar[0],
      explanation: group.grammar[1],
      example: group.grammar[2],
      pinyin: group.grammar[3],
      meaning: group.grammar[4],
    },
    dialogue: group.dialogue.map(([speaker, chinese, pinyin, meaning]) => ({
      speaker,
      chinese,
      pinyin,
      meaning,
    })),
  }));

  const cvdictRows = cvdictText.split(/\r?\n/gu).filter((line) => line && !line.startsWith("#")).length;
  const lookupShards = buildLookupShards(cvdict);
  const fullLookupVocabulary = [...lookupShards.values()].reduce((sum, entries) => sum + entries.length, 0);
  const searchableSurfaces = new Set([
    ...coreSurfaces,
    ...vocabulary.map((item) => item.simplified),
    ...[...lookupShards.values()].flatMap((entries) => entries.map((entry) => entry.simplified)),
  ]);
  const artifact = {
    schemaVersion: 1,
    contentVersion: "mandarin-mega-lexicon-2026.08.1",
    state: "learner-visible-reference-beta",
    disclosure: "Kho tham chiếu mở rộng do máy hỗ trợ đối chiếu; 112 mục và 9 chuyên đề đã được biên tập sâu, phần còn lại cần tiếp tục duyệt ngôn ngữ.",
    policy: {
      learnerVisibleForPersonalLocalStudy: true,
      humanReviewed: false,
      measurementEligible: false,
      masteryEligible: false,
      xpEligible: false,
      productionEligible: false,
      sitesAuthorized: false,
    },
    stats: {
      sourceStandardRows: hskRows.length,
      coreVocabulary: coreCatalog.vocabulary.length,
      addedReferenceVocabulary: hskVocabulary.length,
      addedCuratedOutsideStandard: vocabulary.length - hskVocabulary.length,
      totalSearchableVocabulary: searchableSurfaces.size,
      instantBrowseVocabulary: coreCatalog.vocabulary.length + vocabulary.length,
      fullLookupVocabulary,
      lookupShards: LOOKUP_SHARD_COUNT,
      vocabularyMissions: missions.length,
      advancedVocabularyMissions: missions.filter((mission) => ["5", "6", "7-9"].includes(mission.level)).length,
      curatedLessons: curatedLessons.length,
      coreLessons: coreCatalog.lessons.length,
      totalLearnerVisibleLessons: coreCatalog.lessons.length
        + missions.filter((mission) => ["5", "6", "7-9"].includes(mission.level)).length
        + curatedLessons.length,
      cvdictRows,
      pathIntegratedVocabulary: pathLessonPacks.reduce((sum, pack) => sum + pack.wordIds.length, 0),
      pathIntegratedLessons: pathLessonPacks.length,
      advancedReferenceVocabulary: vocabulary.filter((item) => ["5", "6", "7-9", "mở rộng"].includes(item.referenceLevel)).length,
    },
    levelStats: ["1", "2", "3", "4", "5", "6", "7-9"].map((level) => ({
      level,
      vocabulary: hskVocabulary.filter((item) => item.referenceLevel === level).length,
      missions: missions.filter((mission) => mission.level === level).length,
    })),
    sources: {
      standard: { ...HSK_SOURCE, rows: hskRows.length },
      vietnameseDictionary: { ...CVDICT_SOURCE, rows: cvdictRows },
      editorialVersion: ADVANCED_EXTENSION_VERSION,
    },
    vocabulary,
    missions,
    curatedLessons,
    pathLessonPacks,
  };
  return { artifact, hskText, cvdictText, lookupShards };
};

const TONE_MARKS = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
};

function rowPinyinFromNumbered(value) {
  return value.replace(/([a-züv:]+)([1-5])/giu, (_, raw, rawTone) => {
    const tone = Number(rawTone);
    const spelling = raw.replace(/u:/giu, "ü").replace(/v/giu, "ü");
    if (tone === 5) return spelling;
    const lower = spelling.toLocaleLowerCase("en");
    let target = lower.indexOf("a");
    if (target < 0) target = lower.indexOf("e");
    if (target < 0 && lower.includes("ou")) target = lower.indexOf("o");
    if (target < 0) {
      for (let index = lower.length - 1; index >= 0; index -= 1) {
        if ("aeiouü".includes(lower[index])) { target = index; break; }
      }
    }
    const marked = target >= 0 ? TONE_MARKS[lower[target]]?.[tone - 1] : null;
    return marked
      ? `${spelling.slice(0, target)}${marked}${spelling.slice(target + 1)}`
      : spelling;
  });
}

const main = async () => {
  const check = process.argv.includes("--check");
  const { artifact, lookupShards } = await buildArtifact();
  const output = canonicalJson(artifact);
  const pathIndexOutput = canonicalJson({
    schemaVersion: 1,
    contentVersion: artifact.contentVersion,
    stats: {
      integratedVocabulary: artifact.stats.pathIntegratedVocabulary,
      integratedLessons: artifact.stats.pathIntegratedLessons,
      advancedReferenceVocabulary: artifact.stats.advancedReferenceVocabulary,
    },
    lessonPacks: artifact.pathLessonPacks.map((pack) => ({
      lessonId: pack.lessonId,
      level: pack.level,
      wordCount: pack.wordIds.length,
    })),
  });
  const lookupIndexOutput = canonicalJson({
    schemaVersion: 1,
    contentVersion: artifact.contentVersion,
    shardCount: LOOKUP_SHARD_COUNT,
    totalEntries: artifact.stats.fullLookupVocabulary,
    totalSearchableVocabulary: artifact.stats.totalSearchableVocabulary,
    buckets: [...lookupShards].map(([id, entries]) => ({ id, entries: entries.length })),
  });
  if (check) {
    const current = await readFile(OUTPUT_PATH, "utf8");
    if (current !== output) throw new Error(`${OUTPUT_PATH} is stale; rebuild it`);
    const currentPathIndex = await readFile(PATH_INDEX_OUTPUT, "utf8");
    if (currentPathIndex !== pathIndexOutput) throw new Error(`${PATH_INDEX_OUTPUT} is stale; rebuild it`);
    const currentLookupIndex = await readFile(LOOKUP_INDEX_OUTPUT, "utf8");
    if (currentLookupIndex !== lookupIndexOutput) throw new Error(`${LOOKUP_INDEX_OUTPUT} is stale; rebuild it`);
    for (const [id, entries] of lookupShards) {
      const path = join(LOOKUP_OUTPUT_DIR, `lookup-${id}.json`);
      const current = await readFile(path, "utf8");
      const expected = canonicalJson({
        schemaVersion: 1,
        contentVersion: artifact.contentVersion,
        bucket: id,
        entries,
      });
      if (current !== expected) throw new Error(`${path} is stale; rebuild it`);
    }
    console.log(`Mega lexicon is current: ${artifact.stats.totalSearchableVocabulary} words, ${artifact.stats.totalLearnerVisibleLessons} lesson experiences.`);
    return;
  }
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await mkdir(SOURCE_DIR, { recursive: true });
  await mkdir(LOOKUP_OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_PATH, output, "utf8");
  await writeFile(PATH_INDEX_OUTPUT, pathIndexOutput, "utf8");
  await writeFile(LOOKUP_INDEX_OUTPUT, lookupIndexOutput, "utf8");
  await Promise.all([...lookupShards].map(([id, entries]) => writeFile(
    join(LOOKUP_OUTPUT_DIR, `lookup-${id}.json`),
    canonicalJson({
      schemaVersion: 1,
      contentVersion: artifact.contentVersion,
      bucket: id,
      entries,
    }),
    "utf8",
  )));
  await writeFile(SOURCE_METADATA_PATH, canonicalJson({
    contentVersion: artifact.contentVersion,
    retrievedAt: "2026-08-21",
    sources: artifact.sources,
    policy: artifact.policy,
    stats: artifact.stats,
  }), "utf8");
  await writeFile(ATTRIBUTION_PATH, `# Ghi công kho từ mở rộng\n\n- Danh sách phân bậc: [ivankra/hsk30](https://github.com/ivankra/hsk30), bản \`${HSK_SOURCE.revision}\`, giấy phép MIT; dữ liệu được đối chiếu từ tài liệu chuẩn của Bộ Giáo dục Trung Quốc.\n- Nghĩa tiếng Việt, Pinyin và phồn thể tham chiếu: [CVDICT của Phong Phan](https://github.com/ph0ngp/CVDICT), bản \`${CVDICT_SOURCE.revision}\`, giấy phép CC BY-SA 4.0; CVDICT được chuyển dịch từ CC-CEDICT.\n- 112 mục từ và 9 chuyên đề thực dụng: biên tập có hỗ trợ AI trong HANZI.OS, \`humanReviewed: false\` cho đến khi một biên tập viên ngôn ngữ duyệt thật.\n\nArtifact dẫn xuất chứa nghĩa CVDICT tiếp tục được phân phối theo CC BY-SA 4.0. Không dùng số mục từ hoặc số ải luyện làm bằng chứng mastery.\n`, "utf8");
  console.log(`Built ${OUTPUT_PATH}`);
  console.log(JSON.stringify(artifact.stats, null, 2));
};

await main();
