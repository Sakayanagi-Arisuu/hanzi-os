import {expect,test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type personalBatch from '../content/drafts/thien-lo-hsk3-personal-v2.json';
import type personalEvidence from './fixtures/personal-prerequisite-evidence.json';
import type {LessonPageDocument} from '../src/learning/lessonPages';
import {readIndexedDbStore,type OwnerScopedCacheRecord} from './indexedDb';
import type {LessonReadingSession} from '../src/learning/lessonReadingSession';
const selected=process.env.THIEN_LO_NARRATIVE_BATCH??'personal';
if(!['personal','study-work','nature'].includes(selected))throw new Error('Unknown narrative browser batch');
const batch=JSON.parse(readFileSync(`content/drafts/thien-lo-hsk3-${selected}-v2.json`,'utf8')) as typeof personalBatch;
const evidenceName=selected==='personal'?selected:`hsk3-${selected}`;
const evidence=JSON.parse(readFileSync(`e2e/fixtures/${evidenceName}-prerequisite-evidence.json`,'utf8')) as typeof personalEvidence;
test(`${selected} HSK3 learner images, answers and writing restore`,async({page})=>{
 await page.goto('/onboarding');
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
 await page.goto(`/lesson/${batch.items[0].lessonId}`);
 await expect(page.getByRole('heading',{name:'Thử Luyện này chưa khai mở',exact:true})).toBeVisible();
 await page.evaluate(e=>{const k='hanzi-os-learning-state-v1';const s=JSON.parse(localStorage.getItem(k)!);s.evidence.push(...e);localStorage.setItem(k,JSON.stringify(s));},evidence);
 const runtime=await(await page.request.get('/api/content/runtime?projection=learning')).json();
 for(const item of batch.items){
  expect(runtime.items[0].find((r:[string,unknown])=>r[0]===item.lessonId)?.[1]?.richContent?.lessonPages).toEqual(item.lessonPages);
  await page.goto(`/lesson/${item.lessonId}`);const reader=page.locator('.lesson-page-reader');const doc=item.lessonPages as LessonPageDocument;
  await page.setViewportSize({width:1440,height:900});
  await expect(reader.locator('.jade-scene img')).toHaveAttribute('src',doc.pages[0].illustration!.src);
  await expect.poll(()=>reader.locator('.jade-scene img').evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);
  for(const mapPage of doc.pages.filter(p=>p.blocks.some(b=>b.diagram))){
   await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(mapPage.id);
   const diagram=mapPage.blocks.find(b=>b.diagram)!.diagram!;
   await expect(reader.getByRole('list',{name:'Sơ đồ vị trí'}).getByRole('listitem')).toHaveCount(diagram.nodes.length);
   for(const node of diagram.nodes){
    const card=reader.getByRole('listitem').filter({has:page.getByText(node.label,{exact:true})});
    await expect(card).toHaveCSS('grid-column-start',String(node.x+1));
    await expect(card).toHaveCSS('grid-row-start',String(node.y+1));
   }
  }
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:reading`);
  await reader.getByRole('button',{name:'Chọn đoạn 2 làm bằng chứng',exact:true}).click();
  await reader.getByRole('textbox').fill('Ghi chú: phân biệt dữ kiện và suy đoán');
  await reader.getByRole('button',{name:'Mở Pinyin',exact:true}).click();
  await expect.poll(async()=>{
   const records=await readIndexedDbStore<OwnerScopedCacheRecord<LessonReadingSession>>(page,'lesson-resumes');
   return records.find(r=>r.value?.lessonId===item.lessonId)?.value.drafts[`${item.lessonId}:v2:block:text`]?.showPinyin;
  }).toBe(true);
  await page.reload();
  await expect(reader.getByRole('textbox')).toHaveValue('Ghi chú: phân biệt dữ kiện và suy đoán');
  await expect(reader.getByRole('button',{name:'Bỏ chọn đoạn 2 làm bằng chứng',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(reader.getByRole('button',{name:'Ẩn Pinyin',exact:true})).toHaveAttribute('aria-pressed','true');
  const choice=doc.pages.find(p=>p.id.endsWith(':choice'))!;await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(choice.id);
  if(choice.blocks.length>1)await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption('1');
  const a=choice.blocks.find(b=>b.activity)!.activity!;
  for(const id of [a.options.find(o=>!a.answerIds.includes(o.id))!.id,a.answerIds[0]]){
   await reader.getByRole('button',{name:a.options.find(o=>o.id===id)!.text,exact:true}).click();await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
   await expect(reader.getByRole('status')).toContainText(a.answerIds.includes(id)?'Đúng với đáp án':'Chưa đúng với yêu cầu');
  }
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:transfer`);await reader.getByRole('textbox').fill('我的草稿');await page.reload();await expect(reader.getByRole('textbox')).toHaveValue('我的草稿');
  await reader.getByRole('button',{name:'Xem hướng dẫn đối chiếu',exact:true}).click();await expect(reader.getByRole('status')).toContainText('Một phương án');
 }
});
test(`${selected} HSK3 Studio has identical editable documents and image preview`,async({page,request})=>{
 const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();const account=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
 expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
 for(const item of batch.items){
  const key=`hsk3.lesson.personal-preview-${item.lessonId}-${Date.now()}`;
  const created=await page.request.post('/studio/actions',{headers:{origin:'http://localhost:3000'},form:{action:'create',itemType:'lesson',level:'hsk3',stableKey:key,title:`Nháp kiểm ${item.title}`,idempotencyKey:key,contentJson:JSON.stringify(item.studioContent)}});
  expect(created.url()).toContain('/studio/items/');await page.goto(created.url());
  expect(JSON.parse(await page.locator('input[name=lessonPages]').inputValue())).toEqual(item.lessonPages);
  await page.getByRole('button',{name:'Xem như người học',exact:true}).click();const reader=page.locator('.lesson-pages-editor .lesson-page-reader');
  await expect(reader.locator('.jade-scene img')).toHaveAttribute('src',item.lessonPages.pages[0].illustration!.src);
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:guided`);await reader.getByRole('textbox').fill((item.lessonPages as LessonPageDocument).pages.find(p=>p.id.endsWith(':guided'))!.blocks[0].activity!.acceptedAnswers[0]);
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
 }
});





