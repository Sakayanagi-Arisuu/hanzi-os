/** Simulates old content only in an isolated guest snapshot, never in D1. */
import {chromium,expect as baseExpect} from '@playwright/test';
import {readIndexedDbStore,type OwnerScopedCacheRecord} from '../../e2e/indexedDb';
import type {LessonReadingSession} from '../../src/learning/lessonReadingSession';
const expect=baseExpect.configure({timeout:30000});
const origin=process.env.HANZI_E2E_ORIGIN??'http://localhost:3000';
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await context.newPage();await page.goto(`${origin}/onboarding`);
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
 await page.goto(`${origin}/lesson/boot-1`);const reader=page.locator('.lesson-page-reader');
 await reader.getByRole('combobox',{name:'Chọn trang học'}).selectOption('boot-1:v2:transfer');
 await reader.getByRole('combobox',{name:'Chọn mục trong trang'}).selectOption('2');
 const text='Tôi cần luyện lại thanh 2 và thanh 3.';
 await reader.getByRole('textbox',{name:'Bản viết của bạn'}).fill(text);
 const records=()=>readIndexedDbStore<OwnerScopedCacheRecord<LessonReadingSession>>(page,'lesson-resumes');
 await expect.poll(async()=>(await records()).some(r=>r.value?.lessonId==='boot-1'&&Object.values(r.value.drafts??{}).some(d=>d.text===text))).toBe(true);
 const original=(await records()).find(r=>r.value?.lessonId==='boot-1')!;
 // Unmount the reader before changing the simulated old snapshot, so pending
 // autosave effects cannot race the fixture write.
 await page.goto(`${origin}/privacy`);
 await page.evaluate(()=>new Promise<void>((resolve,reject)=>{
  const request=indexedDB.open('hanzi-os-sync-v1');request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const db=request.result;const tx=db.transaction('lesson-resumes','readwrite');const store=tx.objectStore('lesson-resumes');const all=store.getAll();
   all.onsuccess=()=>{for(const record of all.result)if(record.value?.lessonId==='boot-1'&&record.value?.version===1){record.value.document.pages[0].title+=' · bản trước';store.put(record);}};
   tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
  };
 }));
 let release!:()=>void;let requested=false;const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/content/runtime?projection=learning',async route=>{requested=true;await gate;await route.continue();});
 await page.goto(`${origin}/lesson/boot-1`);await expect.poll(()=>requested).toBe(true);
 await expect(page.getByRole('button',{name:'Bắt đầu bản cập nhật',exact:true})).toHaveCount(0);
 release();await expect(reader.getByRole('textbox')).toHaveValue(text);
 await expect(page.getByRole('button',{name:'Bắt đầu bản cập nhật',exact:true})).toBeVisible();
 await page.unroute('**/api/content/runtime?projection=learning');
 // API-only outage keeps application assets reachable and isolates the recovery contract.
 await page.route('**/api/content/runtime?projection=learning',route=>route.abort('internetdisconnected'));
 await page.reload();await expect(reader.getByRole('textbox')).toHaveValue(text);
 await expect(page.getByRole('button',{name:'Bắt đầu bản cập nhật',exact:true})).toHaveCount(0);
 const offline=(await records()).find(r=>r.entryKey===original.entryKey)!;
 expect(offline.value.document.pages[0].title).toContain('bản trước');
 await page.unroute('**/api/content/runtime?projection=learning');await page.reload();
 await page.getByRole('button',{name:'Bắt đầu bản cập nhật',exact:true}).click();
 await expect(reader.getByRole('combobox',{name:'Chọn trang học'})).toHaveValue(original.value.document.pages[0].id);
 await expect(page.getByRole('button',{name:'Bắt đầu bản cập nhật',exact:true})).toHaveCount(0);
 await expect.poll(async()=>(await records()).some(r=>r.entryKey.includes(':history:')&&Object.values(r.value?.drafts??{}).some(d=>d.text===text))).toBe(true);
 const current=(await records()).find(r=>r.entryKey===original.entryKey)!;
 expect(current.value.document).toEqual(original.value.document);expect(current.value.drafts).toEqual({});
 // A future-version snapshot must survive fallback untouched rather than be
 // silently downgraded by either the saved reader probe or the legacy panel.
 await page.goto(`${origin}/privacy`);
 await page.evaluate(()=>new Promise<void>((resolve,reject)=>{
  const request=indexedDB.open('hanzi-os-sync-v1');request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const db=request.result;const tx=db.transaction('lesson-resumes','readwrite');const store=tx.objectStore('lesson-resumes');const all=store.getAll();
   all.onsuccess=()=>{for(const record of all.result)if(record.value?.lessonId==='boot-1'&&!record.entryKey.includes(':history:')){record.value.version=999;store.put(record);}};
   tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
  };
 }));
 const future=(await records()).find(r=>r.entryKey===original.entryKey)!;
 await page.route('**/api/content/runtime?projection=learning',route=>route.abort('internetdisconnected'));
 await page.goto(`${origin}/lesson/boot-1`);
 await expect(page.locator('.tone-learning-primer')).toBeVisible();
 expect((await records()).find(r=>r.entryKey===original.entryKey)).toEqual(future);
 console.log({lesson:'boot-1',isolatedGuest:true,simulatedOlderSnapshot:true,delayedRuntime:true,apiOutageRecovery:true,oldDraftArchived:true,noD1Mutation:true});
 await context.close();
}finally{await browser.close();}
