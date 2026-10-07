import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadAssessment94} from './hsk3-assessment-editorial-round94.mjs';
import {getHskMockExamDefinition} from '../../src/server/hskMockExamBank.ts';
import {studioStarterContent,validateStudioContent} from '../../src/content/studioContent.ts';
const path='content/drafts/thien-lo-hsk3-assessment-editorial-round94.json';if(existsSync(path))throw Error('Preserve pinned plan');
const review={humanReviewed:false,aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}};
const entries=loadAssessment94().map(x=>({stableKey:'hsk3-assessment-r94-'+x.id.replaceAll(':','-'),itemType:'exam_item',title:'HSK3 · '+x.id.split(':').slice(-3).join(' · '),level:'hsk3',sourceItemVersion:x.sourceItemVersion,content:{...studioStarterContent('exam_item','hsk3'),skill:x.skill,promptVi:x.promptVi,hanzi:x.stimulusText,options:x.options.map(o=>o.text),answerIndex:x.options.findIndex(o=>o.optionId===x.correctOptionId),explanationVi:x.explanationVi,sourceLessonIds:[x.sourceLessonId],review,editorialOrigin:{sourceItemId:x.id,sourceItemVersion:x.sourceItemVersion,humanReviewed:false,evidenceDocument:'docs/thien-lo-redesign-review/188-REVIEW-HSK3-ASSESSMENT-ROUND94.md'}}}));
for(const e of entries){const v=await validateStudioContent(e.itemType,e.content);if(!v.result.valid)throw Error(JSON.stringify({key:e.stableKey,...v.result}));}
const forms=[{level:'hsk3',stableKey:'hsk3-assessment-reviewed-round94-g',selected:getHskMockExamDefinition('hsk3','a').bank.map(x=>x.sourceItemVersion),timeLimitMinutes:90,coverage:{listening:40,reading:30,writing:10}}];
for(const f of forms)if(f.selected.length!==80||new Set(f.selected).size!==80||f.selected.some(v=>!entries.some(e=>e.sourceItemVersion===v)))throw Error('Missing reviewed form source');
const sourceFiles=['content/runtime/hsk3-level-check-local.json','content/runtime/hsk-mock-exam-alternate-local.json','scripts/content/hsk3-assessment-editorial-round94.mjs'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
writeFileSync(path,JSON.stringify({humanReviewed:false,sourceFiles,entries,forms,evidenceDocument:'docs/thien-lo-redesign-review/188-REVIEW-HSK3-ASSESSMENT-ROUND94.md'},null,2)+'\n');console.log({items:entries.length,formItems:80,path});
