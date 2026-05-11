// Build-time generator: reads the three Excel workbooks under data/ and emits
// lib/generated/company-data.json — a normalized, deduplicated dataset that the
// app consumes at runtime. Run via `npm run gen:data` (also runs in `predev` and
// at the start of `npm run build`).
//
// Inputs:
//   data/(August 21st) F25 Company Selection Output.xlsx
//   data/Relationship with A&M Matrix.xlsx
//   data/RGCompanyDashboard_PoC.xlsx
//
// Output:
//   lib/generated/company-data.json
//
// This script intentionally keeps logic inline (no app imports) so it can run
// standalone with plain Node + xlsx.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const XLSX = require("xlsx")

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..")
const DATA_DIR = path.join(ROOT, "data")
const OUT_DIR = path.join(ROOT, "lib", "generated")
const OUT_FILE = path.join(OUT_DIR, "company-data.json")

const SELECTION_FILE = "(August 21st) F25 Company Selection Output.xlsx"
const RELATIONSHIP_FILE = "Relationship with A&M Matrix.xlsx"
const RG_DASHBOARD_FILE = "RGCompanyDashboard_PoC.xlsx"

// ----------------------------- helpers ----------------------------------------
function safeReadWorkbook(name) {
  const fp = path.join(DATA_DIR, name)
  if (!fs.existsSync(fp)) {
    console.warn(`[gen] missing workbook: ${name}`)
    return null
  }
  try {
    return XLSX.readFile(fp, { cellDates: true, cellNF: false })
  } catch (e) {
    console.warn(`[gen] failed to read ${name}:`, e?.message)
    return null
  }
}

function clean(s) {
  if (s == null) return ""
  return String(s).replace(/\s+/g, " ").trim()
}

const COMPANY_SUFFIX_PATTERNS = [
  /\b(incorporated|inc\.?)\b/gi,
  /\b(corporation|corp\.?)\b/gi,
  /\b(company|co\.?)\b/gi,
  /\bllc\b/gi,
  /\bllp\b/gi,
  /\bltd\.?\b/gi,
  /\blimited\b/gi,
  /\blp\b/gi,
  /\bplc\b/gi,
  /\busa\b/gi,
  /\bu\.?s\.?(\s|$)/gi,
  /\bnorth\s+america\b/gi,
  /\bof\s+the\s+americas\b/gi,
]
const PARTNER_SUFFIX = /\((platinum|gold|silver|bronze)\s+partner\)/gi

function stripPartnerSuffix(s) {
  return clean(String(s).replace(PARTNER_SUFFIX, ""))
}

function normalizeForMatch(raw) {
  if (!raw) return ""
  let s = clean(raw)
  s = s.replace(PARTNER_SUFFIX, "")
  s = s.toLowerCase()
  s = s.replace(/&/g, " and ")
  s = s.replace(/[\u2018\u2019\u201A]/g, "'") // smart quotes
  s = s.replace(/[\u201C\u201D]/g, '"')
  // strip parenthetical labels eg "(MANUALLY ADDED)" we don't merge on
  s = s.replace(/\([^)]*\)/g, " ")
  for (const re of COMPANY_SUFFIX_PATTERNS) s = s.replace(re, " ")
  s = s.replace(/[.,;:!?]/g, " ")
  s = s.replace(/[^a-z0-9]+/g, " ")
  s = s.replace(/\s+/g, " ").trim()
  return s
}

function slugify(name) {
  return clean(name)
    .toLowerCase()
    .replace(PARTNER_SUFFIX, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

function toNumber(v) {
  if (v == null || v === "") return undefined
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined
  const s = String(v).replace(/[$,%\s]/g, "")
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : undefined
}

function toBoolish(v) {
  if (v == null) return undefined
  const s = String(v).trim().toLowerCase()
  if (!s) return undefined
  if (["yes", "y", "true", "t", "1"].includes(s)) return true
  if (["no", "n", "false", "f", "0"].includes(s)) return false
  return undefined
}

function sheetToJson(ws) {
  if (!ws) return []
  return XLSX.utils.sheet_to_json(ws, { defval: null, blankrows: false, raw: false })
}

function sheetToAOA(ws) {
  if (!ws) return []
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: null })
}

// Map header → canonical key (case-insensitive, trims, ignores trailing spaces)
function findHeader(headers, aliases) {
  const lower = headers.map((h) => (h == null ? "" : String(h).toLowerCase().trim()))
  for (const alias of aliases) {
    const idx = lower.findIndex((h) => h === alias.toLowerCase())
    if (idx >= 0) return headers[idx]
  }
  // partial match fallback
  for (const alias of aliases) {
    const idx = lower.findIndex((h) => h.includes(alias.toLowerCase()))
    if (idx >= 0) return headers[idx]
  }
  return null
}

// ----------------------------- canonical store ---------------------------------
const companies = new Map() // key=normalized -> record

function getOrCreateCompany(rawName, source) {
  const cleaned = stripPartnerSuffix(rawName)
  if (!cleaned) return null
  const norm = normalizeForMatch(cleaned)
  if (!norm) return null
  let rec = companies.get(norm)
  if (!rec) {
    rec = {
      id: slugify(cleaned) || norm.replace(/\s+/g, "-"),
      canonicalName: cleaned,
      variants: [cleaned],
      sources: new Set([source]),
      industry: undefined,
      industryTags: new Set(),
      companyType: undefined,
      revenueMillionsUSD: undefined,
      marketCapBillionsUSD: undefined,
      employees: undefined,
      willingToSponsor: undefined,
      bachelorHires: undefined,
      masterHires: undefined,
      doctorateHires: undefined,
      hiringHistory: {}, // semester -> count
      attendanceHistory: {}, // semester -> { attended, package, packageTier, packagePriceUSD, daysLabel }
      currentRegistration: null, // S26 row
      registrationHistory: {}, // semester -> registration row (for 2-letter sources)
      packageHistory: {}, // semester -> package raw
      relationship: {
        attendedPastFairs: false,
        outsideEngagement: false,
        outsideEngagementNote: null,
        fycfParticipant: false,
        alumniPresence: false,
        careerCenterPartner: false,
        careerCenterSponsorshipLevel: null,
        coeDonor: false,
        relationshipScoreF25: undefined, // from F25 selection output
      },
      f25Selection: null, // row from "Current Decisions"
      majorBuckets: new Set(), // major codes from F25 sheets
      f25SortedHistory: null, // row from Sorted Companies OutDated if any
      f25Waitlist: null, // row from Wednesday Waitlist
      coordinatorNotes: { positives: [], issues: [], general: [], coordinatorOnly: [] },
    }
    companies.set(norm, rec)
  }
  rec.sources.add(source)
  if (!rec.variants.includes(cleaned)) rec.variants.push(cleaned)
  // Prefer the longest variant as canonical when present
  if (cleaned.length > rec.canonicalName.length) {
    rec.canonicalName = cleaned
  }
  return rec
}

// ----------------------------- package parsing ---------------------------------
const PACKAGE_TIER_REGEX = /(platinum|gold|silver|bronze|basic|standard)/i
const PACKAGE_PRICE_REGEX = /\$\s*([0-9,]+(?:\.[0-9]+)?)/
const PACKAGE_DAYS_REGEX = /(two[-\s]?day|one[-\s]?day|three[-\s]?day)/i

function parsePackage(raw) {
  if (!raw) return null
  const s = clean(raw)
  if (!s || /^#?n\/?a$/i.test(s)) return null
  const tierMatch = s.match(PACKAGE_TIER_REGEX)
  const priceMatch = s.match(PACKAGE_PRICE_REGEX)
  const daysMatch = s.match(PACKAGE_DAYS_REGEX)
  const dayLabel = (() => {
    if (!daysMatch) return null
    const m = daysMatch[1].toLowerCase()
    if (m.includes("two")) return "Two-Day"
    if (m.includes("three")) return "Three-Day"
    return "One-Day"
  })()
  return {
    raw: s,
    tier: tierMatch ? tierMatch[1][0].toUpperCase() + tierMatch[1].slice(1).toLowerCase() : null,
    days: dayLabel,
    priceUSD: priceMatch ? toNumber(priceMatch[1]) : null,
  }
}

const SEMESTER_ALIASES = {
  S22: "Spring 2022",
  F22: "Fall 2022",
  S23: "Spring 2023",
  F23: "Fall 2023",
  S24: "Spring 2024",
  F24: "Fall 2024",
  S25: "Spring 2025",
  F25: "Fall 2025",
  S26: "Spring 2026",
}
const SEMESTER_ORDER = ["S22", "F22", "S23", "F23", "S24", "F24", "S25", "F25", "S26"]

// ----------------------------- 1) Relationship matrix --------------------------
{
  const wb = safeReadWorkbook(RELATIONSHIP_FILE)
  if (wb) {
    const passTable = (sheet, applyFn) => {
      const ws = wb.Sheets[sheet]
      if (!ws) return
      const rows = sheetToJson(ws)
      for (const row of rows) {
        const keys = Object.keys(row)
        const nameKey = keys[0]
        const name = clean(row[nameKey])
        if (!name || /company name|^5engineering$/i.test(name)) continue
        const rec = getOrCreateCompany(name, "RelationshipMatrix")
        if (!rec) continue
        applyFn(rec, row, keys)
      }
    }

    passTable("Past Attendees", (rec) => {
      rec.relationship.attendedPastFairs = true
    })
    passTable("Involved Outside of CF", (rec, row, keys) => {
      rec.relationship.outsideEngagement = true
      const note = keys[1] ? clean(row[keys[1]]) : ""
      if (note) rec.relationship.outsideEngagementNote = note
    })
    passTable("FYCF", (rec) => {
      rec.relationship.fycfParticipant = true
    })
    passTable("Lots of Alumni", (rec) => {
      rec.relationship.alumniPresence = true
    })
    passTable("Career Center Partner", (rec, row, keys) => {
      rec.relationship.careerCenterPartner = true
      const lvl = keys[1] ? clean(row[keys[1]]) : ""
      if (lvl) rec.relationship.careerCenterSponsorshipLevel = lvl
    })
    passTable("CoE Donor", (rec) => {
      rec.relationship.coeDonor = true
    })
  }
}

// ----------------------------- 2) RG dashboard PoC -----------------------------
{
  const wb = safeReadWorkbook(RG_DASHBOARD_FILE)
  if (wb) {
    // CompanyList
    const ws = wb.Sheets["CompanyList"]
    const rows = sheetToJson(ws)
    for (const row of rows) {
      const name = clean(row["Company Name"])
      if (!name) continue
      const rec = getOrCreateCompany(name, "RGDashboard")
      if (!rec) continue

      const type = clean(row["Type"])
      if (type) rec.companyType = type
      const rev = toNumber(row["2025 Revenue (M USD)"])
      if (rev != null) rec.revenueMillionsUSD = rev
      const emp = toNumber(row["2025 Employees"])
      if (emp != null) rec.employees = emp
      const cap = toNumber(row["Market Cap (Billion USD)"])
      if (cap != null) rec.marketCapBillionsUSD = cap
      const sponsor = toBoolish(row["Willing to Sponsor?"])
      if (sponsor != null) rec.willingToSponsor = sponsor
      const bach = toNumber(row["Bachelor"])
      if (bach != null) rec.bachelorHires = bach
      const mast = toNumber(row["Master"])
      if (mast != null) rec.masterHires = mast
      const doct = toNumber(row["Doctorate"])
      if (doct != null) rec.doctorateHires = doct

      for (const sem of SEMESTER_ORDER) {
        const hires = toNumber(row[`${sem} Hiring`])
        if (hires != null && hires > 0) {
          rec.hiringHistory[sem] = (rec.hiringHistory[sem] || 0) + hires
        } else if (hires === 0) {
          rec.hiringHistory[sem] = rec.hiringHistory[sem] ?? 0
        }
        const attendedRaw = row[`Attended ${sem}?`]
        const attended = toBoolish(attendedRaw)
        const packageRaw = clean(row[`Package, ${sem}`])
        const pkg = parsePackage(packageRaw)
        if (attended != null || pkg) {
          rec.attendanceHistory[sem] = {
            attended: attended ?? null,
            package: pkg,
            packageRaw: packageRaw || null,
          }
        }
      }
    }

    // Per-semester registration sheets
    const semesterSheets = ["S26_CF", "F25_CF", "S25_CF", "F24_CF", "S24_CF"]
    for (const sheetName of semesterSheets) {
      const wsCF = wb.Sheets[sheetName]
      if (!wsCF) continue
      const sem = sheetName.replace(/_CF$/i, "")
      const cfRows = sheetToJson(wsCF)
      for (const r of cfRows) {
        const headers = Object.keys(r)
        const orgKey = findHeader(headers, ["Organization Name", "Company Name"])
        if (!orgKey) continue
        const name = clean(r[orgKey])
        if (!name) continue
        const rec = getOrCreateCompany(name, sheetName)
        if (!rec) continue

        const industryKey = findHeader(headers, ["Industry"])
        if (industryKey) {
          const ind = clean(r[industryKey])
          if (ind && !rec.industry) rec.industry = ind
          if (ind) rec.industryTags.add(ind)
        }

        const topMajorKey = findHeader(headers, ["Top Major Recruited", "Primary Major Recruited", "Primary Major"])
        const majorsKey = findHeader(headers, ["Major(s) Recruited", "Majors Recruited"])
        const degreeKey = findHeader(headers, ["Degree Levels Recruited"])
        const positionKey = findHeader(headers, ["Position Types"])
        const workAuthKey = findHeader(headers, ["Work Authorization Accepted", "Work Authorization Desired"])
        const packageKey = findHeader(headers, ["Package", "Packages"])
        const repCountDay1Key = findHeader(headers, ["Additional Representatives Day 1"])
        const repCountDay2Key = findHeader(headers, ["Additional Representatives Day 2"])
        const wifiKey = findHeader(headers, ["Anticipated Wi-Fi Connections", "Wi-Fi", "Wifi"])
        const boothKey = findHeader(headers, ["Booth Location"])
        const attendeeTypeKey = findHeader(headers, ["Attendee Type"])
        const daysAttendingKey = findHeader(headers, ["Days Attending"])
        const statusKey = findHeader(headers, ["Status"])
        const registeredOnKey = findHeader(headers, ["Registered On"])
        const sponsorKey = findHeader(headers, ["Sponosor? (MANUALLY ADDED)", "Sponsor"])
        const sisterKey = findHeader(headers, ["Sister Company Placement"])
        const virtualKey = findHeader(headers, ["Virtual Fair"])
        const welcomeSocialKey = findHeader(headers, ["Welcome Social"])
        const companyChatKey = findHeader(headers, ["Company Chat"])

        const topMajor = topMajorKey ? clean(r[topMajorKey]) : ""
        const majorsRaw = majorsKey ? clean(r[majorsKey]) : ""
        const degreeRaw = degreeKey ? clean(r[degreeKey]) : ""
        const positionRaw = positionKey ? clean(r[positionKey]) : ""
        const workAuthRaw = workAuthKey ? clean(r[workAuthKey]) : ""
        const packageRaw = packageKey ? clean(r[packageKey]) : ""
        const wifi = wifiKey ? clean(r[wifiKey]) : ""
        const booth = boothKey ? clean(r[boothKey]) : ""
        const attendeeType = attendeeTypeKey ? clean(r[attendeeTypeKey]) : ""
        const daysAttending = daysAttendingKey ? clean(r[daysAttendingKey]) : ""
        const statusRaw = statusKey ? clean(r[statusKey]) : ""
        const registeredOnRaw = registeredOnKey ? clean(r[registeredOnKey]) : ""
        const sponsorBool = sponsorKey ? toBoolish(r[sponsorKey]) : undefined
        const repsDay1 = repCountDay1Key ? toNumber(r[repCountDay1Key]) : undefined
        const repsDay2 = repCountDay2Key ? toNumber(r[repCountDay2Key]) : undefined
        const virtual = virtualKey ? clean(r[virtualKey]) : ""
        const welcomeSocialRaw = welcomeSocialKey ? clean(r[welcomeSocialKey]) : ""
        const companyChatRaw = companyChatKey ? clean(r[companyChatKey]) : ""

        const fourthMajor = findHeader(headers, ["Fourth Major Recruited"])
        const fifthMajor = findHeader(headers, ["Fifth Major Recruited"])
        const secondMajor = findHeader(headers, ["Second Major Recruited"])
        const thirdMajor = findHeader(headers, ["Third Major Recruited"])
        const additionalMajors = []
        for (const k of [secondMajor, thirdMajor, fourthMajor, fifthMajor]) {
          if (k) {
            const v = clean(r[k])
            if (v) additionalMajors.push(v)
          }
        }

        const allMajors = []
        if (topMajor) allMajors.push(topMajor)
        if (majorsRaw) {
          for (const piece of majorsRaw.split(/,\s*/)) {
            const p = clean(piece)
            if (p && !allMajors.includes(p)) allMajors.push(p)
          }
        }
        for (const m of additionalMajors) {
          if (!allMajors.includes(m)) allMajors.push(m)
        }

        const splitList = (raw) =>
          raw
            ? raw
                .split(/,\s*|;\s*|\s\u2022\s|\s\|\s/)
                .map((p) => clean(p))
                .filter(Boolean)
            : []

        const registration = {
          semester: sem,
          rawOrganization: name,
          industry: industryKey ? clean(r[industryKey]) : "",
          topMajor,
          majors: allMajors,
          degreeLevels: splitList(degreeRaw),
          positionTypes: splitList(positionRaw),
          workAuthorization: splitList(workAuthRaw),
          package: parsePackage(packageRaw),
          packageRaw,
          virtualFair: virtual.toLowerCase() === "yes",
          wifi: wifi || null,
          boothLocation: booth || null,
          attendeeType: attendeeType || null,
          daysAttending: daysAttending || null,
          status: statusRaw || null,
          registeredOnRaw,
          repsDay1,
          repsDay2,
          repCount: (repsDay1 || 0) + (repsDay2 || 0) || null,
          sponsorManual: sponsorBool,
          sisterCompanyPlacement: sisterKey ? clean(r[sisterKey]) : null,
          welcomeSocialRaw: welcomeSocialRaw || null,
          companyChatRaw: companyChatRaw || null,
        }
        rec.registrationHistory[sem] = registration
        if (sem === "S26") {
          rec.currentRegistration = registration
        }
        if (registration.package) rec.packageHistory[sem] = registration.package
      }
    }

    // Employment sheets — count hires per company per semester (non-empty Org)
    const empSheets = [
      ["S25_Emp", "S25"],
      ["F24_Emp", "F24"],
      ["S24_Emp", "S24"],
      ["F23_Emp", "F23"],
      ["S23_Emp", "S23"],
      ["S22_Emp", "S22"],
      ["F22_Emp", "F22"],
    ]
    for (const [sheet, sem] of empSheets) {
      const wsEmp = wb.Sheets[sheet]
      if (!wsEmp) continue
      const rs = sheetToJson(wsEmp)
      const counts = new Map()
      for (const r of rs) {
        const org = clean(r["Organization"])
        if (!org) continue
        const norm = normalizeForMatch(stripPartnerSuffix(org))
        if (!norm) continue
        counts.set(norm, (counts.get(norm) || 0) + 1)
      }
      for (const [norm, count] of counts) {
        // Only enrich existing companies; don't synthesize new records for
        // every employer that ever hired a TAMU grad (would explode the dataset).
        const rec = companies.get(norm)
        if (!rec) continue
        rec.hiringHistory[sem] = (rec.hiringHistory[sem] || 0) + count
        rec.sources.add(`Employment:${sem}`)
      }
    }
  }
}

// ----------------------------- 3) F25 selection workbook -----------------------
{
  const wb = safeReadWorkbook(SELECTION_FILE)
  if (wb) {
    // Current Decisions: company, score columns, decision, booths, primary major
    const ws = wb.Sheets["Current Decisions"]
    if (ws) {
      const rows = sheetToJson(ws)
      const headers = rows[0] ? Object.keys(rows[0]) : []
      // The first column tends to be ` (a backtick) for company name.
      const nameKey = headers[0]
      const dateKey = findHeader(headers, ["Date"])
      const revenueKey = findHeader(headers, ["Revenue", "Net Worth"])
      const workAuthKey = findHeader(headers, ["Work Authorization"])
      const glassdoorKey = findHeader(headers, ["Glassdoor"])
      const relKey = findHeader(headers, ["Relationship with A&M"])
      const totalKey = findHeader(headers, ["#VALUE!", "Score", "Total"])
      const weeksKey = findHeader(headers, ["Weeks Pending"])
      const decisionKey = findHeader(headers, ["Decision"])
      const reqWedKey = findHeader(headers, ["Requested Wednesday Booths"])
      const finWedKey = findHeader(headers, ["Final Wednesday Booths"])
      const reqThuKey = findHeader(headers, ["Requested Thursday Booths"])
      const finThuKey = findHeader(headers, ["Final Thursday Booths"])
      const primaryKey = findHeader(headers, ["Primary Major"])

      for (const row of rows) {
        const name = nameKey ? clean(row[nameKey]) : ""
        if (!name || /^company name$/i.test(name)) continue
        const rec = getOrCreateCompany(name, "F25Selection")
        if (!rec) continue
        const sel = {
          dateRaw: dateKey ? clean(row[dateKey]) : null,
          revenueScore: toNumber(row[revenueKey]) ?? null,
          workAuthScore: toNumber(row[workAuthKey]) ?? null,
          glassdoorScore: toNumber(row[glassdoorKey]) ?? null,
          relationshipScore: toNumber(row[relKey]) ?? null,
          totalScore: toNumber(row[totalKey]) ?? null,
          weeksPending: toNumber(row[weeksKey]) ?? null,
          decision: decisionKey ? clean(row[decisionKey]) : null,
          requestedWedBooths: toNumber(row[reqWedKey]) ?? null,
          finalWedBooths: toNumber(row[finWedKey]) ?? null,
          requestedThuBooths: toNumber(row[reqThuKey]) ?? null,
          finalThuBooths: toNumber(row[finThuKey]) ?? null,
          primaryMajor: primaryKey ? clean(row[primaryKey]) : null,
        }
        rec.f25Selection = sel
        if (sel.relationshipScore != null) {
          rec.relationship.relationshipScoreF25 = sel.relationshipScore
        }
      }
    }

    // Major buckets: each sheet AERO/AREN/.../PETE has Score/Decision per company
    const MAJOR_SHEETS = [
      "AERO","AREN","BAEN","BMEN","CHEN","CPSC","CVEN","CECNCEEN","DATA","ELEN","ESET","EVEN",
      "IDIS","ISEN","MEEN","MSEN","MMET","MXET","NUEN","OCEN","PETE",
    ]
    for (const sheet of MAJOR_SHEETS) {
      const wsM = wb.Sheets[sheet]
      if (!wsM) continue
      const rs = sheetToJson(wsM)
      for (const r of rs) {
        const headers = Object.keys(r)
        const firstKey = headers[0]
        const name = clean(r[firstKey])
        if (!name) continue
        const rec = getOrCreateCompany(name, `F25Major:${sheet}`)
        if (!rec) continue
        rec.majorBuckets.add(sheet)
      }
    }

    // Wednesday Waitlist
    const wsWait = wb.Sheets["Companies on Wednesday Waitlist"]
    if (wsWait) {
      const rs = sheetToJson(wsWait)
      for (const r of rs) {
        const name = clean(r["Company Name"])
        if (!name) continue
        const rec = getOrCreateCompany(name, "F25Waitlist")
        if (!rec) continue
        rec.f25Waitlist = {
          status: clean(r["Status"]) || null,
          empNote: clean(r["__EMPTY"]) || null,
          package: clean(r["Package"]) || null,
          notes: clean(r["Notes"]) || null,
        }
      }
    }

    // Sorted Companies OutDated — historical scoring info for F25
    const wsSorted = wb.Sheets["Sorted Companies OutDated"]
    if (wsSorted) {
      const rs = sheetToJson(wsSorted)
      for (const r of rs) {
        const name = clean(r["Company Name"])
        if (!name) continue
        const rec = getOrCreateCompany(name, "F25Sorted")
        if (!rec) continue
        rec.f25SortedHistory = {
          netWorth: toNumber(r["Net Worth"]) ?? null,
          workAuth: toNumber(r["Work Authorization"]) ?? null,
          glassdoor: toNumber(r["Glassdoor"]) ?? null,
          relationship: toNumber(r["Relationship with A&M"]) ?? null,
          score: toNumber(r["Score"]) ?? null,
          decision: clean(r["Decision"]) || null,
        }
      }
    }
  }
}

// ----------------------------- post-processing ---------------------------------
const result = []
for (const [, rec] of companies) {
  const semestersAttended = []
  for (const sem of SEMESTER_ORDER) {
    const att = rec.attendanceHistory[sem]
    if (att?.attended === true) semestersAttended.push(sem)
  }
  const totalHires = Object.values(rec.hiringHistory).reduce((s, n) => s + (n || 0), 0)
  const out = {
    id: rec.id,
    canonicalName: rec.canonicalName,
    variants: rec.variants,
    sources: Array.from(rec.sources),
    industry: rec.industry || null,
    industryTags: Array.from(rec.industryTags),
    companyType: rec.companyType || null,
    revenueMillionsUSD: rec.revenueMillionsUSD ?? null,
    marketCapBillionsUSD: rec.marketCapBillionsUSD ?? null,
    employees: rec.employees ?? null,
    willingToSponsor: rec.willingToSponsor ?? null,
    bachelorHires: rec.bachelorHires ?? null,
    masterHires: rec.masterHires ?? null,
    doctorateHires: rec.doctorateHires ?? null,
    totalHires,
    hiringHistory: rec.hiringHistory,
    attendanceHistory: rec.attendanceHistory,
    semestersAttended,
    packageHistory: rec.packageHistory,
    currentRegistration: rec.currentRegistration,
    registrationHistory: rec.registrationHistory,
    relationship: rec.relationship,
    f25Selection: rec.f25Selection,
    f25SortedHistory: rec.f25SortedHistory,
    f25Waitlist: rec.f25Waitlist,
    majorBuckets: Array.from(rec.majorBuckets),
  }
  result.push(out)
}

// Compact: drop empty maps to keep JSON small
function compact(obj) {
  if (Array.isArray(obj)) return obj
  if (obj && typeof obj === "object") {
    const cleaned = {}
    for (const [k, v] of Object.entries(obj)) {
      if (v == null || v === "") continue
      if (Array.isArray(v) && v.length === 0) continue
      if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) continue
      cleaned[k] = v
    }
    return cleaned
  }
  return obj
}
for (const r of result) {
  r.hiringHistory = compact(r.hiringHistory)
  r.attendanceHistory = compact(r.attendanceHistory)
  r.packageHistory = compact(r.packageHistory)
  r.registrationHistory = compact(r.registrationHistory)
}

// Sort by canonical name (case-insensitive)
result.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName, undefined, { sensitivity: "base" }))

// Major-level analytics from "Manual Analytics" sheet
let majorAnalytics = []
{
  const wb = safeReadWorkbook(SELECTION_FILE)
  if (wb) {
    const ws = wb.Sheets["Manual Analytics"]
    if (ws) {
      const rows = sheetToJson(ws)
      for (const r of rows) {
        const major = clean(r["Majors"])
        if (!major) continue
        majorAnalytics.push({
          major,
          requestedWedBooths: toNumber(r["Requested Wednesday Booths"]) ?? 0,
          finalWedBooths: toNumber(r["Final Wednesday Booths"]) ?? 0,
          requestedThuBooths: toNumber(r["Requested Thursday Booths"]) ?? 0,
          finalThuBooths: toNumber(r["Final Thursday Booths"]) ?? 0,
          allocatedBooths: toNumber(r["Allocated Total Booths"]) ?? 0,
          totalBoothsConfirmed: toNumber(r["Total Booths Confirmed"]) ?? 0,
          bumpToThursdays: toNumber(r["Bump to Thursdays"]) ?? 0,
          fillPercent: toNumber(r["How full is this major? (%)"]) ?? null,
          needMore: toBoolish(r["Need more of this major? (<20%)"]) ?? null,
          needLess: toBoolish(r["Need less of this major? (>80%)"]) ?? null,
          registrationsPercent: toNumber(r["Registrations %"]) ?? null,
          allocatedBoothsPercent: toNumber(r["Allocated Booths"]) ?? null,
          acceptanceRate: toNumber(r["Acceptance Rate"]) ?? null,
        })
      }
    }
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  semesterOrder: SEMESTER_ORDER,
  semesterLabels: SEMESTER_ALIASES,
  companies: result,
  majorAnalytics,
}

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2))
console.log(`[gen] wrote ${path.relative(ROOT, OUT_FILE)} — ${result.length} companies, ${majorAnalytics.length} majors`)
