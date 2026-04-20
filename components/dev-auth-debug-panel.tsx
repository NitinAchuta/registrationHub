"use client"

import { useUser } from "@clerk/nextjs"
import { findApprovedUserByEmail } from "@/lib/auth/approved-users"

/**
 * Development-only floating panel — not a security boundary (allowlist is public in source).
 */
export function DevAuthDebugPanel() {
  if (process.env.NODE_ENV !== "development") {
    return null
  }

  const { user, isLoaded } = useUser()
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null
  const approved = findApprovedUserByEmail(email)

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-[100] max-w-xs rounded-md border border-amber-600/40 bg-amber-50/95 p-3 text-[11px] leading-snug text-amber-950 shadow-lg backdrop-blur-sm dark:border-amber-500/40 dark:bg-amber-950/90 dark:text-amber-50">
      <p className="font-semibold uppercase tracking-wide text-amber-900/80 dark:text-amber-200/90">
        Auth debug
      </p>
      {!isLoaded ? (
        <p className="mt-1">Loading session…</p>
      ) : (
        <dl className="mt-1 space-y-0.5">
          <div className="flex gap-1">
            <dt className="text-amber-800/80 dark:text-amber-300/80">Email</dt>
            <dd className="min-w-0 truncate font-mono">{email ?? "—"}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-amber-800/80 dark:text-amber-300/80">Allowlist</dt>
            <dd>{approved ? "approved" : "not listed"}</dd>
          </div>
          {approved && (
            <div className="flex gap-1">
              <dt className="text-amber-800/80 dark:text-amber-300/80">Title</dt>
              <dd className="min-w-0 truncate">{approved.title}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}
