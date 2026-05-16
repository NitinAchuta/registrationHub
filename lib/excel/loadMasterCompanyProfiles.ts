import "server-only"

import fs from "fs"
import path from "path"
import * as XLSX from "xlsx"
import { normalizeCompanyName } from "@/lib/companyNormalizer"
import { findHistoricalProfile } from "@/lib/historicalProfileMatch"
import type {
  CareerFairPackageHistory,
  ExitSurveyHiringHistory,
  HistoricalCompanyProfile,
  YesNoUnknown,
} from "@/lib/types"

const WORKSHEET_NAME = "Master Company Profile"
const DATA_DIR = "data"
const PREFERRED_FILE = "MASTER - Company Profiles.xlsx"
const FALLBACK_FILE = "MASTER - Company Profiles(2).xlsx"

const EXIT_SURVEY_HEADERS: { term: ExitSurveyHiringHistory["term"]; header: string }[] = [
  { term: "Fall 2021", header: "Exit Survey: Fall 2021" },
  { term: "Spring 2022", header: "Exit Survey: Spring 2022" },
  { term: "Fall 2022", header: "Exit Survey: Fall 2022" },
  { term: "Spring 2023", header: "Exit Survey: Spring 2023" },
  { term: "Fall 2023", header: "Exit Survey: Fall 2023" },
  { term: "Spring 2024", header: "Exit Survey: Spring 2024" },
  { term: "Fall 2024", header: "Exit Survey: Fall 2024" },
  { term: "Spring 2025", header: "Exit Survey: Spring 2025" },
  { term: "Fall 2025", header: "Exit Survey: Fall 2025" },
]

const PACKAGE_HEADERS: { term: CareerFairPackageHistory["term"]; header: string }[] = [
  { term: "S26", header: "CF Package: S26" },
  { term: "F25", header: "CF Package: F25" },
  { term: "S25", header: "CF Package: S25" },
  { term: "F24", header: "CF Package: F24" },
  { term: "S24", header: "CF Package: S24" },
]

let cachedProfiles: HistoricalCompanyProfile[] | null = null
let cachedMap: Map<string, HistoricalCompanyProfile> | null = null
let fileMissingLogged = false

export function cleanCell(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  if (!s) return null
  if (s === "—" || s === "-" || s.toUpperCase() === "N/A") return null
  return s
}

export function parseYesNoUnknown(value: unknown): YesNoUnknown {
  const s = cleanCell(value)
  if (!s) return "Unknown"
  const lower = s.toLowerCase()
  if (lower === "yes" || lower === "y") return "Yes"
  if (lower === "no" || lower === "n") return "No"
  return "Unknown"
}

export function parsePackage(value: unknown): string | null {
  const s = cleanCell(value)
  if (!s) return null
  if (/^did not attend$/i.test(s)) return null
  return s
}

export function didAttendPackage(packageValue: string | null): boolean {
  if (!packageValue) return false
  if (/^did not attend$/i.test(packageValue.trim())) return false
  if (packageValue.trim() === "—" || packageValue.trim() === "-") return false
  return true
}

export function resolveMasterProfilesWorkbookPath(): string | null {
  const preferred = path.join(process.cwd(), DATA_DIR, PREFERRED_FILE)
  if (fs.existsSync(preferred)) return preferred
  const fallback = path.join(process.cwd(), DATA_DIR, FALLBACK_FILE)
  if (fs.existsSync(fallback)) return fallback
  return null
}

function resolveWorkbookPath(): string | null {
  return resolveMasterProfilesWorkbookPath()
}

function rowToRecord(row: Record<string, unknown>): HistoricalCompanyProfile | null {
  const companyName = cleanCell(row["Company Name"])
  if (!companyName) return null

  const rawColumns: Record<string, string | null> = {}
  for (const [key, val] of Object.entries(row)) {
    rawColumns[key] = cleanCell(val)
  }

  const exitSurveyHiringHistory: ExitSurveyHiringHistory[] = EXIT_SURVEY_HEADERS.map(
    ({ term, header }) => {
      const rawValue = cleanCell(row[header])
      return {
        term,
        hiredStudents: parseYesNoUnknown(row[header]),
        rawValue,
      }
    },
  )

  const careerFairPackageHistory: CareerFairPackageHistory[] = PACKAGE_HEADERS.map(
    ({ term, header }) => {
      const pkg = parsePackage(row[header])
      return {
        term,
        package: pkg,
        attended: didAttendPackage(pkg),
      }
    },
  )

  return {
    companyName,
    normalizedCompanyName: normalizeCompanyName(companyName),
    studentInterestInstagram: parseYesNoUnknown(row["Student Interest (Instagram)"]),
    exitSurveyHiringHistory,
    attendedCdfS26: parseYesNoUnknown(row["Attended CDF (S26)"]),
    firstYearCareerFair: parseYesNoUnknown(row["First Year Career Fair"]),
    careerFairPackageHistory,
    rgDecisions: {
      s25: cleanCell(row["RG Decision: S25"]),
      f25: cleanCell(row["RG Decision: F25"]),
      s26: cleanCell(row["RG Decision: S26"]),
    },
    mostRecentCfRep: {
      name: cleanCell(row["Most Recent CF Rep Name"]),
      email: cleanCell(row["Most Recent CF Rep Email"]),
    },
    webTaContact: {
      name: cleanCell(row["Web: TA Contact Name"]),
      email: cleanCell(row["Web: TA Contact Email"]),
    },
    rawColumns,
  }
}

function parseWorkbook(filePath: string): HistoricalCompanyProfile[] {
  const buffer = fs.readFileSync(filePath)
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const sheet = workbook.Sheets[WORKSHEET_NAME]
  if (!sheet) {
    throw new Error(`Worksheet '${WORKSHEET_NAME}' not found.`)
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  })

  const out: HistoricalCompanyProfile[] = []
  for (const row of rows) {
    const profile = rowToRecord(row)
    if (profile) out.push(profile)
  }
  return out
}

export function loadMasterCompanyProfiles(): HistoricalCompanyProfile[] {
  if (cachedProfiles) return cachedProfiles

  const filePath = resolveWorkbookPath()
  if (!filePath) {
    if (!fileMissingLogged) {
      console.warn(
        `Master company profiles file not found at data/${PREFERRED_FILE} (also checked data/${FALLBACK_FILE})`,
      )
      fileMissingLogged = true
    }
    cachedProfiles = []
    cachedMap = new Map()
    return cachedProfiles
  }

  try {
    cachedProfiles = parseWorkbook(filePath)
    cachedMap = new Map()
    for (const p of cachedProfiles) {
      if (p.normalizedCompanyName) cachedMap.set(p.normalizedCompanyName, p)
    }
    return cachedProfiles
  } catch (e) {
    console.error("[loadMasterCompanyProfiles]", e)
    cachedProfiles = []
    cachedMap = new Map()
    return cachedProfiles
  }
}

export function getHistoricalProfilesMap(): Map<string, HistoricalCompanyProfile> {
  if (!cachedMap) loadMasterCompanyProfiles()
  return cachedMap ?? new Map()
}

export type { HistoricalProfileLookup } from "@/lib/historicalProfileMatch"

export function getHistoricalProfileByCompanyName(
  companyName: string,
): HistoricalCompanyProfile | null {
  const list = loadMasterCompanyProfiles()
  return findHistoricalProfile(companyName, list, getHistoricalProfilesMap()).profile
}
