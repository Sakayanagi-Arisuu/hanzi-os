import type { OfflineMockPackage, OfflineMockRun } from '../assessment/offlineMockPractice';
import { MOCK_PRACTICE_CHANGED } from '../assessment/offlineMockPractice';
import { hashAssessmentForm, isExactAssessmentFormV1 } from '../assessment/assessmentSessionProtocol';
import { readLessonResume, updateLessonResume, type ActiveOwnerLearningScope } from './indexedDb';
import { currentWorkspaceScope, readWorkspace } from './workspaceSync';
import type { MockResult } from '../screens/MockExamsPage';
import { saveMockResultMistakes } from '../mistakes/practiceMistakes';

const KEY = 'offline-mock-practice:v1';
type Journal = { version: 1; runs: OfflineMockRun[] };
const parse = (value: unknown): Journal => {
  if (value === undefined) return { version: 1, runs: [] };
  const journal = value as Journal;
  if (journal?.version !== 1 || !Array.isArray(journal.runs)
    || journal.runs.some(run => run?.version !== 1 || typeof run.id !== 'string' || !Array.isArray(run.answers)
      || !run.package?.form?.items?.length)) throw new Error('Không đọc được lượt luyện đã lưu. Hãy giữ dữ liệu và thử lại.');
  return journal;
};
const scopeFor = (scope: ActiveOwnerLearningScope) => ({ expectedOwnerGeneration: scope.ownerGeneration,
  resetEpoch: scope.resetEpoch, entryKey: KEY });
export async function readMockPracticeRuns(scope: ActiveOwnerLearningScope) {
  return parse((await readLessonResume(scopeFor(scope)))?.value).runs;
}
export async function saveMockPracticeRun(scope: ActiveOwnerLearningScope, run: OfflineMockRun) {
  await updateLessonResume(scopeFor(scope), value => {
    const journal = parse(value);
    const previous = journal.runs.find(item => item.id === run.id);
    if (previous?.result || (previous?.submittedAt && !run.submittedAt)
      || (previous && previous.answers.length > run.answers.length)) return journal;
    if (previous && (previous.package.formHash !== run.package.formHash || previous.startedAt !== run.startedAt
      || previous.answers.some((answer, index) => JSON.stringify(answer) !== JSON.stringify(run.answers[index]))
      || (previous.submittedAt && previous.submittedAt !== run.submittedAt))) {
      throw new Error('Lượt luyện đã thay đổi ở cửa sổ khác. Mở lại để tiếp tục câu trả lời đã lưu.');
    }
    return { version: 1, runs: [...journal.runs.filter(item => item.id !== run.id), run] } satisfies Journal;
  });
  window.dispatchEvent(new Event(MOCK_PRACTICE_CHANGED));
}
export async function beginMockPractice(scope: ActiveOwnerLearningScope, pack: OfflineMockPackage) {
  if (pack.version !== 1 || !isExactAssessmentFormV1(pack.form, pack.definition.itemCount)
    || await hashAssessmentForm(pack.form) !== pack.formHash) throw new Error('Đề luyện đã lưu chưa hợp lệ.');
  let run: OfflineMockRun = { version: 1, id: `device-mock:${crypto.randomUUID()}`, package: pack,
    startedAt: new Date().toISOString(), answers: [], submittedAt: null, result: null };
  await updateLessonResume(scopeFor(scope), value => {
    const journal = parse(value);
    const previous = journal.runs.find(item => !item.submittedAt
      && item.package.definition.examLevel === pack.definition.examLevel && item.package.definition.formKey === pack.definition.formKey);
    if (previous) { run = previous; return journal; }
    return { version: 1, runs: [...journal.runs, run] } satisfies Journal;
  });
  window.dispatchEvent(new Event(MOCK_PRACTICE_CHANGED));
  return run;
}
export async function syncMockPractice(scope: ActiveOwnerLearningScope, signal: AbortSignal, send: typeof fetch = fetch) {
  const runs = await readMockPracticeRuns(scope);
  for (const run of runs) if (run.result) await saveMockResultMistakes(scope, run.result);
  for (const run of runs.filter(run => run.submittedAt && !run.result)) {
    const definition = run.package.definition;
    const response = await send(`/api/exams/${definition.examLevel}/${definition.formKey}/practice`, {
      method: 'POST', credentials: 'same-origin', signal,
      headers: { 'content-type': 'application/json', 'x-learning-owner': scope.ownerGeneration.ownerKey },
      body: JSON.stringify({ resetEpoch: scope.resetEpoch, run }),
    });
    if (!response.ok) continue; // Retain exact answers, including after expired login or content changes.
    const payload = await response.json() as { result: MockResult };
    const result = payload.result;
    if (!result || result.sessionId !== run.id || result.formHash !== run.package.formHash
      || result.formVersion !== run.package.form.formVersion || result.masteryEligible !== false
      || result.certificationEligible !== false || result.prerequisiteUnlockEligible !== false
      || !Array.isArray(result.review) || result.score?.total !== run.package.form.items.length) throw new Error('Practice response changed');
    await saveMockPracticeRun(scope, { ...run, result });
    await saveMockResultMistakes(scope, result);
  }
}
export async function mockPracticeHistory(ownerKey: string) {
  const scope = await currentWorkspaceScope(ownerKey);
  if (!scope) return [];
  const runs = await readMockPracticeRuns(scope);
  const workspace = await readWorkspace(scope);
  const history = new Map<string, MockResult>();
  for (const entry of workspace.entries.filter(entry => entry.key.startsWith('exam.practice:'))) {
    const result = entry.value as MockResult | null;
    if (result?.sessionId && result.masteryEligible === false && result.certificationEligible === false
      && result.definition?.examLevel && result.score && Array.isArray(result.review)) history.set(result.sessionId, result);
  }
  runs.forEach(run => { if (run.result) history.set(run.id, run.result); });
  return [...history.values()].sort((a,b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
}
