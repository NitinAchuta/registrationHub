"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import type { HistoricalCompanyProfile, YesNoUnknown } from "@/lib/types"

type Props = {
  companyName: string
}

function yesNoBadgeClass(v: YesNoUnknown): string {
  if (v === "Yes") return "bg-emerald-100 text-emerald-800 border-emerald-200"
  if (v === "No") return "bg-slate-100 text-slate-700 border-slate-300"
  return "bg-muted/50 text-muted-foreground border-border"
}

function displayValue(v: string | null | undefined): string {
  const s = v?.trim()
  return s ? s : "Not available."
}

export function HistoricalCompanyProfilePanel({ companyName }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ambiguous, setAmbiguous] = useState(false)
  const [profile, setProfile] = useState<HistoricalCompanyProfile | null>(null)

  const load = useCallback(async () => {
    const name = companyName.trim()
    if (!name) {
      setProfile(null)
      setAmbiguous(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/company-profiles?companyName=${encodeURIComponent(name)}`,
        { cache: "no-store" },
      )
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean
        profile?: HistoricalCompanyProfile | null
        ambiguous?: boolean
        error?: string
      }
      if (!res.ok) {
        throw new Error(json.error || "Could not load historical profile.")
      }
      setAmbiguous(Boolean(json.ambiguous))
      setProfile(json.profile ?? null)
    } catch (e) {
      setProfile(null)
      setAmbiguous(false)
      setError(e instanceof Error ? e.message : "Could not load historical profile.")
    } finally {
      setLoading(false)
    }
  }, [companyName])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="space-y-4 rounded-md border border-border bg-muted/20 p-3">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Historical Company Profile
        </h4>
        <p className="mt-1 text-[11px] text-muted-foreground">
          From local workbook <span className="font-medium">MASTER - Company Profiles.xlsx</span> (not
          the active Export registration).
        </p>
      </div>

      {loading ? <p className="text-xs text-muted-foreground">Loading historical profile…</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {!loading && !error && ambiguous ? (
        <p className="text-xs text-amber-900">
          Multiple possible historical matches found. Refine the company name or check the master file.
        </p>
      ) : null}

      {!loading && !error && !ambiguous && !profile ? (
        <p className="text-xs text-muted-foreground">
          No historical profile data found for this company.
        </p>
      ) : null}

      {profile ? (
        <div className="space-y-4">
          <Subsection
            title="Hiring History from Exit Surveys"
            helper="Exit survey values indicate whether students reported being hired by this company during each semester."
          >
            <div className="overflow-x-auto rounded-md border border-border bg-background">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">Semester</th>
                    <th className="px-2 py-1.5 text-left font-medium">Hired students?</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.exitSurveyHiringHistory.map((row) => (
                    <tr key={row.term} className="border-t border-border/60">
                      <td className="px-2 py-1.5">{row.term}</td>
                      <td className="px-2 py-1.5">
                        <Badge variant="outline" className={yesNoBadgeClass(row.hiredStudents)}>
                          {row.hiredStudents}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Subsection>

          <Subsection title="Career Fair Package History">
            <div className="overflow-x-auto rounded-md border border-border bg-background">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">Term</th>
                    <th className="px-2 py-1.5 text-left font-medium">Package</th>
                    <th className="px-2 py-1.5 text-left font-medium">Attended?</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.careerFairPackageHistory.map((row) => (
                    <tr key={row.term} className="border-t border-border/60">
                      <td className="px-2 py-1.5 font-medium">{row.term}</td>
                      <td className="px-2 py-1.5">{row.package ?? "Did not attend"}</td>
                      <td className="px-2 py-1.5">{row.attended ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Subsection>

          <Subsection title="Relationship / Engagement">
            <dl className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
              <KV label="Student Interest (Instagram)" value={profile.studentInterestInstagram} badge />
              <KV label="Attended CDF (S26)" value={profile.attendedCdfS26} badge />
              <KV label="First Year Career Fair" value={profile.firstYearCareerFair} badge />
            </dl>
          </Subsection>

          <Subsection title="RG Decisions">
            <dl className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-3">
              <KV label="S25" value={displayValue(profile.rgDecisions.s25)} />
              <KV label="F25" value={displayValue(profile.rgDecisions.f25)} />
              <KV label="S26" value={displayValue(profile.rgDecisions.s26)} />
            </dl>
          </Subsection>

          <Subsection title="Contact Snapshot">
            <dl className="grid grid-cols-1 gap-1.5 text-xs">
              <KV label="Most Recent CF Rep Email" value={displayValue(profile.mostRecentCfRep.email)} />
              <KV label="Web TA Contact Email" value={displayValue(profile.webTaContact.email)} />
            </dl>
          </Subsection>
        </div>
      ) : null}
    </section>
  )
}

function Subsection({
  title,
  helper,
  children,
}: {
  title: string
  helper?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div>
        <h5 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h5>
        {helper ? <p className="mt-0.5 text-[11px] text-muted-foreground">{helper}</p> : null}
      </div>
      {children}
    </div>
  )
}

function KV({
  label,
  value,
  badge,
}: {
  label: string
  value: string
  badge?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">
        {badge ? (
          <Badge variant="outline" className={yesNoBadgeClass(value as YesNoUnknown)}>
            {value}
          </Badge>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}
