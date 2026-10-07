import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadAssessment101} from './hsk2-assessment-editorial-round101.mjs';
import {getHskMockExamDefinition} from '../../src/server/hskMockExamBank.ts';
import {studioStarterContent,validateStudioContent} from '../../src/content/studioContent.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
const path='content/drafts/thien-lo-hsk2-assessment-editorial-round101.json',evidenceDocument='docs/thien-lo-redesign-review/195-REVIEW-HSK2-ASSESSMENT-ROUND101.md';
if(existsSync(path))throw Error('Preserve pinned plan');
const review={humanReviewed:false,aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}};
const entries=loadAssessment101().map(x=>({stableKey:'hsk2-assessment-r101-'+x.id.replaceAll(':','-'),itemType:'exam_item',title:'HSK2 · '+x.id.split(':').slice(-3).join(' · '),level:'hsk2',sourceItemVersion:x.sourceItemVersion,content:{...studioStarterContent('exam_item','hsk2'),skill:x.skill,promptVi:x.promptVi,hanzi:x.stimulusText,options:x.options.map(o=>o.text),answerIndex:x.options.findIndex(o=>o.optionId===x.correctOptionId),explanationVi:x.explanationVi,sourceLessonIds:[x.sourceLessonId],review,editorialOrigin:{sourceItemId:x.id,sourceItemVersion:x.sourceItemVersion,humanReviewed:false,evidenceDocument}}}));
for(const e of entries){const v=await validateStudioContent(e.itemType,e.content);if(!v.result.valid)throw Error(JSON.stringify({key:e.stableKey,...v.result}));}
const previousPlan='content/drafts/thien-lo-hsk12-assessment-editorial-round93.json',previousReceipt='docs/thien-lo-redesign-review/187-REVIEW-HSK12-ASSESSMENT-ROUND93.json';
const old=JSON.parse(readFileSync(previousPlan,'utf8')),receipt=JSON.parse(readFileSync(previousReceipt,'utf8'));
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true),reused=[];
try{const repo=new ContentStudioRepository(d1Adapter(db));for(const e of old.entries.filter(e=>e.level==='hsk2')){const id=receipt.releases.find(r=>r.stableKey===e.stableKey)?.revisionId;if(!id)throw Error('Missing previous release');const r=await repo.getRevision(id),p=await repo.releasedRuntimeRevision(id);if(!p||r.contentSha256!==p.contentSha256)throw Error('Invalid immutable reuse');reused.push({sourceItemVersion:e.sourceItemVersion,revisionId:id,contentSha256:r.contentSha256});}}finally{db.close();}
const selected=getHskMockExamDefinition('hsk2','b').bank.map(x=>x.sourceItemVersion);
if(selected.length!==60||new Set(selected).size!==60||selected.some(v=>![...entries,...reused].some(e=>e.sourceItemVersion===v)))throw Error('Missing reviewed form source');
const sourceFiles=['content/runtime/hsk-mock-exam-alternate-local.json','scripts/content/hsk2-assessment-editorial-round101.mjs',previousPlan,previousReceipt].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
writeFileSync(path,JSON.stringify({humanReviewed:false,sourceFiles,entries,reused,selected,level:'hsk2',formKey:'h',timeLimitMinutes:55,coverage:{listening:35,reading:25,writing:0},formStableKey:'hsk2-assessment-reviewed-round101-h',evidenceDocument},null,2)+'\n');
console.log({newItems:entries.length,reusedItems:reused.length,selected:selected.length,path});
