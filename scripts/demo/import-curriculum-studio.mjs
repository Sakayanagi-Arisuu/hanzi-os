/** Editable source-linked drafts only; never publishes or replaces learner content. */
import { pathToFileURL } from 'node:url';
import { RELEASED_LESSONS, RELEASED_VOCABULARY, CONTENT_VERSION } from '../../src/data/curriculum.ts';
import { getRichLessonContent } from '../../src/learning/richLessonContent.ts';
import { studioLevelForLessonUnit } from '../../src/content/studioLessonIdentity.ts';
import { validateStudioContent } from '../../src/content/studioContent.ts';
import { ContentStudioRepository } from '../../src/server/contentStudioRepository.ts';
import { backupLocalDatabase, findLocalDemoDatabase, openDatabase, requireDemoAccounts, fingerprint, d1Adapter } from './local-demo-database.mjs';

export function curriculumStudioPlan() {
  const review = { humanReviewed: false, aiSelfReview: { accuracy: false, levelFit: false, pedagogy: false, answerIntegrity: false, originality: false } };
  const provenance = { source: 'HANZI.OS released curriculum', contentVersion: CONTENT_VERSION, transformation: 'Source-preserving import; contextual recall prompts added; pending editorial review.' };
  const words = new Map(RELEASED_VOCABULARY.map(word => [word.id, word]));
  const triple = word => ({ hanzi: word.example, pinyin: word.examplePinyin, meaningVi: word.exampleMeaning });
  const plan = RELEASED_VOCABULARY.flatMap(word => {
    const lessons = RELEASED_LESSONS.filter(lesson => lesson.wordIds.includes(word.id));
    if (!lessons.length) return [];
    return { itemType: 'vocabulary', stableKey: `curriculum-word-${word.id}`, title: `${word.simplified} · ${word.meaning}`.slice(0,240), level: studioLevelForLessonUnit(lessons[0].unitId),
      content: { hanzi: word.simplified, pinyin: word.pinyin, meaningVi: word.meaning, examples: [triple(word)], sourceLessonIds: lessons.map(lesson => lesson.id), sourceVocabularyIds: [word.id], provenance, review } };
  });
  for (const lesson of RELEASED_LESSONS) {
    const rich = getRichLessonContent(lesson.id);
    if (!rich) continue;
    const seen = new Set();
    const contextualWords = lesson.wordIds.map(id => words.get(id)).filter(word => {
      if (!word || seen.has(word.example)) return false;
      seen.add(word.example); return true;
    });
    const tasks = contextualWords.map(word => ({
      sourceVocabularyId: word.id,
      promptVi: `Diễn đạt bằng tiếng Trung: “${word.exampleMeaning}” Dùng từ ${word.simplified}. Tự trả lời trước khi mở mẫu.`,
      answer: word.example, answerPinyin: word.examplePinyin, answerMeaningVi: word.exampleMeaning,
      explanationVi: `Đối chiếu nghĩa cả câu, vị trí của ${word.simplified} và Pinyin ${word.pinyin}. Đây là đáp án mẫu; cách diễn đạt khác đúng nghĩa vẫn có thể phù hợp.`,
    }));
    plan.push({ itemType: 'communicative_function', stableKey: `curriculum-context-${lesson.id}`, title: `Luyện ngữ cảnh · ${lesson.title}`.slice(0,240), level: studioLevelForLessonUnit(lesson.unitId),
      content: { functionVi: lesson.objective, scenarioVi: lesson.title, outcomeVi: 'Tự diễn đạt câu theo nghĩa Việt rồi đối chiếu mẫu Trung–Pinyin–Việt.', dialogue: rich.dialogue, tasks, skills: ['reading','speaking'], sourceLessonIds: [lesson.id], sourceVocabularyIds: lesson.wordIds, sourceRichLesson: rich, provenance, review } });
  }
  return plan;
}

export async function importCurriculumStudio(db, plan) {
  const repo = new ContentStudioRepository(d1Adapter(db));
  let inserted = 0;
  for (const item of plan) {
    if (db.prepare('SELECT id FROM content_items WHERE stable_key=?').get(item.stableKey)) continue;
    const validation = await validateStudioContent(item.itemType, item.content);
    const errors = validation.result.errors.filter(error => !error.path.startsWith('review'));
    if (errors.length) throw new Error(`${item.stableKey}: ${JSON.stringify(errors)}`);
    await repo.createDraft({ ...item, actorUserId: 'local-demo-user-2', actorSessionId: null, idempotencyKey: `import-${item.stableKey}` });
    inserted++;
  }
  return inserted;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const apply = process.argv.includes('--apply');
  const db = openDatabase(findLocalDemoDatabase(process.cwd()));
  try {
    requireDemoAccounts(db);
    const plan = curriculumStudioPlan();
    if (apply) await backupLocalDatabase(db, process.cwd(), 'before-curriculum-studio');
    db.exec('BEGIN IMMEDIATE');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'content_%' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_*'").all().map(row => row.name).filter(name => /^[a-z_]+$/.test(name));
    const before = tables.map(table => fingerprint(db, table));
    const inserted = await importCurriculumStudio(db, plan);
    if (await importCurriculumStudio(db, plan)) throw new Error('Import is not idempotent');
    tables.forEach((table,index) => { if (fingerprint(db,table) !== before[index]) throw new Error(`Protected table changed: ${table}`); });
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Foreign key check failed');
    console.log({ mode: apply ? 'apply' : 'rehearse-rollback', inserted, drafts: plan.length, contextualTasks: plan.reduce((n,item) => n + (item.content.tasks?.length ?? 0), 0), uniqueSentences: new Set(plan.flatMap(item => item.content.tasks?.map(task => task.answer) ?? [])).size, protectedTables: tables.length });
    db.exec(apply ? 'COMMIT' : 'ROLLBACK');
  } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
  finally { db.close(); }
}
