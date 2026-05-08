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
  GraduationCap,
  Search,
  TrendingUp,
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
import { getCompanyScore } from "@/lib/companyScoring"
import { getCompanyFlags } from "@/lib/companyFlags"
import { ScoreCard } from "@/components/shared/score-card"
import { RelationshipCard } from "@/components/shared/relationship-card"
import { AttendanceChart } from "@/components/shared/attendance-chart"
import { FlagsList } from "@/components/shared/flags-list"
import { CompanyDetailModal } from "@/components/shared/company-detail-modal"
import { formatCurrency, formatNumber, semesterLabel, shortSemesterLabel } from "@/lib/format"

type Props = {
  companies: CompanyRecord[]
  semesterOrder: SemesterCode[]
  majorAnalytics: MajorAnalytics[]
}

export function CompanyDashboardView({ companies, semesterOrder, majorAnalytics }: Props) {
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

  const status: RegistrationStatus = useMemo(() => {
    if (!selected) return "Pending"
    return (
      mapRawStatus(selected.currentRegistration?.status) ??
      mapRawStatus(selected.f25Selection?.decision) ??
      "Pending"
    )
  }, [selected])

  const scoring = useMemo(
    () => (selected ? getCompanyScore(selected, majorAnalytics, status) : null),
    [selected, majorAnalytics, status],
  )

  const flags = useMemo(() => {
    if (!selected || !scoring) return []
    return getCompanyFlags({
      company: selected,
      scoring,
      status,
      assignedTo: assignments[selected.id] ?? "Unassigned",
      majorAnalytics,
    })
  }, [selected, scoring, status, assignments, majorAnalytics])

  // Top recommended companies (high score, current cycle activity)
  const topRecommended = useMemo(() => {
    return sorted
      .filter((c) => c.currentRegistration || c.f25Selection)
      .map((c) => {
        const s =
          mapRawStatus(c.currentRegistration?.status) ??
          mapRawStatus(c.f25Selection?.decision) ??
          "Pending"
        const sc = getCompanyScore(c, majorAnalytics, s)
        return { company: c, scoring: sc, status: s }
      })
      .sort((a, b) => b.scoring.totalScore - a.scoring.totalScore)
      .slice(0, 6)
  }, [sorted, majorAnalytics])

  if (!selected || !scoring) {
    return (
      <div className="rounded-md border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        No companies in dataset.
      </div>
    )
  }

  const reg = selected.currentRegistration
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
            <Badge variant="outline" className={STATUS_BADGE_COLORS[status]}>{status}</Badge>
            {reg?.package?.tier && (
              <Badge variant="outline" className={PACKAGE_BADGE_COLORS[reg.package.tier] ?? ""}>
                {reg.package.tier} {reg.package.days ?? ""}
              </Badge>
            )}
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              Score {scoring.totalScore}
            </Badge>
            <Button size="sm" onClick={() => setProfileOpen(true)}>
              View Full Profile
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
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
              <h3 className="text-sm font-semibold">Attendance &amp; hiring history</h3>
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
          <ScoreCard scoring={scoring} />
          <RelationshipCard relationship={selected.relationship} />
          <Card className="p-4">
            <h3 className="text-sm font-semibold">Flags</h3>
            <div className="mt-2">
              <FlagsList flags={flags} />
            </div>
          </Card>
        </div>
      </div>

      {/* Top recommendations */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Top scoring companies in the current cycle
          </h3>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
            <TrendingUp className="mr-1 h-3 w-3" />
            High value
          </Badge>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {topRecommended.map(({ company, scoring: s, status }) => (
            <button
              key={company.id}
              onClick={() => setSelectedId(company.id)}
              className={`text-left rounded-md border p-3 transition hover:border-primary hover:bg-muted/30 ${
                company.id === selected.id ? "border-primary bg-muted/30" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-medium">{company.canonicalName}</p>
                <span
                  className={`text-sm font-bold ${
                    s.totalScore >= 70
                      ? "text-emerald-700"
                      : s.totalScore >= 55
                        ? "text-blue-700"
                        : "text-amber-700"
                  }`}
                >
                  {s.totalScore}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {company.industry ?? "—"} · {status}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{s.recommendation}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Detail modal */}
      <CompanyDetailModal
        company={selected}
        scoring={scoring}
        status={status}
        semesterOrder={semesterOrder}
        majorAnalytics={majorAnalytics}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        assignedTo={assignments[selected.id] ?? "Unassigned"}
        onChangeAssignment={(v) => setAssignments((prev) => ({ ...prev, [selected.id]: v }))}
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
