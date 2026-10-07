import {readFileSync} from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {canonicalStudioJson} from '../../src/content/studioContent';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';

const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3003';
const domain=process.argv.find(arg=>arg.startsWith('--domain='))?.slice(9)??'personal-community';
if(!['personal-community','education-work','nature-technology','society-economy','arts-sports-exchange','culture-history','precision-reference-quantity','stance-comparison-rhetoric','event-agency-voice','information-order-cohesion','argument-logic-concession','long-input-structure-map','inference-evidence-check','cross-text-synthesis','structured-written-argument','structured-spoken-defense','timed-sectional-rehearsal'].includes(domain))throw Error('Unsupported HSK4 smoke domain');
const draft=JSON.parse(readFileSync(`content/drafts/thien-lo-hsk4-${domain}-v2.json`,'utf8'));
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
const revisions:Array<{lessonId:string;revisionId:string}>=[];
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 for(const item of draft.items){
  const released=runtime.items.find(entry=>entry.content.targetLessonId===item.lessonId);
  if(!released||canonicalStudioJson(released.content.lessonPages)!==canonicalStudioJson(item.lessonPages))throw Error(`Published pages differ: ${item.lessonId}`);
  const row=db.prepare('SELECT h.revision_id FROM content_release_heads h JOIN content_items i ON i.id=h.item_id WHERE i.stable_key=?').get(`thien-lo-v2-${item.lessonId}`) as {revision_id:string}|undefined;
  if(!row)throw Error(`Missing head: ${item.lessonId}`);
  revisions.push({lessonId:item.lessonId,revisionId:row.revision_id});
 }
}finally{db.close()}
const browser=await chromium.launch({headless:true});
try{
 const guest=await browser.newContext({viewport:{width:375,height:812}});
 const guestPage=await guest.newPage();
 const gated=await guestPage.request.get(`${origin}/api/content/runtime?projection=learning&level=hsk4`);
 expect(gated.status()).toBe(403);
 await guest.close();
 const editorContext=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await editorContext.newPage();
 const accounts=await(await page.request.post(`${origin}/api/auth/hanzi/demo-accounts`,{headers:{origin}})).json();
 const editor=accounts.accounts.find((account:{username:string})=>account.username==='editor.demo');
 expect((await page.request.post(`${origin}/api/auth/hanzi/login`,{headers:{origin},data:{identifier:editor.username,password:editor.password}})).ok()).toBe(true);
 const first=draft.items[0],revision=revisions[0];
 await page.goto(`${origin}/studio/items/${revision.revisionId}`);
 const reader=page.locator('.lesson-page-reader');
 await expect(reader).toBeVisible({timeout:30000});
 await page.waitForFunction(()=>Object.keys(document.querySelector<HTMLSelectElement>('select[aria-label="Chọn trang học"]')??{}).some(key=>key.startsWith('__reactProps')));
 const mapPage=first.lessonPages.pages.find((p:{id:string})=>p.id.endsWith(':map:0'));
 const previewPage=mapPage??first.lessonPages.pages.find((p:{id:string})=>p.id.endsWith(':source:0'));
 await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(previewPage.id);
 await expect(reader.locator('.jade-page-title h2')).toHaveText(previewPage.title);
 if(mapPage)await expect(reader.getByText(mapPage.blocks[0].diagram.description,{exact:true})).toBeVisible();
 else await expect(reader.getByText(previewPage.blocks[0].reading.paragraphs[0].hanzi,{exact:true})).toBeVisible();
 const grammarPage=first.lessonPages.pages.find((p:{id:string})=>p.id.endsWith(':grammar:0'));
 if(grammarPage){
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(grammarPage.id);
  await expect(reader.locator('.jade-page-title h2')).toHaveText(grammarPage.title);
  await expect(reader.getByText('Câu mẫu sau là tình huống giả định để luyện cấu trúc, không phải dữ kiện trong hai nguồn.',{exact:false})).toBeVisible();
  await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption('1');
  await expect(reader.getByText(grammarPage.blocks[1].pinyin,{exact:true})).toBeVisible();
 }
 const timedPage=first.lessonPages.pages.find((p:{blocks:Array<{activity?:{timeLimitSeconds?:number}}>})=>p.blocks.some(block=>block.activity?.timeLimitSeconds));
 if(timedPage){
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(timedPage.id);
  await expect(reader.getByRole('button',{name:'Bắt đầu canh giờ'})).toBeVisible();
  expect(await reader.locator('.jade-blocks').evaluate(element=>element.getBoundingClientRect().height)).toBeGreaterThan(200);
  await reader.getByRole('button',{name:'Bắt đầu canh giờ'}).click();
  await expect(reader.getByText(/Còn \d+:\d{2}/)).toBeVisible();
 }
 await page.setViewportSize({width:375,height:812});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 console.log({domain,publishedLessons:revisions.length,premiumGate:403,editorExact:true,previewContent:true,grammarExample:Boolean(grammarPage),timer:Boolean(timedPage),mobileWidth:375});
 await editorContext.close();
}finally{await browser.close()}
