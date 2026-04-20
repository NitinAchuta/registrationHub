/**
 * Approved internal users for SEC Career Fair Hub.
 * Extend with roles, committees, tab keys, semesters, etc. when needed.
 */
export type ApprovedUser = {
  fullName: string
  /** Canonical email stored lowercase; matching is case-insensitive */
  email: string
  title: string
  /** When false, user should not access the dashboard (future: soft-disable). */
  isActive: boolean
  /** When true, user may access the full hub (future: narrow to specific areas). */
  canViewAll: boolean
  /** Optional hook for future RBAC / metadata without schema churn */
  metadata?: Record<string, unknown>
}
