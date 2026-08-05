export const APP_ROLES = ["learner", "admin"] as const;

export type AppRole = typeof APP_ROLES[number];

export const APP_PERMISSIONS = [
  "learning:use",
  "account:self:manage",
  "admin:users:read",
  "admin:roles:write",
] as const;

export type AppPermission = typeof APP_PERMISSIONS[number];

export type AppAuthorization = {
  roles: AppRole[];
  permissions: AppPermission[];
};

const ROLE_PERMISSIONS: Record<AppRole, readonly AppPermission[]> = {
  learner: ["learning:use", "account:self:manage"],
  admin: ["admin:users:read", "admin:roles:write"],
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
    ? "Quản Trị Hệ Thống"
    : "Hành Giả · Người học";
