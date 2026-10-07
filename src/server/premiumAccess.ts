import { requiresPremium } from "../commerce/policy";
import { getHskLessonPathId } from "../data/hskCurriculumGraph";
import { CommerceRepository } from "./commerceRepository";
import { asCommerceOrder, HanziPremiumRepository } from "./hanziPremiumRepository";
import { premiumAccess } from "../commerce/policy";
import { getD1Database, type D1Database } from "./d1";
import { resolveCurrentAccount } from "./authHttp";
import { noStoreJsonHeaders } from "../sync/protocol";
import { LessonAccessRepository } from "./lessonAccessRepository";

export function sandboxCommerceEnabled(url: string, environment = process.env.NODE_ENV) {
  return environment === "development" && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
}
export async function requestPremiumAccess(request: Request, database?: D1Database) {
  // A local simulation can never open HSK4 on a public/production deployment.
  if (!sandboxCommerceEnabled(request.url)) return false;
  const db = database ?? await getD1Database();
  const account = await resolveCurrentAccount(db);
  if (!account) return false;
  const orders = await new CommerceRepository(db).orders(account.userId);
  const walletOrders = await new HanziPremiumRepository(db).orders(account.userId);
  return premiumAccess([...orders, ...walletOrders.map(asCommerceOrder)]).active;
}
export async function requirePremiumLevel(request: Request, level: unknown): Promise<Response | null> {
  if (!requiresPremium(level)) return null;
  try {
    if (await requestPremiumAccess(request)) return null;
    return Response.json({ error: { code: "PREMIUM_REQUIRED", message: "Bài học Thiên Lộ HSK4 thuộc gói Premium. Các khu khác vẫn dùng bình thường.", retryable: false } }, { status: 403, headers: noStoreJsonHeaders });
  } catch {
    return Response.json({ error: { code: "PREMIUM_UNAVAILABLE", message: "Chưa xác minh được gói học. Hãy kết nối lại và thử lại.", retryable: true } }, { status: 503, headers: noStoreJsonHeaders });
  }
}

export async function requirePremiumLesson(request: Request, lessonId: string): Promise<Response | null> {
  const level = getHskLessonPathId(lessonId);
  if (level !== "hsk4") return null;
  try {
    if (!sandboxCommerceEnabled(request.url)) return requirePremiumLevel(request, level);
    const database = await getD1Database();
    if (await new LessonAccessRepository(database).tierFor(lessonId) === "free") return null;
    return requirePremiumLevel(request, level);
  } catch {
    return Response.json({ error: { code: "PREMIUM_UNAVAILABLE", message: "Chưa xác minh được quyền bài học. Hãy thử lại.", retryable: true } },
      { status: 503, headers: noStoreJsonHeaders });
  }
}

export async function requirePremiumLessonSession(request: Request, database: D1Database, userId: string, sessionId: string) {
  const session = await database.prepare("SELECT lesson_id AS lessonId FROM lesson_sessions WHERE id=? AND user_id=?")
    .bind(sessionId, userId).first<{ lessonId: string }>();
  return session ? requirePremiumLesson(request, session.lessonId) : null;
}
