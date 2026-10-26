import { deriveAccountKey } from '../lib/accountKey';
import { noStoreJsonHeaders } from '../sync/protocol';
/** Fail closed when cookies changed before the app's owner fence catches up. */
export async function learningOwnerMismatch(request: Request | undefined, identity: { userId?: string; email: string } | null) {
  const expected = request?.headers.get('x-learning-owner');
  if (!expected) return null;
  const actual = identity ? await deriveAccountKey(identity.userId || identity.email) : null;
  if (actual === expected || (!actual && expected.startsWith('anonymous:'))) return null;
  return Response.json({ error: { code: 'OWNER_CHANGED', retryable: true, message: 'Tài khoản vừa thay đổi. Dữ liệu đang được giữ riêng cho từng hồ sơ.' } },
    { status: actual ? 409 : 401, headers: noStoreJsonHeaders });
}
