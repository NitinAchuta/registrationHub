"use client"

import { useCallback, useEffect, useState } from "react"
import type { CompanyRecord } from "@/lib/types"
import {
  companyRecordsFromExportRegistrations,
  type F26Registration,
} from "@/lib/parseExportCompanies"

const CACHE_KEY = "sec-career-fair-export-cache"
const DAY_MS = 86400000

type CachePayload = { fetchedAt: string; data: F26Registration[] }

export function useF26Registrations(enabled: boolean) {
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const applyPayload = useCallback((regs: F26Registration[]) => {
    setCompanies(companyRecordsFromExportRegistrations(regs))
  }, [])

  const fetchFromApi = useCallback(
    async (force: boolean) => {
      const url = force ? "/api/sheets/export?force=true" : "/api/sheets/export"
      const res = await fetch(url, { cache: "no-store" })
      const json = (await res.json().catch(() => ({}))) as { error?: string; data?: F26Registration[] }
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string"
            ? json.error
            : "Could not load F26 registrations from Google Sheets.",
        )
      }
      const data = json.data
      if (!Array.isArray(data)) {
        throw new Error("Could not load F26 registrations from Google Sheets.")
      }
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ fetchedAt: new Date().toISOString(), data } satisfies CachePayload),
        )
      } catch {
        /* ignore quota */
      }
      applyPayload(data)
    },
    [applyPayload],
  )

  const refresh = useCallback(
    async (force = false) => {
      if (!enabled) return
      setLoading(true)
      setError(null)
      try {
        if (!force && typeof window !== "undefined") {
          const raw = localStorage.getItem(CACHE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw) as CachePayload
            if (parsed.fetchedAt && Array.isArray(parsed.data)) {
              const age = Date.now() - new Date(parsed.fetchedAt).getTime()
              if (age >= 0 && age < DAY_MS) {
                applyPayload(parsed.data)
                setLoading(false)
                return
              }
            }
          }
        }
        await fetchFromApi(force)
      } catch (e) {
        console.error("[useF26Registrations]", e)
        setError(
          e instanceof Error ? e.message : "Could not load F26 registrations from Google Sheets.",
        )
        setCompanies([])
      } finally {
        setLoading(false)
      }
    },
    [enabled, applyPayload, fetchFromApi],
  )

  useEffect(() => {
    if (!enabled) {
      setCompanies([])
      setError(null)
      setLoading(false)
      return
    }
    void refresh(false)
  }, [enabled]) // refresh is stable enough when only toggling F26; avoids refetch loops

  return { companies, error, loading, refresh }
}
