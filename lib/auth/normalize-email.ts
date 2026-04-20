/**
 * Normalize email for safe comparison: trim + lowercase.
 * Returns null if missing or empty after trim.
 */
export function normalizeEmail(
  email: string | null | undefined
): string | null {
  if (email == null) return null
  const t = String(email).trim().toLowerCase()
  return t.length > 0 ? t : null
}
