import {
  AUTH_JSON_HEADERS,
  authError,
  loadAuthRuntime,
  sameOriginMutation,
  sessionResponseHeaders,
} from "../../../../../src/server/authHttp";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return authError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return authError(400, "INVALID_JSON", "Không thể đọc mã xác minh.");
    }
    const { challenge: token, code } = body as {
      challenge?: unknown;
      code?: unknown;
    };
    if (
      typeof token !== "string"
      || typeof code !== "string"
      || !/^\d{6}$/u.test(code)
    ) {
      return authError(422, "OTP_INVALID", "Mã xác minh không hợp lệ.");
    }
    const { repository } = await loadAuthRuntime();
    let challenge = null;
    for (const kind of ["email_signin", "email_link", "email_unlink"] as const) {
      try {
        challenge = await repository.verifyChallenge(token, kind, code);
        break;
      } catch {
        // A single generic response avoids revealing which ceremony exists.
      }
    }
    if (!challenge || typeof challenge.payload.email !== "string") {
      return authError(401, "OTP_INVALID", "Mã đã sai hoặc hết hạn.");
    }
    await repository.consumeChallenge(challenge);
    const email = challenge.payload.email;
    const returnTo = typeof challenge.payload.returnTo === "string"
      ? challenge.payload.returnTo
      : "/";
    if (challenge.kind === "email_unlink") {
      if (!challenge.userId) return authError(401, "OTP_INVALID", "Mã không hợp lệ.");
      await repository.unlinkIdentity({
        userId: challenge.userId,
        provider: "email_otp",
        providerSubject: email,
      });
      return Response.json(
        { authenticated: true, unlinked: true, returnTo },
        { headers: AUTH_JSON_HEADERS },
      );
    }
    const linked = await repository.resolveOrCreateIdentity({
      provider: "email_otp",
      providerSubject: email,
      email,
      emailVerified: true,
      displayName: email.split("@")[0] ?? email,
    }, challenge.kind === "email_link" ? challenge.userId ?? undefined : undefined);
    const session = await repository.createSession({
      userId: linked.userId,
      identityId: linked.identityId,
      authMethod: "email_otp",
      userAgent: request.headers.get("user-agent"),
      deviceLabel: request.headers.get("sec-ch-ua-platform") ?? "Trình duyệt email",
    });
    return Response.json(
      { authenticated: true, linked: challenge.kind === "email_link", returnTo },
      { headers: sessionResponseHeaders(session.token) },
    );
  } catch {
    return authError(401, "OTP_INVALID", "Mã đã sai hoặc hết hạn.");
  }
}
