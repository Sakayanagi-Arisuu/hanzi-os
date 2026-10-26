import { randomBase64Url } from '../auth/authCrypto';
import { readLocalStorage, writeLocalStorage } from '../lib/storageKeys';
// Device-only authorization receipts are outside the learner backup/reset namespace.
export const ACCOUNT_DELETION_RECEIPTS_KEY = 'hanzi-auth-account-deletion-receipts-v1';
export const ACCOUNT_DELETION_CHANGED_EVENT = 'hanzi-account-deletion-changed';
export type AccountDeletionReceipt = { ownerKey: string; token: string; requestedAt: number };
const valid = (value: unknown): value is AccountDeletionReceipt => {
  const row = value as Partial<AccountDeletionReceipt> | null;
  return !!row && typeof row.ownerKey === 'string' && /^siwc_[a-f0-9]{64}$/u.test(row.ownerKey)
    && typeof row.token === 'string' && /^[A-Za-z0-9_-]{43}$/u.test(row.token) && typeof row.requestedAt === 'number' && Number.isSafeInteger(row.requestedAt);
};
export function readAccountDeletionReceipts(): AccountDeletionReceipt[] {
  try { const rows: unknown = JSON.parse(readLocalStorage(ACCOUNT_DELETION_RECEIPTS_KEY) ?? '[]'); return Array.isArray(rows) ? rows.filter(valid) : []; }
  catch { return []; }
}
function write(rows: AccountDeletionReceipt[]) {
  const existing = readLocalStorage(ACCOUNT_DELETION_RECEIPTS_KEY);
  if (existing) {
    try {
      const parsed: unknown = JSON.parse(existing);
      if (!Array.isArray(parsed) || !parsed.every(valid)) throw new Error();
    } catch { throw new Error('Trạng thái xóa trên thiết bị cần được khôi phục. Dữ liệu gốc vẫn được giữ; hãy liên hệ hỗ trợ.'); }
  }
  const serialized = JSON.stringify(rows);
  if (!writeLocalStorage(ACCOUNT_DELETION_RECEIPTS_KEY, serialized) || readLocalStorage(ACCOUNT_DELETION_RECEIPTS_KEY) !== serialized) {
    throw new Error('Chưa lưu được trạng thái xóa an toàn trên thiết bị. Hãy kiểm tra quyền lưu trữ rồi thử lại.');
  }
  window.dispatchEvent(new Event(ACCOUNT_DELETION_CHANGED_EVENT));
}
export function beginAccountDeletionReceipt(ownerKey: string): AccountDeletionReceipt {
  const rows = readAccountDeletionReceipts();
  const existing = rows.find(row => row.ownerKey === ownerKey);
  if (existing) return existing;
  const receipt = { ownerKey, token: randomBase64Url(32), requestedAt: Date.now() };
  if (!valid(receipt)) throw new Error('Danh tính tài khoản chưa sẵn sàng để xóa. Hãy đăng nhập lại.');
  write([...rows, receipt]); return receipt;
}
export function forgetAccountDeletionReceipt(ownerKey: string, token: string) { write(readAccountDeletionReceipts().filter(row => row.ownerKey !== ownerKey || row.token !== token)); }
export class AccountDeletionReauthenticationRequiredError extends Error {}
export class AccountDeletionPendingError extends Error {}
export async function sendAccountDeletionReceipt(receipt: AccountDeletionReceipt, signal?: AbortSignal) {
  if (!valid(receipt)) throw new Error('Yêu cầu xóa trên thiết bị không hợp lệ.');
  const response = await fetch('/api/account/deletion', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmation: 'DELETE HANZI.OS', deletionToken: receipt.token, ownerKey: receipt.ownerKey }),
    signal: signal ?? AbortSignal.timeout(30_000) });
  if (response.status === 401) {
    // The initial request was rejected before persisting any deletion intent.
    forgetAccountDeletionReceipt(receipt.ownerKey, receipt.token);
    throw new AccountDeletionReauthenticationRequiredError('Hãy đăng nhập lại để xác nhận xóa tài khoản.');
  }
  if (response.status === 409) {
    const body = await response.json().catch(() => null) as { error?: { code?: string } } | null;
    if (body?.error?.code === 'ACCOUNT_DELETION_RESTRICTED') {
      // This response is only returned before an intent is persisted. Keeping
      // a retry card would mislead the learner into retrying an unsupported purge.
      forgetAccountDeletionReceipt(receipt.ownerKey, receipt.token);
      throw new Error('Tài khoản còn gắn hồ sơ biên tập, quản trị hoặc thanh toán. Hãy liên hệ hỗ trợ trước khi xóa.');
    }
    throw new Error('Chưa xác nhận được yêu cầu xóa đúng tài khoản. Dữ liệu trên thiết bị vẫn được giữ; hãy liên hệ hỗ trợ.');
  }
  if (!response.ok) throw new Error(response.status === 429 ? 'Bạn đã thử nhiều lần. Hãy chờ 10 phút rồi kiểm tra lại.'
    : 'Chưa xác nhận được kết quả xóa. Dữ liệu trên thiết bị vẫn được giữ; hãy kiểm tra lại.');
  const body = await response.json() as { ownerKey?: string; deleted?: boolean; pending?: boolean };
  if (body.ownerKey !== receipt.ownerKey) throw new Error('Yêu cầu xóa không khớp tài khoản trên thiết bị. Dữ liệu của bạn vẫn được giữ.');
  if (body.deleted === true && body.pending === false) return true;
  if (body.deleted === false && body.pending === true) return false;
  throw new Error('Chưa xác nhận được kết quả xóa. Dữ liệu trên thiết bị vẫn được giữ.');
}
