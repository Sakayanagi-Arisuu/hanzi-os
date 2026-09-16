import {expect,it} from 'vitest';
import {lessonPageDocumentHash,matchLessonPageBindings} from './lessonPageBinding';
import {emptyLessonBlock,type LessonPageDocument} from './lessonPages';
import {emptyLessonActivity} from './lessonActivities';
import {canonicalStudioJson,studioSha256} from '../content/studioContent';
const document:LessonPageDocument={version:1,pages:[{id:'p',title:'Trang',layout:'focus',blocks:[{...emptyLessonBlock('b'),kind:'activity',body:'Điền',activity:{...emptyLessonActivity(),type:'cloze',acceptedAnswers:['在'],explanation:'Vị trí'}}]}]};
it('uses the same canonical JSON as published content for valid lesson documents',async()=>{
 expect(`sha256:${await lessonPageDocumentHash(document)}`).toBe(await studioSha256(canonicalStudioJson(document)));
});
it('binds exact content only and rejects stale, missing, duplicate or wrong block identities',async()=>{
 const binding={activityId:'lesson-page:["lesson","p","b"]',activityVersion:`lesson-page-v1:sha256:${'a'.repeat(64)}`,revisionId:'rev',pageId:'p',blockId:'b'};
 const response={version:1,lessonId:'lesson',documentHash:await lessonPageDocumentHash(document),activities:[binding]};
 expect(await matchLessonPageBindings(response,'lesson',document)).toEqual({b:binding});
 for(const patch of [{documentHash:'stale'},{lessonId:'other'},{activities:[]},{activities:[binding,binding]},{activities:[{...binding,pageId:'other'}]}])expect(await matchLessonPageBindings({...response,...patch},'lesson',document)).toEqual({});
 const changed=structuredClone(document);changed.pages[0].blocks[0].body='Mẫu đã thay';
 expect(await matchLessonPageBindings(response,'lesson',changed)).toEqual({});
});
