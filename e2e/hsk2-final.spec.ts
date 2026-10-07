import {expect,test} from '@playwright/test';
import batch from '../content/drafts/thien-lo-hsk2-final-v2.json' with {type:'json'};
import evidence from './fixtures/final-prerequisite-evidence.json' with {type:'json'};
import type {LessonPageDocument} from '../src/learning/lessonPages';
test('final HSK2 learner images, answers and writing restore',async({page})=>{
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
  if(item.lessonId.includes('picture'))for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:812,height:375}]){
   await page.setViewportSize(viewport);const img=reader.locator('.lesson-block img');await expect(img).toBeVisible();
   await expect.poll(()=>img.evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);await expect(img).toHaveCSS('object-fit','contain');
   const footer=await reader.locator(':scope > footer').boundingBox();expect(footer!.y+footer!.height).toBeLessThanOrEqual(viewport.height);
   const imageBox=await img.boundingBox();const regionBox=await reader.getByRole('region',{name:'Nội dung trang học'}).boundingBox();expect(imageBox!.height).toBeGreaterThan(70);expect(imageBox!.y).toBeGreaterThanOrEqual(regionBox!.y-1);expect(imageBox!.y+imageBox!.height).toBeLessThanOrEqual(regionBox!.y+regionBox!.height+1);
   await reader.screenshot({path:`tmp/${item.lessonId}-${viewport.width}.png`});
  }
  await page.setViewportSize({width:1440,height:900});
  const choice=doc.pages.find(p=>p.id.endsWith(':choice'))!;await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(choice.id);
  if(choice.blocks.length>1)await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption('1');
  const a=choice.blocks.find(b=>b.activity)!.activity!;
  for(const id of [a.options.find(o=>!a.answerIds.includes(o.id))!.id,a.answerIds[0]]){
   await reader.getByRole('button',{name:a.options.find(o=>o.id===id)!.text,exact:true}).click();await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
   await expect(reader.getByRole('status')).toContainText(a.answerIds.includes(id)?'Đúng với đáp án':'Chưa đúng với yêu cầu');
  }
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:transfer`);await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption('1');
  await reader.getByRole('textbox').fill('我的草稿');await page.reload();await expect(reader.getByRole('textbox')).toHaveValue('我的草稿');
  await reader.getByRole('button',{name:'Xem hướng dẫn đối chiếu',exact:true}).click();await expect(reader.getByRole('status')).toContainText('Một phương án');
 }
});
test('final HSK2 Studio has identical editable documents and image preview',async({page,request})=>{
 const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();const account=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
 expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:account.username,password:account.password}})).ok()).toBe(true);
 for(const item of batch.items){
  const key=`hsk2.lesson.final-preview-${item.lessonId}-${Date.now()}`;
  const created=await page.request.post('/studio/actions',{headers:{origin:'http://localhost:3000'},form:{action:'create',itemType:'lesson',level:'hsk2',stableKey:key,title:`Nháp kiểm ${item.title}`,idempotencyKey:key,contentJson:JSON.stringify(item.studioContent)}});
  expect(created.url()).toContain('/studio/items/');await page.goto(created.url());
  expect(JSON.parse(await page.locator('input[name=lessonPages]').inputValue())).toEqual(item.lessonPages);
  await page.getByRole('button',{name:'Xem như người học',exact:true}).click();const reader=page.locator('.lesson-pages-editor .lesson-page-reader');
  if(item.lessonId.includes('picture'))await expect(reader.locator('.lesson-block img')).toHaveAttribute('src',item.lessonPages.pages[0].blocks[0].imageSrc);
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:guided`);await reader.getByRole('textbox').fill((item.lessonPages as LessonPageDocument).pages.find(p=>p.id.endsWith(':guided'))!.blocks[0].activity!.acceptedAnswers[0]);
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
 }
});


