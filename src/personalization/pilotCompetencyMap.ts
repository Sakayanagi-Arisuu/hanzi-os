import { verifyCompetencyGraphBinding, type CompetencyGraph } from './competencyGraph';
import type { LearnerModel } from './learnerModel';
import { sha256Hex } from '../sync/canonicalHash';

export type PilotCompetencyMap = { inferenceEnabled: boolean; nodes: Array<{
  id: string; objectiveVi: string; prerequisitesVi: string[]; supportingObserved: boolean;
  dimensions: Array<{ labelVi: string; status: 'unknown' | 'exposure' | 'practice'; uniqueItems: number; days: number; pending: number }>;
}> };
const skills = { pronunciation:'phát âm',listening:'nghe',speaking:'nói',reading:'đọc',writing:'viết',vocabulary:'từ vựng',grammar:'ngữ pháp' };
const modalities = { text:'văn bản',audio:'âm thanh',speech:'lời nói',handwriting:'chữ viết tay' };
const counts = ['observedUniqueItems','observedDays','reportedCorrect','reportedIncorrect','selfReviews','exposures','supports','assistedOccurrences','pendingOccurrences'] as const;

/** A presentation of verified bindings and descriptive observations, never a mastery/skip policy. */
export async function projectPilotCompetencyMap(graph: CompetencyGraph, model: LearnerModel,
  scope: {ownerKey:string;resetEpoch:number}, graphBinding = graph?.binding, modelBinding = model?.binding): Promise<PilotCompetencyMap> {
  await verifyCompetencyGraphBinding(graph);
  if (!model || model.version !== 1 || !model.scope || model.scope.ownerKey !== scope.ownerKey || model.scope.resetEpoch !== scope.resetEpoch
    || model.graphBinding !== graph.binding || graphBinding !== graph.binding || modelBinding !== model.binding || !['disabled','descriptive-only'].includes(model.status)
    || model.measurementPolicy !== 'requires-human-review' || !Array.isArray(model.cells) || !Number.isFinite(Date.parse(model.asOf))) {
    throw new Error('Competency map does not match the current learner scope');
  }
  const {binding,...body} = model;
  if (binding !== await sha256Hex(body)) throw new Error('Competency observations changed; retain original history');
  const byId = new Map(graph.nodes.map(node => [node.id,node]));
  const seen = new Set<string>();
  for (const cell of model.cells) {
    const node = byId.get(cell.competencyId), key = JSON.stringify([cell.competencyId,cell.skill,cell.modality]);
    const target = node?.dimensions.some(dimension => dimension.skill === cell.skill && dimension.modality === cell.modality);
    if (!node || seen.has(key) || ![...node.dimensions,...node.sourceMappings].some(dimension => dimension.skill === cell.skill && dimension.modality === cell.modality)
      || cell.dimensionRole !== (target ? 'target' : 'supporting') || !['unknown','practice-observed'].includes(cell.status)
      || cell.independentDistinctItems !== null || cell.sufficiency !== 'unknown' || cell.introSkipEligible !== false || cell.prerequisiteEligible !== false
      || counts.some(field => !Number.isSafeInteger(cell[field]) || cell[field] < 0)) throw new Error('Unsupported competency observation');
    seen.add(key);
  }
  const enabled = model.status === 'descriptive-only';
  return {inferenceEnabled:enabled,nodes:graph.nodes.map(node => ({id:node.id,objectiveVi:node.objectiveVi,
    prerequisitesVi:node.prerequisites.map(id => byId.get(id)!.objectiveVi),
    supportingObserved: enabled && model.cells.some(cell => cell.competencyId === node.id && cell.dimensionRole === 'supporting'
      && cell.exposures + cell.supports + cell.selfReviews + cell.reportedCorrect + cell.reportedIncorrect > 0),
    dimensions:node.dimensions.map(dimension => {
      const cell = model.cells.find(value => value.competencyId === node.id && value.skill === dimension.skill && value.modality === dimension.modality);
      return {labelVi:`${skills[dimension.skill]} · ${modalities[dimension.modality]}`,
        status: !enabled || !cell ? 'unknown' : cell.selfReviews + cell.reportedCorrect + cell.reportedIncorrect > 0 ? 'practice'
          : cell.exposures > 0 ? 'exposure' : 'unknown',
        uniqueItems:enabled ? cell?.observedUniqueItems ?? 0 : 0,days:enabled ? cell?.observedDays ?? 0 : 0,pending:enabled ? cell?.pendingOccurrences ?? 0 : 0};
    })}))};
}
