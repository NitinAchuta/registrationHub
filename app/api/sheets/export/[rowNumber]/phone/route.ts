import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { updateCompanyPhone, requireGoogleSheetEnv, missingGoogleCredentialsMessage } from "@/lib/googleSheets"

function parseRowNumber(param: string): number | null {
  const n = Number.parseInt(param, 10)
  if (!Number.isInteger(n) || n < 2) return null
  return n
}

export async function POST(
  request: Request,
  context: { params: Promise<{ rowNumber: string }> },
) {
  try {
    requireGoogleSheetEnv()
  } catch {
    return NextResponse.json({ error: missingGoogleCredentialsMessage() }, { status: 500 })
  }

  const { rowNumber: rowParam } = await context.params
  const rowNumber = parseRowNumber(rowParam)
  if (rowNumber === null) {
    return NextResponse.json({ error: "Invalid row number." }, { status: 400 })
  }

  let body: { phone?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : ""
  if (!phone) {
    return NextResponse.json({ error: "Phone is required." }, { status: 400 })
  }

  try {
    await updateCompanyPhone(rowNumber, phone)
    revalidateTag("export-sheet-data", "max")
    return NextResponse.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update Google Sheet."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
