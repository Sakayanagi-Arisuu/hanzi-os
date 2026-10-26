import { githubConfig, loadAuthRuntime, roleAwareSignInReturnTo, sessionResponseHeaders } from '../../../../src/server/authHttp';
import { exchangeGithubAuthorizationCode, GithubIdentityError } from '../../../../src/server/githubIdentity';
import { clearGithubStateCookie, hasGithubBrowserBinding } from '../../../../src/server/githubBrowserBinding';
import { AuthorizationRepository } from '../../../../src/server/authorizationRepository';
import { AuditRepository, requestCorrelationId } from '../../../../src/server/auditRepository';
import { createMobileCompletion } from '../../../../src/server/mobileAuth';

export const dynamic = 'force-dynamic';
const failure = (request: Request, code: string) => new Response(null, { status: 303, headers: {
  location: new URL(`/signin?error=${encodeURIComponent(code)}`, request.url).toString(),
  'set-cookie': clearGithubStateCookie(), 'cache-control': 'private, no-store',
} });
export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  if (!state || !code || code.length > 2048 || url.searchParams.has('error') || !hasGithubBrowserBinding(request, state)) return failure(request, 'github_state');
  let stage = 'configuration';
  try {
    const { database, repository, environment } = await loadAuthRuntime();
    const config = githubConfig(environment, request);
    let challenge = null;
    for (const kind of ['github_signin', 'github_link', 'github_unlink'] as const) {
      try { challenge = await repository.verifyChallenge(state, kind); break; } catch { /* only GitHub ceremonies */ }
    }
    if (!challenge || typeof challenge.payload.verifier !== 'string' || (challenge.kind !== 'github_signin' && !challenge.userId)) return failure(request, 'github_state');
    stage = 'provider';
    const github = await exchangeGithubAuthorizationCode({ config, code, codeVerifier: challenge.payload.verifier });
    stage = 'challenge';
    await repository.consumeChallenge(challenge);
    const returnTo = typeof challenge.payload.returnTo === 'string' ? challenge.payload.returnTo : '/';
    if (challenge.kind === 'github_unlink') {
      if (!challenge.userId) return failure(request, 'github_state');
      await repository.unlinkIdentity({ userId: challenge.userId, provider: 'github', providerSubject: github.providerSubject });
      await new AuditRepository(database).appendBestEffort({ category: 'auth', action: 'auth.github.unlinked', outcome: 'success',
        actorUserId: challenge.userId, actorSessionId: null, targetType: 'user', targetId: challenge.userId, requestId: requestCorrelationId(request), metadata: { provider: 'github' } });
      return new Response(null, { status: 303, headers: { location: new URL('/account/security?updated=unlinked', url.origin).toString(),
        'set-cookie': clearGithubStateCookie(), 'cache-control': 'private, no-store' } });
    }
    stage = 'identity';
    const linked = await repository.resolveOrCreateIdentity({ provider: 'github', ...github }, challenge.kind === 'github_link' ? challenge.userId ?? undefined : undefined);
    if (linked.created && challenge.kind === 'github_signin') {
      const now = Date.now();
      await database.prepare(`INSERT INTO profiles(user_id,display_name,goal,daily_minutes,script,starting_level,onboarded,revision,created_at,updated_at)
        VALUES(?,?,'conversation',20,'simplified','zero',0,1,?,?) ON CONFLICT(user_id) DO NOTHING`)
        .bind(linked.userId, github.displayName ?? 'Hành giả vô danh', now, now).run();
    }
    if (challenge.kind === 'github_signin' && typeof challenge.payload.mobileCodeChallenge === 'string') {
      const destination = await createMobileCompletion(repository, { ...linked, codeChallenge: challenge.payload.mobileCodeChallenge, provider: 'github' });
      return new Response(null, { status: 303, headers: { location: destination, 'set-cookie': clearGithubStateCookie(), 'cache-control': 'private, no-store' } });
    }
    stage = 'session';
    const session = await repository.createSession({ userId: linked.userId, identityId: linked.identityId, authMethod: 'github',
      userAgent: request.headers.get('user-agent'), deviceLabel: request.headers.get('sec-ch-ua-platform') ?? 'Trình duyệt GitHub' });
    await new AuditRepository(database).appendBestEffort({ category: 'auth', action: challenge.kind === 'github_link' ? 'auth.github.linked' : 'auth.github.signed_in', outcome: 'success',
      actorUserId: linked.userId, actorSessionId: session.sessionId, targetType: 'user', targetId: linked.userId, requestId: requestCorrelationId(request), metadata: { provider: 'github' } });
    const destination = challenge.kind === 'github_signin' ? roleAwareSignInReturnTo(returnTo, (await new AuthorizationRepository(database).getAuthorization(linked.userId)).roles) : '/account/security';
    const headers = new Headers(sessionResponseHeaders(session.token));
    headers.set('location', new URL(destination, url.origin).toString());
    headers.append('set-cookie', clearGithubStateCookie());
    return new Response(null, { status: 303, headers });
  } catch (error) {
    // Log only fixed diagnostics, never provider payloads or raw exceptions.
    console.warn('GitHub sign-in failed', { stage, reason: error instanceof GithubIdentityError ? error.message : 'application_boundary' });
    return failure(request, 'github_failed');
  }
}
