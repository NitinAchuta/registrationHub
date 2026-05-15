import type { CompanyRecord, SemesterCode } from "./types"
import type { F26RegistrationOverride } from "./f26Registration"

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
