import type { MajorAnalytics } from "./types"
import { MAJOR_CODES_ORDERED } from "./majors"

/** Default F26 booth allocation weights (editable via booth analytics overrides). */
export function defaultBoothRowsFromMajorAnalytics(majorAnalytics: MajorAnalytics[]) {
  return MAJOR_CODES_ORDERED.map((code) => {
    const row =
      majorAnalytics.find((x) => x.major === code) ||
      majorAnalytics.find((x) => (x.major || "").toUpperCase().includes(code))
    const wedThu = (row?.requestedWedBooths ?? 0) + (row?.requestedThuBooths ?? 0)
    const requestedBooths = wedThu > 0 ? wedThu : row?.allocatedBooths ?? 0
    return {
      majorCode: code,
      majorLabel: row?.major ?? code,
      allocatedBooths: row?.allocatedBooths ?? 0,
      confirmedBooths: row?.totalBoothsConfirmed ?? 0,
      requestedBooths: requestedBooths,
      notes: "",
    }
  })
}
