import {isLessonPageDocument} from '../../src/learning/lessonPages';
import {chromium,expect} from '@playwright/test';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {precisionMapIds,summaryMapIds,integrationMapIds} from './hsk4-precision-map-decisions.mjs';
const timePlaceVisualIds=process.argv.includes('--integration')?integrationMapIds:process.argv.includes('--summary')?summaryMapIds:precisionMapIds;
const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3000';
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
const entries:Array<{id:string;revisionId:string;maps:Array<{id:string;labels:string[];meanings:string[]}>}>=[];
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 for(const id of timePlaceVisualIds){
  const item=runtime.items.find(i=>i.content.targetLessonId===id);
  if(!item)throw Error(`Missing ${id}`);
  const doc=item.content.lessonPages;
  if(!isLessonPageDocument(doc))throw Error('Invalid published pages');
  const maps=doc.pages.filter(p=>p.id.includes(':source-map-review:')).map((_,index)=>{
   const page=doc.pages.find(p=>p.id===`${id}:v2:source-map-review:${index}`);
   const block=page?.blocks[0];
   if(!page||block?.kind!=='diagram'||!block.diagram)throw Error('Missing diagram');
   return {id:page.id,labels:block.diagram.nodes.map(n=>n.label),meanings:block.diagram.nodes.map(n=>n.meaningVi)};
  });
  entries.push({id,revisionId:item.revisionId,maps});
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
  for(const map of entry.maps){
   await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(map.id);
   await expect(reader.locator('.lesson-page-content')).toHaveClass(/layout-focus/);
   await expect(reader.locator('.jade-scene')).toHaveCount(0);
    await expect(reader.locator('.jade-diagram strong')).toHaveText(map.labels);
    for(const meaning of map.meanings)await expect(reader.getByText(meaning,{exact:true})).toBeVisible();
    await page.setViewportSize({width:375,height:812});
    await expect(reader.locator('.jade-diagram')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.setViewportSize({width:1280,height:800});
  }
 }
 console.log({lessons:entries.length,pages:entries.reduce((n,e)=>n+e.maps.length,0),exactDiagramLabels:true,sourceMeanings:true,studioPreview:true,mobileWidth:375});
 await context.close();
}finally{await browser.close();}
