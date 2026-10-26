import { getChatGPTUser, type ChatGPTUser } from '../../app/chatgpt-auth';
import { deriveAccountKey } from '../lib/accountKey';
import { noStoreJsonHeaders } from '../sync/protocol';
import type { AccountAvatarSnapshot } from '../profile/accountAvatarContract';
import { getD1Database, getRuntimeEnvironment, type D1Database } from './d1';
import { SyncRepository } from './syncRepository';
import { consumeMutationRateLimit, mutationRateLimitHeaders } from './mutationRateLimit';
import { AccountAvatarRepository, AvatarConflictError, avatarMutationHash, avatarBytesSha256, type AvatarMetadata } from './accountAvatarRepository';
import { avatarEncoderAvailable, encodeAccountAvatar, AvatarEncoderUnavailableError, AvatarInputError, AvatarSizeError, readAvatarBytes, type AvatarImagesBinding } from './avatarEncoding';

const headers = { ...noStoreJsonHeaders, vary: 'cookie, x-learning-owner' };
const policy = { scope: 'account.avatar.write', policyVersion: '2026-10-26.v1', maxRequests: 12, windowSeconds: 600 } as const;
const fail = (status: number, code: string, message: string, extra: HeadersInit = {}) => Response.json({ error: { code, message, retryable: status >= 500 || status === 429 } },
  { status, headers: { ...headers, ...extra } });
type Dependencies = { identity(): Promise<ChatGPTUser | null>; database(): Promise<D1Database>; images(): Promise<AvatarImagesBinding | undefined> };
const defaults: Dependencies = { identity: getChatGPTUser, database: getD1Database,
  images: async () => (await getRuntimeEnvironment<{ IMAGES?: AvatarImagesBinding }>()).IMAGES };

/** Auth and owner derive from the current server session, never a URL or submitted id. */
export function createAccountAvatarHandlers(deps: Dependencies = defaults) {
  const handle = async (request: Request) => {
    const mutation = request.method === 'PUT' || request.method === 'DELETE', origin = request.headers.get('origin');
    if ((mutation || origin !== null) && origin !== new URL(request.url).origin) return fail(403, 'CROSS_ORIGIN_BLOCKED', 'Yêu cầu ảnh đại diện khác nguồn đã bị chặn.');
    try {
      const identity = await deps.identity();
      if (!identity) return fail(401, 'AUTH_REQUIRED', 'Đăng nhập để quản lý ảnh đại diện tài khoản.');
      const ownerKey = await deriveAccountKey(identity.userId || identity.email);
      if (request.headers.get('x-learning-owner') !== ownerKey) return fail(409, 'WORKSPACE_CHANGED', 'Tài khoản đã thay đổi. Mở lại Hồ sơ để tiếp tục.');
      const db = await deps.database(), userId = identity.userId || await new SyncRepository(db).resolveUser(identity);
      const repository = new AccountAvatarRepository(db);
      const snapshot = async (metadata: AvatarMetadata): Promise<AccountAvatarSnapshot> => ({ version: 1, ownerKey, ...metadata,
        uploadAvailable: avatarEncoderAvailable(await deps.images()) });
      const url = new URL(request.url);
      if (request.method === 'GET') {
        if (url.search) {
          if (url.searchParams.get('image') !== '1' || !/^[1-9]\d*$/.test(url.searchParams.get('revision') ?? '')
            || [...url.searchParams.keys()].some(key => !['image', 'revision'].includes(key))
            || url.searchParams.getAll('revision').length !== 1 || url.searchParams.getAll('image').length !== 1) return fail(422, 'AVATAR_QUERY_INVALID', 'Chưa mở được phiên bản ảnh này.');
          const revision = Number(url.searchParams.get('revision'));
          if (!Number.isSafeInteger(revision)) return fail(422, 'AVATAR_QUERY_INVALID', 'Chưa mở được phiên bản ảnh này.');
          const bytes = await repository.bytes(userId, revision);
          if (!bytes) return fail(404, 'AVATAR_NOT_FOUND', 'Tài khoản hiện dùng chữ cái đại diện.');
          return new Response(Uint8Array.from(bytes), { headers: { ...headers, 'content-type': 'image/webp', 'content-length': String(bytes.length) } });
        }
        return Response.json(await snapshot(await repository.metadata(userId)), { headers });
      }
      if (!mutation || url.search) return fail(405, 'AVATAR_METHOD_UNSUPPORTED', 'Thao tác ảnh chưa được hỗ trợ.');
      const match = request.headers.get('if-match'), operationId = request.headers.get('x-avatar-operation') ?? '';
      if (!/^"(0|[1-9]\d*)"$/.test(match ?? '') || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(operationId)) {
        return fail(422, 'AVATAR_REVISION_REQUIRED', 'Mở lại ảnh hiện tại trước khi thay đổi.');
      }
      const expectedRevision = Number(match!.slice(1, -1));
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision >= Number.MAX_SAFE_INTEGER - 1) return fail(422, 'AVATAR_REVISION_REQUIRED', 'Phiên bản ảnh chưa hợp lệ.');
      await repository.metadata(userId);
      const quota = await consumeMutationRateLimit(db, userId, policy), quotaHeaders = mutationRateLimitHeaders(quota);
      if (!quota.allowed) return fail(429, 'MUTATION_RATE_LIMITED', 'Bạn đã đổi ảnh nhiều lần. Chờ một lúc rồi thử lại.', quotaHeaders);
      const mime = request.method === 'PUT' ? request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '' : null;
      if (mime !== null && !['image/jpeg', 'image/png', 'image/webp'].includes(mime)) return fail(415, 'AVATAR_TYPE_UNSUPPORTED', 'Chọn JPEG, PNG hoặc WebP tĩnh.', quotaHeaders);
      const input = await readAvatarBytes(request, request.method === 'DELETE' ? 0 : undefined);
      const requestSha256 = await avatarMutationHash(expectedRevision, mime, mime ? await avatarBytesSha256(input) : null);
      const previous = await repository.receipt(userId, operationId, requestSha256);
      if (previous !== null) return Response.json({ committedRevision: previous, snapshot: await snapshot(await repository.metadata(userId)) }, { headers: { ...headers, ...quotaHeaders } });
      const bytes = mime ? await encodeAccountAvatar(input, mime, await deps.images()) : null;
      const result = await repository.mutate(userId, { operationId, expectedRevision, requestSha256, bytes });
      return Response.json({ committedRevision: result.committedRevision, snapshot: await snapshot(result.metadata) }, { headers: { ...headers, ...quotaHeaders } });
    } catch (error) {
      if (error instanceof AvatarConflictError) return fail(409, 'AVATAR_REVISION_CONFLICT', 'Ảnh đã đổi ở nơi khác. Đọc lại ảnh hiện tại trước khi thay đổi.');
      if (error instanceof AvatarSizeError) return fail(413, 'AVATAR_TOO_LARGE', 'Ảnh vượt giới hạn dung lượng. Ảnh cũ vẫn được giữ.');
      if (error instanceof AvatarInputError) return fail(422, 'AVATAR_INPUT_INVALID', 'Chưa đọc được ảnh này. Chọn JPEG, PNG hoặc WebP tĩnh; ảnh cũ vẫn được giữ.');
      if (error instanceof AvatarEncoderUnavailableError) return fail(503, 'AVATAR_ENCODER_UNAVAILABLE', 'Chưa xử lý được ảnh tài khoản lúc này. Ảnh cũ vẫn được giữ.');
      return fail(503, 'AVATAR_UNAVAILABLE', 'Chưa mở được ảnh tài khoản. Dữ liệu hiện có vẫn được giữ.');
    }
  };
  return { GET: handle, PUT: handle, DELETE: handle };
}
