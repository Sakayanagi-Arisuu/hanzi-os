/** Exact instructional diagrams take priority over decorative scene panels. */
export const timePlaceVisualIds=['numbers','calendar','week-and-day-parts','clock-and-duration','location','weather-and-residence'].map((slug,i)=>`hsk1-time-place-events-0${i+1}-${slug}`);
export function applyTimePlaceVisualDecision(source){
 if(!timePlaceVisualIds.includes(source.targetLessonId))throw Error('Unreviewed time/place lesson');
 const content=structuredClone(source);
 const visual=content.lessonPages.pages.find(p=>p.id===`${source.targetLessonId}:v2:visual`);
 if(!visual||visual.layout!=='scene'||visual.illustration||visual.blocks.length!==1||visual.blocks[0].kind!=='diagram')throw Error('Preserve changed time/place diagram');
 visual.layout='focus';
 return content;
}
