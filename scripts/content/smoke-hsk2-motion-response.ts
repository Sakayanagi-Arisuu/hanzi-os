import {chromium,expect} from '@playwright/test';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3000';
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
let revisionId:string;
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 const item=runtime.items.find(i=>i.content.targetLessonId==='hsk2-travel-leisure-lesson-02');
 if(!item)throw Error('Missing release');
 revisionId=item.revisionId;
}finally{db.close();}
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await context.newPage();
 const accounts=await(await page.request.post(`${origin}/api/auth/hanzi/demo-accounts`,{headers:{origin}})).json();
 const editor=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
 expect((await page.request.post(`${origin}/api/auth/hanzi/login`,{headers:{origin},data:{identifier:editor.username,password:editor.password}})).ok()).toBe(true);
 await page.goto(`${origin}/studio/items/${revisionId}`);
 const reader=page.locator('.lesson-page-reader');
 await expect(reader).toBeVisible({timeout:30000});
 await page.waitForFunction(()=>Object.keys(document.querySelector('select[aria-label="Chọn trang học"]')??{}).some(key=>key.startsWith('__reactProps')));

 await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('hsk2-travel-leisure-lesson-02:v2:dialogue');
 await reader.getByRole('button',{name:'Mở lời thoại Trung – Pinyin – Việt',exact:true}).click();
 await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption('6');
 await expect(reader.getByText('我还在门外等你，出来以后到我这里来。',{exact:true})).toBeVisible();
 await expect(reader.getByText('Tôi vẫn đợi bạn ngoài cửa; ra ngoài rồi đến chỗ tôi.',{exact:true})).toBeVisible();
 await page.setViewportSize({width:375,height:812});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 console.log({lesson:'hsk2-travel-leisure-lesson-02',locationResponse:true,studioPreview:true,mobileWidth:375});
 await context.close();
}finally{await browser.close();}
