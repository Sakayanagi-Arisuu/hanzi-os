import { expect, test } from '@playwright/test';
import schoolDraft from '../content/drafts/thien-lo-professional-1-v2.json' with { type: 'json' };
import readingDraft from '../content/drafts/thien-lo-hsk3-timeline-v2.json' with { type: 'json' };
import timelineEvidence from './fixtures/timeline-prerequisite-evidence.json' with {type:'json'};
import greetingDraft from '../content/drafts/thien-lo-boot-2-v2.json' with {type:'json'};
import classroomDraft from '../content/drafts/thien-lo-professional-2-v2.json' with {type:'json'};
import materialsDraft from '../content/drafts/thien-lo-professional-3-v2.json' with {type:'json'};
import scheduleDraft from '../content/drafts/thien-lo-professional-4-v2.json' with {type:'json'};
import survivalBatch from '../content/drafts/thien-lo-survival-batch-v2.json' with {type:'json'};
import everydayBatch from '../content/drafts/thien-lo-everyday-batch-v2.json' with {type:'json'};
import journeyBatch from '../content/drafts/thien-lo-journey-batch-v2.json' with {type:'json'};
import characterBatch from '../content/drafts/thien-lo-character-batch-v2.json' with {type:'json'};
import bootSoundBatch from '../content/drafts/thien-lo-boot-sound-batch-v2.json' with {type:'json'};
import type {LessonPageDocument} from '../src/learning/lessonPages';
import bootTargetPlan from '../content/drafts/thien-lo-boot-1-activity-targets.json' with {type:'json'};
import bootOriginal from '../content/drafts/thien-lo-boot-1-v2.json' with {type:'json'};
import bootTargetReview from '../content/review/thien-lo-boot-1-activity-targets-local.json' with {type:'json'};
import politeRequest from '../content/drafts/thien-lo-hsk2-polite-request-v2.json' with {type:'json'};
import foodShopping from '../content/drafts/thien-lo-hsk2-food-shopping-v2.json' with {type:'json'};
import healthBatch from '../content/drafts/thien-lo-hsk2-health-v2.json' with {type:'json'};
import familyDirections from '../content/drafts/thien-lo-hsk2-family-directions-v2.json' with {type:'json'};
import motionMeeting from '../content/drafts/thien-lo-hsk2-motion-meeting-v2.json' with {type:'json'};
type BrowserBatch={name:string;items:Array<{lessonId:string;title:string;studioContent:unknown;lessonPages:LessonPageDocument}>};

for(const batch of [{name:'food and shopping',items:foodShopping.items},{name:'health',items:healthBatch.items},{name:'family and directions',items:familyDirections.items},{name:'motion and meeting',items:motionMeeting.items}])test(`HSK2 ${batch.name} drafts preserve their distinct decisions in Studio`,async({page,request})=>{
 const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
 const account=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
 expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
 for(const item of batch.items){
  expect((await page.goto(`/studio?q=thien-lo-v2-${item.lessonId}`))?.ok()).toBe(true);
  await page.locator('.studio-revision-card').filter({has:page.getByRole('heading',{name:item.title,exact:true})}).getByRole('link',{name:'Tiếp tục soạn'}).click();
  expect(JSON.parse(await page.locator('input[name=lessonPages]').inputValue())).toEqual(item.lessonPages);
  await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
  const reader=page.locator('.studio-form-section.lesson-pages-editor .lesson-page-reader');
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:facts`);
  await expect(reader.locator('.jade-diagram li')).toHaveCount(item.lessonId.endsWith('03')?2:3);
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:choice`);
  const activity=(item.lessonPages as LessonPageDocument).pages.find(p=>p.id.endsWith(':choice'))!.blocks[0].activity!;
  await reader.getByRole('button',{name:activity.options.find(o=>!activity.answerIds.includes(o.id))!.text,exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText('Chưa đúng');
  await reader.getByRole('button',{name:activity.options.find(o=>activity.answerIds.includes(o.id))!.text,exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText(activity.explanation);
 }
});

test('HSK2 polite request draft previews its own clarification and transfer in Studio',async({page,request})=>{
 const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
 const account=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
 expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
 expect((await page.goto(`/studio?q=thien-lo-v2-${politeRequest.lessonId}`))?.ok()).toBe(true);
 await page.locator('.studio-revision-card').filter({has:page.getByRole('heading',{name:politeRequest.title,exact:true})}).getByRole('link',{name:'Tiếp tục soạn'}).click();
 expect(JSON.parse(await page.locator('input[name=lessonPages]').inputValue())).toEqual(politeRequest.lessonPages);
 await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
 const reader=page.locator('.studio-form-section.lesson-pages-editor .lesson-page-reader');
 await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${politeRequest.lessonId}:v2:clarify`);
 await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption('2');
 await reader.getByRole('button',{name:'可以。',exact:true}).click();
 await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
 await expect(reader.getByRole('status')).toContainText('chưa xác nhận cửa nào');
 await reader.getByRole('button',{name:'这扇门，谢谢。',exact:true}).click();
 await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
 await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
 await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${politeRequest.lessonId}:v2:transfer`);
 await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption('1');
 await expect(reader.locator('.jade-rubric-checklist')).toHaveCount(0);
 await reader.getByLabel('Bản viết của bạn').fill('请帮我打个电话。给老师打。谢谢。');
 await reader.getByRole('button',{name:'Xem hướng dẫn đối chiếu',exact:true}).click();
 await expect(reader.getByRole('status')).toContainText('给老师打，还是给同学打');
 await reader.locator('.jade-rubric-checklist summary').click();
 await expect(reader.getByRole('checkbox')).toHaveCount(4);
 await page.screenshot({path:'tmp/hsk2-polite-request-studio.png'});
});

test('Studio lesson search opens its target draft from the library',async({page,request})=>{
 const seeded=await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}});
 expect(seeded.ok()).toBe(true);
 const account=(await seeded.json()).accounts.find((a:{username:string})=>a.username==='editor.demo');
 expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
 const response=await page.goto('/studio?q=thien-lo-v2-boot-1');
 expect(response?.ok()).toBe(true);
 await expect(page.locator('.studio-revision-card').filter({has:page.getByRole('heading',{name:bootOriginal.title,exact:true})})).toHaveCount(2);
 expect((await page.reload())?.ok()).toBe(true);
 await page.locator(`.studio-revision-card a[href="/studio/items/${bootTargetReview.draftRevisionId}"]`).click();
 await expect(page.locator('input[name=lessonPages]')).toHaveCount(1);
});

test('boot target revision exposes all four objectives and preserves learner answers in Studio',async({page,request})=>{
 const seeded=await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}});
 expect(seeded.ok()).toBe(true);
 const account=(await seeded.json()).accounts.find((a:{username:string})=>a.username==='editor.demo');
 expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
 const response=await page.goto(`/studio/items/${bootTargetReview.draftRevisionId}`);
 expect(response?.ok()).toBe(true);
 const document:LessonPageDocument=JSON.parse(await page.locator('input[name=lessonPages]').inputValue());
 const stripped=structuredClone(document);
 for(const p of stripped.pages)for(const b of p.blocks)if(b.activity)delete b.activity.learningTarget;
 expect(stripped).toEqual(bootOriginal.lessonPages);
 const activities=document.pages.flatMap((p,index)=>p.blocks.filter(b=>b.activity).map(b=>({page:p,index,block:b})));
 expect(activities).toHaveLength(4);
 for(const item of activities){
  await page.getByRole('navigation',{name:'Các trang đang soạn'}).getByRole('button',{name:`${item.index+1}. ${item.page.title}`,exact:true}).click();
  const editor=page.locator('.lesson-activity-editor').nth(item.page.blocks.filter(b=>b.activity).findIndex(b=>b.id===item.block.id));
  if(!await editor.locator('details').evaluate(el=>el.hasAttribute('open')))await editor.locator('summary').click();
  const target=bootTargetPlan.targets[item.block.id as keyof typeof bootTargetPlan.targets];
  await expect(editor.getByLabel('Kỹ năng được luyện')).toHaveValue(target.skill);
  await expect(editor.getByLabel('Người học làm được gì?')).toHaveValue(target.objective);
  await expect(editor.getByLabel('Nguồn trong bài 1')).toHaveValue(target.sources[0].id);
 }
 await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
 const reader=page.locator('.studio-form-section.lesson-pages-editor .lesson-page-reader');
 for(const item of activities){
  const activity=item.block.activity!;
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(item.page.id);
  if(item.page.blocks.length>1)await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption(String(item.page.blocks.findIndex(b=>b.id===item.block.id)));
  if(activity.type==='choice'){
   const wrong=activity.options.find(o=>!activity.answerIds.includes(o.id))!;
   await reader.getByRole('button',{name:wrong.text,exact:true}).click();
   await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
   await expect(reader.getByRole('status')).toContainText('Chưa đúng');
   await reader.getByRole('button',{name:activity.options.find(o=>o.id===activity.answerIds[0])!.text,exact:true}).click();
   await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
   await expect(reader.getByRole('status')).toContainText(activity.explanation);
   await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
  }else{
   await reader.getByLabel('Bản viết của bạn').fill('Tôi đọc từng thanh rồi tự đối chiếu hướng giọng.');
   await reader.getByRole('button',{name:'Xem hướng dẫn đối chiếu',exact:true}).click();
   await expect(reader.getByRole('status')).toContainText('chưa được chấm tự động');
   await reader.locator('.jade-rubric-checklist summary').click();
   await expect(reader.getByRole('checkbox')).toHaveCount(activity.rubric.length);
  }
 }
 await page.screenshot({path:'tmp/boot-target-studio-preview.png'});
});

test('Studio saves an explicit activity skill and source without changing its answer',async({page,request})=>{
 const seeded=await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}});
 expect(seeded.ok()).toBe(true);
 const account=(await seeded.json()).accounts.find((a:{username:string})=>a.username==='editor.demo');
 expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
 const source=bootSoundBatch.items[0];
 const quiz=(source.lessonPages as LessonPageDocument).pages.find(p=>p.blocks.some(b=>b.activity?.type==='choice'))!;
 const document={...source.lessonPages,pages:[{...quiz,blocks:[quiz.blocks[0]]}]};
 const created=await page.request.post('/studio/actions',{headers:{origin:'http://localhost:3000'},form:{action:'create',itemType:'lesson',level:'hsk0',stableKey:`target-test-${Date.now()}`,title:'Kiểm thử mục tiêu hoạt động',idempotencyKey:crypto.randomUUID(),contentJson:JSON.stringify({...source.studioContent,lessonPages:document})}});
 expect(created.ok()).toBe(true);
 await page.goto(created.url());
 const editor=page.locator('.lesson-activity-editor');
 await editor.locator('summary').click();
 await editor.getByRole('button',{name:'Thêm mục tiêu hoạt động',exact:true}).click();
 await editor.getByLabel('Kỹ năng được luyện').selectOption('pronunciation');
 await editor.getByLabel('Người học làm được gì?').fill('Xác định vùng lưỡi của âm x bằng mô tả.');
 await editor.getByRole('button',{name:'Thêm nguồn liên kết',exact:true}).click();
 await editor.getByLabel('Loại nguồn 1').selectOption('pronunciation');
 await editor.getByLabel('Nguồn trong bài 1').selectOption('initial-contrast-jqx-zhchsh-zcs');
 await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
 await expect(page.getByRole('button',{name:'Xem như người học',exact:true})).toBeEnabled();
 await page.reload();
 const saved=JSON.parse(await page.locator('input[name=lessonPages]').inputValue()).pages[0].blocks[0].activity;
 expect(saved.learningTarget).toEqual({skill:'pronunciation',objective:'Xác định vùng lưỡi của âm x bằng mô tả.',sources:[{kind:'pronunciation',id:'initial-contrast-jqx-zhchsh-zcs'}]});
 expect(saved.answerIds).toEqual(quiz.blocks[0].activity!.answerIds);
});

test('foundation sound drafts preserve diagrams and rule feedback in Studio',async({page,request})=>{
 const seeded=await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}});
 expect(seeded.ok()).toBe(true);
 const account=(await seeded.json()).accounts.find((a:{username:string})=>a.username==='editor.demo');
 expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
 for(const draft of bootSoundBatch.items){
  await page.goto(`/studio?q=thien-lo-v2-${draft.lessonId}`);
  await page.locator('.studio-revision-card').filter({has:page.getByRole('heading',{name:draft.title,exact:true})}).getByRole('link',{name:'Tiếp tục soạn'}).click();
  expect(JSON.parse(await page.locator('input[name=lessonPages]').inputValue())).toEqual(draft.lessonPages);
  await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
  const reader=page.locator('.studio-form-section.lesson-pages-editor .lesson-page-reader');
  const pages=(draft.lessonPages as LessonPageDocument).pages;
  const diagramPage=pages.find(p=>p.blocks.some(b=>b.kind==='diagram'))!;
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(diagramPage.id);
  await expect(reader.locator('.jade-diagram li')).toHaveCount(diagramPage.blocks[0].diagram!.nodes.length);
  const quizPage=pages.find(p=>p.blocks.some(b=>b.activity?.type==='choice'))!;
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(quizPage.id);
  const activity=quizPage.blocks[0].activity!;
  await reader.getByRole('button',{name:activity.options.find(o=>o.id===activity.answerIds[0])!.text,exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText(activity.explanation);
 }
});

for(const batch of [{name:'survival',items:survivalBatch.items},{name:'everyday',items:everydayBatch.items},{name:'journey',items:journeyBatch.items}] as unknown as BrowserBatch[]){
test(`${batch.name} batch publishes every lesson and supports practice in the learner UI`,async({page,request})=>{
  const runtime=await(await request.get('/api/content/runtime?projection=learning')).json();
  const published=new Map(runtime.items[0] as Array<[string,{richContent:{lessonPages:unknown}}]>);
  for(const draft of batch.items)expect(published.get(draft.lessonId)?.richContent.lessonPages).toEqual(draft.lessonPages);
  const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const account=accounts.accounts.find((a:{username:string})=>a.username==='learner.demo');
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  for(const draft of batch.items){
    await page.goto(`/lesson/${draft.lessonId}`);
    const reader=page.locator('.lesson-page-reader');
    await expect(reader.getByRole('combobox',{name:'Chọn trang học'}).locator('option')).toHaveCount(draft.lessonPages.pages.length);
    const visual=draft.lessonPages.pages.find(p=>p.id.endsWith(':visual'));
    if(visual){
      await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(visual.id);
      await expect(reader.locator('.jade-diagram li')).toHaveCount(visual.blocks[0].diagram!.nodes.length);
    }
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${draft.lessonId}:v2:guided`);
    const activity=draft.lessonPages.pages.find(p=>p.id.endsWith(':guided'))!.blocks[0].activity!;
    await reader.getByRole('textbox').fill('错误');
    await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
    await expect(reader.getByRole('status')).toContainText('Chưa đúng');
    await reader.getByRole('textbox').fill(activity.acceptedAnswers[0]);
    await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
    await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
  }
  const reader=page.locator('.lesson-page-reader');
  for(const viewport of [{width:1440,height:900},{width:375,height:812},{width:812,height:375}]){
    await page.setViewportSize(viewport);
    await expect.poll(()=>reader.locator(':scope > footer').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;})).toBe(true);
  }
  await page.screenshot({path:`tmp/${batch.name}-batch-landscape.png`});
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${batch.items.at(-1)!.lessonId}:v2:recap`);
  await reader.getByRole('button',{name:/^(Bắt đầu luyện tập|Tiếp tục Thử Luyện)$/}).click();
  await expect(reader).toBeHidden();
});

test(`${batch.name} batch guided practice remains editable through Studio`,async({page,request})=>{
  const draft=batch.items[batch.name==='everyday'?8:batch.name==='journey'?0:6];
  const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const account=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  const key=`hsk1.lesson.${batch.name}-smoke-${Date.now()}`;
  const created=await page.request.post('/studio/actions',{headers:{origin:'http://localhost:3000'},form:{action:'create',itemType:'lesson',level:'hsk1',stableKey:key,title:draft.title,idempotencyKey:key,contentJson:JSON.stringify(draft.studioContent)}});
  await page.goto(created.url());
  await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
  const reader=page.locator('.studio-form-section.lesson-pages-editor .lesson-page-reader');
  for(const p of draft.lessonPages.pages){
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(p.id);
    await expect(reader.locator('.jade-page-title h2')).toHaveText(p.title);
  }
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${draft.lessonId}:v2:guided`);
  await reader.getByRole('textbox').fill(draft.lessonPages.pages.find(p=>p.id.endsWith(':guided'))!.blocks[0].activity!.acceptedAnswers[0]);
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
  await page.getByRole('button',{name:'Tiếp tục soạn',exact:true}).click();
  await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
  await expect(page.getByRole('button',{name:'Xem như người học',exact:true})).toBeEnabled();
  expect(JSON.parse(await page.locator('input[name=lessonPages]').inputValue())).toEqual(draft.lessonPages);
});
}

test('professional-4 timeline and transfer stay editable in Studio',async({page,request})=>{
  const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const account=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  const created=await page.request.post('/studio/actions',{headers:{origin:'http://localhost:3000'},form:{action:'create',itemType:'lesson',level:'hsk1',stableKey:`hsk1.lesson.schedule-${Date.now()}`,title:scheduleDraft.title,idempotencyKey:`schedule-${Date.now()}`,contentJson:JSON.stringify(scheduleDraft.studioContent)}});
  await page.goto(created.url());
  await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
  const reader=page.locator('.studio-form-section.lesson-pages-editor .lesson-page-reader');
  for(const p of scheduleDraft.lessonPages.pages){
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(p.id);
    await expect(reader.locator('.jade-page-title h2')).toHaveText(p.title);
  }
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('professional-4:v2:schedule');
  await expect(reader.locator('.jade-diagram li')).toHaveCount(4);
  await expect(reader.locator('.jade-diagram li').last()).toContainText('晚上八点');
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('professional-4:v2:transfer');
  await expect(reader).toContainText('4 giờ chiều');
  await page.getByRole('button',{name:'Tiếp tục soạn',exact:true}).click();
  await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
  await expect(page.getByRole('button',{name:'Xem như người học',exact:true})).toBeEnabled();
  expect(JSON.parse(await page.locator('input[name=lessonPages]').inputValue())).toEqual(scheduleDraft.lessonPages);
});

for(const draft of [classroomDraft,materialsDraft])test(`${draft.lessonId} keeps alternative answers editable in Studio`,async({page,request})=>{
  const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const account=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  const created=await page.request.post('/studio/actions',{headers:{origin:'http://localhost:3000'},form:{action:'create',itemType:'lesson',level:'hsk1',stableKey:`hsk1.lesson.classroom-${Date.now()}`,title:draft.title,idempotencyKey:`classroom-${Date.now()}`,contentJson:JSON.stringify(draft.studioContent)}});
  await page.goto(created.url());
  await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
  const reader=page.locator('.studio-form-section.lesson-pages-editor .lesson-page-reader');
  for(const p of draft.lessonPages.pages){
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(p.id);
    await expect(reader.locator('.jade-page-title h2')).toHaveText(p.title);
  }
  const materials=draft.lessonId==='professional-3';
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${draft.lessonId}:v2:${materials?'action-check':'practice'}`);
  const practicePage=draft.lessonPages.pages.find(p=>p.id===`${draft.lessonId}:v2:${materials?'action-check':'practice'}`)!;
  await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption(String(practicePage.blocks.findIndex(b=>b.title===(materials?'Hai cách nói đều được':'Tự nhớ một tên ngôn ngữ'))));
  const recall=reader.locator('.lesson-block').filter({has:page.getByRole('heading',{name:materials?'Hai cách nói đều được':'Tự nhớ một tên ngôn ngữ',exact:true})});
  for(const answer of materials?['学','学习']:['汉语','中文']){
    await recall.getByRole('textbox').fill(answer);
    await recall.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
    await expect(recall.getByRole('status')).toContainText('Đúng');
  }
  await page.getByRole('button',{name:'Tiếp tục soạn',exact:true}).click();
  await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
  await expect(page.getByRole('button',{name:'Xem như người học',exact:true})).toBeEnabled();
  expect(JSON.parse(await page.locator('input[name=lessonPages]').inputValue())).toEqual(draft.lessonPages);
});

for(const draft of [greetingDraft,classroomDraft,materialsDraft,scheduleDraft])test(`released ${draft.lessonId} reaches learner with all pages and practice`,async({page,request})=>{
  const runtime=await(await request.get('/api/content/runtime?projection=learning')).json();
  expect(new Map(runtime.items[0] as Array<[string,{richContent:{lessonPages:unknown}}]>).get(draft.lessonId)?.richContent.lessonPages).toEqual(draft.lessonPages);
  const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const account=accounts.accounts.find((a:{username:string})=>a.username==='learner.demo');
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  await page.goto(`/lesson/${draft.lessonId}`);
  const reader=page.locator('.lesson-page-reader');
  await expect(reader.getByRole('combobox',{name:'Chọn trang học'}).locator('option')).toHaveCount(draft.lessonPages.pages.length);
  for(const viewport of [{width:1440,height:900},{width:375,height:812},{width:812,height:375}]){
    await page.setViewportSize(viewport);
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${draft.lessonId}:v2:${draft.lessonId==='boot-2'?'people':draft.lessonId==='professional-3'?'actions':draft.lessonId==='professional-4'?'schedule':'categories'}`);
    await expect(reader.locator('.jade-diagram li')).toHaveCount(draft.lessonId==='boot-2'?2:draft.lessonId==='professional-4'?4:3);
    await expect.poll(()=>reader.locator(':scope > footer').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;})).toBe(true);
    await page.screenshot({path:`tmp/released-${draft.lessonId}-${viewport.width}.png`});
  }
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${draft.lessonId}:v2:recap`);
  await reader.getByRole('button',{name:/^(Bắt đầu luyện tập|Tiếp tục Thử Luyện)$/}).click();
  await expect(reader).toBeHidden();
});

test('greeting manuscript previews all pages and preserves role activity in Studio',async({page,request})=>{
  const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const account=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  const created=await page.request.post('/studio/actions',{headers:{origin:'http://localhost:3000'},form:{action:'create',itemType:'lesson',level:'hsk0',stableKey:`hsk0.lesson.greeting-${Date.now()}`,title:greetingDraft.title,idempotencyKey:`greeting-${Date.now()}`,contentJson:JSON.stringify(greetingDraft.studioContent)}});
  await page.goto(created.url());
  await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
  const reader=page.locator('.studio-form-section.lesson-pages-editor .lesson-page-reader');
  for(const p of greetingDraft.lessonPages.pages){
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(p.id);
    await expect(reader.locator('.jade-page-title h2')).toHaveText(p.title);
  }
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('boot-2:v2:people');
  await expect(reader.locator('.jade-diagram li')).toHaveCount(2);
  await reader.getByRole('button',{name:'Mục tiếp',exact:true}).click();
  await reader.getByRole('button',{name:'我 · wǒ · tôi',exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText('我 sẽ chỉ B');
  await reader.getByRole('button',{name:'你 · nǐ · bạn',exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText('Đúng');
  await page.setViewportSize({width:375,height:812});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await reader.screenshot({path:'tmp/greeting-studio-mobile.png'});
  await page.getByRole('button',{name:'Tiếp tục soạn',exact:true}).click();
  await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
  await expect(page.getByRole('button',{name:'Xem như người học',exact:true})).toBeEnabled();
  expect(JSON.parse(await page.locator('input[name=lessonPages]').inputValue())).toEqual(greetingDraft.lessonPages);
});

test('released HSK3 reading preserves its gate and works for an unlocked guest fixture',async({page,request})=>{
  const runtime=await(await request.get('/api/content/runtime?projection=learning')).json();
  const released=new Map(runtime.items[0] as Array<[string,{richContent:{lessonPages:unknown}}]>).get(readingDraft.lessonId);
  expect(released?.richContent.lessonPages).toEqual(readingDraft.lessonPages);
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  await page.goto(`/lesson/${readingDraft.lessonId}`);
  await expect(page.getByRole('heading',{name:'Thử Luyện này chưa khai mở',exact:true})).toBeVisible();
  // Only this isolated Playwright guest: simulate a returning learner, never alter demo/account data.
  await page.evaluate(evidence=>{
    const key='hanzi-os-learning-state-v1';const state=JSON.parse(localStorage.getItem(key)!);
    state.evidence.push(...evidence);
    localStorage.setItem(key,JSON.stringify(state));
  },timelineEvidence);
  await page.reload();
  const reader=page.locator('.lesson-page-reader');
  await expect(reader.getByRole('combobox',{name:'Chọn trang học'}).locator('option')).toHaveCount(8);
  for(const viewport of [{width:1440,height:900},{width:375,height:812},{width:812,height:375}]){
    await page.setViewportSize(viewport);
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${readingDraft.lessonId}:v2:new-text`);
    await expect(reader.locator('.jade-reading-text li')).toHaveCount(4);
    await expect.poll(()=>reader.locator(':scope > footer').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;})).toBe(true);
    await page.screenshot({path:`tmp/released-timeline-${viewport.width}.png`});
  }
  await reader.getByRole('button',{name:'Chọn đoạn 2 làm bằng chứng',exact:true}).click();
  await reader.getByRole('textbox').fill('Đăng ký trước khi chuẩn bị; 第二天 nối ngày trước hoạt động.');
  await expect(reader.getByRole('button',{name:'Bỏ chọn đoạn 2 làm bằng chứng',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(reader.getByRole('link',{name:'Tra từ trong bài'})).toHaveAttribute('href',`/dictionary?lesson=${readingDraft.lessonId}`);
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${readingDraft.lessonId}:v2:recap`);
  await reader.getByRole('button',{name:'Bước vào Thử Luyện',exact:true}).click();
  await expect(reader).toBeHidden();
});

test('Studio binds each grammar example and practice independently of dialogue order',async({page,request})=>{
  const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const account=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  const content={...schoolDraft.studioContent,lessonPages:undefined,grammar:[
    {pattern:'Chủ ngữ + 在 + địa điểm',explanationVi:'Dùng 在 để nói vị trí hiện tại.'},
    {pattern:'Chủ ngữ + 是 + vai trò',explanationVi:'Dùng 是 để giới thiệu vai trò; câu mẫu này chưa được biên soạn.'},
  ]};
  const created=await page.request.post('/studio/actions',{headers:{origin:'http://localhost:3000'},form:{action:'create',itemType:'lesson',level:'hsk1',stableKey:`hsk1.lesson.grammar-binding-${Date.now()}`,title:'Nháp kiểm liên kết câu mẫu',idempotencyKey:`grammar-binding-${Date.now()}`,contentJson:JSON.stringify(content)}});
  await page.goto(created.url());
  await expect(page.getByRole('button',{name:'Soạn trang đầu tiên',exact:true})).toBeEnabled();
  const bound=page.locator('.studio-grammar-bound').first();
  await page.locator('summary').filter({hasText:'Hội thoại, ngữ pháp và thực hành'}).click();
  const fields={modelHanzi:'我在学校。',modelPinyin:'Wǒ zài xuéxiào.',modelMeaningVi:'Tôi ở trường.',practicePrompt:'Nói bạn đang ở nhà.',practiceHanzi:'我在家。',practicePinyin:'Wǒ zài jiā.',practiceMeaningVi:'Tôi ở nhà.'};
  for(const [field,value]of Object.entries(fields))await bound.locator(`[name="grammar.${field}"]`).fill(value);
  const saving=page.waitForRequest(request=>request.url().endsWith('/studio/actions')&&request.method()==='POST');
  await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
  const savedContent=JSON.parse(new URLSearchParams((await saving).postData()??'').get('contentJson')??'{}');
  expect(savedContent.grammar[0].modelExample.hanzi).toBe('我在学校。');
  await expect(page.locator('[name="grammar.modelHanzi"]').first()).toHaveValue('我在学校。');
  const preview=page.getByRole('region',{name:'Giao diện người học hiện tại'});
  await expect(preview.locator('.grammar-model-example')).toHaveCount(1);
  await expect(preview.locator('.grammar-model-example')).toContainText('我在学校。');
  await expect(preview.locator('.guided-practice-card')).toContainText('Nói bạn đang ở nhà.');
});

test('Studio edits long reading paragraphs and previews notes without awarding evidence',async({page,request})=>{
  const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const account=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  const created=await page.request.post('/studio/actions',{headers:{origin:'http://localhost:3000'},form:{action:'create',itemType:'lesson',level:'hsk3',stableKey:`hsk3.lesson.reading-preview-${Date.now()}`,title:readingDraft.title,idempotencyKey:`reading-preview-${Date.now()}`,contentJson:JSON.stringify(readingDraft.studioContent)}});
  await page.goto(created.url());
  await expect(page.getByRole('button',{name:'Xem như người học',exact:true})).toBeEnabled();
  await page.getByRole('navigation',{name:'Các trang đang soạn'}).getByRole('button').nth(1).click();
  await expect(page.getByRole('textbox',{name:'Văn bản Hán tự',exact:true})).toHaveCount(4);
  await page.getByRole('textbox',{name:'Yêu cầu ghi chú',exact:true}).fill('Giải thích nguyên nhân thay đổi bằng bằng chứng trong văn bản.');
  await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
  const reader=page.locator('.studio-form-section.lesson-pages-editor .lesson-page-reader');
  await reader.getByLabel('Chọn trang học').selectOption(`${readingDraft.lessonId}:v2:read`);
  await expect(reader.locator('.jade-reading-text li')).toHaveCount(4);
  await expect(reader.locator('.jade-pinyin')).toHaveCount(0);
  await reader.getByRole('button',{name:'Mở Pinyin',exact:true}).click();
  await expect(reader.locator('.jade-pinyin')).toHaveCount(4);
  await reader.getByRole('button',{name:'Mở nghĩa Việt',exact:true}).click();
  await reader.getByRole('button',{name:'Chọn đoạn 2 làm bằng chứng',exact:true}).click();
  await reader.getByRole('textbox').fill('Báo chỉ xuất bản mỗi tuần nên ông học cách đọc tin hằng ngày bằng điện thoại.');
  await expect(reader.getByRole('button',{name:'Bỏ chọn đoạn 2 làm bằng chứng',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(reader).toContainText('chưa chấm điểm đọc hiểu');
  await page.setViewportSize({width:375,height:812});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await reader.screenshot({path:'tmp/reading-editor-mobile.png'});
  await page.getByRole('button',{name:'Tiếp tục soạn',exact:true}).click();
  await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
  await expect(page.getByRole('button',{name:'Xem như người học',exact:true})).toBeEnabled();
  await page.getByRole('navigation',{name:'Các trang đang soạn'}).getByRole('button').nth(1).click();
  await expect(page.getByRole('textbox',{name:'Yêu cầu ghi chú',exact:true})).toHaveValue('Giải thích nguyên nhân thay đổi bằng bằng chứng trong văn bản.');
  await expect(page.getByRole('textbox',{name:'Văn bản Hán tự',exact:true})).toHaveCount(4);
});

test('released school manuscript reaches learner and keeps lesson practice available',async({page,request})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const account=accounts.accounts.find((a:{username:string})=>a.username==='learner.demo');
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  await page.goto('/lesson/professional-1');
  const reader=page.locator('.lesson-page-reader');
  await expect(reader.getByRole('combobox',{name:'Chọn trang học'}).locator('option')).toHaveCount(8);
  await expect(reader).toContainText('Làm quen với bạn học mới');
  for(const viewport of [{width:1440,height:900},{width:375,height:812},{width:812,height:375}]){
    await page.setViewportSize(viewport);
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('professional-1:v2:people-places');
    await expect(reader.locator('.jade-diagram li')).toHaveCount(3);
    await expect.poll(()=>reader.locator(':scope > footer').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;})).toBe(true);
    await page.screenshot({path:`tmp/released-school-${viewport.width}.png`});
  }
  await expect(reader.getByRole('link',{name:'Tra từ trong bài'})).toHaveAttribute('href','/dictionary?lesson=professional-1');
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('professional-1:v2:wrap');
  await reader.getByRole('button',{name:'Mục tiếp',exact:true}).click();
  await reader.getByRole('button',{name:/^(Bắt đầu luyện tập|Tiếp tục Thử Luyện)$/}).click();
  await expect(reader).toBeHidden();
  expect(errors).toEqual([]);
});

test('authored school lesson opens all eight pages in the same Studio reader',async({page,request})=>{
  const accounts=await (await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const account=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  const created=await page.request.post('/studio/actions',{headers:{origin:'http://localhost:3000'},form:{action:'create',itemType:'lesson',level:'hsk1',stableKey:`hsk1.lesson.school-preview-${Date.now()}`,title:schoolDraft.title,idempotencyKey:`school-preview-${Date.now()}`,contentJson:JSON.stringify(schoolDraft.studioContent)}});
  expect(created.url()).toContain('/studio/items/');
  await page.goto(created.url());
  await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
  const reader=page.locator('.studio-form-section.lesson-pages-editor .lesson-page-reader');
  for(const lessonPage of schoolDraft.lessonPages.pages){
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(lessonPage.id);
    await expect(reader.locator('.jade-page-title h2')).toHaveText(lessonPage.title);
  }
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('professional-1:v2:people-places');
  await expect(reader.locator('.jade-diagram li')).toHaveCount(3);
  await reader.getByRole('button',{name:'Mục tiếp',exact:true}).click();
  await reader.getByRole('button',{name:'大学生',exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
  await reader.screenshot({path:'tmp/school-lesson-editor-preview.png'});
  await page.getByRole('button',{name:'Tiếp tục soạn',exact:true}).click();
  await page.getByRole('navigation',{name:'Các trang đang soạn'}).getByRole('button').nth(2).click();
  await page.getByRole('button',{name:'Nhân bản trang',exact:true}).click();
  await expect(page.getByLabel('Tên trang',{exact:true})).toHaveValue('Trường học và người học là hai nhóm khác nhau · bản sao');
  const copied = JSON.parse(await page.locator('input[name=lessonPages]').inputValue());
  expect(copied.pages).toHaveLength(9);
  expect(copied.pages[3].blocks[1].activity.answerIds[0]).not.toBe(copied.pages[2].blocks[1].activity.answerIds[0]);
  await page.getByRole('button',{name:'Nhân bản khối',exact:true}).last().click();
  await page.getByRole('button',{name:'Đưa khối lên',exact:true}).last().click();
  await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
  await expect(page.getByRole('button',{name:'Xem như người học',exact:true})).toBeEnabled();
  await expect.poll(async()=>JSON.parse(await page.locator('input[name=lessonPages]').inputValue()).pages[3].blocks.length).toBe(3);
  await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(copied.pages[3].id);
  await page.setViewportSize({width:375,height:812});
  await reader.scrollIntoViewIfNeeded();
  await expect(reader.locator('.jade-diagram li')).toHaveCount(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await reader.screenshot({path:'tmp/school-lesson-editor-mobile.png'});
});

test('lesson media upload stays private and cannot be deleted once a draft uses it',async({page,request})=>{
  const accounts=await (await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const account=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  await page.goto('/studio?create=lesson&level=hsk1');
  await expect(page.getByRole('button',{name:'Soạn trang đầu tiên',exact:true})).toBeEnabled();
  await page.locator('input[name=title]').fill('Nháp kiểm thử kho học liệu');
  await page.getByRole('button',{name:'Soạn trang đầu tiên',exact:true}).click();
  await page.locator('.lesson-editor-columns fieldset select').first().selectOption('image');
  await page.getByRole('button',{name:'Chọn hoặc tải ảnh',exact:true}).click();
  const picker=page.locator('.lesson-media-picker');
  await expect(picker.locator('input[type=file]')).toBeEnabled();
  await picker.locator('input[type=file]').setInputFiles({name:'pixel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
  await picker.getByRole('textbox',{name:'Tên học liệu',exact:true}).fill('Ảnh kiểm thử gắn bài');
  await picker.getByRole('textbox',{name:'Mô tả ảnh cho người không nhìn thấy',exact:true}).fill('Điểm ảnh kiểm thử');
  await picker.getByRole('textbox',{name:'Nguồn học liệu',exact:true}).fill('Fixture nguyên bản');
  await picker.getByRole('textbox',{name:'Giấy phép hoặc quyền sử dụng',exact:true}).fill('HANZI.OS test fixture');
  await page.getByRole('button',{name:'Tải lên và dùng trong khối',exact:true}).click();
  await expect.poll(()=>page.locator('input[name=lessonPages]').inputValue()).toContain('/api/content/media/');
  const doc=JSON.parse(await page.locator('input[name=lessonPages]').inputValue());const url=doc.pages[0].blocks[0].imageSrc;
  expect((await request.get(url)).status()).toBe(401);
  expect((await page.request.get(url)).status()).toBe(200);
  expect((await page.request.get(url,{headers:{range:'bytes=0-7'}})).status()).toBe(206);
  await page.getByRole('button',{name:'Tạo bản nháp',exact:true}).click();
  await expect(page).toHaveURL(/\/studio\/items\//);
  expect((await page.request.delete(url,{headers:{origin:'http://localhost:3000'}})).status()).toBe(422);
  await expect.poll(()=>page.locator('input[name=lessonPages]').inputValue()).toContain(url);
});

test('editor authors feedback activities and can save and reopen unfinished lesson drafts', async ({page,request})=>{
  const response=await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}});
  const account=(await response.json()).accounts.find((a:{username:string})=>a.username==='editor.demo');
  await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password,returnTo:'/studio'}});
  await page.goto('/studio?create=lesson&level=hsk1');
  await expect(page.getByRole('button',{name:'Soạn trang đầu tiên',exact:true})).toBeEnabled();
  await page.locator('input[name=title]').fill('Nháp kiểm thử bài tập Thiên Lộ');
  await page.getByRole('button',{name:'Soạn trang đầu tiên',exact:true}).click();
  await page.getByLabel('Tên trang',{exact:true}).fill('Luyện vị trí');
  await page.locator('.lesson-editor-columns fieldset select').first().selectOption('activity');
  await page.getByLabel('Nội dung / yêu cầu',{exact:true}).fill('图书馆___学校旁边。');
  await page.getByRole('button',{name:'Thêm lựa chọn',exact:true}).click();
  await page.getByRole('button',{name:'Thêm lựa chọn',exact:true}).click();
  const options=page.locator('.lesson-activity-editor>fieldset');
  await options.nth(0).getByLabel('Nội dung lựa chọn',{exact:true}).fill('在');
  await options.nth(0).getByRole('radio').check();
  await options.nth(0).getByLabel('Phản hồi khi chọn',{exact:true}).fill('Đúng: 在 chỉ vị trí.');
  await options.nth(1).getByLabel('Nội dung lựa chọn',{exact:true}).fill('是');
  await options.nth(1).getByLabel('Phản hồi khi chọn',{exact:true}).fill('是 dùng để xác định danh tính, không dùng chỉ vị trí trong câu này.');
  await page.getByRole('textbox',{name:'Giải thích sau khi làm',exact:true}).fill('Địa điểm + 在 + vị trí: thư viện ở cạnh trường học.');
  await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
  const preview=page.locator('.studio-form-section.lesson-pages-editor .lesson-page-reader');
  await preview.getByRole('button',{name:'是',exact:true}).click();
  await preview.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(preview.getByRole('status')).toContainText('không dùng chỉ vị trí');
  await preview.getByRole('button',{name:'在',exact:true}).click();
  await preview.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(preview.getByRole('status')).toContainText('Đúng với đáp án');
  await page.getByRole('button',{name:'Tiếp tục soạn',exact:true}).click();
  // Deliberately incomplete: publication must fail, saving work must still succeed.
  await page.getByRole('textbox',{name:'Giải thích sau khi làm',exact:true}).fill('');
  await page.getByRole('button',{name:'Tạo bản nháp',exact:true}).click();
  await expect(page).toHaveURL(/\/studio\/items\//);
  await expect(page.getByRole('heading',{name:'Trình soạn trang Thiên Lộ',exact:true})).toBeVisible();
  await expect(page.getByLabel('Tên trang',{exact:true})).toHaveValue('Luyện vị trí');
  await expect(page.locator('.lesson-activity-editor').getByLabel('Nội dung lựa chọn',{exact:true}).first()).toHaveValue('在');
  await expect(page.locator('.lesson-pages-editor')).toContainText('Bài tập cần giải thích sau khi làm');
});

test('rich learner pages keep footer visible and editor offers the same reader', async ({ page, request }) => {
  const runtimeErrors:string[]=[];
  page.on('pageerror',error=>runtimeErrors.push(error.message));
  const accounts = await (await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const login = async (username: string) => {
    const account = accounts.accounts.find((a: {username:string})=>a.username===username);
    const result=await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password,returnTo:'/'}});
    expect(result.ok()).toBe(true);
  };
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  await login('learner.demo');
  await page.goto('/lesson/professional-1');
  await expect(page.locator('.lesson-page-reader')).toBeVisible();
  await expect(page.locator('.briefing-hero')).toBeHidden();
  await expect.poll(()=>page.locator('.jade-scene img').evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
  for(const viewport of [{width:1440,height:900},{width:375,height:812},{width:812,height:375}]){
    await page.setViewportSize(viewport);
    await expect.poll(()=>page.locator('.lesson-page-reader>footer').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;})).toBe(true);
    if(viewport.width<760) await expect.poll(()=>page.locator('.lesson-page-content').evaluate(el=>{
      const scene=el.querySelector('.jade-scene')!.getBoundingClientRect();
      const blocks=el.querySelector('.jade-blocks')!.getBoundingClientRect();
      return blocks.top>=scene.bottom;
    })).toBe(true);
    await page.screenshot({path:`tmp/lesson-pages-${viewport.width}.png`});
  }
  await page.setViewportSize({width:1440,height:900});
  await page.getByRole('combobox',{name:'Chọn trang học'}).selectOption({index:1});
  await page.getByRole('button',{name:'Mở lời thoại Trung – Pinyin – Việt'}).click();
  await expect(page.locator('.lesson-block-dialogue').first()).toBeVisible();
  await page.screenshot({path:'tmp/lesson-pages-live.png'});
  await page.locator('.jade-stages button').filter({hasText:'Vận dụng'}).click();
  await page.getByRole('button',{name:'Mục tiếp',exact:true}).click();
  await page.locator('.jade-answer-label textarea').first().fill('我是学生。');
  await page.getByRole('button',{name:'Xem hướng dẫn đối chiếu',exact:true}).click();
  await page.locator('.jade-answer-label textarea').first().fill('我是大学生。');
  await page.locator('.jade-answer-label textarea').first().fill('我是学生。');
  await expect.poll(()=>page.evaluate(()=>new Promise<boolean>((resolve,reject)=>{
    const request=indexedDB.open('hanzi-os-sync-v1');
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result;
      const transaction=db.transaction('lesson-resumes','readonly');
      const all=transaction.objectStore('lesson-resumes').getAll();
      all.onsuccess=()=>resolve(all.result.some(record=>record.value?.lessonId==='professional-1' && record.value?.version===1 && Object.values(record.value?.drafts??{}).some(value=>{
        const draft=value as {text:string;compared:boolean;everChecked:boolean};
        return draft.text==='我是学生。' && !draft.compared && draft.everChecked;
      })));
      all.onerror=()=>reject(all.error);
      transaction.oncomplete=()=>db.close();
    };
  }))).toBe(true);
  await page.reload();
  await expect(page.locator('.jade-answer-label textarea').first()).toHaveValue('我是学生。');
  await expect(page.getByRole('button',{name:'Xem hướng dẫn đối chiếu',exact:true})).toBeVisible();
  // Simulate an older pinned revision without changing the published curriculum.
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{
    const request=indexedDB.open('hanzi-os-sync-v1');
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result;const tx=db.transaction('lesson-resumes','readwrite');const store=tx.objectStore('lesson-resumes');
      const all=store.getAll();
      all.onsuccess=()=>{for(const record of all.result){if(record.value?.lessonId==='professional-1'&&record.value?.version===1){record.value.document.pages[0].title+=' · bản trước';store.put(record);}}};
      tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
    };
  }));
  let releaseRuntime!:()=>void;
  let requestedRuntime=false;
  const runtimeGate=new Promise<void>(resolve=>{releaseRuntime=resolve;});
  await page.route('**/api/content/runtime?projection=learning',async route=>{requestedRuntime=true;await runtimeGate;await route.continue();});
  await page.reload();
  await expect.poll(()=>requestedRuntime).toBe(true);
  await expect(page.getByRole('button',{name:'Bắt đầu bản cập nhật',exact:true})).toHaveCount(0);
  releaseRuntime();
  await expect(page.locator('.jade-answer-label textarea').first()).toHaveValue('我是学生。');
  await page.getByRole('button',{name:'Bắt đầu bản cập nhật',exact:true}).click();
  await expect(page.locator('.jade-page-title h2')).toHaveText('Làm quen với bạn học mới');
  await expect(page.getByRole('button',{name:'Bắt đầu bản cập nhật',exact:true})).toHaveCount(0);
  await login('editor.demo');
  await page.goto('/studio?create=lesson&level=hsk1');
  await expect(page.getByRole('heading',{name:'Trình soạn trang Thiên Lộ'})).toBeVisible();
  await page.getByRole('button',{name:'Nạp nội dung đang học để biên tập'}).click();
  await page.getByLabel('Tên trang',{exact:true}).fill('Ngữ cảnh mở đầu đã biên tập');
  await page.getByLabel('Minh họa chủ đề',{exact:true}).selectOption('city');
  await page.getByRole('button',{name:'Thêm trang',exact:true}).click();
  await expect(page.getByLabel('Minh họa chủ đề',{exact:true})).toHaveValue('city');
  await page.getByRole('button',{name:'Hoàn tác',exact:true}).click();
  await page.getByLabel('Bố cục',{exact:true}).selectOption('workshop');
  await page.getByLabel('Chặng học',{exact:true}).selectOption('transfer');
  await page.locator('input[name=title]').fill('Bài học thử bố cục Ngọc Điện');
  await expect.poll(()=>page.locator('input[name="lessonPages"]').inputValue()).toContain('Ngữ cảnh mở đầu đã biên tập');
  await page.getByRole('button',{name:'Xem như người học'}).click();
  await expect(page.locator('.lesson-pages-editor .lesson-page-reader')).toBeVisible();
  await expect(page.locator('.lesson-pages-editor .lesson-page-reader h2')).toHaveText('Ngữ cảnh mở đầu đã biên tập');
  await expect(page.locator('.lesson-pages-editor .lesson-page-reader h1')).toHaveText('Bài học thử bố cục Ngọc Điện');
  await expect(page.locator('.lesson-pages-editor .layout-workshop')).toBeVisible();
  await page.screenshot({path:'tmp/lesson-pages-studio.png',fullPage:true});
  expect(runtimeErrors).toEqual([]);
});



test('character batch drafts open in Studio with distinct word and character readings',async({page,request})=>{
  const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const account=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
  for(const [id,word,pinyin,answer] of [['characters-1','大学','dàxué','大'],['characters-3','妈妈','māma','妈'],['characters-14','一本书','yī běn shū','本']]){
    await page.goto(`/studio?q=thien-lo-v2-${id}`);
    const title=characterBatch.items.find(item=>item.lessonId===id)!.title;
    await page.locator('.studio-revision-card').filter({has:page.getByRole('heading',{name:title,exact:true})}).getByRole('link',{name:'Tiếp tục soạn'}).click();
    await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
    const reader=page.locator('.studio-form-section.lesson-pages-editor .lesson-page-reader');
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${id}:v2:examples`);
    await expect(reader.locator('.jade-hanzi')).toHaveText(word);
    await expect(reader.locator('.jade-pinyin')).toHaveText(pinyin);
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${id}:v2:guided`);
    await reader.getByRole('textbox').fill(answer);
    await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
    await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
    await page.getByRole('button',{name:'Tiếp tục soạn',exact:true}).click();
  }
});

test('editor sees exceptional pronunciation explanations inside the saved character payload',async({page,request})=>{
 const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
 const account=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
 expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
 for(const glyph of ['客','气','谁','要','条','玩']){
  const draft=characterBatch.items.find(i=>i.lessonPages.pages.some(p=>p.blocks.some(b=>b.title===`Chữ mục tiêu: ${glyph}`)))!;
  const lessonPage=draft.lessonPages.pages.find(p=>p.blocks.some(b=>b.title===`Chữ mục tiêu: ${glyph}`))!;
  const index=lessonPage.blocks.findIndex(b=>b.title===`Chữ mục tiêu: ${glyph}`);
  await page.goto(`/studio?q=thien-lo-v2-${draft.lessonId}`);
  await page.locator('.studio-revision-card').filter({has:page.getByRole('heading',{name:draft.title,exact:true})}).getByRole('link',{name:'Tiếp tục soạn'}).click();
  const stored=JSON.parse(await page.locator('input[name=lessonPages]').inputValue());
  expect(stored.pages.find((p:{id:string})=>p.id===lessonPage.id).blocks[index].body).toBe(lessonPage.blocks[index].body);
  await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
  const reader=page.locator('.studio-form-section.lesson-pages-editor .lesson-page-reader');
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(lessonPage.id);
  await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption(String(index));
  await expect(reader.locator('.lesson-block')).toContainText(lessonPage.blocks[index].body);
 }
});

test('character transfer situations and answers are editable in the saved Studio drafts',async({page,request})=>{
 const seedResponse=await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}});
 expect(seedResponse.ok(),`Demo account setup returned ${seedResponse.status()}: ${await seedResponse.text()}`).toBe(true);
 const accounts=await seedResponse.json();
 const account=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
 expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
 for(const id of ['characters-3','characters-9','characters-14']){
  const draft=characterBatch.items.find(i=>i.lessonId===id)!;
  const transfer=(draft.lessonPages as LessonPageDocument).pages.find(p=>p.id===`${id}:v2:transfer`)!;
  await page.goto(`/studio?q=thien-lo-v2-${id}`);
  await page.locator('.studio-revision-card').filter({has:page.getByRole('heading',{name:draft.title,exact:true})}).getByRole('link',{name:'Tiếp tục soạn'}).click();
  expect(JSON.parse(await page.locator('input[name=lessonPages]').inputValue()).pages.find((p:{id:string})=>p.id===transfer.id)).toEqual(transfer);
  await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
  const reader=page.locator('.studio-form-section.lesson-pages-editor .lesson-page-reader');
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(transfer.id);
  await reader.getByRole('textbox').fill('Bản nháp tự đối chiếu');
  await reader.getByRole('button',{name:'Xem hướng dẫn đối chiếu',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText(transfer.blocks[0].activity!.explanation);
 }
});
