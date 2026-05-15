import type { EnrichmentConfidence } from "@/lib/types"
import type { FmpSearchHit } from "./fmpClient"

const SUFFIX_TOKENS = new Set([
  "inc",
  "incorporated",
  "corp",
  "corporation",
  "co",
  "company",
  "llc",
  "ltd",
  "limited",
  "lp",
  "plc",
  "usa",
])

export function normalizeCompanyName(name: string): string {
  let s = name.toLowerCase()
  s = s.replace(/[^a-z0-9\s]/gi, " ")
  s = s.replace(/\s+/g, " ").trim()
  const parts = s.split(" ").filter(Boolean)
  while (parts.length > 1 && SUFFIX_TOKENS.has(parts[parts.length - 1]!)) {
    parts.pop()
  }
  return parts.join(" ")
}

export function extractDomainFromEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== "string") return null
  const at = email.trim().indexOf("@")
  if (at < 0 || at === email.length - 1) return null
  const domain = email.slice(at + 1).trim().toLowerCase()
  if (!domain || domain.includes(" ") || domain.includes("@")) return null
  return domain
}

export function scoreCompanyMatch(inputCompanyName: string, candidateCompanyName: string): number {
  const na = normalizeCompanyName(inputCompanyName)
  const nb = normalizeCompanyName(candidateCompanyName)
  if (!na || !nb) return 0
  if (na === nb) return 1

  const tokensA = na.split(" ").filter(Boolean)
  const tokensB = nb.split(" ").filter(Boolean)
  const setA = new Set(tokensA)
  const setB = new Set(tokensB)
  let inter = 0
  for (const t of setA) {
    if (setB.has(t)) inter++
  }
  const union = setA.size + setB.size - inter
  const jaccard = union === 0 ? 0 : inter / union

  let contain = 0
  if (na.includes(nb) || nb.includes(na)) {
    contain = Math.min(na.length, nb.length) / Math.max(na.length, nb.length)
  }

  return Math.max(jaccard, contain * 0.96)
}

function isAmbiguousShortInput(normalizedInput: string): boolean {
  const tokens = normalizedInput.split(" ").filter(Boolean)
  return tokens.length === 1 && tokens[0]!.length <= 5
}

function confidenceFromScores(
  inputRaw: string,
  candidateName: string,
  score: number,
): EnrichmentConfidence {
  const inputNorm = normalizeCompanyName(inputRaw)
  const candNorm = normalizeCompanyName(candidateName)

  if (!inputNorm || !candNorm) return "low"
  if (inputNorm === candNorm) return "high"

  const ambiguousShort = isAmbiguousShortInput(inputNorm)

  const contained =
    candNorm.includes(inputNorm) ||
    inputNorm.includes(candNorm) ||
    candNorm.startsWith(`${inputNorm} `) ||
    inputNorm.startsWith(`${candNorm} `)

  let tier: EnrichmentConfidence = "low"
  if (score >= 0.75) tier = "medium"
  if (contained && score >= 0.9) tier = "high"
  if (!contained && score >= 0.9 && !ambiguousShort) tier = "high"

  if (ambiguousShort) {
    if (inputNorm === candNorm) return "high"
    if (candNorm.startsWith(`${inputNorm} `) && score >= 0.78) return score >= 0.88 ? "high" : "medium"
    if (score >= 0.75 && candNorm.startsWith(`${inputNorm} `)) return "medium"
    return "low"
  }

  return tier
}

export type BestFmpChoice = {
  symbol: string
  name: string
  score: number
  confidence: EnrichmentConfidence
}

export function chooseBestFmpCandidate(
  inputCompanyName: string,
  candidates: FmpSearchHit[],
): BestFmpChoice | null {
  const trimmed = inputCompanyName.trim()
  if (!trimmed || !candidates.length) return null

  let best: { hit: FmpSearchHit; score: number } | null = null
  for (const hit of candidates) {
    const sym = hit.symbol?.trim()
    const nm = hit.name?.trim()
    if (!sym || !nm) continue
    const score = scoreCompanyMatch(trimmed, nm)
    if (!best || score > best.score) best = { hit, score }
  }
  if (!best || best.score < 0.35) return null

  const confidence = confidenceFromScores(trimmed, best.hit.name!, best.score)
  if (confidence === "low") return null

  return {
    symbol: best.hit.symbol!.trim(),
    name: best.hit.name!.trim(),
    score: best.score,
    confidence,
  }
}
