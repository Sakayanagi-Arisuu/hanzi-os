import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({access:vi.fn(),authorize:vi.fn(),mutation:vi.fn(),resume:vi.fn(),options:vi.fn()}));
vi.mock('./mockExamAccessHttp',()=>({requireMockExamAccess:mocks.access}));
vi.mock('./hskMockExamHttp',()=>({authorizeMockExamLearner:mocks.authorize,mockExamError:(status:number,code:string,message:string)=>Response.json({error:{code,message}},{status})}));
vi.mock('./assessmentRouteHandler',()=>({handleAssessmentMutation:mocks.mutation}));
vi.mock('./hskMockExamRepository',()=>({HskMockExamRepository:class{resume=mocks.resume;},hskMockExamRepositoryOptions:mocks.options,publicHskMockExamDefinition:vi.fn()}));
vi.mock('./hskMockExamEditorialRepository',()=>({resolveHskMockExamDefinition:async()=>({examLevel:'hsk1',formKey:'d'})}));
import { GET,POST } from '../../app/api/exams/[level]/[form]/sessions/route';
const request=new Request('http://localhost:3000/api/exams/hsk1/d/sessions');
const context={params:Promise.resolve({level:'hsk1',form:'d'})};
describe('Exam payload routes enforce Premium before revealing or starting questions',()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.authorize.mockResolvedValue({ok:true,database:{},userId:'learner'});mocks.access.mockImplementation(async()=>Response.json({error:{code:'PREMIUM_REQUIRED'}},{status:403}));});
  it('blocks session resume without revealing the saved form',async()=>{expect((await GET(request,context)).status).toBe(403);expect(mocks.resume).not.toHaveBeenCalled();});
  it('blocks session open before issuing a form or any mutation',async()=>{expect((await POST(request,context)).status).toBe(403);expect(mocks.mutation).not.toHaveBeenCalled();expect(mocks.options).not.toHaveBeenCalled();});
  it('preserves the normal open command handler for entitled learners',async()=>{mocks.access.mockResolvedValue(null);mocks.mutation.mockResolvedValue(new Response(null,{status:201}));expect((await POST(request,context)).status).toBe(201);expect(mocks.mutation).toHaveBeenCalledTimes(1);});
});
