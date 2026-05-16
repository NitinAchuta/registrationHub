import { normalizeCompanyName } from "./companyNormalizer"

/** @deprecated Use normalizeCompanyName from lib/companyNormalizer */
export function normalizeCompanyNameForMatch(raw: string | null | undefined): string {
  return normalizeCompanyName(raw ?? "")
}