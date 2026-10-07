/** Fresh isolated guests receive fixture prerequisites only; no real learner state is changed. */
import {readFileSync} from 'node:fs';
import {chromium,expect as baseExpect} from '@playwright/test';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository';
import {isLessonPageDocument} from '../../src/learning/lessonPages';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {readIndexedDbStore,type OwnerScopedCacheRecord} from '../../e2e/indexedDb';
import type {LessonReadingSession} from '../../src/learning/lessonReadingSession';
const expect=baseExpect.configure({timeout:30000});
const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3000';
const cases=[{id:'hsk2-dictation-lesson-01',fixture:'dictation',kind:'dictation'},{id:'hsk3-personal-life-narratives-identity-transactions',fixture:'personal',kind:'reading'}];
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});db.close();
const browser=await chromium.launch({headless:true});
try{
 for(const example of cases){
  const content=runtime.items.find(i=>i.content.targetLessonId===example.id)?.content;
  if(!isLessonPageDocument(content?.lessonPages))throw Error('Missing published pages');
  const document=content.lessonPages;
  const practice=document.pages.find(p=>p.blocks[0].kind===example.kind);if(!practice)throw Error('Missing practice');
  const block=practice.blocks[0];
  const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  const page=await context.newPage();await page.goto(`${origin}/onboarding`);
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  await page.goto(`${origin}/lesson/${example.id}`);
  await expect(page.getByRole('heading',{name:'Thử Luyện này chưa khai mở',exact:true})).toBeVisible();
  const evidence=JSON.parse(readFileSync(`e2e/fixtures/${example.fixture}-prerequisite-evidence.json`,'utf8'));
  await page.evaluate(e=>{const key='hanzi-os-learning-state-v1';const state=JSON.parse(localStorage.getItem(key)!);state.evidence.push(...e);localStorage.setItem(key,JSON.stringify(state));},evidence);
  await page.reload();const reader=page.locator('.lesson-page-reader');await expect(reader).toBeVisible();
  await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption(practice.id);
  if(example.kind==='dictation'){
   await reader.getByRole('button',{name:'Nghe đoạn cần chép · giọng tổng hợp',exact:true}).click();
   await reader.getByRole('textbox',{name:'Câu trả lời của bạn'}).fill('我的草稿');
   await reader.getByRole('button',{name:'Tôi đã dùng Pinyin / gợi ý bàn phím',exact:true}).click();
   await reader.getByRole('button',{name:'Cần xem mẫu',exact:true}).click();
   await expect(reader.locator('.jade-reveal')).toContainText(block.hanzi);
   await reader.getByRole('button',{name:'Thu mẫu lại',exact:true}).click();
  }else{
   await reader.getByRole('textbox').fill('Tách dữ kiện khỏi suy đoán.');
   await reader.getByRole('button',{name:'Chọn đoạn 2 làm bằng chứng',exact:true}).click();
   await reader.getByRole('button',{name:'Mở Pinyin',exact:true}).click();
  }
  await expect.poll(async()=>{
   const records=await readIndexedDbStore<OwnerScopedCacheRecord<LessonReadingSession>>(page,'lesson-resumes');
   const session=records.find(r=>r.value?.lessonId===example.id)?.value;
   return example.kind==='dictation'?session?.drafts[block.id]?.usedHint:session?.drafts[block.id]?.showPinyin;
  }).toBe(true);
  await page.reload();await expect(reader).toBeVisible();
  const records=await readIndexedDbStore<OwnerScopedCacheRecord<LessonReadingSession>>(page,'lesson-resumes');
  const session=records.find(r=>r.value?.lessonId===example.id)?.value;
  expect(session?.document).toEqual(document);
  expect(session?.drafts[block.id]?.everRevealed).toBe(true);
  if(example.kind==='dictation'){
   await expect(reader.getByRole('textbox')).toHaveValue('我的草稿');
   await expect(reader.getByRole('button',{name:'Đã ghi nhận dùng Pinyin / gợi ý bàn phím',exact:true})).toBeDisabled();
   await expect(reader.locator('.jade-reveal')).toHaveCount(0);
  }else{
   await expect(reader.getByRole('textbox')).toHaveValue('Tách dữ kiện khỏi suy đoán.');
   await expect(reader.getByRole('button',{name:'Bỏ chọn đoạn 2 làm bằng chứng',exact:true})).toHaveAttribute('aria-pressed','true');
   await expect(reader.getByRole('button',{name:'Ẩn Pinyin',exact:true})).toHaveAttribute('aria-pressed','true');
  }
  for(const viewport of [{width:375,height:812},{width:812,height:375}]){
   await page.setViewportSize(viewport);
   await expect.poll(()=>reader.locator(':scope > footer').evaluate(el=>{const box=el.getBoundingClientRect();return box.top>=0&&box.bottom<=innerHeight&&window.document.documentElement.scrollWidth<=innerWidth;})).toBe(true);
  }
  console.log({lesson:example.id,kind:example.kind,restore:true,helpHistory:true,publishedSnapshot:true,footerInViewport:true,syntheticPrerequisites:true});
  await context.close();
 }
}finally{await browser.close();}
