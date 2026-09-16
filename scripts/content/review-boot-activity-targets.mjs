import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256,validateStudioContent} from '../../src/content/studioContent.ts';
import {applyEditorialActivityTargets} from '../../src/content/editorialActivityTargets.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';

// Read-only database review. Does not update editorial flags or release heads.
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const original=read('content/drafts/thien-lo-boot-1-v2.json');
const oldReview=read('content/review/thien-lo-boot-1-v2-local.json');
const plan=read('content/drafts/thien-lo-boot-1-activity-targets.json');
const hash=value=>studioSha256(canonicalStudioJson(value));
if(oldReview.sourceContentSha256!==await hash(original.studioContent)||oldReview.humanReviewed!==false)throw new Error('Original review is stale');
if(plan.lessonId!=='boot-1'||plan.humanReviewed!==false)throw new Error('Wrong target plan');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db));
 const head=db.prepare('SELECT h.revision_id FROM content_release_heads h JOIN content_items i ON i.id=h.item_id WHERE i.stable_key=?').get('thien-lo-v2-boot-1');
 if(!head)throw new Error('Published parent missing');
 const source=await repo.getRevision(head.revision_id);
 const expectedSource={...original.studioContent,review:{humanReviewed:false,aiSelfReview:oldReview.aiSelfReview},localReview:oldReview};
 if(canonicalStudioJson(source.content)!==canonicalStudioJson(expectedSource))throw new Error('Published parent changed; review again');
 const draft=await repo.getLatestRevision(source.itemId);
 const expected={...source.content,lessonPages:applyEditorialActivityTargets('boot-1',original.lessonPages,plan.targets),review:{humanReviewed:false,aiSelfReview:{accuracy:false,levelFit:false,pedagogy:false,answerIntegrity:false,originality:false}}};
 delete expected.localReview;
 if(draft.id===source.id||draft.workflowState!=='draft'||canonicalStudioJson(draft.content)!==canonicalStudioJson(expected))throw new Error('Draft differs from the scoped metadata change');
 const aiSelfReview={accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true};
 const proposed={...draft.content,review:{humanReviewed:false,aiSelfReview}};
 const validation=await validateStudioContent('lesson',proposed);
 if(!validation.result.valid)throw new Error(JSON.stringify(validation.result.errors));
 const review={schemaVersion:1,lessonId:'boot-1',humanReviewed:false,reviewedAt:'2026-09-15',scope:'Activity target metadata only; written tone-rule recognition and self-review, not listening or scored pronunciation.',evidenceDocument:'docs/thien-lo-redesign-review/20-REVIEW-BOOT-ACTIVITY-TARGETS.md',parentRevisionId:source.id,parentContentSha256:await hash(source.content),draftRevisionId:draft.id,draftContentSha256:await hash(draft.content),targetPlanSha256:await hash(plan),sourceContentSha256:await hash(proposed),aiSelfReview};
 writeFileSync('content/review/thien-lo-boot-1-activity-targets-local.json',JSON.stringify(review,null,2)+'\n');
 console.log({lessonId:'boot-1',pages:expected.lessonPages.pages.length,targets:Object.keys(plan.targets).length,validationPassed:true,draftRevisionId:draft.id,published:false,databaseReadOnly:true});
}finally{db.close();}
