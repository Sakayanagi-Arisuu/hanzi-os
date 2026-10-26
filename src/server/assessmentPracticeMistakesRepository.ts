import type { D1Database } from './d1';
import { readCurrentLearningResetEpoch } from './learningResetEpoch';
import { CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS, FOUNDATION_ASSESSMENT_BLUEPRINT_ID, authoritativeAssessmentItemByVersion } from './authoritativeAssessmentItemBank';
import { HskMockExamRepository } from './hskMockExamRepository';
import type { PracticeMistake } from '../mistakes/practiceMistakes';
import { CONTENT_VERSION } from '../data/contentIdentity';

/** Answers become available only after their exact, owned session was submitted. */
export async function readAssessmentPracticeMistakes(database: D1Database, userId: string) {
  const resetEpoch = await readCurrentLearningResetEpoch(database, userId);
  const result = await database.prepare(`SELECT attempt.item_id AS itemId, attempt.item_version AS itemVersion,
    session.id AS sessionId, session.blueprint_id AS blueprintId, session.terminal_at AS submittedAt
    FROM assessment_attempts attempt
    INNER JOIN assessment_sessions session ON session.id=attempt.session_id AND session.user_id=attempt.user_id
      AND session.reset_epoch=attempt.reset_epoch AND session.content_version=attempt.content_version
    WHERE attempt.user_id=? AND attempt.reset_epoch=? AND attempt.content_version=?
      AND session.status='submitted' AND attempt.outcome='incorrect'
      AND EXISTS (SELECT 1 FROM json_each(session.form_manifest_json, '$.items') item
        WHERE json_extract(item.value, '$.itemId')=attempt.item_id
          AND json_extract(item.value, '$.itemVersion')=attempt.item_version
          AND json_extract(item.value, '$.position')=attempt.position)
    ORDER BY session.terminal_at, attempt.position`).bind(userId, resetEpoch, CONTENT_VERSION)
    .all<{ itemId: string; itemVersion: string; sessionId: string; blueprintId: string; submittedAt: number }>();
  if (!result.success || !result.results) throw new Error('Assessment mistake history unavailable');
  const bank = authoritativeAssessmentItemByVersion(CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS);
  const items: PracticeMistake[] = [];
  const mockSessions = new Set<string>();
  for (const row of result.results) {
    if (row.blueprintId !== FOUNDATION_ASSESSMENT_BLUEPRINT_ID) { mockSessions.add(row.sessionId); continue; }
    const item = bank.get(row.itemVersion);
    if (!item || item.id !== row.itemId) throw new Error('Assessment source version unavailable');
    items.push({ version: 1, source: 'assessment', activityId: item.id, activityVersion: item.itemVersion,
      originId: row.sessionId, prompt: item.prompt, context: item.modality === 'synthetic-tts-selection' ? '' : item.meta,
      answer: item.correctAnswer, options: item.options, explanation: 'Đối chiếu câu trả lời với ngữ cảnh của câu hỏi.',
      sourceLabel: 'Khảo nghiệm', skill: item.skill, occurredAt: new Date(row.submittedAt).toISOString(),
      ...(item.stimulusText ? { spokenText: item.stimulusText } : {}) });
  }
  const repository = new HskMockExamRepository(database);
  for (const sessionId of mockSessions) {
    const history = await repository.result(userId, sessionId);
    if (!history) throw new Error('Submitted exam source unavailable');
    for (const item of history.review.filter(item => !item.correct && item.selectedAnswer !== null)) items.push({
      version: 1, source: 'assessment', activityId: item.itemId, activityVersion: item.itemVersion,
      originId: sessionId, prompt: item.prompt, context: '', answer: item.correctAnswer, options: [],
      explanation: item.explanationVi, sourceLabel: 'Phòng Luyện Đề', skill: item.skill,
      occurredAt: history.submittedAt, ...(item.spokenText ? { spokenText: item.spokenText } : {}),
    });
  }
  // A reset while reading must not leak observations into the new epoch.
  if (await readCurrentLearningResetEpoch(database, userId) !== resetEpoch) throw new Error('Learning reset changed');
  return { protocolVersion: 1, resetEpoch, items };
}
