/** Explicit editorial decisions, never automatic scene inheritance across contexts. */
export const dailyVisualAssets = {
 'daily-1':'apple-market-prices-v1.webp',
 'daily-2':'breakfast-water-order-v1.webp',
 'daily-3':'shirt-shop-change-v1.webp',
 'daily-4':'clinic-waiting-room-v1.webp',
};
export function applyDailyVisualDecision(source, illustration) {
 const id=source.targetLessonId;
 if(!dailyVisualAssets[id]||illustration.src!==`/lessons/ngoc-dien/${dailyVisualAssets[id]}`)throw Error('Unreviewed daily scene');
 const content=structuredClone(source);
 for(const suffix of ['context','dialogue']){
  const page=content.lessonPages.pages.find(p=>p.id===`${id}:v2:${suffix}`);
  if(!page||page.layout!==(suffix==='dialogue'?'dialogue':'scene'))throw Error('Changed scene layout');
  if(page.illustration&&page.illustration.src!==illustration.src)throw Error('Preserve editor artwork');
  page.illustration={...illustration};
 }
 const diagram=content.lessonPages.pages.find(p=>p.id===`${id}:v2:visual`);
 if(!diagram||diagram.layout!=='scene'||diagram.illustration||diagram.blocks.length!==1||diagram.blocks[0].kind!=='diagram')throw Error('Changed instructional diagram');
 diagram.layout='focus';
 return content;
}
