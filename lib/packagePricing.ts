/**
 * Fall 2026 SEC career fair package pricing (canonical tiers + durations).
 */
import type { ParsedPackage } from "./types"
import type { PackageTier, FairDuration } from "./f26Registration"

export type PackagePriceMap = Record<string, number>

export const DEFAULT_F26_PACKAGE_PRICING: PackagePriceMap = {
  "Basic One-Day": 1000,
  "Basic Two-Day": 2000,
  "Silver One-Day": 1800,
  "Silver Two-Day": 3000,
  "Gold One-Day": 2500,
  "Gold Two-Day": 5500,
  "Diamond One-Day": 4000,
  "Diamond Two-Day": 8000,
  "Maroon One-Day": 6500,
  "Maroon Two-Day": 12500,
}

/** @deprecated Use DEFAULT_F26_PACKAGE_PRICING — kept for localStorage migration. */
export const DEFAULT_PACKAGE_PRICING: PackagePriceMap = { ...DEFAULT_F26_PACKAGE_PRICING }

export function packageComboKey(tier: PackageTier, duration: FairDuration): string {
  return `${tier} ${duration}`
}

export function getPackagePriceByTierDuration(
  tier: PackageTier,
  duration: FairDuration,
  pricing: PackagePriceMap = DEFAULT_F26_PACKAGE_PRICING,
): number {
  return pricing[packageComboKey(tier, duration)] ?? 0
}

export function getPackageKey(pkg: ParsedPackage): string | null {
  if (!pkg) return null
  const raw = (pkg.tier ?? "Basic").toString()
  const tierLower = raw.toLowerCase()
  const normalizedTier: string =
    tierLower === "platinum"
      ? "Maroon"
      : tierLower === "bronze"
        ? "Basic"
        : tierLower.charAt(0).toUpperCase() + tierLower.slice(1)
  const tier =
    ["Basic", "Silver", "Gold", "Diamond", "Maroon"].includes(normalizedTier) ? normalizedTier : "Basic"
  const d = pkg.days ?? "One-Day"
  const days = d === "Two-Day" || String(d).toLowerCase().includes("two") ? "Two-Day" : "One-Day"
  return `${tier} ${days}`
}

export function getPackagePrice(
  pkg: ParsedPackage,
  pricing: PackagePriceMap = DEFAULT_F26_PACKAGE_PRICING,
): number | null {
  if (!pkg) return null
  if (pkg.priceUSD != null) return pkg.priceUSD
  const key = getPackageKey(pkg)
  if (!key) return null
  return pricing[key] ?? null
}

export function getIncludedBooths(tier: PackageTier): number {
  const m: Record<PackageTier, number> = {
    Basic: 1,
    Silver: 1,
    Gold: 2,
    Diamond: 3,
    Maroon: 4,
  }
  return m[tier] ?? 1
}

export function getIncludedReps(tier: PackageTier): number {
  const m: Record<PackageTier, number> = {
    Basic: 3,
    Silver: 5,
    Gold: 8,
    Diamond: 15,
    Maroon: 20,
  }
  return m[tier] ?? 3
}

export type EstimatedRegistrationValueInput = {
  packageTier: PackageTier
  duration: FairDuration
  representativeCount: number
  poweredBooth: boolean
  virtualFair?: boolean
  pricing?: PackagePriceMap
}

export function calculateEstimatedPackageValue(input: EstimatedRegistrationValueInput): number {
  const base = getPackagePriceByTierDuration(input.packageTier, input.duration, input.pricing)
  const included = getIncludedReps(input.packageTier)
  const extraReps = Math.max(0, input.representativeCount - included)
  const repAddOn = extraReps * 100
  const powerAddOn = input.poweredBooth ? 50 : 0
  return base + repAddOn + powerAddOn
}

export const LOCAL_STORAGE_KEYS = {
  packagePricing: "sec-career-fair-package-prices",
  assignments: "sec-career-fair-assignments",
  notes: "sec-career-fair-company-notes",
  credits: "sec-career-fair-credits",
  companyCredits: "sec-career-fair-company-credits",
  chat: "sec-career-fair-chat",
  welcomeSocial: "sec-career-fair-welcome-social",
  resolvedMissingInfo: "sec-career-fair-resolved-missing-info",
  registrationOverrides: "sec-career-fair-registration-overrides",
  manualF26Registrations: "sec-career-fair-f26-manual-registrations",
  boothAnalyticsOverrides: "sec-career-fair-booth-analytics-overrides",
} as const
