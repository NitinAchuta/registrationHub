import type { CompanyEnrichment } from "@/lib/types"
import {
  chooseBestFmpCandidate,
  extractDomainFromEmail,
} from "./companyMatching"
import {
  getCompanyProfile,
  getEmployeeCount,
  requireFmpApiKey,
  searchSymbolByCompanyName,
} from "./fmpClient"

// Future improvement:
// Use SEC companyfacts endpoint for official public-company revenue when CIK is available.
// This avoids relying on estimated or profile-level revenue data.

export type RegistrationEnrichmentInput = {
  companyName: string
  rowNumber: number
  email?: string | null
}

function lowConfidenceRow(
  input: RegistrationEnrichmentInput,
  error: string,
): CompanyEnrichment {
  const now = new Date().toISOString()
  return {
    companyName: input.companyName.trim(),
    sourceRowNumber: input.rowNumber,
    domain: extractDomainFromEmail(input.email),
    ticker: null,
    cik: null,
    revenue: null,
    revenueSource: null,
    revenueFiscalYear: null,
    marketCap: null,
    marketCapSource: null,
    employees: null,
    employeesSource: null,
    confidence: "low",
    lastUpdated: now,
    error,
  }
}

function parseFiniteNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function latestEmployeeRow(rows: import("./fmpClient").FmpEmployeeRow[]): import("./fmpClient").FmpEmployeeRow | null {
  if (!rows.length) return null
  const sorted = [...rows].sort((a, b) => {
    const da = a.fillingDate || a.acceptedDate || ""
    const db = b.fillingDate || b.acceptedDate || ""
    return db.localeCompare(da)
  })
  return sorted[0] ?? null
}

export async function enrichCompanyFromRegistration(
  registration: RegistrationEnrichmentInput,
): Promise<CompanyEnrichment> {
  const apiKey = requireFmpApiKey()
  const baseDomain = extractDomainFromEmail(registration.email)

  const companyName = registration.companyName?.trim()
  if (!companyName) {
    return lowConfidenceRow(registration, "Missing company name")
  }

  try {
    const search = await searchSymbolByCompanyName(companyName, apiKey)
    if (search === null) {
      return lowConfidenceRow(registration, "FMP symbol search failed")
    }

    const match = chooseBestFmpCandidate(companyName, search)
    if (!match) {
      return lowConfidenceRow(registration, "No confident public-company match found")
    }

    const profile = await getCompanyProfile(match.symbol, apiKey)
    if (!profile) {
      return lowConfidenceRow(registration, "Could not load FMP profile")
    }

    const ticker = profile.symbol?.trim() || match.symbol
    const cikRaw = profile.cik?.trim()
    const cik = cikRaw && cikRaw.length > 0 ? cikRaw : null

    const revenueDirect =
      parseFiniteNumber(profile.revenue) ?? parseFiniteNumber(profile.lastAnnualRevenue)
    const revenue = revenueDirect
    const revenueSource = revenueDirect != null ? "FMP profile" : null
    const revenueFiscalYear = profile.fiscalYearEnd?.trim() || null

    const marketCap = parseFiniteNumber(profile.mktCap)
    const marketCapSource = marketCap != null ? "FMP profile" : null

    let employees = parseFiniteNumber(profile.fullTimeEmployees)
    let employeesSource: string | null =
      employees != null ? "FMP profile" : null

    if (employees == null) {
      const ec = await getEmployeeCount(match.symbol, apiKey)
      if (ec && ec.length > 0) {
        const row = latestEmployeeRow(ec)
        const ecVal = row ? parseFiniteNumber(row.employees) : null
        if (ecVal != null) {
          employees = ecVal
          employeesSource = "FMP employee-count"
        }
      }
    }

    const now = new Date().toISOString()
    return {
      companyName,
      sourceRowNumber: registration.rowNumber,
      domain: baseDomain,
      ticker,
      cik,
      revenue,
      revenueSource,
      revenueFiscalYear,
      marketCap,
      marketCapSource,
      employees,
      employeesSource,
      confidence: match.confidence,
      lastUpdated: now,
      error: null,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Enrichment failed"
    return lowConfidenceRow(registration, msg)
  }
}
