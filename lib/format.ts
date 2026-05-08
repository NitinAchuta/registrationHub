// Small formatting helpers shared across views.
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—"
  return new Intl.NumberFormat("en-US").format(n)
}

export function formatPercent(n: number | null | undefined, decimals = 0): string {
  if (n == null || !Number.isFinite(n)) return "—"
  return `${n.toFixed(decimals)}%`
}

export function semesterLabel(code: string): string {
  const map: Record<string, string> = {
    S22: "Spring 2022",
    F22: "Fall 2022",
    S23: "Spring 2023",
    F23: "Fall 2023",
    S24: "Spring 2024",
    F24: "Fall 2024",
    S25: "Spring 2025",
    F25: "Fall 2025",
    S26: "Spring 2026",
    F26: "Fall 2026",
  }
  return map[code] ?? code
}

export function shortSemesterLabel(code: string): string {
  const map: Record<string, string> = {
    S22: "Sp22",
    F22: "Fa22",
    S23: "Sp23",
    F23: "Fa23",
    S24: "Sp24",
    F24: "Fa24",
    S25: "Sp25",
    F25: "Fa25",
    S26: "Sp26",
    F26: "Fa26",
  }
  return map[code] ?? code
}

/** Extract major code from "Civil Engineering (CVEN)" or pass-through if already a code. */
export function extractMajorCode(label: string | null | undefined): string | null {
  if (!label) return null
  const m = String(label).match(/\(([A-Z]{3,5})\)/)
  if (m) return m[1]
  const upper = label.trim().toUpperCase()
  if (/^[A-Z]{3,5}$/.test(upper)) return upper
  return null
}

export function dayLabelFromDaysAttending(s: string | null | undefined): string {
  if (!s) return "—"
  const has1 = /day\s*1|wednesday/i.test(s)
  const has2 = /day\s*2|thursday/i.test(s)
  if (has1 && has2) return "Both Days"
  if (has1) return "Day 1 (Wed)"
  if (has2) return "Day 2 (Thu)"
  return s
}
