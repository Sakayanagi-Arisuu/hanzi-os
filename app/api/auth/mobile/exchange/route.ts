import { AUTH_JSON_HEADERS, authError, loadAuthRuntime, sameOriginMutation } from '../../../../../src/server/authHttp';
import { exchangeMobileCompletion } from '../../../../../src/server/mobileAuth';
import { readBoundedRequestText } from '../../../../../src/server/boundedRequestBody';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authError(403, 'origin', 'Invalid origin');
  try {
    const { repository } = await loadAuthRuntime();
    const bounded = await readBoundedRequestText(request, 4096);
    if (!bounded.ok) return authError(413, 'REQUEST_TOO_LARGE', 'Dữ liệu đăng nhập vượt giới hạn.');
    const body = JSON.parse(bounded.text) as { code?: unknown; verifier?: unknown; provider?: unknown };
    const provider = body.provider ?? 'google';
    if (provider !== 'google' && provider !== 'github') return authError(422, 'AUTH_PROVIDER_INVALID', 'Phương thức đăng nhập không hợp lệ.');
    const session = await exchangeMobileCompletion(repository, body.code, body.verifier, provider);
    // The Android bridge consumes this response and encrypts the session in
    // Android Keystore. Never return it through the JavaScript plugin result.
    return Response.json({ token: session.token }, { headers: AUTH_JSON_HEADERS });
  } catch { return authError(400, 'mobile_exchange', 'Đăng nhập đã hết hạn. Hãy đăng nhập lại.'); }
}
