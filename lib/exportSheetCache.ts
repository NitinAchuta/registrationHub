import { unstable_cache } from "next/cache"
import { readExportSheet } from "./googleSheets"
import { parseExportRows, type F26Registration } from "./parseExportCompanies"

async function loadParsedExportInternal(): Promise<F26Registration[]> {
  const rows = await readExportSheet()
  return parseExportRows(rows)
}

export const getCachedParsedExport = unstable_cache(loadParsedExportInternal, ["export-sheet-parsed-v2"], {
  revalidate: 86400,
  tags: ["export-sheet-data"],
})

/** Bypass Next.js fetch cache — use after `revalidateTag` or when `?force=true` on the export API. */
export async function getFreshParsedExport(): Promise<F26Registration[]> {
  return loadParsedExportInternal()
}
