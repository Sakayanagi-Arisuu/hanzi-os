import {expect,it} from 'vitest';
import {emptyLessonActivity,isEditableLessonActivity,validateLessonActivity} from './lessonActivities';
import {validateActivityTarget,type LessonActivityTarget} from './lessonActivityTarget';
import {lessonActivitySources} from './lessonActivitySources';
const target:LessonActivityTarget={skill:'grammar',objective:'Chọn 在 để chỉ vị trí.',sources:[{kind:'grammar',id:'location-zai'}]};
it('keeps legacy activities compatible and validates unfinished target drafts separately',()=>{
 const activity={...emptyLessonActivity(),type:'cloze' as const,acceptedAnswers:['在'],explanation:'在 chỉ vị trí.'};
 expect(validateLessonActivity(activity)).toEqual([]);
 const draft={...activity,learningTarget:{...target,objective:'',sources:[]}};
 expect(isEditableLessonActivity(draft)).toBe(true);
 expect(validateLessonActivity(draft)).toHaveLength(2);
 expect(validateLessonActivity({...activity,learningTarget:target})).toEqual([]);
 expect(isEditableLessonActivity({...activity,learningTarget:{...target,skill:'mastery'}})).toBe(false);
});
it('rejects malformed, duplicate and empty source bindings without inferring a skill',()=>{
 expect(validateActivityTarget({...target,sources:[...target.sources,...target.sources]})).toHaveLength(1);
 expect(validateActivityTarget({...target,sources:[{kind:'grammar',id:''}]})).toHaveLength(1);
 expect(validateActivityTarget({...target,sources:[{kind:'unknown',id:'x'}]})).toHaveLength(1);
 expect(validateActivityTarget({...target,skill:undefined})).toHaveLength(1);
});
it('exposes the exact HSK4 deep-reading task without importing premium lesson prose',()=>{
 const id='hsk4-personal-community-analysis-concept-actor-map';
 const sources=lessonActivitySources(id);
 expect(sources).toContainEqual({kind:'task',id:`hsk4-local-task:${id}`,label:'Đời sống cá nhân và cộng đồng: Khái niệm, nhân vật và vai trò'});
 expect(sources.some(source=>source.id===`hsk4-local-task:${id}-other`)).toBe(false);
});
