import type { RegistrationStatus } from "./types"

/**
 * Map raw status strings from the registration sheets onto our canonical
 * RegistrationStatus values. The Excel sheets use values like:
 *   "Confirmed", "Pending", "Canceled" (sic)
 * and the F25 selection workbook uses single-letter decision codes like
 *   "C" / "c" / "R" / "r" / "BTT" / "WL"
 */
export function mapRawStatus(
  raw: string | null | undefined,
): RegistrationStatus | null {
  if (!raw) return null
  const s = String(raw).trim().toLowerCase()
  if (!s) return null
  if (s === "confirmed" || s === "c") return "Confirmed"
  if (s === "denied" || s === "rejected" || s === "r" || s === "r - mjc") return "Denied"
  if (s === "canceled" || s === "cancelled") return "Cancelled"
  if (s === "pending") return "Pending"
  if (s === "waitlisted" || s === "waitlist" || s === "wl") return "Waitlisted"
  if (s === "btt pending" || s === "btt") return "BTT Pending"
  if (s === "btt confirmed" || s === "btt c") return "BTT Confirmed"
  if (s === "btt rejected" || s === "btt r") return "BTT Rejected"
  if (s === "1 to 2 day pending" || s === "1to2 pending") return "1 to 2 Day Pending"
  if (s === "1 to 2 day accepted" || s === "1to2 accepted") return "1 to 2 Day Accepted"
  if (s === "1 to 2 day rejected" || s === "1to2 rejected") return "1 to 2 Day Rejected"
  return null
}

export const STATUS_BADGE_COLORS: Record<RegistrationStatus, string> = {
  Confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Denied: "bg-red-100 text-red-800 border-red-200",
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  Waitlisted: "bg-blue-100 text-blue-800 border-blue-200",
  Cancelled: "bg-slate-200 text-slate-700 border-slate-300",
  "BTT Pending": "bg-purple-100 text-purple-800 border-purple-200",
  "BTT Confirmed": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "BTT Rejected": "bg-red-100 text-red-800 border-red-200",
  "1 to 2 Day Pending": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "1 to 2 Day Accepted": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "1 to 2 Day Rejected": "bg-red-100 text-red-800 border-red-200",
}

export const PACKAGE_BADGE_COLORS: Record<string, string> = {
  Platinum: "bg-slate-100 text-slate-800 border-slate-300",
  Gold: "bg-amber-100 text-amber-800 border-amber-200",
  Silver: "bg-gray-100 text-gray-700 border-gray-300",
  Bronze: "bg-orange-100 text-orange-800 border-orange-200",
  Basic: "bg-blue-50 text-blue-800 border-blue-200",
}

/** Parse "Registered On" raw values like "Aug 08, 2025, 8:52 AM" into a Date. */
export function parseRegisteredOn(raw?: string | null): Date | null {
  if (!raw) return null
  const t = Date.parse(raw)
  if (!Number.isNaN(t)) return new Date(t)
  return null
}
