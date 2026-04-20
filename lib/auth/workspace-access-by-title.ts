import type { Workspace } from "@/lib/rbac"

const ALL_WORKSPACES: Workspace[] = [
  "registrations",
  "analytics",
  "finance",
  "hospitality",
  "operations",
]

/**
 * Which dashboard workspaces a member may open, based on their SEC title from the allowlist.
 * Titles must match `lib/auth/approved-users.ts` exactly.
 *
 * Extend this map when roles or committees change.
 */
export function getWorkspacesForSecTitle(
  title: string | null | undefined
): Workspace[] {
  const t = title?.trim() ?? ""
  if (!t) {
    return [...ALL_WORKSPACES]
  }

  switch (t) {
    case "Career Fair Co-Chair":
    case "Vice President of Development":
      return [...ALL_WORKSPACES]

    case "Career Fair Systems Coordinator":
      return ["registrations", "analytics", "operations"]

    case "Career Fair Registration Coordinator":
      return ["registrations", "analytics"]

    default:
      // New titles: grant full access until explicitly mapped
      return [...ALL_WORKSPACES]
  }
}

export function canAccessWorkspace(
  allowedWorkspaces: Workspace[],
  workspace: Workspace
): boolean {
  return allowedWorkspaces.includes(workspace)
}
