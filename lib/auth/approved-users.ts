import type { ApprovedUser } from "./types"
import { normalizeEmail } from "./normalize-email"

/**
 * Fixed allowlist — source of truth for internal dashboard access.
 * Update this file to add/remove users; deploy to apply changes.
 */
export const APPROVED_USERS: ApprovedUser[] = [
  {
    fullName: "Nathan Lam",
    email: "nathanlam@tamu.edu",
    title: "Career Fair Co-Chair",
    canViewAll: true,
    isActive: true,
  },
  {
    fullName: "Raul Lozano",
    email: "raullozano4@tamu.edu",
    title: "Career Fair Co-Chair",
    canViewAll: true,
    isActive: true,
  },
  {
    fullName: "Pranav Nandakumar",
    email: "pranavn101@tamu.edu",
    title: "Vice President of Development",
    canViewAll: true,
    isActive: true,
  },
  {
    fullName: "Aryan Shah",
    email: "aryanshah@tamu.edu",
    title: "Career Fair Systems Coordinator",
    canViewAll: true,
    isActive: true,
  },
  {
    fullName: "Nitin Achuta",
    email: "nitinachuta05@tamu.edu",
    title: "Career Fair Systems Coordinator",
    canViewAll: true,
    isActive: true,
  },
  {
    fullName: "Kyle Oubre",
    email: "kyle_oubre@tamu.edu",
    title: "Career Fair Registration Coordinator",
    canViewAll: true,
    isActive: true,
  },
  {
    fullName: "Teresa Barquero Sanchez",
    email: "teresabarquero@tamu.edu",
    title: "Career Fair Registration Coordinator",
    canViewAll: true,
    isActive: true,
  },
]

const byNormalizedEmail = new Map<string, ApprovedUser>()
for (const u of APPROVED_USERS) {
  const key = normalizeEmail(u.email)
  if (key) byNormalizedEmail.set(key, u)
}

/** Look up an approved user by already-normalized email, or null */
export function findApprovedUserByNormalizedEmail(
  normalizedEmail: string | null
): ApprovedUser | null {
  if (!normalizedEmail) return null
  return byNormalizedEmail.get(normalizedEmail) ?? null
}

/** Normalize any raw email and return the matching approved record, if any */
export function findApprovedUserByEmail(
  rawEmail: string | null | undefined
): ApprovedUser | null {
  return findApprovedUserByNormalizedEmail(normalizeEmail(rawEmail))
}
