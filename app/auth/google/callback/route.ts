import {
  googleConfig,
  loadAuthRuntime,
  sessionResponseHeaders,
} from "../../../../src/server/authHttp";
import { exchangeGoogleAuthorizationCode } from "../../../../src/server/googleIdentity";
import { AuditRepository, requestCorrelationId } from "../../../../src/server/auditRepository";

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
    return failure(request, "google_cancelled");
  }
  try {
    const { database, environment, repository } = await loadAuthRuntime();
    const config = googleConfig(environment, request);
    let challenge = null;
    for (const kind of [
      "google_signin",
      "google_link",
      "google_unlink",
    ] as const) {
      try {
        challenge = await repository.verifyChallenge(state, kind);
        break;
      } catch {
        // Try only the three Google ceremony kinds; all other kinds remain invalid.
      }
    }
    if (!challenge) return failure(request, "google_state");
    const verifier = challenge.payload.verifier;
    const nonce = challenge.payload.nonce;
    if (typeof verifier !== "string" || typeof nonce !== "string") {
      return failure(request, "google_state");
    }
    const google = await exchangeGoogleAuthorizationCode({
      config,
      code,
      codeVerifier: verifier,
      nonce,
    });
    await repository.consumeChallenge(challenge);
    const returnTo = typeof challenge.payload.returnTo === "string"
      ? challenge.payload.returnTo
      : "/";

    if (challenge.kind === "google_unlink") {
      if (!challenge.userId) return failure(request, "google_state");
      await repository.unlinkIdentity({
        userId: challenge.userId,
        provider: "google",
        providerSubject: google.providerSubject,
      });
      await new AuditRepository(database).appendBestEffort({
        category: "auth",
        action: "auth.google.unlinked",
        outcome: "success",
        actorUserId: challenge.userId,
        actorSessionId: null,
        targetType: "user",
        targetId: challenge.userId,
        requestId: requestCorrelationId(request),
        metadata: { provider: "google" },
      });
      return Response.redirect(
        new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}updated=unlinked`, url.origin),
        303,
      );
    }

    const linked = await repository.resolveOrCreateIdentity({
      provider: "google",
      ...google,
    }, challenge.kind === "google_link" ? challenge.userId ?? undefined : undefined);
    const session = await repository.createSession({
      userId: linked.userId,
      identityId: linked.identityId,
      authMethod: "google",
      userAgent: request.headers.get("user-agent"),
      deviceLabel: request.headers.get("sec-ch-ua-platform") ?? "Trình duyệt Google",
    });
    await new AuditRepository(database).appendBestEffort({
      category: "auth",
      action: challenge.kind === "google_link"
        ? "auth.google.linked"
        : "auth.google.signed_in",
      outcome: "success",
      actorUserId: linked.userId,
      actorSessionId: session.sessionId,
      targetType: "user",
      targetId: linked.userId,
      requestId: requestCorrelationId(request),
      metadata: { provider: "google" },
    });
    return new Response(null, {
      status: 303,
      headers: {
        ...sessionResponseHeaders(session.token),
        location: new URL(returnTo, url.origin).toString(),
      },
    });
  } catch {
    return failure(request, "google_failed");
  }
}
