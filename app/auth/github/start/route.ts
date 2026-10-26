import { randomBase64Url, sha256Base64Url } from '../../../../src/auth/authCrypto';
import { boundedReturnTo, githubConfig, loadAuthRuntime, resolveCurrentAccount } from '../../../../src/server/authHttp';
import { githubAuthorizationUrl } from '../../../../src/server/githubIdentity';
import { githubStateCookie } from '../../../../src/server/githubBrowserBinding';
import { consumeMobileStart } from '../../../../src/server/mobileAuth';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') ?? 'signin';
    if (mode !== 'signin' && mode !== 'link' && mode !== 'unlink') return new Response('Invalid mode.', { status: 400 });
    const { database, repository, environment } = await loadAuthRuntime();
    const config = githubConfig(environment, request);
    const mobile = url.searchParams.get('mobile');
    if (mobile && mode !== 'signin') return new Response('Invalid mobile mode.', { status: 400 });
    const mobileCodeChallenge = mobile ? await consumeMobileStart(repository, mobile, 'github') : null;
    const account = mode === 'signin' ? null : await resolveCurrentAccount(database, true);
    if (mode !== 'signin' && !account) return Response.redirect(new URL('/signin?error=reauth', url.origin), 303);
    const verifier = randomBase64Url(48);
    const state = await repository.createChallenge({ kind: `github_${mode}`, provider: 'github', userId: account?.userId,
      payload: { verifier, ...(mobileCodeChallenge ? { mobileCodeChallenge } : {}),
        returnTo: boundedReturnTo(url.searchParams.get('returnTo'), mode === 'signin' ? '/' : '/account/security') } });
    return new Response(null, { status: 303, headers: {
      location: githubAuthorizationUrl({ config, state, codeChallenge: await sha256Base64Url(verifier) }),
      'set-cookie': githubStateCookie(state), 'cache-control': 'private, no-store',
    } });
  } catch { return Response.redirect(new URL('/signin?error=github_unavailable', request.url), 303); }
}
