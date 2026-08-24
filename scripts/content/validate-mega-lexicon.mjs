import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const artifact = JSON.parse(await readFile(
  resolve(root, "public/content/mandarin-mega-lexicon-2026.08.1.json"),
  "utf8",
));
const lookupRoot = resolve(root, "public/content/mandarin-mega-lexicon-2026.08.1");
const lookupIndex = JSON.parse(await readFile(resolve(lookupRoot, "lookup-index.json"), "utf8"));

const fail = (message) => { throw new Error(message); };
const unique = (values) => new Set(values).size === values.length;

if (artifact.schemaVersion !== 1) fail("Unexpected schema version");
if (artifact.contentVersion !== "mandarin-mega-lexicon-2026.08.1") fail("Unexpected content version");
if (artifact.policy.humanReviewed !== false) fail("Corpus must remain humanReviewed=false");
for (const key of ["measurementEligible", "masteryEligible", "xpEligible", "productionEligible", "sitesAuthorized"]) {
  if (artifact.policy[key] !== false) fail(`${key} must fail closed`);
}
if (artifact.stats.sourceStandardRows !== 11_092) fail("HSK source row count changed");
if (artifact.stats.coreVocabulary !== 2_016) fail("Core vocabulary inventory changed");
if (artifact.stats.coreLessons !== 217) fail("Core lesson inventory changed");
if (artifact.stats.addedReferenceVocabulary < 9_000) fail("Reference vocabulary expansion is too small");
if (artifact.stats.totalSearchableVocabulary !== 119_048) fail("Searchable vocabulary inventory changed");
if (artifact.stats.instantBrowseVocabulary !== 11_093) fail("Instant browse inventory changed");
if (artifact.stats.fullLookupVocabulary !== 119_043) fail("Full lookup inventory changed");
if (artifact.stats.lookupShards !== 64) fail("Lookup shard count changed");
if (artifact.stats.cvdictRows !== 122_597) fail("CVDICT source row count changed");
if (artifact.stats.vocabularyMissions < 450) fail("Vocabulary mission target not reached");
if (artifact.stats.curatedLessons !== 9) fail("Curated lesson count changed");
if (artifact.stats.pathIntegratedVocabulary !== 1_459) fail("HSK1-4 Path vocabulary integration changed");
if (artifact.stats.pathIntegratedLessons !== 213) fail("Path lesson pack count changed");
if (artifact.stats.advancedVocabularyMissions !== 381) fail("Advanced mission count changed");
if (artifact.stats.totalLearnerVisibleLessons !== 607) fail("Integrated learner experience count changed");
if (artifact.vocabulary.length !== artifact.stats.addedReferenceVocabulary + artifact.stats.addedCuratedOutsideStandard) fail("Vocabulary stats mismatch");
if (artifact.missions.length !== artifact.stats.vocabularyMissions) fail("Mission stats mismatch");
if (artifact.curatedLessons.length !== artifact.stats.curatedLessons) fail("Curated lesson stats mismatch");
if (!unique(artifact.vocabulary.map((item) => item.id))) fail("Duplicate vocabulary IDs");
if (!unique(artifact.missions.map((item) => item.id))) fail("Duplicate mission IDs");
if (!unique(artifact.curatedLessons.map((item) => item.id))) fail("Duplicate curated lesson IDs");

if (lookupIndex.schemaVersion !== 1) fail("Unexpected lookup index schema version");
if (lookupIndex.contentVersion !== artifact.contentVersion) fail("Lookup index content version mismatch");
if (lookupIndex.shardCount !== 64 || lookupIndex.buckets.length !== 64) fail("Lookup index must declare 64 shards");
if (lookupIndex.totalEntries !== artifact.stats.fullLookupVocabulary) fail("Lookup index entry count mismatch");
if (lookupIndex.totalSearchableVocabulary !== artifact.stats.totalSearchableVocabulary) fail("Lookup searchable count mismatch");

let lookupEntries = 0;
const lookupSurfaces = [];
for (const bucket of lookupIndex.buckets) {
  const shard = JSON.parse(await readFile(resolve(lookupRoot, `lookup-${bucket.id}.json`), "utf8"));
  if (shard.schemaVersion !== 1 || shard.contentVersion !== artifact.contentVersion || shard.bucket !== bucket.id) {
    fail(`Lookup shard ${bucket.id} metadata mismatch`);
  }
  if (!Array.isArray(shard.entries) || shard.entries.length !== bucket.entries) fail(`Lookup shard ${bucket.id} count mismatch`);
  for (const entry of shard.entries) {
    for (const field of ["id", "simplified", "traditional", "pinyin", "meaning", "sourceId"]) {
      if (typeof entry[field] !== "string" || !entry[field].trim()) fail(`${entry.id ?? bucket.id} lookup entry lacks ${field}`);
    }
    const expectedBucket = String((entry.simplified.codePointAt(0) ?? 0) % lookupIndex.shardCount).padStart(2, "0");
    if (expectedBucket !== bucket.id) fail(`${entry.id} is stored in the wrong lookup shard`);
    lookupSurfaces.push(entry.simplified);
  }
  lookupEntries += shard.entries.length;
}
if (lookupEntries !== artifact.stats.fullLookupVocabulary) fail("Lookup shard entries do not match full inventory");
if (!unique(lookupSurfaces)) fail("Duplicate simplified surfaces across lookup shards");

const wordsById = new Map(artifact.vocabulary.map((item) => [item.id, item]));
for (const item of artifact.vocabulary) {
  for (const field of ["id", "simplified", "traditional", "pinyin", "meaning", "partOfSpeech", "sourceId", "editorialDepth"]) {
    if (typeof item[field] !== "string" || !item[field].trim()) fail(`${item.id} lacks ${field}`);
  }
  if (item.meaning.length > 320) fail(`${item.id} meaning is too long`);
  if (!Array.isArray(item.senses) || !item.senses.length || item.senses.length > 8) fail(`${item.id} has invalid dictionary senses`);
  if (!Array.isArray(item.classifiers)) fail(`${item.id} has invalid classifiers`);
  if (item.editorialDepth === "curated") {
    for (const field of ["example", "examplePinyin", "exampleMeaning", "themeId"]) {
      if (typeof item[field] !== "string" || !item[field].trim()) fail(`${item.id} curated entry lacks ${field}`);
    }
    if (!item.example.includes(item.simplified)) fail(`${item.id} example does not contain target word`);
  }
}

const missionWordIds = [];
for (const mission of artifact.missions) {
  if (mission.wordIds.length < 1 || mission.wordIds.length > 20) fail(`${mission.id} invalid batch size`);
  for (const wordId of mission.wordIds) {
    if (!wordsById.has(wordId)) fail(`${mission.id} references missing ${wordId}`);
    missionWordIds.push(wordId);
  }
}
if (!unique(missionWordIds)) fail("A reference word appears in multiple vocabulary missions");
if (missionWordIds.length !== artifact.stats.addedReferenceVocabulary) fail("Missions do not cover every reference word exactly once");

const pathWordIds = artifact.pathLessonPacks.flatMap((pack) => pack.wordIds);
if (artifact.pathLessonPacks.length !== 213) fail("Path must expose one additive pack for every HSK1-4 lesson");
if (!unique(artifact.pathLessonPacks.map((pack) => pack.lessonId))) fail("Duplicate Path lesson pack");
if (!unique(pathWordIds)) fail("A reference word appears in multiple Path lesson packs");
if (pathWordIds.length !== 1_459) fail("Path packs must cover every added HSK1-4 word exactly once");
if (pathWordIds.some((wordId) => !["1", "2", "3", "4"].includes(wordsById.get(wordId)?.referenceLevel))) fail("Advanced word leaked into HSK1-4 Path");

for (const lesson of artifact.curatedLessons) {
  if (lesson.wordIds.length < 6) fail(`${lesson.id} has too few words`);
  if (lesson.dialogue.length < 4) fail(`${lesson.id} has too little dialogue`);
  for (const wordId of lesson.wordIds) if (!wordsById.has(wordId)) fail(`${lesson.id} references missing ${wordId}`);
  for (const field of ["pattern", "explanation", "example", "pinyin", "meaning"]) {
    if (!lesson.grammar[field]?.trim()) fail(`${lesson.id} grammar lacks ${field}`);
  }
}

console.log(`Validated mega lexicon: ${artifact.stats.totalSearchableVocabulary} searchable words and ${artifact.stats.totalLearnerVisibleLessons} learner-visible lesson experiences.`);
