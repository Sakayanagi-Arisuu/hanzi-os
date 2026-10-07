import dictationEvidence from './fixtures/dictation-prerequisite-evidence.json' with {type:'json'};
import dictationBatch from '../content/drafts/thien-lo-hsk2-dictation-v2.json' with {type:'json'};
import referenceEvidence from './fixtures/reference-prerequisite-evidence.json' with {type:'json'};
import referenceBatch from '../content/drafts/thien-lo-hsk2-reference-v2.json' with {type:'json'};
import grammarEvidence from './fixtures/grammar-prerequisite-evidence.json' with {type:'json'};
import grammarBatch from '../content/drafts/thien-lo-hsk2-grammar-v2.json' with {type:'json'};
import studyWorkEvidence from './fixtures/study-work-prerequisite-evidence.json' with {type:'json'};
import studyWorkBatch from '../content/drafts/thien-lo-hsk2-study-work-v2.json' with {type:'json'};
import environmentEvidence from './fixtures/environment-prerequisite-evidence.json' with {type:'json'};
import environmentBatch from '../content/drafts/thien-lo-hsk2-environment-v2.json' with {type:'json'};
import { expect, test } from '@playwright/test';
import {readIndexedDbStore,type OwnerScopedCacheRecord} from './indexedDb';
import characterBatch from '../content/drafts/thien-lo-character-batch-v2.json' with {type:'json'};
import bootSoundBatch from '../content/drafts/thien-lo-boot-sound-batch-v2.json' with {type:'json'};
import type {LessonPageDocument} from '../src/learning/lessonPages';
import type {LessonReadingSession} from '../src/learning/lessonReadingSession';
import politeRequest from '../content/drafts/thien-lo-hsk2-polite-request-v2.json' with {type:'json'};
import foodShopping from '../content/drafts/thien-lo-hsk2-food-shopping-v2.json' with {type:'json'};
import healthBatch from '../content/drafts/thien-lo-hsk2-health-v2.json' with {type:'json'};
import familyDirections from '../content/drafts/thien-lo-hsk2-family-directions-v2.json' with {type:'json'};
import motionMeeting from '../content/drafts/thien-lo-hsk2-motion-meeting-v2.json' with {type:'json'};
import motionMeetingEvidence from './fixtures/motion-meeting-prerequisite-evidence.json' with {type:'json'};
import travelLeisure from '../content/drafts/thien-lo-hsk2-travel-leisure-v2.json' with {type:'json'};
import personEvents from '../content/drafts/thien-lo-hsk2-person-events-v2.json' with {type:'json'};
import travelLeisureEvidence from './fixtures/travel-leisure-prerequisite-evidence.json' with {type:'json'};
import personEventsEvidence from './fixtures/person-events-prerequisite-evidence.json' with {type:'json'};

for(const batch of [{name:'food and shopping',items:foodShopping.items},{name:'health',items:healthBatch.items},{name:'family and directions',items:familyDirections.items},{name:'motion and meeting',items:motionMeeting.items},{name:'travel and leisure',items:travelLeisure.items},{name:'person and events',items:personEvents.items},{name:'environment',items:environmentBatch.items},{name:'study and work',items:studyWorkBatch.items},{name:'grammar synthesis',items:grammarBatch.items},{name:'reference and reconstruction',items:referenceBatch.items}])test(`released HSK2 ${batch.name} lessons expose their own decisions and restore answers`,async({page,request})=>{
 await page.goto('/onboarding');
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
 if(batch.name==='motion and meeting'||batch.name==='travel and leisure'||batch.name==='person and events'||batch.name==='environment'||batch.name==='study and work'||batch.name==='grammar synthesis'||batch.name==='reference and reconstruction'){
  await page.goto(`/lesson/${batch.items[1].lessonId}`);
  await expect(page.getByRole('heading',{name:'Thử Luyện này chưa khai mở',exact:true})).toBeVisible();
  // Only this fresh Playwright guest receives synthetic prerequisite evidence.
  await page.evaluate(evidence=>{
   const key='hanzi-os-learning-state-v1';const state=JSON.parse(localStorage.getItem(key)!);
   state.evidence.push(...evidence);localStorage.setItem(key,JSON.stringify(state));
  },batch.name==='reference and reconstruction'?referenceEvidence:batch.name==='grammar synthesis'?grammarEvidence:batch.name==='study and work'?studyWorkEvidence:batch.name==='environment'?environmentEvidence:batch.name==='person and events'?personEventsEvidence:batch.name==='travel and leisure'?travelLeisureEvidence:motionMeetingEvidence);
 }else{
 const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
 const account=accounts.accounts.find((a:{username:string})=>a.username==='learner.demo');
 expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
 }
 const runtime=await(await page.request.get('/api/content/runtime?projection=learning')).json();
 for(const item of batch.items){
  expect(runtime.items[0].find((row:[string,unknown])=>row[0]===item.lessonId)?.[1]?.richContent?.lessonPages).toEqual(item.lessonPages);
  await page.goto(`/lesson/${item.lessonId}`);
  const reader=page.locator('.lesson-page-reader');
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:choice`);
  const activity=(item.lessonPages as LessonPageDocument).pages.find(p=>p.id.endsWith(':choice'))!.blocks[0].activity!;
  const answer=activity.options.find(o=>activity.answerIds.includes(o.id))!.text;
  await reader.getByRole('button',{name:answer,exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText(activity.explanation);
  await page.reload();
  await expect(reader.getByRole('button',{name:answer,exact:true})).toHaveAttribute('aria-pressed','true');
  if(batch.name==='reference and reconstruction'&&item.lessonId.includes('sentence-reconstruction')){
   const orderPage=(item.lessonPages as LessonPageDocument).pages.find(p=>p.id.endsWith(':reconstruct-0'))!;
   const order=orderPage.blocks[0].activity!;
   await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(orderPage.id);
   const expected=order.answerIds.map(id=>order.options.find(o=>o.id===id)!.text);
   for(const text of expected)await reader.getByRole('group',{name:'Các mảnh còn lại'}).getByRole('button',{name:text,exact:true}).click();
   await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
   await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
   await page.reload();
   await expect(reader.getByRole('group',{name:'Câu đang sắp xếp'}).getByRole('button')).toHaveText(expected);
  }
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:transfer`);
  await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption('1');
  await reader.getByLabel('Bản viết của bạn').fill('Tôi tự viết theo thông tin mới rồi đối chiếu.');
  await reader.getByRole('button',{name:'Xem hướng dẫn đối chiếu',exact:true}).click();
  const transfer=(item.lessonPages as LessonPageDocument).pages.find(p=>p.id.endsWith(':transfer'))!.blocks.find(b=>b.activity)!;
  await expect(reader.getByRole('status')).toContainText(transfer.activity!.explanation);
 }
});

test('existing demo account opens the released boot lesson pages',async({page})=>{
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  const accounts=await(await page.request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const account=accounts.accounts.find((a:{username:string})=>a.username==='learner.demo');
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  const runtime=await(await page.request.get('/api/content/runtime?projection=learning')).json();
  const boot=runtime.items[0].find((item:[string,unknown])=>item[0]==='boot-1');
  expect(boot?.[1]?.richContent?.lessonPages?.pages?.length).toBeGreaterThan(0);
  const browserRuntime=page.waitForResponse(r=>r.url().includes('/api/content/runtime?projection=learning'),{timeout:30000});
  await page.goto('/lesson/boot-1');
  const loaded=await browserRuntime;
  expect(loaded.status()).toBe(200);
  const browserContent=await loaded.json();
  expect(browserContent.items[0].find((item:[string,unknown])=>item[0]==='boot-1')?.[1]?.richContent?.lessonPages?.pages?.length).toBe(12);
  await expect(page.locator('.lesson-page-reader')).toBeVisible({timeout:30000});
  await expect(page.getByRole('combobox',{name:'Chọn trang học'})).toBeVisible();
});

test('lesson waits for published pages instead of showing legacy content during loading',async({page})=>{
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/content/runtime?projection=learning',async route=>{
    const response=await route.fetch();await gate;await route.fulfill({response});
  });
  try{
    await page.goto('/lesson/boot-1');
    await expect(page.getByRole('status').filter({hasText:'Đang tải nội dung bài học…'})).toBeVisible();
    await expect(page.locator('.lesson-theory-panel')).toHaveCount(0);
    release();
    await expect(page.getByRole('combobox',{name:'Chọn trang học'})).toBeVisible();
    await expect(page.getByRole('status').filter({hasText:'Đang tải nội dung bài học…'})).toHaveCount(0);
  }finally{release();await page.unrouteAll({behavior:'wait'});}
});

test('lesson fallback remains usable and retry opens released content',async({page})=>{
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  let unavailable=true;
  await page.route('**/api/content/runtime?projection=learning',async route=>{
    if(unavailable)await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'unavailable'})});
    else await route.continue();
  });
  await page.goto('/lesson/boot-1');
  await expect(page.locator('.lesson-theory-panel')).toBeVisible();
  await expect(page.getByRole('button',{name:'Thử tải lại',exact:true})).toBeVisible();
  unavailable=false;
  await page.getByRole('button',{name:'Thử tải lại',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Chọn trang học'})).toBeVisible();
  await expect(page.locator('.lesson-theory-panel')).toHaveCount(0);
});

test('page attempt API rejects anonymous and cross-site writes without altering learner data',async({request})=>{
  const anonymous=await request.post('/api/learning/page-attempts',{headers:{origin:'http://localhost:3000'},data:{}});
  expect(anonymous.status()).toBe(401);
  expect((await anonymous.json()).error.code).toBe('AUTH_REQUIRED');
  expect(anonymous.headers()['cache-control']).toContain('no-store');
  const crossSite=await request.post('/api/learning/page-attempts',{headers:{origin:'https://other.example'},data:{}});
  expect(crossSite.status()).toBe(403);
  // The dev server can reject Origin before the application returns JSON.
  const fetchSite=await request.post('/api/learning/page-attempts',{headers:{origin:'http://localhost:3000','sec-fetch-site':'cross-site'},data:{}});
  expect(fetchSite.status()).toBe(403);
  // Vinext checks Sec-Fetch-Site too; route JSON contracts are covered in Vitest.
});

test('page attempt API refuses an outdated account binding on the live server',async({request})=>{
  const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const account=accounts.accounts.find((a:{username:string})=>a.username==='learner.demo');
  expect((await request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  const session=await(await request.get('/api/session')).json();
  expect(session.authenticated).toBe(true);
  for(const owner of ['', 'outdated-owner']){
    const response=await request.post('/api/learning/page-attempts',{headers:{origin:'http://localhost:3000','x-learning-owner':owner},data:{}});
    expect(response.status()).toBe(409);
    expect((await response.json()).error.code).toBe('PAGE_ATTEMPT_OWNER_CHANGED');
  }
  const bound=await request.post('/api/learning/page-attempts',{headers:{origin:'http://localhost:3000','x-learning-owner':session.accountKey},data:{}});
  expect(bound.status()).toBe(422);
  expect((await bound.json()).error.code).toBe('INVALID_PAGE_ATTEMPT');
});

test('released page identities match every authored activity without returning answer keys',async({request})=>{
 for(const draft of [...bootSoundBatch.items,...characterBatch.items]){
  const response=await request.get(`/api/learning/page-activities?lessonId=${draft.lessonId}`);
  expect(response.ok()).toBe(true);
  const result=await response.json();
  const blocks=(draft.lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks.filter(b=>b.kind==='activity').map(b=>({pageId:p.id,blockId:b.id})));
  expect(result.activities.map((a:{pageId:string;blockId:string})=>({pageId:a.pageId,blockId:a.blockId}))).toEqual(blocks);
  for(const binding of result.activities){
   expect(Object.keys(binding).sort()).toEqual(['activityId','activityVersion','pageId','blockId','revisionId'].sort());
   expect(binding.activityVersion).toMatch(/^lesson-page-v1:sha256:[a-f0-9]{64}$/);
  }
 }
});

for(const mode of ['guest','account','lost-response','history-conflict'])test(`first page attempt survives a corrected answer and browser reload ${mode}`,async({page})=>{
  const accountMode=mode!=='guest';
  let rejectedCommand:string|undefined;
  const deliveries:Array<{key:string;attemptId:string;duplicate:boolean}>=[];
  if(accountMode)await page.route('**/api/learning/page-attempts',async route=>{
    if(mode==='history-conflict'&&!rejectedCommand){
      rejectedCommand=route.request().postData()!;
      await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:{code:'PAGE_ATTEMPT_CONFLICT'}})});
      return;
    }
    if(mode==='history-conflict')expect(route.request().postData()).toBe(rejectedCommand);
    const response=await route.fetch();
    expect(response.ok()).toBe(true);
    const receipt=await response.json();
    deliveries.push({key:receipt.idempotencyKey,attemptId:receipt.attemptId,duplicate:receipt.duplicate});
    if(mode==='lost-response'&&deliveries.length===1)await route.abort('failed');
    else await route.fulfill({response});
  });
  if(accountMode){
    const username=`queue-${Date.now()}`;
    expect((await page.request.post('/api/auth/hanzi/register',{headers:{origin:'http://localhost:3000'},data:{username,email:`${username}@example.invalid`,password:`Queue-${crypto.randomUUID()}`,displayName:'Kiểm thử lưu bài'}})).ok()).toBe(true);
  }
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  const bindingResponse=page.waitForResponse(response=>response.url().includes('/api/learning/page-activities?lessonId=boot-1')&&response.ok());
  await page.goto('/lesson/boot-1');
  await bindingResponse;
  const reader=page.locator('.lesson-page-reader');
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('boot-1:v2:recognize');
  await reader.getByRole('button',{name:'Thanh 1',exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText('Chưa đúng');
  const saved=async()=>{
    const records=await readIndexedDbStore<OwnerScopedCacheRecord<LessonReadingSession>>(page,'lesson-resumes');
    const session=records.find(r=>r.value.lessonId==='boot-1'&&r.value.document)?.value;
    return Object.values(session?.drafts??{}).find(d=>d.firstAttempt);
  };
  await expect.poll(async()=>!!(await saved())?.firstAttempt).toBe(true);
  const first=(await saved())!.firstAttempt!;
  expect(first.binding?.activityVersion).toMatch(/^lesson-page-v1:sha256:[a-f0-9]{64}$/);
  const queued=async()=>{
    const records=await readIndexedDbStore<OwnerScopedCacheRecord<{entries:Record<string,{command:{response:{answerIds:string[]}};delivery?:{status:string;receipt?:{masteryEligible:boolean}}}>}>>(page,'lesson-resumes');
    return Object.values(records.find(r=>r.entryKey==='page-attempt-outbox:v1')?.value.entries??{});
  };
  if(accountMode){
    await expect.poll(async()=>(await queued()).length).toBe(1);
    expect((await queued())[0].command.response.answerIds).toEqual(first.answerIds);
    if(mode==='history-conflict')await expect.poll(async()=>(await queued())[0]?.delivery?.status).toBe('conflict');
  }else expect(await queued()).toHaveLength(0);
  await reader.getByRole('button',{name:'Thanh 4',exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
  await expect.poll(async()=>(await saved())?.answerIds).not.toEqual(first.answerIds);
  expect((await saved())!.firstAttempt).toEqual(first);
  await page.reload();
  await expect(reader.getByRole('button',{name:'Thanh 4',exact:true})).toHaveAttribute('aria-pressed','true');
  expect((await saved())!.firstAttempt).toEqual(first);
  if(accountMode){
    expect(await queued()).toHaveLength(1);
    expect((await queued())[0].command.response.answerIds).toEqual(first.answerIds);
    if(mode==='lost-response'){
      await expect.poll(async()=>(await queued())[0]?.delivery?.status).toBe('pending');
      await page.goto('/path');
      await expect(page.locator('.lesson-page-reader')).toHaveCount(0);
    }
    await expect.poll(async()=>(await queued())[0]?.delivery?.status,{timeout:60000}).toBe('acknowledged');
    expect((await queued())[0].delivery?.receipt?.masteryEligible).toBe(false);
    if(mode==='history-conflict')expect(deliveries).toHaveLength(1);
    const analytics=await(await page.request.get('/api/learning/analytics')).json();
    expect(analytics.pagePractice).toEqual({attempts:1,unique:1,correct:0,incorrect:1,selfReview:0});
    expect(Object.values(analytics.skills as Record<string,{attempts:number}>).every(skill=>skill.attempts===0)).toBe(true);
    await page.goto('/analytics');
    await expect(page.getByText(/Thiên Lộ đã lưu 1 hoạt động khác nhau/)).toBeVisible();
    if(mode==='account')await page.screenshot({path:'tmp/thien-lo-page-practice-analytics.png',fullPage:true});
    if(mode==='lost-response'){
      expect(deliveries.length).toBeGreaterThanOrEqual(2);
      expect(new Set(deliveries.map(d=>d.key)).size).toBe(1);
      expect(new Set(deliveries.map(d=>d.attemptId)).size).toBe(1);
      expect(deliveries.at(-1)?.duplicate).toBe(true);
    }
  }else{
    await page.goto('/analytics');
    await expect(page.getByText(/Thiên Lộ đã lưu 1 hoạt động khác nhau: 0 lượt đúng, 1 lượt cần sửa/)).toBeVisible();
    await expect(page.getByText(/Lịch ghi theo thời gian lưu trên thiết bị/)).toBeVisible();
  }
});

test('a delayed binding never retrofits an earlier local first attempt',async({page})=>{
 let release!:()=>void;
 const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/learning/page-activities?lessonId=boot-1',async route=>{
  const response=await route.fetch();
  await gate;
  await route.fulfill({response});
 });
 await page.goto('/onboarding');
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
 await page.goto('/lesson/boot-1');
 const reader=page.locator('.lesson-page-reader');
 await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('boot-1:v2:recognize');
 const saved=async()=>{
  const records=await readIndexedDbStore<OwnerScopedCacheRecord<LessonReadingSession>>(page,'lesson-resumes');
  return Object.values(records.find(r=>r.value.lessonId==='boot-1'&&r.value.document)?.value.drafts??{}).find(d=>d.firstAttempt);
 };
 try{
  await reader.getByRole('button',{name:'Thanh 1',exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect.poll(async()=>!!(await saved())?.firstAttempt).toBe(true);
  const original=(await saved())!.firstAttempt!;
  expect(original.binding).toBeUndefined();
  const received=page.waitForResponse(r=>r.url().includes('/api/learning/page-activities?lessonId=boot-1'));
  release();await received;
  await reader.getByRole('button',{name:'Thanh 4',exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect.poll(async()=>(await saved())?.answerIds).not.toEqual(original.answerIds);
  expect((await saved())!.firstAttempt).toEqual(original);
  await page.reload();
  await expect(reader.getByRole('button',{name:'Thanh 4',exact:true})).toHaveAttribute('aria-pressed','true');
  expect((await saved())!.firstAttempt).toEqual(original);
 }finally{release();await page.unrouteAll({behavior:'wait'});}
});

test('foundation sound lessons publish their own rules and transfer activities',async({page,request})=>{
  const response=await request.get('/api/content/runtime?projection=learning');
  expect(response.ok()).toBe(true);
  const runtime=await response.json();
  const lessons=new Map<string,{richContent:{lessonPages:LessonPageDocument}}>(runtime.items[0]);
  for(const item of bootSoundBatch.items)expect(lessons.get(item.lessonId)?.richContent.lessonPages).toEqual(item.lessonPages);
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  const seeded=await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}});
  expect(seeded.ok()).toBe(true);
  const account=(await seeded.json()).accounts.find((a:{username:string})=>a.username==='learner.demo');
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  for(const item of bootSoundBatch.items){
    await page.goto(`/lesson/${item.lessonId}`);
    const reader=page.locator('.lesson-page-reader');
    await expect(reader.getByRole('combobox',{name:'Chọn trang học'}).locator('option')).toHaveCount(item.lessonPages.pages.length);
    const quiz=(item.lessonPages as LessonPageDocument).pages.find(p=>p.blocks.some(b=>b.activity?.type==='choice'))!;
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(quiz.id);
    const activity=quiz.blocks[0].activity!;
    await reader.getByRole('button',{name:activity.options.find(o=>o.id!==activity.answerIds[0])!.text,exact:true}).click();
    await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
    await expect(reader.getByRole('status')).toContainText('Chưa đúng');
    await reader.getByRole('button',{name:activity.options.find(o=>o.id===activity.answerIds[0])!.text,exact:true}).click();
    await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
    await expect(reader.getByRole('status')).toContainText(activity.explanation);
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:transfer`);
    await reader.getByRole('textbox').fill('Tôi tự thử trước khi đối chiếu');
    await reader.getByRole('button',{name:'Xem hướng dẫn đối chiếu',exact:true}).click();
    const transfer=(item.lessonPages as LessonPageDocument).pages.find(p=>p.id.endsWith(':transfer'))!.blocks[0];
    await expect(reader.getByRole('status')).toContainText(transfer.activity!.explanation);
    await reader.locator('.jade-rubric-checklist summary').click();
    await reader.getByRole('checkbox').first().check();
    await expect(reader.getByRole('status')).toContainText(transfer.activity!.explanation);
    await expect(reader.getByRole('checkbox').first()).toBeChecked();
    await reader.locator('.jade-rubric-checklist summary').click();
    for(const viewport of [{width:1235,height:640},{width:375,height:812}]){
      await page.setViewportSize(viewport);
      await expect.poll(()=>reader.locator('footer').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;})).toBe(true);
    }
    await page.screenshot({path:`tmp/${item.lessonId}-authored-transfer.png`});
  }
});

test('published character batch reaches the learner with editable answers and restored reading position',async({page,request})=>{
  const response=await request.get('/api/content/runtime?projection=learning');
  expect(response.ok()).toBe(true);
  const runtime=await response.json();
  const lessons=new Map<string,{richContent:{lessonPages:LessonPageDocument}}>(runtime.items[0]);
  for(const item of characterBatch.items)expect(lessons.get(item.lessonId)?.richContent.lessonPages).toEqual(item.lessonPages);
  const seeded=await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}});
  expect(seeded.ok()).toBe(true);
  const account=(await seeded.json()).accounts.find((a:{username:string})=>a.username==='learner.demo');
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  await page.goto('/lesson/characters-3');
  const reader=page.locator('.lesson-page-reader');
  await expect(reader).toBeVisible();
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('characters-3:v2:guided');
  await expect(reader.locator('.lesson-block')).toContainText('hai ô dùng cùng một chữ');
  await reader.getByRole('textbox').fill('妈');
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
  await page.reload();
  await expect(reader.getByRole('combobox',{name:'Chọn trang học'})).toHaveValue('characters-3:v2:guided');
  await expect(reader.getByRole('textbox')).toHaveValue('妈');
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('characters-3:v2:transfer');
  await reader.getByRole('textbox').fill('这是你的妈妈吗？');
  await reader.getByRole('button',{name:'Xem hướng dẫn đối chiếu',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText('这是你的妈妈吗？');
  for(const viewport of [{width:1235,height:640},{width:375,height:812},{width:812,height:375}]){
    await page.setViewportSize(viewport);
    await expect.poll(()=>reader.locator('footer').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;})).toBe(true);
  }
});

test('account trial keeps its current question when reviewing authored theory',async({page})=>{
  // Register before onboarding so the new profile is authored in its own scope.
  const username=`ui-${Date.now()}`;
  const registered=await page.request.post('/api/auth/hanzi/register',{headers:{origin:'http://localhost:3000'},data:{username,email:`${username}@example.invalid`,password:`Ui-${crypto.randomUUID()}`,displayName:'Kiểm thử giao diện'}});
  expect(registered.ok()).toBe(true);
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  await expect(page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true})).toBeHidden();
  await page.goto('/lesson/boot-1');
  const reader=page.locator('.lesson-page-reader');
  await expect(reader.or(page.locator('.lesson-live-page'))).toBeVisible();
  if(await reader.isVisible()){
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('boot-1:v2:recap');
    await reader.getByRole('button',{name:/^(Bắt đầu luyện tập|Tiếp tục Thử Luyện)$/}).click();
  }
  const live=page.locator('.lesson-live-page');
  await expect(live).toBeVisible();
  const progress=live.getByRole('progressbar',{name:'Tiến độ Thử Luyện'});
  const index=await progress.getAttribute('aria-valuenow');
  for(const viewport of [{width:1440,height:900},{width:375,height:812},{width:812,height:375}]){
    await page.setViewportSize(viewport);
    await expect.poll(()=>live.locator('.answer-console').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;})).toBe(true);
  }
  await live.getByRole('button',{name:'Lý thuyết',exact:true}).click();
  await expect(live.locator('.lesson-page-reader')).toBeVisible();
  await expect(live.locator('.answer-console')).toContainText('trợ giúp');
  await live.getByRole('button',{name:`Quay lại câu ${index}`,exact:true}).click();
  await expect(progress).toHaveAttribute('aria-valuenow',index!);
  await expect(live.locator('.lesson-page-reader')).toBeHidden();
  await page.screenshot({path:'tmp/account-trial-landscape.png'});
});

for(const pass of [false,true])test(`lesson study keeps navigation visible through preparation and practice ${pass?'with reward':'with retry'}`, async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  await page.goto('/lesson/boot-1');
  await expect(page.locator('.lesson-page-reader')).toBeVisible();
  const invitation = page.getByRole('button',{name:'Đóng lời mời Khảo Nghiệm Căn Cơ'});
  if(await invitation.isVisible()) await invitation.click();
  for (const viewport of [{width:1440,height:900},{width:375,height:812},{width:812,height:375}]) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(()=>page.locator('.lesson-page-reader > footer').evaluate(el => {
      const box = el.getBoundingClientRect();
      return box.top >= 0 && box.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth;
    })).toBe(true);
  }
  await page.setViewportSize({width:1440,height:900});
  await page.screenshot({path:'tmp/lesson-study-briefing.png'});
  await page.getByRole('combobox',{name:'Chọn trang học'}).selectOption('boot-1:v2:recap');
  await page.getByRole('button',{name:'Bước vào Thử Luyện',exact:true}).click();
  await expect(page.locator('.lesson-live-page')).toBeVisible();
  for (const viewport of [{width:1440,height:900},{width:375,height:812},{width:812,height:375}]) {
    await page.setViewportSize(viewport);
    await expect.poll(()=>page.locator('.answer-console').evaluate(el => {
      const box=el.getBoundingClientRect();return box.top >= 0 && box.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth;
    })).toBe(true);
  }
  await page.screenshot({path:'tmp/lesson-study-landscape.png'});
  await page.setViewportSize({width:375,height:812});
  await page.screenshot({path:'tmp/lesson-study-mobile.png'});
  // Complete the real isolated guest session; do not seed completion or rewards.
  for(let step=0;step<60&&await page.locator('.lesson-live-page').isVisible();step++){
    let answer='chưa nhớ';
    if(pass){
      type Resume={lessonId:string;index:number;checked:boolean;exercises:Array<{correct:string}>};
      const records=await readIndexedDbStore<OwnerScopedCacheRecord<Resume>>(page,'lesson-resumes');
      const resume=records.find(r=>r.value?.lessonId==='boot-1'&&Array.isArray(r.value.exercises))?.value;
      expect(resume).toBeTruthy();
      answer=resume!.exercises[resume!.index].correct;
    }
    const recall=page.locator('.recall-answer input');
    if(await recall.isVisible())await recall.fill(answer);
    else if(pass)await page.locator('.answer-grid > button').filter({has:page.locator('strong').filter({hasText:new RegExp(`^${answer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`)})}).click();
    else await page.locator('.answer-grid > button').first().click();
    await page.getByRole('button',{name:'Xác nhận',exact:true}).click();
    await page.getByRole('button',{name:/^(Câu tiếp theo|Hoàn tất thử luyện)$/}).click();
    await expect(page.getByRole('button',{name:'Xác nhận',exact:true}).or(page.getByTestId('lesson-quest-result'))).toBeVisible();
  }
  const result=page.getByTestId('lesson-quest-result');
  await expect(result).toBeVisible();
  if(!pass)await expect(result.getByRole('link',{name:'Xem câu cần ôn',exact:true})).toHaveAttribute('href','/mistakes');
  await expect(result).not.toContainText('BOOT-1');
  if(pass){
    await expect(result).toContainText('CỬA ẢI HOÀN TẤT');
    const chest=result.getByRole('button',{name:/Mở rương nhận/});
    await expect(chest).toBeVisible();
    await page.setViewportSize({width:375,height:812});
    await expect(chest).toBeInViewport();
    await chest.click();
    await expect(result.locator('.path-clear-reward')).toContainText('Phần thưởng đã ghi vào hành trình');
    await expect(chest).toHaveCount(0);
  }
  await result.getByText('Hiểu kết quả và bước ôn tiếp',{exact:true}).click();
  await expect(result).toContainText('Vượt ải chưa có nghĩa đã thành thạo lâu dài');
  for(const viewport of [{width:1440,height:900},{width:375,height:812},{width:812,height:375}]){
    await page.setViewportSize(viewport);
    if(viewport.width<=760||viewport.height<=500)await expect(result.locator('.path-clear-map')).toBeHidden();
    await expect.poll(()=>result.locator('.path-clear-actions').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;})).toBe(true);
    await expect.poll(()=>result.locator('.path-clear-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await page.screenshot({path:`tmp/lesson-result-jade-${pass?'reward':'retry'}-${viewport.width}.png`});
  }
});

test('released contextual tasks reach the learning consumer with their own answer', async ({request}) => {
  const response=await request.get('/api/content/runtime?projection=learning');
  expect(response.ok()).toBe(true);
  const payload=await response.json();
  const enhancements=payload.items[1] as Array<[string,{tasks:Array<{modelDialogue:Array<{hanzi:string;pinyin:string;meaningVi:string}>}>}]>;
  expect(enhancements.length).toBeGreaterThanOrEqual(213);
  const ownAnswers=enhancements.flatMap(([,item])=>item.tasks).filter(task=>task.modelDialogue.length === 1);
  expect(ownAnswers.length).toBeGreaterThanOrEqual(6019);
  expect(ownAnswers.every(task=>task.modelDialogue[0].hanzi && task.modelDialogue[0].pinyin && task.modelDialogue[0].meaningVi)).toBe(true);
});

test('dialogue fills the artwork frame and keeps listening controls in the viewport',async({page})=>{
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  const accounts=await(await page.request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const account=accounts.accounts.find((a:{username:string})=>a.username==='learner.demo');
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  await page.goto('/lesson/hsk2-daily-needs-family-lesson-01');
  const reader=page.locator('.lesson-page-reader');
  await expect(reader).toBeVisible();
  const select=reader.getByRole('combobox',{name:'Chọn trang học'});
  const dialogue=`${politeRequest.lessonId}:v2:dialogue`;
  expect(dialogue).toBeTruthy();
  await select.selectOption(dialogue!);
  await expect(reader.locator('.jade-scene figcaption')).toHaveCount(0);
  const runtime=await(await page.request.get('/api/content/runtime?projection=learning')).json();
  expect(runtime.items[0].find((item:[string,unknown])=>item[0]===politeRequest.lessonId)?.[1]?.richContent?.lessonPages).toEqual(politeRequest.lessonPages);
  await expect(page.locator('.lesson-briefing-scroll > .synthetic-audio-note')).toHaveCount(0);
  for(const viewport of [{width:1235,height:640},{width:375,height:812},{width:812,height:375}]){
    await page.setViewportSize(viewport);
    await expect.poll(()=>reader.locator('.jade-scene img').evaluate(el=>{
      const frame=el.parentElement!;
      return getComputedStyle(el).objectFit==='cover' && Math.abs(el.clientWidth-frame.clientWidth)<=1 && Math.abs(el.clientHeight-frame.clientHeight)<=1;
    })).toBe(true);
    for(const locator of [reader.locator('.jade-scene img'),reader.getByRole('button',{name:'Nghe trọn tình huống Giọng tổng hợp',exact:true}),reader.locator('.jade-transcript-toggle'),reader.locator('footer')]){
      await expect.poll(()=>locator.evaluate(el=>{const r=el.getBoundingClientRect();return r.height>20&&r.top>=0&&r.bottom<=innerHeight&&r.right<=innerWidth;})).toBe(true);
    }
    await expect.poll(()=>reader.locator('.lesson-page-content').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
    await page.screenshot({path:`tmp/lesson-dialogue-fit-${viewport.width}.png`});
  }
  await reader.locator('.jade-transcript-toggle').click();
  await expect(reader.locator('.lesson-block-dialogue').first()).toBeVisible();
  await reader.locator('.jade-blocks').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await reader.getByRole('button',{name:'Mục tiếp',exact:true}).click();
  await expect.poll(()=>reader.locator('.jade-blocks').evaluate(el=>el.scrollTop)).toBe(0);
  await select.selectOption(`${politeRequest.lessonId}:v2:clarify`);
  await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption('2');
  await reader.getByRole('button',{name:'这扇门，谢谢。',exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
  await page.reload();
  await expect(reader.getByRole('button',{name:'这扇门，谢谢。',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('lesson items fit independently and restore their place and response',async({page})=>{
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  await expect(page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true})).toBeHidden();
  await page.goto('/lesson/boot-1');
  const reader=page.locator('.lesson-page-reader');
  await expect(reader.locator('.lesson-block')).toHaveCount(1);
  for(const viewport of [{width:1235,height:640},{width:375,height:812}]){
    await page.setViewportSize(viewport);
    await page.screenshot({path:`tmp/lesson-items-${viewport.width}.png`});
    await expect.poll(()=>reader.locator('.jade-blocks').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
    await expect.poll(()=>reader.locator('footer').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;})).toBe(true);
    await page.screenshot({path:`tmp/lesson-items-${viewport.width}.png`});
  }
  await reader.getByRole('button',{name:'Mục tiếp',exact:true}).click();
  await expect(reader.getByRole('combobox',{name:'Chọn mục trong trang'})).toHaveValue('1');
  await expect.poll(async()=>{
    type Resume={lessonId:string;blockIndex?:number;document?:unknown};
    const records=await readIndexedDbStore<OwnerScopedCacheRecord<Resume>>(page,'lesson-resumes');
    return records.find(r=>r.value.lessonId==='boot-1'&&r.value.document)?.value.blockIndex;
  }).toBe(1);
  await page.reload();
  await expect(reader.getByRole('combobox',{name:'Chọn mục trong trang'})).toHaveValue('1');
  await expect(reader.locator('.lesson-block h3')).toHaveText('Học bằng mắt và tai');
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('boot-1:v2:recognize');
  await reader.getByRole('button',{name:'Thanh 4',exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
  await reader.getByRole('button',{name:'Mục tiếp',exact:true}).click();
  await expect(reader.locator('.lesson-block h3')).toHaveText('Đổi sang một hướng khác');
  await reader.getByRole('button',{name:'Mục trước',exact:true}).click();
  await expect(reader.getByRole('button',{name:'Thanh 4',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
});


test('dictation lessons restore drafts and support history with distinct illustrations',async({page})=>{
 await page.goto('/onboarding');
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
 await page.goto(`/lesson/${dictationBatch.items[0].lessonId}`);
 await expect(page.getByRole('heading',{name:'Thử Luyện này chưa khai mở',exact:true})).toBeVisible();
 await page.evaluate(evidence=>{const key='hanzi-os-learning-state-v1';const state=JSON.parse(localStorage.getItem(key)!);state.evidence.push(...evidence);localStorage.setItem(key,JSON.stringify(state));},dictationEvidence);
 const runtime=await(await page.request.get('/api/content/runtime?projection=learning')).json();
 for(const item of dictationBatch.items){
  expect(runtime.items[0].find((row:[string,unknown])=>row[0]===item.lessonId)?.[1]?.richContent?.lessonPages).toEqual(item.lessonPages);
  await page.goto(`/lesson/${item.lessonId}`);
  const reader=page.locator('.lesson-page-reader');
  await expect(reader.locator('.jade-scene img')).toHaveAttribute('src',item.lessonPages.pages[0].illustration!.src);
  const practice=(item.lessonPages as LessonPageDocument).pages.find(p=>p.blocks[0].kind==='dictation')!;
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(practice.id);
  await expect(reader.locator('.jade-reveal')).toHaveCount(0);
  await reader.getByRole('button',{name:'Nghe đoạn cần chép · giọng tổng hợp',exact:true}).click();
  await reader.getByRole('textbox',{name:'Câu trả lời của bạn'}).fill('我的草稿');
  await reader.getByRole('button',{name:'Tôi đã dùng Pinyin / gợi ý bàn phím',exact:true}).click();
  await reader.getByRole('button',{name:'Đối chiếu câu',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText('Bản chép khác lời mẫu');
  await reader.getByRole('button',{name:'Cần xem mẫu',exact:true}).click();
  await expect(reader.locator('.jade-reveal')).toContainText(practice.blocks[0].hanzi);
  await reader.getByRole('button',{name:'Thu mẫu lại',exact:true}).click();
  await page.reload();
  await expect(reader.getByRole('textbox',{name:'Câu trả lời của bạn'})).toHaveValue('我的草稿');
  await expect(reader.getByRole('button',{name:'Đã ghi nhận dùng Pinyin / gợi ý bàn phím',exact:true})).toBeDisabled();
  await expect(reader.locator('.jade-reveal')).toHaveCount(0);
  await reader.getByRole('textbox',{name:'Câu trả lời của bạn'}).fill(practice.blocks[0].hanzi);
  await reader.getByRole('button',{name:'Đối chiếu câu',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText('Bản chép khớp lời mẫu');
 }
});
