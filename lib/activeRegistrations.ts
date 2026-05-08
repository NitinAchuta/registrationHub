import { ACTIVE_FAIR } from "./fairConfig"
import type { RegistrationRow } from "./types"

export type ActiveRegistrationSeed = {
  term: string
  semester: string
  companyName: string
  industry: string
  topMajor: string
  requestedPackage: string
  status: string
  assignedTo: string
  daysAttending: string
  powerRequired: string
  repCount: number
  poweredDevices: number
  balanceDue: number
  lastPaid: string
  virtualFair: string
  wifiRequested: string
  companyQueue: string
  boothLocation: string
  attendeeType: string
  majorsRecruited: string[]
  degreeLevels: string[]
  positionTypes: string[]
  workAuthorization: string[]
}

export const activeRegistrationSeed: ActiveRegistrationSeed[] = [
  {
    term: ACTIVE_FAIR.label,
    semester: ACTIVE_FAIR.code,
    companyName: "Chevron",
    industry: "Energy",
    topMajor: "Petroleum Engineering",
    requestedPackage: "Platinum",
    status: "Pending",
    assignedTo: "Unassigned",
    daysAttending: "Both Days",
    powerRequired: "Required",
    repCount: 3,
    poweredDevices: 22,
    balanceDue: 5000,
    lastPaid: "Fall 2025",
    virtualFair: "Yes",
    wifiRequested: "Requested",
    companyQueue: "Yes",
    boothLocation: "Not assigned yet",
    attendeeType: "In-Person",
    majorsRecruited: [
      "Petroleum Engineering",
      "Chemical Engineering",
      "Mechanical Engineering",
    ],
    degreeLevels: ["Junior", "Senior", "Masters"],
    positionTypes: ["Full-Time", "Internship"],
    workAuthorization: [
      "US Citizen",
      "Permanent Resident",
      "H-1B",
      "OPT/CPT",
      "Any",
    ],
  },
]

export function toRegistrationRow(seed: ActiveRegistrationSeed): RegistrationRow {
  return {
    semester: seed.semester,
    term: seed.term,
    rawOrganization: seed.companyName,
    industry: seed.industry,
    topMajor: seed.topMajor,
    majors: seed.majorsRecruited,
    degreeLevels: seed.degreeLevels,
    positionTypes: seed.positionTypes,
    workAuthorization: seed.workAuthorization,
    package: {
      raw: seed.requestedPackage,
      tier: seed.requestedPackage,
      days: seed.daysAttending === "Both Days" ? "Two-Day" : seed.daysAttending,
      priceUSD: null,
    },
    packageRaw: seed.requestedPackage,
    virtualFair: seed.virtualFair === "Yes",
    wifi: `${seed.wifiRequested}; ${seed.poweredDevices} powered devices`,
    wifiRequested: seed.wifiRequested,
    powerRequired: seed.powerRequired,
    poweredDevices: seed.poweredDevices,
    companyQueue: seed.companyQueue,
    balanceDue: seed.balanceDue,
    lastPaid: seed.lastPaid,
    boothLocation: seed.boothLocation,
    attendeeType: seed.attendeeType,
    daysAttending: seed.daysAttending,
    status: seed.status,
    registeredOnRaw: undefined,
    repCount: seed.repCount,
    repsDay1: null,
    repsDay2: null,
  }
}
