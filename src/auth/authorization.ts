export const APP_ROLES = ["learner", "content_editor", "admin"] as const;

export type AppRole = typeof APP_ROLES[number];

export const APP_PERMISSIONS = [
  "learning:use",
  "account:self:manage",
  "content:workspace:read",
  "content:drafts:write",
  "content:validation:run",
  "content:submit",
  "content:approve",
  "content:publish",
  "admin:users:read",
  "admin:roles:write",
  "admin:users:lock",
  "admin:sessions:read",
  "admin:sessions:revoke",
  "admin:settings:read",
  "admin:settings:write",
  "admin:audit:read",
] as const;

export type AppPermission = typeof APP_PERMISSIONS[number];

export type AppAuthorization = {
  roles: AppRole[];
  permissions: AppPermission[];
};

const ROLE_PERMISSIONS: Record<AppRole, readonly AppPermission[]> = {
  learner: ["learning:use", "account:self:manage"],
  content_editor: [
    "content:workspace:read",
    "content:drafts:write",
    "content:validation:run",
    "content:submit",
  ],
  admin: [
    "content:workspace:read",
    "content:approve",
    "content:publish",
    "admin:users:read",
    "admin:roles:write",
    "admin:users:lock",
    "admin:sessions:read",
    "admin:sessions:revoke",
    "admin:settings:read",
    "admin:settings:write",
    "admin:audit:read",
  ],
};

export const isAppRole = (value: unknown): value is AppRole =>
  typeof value === "string" && APP_ROLES.includes(value as AppRole);

export const createAuthorization = (
  inputRoles: readonly AppRole[],
): AppAuthorization => {
  const roleSet = new Set<AppRole>(["learner", ...inputRoles]);
  const roles = APP_ROLES.filter((role) => roleSet.has(role));
  const permissionSet = new Set<AppPermission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role]) permissionSet.add(permission);
  }
  return {
    roles,
    permissions: APP_PERMISSIONS.filter((permission) => permissionSet.has(permission)),
  };
};

export const BASELINE_AUTHORIZATION = createAuthorization(["learner"]);

export const hasPermission = (
  authorization: AppAuthorization | null | undefined,
  permission: AppPermission,
) => authorization?.permissions.includes(permission) === true;

export const authorizationLabel = (authorization: AppAuthorization) =>
  authorization.roles.includes("admin")
    ? "Điều Hành Hệ Thống"
    : authorization.roles.includes("content_editor")
      ? "Quản Khố Nội Dung"
      : "Hành Giả";
