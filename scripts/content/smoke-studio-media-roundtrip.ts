/** Reuses the unpublished QA draft; upload and edit through the actual Studio UI. */
import {chromium,expect as baseExpect} from '@playwright/test';
import {findLocalDemoDatabase,openDatabase} from '../demo/local-demo-database.mjs';
import type {LessonPageDocument} from '../../src/learning/lessonPages';
const expect=baseExpect.configure({timeout:30000});
const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3000';
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
let revisionId:string;let heads:string;
try{
 const row=db.prepare("SELECT r.id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key LIKE 'qa-roundtrip-%' ORDER BY r.created_at DESC LIMIT 1").get() as {id:string}|undefined;
 if(!row)throw Error('Existing QA draft required');revisionId=row.id;
 heads=JSON.stringify(db.prepare('SELECT * FROM content_release_heads ORDER BY item_id').all());
}finally{db.close();}
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await context.newPage();
 const accounts=await(await page.request.post(`${origin}/api/auth/hanzi/demo-accounts`,{headers:{origin}})).json();
 const editor=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
 expect((await page.request.post(`${origin}/api/auth/hanzi/login`,{headers:{origin},data:{identifier:editor.username,password:editor.password}})).ok()).toBe(true);
 await page.goto(`${origin}/studio/items/${revisionId}`);
 const save=page.getByRole('button',{name:'Lưu thay đổi',exact:true});await expect(save).toBeEnabled();
 const title='QA ảnh · sách và mèo';
 const doc=JSON.parse(await page.locator('input[name=lessonPages]').inputValue()) as LessonPageDocument;
 const index=doc.pages.findIndex(p=>p.title===title);
 if(index>=0)await page.getByRole('navigation',{name:'Các trang đang soạn'}).getByRole('button').nth(index).click();
 else{await page.getByRole('button',{name:'Thêm trang',exact:true}).click();await page.getByRole('textbox',{name:'Tên trang',exact:true}).fill(title);}
 await page.getByRole('combobox',{name:'Loại khối',exact:true}).selectOption('image');
 const picker=page.locator('.lesson-media-picker');
 await picker.getByRole('button',{name:'Chọn hoặc tải ảnh',exact:true}).click();
 const mediaTitle='QA media sách và mèo · 2026-09-30';
 await picker.getByRole('textbox',{name:'Tìm học liệu theo tên, chú thích hoặc nguồn'}).fill(mediaTitle);
 await picker.getByRole('button',{name:'Tìm học liệu',exact:true}).click();
 await expect(picker.getByRole('button',{name:'Tìm học liệu',exact:true})).toBeEnabled();
 const existing=picker.locator('.lesson-media-grid article').filter({hasText:mediaTitle});
 if(await existing.count())await existing.first().getByRole('button',{name:'Dùng học liệu này',exact:true}).click();
 else{
  await picker.locator('input[type=file]').setInputFiles('public/lessons/ngoc-dien/book-desk-cat-location-v1.webp');
  for(const [name,value] of [['Tên học liệu',mediaTitle],['Mô tả ảnh cho người không nhìn thấy','Sách trên bàn, mèo dưới bàn'],['Chú thích','Sách ở trên bàn; mèo ở dưới bàn.'],['Nguồn học liệu','OpenAI imagegen · HANZI.OS · 2026-09-30'],['Giấy phép hoặc quyền sử dụng','Nguyên bản tạo cho HANZI.OS']])await picker.getByRole('textbox',{name,exact:true}).fill(value);
  await picker.getByRole('combobox',{name:'Loại nguồn',exact:true}).selectOption('synthetic');
  await picker.getByRole('button',{name:'Tải lên và dùng trong khối',exact:true}).click();
 }
 await expect(picker.getByRole('button',{name:'Chọn hoặc tải ảnh',exact:true})).toBeVisible();
 const caption='Sách ở trên bàn; mèo ở dưới cùng chiếc bàn. Hãy đối chiếu 上 và 下.';
 await page.getByRole('textbox',{name:'Chú thích học liệu',exact:true}).fill(caption);
 await page.getByRole('spinbutton',{name:'Trọng tâm ảnh ngang (%)',exact:true}).fill('45');
 await save.click();await expect(save).toBeEnabled();await page.reload();await expect(save).toBeEnabled();
 const saved=JSON.parse(await page.locator('input[name=lessonPages]').inputValue()) as LessonPageDocument;
 const imagePage=saved.pages.find(p=>p.title===title)!;const block=imagePage.blocks[0];
 expect(block.media?.metadata.caption).toBe(caption);expect(block.media?.metadata.focalX).toBe(45);expect(block.media?.metadata.humanReviewed).toBe(false);
 await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
 const reader=page.locator('.lesson-pages-editor .lesson-page-reader');
 await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(imagePage.id);
 const img=reader.locator('figure img');await expect.poll(()=>img.evaluate((n:HTMLImageElement)=>n.complete&&n.naturalWidth>0)).toBe(true);
 await expect(reader.locator('figcaption')).toHaveText(caption);
 for(const viewport of [{width:1280,height:800},{width:375,height:812},{width:812,height:375}]){
  await page.setViewportSize(viewport);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await reader.locator('figure').evaluate(el=>{const image=el.querySelector('img')!.getBoundingClientRect();const caption=el.querySelector('figcaption')!.getBoundingClientRect();return caption.top>=image.bottom-1;})).toBe(true);
 }
 await page.setViewportSize({width:1280,height:800});
 await page.getByRole('button',{name:'Tiếp tục soạn',exact:true}).click();
 const sceneTitle='QA cảnh · chú thích giữ nguyên';
 const sceneIndex=saved.pages.findIndex(p=>p.title===sceneTitle);
 if(sceneIndex>=0)await page.getByRole('navigation',{name:'Các trang đang soạn'}).getByRole('button').nth(sceneIndex).click();
 else{await page.getByRole('button',{name:'Thêm trang',exact:true}).click();await page.getByRole('textbox',{name:'Tên trang',exact:true}).fill(sceneTitle);}
 await page.getByRole('combobox',{name:'Bố cục',exact:true}).selectOption('scene');
 await page.getByRole('textbox',{name:'Nội dung / yêu cầu',exact:true}).fill('Đối chiếu vị trí sách và mèo trong tranh.');
 const scenePicker=page.locator('.lesson-media-picker');
 await scenePicker.getByRole('button',{name:'Chọn hoặc tải ảnh',exact:true}).click();
 await scenePicker.getByRole('textbox',{name:'Tìm học liệu theo tên, chú thích hoặc nguồn'}).fill(mediaTitle);
 await scenePicker.getByRole('button',{name:'Tìm học liệu',exact:true}).click();
 await expect(scenePicker.getByRole('button',{name:'Tìm học liệu',exact:true})).toBeEnabled();
 await scenePicker.locator('.lesson-media-grid article').filter({hasText:mediaTitle}).first().getByRole('button',{name:'Dùng học liệu này',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Chú thích minh họa trang',exact:true})).toHaveValue('Sách ở trên bàn; mèo ở dưới bàn.');
 const sceneCaption='Quan sát sách trên mặt bàn và mèo ở dưới bàn.';
 await page.getByRole('textbox',{name:'Chú thích minh họa trang',exact:true}).fill(sceneCaption);
 await page.getByRole('spinbutton',{name:'Trọng tâm minh họa ngang (%)',exact:true}).fill('40');
 await save.click();await expect(save).toBeEnabled();await page.reload();await expect(save).toBeEnabled();
 const sceneSaved=JSON.parse(await page.locator('input[name=lessonPages]').inputValue()) as LessonPageDocument;
 const scenePage=sceneSaved.pages.find(p=>p.title===sceneTitle)!;
 expect(scenePage.illustration).toMatchObject({caption:sceneCaption,focalX:40,focalY:50});
 await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
 await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(scenePage.id);
 for(const viewport of [{width:1280,height:800},{width:375,height:812},{width:812,height:375}]){
  await page.setViewportSize(viewport);
  await expect(reader.locator('.jade-scene figcaption')).toBeVisible();
  await expect(reader.locator('.jade-scene figcaption')).toHaveText(sceneCaption);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await reader.locator('.jade-scene').evaluate(el=>{const image=el.querySelector('img')!.getBoundingClientRect();const caption=el.querySelector('figcaption')!.getBoundingClientRect();return caption.top>=image.bottom-1&&image.height>0;})).toBe(true);
 }
 const asset=await(await page.request.get(`${origin}/api/content/media?kind=image&q=${encodeURIComponent(mediaTitle)}`)).json();
 expect(asset.assets.some((a:{url:string;usages:Array<{id:string}>})=>a.url===block.media!.src&&a.usages.some(u=>u.id===revisionId))).toBe(true);
 const verify=openDatabase(findLocalDemoDatabase(process.cwd()),true);try{expect(JSON.stringify(verify.prepare('SELECT * FROM content_release_heads ORDER BY item_id').all())).toBe(heads);}finally{verify.close();}
 console.log({uploadOrReuse:true,captionEdit:true,sceneMetadataRoundtrip:true,focalEdit:true,saveReload:true,imageLoaded:true,captionNoOverlap:true,viewports:3,usageReference:true,releaseHeadsUnchanged:true,draft:revisionId});
 await context.close();
}finally{await browser.close();}
