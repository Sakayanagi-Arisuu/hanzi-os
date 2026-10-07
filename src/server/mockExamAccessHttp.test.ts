import { describe, expect, it, vi, beforeEach } from 'vitest';
const mocks=vi.hoisted(()=>({tier:vi.fn(),premium:vi.fn()}));
vi.mock('./mockExamAccessRepository',()=>({MockExamAccessRepository:class{tierFor=mocks.tier;}}));
vi.mock('./premiumAccess',()=>({requestPremiumAccess:mocks.premium}));
import { requireMockExamAccess } from './mockExamAccessHttp';
import { getHskMockExamDefinition } from './hskMockExamBank';
import type { D1Database } from './d1';
const request=new Request('http://localhost:3000/api/exams/hsk1/d/sessions');
const definition=getHskMockExamDefinition('hsk1','d')!;
describe('Premium gate for exam payload',()=>{
  beforeEach(()=>{vi.resetAllMocks();});
  it('does not ask for Premium on free forms',async()=>{mocks.tier.mockResolvedValue('free');expect(await requireMockExamAccess(request,definition,{} as D1Database)).toBeNull();expect(mocks.premium).not.toHaveBeenCalled();});
  it('blocks direct access and admits an active Premium account',async()=>{mocks.tier.mockResolvedValue('premium');mocks.premium.mockResolvedValue(false);const denied=await requireMockExamAccess(request,definition,{} as D1Database);expect(denied?.status).toBe(403);expect(await denied?.json()).toMatchObject({error:{code:'PREMIUM_REQUIRED'}});mocks.premium.mockResolvedValue(true);expect(await requireMockExamAccess(request,definition,{} as D1Database)).toBeNull();});
  it('fails closed if policy or entitlement cannot be verified',async()=>{mocks.tier.mockRejectedValue(new Error('database'));expect((await requireMockExamAccess(request,definition,{} as D1Database))?.status).toBe(503);mocks.tier.mockResolvedValue('premium');mocks.premium.mockRejectedValue(new Error('billing'));expect((await requireMockExamAccess(request,definition,{} as D1Database))?.status).toBe(503);});
});
