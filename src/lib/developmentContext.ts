/**
 * Keeps a context-like object stable while development modules are replaced.
 * Only the object identity is retained; provider values remain owned by React.
 */
export function resolveDevelopmentSingleton<T>(
  registry: Record<PropertyKey, unknown>,
  key: symbol,
  create: () => T,
  development: boolean,
): T {
  if (!development) return create();
  const current = registry[key];
  if (current !== undefined) return current as T;
  const value = create();
  registry[key] = value;
  return value;
}
