// Private authoring artifact. Do not import this module from learner runtime.
import draft from '../../content/drafts/personalization-price-pilot-2026.10.21.json';
import { validateLessonActivity } from '../learning/lessonActivities';
import { sha256Hex } from '../sync/canonicalHash';
import { createPilotCompetencyGraph } from './pilotCompetencyGraph';

export async function inspectPilotDraftVariants(source: unknown = draft) {
  const bank = source as typeof draft;
  if (!bank || bank.schemaVersion !== 1 || bank.state !== 'draft-not-published' || bank.humanReviewed !== false
    || bank.measurementEligible !== false || !bank.provenance || !Array.isArray(bank.items) || !bank.items.length
    || !bank.review || !Array.isArray(bank.review.humanApprovals) || bank.review.humanApprovals.length
    || bank.review.familyIsolation !== 'pending-human-review' || bank.review.measurementPolicy !== 'pending-human-review') throw new Error('Pilot draft cannot claim release/review authority');
  const graph = await createPilotCompetencyGraph();
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const sourceLessons = new Set(graph.nodes.flatMap(node => node.sourceMappings.map(mapping => mapping.source.lessonId)));
  if (!Array.isArray(bank.sourceLessonIds) || !bank.sourceLessonIds.length
    || new Set(bank.sourceLessonIds).size !== bank.sourceLessonIds.length
    || bank.sourceLessonIds.some(id => !sourceLessons.has(id))) throw new Error('Pilot draft source lesson unavailable');
  const ids = new Set<string>();
  const report: { id: string; familyId: string; taskType: string; missing: string[]; eligibleForRunner: false; eligibleForMeasurement: false }[] = [];
  for (const item of bank.items) {
    if (!item.id || ids.has(item.id) || !item.familyId || !['teach', 'practice', 'holdout-candidate'].includes(item.role)
      || !nodes.get(item.competencyId)?.dimensions.some(dimension => dimension.skill === item.skill && dimension.modality === item.modality)
      || !Array.isArray(item.context) || !item.context.length
      || item.context.some(triple => !triple || ![triple.hanzi, triple.pinyin, triple.meaningVi].every(text => typeof text === 'string' && text.trim()))
      || !item.promptVi || !Number.isInteger(item.estimatedSeconds) || item.estimatedSeconds < 1
      || item.estimatedSeconds > 1800 || validateLessonActivity(item.activity).length
      || item.scoringAdapter !== (item.activity.type === 'rubric' ? 'self-review' : 'draft-objective-not-authorized')) throw new Error('Pilot draft identity/context/activity invalid');
    ids.add(item.id);
    if (item.modality === 'audio' && (!item.audio || item.audio.status !== 'missing' || item.audio.mediaId !== null
      || item.audio.sha256 !== null || item.audio.provenance !== null)) throw new Error('Pilot native audio is unavailable; do not invent media provenance');
    const missing = ['human-content-review', 'measurement-policy'];
    if (item.modality === 'audio') missing.push('native-audio-and-provenance');
    if (item.role === 'holdout-candidate') missing.push('item-family-and-exposure-review');
    report.push({ id: item.id, familyId: item.familyId, taskType: item.activity.type, missing,
      eligibleForRunner: false, eligibleForMeasurement: false });
  }
  return { bankId: bank.bankId, binding: await sha256Hex(bank), graphBinding: graph.binding, report,
    publication: 'blocked-draft' as const, humanReviewed: false as const, publishedUnitIds: [] as string[] };
}
