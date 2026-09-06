import type { D1Database } from "./d1";

const DAY_MS = 24 * 60 * 60 * 1_000;
const SAIGON_OFFSET_MS = 7 * 60 * 60 * 1_000;

export type AdminDashboardDay = {
  startAt: number;
  label: string;
  signIns: number;
  learningActions: number;
  editorialActions: number;
};

export type AdminDashboardOverview = {
  range: { startAt: number; endAt: number; days: number };
  accounts: {
    total: number;
    active: number;
    locked: number;
    editors: number;
    admins: number;
    createdInRange: number;
  };
  activeSessions: number;
  activeLearners: number;
  learningActions: number;
  activity: AdminDashboardDay[];
};

type CountRow = { count: number };
type BucketRow = { bucket: number; count: number };

const startOfSaigonDay = (timestamp: number) =>
  Math.floor((timestamp + SAIGON_OFFSET_MS) / DAY_MS) * DAY_MS - SAIGON_OFFSET_MS;

const activityLabel = (timestamp: number) => new Date(timestamp).toLocaleDateString("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

const addBuckets = (
  target: AdminDashboardDay[],
  rows: readonly BucketRow[],
  field: "signIns" | "learningActions" | "editorialActions",
) => {
  for (const row of rows) {
    const bucket = Number(row.bucket);
    if (Number.isInteger(bucket) && bucket >= 0 && bucket < target.length) {
      target[bucket]![field] = Number(row.count);
    }
  }
};

export class AdminDashboardRepository {
  constructor(private readonly database: D1Database) {}

  async overview(now = Date.now(), requestedDays = 7): Promise<AdminDashboardOverview> {
    const days = Math.max(7, Math.min(30, Math.trunc(requestedDays)));
    const endAt = startOfSaigonDay(now) + DAY_MS;
    const startAt = endAt - days * DAY_MS;
    const [
      accounts,
      sessions,
      learning,
      signIns,
      learningByDay,
      editorialByDay,
    ] = await Promise.all([
      this.database.prepare(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active,
                COALESCE(SUM(CASE WHEN status = 'locked' THEN 1 ELSE 0 END), 0) AS locked,
                (SELECT COUNT(*) FROM user_roles WHERE role = 'content_editor') AS editors,
                (SELECT COUNT(*) FROM user_roles WHERE role = 'admin') AS admins,
                COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END), 0) AS createdInRange
           FROM users
          WHERE status <> 'deleted'`,
      ).bind(startAt, endAt).first<{
        total: number;
        active: number;
        locked: number;
        editors: number;
        admins: number;
        createdInRange: number;
      }>(),
      this.database.prepare(
        `SELECT COUNT(*) AS count
           FROM auth_sessions session
           INNER JOIN users user ON user.id = session.user_id
          WHERE session.revoked_at IS NULL
            AND session.expires_at > ?
            AND user.status = 'active'`,
      ).bind(now).first<CountRow>(),
      this.database.prepare(
        `SELECT COUNT(*) AS actions, COUNT(DISTINCT user_id) AS learners
           FROM (
             SELECT user_id, occurred_at FROM learning_attempts
              WHERE occurred_at >= ? AND occurred_at < ?
             UNION ALL
             SELECT user_id, occurred_at FROM assessment_attempts
              WHERE occurred_at >= ? AND occurred_at < ?
           )`,
      ).bind(startAt, endAt, startAt, endAt).first<{ actions: number; learners: number }>(),
      this.database.prepare(
        `SELECT CAST((created_at - ?) / ? AS INTEGER) AS bucket, COUNT(*) AS count
           FROM audit_events
          WHERE created_at >= ? AND created_at < ?
            AND action LIKE 'auth.%.signed_in'
          GROUP BY bucket ORDER BY bucket`,
      ).bind(startAt, DAY_MS, startAt, endAt).all<BucketRow>(),
      this.database.prepare(
        `SELECT CAST((occurred_at - ?) / ? AS INTEGER) AS bucket, COUNT(*) AS count
           FROM (
             SELECT occurred_at FROM learning_attempts
              WHERE occurred_at >= ? AND occurred_at < ?
             UNION ALL
             SELECT occurred_at FROM assessment_attempts
              WHERE occurred_at >= ? AND occurred_at < ?
           )
          GROUP BY bucket ORDER BY bucket`,
      ).bind(startAt, DAY_MS, startAt, endAt, startAt, endAt).all<BucketRow>(),
      this.database.prepare(
        `SELECT CAST((occurred_at - ?) / ? AS INTEGER) AS bucket, COUNT(*) AS count
           FROM content_workflow_events
          WHERE occurred_at >= ? AND occurred_at < ?
          GROUP BY bucket ORDER BY bucket`,
      ).bind(startAt, DAY_MS, startAt, endAt).all<BucketRow>(),
    ]);
    if (
      !accounts
      || !sessions
      || !learning
      || !signIns.success
      || !learningByDay.success
      || !editorialByDay.success
    ) {
      throw new Error("Unable to read the administrative dashboard.");
    }
    const activity = Array.from({ length: days }, (_, index) => {
      const timestamp = startAt + index * DAY_MS;
      return {
        startAt: timestamp,
        label: activityLabel(timestamp),
        signIns: 0,
        learningActions: 0,
        editorialActions: 0,
      };
    });
    addBuckets(activity, signIns.results ?? [], "signIns");
    addBuckets(activity, learningByDay.results ?? [], "learningActions");
    addBuckets(activity, editorialByDay.results ?? [], "editorialActions");
    return {
      range: { startAt, endAt, days },
      accounts: {
        total: Number(accounts.total),
        active: Number(accounts.active),
        locked: Number(accounts.locked),
        editors: Number(accounts.editors),
        admins: Number(accounts.admins),
        createdInRange: Number(accounts.createdInRange),
      },
      activeSessions: Number(sessions.count),
      activeLearners: Number(learning.learners),
      learningActions: Number(learning.actions),
      activity,
    };
  }
}
