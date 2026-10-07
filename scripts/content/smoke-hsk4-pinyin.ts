import {chromium,expect} from '@playwright/test';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository';
import {pinyinCorrectionScopes} from './hsk4-pinyin-source-corrections.mjs';
import {contextualPinyinPlan} from './hsk4-contextual-pinyin.mjs';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {isLessonPageDocument} from '../../src/learning/lessonPages';
const plan=contextualPinyinPlan as {lessons:Array<{lessonId:string;changes:Array<{path:string;before:string;after:string}>}>};
const contextual=process.argv.includes('--contextual');
const ids=contextual?plan.lessons.map(l=>l.lessonId):Object.keys(pinyinCorrectionScopes);
const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3000';
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
const repo=new ContentStudioRepository(d1Adapter(db));
const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
db.close();
const browser=await chromium.launch({headless:true});
let checked=0;
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await context.newPage();
 const accounts=await(await page.request.post(`${origin}/api/auth/hanzi/demo-accounts`,{headers:{origin}})).json();
 const editor=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
 expect((await page.request.post(`${origin}/api/auth/hanzi/login`,{headers:{origin},data:{identifier:editor.username,password:editor.password}})).ok()).toBe(true);
 for(const id of ids){
  const item=runtime.items.find(i=>i.content.targetLessonId===id);
  if(!item||!isLessonPageDocument(item.content.lessonPages))throw Error('Missing published lesson pages');
  const changes=contextual?plan.lessons.find(l=>l.lessonId===id)!.changes:null;
  if(changes)for(const change of changes){
   const actual=change.path.split('.').reduce((v:unknown,k:string)=>(v as Record<string,unknown>)[k],item.content);
   expect(actual).toBe(change.after);
  }
  const scope=pinyinCorrectionScopes[id as keyof typeof pinyinCorrectionScopes];
  if(!contextual){expect(JSON.stringify(item.content)).not.toContain(scope.before);expect(JSON.stringify(item.content)).toContain(scope.after);}
  const expectedPages=item.content.lessonPages.pages.filter(p=>p.blocks.some(b=>b.reading?.paragraphs.some(paragraph=>contextual?changes!.some(c=>c.after===paragraph.pinyin):paragraph.pinyin.includes(scope.after))));
  expect(expectedPages.length).toBeGreaterThan(0);
  await page.goto(`${origin}/studio/items/${item.revisionId}`);
  const reader=page.locator('.lesson-page-reader');
  await expect(reader).toBeVisible({timeout:30000});
  await page.waitForFunction(()=>Object.keys(document.querySelector('select[aria-label="Chọn trang học"]')??{}).some(key=>key.startsWith('__reactProps')));
  for(const sourcePage of expectedPages){
   await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(sourcePage.id);
   await reader.getByRole('button',{name:'Mở Pinyin',exact:true}).click();
   for(const block of sourcePage.blocks)for(const paragraph of block.reading?.paragraphs??[]){
    if(contextual?changes!.some(c=>c.after===paragraph.pinyin):paragraph.pinyin.includes(scope.after))await expect(reader.getByText(paragraph.pinyin,{exact:true})).toBeVisible();
   }
   checked++;
  }
  await page.setViewportSize({width:375,height:812});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.setViewportSize({width:1280,height:800});
 }
 console.log({lessons:ids.length,readingPages:checked,correctedPinyinVisible:true,mobileWidth:375,contextual});
 await context.close();
}finally{await browser.close();}
