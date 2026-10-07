/** Recognition lessons benefit from actual glyph comparisons, not unrelated scenery. */
export const characterVisualPairs=['大 / 太','见 / 贝','妈 / 吗','你 / 您','他 / 她 / 它','再 / 在','白 / 百','日 / 目','上 / 下','包 / 句','买 / 卖','衣 / 农','坐 / 做','本 / 木','字 / 学'];
export const characterVisualIds=characterVisualPairs.map((_,i)=>`characters-${i+1}`);
export function applyCharacterVisualDecision(source){
 const index=characterVisualIds.indexOf(source.targetLessonId);
 if(index<0)throw Error('Unreviewed character lesson');
 const content=structuredClone(source);
 const context=content.lessonPages.pages.find(p=>p.id===`${source.targetLessonId}:v2:context`);
 const visual=content.lessonPages.pages.find(p=>p.id===`${source.targetLessonId}:v2:visual`);
 if(!context||context.layout!=='scene'||context.illustration||context.blocks.length!==1||context.blocks[0].kind!=='explanation')throw Error('Preserve changed character context');
 if(!visual||visual.layout!=='split'||visual.illustration||visual.blocks.length!==1||visual.blocks[0].kind!=='diagram'||visual.blocks[0].title!==characterVisualPairs[index])throw Error('Preserve changed character comparison');
 context.layout='focus';
 visual.layout='focus';
 return content;
}
