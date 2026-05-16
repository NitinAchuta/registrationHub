import type { CompanyRecord, RegistrationRow, RegistrationStatus } from "./types"
import { ACTIVE_FAIR } from "./fairConfig"
import { normalizeMajor, type MajorCode } from "./majors"
import { mapRawStatus } from "./statusMapping"
import { defaultF26Meta } from "./f26Registration"

const COLUMN_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

function colLabel(index0: number, headerName?: string): string {
  if (headerName?.trim()) return headerName.trim()
  if (index0 < 26) return `Column ${COLUMN_LETTERS[index0]}`
  return `Column ${columnIndexToLetters(index0)}`
}

function columnIndexToLetters(index0: number): string {
  let n = index0 + 1
  let s = ""
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/** Excel / Google Sheets serial date (days since 1899-12-30). */
export function excelSerialToDate(serial: number): Date {
  const epochUtc = Date.UTC(1899, 11, 30)
  const ms = serial * 86400000
  return new Date(epochUtc + ms)
}

function dateToLocalIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export type PhoneNormalizeResult = {
  displayPhone: string
  digits: string
  isComplete: boolean
  issue?: string
}

export function normalizePhone(raw: unknown): PhoneNormalizeResult {
  const str = raw === null || raw === undefined ? "" : String(raw).trim()
  if (!str) {
    return { displayPhone: "", digits: "", isComplete: false, issue: "empty" }
  }
  const sci = /e\+/i.test(str)
  if (sci) {
    return {
      displayPhone: "Phone number incomplete",
      digits: "",
      isComplete: false,
      issue: "scientific_notation",
    }
  }
  const digits = str.replace(/\D/g, "")
  if (digits.length === 10) {
    return { displayPhone: str, digits, isComplete: true }
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return { displayPhone: str, digits, isComplete: true }
  }
  if (digits.length < 10) {
    return {
      displayPhone: "Phone number incomplete",
      digits,
      isComplete: false,
      issue: "too_few_digits",
    }
  }
  if (digits.length > 11) {
    return {
      displayPhone: "Phone number incomplete",
      digits,
      isComplete: false,
      issue: "too_many_digits",
    }
  }
  return {
    displayPhone: "Phone number incomplete",
    digits,
    isComplete: false,
    issue: "invalid_length",
  }
}

export type ParsedPackage = {
  packageTier: "Basic" | "Silver" | "Gold" | "Diamond" | "Maroon" | "Unknown"
  packageDuration: "One-Day" | "Two-Day" | "Unknown"
  packagePrice: number | null
  packageRaw: string
}

export function parsePackage(raw: string): ParsedPackage {
  const packageRaw = raw?.trim() ?? ""
  if (!packageRaw) {
    return {
      packageTier: "Unknown",
      packageDuration: "Unknown",
      packagePrice: null,
      packageRaw,
    }
  }
  const lower = packageRaw.toLowerCase()
  let packageTier: ParsedPackage["packageTier"] = "Unknown"
  if (/\bmaroon\b/i.test(packageRaw)) packageTier = "Maroon"
  else if (/\bdiamond\b/i.test(packageRaw)) packageTier = "Diamond"
  else if (/\bgold\b/i.test(packageRaw)) packageTier = "Gold"
  else if (/\bsilver\b/i.test(packageRaw)) packageTier = "Silver"
  else if (/\bbasic\b/i.test(packageRaw)) packageTier = "Basic"

  let packageDuration: ParsedPackage["packageDuration"] = "Unknown"
  if (/\btwo[- ]day\b/i.test(lower) || /\btwo day\b/i.test(lower)) packageDuration = "Two-Day"
  else if (/\bone[- ]day\b/i.test(lower) || /\bone day\b/i.test(lower)) packageDuration = "One-Day"

  let packagePrice: number | null = null
  const priceMatch = packageRaw.match(/\[\s*\$?\s*([\d,]+(?:\.\d+)?)\s*\]/i)
  if (priceMatch) {
    packagePrice = Number.parseFloat(priceMatch[1].replace(/,/g, ""))
    if (Number.isNaN(packagePrice)) packagePrice = null
  }

  return { packageTier, packageDuration, packagePrice, packageRaw }
}

export type DaysAttendingParsed = "Wednesday" | "Thursday" | "Both" | "Unknown"

export function parseDaysAttending(raw: string): DaysAttendingParsed {
  const s = (raw ?? "").toLowerCase()
  const hasD1 = s.includes("day 1") || s.includes("wednesday")
  const hasD2 = s.includes("day 2") || s.includes("thursday")
  if (hasD1 && hasD2) return "Both"
  if (hasD1 && !hasD2) return "Wednesday"
  if (hasD2 && !hasD1) return "Thursday"
  return "Unknown"
}

export function parseStatusRaw(raw: string | undefined): { status: RegistrationStatus; rawStatus: string } {
  const rawStatus = raw?.trim() ?? ""
  const mapped = mapRawStatus(rawStatus)
  if (mapped) return { status: mapped, rawStatus }
  if (!rawStatus) return { status: "Pending", rawStatus: "" }
  return { status: "Pending", rawStatus }
}

function splitCommaList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function countRepLines(raw: string): number {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean).length
}

const NOTE_START_COL = 21 // V

/** Serializable payload from Export rows + API. */
export type F26Registration = {
  id: string
  rowNumber: number
  companyName: string
  registeringContact: string
  email: string
  phone: string
  phoneRawString: string
  phoneStatus: PhoneNormalizeResult
  industry: string
  primaryMajor: string
  primaryMajorCode: MajorCode | null
  majorsRecruited: string[]
  majorsRecruitedCodes: MajorCode[]
  positionTypes: string[]
  workAuthorization: string[]
  packageRaw: string
  packageTier: ParsedPackage["packageTier"]
  packageDuration: ParsedPackage["packageDuration"]
  packagePrice: number | null
  virtualFair: boolean
  day1AdditionalReps: string
  day2AdditionalReps: string
  sisterCompanyPlacement: string
  representativeCount: number
  daysAttending: DaysAttendingParsed
  daysAttendingRaw: string
  status: RegistrationStatus
  rawStatus: string
  dateRegisteredIso: string | null
  dateRegisteredDisplay: string
  decisionDeadline: string | null
  daysLeft: number | null
  deadlineLabel: "Completed" | "Overdue" | "Due soon" | "Open" | "NotApplicable"
  notes: string[]
  rawColumns: Record<string, string>
  warnings: string[]
}

function isHeaderRow(cellA: string): boolean {
  const a = cellA.toLowerCase()
  return a.includes("company") && (a.includes("name") || a === "company")
}

function cellStr(row: unknown[], i: number): string {
  const v = row[i]
  if (v === null || v === undefined) return ""
  if (typeof v === "number") {
    if (i === 20 && v > 1000 && v < 100000) {
      try {
        const d = excelSerialToDate(v)
        return dateToLocalIso(d)
      } catch {
        return String(v)
      }
    }
    return String(v)
  }
  return String(v).trim()
}

function parseDateRegisteredU(row: unknown[], warnings: string[]): { iso: string | null; display: string } {
  const v = row[20]
  if (v === null || v === undefined || v === "") {
    warnings.push("Registration date missing")
    return { iso: null, display: "Date registered missing" }
  }
  if (typeof v === "number" && v > 1000) {
    try {
      const d = excelSerialToDate(v)
      if (Number.isNaN(d.getTime())) {
        warnings.push("Registration date missing")
        return { iso: null, display: "Date registered missing" }
      }
      return { iso: dateToLocalIso(d), display: dateToLocalIso(d) }
    } catch {
      warnings.push("Registration date missing")
      return { iso: null, display: "Date registered missing" }
    }
  }
  const s = String(v).trim()
  const parsed = Date.parse(s)
  if (!Number.isNaN(parsed)) {
    return { iso: dateToLocalIso(new Date(parsed)), display: s }
  }
  warnings.push("Registration date missing")
  return { iso: null, display: "Date registered missing" }
}

function computeDeadline(
  status: RegistrationStatus,
  dateIso: string | null,
): { decisionDeadline: string | null; daysLeft: number | null; deadlineLabel: F26Registration["deadlineLabel"] } {
  if (status === "Confirmed" || status === "Denied" || status === "Canceled") {
    return { decisionDeadline: null, daysLeft: null, deadlineLabel: "Completed" }
  }
  if (!dateIso) {
    return { decisionDeadline: null, daysLeft: null, deadlineLabel: "NotApplicable" }
  }
  const start = new Date(dateIso + "T12:00:00.000Z")
  const deadline = new Date(start.getTime() + 42 * 86400000)
  const deadlineStr = deadline.toISOString().slice(0, 10)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(deadlineStr + "T12:00:00.000Z")
  end.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((end.getTime() - today.getTime()) / 86400000)
  if (daysLeft < 0) return { decisionDeadline: deadlineStr, daysLeft, deadlineLabel: "Overdue" }
  if (daysLeft <= 7) return { decisionDeadline: deadlineStr, daysLeft, deadlineLabel: "Due soon" }
  return { decisionDeadline: deadlineStr, daysLeft, deadlineLabel: "Open" }
}

export function parseExportRows(rows: unknown[][]): F26Registration[] {
  const out: F26Registration[] = []
  if (!rows.length) return out

  let headerLabels: string[] = []
  let dataStart = 0
  const firstA = cellStr(rows[0] as unknown[], 0)
  if (isHeaderRow(firstA)) {
    headerLabels = (rows[0] as unknown[]).map((c) => String(c ?? "").trim())
    dataStart = 1
  }

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    const warnings: string[] = []

    const companyName = cellStr(row, 0)
    if (!companyName.trim()) continue

    const registeringContact = cellStr(row, 1)
    const email = cellStr(row, 2)
    const phoneRaw = row[3]
    const phoneRawString = phoneRaw === null || phoneRaw === undefined ? "" : String(phoneRaw)
    const phoneNorm = normalizePhone(phoneRaw)
    const industry = cellStr(row, 4)
    const primaryMajorRaw = cellStr(row, 5)
    const allMajorsRaw = cellStr(row, 6)
    const positionTypesRaw = cellStr(row, 7)
    const workAuthRaw = cellStr(row, 8)
    const packageRawCell = cellStr(row, 9)
    const virtualRaw = cellStr(row, 10)
    const day1 = cellStr(row, 11)
    const day2 = cellStr(row, 12)
    const sister = cellStr(row, 14)
    const repsRaw = cellStr(row, 15)
    const daysAttendingRaw = cellStr(row, 18)
    const statusCell = cellStr(row, 19)

    if (!primaryMajorRaw.trim()) warnings.push("Missing primary major")
    if (!allMajorsRaw.trim()) warnings.push("Missing all majors")
    if (!workAuthRaw.trim()) warnings.push("Missing work authorization")

    const pkg = parsePackage(packageRawCell)
    if (pkg.packageTier === "Unknown" && !packageRawCell.trim()) warnings.push("Missing package")

    const primaryCode = normalizeMajor(primaryMajorRaw)
    const majorsSplit = allMajorsRaw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const majorsRecruitedCodes: MajorCode[] = []
    const seen = new Set<string>()
    for (const m of majorsSplit) {
      const c = normalizeMajor(m)
      if (c && !seen.has(c)) {
        seen.add(c)
        majorsRecruitedCodes.push(c)
      }
    }
    if (primaryCode && !seen.has(primaryCode)) {
      majorsRecruitedCodes.unshift(primaryCode)
      seen.add(primaryCode)
    }

    const repCount = (() => {
      const s = String(repsRaw ?? "").trim()
      if (!s) return 0
      if (/\r?\n/.test(s)) return s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).length
      const n = Number(s.replace(/[^\d.]/g, ""))
      if (Number.isFinite(n) && n > 0 && /^\s*\d/.test(s)) return Math.floor(n)
      return 1
    })()

    const daysParsed = parseDaysAttending(daysAttendingRaw)
    if (pkg.packageDuration === "Two-Day" && daysParsed === "Thursday") {
      warnings.push("Package/days attending mismatch")
    }
    if (pkg.packageDuration === "One-Day" && daysParsed === "Both") {
      warnings.push("Package/days attending mismatch")
    }

    const { status, rawStatus } = parseStatusRaw(statusCell)
    const { iso: dateIso, display: dateDisplay } = parseDateRegisteredU(row, warnings)
    const { decisionDeadline, daysLeft, deadlineLabel } = computeDeadline(status, dateIso)

    const notes: string[] = []
    for (let c = NOTE_START_COL; c < row.length; c++) {
      const noteText = cellStr(row, c)
      if (noteText) notes.push(noteText)
    }

    const virtualFair = /^(yes|true|1|y)$/i.test(String(virtualRaw).trim())

    const rawColumns: Record<string, string> = {}
    const maxCols = Math.max(row.length, 21, headerLabels.length)
    for (let c = 0; c < maxCols; c++) {
      const label = colLabel(c, headerLabels[c])
      rawColumns[label] = cellStr(row, c)
    }

    const rowNumber = i + 1

    out.push({
      id: `f26-export-${rowNumber}`,
      rowNumber,
      companyName: companyName.trim(),
      registeringContact,
      email,
      phone: phoneNorm.displayPhone,
      phoneRawString,
      phoneStatus: phoneNorm,
      industry,
      primaryMajor: primaryMajorRaw,
      primaryMajorCode: primaryCode,
      majorsRecruited: majorsSplit.length ? majorsSplit : majorsRecruitedCodes.map((c) => c),
      majorsRecruitedCodes,
      positionTypes: splitCommaList(positionTypesRaw),
      workAuthorization: splitCommaList(workAuthRaw),
      packageRaw: pkg.packageRaw,
      packageTier: pkg.packageTier,
      packageDuration: pkg.packageDuration,
      packagePrice: pkg.packagePrice,
      virtualFair,
      day1AdditionalReps: day1,
      day2AdditionalReps: day2,
      sisterCompanyPlacement: sister,
      representativeCount: repCount,
      daysAttending: daysParsed,
      daysAttendingRaw,
      status,
      rawStatus,
      dateRegisteredIso: dateIso,
      dateRegisteredDisplay: dateDisplay,
      decisionDeadline,
      daysLeft,
      deadlineLabel,
      notes,
      rawColumns,
      warnings,
    })
  }

  return out
}

export function f26RegistrationToRegistrationRow(r: F26Registration): RegistrationRow {
  const tierStr =
    r.packageTier === "Unknown" ? null : r.packageTier
  const daysStr =
    r.packageDuration === "Unknown" ? null : r.packageDuration

  const daysAttendStr =
    r.daysAttending === "Wednesday"
      ? "Wednesday"
      : r.daysAttending === "Thursday"
        ? "Thursday"
        : r.daysAttending === "Both"
          ? "Both"
          : r.daysAttendingRaw || ""

  return {
    semester: ACTIVE_FAIR.code,
    term: ACTIVE_FAIR.label,
    rawOrganization: r.companyName,
    industry: r.industry || undefined,
    topMajor: r.primaryMajorCode ?? r.primaryMajor,
    majors: r.majorsRecruitedCodes.length ? r.majorsRecruitedCodes.map((c) => c) : r.majorsRecruited,
    degreeLevels: [],
    positionTypes: r.positionTypes,
    workAuthorization: r.workAuthorization,
    package: {
      raw: r.packageRaw,
      tier: tierStr,
      days: daysStr,
      priceUSD: r.packagePrice,
    },
    packageRaw: r.packageRaw,
    virtualFair: r.virtualFair,
    sisterCompanyPlacement: r.sisterCompanyPlacement || null,
    daysAttending: daysAttendStr,
    status: r.status,
    registeredOnRaw: r.dateRegisteredIso ?? "",
    repCount: r.representativeCount,
    repsDay1: null,
    repsDay2: null,
    f26Meta: { ...defaultF26Meta() },
    registeringContact: r.registeringContact,
    contactEmail: r.email,
    contactPhoneRaw: r.phoneRawString,
    contactPhoneDisplay: r.phone,
    phoneNormalizedIssue: r.phoneStatus.isComplete ? undefined : r.phoneStatus.issue,
    exportRowNumber: r.rowNumber,
    sheetNotes: r.notes,
    sheetWarnings: r.warnings,
    exportRawColumns: r.rawColumns,
    day1AdditionalReps: r.day1AdditionalReps,
    day2AdditionalReps: r.day2AdditionalReps,
    workAuthorizationRaw: r.workAuthorization.join("; ") || undefined,
    positionTypesRaw: r.positionTypes.join("; ") || undefined,
    statusRaw: r.rawStatus || undefined,
    packageDaysMismatchWarning: r.warnings.some((w) => w.includes("mismatch")) || undefined,
  }
}

export function companyRecordFromExport(r: F26Registration): CompanyRecord {
  const reg = f26RegistrationToRegistrationRow(r)
  return {
    id: r.id,
    canonicalName: r.companyName,
    variants: [r.companyName],
    sources: [`GoogleSheet:Export:row${r.rowNumber}`],
    industry: r.industry || null,
    industryTags: r.industry ? [r.industry] : [],
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
    majorBuckets: r.majorsRecruitedCodes.map(String),
    hiredFall2025: "Unknown",
    hiredSpring2025: "Unknown",
  }
}

export function companyRecordsFromExportRegistrations(regs: F26Registration[]): CompanyRecord[] {
  return regs.map(companyRecordFromExport)
}
