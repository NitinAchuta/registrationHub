/**
 * Default career-fair package pricing. The Excel files contain price tags in
 * the package strings (e.g. "Basic One-Day [$1000.00]"); when those are present
 * we trust them. This map is used as a fallback when no inline price is found
 * and as a knob coordinators can tweak in the Career Fair Analytics view.
 */
import type { ParsedPackage } from "./types"

export type PackagePriceMap = Record<string, number>

export const DEFAULT_PACKAGE_PRICING: PackagePriceMap = {
  "Platinum Two-Day": 7500,
  "Platinum One-Day": 5000,
  "Gold Two-Day": 4000,
  "Gold One-Day": 2500,
  "Silver Two-Day": 3000,
  "Silver One-Day": 1500,
  "Bronze Two-Day": 2000,
  "Bronze One-Day": 1000,
  "Basic Two-Day": 2000,
  "Basic One-Day": 1000,
}

export function getPackageKey(pkg: ParsedPackage): string | null {
  if (!pkg) return null
  const tier = pkg.tier ?? "Basic"
  const days = pkg.days ?? "One-Day"
  return `${tier} ${days}`
}

export function getPackagePrice(
  pkg: ParsedPackage,
  pricing: PackagePriceMap = DEFAULT_PACKAGE_PRICING,
): number | null {
  if (!pkg) return null
  if (pkg.priceUSD != null) return pkg.priceUSD
  const key = getPackageKey(pkg)
  if (!key) return null
  return pricing[key] ?? null
}

/**
 * localStorage keys for editable coordinator-side state.
 *
 * IMPORTANT: Excel workbooks (Spring 2026 and earlier) are the source of truth
 * for status, package, registration metadata, hires, attendance, and the
 * relationship matrix. Coordinator edits in the dashboard are **additive**:
 * they live alongside Excel data, not on top of it. We deliberately do not
 * keep a "status override" key here so that nothing the user clicks in the
 * dashboard can mask the value coming from the workbook.
 */
export const LOCAL_STORAGE_KEYS = {
  packagePricing: "sec-career-fair-package-prices",
  assignments: "sec-career-fair-assignments",
  notes: "sec-career-fair-company-notes",
  credits: "sec-career-fair-credits",
  chat: "sec-career-fair-chat",
  welcomeSocial: "sec-career-fair-welcome-social",
  resolvedMissingInfo: "sec-career-fair-resolved-missing-info",
} as const
