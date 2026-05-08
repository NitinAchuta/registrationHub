// Lightweight runtime helpers for company-name normalization. Mirrors the rules
// used during build-time generation so user-entered names (e.g. CSV imports)
// can match canonical records.

const COMPANY_SUFFIX_PATTERNS = [
  /\b(incorporated|inc\.?)\b/gi,
  /\b(corporation|corp\.?)\b/gi,
  /\b(company|co\.?)\b/gi,
  /\bllc\b/gi,
  /\bllp\b/gi,
  /\bltd\.?\b/gi,
  /\blimited\b/gi,
  /\blp\b/gi,
  /\bplc\b/gi,
  /\busa\b/gi,
  /\bu\.?s\.?(\s|$)/gi,
  /\bnorth\s+america\b/gi,
]
const PARTNER_SUFFIX = /\((platinum|gold|silver|bronze)\s+partner\)/gi

export function stripPartnerSuffix(name: string): string {
  return String(name).replace(PARTNER_SUFFIX, "").replace(/\s+/g, " ").trim()
}

export function normalizeCompanyName(name: string): string {
  if (!name) return ""
  let s = String(name).replace(/\s+/g, " ").trim().toLowerCase()
  s = s.replace(PARTNER_SUFFIX, "")
  s = s.replace(/&/g, " and ")
  s = s.replace(/[\u2018\u2019\u201A]/g, "'")
  s = s.replace(/[\u201C\u201D]/g, '"')
  s = s.replace(/\([^)]*\)/g, " ")
  for (const re of COMPANY_SUFFIX_PATTERNS) s = s.replace(re, " ")
  s = s.replace(/[.,;:!?]/g, " ")
  s = s.replace(/[^a-z0-9]+/g, " ")
  s = s.replace(/\s+/g, " ").trim()
  return s
}

export function getCompanySlug(name: string): string {
  return stripPartnerSuffix(name)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

export function areCompanyNamesEquivalent(a: string, b: string): boolean {
  if (!a || !b) return false
  return normalizeCompanyName(a) === normalizeCompanyName(b)
}
