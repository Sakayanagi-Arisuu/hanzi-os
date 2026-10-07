import {hsk2LastContextVisuals} from './hsk2-last-context-visual-decisions.mjs';
const hsk2LastContext=process.argv.includes('--hsk2-last-context-scenes');
import {hsk2ReferenceTravelVisuals} from './hsk2-reference-travel-visual-decisions.mjs';
const hsk2ReferenceTravel=process.argv.includes('--hsk2-reference-travel-scenes');
import {hsk2GrammarVisuals} from './hsk2-grammar-visual-decisions.mjs';
const hsk2Grammar=process.argv.includes('--hsk2-grammar-scenes');
import {hsk2EnvironmentVisuals} from './hsk2-environment-visual-decisions.mjs';
const hsk2Environment=process.argv.includes('--hsk2-environment-scenes');
import {hsk2StudyVisuals} from './hsk2-study-visual-decisions.mjs';
const hsk2Study=process.argv.includes('--hsk2-study-scenes');
import {hsk2LifeVisuals} from './hsk2-life-visual-decisions.mjs';
const hsk2Life=process.argv.includes('--hsk2-life-scenes');
import {hsk2DailyVisuals} from './hsk2-daily-visual-decisions.mjs';
const hsk2Daily=process.argv.includes('--hsk2-daily-scenes');
import {journeyVisuals} from './journey-visual-decisions.mjs';
import {professionalVisuals} from './professional-visual-decisions.mjs';
import {remainingTimeVisuals} from './remaining-time-visual-decisions.mjs';
import {numbersWeekVisuals} from './numbers-week-visual-decisions.mjs';
import {survivalDialogueAssets} from './survival-dialogue-visuals.mjs';
import {chromium,expect} from '@playwright/test';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3003';
const daily=process.argv.includes('--daily-scenes');
const survival=process.argv.includes('--survival-dialogue');
const location=process.argv.includes('--location-dialogue');
const weather=process.argv.includes('--weather-visuals');
const numbersWeek=process.argv.includes('--numbers-week');
const remainingTime=process.argv.includes('--remaining-time');
const professional=process.argv.includes('--professional-visuals');
const journey=process.argv.includes('--journey-visuals');
const selections=hsk2LastContext?Object.entries(hsk2LastContextVisuals).flatMap(([id,choice])=>choice.pages.map(suffix=>[id,id+':v2:'+suffix,choice.asset])):hsk2ReferenceTravel?Object.entries(hsk2ReferenceTravelVisuals).flatMap(([id,choice])=>choice.pages.map(suffix=>[id,id+':v2:'+suffix,choice.asset])):hsk2Grammar?Object.entries(hsk2GrammarVisuals).flatMap(([id,choice])=>choice.pages.map(suffix=>[id,id+':v2:'+suffix,choice.asset])):hsk2Environment?Object.entries(hsk2EnvironmentVisuals).flatMap(([id,choice])=>choice.pages.map(suffix=>[id,id+':v2:'+suffix,choice.asset])):hsk2Study?Object.entries(hsk2StudyVisuals).flatMap(([id,choice])=>choice.pages.map(suffix=>[id,id+':v2:'+suffix,choice.asset])):hsk2Life?Object.entries(hsk2LifeVisuals).flatMap(([id,choice])=>choice.pages.map(suffix=>[id,id+':v2:'+suffix,choice.asset])):hsk2Daily?Object.entries(hsk2DailyVisuals).flatMap(([id,choice])=>choice.pages.map(suffix=>[id,id+':v2:'+suffix,choice.asset])):journey?Object.entries(journeyVisuals).flatMap(([id,choice])=>choice.pages.map(suffix=>[id,`${id}:v2:${suffix}`,choice.asset])):professional?Object.entries(professionalVisuals).flatMap(([id,choice])=>choice.pages.map(suffix=>[id,`${id}:v2:${suffix}`,choice.asset])):remainingTime?Object.entries(remainingTimeVisuals).flatMap(([id,choice])=>choice.pages.map(suffix=>[id,`${id}:v2:${suffix}`,choice.asset])):numbersWeek?Object.entries(numbersWeekVisuals).flatMap(([id,choice])=>['context','dialogue'].map(suffix=>[id,`${id}:v2:${suffix}`,choice.asset])):weather?['context','dialogue'].map(suffix=>['hsk1-time-place-events-06-weather-and-residence',`hsk1-time-place-events-06-weather-and-residence:v2:${suffix}`,'rainy-home-residence-v1.webp']):location?[['hsk1-time-place-events-05-location','hsk1-time-place-events-05-location:v2:dialogue','book-desk-cat-location-v1.webp']]:survival?Object.entries(survivalDialogueAssets).map(([id,asset])=>[id,`${id}:v2:dialogue`,asset]):daily?[['daily-1','apple-market-prices-v1.webp'],['daily-2','breakfast-water-order-v1.webp'],['daily-3','shirt-shop-change-v1.webp'],['daily-4','clinic-waiting-room-v1.webp']].flatMap(([id,asset])=>['context','dialogue'].map(suffix=>[id,`${id}:v2:${suffix}`,asset])):[['daily-2','daily-2:v2:context','breakfast-water-order-v1.webp'],['journey-1','journey-1:v2:context','home-school-taxi-call-v1.webp'],['professional-1','professional-1:v2:arrival','secondary-school-introduction-v1.webp']];
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
const entries=[] as Array<{revisionId:string;pageId:string;src:string}>;
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 for(const [lessonId,pageId,filename] of selections){
  const item=runtime.items.find(row=>row.content.targetLessonId===lessonId);
  if(!item)throw Error(`Missing release ${lessonId}`);
  entries.push({revisionId:item.revisionId,pageId,src:`/lessons/ngoc-dien/${filename}`});
 }
}finally{db.close();}
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
  await page.waitForFunction(()=>Object.keys(document.querySelector('select[aria-label="Chọn trang học"]')??{}).some(key=>key.startsWith('__reactProps')));
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(entry.pageId);
  const img=reader.locator(`img[src="${entry.src}"]`).first();
  await expect(img).toHaveAttribute('src',entry.src);
  await expect.poll(()=>img.evaluate((node:HTMLImageElement)=>node.complete&&node.naturalWidth>0)).toBe(true);
  await page.setViewportSize({width:375,height:812});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(img).toBeVisible();
  if(hsk2LastContext||hsk2ReferenceTravel||hsk2Grammar||hsk2Environment||hsk2Study||hsk2Life||hsk2Daily||numbersWeek||remainingTime||professional||journey)await expect(reader.locator('.jade-scene figcaption')).toBeVisible();
  if(survival){
   await expect(reader.getByRole('button',{name:/Nghe trọn tình huống/})).toBeVisible();
   await reader.getByRole('button',{name:'Mở lời thoại Trung – Pinyin – Việt',exact:true}).click();
   await expect(reader.getByRole('combobox',{name:'Chọn mục trong trang'})).toBeVisible();
  }
  if(journey&&entry.pageId.startsWith('journey-')){
   await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(entry.pageId.replace(/:(context|dialogue)$/,':visual'));
   await expect(reader.locator('.jade-scene')).toHaveCount(0);
   await expect(reader.locator('.jade-diagram')).toBeVisible();
  }
  if(daily){
   await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(entry.pageId.replace(/:(context|dialogue)$/,':visual'));
   await expect(reader.locator('.jade-scene')).toHaveCount(0);
   await expect(reader.getByText('Sơ đồ để hiểu và đối chiếu',{exact:true})).toBeVisible();
  }
  await page.setViewportSize({width:1280,height:800});
 }
 await context.close();
 console.log({releasedScenes:entries.length,imagesLoaded:true,studioPreview:true,mobileWidth:375});
}finally{await browser.close();}
