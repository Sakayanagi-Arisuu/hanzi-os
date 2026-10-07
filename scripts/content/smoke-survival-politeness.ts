import {chromium,expect} from '@playwright/test';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {politenessPrompt} from './survival-politeness-correction.mjs';
const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3000';
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
let revisionId:string;
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 const item=runtime.items.find(i=>i.content.targetLessonId==='survival-1');
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
 await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('survival-1:v2:transfer');
 await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption('1');
 await expect(reader.getByText(politenessPrompt,{exact:true})).toBeVisible();
 await expect(reader.getByText(/B：对不起！/)).toHaveCount(0);
 await reader.getByRole('textbox',{name:'Bản viết của bạn'}).fill('A: 谢谢！ B: 不客气。 B: 对不起！ A: 没关系。 A: 明天见！ B: 明天见！');
 await reader.getByRole('button',{name:'Xem hướng dẫn đối chiếu'}).click();
 await expect(reader.getByText(/B：对不起！/)).toBeVisible();
 await expect(reader.getByText(/B \(sau đó va nhẹ vào A\): Xin lỗi!/)).toBeVisible();
 await page.setViewportSize({width:375,height:812});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(reader.getByRole('textbox',{name:'Bản viết của bạn'})).toHaveValue(/A: 谢谢/);
 console.log({lesson:'survival-1',roleLabels:true,modelHiddenBeforeAttempt:true,studioPreview:true,mobileWidth:375});
 await context.close();
}finally{await browser.close();}
