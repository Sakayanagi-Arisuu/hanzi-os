import { projectLessonHistory, type HistoryModule, type LessonHistoryEventV1 } from '../learning/lessonHistory';
import { canonicalStringify, sha256Hex } from '../sync/canonicalHash';
import type { Skill } from '../types';
import { verifyCompetencyGraphBinding, type CompetencyGraph, type CompetencyModality } from './competencyGraph';
import { validateLearningUnit, type LearningUnit } from './learningUnit';

export type LearnerModelCell = {
  competencyId: string; skill: Skill; modality: CompetencyModality;
  dimensionRole: 'target' | 'supporting';
  status: 'unknown' | 'practice-observed'; independentDistinctItems: null; sufficiency: 'unknown';
  introSkipEligible: false; prerequisiteEligible: false;
  observedUniqueItems: number; observedDays: number; reportedCorrect: number; reportedIncorrect: number;
  selfReviews: number; exposures: number; supports: number; assistedOccurrences: number; pendingOccurrences: number;
  firstIncorrectRef: string | null; latestObservedAt: string | null;
};
type MutableCell = { value: LearnerModelCell; items: Set<string>; days: Set<string>; occurrences: Set<string> };
const day = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Saigon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const key = (id: string, skill: Skill, modality: string) => canonicalStringify([id, skill, modality]);
const explicitAssistance = (event: LessonHistoryEventV1) => Object.values(event.assistance).some(value => value === true);

/** Descriptive practice model. Unreviewed policies leave sufficiency and independent coverage unknown. */
export async function reduceLearnerModel(input: { graph: CompetencyGraph; units: readonly LearningUnit[];
  events: readonly LessonHistoryEventV1[]; scope: { ownerKey: string; resetEpoch: number }; asOf: string; allowInference: boolean }) {
  if (!Number.isFinite(Date.parse(input.asOf))) throw new Error('Learner model needs a real cutoff');
  await verifyCompetencyGraphBinding(input.graph);
  const cells = new Map<string, MutableCell>();
  for (const node of input.graph.nodes) for (const dimension of [...node.dimensions, ...node.sourceMappings]) {
    const cellKey = key(node.id, dimension.skill, dimension.modality);
    if (cells.has(cellKey)) continue;
    cells.set(cellKey, {
    value: { competencyId: node.id, skill: dimension.skill, modality: dimension.modality,
      dimensionRole: node.dimensions.some(target => target.skill === dimension.skill && target.modality === dimension.modality) ? 'target' : 'supporting',
      status: 'unknown', independentDistinctItems: null, sufficiency: 'unknown',
      introSkipEligible: false, prerequisiteEligible: false, observedUniqueItems: 0, observedDays: 0, reportedCorrect: 0,
      reportedIncorrect: 0, selfReviews: 0, exposures: 0, supports: 0, assistedOccurrences: 0, pendingOccurrences: 0,
      firstIncorrectRef: null, latestObservedAt: null }, items: new Set(), days: new Set(), occurrences: new Set(),
    });
  }
  const unknownByModule: Partial<Record<HistoryModule, number>> = {};
  const reasons: Record<string, number> = {};
  let acceptedOccurrences = 0;
  if (input.allowInference) {
    const registry = new Map<string, LearningUnit>();
    for (const unit of input.units) {
      await validateLearningUnit(unit, input.graph);
      const sourceKey = canonicalStringify([unit.id, unit.binding, unit.source.contentVersion]);
      if (registry.has(sourceKey)) throw new Error('Ambiguous unit binding');
      registry.set(sourceKey, unit);
    }
    projectLessonHistory(input.scope, input.events); // Validate all raw copies without writing or normalizing them away.
    const cutoff = Date.parse(input.asOf);
    const deferred = new Map<string, LessonHistoryEventV1>();
    const eligible = input.events.filter(event => {
      if (event.receivedAt && Date.parse(event.receivedAt) > cutoff || event.occurredAt && Date.parse(event.occurredAt) > cutoff) {
        deferred.set(event.eventId, event); return false;
      }
      return true;
    });
    const projected = projectLessonHistory(input.scope, eligible);
    const assistance = new Set(eligible.filter(explicitAssistance).map(event => event.eventId));
    const known = new Map<string, { outcome?: LessonHistoryEventV1; time?: LessonHistoryEventV1; ambiguousTime?: boolean; receivedAt: string | null }>();
    for (const event of eligible) {
      const truth = known.get(event.eventId) ?? { receivedAt: null };
      if (event.outcome !== 'unknown') truth.outcome = event;
      if (event.occurredAt) {
        if (truth.time && truth.time.occurredAt !== event.occurredAt) truth.ambiguousTime = true;
        truth.time = event;
      }
      if (event.receivedAt && (!truth.receivedAt || Date.parse(event.receivedAt) > Date.parse(truth.receivedAt))) truth.receivedAt = event.receivedAt;
      known.set(event.eventId, truth);
    }
    // Chronological replay preserves the first response; a later correction cannot replace it.
    const ordered = projected.map(event => {
      const truth = known.get(event.eventId)!;
      return { ...event, outcome: truth.outcome?.outcome ?? event.outcome, score: truth.outcome?.score ?? event.score,
        occurredAt: truth.ambiguousTime ? null : truth.time?.occurredAt ?? null,
        clockSource: truth.ambiguousTime || !truth.time ? 'unknown' as const : truth.time.clockSource,
        receivedAt: truth.receivedAt };
    }).sort((a,b) => (a.occurredAt ?? '\uffff') < (b.occurredAt ?? '\uffff') ? -1
      : (a.occurredAt ?? '\uffff') > (b.occurredAt ?? '\uffff') ? 1 : a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0);
    const unknown = (event: LessonHistoryEventV1, reason: string) => {
      unknownByModule[event.module] = (unknownByModule[event.module] ?? 0) + 1;
      reasons[reason] = (reasons[reason] ?? 0) + 1;
    };
    const eligibleIds = new Set(projected.map(event => event.eventId));
    for (const [id, event] of deferred) if (!eligibleIds.has(id)) unknown(event, 'after-cutoff');
    for (const event of ordered) {
      if (event.confirmationState === 'quarantined') { unknown(event, 'quarantined'); continue; }
      if (event.business?.details?.imported === true || event.business?.details?.restoredFromBackup === true) { unknown(event, 'imported-observation'); continue; }
      if (event.receivedAt && Date.parse(event.receivedAt) > cutoff || event.occurredAt && Date.parse(event.occurredAt) > cutoff) { unknown(event, 'after-cutoff'); continue; }
      const unit = registry.get(canonicalStringify([event.itemId, event.activityVersion, event.contentVersion]));
      if (!unit) { unknown(event, 'no-current-unit-binding'); continue; }
      if (event.skill !== unit.skill || event.modality !== unit.modality) { unknown(event, 'unknown-or-mismatched-dimension'); continue; }
      const cell = cells.get(key(unit.competencyId, unit.skill, unit.modality));
      // Teaching reading/grammar for an audio goal does not become listening measurement.
      if (!cell) { unknown(event, 'supporting-dimension-only'); continue; }
      const guestCommit = event.ownerKey.startsWith('anonymous:') && event.authority === 'local-practice' && event.lineage === 'guest-business-commit';
      if (event.confirmationState !== 'confirmed' && !guestCommit) { cell.value.pendingOccurrences++; continue; }
      if (!event.occurredAt) { unknown(event, 'unknown-occurrence-time'); continue; }
      const category = event.business?.category;
      if (!category || ['visit', 'preference', 'saved-item', 'session'].includes(category)) continue;
      const occurrence = category === 'objective' ? event.firstResponseRef ?? event.logicalActivityId : event.logicalActivityId;
      if (cell.occurrences.has(occurrence)) continue;
      cell.occurrences.add(occurrence); acceptedOccurrences++;
      cell.value.status = 'practice-observed';
      cell.days.add(day(event.occurredAt));
      cell.value.latestObservedAt = event.occurredAt;
      const supported = assistance.has(event.eventId) || unit.assistance.priorExposure;
      if (supported) cell.value.assistedOccurrences++;
      if (category === 'support') cell.value.supports++;
      if (category === 'exposure') cell.value.exposures++;
      if (category === 'self-review') cell.value.selfReviews++;
      if (category === 'objective' && event.outcome === 'correct') cell.value.reportedCorrect++;
      if (category === 'objective' && event.outcome === 'incorrect') {
        cell.value.reportedIncorrect++;
        cell.value.firstIncorrectRef ??= event.logicalActivityId;
      }
      if (category === 'objective' || category === 'self-review') cell.items.add(canonicalStringify([unit.source.lessonId, unit.source.section, unit.source.entryId]));
    }
  }
  const values = [...cells.values()].map(cell => ({ ...cell.value, observedUniqueItems: cell.items.size, observedDays: cell.days.size }));
  const body = { version: 1 as const, graphBinding: input.graph.binding, scope: input.scope, asOf: input.asOf,
    status: input.allowInference ? 'descriptive-only' as const : 'disabled' as const,
    measurementPolicy: 'requires-human-review' as const, cells: values, acceptedOccurrences,
    unknownByModule: Object.fromEntries(Object.entries(unknownByModule).sort()), reasons: Object.fromEntries(Object.entries(reasons).sort()) };
  return { ...body, binding: await sha256Hex(body) };
}
export type LearnerModel = Awaited<ReturnType<typeof reduceLearnerModel>>;
