import { normalizeCompanyName } from "@/lib/companyNormalizer"
import type { HistoricalCompanyProfile } from "@/lib/types"

export type HistoricalProfileLookup = {
  profile: HistoricalCompanyProfile | null
  ambiguous: boolean
}

export function findHistoricalProfile(
  companyName: string,
  profiles: HistoricalCompanyProfile[],
  profilesByNorm?: Map<string, HistoricalCompanyProfile>,
): HistoricalProfileLookup {
  const map =
    profilesByNorm ??
    new Map(
      profiles
        .filter((p) => p.normalizedCompanyName)
        .map((p) => [p.normalizedCompanyName, p] as const),
    )

  const norm = normalizeCompanyName(companyName)
  if (!norm) return { profile: null, ambiguous: false }

  const exact = map.get(norm)
  if (exact) return { profile: exact, ambiguous: false }

  const containsMatches = profiles.filter((p) => {
    const pn = p.normalizedCompanyName
    if (!pn) return false
    if (norm.length < 5 && pn.length < 5) return false
    return (norm.length >= 5 && pn.includes(norm)) || (pn.length >= 5 && norm.includes(pn))
  })

  if (containsMatches.length === 1) return { profile: containsMatches[0]!, ambiguous: false }
  if (containsMatches.length > 1) return { profile: null, ambiguous: true }
  return { profile: null, ambiguous: false }
}

export function historicalMatchLabel(
  companyName: string,
  profiles: HistoricalCompanyProfile[],
): "Found" | "Not Found" | "Multiple" {
  const { profile, ambiguous } = findHistoricalProfile(companyName, profiles)
  if (ambiguous) return "Multiple"
  return profile ? "Found" : "Not Found"
}
