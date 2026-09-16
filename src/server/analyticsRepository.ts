import { accessDay, emptyPracticeSkills, type AnalyticsActivity } from "../learning/analyticsActivity";
import type { Skill } from "../types";
import type { D1Database } from "./d1";
import { readCurrentLearningResetEpoch } from "./learningResetEpoch";

export class AnalyticsRepository {
  constructor(private database: D1Database) {}

  async recordAccess(userId: string, now = Date.now()) {
    const result = await this.database.prepare(`INSERT INTO learner_access_days (user_id, day, first_seen_at, provenance)
      VALUES (?, ?, ?, 'visit') ON CONFLICT(user_id, day) DO NOTHING`).bind(userId, accessDay(now), now).run();
    if (!result.success) throw new Error("Access write failed");
  }

  async read(userId: string): Promise<AnalyticsActivity> {
    const epoch = await readCurrentLearningResetEpoch(this.database, userId);
    // Descriptive practice only. No promotion of synthetic/hinted/repeated attempts to mastery.
    const [practice, activity, access, pagePractice, pageDays] = await Promise.all([
      this.database.prepare(`SELECT skill, COUNT(*) AS attempts, COUNT(DISTINCT activity_id) AS 'unique',
        SUM(CASE WHEN outcome = 'correct' THEN 1 ELSE 0 END) AS correct
        FROM learning_attempts WHERE user_id = ? AND reset_epoch = ? GROUP BY skill`).bind(userId, epoch)
        .all<{ skill: Skill; attempts: number; unique: number; correct: number }>(),
      this.database.prepare(`SELECT date(occurred_at / 1000, 'unixepoch', '+7 hours') AS day, COUNT(*) AS count
        FROM learning_attempts WHERE user_id = ? AND reset_epoch = ? GROUP BY day ORDER BY day`).bind(userId, epoch)
        .all<{ day: string; count: number }>(),
      this.database.prepare("SELECT day FROM learner_access_days WHERE user_id = ? ORDER BY day").bind(userId)
        .all<{ day: string }>(),
      this.database.prepare(`SELECT COUNT(*) AS attempts,COUNT(DISTINCT activity_id) AS 'unique',
        COALESCE(SUM(outcome='correct'),0) AS correct,COALESCE(SUM(outcome='incorrect'),0) AS incorrect,
        COALESCE(SUM(outcome='self-review'),0) AS selfReview
        FROM lesson_page_attempts WHERE user_id=? AND reset_epoch=?`).bind(userId,epoch)
        .all<NonNullable<AnalyticsActivity['pagePractice']>>(),
      // Receipt time is server-owned; the client timestamp is only a reported
      // learning time and must not place arbitrary days into account analytics.
      this.database.prepare(`SELECT date(created_at / 1000,'unixepoch','+7 hours') AS day,COUNT(*) AS count
        FROM lesson_page_attempts WHERE user_id=? AND reset_epoch=? GROUP BY day`).bind(userId,epoch)
        .all<{day:string;count:number}>(),
    ]);
    if (![practice, activity, access, pagePractice, pageDays].every(r => r.success && Array.isArray(r.results))) throw new Error("Analytics read failed");
    if (await readCurrentLearningResetEpoch(this.database, userId) !== epoch) throw new Error("Analytics scope changed");
    const skills = emptyPracticeSkills();
    for (const { skill, ...counts } of practice.results!) if (skills[skill]) skills[skill] = counts;
    const days=new Map(activity.results!.map(row=>[row.day,row.count]));
    for(const row of pageDays.results!)days.set(row.day,(days.get(row.day)??0)+row.count);
    return { skills, days: [...days].map(([day,count])=>({day,count})).sort((a,b)=>a.day.localeCompare(b.day)), accessDays: access.results!.map(row => row.day), pagePractice:pagePractice.results![0] };
  }
}
