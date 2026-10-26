import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(()=>({ enabled:vi.fn(), authorize:vi.fn(), account:vi.fn(), create:vi.fn(), cancel:vi.fn(), refund:vi.fn(), reconcile:vi.fn(), settings:vi.fn() }));
vi.mock('./d1',()=>({getD1Database:async()=>({})}));
vi.mock('./authHttp',()=>({AUTH_JSON_HEADERS:{'cache-control':'no-store'},sameOriginMutation:(r:Request)=>r.headers.get('origin')===new URL(r.url).origin,resolveCurrentAccount:mocks.account}));
vi.mock('./adminHttp',()=>({authorizeAdmin:mocks.authorize}));
vi.mock('./mutationRateLimit',()=>({consumeMutationRateLimit:async()=>({allowed:true})}));
vi.mock('./bankTransferRepository',()=>({cashLedgerEnabled:mocks.enabled,BankTransferRepository:function(){return{create:mocks.create,cancel:mocks.cancel,requestRefund:mocks.refund,reconcile:mocks.reconcile};}}));
vi.mock('./commerceOperationsRepository',()=>({CommerceOperationsRepository:function(){return{saveSettings:mocks.settings};}}));
import { POST as checkout } from '../../app/api/commerce/bank-transfer/route';
import { POST as reconcile } from '../../app/admin/premium/reconcile/route';
import { POST as configure } from '../../app/admin/premium/settings/route';
const request=(path:string,body:Record<string,string>,json=false,origin='https://shop.example')=>new Request('https://shop.example'+path,{method:'POST',headers:{origin,'content-type':json?'application/json':'application/x-www-form-urlencoded'},body:json?JSON.stringify(body):new URLSearchParams(body)});
beforeEach(()=>{vi.clearAllMocks();mocks.enabled.mockReturnValue(true);mocks.account.mockResolvedValue({userId:'owner'});mocks.authorize.mockResolvedValue({ok:true,context:{database:{},account:{userId:'admin'},sessionId:'recent'}});});
describe('bank transfer HTTP boundaries',()=>{
 it('blocks disabled or cross-origin checkout and never trusts a supplied owner',async()=>{
  mocks.enabled.mockReturnValue(false);expect((await checkout(request('/api/commerce/bank-transfer',{action:'cancel',orderId:'o'},true))).status).toBe(403);
  mocks.enabled.mockReturnValue(true);expect((await checkout(request('/api/commerce/bank-transfer',{action:'cancel',orderId:'o'},true,'https://evil.example'))).status).toBe(403);
  await checkout(request('/api/commerce/bank-transfer',{action:'cancel',orderId:'o',userId:'victim'},true));expect(mocks.cancel).toHaveBeenCalledWith('owner','o');expect(mocks.create).not.toHaveBeenCalled();
 });
 it('requires fresh admin permission and explicit bank verification to reconcile',async()=>{
  const body={orderId:'o',action:'capture',amount:'79000',bankReference:'BANK0001'};
  expect((await reconcile(request('/admin/premium/reconcile',body))).status).toBe(422);expect(mocks.reconcile).not.toHaveBeenCalled();
  await reconcile(request('/admin/premium/reconcile',{...body,verified:'yes'}));
  expect(mocks.authorize).toHaveBeenCalledWith('commerce:manage',{stepUp:true});expect(mocks.reconcile).toHaveBeenCalledWith('o','capture','BANK0001',79000,'admin','recent',expect.any(String));
  mocks.reconcile.mockClear();mocks.authorize.mockResolvedValue({ok:false,response:new Response(null,{status:403})});expect((await reconcile(request('/admin/premium/reconcile',{...body,verified:'yes'}))).status).toBe(403);expect(mocks.reconcile).not.toHaveBeenCalled();
 });
 it('keeps merchant configuration permission checked and excludes secrets',async()=>{
  const value={businessName:'HANZI.OS',supportEmail:'',website:'',refundPolicyUrl:'',provider:'bank_transfer',bankName:'',bankAccount:'',bankHolder:'',revision:'0',secret:'do-not-save'};
  expect((await configure(request('/admin/premium/settings',value,false, 'https://evil.example') as Request)).status).toBe(403);
  await configure(request('/admin/premium/settings',value));expect(mocks.settings).toHaveBeenCalledWith(expect.not.objectContaining({secret:expect.anything()}),0,'admin','recent',expect.any(String));
 });
});
