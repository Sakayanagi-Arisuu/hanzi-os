import {
  boundedReturnTo,
  facebookConfig,
  loadAuthRuntime,
  roleAwareSignInReturnTo,
  sessionResponseHeaders,
} from "../../../../src/server/authHttp";
import { exchangeFacebookAuthorizationCode } from "../../../../src/server/facebookIdentity";
import {
  AuditRepository,
  requestCorrelationId,
} from "../../../../src/server/auditRepository";
import { AuthorizationRepository } from "../../../../src/server/authorizationRepository";

export const dynamic = "force-dynamic";

const failure = (request: Request, code: string) => Response.redirect(
  new URL(`/signin?error=${encodeURIComponent(code)}`, request.url),
  303,
);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!state || !code || url.searchParams.has("error")) {
    return failure(request, "facebook_cancelled");
  }
  try {
    const { database, environment, repository } = await loadAuthRuntime();
    const config = facebookConfig(environment, request);
    let challenge = null;
    for (const kind of [
      "facebook_signin",
      "facebook_link",
      "facebook_unlink",
    ] as const) {
      try {
        challenge = await repository.verifyChallenge(state, kind);
        break;
      } catch {
        // Only the three Facebook ceremonies are accepted by this callback.
      }
    }
    if (!challenge) return failure(request, "facebook_state");
    const facebook = await exchangeFacebookAuthorizationCode({ config, code });
    await repository.consumeChallenge(challenge);
    const returnTo = boundedReturnTo(
      typeof challenge.payload.returnTo === "string"
        ? challenge.payload.returnTo
        : null,
      challenge.kind === "facebook_signin" ? "/" : "/account/security",
    );

    if (challenge.kind === "facebook_unlink") {
      if (!challenge.userId) return failure(request, "facebook_state");
      await repository.unlinkIdentity({
        userId: challenge.userId,
        provider: "facebook",
        providerSubject: facebook.providerSubject,
      });
      await new AuditRepository(database).appendBestEffort({
        category: "auth",
        action: "auth.facebook.unlinked",
        outcome: "success",
        actorUserId: challenge.userId,
        actorSessionId: null,
        targetType: "user",
        targetId: challenge.userId,
        requestId: requestCorrelationId(request),
        metadata: { provider: "facebook" },
      });
      return Response.redirect(
        new URL(
          `${returnTo}${returnTo.includes("?") ? "&" : "?"}updated=unlinked`,
          url.origin,
        ),
        303,
      );
    }

    const linked = await repository.resolveOrCreateIdentity({
      provider: "facebook",
      ...facebook,
    }, challenge.kind === "facebook_link"
      ? challenge.userId ?? undefined
      : undefined);
    const session = await repository.createSession({
      userId: linked.userId,
      identityId: linked.identityId,
      authMethod: "facebook",
      userAgent: request.headers.get("user-agent"),
      deviceLabel: request.headers.get("sec-ch-ua-platform")
        ?? "Trình duyệt Facebook",
    });
    await new AuditRepository(database).appendBestEffort({
      category: "auth",
      action: challenge.kind === "facebook_link"
        ? "auth.facebook.linked"
        : "auth.facebook.signed_in",
      outcome: "success",
      actorUserId: linked.userId,
      actorSessionId: session.sessionId,
      targetType: "user",
      targetId: linked.userId,
      requestId: requestCorrelationId(request),
      metadata: { provider: "facebook" },
    });
    const destination = challenge.kind === "facebook_signin"
      ? roleAwareSignInReturnTo(
          returnTo,
          (await new AuthorizationRepository(database).getAuthorization(linked.userId)).roles,
        )
      : returnTo;
    return new Response(null, {
      status: 303,
      headers: {
        ...sessionResponseHeaders(session.token),
        location: new URL(destination, url.origin).toString(),
      },
    });
  } catch {
    return failure(request, "facebook_failed");
  }
}
