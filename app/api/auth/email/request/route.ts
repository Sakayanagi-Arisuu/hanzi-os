import { randomBase64Url } from "../../../../../src/auth/authCrypto";
import {
  AUTH_JSON_HEADERS,
  authError,
  boundedReturnTo,
  isLocalDevelopmentAuth,
  loadAuthRuntime,
  resolveCurrentAccount,
  sameOriginMutation,
} from "../../../../../src/server/authHttp";

export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function oneTimeCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String((bytes[0] ?? 0) % 1_000_000).padStart(6, "0");
}
export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return authError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  try {
    const body: unknown = await request.json();
    const email = body && typeof body === "object"
      ? (body as { email?: unknown }).email
      : null;
    const mode = body && typeof body === "object"
      ? (body as { mode?: unknown }).mode ?? "signin"
      : "signin";
    const returnTo = body && typeof body === "object"
      ? (body as { returnTo?: unknown }).returnTo
      : null;
    if (
      typeof email !== "string"
      || email.length > 254
      || !EMAIL_PATTERN.test(email)
      || !new Set(["signin", "link", "unlink"]).has(String(mode))
    ) {
      return authError(422, "EMAIL_INVALID", "Địa chỉ email hoặc chế độ không hợp lệ.");
    }
    const normalizedEmail = email.trim().toLowerCase();
    const { database, environment, repository } = await loadAuthRuntime();
    const account = mode === "signin"
      ? null
      : await resolveCurrentAccount(database, true);
    if (mode !== "signin" && !account) {
      return authError(401, "REAUTH_REQUIRED", "Hãy đăng nhập lại trước khi đổi liên kết.");
    }
    const code = oneTimeCode();
    const challenge = await repository.createChallenge({
      kind: `email_${mode}` as "email_signin" | "email_link" | "email_unlink",
      provider: "email_otp",
      userId: account?.userId,
      secret: code,
      ttlMs: 10 * 60_000,
      payload: {
        email: normalizedEmail,
        returnTo: boundedReturnTo(
          typeof returnTo === "string" ? returnTo : null,
          mode === "signin" ? "/" : "/account/security",
        ),
        deliveryNonce: randomBase64Url(12),
      },
    });
    const localDevelopment = isLocalDevelopmentAuth(
      request.url,
      environment.AUTH_DEV_EMAIL_OTP,
    );
    if (environment.AUTH_EMAIL_SENDER) {
      await environment.AUTH_EMAIL_SENDER.send({
        to: normalizedEmail,
        subject: "Mã đăng nhập HANZI.OS",
        text: `Mã một lần của bạn là ${code}. Mã hết hạn sau 10 phút.`,
      });
    } else if (!localDevelopment) {
      return authError(503, "EMAIL_DELIVERY_UNAVAILABLE", "Kênh gửi email chưa được cấu hình.");
    }
    return Response.json({
      accepted: true,
      challenge,
      expiresInSeconds: 600,
      ...(localDevelopment ? { developmentCode: code } : {}),
    }, { headers: AUTH_JSON_HEADERS });
  } catch (error) {
    if (
      process.env.NODE_ENV === "development"
      && new Set(["localhost", "127.0.0.1", "::1"]).has(new URL(request.url).hostname)
    ) {
      console.error("[auth.email.request]", error);
    }
    return authError(503, "EMAIL_AUTH_UNAVAILABLE", "Chưa thể gửi mã đăng nhập lúc này.");
  }
}
