/**
 * Google Sheets `Credits` tab: append/read credit rows (server-only).
 * Columns: A Company Name, B Source Row Number, C Amount, D Reason, E Created At, F Created By
 */

import type { CompanyCredit } from "./types"
import { getSheetsClient, quoteSheetTab, requireGoogleSheetEnv } from "./googleSheets"

export const CREDITS_TAB_ERROR =
  "Credits tab not found. Please add a Credits tab with the expected columns."

export function getCreditsTabName(): string {
  return process.env.GOOGLE_SHEET_CREDITS_TAB?.trim() || "Credits"
}

function normalizeCompanyName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ")
}

export async function fetchCreditsSheetRows(): Promise<unknown[][]> {
  const { spreadsheetId } = requireGoogleSheetEnv()
  const tab = quoteSheetTab(getCreditsTabName())
  const sheets = getSheetsClient()
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tab}!A:F`,
      valueRenderOption: "UNFORMATTED_VALUE",
    })
    return (res.data.values ?? []) as unknown[][]
  } catch {
    throw new Error(CREDITS_TAB_ERROR)
  }
}

/** Parse grid into CompanyCredit[], optionally filtered by Export row number or company name. */
export function filterCreditsRows(
  rows: unknown[][],
  opts: { rowNumber?: number | null; companyName?: string | null },
): CompanyCredit[] {
  const out: CompanyCredit[] = []
  let start = 0
  if (rows.length > 0) {
    const a = String(rows[0][0] ?? "").toLowerCase()
    if (a.includes("company") && (a.includes("name") || a === "company")) start = 1
  }

  const targetRn = opts.rowNumber != null && Number.isInteger(opts.rowNumber) ? opts.rowNumber : null
  const targetNm = opts.companyName?.trim() ? normalizeCompanyName(opts.companyName) : null

  for (let i = start; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    const companyName = String(row[0] ?? "").trim()
    const rnRaw = row[1]
    const rn =
      rnRaw === "" || rnRaw === undefined || rnRaw === null
        ? undefined
        : Number(rnRaw)
    const amount = Number(row[2])
    const reason = String(row[3] ?? "").trim()
    const createdAt = String(row[4] ?? "").trim()
    const createdBy = String(row[5] ?? "").trim()

    if (!companyName || Number.isNaN(amount) || !reason) continue

    const matchesRn = targetRn != null && Number.isInteger(rn) && rn === targetRn
    const matchesNm = targetNm != null && normalizeCompanyName(companyName) === targetNm

    if (targetRn != null) {
      if (!matchesRn) continue
    } else if (targetNm != null) {
      if (!matchesNm) continue
    }

    const sheetRow = i + 1
    out.push({
      id: `sheet-${sheetRow}-${createdAt}-${amount}`,
      companyName,
      rowNumber: Number.isInteger(rn) ? rn : undefined,
      amount,
      reason,
      createdAt: createdAt || "—",
      createdBy: createdBy || undefined,
      source: "google_sheet",
    })
  }
  return out
}

export async function appendCreditRow(entry: {
  companyName: string
  rowNumber?: number
  amount: number
  reason: string
  createdAt: string
  createdBy: string
}): Promise<void> {
  const { spreadsheetId } = requireGoogleSheetEnv()
  const tab = quoteSheetTab(getCreditsTabName())
  const sheets = getSheetsClient()
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tab}!A:F`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [
          [
            entry.companyName.trim(),
            entry.rowNumber ?? "",
            entry.amount,
            entry.reason.trim(),
            entry.createdAt,
            entry.createdBy.trim(),
          ],
        ],
      },
    })
  } catch {
    throw new Error(CREDITS_TAB_ERROR)
  }
}
