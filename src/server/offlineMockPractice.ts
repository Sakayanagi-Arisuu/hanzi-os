import { hashAssessmentForm, isExactAssessmentFormV1 } from '../assessment/assessmentSessionProtocol';
import type { OfflineMockPackage, OfflineMockRun } from '../assessment/offlineMockPractice';
import { assessmentAnswersMatch, assessmentPresentationForItem, selectAuthoritativeAssessmentForm } from './authoritativeAssessmentItemBank';
import type { HskMockExamDefinition } from './hskMockExamBank';
import { publicHskMockExamDefinition } from './hskMockExamRepository';
import type { MockResult } from '../screens/MockExamsPage';
import { canonicalStringify } from '../sync/document';

export async function offlineMockPackage(definition: HskMockExamDefinition): Promise<OfflineMockPackage> {
  const selected = selectAuthoritativeAssessmentForm({ bank: definition.bank, blueprint: definition.blueprint,
    random: () => 0, exposedGroups: new Set(), excludePreviouslyExposedItems: false, shuffleFormItems: false });
  if (selected.kind !== 'selected') throw new Error('Practice form unavailable');
  return { version: 1, definition: publicHskMockExamDefinition(definition), contentVersion: definition.contentVersion,
    form: selected.form, formHash: await hashAssessmentForm(selected.form) };
}

export async function gradeOfflineMockPractice(definition: HskMockExamDefinition, run: OfflineMockRun): Promise<MockResult> {
  const pack = run?.package;
  const start = Date.parse(run?.startedAt);
  const finish = Date.parse(run?.submittedAt ?? '');
  if (run?.version !== 1 || typeof run.id !== 'string' || !/^device-mock:[\w-]{36}$/.test(run.id)
    || !Number.isFinite(start) || !Number.isFinite(finish) || finish < start || finish > Date.now() + 300_000
    || pack?.version !== 1 || pack.contentVersion !== definition.contentVersion
    || pack.definition?.examLevel !== definition.examLevel || pack.definition.formKey !== definition.formKey
    || !isExactAssessmentFormV1(pack.form, definition.blueprint.itemCount)
    || pack.form.blueprintId !== definition.blueprint.id || pack.form.formVersion !== definition.blueprint.formVersion
    || pack.form.scoringPolicyVersion !== definition.blueprint.scoringPolicyVersion
    || await hashAssessmentForm(pack.form) !== pack.formHash
    || !Array.isArray(run.answers) || run.answers.length > pack.form.items.length) throw new Error('Practice binding changed');
  // Reconstruct every public item from the server bank. A device cannot alter prompts,
  // options, versions or eligibility, including for a previously issued shuffled form.
  const items = pack.form.items.map(presentation => {
    const item = definition.bank.find(item => item.id === presentation.itemId && item.itemVersion === presentation.itemVersion);
    if (!item || canonicalStringify(assessmentPresentationForItem(item, presentation.position)) !== canonicalStringify(presentation)) {
      throw new Error('Practice item changed');
    }
    return item;
  });
  if (new Set(items.map(item => item.id)).size !== items.length
    || definition.sections.some(section => items.filter(item => item.skill === section.skill).length !== section.itemCount)) {
    throw new Error('Practice form incomplete');
  }
  const deadline = start + definition.timeLimitMinutes * 60_000;
  const answers = new Map<number, string>();
  for (const answer of run.answers) {
    const item = pack.form.items[answer.position];
    const occurred = Date.parse(answer.occurredAt);
    if (!item || answers.has(answer.position) || answer.itemId !== item.itemId || answer.itemVersion !== item.itemVersion
      || !item.options.includes(answer.answer) || !Number.isFinite(occurred) || occurred < start || occurred > finish || occurred >= deadline) {
      throw new Error('Invalid practice answer');
    }
    answers.set(answer.position, answer.answer);
  }
  const review = items.map((item, position) => ({ position, itemId: item.id, itemVersion: item.itemVersion,
    skill: item.skill, prompt: item.prompt, selectedAnswer: answers.get(position) ?? null,
    ...(item.stimulusText ? { spokenText: item.stimulusText } : {}),
    correct: answers.has(position) && assessmentAnswersMatch(answers.get(position)!, item.correctAnswer),
    correctAnswer: item.correctAnswer, explanationVi: item.explanationVi, recommendedLessonId: item.sourceLessonId,
    recommendedLessonHref: `/lesson/${encodeURIComponent(item.sourceLessonId)}` }));
  const skills = definition.sections.map(section => ({ skill: section.skill,
    correct: review.filter(item => item.skill === section.skill && item.correct).length,
    answered: review.filter(item => item.skill === section.skill && item.selectedAnswer !== null).length,
    total: review.filter(item => item.skill === section.skill).length }));
  const correct = review.filter(item => item.correct).length;
  const recommendations = new Map<string, number>();
  review.filter(item => !item.correct).forEach(item => recommendations.set(item.recommendedLessonId,
    (recommendations.get(item.recommendedLessonId) ?? 0) + 1));
  return { sessionId: run.id, definition: publicHskMockExamDefinition(definition), contentVersion: definition.contentVersion,
    formVersion: pack.form.formVersion, formHash: pack.formHash, startedAt: run.startedAt, submittedAt: run.submittedAt!,
    timedOut: finish >= deadline && answers.size < items.length,
    score: { correct, answered: answers.size, total: items.length, percent: Math.round(correct / items.length * 100) },
    skills, weakSkills: skills.filter(item => item.correct / item.total < 0.7).map(item => item.skill),
    recommendations: [...recommendations].sort((a,b) => b[1] - a[1]).slice(0,4).map(([lessonId, wrongCount]) => ({ lessonId, wrongCount, href: `/lesson/${encodeURIComponent(lessonId)}` })),
    review, masteryEligible: false, prerequisiteUnlockEligible: false, certificationEligible: false };
}
