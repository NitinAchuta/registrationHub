import type { SemesterCode } from "./types"

export type FairTerm = {
  label: string
  code: SemesterCode
  registrationOpenDate: string | null
  fairDate: string | null
}

export const ACTIVE_FAIR: FairTerm = {
  label: "Fall 2026",
  code: "F26",
  registrationOpenDate: null,
  fairDate: null,
}

export const HISTORICAL_FAIRS: FairTerm[] = [
  { label: "Spring 2026", code: "S26", registrationOpenDate: null, fairDate: null },
  { label: "Fall 2025", code: "F25", registrationOpenDate: null, fairDate: null },
  { label: "Spring 2025", code: "S25", registrationOpenDate: null, fairDate: null },
  { label: "Fall 2024", code: "F24", registrationOpenDate: null, fairDate: null },
  { label: "Spring 2024", code: "S24", registrationOpenDate: null, fairDate: null },
  { label: "Fall 2023", code: "F23", registrationOpenDate: null, fairDate: null },
  { label: "Spring 2023", code: "S23", registrationOpenDate: null, fairDate: null },
  { label: "Fall 2022", code: "F22", registrationOpenDate: null, fairDate: null },
  { label: "Spring 2022", code: "S22", registrationOpenDate: null, fairDate: null },
]

export const FAIR_TERMS: FairTerm[] = [ACTIVE_FAIR, ...HISTORICAL_FAIRS]
