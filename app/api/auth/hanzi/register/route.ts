import {
  AUTH_JSON_HEADERS,
  authError,
  boundedReturnTo,
  loadAuthRuntime,
  sameOriginMutation,
  sessionResponseHeaders,
} from "../../../../../src/server/authHttp";
import {
  HanziAccountConflictError,
} from "../../../../../src/server/authRepository";
import { HanziRegistrationValidationError } from "../../../../../src/server/hanziPassword";
import { readBoundedRequestText } from "../../../../../src/server/boundedRequestBody";
import { AuthorizationRepository } from "../../../../../src/server/authorizationRepository";
import {
  AuditRepository,
  requestCorrelationId,
} from "../../../../../src/server/auditRepository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return authError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  const requestBody = await readBoundedRequestText(request, 4_096);
  if (!requestBody.ok) {
    return authError(413, "REQUEST_TOO_LARGE", "Dữ liệu đăng ký vượt quá giới hạn.");
  }
  let body: unknown;
  try {
    body = JSON.parse(requestBody.text) as unknown;
  } catch {
    return authError(400, "INVALID_JSON", "Không thể đọc dữ liệu đăng ký.");
  }
  if (!body || typeof body !== "object") {
    return authError(422, "HANZI_REGISTRATION_INVALID", "Thông tin đăng ký chưa đầy đủ.");
  }
  const { username, email, password, displayName, returnTo } = body as {
    username?: unknown;
    email?: unknown;
    password?: unknown;
    displayName?: unknown;
    returnTo?: unknown;
  };
  if (
    typeof username !== "string"
    || typeof email !== "string"
    || typeof password !== "string"
    || typeof displayName !== "string"
  ) {
    return authError(422, "HANZI_REGISTRATION_INVALID", "Thông tin đăng ký chưa đầy đủ.");
  }
  try {
    const { database, repository } = await loadAuthRuntime();
    const account = await repository.registerHanziAccount({
      username,
      email,
      password,
      displayName,
    });
    const session = await repository.createSession({
      userId: account.userId,
      identityId: account.identityId,
      authMethod: "hanzi",
      userAgent: request.headers.get("user-agent"),
      deviceLabel: request.headers.get("sec-ch-ua-platform")
        ?? "Tài khoản HANZI.OS",
    });
    const authorization = await new AuthorizationRepository(database)
      .getAuthorization(account.userId);
    await new AuditRepository(database).appendBestEffort({
      category: "auth",
      action: "auth.hanzi.registered",
      outcome: "success",
      actorUserId: account.userId,
      actorSessionId: session.sessionId,
      targetType: "user",
      targetId: account.userId,
      requestId: requestCorrelationId(request),
      metadata: { provider: "hanzi" },
    });
    return Response.json({
      authenticated: true,
      created: true,
      user: {
        username: account.username,
        email: account.email,
        displayName: account.displayName,
      },
      authorization,
      returnTo: boundedReturnTo(
        typeof returnTo === "string" ? returnTo : null,
        "/",
      ),
    }, { headers: sessionResponseHeaders(session.token) });
  } catch (error) {
    if (error instanceof HanziRegistrationValidationError) {
      return authError(422, error.code, error.message);
    }
    if (error instanceof HanziAccountConflictError) {
      return authError(409, error.code, error.message);
    }
    if (error instanceof Error && error.message === "New account registration is closed.") {
      return authError(403, "REGISTRATION_CLOSED", "Hệ thống đang tạm khóa đăng ký mới.");
    }
    return authError(
      503,
      "HANZI_REGISTRATION_UNAVAILABLE",
      "Chưa thể tạo tài khoản HANZI.OS lúc này.",
      AUTH_JSON_HEADERS,
    );
  }
}
