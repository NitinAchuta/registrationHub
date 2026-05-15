import { NextResponse } from "next/server"
import {
  readSheetRange,
  rowsToObjects,
  boothAnalyticsSheetRange,
} from "@/lib/googleSheets"

/** Data is read from the whole `Export` tab by default (or GOOGLE_SHEET_RANGE_BOOTH_ANALYTICS if set). */
const RANGE = boothAnalyticsSheetRange()

export async function GET() {
  try {
    const rows = await readSheetRange(RANGE)
    const data = rowsToObjects(rows)
    return NextResponse.json({ range: RANGE, count: data.length, data })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read booth analytics from Google Sheets"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
