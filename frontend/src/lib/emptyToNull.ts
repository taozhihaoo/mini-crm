/** Convert empty strings to null for optional API fields. */
export function emptyToNull<T extends Record<string, unknown>>(values: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    result[key] = value === "" ? null : value;
  }
  return result as T;
}
