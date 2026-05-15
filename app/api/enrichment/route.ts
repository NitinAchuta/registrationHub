import { NextResponse } from "next/server"
import {
  missingGoogleCredentialsMessage,
  readCompanyEnrichmentRows,
  requireGoogleSheetEnv,
} from "@/lib/googleSheets"

/**
 * GET enrichment rows from the private `Company Enrichment` tab (no FMP calls).
 * Optional ?rowNumber= matches Source Row Number (best row wins if duplicates).
 */
export async function GET(request: Request) {
  try {
    requireGoogleSheetEnv()
  } catch {
    return NextResponse.json({ error: missingGoogleCredentialsMessage() }, { status: 500 })
  }

  try {
    const rowNumberParam = new URL(request.url).searchParams.get("rowNumber")
    const rows = await readCompanyEnrichmentRows()

    if (rowNumberParam != null && rowNumberParam.trim() !== "") {
      const rn = Number.parseInt(rowNumberParam, 10)
      if (!Number.isInteger(rn) || rn < 1) {
        return NextResponse.json({ error: "Invalid rowNumber." }, { status: 400 })
      }
      const matches = rows.filter((r) => r.sourceRowNumber === rn)
      const sorted = [...matches].sort(
        (a, b) => Date.parse(b.lastUpdated || "") - Date.parse(a.lastUpdated || ""),
      )
      const pick = sorted[0] ?? null
      return NextResponse.json(
        { ok: true, data: pick },
        { headers: { "Cache-Control": "private, no-store" } },
      )
    }

    return NextResponse.json(
      { ok: true, data: rows },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Could not read Company Enrichment from Google Sheets."
    console.error("[api/enrichment]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
