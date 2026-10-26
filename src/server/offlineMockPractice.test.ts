import { expect, it } from 'vitest';
import { offlineMockPackage, gradeOfflineMockPractice } from './offlineMockPractice';
import { getHskMockExamDefinition } from './hskMockExamBank';
import type { OfflineMockRun } from '../assessment/offlineMockPractice';

it('downloads no answer keys, regrades exact device answers once semantically, and remains practice only', async () => {
  const definition = getHskMockExamDefinition('hsk1', 'a')!;
  const pack = await offlineMockPackage(definition);
  expect(JSON.stringify(pack)).not.toMatch(/correctAnswer|correctOptionId|explanationVi/);
  const now = Date.now();
  const run: OfflineMockRun = { version: 1, id: `device-mock:${crypto.randomUUID()}`, package: pack,
    startedAt: new Date(now - 10_000).toISOString(), submittedAt: new Date(now).toISOString(), result: null,
    answers: pack.form.items.slice(0,3).map(item => ({ position: item.position, itemId: item.itemId, itemVersion: item.itemVersion,
      answer: item.options[0]!, occurredAt: new Date(now - 1_000).toISOString() })) };
  const result = await gradeOfflineMockPractice(definition, run);
  expect(result.score.answered).toBe(3);
  expect(result.review).toHaveLength(pack.form.items.length);
  expect(result).toMatchObject({ masteryEligible: false, certificationEligible: false, prerequisiteUnlockEligible: false });
  expect(await gradeOfflineMockPractice(definition, run)).toEqual(result);
  await expect(gradeOfflineMockPractice(definition, { ...run, answers: [...run.answers, run.answers[0]!] })).rejects.toThrow();
  const tampered = structuredClone(run); tampered.package.form.items[0]!.options[0] = 'tampered';
  await expect(gradeOfflineMockPractice(definition, tampered)).rejects.toThrow();
  const late = structuredClone(run); late.answers[0]!.occurredAt = new Date(now + definition.timeLimitMinutes * 60_000).toISOString();
  await expect(gradeOfflineMockPractice(definition, late)).rejects.toThrow();
});
