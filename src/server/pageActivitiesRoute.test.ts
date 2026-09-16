import {beforeEach,expect,it,vi} from 'vitest';
import {emptyLessonBlock} from '../learning/lessonPages';
import {emptyLessonActivity} from '../learning/lessonActivities';
const {publishedRuntime}=vi.hoisted(()=>({publishedRuntime:vi.fn()}));
vi.mock('./d1',()=>({getD1Database:vi.fn(async()=>({}))}));
vi.mock('./contentStudioRepository',()=>({ContentStudioRepository:class {publishedRuntime=publishedRuntime;}}));
import {GET} from '../../app/api/learning/page-activities/route';
const item=()=>({schemaVersion:1,itemType:'lesson',level:'hsk0',stableKey:'boot-1',title:'Bài',revisionId:'rev',revision:1,contentSha256:'header',publishedAt:1,content:{targetLessonId:'boot-1',lessonPages:{version:1,pages:[{id:'p',title:'Trang',layout:'focus',blocks:[{...emptyLessonBlock('b'),kind:'activity',body:'Điền từ',activity:{...emptyLessonActivity(),type:'cloze',acceptedAnswers:['秘密'],explanation:'Giải thích riêng'}}]}]}}});
beforeEach(()=>{publishedRuntime.mockReset();publishedRuntime.mockResolvedValue({schemaVersion:1,policy:'published-only',releaseBoundary:'content-release-worker-v1',items:[item()]});});
it('exposes only published activity identity without answers or feedback',async()=>{
 const response=await GET(new Request('http://localhost/api/learning/page-activities?lessonId=boot-1'));
 expect(response.status).toBe(200);
 const text=await response.text();
 expect(text).not.toContain('秘密');expect(text).not.toContain('Giải thích riêng');
 const body=JSON.parse(text);
 expect(body.activities).toHaveLength(1);
 expect(body.activities[0].activityVersion).toMatch(/^lesson-page-v1:sha256:[a-f0-9]{64}$/);
 expect(Object.keys(body.activities[0]).sort()).toEqual(['activityId','activityVersion','blockId','pageId','revisionId'].sort());
});
it('returns no bindings for unpublished lessons and fails closed on ambiguous releases',async()=>{
 expect((await(await GET(new Request('http://localhost/api/learning/page-activities?lessonId=boot-2'))).json()).activities).toEqual([]);
 const m=await publishedRuntime();publishedRuntime.mockResolvedValue({...m,items:[item(),item()]});
 expect((await GET(new Request('http://localhost/api/learning/page-activities?lessonId=boot-1'))).status).toBe(503);
 expect((await GET(new Request('http://localhost/api/learning/page-activities?lessonId=unknown'))).status).toBe(422);
});
