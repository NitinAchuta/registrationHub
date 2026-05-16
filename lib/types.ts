// Unified company data types consumed by the app (after Excel parsing).

export type SemesterCode =
  | "S22"
  | "F22"
  | "S23"
  | "F23"
  | "S24"
  | "F24"
  | "S25"
  | "F25"
  | "S26"
  | "F26"

export type ParsedPackage = {
  raw: string
  tier: string | null
  days: string | null
  priceUSD: number | null
} | null

export type BttWorkflowStatus = "None" | "Pending" | "Confirmed" | "Denied"

export type OneToTwoDayWorkflowStatus = "None" | "Pending" | "Confirmed" | "Denied"

/** Company interest in ancillary F26 events (coordinator-tracked). */
export type CompanyEventInterest = "Yes" | "No" | "Not indicated"

export type F26CoordinatorMeta = {
  bttStatus: BttWorkflowStatus
  oneToTwoDayStatus: OneToTwoDayWorkflowStatus
  symplicityUpdated: boolean
  symplicityUpdatedAt?: string
  symplicityUpdatedBy?: string
  welcomeSocialInterest: CompanyEventInterest
  companyChatInterest: CompanyEventInterest
  careerDiscoveryFairInterest: CompanyEventInterest
}

export type RegistrationRow = {
  semester: string
  term?: string
  rawOrganization: string
  industry?: string
  topMajor?: string
  majors: string[]
  degreeLevels: string[]
  positionTypes: string[]
  workAuthorization: string[]
  package: ParsedPackage
  packageRaw: string
  virtualFair?: boolean
  wifi?: string | null
  wifiRequested?: string | null
  powerRequired?: string | null
  poweredDevices?: number | null
  companyQueue?: string | null
  balanceDue?: number | null
  lastPaid?: string | null
  boothLocation?: string | null
  attendeeType?: string | null
  daysAttending?: string | null
  status?: string | null
  registeredOnRaw?: string
  repsDay1?: number | null
  repsDay2?: number | null
  repCount?: number | null
  sponsorManual?: boolean
  sisterCompanyPlacement?: string | null
  welcomeSocialRaw?: string | null
  companyChatRaw?: string | null
  /** Fall 2026 coordinator workflow fields (client-persisted). */
  f26Meta?: F26CoordinatorMeta
  /** Google Export tab — contact / row metadata */
  registeringContact?: string | null
  contactEmail?: string | null
  contactPhoneRaw?: string | null
  contactPhoneDisplay?: string | null
  phoneNormalizedIssue?: string | null
  exportRowNumber?: number | null
  sheetNotes?: string[]
  sheetWarnings?: string[]
  exportRawColumns?: Record<string, string>
  day1AdditionalReps?: string | null
  day2AdditionalReps?: string | null
  workAuthorizationRaw?: string | null
  positionTypesRaw?: string | null
  statusRaw?: string | null
  packageDaysMismatchWarning?: boolean
}

export type AttendanceRow = {
  attended: boolean | null
  package: ParsedPackage
  packageRaw: string | null
}

export type F25Selection = {
  dateRaw?: string | null
  revenueScore?: number | null
  workAuthScore?: number | null
  glassdoorScore?: number | null
  relationshipScore?: number | null
  totalScore?: number | null
  weeksPending?: number | null
  decision?: string | null
  requestedWedBooths?: number | null
  finalWedBooths?: number | null
  requestedThuBooths?: number | null
  finalThuBooths?: number | null
  primaryMajor?: string | null
}

export type Relationship = {
  attendedPastFairs: boolean
  outsideEngagement: boolean
  outsideEngagementNote?: string | null
  fycfParticipant: boolean
  alumniPresence: boolean
  careerCenterPartner: boolean
  careerCenterSponsorshipLevel?: string | null
  coeDonor: boolean
  relationshipScoreF25?: number
}

export type CompanyRecord = {
  id: string
  canonicalName: string
  variants: string[]
  sources: string[]
  industry: string | null
  industryTags: string[]
  companyType: string | null
  revenueMillionsUSD: number | null
  marketCapBillionsUSD: number | null
  employees: number | null
  willingToSponsor: boolean | null
  bachelorHires: number | null
  masterHires: number | null
  doctorateHires: number | null
  totalHires: number
  hiringHistory: Partial<Record<SemesterCode, number>>
  attendanceHistory: Partial<Record<SemesterCode, AttendanceRow>>
  semestersAttended: SemesterCode[]
  packageHistory: Partial<Record<SemesterCode, NonNullable<ParsedPackage>>>
  currentRegistration: RegistrationRow | null
  registrationHistory: Partial<Record<SemesterCode, RegistrationRow>>
  relationship: Relationship
  f25Selection: F25Selection | null
  f25SortedHistory: {
    netWorth: number | null
    workAuth: number | null
    glassdoor: number | null
    relationship: number | null
    score: number | null
    decision: string | null
  } | null
  f25Waitlist: {
    status: string | null
    empNote: string | null
    package: string | null
    notes: string | null
  } | null
  majorBuckets: string[]
  /** MVP hiring flags; not inferred from totalHires unless data is explicit. */
  hiredFall2025?: "Yes" | "No" | "Unknown"
  hiredSpring2025?: "Yes" | "No" | "Unknown"
  /** Credits loaded from Sheets (optional cache). */
  credits?: CompanyCredit[]
}

export type MajorAnalytics = {
  major: string
  requestedWedBooths: number
  finalWedBooths: number
  requestedThuBooths: number
  finalThuBooths: number
  allocatedBooths: number
  totalBoothsConfirmed: number
  bumpToThursdays: number
  fillPercent: number | null
  needMore: boolean | null
  needLess: boolean | null
  registrationsPercent: number | null
  allocatedBoothsPercent: number | null
  acceptanceRate: number | null
}

export type CompanyDataset = {
  generatedAt: string
  semesterOrder: SemesterCode[]
  semesterLabels: Record<SemesterCode, string>
  companies: CompanyRecord[]
  majorAnalytics: MajorAnalytics[]
}

// Workflow / coordinator-side types

/** Primary SEC registration decision only (Fall 2026 hub). BTT / 1-to-2-day are separate fields. */
export type RegistrationStatus = "Confirmed" | "Denied" | "Pending" | "Canceled"

export const ALL_REGISTRATION_STATUSES: RegistrationStatus[] = [
  "Confirmed",
  "Denied",
  "Pending",
  "Canceled",
]

export const FINAL_STATUSES: ReadonlySet<RegistrationStatus> = new Set([
  "Confirmed",
  "Denied",
  "Canceled",
])

export type AssignedToOption =
  | "Unassigned"
  | "Kyle"
  | "Nathan"
  | "Raul"
  | "Pranav"
  | "Teresa"
  | "Chairs"

export const ASSIGNMENT_OPTIONS: AssignedToOption[] = [
  "Unassigned",
  "Kyle",
  "Nathan",
  "Raul",
  "Pranav",
  "Teresa",
  "Chairs",
]

export function isAssignedToOption(value: string): value is AssignedToOption {
  return (ASSIGNMENT_OPTIONS as readonly string[]).includes(value)
}

export function parseAssignedToOption(raw: string | null | undefined): AssignedToOption {
  if (raw && isAssignedToOption(raw)) return raw
  return "Unassigned"
}

export type CompanyFlag = {
  type: "success" | "warning" | "danger" | "info"
  label: string
  description: string
  priority: number
}

export type CompanyScoring = {
  totalScore: number
  relationshipScore: number
  hiringScore: number
  engagementScore: number
  majorFitScore: number
  financialScore: number
  operationalScore: number
  workAuthScore: number
  recommendation:
    | "Recommended for Acceptance"
    | "Recommended for Review"
    | "Recommended for Waitlist"
    | "Recommended for Denial"
    | "Recommended for BTT"
    | "Recommended for 1 to 2 Day"
    | "Needs More Information"
  recommendationReason: string
  priorityBadge: "High Priority" | "Good Fit" | "Needs Review" | "Low Priority"
  explanation: string[]
}

export type CompanyChatMessage = {
  id: string
  companyId: string
  author: string
  timestamp: string
  message: string
  tag?: "decision" | "issue" | "follow-up" | "finance" | "logistics" | null
}

export type CoordinatorNoteCategory = "positive" | "issue" | "general" | "coordinator"
export type CoordinatorNote = {
  id: string
  category: CoordinatorNoteCategory
  text: string
  timestamp: string
  author?: string
}

export type WelcomeSocialRecord = {
  attending: "Yes" | "No" | "Unknown"
  repsAttending: number | null
  notes: string
}

export type CreditsRecord = {
  added: number
  distributed: number
  notes: string
}

export type CompanyProfileNoteTag =
  | "General"
  | "Decision"
  | "Finance"
  | "Logistics"
  | "Symplicity"
  | "BTT"
  | "1-to-2-Day"

export type YesNoUnknown = "Yes" | "No" | "Unknown"

export type CareerFairPackageHistory = {
  term: "S26" | "F25" | "S25" | "F24" | "S24"
  package: string | null
  attended: boolean
}

export type ExitSurveyHiringHistory = {
  term:
    | "Fall 2021"
    | "Spring 2022"
    | "Fall 2022"
    | "Spring 2023"
    | "Fall 2023"
    | "Spring 2024"
    | "Fall 2024"
    | "Spring 2025"
    | "Fall 2025"
  hiredStudents: YesNoUnknown
  rawValue: string | null
}

export type HistoricalCompanyProfile = {
  companyName: string
  normalizedCompanyName: string
  studentInterestInstagram: YesNoUnknown
  exitSurveyHiringHistory: ExitSurveyHiringHistory[]
  attendedCdfS26: YesNoUnknown
  firstYearCareerFair: YesNoUnknown
  careerFairPackageHistory: CareerFairPackageHistory[]
  rgDecisions: {
    s25: string | null
    f25: string | null
    s26: string | null
  }
  mostRecentCfRep: {
    name: string | null
    email: string | null
  }
  webTaContact: {
    name: string | null
    email: string | null
  }
  rawColumns: Record<string, string | null>
}

export type CompanyProfileNote = {
  id: string
  companyId: string
  text: string
  author: string
  createdAt: string
  tag?: CompanyProfileNoteTag
}

export type EnrichmentConfidence = "high" | "medium" | "low"

/** Parsed row from Google Sheets tab “Company Enrichment”. */
export type CompanyEnrichment = {
  companyName: string
  sourceRowNumber: number | null
  domain: string | null
  ticker: string | null
  cik: string | null
  revenue: number | null
  revenueSource: string | null
  revenueFiscalYear: string | null
  marketCap: number | null
  marketCapSource: string | null
  employees: number | null
  employeesSource: string | null
  confidence: EnrichmentConfidence
  lastUpdated: string
  error: string | null
}

/** Dollar credits stored in Google Sheets `Credits` tab (see API routes). */
export type CompanyCredit = {
  id: string
  companyName: string
  rowNumber?: number
  amount: number
  reason: string
  createdAt: string
  createdBy?: string
  source: "google_sheet" | "excel" | "local"
}

/** @deprecated Use CompanyCredit + Google Sheets credits API */
export type CompanyCreditLine = {
  id: string
  companyId: string
  amount: number
  reason: string
  createdAt: string
  createdBy?: string
}
