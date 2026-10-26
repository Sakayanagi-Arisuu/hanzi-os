import {expect,it} from 'vitest';
import {extractPilotLearningUnits} from '../server/pilotLearningUnits';
import {createActivityHistoryEvent} from '../learning/activityHistory';
import {reduceLearnerModel, type LearnerModel} from './learnerModel';
import {projectPilotCompetencyMap} from './pilotCompetencyMap';
import {sha256Hex} from '../sync/canonicalHash';
import type {LearningUnit} from './learningUnit';

const scope = {ownerKey:'anonymous:competency-map',resetEpoch:0}, asOf='2026-10-22T00:00:00Z';
function event(unit:LearningUnit,id:string,category:'exposure'|'self-review',occurredAt='2026-10-20T00:00:00Z') {
  return {...createActivityHistoryEvent({...scope,operationId:id,module:'overview',category,sourceId:unit.source.lessonId,
    itemId:unit.id,contentVersion:unit.source.contentVersion,activityVersion:unit.binding,sourceRecordRef:id,
    skill:unit.skill,modality:unit.modality,occurredAt}),authority:'local-practice' as const,lineage:'guest-business-commit' as const};
}
it('separates exposure from practice, keeps repeated items unique and never transfers reading support to listening evidence',async()=>{
  const {graph,units}=await extractPilotLearningUnits();
  const grammar=units.find(unit=>unit.competencyId==='c.number.quantity')!;
  const reading=units.find(unit=>unit.competencyId==='c.price.comprehend'&&unit.skill==='reading')!;
  const writing=units.find(unit=>unit.skill==='writing')!;
  const events=[event(grammar,'read','exposure'),event(reading,'support-reading','exposure'),
    event(writing,'write-first','self-review'),event(writing,'write-repeat','self-review','2026-10-21T00:00:00Z')];
  const model=await reduceLearnerModel({graph,units,scope,events,asOf,allowInference:true});
  const map=await projectPilotCompetencyMap(graph,model,scope);
  expect(map.nodes.find(node=>node.id==='c.number.quantity')?.dimensions[0]?.status).toBe('exposure');
  expect(map.nodes.find(node=>node.id==='c.price.comprehend')).toMatchObject({supportingObserved:true,dimensions:[{status:'unknown',uniqueItems:0}]});
  const production=map.nodes.find(node=>node.id==='c.price.produce')!;
  expect(production.dimensions.find(dimension=>dimension.labelVi.startsWith('viết'))).toMatchObject({status:'practice',uniqueItems:1,days:2});
  expect(production.dimensions.find(dimension=>dimension.labelVi.startsWith('nói'))?.status).toBe('unknown');
  expect(JSON.stringify(map)).not.toContain('mastery');
});
it('respects opt-out without presenting cached descriptive counts',async()=>{
  const {graph,units}=await extractPilotLearningUnits();
  const model=await reduceLearnerModel({graph,units,scope,events:[event(units[0]!,'read','exposure')],asOf,allowInference:false});
  const map=await projectPilotCompetencyMap(graph,model,scope);
  expect(map.inferenceEnabled).toBe(false);
  expect(map.nodes.flatMap(node=>node.dimensions).every(dimension=>dimension.status==='unknown'&&dimension.uniqueItems===0)).toBe(true);
});
it('rejects cross-owner/reset, mismatched plan/model bindings and forged mastery even with a recomputed hash',async()=>{
  const {graph,units}=await extractPilotLearningUnits();
  const model=await reduceLearnerModel({graph,units,scope,events:[],asOf,allowInference:true});
  await expect(projectPilotCompetencyMap(graph,model,{...scope,resetEpoch:1})).rejects.toThrow('scope');
  await expect(projectPilotCompetencyMap(graph,model,{...scope,ownerKey:'anonymous:other'})).rejects.toThrow('scope');
  await expect(projectPilotCompetencyMap(graph,model,scope,'0'.repeat(64))).rejects.toThrow('scope');
  await expect(projectPilotCompetencyMap(graph,model,scope,graph.binding,'0'.repeat(64))).rejects.toThrow('scope');
  for(const patch of [{sufficiency:'sufficient'},{introSkipEligible:true},{observedUniqueItems:-1}]){
    const {binding:_,...body}=model;
    const altered={...body,cells:model.cells.map((cell,index)=>index?cell:{...cell,...patch})};
    const sealed={...altered,binding:await sha256Hex(altered)} as LearnerModel;
    await expect(projectPilotCompetencyMap(graph,sealed,scope)).rejects.toThrow('Unsupported');
  }
});
