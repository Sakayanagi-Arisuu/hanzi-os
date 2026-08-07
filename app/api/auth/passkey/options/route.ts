import {
  authError,
  loadAuthRuntime,
  relyingPartyConfig,
  resolveCurrentAccount,
  sameOriginMutation,
} from "../../../../../src/server/authHttp";
import {
  passkeyCreationOptions,
  passkeyRequestOptions,
} from "../../../../../src/server/webauthn";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return authError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  try {
    const body: unknown = await request.json();
    const operation = body && typeof body === "object"
      ? (body as { operation?: unknown }).operation
      : null;
    if (!new Set(["register", "signin", "unlink"]).has(String(operation))) {
      return authError(422, "PASSKEY_OPERATION_INVALID", "Thao tác passkey không hợp lệ.");
    }
    const { database, environment, repository } = await loadAuthRuntime();
    const rp = relyingPartyConfig(environment, request);
    const account = operation === "signin"
      ? null
      : await resolveCurrentAccount(database, true);
    if (operation !== "signin" && !account) {
      return authError(401, "REAUTH_REQUIRED", "Hãy đăng nhập lại trước khi đổi passkey.");
    }
    const descriptors = account
      ? await repository.listPasskeyCredentialDescriptors(account.userId)
      : [];
    if (operation === "unlink" && descriptors.length === 0) {
      return authError(404, "PASSKEY_NOT_FOUND", "Tài khoản chưa có passkey.");
    }
    const challenge = await repository.createChallenge({
      kind: operation === "register"
        ? "passkey_register"
        : operation === "unlink"
          ? "passkey_unlink"
          : "passkey_signin",
      provider: "passkey",
      userId: account?.userId,
      payload: { origin: rp.origin, rpId: rp.rpId },
      ttlMs: 5 * 60_000,
    });
    const options = operation === "register" && account
      ? passkeyCreationOptions({
          challenge,
          rpId: rp.rpId,
          rpName: "HANZI.OS",
          userId: account.userId,
          userName: account.identity.email || account.userId,
          displayName: account.identity.displayName,
          excludeCredentialIds: descriptors.map((descriptor) => descriptor.id),
        })
      : passkeyRequestOptions({
          challenge,
          rpId: rp.rpId,
          allowCredentials: operation === "unlink" ? descriptors : undefined,
        });
    return Response.json({ operation, challenge, options });
  } catch {
    return authError(503, "PASSKEY_UNAVAILABLE", "Passkey chưa sẵn sàng lúc này.");
  }
}
