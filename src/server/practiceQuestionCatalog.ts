import { CONTENT_VERSION, RELEASED_LESSONS, RELEASED_STORIES, RELEASED_VOCABULARY } from "../data/curriculum";
import { buildExerciseCatalog } from "../lib/exerciseGeneration";
import { ASSESSMENT_QUESTIONS } from "../data/assessment";
import { HSK1_LEVEL_CHECK_ITEMS } from "../data/hsk1LevelCheck";
import { HSK2_LEVEL_CHECK_ITEMS } from "../data/hsk2LevelCheck";
import { HSK3_LEVEL_CHECK_ITEMS } from "../data/hsk3LevelCheck";
import { HSK4_LEVEL_CHECK_ITEMS } from "../data/hsk4LevelCheck";
import { ANALYTICS_SKILLS } from "../learning/analyticsActivity";
import { practiceQuestionKey, type PracticeCatalog } from "../learning/practicePercent";
import { isEligibleChallengeWord, PRONUNCIATION_DAILY_CHALLENGE_COUNT } from "../learning/pronunciationPractice";
import { RELEASED_CHARACTER_PRACTICE } from "../learning/richLessonContent";
import { EDITORIAL_WORD_BY_ID } from "../content/lexicalEditorialCatalog";
import { CURRENT_AUTHORITATIVE_READER_STORIES } from "./authoritativeReaderItemBank";
import { HSK_MOCK_EXAM_DEFINITIONS, createEditorialHskMockExamDefinition } from "./hskMockExamBank";
import { canonicalStudioJson, studioSha256 } from "../content/studioContent";
import { ContentStudioRepository } from "./contentStudioRepository";
import { publishedRuntimeHeader, publishedRuntimeItems } from "../content/publishedStudioRuntimeContract";
import { validateLessonPages, type LessonPageDocument } from "../learning/lessonPages";
import { validateLessonActivitySources } from "../learning/lessonActivitySources";
import type { D1Database } from "./d1";
import type { Skill, VocabularyItem } from "../types";

let baseline: PracticeCatalog | undefined;
export function baselinePracticeCatalog(): PracticeCatalog {
  if (baseline) return baseline;
  const sets = Object.fromEntries(ANALYTICS_SKILLS.map(skill => [skill, new Set<string>()])) as Record<Skill, Set<string>>;
  const add = (skill: Skill, id: string) => sets[skill].add(practiceQuestionKey(id));
  for (const lesson of RELEASED_LESSONS) {
    for (const question of buildExerciseCatalog(lesson, "simplified", () => 0.5)) add(question.skill, `${lesson.id}:${question.id}`);
    const phrases = new Map<string, VocabularyItem>();
    for (const wordId of lesson.wordIds) {
      const word = EDITORIAL_WORD_BY_ID.get(wordId);
      if (!word || !isEligibleChallengeWord(word, 4)) continue;
      const key = word.example.replace(/[^\p{Script=Han}]/gu, "");
      if (!phrases.has(key)) phrases.set(key, word);
    }
    for (const word of [...phrases.values()].slice(0, PRONUNCIATION_DAILY_CHALLENGE_COUNT)) add("speaking", `pronunciation:${CONTENT_VERSION}:${word.id}`);
  }
  for (const word of RELEASED_VOCABULARY) add("vocabulary", `review:${word.id}`);
  for (const character of RELEASED_CHARACTER_PRACTICE) sets.writing.add(`character-forge:${character.hanzi}`);
  for (const story of RELEASED_STORIES) for (const question of story.comprehension) add("reading", `${story.id}:${question.id}`);
  for (const story of CURRENT_AUTHORITATIVE_READER_STORIES) for (const question of story.items) add("reading", `${story.id}:${question.id}`);
  for (const question of ASSESSMENT_QUESTIONS) add(question.skill, `diagnostic:${question.id}`);
  for (const [level, bank] of [HSK1_LEVEL_CHECK_ITEMS, HSK2_LEVEL_CHECK_ITEMS, HSK3_LEVEL_CHECK_ITEMS, HSK4_LEVEL_CHECK_ITEMS].entries()) {
    for (const question of bank) add(question.skill, `hsk${level + 1}-level-check:${question.id}`);
  }
  for (const definition of HSK_MOCK_EXAM_DEFINITIONS) for (const question of definition.bank) add(question.skill, `assessment:${question.id}`);
  baseline = Object.fromEntries(ANALYTICS_SKILLS.map(skill => [skill, [...sets[skill]]])) as PracticeCatalog;
  return baseline;
}

let publishedCatalogCache: { key: string; value: Promise<PracticeCatalog> } | undefined;

export async function publishedPracticeCatalog(database: D1Database): Promise<PracticeCatalog> {
  // Recheck immutable release identities on every read. Reuse only the public
  // catalog, never owner attempts; new/removed releases invalidate immediately.
  const heads = await database.prepare(`SELECT head.package_id AS id, package.package_sha256 AS packageHash,
      package.manifest_sha256 AS manifestHash
    FROM content_release_heads head JOIN content_release_packages package ON package.id=head.package_id
    WHERE json_extract(package.package_json, '$.itemType') IN ('lesson','exam_form','exam_item')
    ORDER BY head.package_id`).all<{ id: string; packageHash: string; manifestHash: string }>();
  if (!heads.success || !heads.results) throw new Error("Practice release identities unavailable");
  const key = JSON.stringify(heads.results);
  if (publishedCatalogCache?.key === key) return publishedCatalogCache.value;
  const value = buildPublishedPracticeCatalog(database);
  publishedCatalogCache = { key, value };
  try { return await value; }
  catch (error) {
    if (publishedCatalogCache?.value === value) publishedCatalogCache = undefined;
    throw error;
  }
}

async function buildPublishedPracticeCatalog(database: D1Database): Promise<PracticeCatalog> {
  const base = baselinePracticeCatalog();
  const sets = Object.fromEntries(ANALYTICS_SKILLS.map(skill => [skill, new Set(base[skill])])) as Record<Skill, Set<string>>;
  const [runtime, exams] = await Promise.all([
    new ContentStudioRepository(database).publishedRuntime({ itemType: "lesson", learnerSafe: true }),
    publishedPracticeExams(database),
  ]);
  const pages = publishedPracticePageIdentities(runtime);
  for (const [skill, ids] of Object.entries(pages) as [Skill, string[]][]) for (const id of ids) sets[skill].add(id);
  for (const definition of exams) for (const question of definition.bank) sets[question.skill].add(`assessment:${question.id}`);
  return Object.fromEntries(ANALYTICS_SKILLS.map(skill => [skill, [...sets[skill]]])) as PracticeCatalog;
}

/** Bound concurrent reads instead of waiting for every pinned exam source in
 * sequence. Keep the scorer's immutable source fences and definition builder;
 * only the resulting question identities leave this server-side module. */
export async function publishedPracticeExams(database: D1Database) {
  const repository = new ContentStudioRepository(database);
  const runtime = await repository.publishedRuntime({ itemType: "exam_form" });
  const ids = runtime.items.flatMap(item => Array.isArray(item.content.itemStableKeys)
    ? item.content.itemStableKeys.filter((key): key is string => typeof key === "string") : []);
  const publications = (await repository.releasedRuntimeRevisions(ids)).filter(item => item.itemType === "exam_item");
  const sources: typeof publications = [];
  for (let offset = 0; offset < publications.length; offset += 100) {
    const chunk = publications.slice(offset, offset + 100);
    const rows = await database.prepare(`SELECT r.id, i.item_type AS itemType,
      r.workflow_state AS workflowState, r.content_sha256 AS contentSha256, r.content_json AS contentJson
      FROM content_revisions r JOIN content_items i ON i.id=r.item_id
      WHERE r.id IN (${chunk.map(() => "?").join(",")})`).bind(...chunk.map(item => item.revisionId))
      .all<{ id: string; itemType: string; workflowState: string; contentSha256: string; contentJson: string }>();
    if (!rows.success) throw new Error("Pinned practice sources unavailable");
    const byId = new Map(rows.results?.map(row => [row.id, row]));
    sources.push(...await Promise.all(chunk.map(async publication => {
      const source = byId.get(publication.revisionId);
      if (!source) throw new Error("Pinned practice source unavailable");
      const content = JSON.parse(source.contentJson) as Record<string, unknown>;
      if (source.itemType !== "exam_item"
        || (source.workflowState !== "published" && source.workflowState !== "archived")
        || source.contentSha256 !== publication.contentSha256
        || await studioSha256(canonicalStudioJson(content)) !== publication.contentSha256) {
        throw new Error("Pinned practice source failed its immutable digest fence");
      }
      return { ...publication, content };
    })));
  }
  return runtime.items.map(item => createEditorialHskMockExamDefinition(item, sources))
    .filter((definition): definition is NonNullable<typeof definition> => definition !== null);
}

/** Descriptive identities need no answer digests or cloned answer registry.
 * Keep the published-document and source checks, without allocating an answer
 * binding for every question whenever a learner opens their status panel. */
export function publishedPracticePageIdentities(manifest: unknown): PracticeCatalog {
  const sets = Object.fromEntries(ANALYTICS_SKILLS.map(skill => [skill, new Set<string>()])) as Record<Skill, Set<string>>;
  const lessons = new Set<string>();
  for (const raw of publishedRuntimeItems(manifest)) {
    const header = publishedRuntimeHeader(raw, "lesson");
    if (!header || header.content.lessonPages === undefined) continue;
    const lessonId = header.content.targetLessonId;
    if (typeof lessonId !== "string" || !lessonId || lessons.has(lessonId)
      || validateLessonPages(header.content.lessonPages).length) throw new Error("Invalid published practice lesson");
    lessons.add(lessonId);
    const document = header.content.lessonPages as LessonPageDocument;
    if (validateLessonActivitySources(lessonId, document).length) throw new Error("Published practice source unavailable");
    for (const page of document.pages) for (const block of page.blocks) {
      const skill = block.kind === "activity" ? block.activity?.learningTarget?.skill : undefined;
      if (skill) sets[skill].add(`lesson-page:${JSON.stringify([lessonId, page.id, block.id])}`);
    }
  }
  return Object.fromEntries(ANALYTICS_SKILLS.map(skill => [skill, [...sets[skill]]])) as PracticeCatalog;
}
