import { expect, it } from 'vitest';
import catalog from '../../content/runtime/hsk1-level-rich-lessons.json';
import { extractPilotLearningUnits } from '../server/pilotLearningUnits';
import { sealLearningUnit, validateLearningUnit } from './learningUnit';

it('extracts contextual units with actual versions, explicit support and estimated time without private answer keys or grants', async () => {
  const { graph, units } = await extractPilotLearningUnits();
  expect(units).toHaveLength(6);
  for (const unit of units) {
    await validateLearningUnit(unit, graph);
    expect(unit.payload.dialogue).toHaveLength(4);
    expect(unit.assistance.priorExposure).toBe(true);
    expect(unit.completionLessonIds).toEqual([]);
    expect(unit.measurementEligible).toBe(false);
    expect(unit.access).toBe('source-lesson-policy-required');
  }
  expect(units.find(unit => unit.id === 'u.price.task09')).toMatchObject({ modality: 'speech', scoringAdapter: 'self-review',
    payload: { models: expect.arrayContaining([expect.objectContaining({ hanzi: '这件衣服多少钱？' })]) } });
  expect(units.find(unit => unit.id === 'u.price.task09-text')).toMatchObject({ modality: 'text', skill: 'writing',
    taskType: 'guided-production', scoringAdapter: 'self-review', measurementEligible: false });
  expect(JSON.stringify(units)).not.toMatch(/answerIds|acceptedAnswers|correctAnswer|hsk4/);
});

it('rejects orphaned context, changed payloads, source substitutions and client-supplied keys even when resealed', async () => {
  const { graph, units } = await extractPilotLearningUnits();
  const original = units[0];
  const changed = structuredClone(original); changed.payload.instructionVi += ' changed';
  await expect(validateLearningUnit(changed, graph)).rejects.toThrow('binding changed');
  await expect(sealLearningUnit({ ...original, payload: { ...original.payload, dialogue: [] } }, graph)).rejects.toThrow('context');
  const privateKey = { ...original, payload: { ...original.payload, answerIds: ['secret'] } };
  await expect(sealLearningUnit(privateKey, graph)).rejects.toThrow('Private answer');
  await expect(sealLearningUnit({ ...original, source: units[4].source }, graph)).rejects.toThrow('source');
  await expect(sealLearningUnit({ ...original, measurementEligible: true as false }, graph)).rejects.toThrow('measurement');
});

it('changes the binding when teaching context changes, retaining source lesson IDs', async () => {
  const before = await extractPilotLearningUnits();
  const changed = structuredClone(catalog);
  changed.lessons.find(lesson => lesson.lessonId === 'daily-1')!.dialogue[0].hanzi += '（测试）';
  const after = await extractPilotLearningUnits(changed);
  expect(after.units[1].binding).not.toBe(before.units[1].binding);
  expect(after.units[1].source.lessonId).toBe(before.units[1].source.lessonId);
});
