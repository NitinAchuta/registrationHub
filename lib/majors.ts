export type MajorCode =
  | "AERO"
  | "AREN"
  | "BAEN"
  | "BMEN"
  | "CHEN"
  | "CVEN"
  | "CPEN"
  | "CPSC"
  | "DAEN"
  | "ELEN"
  | "ESET"
  | "EVEN"
  | "IDIS"
  | "INEN"
  | "ITDE"
  | "MMET"
  | "MSEN"
  | "MEEN"
  | "MXET"
  | "NUEN"
  | "OCEN"
  | "PETE"

export const MAJORS = [
  { code: "AERO", name: "Aerospace Engineering" },
  { code: "AREN", name: "Architectural Engineering" },
  { code: "BAEN", name: "Biological and Agricultural Engineering" },
  { code: "BMEN", name: "Biomedical Engineering" },
  { code: "CHEN", name: "Chemical Engineering" },
  { code: "CVEN", name: "Civil Engineering" },
  { code: "CPEN", name: "Computer Engineering" },
  { code: "CPSC", name: "Computer Science" },
  { code: "DAEN", name: "Data Engineering" },
  { code: "ELEN", name: "Electrical Engineering" },
  { code: "ESET", name: "Electronic Systems Engineering Technology" },
  { code: "EVEN", name: "Environmental Engineering" },
  { code: "IDIS", name: "Industrial Distribution" },
  { code: "INEN", name: "Industrial Engineering" },
  { code: "ITDE", name: "Interdisciplinary Engineering" },
  { code: "MMET", name: "Manufacturing and Mechanical Engineering Technology" },
  { code: "MSEN", name: "Materials Science and Engineering" },
  { code: "MEEN", name: "Mechanical Engineering" },
  { code: "MXET", name: "Multidisciplinary Engineering Technology" },
  { code: "NUEN", name: "Nuclear Engineering" },
  { code: "OCEN", name: "Ocean Engineering" },
  { code: "PETE", name: "Petroleum Engineering" },
] as const

const byCode = Object.fromEntries(MAJORS.map((m) => [m.code, m.name])) as Record<MajorCode, string>
const nameToCode = new Map<string, MajorCode>()
for (const m of MAJORS) {
  nameToCode.set(m.name.toLowerCase(), m.code)
  nameToCode.set(`${m.name} (${m.code})`.toLowerCase(), m.code)
}

export function getMajorName(code: MajorCode): string {
  return byCode[code] ?? code
}

export function getMajorLabel(code: MajorCode): string {
  return `${getMajorName(code)} (${code})`
}

/** Accepts a major code or a full (or partial) name; returns a code when possible. */
export function normalizeMajor(value: string | null | undefined): MajorCode | null {
  if (value == null || !String(value).trim()) return null
  const t = String(value).trim()
  const upper = t.toUpperCase()
  if (upper in byCode) return upper as MajorCode
  const paren = t.match(/\(([A-Z]{2,5})\)/i)?.[1]?.toUpperCase()
  if (paren && paren in byCode) return paren as MajorCode
  const lower = t.toLowerCase()
  if (nameToCode.has(lower)) return nameToCode.get(lower)!
  for (const m of MAJORS) {
    if (lower.includes(m.code.toLowerCase())) return m.code
    if (lower.includes(m.name.toLowerCase())) return m.code
  }
  return null
}

export const MAJOR_CODES_ORDERED: MajorCode[] = MAJORS.map((m) => m.code)
