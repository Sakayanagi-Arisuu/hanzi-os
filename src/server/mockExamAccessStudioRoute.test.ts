import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({authorize:vi.fn(),setTier:vi.fn(),resolve:vi.fn()}));
vi.mock('./contentStudioHttp',()=>({authorizeStudio:mocks.authorize}));
vi.mock('./mockExamAccessRepository',()=>({MockExamAccessRepository:class{setTier=mocks.setTier;}}));
vi.mock('./hskMockExamEditorialRepository',()=>({resolveHskMockExamDefinition:mocks.resolve}));
import { POST } from '../../app/studio/exams/access/route';
const request=(origin='http://localhost:3000')=>new Request('http://localhost:3000/studio/exams/access',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:'examLevel=hsk2&formKey=d&tier=free'});
describe('Studio access changes require publishing authorization and audit',()=>{
  beforeEach(()=>vi.clearAllMocks());
  it('blocks a cross-origin change before authorization',async()=>{const response=await POST(request('http://evil.test'));expect(response.headers.get('location')).toContain('error=');expect(mocks.authorize).not.toHaveBeenCalled();});
  it('rejects editors without publish permission',async()=>{mocks.authorize.mockResolvedValue({ok:false,response:new Response(null,{status:403})});expect((await POST(request())).status).toBe(403);expect(mocks.authorize).toHaveBeenCalledWith('content:publish',{stepUp:true});expect(mocks.setTier).not.toHaveBeenCalled();});
  it('changes one published door using the authenticated actor and session',async()=>{mocks.authorize.mockResolvedValue({ok:true,context:{database:{},account:{userId:'admin'},sessionId:'session'}});mocks.resolve.mockResolvedValue({});mocks.setTier.mockResolvedValue('free');const response=await POST(request());expect(response.status).toBe(303);expect(response.headers.get('location')).toContain('notice=');expect(mocks.setTier).toHaveBeenCalledWith('hsk2','d','free','admin','session',expect.any(String));});
  it('never adds a rule for an unpublished door',async()=>{mocks.authorize.mockResolvedValue({ok:true,context:{database:{},account:{userId:'admin'},sessionId:'session'}});mocks.resolve.mockResolvedValue(null);expect((await POST(request())).headers.get('location')).toContain('error=');expect(mocks.setTier).not.toHaveBeenCalled();});
});
