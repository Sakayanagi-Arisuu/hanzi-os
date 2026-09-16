import { describe, expect, it } from 'vitest';
import { emptyLessonActivity, evaluateLessonActivity, validateLessonActivity } from './lessonActivities';
import { emptyLessonBlock, isEditableLessonPageDocument, validateLessonPages } from './lessonPages';

const choice=()=>({...emptyLessonActivity(),options:[{id:'location',text:'在',feedback:'在 chỉ vị trí.'},{id:'identity',text:'是',feedback:'是 dùng giới thiệu danh tính, không chỉ vị trí trong câu này.'}],answerIds:['location'],explanation:'Dùng 在 để nói nơi một người hoặc vật ở.'});
describe('authored lesson activities',()=>{
  it('uses stable answer identities and feedback rather than option position',()=>{
    const activity=choice();activity.options.reverse();
    expect(validateLessonActivity(activity)).toEqual([]);
    expect(evaluateLessonActivity(activity,{text:'',answerIds:['location']})).toBe('correct');
    expect(evaluateLessonActivity(activity,{text:'',answerIds:['identity']})).toBe('incorrect');
    expect(validateLessonActivity({...activity,answerIds:['missing']})).not.toEqual([]);
  });
  it('requires every ordering tile once, allowing repeated text with different identities',()=>{
    const activity={...choice(),type:'order' as const,options:[{id:'a',text:'我',feedback:''},{id:'b',text:'我',feedback:''}],answerIds:['b','a']};
    expect(validateLessonActivity(activity)).toEqual([]);
    expect(evaluateLessonActivity(activity,{text:'',answerIds:['a','b']})).toBe('incorrect');
    expect(validateLessonActivity({...activity,answerIds:['a','a']})).not.toEqual([]);
  });
  it('accepts explicit cloze alternatives but does not grade open writing as correct',()=>{
    const activity={...choice(),type:'cloze' as const,acceptedAnswers:['哪儿','哪里']};
    expect(evaluateLessonActivity(activity,{text:' 哪里？ '})).toBe('correct');
    expect(evaluateLessonActivity(activity,{text:'哪里人'})).toBe('incorrect');
    expect(evaluateLessonActivity({...activity,type:'rubric'},{text:'任何回答'})).toBe('self-review');
  });
  it('opens incomplete drafts without letting them pass publication validation',()=>{
    const doc={version:1,pages:[{id:'page',title:'',layout:'workshop',blocks:[{...emptyLessonBlock('block'),kind:'activity',activity:emptyLessonActivity()}]}]};
    expect(isEditableLessonPageDocument(doc)).toBe(true);
    expect(validateLessonPages(doc).length).toBeGreaterThan(0);
    expect(isEditableLessonPageDocument({...doc,version:2})).toBe(false);
    expect(validateLessonActivity({...choice(),options:[]})).not.toEqual([]);
  });
});
