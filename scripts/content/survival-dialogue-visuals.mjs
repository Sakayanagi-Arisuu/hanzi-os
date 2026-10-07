/** Reviewed same-context illustrations, not blanket previous-page inheritance. */
import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
export const survivalDialogueAssets={
 'survival-1':'book-return-thanks-v1.webp',
 'survival-2':'pronoun-group-v1.webp',
 'survival-3':'fictional-profile-v1.webp',
 'survival-4':'family-album-v1.webp',
 'survival-5':'pets-introduction-v1.webp',
 'survival-6':'clothes-opinion-v1.webp',
 'survival-7':'conversation-invitation-v1.webp',
 'survival-8':'phone-callback-v1.webp',
 'survival-9':'morning-routine-v1.webp',
};
const openingLines=['你好！请问，这是你的书吗？','大家好！我们是学生。','你叫什么名字？','这是我的家人。','你认识她吗？','你觉得这件衣服怎么样？','你会说汉语吗？','喂，你好！我想问一下，你现在方便吗？','你起床了吗？'];
export function applySurvivalDialogueVisual(source){
 const id=source.targetLessonId,index=Object.keys(survivalDialogueAssets).indexOf(id);
 if(index<0)throw Error('Unreviewed dialogue');
 const content=structuredClone(source);
 const context=content.lessonPages.pages.find(p=>p.id===`${id}:v2:context`);
 const page=content.lessonPages.pages.find(p=>p.id===`${id}:v2:dialogue`);
 const illustration=id==='survival-1'?LESSON_SCENES.find(s=>s.src.endsWith('/book-return-thanks-v1.webp')):context?.illustration;
 if(illustration?.src!==`/lessons/ngoc-dien/${survivalDialogueAssets[id]}`||!illustration.alt||!illustration.provenance)throw Error('Context art changed');
 if(!page||page.layout!=='dialogue'||page.illustration||page.blocks[0].hanzi!==openingLines[index])throw Error('Dialogue changed; review again');
 page.illustration=structuredClone(illustration);
 return content;
}
