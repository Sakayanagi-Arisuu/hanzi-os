import { expect, it } from 'vitest';
import bank from '../../content/drafts/personalization-price-pilot-2026.10.21.json';
import { inspectPilotDraftVariants } from '../server/pilotDraftVariants';

it('keeps six original scaffold/production/listening/holdout candidates private, contextual and ineligible until review/media exist', async () => {
  const packet = await inspectPilotDraftVariants();
  expect(packet.report).toHaveLength(6);
  expect(packet.publishedUnitIds).toEqual([]);
  expect(packet.publication).toBe('blocked-draft');
  expect(packet.report.every(item => !item.eligibleForRunner && !item.eligibleForMeasurement)).toBe(true);
  expect(packet.report.filter(item => item.missing.includes('native-audio-and-provenance'))).toHaveLength(2);
  expect(packet.report.filter(item => item.missing.includes('item-family-and-exposure-review'))).toHaveLength(3);
  expect(new Set(bank.items.map(item => item.competencyId)).size).toBe(4);
  expect(bank.items.find(item => item.activity.type === 'rubric')!.activity.acceptedAnswers).toEqual([]);
  expect(bank.items.every(item => !/family|exposure|policy|mastery|skip|evidence|recall/i.test(item.promptVi))).toBe(true);
});

it('rejects fabricated human review, native audio, source identities and damaged questions rather than auto publishing', async () => {
  const reviewed = structuredClone(bank); reviewed.humanReviewed = true;
  await expect(inspectPilotDraftVariants(reviewed)).rejects.toThrow('authority');
  const duplicate = structuredClone(bank); duplicate.items.push(duplicate.items[0]);
  await expect(inspectPilotDraftVariants(duplicate)).rejects.toThrow('identity');
  const context = structuredClone(bank); context.items[0].context[0].pinyin = '';
  await expect(inspectPilotDraftVariants(context)).rejects.toThrow('context');
  const fake = structuredClone(bank); fake.items[0].audio!.status = 'native-approved';
  await expect(inspectPilotDraftVariants(fake)).rejects.toThrow('audio');
  const answer = structuredClone(bank); answer.items[0].activity.answerIds = ['invented'];
  await expect(inspectPilotDraftVariants(answer)).rejects.toThrow('activity');
  const mutation = structuredClone(bank); mutation.items[0].context[0].meaningVi += ' (fixture)';
  expect((await inspectPilotDraftVariants(mutation)).binding).not.toBe((await inspectPilotDraftVariants()).binding);
});
