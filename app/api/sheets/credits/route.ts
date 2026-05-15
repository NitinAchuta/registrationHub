import { NextResponse } from "next/server"
import {
  appendCreditRow,
  CREDITS_TAB_ERROR,
  fetchCreditsSheetRows,
  filterCreditsRows,
} from "@/lib/creditsGoogleSheet"
import { missingGoogleCredentialsMessage, requireGoogleSheetEnv } from "@/lib/googleSheets"

export async function GET(request: Request) {
  try {
    requireGoogleSheetEnv()
  } catch {
    return NextResponse.json({ error: missingGoogleCredentialsMessage() }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const rowParam = searchParams.get("rowNumber")
  const companyName = searchParams.get("companyName")?.trim() || null

  let rowNumber: number | null = null
  if (rowParam != null && rowParam !== "") {
    const n = Number.parseInt(rowParam, 10)
    if (!Number.isInteger(n) || n < 2) {
      return NextResponse.json({ error: "Invalid rowNumber." }, { status: 400 })
    }
    rowNumber = n
  }

  if (rowNumber == null && !companyName) {
    return NextResponse.json(
      { error: "Provide rowNumber and/or companyName query parameters." },
      { status: 400 },
    )
  }

  try {
    const rows = await fetchCreditsSheetRows()
    const data = filterCreditsRows(rows, { rowNumber, companyName })
    return NextResponse.json(
      { ok: true, data },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : CREDITS_TAB_ERROR
    const status = msg === CREDITS_TAB_ERROR ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function POST(request: Request) {
  try {
    requireGoogleSheetEnv()
  } catch {
    return NextResponse.json({ error: missingGoogleCredentialsMessage() }, { status: 500 })
  }

  let body: {
    companyName?: string
    rowNumber?: number
    amount?: number
    reason?: string
    createdBy?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : ""
  if (!companyName) {
    return NextResponse.json({ error: "companyName is required." }, { status: 400 })
  }

  const amount =
    typeof body.amount === "number"
      ? body.amount
      : typeof body.amount === "string"
        ? Number.parseFloat(body.amount)
        : NaN
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 })
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  if (!reason) {
    return NextResponse.json({ error: "Reason is required." }, { status: 400 })
  }

  let rowNumber: number | undefined
  if (body.rowNumber !== undefined && body.rowNumber !== null) {
    const n = Number(body.rowNumber)
    if (!Number.isInteger(n) || n < 2) {
      return NextResponse.json({ error: "Invalid rowNumber." }, { status: 400 })
    }
    rowNumber = n
  }

  const createdBy =
    typeof body.createdBy === "string" && body.createdBy.trim() ? body.createdBy.trim() : "Dashboard"

  const createdAt = new Date().toISOString()

  try {
    await appendCreditRow({
      companyName,
      rowNumber,
      amount,
      reason,
      createdAt,
      createdBy,
    })
    const credit = {
      id: `new-${createdAt}-${amount}`,
      companyName,
      rowNumber,
      amount,
      reason,
      createdAt,
      createdBy,
      source: "google_sheet" as const,
    }
    return NextResponse.json({ ok: true, success: true, credit })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update Google Sheet."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
