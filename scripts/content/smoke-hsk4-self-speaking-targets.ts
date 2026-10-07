import {chromium,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository';
import type {LessonPageDocument} from '../../src/learning/lessonPages';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';

const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3003';
const plan=JSON.parse(readFileSync('content/drafts/thien-lo-hsk4-self-speaking-targets.json','utf8')) as {lessonIds:string[];targets:Record<string,Record<string,unknown>>};
const groupNames=['precision-reference-quantity','stance-comparison-rhetoric','event-agency-voice','information-order-cohesion','argument-logic-concession','structured-spoken-defense','timed-sectional-rehearsal'];
const selected=groupNames.map(name=>plan.lessonIds.find(id=>id.startsWith(`hsk4-${name}-`))).filter((id):id is string=>!!id);
if(selected.length!==7)throw Error('Expected seven HSK4 groups');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
const entries=[] as Array<{lessonId:string;revisionId:string;pageId:string;blockIndex:number;title:string;blockTitle:string}>;
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 for(const lessonId of selected){
  const item=runtime.items.find(entry=>entry.content.targetLessonId===lessonId);
  if(!item?.content.lessonPages)throw Error(`Missing released pages: ${lessonId}`);
  const pages=(item.content.lessonPages as LessonPageDocument).pages;
  const blockId=Object.keys(plan.targets[lessonId])[0];
  const page=pages.find(p=>p.blocks.some(b=>b.id===blockId));
  const index=page?.blocks.findIndex(b=>b.id===blockId)??-1;
  const block=page?.blocks[index];
  if(!page||!block||block.activity?.type!=='rubric'||!block.activity.learningTarget)throw Error(`Missing released rubric: ${lessonId}`);
  entries.push({lessonId,revisionId:item.revisionId,pageId:page.id,blockIndex:index,title:page.title,blockTitle:block.title});
 }
}finally{db.close()}

const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await context.newPage();
 const accounts=await(await page.request.post(`${origin}/api/auth/hanzi/demo-accounts`,{headers:{origin}})).json();
 const editor=accounts.accounts.find((account:{username:string})=>account.username==='editor.demo');
 expect((await page.request.post(`${origin}/api/auth/hanzi/login`,{headers:{origin},data:{identifier:editor.username,password:editor.password}})).ok()).toBe(true);
 for(const entry of entries){
  await page.goto(`${origin}/studio/items/${entry.revisionId}`);
  const reader=page.locator('.lesson-page-reader');
  await expect(reader).toBeVisible({timeout:30000});
  await page.waitForFunction(()=>Object.keys(document.querySelector<HTMLSelectElement>('select[aria-label="Chọn trang học"]')??{}).some(key=>key.startsWith('__reactProps')));
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(entry.pageId);
  if(entry.blockIndex>0)await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption(String(entry.blockIndex));
  await expect(reader.locator('.jade-page-title h2')).toHaveText(entry.title);
  await expect(reader.getByText(entry.blockTitle,{exact:true})).toBeVisible();
  await reader.getByRole('textbox',{name:'Bản viết của bạn'}).fill('Tôi sẽ dựa vào hai nguồn, nêu giới hạn của dữ kiện và trả lời phản biện.');
  await reader.getByRole('button',{name:'Xem hướng dẫn đối chiếu'}).click();
  await expect(reader.getByText(/Tiêu chí tự kiểm/)).toBeVisible();
  await page.setViewportSize({width:375,height:812});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.setViewportSize({width:1280,height:800});
 }
 await context.close();
 console.log({lessons:entries.length,rubricPreview:true,selfCheck:true,mobileWidth:375});
}finally{await browser.close()}
