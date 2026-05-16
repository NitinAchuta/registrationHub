import type {
  AssignedToOption,
  CompanyRecord,
  RegistrationRow,
  SemesterCode,
  F26CoordinatorMeta,
  BttWorkflowStatus,
  OneToTwoDayWorkflowStatus,
} from "./types"
import { parseAssignedToOption } from "./types"
import type { MajorCode } from "./majors"
import { normalizeMajor } from "./majors"
import { mapRawStatus, parseRegisteredOn } from "./statusMapping"
import { ACTIVE_FAIR } from "./fairConfig"

export type PrimaryRegistrationStatus = "Pending" | "Confirmed" | "Denied" | "Canceled"

export type BttStatus = BttWorkflowStatus

export type OneToTwoDayStatus = OneToTwoDayWorkflowStatus

export type PackageTier = "Basic" | "Silver" | "Gold" | "Diamond" | "Maroon"

export type FairDuration = "One-Day" | "Two-Day"

export type DaysAttending = "Wednesday" | "Thursday" | "Both"

export type AssignedToCoordinator = AssignedToOption

/** Persisted per company in `sec-career-fair-registration-overrides`. */
export type F26RegistrationOverride = {
  fullRegistration?: RegistrationRow
}

export type F26ManualRegistration = {
  id: string
  companyId: string
  companyName: string
  industry: string
  fairCode: "F26"
  dateRegistered: string
  decisionDeadline: string
  status: PrimaryRegistrationStatus
  packageTier: PackageTier
  duration: FairDuration
  daysAttending: DaysAttending
  virtualFair: boolean
  representativeCount: number
  poweredBooth: boolean
  poweredDevices?: number
  primaryMajor: MajorCode
  majorsRecruited: MajorCode[]
  degreeLevels: string[]
  positionTypes: string[]
  workAuthorization: string[]
  assignedTo: AssignedToCoordinator
  symplicityUpdated: boolean
  symplicityUpdatedAt?: string
  symplicityUpdatedBy?: string
  bttStatus: BttStatus
  oneToTwoDayStatus: OneToTwoDayStatus
  welcomeSocialInterest: "Yes" | "No"
  companyChatInterest: "Yes" | "No"
  careerDiscoveryFairInterest: "Yes" | "No"
  notes?: string
}

const SIX_WEEKS_MS = 42 * 24 * 60 * 60 * 1000

export function decisionDeadlineFromRegistered(dateRegisteredIso: string): string {
  const d = new Date(dateRegisteredIso)
  if (Number.isNaN(d.getTime())) return dateRegisteredIso
  return new Date(d.getTime() + SIX_WEEKS_MS).toISOString().slice(0, 10)
}

export function defaultF26Meta(): F26CoordinatorMeta {
  return {
    bttStatus: "None",
    oneToTwoDayStatus: "None",
    symplicityUpdated: false,
    welcomeSocialInterest: "Not indicated",
    companyChatInterest: "Not indicated",
    careerDiscoveryFairInterest: "Not indicated",
  }
}

export function getF26Meta(reg: RegistrationRow | null | undefined): F26CoordinatorMeta {
  return { ...defaultF26Meta(), ...reg?.f26Meta }
}

export function primaryStatusFromRegistration(reg: RegistrationRow | null | undefined): PrimaryRegistrationStatus {
  const mapped = mapRawStatus(reg?.status)
  if (mapped === "Confirmed" || mapped === "Denied" || mapped === "Canceled" || mapped === "Pending") {
    return mapped
  }
  return "Pending"
}

export function daysAttendingToRaw(d: DaysAttending): string {
  if (d === "Wednesday") return "Wednesday"
  if (d === "Thursday") return "Thursday"
  return "Both"
}

export function rawToDaysAttending(raw: string | null | undefined): DaysAttending {
  const s = (raw ?? "").toLowerCase()
  if (s.includes("wednesday") && !s.includes("thursday") && !s.includes("both")) return "Wednesday"
  if (s.includes("thursday") && !s.includes("wednesday") && !s.includes("both")) return "Thursday"
  if (s.includes("both")) return "Both"
  if (s.includes("day 1") && s.includes("day 2")) return "Both"
  if (s.includes("both days")) return "Both"
  return "Both"
}

export function packageTierFromRow(reg: RegistrationRow | null | undefined): PackageTier | null {
  const t = reg?.package?.tier
  if (!t) return null
  const u = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  if (u === "Platinum") return "Maroon"
  if (u === "Bronze") return "Basic"
  if (["Basic", "Silver", "Gold", "Diamond", "Maroon"].includes(u)) return u as PackageTier
  return null
}

export function durationFromRow(reg: RegistrationRow | null | undefined): FairDuration | null {
  const d = reg?.package?.days
  if (!d) return null
  if (d === "Two-Day" || d === "One-Day") return d
  if (String(d).toLowerCase().includes("two")) return "Two-Day"
  return "One-Day"
}

export function majorsAsCodes(majors: string[] | undefined, topMajor?: string | null): MajorCode[] {
  const out: MajorCode[] = []
  const seen = new Set<MajorCode>()
  for (const m of majors ?? []) {
    const c = normalizeMajor(m)
    if (c && !seen.has(c)) {
      seen.add(c)
      out.push(c)
    }
  }
  const top = normalizeMajor(topMajor ?? undefined)
  if (top && !seen.has(top)) {
    seen.add(top)
    out.unshift(top)
  }
  return out
}

export function primaryMajorCode(reg: RegistrationRow | null | undefined): MajorCode | null {
  const fromTop = normalizeMajor(reg?.topMajor ?? undefined)
  if (fromTop) return fromTop
  const first = majorsAsCodes(reg?.majors, null)[0]
  return first ?? null
}

export type ActiveF26RegistrationView = {
  companyId: string
  companyName: string
  status: PrimaryRegistrationStatus
  packageTier: PackageTier | null
  duration: FairDuration | null
  daysAttending: DaysAttending
  virtualFair: boolean
  representativeCount: number
  poweredBooth: boolean
  poweredDevices: number | null
  primaryMajor: MajorCode | null
  majorsRecruited: MajorCode[]
  degreeLevels: string[]
  positionTypes: string[]
  workAuthorization: string[]
  assignedTo: AssignedToCoordinator
  symplicityUpdated: boolean
  symplicityUpdatedAt?: string
  symplicityUpdatedBy?: string
  bttStatus: BttStatus
  oneToTwoDayStatus: OneToTwoDayStatus
  dateRegisteredIso: string | null
  decisionDeadlineIso: string | null
  daysLeft: number | null
  deadlineLabel: "Completed" | "Overdue" | "Due soon" | "Open"
  reg: RegistrationRow
}

function parseIsoDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export function computeDeadlineState(
  status: PrimaryRegistrationStatus,
  decisionDeadlineIso: string | null,
): { daysLeft: number | null; deadlineLabel: ActiveF26RegistrationView["deadlineLabel"] } {
  if (status === "Confirmed" || status === "Denied" || status === "Canceled") {
    return { daysLeft: null, deadlineLabel: "Completed" }
  }
  if (!decisionDeadlineIso) return { daysLeft: null, deadlineLabel: "Open" }
  const deadline = parseIsoDate(decisionDeadlineIso)
  if (!deadline) return { daysLeft: null, deadlineLabel: "Open" }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadline.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((deadline.getTime() - today.getTime()) / 86400000)
  if (daysLeft < 0) return { daysLeft, deadlineLabel: "Overdue" }
  if (daysLeft <= 7) return { daysLeft, deadlineLabel: "Due soon" }
  return { daysLeft, deadlineLabel: "Open" }
}

export function buildActiveF26View(
  company: CompanyRecord,
  semester: SemesterCode,
  assignmentKey: string,
  assignments: Record<string, string>,
): ActiveF26RegistrationView | null {
  const reg = company.registrationHistory[semester] ?? company.currentRegistration
  if (!reg || reg.semester !== ACTIVE_FAIR.code) return null

  const meta = getF26Meta(reg)
  const status = primaryStatusFromRegistration(reg)
  const assignedRaw = assignments[assignmentKey] ?? assignments[company.id]
  const assignedTo: AssignedToCoordinator = parseAssignedToOption(assignedRaw)

  const dateIso =
    (reg.registeredOnRaw && parseRegisteredOn(reg.registeredOnRaw)?.toISOString().slice(0, 10)) ??
    (reg.registeredOnRaw && /^\d{4}-\d{2}-\d{2}/.test(reg.registeredOnRaw) ? reg.registeredOnRaw.slice(0, 10) : null)

  const decisionDeadlineIso = dateIso ? decisionDeadlineFromRegistered(dateIso) : null
  const { daysLeft, deadlineLabel } = computeDeadlineState(status, decisionDeadlineIso)

  return {
    companyId: company.id,
    companyName: company.canonicalName,
    status,
    packageTier: packageTierFromRow(reg),
    duration: durationFromRow(reg),
    daysAttending: rawToDaysAttending(reg.daysAttending),
    virtualFair: Boolean(reg.virtualFair),
    representativeCount: reg.repCount ?? 0,
    poweredBooth: (reg.powerRequired ?? "").toLowerCase().includes("required") || Boolean(reg.poweredDevices),
    poweredDevices: reg.poweredDevices ?? null,
    primaryMajor: primaryMajorCode(reg),
    majorsRecruited: majorsAsCodes(reg.majors, reg.topMajor),
    degreeLevels: reg.degreeLevels ?? [],
    positionTypes: reg.positionTypes ?? [],
    workAuthorization: reg.workAuthorization ?? [],
    assignedTo,
    symplicityUpdated: meta.symplicityUpdated,
    symplicityUpdatedAt: meta.symplicityUpdatedAt,
    symplicityUpdatedBy: meta.symplicityUpdatedBy,
    bttStatus: meta.bttStatus,
    oneToTwoDayStatus: meta.oneToTwoDayStatus,
    dateRegisteredIso: dateIso,
    decisionDeadlineIso,
    daysLeft,
    deadlineLabel,
    reg,
  }
}

export type F26RegistrationFull = ActiveF26RegistrationView

export function updateRegistrationStatus(
  reg: RegistrationRow,
  nextStatus: PrimaryRegistrationStatus,
): { reg: RegistrationRow; override: F26RegistrationOverride } {
  return {
    reg: { ...reg, status: nextStatus },
    override: { fullRegistration: { ...reg, status: nextStatus } },
  }
}

export function updateBttStatus(
  reg: RegistrationRow,
  meta: F26CoordinatorMeta,
  nextBttStatus: BttStatus,
): { reg: RegistrationRow; override: F26RegistrationOverride } {
  const nextMeta: F26CoordinatorMeta = { ...meta, bttStatus: nextBttStatus }
  if (nextBttStatus === "Confirmed") {
    let nextReg: RegistrationRow = {
      ...reg,
      status: "Confirmed",
      daysAttending: "Thursday",
      f26Meta: nextMeta,
    }
    if (reg.package) {
      nextReg = {
        ...nextReg,
        package: { ...reg.package, days: "One-Day" },
      }
    }
    return { reg: nextReg, override: { fullRegistration: nextReg } }
  }
  const nextReg: RegistrationRow = { ...reg, f26Meta: nextMeta }
  return { reg: nextReg, override: { fullRegistration: nextReg } }
}

export function updateOneToTwoDayStatus(
  reg: RegistrationRow,
  meta: F26CoordinatorMeta,
  next: OneToTwoDayStatus,
): { reg: RegistrationRow; override: F26RegistrationOverride } {
  const nextMeta: F26CoordinatorMeta = { ...meta, oneToTwoDayStatus: next }
  if (next === "Confirmed") {
    let nextReg: RegistrationRow = {
      ...reg,
      status: "Confirmed",
      daysAttending: "Both",
      f26Meta: nextMeta,
    }
    if (reg.package) {
      nextReg = {
        ...nextReg,
        package: { ...reg.package, days: "Two-Day" },
      }
    }
    return { reg: nextReg, override: { fullRegistration: nextReg } }
  }
  const nextReg: RegistrationRow = { ...reg, f26Meta: nextMeta }
  return { reg: nextReg, override: { fullRegistration: nextReg } }
}

export function patchF26Meta(
  reg: RegistrationRow,
  meta: F26CoordinatorMeta,
  patch: Partial<F26CoordinatorMeta>,
): { reg: RegistrationRow; override: F26RegistrationOverride } {
  const nextMeta: F26CoordinatorMeta = { ...meta, ...patch }
  const nextReg: RegistrationRow = { ...reg, f26Meta: nextMeta }
  return { reg: nextReg, override: { fullRegistration: nextReg } }
}

export function manualToCompanyRecord(m: F26ManualRegistration): CompanyRecord {
  const pkgRaw = `${m.packageTier} ${m.duration}`
  const reg: RegistrationRow = {
    semester: m.fairCode,
    term: ACTIVE_FAIR.label,
    rawOrganization: m.companyName,
    industry: m.industry,
    topMajor: m.primaryMajor,
    majors: m.majorsRecruited.map((c) => c),
    degreeLevels: m.degreeLevels,
    positionTypes: m.positionTypes,
    workAuthorization: m.workAuthorization,
    package: {
      raw: pkgRaw,
      tier: m.packageTier,
      days: m.duration,
      priceUSD: null,
    },
    packageRaw: pkgRaw,
    virtualFair: m.virtualFair,
    wifi: m.poweredBooth ? `Powered; ${m.poweredDevices ?? 0} devices` : null,
    wifiRequested: null,
    powerRequired: m.poweredBooth ? "Required" : null,
    poweredDevices: m.poweredDevices ?? null,
    companyQueue: null,
    balanceDue: null,
    lastPaid: null,
    boothLocation: null,
    attendeeType: "In-Person",
    daysAttending: daysAttendingToRaw(m.daysAttending),
    status: m.status,
    registeredOnRaw: m.dateRegistered,
    repCount: m.representativeCount,
    repsDay1: null,
    repsDay2: null,
    f26Meta: {
      bttStatus: m.bttStatus,
      oneToTwoDayStatus: m.oneToTwoDayStatus,
      symplicityUpdated: m.symplicityUpdated,
      symplicityUpdatedAt: m.symplicityUpdatedAt,
      symplicityUpdatedBy: m.symplicityUpdatedBy,
      welcomeSocialInterest: m.welcomeSocialInterest,
      companyChatInterest: m.companyChatInterest,
      careerDiscoveryFairInterest: m.careerDiscoveryFairInterest,
    },
  }

  return {
    id: m.companyId,
    canonicalName: m.companyName,
    variants: [m.companyName],
    sources: ["ManualF26"],
    industry: m.industry,
    industryTags: m.industry ? [m.industry] : [],
    companyType: null,
    revenueMillionsUSD: null,
    marketCapBillionsUSD: null,
    employees: null,
    willingToSponsor: null,
    bachelorHires: null,
    masterHires: null,
    doctorateHires: null,
    totalHires: 0,
    hiringHistory: {},
    attendanceHistory: {},
    semestersAttended: [],
    packageHistory: {},
    currentRegistration: reg,
    registrationHistory: { F26: reg },
    relationship: {
      attendedPastFairs: false,
      outsideEngagement: false,
      fycfParticipant: false,
      alumniPresence: false,
      careerCenterPartner: false,
      coeDonor: false,
    },
    f25Selection: null,
    f25SortedHistory: null,
    f25Waitlist: null,
    majorBuckets: [],
    hiredFall2025: "Unknown",
    hiredSpring2025: "Unknown",
  }
}
