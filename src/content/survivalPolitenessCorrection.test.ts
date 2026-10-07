import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {correctSurvivalPoliteness,politenessModel,politenessPrompt} from '../../scripts/content/survival-politeness-correction.mjs';
import {validateLessonPages} from '../learning/lessonPages';

const original=JSON.parse(readFileSync('content/drafts/thien-lo-survival-batch-v2.json','utf8')).items[0].studioContent;
it('clarifies the two exchanges while preserving all other content and target metadata',()=>{
 const source=structuredClone(original);
 const page=source.lessonPages.pages.find((p:{id:string})=>p.id==='survival-1:v2:transfer');
 page.blocks[1].activity.learningTarget={skill:'writing',targetId:'preserve-existing-target'};
 source.lessonPages.pages[0].illustration={src:'/existing.webp',alt:'Existing',provenance:'existing'};
 const snapshot=JSON.stringify(source);
 const next=correctSurvivalPoliteness(source);
 expect(JSON.stringify(source)).toBe(snapshot);
 expect(next.grammar[0].guidedPractice.modelAnswerHanzi).toBe(politenessModel[0]);
 const transfer=next.lessonPages.pages.find((p:{id:string})=>p.id===page.id);
 expect(transfer.blocks[1].body).toBe(politenessPrompt);
 expect(transfer.blocks[1].activity.explanation).toContain('B：对不起！\nA：没关系。');
 next.checkpointVi=source.checkpointVi;
 next.grammar[0].guidedPractice=source.grammar[0].guidedPractice;
 transfer.blocks[0].body=page.blocks[0].body;
 transfer.blocks[1].body=page.blocks[1].body;
 transfer.blocks[1].activity.explanation=page.blocks[1].activity.explanation;
 expect(next).toEqual(source);
 expect(validateLessonPages(correctSurvivalPoliteness(original).lessonPages)).toEqual([]);
});
it('rejects changed model text and a second application instead of silently replacing editor changes',()=>{
 const changed=structuredClone(original);
 changed.grammar[0].guidedPractice.modelAnswerHanzi='Editor draft';
 expect(()=>correctSurvivalPoliteness(changed)).toThrow('Model changed');
 expect(()=>correctSurvivalPoliteness(correctSurvivalPoliteness(original))).toThrow('Model changed');
});
