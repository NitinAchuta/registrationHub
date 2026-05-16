"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Building2,
  ChevronsUpDown,
  Clock,
  GraduationCap,
  Search,
} from "lucide-react"
import type {
  CompanyRecord,
  MajorAnalytics,
  RegistrationStatus,
  SemesterCode,
} from "@/lib/types"
import { mapRawStatus, STATUS_BADGE_COLORS, PACKAGE_BADGE_COLORS } from "@/lib/statusMapping"
import { LOCAL_STORAGE_KEYS, getPackagePrice } from "@/lib/packagePricing"
import { useLocalStorageState } from "@/hooks/use-local-storage"
import { getCompanyFlags, getDaysUntilDeadline } from "@/lib/companyFlags"
import { RelationshipCard } from "@/components/shared/relationship-card"
import { AttendanceChart } from "@/components/shared/attendance-chart"
import { FlagsList } from "@/components/shared/flags-list"
import { CompanyDetailModal } from "@/components/shared/company-detail-modal"
import { HistoricalCompanyProfilePanel } from "@/components/shared/historical-company-profile-panel"
import { formatCurrency, formatNumber, semesterLabel, shortSemesterLabel } from "@/lib/format"
import { resolveRegistrationForSemester } from "@/lib/f26MergeCompanies"

type Props = {
  companies: CompanyRecord[]
  semesterOrder: SemesterCode[]
  currentSemester: SemesterCode
  majorAnalytics: MajorAnalytics[]
}

export function CompanyDashboardView({
  companies,
  semesterOrder,
  currentSemester,
  majorAnalytics,
}: Props) {
  const sorted = useMemo(
    () =>
      [...companies].sort((a, b) =>
        a.canonicalName.localeCompare(b.canonicalName, undefined, { sensitivity: "base" }),
      ),
    [companies],
  )

  const initialId = sorted.find((c) => c.currentRegistration || c.f25Selection)?.id ?? sorted[0]?.id
  const [selectedId, setSelectedId] = useState<string>(initialId ?? "")
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selected = useMemo(
    () => sorted.find((c) => c.id === selectedId) ?? sorted[0] ?? null,
    [sorted, selectedId],
  )

  const [assignments, setAssignments] = useLocalStorageState<Record<string, string>>(
    LOCAL_STORAGE_KEYS.assignments,
    {},
  )

  const activeReg = useMemo(
    () => (selected ? resolveRegistrationForSemester(selected, currentSemester) : null),
    [selected, currentSemester],
  )

  const status: RegistrationStatus = useMemo(() => {
    if (!activeReg) return "Pending"
    return mapRawStatus(activeReg.status) ?? "Pending"
  }, [activeReg])

  const flags = useMemo(() => {
    if (!selected) return []
    return getCompanyFlags({
      company: selected,
      status,
      assignedTo: assignments[`${currentSemester}:${selected.id}`] ?? "Unassigned",
      majorAnalytics,
    })
  }, [selected, status, assignments, currentSemester, majorAnalytics])

  const priorityFollowUps = useMemo(() => {
    return sorted
      .filter((c) => c.currentRegistration)
      .map((c) => {
        const s = mapRawStatus(c.currentRegistration?.status) ?? "Pending"
        const days = getDaysUntilDeadline(c)
        return { company: c, status: s, days }
      })
      .filter((x) => x.status === "Pending")
      .sort((a, b) => {
        const ad = a.days ?? 9999
        const bd = b.days ?? 9999
        return ad - bd
      })
      .slice(0, 6)
  }, [sorted, currentSemester])

  if (!selected) {
    return (
      <div className="rounded-md border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        No companies in dataset.
      </div>
    )
  }

  const reg = activeReg
  const totalPackagesValue = Object.values(selected.packageHistory).reduce(
    (s, p) => s + (getPackagePrice(p) ?? 0),
    0,
  )

  return (
    <div className="space-y-4">
      {/* Header / picker */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 grow">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Company</p>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="mt-1 w-full justify-between sm:max-w-md"
                >
                  <span className="truncate">{selected.canonicalName}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 sm:w-[420px]" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search companies…"
                    value={search}
                    onValueChange={setSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No company found.</CommandEmpty>
                    <CommandGroup>
                      {sorted
                        .filter((c) => {
                          if (!search) return true
                          const q = search.toLowerCase()
                          return (
                            c.canonicalName.toLowerCase().includes(q) ||
                            c.variants.some((v) => v.toLowerCase().includes(q))
                          )
                        })
                        .slice(0, 200)
                        .map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.id}
                            onSelect={() => {
                              setSelectedId(c.id)
                              setOpen(false)
                            }}
                          >
                            <span className="truncate">{c.canonicalName}</span>
                            {c.variants.length > 1 && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {c.variants.length} variants
                              </span>
                            )}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="mt-2 text-xs text-muted-foreground">
              {selected.industry || "Industry not on file"} · {selected.companyType ?? "Type unknown"}
              {selected.variants.length > 1
                ? ` · ${selected.variants.length} variants merged`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {reg ? (
              <Badge variant="outline" className={STATUS_BADGE_COLORS[status]}>
                {semesterLabel(currentSemester)} {status}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
                No active {semesterLabel(currentSemester)} registration
              </Badge>
            )}
            {reg?.package?.tier && (
              <Badge variant="outline" className={PACKAGE_BADGE_COLORS[reg.package.tier] ?? ""}>
                {reg.package.tier} {reg.package.days ?? ""}
              </Badge>
            )}
            <Button size="sm" variant="default" onClick={() => setProfileOpen(true)}>
              View Full Profile
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card
            className={`p-4 ${
              reg
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-border bg-muted/20"
            }`}
          >
            <h3 className="text-sm font-semibold text-foreground">
              Current {semesterLabel(currentSemester)} Registration
            </h3>
            {reg ? (
              <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <KV label="Status" value={status} />
                <KV label="Package" value={reg.package?.tier ?? reg.packageRaw ?? "—"} />
                <KV label="Days" value={reg.daysAttending ?? "—"} />
                <KV label="Booth" value={reg.boothLocation ?? "—"} />
                <KV label="Rep count" value={String(reg.repCount ?? "—")} />
                <KV
                  label="Balance due"
                  value={reg.balanceDue != null ? formatCurrency(reg.balanceDue) : "—"}
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No active {semesterLabel(currentSemester)} registration yet. Historical career fair
                background is still available below.
              </p>
            )}
          </Card>

          {currentSemester === "F26" && selected.canonicalName.trim() ? (
            <HistoricalCompanyProfilePanel companyName={selected.canonicalName} />
          ) : null}

          {/* Overview KPI grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KPI label="Type" value={selected.companyType ?? "—"} icon={Building2} />
            <KPI
              label="Revenue (M)"
              value={selected.revenueMillionsUSD != null ? `$${formatNumber(selected.revenueMillionsUSD)}` : "—"}
            />
            <KPI
              label="Market Cap (B)"
              value={selected.marketCapBillionsUSD != null ? `$${formatNumber(selected.marketCapBillionsUSD)}` : "—"}
            />
            <KPI label="Employees" value={formatNumber(selected.employees)} />
            <KPI label="Total Hires" value={formatNumber(selected.totalHires)} icon={GraduationCap} />
            <KPI label="Bachelor's" value={formatNumber(selected.bachelorHires)} />
            <KPI label="Master's" value={formatNumber(selected.masterHires)} />
            <KPI label="Doctorate" value={formatNumber(selected.doctorateHires)} />
          </div>

          {/* Attendance chart */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Historical Career Fair Background</h3>
              <Badge variant="outline" className="bg-muted/50 text-xs">
                {selected.semestersAttended.length} semesters attended
              </Badge>
            </div>
            <div className="mt-3">
              <AttendanceChart company={selected} semesterOrder={semesterOrder} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {semesterOrder
                .slice()
                .reverse()
                .map((sem) => {
                  const att = selected.attendanceHistory[sem]
                  const pkg = att?.package
                  const hires = selected.hiringHistory[sem] ?? 0
                  if (!att && !hires) return null
                  return (
                    <div
                      key={sem}
                      className="rounded-md border border-border bg-muted/30 px-2 py-1 text-xs"
                    >
                      <span className="font-semibold text-foreground">{shortSemesterLabel(sem)}</span>
                      {pkg?.tier && (
                        <span className="ml-1 rounded bg-card px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {pkg.tier}
                        </span>
                      )}
                      {hires > 0 && (
                        <span className="ml-2 text-muted-foreground">
                          {hires} hire{hires === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  )
                })}
            </div>
          </Card>

          {/* Packages and money */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Packages &amp; revenue</h3>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                Total est. {formatCurrency(totalPackagesValue || null)}
              </Badge>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Semester</th>
                    <th className="px-3 py-2 text-left">Package</th>
                    <th className="px-3 py-2 text-left">Days</th>
                    <th className="px-3 py-2 text-right">Estimated value</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterOrder
                    .slice()
                    .reverse()
                    .map((s) => {
                      const pkg = selected.packageHistory[s]
                      if (!pkg) return null
                      return (
                        <tr key={s} className="border-t border-border">
                          <td className="px-3 py-2 font-medium">{semesterLabel(s)}</td>
                          <td className="px-3 py-2">
                            {pkg.tier ? (
                              <Badge variant="outline" className={PACKAGE_BADGE_COLORS[pkg.tier] ?? ""}>
                                {pkg.tier}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{pkg.days ?? "—"}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(getPackagePrice(pkg))}</td>
                        </tr>
                      )
                    })}
                  {Object.keys(selected.packageHistory).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">
                        No package history on record.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Majors & engagement */}
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="p-4">
              <h3 className="text-sm font-semibold">Majors &amp; recruitment</h3>
              <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
                <KV label="Top major" value={reg?.topMajor || selected.f25Selection?.primaryMajor || "—"} />
                <KV label="Other majors" value={reg?.majors?.slice(1).join(", ") || "—"} />
                <KV label="Degree levels" value={reg?.degreeLevels?.join(", ") || "—"} />
                <KV label="Position types" value={reg?.positionTypes?.join(", ") || "—"} />
                <KV
                  label="Work auth"
                  value={reg?.workAuthorization?.join(", ") || "—"}
                />
                <KV
                  label="Sponsorship"
                  value={selected.willingToSponsor === true ? "Yes" : selected.willingToSponsor === false ? "No" : "—"}
                />
              </div>
              {selected.majorBuckets.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">F25 major buckets</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selected.majorBuckets.map((m) => (
                      <Badge key={m} variant="outline" className="bg-muted/50 text-xs">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-semibold">Engagement with campus</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.relationship.attendedPastFairs && (
                  <Tag tone="info">Past SEC attendee</Tag>
                )}
                {selected.relationship.fycfParticipant && <Tag tone="info">FYCF participant</Tag>}
                {selected.relationship.coeDonor && <Tag tone="success">CoE donor</Tag>}
                {selected.relationship.careerCenterPartner && (
                  <Tag tone="success">
                    Career Center partner
                    {selected.relationship.careerCenterSponsorshipLevel
                      ? ` (${selected.relationship.careerCenterSponsorshipLevel})`
                      : ""}
                  </Tag>
                )}
                {selected.relationship.alumniPresence && <Tag tone="info">Strong alumni presence</Tag>}
                {selected.relationship.outsideEngagement && <Tag tone="info">Outside CF engagement</Tag>}
                {!selected.semestersAttended.length && (
                  <Tag tone="warning">No recent attendance</Tag>
                )}
                {selected.semestersAttended.length >= 3 && <Tag tone="success">Recurring employer</Tag>}
              </div>
              {selected.relationship.outsideEngagementNote && (
                <p className="mt-3 rounded-md border border-border bg-muted/30 p-2 text-xs">
                  <span className="font-medium">Outside engagement:</span>{" "}
                  {selected.relationship.outsideEngagementNote}
                </p>
              )}
            </Card>
          </div>

          {/* Donor / money */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold">Money &amp; donor relationship</h3>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              <KV
                label="CoE donor"
                value={selected.relationship.coeDonor ? "Yes" : "No"}
              />
              <KV
                label="Career Center"
                value={
                  selected.relationship.careerCenterPartner
                    ? selected.relationship.careerCenterSponsorshipLevel ?? "Partner"
                    : "—"
                }
              />
              <KV label="Donation amount" value={"No exact amount on file"} />
              <KV label="Total package value" value={formatCurrency(totalPackagesValue || null)} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Donor relationships are tracked in the <em>Relationship with A&amp;M</em> matrix; specific
              dollar amounts are not exposed in the SEC dataset and should be confirmed with the
              Career Center directly when needed.
            </p>
          </Card>
        </div>

        <div className="space-y-4">
          <RelationshipCard relationship={selected.relationship} />
          <Card className="p-4">
            <h3 className="text-sm font-semibold">Flags</h3>
            <div className="mt-2">
              <FlagsList flags={flags} />
            </div>
          </Card>
        </div>
      </div>

      {/* Pending registrations needing coordinator follow-up */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Pending decisions (soonest deadline first)</h3>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-800 border-amber-300">
            <Clock className="mr-1 h-3 w-3" />
            Workflow
          </Badge>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {priorityFollowUps.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full">No pending active registrations.</p>
          ) : (
            priorityFollowUps.map(({ company, status: st, days }) => (
              <button
                key={company.id}
                type="button"
                onClick={() => setSelectedId(company.id)}
                className={`text-left rounded-md border p-3 transition hover:border-primary hover:bg-muted/30 ${
                  company.id === selected.id ? "border-primary bg-muted/30" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium">{company.canonicalName}</p>
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {days == null ? "—" : days < 0 ? "Overdue" : days === 0 ? "Due today" : `${days}d left`}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {company.industry ?? "—"} · {st}
                </p>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Detail modal */}
      <CompanyDetailModal
        company={selected}
        status={status}
        semesterOrder={semesterOrder}
        majorAnalytics={majorAnalytics}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        assignedTo={assignments[`${currentSemester}:${selected.id}`] ?? "Unassigned"}
        onChangeAssignment={(v) => setAssignments((prev) => ({ ...prev, [`${currentSemester}:${selected.id}`]: v }))}
      />
    </div>
  )
}

function KPI({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number | null
  icon?: typeof Building2
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">
        {value == null || value === "" ? "—" : value}
      </p>
    </div>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="ml-auto truncate text-right text-sm">{value}</span>
    </div>
  )
}

function Tag({
  tone,
  children,
}: {
  tone: "success" | "info" | "warning" | "danger"
  children: React.ReactNode
}) {
  const STYLE = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-red-200 bg-red-50 text-red-800",
  } as const
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${STYLE[tone]}`}>{children}</span>
  )
}
