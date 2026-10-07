import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadAssessment103} from './hsk4-assessment-editorial-round103.mjs';
import {getHskMockExamDefinition} from '../../src/server/hskMockExamBank.ts';
import {studioStarterContent,validateStudioContent} from '../../src/content/studioContent.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
const path='content/drafts/thien-lo-hsk4-assessment-editorial-round103.json',evidenceDocument='docs/thien-lo-redesign-review/197-REVIEW-HSK4-ASSESSMENT-ROUND103.md';
if(existsSync(path))throw Error('Preserve pinned plan');
const review={humanReviewed:false,aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}};
const entries=loadAssessment103().map(x=>({stableKey:'hsk4-assessment-r103-'+x.id.replaceAll(':','-'),itemType:'exam_item',title:'HSK4 · '+x.id.split(':').slice(-3).join(' · '),level:'hsk4',sourceItemVersion:x.sourceItemVersion,content:{...studioStarterContent('exam_item','hsk4'),skill:x.skill,promptVi:x.promptVi,hanzi:x.stimulusText,options:x.options.map(o=>o.text),answerIndex:x.options.findIndex(o=>o.optionId===x.correctOptionId),explanationVi:x.explanationVi,sourceLessonIds:[x.sourceLessonId],review,editorialOrigin:{sourceItemId:x.id,sourceItemVersion:x.sourceItemVersion,humanReviewed:false,evidenceDocument}}}));
for(const e of entries){const v=await validateStudioContent(e.itemType,e.content);if(!v.result.valid)throw Error(JSON.stringify({key:e.stableKey,...v.result}));}
const previousPlan='content/drafts/thien-lo-hsk4-assessment-editorial-round91.json',previousReceipt='docs/thien-lo-redesign-review/185-REVIEW-HSK4-ASSESSMENT-ROUND91.json';
const old=JSON.parse(readFileSync(previousPlan,'utf8')),receipt=JSON.parse(readFileSync(previousReceipt,'utf8'));
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true),reused=[];
try{const repo=new ContentStudioRepository(d1Adapter(db));for(const e of old.entries.filter(e=>e.level==='hsk4')){const id=receipt.releases.find(r=>r.stableKey===e.stableKey)?.revisionId;if(!id)throw Error('Missing previous release');const r=await repo.getRevision(id),p=await repo.releasedRuntimeRevision(id);if(!p||r.contentSha256!==p.contentSha256)throw Error('Invalid immutable reuse');reused.push({sourceItemVersion:e.sourceItemVersion,revisionId:id,contentSha256:r.contentSha256});}}finally{db.close();}
const selected=getHskMockExamDefinition('hsk4','b').bank.map(x=>x.sourceItemVersion);
if(selected.length!==100||new Set(selected).size!==100||selected.some(v=>![...entries,...reused].some(e=>e.sourceItemVersion===v)))throw Error('Missing reviewed form source');
const sourceFiles=['content/runtime/hsk-mock-exam-alternate-local.json','scripts/content/hsk4-assessment-editorial-round103.mjs',previousPlan,previousReceipt].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
writeFileSync(path,JSON.stringify({humanReviewed:false,sourceFiles,entries,reused,selected,level:'hsk4',formKey:'h',timeLimitMinutes:105,coverage:{listening:45,reading:40,writing:15},formStableKey:'hsk4-assessment-reviewed-round103-h',evidenceDocument},null,2)+'\n');
console.log({newItems:entries.length,reusedItems:reused.length,selected:selected.length,path});
