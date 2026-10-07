import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadAssessment91} from './hsk4-assessment-editorial-round91.mjs';
import {getHskMockExamDefinition} from '../../src/server/hskMockExamBank.ts';
import {studioStarterContent,validateStudioContent} from '../../src/content/studioContent.ts';
const path='content/drafts/thien-lo-hsk4-assessment-editorial-round91.json';
if(existsSync(path))throw Error('Preserve pinned plan');
const review={humanReviewed:false,aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}};
const sources=loadAssessment91();
const entries=sources.map(x=>({stableKey:'hsk4-assessment-r91-'+x.id.replaceAll(':','-'),itemType:'exam_item',title:'HSK4 · '+x.id.split(':').slice(-3).join(' · '),level:'hsk4',sourceItemVersion:x.sourceItemVersion,content:{...studioStarterContent('exam_item','hsk4'),skill:x.skill,promptVi:x.promptVi,hanzi:x.stimulusText,options:x.options.map(o=>o.text),answerIndex:x.options.findIndex(o=>o.optionId===x.correctOptionId),explanationVi:x.explanationVi,sourceLessonIds:[x.sourceLessonId],review,editorialOrigin:{sourceItemId:x.id,sourceItemVersion:x.sourceItemVersion,humanReviewed:false,evidenceDocument:'docs/thien-lo-redesign-review/185-REVIEW-HSK4-ASSESSMENT-ROUND91.md'}}}));
for(const e of entries){const v=await validateStudioContent(e.itemType,e.content);if(!v.result.valid)throw Error(JSON.stringify({key:e.stableKey,...v.result}));}
const selected=getHskMockExamDefinition('hsk4','a').bank.map(x=>x.sourceItemVersion);
if(selected.length!==100||new Set(selected).size!==100||selected.some(v=>!entries.some(e=>e.sourceItemVersion===v)))throw Error('Missing reviewed form source');
const sourceFiles=['content/runtime/hsk4-level-check-local.json','content/runtime/hsk-mock-exam-alternate-local.json'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
writeFileSync(path,JSON.stringify({humanReviewed:false,sourceFiles,entries,selected,formStableKey:'hsk4-assessment-reviewed-round91-g',evidenceDocument:'docs/thien-lo-redesign-review/185-REVIEW-HSK4-ASSESSMENT-ROUND91.md'},null,2)+'\n');
console.log({items:entries.length,selected:selected.length,path});
