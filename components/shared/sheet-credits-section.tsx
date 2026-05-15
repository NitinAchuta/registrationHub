"use client"

import { useCallback, useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CompanyCredit } from "@/lib/types"
import { findApprovedUserByEmail } from "@/lib/auth/approved-users"

type Props = {
  companyName: string
  exportRowNumber?: number | null
  /** Called after a credit is successfully appended */
  onCreditAdded?: () => void
}

export function SheetCreditsSection({ companyName, exportRowNumber, onCreditAdded }: Props) {
  const { user } = useUser()
  const [credits, setCredits] = useState<CompanyCredit[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!companyName.trim()) return
    setLoading(true)
    setLoadError(null)
    try {
      const params = new URLSearchParams()
      params.set("companyName", companyName.trim())
      if (exportRowNumber != null && Number.isInteger(exportRowNumber)) {
        params.set("rowNumber", String(exportRowNumber))
      }
      const res = await fetch(`/api/sheets/credits?${params.toString()}`, { cache: "no-store" })
      const json = (await res.json()) as { error?: string; data?: CompanyCredit[] }
      if (!res.ok) {
        throw new Error(
          json.error ??
            "Credit read failed. Ensure Google Sheets is configured and a Credits tab exists.",
        )
      }
      setCredits(Array.isArray(json.data) ? json.data : [])
    } catch (e) {
      setCredits([])
      setLoadError(e instanceof Error ? e.message : "Could not load credits.")
    } finally {
      setLoading(false)
    }
  }, [companyName, exportRowNumber])

  useEffect(() => {
    void load()
  }, [load])

  const total = credits.reduce((s, c) => s + c.amount, 0)

  const submit = async () => {
    setFormError(null)
    const n = Number.parseFloat(amount)
    if (!reason.trim()) {
      setFormError("Reason is required.")
      return
    }
    if (!Number.isFinite(n) || n <= 0) {
      setFormError("Enter a positive dollar amount.")
      return
    }

    const approved = findApprovedUserByEmail(user?.primaryEmailAddress?.emailAddress)
    const createdBy =
      approved?.fullName?.trim() ||
      user?.fullName?.trim() ||
      user?.firstName?.trim() ||
      user?.primaryEmailAddress?.emailAddress ||
      "Dashboard"

    setSubmitting(true)
    try {
      const res = await fetch("/api/sheets/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          companyName: companyName.trim(),
          rowNumber: exportRowNumber ?? undefined,
          amount: n,
          reason: reason.trim(),
          createdBy,
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        throw new Error(
          json.error ??
            "Credit writeback requires Google Sheets with a Credits tab (see .env.example).",
        )
      }
      setAmount("")
      setReason("")
      await load()
      onCreditAdded?.()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save credit.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credits</p>
          <p className="text-[11px] text-muted-foreground">
            Track dollar credits applied to this company and why. Stored in the Google Sheet Credits tab.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Total ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Badge>
      </div>

      {loading ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading credits…</p>
      ) : loadError ? (
        <p className="mt-3 text-xs text-amber-800">{loadError}</p>
      ) : credits.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">No credits recorded yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {credits.map((c) => (
            <li
              key={c.id}
              className="rounded-md border border-border bg-background p-2 text-xs leading-relaxed"
            >
              <span className="font-semibold">${c.amount.toLocaleString()}</span>
              <span className="text-muted-foreground"> credit</span>
              <p className="mt-1">{c.reason}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Added: {c.createdAt}
                {c.createdBy ? ` · ${c.createdBy}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 space-y-2 border-t border-border pt-3">
        <Label className="text-xs text-muted-foreground">Add credit</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Textarea
            className="sm:col-span-2 min-h-[72px]"
            placeholder="Reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        {formError ? <p className="text-xs text-destructive">{formError}</p> : null}
        <Button type="button" size="sm" disabled={submitting} onClick={() => void submit()}>
          {submitting ? "Saving…" : "Add Credit"}
        </Button>
      </div>
    </div>
  )
}
