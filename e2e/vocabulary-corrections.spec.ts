import {expect,test} from '@playwright/test';
import corrections from '../content/drafts/thien-lo-vocabulary-example-corrections-v2.json' with {type:'json'};

test('published lesson examples keep core dictionary identity and legacy Studio links',async({page,request})=>{
 await page.goto('/onboarding');
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
 const response=await request.get('/api/content/runtime?projection=vocabulary');
 expect(response.ok()).toBe(true);
 const runtime=await response.json();
 for(const item of corrections.items){
  const id=item.content.sourceVocabularyIds[0];
  const projected=runtime.items.find((w:{id:string})=>w.id===item.stableKey);
  expect(projected).toMatchObject({sourceVocabularyId:id,example:item.content.examples[0].hanzi});
  for(const key of [id,item.stableKey]){
   await page.goto(`/dictionary?view=detail&word=${encodeURIComponent(key)}`);
   await page.getByRole('button',{name:'Ví dụ',exact:true}).click();
   await expect(page.getByText(item.content.examples[0].hanzi,{exact:true})).toBeVisible();
   await expect(page.getByRole('link',{name:/Mở bài trong Thiên Lộ/})).toHaveAttribute('href',`/lesson/${item.content.sourceLessonIds[0]}`);
   if(key===id)await page.getByRole('button',{name:'Lưu ngọc giản',exact:true}).click();
   await expect(page.getByRole('button',{name:'Đã lưu ngọc giản',exact:true})).toBeVisible();
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-os-learning-state-v1')!).savedWords);
   expect(saved).toContain(id);
   expect(saved).not.toContain(item.stableKey);
  }
 }
});
