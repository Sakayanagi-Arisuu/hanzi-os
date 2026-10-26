import type { Skill } from '../types';
import { canonicalStringify, sha256Hex } from '../sync/canonicalHash';
import { resolveCompetency, verifyCompetencyGraphBinding, type CompetencyGraph, type CompetencyModality, type CompetencySource } from './competencyGraph';

export type UnitTriple = { hanzi: string; pinyin: string; meaningVi: string; speaker?: string };
export type LearningUnit = {
  version: 1; id: string; binding: string; graphBinding: string; competencyId: string;
  source: CompetencySource; prerequisites: string[]; skill: Skill; modality: CompetencyModality;
  taskType: 'explanation' | 'dialogue-context' | 'guided-role-play' | 'guided-production';
  payload: { instructionVi: string; dialogue: UnitTriple[]; explanationVi: string | null; models: UnitTriple[] };
  assistance: { pinyin: 'optional'; translation: 'optional'; priorExposure: true; ime: 'record-if-used' };
  estimatedSeconds: number; timeBasis: 'planning-budget-not-measured'; difficultyAssumption: 'unvalidated';
  access: 'source-lesson-policy-required'; offline: 'exact-prepared-version-required';
  media: { nativeAudio: false; syntheticTts: 'optional-support-only' };
  humanReviewed: false; measurementEligible: false; completionLessonIds: [];
  scoringAdapter: 'exposure' | 'self-review'; provenance: { kind: 'existing-authored-local-source'; sourceCatalog: string };
};
type UnsealedUnit = Omit<LearningUnit, 'binding'>;
const triple = (value: UnitTriple) => value && [value.hanzi, value.pinyin, value.meaningVi].every(text => typeof text === 'string' && text.trim().length > 0);
const forbidden = /^(answerIds|acceptedAnswers|correctAnswer|correctIndex|answerKey|scoringKey|privateKey)$/i;
function noPrivateKeys(value: unknown) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.test(key)) throw new Error('Private answer key cannot enter a unit payload');
    noPrivateKeys(child);
  }
}

export async function validateLearningUnit(unit: LearningUnit, graph: CompetencyGraph) {
  await verifyCompetencyGraphBinding(graph);
  const node = resolveCompetency(graph, unit.competencyId);
  if (unit.version !== 1 || !/^u\.[a-z0-9][a-z0-9.-]*$/.test(unit.id) || unit.graphBinding !== graph.binding || !node
    || !node.sourceMappings.some(mapping => canonicalStringify(mapping.source) === canonicalStringify(unit.source))) throw new Error('Unit source or graph unavailable');
  if (canonicalStringify(unit.prerequisites) !== canonicalStringify(node.prerequisites)
    || !['explanation', 'dialogue-context', 'guided-role-play', 'guided-production'].includes(unit.taskType)
    || !node.sourceMappings.some(mapping => mapping.skill === unit.skill && mapping.modality === unit.modality
      && canonicalStringify(mapping.source) === canonicalStringify(unit.source))) throw new Error('Unit task/dimension mapping is invalid');
  if (!unit.payload || !unit.payload.instructionVi.trim() || !Array.isArray(unit.payload.dialogue) || !unit.payload.dialogue.length
    || !unit.payload.dialogue.every(triple) || !Array.isArray(unit.payload.models) || !unit.payload.models.every(triple)
    || unit.payload.explanationVi !== null && typeof unit.payload.explanationVi !== 'string') throw new Error('Unit lost required context');
  if (unit.humanReviewed !== false || unit.measurementEligible !== false || !Array.isArray(unit.completionLessonIds) || unit.completionLessonIds.length !== 0
    || unit.scoringAdapter !== (['guided-role-play', 'guided-production'].includes(unit.taskType) ? 'self-review' : 'exposure')
    || unit.assistance.priorExposure !== true || unit.assistance.pinyin !== 'optional' || unit.assistance.translation !== 'optional'
    || unit.assistance.ime !== 'record-if-used' || unit.media.nativeAudio !== false || unit.media.syntheticTts !== 'optional-support-only'
    || unit.access !== 'source-lesson-policy-required' || unit.offline !== 'exact-prepared-version-required'
    || !Number.isSafeInteger(unit.estimatedSeconds) || unit.estimatedSeconds < 1 || unit.estimatedSeconds > 1800
    || unit.timeBasis !== 'planning-budget-not-measured' || unit.difficultyAssumption !== 'unvalidated'
    || unit.provenance.kind !== 'existing-authored-local-source' || !unit.provenance.sourceCatalog) throw new Error('Unit cannot grant measurement, completion or access');
  noPrivateKeys(unit.payload);
  const { binding, ...body } = unit;
  if (binding !== await sha256Hex(body)) throw new Error('Unit payload binding changed');
}

export async function sealLearningUnit(source: UnsealedUnit, graph: CompetencyGraph): Promise<LearningUnit> {
  const body = structuredClone(source);
  delete (body as Partial<LearningUnit>).binding;
  const unit = { ...body, binding: await sha256Hex(body) };
  await validateLearningUnit(unit, graph); return unit;
}
