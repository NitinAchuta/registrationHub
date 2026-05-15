/**
 * Server-only Financial Modeling Prep client (stable endpoints).
 * Never import from client components.
 */

const FMP_BASE = "https://financialmodelingprep.com/stable"

export type FmpSearchHit = {
  symbol?: string
  name?: string
  currency?: string
  stockExchange?: string
  exchangeShortName?: string
}

export type FmpProfile = {
  symbol?: string
  companyName?: string
  cik?: string
  mktCap?: number
  revenue?: number
  lastAnnualRevenue?: number
  fullTimeEmployees?: number | string
  fiscalYearEnd?: string
}

export type FmpEmployeeRow = {
  symbol?: string
  fillingDate?: string
  acceptedDate?: string
  periodOfReport?: string
  employees?: number | string
}

export function requireFmpApiKey(): string {
  const k = process.env.FMP_API_KEY?.trim()
  if (!k) throw new Error("FMP_API_KEY is not configured.")
  return k
}

function userAgentHeader(): Record<string, string> {
  const ua = process.env.SEC_USER_AGENT?.trim() || "CareerFairHub/1.0 (SEC Career Fair Hub; enrichment)"
  return { "User-Agent": ua }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: userAgentHeader() })
    if (!res.ok) return null
    const data = (await res.json()) as T
    return data
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function searchSymbolByCompanyName(
  companyName: string,
  apiKey: string,
): Promise<FmpSearchHit[] | null> {
  const q = companyName.trim()
  if (!q) return []
  const url = `${FMP_BASE}/search-symbol?query=${encodeURIComponent(q)}&apikey=${encodeURIComponent(apiKey)}`
  const data = await fetchJson<FmpSearchHit[]>(url)
  if (!data || !Array.isArray(data)) return null
  return data
}

export async function getCompanyProfile(symbol: string, apiKey: string): Promise<FmpProfile | null> {
  const sym = symbol.trim()
  if (!sym) return null
  const url = `${FMP_BASE}/profile?symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(apiKey)}`
  const data = await fetchJson<FmpProfile[]>(url)
  if (!data || !Array.isArray(data) || data.length === 0) return null
  return data[0] ?? null
}

export async function getEmployeeCount(symbol: string, apiKey: string): Promise<FmpEmployeeRow[] | null> {
  const sym = symbol.trim()
  if (!sym) return null
  const url = `${FMP_BASE}/employee-count?symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(apiKey)}`
  const data = await fetchJson<FmpEmployeeRow[]>(url)
  if (!data || !Array.isArray(data)) return null
  return data
}
