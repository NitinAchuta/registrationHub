import type {
  CompanyFlag,
  CompanyRecord,
  CompanyScoring,
  MajorAnalytics,
  RegistrationStatus,
} from "./types"
import { FINAL_STATUSES } from "./types"
import { parseRegisteredOn } from "./statusMapping"
import { getF26Meta } from "./f26Registration"
import { getEffectiveSemestersAttended } from "./companyAttendance"

const SIX_WEEKS_MS = 6 * 7 * 24 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

export type DerivedFlagsInput = {
  company: CompanyRecord
  /** Optional; kept for call-site compatibility. Flags do not use numeric scores. */
  scoring?: CompanyScoring | null
  status: RegistrationStatus | null
  assignedTo: string
  majorAnalytics: MajorAnalytics[]
  balanceDueUSD?: number
  resolvedMissingInfo?: boolean
  hasUnresolvedNotes?: boolean
}

export function getMissingInfoLabels(c: CompanyRecord): string[] {
  const reg = c.currentRegistration
  if (!reg) return ["Registration form missing"]
  const out: string[] = []
  if (!reg.repCount && !reg.repsDay1 && !reg.repsDay2) out.push("Rep count missing")
  if (!reg.boothLocation) out.push("Booth location missing")
  if (!reg.daysAttending) out.push("Days attending missing")
  if (!reg.package) out.push("Package missing")
  if (!reg.majors?.length) out.push("Majors missing")
  if (!reg.workAuthorization?.length) out.push("Work authorization missing")
  if (!reg.wifi) out.push("Wi-Fi info missing")
  if (!reg.attendeeType) out.push("Attendee type missing")
  return out
}

/** Days until the 6-week registration → decision deadline. Null when no date. */
export function getDaysUntilDeadline(c: CompanyRecord): number | null {
  const reg = c.currentRegistration
  if (!reg?.registeredOnRaw) return null
  const registered = parseRegisteredOn(reg.registeredOnRaw)
  if (!registered) return null
  const deadline = new Date(registered.getTime() + SIX_WEEKS_MS)
  const today = new Date()
  return Math.round((deadline.getTime() - today.getTime()) / ONE_DAY_MS)
}

export function isActionRequired(input: DerivedFlagsInput): boolean {
  const { company, status, assignedTo, balanceDueUSD, resolvedMissingInfo, hasUnresolvedNotes } = input
  if (!resolvedMissingInfo && getMissingInfoLabels(company).length > 0) return true
  if (assignedTo === "Unassigned") return true
  if (status && !FINAL_STATUSES.has(status)) return true
  const deadline = getDaysUntilDeadline(company)
  if (deadline != null && deadline <= 7) return true
  if ((balanceDueUSD ?? 0) > 0) return true
  if (hasUnresolvedNotes) return true
  return false
}

export function getCompanyFlags(input: DerivedFlagsInput): CompanyFlag[] {
  const { company, status, assignedTo, majorAnalytics, balanceDueUSD } = input
  const flags: CompanyFlag[] = []
  const reg = company.currentRegistration
  const bm = reg ? getF26Meta(reg) : null
  const missing = getMissingInfoLabels(company)
  const deadlineDays = getDaysUntilDeadline(company)

  if (reg && deadlineDays != null && deadlineDays <= 7 && status && !FINAL_STATUSES.has(status)) {
    flags.push({
      type: deadlineDays < 0 ? "danger" : "warning",
      label: deadlineDays < 0 ? "Decision deadline passed" : `Deadline in ${deadlineDays} day${deadlineDays === 1 ? "" : "s"}`,
      description: "Registration is approaching the 6-week confirmation/deny window.",
      priority: 90,
    })
  }
  if (reg && assignedTo === "Unassigned" && status && !FINAL_STATUSES.has(status)) {
    flags.push({
      type: "warning",
      label: "Needs coordinator assignment",
      description: "No coordinator has been assigned yet.",
      priority: 70,
    })
  }
  if (reg && missing.length > 0) {
    flags.push({
      type: missing.length > 3 ? "danger" : "warning",
      label: `${missing.length} missing field${missing.length === 1 ? "" : "s"}`,
      description: missing.join(", "),
      priority: 60,
    })
  }
  if ((balanceDueUSD ?? 0) > 0) {
    flags.push({
      type: "danger",
      label: "Balance due",
      description: `Outstanding balance of $${balanceDueUSD?.toLocaleString()} on file.`,
      priority: 80,
    })
  }
  if (
    getEffectiveSemestersAttended(company).length === 0 &&
    company.relationship.attendedPastFairs
  ) {
    flags.push({
      type: "info",
      label: "Strong relationship, no recent attendance",
      description: "Company is on the past-attendees list but has not been confirmed in recent semesters.",
      priority: 50,
    })
  }
  // Under-indexed major support
  if (reg?.topMajor || company.f25Selection?.primaryMajor) {
    const code = (reg?.topMajor || company.f25Selection?.primaryMajor || "").match(/\(([A-Z]{3,5})\)/)?.[1]
    if (code) {
      const ma = majorAnalytics.find((m) => m.major.toUpperCase() === code)
      if (ma?.needMore) {
        flags.push({
          type: "info",
          label: `Supports under-indexed major ${code}`,
          description: "Recruits a major flagged as under-indexed in current allocations.",
          priority: 65,
        })
      }
      if (ma?.needLess) {
        flags.push({
          type: "warning",
          label: `${code} already over-indexed`,
          description: "Major has more than 80% allocation — consider BTT or 1-to-2-day options.",
          priority: 45,
        })
      }
    }
  }
  if (company.variants.length > 1) {
    flags.push({
      type: "info",
      label: `${company.variants.length} variants merged`,
      description: company.variants.join(" • "),
      priority: 30,
    })
  }
  if (bm && bm.bttStatus === "Pending" && status === "Pending") {
    if (deadlineDays != null && deadlineDays <= 14 && deadlineDays > 7) {
      flags.push({
        type: "info",
        label: "Decision approaching",
        description: `Status still ${status} with ${deadlineDays} days until deadline.`,
        priority: 40,
      })
    }
  }
  return flags.sort((a, b) => b.priority - a.priority)
}
