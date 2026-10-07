import {expect,test,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type {LessonPageDocument} from '../src/learning/lessonPages';

type Item={lessonId:string;title:string;studioContent:unknown;lessonPages:LessonPageDocument};
const batch=JSON.parse(readFileSync('content/drafts/thien-lo-hsk3-reference-v2.json','utf8')) as {items:Item[]};
const prerequisiteEvidence=JSON.parse(readFileSync('e2e/fixtures/hsk3-reference-prerequisite-evidence.json','utf8')) as Array<Record<string,unknown>>;
const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3000';
async function hasSavedDraft(page:Page,lessonId:string,answer:string){
  return page.evaluate(({lessonId,answer})=>new Promise<boolean>((resolve,reject)=>{
    const opening=indexedDB.open('hanzi-os-sync-v1');
    opening.onerror=()=>reject(opening.error);
    opening.onsuccess=()=>{
      const db=opening.result,reading=db.transaction('lesson-resumes','readonly').objectStore('lesson-resumes').getAll();
      reading.onerror=()=>{db.close();reject(reading.error);};
      reading.onsuccess=()=>{
        const rows=reading.result as Array<{value?:{lessonId?:string;drafts?:Record<string,{text?:string}>}}>;
        const found=rows.some(row=>row.value?.lessonId===lessonId&&Object.values(row.value.drafts??{}).some(draft=>draft.text===answer));
        db.close();resolve(found);
      };
    };
  }),{lessonId,answer});
}

test('three reference lessons render their own text, diagrams, answer feedback and saved writing',async({page})=>{
  test.setTimeout(180_000);
  await page.goto('/onboarding');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  await page.goto(`/lesson/${batch.items[0].lessonId}`);
  await expect(page.getByRole('heading',{name:'Thử Luyện này chưa khai mở',exact:true})).toBeVisible({timeout:30_000});
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
    const grammarPages=item.lessonPages.pages.filter(p=>p.id.includes(':v2:grammar:'));
    expect(grammarPages).toHaveLength(7);
    for(const grammarPage of [grammarPages[0],grammarPages[6]]){
      await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(grammarPage.id);
      await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption('2');
      const answer=grammarPage.blocks.find(block=>block.activity)!.activity!.acceptedAnswers[0];
      await reader.getByRole('textbox').fill(answer);
      await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
      await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
    }
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:transfer`);
    const answer=`Nháp ${item.lessonId}`;
    await reader.getByRole('textbox').fill(answer);
    await expect.poll(()=>hasSavedDraft(page,item.lessonId,answer),{timeout:20_000}).toBe(true);
    await page.reload();
    await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:transfer`,{timeout:30_000});
    await expect(reader.getByRole('textbox')).toHaveValue(answer);
  }
  await page.setViewportSize({width:375,height:812});
  await page.goto(`/lesson/${batch.items[2].lessonId}`);
  const mobileReader=page.locator('.lesson-page-reader');
  await mobileReader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${batch.items[2].lessonId}:v2:diagram`);
  await expect(mobileReader.getByText('中午终于看见',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await mobileReader.screenshot({path:'tmp/hsk3-reference-mobile-diagram.png'});
});

test('Studio edits and previews each reference diagram without replacing the released content',async({page,request})=>{
  test.setTimeout(180_000);
  const accounts=await(await request.post('/api/auth/hanzi/demo-accounts',{headers:{origin}})).json();
  const editor=accounts.accounts.find((account:{username:string})=>account.username==='editor.demo');
  expect((await page.request.post('/api/auth/hanzi/login',{headers:{origin},data:{identifier:editor.username,password:editor.password}})).ok()).toBe(true);
  for(const item of batch.items.slice(0,1)){
    const stableKey=`hsk3-reference-preview-${item.lessonId}-${Date.now()}`;
    const created=await page.request.post('/studio/actions',{headers:{origin},form:{action:'create',itemType:'lesson',level:'hsk3',stableKey,title:`Nháp kiểm ${item.title}`,idempotencyKey:stableKey,contentJson:JSON.stringify(item.studioContent)}});
    expect(created.url()).toContain('/studio/items/');
    await page.goto(new URL(created.url()).pathname);
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


