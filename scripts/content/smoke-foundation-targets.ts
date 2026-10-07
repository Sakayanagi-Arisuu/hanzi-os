import {chromium,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository';
import type {LessonPageDocument} from '../../src/learning/lessonPages';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';

const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3003';
const scope=process.argv.find(arg=>arg.startsWith('--scope='))?.slice(8)??'boot';
if(!['boot','characters','survival','everyday','journey-professional','hsk3-cohesion'].includes(scope))throw Error('Unknown target smoke scope');
const manuscriptPath=scope==='characters'?'content/drafts/thien-lo-character-batch-v2.json':scope==='survival'?'content/drafts/thien-lo-survival-batch-v2.json':'content/drafts/thien-lo-everyday-batch-v2.json';
const lessonIds=scope==='boot'?['boot-2','boot-3','boot-4']:scope==='hsk3-cohesion'?['hsk3-cohesion-reconstruction-lesson-01']:scope==='journey-professional'?[...(JSON.parse(readFileSync('content/drafts/thien-lo-journey-batch-v2.json','utf8')) as {items:Array<{lessonId:string}>}).items.map(item=>item.lessonId),...[1,2,3,4].map(n=>`professional-${n}`)]:(JSON.parse(readFileSync(manuscriptPath,'utf8')) as {items:Array<{lessonId:string}>}).items.map(item=>item.lessonId);
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
const released=[] as Array<{lessonId:string;revisionId:string;pageId:string;blockIndex:number;title:string;wrong:string;correct:string;feedback:string;correctionPageId?:string;correctionBlockIndex?:number}>;
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 for(const lessonId of lessonIds){
  const item=runtime.items.find(entry=>entry.content.targetLessonId===lessonId);
  if(!item?.content.lessonPages)throw Error(`Missing published pages: ${lessonId}`);
  const pages=(item.content.lessonPages as LessonPageDocument).pages;
  const page=pages.find(p=>p.blocks.some(b=>b.kind==='activity'&&b.activity?.type==='choice'));
  const block=page?.blocks.find(b=>b.kind==='activity'&&b.activity?.type==='choice');
  if(!page||!block||!block.activity?.learningTarget)throw Error(`Missing target activity: ${lessonId}`);
  const activity=block.activity;
  const wrong=activity.options.find(option=>!activity.answerIds.includes(option.id));
  const correct=activity.options.find(option=>activity.answerIds.includes(option.id));
  if(!wrong||!correct)throw Error(`Missing answer/foil: ${lessonId}`);
  const correctionPage=pages.find(p=>p.blocks.some(b=>b.id==='characters-13:v2:block:recall-hsk1-character-246'));
  released.push({lessonId,revisionId:item.revisionId,pageId:page.id,blockIndex:page.blocks.findIndex(candidate=>candidate.id===block.id),title:page.title,wrong:wrong.text,correct:correct.text,feedback:correct.feedback,correctionPageId:correctionPage?.id,correctionBlockIndex:correctionPage?.blocks.findIndex(candidate=>candidate.id==='characters-13:v2:block:recall-hsk1-character-246')});
 }
}finally{db.close()}

const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await context.newPage();
 const accounts=await(await page.request.post(`${origin}/api/auth/hanzi/demo-accounts`,{headers:{origin}})).json();
 const editor=accounts.accounts.find((account:{username:string})=>account.username==='editor.demo');
 expect((await page.request.post(`${origin}/api/auth/hanzi/login`,{headers:{origin},data:{identifier:editor.username,password:editor.password}})).ok()).toBe(true);
 for(const item of released){
  await page.goto(`${origin}/studio/items/${item.revisionId}`);
  const reader=page.locator('.lesson-page-reader');
  await expect(reader).toBeVisible({timeout:30000});
  await page.waitForFunction(()=>Object.keys(document.querySelector<HTMLSelectElement>('select[aria-label="Chọn trang học"]')??{}).some(key=>key.startsWith('__reactProps')));
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(item.pageId);
  if(item.blockIndex>0)await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption(String(item.blockIndex));
  await expect(reader.locator('.jade-page-title h2')).toHaveText(item.title);
  const group=reader.getByRole('group',{name:'Lựa chọn trả lời'});
  await group.getByRole('button',{name:item.wrong,exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời'}).click();
  await expect(reader.getByText('Chưa đúng với yêu cầu của câu này.')).toBeVisible();
  await group.getByRole('button',{name:item.correct,exact:true}).click();
  await reader.getByRole('button',{name:'Kiểm tra câu trả lời'}).click();
  await expect(reader.getByText(item.feedback,{exact:true})).toBeVisible();
  if(item.correctionPageId){
   await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(item.correctionPageId);
   if((item.correctionBlockIndex??0)>0)await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption(String(item.correctionBlockIndex));
   await reader.getByRole('textbox',{name:'Phần còn thiếu'}).fill('作');
   await reader.getByRole('button',{name:'Kiểm tra câu trả lời'}).click();
   await expect(reader.getByText('Chưa đúng với yêu cầu của câu này.')).toBeVisible();
   await reader.getByRole('textbox',{name:'Phần còn thiếu'}).fill('做');
   await reader.getByRole('button',{name:'Kiểm tra câu trả lời'}).click();
   await expect(reader.getByText('Đúng với đáp án của câu này.')).toBeVisible();
  }
  await page.setViewportSize({width:375,height:812});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.setViewportSize({width:1280,height:800});
 }
 await context.close();
 console.log({scope,lessons:released.length,wrongToCorrect:true,editorPreview:true,mobileWidth:375,contextualCharacterCorrection:scope==='characters'});
}finally{await browser.close()}
