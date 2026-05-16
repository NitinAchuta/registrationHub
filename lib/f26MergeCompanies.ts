import type { CompanyRecord, RegistrationRow, SemesterCode } from "./types"
import type { F26RegistrationOverride } from "./f26Registration"
import { ACTIVE_FAIR } from "./fairConfig"
import { normalizeCompanyNameForMatch } from "./companyNameMatch"

/** Active-cycle registration: history first, then currentRegistration if semester matches. */
export function resolveRegistrationForSemester(
  company: CompanyRecord,
  semester: SemesterCode = ACTIVE_FAIR.code,
): RegistrationRow | null {
  const fromHistory = company.registrationHistory[semester]
  if (fromHistory) return fromHistory
  const cur = company.currentRegistration
  if (cur?.semester === semester) return cur
  return null
}

/**
 * Overlay Google Sheets F26 Export registrations onto the historical Excel dataset.
 * Clears stale currentRegistration rows from other semesters (e.g. S26 in generated JSON).
 */
export function mergeF26ExportOntoCompanies(
  historical: CompanyRecord[],
  exportCompanies: CompanyRecord[],
  semester: SemesterCode = "F26",
): CompanyRecord[] {
  const exportByNorm = new Map<string, CompanyRecord>()
  for (const c of exportCompanies) {
    const norm = normalizeCompanyNameForMatch(c.canonicalName)
    if (norm) exportByNorm.set(norm, c)
  }

  const matchedExport = new Set<string>()

  const merged = historical.map((c) => {
    const norm = normalizeCompanyNameForMatch(c.canonicalName)
    const exportCo = norm ? exportByNorm.get(norm) : undefined

    if (!exportCo || semester !== "F26") {
      if (semester === "F26" && c.currentRegistration?.semester !== "F26") {
        return { ...c, currentRegistration: null }
      }
      return c
    }

    matchedExport.add(norm!)
    const exportReg =
      exportCo.registrationHistory[semester] ??
      (exportCo.currentRegistration?.semester === semester ? exportCo.currentRegistration : null)

    if (!exportReg) {
      return { ...c, currentRegistration: null }
    }

    return {
      ...c,
      currentRegistration: exportReg,
      registrationHistory: { ...c.registrationHistory, [semester]: exportReg },
      sources: [...new Set([...c.sources, ...exportCo.sources])],
    }
  })

  for (const [norm, exportCo] of exportByNorm) {
    if (matchedExport.has(norm)) continue
    merged.push(exportCo)
  }

  return merged
}

/** Apply coordinator overrides (local persistence) to Export-based F26 companies only. */
export function applyF26Overrides(
  base: CompanyRecord[],
  overrides: Record<string, F26RegistrationOverride>,
  semester: SemesterCode,
): CompanyRecord[] {
  return base.map((c) => {
    const full = overrides[c.id]?.fullRegistration
    if (!full || semester !== "F26") return c
    return {
      ...c,
      currentRegistration: full,
      registrationHistory: { ...c.registrationHistory, [semester]: full },
    }
  })
}
