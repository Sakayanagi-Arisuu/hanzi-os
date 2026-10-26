import { beforeEach, expect, it, vi } from 'vitest';
import { deriveAccountKey } from '../lib/accountKey';
const mocks = vi.hoisted(() => ({ identity: vi.fn(), database: vi.fn() }));
vi.mock('../../app/chatgpt-auth', () => ({ getChatGPTUser: mocks.identity }));
vi.mock('./d1', async original => ({ ...await original<typeof import('./d1')>(), getD1Database: mocks.database }));
import { POST as lessonOpen } from '../../app/api/learning/lesson-sessions/route';
import { POST as lessonSubmit } from '../../app/api/learning/lesson-sessions/submit/route';
import { POST as lessonAbandon } from '../../app/api/learning/lesson-sessions/abandon/route';
import { POST as reviewGrade } from '../../app/api/learning/reviews/grade/route';
import { POST as assessmentOpen } from '../../app/api/assessment/sessions/route';
import { POST as assessmentAttempt } from '../../app/api/assessment/attempts/route';
import { POST as assessmentSubmit } from '../../app/api/assessment/sessions/submit/route';
import { POST as assessmentAbandon } from '../../app/api/assessment/sessions/abandon/route';
import { POST as readerOpen } from '../../app/api/learning/reader-sessions/route';
import { POST as readerAttempt } from '../../app/api/learning/reader-attempts/route';
import { POST as readerSubmit } from '../../app/api/learning/reader-sessions/submit/route';
import { POST as readerAbandon } from '../../app/api/learning/reader-sessions/abandon/route';
import { GET as practiceMistakes } from '../../app/api/learning/practice-mistakes/route';
beforeEach(() => { mocks.identity.mockReset(); mocks.database.mockReset(); });
it.each(Object.entries({ lessonOpen, lessonSubmit, lessonAbandon, reviewGrade, assessmentOpen,
  assessmentAttempt, assessmentSubmit, assessmentAbandon, readerOpen, readerAttempt, readerSubmit, readerAbandon, practiceMistakes }))('%s rejects a changed cookie before resolving or writing the new learner', async (_name, handler) => {
    mocks.identity.mockResolvedValue({ userId: 'learner-b', email: 'b@example.invalid' });
    const request = new Request('https://hanzi.example/api/command', { method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://hanzi.example', 'x-learning-owner': await deriveAccountKey('learner-a') }, body: '{}' });
    const response = await handler(request);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'OWNER_CHANGED', retryable: true } });
    expect(mocks.database).not.toHaveBeenCalled();
  });
