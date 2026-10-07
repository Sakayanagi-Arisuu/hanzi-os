import { describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({authorize:vi.fn(),load:vi.fn()}));
vi.mock('./contentStudioHttp',()=>({authorizeStudio:mocks.authorize,studioError:(status:number,code:string,message:string)=>Response.json({error:{code,message}},{status})}));
vi.mock('./hskMockExamEditorialRepository',()=>({loadPublishedEditorialExamItems:mocks.load}));
import { GET } from '../../app/api/studio/exams/authoring/route';
describe('Exam authoring bank access',()=>{
  it('does not load private source questions for a learner or unauthenticated request',async()=>{mocks.authorize.mockResolvedValue({ok:false,response:new Response(null,{status:403})});expect((await GET()).status).toBe(403);expect(mocks.load).not.toHaveBeenCalled();});
  it('returns readable choices and pinned suggestions only for authorized editors',async()=>{mocks.authorize.mockResolvedValue({ok:true,context:{database:{}}});mocks.load.mockResolvedValue([]);const result=await GET();const payload=await result.json();expect(payload.suggestions.hsk1.g).toHaveLength(40);expect(payload.choices[0]).toMatchObject({level:'hsk1',key:expect.any(String),label:expect.any(String)});expect(JSON.stringify(payload)).not.toMatch(/correctAnswer|correctOptionId|answerIndex|explanationVi/);});
});
