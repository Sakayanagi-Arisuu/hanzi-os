import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks=vi.hoisted(()=>({
  access:vi.fn(), bytes:vi.fn(), premium:vi.fn(), studio:vi.fn(),
}));
vi.mock('./d1',()=>({getD1Database:vi.fn(async()=>({}))}));
vi.mock('./lessonMediaRepository',()=>({LessonMediaRepository:class {
  async get(){return {id:'00000000-0000-4000-8000-000000000001',mimeType:'image/png',byteLength:3};}
  async releaseAccess(){return mocks.access();}
  async releasedHsk4LessonIds(){return ['hsk4-test'];}
  async bytes(){return mocks.bytes();}
}}));
vi.mock('./premiumAccess',()=>({requirePremiumLevel:mocks.premium,sandboxCommerceEnabled:()=>true}));
vi.mock('./lessonAccessRepository',()=>({LessonAccessRepository:class {async freeHsk4LessonIds(){return [];}}}));
vi.mock('./contentStudioHttp',()=>({authorizeStudio:mocks.studio,studioError:vi.fn(),studioMutationError:vi.fn()}));

import { GET } from '../../app/api/content/media/[file]/route';

const file='00000000-0000-4000-8000-000000000001.png';
const request=()=>new Request(`http://localhost/api/content/media/${file}`);
const context={params:Promise.resolve({file})};

describe('released media Premium boundary',()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.bytes.mockResolvedValue(new Uint8Array([1,2,3]));
    mocks.premium.mockResolvedValue(null);
    mocks.studio.mockResolvedValue({ok:true});
  });
  it('denies HSK4 media before reading bytes and never marks it public',async()=>{
    mocks.access.mockResolvedValue('premium');
    mocks.premium.mockResolvedValueOnce(new Response('premium required',{status:403}));
    const denied=await GET(request(),context);
    expect(denied.status).toBe(403);
    expect(mocks.bytes).not.toHaveBeenCalled();
    const permitted=await GET(request(),context);
    expect(permitted.status).toBe(200);
    expect(permitted.headers.get('cache-control')).toBe('private, no-store');
  });
  it('leaves HSK0–3 media public and keeps unknown releases behind Studio auth',async()=>{
    mocks.access.mockResolvedValueOnce('free').mockResolvedValueOnce('unknown');
    const free=await GET(request(),context);
    expect(free.headers.get('cache-control')).toContain('public');
    expect(mocks.premium).not.toHaveBeenCalled();
    mocks.studio.mockResolvedValueOnce({ok:false,response:new Response('denied',{status:403})});
    const unknown=await GET(request(),context);
    expect(unknown.status).toBe(403);
    expect(mocks.bytes).toHaveBeenCalledTimes(1);
  });
});
