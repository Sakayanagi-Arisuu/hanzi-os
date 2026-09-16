import type { LearningEvidence, Skill } from "../types";

export const ANALYTICS_SKILLS: Skill[] = ["pronunciation", "listening", "speaking", "reading", "writing", "vocabulary", "grammar"];
export type PracticeSummary = { attempts: number; unique: number; correct: number };
export type AnalyticsActivity = {
  pagePractice?: {attempts:number;unique:number;correct:number;incorrect:number;selfReview:number};
  skills: Record<Skill, PracticeSummary>;
  days: { day: string; count: number }[];
  accessDays: string[];
};
// A stable calendar shared by browser, server and demo fixtures.
export const accessDay = (time = Date.now()) => new Date(time + 7 * 3_600_000).toISOString().slice(0, 10);
export const emptyPracticeSkills = () => Object.fromEntries(ANALYTICS_SKILLS.map(skill => [skill, { attempts: 0, unique: 0, correct: 0 }])) as AnalyticsActivity["skills"];

export function localAnalyticsActivity(evidence: readonly LearningEvidence[]): AnalyticsActivity {
  const skills = emptyPracticeSkills();
  const unique = new Map<Skill, Set<string>>();
  const days = new Map<string, number>();
  const seen = new Set<string>();
  for (const item of evidence) {
    if (item.method === "lesson-completion" || seen.has(item.idempotencyKey) || !skills[item.skill]) continue;
    seen.add(item.idempotencyKey);
    const time = Date.parse(item.occurredAt);
    if (!Number.isFinite(time)) continue;
    const summary = skills[item.skill];
    summary.attempts++;
    if (item.outcome === "correct") summary.correct++;
    const items = unique.get(item.skill) ?? new Set<string>();
    items.add(item.activityId);
    unique.set(item.skill, items);
    summary.unique = items.size;
    const day = accessDay(time);
    days.set(day, (days.get(day) ?? 0) + 1);
  }
  return { skills, days: [...days].map(([day, count]) => ({ day, count })), accessDays: [] };
}

export function parseAnalyticsActivity(input: unknown): AnalyticsActivity | null {
  if (!input || typeof input !== "object") return null;
  const value = input as AnalyticsActivity;
  const count = (n: unknown) => Number.isSafeInteger(n) && Number(n) >= 0;
  const day = (d: unknown) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
  if(value.pagePractice!==undefined){
    const p=value.pagePractice;
    if(!p||typeof p!=='object'||![p.attempts,p.unique,p.correct,p.incorrect,p.selfReview].every(count)||p.unique>p.attempts||p.correct+p.incorrect+p.selfReview!==p.attempts)return null;
  }
  if (!value.skills || !ANALYTICS_SKILLS.every(skill => {
    const s = value.skills[skill];
    return s && count(s.attempts) && count(s.unique) && count(s.correct) && s.unique <= s.attempts && s.correct <= s.attempts;
  }) || !Array.isArray(value.days) || !value.days.every(d => d && day(d.day) && count(d.count))
    || !Array.isArray(value.accessDays) || !value.accessDays.every(day)) return null;
  return value;
}

/** Speech transcripts stay on this device; never upload them just for analytics.
 * These methods have no normalized learning_attempts writer. */
export function withDevicePractice(account: AnalyticsActivity | null, evidence: readonly LearningEvidence[]): AnalyticsActivity | null {
  if (!account) return null;
  const device = localAnalyticsActivity(evidence.filter(item => item.method === "speech-transcript" || item.method === "stroke-quiz"));
  const skills = emptyPracticeSkills();
  for (const skill of ANALYTICS_SKILLS) {
    skills[skill] = { attempts: account.skills[skill].attempts + device.skills[skill].attempts,
      unique: account.skills[skill].unique + device.skills[skill].unique,
      correct: account.skills[skill].correct + device.skills[skill].correct };
  }
  const days = new Map(account.days.map(row => [row.day, row.count]));
  for (const row of device.days) days.set(row.day, (days.get(row.day) ?? 0) + row.count);
  return { skills, days: [...days].map(([day, count]) => ({ day, count })), accessDays: account.accessDays, pagePractice:account.pagePractice };
}
