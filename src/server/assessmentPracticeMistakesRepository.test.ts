import { DatabaseSync } from 'node:sqlite';
import { expect, it } from 'vitest';
import type { D1Database } from './d1';
import { readAssessmentPracticeMistakes } from './assessmentPracticeMistakesRepository';
import { CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS, FOUNDATION_ASSESSMENT_BLUEPRINT_ID } from './authoritativeAssessmentItemBank';
import { CONTENT_VERSION } from '../data/contentIdentity';

it('returns exact owned mistakes only after submission, and isolates resets and mismatched forms', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE learning_documents(user_id TEXT, document_json TEXT);
      CREATE TABLE assessment_sessions(id TEXT,user_id TEXT,reset_epoch INTEGER,content_version TEXT,status TEXT,blueprint_id TEXT,terminal_at INTEGER,form_manifest_json TEXT);
      CREATE TABLE assessment_attempts(session_id TEXT,user_id TEXT,reset_epoch INTEGER,content_version TEXT,item_id TEXT,item_version TEXT,position INTEGER,outcome TEXT);`);
    const item = CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS[0];
    const add = (id: string, user: string, epoch: number, status: string, itemId = item.id) => {
      db.prepare('INSERT INTO assessment_sessions VALUES(?,?,?,?,?,?,?,?)').run(id, user, epoch, CONTENT_VERSION, status,
        FOUNDATION_ASSESSMENT_BLUEPRINT_ID, 1792180000000, JSON.stringify({ items: [{ position: 0, itemId, itemVersion: item.itemVersion }] }));
      db.prepare('INSERT INTO assessment_attempts VALUES(?,?,?,?,?,?,?,?)').run(id, user, epoch, CONTENT_VERSION, item.id, item.itemVersion, 0, 'incorrect');
    };
    add('submitted', 'a', 0, 'submitted'); add('active', 'a', 0, 'started');
    add('other-user', 'b', 0, 'submitted'); add('old', 'a', 1, 'submitted'); add('bad-form', 'a', 0, 'submitted', 'other-item');
    const database = { prepare(sql: string) {
      let values: (string | number)[] = [];
      const statement = { bind(...params: (string | number)[]) { values = params; return statement; },
        first: async () => db.prepare(sql).get(...values) ?? null,
        all: async () => ({ success: true, results: db.prepare(sql).all(...values) }) };
      return statement;
    } } as unknown as D1Database;
    const result = await readAssessmentPracticeMistakes(database, 'a');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ originId: 'submitted', answer: item.correctAnswer, activityVersion: item.itemVersion });
    db.prepare('INSERT INTO learning_documents VALUES(?,?)').run('a', '{"reset":{"epoch":1}}');
    expect((await readAssessmentPracticeMistakes(database, 'a')).items.map(item => item.originId)).toEqual(['old']);
  } finally { db.close(); }
});
