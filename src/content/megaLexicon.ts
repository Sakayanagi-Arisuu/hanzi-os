export const MEGA_LEXICON_URL = "/content/mandarin-mega-lexicon-2026.08.1.json";
export const PATH_EXPANSION_INDEX_URL = "/content/mandarin-path-packs-2026.08.1.json";
export const MEGA_LEXICON_VERSION = "mandarin-mega-lexicon-2026.08.1";
export const MEGA_LEXICON_SEARCHABLE_COUNT = 119_048;
export const MEGA_LEXICON_INSTANT_BROWSE_COUNT = 11_093;
export const MEGA_LEXICON_LESSON_COUNT = 607;
export const MEGA_LEXICON_LOOKUP_SHARD_COUNT = 64;

export type MegaVocabularyItem = {
  id: string;
  simplified: string;
  traditional: string;
  pinyin: string;
  pinyinNumbered: string;
  meaning: string;
  senses: string[];
  classifiers: string[];
  partOfSpeech: string;
  referenceLevel: string;
  sourceId: string;
  editorialDepth: "reference" | "curated";
  example?: string;
  examplePinyin?: string;
  exampleMeaning?: string;
  themeId?: string;
};

export type MegaVocabularyMission = {
  id: string;
  level: string;
  sequence: number;
  title: string;
  objective: string;
  wordIds: string[];
};

export type MegaCuratedLesson = {
  id: string;
  title: string;
  chineseTitle: string;
  objective: string;
  wordIds: string[];
  grammar: {
    pattern: string;
    explanation: string;
    example: string;
    pinyin: string;
    meaning: string;
  };
  dialogue: Array<{
    speaker: string;
    chinese: string;
    pinyin: string;
    meaning: string;
  }>;
};

export type MegaLexiconArtifact = {
  schemaVersion: 1;
  contentVersion: string;
  disclosure: string;
  policy: {
    learnerVisibleForPersonalLocalStudy: boolean;
    humanReviewed: boolean;
    measurementEligible: boolean;
    masteryEligible: boolean;
    xpEligible: boolean;
  };
  stats: {
    sourceStandardRows: number;
    coreVocabulary: number;
    addedReferenceVocabulary: number;
    addedCuratedOutsideStandard: number;
    totalSearchableVocabulary: number;
    instantBrowseVocabulary: number;
    fullLookupVocabulary: number;
    lookupShards: number;
    vocabularyMissions: number;
    advancedVocabularyMissions: number;
    curatedLessons: number;
    coreLessons: number;
    totalLearnerVisibleLessons: number;
    pathIntegratedVocabulary: number;
    pathIntegratedLessons: number;
    advancedReferenceVocabulary: number;
  };
  levelStats: Array<{ level: string; vocabulary: number; missions: number }>;
  vocabulary: MegaVocabularyItem[];
  missions: MegaVocabularyMission[];
  curatedLessons: MegaCuratedLesson[];
  pathLessonPacks: Array<{
    lessonId: string;
    level: "1" | "2" | "3" | "4";
    wordIds: string[];
  }>;
};

let cachedArtifact: Promise<MegaLexiconArtifact> | null = null;
let cachedPathIndex: Promise<PathExpansionIndex> | null = null;
const cachedLookupShards = new Map<string, Promise<MegaVocabularyItem[]>>();

export type PathExpansionIndex = {
  schemaVersion: 1;
  contentVersion: string;
  stats: {
    integratedVocabulary: number;
    integratedLessons: number;
    advancedReferenceVocabulary: number;
  };
  lessonPacks: Array<{
    lessonId: string;
    level: "1" | "2" | "3" | "4";
    wordCount: number;
  }>;
};

const validateArtifact = (artifact: MegaLexiconArtifact) => {
  if (
    artifact.schemaVersion !== 1
    || artifact.contentVersion !== MEGA_LEXICON_VERSION
    || artifact.stats.totalSearchableVocabulary !== MEGA_LEXICON_SEARCHABLE_COUNT
    || artifact.stats.instantBrowseVocabulary !== MEGA_LEXICON_INSTANT_BROWSE_COUNT
    || artifact.stats.lookupShards !== MEGA_LEXICON_LOOKUP_SHARD_COUNT
    || artifact.stats.totalLearnerVisibleLessons !== MEGA_LEXICON_LESSON_COUNT
    || artifact.policy.learnerVisibleForPersonalLocalStudy !== true
    || artifact.policy.humanReviewed !== false
    || artifact.policy.measurementEligible !== false
    || artifact.policy.masteryEligible !== false
    || artifact.policy.xpEligible !== false
    || artifact.pathLessonPacks.length !== 213
    || artifact.pathLessonPacks.reduce((sum, pack) => sum + pack.wordIds.length, 0) !== 1_459
  ) {
    throw new Error("Kho mở rộng không vượt qua kiểm tra phiên bản và quyền sử dụng.");
  }
  return artifact;
};

export const getLessonExpansionPack = (
  artifact: MegaLexiconArtifact,
  lessonId: string,
) => {
  const pack = artifact.pathLessonPacks.find((candidate) => candidate.lessonId === lessonId);
  if (!pack) return null;
  const wordsById = new Map(artifact.vocabulary.map((word) => [word.id, word]));
  return {
    ...pack,
    words: pack.wordIds
      .map((wordId) => wordsById.get(wordId))
      .filter((word): word is MegaVocabularyItem => Boolean(word)),
  };
};

export const getLessonIdForMegaWord = (
  artifact: MegaLexiconArtifact,
  wordId: string,
) => artifact.pathLessonPacks.find((pack) => pack.wordIds.includes(wordId))?.lessonId ?? null;

export const loadMegaLexicon = () => {
  cachedArtifact ??= fetch(MEGA_LEXICON_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Không thể tải kho mở rộng (${response.status}).`);
      return response.json() as Promise<MegaLexiconArtifact>;
    })
    .then(validateArtifact)
    .catch((error: unknown) => {
      cachedArtifact = null;
      throw error;
    });
  return cachedArtifact;
};

export const loadPathExpansionIndex = () => {
  cachedPathIndex ??= fetch(PATH_EXPANSION_INDEX_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Không thể tải chỉ mục Thiên Lộ (${response.status}).`);
      return response.json() as Promise<PathExpansionIndex>;
    })
    .then((index) => {
      if (
        index.schemaVersion !== 1
        || index.contentVersion !== MEGA_LEXICON_VERSION
        || index.stats.integratedVocabulary !== 1_459
        || index.stats.integratedLessons !== 213
      ) throw new Error("Chỉ mục Thiên Lộ không khớp phiên bản nội dung.");
      return index;
    })
    .catch((error: unknown) => {
      cachedPathIndex = null;
      throw error;
    });
  return cachedPathIndex;
};

const lookupShardId = (surface: string) => String(
  (surface.codePointAt(0) ?? 0) % MEGA_LEXICON_LOOKUP_SHARD_COUNT,
).padStart(2, "0");

export const loadMegaLookupShard = (surface: string) => {
  const id = lookupShardId(surface);
  const existing = cachedLookupShards.get(id);
  if (existing) return existing;
  const pending = fetch(`/content/${MEGA_LEXICON_VERSION}/lookup-${id}.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`Không thể tải mảnh Tàng Tự Khố (${response.status}).`);
      return response.json() as Promise<{
        schemaVersion: 1;
        contentVersion: string;
        bucket: string;
        entries: MegaVocabularyItem[];
      }>;
    })
    .then((artifact) => {
      if (
        artifact.schemaVersion !== 1
        || artifact.contentVersion !== MEGA_LEXICON_VERSION
        || artifact.bucket !== id
        || !Array.isArray(artifact.entries)
      ) throw new Error("Mảnh Tàng Tự Khố không khớp phiên bản nội dung.");
      return artifact.entries;
    })
    .catch((error: unknown) => {
      cachedLookupShards.delete(id);
      throw error;
    });
  cachedLookupShards.set(id, pending);
  return pending;
};

export const lookupMegaVocabulary = async (surface: string) => {
  const normalized = surface.trim();
  if (!normalized) return null;
  const entries = await loadMegaLookupShard(normalized);
  return entries.find((entry) => entry.simplified === normalized) ?? null;
};

export const searchMegaVocabularyByHanzi = async (
  query: string,
  limit = 320,
) => {
  const normalized = query.trim();
  if (!normalized || !/\p{Script=Han}/u.test(normalized)) return [];
  const entries = await loadMegaLookupShard(normalized);
  return entries
    .filter((entry) => entry.simplified.includes(normalized))
    .sort((left, right) => Number(right.simplified === normalized) - Number(left.simplified === normalized)
      || Number(right.simplified.startsWith(normalized)) - Number(left.simplified.startsWith(normalized))
      || left.simplified.length - right.simplified.length)
    .slice(0, limit);
};
