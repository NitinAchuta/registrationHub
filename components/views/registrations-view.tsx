"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  AlertCircle,
  ArrowDownUp,
  ChevronRight,
  Filter,
  Search,
  Wifi,
  Zap,
} from "lucide-react"
import {
  ASSIGNMENT_OPTIONS,
  ALL_REGISTRATION_STATUSES,
} from "@/lib/types"
import type {
  CompanyRecord,
  CompanyScoring,
  MajorAnalytics,
  RegistrationStatus,
  SemesterCode,
} from "@/lib/types"
import { STATUS_BADGE_COLORS, parseRegisteredOn, mapRawStatus, PACKAGE_BADGE_COLORS } from "@/lib/statusMapping"
import { LOCAL_STORAGE_KEYS } from "@/lib/packagePricing"
import { useLocalStorageState } from "@/hooks/use-local-storage"
import { getCompanyScore } from "@/lib/companyScoring"
import {
  getCompanyFlags,
  getDaysUntilDeadline,
  getMissingInfoLabels,
  isActionRequired,
} from "@/lib/companyFlags"
import { dayLabelFromDaysAttending, semesterLabel, shortSemesterLabel } from "@/lib/format"
import { CompanyDetailModal } from "@/components/shared/company-detail-modal"
import { ScoreCard } from "@/components/shared/score-card"
import { FlagsList } from "@/components/shared/flags-list"

type SortKey =
  | "recent"
  | "name"
  | "major"
  | "assignedTo"
  | "status"
  | "package"
  | "score"
  | "actionRequired"
  | "daysSinceReg"
  | "deadline"

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently registered" },
  { value: "name", label: "Company name" },
  { value: "major", label: "Top major" },
  { value: "assignedTo", label: "Assigned to" },
  { value: "status", label: "Status" },
  { value: "package", label: "Package" },
  { value: "score", label: "Score (high → low)" },
  { value: "actionRequired", label: "Action required first" },
  { value: "daysSinceReg", label: "Days since registration" },
  { value: "deadline", label: "Deadline proximity" },
]

type Props = {
  companies: CompanyRecord[]
  semesterOrder: SemesterCode[]
  currentSemester: SemesterCode
  majorAnalytics: MajorAnalytics[]
}

export function RegistrationsView({
  companies,
  semesterOrder,
  currentSemester,
  majorAnalytics,
}: Props) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [industryFilter, setIndustryFilter] = useState<string>("all")
  const [majorFilter, setMajorFilter] = useState<string>("all")
  const [assignedFilter, setAssignedFilter] = useState<string>("all")
  const [packageFilter, setPackageFilter] = useState<string>("all")
  const [daysFilter, setDaysFilter] = useState<string>("all")
  const [sort, setSort] = useState<SortKey>("recent")
  const [needsResponseOnly, setNeedsResponseOnly] = useState(false)
  const [actionRequiredOnly, setActionRequiredOnly] = useState(false)
  const [missingInfoOnly, setMissingInfoOnly] = useState(false)
  const [deadlineSoonOnly, setDeadlineSoonOnly] = useState(false)
  const [highValueOnly, setHighValueOnly] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  const [assignments, setAssignments] = useLocalStorageState<Record<string, string>>(
    LOCAL_STORAGE_KEYS.assignments,
    {},
  )
  const [resolvedMissing, setResolvedMissing] = useLocalStorageState<Record<string, boolean>>(
    LOCAL_STORAGE_KEYS.resolvedMissingInfo,
    {},
  )

  const enriched = useMemo(() => {
    const today = new Date()
    return companies.map((c) => {
      const reg = c.registrationHistory[currentSemester] ?? c.currentRegistration
      const baseStatus: RegistrationStatus =
        mapRawStatus(reg?.status) ?? mapRawStatus(c.f25Selection?.decision) ?? "Pending"
      const assignedTo = assignments[`${currentSemester}:${c.id}`] ?? "Unassigned"
      const scoring = getCompanyScore(c, majorAnalytics, baseStatus)
      const missing = getMissingInfoLabels(c)
      const deadline = getDaysUntilDeadline(c)
      const registeredAt = parseRegisteredOn(reg?.registeredOnRaw ?? null)
      const daysSinceReg =
        registeredAt == null
          ? null
          : Math.max(0, Math.round((today.getTime() - registeredAt.getTime()) / 86400000))
      const isAction = isActionRequired({
        company: c,
        scoring,
        status: baseStatus,
        assignedTo,
        majorAnalytics,
        resolvedMissingInfo: resolvedMissing[c.id],
      })
      return {
        company: c,
        reg,
        status: baseStatus,
        assignedTo,
        scoring,
        missing,
        deadline,
        daysSinceReg,
        isAction,
      }
    })
  }, [companies, currentSemester, majorAnalytics, assignments, resolvedMissing])

  const industries = useMemo(() => {
    const set = new Set<string>()
    enriched.forEach((e) => {
      if (e.company.industry) set.add(e.company.industry)
    })
    return Array.from(set).sort()
  }, [enriched])

  const majors = useMemo(() => {
    const set = new Set<string>()
    enriched.forEach((e) => {
      const m = e.reg?.topMajor || e.company.f25Selection?.primaryMajor
      if (m) set.add(m)
    })
    return Array.from(set).sort()
  }, [enriched])

  const packages = useMemo(() => {
    const set = new Set<string>()
    enriched.forEach((e) => {
      const t = e.reg?.package?.tier
      if (t) set.add(t)
    })
    return Array.from(set).sort()
  }, [enriched])

  const filtered = useMemo(() => {
    let rows = enriched
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (e) =>
          e.company.canonicalName.toLowerCase().includes(q) ||
          e.company.variants.some((v) => v.toLowerCase().includes(q)),
      )
    }
    if (statusFilter !== "all") rows = rows.filter((e) => e.status === statusFilter)
    if (industryFilter !== "all") rows = rows.filter((e) => e.company.industry === industryFilter)
    if (majorFilter !== "all")
      rows = rows.filter(
        (e) => (e.reg?.topMajor || e.company.f25Selection?.primaryMajor) === majorFilter,
      )
    if (assignedFilter !== "all") rows = rows.filter((e) => e.assignedTo === assignedFilter)
    if (packageFilter !== "all") rows = rows.filter((e) => e.reg?.package?.tier === packageFilter)
    if (daysFilter !== "all") {
      rows = rows.filter((e) => {
        const da = (e.reg?.daysAttending ?? "").toLowerCase()
        if (daysFilter === "day1") return da.includes("day 1") && !da.includes("day 2")
        if (daysFilter === "day2") return da.includes("day 2") && !da.includes("day 1")
        if (daysFilter === "both") return da.includes("day 1") && da.includes("day 2")
        return true
      })
    }
    if (needsResponseOnly) rows = rows.filter((e) => e.status === "Pending" || e.status === "BTT Pending")
    if (actionRequiredOnly) rows = rows.filter((e) => e.isAction)
    if (missingInfoOnly) rows = rows.filter((e) => e.missing.length > 0)
    if (deadlineSoonOnly)
      rows = rows.filter((e) => e.deadline != null && e.deadline <= 7)
    if (highValueOnly)
      rows = rows.filter((e) => e.scoring.priorityBadge === "High Priority")

    rows = [...rows]
    rows.sort((a, b) => {
      switch (sort) {
        case "recent":
          return (b.daysSinceReg ?? -1) === (a.daysSinceReg ?? -1)
            ? a.company.canonicalName.localeCompare(b.company.canonicalName)
            : (a.daysSinceReg ?? Number.MAX_SAFE_INTEGER) - (b.daysSinceReg ?? Number.MAX_SAFE_INTEGER)
        case "name":
          return a.company.canonicalName.localeCompare(b.company.canonicalName)
        case "major":
          return (a.reg?.topMajor ?? "").localeCompare(b.reg?.topMajor ?? "")
        case "assignedTo":
          return a.assignedTo.localeCompare(b.assignedTo)
        case "status":
          return a.status.localeCompare(b.status)
        case "package":
          return (a.reg?.package?.tier ?? "").localeCompare(b.reg?.package?.tier ?? "")
        case "score":
          return b.scoring.totalScore - a.scoring.totalScore
        case "actionRequired":
          return Number(b.isAction) - Number(a.isAction)
        case "daysSinceReg":
          return (b.daysSinceReg ?? -1) - (a.daysSinceReg ?? -1)
        case "deadline":
          return (a.deadline ?? Number.MAX_SAFE_INTEGER) - (b.deadline ?? Number.MAX_SAFE_INTEGER)
        default:
          return 0
      }
    })
    return rows
  }, [
    enriched,
    search,
    statusFilter,
    industryFilter,
    majorFilter,
    assignedFilter,
    packageFilter,
    daysFilter,
    needsResponseOnly,
    actionRequiredOnly,
    missingInfoOnly,
    deadlineSoonOnly,
    highValueOnly,
    sort,
  ])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    enriched.forEach((e) => {
      c[e.status] = (c[e.status] || 0) + 1
    })
    return c
  }, [enriched])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organization…"
              className="pl-8"
            />
          </div>
          <FilterSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            placeholder="Status"
            options={[{ value: "all", label: "All statuses" }, ...ALL_REGISTRATION_STATUSES.map((s) => ({ value: s, label: s }))]}
          />
          <FilterSelect
            value={industryFilter}
            onValueChange={setIndustryFilter}
            placeholder="Industry"
            options={[{ value: "all", label: "All industries" }, ...industries.map((s) => ({ value: s, label: s }))]}
          />
          <FilterSelect
            value={majorFilter}
            onValueChange={setMajorFilter}
            placeholder="Top major"
            options={[{ value: "all", label: "All majors" }, ...majors.map((s) => ({ value: s, label: s }))]}
          />
          <FilterSelect
            value={assignedFilter}
            onValueChange={setAssignedFilter}
            placeholder="Assigned to"
            options={[{ value: "all", label: "Anyone" }, ...ASSIGNMENT_OPTIONS.map((s) => ({ value: s, label: s }))]}
          />
          <FilterSelect
            value={packageFilter}
            onValueChange={setPackageFilter}
            placeholder="Package"
            options={[{ value: "all", label: "All packages" }, ...packages.map((s) => ({ value: s, label: s }))]}
          />
          <FilterSelect
            value={daysFilter}
            onValueChange={setDaysFilter}
            placeholder="Days"
            options={[
              { value: "all", label: "Any days" },
              { value: "day1", label: "Day 1 only" },
              { value: "day2", label: "Day 2 only" },
              { value: "both", label: "Both days" },
            ]}
          />
          <FilterSelect
            value={sort}
            onValueChange={(v) => setSort(v as SortKey)}
            placeholder="Sort"
            icon={ArrowDownUp}
            options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Toggle label="Action required" value={actionRequiredOnly} onChange={setActionRequiredOnly} />
          <Toggle label="Needs response" value={needsResponseOnly} onChange={setNeedsResponseOnly} />
          <Toggle label="Missing info" value={missingInfoOnly} onChange={setMissingInfoOnly} />
          <Toggle label="Deadline ≤ 7d" value={deadlineSoonOnly} onChange={setDeadlineSoonOnly} />
          <Toggle label="High value" value={highValueOnly} onChange={setHighValueOnly} />
          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            {filtered.length} of {enriched.length} companies
          </span>
        </div>
      </Card>

      {/* Status pill row */}
      <div className="flex flex-wrap gap-2">
        {ALL_REGISTRATION_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter((prev) => (prev === s ? "all" : s))}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              statusFilter === s
                ? STATUS_BADGE_COLORS[s] + " ring-2 ring-offset-1"
                : STATUS_BADGE_COLORS[s] + " opacity-70 hover:opacity-100"
            }`}
          >
            <span className="font-semibold">{counts[s] ?? 0}</span>
            <span className="ml-1 opacity-90">{s}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-px"></th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Company</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Package</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Status</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Industry</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Top major</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Days</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Assigned</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">Score</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Recommendation</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Action</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Missing</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Registered</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Deadline</th>
                <th className="w-px"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ company, reg, status, assignedTo, scoring, missing, deadline, daysSinceReg, isAction }) => (
                <tr
                  key={company.id}
                  className="border-t border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => setSelectedCompany(company)}
                >
                  <td className="px-2 py-2">
                    {isAction && <span className="block h-6 w-1 rounded-full bg-amber-500" aria-label="Action required" />}
                  </td>
                  <td className="max-w-xs px-3 py-2">
                    <div className="flex flex-col">
                      <span className="truncate font-medium text-foreground">{company.canonicalName}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {company.industry || "—"}
                        {company.variants.length > 1 ? ` · ${company.variants.length} variants` : ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {reg?.package?.tier ? (
                      <Badge variant="outline" className={PACKAGE_BADGE_COLORS[reg.package.tier] ?? ""}>
                        {reg.package.tier} {reg.package.days ?? ""}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={STATUS_BADGE_COLORS[status]}>
                      {status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{company.industry ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{reg?.topMajor ?? company.f25Selection?.primaryMajor ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{dayLabelFromDaysAttending(reg?.daysAttending)}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={assignedTo}
                      onValueChange={(v) =>
                        setAssignments((prev) => ({ ...prev, [`${currentSemester}:${company.id}`]: v }))
                      }
                    >
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNMENT_OPTIONS.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`font-semibold ${
                        scoring.totalScore >= 70
                          ? "text-emerald-700"
                          : scoring.totalScore >= 55
                            ? "text-blue-700"
                            : scoring.totalScore >= 35
                              ? "text-amber-700"
                              : "text-red-700"
                      }`}
                    >
                      {scoring.totalScore}
                    </span>
                  </td>
                  <td className="max-w-[14rem] px-3 py-2">
                    <span className="block truncate text-xs">{scoring.recommendation}</span>
                  </td>
                  <td className="px-3 py-2">
                    {isAction ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                        Action
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {missing.length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800 border border-amber-200">
                        <AlertCircle className="h-3 w-3" />
                        {missing.length}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {reg?.registeredOnRaw ?? "—"}
                    {daysSinceReg != null && (
                      <span className="block text-[11px] text-muted-foreground">
                        {daysSinceReg}d ago
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    {deadline == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span
                        className={
                          deadline <= 0
                            ? "text-red-700 font-medium"
                            : deadline <= 7
                              ? "text-amber-700 font-medium"
                              : "text-muted-foreground"
                        }
                      >
                        {deadline <= 0 ? `${Math.abs(deadline)}d past` : `${deadline}d`}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={15} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    No companies match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Side drawer */}
      <CompanyDrawer
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
        onOpenProfile={() => {
          if (selectedCompany) setProfileOpen(true)
        }}
        currentSemester={currentSemester}
        majorAnalytics={majorAnalytics}
        semesterOrder={semesterOrder}
        assignments={assignments}
        setAssignments={setAssignments}
        resolvedMissing={resolvedMissing}
        setResolvedMissing={setResolvedMissing}
      />

      {/* Detail modal */}
      {selectedCompany && (
        <CompanyDetailModalLauncher
          company={selectedCompany}
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          currentSemester={currentSemester}
          semesterOrder={semesterOrder}
          majorAnalytics={majorAnalytics}
          assignments={assignments}
          setAssignments={setAssignments}
        />
      )}
    </div>
  )
}

function FilterSelect({
  value,
  onValueChange,
  placeholder,
  options,
  icon: Icon,
}: {
  value: string
  onValueChange: (v: string) => void
  placeholder: string
  options: { value: string; label: string }[]
  icon?: typeof Filter
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full sm:w-44">
        {Icon && <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0" />}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <Label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
      <Switch checked={value} onCheckedChange={onChange} />
      <span className={value ? "font-semibold text-foreground" : ""}>{label}</span>
    </Label>
  )
}

function CompanyDrawer({
  company,
  onClose,
  onOpenProfile,
  currentSemester,
  majorAnalytics,
  semesterOrder: _semesterOrder,
  assignments,
  setAssignments,
  resolvedMissing,
  setResolvedMissing,
}: {
  company: CompanyRecord | null
  onClose: () => void
  onOpenProfile: () => void
  currentSemester: SemesterCode
  majorAnalytics: MajorAnalytics[]
  semesterOrder: SemesterCode[]
  assignments: Record<string, string>
  setAssignments: (next: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  resolvedMissing: Record<string, boolean>
  setResolvedMissing: (next: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void
}) {
  const open = !!company
  if (!company) return <Sheet open={false} onOpenChange={() => onClose()}><SheetContent /></Sheet>

  const reg = company.registrationHistory[currentSemester] ?? company.currentRegistration
  const assignmentKey = `${currentSemester}:${company.id}`
  const assignedTo = assignments[assignmentKey] ?? "Unassigned"
  const status: RegistrationStatus =
    mapRawStatus(reg?.status) ??
    mapRawStatus(company.f25Selection?.decision) ??
    "Pending"
  const scoring = getCompanyScore(company, majorAnalytics, status)
  const missing = getMissingInfoLabels(company)
  const deadline = getDaysUntilDeadline(company)
  const isAction = isActionRequired({
    company,
    scoring,
    status,
    assignedTo,
    majorAnalytics,
    resolvedMissingInfo: resolvedMissing[company.id],
  })
  const flags = getCompanyFlags({ company, scoring, status, assignedTo, majorAnalytics })
  const repCount = reg?.repCount ?? (reg?.repsDay1 ?? 0) + (reg?.repsDay2 ?? 0)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-balance">{company.canonicalName}</SheetTitle>
          <SheetDescription>
            {semesterLabel(currentSemester)} Registration · {company.industry ?? "Industry not on file"}
            {company.variants.length > 1 ? ` · ${company.variants.length} variants merged` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Top summary */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={STATUS_BADGE_COLORS[status]}>
              {semesterLabel(currentSemester)} {status}
            </Badge>
            {reg?.package?.tier && (
              <Badge variant="outline" className={PACKAGE_BADGE_COLORS[reg.package.tier] ?? ""}>
                {reg.package.tier} {reg.package.days ?? ""}
              </Badge>
            )}
            {isAction && (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                Action required
              </Badge>
            )}
            {assignedTo === "Unassigned" && (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                Unassigned
              </Badge>
            )}
          </div>

          <ScoreCard scoring={scoring} compact />

          <Section title={`Day(s) of ${semesterLabel(currentSemester)}`}>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <KV label="Days" value={dayLabelFromDaysAttending(reg?.daysAttending)} />
              <KV label="Reps" value={String(repCount || "—")} />
              <KV label="Power" value={reg?.powerRequired ?? (reg?.wifi ? "Required" : "—")} icon={Zap} />
              <KV label="Powered devices" value={String(reg?.poweredDevices ?? "—")} icon={Wifi} />
              <KV label="Booth" value={reg?.boothLocation ?? "—"} />
              <KV label="Attendee" value={reg?.attendeeType ?? "—"} />
            </div>
          </Section>

          <Section title="SEC assignment">
            <Select
              value={assignedTo}
              onValueChange={(v) => setAssignments((prev) => ({ ...prev, [assignmentKey]: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assignedTo === "Unassigned" && (
              <p className="mt-2 text-xs text-amber-700">
                Pick a coordinator — this company is unassigned.
              </p>
            )}
          </Section>

          <Section title="Logistics">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <KV label="Package" value={reg?.package ? `${reg.package.tier ?? ""} ${reg.package.days ?? ""}`.trim() : "—"} />
              <KV label="Virtual fair" value={reg?.virtualFair ? "Yes" : "No"} />
              <KV label="Wi-Fi requested" value={reg?.wifiRequested ?? reg?.wifi ?? "—"} />
              <KV label="Company queue" value={reg?.companyQueue ?? "—"} />
              <KV label="Booth" value={reg?.boothLocation ?? "—"} />
              <KV label="Attendee type" value={reg?.attendeeType ?? "—"} />
            </div>
          </Section>

          <Section title="Financial snapshot">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <KV
                label="Balance due"
                value={reg?.balanceDue != null ? `$${reg.balanceDue.toLocaleString()}` : "—"}
              />
              <KV label="Last paid" value={reg?.lastPaid ?? "—"} />
              <KV label="Payment status" value={(reg?.balanceDue ?? 0) > 0 ? "Balance due" : "—"} />
            </div>
          </Section>

          <Section title="Recruitment">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <KV label="Top major" value={reg?.topMajor || company.f25Selection?.primaryMajor || "—"} />
              <KV label="Sponsor" value={company.willingToSponsor === true ? "Yes" : company.willingToSponsor === false ? "No" : "—"} />
            </div>
            {(reg?.majors?.length ?? 0) > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Majors: {reg!.majors.join(", ")}
              </p>
            )}
            {(reg?.degreeLevels?.length ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                Degree: {reg!.degreeLevels.join(", ")}
              </p>
            )}
            {(reg?.workAuthorization?.length ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                Work auth: {reg!.workAuthorization.join(", ")}
              </p>
            )}
          </Section>

          <Section title="Internal workflow">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <KV label="Registered" value={reg?.registeredOnRaw ?? "—"} />
              <KV
                label="Deadline"
                value={
                  deadline == null
                    ? "—"
                    : deadline <= 0
                      ? `${Math.abs(deadline)}d past`
                      : `${deadline}d`
                }
              />
              <KV label="Recommendation" value={scoring.recommendation} />
            </div>
            {missing.length > 0 && (
              <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="font-medium">Missing info:</span> {missing.join(", ")}
                </span>
              </div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <Switch
                checked={Boolean(resolvedMissing[company.id])}
                onCheckedChange={(v) =>
                  setResolvedMissing((prev) => ({ ...prev, [company.id]: v }))
                }
              />
              <Label className="text-xs">Mark missing info resolved</Label>
            </div>
          </Section>

          <Section title="Top flags">
            <FlagsList flags={flags.slice(0, 5)} />
          </Section>

          <Section title="Status">
            <div className="rounded-md border border-border bg-muted/30 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className={STATUS_BADGE_COLORS[status]}>
                  {status}
                </Badge>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Active seed
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Status is sourced from the active {semesterLabel(currentSemester)} registration
                seed. Historical Excel statuses remain read-only background data.
              </p>
            </div>
          </Section>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onOpenProfile}>
              View Full Profile
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAssignments((prev) => ({ ...prev, [assignmentKey]: "Aryan" }))}
            >
              Assign to me
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setResolvedMissing((prev) => ({ ...prev, [company.id]: !prev[company.id] }))
              }
            >
              Mark info complete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function CompanyDetailModalLauncher({
  company,
  open,
  onClose,
  currentSemester,
  semesterOrder,
  majorAnalytics,
  assignments,
  setAssignments,
}: {
  company: CompanyRecord
  open: boolean
  onClose: () => void
  currentSemester: SemesterCode
  semesterOrder: SemesterCode[]
  majorAnalytics: MajorAnalytics[]
  assignments: Record<string, string>
  setAssignments: (next: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
}) {
  const reg = company.registrationHistory[currentSemester] ?? company.currentRegistration
  const assignmentKey = `${currentSemester}:${company.id}`
  const status: RegistrationStatus =
    mapRawStatus(reg?.status) ??
    mapRawStatus(company.f25Selection?.decision) ??
    "Pending"
  const scoring = getCompanyScore(company, majorAnalytics, status)
  const assignedTo = assignments[assignmentKey] ?? "Unassigned"
  return (
    <CompanyDetailModal
      company={company}
      scoring={scoring}
      status={status}
      semesterOrder={semesterOrder}
      majorAnalytics={majorAnalytics}
      open={open}
      onClose={onClose}
      onChangeAssignment={(v) => setAssignments((prev) => ({ ...prev, [assignmentKey]: v }))}
      assignedTo={assignedTo}
    />
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </section>
  )
}

function KV({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: typeof Filter
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2">
      <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
    </div>
  )
}
