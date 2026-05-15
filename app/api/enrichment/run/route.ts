import { NextResponse } from "next/server"
import { enrichCompanyFromRegistration } from "@/lib/enrichment/enrichCompany"
import { requireFmpApiKey } from "@/lib/enrichment/fmpClient"
import { parseExportRows } from "@/lib/parseExportCompanies"
import type { CompanyEnrichment } from "@/lib/types"
import {
  missingGoogleCredentialsMessage,
  readCompanyEnrichmentRows,
  readExportSheet,
  requireGoogleSheetEnv,
  upsertCompanyEnrichments,
} from "@/lib/googleSheets"

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseLastUpdated(iso: string): Date | null {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return new Date(t)
}

/**
 * POST manually refresh company enrichment via FMP → Google Sheets `Company Enrichment` tab.
 * Body: { force?: boolean; rowNumber?: number } — if `rowNumber` is set, only that Export row is processed (saves API quota).
 */
export async function POST(request: Request) {
  try {
    requireGoogleSheetEnv()
  } catch {
    return NextResponse.json({ error: missingGoogleCredentialsMessage() }, { status: 500 })
  }

  try {
    requireFmpApiKey()
  } catch (e) {
    const message = e instanceof Error ? e.message : "FMP_API_KEY is not configured."
    return NextResponse.json({ error: message }, { status: 500 })
  }

  let force = false
  let rowFilter: number | null = null
  try {
    const body = (await request.json().catch(() => ({}))) as {
      force?: boolean
      rowNumber?: number | string | null
    }
    force = Boolean(body?.force)
    const rn = body?.rowNumber
    if (rn != null && rn !== "") {
      const n = typeof rn === "number" ? rn : Number.parseInt(String(rn), 10)
      if (!Number.isInteger(n) || n < 2) {
        return NextResponse.json({ error: "Invalid rowNumber." }, { status: 400 })
      }
      rowFilter = n
    }
  } catch {
    force = false
    rowFilter = null
  }

  try {
    const grid = await readExportSheet()
    let registrations = parseExportRows(grid)

    if (rowFilter != null) {
      registrations = registrations.filter((r) => r.rowNumber === rowFilter)
      if (registrations.length === 0) {
        return NextResponse.json(
          { error: "No Export row found for this row number." },
          { status: 404 },
        )
      }
    }

    let existing: CompanyEnrichment[] = []
    try {
      existing = await readCompanyEnrichmentRows()
    } catch (readErr) {
      const message =
        readErr instanceof Error ? readErr.message : "Could not read Company Enrichment tab."
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const existingByRow = new Map<number, CompanyEnrichment>()
    for (const row of existing) {
      if (row.sourceRowNumber == null) continue
      const prev = existingByRow.get(row.sourceRowNumber)
      if (!prev || Date.parse(row.lastUpdated || "") > Date.parse(prev.lastUpdated || "")) {
        existingByRow.set(row.sourceRowNumber, row)
      }
    }

    const toEnrich: typeof registrations = []
    let skippedFresh = 0

    for (const reg of registrations) {
      if (!force) {
        const prev = existingByRow.get(reg.rowNumber)
        const lu = prev?.lastUpdated ? parseLastUpdated(prev.lastUpdated) : null
        if (lu != null && Date.now() - lu.getTime() < THIRTY_DAYS_MS) {
          skippedFresh++
          continue
        }
      }
      toEnrich.push(reg)
    }

    const results: CompanyEnrichment[] = []
    const errors: { companyName: string; rowNumber: number; message: string }[] = []

    const processOne = async (reg: (typeof registrations)[number]) => {
      const row = await enrichCompanyFromRegistration({
        companyName: reg.companyName,
        rowNumber: reg.rowNumber,
        email: reg.email,
      })
      results.push(row)
      if (row.error?.trim()) {
        errors.push({
          companyName: reg.companyName,
          rowNumber: reg.rowNumber,
          message: row.error,
        })
      }
    }

    if (toEnrich.length > 100) {
      for (const reg of toEnrich) {
        await processOne(reg)
        await delay(350)
      }
    } else {
      const chunkSize = 3
      for (let i = 0; i < toEnrich.length; i += chunkSize) {
        const chunk = toEnrich.slice(i, i + chunkSize)
        await Promise.all(chunk.map((reg) => processOne(reg)))
        if (i + chunkSize < toEnrich.length) await delay(200)
      }
    }

    try {
      await upsertCompanyEnrichments(results)
    } catch (writeErr) {
      const message =
        writeErr instanceof Error ? writeErr.message : "Could not write Company Enrichment tab."
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const lowConfidence = results.filter((r) => r.confidence === "low").length

    return NextResponse.json({
      success: true,
      totalCompanies: registrations.length,
      enriched: results.length,
      skippedFresh,
      lowConfidence,
      errors,
      results,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Enrichment run failed."
    console.error("[api/enrichment/run]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
