/**
 * Server-only Google Sheets access via a service account (read + write).
 *
 * Share the spreadsheet with GOOGLE_SERVICE_ACCOUNT_EMAIL as Editor for writes.
 * Never use NEXT_PUBLIC_ or import this from client components.
 */

import { google } from "googleapis"

import type { CompanyEnrichment, EnrichmentConfidence } from "./types"
import { normalizeCompanyName } from "./enrichment/companyMatching"

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"

export function missingGoogleCredentialsMessage(): string {
  return "Google Sheets credentials are not configured."
}

export function requireGoogleSheetEnv(): { spreadsheetId: string } {
  if (
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ||
    !process.env.GOOGLE_PRIVATE_KEY?.trim() ||
    !process.env.GOOGLE_SHEET_ID?.trim()
  ) {
    throw new Error(missingGoogleCredentialsMessage())
  }
  return { spreadsheetId: process.env.GOOGLE_SHEET_ID!.trim() }
}

function getPrivateKey(): string {
  requireGoogleSheetEnv()
  return process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n")
}

/** JWT-authenticated Sheets API client (v4). */
export function getSheetsClient() {
  requireGoogleSheetEnv()
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!.trim(),
    key: getPrivateKey(),
    scopes: [SHEETS_SCOPE],
  })
  return google.sheets({ version: "v4", auth })
}

/** Spreadsheet tab with exports (default `Export`). */
export function getExportsTabName(): string {
  return process.env.GOOGLE_SHEET_EXPORTS_TAB?.trim() || "Export"
}

/** Quote sheet name for A1 ranges when needed. */
export function quoteSheetTab(tab: string): string {
  if (/[\s'!]/.test(tab)) return `'${tab.replace(/'/g, "''")}'`
  return tab
}

/** 0-based column index → letters (0=A, 21=V). */
export function columnIndexToLetters(index0: number): string {
  let n = index0 + 1
  let s = ""
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/** Column letters → 0-based index (V → 21). */
export function columnLettersToIndex0(letters: string): number {
  let n = 0
  for (const c of letters.toUpperCase()) {
    if (c < "A" || c > "Z") continue
    n = n * 26 + (c.charCodeAt(0) - 64)
  }
  return n - 1
}

/** Note columns: V (index 21) through ZZ. */
export const NOTE_COLUMN_START = columnLettersToIndex0("V")
export const NOTE_COLUMN_END = columnLettersToIndex0("ZZ")

/**
 * Read Export tab grid used by the SEC hub (unformatted values + serial dates).
 * Range: Export!A1:ZZ (tab name from getExportsTabName()).
 */
export async function readExportSheet(): Promise<unknown[][]> {
  const { spreadsheetId } = requireGoogleSheetEnv()
  const tab = quoteSheetTab(getExportsTabName())
  const range = `${tab}!A1:ZZ`
  const sheets = getSheetsClient()
  let response
  try {
    response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "SERIAL_NUMBER",
    })
  } catch {
    throw new Error("Could not read Export tab from Google Sheets.")
  }
  const values = response.data.values
  if (!values || values.length === 0) {
    throw new Error("Export tab not found or range is empty.")
  }
  return values as unknown[][]
}

/**
 * Generic range read (optional helpers / legacy routes).
 */
export async function readSheetRange(
  range: string,
  options?: {
    valueRenderOption?: "FORMATTED_VALUE" | "UNFORMATTED_VALUE"
    dateTimeRenderOption?: "SERIAL_NUMBER" | "FORMATTED_STRING"
  },
): Promise<string[][]> {
  const { spreadsheetId } = requireGoogleSheetEnv()
  const sheets = getSheetsClient()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: options?.valueRenderOption ?? "FORMATTED_VALUE",
    dateTimeRenderOption: options?.dateTimeRenderOption,
  })
  return (response.data.values ?? []) as string[][]
}

export async function updateExportCell(
  a1Notation: string,
  value: string | number | boolean | null,
): Promise<void> {
  const { spreadsheetId } = requireGoogleSheetEnv()
  const sheets = getSheetsClient()
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: a1Notation,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[value === null || value === undefined ? "" : value]],
      },
    })
  } catch {
    throw new Error("Could not update Google Sheet.")
  }
}

/** Single-row values A..ZZ (sparse arrays padded where API omits trailing blanks). */
export async function readExportRow(rowNumber: number): Promise<unknown[]> {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new Error("Invalid row number.")
  }
  const tab = quoteSheetTab(getExportsTabName())
  const range = `${tab}!A${rowNumber}:ZZ${rowNumber}`
  const { spreadsheetId } = requireGoogleSheetEnv()
  const sheets = getSheetsClient()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER",
  })
  const rows = response.data.values as unknown[][] | undefined
  return rows?.[0] ?? []
}

/** Next empty 0-based column index for notes (V…ZZ), or null if full. */
export async function findNextEmptyNoteColumn(rowNumber: number): Promise<number | null> {
  const row = await readExportRow(rowNumber)
  for (let idx = NOTE_COLUMN_START; idx <= NOTE_COLUMN_END; idx++) {
    const cell = row[idx]
    if (cell === undefined || cell === null || String(cell).trim() === "") {
      return idx
    }
  }
  return null
}

function formatNoteTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export async function appendCompanyNote(
  rowNumber: number,
  noteText: string,
  author?: string,
): Promise<{ columnLetter: string; cell: string; note: string }> {
  const idx = await findNextEmptyNoteColumn(rowNumber)
  if (idx === null) {
    throw new Error("No empty note columns available for this company row.")
  }
  const ts = formatNoteTimestamp(new Date())
  const authorLabel = author?.trim() || "Dashboard"
  const formatted = `[${ts}] ${authorLabel}: ${noteText.trim()}`
  const colLetter = columnIndexToLetters(idx)
  const tab = quoteSheetTab(getExportsTabName())
  const cell = `${tab}!${colLetter}${rowNumber}`
  await updateExportCell(cell, formatted)
  return { columnLetter: colLetter, cell, note: formatted }
}

export async function updateCompanyPhone(rowNumber: number, phone: string): Promise<void> {
  const tab = quoteSheetTab(getExportsTabName())
  await updateExportCell(`${tab}!D${rowNumber}`, phone)
}

/** Legacy: entire sheet name range for backward-compat routes. */
export function fullExportsSheetRange(): string {
  return quoteSheetTab(getExportsTabName())
}

function rangeFromEnv(envName: string, fallback: string): string {
  const override = process.env[envName]?.trim()
  return override || fallback
}

export function registrationsSheetRange(): string {
  return rangeFromEnv("GOOGLE_SHEET_RANGE_REGISTRATIONS", `${quoteSheetTab(getExportsTabName())}!A1:ZZ`)
}

export function boothAnalyticsSheetRange(): string {
  return rangeFromEnv("GOOGLE_SHEET_RANGE_BOOTH_ANALYTICS", `${quoteSheetTab(getExportsTabName())}!A1:ZZ`)
}

export function companyHistorySheetRange(): string {
  return rangeFromEnv("GOOGLE_SHEET_RANGE_COMPANY_HISTORY", `${quoteSheetTab(getExportsTabName())}!A1:ZZ`)
}

export function relationshipMatrixSheetRange(): string {
  return rangeFromEnv("GOOGLE_SHEET_RANGE_RELATIONSHIP_MATRIX", `${quoteSheetTab(getExportsTabName())}!A1:ZZ`)
}

export function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return []

  const [headerRow, ...dataRows] = rows
  const headers = headerRow.map((cell, index) => {
    const label = cell?.trim()
    return label || `column_${index + 1}`
  })

  return dataRows
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => {
      const record: Record<string, string> = {}
      for (let i = 0; i < headers.length; i++) {
        record[headers[i]] = String(row[i] ?? "")
      }
      return record
    })
}

/** Expected tab storing enriched rows from Financial Modeling Prep (manual refresh via API). */
export function getCompanyEnrichmentTabName(): string {
  return process.env.GOOGLE_SHEET_ENRICHMENT_TAB?.trim() || "Company Enrichment"
}

export const COMPANY_ENRICHMENT_TAB_MISSING_MESSAGE =
  "Company Enrichment tab not found. Please create it with the expected headers."

function parseConfidenceCell(raw: unknown): EnrichmentConfidence {
  const s = String(raw ?? "").trim().toLowerCase()
  if (s === "high" || s === "medium" || s === "low") return s
  return "low"
}

function parseNumberCell(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null
  const n = Number(String(raw).replace(/,/g, ""))
  return Number.isFinite(n) ? n : null
}

function parseRowNumberCell(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null
  if (typeof raw === "number" && Number.isInteger(raw)) return raw
  const n = parseInt(String(raw).trim(), 10)
  return Number.isInteger(n) ? n : null
}

function enrichmentHeaderCell(cellA: string): boolean {
  const a = cellA.toLowerCase().trim()
  return a === "company name" || (a.includes("company") && a.includes("name"))
}

/** Serialize enrichment row for A…O columns (aligned with sheet headers). */
export function enrichmentToSheetRow(e: CompanyEnrichment): (string | number | null)[] {
  return [
    e.companyName,
    e.sourceRowNumber ?? "",
    e.domain ?? "",
    e.ticker ?? "",
    e.cik ?? "",
    e.revenue ?? "",
    e.revenueSource ?? "",
    e.revenueFiscalYear ?? "",
    e.marketCap ?? "",
    e.marketCapSource ?? "",
    e.employees ?? "",
    e.employeesSource ?? "",
    e.confidence,
    e.lastUpdated,
    e.error ?? "",
  ]
}

function parseCompanyEnrichmentDataRow(row: unknown[], _sheetRowIndex1: number): CompanyEnrichment | null {
  const companyName = String(row[0] ?? "").trim()
  if (!companyName) return null
  return {
    companyName,
    sourceRowNumber: parseRowNumberCell(row[1]),
    domain: (() => {
      const d = String(row[2] ?? "").trim()
      return d || null
    })(),
    ticker: (() => {
      const t = String(row[3] ?? "").trim()
      return t || null
    })(),
    cik: (() => {
      const c = String(row[4] ?? "").trim()
      return c || null
    })(),
    revenue: parseNumberCell(row[5]),
    revenueSource: (() => {
      const s = String(row[6] ?? "").trim()
      return s || null
    })(),
    revenueFiscalYear: (() => {
      const s = String(row[7] ?? "").trim()
      return s || null
    })(),
    marketCap: parseNumberCell(row[8]),
    marketCapSource: (() => {
      const s = String(row[9] ?? "").trim()
      return s || null
    })(),
    employees: parseNumberCell(row[10]),
    employeesSource: (() => {
      const s = String(row[11] ?? "").trim()
      return s || null
    })(),
    confidence: parseConfidenceCell(row[12]),
    lastUpdated: String(row[13] ?? "").trim() || new Date(0).toISOString(),
    error: (() => {
      const s = String(row[14] ?? "").trim()
      return s || null
    })(),
  }
}

/**
 * Read all enrichment rows from `Company Enrichment!A1:O`.
 */
export async function readCompanyEnrichmentRows(): Promise<CompanyEnrichment[]> {
  const { spreadsheetId } = requireGoogleSheetEnv()
  const tab = quoteSheetTab(getCompanyEnrichmentTabName())
  const range = `${tab}!A1:O`
  const sheets = getSheetsClient()
  let response
  try {
    response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: "UNFORMATTED_VALUE",
    })
  } catch {
    throw new Error(COMPANY_ENRICHMENT_TAB_MISSING_MESSAGE)
  }
  const values = response.data.values as unknown[][] | undefined
  if (!values || values.length === 0) return []

  let start = 0
  const firstA = String(values[0]?.[0] ?? "").trim()
  if (enrichmentHeaderCell(firstA)) start = 1

  const out: CompanyEnrichment[] = []
  for (let i = start; i < values.length; i++) {
    const parsed = parseCompanyEnrichmentDataRow(values[i] as unknown[], i + 1)
    if (parsed) out.push(parsed)
  }
  return out
}

export async function upsertCompanyEnrichment(enrichment: CompanyEnrichment): Promise<void> {
  await upsertCompanyEnrichments([enrichment])
}

/**
 * Upsert rows into Company Enrichment tab by Source Row Number or Company Name.
 */
export async function upsertCompanyEnrichments(enrichments: CompanyEnrichment[]): Promise<void> {
  if (enrichments.length === 0) return
  const { spreadsheetId } = requireGoogleSheetEnv()
  const tab = quoteSheetTab(getCompanyEnrichmentTabName())
  const sheets = getSheetsClient()

  let grid: unknown[][]
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tab}!A1:O`,
      valueRenderOption: "UNFORMATTED_VALUE",
    })
    grid = (response.data.values as unknown[][]) ?? []
  } catch {
    throw new Error(COMPANY_ENRICHMENT_TAB_MISSING_MESSAGE)
  }

  let dataStart = 0
  const firstA = String(grid[0]?.[0] ?? "").trim()
  if (grid.length > 0 && enrichmentHeaderCell(firstA)) dataStart = 1

  const byRowNumber = new Map<number, number>()
  const byNormalizedName = new Map<string, number>()

  for (let i = dataStart; i < grid.length; i++) {
    const sheetRow = i + 1
    const row = grid[i] as unknown[]
    const rn = parseRowNumberCell(row?.[1])
    if (rn != null) byRowNumber.set(rn, sheetRow)
    const nm = String(row?.[0] ?? "").trim()
    if (nm) byNormalizedName.set(normalizeCompanyName(nm), sheetRow)
  }

  const batchUpdates: { range: string; values: unknown[][] }[] = []
  const appendRows: unknown[][] = []

  for (const e of enrichments) {
    const rowVals = enrichmentToSheetRow(e).map((cell) =>
      cell === null || cell === undefined ? "" : cell,
    )
    let sheetRow: number | undefined
    if (e.sourceRowNumber != null && byRowNumber.has(e.sourceRowNumber)) {
      sheetRow = byRowNumber.get(e.sourceRowNumber)
    } else {
      const nk = normalizeCompanyName(e.companyName)
      if (nk && byNormalizedName.has(nk)) sheetRow = byNormalizedName.get(nk)
    }

    if (sheetRow != null) {
      batchUpdates.push({
        range: `${tab}!A${sheetRow}:O${sheetRow}`,
        values: [rowVals],
      })
    } else {
      appendRows.push(rowVals)
    }
  }

  try {
    if (batchUpdates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: batchUpdates,
        },
      })
    }
    if (appendRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${tab}!A:O`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: appendRows },
      })
    }
  } catch {
    throw new Error("Could not write Company Enrichment tab in Google Sheets.")
  }
}
