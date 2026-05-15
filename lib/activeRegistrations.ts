import { ACTIVE_FAIR } from "./fairConfig"
import type { RegistrationRow } from "./types"
import { defaultF26Meta } from "./f26Registration"

export type ActiveRegistrationSeed = {
  term: string
  semester: string
  companyName: string
  industry: string
  /** Major code */
  topMajor: string
  packageTier: string
  duration: string
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
  /** ISO date YYYY-MM-DD */
  dateRegistered: string
}

export const activeRegistrationSeed: ActiveRegistrationSeed[] = []

export function toRegistrationRow(seed: ActiveRegistrationSeed): RegistrationRow {
  const pkgRaw = `${seed.packageTier} ${seed.duration}`
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
      raw: pkgRaw,
      tier: seed.packageTier,
      days: seed.duration,
      priceUSD: null,
    },
    packageRaw: pkgRaw,
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
    registeredOnRaw: seed.dateRegistered,
    repCount: seed.repCount,
    repsDay1: null,
    repsDay2: null,
    f26Meta: {
      ...defaultF26Meta(),
      symplicityUpdated: false,
    },
  }
}
