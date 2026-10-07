import {readFileSync} from 'node:fs';
import {chromium,expect} from '@playwright/test';

const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3003';
const batchName=process.argv.find(arg=>arg.startsWith('--batch='))?.slice(8)??'hsk3-modality';
if(!/^[a-z0-9-]+$/.test(batchName))throw Error('Invalid batch name');
const batch=JSON.parse(readFileSync(`content/drafts/thien-lo-${batchName}-v2.json`,'utf8'));
const prerequisiteEvidence=JSON.parse(readFileSync(`e2e/fixtures/${batchName}-prerequisite-evidence.json`,'utf8'));
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await context.newPage();
 await page.goto(`${origin}/onboarding`);
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
 await page.goto(`${origin}/lesson/${batch.items[0].lessonId}`);
 await expect(page.getByRole('heading',{name:'Thử Luyện này chưa khai mở',exact:true})).toBeVisible({timeout:30000});
 await page.evaluate(evidence=>{const key='hanzi-os-learning-state-v1';const state=JSON.parse(localStorage.getItem(key)!);state.evidence.push(...evidence);localStorage.setItem(key,JSON.stringify(state));},prerequisiteEvidence);
 let runtime:{items:[Array<[string,{richContent?:{lessonPages?:unknown}}]>]} | undefined;
 for(let attempt=0;attempt<3&&!runtime;attempt++){
  const response=await page.request.get(`${origin}/api/content/runtime?projection=learning`);
  if(response.ok())try{runtime=await response.json()}catch{/* Dev RSC worker may restart during the gate. */}
  if(!runtime)await page.waitForTimeout(1000);
 }
 if(!runtime)throw Error('Runtime projection unavailable after three attempts');
 for(const item of batch.items){
  console.log({checking:item.lessonId});
  const released=runtime.items[0].find((entry:[string,unknown])=>entry[0]===item.lessonId)?.[1]?.richContent?.lessonPages;
  expect(released).toEqual(item.lessonPages);
  await page.goto(`${origin}/lesson/${item.lessonId}`);
  const reader=page.locator('.lesson-page-reader');
  await expect(reader).toBeVisible({timeout:60000});
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:reading`);
  await expect(reader.getByText(item.lessonPages.pages.find((p:{id:string})=>p.id.endsWith(':reading')).blocks[0].reading.paragraphs[0].hanzi,{exact:true})).toBeVisible();
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:diagram`);
  const diagram=item.lessonPages.pages.find((p:{id:string})=>p.id.endsWith(':diagram')).blocks[0].diagram;
  await expect(reader.getByText(diagram.description,{exact:true})).toBeVisible();
  for(const node of diagram.nodes)await expect(reader.getByText(node.label,{exact:true})).toBeVisible();
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:choice`);
  const activity=item.lessonPages.pages.find((p:{id:string})=>p.id.endsWith(':choice')).blocks[0].activity;
  const wrong=activity.options.find((option:{id:string})=>!activity.answerIds.includes(option.id));
  await reader.getByRole('button',{name:wrong.text,exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText('Chưa đúng');
  await reader.getByRole('button',{name:activity.options.find((option:{id:string})=>option.id===activity.answerIds[0]).text,exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
  await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
  const grammarPages=item.lessonPages.pages.filter((p:{id:string})=>p.id.includes(':v2:grammar:'));
  if(batchName==='hsk3-modality'||batchName==='hsk3-grammar-finish')expect(grammarPages.length).toBeGreaterThan(0);
  for(const grammarPage of grammarPages.length?[grammarPages[0],grammarPages[grammarPages.length-1]]:[]){
   await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(grammarPage.id);
   await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption('2');
   await reader.getByRole('textbox').fill(grammarPage.blocks.find((block:{activity?:unknown})=>block.activity).activity.acceptedAnswers[0]);
   await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
   await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
  }
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:transfer`);
  const draft=`Nháp ${item.lessonId}`;
  await reader.getByRole('textbox').fill(draft);
  await expect.poll(()=>page.evaluate(({lessonId,draft})=>new Promise<boolean>((resolve,reject)=>{
   const request=indexedDB.open('hanzi-os-sync-v1');request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{const db=request.result,read=db.transaction('lesson-resumes','readonly').objectStore('lesson-resumes').getAll();read.onerror=()=>{db.close();reject(read.error)};read.onsuccess=()=>{const rows=read.result as Array<{value?:{lessonId?:string;drafts?:Record<string,{text?:string}>}}>;const found=rows.some(row=>row.value?.lessonId===lessonId&&Object.values(row.value?.drafts??{}).some(value=>value.text===draft));db.close();resolve(found)}};
  }),{lessonId:item.lessonId,draft}),{timeout:20000}).toBe(true);
  await page.reload();
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${item.lessonId}:v2:transfer`,{timeout:30000});
  await expect(reader.getByRole('textbox')).toHaveValue(draft);
 }
 await page.setViewportSize({width:375,height:812});
 const mobileItem=batch.items[batch.items.length-1];
 await page.goto(`${origin}/lesson/${mobileItem.lessonId}`);
 const reader=page.locator('.lesson-page-reader');
 await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${mobileItem.lessonId}:v2:diagram`);
 await expect(reader.getByText(mobileItem.lessonPages.pages.find((p:{id:string})=>p.id.endsWith(':diagram')).blocks[0].diagram.nodes[0].label,{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 console.log({learnerLessons:batch.items.length,pages:batch.items.reduce((sum:number,item:{lessonPages:{pages:unknown[]}})=>sum+item.lessonPages.pages.length,0),mobileWidth:375,prerequisiteGate:true,draftRestored:true});
 await context.close();
 const editorContext=await browser.newContext();
 const editorPage=await editorContext.newPage();
 const accounts=await(await editorPage.request.post(`${origin}/api/auth/hanzi/demo-accounts`,{headers:{origin}})).json();
 const editor=accounts.accounts.find((account:{username:string})=>account.username==='editor.demo');
 expect((await editorPage.request.post(`${origin}/api/auth/hanzi/login`,{headers:{origin},data:{identifier:editor.username,password:editor.password}})).ok()).toBe(true);
 const item=batch.items[0],stableKey=`${batchName}-preview-${Date.now()}`;
 const created=await editorPage.request.post(`${origin}/studio/actions`,{headers:{origin},form:{action:'create',itemType:'lesson',level:'hsk3',stableKey,title:`Nháp kiểm ${item.title}`,idempotencyKey:stableKey,contentJson:JSON.stringify(item.studioContent)}});
 expect(created.url()).toContain('/studio/items/');
 await editorPage.goto(created.url());
 expect(JSON.parse(await editorPage.locator('input[name=lessonPages]').inputValue())).toEqual(item.lessonPages);
 const diagramPage=item.lessonPages.pages.find((p:{id:string})=>p.id.endsWith(':diagram'));
 await editorPage.getByRole('navigation',{name:'Các trang đang soạn'}).getByRole('button',{name:new RegExp(diagramPage.title)}).click();
 await expect(editorPage.getByRole('combobox',{name:'Loại khối'})).toHaveValue('diagram');
 await editorPage.getByRole('button',{name:'Xem như người học',exact:true}).click();
 const preview=editorPage.locator('.lesson-pages-editor .lesson-page-reader');
 await preview.getByRole('combobox',{name:'Chọn trang học'}).selectOption(diagramPage.id);
 await expect(preview.getByText(diagramPage.blocks[0].diagram.description,{exact:true})).toBeVisible();
 console.log({studioPreview:true,editableDiagram:true});
 await editorContext.close();
}finally{await browser.close()}
