"use client"

import { useMemo, useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
  ChevronDown,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Search,
  Wifi,
  Zap,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser } from "@clerk/nextjs"
import {
  ASSIGNMENT_OPTIONS,
  ALL_REGISTRATION_STATUSES,
  isAssignedToOption,
} from "@/lib/types"
import { findApprovedUserByEmail } from "@/lib/auth/approved-users"
import type {
  CompanyRecord,
  MajorAnalytics,
  RegistrationRow,
  RegistrationStatus,
  SemesterCode,
  BttWorkflowStatus,
  OneToTwoDayWorkflowStatus,
} from "@/lib/types"
import {
  STATUS_BADGE_COLORS,
  parseRegisteredOn,
  mapRawStatus,
  PACKAGE_BADGE_COLORS,
  bttBadgeClass,
  oneToTwoBadgeClass,
  workflowUiLabel,
  mainDecisionSummaryLabel,
} from "@/lib/statusMapping"
import { LOCAL_STORAGE_KEYS } from "@/lib/packagePricing"
import { useLocalStorageState } from "@/hooks/use-local-storage"
import type { F26RegistrationOverride } from "@/lib/f26Registration"
import {
  buildActiveF26View,
  defaultF26Meta,
  getF26Meta,
  patchF26Meta,
  updateBttStatus,
  updateOneToTwoDayStatus,
  updateRegistrationStatus,
} from "@/lib/f26Registration"
import { EventInterestSelect } from "@/components/shared/event-interest-select"
import type { CompanyEventInterest } from "@/lib/types"
import { getMajorLabel } from "@/lib/majors"
import {
  getCompanyFlags,
  getDaysUntilDeadline,
  getMissingInfoLabels,
  isActionRequired,
} from "@/lib/companyFlags"
import { dayLabelFromDaysAttending, semesterLabel, shortSemesterLabel } from "@/lib/format"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SheetCreditsSection } from "@/components/shared/sheet-credits-section"
import { CompanyEnrichmentPanel } from "@/components/shared/company-enrichment-panel"
import { HistoricalCompanyProfilePanel } from "@/components/shared/historical-company-profile-panel"
import { useMasterCompanyProfiles } from "@/hooks/useMasterCompanyProfiles"
import { FlagsList } from "@/components/shared/flags-list"
import { CompanyDetailModal } from "@/components/shared/company-detail-modal"
import { cn } from "@/lib/utils"

type SortKey =
  | "recent"
  | "name"
  | "major"
  | "assignedTo"
  | "status"
  | "package"
  | "actionRequired"
  | "daysSinceReg"
  | "deadline"

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently registered" },
  { value: "name", label: "Company name" },
  { value: "major", label: "Primary major" },
  { value: "assignedTo", label: "Assigned to" },
  { value: "status", label: "Status" },
  { value: "package", label: "Package" },
  { value: "actionRequired", label: "Action required first" },
  { value: "daysSinceReg", label: "Days since registration" },
  { value: "deadline", label: "Deadline proximity" },
]

type Props = {
  companies: CompanyRecord[]
  semesterOrder: SemesterCode[]
  currentSemester: SemesterCode
  majorAnalytics: MajorAnalytics[]
  setRegistrationOverrides?: React.Dispatch<
    React.SetStateAction<Record<string, F26RegistrationOverride>>
  >
  onExportRefresh?: (force?: boolean) => void
}

export function RegistrationsView({
  companies,
  semesterOrder,
  currentSemester,
  majorAnalytics,
  setRegistrationOverrides,
  onExportRefresh,
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

  const historicalProfiles = useMasterCompanyProfiles(currentSemester === "F26")

  const enriched = useMemo(() => {
    const today = new Date()
    return companies.map((c) => {
      const reg = c.registrationHistory[currentSemester] ?? c.currentRegistration
      const assignmentKey = `${currentSemester}:${c.id}`
      const f26View =
        currentSemester === "F26" && reg?.semester === "F26"
          ? buildActiveF26View(c, currentSemester, assignmentKey, assignments)
          : null
      const baseStatus: RegistrationStatus =
        currentSemester === "F26"
          ? (mapRawStatus(reg?.status) ?? "Pending")
          : (mapRawStatus(reg?.status) ?? mapRawStatus(c.f25Selection?.decision) ?? "Pending")
      const assignedTo = f26View?.assignedTo ?? assignments[assignmentKey] ?? "Unassigned"
      const missing = getMissingInfoLabels(c)
      const deadline = getDaysUntilDeadline(c)
      const registeredAt = parseRegisteredOn(reg?.registeredOnRaw ?? null)
      const daysSinceReg =
        registeredAt == null
          ? null
          : Math.max(0, Math.round((today.getTime() - registeredAt.getTime()) / 86400000))
      const isAction = isActionRequired({
        company: c,
        status: baseStatus,
        assignedTo,
        majorAnalytics,
        resolvedMissingInfo: resolvedMissing[c.id],
      })
      return {
        company: c,
        reg,
        f26View,
        status: baseStatus,
        assignedTo,
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
        if (e.f26View) {
          const d = e.f26View.daysAttending
          if (daysFilter === "wed") return d === "Wednesday"
          if (daysFilter === "thu") return d === "Thursday"
          if (daysFilter === "both") return d === "Both"
          return true
        }
        const da = (e.reg?.daysAttending ?? "").toLowerCase()
        if (daysFilter === "wed") return da.includes("wednesday")
        if (daysFilter === "thu") return da.includes("thursday")
        if (daysFilter === "both") return da.includes("both") || (da.includes("day 1") && da.includes("day 2"))
        return true
      })
    }
    if (needsResponseOnly)
      rows = rows.filter(
        (e) =>
          e.status === "Pending" ||
          e.f26View?.bttStatus === "Pending" ||
          e.f26View?.oneToTwoDayStatus === "Pending",
      )
    if (actionRequiredOnly) rows = rows.filter((e) => e.isAction)
    if (missingInfoOnly) rows = rows.filter((e) => e.missing.length > 0)
    if (deadlineSoonOnly)
      rows = rows.filter((e) => e.deadline != null && e.deadline <= 7)

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
    sort,
  ])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    enriched.forEach((e) => {
      c[e.status] = (c[e.status] || 0) + 1
    })
    return c
  }, [enriched])

  const persistRegistration = (companyId: string, nextReg: RegistrationRow) => {
    setRegistrationOverrides?.((prev) => ({
      ...prev,
      [companyId]: { fullRegistration: { ...nextReg } },
    }))
  }

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
            placeholder="Primary major"
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
              { value: "wed", label: "Wednesday" },
              { value: "thu", label: "Thursday" },
              { value: "both", label: "Both" },
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
                {currentSemester === "F26" ? (
                  <th className="whitespace-nowrap px-3 py-2 text-left" title="Local master company profile workbook">
                    Historical
                  </th>
                ) : null}
                <th className="whitespace-nowrap px-3 py-2 text-left">Contact</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Email</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Phone</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Industry</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Positions</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Work auth</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">D1 +</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">D2 +</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Sister co.</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Rep #</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Notes</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Package</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Status</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">BTT</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">1-to-2-Day</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Assigned To</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Symplicity</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Date Registered</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Decision Deadline</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Days Left</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Days Attending</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Primary Major</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Majors Recruited</th>
                <th className="whitespace-nowrap px-3 py-2 text-left">Virtual Fair</th>
                {currentSemester === "F26" ? (
                  <>
                    <th
                      className="whitespace-nowrap px-3 py-2 text-left"
                      title="Interested in Welcome Social"
                    >
                      Welcome Social
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left" title="Interested in Company Chat">
                      Company Chat
                    </th>
                    <th
                      className="whitespace-nowrap px-3 py-2 text-left"
                      title="Interested in Career Discovery Fair"
                    >
                      Career Disc. Fair
                    </th>
                  </>
                ) : null}
                <th className="whitespace-nowrap px-3 py-2 text-left">Actions</th>
                <th className="w-px"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(
                ({ company, reg, f26View, status, assignedTo, missing, deadline, daysSinceReg, isAction }) => {
                  const r = reg
                  if (!r) return null
                  const meta = getF26Meta(r)
                  const primaryLabel =
                    f26View?.primaryMajor != null ? getMajorLabel(f26View.primaryMajor) : r.topMajor ?? "—"
                  const majorsLabel =
                    f26View?.majorsRecruited?.length ? f26View.majorsRecruited.join(", ") : (r.majors?.join(", ") ?? "—")
                  const histMatch =
                    currentSemester === "F26"
                      ? historicalProfiles.matchLabel(company.canonicalName)
                      : null
                  const daysLeftCell =
                    f26View != null ? (
                      <span
                        className={
                          f26View.deadlineLabel === "Overdue"
                            ? "font-medium text-red-700"
                            : f26View.deadlineLabel === "Due soon"
                              ? "font-medium text-amber-700"
                              : f26View.deadlineLabel === "Completed"
                                ? "text-muted-foreground"
                                : "text-muted-foreground"
                        }
                      >
                        {f26View.deadlineLabel === "Completed"
                          ? "—"
                          : f26View.daysLeft == null
                            ? "—"
                            : f26View.daysLeft <= 0
                              ? "Overdue"
                              : f26View.daysLeft <= 7
                                ? `Due soon (${f26View.daysLeft}d)`
                                : `${f26View.daysLeft}d`}
                      </span>
                    ) : deadline == null ? (
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
                    )
                  return (
                    <tr
                      key={company.id}
                      className="border-t border-border hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelectedCompany(company)}
                    >
                      <td className="px-2 py-2">
                        {isAction && (
                          <span className="block h-6 w-1 rounded-full bg-amber-500" aria-label="Action required" />
                        )}
                      </td>
                      <td className="max-w-[10rem] px-3 py-2">
                        <div className="flex flex-col">
                          <span className="truncate font-medium text-foreground">{company.canonicalName}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {missing.length > 0 ? `${missing.length} missing fields` : ""}
                          </span>
                        </div>
                      </td>
                      {currentSemester === "F26" ? (
                        <td className="px-3 py-2 text-xs">
                          {histMatch === "Found" ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-50 text-emerald-800"
                              title="Historical profile available"
                            >
                              Found
                            </Badge>
                          ) : histMatch === "Multiple" ? (
                            <Badge
                              variant="outline"
                              className="border-amber-200 bg-amber-50 text-amber-900"
                              title="Multiple possible historical matches"
                            >
                              Multiple
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground"
                              title="No historical profile found"
                            >
                              Not Found
                            </Badge>
                          )}
                        </td>
                      ) : null}
                      <td className="max-w-[7rem] truncate px-3 py-2 text-xs">{r.registeringContact ?? "—"}</td>
                      <td className="max-w-[8rem] truncate px-3 py-2 text-xs">{r.contactEmail ?? "—"}</td>
                      <td className="max-w-[7rem] px-3 py-2 text-xs">
                        <span className="block truncate">{r.contactPhoneDisplay ?? "—"}</span>
                        {r.phoneNormalizedIssue ? (
                          <Badge variant="outline" className="mt-1 border-amber-300 text-[10px] text-amber-900">
                            Incomplete
                          </Badge>
                        ) : null}
                      </td>
                      <td className="max-w-[6rem] truncate px-3 py-2 text-xs">{company.industry ?? "—"}</td>
                      <td className="max-w-[8rem] truncate px-3 py-2 text-xs">
                        {(r.positionTypes ?? []).join(", ") || "—"}
                      </td>
                      <td className="max-w-[8rem] truncate px-3 py-2 text-xs">
                        {(r.workAuthorization ?? []).join(", ") || "—"}
                      </td>
                      <td className="max-w-[4rem] truncate px-3 py-2 text-xs">{r.day1AdditionalReps ?? "—"}</td>
                      <td className="max-w-[4rem] truncate px-3 py-2 text-xs">{r.day2AdditionalReps ?? "—"}</td>
                      <td className="max-w-[6rem] truncate px-3 py-2 text-xs">{r.sisterCompanyPlacement ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{r.repCount ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">
                        {(r.sheetNotes?.length ?? 0) > 0 ? (
                          <Badge variant="secondary">{r.sheetNotes!.length}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {r.package?.tier ? (
                          <Badge variant="outline" className={PACKAGE_BADGE_COLORS[r.package.tier] ?? ""}>
                            {r.package.tier} {r.package.days ?? ""}
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
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={bttBadgeClass(meta.bttStatus)}>
                          {workflowUiLabel(meta.bttStatus)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={oneToTwoBadgeClass(meta.oneToTwoDayStatus)}>
                          {workflowUiLabel(meta.oneToTwoDayStatus)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={assignedTo}
                          onValueChange={(v) =>
                            setAssignments((prev) => ({ ...prev, [`${currentSemester}:${company.id}`]: v }))
                          }
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
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
                      <td className="px-3 py-2 text-xs">
                        {meta.symplicityUpdated ? (
                          <span className="text-emerald-700">Yes</span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {r.registeredOnRaw ?? "—"}
                        {daysSinceReg != null && (
                          <span className="block text-[11px] text-muted-foreground">{daysSinceReg}d ago</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {f26View?.decisionDeadlineIso ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">{daysLeftCell}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {f26View ? f26View.daysAttending : dayLabelFromDaysAttending(r.daysAttending)}
                      </td>
                      <td className="max-w-[6rem] truncate px-3 py-2 text-xs">{primaryLabel}</td>
                      <td className="max-w-[8rem] truncate px-3 py-2 text-xs">{majorsLabel}</td>
                      <td className="px-3 py-2 text-xs">{r.virtualFair ? "Yes" : "No"}</td>
                      {currentSemester === "F26" ? (
                        <>
                          <td className="min-w-[11.5rem] px-3 py-2" onClick={(e) => e.stopPropagation()}>
                            <EventInterestSelect
                              value={meta.welcomeSocialInterest}
                              onValueChange={(v: CompanyEventInterest) =>
                                persistRegistration(
                                  company.id,
                                  patchF26Meta(r, meta, { welcomeSocialInterest: v }).reg,
                                )
                              }
                            />
                          </td>
                          <td className="min-w-[11.5rem] px-3 py-2" onClick={(e) => e.stopPropagation()}>
                            <EventInterestSelect
                              value={meta.companyChatInterest}
                              onValueChange={(v: CompanyEventInterest) =>
                                persistRegistration(
                                  company.id,
                                  patchF26Meta(r, meta, { companyChatInterest: v }).reg,
                                )
                              }
                            />
                          </td>
                          <td className="min-w-[11.5rem] px-3 py-2" onClick={(e) => e.stopPropagation()}>
                            <EventInterestSelect
                              value={meta.careerDiscoveryFairInterest}
                              onValueChange={(v: CompanyEventInterest) =>
                                persistRegistration(
                                  company.id,
                                  patchF26Meta(r, meta, { careerDiscoveryFairInterest: v }).reg,
                                )
                              }
                            />
                          </td>
                        </>
                      ) : null}
                      <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1 px-2">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedCompany(company)
                              }}
                            >
                              Review decision
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const on = !meta.symplicityUpdated
                                const nextMeta = {
                                  ...meta,
                                  symplicityUpdated: on,
                                  symplicityUpdatedAt: on ? new Date().toISOString() : undefined,
                                  symplicityUpdatedBy: on ? "You" : undefined,
                                }
                                persistRegistration(company.id, { ...r, f26Meta: nextMeta })
                              }}
                            >
                              Toggle Symplicity updated
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedCompany(company)
                                setProfileOpen(true)
                              }}
                            >
                              View full profile
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="px-2 py-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                  )
                },
              )}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={currentSemester === "F26" ? 31 : 28}
                    className="px-3 py-12 text-center text-sm text-muted-foreground"
                  >
                    {companies.length === 0 && currentSemester === "F26"
                      ? "No F26 registrations found in the connected sheet."
                      : "No companies match these filters."}
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
        persistRegistration={persistRegistration}
        onExportRefresh={onExportRefresh}
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
  persistRegistration,
  onExportRefresh,
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
  persistRegistration: (companyId: string, nextReg: RegistrationRow) => void
  onExportRefresh?: (force?: boolean) => void
}) {
  const { user } = useUser()
  const [phoneEdit, setPhoneEdit] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState("")
  const [phoneSaving, setPhoneSaving] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState("")
  const [noteAuthorDraft, setNoteAuthorDraft] = useState("")
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteFeedback, setNoteFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null)
  const [pendingMainDecision, setPendingMainDecision] = useState<"Confirmed" | "Denied" | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)

  const sheetReg =
    company?.registrationHistory[currentSemester] ?? company?.currentRegistration ?? null
  const notesSig = sheetReg?.sheetNotes?.join("\u001f") ?? ""

  useEffect(() => {
    if (!company) return
    const raw =
      sheetReg?.contactPhoneRaw != null && String(sheetReg.contactPhoneRaw).trim() !== ""
        ? sheetReg.contactPhoneRaw
        : sheetReg?.contactPhoneDisplay ?? ""
    setPhoneDraft(String(raw))
    setPhoneEdit(false)
    setPhoneError(null)
    setNoteDraft("")
    setNoteFeedback(null)
    const approved = findApprovedUserByEmail(user?.primaryEmailAddress?.emailAddress)
    setNoteAuthorDraft(approved?.fullName.split(/\s+/)[0] ?? user?.firstName ?? "")
  }, [
    company?.id,
    currentSemester,
    sheetReg?.contactPhoneRaw,
    sheetReg?.contactPhoneDisplay,
    notesSig,
    user?.primaryEmailAddress?.emailAddress,
    user?.firstName,
  ])

  useEffect(() => {
    if (!company) return
    const s = mapRawStatus(sheetReg?.status) ?? "Pending"
    if (s === "Confirmed") setPendingMainDecision("Confirmed")
    else if (s === "Denied") setPendingMainDecision("Denied")
    else setPendingMainDecision(null)
  }, [company?.id, sheetReg?.status])

  const assignToMe = useMemo(() => {
    const approved = findApprovedUserByEmail(user?.primaryEmailAddress?.emailAddress)
    if (!approved) return null
    const first = approved.fullName.split(/\s+/)[0] ?? ""
    return isAssignedToOption(first) ? first : null
  }, [user])

  const open = !!company
  if (!company) return <Sheet open={false} onOpenChange={() => onClose()}><SheetContent /></Sheet>

  const reg = company.registrationHistory[currentSemester] ?? company.currentRegistration
  const assignmentKey = `${currentSemester}:${company.id}`
  const f26View =
    currentSemester === "F26" && reg?.semester === "F26"
      ? buildActiveF26View(company, currentSemester, assignmentKey, assignments)
      : null
  const assignedTo = f26View?.assignedTo ?? assignments[assignmentKey] ?? "Unassigned"
  const status: RegistrationStatus =
    currentSemester === "F26"
      ? (mapRawStatus(reg?.status) ?? "Pending")
      : (mapRawStatus(reg?.status) ?? mapRawStatus(company.f25Selection?.decision) ?? "Pending")
  const missing = getMissingInfoLabels(company)
  const deadline = getDaysUntilDeadline(company)
  const isAction = isActionRequired({
    company,
    status,
    assignedTo,
    majorAnalytics,
    resolvedMissingInfo: resolvedMissing[company.id],
  })
  const flags = getCompanyFlags({ company, status, assignedTo, majorAnalytics })
  const repCount = reg?.repCount ?? (reg?.repsDay1 ?? 0) + (reg?.repsDay2 ?? 0)
  const meta = reg ? getF26Meta(reg) : defaultF26Meta()
  const run = (fn: () => { reg: RegistrationRow }) => {
    if (!reg) return
    const { reg: next } = fn()
    persistRegistration(company.id, next)
  }

  const savePhone = async () => {
    if (!reg?.exportRowNumber || !phoneDraft.trim()) return
    setPhoneSaving(true)
    setPhoneError(null)
    try {
      const res = await fetch(`/api/sheets/export/${reg.exportRowNumber}/phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ phone: phoneDraft.trim() }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error ?? "Could not update Google Sheet.")
      setPhoneEdit(false)
      await onExportRefresh?.(true)
    } catch (e) {
      setPhoneError(e instanceof Error ? e.message : "Could not save phone number.")
    } finally {
      setPhoneSaving(false)
    }
  }

  const saveNote = async () => {
    if (!reg?.exportRowNumber || !noteDraft.trim()) return
    setNoteSaving(true)
    setNoteFeedback(null)
    try {
      const res = await fetch(`/api/sheets/export/${reg.exportRowNumber}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          text: noteDraft.trim(),
          author: noteAuthorDraft.trim() || undefined,
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error ?? "Could not update Google Sheet.")
      setNoteDraft("")
      setNoteFeedback({ kind: "ok", msg: "Note saved to Google Sheet." })
      await onExportRefresh?.(true)
    } catch (e) {
      setNoteFeedback({
        kind: "err",
        msg: e instanceof Error ? e.message : "Could not save note.",
      })
    } finally {
      setNoteSaving(false)
    }
  }

  const rawExportEntries =
    reg?.exportRawColumns != null
      ? Object.entries(reg.exportRawColumns).filter(([, v]) => String(v ?? "").trim() !== "")
      : []

  const savedMain = mapRawStatus(reg?.status) ?? "Pending"
  const saveMainDisabled =
    pendingMainDecision == null ||
    (pendingMainDecision === "Confirmed" && savedMain === "Confirmed") ||
    (pendingMainDecision === "Denied" && savedMain === "Denied")

  const pkgSummary =
    reg?.package?.tier || reg?.package?.days
      ? `${reg.package?.tier ?? "Unknown"} ${reg.package?.days ?? ""}`.trim()
      : "Unknown"

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto px-6 pb-8 pt-5 sm:max-w-2xl">
        <SheetHeader className="space-y-1 p-0">
          <SheetTitle className="text-balance pr-8">{company.canonicalName}</SheetTitle>
          <SheetDescription className="text-pretty">
            {semesterLabel(currentSemester)} Registration · {company.industry ?? "Industry not on file"}
            {company.variants.length > 1 ? ` · ${company.variants.length} variants merged` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {f26View && currentSemester === "F26" && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Decision Summary
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className={STATUS_BADGE_COLORS[status]}>
                  Main: {mainDecisionSummaryLabel(status)}
                </Badge>
                <Badge variant="outline" className={bttBadgeClass(meta.bttStatus)}>
                  BTT: {workflowUiLabel(meta.bttStatus)}
                </Badge>
                <Badge variant="outline" className={oneToTwoBadgeClass(meta.oneToTwoDayStatus)}>
                  1-to-2-Day: {workflowUiLabel(meta.oneToTwoDayStatus)}
                </Badge>
              </div>
              <dl className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                <div>
                  Registered{" "}
                  <span className="font-medium text-foreground">{f26View.dateRegisteredIso ?? "—"}</span>
                </div>
                <div>
                  Days attending{" "}
                  <span className="font-medium text-foreground">{dayLabelFromDaysAttending(reg?.daysAttending)}</span>
                </div>
                <div>
                  Package <span className="font-medium text-foreground">{pkgSummary}</span>
                </div>
                <div>
                  Decision deadline{" "}
                  <span className="font-medium text-foreground">{f26View.decisionDeadlineIso ?? "—"}</span>
                </div>
                <div className="sm:col-span-2">
                  Days left{" "}
                  <span className="font-medium text-foreground">
                    {f26View.deadlineLabel === "Completed"
                      ? "Completed"
                      : f26View.daysLeft == null
                        ? "—"
                        : f26View.daysLeft <= 0
                          ? `Overdue (${f26View.daysLeft}d)`
                          : `${f26View.daysLeft}d (${f26View.deadlineLabel})`}
                  </span>
                </div>
              </dl>
              {(meta.bttStatus === "Pending" || meta.oneToTwoDayStatus === "Pending") && (
                <Badge variant="outline" className="mt-2 border-amber-300 bg-amber-50 text-amber-950">
                  Special workflow pending
                </Badge>
              )}
            </div>
          )}

          {currentSemester === "F26" && reg && (
            <Section title="Event interest">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Welcome Social</p>
                  <EventInterestSelect
                    value={meta.welcomeSocialInterest}
                    onValueChange={(v) => run(() => patchF26Meta(reg, meta, { welcomeSocialInterest: v }))}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Company Chat</p>
                  <EventInterestSelect
                    value={meta.companyChatInterest}
                    onValueChange={(v) => run(() => patchF26Meta(reg, meta, { companyChatInterest: v }))}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Career Discovery Fair</p>
                  <EventInterestSelect
                    value={meta.careerDiscoveryFairInterest}
                    onValueChange={(v) =>
                      run(() => patchF26Meta(reg, meta, { careerDiscoveryFairInterest: v }))
                    }
                  />
                </div>
              </div>
            </Section>
          )}

          {/* Top summary */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={STATUS_BADGE_COLORS[status]}>
              {semesterLabel(currentSemester)} · {mainDecisionSummaryLabel(status)}
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

          {reg?.sheetWarnings != null && reg.sheetWarnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Data warnings</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                {reg.sheetWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {reg?.exportRowNumber != null && (
            <>
              <Section title="Google Sheet · Contact">
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <KV label="Registering contact" value={reg.registeringContact ?? "—"} />
                  <KV label="Email" value={reg.contactEmail ?? "—"} />
                </div>
              </Section>

              <Section title="Phone">
                {!phoneEdit ? (
                  <div className="space-y-2 rounded-md border border-border bg-muted/30 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium break-all">
                        {reg.contactPhoneDisplay?.trim() ? reg.contactPhoneDisplay : "—"}
                      </span>
                      {reg.phoneNormalizedIssue ? (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                          Phone number incomplete or malformed
                        </Badge>
                      ) : null}
                    </div>
                    {reg.phoneNormalizedIssue ? (
                      <p className="text-xs text-muted-foreground">
                        This number may have been imported incorrectly from the spreadsheet. Please verify and update
                        it.
                      </p>
                    ) : null}
                    {reg.contactPhoneRaw != null && String(reg.contactPhoneRaw).trim() !== "" ? (
                      <p className="text-[11px] text-muted-foreground">
                        Raw: <span className="font-mono">{String(reg.contactPhoneRaw)}</span>
                      </p>
                    ) : null}
                    <Button type="button" size="sm" variant="secondary" onClick={() => setPhoneEdit(true)}>
                      Edit
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                    <Label htmlFor="sheet-phone" className="text-xs text-muted-foreground">
                      Phone
                    </Label>
                    <Input
                      id="sheet-phone"
                      value={phoneDraft}
                      onChange={(e) => setPhoneDraft(e.target.value)}
                      placeholder="713-555-1234"
                    />
                    {phoneError ? <p className="text-xs text-destructive">{phoneError}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => void savePhone()} disabled={phoneSaving}>
                        {phoneSaving ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={phoneSaving}
                        onClick={() => {
                          setPhoneEdit(false)
                          const raw =
                            reg.contactPhoneRaw != null && String(reg.contactPhoneRaw).trim() !== ""
                              ? reg.contactPhoneRaw
                              : reg.contactPhoneDisplay ?? ""
                          setPhoneDraft(String(raw))
                          setPhoneError(null)
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </Section>

              <Section title="Notes">
                <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                  {reg.sheetNotes != null && reg.sheetNotes.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {reg.sheetNotes.map((n, i) => (
                        <li key={`${i}-${n.slice(0, 24)}`} className="rounded-md border border-border bg-background p-2 text-xs leading-relaxed">
                          {n}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No notes yet for this company.</p>
                  )}
                  {noteFeedback ? (
                    <p
                      className={
                        noteFeedback.kind === "ok" ? "text-xs text-green-700" : "text-xs text-destructive"
                      }
                    >
                      {noteFeedback.msg}
                    </p>
                  ) : null}
                  <Label htmlFor="sheet-note" className="text-xs text-muted-foreground">
                    Add note
                  </Label>
                  <Textarea
                    id="sheet-note"
                    rows={3}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Called company and confirmed package details."
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="sheet-note-author" className="text-xs text-muted-foreground">
                        Author (optional)
                      </Label>
                      <Input
                        id="sheet-note-author"
                        value={noteAuthorDraft}
                        onChange={(e) => setNoteAuthorDraft(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>
                    <Button type="button" size="sm" disabled={noteSaving} onClick={() => void saveNote()}>
                      {noteSaving ? "Saving…" : "Add Note"}
                    </Button>
                  </div>
                </div>
              </Section>

              {rawExportEntries.length > 0 && (
                <Collapsible className="rounded-md border border-border bg-muted/20">
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/40">
                    Raw Export Data
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border px-3 py-2">
                    <dl className="max-h-64 space-y-2 overflow-y-auto text-xs">
                      {rawExportEntries.map(([label, val]) => (
                        <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2 border-b border-border/60 pb-2 last:border-0">
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd className="break-words font-medium">{val}</dd>
                        </div>
                      ))}
                    </dl>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </>
          )}

          {currentSemester === "F26" && (
            <SheetCreditsSection
              companyName={company.canonicalName}
              exportRowNumber={reg?.exportRowNumber}
            />
          )}

          {currentSemester === "F26" && reg?.exportRowNumber != null ? (
            <CompanyEnrichmentPanel exportRowNumber={reg.exportRowNumber} />
          ) : null}

          {currentSemester === "F26" && reg && (
            <>
              <section className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Registration Decision
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Every company must receive one final registration decision.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPendingMainDecision("Confirmed")}
                    className={cn(
                      "rounded-lg border p-3 text-left text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      pendingMainDecision === "Confirmed"
                        ? "border-primary bg-background ring-2 ring-primary/30"
                        : "border-border bg-muted/30 hover:bg-muted/50",
                    )}
                  >
                    <p className="font-semibold text-foreground">Confirm Company</p>
                    <p className="mt-1 text-xs text-muted-foreground">Approve this company for the fair.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingMainDecision("Denied")}
                    className={cn(
                      "rounded-lg border p-3 text-left text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      pendingMainDecision === "Denied"
                        ? "border-primary bg-background ring-2 ring-primary/30"
                        : "border-border bg-muted/30 hover:bg-muted/50",
                    )}
                  >
                    <p className="font-semibold text-foreground">Deny Company</p>
                    <p className="mt-1 text-xs text-muted-foreground">Do not approve this company for the fair.</p>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={saveMainDisabled}
                    onClick={() => {
                      if (!pendingMainDecision) return
                      run(() => updateRegistrationStatus(reg, pendingMainDecision))
                    }}
                  >
                    Save Decision
                  </Button>
                  <Badge variant="outline" className={STATUS_BADGE_COLORS[status]}>
                    {status === "Pending" ? "Decision Needed" : status}
                  </Badge>
                </div>
              </section>

              <section className="space-y-3 rounded-md border border-dashed border-border bg-muted/10 p-3">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Optional Special Workflows
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Only use these if this company needs BTT or 1-to-2-day handling.
                  </p>
                </div>

                <div className="space-y-2 rounded-md border border-border bg-background p-3">
                  <Label className="text-xs">BTT Review</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Use only if this company is being considered for BTT.
                  </p>
                  <Select
                    value={meta.bttStatus}
                    onValueChange={(v) =>
                      run(() => updateBttStatus(reg, meta, v as BttWorkflowStatus))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="BTT status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">Not applicable</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Confirmed">Confirmed</SelectItem>
                      <SelectItem value="Denied">Denied</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Current: <span className="font-medium">{workflowUiLabel(meta.bttStatus)}</span>
                  </p>
                </div>

                <div className="space-y-2 rounded-md border border-border bg-background p-3">
                  <Label className="text-xs">1-to-2-Day Review</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Use only if this company requested or is being considered for a two-day change.
                  </p>
                  <Select
                    value={meta.oneToTwoDayStatus}
                    onValueChange={(v) =>
                      run(() => updateOneToTwoDayStatus(reg, meta, v as OneToTwoDayWorkflowStatus))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="1-to-2-day status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">Not applicable</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Confirmed">Confirmed</SelectItem>
                      <SelectItem value="Denied">Denied</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Current: <span className="font-medium">{workflowUiLabel(meta.oneToTwoDayStatus)}</span>
                  </p>
                </div>
              </section>

              <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Other actions</p>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0 text-destructive"
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel Registration
                </Button>
              </div>
            </>
          )}

          {currentSemester === "F26" && company.canonicalName.trim() ? (
            <HistoricalCompanyProfilePanel companyName={company.canonicalName} />
          ) : null}

          <Section title={`Day(s) of ${semesterLabel(currentSemester)}`}>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <KV label="Days" value={dayLabelFromDaysAttending(reg?.daysAttending)} />
              <KV label="Representative count" value={String(repCount || "—")} />
              <KV label="Day 1 add reps" value={reg?.day1AdditionalReps ?? "—"} />
              <KV label="Day 2 add reps" value={reg?.day2AdditionalReps ?? "—"} />
              <KV label="Sister company" value={reg?.sisterCompanyPlacement ?? "—"} />
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
              <KV label="Package (sheet)" value={reg?.packageRaw?.trim() ? reg.packageRaw : "—"} />
              <KV
                label="Package (parsed)"
                value={
                  reg?.package
                    ? `${reg.package.tier ?? "—"} ${reg.package.days ?? ""}`.trim()
                    : "—"
                }
              />
              <KV
                label="Package price"
                value={reg?.package?.priceUSD != null ? `$${reg.package.priceUSD.toLocaleString()}` : "—"}
              />
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
            {(reg?.positionTypes?.length ?? 0) > 0 && (
              <div className="mt-2">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Position types</p>
                <div className="flex flex-wrap gap-1">
                  {reg!.positionTypes.map((p) => (
                    <Badge key={p} variant="secondary" className="font-normal">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
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
              <div className="mt-2">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Work authorization
                </p>
                <div className="flex flex-wrap gap-1">
                  {reg!.workAuthorization.map((p) => (
                    <Badge key={p} variant="outline" className="max-w-full whitespace-normal font-normal">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
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
              <KV label="BTT status" value={workflowUiLabel(meta.bttStatus)} />
              <KV label="1-to-2-day" value={workflowUiLabel(meta.oneToTwoDayStatus)} />
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
                  {reg?.exportRowNumber != null ? "Google Sheet · Export" : "Excel / dataset"}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {reg?.exportRowNumber != null
                  ? "Registration fields load from the private Export tab (cached up to 24 hours, refreshed immediately after phone or note edits)."
                  : `Registration shown here comes from the generated workbook dataset — not from manual Hub seeds.`}
              </p>
            </div>
          </Section>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onOpenProfile}>
              View Full Profile
            </Button>
            {assignToMe && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAssignments((prev) => ({ ...prev, [assignmentKey]: assignToMe }))}
              >
                Assign to me
              </Button>
            )}
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

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel registration?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this registration?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Back</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (!reg) return
                run(() => updateRegistrationStatus(reg, "Canceled"))
                setCancelOpen(false)
              }}
            >
              Yes, cancel registration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
  const assignedTo = assignments[assignmentKey] ?? "Unassigned"
  return (
    <CompanyDetailModal
      company={company}
      status={status}
      semesterOrder={semesterOrder}
      majorAnalytics={majorAnalytics}
      open={open}
      onClose={onClose}
      onChangeAssignment={(v: string) => setAssignments((prev) => ({ ...prev, [assignmentKey]: v }))}
      assignedTo={assignedTo}
    />
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
    <div className="min-w-0 rounded-md border border-border bg-muted/30 px-3 py-2.5">
      <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3 w-3 shrink-0" />}
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground break-words">{value}</p>
    </div>
  )
}
