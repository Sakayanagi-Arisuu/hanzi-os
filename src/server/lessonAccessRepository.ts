import { getHskLessonPathId } from "../data/hskCurriculumGraph";
import type { D1Database } from "./d1";

export type LessonAccessTier = "free" | "premium";
export class LessonAccessConflict extends Error {}

/** Per-lesson policy for Thiên Lộ HSK4. HSK0–3 and other areas stay free. */
export class LessonAccessRepository {
  constructor(private database: D1Database, private now = Date.now()) {}

  async tierFor(lessonId: string): Promise<LessonAccessTier> {
    const level = getHskLessonPathId(lessonId);
    if (!level) throw new LessonAccessConflict("Bài Thiên Lộ không hợp lệ.");
    if (level !== "hsk4") return "free";
    const row = await this.database.prepare("SELECT tier FROM lesson_access_rules WHERE lesson_id=?")
      .bind(lessonId).first<{ tier: LessonAccessTier }>();
    if (row && row.tier !== "free" && row.tier !== "premium") throw new Error("Invalid lesson access rule");
    return row?.tier ?? "premium";
  }

  async freeHsk4LessonIds() {
    const result = await this.database.prepare("SELECT lesson_id AS lessonId FROM lesson_access_rules WHERE tier='free' ORDER BY lesson_id")
      .all<{ lessonId: string }>();
    if (!result.success) throw new Error("Lesson access unavailable");
    return (result.results ?? []).map(row => row.lessonId).filter(id => getHskLessonPathId(id) === "hsk4");
  }

  async setTier(lessonId: string, tier: LessonAccessTier, actorId: string, actorSessionId: string | null, requestId: string) {
    if (getHskLessonPathId(lessonId) !== "hsk4" || (tier !== "free" && tier !== "premium")) {
      throw new LessonAccessConflict("Chỉ chỉnh quyền bài Thiên Lộ HSK4 trong giai đoạn này.");
    }
    const result = await this.database.batch([
      this.database.prepare(`INSERT INTO lesson_access_rules (lesson_id,tier,updated_by,updated_at) VALUES (?,?,?,?)
        ON CONFLICT(lesson_id) DO UPDATE SET tier=excluded.tier,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
        .bind(lessonId, tier, actorId, this.now),
      this.database.prepare(`INSERT INTO audit_events
        (id,category,action,outcome,actor_user_id,actor_session_id,target_type,target_id,request_id,metadata_json,created_at)
        VALUES (?,'config','lesson_access_change','success',?,?,'thien_lo_lesson',?,?,?,?)`)
        .bind(crypto.randomUUID(), actorId, actorSessionId, lessonId, requestId, JSON.stringify({ tier }), this.now),
    ]);
    if (result.some(item => item?.meta?.changes !== 1)) throw new Error("Lesson access update failed");
    return tier;
  }
}
