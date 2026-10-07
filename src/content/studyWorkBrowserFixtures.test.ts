import {expect,it} from 'vitest';
import hsk2 from '../../content/drafts/thien-lo-hsk2-study-work-v2.json';
import hsk3 from '../../content/drafts/thien-lo-hsk3-study-work-v2.json';
import hsk2Evidence from '../../e2e/fixtures/study-work-prerequisite-evidence.json';
import hsk3Evidence from '../../e2e/fixtures/hsk3-study-work-prerequisite-evidence.json';
import {LESSON_BY_ID} from '../data/curriculum';

for(const [level,batch,evidence] of [['HSK2',hsk2,hsk2Evidence],['HSK3',hsk3,hsk3Evidence]] as const){
 it(`${level} browser prerequisites belong to that batch's graph closure`,()=>{
  const expected=new Set<string>();
  const visit=(id:string)=>{
   for(const prior of LESSON_BY_ID.get(id)!.prerequisiteIds){
    if(!expected.has(prior)){expected.add(prior);visit(prior);}
   }
  };
  batch.items.forEach(item=>visit(item.lessonId));
  const actual=new Set(evidence.map(item=>item.metadata.lessonId));
  expect([...actual].sort()).toEqual([...expected].sort());
 });
}
