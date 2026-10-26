import { AUTH_JSON_HEADERS, authError, githubConfig, googleConfig, loadAuthRuntime, sameOriginMutation } from '../../../../../src/server/authHttp';
import { createMobileStart } from '../../../../../src/server/mobileAuth';
import { readBoundedRequestText } from '../../../../../src/server/boundedRequestBody';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authError(403, 'origin', 'Invalid origin');
  try {
    const { repository, environment } = await loadAuthRuntime();
    const bounded = await readBoundedRequestText(request, 4096);
    if (!bounded.ok) return authError(413, 'REQUEST_TOO_LARGE', 'Dữ liệu đăng nhập vượt giới hạn.');
    const body = JSON.parse(bounded.text) as { codeChallenge?: unknown; provider?: unknown };
    const provider = body.provider ?? 'google';
    if (provider !== 'google' && provider !== 'github') return authError(422, 'AUTH_PROVIDER_INVALID', 'Phương thức đăng nhập không hợp lệ.');
    if (provider === 'google') googleConfig(environment, request); else githubConfig(environment, request);
    const code = await createMobileStart(repository, body.codeChallenge, provider);
    const url = new URL(`/auth/${provider}/start`, request.url);
    url.searchParams.set('mobile', code);
    return Response.json({ url: url.toString() }, { headers: AUTH_JSON_HEADERS });
  } catch { return authError(400, 'mobile_start', 'Không thể bắt đầu đăng nhập. Hãy thử lại.'); }
}
