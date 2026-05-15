"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  CircleDollarSign,
  TrendingUp,
} from "lucide-react"
import type {
  CompanyRecord,
  MajorAnalytics,
  RegistrationStatus,
  SemesterCode,
} from "@/lib/types"
import { ALL_REGISTRATION_STATUSES, FINAL_STATUSES } from "@/lib/types"
import { bttBadgeClass, mapRawStatus, STATUS_BADGE_COLORS } from "@/lib/statusMapping"
import { DEFAULT_F26_PACKAGE_PRICING, LOCAL_STORAGE_KEYS, getPackagePrice } from "@/lib/packagePricing"
import { useLocalStorageState } from "@/hooks/use-local-storage"
import { getCompanyScore } from "@/lib/companyScoring"
import { getDaysUntilDeadline, getMissingInfoLabels } from "@/lib/companyFlags"
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format"

import { ACTIVE_FAIR } from "@/lib/fairConfig"
import { buildActiveF26View, getF26Meta } from "@/lib/f26Registration"
import { MAJOR_CODES_ORDERED } from "@/lib/majors"
import { defaultBoothRowsFromMajorAnalytics } from "@/lib/defaultBoothByMajor"

type Props = {
  companies: CompanyRecord[]
  historicalCompanies: CompanyRecord[]
  activeFairLabel: string
  majorAnalytics: MajorAnalytics[]
  currentSemester: SemesterCode
  assignments: Record<string, string>
}

export function CareerFairAnalyticsView({
  companies,
  historicalCompanies,
  activeFairLabel,
  majorAnalytics,
  currentSemester,
  assignments,
}: Props) {
  const [packagePricing, setPackagePricing] = useLocalStorageState(
    LOCAL_STORAGE_KEYS.packagePricing,
    DEFAULT_F26_PACKAGE_PRICING,
  )

  const seedBoothRows = useMemo(() => defaultBoothRowsFromMajorAnalytics(majorAnalytics), [majorAnalytics])
  const [boothRows, setBoothRows] = useLocalStorageState<typeof seedBoothRows | null>(
    LOCAL_STORAGE_KEYS.boothAnalyticsOverrides,
    null,
  )
  const boothsForEdit = boothRows ?? seedBoothRows

  const updateBoothRow = (idx: number, patch: Partial<(typeof seedBoothRows)[number]>) => {
    const base = boothRows ?? seedBoothRows
    const next = base.map((row, i) => (i === idx ? { ...row, ...patch } : row))
    setBoothRows(next)
  }
  const statusCounts = useMemo(() => {
    const counts: Record<RegistrationStatus, number> = ALL_REGISTRATION_STATUSES.reduce(
      (acc, s) => {
        acc[s] = 0
        return acc
      },
      {} as Record<RegistrationStatus, number>,
    )
    for (const c of companies) {
      const reg = c.currentRegistration
      const s = mapRawStatus(reg?.status)
      if (s) counts[s]++
    }
    return counts
  }, [companies])

  const total = companies.filter((c) => c.currentRegistration).length

  const activeMajorRows = useMemo(() => {
    const counts = new Map<string, { major: string; companies: number; requestedBooths: number }>()
    for (const c of companies) {
      const reg = c.currentRegistration
      if (!reg) continue
      const majors = reg.majors.length > 0 ? reg.majors : reg.topMajor ? [reg.topMajor] : []
      for (const major of majors) {
        const current = counts.get(major) ?? { major, companies: 0, requestedBooths: 0 }
        current.companies += 1
        counts.set(major, current)
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.companies - a.companies)
  }, [companies])

  // Active-cycle booth totals. Export-driven registrations do not populate booth-request fields here yet,
  // so requested/confirmed booth aggregates stay 0 until wired end-to-end.
  const boothTotals = useMemo(() => {
    return { requested: 0, confirmed: 0, allocated: 0, wedReq: 0, wedFinal: 0, thuReq: 0, thuFinal: 0 }
  }, [])

  // Revenue tracking
  const revenue = useMemo(() => {
    const byPackage: Record<string, { count: number; revenue: number }> = {}
    let confirmedRevenue = 0
    let atRiskRevenue = 0
    let totalRevenue = 0
    for (const c of companies) {
      const reg = c.currentRegistration
      if (!reg?.package) continue
      const status =
        mapRawStatus(reg.status) ?? "Pending"
      const price = getPackagePrice(reg.package, packagePricing) ?? 0
      const tier = reg.package.tier ?? "Other"
      byPackage[tier] ??= { count: 0, revenue: 0 }
      byPackage[tier].count++
      byPackage[tier].revenue += price
      totalRevenue += price
      if (status === "Confirmed") {
        confirmedRevenue += price
      } else if (!FINAL_STATUSES.has(status)) {
        atRiskRevenue += price
      }
    }
    return { byPackage, confirmedRevenue, atRiskRevenue, totalRevenue }
  }, [companies, packagePricing])

  // Selection output (table for "Current Decisions")
  const [decisionFilter, setDecisionFilter] = useState("all")
  const [majorFilter, setMajorFilter] = useState("all")
  const [scoreMin, setScoreMin] = useState<number>(0)
  const [highValueOnly, setHighValueOnly] = useState(false)
  const [search, setSearch] = useState("")

  const selectionRows = useMemo(() => {
    return historicalCompanies
      .filter((c) => c.f25Selection)
      .map((c) => {
        const status =
          mapRawStatus(c.f25Selection?.decision) ?? "Pending"
        const scoring = getCompanyScore(c, majorAnalytics, status)
        return {
          company: c,
          scoring,
          status,
          sel: c.f25Selection!,
        }
      })
      .filter((row) => {
        if (search.trim()) {
          const q = search.trim().toLowerCase()
          if (!row.company.canonicalName.toLowerCase().includes(q)) return false
        }
        if (decisionFilter !== "all" && row.sel.decision !== decisionFilter) return false
        if (majorFilter !== "all" && (row.sel.primaryMajor ?? "") !== majorFilter) return false
        if (scoreMin > 0 && row.scoring.totalScore < scoreMin) return false
        if (highValueOnly && row.scoring.priorityBadge !== "High Priority") return false
        return true
      })
      .sort((a, b) => b.scoring.totalScore - a.scoring.totalScore)
  }, [historicalCompanies, majorAnalytics, search, decisionFilter, majorFilter, scoreMin, highValueOnly])

  const decisionOptions = useMemo(() => {
    const set = new Set<string>()
    historicalCompanies.forEach((c) => {
      if (c.f25Selection?.decision) set.add(c.f25Selection.decision)
    })
    return Array.from(set).sort()
  }, [historicalCompanies])

  const majorOptions = useMemo(() => {
    const set = new Set<string>()
    historicalCompanies.forEach((c) => {
      if (c.f25Selection?.primaryMajor) set.add(c.f25Selection.primaryMajor)
    })
    return Array.from(set).sort()
  }, [historicalCompanies])

  // Notifications
  const notifications = useMemo(() => {
    const items: Array<{ id: string; type: "warning" | "danger" | "info"; title: string; description: string; companyId?: string }> = []
    for (const c of companies) {
      const reg = c.currentRegistration
      const status = mapRawStatus(reg?.status) ?? null
      const assignedTo = assignments[`${currentSemester}:${c.id}`] ?? assignments[c.id] ?? "Unassigned"
      const deadline = getDaysUntilDeadline(c)
      const missing = getMissingInfoLabels(c)
      if (deadline != null && deadline <= 7 && status && !FINAL_STATUSES.has(status)) {
        items.push({
          id: `${c.id}-deadline`,
          type: deadline < 0 ? "danger" : "warning",
          title:
            deadline < 0
              ? `Deadline passed for ${c.canonicalName}`
              : `Deadline in ${deadline}d — ${c.canonicalName}`,
          description: `Status still ${status}; 6-week window closes ${deadline < 0 ? `${Math.abs(deadline)} days ago` : `in ${deadline} days`}.`,
          companyId: c.id,
        })
      }
      if (assignedTo === "Unassigned" && (status && !FINAL_STATUSES.has(status))) {
        items.push({
          id: `${c.id}-unassigned`,
          type: "info",
          title: `Unassigned — ${c.canonicalName}`,
          description: "No SEC coordinator assigned to this registration yet.",
          companyId: c.id,
        })
      }
      if (status && !FINAL_STATUSES.has(status) && missing.length >= 3) {
        items.push({
          id: `${c.id}-missing`,
          type: "warning",
          title: `${missing.length} missing fields — ${c.canonicalName}`,
          description: missing.join(", "),
          companyId: c.id,
        })
      }
    }
    return items.sort((a, b) => {
      const order: Record<typeof a.type, number> = { danger: 0, warning: 1, info: 2 }
      return order[a.type] - order[b.type]
    })
  }, [companies, assignments, currentSemester])

  const workflowCounts = useMemo(() => {
    const btt = { Pending: 0, Confirmed: 0 }
    const o2 = { Pending: 0, Confirmed: 0 }
    for (const c of companies) {
      const reg = c.currentRegistration
      if (!reg || reg.semester !== ACTIVE_FAIR.code) continue
      const m = getF26Meta(reg)
      if (m.bttStatus === "Pending" || m.bttStatus === "Confirmed") btt[m.bttStatus]++
      if (m.oneToTwoDayStatus === "Pending" || m.oneToTwoDayStatus === "Confirmed")
        o2[m.oneToTwoDayStatus]++
    }
    return { btt, o2 }
  }, [companies])

  const workflowTileStatuses = ["Pending", "Confirmed"] as const

  const representationRows = useMemo(() => {
    const active = companies.filter((c) => c.currentRegistration?.semester === ACTIVE_FAIR.code)
    const n = active.length || 1
    const primary = new Map<string, number>()
    const recruited = new Map<string, number>()
    let recruitedHits = 0
    for (const c of active) {
      const v = buildActiveF26View(c, currentSemester, `${currentSemester}:${c.id}`, assignments)
      if (!v?.primaryMajor) continue
      primary.set(v.primaryMajor, (primary.get(v.primaryMajor) ?? 0) + 1)
      for (const m of v.majorsRecruited) {
        recruited.set(m, (recruited.get(m) ?? 0) + 1)
        recruitedHits++
      }
    }
    const denomRec = recruitedHits || 1
    const boothDefaults = defaultBoothRowsFromMajorAnalytics(majorAnalytics)
    const allocMap = new Map(boothDefaults.map((r) => [r.majorCode, r.allocatedBooths]))
    const totalAlloc = boothDefaults.reduce((s, r) => s + r.allocatedBooths, 0) || 1
    return MAJOR_CODES_ORDERED.map((code) => ({
      code,
      allocPct: ((allocMap.get(code) ?? 0) / totalAlloc) * 100,
      primaryPct: ((primary.get(code) ?? 0) / n) * 100,
      recruitedPct: ((recruited.get(code) ?? 0) / denomRec) * 100,
    }))
  }, [companies, currentSemester, assignments, majorAnalytics])

  const funnel = useMemo(() => {
    const registered = total
    const confirmed = statusCounts.Confirmed
    return { registered, confirmed, attended: 0, hires: 0 }
  }, [statusCounts, total])

  return (
    <div className="space-y-4">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="booths">Booth analytics</TabsTrigger>
          <TabsTrigger value="majors">Majors</TabsTrigger>
          <TabsTrigger value="selection">Historical selection output</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="notifications">
            <span className="flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5" /> Notifications {notifications.length > 0 && `(${notifications.length})`}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Registration decisions ({activeFairLabel} active)</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["Confirmed", "Denied", "Pending", "Canceled"] as const).map((s) => (
                <Card key={s} className={`border ${STATUS_BADGE_COLORS[s]} p-3`}>
                  <p className="text-xs font-medium uppercase tracking-wide opacity-90">{s}</p>
                  <p className="mt-1 text-2xl font-bold">{statusCounts[s] ?? 0}</p>
                </Card>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">BTT</h3>
            <div className="grid grid-cols-2 gap-3">
              {workflowTileStatuses.map((s) => (
                <Card key={s} className={`border p-3 ${bttBadgeClass(s)}`}>
                  <p className="text-xs font-medium uppercase tracking-wide opacity-90">{s}</p>
                  <p className="mt-1 text-2xl font-bold">{workflowCounts.btt[s]}</p>
                </Card>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">1-2 day</h3>
            <div className="grid grid-cols-2 gap-3">
              {workflowTileStatuses.map((s) => (
                <Card key={s} className={`border p-3 ${bttBadgeClass(s)}`}>
                  <p className="text-xs font-medium uppercase tracking-wide opacity-90">{s}</p>
                  <p className="mt-1 text-2xl font-bold">{workflowCounts.o2[s]}</p>
                </Card>
              ))}
            </div>
          </div>

          <Card className="p-4">
            <h3 className="text-center text-base font-bold">F26 Representation by Primary Major</h3>
            <p className="text-center text-xs text-muted-foreground mb-2">% Allocated Booths vs % of Primary Major of F26 Registered Companies</p>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={representationRows} margin={{ top: 8, right: 12, left: 4, bottom: 64 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="code" tick={{ fontSize: 10 }} angle={-75} textAnchor="end" height={72} interval={0} />
                  <YAxis
                    tickFormatter={(v) => `${Math.round(v)}%`}
                    label={{ value: "Percentage of Companies", angle: -90, position: "insideLeft", style: { textAnchor: "middle" } }}
                  />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="allocPct" name="% Allocated Booths" fill="#2563eb" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="primaryPct" name="% of Primary Major of F26 Registered Companies" fill="#ea580c" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-center text-base font-bold">F26 Representation by All Majors Recruited</h3>
            <p className="text-center text-xs text-muted-foreground mb-2">% Allocated Booths vs % of All Majors Recruited of F26 Registered Companies</p>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={representationRows} margin={{ top: 8, right: 12, left: 4, bottom: 64 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="code" tick={{ fontSize: 10 }} angle={-75} textAnchor="end" height={72} interval={0} />
                  <YAxis tickFormatter={(v) => `${Math.round(v)}%`} label={{ value: "Percentage of Companies", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="allocPct" name="% Allocated Booths" fill="#2563eb" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="recruitedPct" name="% of All Majors Recruited of F26 Registered Companies" fill="#ea580c" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="border-border bg-card p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total active registrations</p>
            <p className="mt-1 text-2xl font-bold">{total}</p>
          </Card>

          {/* Funnel */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold">Registered → confirmed → attended → hires</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <FunnelStep label="Registered" value={funnel.registered} />
              <FunnelStep
                label="Confirmed"
                value={funnel.confirmed}
                rate={funnel.registered > 0 ? (funnel.confirmed / funnel.registered) * 100 : 0}
              />
              <FunnelStep
                label="Attended"
                value={funnel.attended}
                rate={funnel.confirmed > 0 ? (funnel.attended / funnel.confirmed) * 100 : 0}
                note={`${activeFairLabel} attendance not available yet`}
              />
              <FunnelStep
                label="Hires"
                value={funnel.hires}
                rate={funnel.attended > 0 ? (funnel.hires / Math.max(1, funnel.attended)) * 100 : 0}
                note={`${activeFairLabel} outcomes not available yet`}
              />
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold">{activeFairLabel} booth data</h3>
            <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3">
              <BoothBar label="Wed requested → final" req={boothTotals.wedReq} fin={boothTotals.wedFinal} />
              <BoothBar label="Thu requested → final" req={boothTotals.thuReq} fin={boothTotals.thuFinal} />
              <BoothBar label="Allocated → confirmed" req={boothTotals.allocated} fin={boothTotals.confirmed} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Booth-request aggregates from Export registrations are not connected to this panel yet,
              so totals remain 0 until booth counts flow through active registration fields.
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold">Historical Context</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Spring 2026, Fall 2025, and earlier Excel records are retained as company
              background and benchmark data, not active {activeFairLabel} registrations.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <FunnelStep
                label="Historical companies"
                value={historicalCompanies.length}
                note="Excel-driven background profiles"
              />
              <FunnelStep
                label="S26 attendees"
                value={historicalCompanies.filter((c) => c.semestersAttended.includes("S26")).length}
                note="Historical benchmark"
              />
              <FunnelStep
                label="F25 attendees"
                value={historicalCompanies.filter((c) => c.semestersAttended.includes("F25")).length}
                note="Historical benchmark"
              />
              <FunnelStep
                label="Benchmark majors"
                value={majorAnalytics.length}
                note="From F25 Manual Analytics"
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="booths" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold">{activeFairLabel} active majors by registration</h3>
            <div className="mt-3" style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeMajorRows.map((m) => ({
                    major: m.major,
                    Companies: m.companies,
                    Requested: m.requestedBooths,
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="major" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={64} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Requested" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Companies" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Booth analytics by major (editable)</h3>
              <Button size="sm" variant="outline" onClick={() => setBoothRows(null)}>
                Reset to defaults
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Values persist in this browser ({LOCAL_STORAGE_KEYS.boothAnalyticsOverrides}). Major order follows the SEC official list.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Major</th>
                    <th className="px-3 py-2 text-right">Allocated Booths</th>
                    <th className="px-3 py-2 text-right">Confirmed Booths</th>
                    <th className="px-3 py-2 text-right">Requested Booths</th>
                    <th className="px-3 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {boothsForEdit.map((row, idx) => (
                    <tr key={row.majorCode} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs font-medium">{row.majorCode}</td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          className="ml-auto h-8 w-20 text-right"
                          type="number"
                          value={row.allocatedBooths}
                          onChange={(e) => updateBoothRow(idx, { allocatedBooths: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          className="ml-auto h-8 w-20 text-right"
                          type="number"
                          value={row.confirmedBooths}
                          onChange={(e) => updateBoothRow(idx, { confirmedBooths: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          className="ml-auto h-8 w-20 text-right"
                          type="number"
                          value={row.requestedBooths}
                          onChange={(e) => updateBoothRow(idx, { requestedBooths: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={row.notes}
                          onChange={(e) => updateBoothRow(idx, { notes: e.target.value })}
                          placeholder="Notes"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="majors" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold">{activeFairLabel} active major coverage</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Major</th>
                    <th className="px-3 py-2 text-right">Active companies</th>
                    <th className="px-3 py-2 text-right">Requested booths</th>
                    <th className="px-3 py-2 text-left">Context</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMajorRows.map((m) => (
                    <tr key={m.major} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{m.major}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(m.companies)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(m.requestedBooths)}</td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-muted-foreground">
                          Active {activeFairLabel} only
                        </span>
                      </td>
                    </tr>
                  ))}
                  {activeMajorRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No {activeFairLabel} active majors yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {majorAnalytics.some((m) => m.needMore) && (
            <Card className="border-blue-200 bg-blue-50 p-4 text-blue-900">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <AlertCircle className="h-4 w-4" />
                Historical benchmark: under-indexed majors lacking representation
              </h3>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-3">
                {majorAnalytics
                  .filter((m) => m.needMore)
                  .map((m) => (
                    <li key={m.major}>
                      <span className="font-medium">{m.major}</span> — only{" "}
                      {formatPercent(m.fillPercent ?? 0)} filled
                    </li>
                  ))}
              </ul>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="selection" className="space-y-4">
          <Card className="p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold">Historical F25 company selection output</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                This table is a benchmark from the uploaded Fall 2025 selection workbook. It does
                not affect {activeFairLabel} active registration counts.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company…"
                className="w-full md:w-64"
              />
              <Select value={decisionFilter} onValueChange={setDecisionFilter}>
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue placeholder="Decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All decisions</SelectItem>
                  {decisionOptions.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={majorFilter} onValueChange={setMajorFilter}>
                <SelectTrigger className="w-full md:w-56">
                  <SelectValue placeholder="Primary major" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All majors</SelectItem>
                  {majorOptions.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Min score</Label>
                <Input
                  type="number"
                  value={scoreMin}
                  min={0}
                  max={100}
                  onChange={(e) => setScoreMin(Number(e.target.value) || 0)}
                  className="w-20"
                />
              </div>
              <Button
                size="sm"
                variant={highValueOnly ? "default" : "outline"}
                onClick={() => setHighValueOnly((v) => !v)}
              >
                <TrendingUp className="mr-1 h-3.5 w-3.5" /> High value only
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">{selectionRows.length} rows</span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Company</th>
                    <th className="px-3 py-2 text-left">Primary major</th>
                    <th className="px-3 py-2 text-right">Rel.</th>
                    <th className="px-3 py-2 text-right">Rev.</th>
                    <th className="px-3 py-2 text-right">WA</th>
                    <th className="px-3 py-2 text-right">GD</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Wed</th>
                    <th className="px-3 py-2 text-right">Thu</th>
                    <th className="px-3 py-2 text-left">Decision</th>
                    <th className="px-3 py-2 text-left">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {selectionRows.map(({ company, sel, scoring, status }) => (
                    <tr key={company.id} className="border-t border-border">
                      <td className="max-w-[14rem] px-3 py-2">
                        <span className="block truncate font-medium">{company.canonicalName}</span>
                        <span className="block truncate text-xs text-muted-foreground">{company.industry ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{sel.primaryMajor ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(sel.relationshipScore ?? null)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(sel.revenueScore ?? null)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(sel.workAuthScore ?? null)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(sel.glassdoorScore ?? null)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatNumber(sel.totalScore ?? null)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-xs text-muted-foreground">
                          {sel.requestedWedBooths ?? 0}/{sel.finalWedBooths ?? 0}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-xs text-muted-foreground">
                          {sel.requestedThuBooths ?? 0}/{sel.finalThuBooths ?? 0}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={STATUS_BADGE_COLORS[status]}>
                          {sel.decision || status}
                        </Badge>
                      </td>
                      <td className="max-w-[14rem] px-3 py-2 text-xs">{scoring.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Estimated revenue</h3>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                <CircleDollarSign className="mr-1 h-3.5 w-3.5" />
                {formatCurrency(revenue.totalRevenue)} potential
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <RevenueCard label="Confirmed revenue" value={revenue.confirmedRevenue} tone="success" />
              <RevenueCard label="At-risk (pending packages)" value={revenue.atRiskRevenue} tone="warning" />
              <RevenueCard label="All current packages" value={revenue.totalRevenue} tone="info" />
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-semibold">By package tier</h4>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                {Object.entries(revenue.byPackage).map(([tier, info]) => (
                  <div key={tier} className="rounded-md border border-border bg-card p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{tier}</span>
                      <span className="text-xs text-muted-foreground">× {info.count}</span>
                    </div>
                    <p className="mt-1 text-lg font-bold">{formatCurrency(info.revenue)}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold">Package pricing</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Override default prices below. Stored per browser; affects revenue forecasts.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.keys(DEFAULT_F26_PACKAGE_PRICING).map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <Label className="w-40 truncate text-xs">{key}</Label>
                  <Input
                    type="number"
                    value={packagePricing[key] ?? DEFAULT_F26_PACKAGE_PRICING[key]}
                    onChange={(e) =>
                      setPackagePricing((prev) => ({
                        ...prev,
                        [key]: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPackagePricing(DEFAULT_F26_PACKAGE_PRICING)}>
                Reset to defaults
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">All alerts</h3>
              <span className="text-xs text-muted-foreground">{notifications.length} items</span>
            </div>
            {notifications.length === 0 ? (
              <p className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Nothing urgent. Coordinators are on top of things.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {notifications.map((n) => {
                  const STYLE = {
                    danger: "border-red-200 bg-red-50 text-red-900",
                    warning: "border-amber-200 bg-amber-50 text-amber-900",
                    info: "border-blue-200 bg-blue-50 text-blue-900",
                  } as const
                  return (
                    <li
                      key={n.id}
                      className={`flex items-start gap-2 rounded-md border p-3 text-sm ${STYLE[n.type]}`}
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium">{n.title}</p>
                        <p className="text-xs opacity-90">{n.description}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FunnelStep({
  label,
  value,
  rate,
  note,
}: {
  label: string
  value: number
  rate?: number
  note?: string
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{formatNumber(value)}</p>
      {rate != null && (
        <p className="text-xs text-muted-foreground">
          {formatPercent(rate, 0)} conversion
        </p>
      )}
      {note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}
    </div>
  )
}

function BoothBar({ label, req, fin }: { label: string; req: number; fin: number }) {
  const pct = req > 0 ? (fin / req) * 100 : 0
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-2xl font-bold">
          {fin}
          <span className="ml-1 text-sm font-normal text-muted-foreground">/ {req}</span>
        </span>
        <span className="text-xs font-medium text-muted-foreground">{formatPercent(pct, 0)}</span>
      </div>
      <Progress value={Math.min(100, pct)} className="mt-2 h-1.5" />
    </div>
  )
}

function RevenueCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "success" | "warning" | "info"
}) {
  const STYLE = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    info: "border-blue-200 bg-blue-50 text-blue-900",
  } as const
  return (
    <div className={`rounded-md border p-3 ${STYLE[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-90">{label}</p>
      <p className="mt-1 text-2xl font-bold">{formatCurrency(value)}</p>
    </div>
  )
}
