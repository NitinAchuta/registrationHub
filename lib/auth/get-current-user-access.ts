import { currentUser } from "@clerk/nextjs/server"
import type { ApprovedUser } from "./types"
import { normalizeEmail } from "./normalize-email"
import { findApprovedUserByNormalizedEmail } from "./approved-users"

export type CurrentUserAccess = {
  /** Clerk session present */
  isAuthenticated: boolean
  /** Primary / first verified email from Clerk, or null */
  email: string | null
  normalizedEmail: string | null
  approvedUser: ApprovedUser | null
  /** True when user is on the allowlist, active, and canViewAll */
  isApproved: boolean
}

function pickPrimaryEmail(
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>
): string | null {
  const primary = user.primaryEmailAddress?.emailAddress
  if (primary) return primary
  const first = user.emailAddresses?.[0]?.emailAddress
  return first ?? null
}

/**
 * Server-only: resolve the current Clerk user and allowlist status.
 * Use in Server Components / layouts — not in client components.
 */
export async function getCurrentUserAccess(): Promise<CurrentUserAccess> {
  const user = await currentUser()
  if (!user) {
    return {
      isAuthenticated: false,
      email: null,
      normalizedEmail: null,
      approvedUser: null,
      isApproved: false,
    }
  }

  const email = pickPrimaryEmail(user)
  const normalizedEmail = normalizeEmail(email)
  const approvedUser = findApprovedUserByNormalizedEmail(normalizedEmail)
  const isApproved = Boolean(
    approvedUser?.isActive && approvedUser.canViewAll
  )

  return {
    isAuthenticated: true,
    email,
    normalizedEmail,
    approvedUser,
    isApproved,
  }
}
