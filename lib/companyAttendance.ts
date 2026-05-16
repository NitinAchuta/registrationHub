import type { CompanyRecord, SemesterCode } from "./types"
import { ACTIVE_FAIR, HISTORICAL_FAIRS } from "./fairConfig"
import { mapRawStatus } from "./statusMapping"

const FAIR_SEMESTER_ORDER: SemesterCode[] = [
  ACTIVE_FAIR.code,
  ...HISTORICAL_FAIRS.map((f) => f.code),
]

/**
 * Semesters the company actually attended or was confirmed for.
 * `semestersAttended` in generated JSON only reflects RG "Attended {sem}?" booleans;
 * this also counts confirmed CF registrations and F25 selection decisions.
 */
export function getEffectiveSemestersAttended(company: CompanyRecord): SemesterCode[] {
  const attended = new Set<SemesterCode>(company.semestersAttended)

  for (const sem of FAIR_SEMESTER_ORDER) {
    if (company.attendanceHistory[sem]?.attended === true) attended.add(sem)
    const reg = company.registrationHistory[sem]
    if (reg && mapRawStatus(reg.status) === "Confirmed") attended.add(sem)
  }

  if (mapRawStatus(company.f25Selection?.decision) === "Confirmed") {
    attended.add("F25")
  }

  return FAIR_SEMESTER_ORDER.filter((s) => attended.has(s))
}
