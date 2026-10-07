/** Real guest journey on the running local server; isolated browser, no seeded progress. */
import {chromium,expect as baseExpect} from '@playwright/test';
const expect=baseExpect.configure({timeout:30000});
import {readIndexedDbStore,type OwnerScopedCacheRecord} from '../../e2e/indexedDb';
const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3000';
const checkMistakes=process.argv.includes('--mistakes');
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
 const page=await context.newPage();
 await page.goto(`${origin}/onboarding`);
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
 await expect(page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true})).toBeHidden();
 await page.goto(`${origin}/lesson/boot-1`);
 const reader=page.locator('.lesson-page-reader');
 await expect(reader).toBeVisible({timeout:30000});
 const invitation=page.getByRole('button',{name:'Đóng lời mời Khảo Nghiệm Căn Cơ'});
 if(await invitation.isVisible())await invitation.click();
 await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('boot-1:v2:recognize');
 await reader.getByRole('button',{name:'Thanh 4',exact:true}).click();
 await reader.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
 await expect(reader.getByRole('status')).toContainText('Đúng với đáp án');
 await page.reload();
 await expect(reader).toBeVisible({timeout:30000});
 await expect(reader.getByRole('button',{name:'Thanh 4',exact:true})).toHaveAttribute('aria-pressed','true');
 // Exercise the real open-answer path without granting objective correctness.
 await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('boot-1:v2:transfer');
 await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption('2');
 const writing=reader.getByRole('textbox',{name:'Bản viết của bạn'});
 const initialText='Tôi còn nhầm hướng thanh 2 và thanh 3.';
 await writing.fill(initialText);
 await page.reload();
 await expect(reader).toBeVisible({timeout:30000});
 await expect(writing).toHaveValue(initialText,{timeout:30000});
 await expect(reader.locator('.jade-rubric-checklist')).toHaveCount(0);
 await reader.getByRole('button',{name:'Xem hướng dẫn đối chiếu',exact:true}).click();
 await expect(reader.locator('.jade-reveal')).toContainText('câu mở chưa được chấm tự động');
 await reader.locator('.jade-rubric-checklist summary').click();
 const criterion=reader.getByRole('checkbox',{name:/Giữ đúng hướng/});
 await criterion.check();
 await page.reload();
 await expect(reader).toBeVisible({timeout:30000});
 await expect(writing).toHaveValue(initialText,{timeout:30000});
 await reader.locator('.jade-rubric-checklist summary').click();
 await expect(criterion).toBeChecked();
 await expect(reader.locator('.jade-practice-note')).toContainText('chưa phải đánh giá thành thạo');
 await writing.fill('Tôi đã xem tiêu chí và sẽ luyện lại thanh 2, thanh 3.');
 await expect(reader.locator('.jade-reveal')).toHaveCount(0);
 await reader.getByRole('button',{name:'Xem hướng dẫn đối chiếu',exact:true}).click();
 await expect(reader.locator('.jade-reveal')).toContainText('câu mở chưa được chấm tự động');
 const dictionary=reader.getByRole('link',{name:'Tra từ trong bài (mở tab mới)'});
 await expect(dictionary).toHaveAttribute('href','/dictionary?lesson=boot-1');
 const popupPromise=context.waitForEvent('page');await dictionary.click();
 const dictionaryPage=await popupPromise;await dictionaryPage.waitForLoadState('domcontentloaded');
 await expect(dictionaryPage).toHaveURL(/\/dictionary\?lesson=boot-1/);
 await expect(dictionaryPage.locator('main')).toBeVisible();await dictionaryPage.close();
 await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('boot-1:v2:recap');
 await reader.getByRole('button',{name:/^(Bước vào Thử Luyện|Bắt đầu luyện tập|Tiếp tục Thử Luyện)$/}).click();
 const live=page.locator('.lesson-live-page');await expect(live).toBeVisible();
 const progress=live.getByRole('progressbar',{name:'Tiến độ Thử Luyện'});
 const index=await progress.getAttribute('aria-valuenow');
 await live.getByRole('button',{name:'Lý thuyết',exact:true}).click();
 await expect(live.locator('.lesson-page-reader')).toBeVisible();
 await live.getByRole('button',{name:`Quay lại câu ${index}`,exact:true}).click();
 await expect(progress).toHaveAttribute('aria-valuenow',index!);
 await page.reload();await expect(progress).toHaveAttribute('aria-valuenow',index!);
 for(const viewport of [{width:1280,height:800},{width:375,height:812},{width:812,height:375}]){
  await page.setViewportSize(viewport);
  await expect.poll(()=>live.locator('.answer-console').evaluate(el=>{const box=el.getBoundingClientRect();return box.top>=0&&box.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;})).toBe(true);
 }
 type Resume={lessonId:string;index:number;exercises:Array<{correct:string}>};
 let answered=0;
 for(;answered<60&&await live.isVisible();answered++){
  const records=await readIndexedDbStore<OwnerScopedCacheRecord<Resume>>(page,'lesson-resumes');
  const resume=records.find(r=>r.value?.lessonId==='boot-1'&&Array.isArray(r.value.exercises))?.value;
  if(!resume)throw Error('Missing trial resume');
  const correct=resume.exercises[resume.index].correct;
  const input=page.locator('.recall-answer input');
  if(await input.isVisible())await input.fill(answered===0?'chưa nhớ':correct);
  else{
   const buttons=page.locator('.answer-grid > button');
   const count=await buttons.count();let picked=false;
   for(let i=0;i<count;i++)if(((await buttons.nth(i).locator('strong').innerText())===correct)!==(checkMistakes&&answered===0)){await buttons.nth(i).click();picked=true;break;}
   if(!picked)throw Error('Cannot locate exact answer');
  }
  await page.getByRole('button',{name:'Xác nhận',exact:true}).click();
  await page.getByRole('button',{name:/^(Câu tiếp theo|Hoàn tất thử luyện)$/}).click();
  await expect(page.getByRole('button',{name:'Xác nhận',exact:true}).or(page.getByTestId('lesson-quest-result'))).toBeVisible();
 }
 const result=page.getByTestId('lesson-quest-result');await expect(result).toBeVisible();
 await result.getByText('Hiểu kết quả và bước ôn tiếp',{exact:true}).click();
 await expect(result).toContainText('Vượt ải chưa có nghĩa đã thành thạo lâu dài');
 for(const viewport of [{width:1280,height:800},{width:375,height:812},{width:812,height:375}]){
  await page.setViewportSize(viewport);
  await expect.poll(()=>result.locator('.path-clear-actions').evaluate(el=>{const box=el.getBoundingClientRect();return box.top>=0&&box.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;})).toBe(true);
 }
 if(checkMistakes){
  const mistake=await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-os-learning-state-v1')!).mistakes.find((m:{lessonId:string;resolved:boolean})=>m.lessonId==='boot-1'&&!m.resolved)) as {id:string;prompt:string;correctAnswer:string}|undefined;
  if(!mistake)throw Error('Wrong trial answer did not create a mistake');
  await page.goto(`${origin}/mistakes`);
  const start=page.getByRole('button',{name:'Bắt đầu hóa giải'});
  await expect(start).toBeEnabled();await start.click();
  await expect(page.locator('.rem-attempt-view h2')).toHaveText(mistake.prompt);
  await page.getByRole('textbox',{name:'Câu trả lời của bạn'}).fill(mistake.correctAnswer);
  await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();
  await expect(page.locator('.rem-feedback-view')).toBeVisible();
  await expect.poll(()=>page.evaluate(id=>JSON.parse(localStorage.getItem('hanzi-os-learning-state-v1')!).mistakes.find((m:{id:string})=>m.id===id)?.correctedStreak,mistake.id)).toBe(1);
  await page.reload();
  await expect(page.locator('.rem-atlas')).toBeVisible();
  await expect(start).toBeDisabled();
 }
 console.log({lesson:'boot-1',guest:true,seededProgress:false,readingReload:true,rubricDraftReload:true,rubricChecklistReload:true,openAnswerNotAutoScored:true,trialReload:true,theoryReturn:true,dictionaryPopup:true,result:true,mistakeRemediationAndReload:checkMistakes,answered,viewports:3});
 await context.close();
}finally{await browser.close();}
