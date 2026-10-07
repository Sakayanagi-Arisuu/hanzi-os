import {expect,test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type {LessonPageDocument} from '../src/learning/lessonPages';

type Item={lessonId:string;title:string;studioContent:unknown;lessonPages:LessonPageDocument};
const batch=JSON.parse(readFileSync('content/drafts/thien-lo-hsk3-society-v2.json','utf8')) as {items:Item[]};
const prerequisiteEvidence=JSON.parse(readFileSync('e2e/fixtures/hsk3-society-prerequisite-evidence.json','utf8')) as Array<Record<string,unknown>>;

test('five society lessons render their own text, diagrams, answer feedback and saved writing',async({page})=>{
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  await page.goto(`/lesson/${batch.items[0].lessonId}`);
  await expect(page.getByRole('heading',{name:'Thử Luyện này chưa khai mở',exact:true})).toBeVisible();
  await page.evaluate(evidence=>{const key='hanzi-os-learning-state-v1';const state=JSON.parse(localStorage.getItem(key)!);state.evidence.push(...evidence);localStorage.setItem(key,JSON.stringify(state));},prerequisiteEvidence);
  const runtime=await(await page.request.get('/api/content/runtime?projection=learning')).json();
  for(const item of batch.items){
    expect(runtime.items[0].find((entry:[string,unknown])=>entry[0]===item.lessonId)?.[1]?.richContent?.lessonPages).toEqual(item.lessonPages);
    await page.goto(`/lesson/${item.lessonId}`);
    const reader=page.locator('.lesson-page-reader');
    await expect(reader).toBeVisible();
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:reading`);
    await expect(reader.getByText(item.lessonPages.pages.find(p=>p.id.endsWith(':reading'))!.blocks[0].reading!.paragraphs[0].hanzi,{exact:true})).toBeVisible();
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:diagram`);
    const diagram=item.lessonPages.pages.find(p=>p.id.endsWith(':diagram'))!.blocks[0].diagram!;
    await expect(reader.getByText(diagram.description,{exact:true})).toBeVisible();
    for(const node of diagram.nodes)await expect(reader.getByText(node.label,{exact:true})).toBeVisible();
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:choice`);
    const activity=item.lessonPages.pages.find(p=>p.id.endsWith(':choice'))!.blocks[0].activity!;
    const wrong=activity.options.find(option=>!activity.answerIds.includes(option.id))!;
    await reader.getByRole('button',{name:wrong.text,exact:true}).click();
    await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
    await expect(reader.getByRole('status')).toContainText('Chưa đúng');
    await reader.getByRole('button',{name:activity.options.find(option=>option.id===activity.answerIds[0])!.text,exact:true}).click();
    await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
    await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:transfer`);
    await reader.getByRole('textbox').fill(`Nháp ${item.lessonId}`);
    await page.reload();
    await expect(reader.getByRole('textbox')).toHaveValue(`Nháp ${item.lessonId}`);
  }
  await page.setViewportSize({width:375,height:812});
  await page.goto(`/lesson/${batch.items[4].lessonId}`);
  const mobileReader=page.locator('.lesson-page-reader');
  await mobileReader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${batch.items[4].lessonId}:v2:diagram`);
  await expect(mobileReader.getByText('A 12 · B 10; A thắng.',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await mobileReader.screenshot({path:'tmp/hsk3-society-mobile-diagram.png'});
});

test('Studio edits and previews each society diagram without replacing the released content',async({page,request})=>{
  const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin:'http://localhost:3000'}})).json();
  const editor=accounts.accounts.find((account:{username:string})=>account.username==='editor.demo');
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin:'http://localhost:3000'},data:{identifier:editor.username,password:editor.password}})).ok()).toBe(true);
  for(const item of batch.items){
    const stableKey=`hsk3-society-preview-${item.lessonId}-${Date.now()}`;
    const created=await page.request.post('/studio/actions',{headers:{origin:'http://localhost:3000'},form:{action:'create',itemType:'lesson',level:'hsk3',stableKey,title:`Nháp kiểm ${item.title}`,idempotencyKey:stableKey,contentJson:JSON.stringify(item.studioContent)}});
    expect(created.url()).toContain('/studio/items/');
    await page.goto(created.url());
    expect(JSON.parse(await page.locator('input[name=lessonPages]').inputValue())).toEqual(item.lessonPages);
    const diagramPage=item.lessonPages.pages.find(p=>p.id.endsWith(':diagram'))!;
    await page.getByRole('navigation',{name:'Các trang đang soạn'}).getByRole('button',{name:new RegExp(diagramPage.title)}).click();
    await expect(page.getByRole('combobox',{name:'Loại khối'})).toHaveValue('diagram');
    await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
    const reader=page.locator('.lesson-pages-editor .lesson-page-reader');
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(diagramPage.id);
    await expect(reader.getByText(diagramPage.blocks[0].diagram!.description,{exact:true})).toBeVisible();
  }
});
