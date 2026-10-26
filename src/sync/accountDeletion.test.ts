import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACCOUNT_DELETION_RECEIPTS_KEY, beginAccountDeletionReceipt, forgetAccountDeletionReceipt, readAccountDeletionReceipts, sendAccountDeletionReceipt } from './accountDeletion';
const ownerA = 'siwc_' + 'a'.repeat(64), ownerB = 'siwc_' + 'b'.repeat(64);
let rows: Map<string,string>;
beforeEach(() => {
  vi.resetAllMocks(); rows = new Map();
  vi.stubGlobal('localStorage', { getItem:(key:string)=>rows.get(key)??null, setItem:(key:string,value:string)=>{rows.set(key,value);},removeItem:(key:string)=>rows.delete(key) });
  vi.stubGlobal('window',{dispatchEvent:vi.fn()});
});
describe('device-bound deletion receipts', () => {
  it('persists before dispatch, reuses the exact receipt on retry, and keeps other owners distinct', () => {
    const left = beginAccountDeletionReceipt(ownerA); const right = beginAccountDeletionReceipt(ownerB);
    expect(left.token).toHaveLength(43); expect(right.token).not.toBe(left.token);
    expect(beginAccountDeletionReceipt(ownerA)).toEqual(left);
    forgetAccountDeletionReceipt(ownerA,left.token); expect(readAccountDeletionReceipts()).toEqual([right]);
    expect(ACCOUNT_DELETION_RECEIPTS_KEY.startsWith('hanzi-os-')).toBe(false);
  });
  it('refuses a new destructive request when durable storage is unavailable', () => {
    vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{throw new Error('unavailable');}});
    expect(()=>beginAccountDeletionReceipt(ownerA)).toThrow('Chưa lưu');
  });
  it('does not overwrite corrupt receipt evidence', () => {
    rows.set(ACCOUNT_DELETION_RECEIPTS_KEY,'{broken');
    expect(()=>beginAccountDeletionReceipt(ownerA)).toThrow('Trạng thái xóa');
    expect(rows.get(ACCOUNT_DELETION_RECEIPTS_KEY)).toBe('{broken');
  });
  it('does not remove a newer receipt from another tab when an older request is rejected', () => {
    const receipt = beginAccountDeletionReceipt(ownerA);
    rows.set(ACCOUNT_DELETION_RECEIPTS_KEY,JSON.stringify([{...receipt,token:'B'.repeat(43)}]));
    forgetAccountDeletionReceipt(ownerA,receipt.token); expect(readAccountDeletionReceipts()).toHaveLength(1);
  });
  it('rejects a response bound to a different owner even if it claims success', async () => {
    const receipt = beginAccountDeletionReceipt(ownerA);
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({deleted:true,pending:false,ownerKey:ownerB})));
    await expect(sendAccountDeletionReceipt(receipt)).rejects.toThrow('không khớp');
    expect(readAccountDeletionReceipts()).toEqual([receipt]);
  });
  it.each([{deleted:true},{},{deleted:false,pending:false},{deleted:true,pending:true}])('keeps receipts on uncertain success payload %j', async reply => {
    const receipt = beginAccountDeletionReceipt(ownerA);
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({...reply,ownerKey:ownerA})));
    await expect(sendAccountDeletionReceipt(receipt)).rejects.toThrow(); expect(readAccountDeletionReceipts()).toEqual([receipt]);
  });
  it('keeps the receipt while pending or after a lost response', async () => {
    const receipt = beginAccountDeletionReceipt(ownerA);
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({deleted:false,pending:true,ownerKey:ownerA},{status:202})).mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch',fetcher);
    expect(await sendAccountDeletionReceipt(receipt)).toBe(false);
    await expect(sendAccountDeletionReceipt(receipt)).rejects.toThrow(); expect(readAccountDeletionReceipts()).toEqual([receipt]);
  });
  it('reports an operational refusal and removes only that unaccepted intent, retaining other owners', async () => {
    const receipt = beginAccountDeletionReceipt(ownerA), other = beginAccountDeletionReceipt(ownerB);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({error:{code:'ACCOUNT_DELETION_RESTRICTED'}},{status:409})));
    await expect(sendAccountDeletionReceipt(receipt)).rejects.toThrow('liên hệ hỗ trợ');
    expect(readAccountDeletionReceipts()).toEqual([other]);
  });
  it('retains the receipt when the intended owner cannot be confirmed', async () => {
    const receipt = beginAccountDeletionReceipt(ownerA);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({error:{code:'ACCOUNT_DELETION_RECEIPT_INVALID'}},{status:409})));
    await expect(sendAccountDeletionReceipt(receipt)).rejects.toThrow('liên hệ hỗ trợ');
    expect(readAccountDeletionReceipts()).toEqual([receipt]);
  });
});
