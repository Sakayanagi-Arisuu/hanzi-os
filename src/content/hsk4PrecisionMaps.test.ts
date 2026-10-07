import {readFileSync,readdirSync} from 'node:fs';
import {expect,it} from 'vitest';
import type {LessonPageDocument} from '../learning/lessonPages';
import {applyPrecisionSourceMaps,applySummarySourceMaps,summaryMapIds,applyIntegrationSourceMaps,integrationMapIds} from '../../scripts/content/hsk4-precision-map-decisions.mjs';
it('appends source-specific review maps after practice without changing existing pages or answers',()=>{
 const draft=JSON.parse(readFileSync('content/drafts/thien-lo-hsk4-precision-reference-quantity-v2.json','utf8'));
 const sources=readdirSync('content/drafts').filter(f=>/^thien-lo-hsk4-.*-v2.json$/.test(f)).flatMap(f=>JSON.parse(readFileSync(`content/drafts/${f}`,'utf8')).items??[]);
 const summary=sources.filter(i=>summaryMapIds.includes(i.lessonId));
 expect(summary).toHaveLength(18);
 const integration=sources.filter(i=>integrationMapIds.includes(i.lessonId));expect(integration).toHaveLength(18);
 for(const item of [...draft.items,...summary,...integration]){
  const apply=integrationMapIds.includes(item.lessonId)?applyIntegrationSourceMaps:summaryMapIds.includes(item.lessonId)?applySummarySourceMaps:applyPrecisionSourceMaps;
  const original=item.studioContent,next=apply(original);
  const expectedCount=integrationMapIds.includes(item.lessonId)&&!item.lessonId.includes('structured-')?4:2;
  const maps=next.lessonPages.pages.splice(-expectedCount);
  expect(next).toEqual(original);
  expect(maps).toHaveLength(expectedCount);
  for(const [index,map] of maps.entries()){
   const sourceReading=original.lessonPages.pages.find((p:{id:string})=>p.id.endsWith(`:source:${index}`)).blocks[0].reading;
   const source=sources.flatMap((s:{lessonPages:LessonPageDocument})=>s.lessonPages.pages.flatMap(p=>{
    if(!p.blocks.some(b=>JSON.stringify(b.reading?.paragraphs.map(p=>p.hanzi))===JSON.stringify(sourceReading.paragraphs.map((p:{hanzi:string})=>p.hanzi))))return [];
    const sourceIndex=p.id.match(/:source:(\d+)$/)?.[1];
    const sourceMap=s.lessonPages.pages.find(other=>other.id===p.id.replace(/:source:\d+$/,`:map:${sourceIndex}`));
    return sourceMap?.blocks.filter(b=>b.diagram).map(b=>b.diagram)??[];
   }));
   expect(source).toHaveLength(1);
   expect(map.blocks[0].diagram.nodes).toEqual(source[0]!.nodes);
   expect(map.stage).toBe('transfer');
   expect(map.blocks[0].diagram.nodes).toHaveLength(5);
  }
  expect(()=>apply(apply(original))).toThrow('Preserve existing');
 }
});
