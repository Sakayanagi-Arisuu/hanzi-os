import type { D1Database } from "./d1";
import { AuditRepository } from "./auditRepository";

export const SYSTEM_SETTING_KEYS = [
  "account_registration_mode",
  "content_preview_enabled",
  "default_daily_minutes",
  "maintenance_banner",
] as const;

export type SystemSettingKey = typeof SYSTEM_SETTING_KEYS[number];

type SystemSettingDefinition = {
  label: string;
  description: string;
  defaultValue: unknown;
  validate(value: unknown): unknown;
};

export const SYSTEM_SETTING_DEFINITIONS: Record<
  SystemSettingKey,
  SystemSettingDefinition
> = {
  account_registration_mode: {
    label: "Mở tài khoản mới",
    description: "Cho phép hoặc khóa việc tạo tài khoản mới; tài khoản hiện có vẫn đăng nhập.",
    defaultValue: "open",
    validate(value) {
      if (value !== "open" && value !== "closed") {
        throw new Error("Chế độ đăng ký chỉ nhận open hoặc closed.");
      }
      return value;
    },
  },
  content_preview_enabled: {
    label: "Preview nội dung quản trị",
    description: "Cờ an toàn dành cho Content Studio M3; không phát hành draft cho learner.",
    defaultValue: false,
    validate(value) {
      if (typeof value !== "boolean") throw new Error("Cờ preview phải là boolean.");
      return value;
    },
  },
  default_daily_minutes: {
    label: "Nhịp học mặc định",
    description: "Số phút gợi ý ban đầu, từ 5 đến 120; không sửa hồ sơ đã tạo.",
    defaultValue: 15,
    validate(value) {
      if (!Number.isInteger(value) || Number(value) < 5 || Number(value) > 120) {
        throw new Error("Nhịp học mặc định phải là số nguyên từ 5 đến 120.");
      }
      return Number(value);
    },
  },
  maintenance_banner: {
    label: "Thông báo vận hành",
    description: "Dòng thông báo thuần văn bản; để trống để ẩn.",
    defaultValue: "",
    validate(value) {
      if (typeof value !== "string" || value.length > 160) {
        throw new Error("Thông báo vận hành tối đa 160 ký tự.");
      }
      return value.trim();
    },
  },
};

export type SystemSetting = {
  key: SystemSettingKey;
  value: unknown;
  revision: number;
  updatedAt: number | null;
  updatedByUserId: string | null;
};

export class SettingConcurrencyError extends Error {
  readonly code = "SETTING_REVISION_CONFLICT";
}

export const isSystemSettingKey = (value: unknown): value is SystemSettingKey =>
  typeof value === "string"
  && SYSTEM_SETTING_KEYS.includes(value as SystemSettingKey);

export class SystemSettingsRepository {
  constructor(private readonly database: D1Database) {}

  async list(): Promise<SystemSetting[]> {
    const result = await this.database
      .prepare(
        "SELECT key, value_json AS valueJson, revision, updated_at AS updatedAt, updated_by_user_id AS updatedByUserId FROM system_settings",
      )
      .all<{
        key: string;
        valueJson: string;
        revision: number;
        updatedAt: number;
        updatedByUserId: string | null;
      }>();
    if (!result.success) throw new Error("Unable to read system settings.");
    const stored = new Map((result.results ?? []).map((row) => [row.key, row]));
    return SYSTEM_SETTING_KEYS.map((key) => {
      const row = stored.get(key);
      return {
        key,
        value: row
          ? SYSTEM_SETTING_DEFINITIONS[key].validate(JSON.parse(row.valueJson) as unknown)
          : SYSTEM_SETTING_DEFINITIONS[key].defaultValue,
        revision: row?.revision ?? 0,
        updatedAt: row?.updatedAt ?? null,
        updatedByUserId: row?.updatedByUserId ?? null,
      };
    });
  }

  async get(key: SystemSettingKey): Promise<SystemSetting> {
    return (await this.list()).find((setting) => setting.key === key) as SystemSetting;
  }

  async update(input: {
    actorUserId: string;
    actorSessionId: string;
    key: SystemSettingKey;
    value: unknown;
    expectedRevision: number;
    requestId: string;
  }): Promise<SystemSetting> {
    const definition = SYSTEM_SETTING_DEFINITIONS[input.key];
    const value = definition.validate(input.value);
    const valueJson = JSON.stringify(value);
    const timestamp = Date.now();
    const statement = input.expectedRevision === 0
      ? this.database
          .prepare(
            `INSERT INTO system_settings (
              key, value_json, revision, updated_by_user_id, created_at, updated_at
            ) SELECT ?, ?, 1, ?, ?, ?
              WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = ?)`,
          )
          .bind(
            input.key,
            valueJson,
            input.actorUserId,
            timestamp,
            timestamp,
            input.key,
          )
      : this.database
          .prepare(
            `UPDATE system_settings
                SET value_json = ?, revision = revision + 1,
                    updated_by_user_id = ?, updated_at = ?
              WHERE key = ? AND revision = ?`,
          )
          .bind(
            valueJson,
            input.actorUserId,
            timestamp,
            input.key,
            input.expectedRevision,
          );
    const result = await statement.run();
    if ((result.meta?.changes ?? 0) !== 1) {
      throw new SettingConcurrencyError("System setting changed in another session.");
    }
    const updated = await this.get(input.key);
    await new AuditRepository(this.database).append({
      category: "config",
      action: "config.setting.updated",
      outcome: "success",
      actorUserId: input.actorUserId,
      actorSessionId: input.actorSessionId,
      targetType: "system_setting",
      targetId: input.key,
      requestId: input.requestId,
      metadata: {
        previousRevision: input.expectedRevision,
        revision: updated.revision,
        value,
      },
    });
    return updated;
  }
}

export async function isNewAccountRegistrationOpen(database: D1Database) {
  const row = await database
    .prepare(
      "SELECT value_json AS valueJson FROM system_settings WHERE key = 'account_registration_mode' LIMIT 1",
    )
    .first<{ valueJson: string }>();
  if (!row) return true;
  return SYSTEM_SETTING_DEFINITIONS.account_registration_mode.validate(
    JSON.parse(row.valueJson) as unknown,
  ) === "open";
}
