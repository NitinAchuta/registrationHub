import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { appendCompanyNote } from "@/lib/googleSheets"
import { requireGoogleSheetEnv, missingGoogleCredentialsMessage } from "@/lib/googleSheets"

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

  let body: { text?: string; author?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const text = typeof body.text === "string" ? body.text.trim() : ""
  if (!text) {
    return NextResponse.json({ error: "Note text is required." }, { status: 400 })
  }

  const author = typeof body.author === "string" ? body.author.trim() : undefined

  try {
    const { columnLetter, cell, note } = await appendCompanyNote(rowNumber, text, author)
    revalidateTag("export-sheet-data", "max")
    return NextResponse.json({
      success: true,
      column: columnLetter,
      cell,
      note,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update Google Sheet."
    const status = message.includes("No empty note") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
