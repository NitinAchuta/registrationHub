import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { getCachedParsedExport, getFreshParsedExport } from "@/lib/exportSheetCache"
import {
  missingGoogleCredentialsMessage,
  requireGoogleSheetEnv,
} from "@/lib/googleSheets"

/**
 * GET parsed F26 rows from the private `Export` tab (24h server cache).
 * Share the spreadsheet with the service account as Editor if using writes.
 * ?force=true invalidates server cache (e.g. after phone/note updates).
 */
export async function GET(request: Request) {
  try {
    requireGoogleSheetEnv()
  } catch {
    return NextResponse.json({ error: missingGoogleCredentialsMessage() }, { status: 500 })
  }

  try {
    const force = new URL(request.url).searchParams.get("force") === "true"
    if (force) {
      revalidateTag("export-sheet-data", "max")
    }
    // Same-request invalidation does not always refill unstable_cache; read Sheets directly when forcing.
    const data = force ? await getFreshParsedExport() : await getCachedParsedExport()
    return NextResponse.json(
      { ok: true, data },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load Export data."
    console.error("[api/sheets/export]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
