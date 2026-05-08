// Quick structural inspection of the three workbooks.
// Run: node scripts/inspect-excel.mjs
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const XLSX = require("xlsx")

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, "..")
const dataDir = path.join(root, "data")

const files = [
  "(August 21st) F25 Company Selection Output.xlsx",
  "Relationship with A&M Matrix.xlsx",
  "RGCompanyDashboard_PoC.xlsx",
]

const truncate = (s, n = 80) =>
  String(s).replace(/\s+/g, " ").slice(0, n) + (String(s).length > n ? "…" : "")

for (const file of files) {
  const fp = path.join(dataDir, file)
  console.log("\n" + "=".repeat(90))
  console.log("WORKBOOK:", file)
  console.log("=".repeat(90))
  let wb
  try {
    wb = XLSX.readFile(fp, { cellDates: true, cellNF: false })
  } catch (e) {
    console.log("  ! could not open:", e?.message)
    continue
  }
  console.log("  Sheets:", wb.SheetNames.join(" | "))

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    if (!ws) continue
    const ref = ws["!ref"]
    const json = XLSX.utils.sheet_to_json(ws, {
      defval: null,
      blankrows: false,
      raw: false,
    })
    console.log("\n  --- SHEET:", JSON.stringify(name), "ref:", ref, "rows:", json.length, "---")
    if (json.length === 0) {
      // Try header detection
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: null })
      console.log("    (empty as object) AOA rows:", aoa.length)
      if (aoa.length > 0) {
        console.log("    first row:", aoa[0]?.map((v) => truncate(v ?? "", 40)))
      }
      continue
    }
    const headers = Object.keys(json[0] ?? {})
    console.log("    Headers (" + headers.length + "):")
    for (const h of headers) console.log("      -", JSON.stringify(h))

    // sample 3 rows
    const sample = json.slice(0, 3)
    sample.forEach((row, i) => {
      console.log("    Row " + (i + 1) + ":")
      for (const h of headers) {
        const v = row[h]
        if (v == null || v === "") continue
        console.log("       ", JSON.stringify(h), "=>", truncate(typeof v === "string" ? v : JSON.stringify(v), 80))
      }
    })
  }
}
