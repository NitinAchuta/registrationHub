"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CompanyEnrichment, EnrichmentConfidence } from "@/lib/types"
import { formatCompactUsd, formatEmployeesCount } from "@/lib/format"

type Props = {
  exportRowNumber: number | null | undefined
}

function confidenceBadgeVariant(c: EnrichmentConfidence): "default" | "secondary" | "destructive" | "outline" {
  if (c === "high") return "default"
  if (c === "medium") return "secondary"
  return "outline"
}

function formatSources(e: CompanyEnrichment): string {
  const parts = [e.revenueSource, e.marketCapSource, e.employeesSource].filter(
    (s): s is string => Boolean(s?.trim()),
  )
  const uniq = [...new Set(parts)]
  return uniq.length ? uniq.join(" · ") : "Not available."
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2 border-b border-border/60 py-1.5 text-xs last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

export function CompanyEnrichmentPanel({ exportRowNumber }: Props) {
  const [sheetLoading, setSheetLoading] = useState(false)
  const [runLoading, setRunLoading] = useState(false)
  const [runMode, setRunMode] = useState<null | "normal" | "force">(null)
  const [error, setError] = useState<string | null>(null)
  const [runHint, setRunHint] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [data, setData] = useState<CompanyEnrichment | null>(null)

  const loadFromSheet = useCallback(async () => {
    if (exportRowNumber == null || !Number.isInteger(exportRowNumber)) {
      setData(null)
      setError(null)
      return
    }

    setSheetLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/enrichment?rowNumber=${encodeURIComponent(String(exportRowNumber))}`, {
        cache: "no-store",
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        data?: CompanyEnrichment | null
        error?: string
      }
      if (!res.ok) {
        throw new Error(json.error || "Could not load enrichment.")
      }
      setData(json.data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load enrichment.")
    } finally {
      setSheetLoading(false)
    }
  }, [exportRowNumber])

  useEffect(() => {
    void loadFromSheet()
  }, [loadFromSheet])

  async function callRun(force: boolean) {
    if (exportRowNumber == null || !Number.isInteger(exportRowNumber)) return
    setRunLoading(true)
    setRunMode(force ? "force" : "normal")
    setRunHint(null)
    setRunError(null)
    try {
      const res = await fetch("/api/enrichment/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowNumber: exportRowNumber, force }),
        cache: "no-store",
      })
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean
        enriched?: number
        skippedFresh?: number
        error?: string
      }
      if (!res.ok) {
        throw new Error(json.error || "Enrichment failed.")
      }
      const enriched = json.enriched ?? 0
      const skipped = json.skippedFresh ?? 0
      if (enriched === 0 && skipped > 0 && !force) {
        setRunHint(
          "No FMP calls were made — this row was already enriched within the last 30 days. Use Force refresh if you need new data.",
        )
      } else if (enriched > 0) {
        setRunHint(force ? "Refetched from FMP and saved to your spreadsheet." : "Fetched from FMP and saved to your spreadsheet.")
      }
      await loadFromSheet()
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Enrichment failed.")
    } finally {
      setRunLoading(false)
      setRunMode(null)
    }
  }

  if (exportRowNumber == null || !Number.isInteger(exportRowNumber)) return null

  return (
    <section className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company Enrichment</h4>
        {data ? (
          <Badge variant={confidenceBadgeVariant(data.confidence)} className="text-[10px] capitalize">
            {data.confidence}
          </Badge>
        ) : null}
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">
        Display always loads from the <strong>Company Enrichment</strong> sheet — revisiting this company does not use
        FMP credits. Only the buttons below call Financial Modeling Prep.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={runLoading || sheetLoading}
          onClick={() => void callRun(false)}
        >
          {runMode === "normal" ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Updating…
            </>
          ) : (
            "Refresh enrichment"
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={runLoading || sheetLoading}
          onClick={() => void callRun(true)}
        >
          {runMode === "force" ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Forcing…
            </>
          ) : (
            "Force from FMP"
          )}
        </Button>
      </div>

      {runHint ? <p className="text-[11px] text-muted-foreground">{runHint}</p> : null}
      {runError ? <p className="text-[11px] text-destructive">{runError}</p> : null}

      {sheetLoading && !runLoading ? (
        <p className="text-xs text-muted-foreground">Loading enrichment…</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {!sheetLoading && !error && !data ? (
        <p className="text-xs text-muted-foreground">
          No enrichment row yet for this company. Click <strong>Refresh enrichment</strong> once to fetch from FMP (or
          use Operations for an all-companies run).
        </p>
      ) : null}

      {data && data.confidence === "low" ? (
        <div className="space-y-2 text-xs">
          <p className="font-medium text-foreground">No confident public-company match found.</p>
          <p className="text-muted-foreground">
            This company may be private, ambiguous, or missing from the enrichment source.
          </p>
          {data.lastUpdated ? (
            <p className="text-[11px] text-muted-foreground">
              Last updated: {new Date(data.lastUpdated).toLocaleString()}
            </p>
          ) : null}
        </div>
      ) : null}

      {data && (data.confidence === "high" || data.confidence === "medium") ? (
        <dl className="space-y-0">
          <KV label="Revenue" value={formatCompactUsd(data.revenue)} />
          <KV label="Market Cap" value={formatCompactUsd(data.marketCap)} />
          <KV label="Employees" value={formatEmployeesCount(data.employees)} />
          <KV label="Ticker" value={data.ticker?.trim() ? data.ticker : "Not available."} />
          <KV label="CIK" value={data.cik?.trim() ? data.cik : "Not available."} />
          <KV label="Source" value={formatSources(data)} />
          <KV label="Confidence" value={data.confidence.charAt(0).toUpperCase() + data.confidence.slice(1)} />
          <KV
            label="Last Updated"
            value={
              data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : "Not available."
            }
          />
        </dl>
      ) : null}
    </section>
  )
}
