"use client"

import { useCallback, useEffect, useState } from "react"
import type { HistoricalCompanyProfile } from "@/lib/types"
import { historicalMatchLabel } from "@/lib/historicalProfileMatch"

export function useMasterCompanyProfiles(enabled: boolean) {
  const [profiles, setProfiles] = useState<HistoricalCompanyProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setProfiles([])
      setWarning(null)
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/company-profiles", { cache: "no-store" })
      const json = (await res.json().catch(() => ({}))) as {
        profiles?: HistoricalCompanyProfile[]
        warning?: string
        error?: string
      }
      if (!res.ok) {
        throw new Error(json.error || "Could not load historical profiles.")
      }
      setProfiles(Array.isArray(json.profiles) ? json.profiles : [])
      setWarning(json.warning ?? null)
    } catch {
      setProfiles([])
      setWarning(null)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const matchLabel = useCallback(
    (companyName: string) => historicalMatchLabel(companyName, profiles),
    [profiles],
  )

  return { profiles, loading, warning, matchLabel, refresh }
}
