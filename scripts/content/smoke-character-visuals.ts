import {chromium,expect} from '@playwright/test';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {characterVisualIds,characterVisualPairs} from './character-visual-decisions.mjs';
const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3000';
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
const entries:Array<{id:string;revisionId:string;pair:string}>=[];
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 for(const [index,id] of characterVisualIds.entries()){
  const item=runtime.items.find(i=>i.content.targetLessonId===id);
  if(!item)throw Error(`Missing ${id}`);
  entries.push({id,revisionId:item.revisionId,pair:characterVisualPairs[index]});
 }
}finally{db.close();}
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await context.newPage();
 const accounts=await(await page.request.post(`${origin}/api/auth/hanzi/demo-accounts`,{headers:{origin}})).json();
 const editor=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
 expect((await page.request.post(`${origin}/api/auth/hanzi/login`,{headers:{origin},data:{identifier:editor.username,password:editor.password}})).ok()).toBe(true);
 for(const entry of entries){
  await page.goto(`${origin}/studio/items/${entry.revisionId}`);
  const reader=page.locator('.lesson-page-reader');
  await expect(reader).toBeVisible({timeout:30000});
  await page.waitForFunction(()=>Object.keys(document.querySelector('select[aria-label="Chọn trang học"]')??{}).some(key=>key.startsWith('__reactProps')));
  for(const suffix of ['context','visual']){
   await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(`${entry.id}:v2:${suffix}`);
   await expect(reader.locator('.lesson-page-content')).toHaveClass(/layout-focus/);
   await expect(reader.locator('.jade-scene')).toHaveCount(0);
   if(suffix==='visual'){
    await expect(reader.locator('.jade-diagram strong')).toHaveText(entry.pair.split(' / '));
    await page.setViewportSize({width:375,height:812});
    await expect(reader.locator('.jade-diagram')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.setViewportSize({width:1280,height:800});
   }
  }
 }
 console.log({lessons:entries.length,pages:entries.length*2,exactGlyphs:true,studioPreview:true,mobileWidth:375});
 await context.close();
}finally{await browser.close();}
