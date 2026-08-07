import {
  AUTH_JSON_HEADERS,
  authError,
  loadAuthRuntime,
  relyingPartyConfig,
  sameOriginMutation,
  sessionResponseHeaders,
} from "../../../../../src/server/authHttp";
import {
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration,
  type PasskeyAuthenticationResponse,
  type PasskeyRegistrationResponse,
} from "../../../../../src/server/webauthn";
import { AuditRepository, requestCorrelationId } from "../../../../../src/server/auditRepository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return authError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return authError(400, "INVALID_JSON", "Không thể đọc passkey.");
    }
    const { operation, challenge: token, credential } = body as {
      operation?: unknown;
      challenge?: unknown;
      credential?: unknown;
    };
    if (
      !new Set(["register", "signin", "unlink"]).has(String(operation))
      || typeof token !== "string"
      || !credential
      || typeof credential !== "object"
    ) {
      return authError(422, "PASSKEY_INVALID", "Phản hồi passkey không hợp lệ.");
    }
    const { database, environment, repository } = await loadAuthRuntime();
    const rp = relyingPartyConfig(environment, request);
    const kind = operation === "register"
      ? "passkey_register"
      : operation === "unlink"
        ? "passkey_unlink"
        : "passkey_signin";
    const storedChallenge = await repository.verifyChallenge(token, kind);
    if (
      storedChallenge.payload.origin !== rp.origin
      || storedChallenge.payload.rpId !== rp.rpId
    ) {
      return authError(401, "PASSKEY_INVALID", "Passkey không thuộc origin hiện tại.");
    }

    if (operation === "register") {
      if (!storedChallenge.userId) {
        return authError(401, "PASSKEY_INVALID", "Tài khoản đăng ký không hợp lệ.");
      }
      const verified = await verifyPasskeyRegistration({
        credential: credential as PasskeyRegistrationResponse,
        expectedChallenge: token,
        expectedOrigin: rp.origin,
        rpId: rp.rpId,
      });
      const identityId = await repository.createPasskeyCredential({
        userId: storedChallenge.userId,
        ...verified,
        label: request.headers.get("sec-ch-ua-platform") ?? "Passkey",
      });
      await repository.consumeChallenge(storedChallenge);
      const session = await repository.createSession({
        userId: storedChallenge.userId,
        identityId,
        authMethod: "passkey",
        userAgent: request.headers.get("user-agent"),
        deviceLabel: request.headers.get("sec-ch-ua-platform") ?? "Thiết bị passkey",
      });
      await new AuditRepository(database).appendBestEffort({
        category: "auth",
        action: "auth.passkey.linked",
        outcome: "success",
        actorUserId: storedChallenge.userId,
        actorSessionId: session.sessionId,
        targetType: "user",
        targetId: storedChallenge.userId,
        requestId: requestCorrelationId(request),
        metadata: { provider: "passkey" },
      });
      return Response.json(
        {
          authenticated: true,
          registered: true,
          returnTo: typeof storedChallenge.payload.returnTo === "string"
            ? storedChallenge.payload.returnTo
            : "/account/security",
        },
        { headers: sessionResponseHeaders(session.token) },
      );
    }

    const assertion = credential as PasskeyAuthenticationResponse;
    const storedCredential = await repository.getPasskeyCredential(assertion.id);
    if (
      !storedCredential
      || (storedChallenge.userId && storedCredential.userId !== storedChallenge.userId)
    ) {
      return authError(401, "PASSKEY_INVALID", "Không nhận ra passkey này.");
    }
    const verified = await verifyPasskeyAuthentication({
      credential: assertion,
      expectedChallenge: token,
      expectedOrigin: rp.origin,
      rpId: rp.rpId,
      expectedUserId: storedCredential.userId,
      publicKeyJwk: storedCredential.publicKeyJwk,
      algorithm: storedCredential.algorithm,
    });
    await repository.markPasskeyUsed(
      storedCredential.id,
      storedCredential.signCount,
      verified.signCount,
    );
    await repository.consumeChallenge(storedChallenge);

    if (operation === "unlink") {
      await repository.unlinkIdentity({
        userId: storedCredential.userId,
        provider: "passkey",
        providerSubject: storedCredential.id,
      });
      await new AuditRepository(database).appendBestEffort({
        category: "auth",
        action: "auth.passkey.unlinked",
        outcome: "success",
        actorUserId: storedCredential.userId,
        actorSessionId: null,
        targetType: "user",
        targetId: storedCredential.userId,
        requestId: requestCorrelationId(request),
        metadata: { provider: "passkey" },
      });
      return Response.json(
        {
          authenticated: true,
          unlinked: true,
          returnTo: typeof storedChallenge.payload.returnTo === "string"
            ? storedChallenge.payload.returnTo
            : "/account/security",
        },
        { headers: AUTH_JSON_HEADERS },
      );
    }

    const session = await repository.createSession({
      userId: storedCredential.userId,
      identityId: storedCredential.identityId,
      authMethod: "passkey",
      userAgent: request.headers.get("user-agent"),
      deviceLabel: request.headers.get("sec-ch-ua-platform") ?? "Thiết bị passkey",
    });
    await new AuditRepository(database).appendBestEffort({
      category: "auth",
      action: "auth.passkey.signed_in",
      outcome: "success",
      actorUserId: storedCredential.userId,
      actorSessionId: session.sessionId,
      targetType: "user",
      targetId: storedCredential.userId,
      requestId: requestCorrelationId(request),
      metadata: { provider: "passkey" },
    });
    return Response.json(
      {
        authenticated: true,
        returnTo: typeof storedChallenge.payload.returnTo === "string"
          ? storedChallenge.payload.returnTo
          : "/",
      },
      { headers: sessionResponseHeaders(session.token) },
    );
  } catch {
    return authError(401, "PASSKEY_INVALID", "Passkey đã bị từ chối hoặc hết hạn.");
  }
}
