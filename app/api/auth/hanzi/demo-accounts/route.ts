import {
  AUTH_JSON_HEADERS,
  authError,
  isLocalDevelopmentAuth,
  loadAuthRuntime,
  sameOriginMutation,
} from "../../../../../src/server/authHttp";

export const dynamic = "force-dynamic";

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return authError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  if (!LOOPBACK_HOSTNAMES.has(new URL(request.url).hostname)) {
    return authError(404, "NOT_FOUND", "Không tìm thấy tài nguyên.");
  }
  try {
    const { environment, repository } = await loadAuthRuntime();
    const enabled = isLocalDevelopmentAuth(
      request.url,
      environment.AUTH_DEV_HANZI_DEMOS,
    );
    if (!enabled) {
      return authError(404, "NOT_FOUND", "Không tìm thấy tài nguyên.");
    }
    const accounts = await repository.seedLocalDemoAccounts(true);
    return Response.json({
      seeded: true,
      localOnly: true,
      accounts,
    }, { headers: AUTH_JSON_HEADERS });
  } catch {
    return authError(
      503,
      "LOCAL_DEMO_SEED_UNAVAILABLE",
      "Chưa thể chuẩn bị tài khoản thử vai trò lúc này.",
    );
  }
}
