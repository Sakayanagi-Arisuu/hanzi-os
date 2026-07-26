export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const hasExactKeys = (
  value: Record<string, unknown>,
  required: ReadonlySet<string>,
  optional: ReadonlySet<string> = new Set(),
) => {
  const keys = Object.keys(value);
  return [...required].every((key) => Object.hasOwn(value, key))
    && keys.every((key) => required.has(key) || optional.has(key));
};

export const boundedString = (
  value: unknown,
  maximum: number,
): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;

export const safePositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 1;

export const normalizedTime = (value: unknown) => {
  if (!boundedString(value, 40)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const isSha256 = (value: unknown): value is `sha256:${string}` =>
  typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
