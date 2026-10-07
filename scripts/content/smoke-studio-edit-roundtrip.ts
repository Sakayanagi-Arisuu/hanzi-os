/** Creates an unpublished, clearly labelled QA draft; never edits a released lesson. */
import {chromium,expect} from '@playwright/test';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import type {LessonPageDocument} from '../../src/learning/lessonPages';
const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3000';
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
let content:Record<string,unknown>;let heads:string;let resumeUrl:string|undefined;
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 const source=runtime.items.find(i=>i.content.targetLessonId==='daily-1');
 if(!source)throw Error('Missing released daily-1');
 content=structuredClone(source.content);
 const document=content.lessonPages as LessonPageDocument;
 document.pages=document.pages.filter(p=>p.id==='daily-1:v2:visual'||p.id==='daily-1:v2:choice');
 if(document.pages.length!==2)throw Error('Unexpected page selection');
 heads=JSON.stringify(db.prepare('SELECT * FROM content_release_heads ORDER BY item_id').all());
 if(process.argv.includes('--resume')){
  const row=db.prepare("SELECT r.id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key LIKE 'qa-roundtrip-%' ORDER BY r.created_at DESC LIMIT 1").get() as {id:string}|undefined;
  if(!row)throw Error('No QA draft to resume');
  resumeUrl=`${origin}/studio/items/${row.id}`;
 }
}finally{db.close();}
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await context.newPage();
 const accounts=await(await page.request.post(`${origin}/api/auth/hanzi/demo-accounts`,{headers:{origin}})).json();
 const editor=accounts.accounts.find((a:{username:string})=>a.username==='editor.demo');
 expect((await page.request.post(`${origin}/api/auth/hanzi/login`,{headers:{origin},data:{identifier:editor.username,password:editor.password}})).ok()).toBe(true);
 if(!resumeUrl){
  const created=await page.request.post(`${origin}/studio/actions`,{headers:{origin},maxRedirects:0,form:{action:'create',itemType:'lesson',level:'hsk1',stableKey:`qa-roundtrip-${Date.now()}`,title:'QA chưa phát hành · kiểm lưu sơ đồ và phản hồi',idempotencyKey:crypto.randomUUID(),contentJson:JSON.stringify(content)}});
  expect(created.status()).toBe(303);
  resumeUrl=new URL(created.headers().location,origin).href;
 }
 console.log({qaDraft:resumeUrl});
 await page.goto(resumeUrl);
 await expect(page.getByRole('button',{name:'Lưu thay đổi',exact:true})).toBeEnabled({timeout:30000});
 const diagram=page.locator('.lesson-diagram-editor');
 await diagram.getByLabel('Nhãn Hán tự / mốc',{exact:true}).first().fill('一个苹果，三块钱。');
 await diagram.getByLabel('Ghi chú giải thích',{exact:true}).first().fill('Giá của một quả; đối chiếu giá hai quả ở mục tiếp theo.');
 const navigation=page.getByRole('navigation',{name:'Các trang đang soạn'});
 await navigation.getByRole('button').nth(1).click();
 const activity=page.locator('.lesson-activity-editor');
 await activity.getByRole('combobox',{name:'Dạng bài tập',exact:true}).selectOption('choice');
 const options=activity.locator(':scope > fieldset');
 const answer='两个苹果六块钱。';
 await options.first().getByLabel('Nội dung lựa chọn',{exact:true}).fill(answer);
 await options.first().getByRole('radio').check();
 await activity.getByRole('textbox',{name:'Phản hồi khi chọn',exact:true}).first().fill('Đúng với dữ kiện: hai quả táo giá sáu tệ.');
 await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
 await expect(page.getByRole('button',{name:'Lưu thay đổi',exact:true})).toBeEnabled({timeout:30000});
 await page.reload();
 const saved=JSON.parse(await page.locator('input[name=lessonPages]').inputValue()) as LessonPageDocument;
 expect(saved.pages[0].blocks[0].diagram?.nodes[0].label).toBe('一个苹果，三块钱。');
 expect(saved.pages[0].blocks[0].diagram?.nodes[0].note).toContain('Giá của một quả');
 const savedActivity=saved.pages[1].blocks.find(b=>b.activity)?.activity;
 expect(savedActivity?.options[0].text).toBe(answer);
 expect(savedActivity?.answerIds).toEqual([savedActivity?.options[0].id]);
 await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
 const reader=page.locator('.lesson-pages-editor .lesson-page-reader');
 await expect(reader.locator('.jade-diagram strong').first()).toHaveText('一个苹果，三块钱。');
 await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('daily-1:v2:choice');
 await reader.getByRole('button',{name:answer,exact:true}).click();
 await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
 await expect(reader.getByRole('status')).toContainText('Đúng với dữ kiện: hai quả táo giá sáu tệ.');
 await page.getByRole('button',{name:'Tiếp tục soạn',exact:true}).click();
 await navigation.getByRole('button').nth(1).click();
 await page.getByRole('combobox',{name:'Bố cục',exact:true}).selectOption('scene');
 const imageSrc='/lessons/ngoc-dien/apple-market-prices-v1.webp';
 await page.getByRole('combobox',{name:'Chọn cảnh minh họa',exact:true}).selectOption(imageSrc);
 await page.getByRole('textbox',{name:'Mô tả minh họa trang',exact:true}).fill('Quầy táo minh họa tình huống hỏi giá; số tiền lấy từ lời thoại.');
 await activity.getByRole('combobox',{name:'Dạng bài tập',exact:true}).selectOption('rubric');
 const criteria=activity.getByRole('button',{name:'Xóa tiêu chí',exact:true});
 while(await criteria.count())await criteria.first().click();
 await activity.getByRole('button',{name:'Thêm tiêu chí',exact:true}).click();
 await activity.getByRole('textbox',{name:'Tên tiêu chí',exact:true}).fill('Hỏi rõ giá hai quả táo');
 await activity.getByRole('textbox',{name:'Hướng dẫn tự kiểm',exact:true}).fill('Đối chiếu 两个苹果多少钱？; có số lượng và câu hỏi giá.');
 await activity.getByRole('textbox',{name:'Giải thích sau khi làm',exact:true}).fill('两个苹果多少钱？ Liǎng ge píngguǒ duōshao qián? Hai quả táo bao nhiêu tiền? Tự đối chiếu chưa phải chấm nói hoặc viết độc lập.');
 await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
 await expect(page.getByRole('button',{name:'Lưu thay đổi',exact:true})).toBeEnabled({timeout:30000});
 await page.reload();
 const rubricSaved=JSON.parse(await page.locator('input[name=lessonPages]').inputValue()) as LessonPageDocument;
 expect(rubricSaved.pages[1].illustration?.src).toBe(imageSrc);
 expect(rubricSaved.pages[1].blocks[0].activity?.rubric[0].label).toBe('Hỏi rõ giá hai quả táo');
 await page.getByRole('button',{name:'Xem như người học',exact:true}).click();
 await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('daily-1:v2:choice');
 const image=reader.locator('.jade-scene img');
 await expect(image).toHaveAttribute('src',imageSrc);
 await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await expect(reader.getByText('Hỏi rõ giá hai quả táo',{exact:true})).toHaveCount(0);
 await reader.getByRole('textbox',{name:'Bản viết của bạn'}).fill('两个苹果多少钱？');
 await reader.getByRole('button',{name:'Xem hướng dẫn đối chiếu',exact:true}).click();
 await reader.locator('.jade-rubric-checklist summary').click();
 await expect(reader.getByRole('checkbox')).toHaveCount(1);
 await expect(reader.getByText('Hỏi rõ giá hai quả táo',{exact:true})).toBeVisible();
 await page.setViewportSize({width:375,height:812});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const verify=openDatabase(findLocalDemoDatabase(process.cwd()),true);
 try{expect(JSON.stringify(verify.prepare('SELECT * FROM content_release_heads ORDER BY item_id').all())).toBe(heads);}finally{verify.close();}
 console.log({draftUrl:page.url(),diagramEdit:true,answerEdit:true,feedbackEdit:true,rubricEdit:true,pageImageEdit:true,imageLoaded:true,reload:true,preview:true,publishedHeadsUnchanged:true});
 await context.close();
}finally{await browser.close();}

