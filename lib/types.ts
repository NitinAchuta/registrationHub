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

export type ParsedPackage = {
  raw: string
  tier: string | null
  days: string | null
  priceUSD: number | null
} | null

export type RegistrationRow = {
  semester: string
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

export type RegistrationStatus =
  | "Confirmed"
  | "Denied"
  | "Pending"
  | "Waitlisted"
  | "Cancelled"
  | "BTT Pending"
  | "BTT Confirmed"
  | "BTT Rejected"
  | "1 to 2 Day Pending"
  | "1 to 2 Day Accepted"
  | "1 to 2 Day Rejected"

export const ALL_REGISTRATION_STATUSES: RegistrationStatus[] = [
  "Confirmed",
  "Denied",
  "Pending",
  "Waitlisted",
  "Cancelled",
  "BTT Pending",
  "BTT Confirmed",
  "BTT Rejected",
  "1 to 2 Day Pending",
  "1 to 2 Day Accepted",
  "1 to 2 Day Rejected",
]

export const FINAL_STATUSES: ReadonlySet<RegistrationStatus> = new Set([
  "Confirmed",
  "Denied",
  "BTT Confirmed",
  "BTT Rejected",
  "1 to 2 Day Accepted",
  "1 to 2 Day Rejected",
  "Cancelled",
])

export type AssignedToOption =
  | "Aryan"
  | "Teresa"
  | "Kyle"
  | "Nathan"
  | "Raul"
  | "Pranav"
  | "Chairs"
  | "Unassigned"
export const ASSIGNMENT_OPTIONS: AssignedToOption[] = [
  "Unassigned",
  "Aryan",
  "Teresa",
  "Kyle",
  "Nathan",
  "Raul",
  "Pranav",
  "Chairs",
]

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
