import type { RegistrationStatus, BttWorkflowStatus, OneToTwoDayWorkflowStatus } from "./types"

/**
 * Map raw status strings from registration sheets onto primary SEC statuses only.
 * Legacy waitlist / BTT-as-status values map to Pending (BTT is tracked separately on F26 rows).
 */
export function mapRawStatus(raw: string | null | undefined): RegistrationStatus | null {
  if (!raw) return null
  const s = String(raw).trim().toLowerCase()
  if (!s) return null
  if (s === "confirmed" || s === "c") return "Confirmed"
  // Do not map standalone "r" → Denied (ambiguous vs Registered / typos / Symplicity codes).
  if (s === "denied" || s === "rejected" || s === "r - mjc") return "Denied"
  if (s === "canceled" || s === "cancelled") return "Canceled"
  if (s === "pending") return "Pending"
  if (s === "registered" || s === "registration submitted") return "Pending"
  if (s === "waitlisted" || s === "waitlist" || s === "wl") return "Pending"
  if (s.startsWith("btt") || s.includes("1 to 2 day") || s.includes("1to2")) return "Pending"
  return null
}

export const STATUS_BADGE_COLORS: Record<RegistrationStatus, string> = {
  Confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Denied: "bg-red-100 text-red-800 border-red-200",
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  Canceled: "bg-slate-200 text-slate-700 border-slate-300",
}

export const PACKAGE_BADGE_COLORS: Record<string, string> = {
  Maroon: "bg-[#500000]/15 text-[#500000] border-[#500000]/30",
  Diamond: "bg-sky-100 text-sky-900 border-sky-200",
  Gold: "bg-amber-100 text-amber-800 border-amber-200",
  Silver: "bg-gray-100 text-gray-700 border-gray-300",
  Basic: "bg-blue-50 text-blue-800 border-blue-200",
  Platinum: "bg-slate-100 text-slate-800 border-slate-300",
  Bronze: "bg-orange-100 text-orange-800 border-orange-200",
}

/** Parse "Registered On" raw values like "Aug 08, 2025, 8:52 AM" or ISO dates. */
export function parseRegisteredOn(raw?: string | null): Date | null {
  if (!raw) return null
  const t = Date.parse(raw)
  if (!Number.isNaN(t)) return new Date(t)
  return null
}

export function workflowUiLabel(status: BttWorkflowStatus | OneToTwoDayWorkflowStatus): string {
  if (status === "None") return "Not applicable"
  return status
}

export function mainDecisionSummaryLabel(status: RegistrationStatus): string {
  if (status === "Pending") return "Decision Needed"
  return status
}

export function bttBadgeClass(status: string): string {
  if (status === "Pending") return "bg-amber-100 text-amber-900 border-amber-300"
  if (status === "Confirmed") return "bg-emerald-100 text-emerald-900 border-emerald-300"
  if (status === "Denied") return "bg-red-100 text-red-900 border-red-300"
  return "bg-muted text-muted-foreground border-border"
}

export function oneToTwoBadgeClass(status: string): string {
  return bttBadgeClass(status)
}
