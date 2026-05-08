import type { CompanyRecord, CompanyScoring, MajorAnalytics, RegistrationStatus } from "./types"

/**
 * Composite, explainable company score (0–100).
 *
 * Weights:
 *   - relationship       25%
 *   - hiringOutcomes     20%
 *   - engagementHistory  15%
 *   - majorDemandFit     15%
 *   - financialValue     10%
 *   - operationalReady   10%
 *   - workAuth/sponsor    5%
 *
 * Returns sub-scores already on a 0–100 scale so the UI can show breakdowns.
 */

const WEIGHTS = {
  relationship: 0.25,
  hiring: 0.2,
  engagement: 0.15,
  majorFit: 0.15,
  financial: 0.1,
  operational: 0.1,
  workAuth: 0.05,
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
}

function relationshipSubScore(c: CompanyRecord): number {
  const r = c.relationship
  // F25 selection has a curated 0..20 relationship field; trust it when present.
  if (r.relationshipScoreF25 != null) {
    return clamp((r.relationshipScoreF25 / 20) * 100)
  }
  let s = 0
  if (r.attendedPastFairs) s += 20
  if (r.outsideEngagement) s += 15
  if (r.fycfParticipant) s += 10
  if (r.alumniPresence) s += 15
  if (r.careerCenterPartner) s += 20
  if (r.coeDonor) s += 20
  return clamp(s)
}

function hiringSubScore(c: CompanyRecord): number {
  if (!c.totalHires) return 0
  // 0 hires => 0, 25+ hires => 100 (logarithmic feel)
  return clamp(Math.round(Math.log2(c.totalHires + 1) * 18))
}

function engagementSubScore(c: CompanyRecord): number {
  const attended = c.semestersAttended.length
  // 0 → 0, 5+ → 100
  return clamp(attended * 20)
}

function majorFitSubScore(
  c: CompanyRecord,
  majorAnalytics: MajorAnalytics[],
): number {
  if (!c.currentRegistration?.majors?.length && !c.f25Selection?.primaryMajor) return 50
  const majorsToCheck: string[] = []
  if (c.currentRegistration?.topMajor) majorsToCheck.push(c.currentRegistration.topMajor)
  if (c.f25Selection?.primaryMajor) majorsToCheck.push(c.f25Selection.primaryMajor)
  if (c.currentRegistration?.majors) majorsToCheck.push(...c.currentRegistration.majors)
  if (!majorsToCheck.length) return 50
  // Match by extracting major code (e.g. "Civil Engineering (CVEN)" → CVEN)
  const codes = new Set<string>()
  for (const m of majorsToCheck) {
    const code = m.match(/\(([A-Z]{3,5})\)/)?.[1]
    if (code) codes.add(code)
    const upper = m.trim().toUpperCase()
    if (/^[A-Z]{3,5}$/.test(upper)) codes.add(upper)
  }
  let score = 50
  for (const code of codes) {
    const ma = majorAnalytics.find((m) => m.major.toUpperCase() === code)
    if (!ma) continue
    if (ma.needMore) score += 25
    if (ma.needLess) score -= 15
    if ((ma.fillPercent ?? 0) > 90) score -= 10
  }
  return clamp(score)
}

function financialSubScore(c: CompanyRecord): number {
  // Donor or career center partner is strong financial value.
  let s = 0
  if (c.relationship.coeDonor) s += 40
  if (c.relationship.careerCenterPartner) s += 30
  // package tier in current registration
  const pkg = c.currentRegistration?.package
  if (pkg) {
    const tier = (pkg.tier ?? "").toLowerCase()
    if (tier === "platinum") s += 30
    else if (tier === "gold") s += 22
    else if (tier === "silver") s += 14
    else if (tier === "bronze") s += 8
    else if (tier === "basic") s += 5
  }
  // revenue bonus (very rough)
  if ((c.revenueMillionsUSD ?? 0) > 1000) s += 10
  return clamp(s)
}

function operationalSubScore(c: CompanyRecord): number {
  // Inverse of missing info.
  const reg = c.currentRegistration
  if (!reg) return 40
  let missing = 0
  let total = 0
  total++; if (!reg.repCount && !reg.repsDay1 && !reg.repsDay2) missing++
  total++; if (!reg.boothLocation) missing++
  total++; if (!reg.daysAttending) missing++
  total++; if (!reg.package) missing++
  total++; if (!reg.majors?.length) missing++
  total++; if (!reg.workAuthorization?.length) missing++
  total++; if (!reg.wifi) missing++
  return clamp(Math.round(((total - missing) / total) * 100))
}

function workAuthSubScore(c: CompanyRecord): number {
  if (c.willingToSponsor === true) return 100
  if (c.willingToSponsor === false) return 30
  // F25 selection has a 0..15 work authorization field
  const f25 = c.f25Selection?.workAuthScore ?? c.f25SortedHistory?.workAuth ?? null
  if (f25 != null) return clamp((f25 / 15) * 100)
  return 50
}

export function getCompanyScore(
  c: CompanyRecord,
  majorAnalytics: MajorAnalytics[],
  status?: RegistrationStatus | null,
): CompanyScoring {
  const relationshipScore = relationshipSubScore(c)
  const hiringScore = hiringSubScore(c)
  const engagementScore = engagementSubScore(c)
  const majorFitScore = majorFitSubScore(c, majorAnalytics)
  const financialScore = financialSubScore(c)
  const operationalScore = operationalSubScore(c)
  const workAuthScore = workAuthSubScore(c)

  const totalScore = clamp(
    Math.round(
      relationshipScore * WEIGHTS.relationship +
        hiringScore * WEIGHTS.hiring +
        engagementScore * WEIGHTS.engagement +
        majorFitScore * WEIGHTS.majorFit +
        financialScore * WEIGHTS.financial +
        operationalScore * WEIGHTS.operational +
        workAuthScore * WEIGHTS.workAuth,
    ),
  )

  let priorityBadge: CompanyScoring["priorityBadge"] = "Needs Review"
  if (totalScore >= 70) priorityBadge = "High Priority"
  else if (totalScore >= 55) priorityBadge = "Good Fit"
  else if (totalScore >= 35) priorityBadge = "Needs Review"
  else priorityBadge = "Low Priority"

  // Recommendation
  const reasons: string[] = []
  let recommendation: CompanyScoring["recommendation"] = "Needs More Information"
  if (operationalScore < 60) {
    recommendation = "Needs More Information"
    reasons.push("Registration form is missing key fields.")
  } else if (totalScore >= 70 && hiringScore >= 35 && relationshipScore >= 40) {
    recommendation = "Recommended for Acceptance"
    reasons.push("Strong relationship, hiring history, and complete registration.")
  } else if (relationshipScore >= 40 && engagementScore < 20) {
    recommendation = "Recommended for Review"
    reasons.push("Strong A&M relationship but no recent attendance — review recent fit.")
  } else if (totalScore < 40) {
    recommendation = "Recommended for Denial"
    reasons.push("Low overall score with limited indicators of strong fit.")
  } else if (totalScore < 55) {
    recommendation = "Recommended for Waitlist"
    reasons.push("Mid-range score — keep on waitlist pending booth availability.")
  } else if (status === "BTT Pending" || status === "Pending") {
    recommendation = "Recommended for BTT"
    reasons.push("Score acceptable; consider BTT path if booth space tight.")
  } else {
    recommendation = "Recommended for Review"
    reasons.push("Mixed indicators — coordinator review needed.")
  }

  if (relationshipScore >= 60) reasons.push(`Strong A&M relationship (${relationshipScore})`)
  if (engagementScore >= 60) reasons.push(`Consistent attendance across ${c.semestersAttended.length} semesters`)
  if (hiringScore >= 60) reasons.push(`Hires TAMU students (${c.totalHires} total)`)
  if (financialScore >= 60) reasons.push("Donor or top package tier")
  if (operationalScore < 60) reasons.push("Registration is missing required fields")
  if (workAuthScore >= 80) reasons.push("Sponsorship-friendly")

  return {
    totalScore,
    relationshipScore: Math.round(relationshipScore),
    hiringScore: Math.round(hiringScore),
    engagementScore: Math.round(engagementScore),
    majorFitScore: Math.round(majorFitScore),
    financialScore: Math.round(financialScore),
    operationalScore: Math.round(operationalScore),
    workAuthScore: Math.round(workAuthScore),
    recommendation,
    recommendationReason: reasons[0] ?? "Mixed indicators — review carefully.",
    priorityBadge,
    explanation: reasons,
  }
}
