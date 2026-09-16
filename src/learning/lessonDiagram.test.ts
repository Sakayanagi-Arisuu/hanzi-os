import { describe,expect,it } from 'vitest';
import { isEditableLessonDiagram,validateLessonDiagram } from './lessonDiagram';
import { validateLessonPages } from './lessonPages';
import draft from '../../content/drafts/thien-lo-professional-1-v2.json';
const node=(id:string,x=0)=>({id,label:'学校',pinyin:'xuéxiào',meaningVi:'trường học',note:'',x,y:0});
describe('lesson diagrams',()=>{
  it('lets the editor retain unfinished diagrams but blocks publication',()=>{
    const diagram={type:'sequence',description:'',nodes:[]};
    expect(isEditableLessonDiagram(diagram)).toBe(true);expect(validateLessonDiagram(diagram).length).toBeGreaterThan(0);
  });
  it('rejects colliding map cells and invalid coordinates',()=>{
    const diagram={type:'map',description:'Hai địa điểm cạnh nhau.',nodes:[node('a'),node('b')]};
    expect(validateLessonDiagram(diagram)).toContain('Các địa điểm trên bản đồ không được trùng ô.');
    expect(validateLessonDiagram({...diagram,nodes:[node('a'),node('b',1)]})).toEqual([]);
    expect(isEditableLessonDiagram({...diagram,nodes:[node('a',4)]})).toBe(false);
  });
  it('keeps the authored school lesson valid with distinct guided and transfer work',()=>{
    expect(validateLessonPages(draft.lessonPages)).toEqual([]);
    expect(draft.humanReviewed).toBe(false);
    const stages=draft.lessonPages.pages.map(page=>page.stage);
    expect(stages).toContain('practice');expect(stages).toContain('transfer');
    expect(draft.lessonPages.pages.reduce((count,page)=>count+page.blocks.filter(block=>block.kind==='diagram').length,0)).toBe(1);
  });
});
