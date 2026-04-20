// Extended status types for BTT and 1-2 Day workflows
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

// Past career fair notes from previous years
export type PastNote = {
  year: string
  memberInitials: string
  note: string
}

export type RegistrationEntry = {
  id: string
  // Raw org name (may have variants)
  organization: string
  // Logistics
  package: "Platinum" | "Gold" | "Silver" | "Bronze"
  virtualFair: boolean
  wifi: boolean
  boothLocation: string
  attendeeType: "In-Person" | "Virtual" | "Hybrid"
  daysAttending: ("Day 1" | "Day 2")[]
  // NEW: Days of Fair fields
  needsPower: boolean
  repCount: number
  // Recruitment
  topMajor: string
  majorsRecruited: string[]
  degreeLevels: ("Freshman" | "Sophomore" | "Junior" | "Senior" | "Masters" | "PhD")[]
  positionTypes: ("Full-Time" | "Part-Time" | "Internship" | "Co-op")[]
  workAuth: ("US Citizen" | "Permanent Resident" | "H-1B" | "OPT/CPT" | "Any")[]
  // Contact
  repName: string
  repEmail: string
  repPhone: string
  additionalRepsDay1: string
  additionalRepsDay2: string
  // Meta
  industry: string
  status: RegistrationStatus
  semester: string
  // NEW: Management fields
  assignedTo: string | null  // References SECMember initials
  lastStatusUpdate: string   // ISO date
  // NEW: Past notes from previous career fairs
  pastNotes: PastNote[]
}

// =====================
// NEW: Financial Tracking
// =====================
export type PaymentRecord = {
  id: string
  semester: string
  amount: number
  paidDate: string | null
  status: "Paid" | "Pending" | "Overdue"
}

export type CompanyFinancials = {
  companyName: string
  balanceDue: number
  lastPaidSemester: string | null
  paymentsHistory: PaymentRecord[]
  debtRiskFlag: "None" | "Low" | "Medium" | "High"
}

// =====================
// NEW: Timeline / Notes
// =====================
export type TimelineEntry = {
  id: string
  companyName: string
  timestamp: string
  author: string
  type: "Note" | "Feedback" | "Issue" | "Resolution"
  content: string
}

// =====================
// NEW: Hospitality / Events
// =====================
export type SECMember = {
  id: string
  name: string
  initials: string
  role: string
  email: string
  dietaryRestrictions: string[]
  mealPreference: "Vegetarian" | "Vegan" | "Halal" | "Kosher" | "None"
}

export type MealAssignment = {
  id: string
  memberId: string
  eventName: string
  eventDate: string
  companyHost: string
  mealType: "Breakfast" | "Lunch" | "Dinner"
  specialRequests: string
}

export type EventLogistics = {
  id: string
  eventName: string
  eventType: "Welcome Social" | "Post-Fair Dinner" | "Interview Session" | "Networking Event"
  date: string
  hostCompany: string
  location: string
  rsvpCount: number
  maxCapacity: number
  specialNotes: string
}

// =====================
// NEW: Operations / Scoring
// =====================
export type CancellationRecord = {
  id: string
  companyName: string
  cancellationDate: string
  reason: string
  urgencyLevel: "Low" | "Medium" | "High"
  boothStatus: "Vacant" | "Reassigned"
  handledBy: string
}

export type ChatMessage = {
  id: string
  companyName: string
  author: string
  timestamp: string
  message: string
}

export type CompanyScore = {
  companyName: string
  engagement: number // 0-25
  professionalism: number // 0-25
  recruitmentQuality: number // 0-25
  studentFeedback: number // 0-25
  totalScore: number // 0-100
  evaluatedBy: string
  evaluatedDate: string
}

// =====================
// NEW: User Roles (RBAC)
// =====================
export type UserRole = "Admin" | "Registration" | "Finance" | "Hospitality"

// =====================
// NEW: Zachry Major Distribution
// =====================
export type MajorDistribution = {
  major: string
  zachryPercent: number // Population percentage in Zachry
  recruitedPercent: number // Percentage of companies recruiting this major
}

// =====================
// EXISTING: Raw Registrations
// =====================
export const rawRegistrations: RegistrationEntry[] = [
  {
    id: "1",
    organization: "Chevron",
    package: "Platinum",
    virtualFair: true,
    wifi: true,
    boothLocation: "A1",
    attendeeType: "In-Person",
    daysAttending: ["Day 1", "Day 2"],
    needsPower: true,
    repCount: 3,
    topMajor: "Petroleum Engineering",
    majorsRecruited: ["Petroleum Engineering", "Chemical Engineering", "Mechanical Engineering"],
    degreeLevels: ["Junior", "Senior", "Masters"],
    positionTypes: ["Full-Time", "Internship"],
    workAuth: ["US Citizen", "Permanent Resident"],
    repName: "Sarah Mitchell",
    repEmail: "s.mitchell@chevron.com",
    repPhone: "(713) 555-0192",
    additionalRepsDay1: "James Harlow",
    additionalRepsDay2: "James Harlow, Priya Nair",
    industry: "Energy",
    status: "Confirmed",
    semester: "Spring 2026",
    assignedTo: "AR",
    lastStatusUpdate: "2026-01-08T14:00:00Z",
    pastNotes: [
      { year: "Spring 2025", memberInitials: "MS", note: "Outstanding engagement with students. Always well-prepared." },
      { year: "Fall 2024", memberInitials: "JW", note: "Requested larger booth space for next fair." },
    ],
  },
  {
    id: "2",
    organization: "Chevron Corp",
    package: "Gold",
    virtualFair: false,
    wifi: true,
    boothLocation: "A2",
    attendeeType: "In-Person",
    daysAttending: ["Day 1"],
    needsPower: false,
    repCount: 2,
    topMajor: "Chemical Engineering",
    majorsRecruited: ["Chemical Engineering", "Environmental Engineering"],
    degreeLevels: ["Senior", "Masters"],
    positionTypes: ["Full-Time", "Co-op"],
    workAuth: ["US Citizen"],
    repName: "Derek Paulson",
    repEmail: "d.paulson@chevron.com",
    repPhone: "(713) 555-0284",
    additionalRepsDay1: "Linda Cho",
    additionalRepsDay2: "",
    industry: "Energy",
    status: "Confirmed",
    semester: "Spring 2026",
    assignedTo: "AR",
    lastStatusUpdate: "2026-01-05T10:00:00Z",
    pastNotes: [],
  },
  {
    id: "3",
    organization: "Chevron Inc.",
    package: "Silver",
    virtualFair: true,
    wifi: false,
    boothLocation: "B3",
    attendeeType: "Hybrid",
    daysAttending: ["Day 2"],
    needsPower: true,
    repCount: 2,
    topMajor: "Mechanical Engineering",
    majorsRecruited: ["Mechanical Engineering"],
    degreeLevels: ["Junior", "Senior"],
    positionTypes: ["Internship"],
    workAuth: ["US Citizen", "OPT/CPT"],
    repName: "Tom Reeves",
    repEmail: "t.reeves@chevron.com",
    repPhone: "(832) 555-0317",
    additionalRepsDay1: "",
    additionalRepsDay2: "Amy Garza",
    industry: "Energy",
    status: "BTT Pending",
    semester: "Spring 2026",
    assignedTo: null,
    lastStatusUpdate: "2026-01-02T09:00:00Z",
    pastNotes: [
      { year: "Fall 2024", memberInitials: "MJ", note: "New division, first time attending." },
    ],
  },
  {
    id: "4",
    organization: "ExxonMobil",
    package: "Platinum",
    virtualFair: true,
    wifi: true,
    boothLocation: "A3",
    attendeeType: "In-Person",
    daysAttending: ["Day 1", "Day 2"],
    needsPower: true,
    repCount: 4,
    topMajor: "Petroleum Engineering",
    majorsRecruited: ["Petroleum Engineering", "Chemical Engineering", "Electrical Engineering"],
    degreeLevels: ["Sophomore", "Junior", "Senior", "Masters", "PhD"],
    positionTypes: ["Full-Time", "Internship", "Co-op"],
    workAuth: ["US Citizen", "Permanent Resident", "H-1B"],
    repName: "Angela Torres",
    repEmail: "a.torres@exxonmobil.com",
    repPhone: "(281) 555-0441",
    additionalRepsDay1: "Marcus Webb, Jenna Fox",
    additionalRepsDay2: "Marcus Webb",
    industry: "Energy",
    status: "Confirmed",
    semester: "Spring 2026",
    assignedTo: "JT",
    lastStatusUpdate: "2026-01-12T08:00:00Z",
    pastNotes: [
      { year: "Spring 2025", memberInitials: "AR", note: "Top-tier employer. Always maxes out interview slots." },
      { year: "Fall 2024", memberInitials: "JW", note: "Excellent partnership. Donated extra swag for students." },
    ],
  },
  {
    id: "5",
    organization: "Texas Instruments",
    package: "Gold",
    virtualFair: true,
    wifi: true,
    boothLocation: "C1",
    attendeeType: "In-Person",
    daysAttending: ["Day 1", "Day 2"],
    needsPower: true,
    repCount: 2,
    topMajor: "Electrical Engineering",
    majorsRecruited: ["Electrical Engineering", "Computer Engineering", "Computer Science"],
    degreeLevels: ["Junior", "Senior", "Masters"],
    positionTypes: ["Full-Time", "Internship"],
    workAuth: ["US Citizen", "Permanent Resident", "OPT/CPT"],
    repName: "Kevin Park",
    repEmail: "k.park@ti.com",
    repPhone: "(972) 555-0523",
    additionalRepsDay1: "Rachel Huang",
    additionalRepsDay2: "Rachel Huang",
    industry: "Semiconductor",
    status: "Confirmed",
    semester: "Spring 2026",
    assignedTo: "RP",
    lastStatusUpdate: "2026-01-10T11:00:00Z",
    pastNotes: [
      { year: "Fall 2024", memberInitials: "SL", note: "Solid recruiter presence. Focus on hardware roles." },
    ],
  },
  {
    id: "6",
    organization: "Lockheed Martin",
    package: "Platinum",
    virtualFair: false,
    wifi: true,
    boothLocation: "A4",
    attendeeType: "In-Person",
    daysAttending: ["Day 1", "Day 2"],
    needsPower: false,
    repCount: 3,
    topMajor: "Aerospace Engineering",
    majorsRecruited: ["Aerospace Engineering", "Mechanical Engineering", "Electrical Engineering", "Computer Science"],
    degreeLevels: ["Junior", "Senior", "Masters", "PhD"],
    positionTypes: ["Full-Time", "Internship", "Co-op"],
    workAuth: ["US Citizen"],
    repName: "Brian Calloway",
    repEmail: "b.calloway@lmco.com",
    repPhone: "(817) 555-0612",
    additionalRepsDay1: "Stephanie Kim, Nathan Cole",
    additionalRepsDay2: "Stephanie Kim",
    industry: "Defense & Aerospace",
    status: "Confirmed",
    semester: "Spring 2026",
    assignedTo: "MJ",
    lastStatusUpdate: "2026-01-05T09:00:00Z",
    pastNotes: [
      { year: "Spring 2025", memberInitials: "EP", note: "Security clearance info session was very popular." },
      { year: "Fall 2024", memberInitials: "AR", note: "Strong aerospace recruiting. Students love the swag." },
    ],
  },
  {
    id: "7",
    organization: "Amazon",
    package: "Gold",
    virtualFair: true,
    wifi: true,
    boothLocation: "C2",
    attendeeType: "In-Person",
    daysAttending: ["Day 1", "Day 2"],
    needsPower: true,
    repCount: 3,
    topMajor: "Computer Science",
    majorsRecruited: ["Computer Science", "Computer Engineering", "Information Technology"],
    degreeLevels: ["Junior", "Senior", "Masters"],
    positionTypes: ["Full-Time", "Internship"],
    workAuth: ["US Citizen", "Permanent Resident", "H-1B", "OPT/CPT"],
    repName: "Diana Patel",
    repEmail: "d.patel@amazon.com",
    repPhone: "(206) 555-0734",
    additionalRepsDay1: "Carlos Vega",
    additionalRepsDay2: "Carlos Vega, Emily Zhao",
    industry: "Technology",
    status: "1 to 2 Day Pending",
    semester: "Spring 2026",
    assignedTo: null,
    lastStatusUpdate: "2026-01-01T12:00:00Z",
    pastNotes: [
      { year: "Spring 2025", memberInitials: "JW", note: "High volume recruiter. Students lined up for hours." },
    ],
  },
  {
    id: "8",
    organization: "Shell",
    package: "Silver",
    virtualFair: false,
    wifi: false,
    boothLocation: "B1",
    attendeeType: "In-Person",
    daysAttending: ["Day 1"],
    needsPower: false,
    repCount: 1,
    topMajor: "Petroleum Engineering",
    majorsRecruited: ["Petroleum Engineering", "Chemical Engineering"],
    degreeLevels: ["Senior", "Masters"],
    positionTypes: ["Full-Time", "Internship"],
    workAuth: ["US Citizen", "Permanent Resident"],
    repName: "Oliver Nash",
    repEmail: "o.nash@shell.com",
    repPhone: "(713) 555-0811",
    additionalRepsDay1: "",
    additionalRepsDay2: "",
    industry: "Energy",
    status: "Pending",
    semester: "Spring 2026",
    assignedTo: "SL",
    lastStatusUpdate: "2026-01-05T15:00:00Z",
    pastNotes: [
      { year: "Fall 2024", memberInitials: "CW", note: "Lower engagement than expected. May need follow-up." },
    ],
  },
  {
    id: "9",
    organization: "Halliburton",
    package: "Gold",
    virtualFair: true,
    wifi: true,
    boothLocation: "B2",
    attendeeType: "Hybrid",
    daysAttending: ["Day 1", "Day 2"],
    needsPower: true,
    repCount: 2,
    topMajor: "Petroleum Engineering",
    majorsRecruited: ["Petroleum Engineering", "Mechanical Engineering", "Computer Science"],
    degreeLevels: ["Junior", "Senior", "Masters"],
    positionTypes: ["Full-Time", "Internship", "Co-op"],
    workAuth: ["US Citizen", "Permanent Resident", "H-1B"],
    repName: "Vanessa Okafor",
    repEmail: "v.okafor@halliburton.com",
    repPhone: "(281) 555-0947",
    additionalRepsDay1: "Drew Simmons",
    additionalRepsDay2: "Drew Simmons",
    industry: "Oilfield Services",
    status: "Confirmed",
    semester: "Spring 2026",
    assignedTo: "AK",
    lastStatusUpdate: "2026-01-10T10:00:00Z",
    pastNotes: [],
  },
  {
    id: "10",
    organization: "Boeing",
    package: "Gold",
    virtualFair: true,
    wifi: true,
    boothLocation: "C3",
    attendeeType: "In-Person",
    daysAttending: ["Day 1", "Day 2"],
    needsPower: true,
    repCount: 2,
    topMajor: "Aerospace Engineering",
    majorsRecruited: ["Aerospace Engineering", "Mechanical Engineering", "Electrical Engineering"],
    degreeLevels: ["Junior", "Senior", "Masters"],
    positionTypes: ["Full-Time", "Internship"],
    workAuth: ["US Citizen"],
    repName: "Monica Chen",
    repEmail: "m.chen@boeing.com",
    repPhone: "(206) 555-1023",
    additionalRepsDay1: "Raj Patel",
    additionalRepsDay2: "",
    industry: "Defense & Aerospace",
    status: "BTT Pending",
    semester: "Spring 2026",
    assignedTo: null,
    lastStatusUpdate: "2025-12-20T14:00:00Z",
    pastNotes: [
      { year: "Spring 2025", memberInitials: "SC", note: "Payment issues. Follow up with finance team." },
      { year: "Fall 2024", memberInitials: "MR", note: "Good aerospace presence but limited hiring." },
    ],
  },
  {
    id: "11",
    organization: "Microsoft",
    package: "Platinum",
    virtualFair: true,
    wifi: true,
    boothLocation: "A5",
    attendeeType: "In-Person",
    daysAttending: ["Day 1", "Day 2"],
    needsPower: true,
    repCount: 4,
    topMajor: "Computer Science",
    majorsRecruited: ["Computer Science", "Computer Engineering", "Information Systems"],
    degreeLevels: ["Junior", "Senior", "Masters", "PhD"],
    positionTypes: ["Full-Time", "Internship"],
    workAuth: ["US Citizen", "Permanent Resident", "H-1B", "OPT/CPT", "Any"],
    repName: "Tyler Brooks",
    repEmail: "t.brooks@microsoft.com",
    repPhone: "(425) 555-1134",
    additionalRepsDay1: "Mei Lin, Aisha Rahman",
    additionalRepsDay2: "Mei Lin",
    industry: "Technology",
    status: "Confirmed",
    semester: "Spring 2026",
    assignedTo: "ED",
    lastStatusUpdate: "2026-01-02T08:00:00Z",
    pastNotes: [
      { year: "Spring 2025", memberInitials: "EP", note: "Top-rated employer by students. Perfect attendance record." },
      { year: "Fall 2024", memberInitials: "MS", note: "Incredible swag and tech demos. Students loved it." },
    ],
  },
  {
    id: "12",
    organization: "Schlumberger",
    package: "Silver",
    virtualFair: false,
    wifi: false,
    boothLocation: "B4",
    attendeeType: "In-Person",
    daysAttending: ["Day 1"],
    needsPower: false,
    repCount: 1,
    topMajor: "Petroleum Engineering",
    majorsRecruited: ["Petroleum Engineering"],
    degreeLevels: ["Senior"],
    positionTypes: ["Full-Time"],
    workAuth: ["US Citizen", "Permanent Resident"],
    repName: "François Dubois",
    repEmail: "f.dubois@slb.com",
    repPhone: "(713) 555-1241",
    additionalRepsDay1: "",
    additionalRepsDay2: "",
    industry: "Oilfield Services",
    status: "Denied",
    semester: "Spring 2026",
    assignedTo: "DK",
    lastStatusUpdate: "2026-01-15T16:45:00Z",
    pastNotes: [
      { year: "Fall 2024", memberInitials: "DK", note: "Declining engagement. Budget constraints mentioned." },
    ],
  },
]

// =====================
// EXISTING: Normalization
// =====================
const normalizationMap: Record<string, string> = {
  "Chevron": "Chevron",
  "Chevron Corp": "Chevron",
  "Chevron Inc.": "Chevron",
  "ExxonMobil": "ExxonMobil",
  "Texas Instruments": "Texas Instruments",
  "Lockheed Martin": "Lockheed Martin",
  "Amazon": "Amazon",
  "Shell": "Shell",
  "Halliburton": "Halliburton",
  "Boeing": "Boeing",
  "Microsoft": "Microsoft",
  "Schlumberger": "Schlumberger",
}

export function normalizeCompanyName(raw: string): string {
  return normalizationMap[raw] ?? raw
}

export type NormalizedCompany = {
  canonicalName: string
  variants: string[]
  entries: RegistrationEntry[]
  industry: string
  topMajor: string
  package: RegistrationEntry["package"]
  status: RegistrationStatus
}

export function getNormalizedCompanies(): NormalizedCompany[] {
  const map = new Map<string, NormalizedCompany>()

  for (const entry of rawRegistrations) {
    const key = normalizeCompanyName(entry.organization)
    if (!map.has(key)) {
      map.set(key, {
        canonicalName: key,
        variants: [],
        entries: [],
        industry: entry.industry,
        topMajor: entry.topMajor,
        package: entry.package,
        status: entry.status,
      })
    }
    const company = map.get(key)!
    company.entries.push(entry)
    if (!company.variants.includes(entry.organization)) {
      company.variants.push(entry.organization)
    }
    // Prefer the highest package tier among variants
    const tiers = ["Platinum", "Gold", "Silver", "Bronze"]
    if (tiers.indexOf(entry.package) < tiers.indexOf(company.package)) {
      company.package = entry.package
    }
    // Prefer Confirmed status
    if (entry.status === "Confirmed") {
      company.status = "Confirmed"
    }
  }

  return Array.from(map.values())
}

// =====================
// EXISTING: Historical Data
// =====================
export type HistoricalData = {
  semester: string
  attended: number
  engagement: number
}

export const historicalData: Record<string, HistoricalData[]> = {
  Chevron: [
    { semester: "Fall 2024", attended: 2, engagement: 72 },
    { semester: "Spring 2025", attended: 3, engagement: 85 },
    { semester: "Fall 2025", attended: 2, engagement: 78 },
    { semester: "Spring 2026", attended: 3, engagement: 91 },
  ],
  ExxonMobil: [
    { semester: "Fall 2024", attended: 3, engagement: 88 },
    { semester: "Spring 2025", attended: 3, engagement: 90 },
    { semester: "Fall 2025", attended: 3, engagement: 93 },
    { semester: "Spring 2026", attended: 3, engagement: 96 },
  ],
  "Texas Instruments": [
    { semester: "Fall 2024", attended: 2, engagement: 65 },
    { semester: "Spring 2025", attended: 2, engagement: 71 },
    { semester: "Fall 2025", attended: 2, engagement: 74 },
    { semester: "Spring 2026", attended: 2, engagement: 80 },
  ],
  "Lockheed Martin": [
    { semester: "Fall 2024", attended: 3, engagement: 91 },
    { semester: "Spring 2025", attended: 3, engagement: 94 },
    { semester: "Fall 2025", attended: 3, engagement: 92 },
    { semester: "Spring 2026", attended: 3, engagement: 97 },
  ],
  Amazon: [
    { semester: "Fall 2024", attended: 2, engagement: 77 },
    { semester: "Spring 2025", attended: 2, engagement: 82 },
    { semester: "Fall 2025", attended: 3, engagement: 86 },
    { semester: "Spring 2026", attended: 3, engagement: 89 },
  ],
  Shell: [
    { semester: "Fall 2024", attended: 1, engagement: 55 },
    { semester: "Spring 2025", attended: 1, engagement: 60 },
    { semester: "Fall 2025", attended: 1, engagement: 58 },
    { semester: "Spring 2026", attended: 1, engagement: 63 },
  ],
  Halliburton: [
    { semester: "Fall 2024", attended: 2, engagement: 70 },
    { semester: "Spring 2025", attended: 2, engagement: 75 },
    { semester: "Fall 2025", attended: 2, engagement: 79 },
    { semester: "Spring 2026", attended: 2, engagement: 84 },
  ],
  Boeing: [
    { semester: "Fall 2024", attended: 1, engagement: 61 },
    { semester: "Spring 2025", attended: 2, engagement: 68 },
    { semester: "Fall 2025", attended: 1, engagement: 64 },
    { semester: "Spring 2026", attended: 2, engagement: 72 },
  ],
  Microsoft: [
    { semester: "Fall 2024", attended: 3, engagement: 90 },
    { semester: "Spring 2025", attended: 3, engagement: 93 },
    { semester: "Fall 2025", attended: 3, engagement: 95 },
    { semester: "Spring 2026", attended: 3, engagement: 98 },
  ],
  Schlumberger: [
    { semester: "Fall 2024", attended: 1, engagement: 50 },
    { semester: "Spring 2025", attended: 1, engagement: 48 },
    { semester: "Fall 2025", attended: 1, engagement: 45 },
    { semester: "Spring 2026", attended: 0, engagement: 30 },
  ],
}

export function getRecommendation(canonicalName: string): { recommended: boolean; reason: string } {
  const data = historicalData[canonicalName]
  if (!data) return { recommended: false, reason: "Insufficient historical data." }
  const recent = data.slice(-2)
  const avgEngagement = recent.reduce((s, d) => s + d.engagement, 0) / recent.length
  const trend = data[data.length - 1].engagement - data[0].engagement
  if (avgEngagement >= 80 && trend >= 0) {
    return { recommended: true, reason: `Strong engagement trend (+${trend}pts) with ${Math.round(avgEngagement)}% recent avg.` }
  }
  if (avgEngagement >= 65) {
    return { recommended: true, reason: `Consistent participation with ${Math.round(avgEngagement)}% avg engagement.` }
  }
  return { recommended: false, reason: `Below-threshold engagement (${Math.round(avgEngagement)}% avg) — review before accepting.` }
}

// =====================
// NEW: Financial Mock Data
// =====================
export const companyFinancials: CompanyFinancials[] = [
  {
    companyName: "Chevron",
    balanceDue: 0,
    lastPaidSemester: "Spring 2026",
    paymentsHistory: [
      { id: "p1", semester: "Fall 2024", amount: 5000, paidDate: "2024-08-15", status: "Paid" },
      { id: "p2", semester: "Spring 2025", amount: 5000, paidDate: "2025-01-10", status: "Paid" },
      { id: "p3", semester: "Fall 2025", amount: 5000, paidDate: "2025-08-12", status: "Paid" },
      { id: "p4", semester: "Spring 2026", amount: 7500, paidDate: "2026-01-08", status: "Paid" },
    ],
    debtRiskFlag: "None",
  },
  {
    companyName: "ExxonMobil",
    balanceDue: 0,
    lastPaidSemester: "Spring 2026",
    paymentsHistory: [
      { id: "p5", semester: "Fall 2024", amount: 7500, paidDate: "2024-08-20", status: "Paid" },
      { id: "p6", semester: "Spring 2025", amount: 7500, paidDate: "2025-01-15", status: "Paid" },
      { id: "p7", semester: "Fall 2025", amount: 7500, paidDate: "2025-08-18", status: "Paid" },
      { id: "p8", semester: "Spring 2026", amount: 7500, paidDate: "2026-01-12", status: "Paid" },
    ],
    debtRiskFlag: "None",
  },
  {
    companyName: "Texas Instruments",
    balanceDue: 2500,
    lastPaidSemester: "Fall 2025",
    paymentsHistory: [
      { id: "p9", semester: "Fall 2024", amount: 5000, paidDate: "2024-08-25", status: "Paid" },
      { id: "p10", semester: "Spring 2025", amount: 5000, paidDate: "2025-01-20", status: "Paid" },
      { id: "p11", semester: "Fall 2025", amount: 5000, paidDate: "2025-08-22", status: "Paid" },
      { id: "p12", semester: "Spring 2026", amount: 5000, paidDate: null, status: "Pending" },
    ],
    debtRiskFlag: "Low",
  },
  {
    companyName: "Lockheed Martin",
    balanceDue: 0,
    lastPaidSemester: "Spring 2026",
    paymentsHistory: [
      { id: "p13", semester: "Fall 2024", amount: 7500, paidDate: "2024-08-10", status: "Paid" },
      { id: "p14", semester: "Spring 2025", amount: 7500, paidDate: "2025-01-05", status: "Paid" },
      { id: "p15", semester: "Fall 2025", amount: 7500, paidDate: "2025-08-08", status: "Paid" },
      { id: "p16", semester: "Spring 2026", amount: 7500, paidDate: "2026-01-05", status: "Paid" },
    ],
    debtRiskFlag: "None",
  },
  {
    companyName: "Amazon",
    balanceDue: 5000,
    lastPaidSemester: "Fall 2025",
    paymentsHistory: [
      { id: "p17", semester: "Fall 2024", amount: 5000, paidDate: "2024-09-01", status: "Paid" },
      { id: "p18", semester: "Spring 2025", amount: 5000, paidDate: "2025-02-01", status: "Paid" },
      { id: "p19", semester: "Fall 2025", amount: 5000, paidDate: "2025-09-01", status: "Paid" },
      { id: "p20", semester: "Spring 2026", amount: 5000, paidDate: null, status: "Pending" },
    ],
    debtRiskFlag: "Low",
  },
  {
    companyName: "Shell",
    balanceDue: 7500,
    lastPaidSemester: "Spring 2025",
    paymentsHistory: [
      { id: "p21", semester: "Fall 2024", amount: 3000, paidDate: "2024-08-28", status: "Paid" },
      { id: "p22", semester: "Spring 2025", amount: 3000, paidDate: "2025-01-25", status: "Paid" },
      { id: "p23", semester: "Fall 2025", amount: 3000, paidDate: null, status: "Overdue" },
      { id: "p24", semester: "Spring 2026", amount: 3000, paidDate: null, status: "Pending" },
    ],
    debtRiskFlag: "Medium",
  },
  {
    companyName: "Halliburton",
    balanceDue: 0,
    lastPaidSemester: "Spring 2026",
    paymentsHistory: [
      { id: "p25", semester: "Fall 2024", amount: 5000, paidDate: "2024-08-18", status: "Paid" },
      { id: "p26", semester: "Spring 2025", amount: 5000, paidDate: "2025-01-12", status: "Paid" },
      { id: "p27", semester: "Fall 2025", amount: 5000, paidDate: "2025-08-15", status: "Paid" },
      { id: "p28", semester: "Spring 2026", amount: 5000, paidDate: "2026-01-10", status: "Paid" },
    ],
    debtRiskFlag: "None",
  },
  {
    companyName: "Boeing",
    balanceDue: 10000,
    lastPaidSemester: "Fall 2024",
    paymentsHistory: [
      { id: "p29", semester: "Fall 2024", amount: 5000, paidDate: "2024-09-05", status: "Paid" },
      { id: "p30", semester: "Spring 2025", amount: 5000, paidDate: null, status: "Overdue" },
      { id: "p31", semester: "Fall 2025", amount: 5000, paidDate: null, status: "Overdue" },
      { id: "p32", semester: "Spring 2026", amount: 5000, paidDate: null, status: "Pending" },
    ],
    debtRiskFlag: "High",
  },
  {
    companyName: "Microsoft",
    balanceDue: 0,
    lastPaidSemester: "Spring 2026",
    paymentsHistory: [
      { id: "p33", semester: "Fall 2024", amount: 7500, paidDate: "2024-08-05", status: "Paid" },
      { id: "p34", semester: "Spring 2025", amount: 7500, paidDate: "2025-01-02", status: "Paid" },
      { id: "p35", semester: "Fall 2025", amount: 7500, paidDate: "2025-08-02", status: "Paid" },
      { id: "p36", semester: "Spring 2026", amount: 7500, paidDate: "2026-01-02", status: "Paid" },
    ],
    debtRiskFlag: "None",
  },
  {
    companyName: "Schlumberger",
    balanceDue: 12000,
    lastPaidSemester: "Fall 2024",
    paymentsHistory: [
      { id: "p37", semester: "Fall 2024", amount: 3000, paidDate: "2024-09-10", status: "Paid" },
      { id: "p38", semester: "Spring 2025", amount: 3000, paidDate: null, status: "Overdue" },
      { id: "p39", semester: "Fall 2025", amount: 3000, paidDate: null, status: "Overdue" },
      { id: "p40", semester: "Spring 2026", amount: 3000, paidDate: null, status: "Overdue" },
    ],
    debtRiskFlag: "High",
  },
]

// =====================
// NEW: Timeline Mock Data
// =====================
export const companyTimelines: TimelineEntry[] = [
  {
    id: "t1",
    companyName: "Chevron",
    timestamp: "2025-12-15T10:30:00Z",
    author: "Maria Santos",
    type: "Feedback",
    content: "Excellent booth presence. Students reported very positive interactions.",
  },
  {
    id: "t2",
    companyName: "Chevron",
    timestamp: "2026-01-08T14:00:00Z",
    author: "Jake Wilson",
    type: "Note",
    content: "Confirmed upgrade to Platinum package for Spring 2026.",
  },
  {
    id: "t3",
    companyName: "Boeing",
    timestamp: "2025-09-20T09:15:00Z",
    author: "Sarah Chen",
    type: "Issue",
    content: "Payment overdue for Fall 2025. Finance team notified.",
  },
  {
    id: "t4",
    companyName: "Boeing",
    timestamp: "2025-10-05T11:00:00Z",
    author: "Michael Ross",
    type: "Note",
    content: "Company requested payment extension until November.",
  },
  {
    id: "t5",
    companyName: "Microsoft",
    timestamp: "2026-01-02T08:30:00Z",
    author: "Emily Park",
    type: "Feedback",
    content: "Top-rated employer by students three semesters running.",
  },
  {
    id: "t6",
    companyName: "Schlumberger",
    timestamp: "2026-01-15T16:45:00Z",
    author: "David Kim",
    type: "Issue",
    content: "Company submitted cancellation request citing budget constraints.",
  },
  {
    id: "t7",
    companyName: "Schlumberger",
    timestamp: "2026-01-16T10:00:00Z",
    author: "Maria Santos",
    type: "Resolution",
    content: "Cancellation processed. Booth B4 now vacant.",
  },
  {
    id: "t8",
    companyName: "Amazon",
    timestamp: "2025-12-20T13:00:00Z",
    author: "Jake Wilson",
    type: "Note",
    content: "Requested additional interview slots for Day 2.",
  },
]

// =====================
// NEW: SEC Members Mock Data
// =====================
export const secMembers: SECMember[] = [
  {
    id: "m1",
    name: "Alex Rodriguez",
    initials: "AR",
    role: "President",
    email: "alex.r@tamu.edu",
    dietaryRestrictions: [],
    mealPreference: "None",
  },
  {
    id: "m2",
    name: "Jessica Thompson",
    initials: "JT",
    role: "VP Operations",
    email: "jess.t@tamu.edu",
    dietaryRestrictions: ["Gluten-Free"],
    mealPreference: "Vegetarian",
  },
  {
    id: "m3",
    name: "Ryan Patel",
    initials: "RP",
    role: "Finance Director",
    email: "ryan.p@tamu.edu",
    dietaryRestrictions: [],
    mealPreference: "Vegetarian",
  },
  {
    id: "m4",
    name: "Sophia Lee",
    initials: "SL",
    role: "Hospitality Lead",
    email: "sophia.l@tamu.edu",
    dietaryRestrictions: ["Dairy-Free"],
    mealPreference: "Vegan",
  },
  {
    id: "m5",
    name: "Marcus Johnson",
    initials: "MJ",
    role: "Registration Lead",
    email: "marcus.j@tamu.edu",
    dietaryRestrictions: [],
    mealPreference: "Halal",
  },
  {
    id: "m6",
    name: "Aisha Khan",
    initials: "AK",
    role: "Marketing Director",
    email: "aisha.k@tamu.edu",
    dietaryRestrictions: [],
    mealPreference: "Halal",
  },
  {
    id: "m7",
    name: "Chris Williams",
    initials: "CW",
    role: "Logistics Coordinator",
    email: "chris.w@tamu.edu",
    dietaryRestrictions: ["Nut-Free"],
    mealPreference: "None",
  },
  {
    id: "m8",
    name: "Emma Davis",
    initials: "ED",
    role: "Student Liaison",
    email: "emma.d@tamu.edu",
    dietaryRestrictions: [],
    mealPreference: "Kosher",
  },
  {
    id: "m9",
    name: "David Kim",
    initials: "DK",
    role: "Analytics Lead",
    email: "david.k@tamu.edu",
    dietaryRestrictions: [],
    mealPreference: "None",
  },
  {
    id: "m10",
    name: "Maria Santos",
    initials: "MS",
    role: "Operations Director",
    email: "maria.s@tamu.edu",
    dietaryRestrictions: [],
    mealPreference: "None",
  },
  {
    id: "m11",
    name: "Jake Wilson",
    initials: "JW",
    role: "Outreach Coordinator",
    email: "jake.w@tamu.edu",
    dietaryRestrictions: [],
    mealPreference: "None",
  },
  {
    id: "m12",
    name: "Emily Park",
    initials: "EP",
    role: "Events Coordinator",
    email: "emily.p@tamu.edu",
    dietaryRestrictions: [],
    mealPreference: "Vegetarian",
  },
  {
    id: "m13",
    name: "Sarah Chen",
    initials: "SC",
    role: "Finance Assistant",
    email: "sarah.c@tamu.edu",
    dietaryRestrictions: [],
    mealPreference: "None",
  },
  {
    id: "m14",
    name: "Michael Ross",
    initials: "MR",
    role: "Registration Assistant",
    email: "michael.r@tamu.edu",
    dietaryRestrictions: [],
    mealPreference: "None",
  },
]

// =====================
// NEW: Meal Assignments Mock Data
// =====================
export const mealAssignments: MealAssignment[] = [
  {
    id: "ma1",
    memberId: "m1",
    eventName: "Chevron Welcome Dinner",
    eventDate: "2026-02-10",
    companyHost: "Chevron",
    mealType: "Dinner",
    specialRequests: "",
  },
  {
    id: "ma2",
    memberId: "m2",
    eventName: "Microsoft Networking Lunch",
    eventDate: "2026-02-11",
    companyHost: "Microsoft",
    mealType: "Lunch",
    specialRequests: "Gluten-free option needed",
  },
  {
    id: "ma3",
    memberId: "m4",
    eventName: "Amazon Post-Fair Dinner",
    eventDate: "2026-02-12",
    companyHost: "Amazon",
    mealType: "Dinner",
    specialRequests: "Vegan meal required",
  },
  {
    id: "ma4",
    memberId: "m5",
    eventName: "ExxonMobil Welcome Breakfast",
    eventDate: "2026-02-10",
    companyHost: "ExxonMobil",
    mealType: "Breakfast",
    specialRequests: "Halal options",
  },
  {
    id: "ma5",
    memberId: "m6",
    eventName: "Lockheed Martin Interview Lunch",
    eventDate: "2026-02-11",
    companyHost: "Lockheed Martin",
    mealType: "Lunch",
    specialRequests: "Halal options",
  },
]

// =====================
// NEW: Event Logistics Mock Data
// =====================
export const eventLogistics: EventLogistics[] = [
  {
    id: "e1",
    eventName: "Spring 2026 Welcome Social",
    eventType: "Welcome Social",
    date: "2026-02-10",
    hostCompany: "Multiple",
    location: "Zachry Engineering Building Atrium",
    rsvpCount: 45,
    maxCapacity: 60,
    specialNotes: "Catering by TAMU Dining. Setup begins at 4pm.",
  },
  {
    id: "e2",
    eventName: "Chevron VIP Dinner",
    eventType: "Post-Fair Dinner",
    date: "2026-02-11",
    hostCompany: "Chevron",
    location: "The Republic Steakhouse",
    rsvpCount: 12,
    maxCapacity: 15,
    specialNotes: "Transportation provided from Zachry.",
  },
  {
    id: "e3",
    eventName: "Microsoft Tech Talk & Networking",
    eventType: "Networking Event",
    date: "2026-02-10",
    hostCompany: "Microsoft",
    location: "Zachry Room 244",
    rsvpCount: 85,
    maxCapacity: 100,
    specialNotes: "A/V equipment reserved. Pizza provided.",
  },
  {
    id: "e4",
    eventName: "ExxonMobil Interview Day",
    eventType: "Interview Session",
    date: "2026-02-12",
    hostCompany: "ExxonMobil",
    location: "MSC Rooms 2401-2405",
    rsvpCount: 30,
    maxCapacity: 30,
    specialNotes: "5 interview rooms reserved. Water/coffee setup.",
  },
  {
    id: "e5",
    eventName: "Lockheed Martin Info Session",
    eventType: "Networking Event",
    date: "2026-02-11",
    hostCompany: "Lockheed Martin",
    location: "Zachry Room 127",
    rsvpCount: 60,
    maxCapacity: 75,
    specialNotes: "Security clearance discussion included.",
  },
]

// =====================
// NEW: Cancellation Records Mock Data
// =====================
export const cancellationRecords: CancellationRecord[] = [
  {
    id: "c1",
    companyName: "Schlumberger",
    cancellationDate: "2026-01-15",
    reason: "Budget constraints due to market conditions",
    urgencyLevel: "Medium",
    boothStatus: "Vacant",
    handledBy: "Maria Santos",
  },
]

// =====================
// NEW: Chat Messages Mock Data
// =====================
export const chatMessages: ChatMessage[] = [
  {
    id: "ch1",
    companyName: "Boeing",
    author: "Sarah Chen",
    timestamp: "2026-01-10T09:30:00Z",
    message: "Has anyone heard back from Boeing about their payment plan?",
  },
  {
    id: "ch2",
    companyName: "Boeing",
    author: "Ryan Patel",
    timestamp: "2026-01-10T09:45:00Z",
    message: "I spoke with their AP department yesterday. They said payment should clear by end of month.",
  },
  {
    id: "ch3",
    companyName: "Boeing",
    author: "Maria Santos",
    timestamp: "2026-01-10T10:00:00Z",
    message: "Good to know. Let's flag for follow-up if we don't see it by the 25th.",
  },
  {
    id: "ch4",
    companyName: "Schlumberger",
    author: "Jake Wilson",
    timestamp: "2026-01-15T14:00:00Z",
    message: "Just got the cancellation email from Schlumberger. Forwarding to the team.",
  },
  {
    id: "ch5",
    companyName: "Schlumberger",
    author: "Alex Rodriguez",
    timestamp: "2026-01-15T14:15:00Z",
    message: "Thanks Jake. Can we reach out to the waitlist to fill that booth?",
  },
]

// =====================
// NEW: Company Scores Mock Data
// =====================
export const companyScores: CompanyScore[] = [
  {
    companyName: "Chevron",
    engagement: 23,
    professionalism: 24,
    recruitmentQuality: 22,
    studentFeedback: 24,
    totalScore: 93,
    evaluatedBy: "Maria Santos",
    evaluatedDate: "2025-12-20",
  },
  {
    companyName: "ExxonMobil",
    engagement: 24,
    professionalism: 25,
    recruitmentQuality: 24,
    studentFeedback: 23,
    totalScore: 96,
    evaluatedBy: "Jake Wilson",
    evaluatedDate: "2025-12-20",
  },
  {
    companyName: "Microsoft",
    engagement: 25,
    professionalism: 25,
    recruitmentQuality: 25,
    studentFeedback: 25,
    totalScore: 100,
    evaluatedBy: "Maria Santos",
    evaluatedDate: "2025-12-20",
  },
  {
    companyName: "Lockheed Martin",
    engagement: 24,
    professionalism: 24,
    recruitmentQuality: 23,
    studentFeedback: 24,
    totalScore: 95,
    evaluatedBy: "Emily Park",
    evaluatedDate: "2025-12-20",
  },
  {
    companyName: "Amazon",
    engagement: 22,
    professionalism: 23,
    recruitmentQuality: 22,
    studentFeedback: 21,
    totalScore: 88,
    evaluatedBy: "Jake Wilson",
    evaluatedDate: "2025-12-20",
  },
  {
    companyName: "Texas Instruments",
    engagement: 20,
    professionalism: 22,
    recruitmentQuality: 19,
    studentFeedback: 20,
    totalScore: 81,
    evaluatedBy: "David Kim",
    evaluatedDate: "2025-12-20",
  },
  {
    companyName: "Halliburton",
    engagement: 21,
    professionalism: 22,
    recruitmentQuality: 20,
    studentFeedback: 21,
    totalScore: 84,
    evaluatedBy: "Sarah Chen",
    evaluatedDate: "2025-12-20",
  },
  {
    companyName: "Boeing",
    engagement: 18,
    professionalism: 20,
    recruitmentQuality: 17,
    studentFeedback: 18,
    totalScore: 73,
    evaluatedBy: "Emily Park",
    evaluatedDate: "2025-12-20",
  },
  {
    companyName: "Shell",
    engagement: 16,
    professionalism: 18,
    recruitmentQuality: 15,
    studentFeedback: 16,
    totalScore: 65,
    evaluatedBy: "Maria Santos",
    evaluatedDate: "2025-12-20",
  },
  {
    companyName: "Schlumberger",
    engagement: 12,
    professionalism: 14,
    recruitmentQuality: 10,
    studentFeedback: 12,
    totalScore: 48,
    evaluatedBy: "David Kim",
    evaluatedDate: "2025-12-20",
  },
]

// =====================
// NEW: Zachry Major Distribution Mock Data
// =====================
export const zachryMajorDistribution: MajorDistribution[] = [
  { major: "Mechanical Engineering", zachryPercent: 22, recruitedPercent: 60 },
  { major: "Electrical Engineering", zachryPercent: 15, recruitedPercent: 50 },
  { major: "Computer Science", zachryPercent: 18, recruitedPercent: 50 },
  { major: "Chemical Engineering", zachryPercent: 10, recruitedPercent: 40 },
  { major: "Civil Engineering", zachryPercent: 12, recruitedPercent: 20 },
  { major: "Petroleum Engineering", zachryPercent: 5, recruitedPercent: 60 },
  { major: "Aerospace Engineering", zachryPercent: 8, recruitedPercent: 30 },
  { major: "Industrial Engineering", zachryPercent: 6, recruitedPercent: 20 },
  { major: "Computer Engineering", zachryPercent: 4, recruitedPercent: 40 },
]

// =====================
// Helper Functions
// =====================
export function getCompanyFinancials(companyName: string): CompanyFinancials | undefined {
  return companyFinancials.find(f => f.companyName === companyName)
}

export function getCompanyTimeline(companyName: string): TimelineEntry[] {
  return companyTimelines.filter(t => t.companyName === companyName)
}

export function getCompanyScore(companyName: string): CompanyScore | undefined {
  return companyScores.find(s => s.companyName === companyName)
}

export function getCompanyChat(companyName: string): ChatMessage[] {
  return chatMessages.filter(c => c.companyName === companyName)
}

export function getHighRiskCompanies(): CompanyFinancials[] {
  return companyFinancials.filter(f => f.debtRiskFlag === "High")
}

export function getTotalReceivables(): number {
  return companyFinancials.reduce((sum, f) => sum + f.balanceDue, 0)
}

/** Placeholder booth Wi‑Fi / queue info for the registrations detail sheet */
export type CompanyRegistrationExtras = {
  wifiDeviceCount: number
  companyQueue: "Yes" | "No"
}

export const companyRegistrationExtras: Record<string, CompanyRegistrationExtras> = {
  Chevron: { wifiDeviceCount: 12, companyQueue: "Yes" },
  ExxonMobil: { wifiDeviceCount: 18, companyQueue: "No" },
  "Texas Instruments": { wifiDeviceCount: 8, companyQueue: "Yes" },
  "Lockheed Martin": { wifiDeviceCount: 14, companyQueue: "No" },
  Amazon: { wifiDeviceCount: 22, companyQueue: "Yes" },
  Shell: { wifiDeviceCount: 4, companyQueue: "No" },
  Halliburton: { wifiDeviceCount: 9, companyQueue: "Yes" },
  Boeing: { wifiDeviceCount: 11, companyQueue: "No" },
  Microsoft: { wifiDeviceCount: 20, companyQueue: "Yes" },
  Schlumberger: { wifiDeviceCount: 3, companyQueue: "No" },
}

export function getCompanyRegistrationExtras(companyName: string): CompanyRegistrationExtras {
  return (
    companyRegistrationExtras[companyName] ?? {
      wifiDeviceCount: 5,
      companyQueue: "No",
    }
  )
}

export function getMemberById(id: string): SECMember | undefined {
  return secMembers.find(m => m.id === id)
}

export function getMemberByInitials(initials: string): SECMember | undefined {
  return secMembers.find(m => m.initials === initials)
}

export function getMemberMeals(memberId: string): MealAssignment[] {
  return mealAssignments.filter(m => m.memberId === memberId)
}

export function getEventsByCompany(companyName: string): EventLogistics[] {
  return eventLogistics.filter(e => e.hostCompany === companyName || e.hostCompany === "Multiple")
}

// Package pricing for reference
export const packagePricing: Record<string, number> = {
  Platinum: 7500,
  Gold: 5000,
  Silver: 3000,
  Bronze: 1500,
}
