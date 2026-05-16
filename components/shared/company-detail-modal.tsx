"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertCircle,
  Building2,
  DollarSign,
  GraduationCap,
  Mail,
  MapPin,
  MessageSquare,
  Trash2,
  Users,
  Wifi,
  Zap,
} from "lucide-react"
import {
  formatCurrency,
  formatNumber,
  semesterLabel,
  shortSemesterLabel,
  dayLabelFromDaysAttending,
} from "@/lib/format"
import type {
  ASSIGNMENT_OPTIONS as _A,
  CompanyRecord,
  CompanyChatMessage,
  CompanyScoring,
  CoordinatorNote,
  MajorAnalytics,
  RegistrationStatus,
  SemesterCode,
  WelcomeSocialRecord,
} from "@/lib/types"
import { ASSIGNMENT_OPTIONS } from "@/lib/types"
import { RelationshipCard } from "./relationship-card"
import { AttendanceChart } from "./attendance-chart"
import { FlagsList } from "./flags-list"
import { getCompanyFlags, getMissingInfoLabels, getDaysUntilDeadline } from "@/lib/companyFlags"
import { getEffectiveSemestersAttended } from "@/lib/companyAttendance"
import { STATUS_BADGE_COLORS, PACKAGE_BADGE_COLORS } from "@/lib/statusMapping"
import { LOCAL_STORAGE_KEYS, getPackagePrice } from "@/lib/packagePricing"
import { useLocalStorageState } from "@/hooks/use-local-storage"
import { ACTIVE_FAIR } from "@/lib/fairConfig"
import { resolveRegistrationForSemester } from "@/lib/f26MergeCompanies"
import { SheetCreditsSection } from "@/components/shared/sheet-credits-section"
import { CompanyEnrichmentPanel } from "@/components/shared/company-enrichment-panel"
import { HistoricalCompanyProfilePanel } from "@/components/shared/historical-company-profile-panel"

type Props = {
  company: CompanyRecord | null
  scoring?: CompanyScoring | null
  status: RegistrationStatus
  semesterOrder: SemesterCode[]
  majorAnalytics: MajorAnalytics[]
  open: boolean
  onClose: () => void
  onChangeAssignment?: (value: string) => void
  assignedTo: string
}

export function CompanyDetailModal({
  company,
  status,
  semesterOrder,
  majorAnalytics,
  open,
  onClose,
  onChangeAssignment,
  assignedTo,
}: Props) {
  const [tab, setTab] = useState("overview")
  const [notesByCompany, setNotesByCompany] = useLocalStorageState<Record<string, CoordinatorNote[]>>(
    LOCAL_STORAGE_KEYS.notes,
    {},
  )
  const [welcomeSocialByCompany, setWelcomeSocialByCompany] = useLocalStorageState<
    Record<string, WelcomeSocialRecord>
  >(LOCAL_STORAGE_KEYS.welcomeSocial, {})
  const [chatByCompany, setChatByCompany] = useLocalStorageState<Record<string, CompanyChatMessage[]>>(
    LOCAL_STORAGE_KEYS.chat,
    {},
  )

  const notes = company ? notesByCompany[company.id] ?? [] : []
  const welcome = company
    ? welcomeSocialByCompany[company.id] ?? { attending: "Unknown", repsAttending: null, notes: "" }
    : null
  const chat = company ? chatByCompany[company.id] ?? [] : []

  const flags = useMemo(() => {
    if (!company) return []
    return getCompanyFlags({
      company,
      status,
      assignedTo,
      majorAnalytics,
    })
  }, [company, status, assignedTo, majorAnalytics])

  if (!company) return null
  const semestersAttended = getEffectiveSemestersAttended(company)
  const reg = resolveRegistrationForSemester(company, ACTIVE_FAIR.code)
  const missing = reg ? getMissingInfoLabels(company) : []
  const deadlineDays = getDaysUntilDeadline(company)
  const repCount = reg?.repCount ?? (reg?.repsDay1 ?? 0) + (reg?.repsDay2 ?? 0)

  const addNote = (category: CoordinatorNote["category"], text: string) => {
    if (!text.trim()) return
    const note: CoordinatorNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    }
    setNotesByCompany((prev) => ({
      ...prev,
      [company.id]: [...(prev[company.id] ?? []), note],
    }))
  }
  const removeNote = (id: string) => {
    setNotesByCompany((prev) => ({
      ...prev,
      [company.id]: (prev[company.id] ?? []).filter((n) => n.id !== id),
    }))
  }
  const addChat = (message: string, tag: CompanyChatMessage["tag"]) => {
    if (!message.trim()) return
    const m: CompanyChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      companyId: company.id,
      author: "You",
      timestamp: new Date().toISOString(),
      message: message.trim(),
      tag: tag ?? null,
    }
    setChatByCompany((prev) => ({ ...prev, [company.id]: [...(prev[company.id] ?? []), m] }))
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border bg-card px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-balance text-xl font-semibold">
                {company.canonicalName}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {company.industry || "Industry not on file"} ·{" "}
                {company.companyType ?? "—"} ·{" "}
                {company.variants.length > 1
                  ? `${company.variants.length} variants merged`
                  : "Single source"}
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {reg ? (
                <Badge variant="outline" className={STATUS_BADGE_COLORS[status]}>
                  {ACTIVE_FAIR.label} {status}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
                  No active {ACTIVE_FAIR.label} registration
                </Badge>
              )}
              {reg?.package?.tier && (
                <Badge variant="outline" className={PACKAGE_BADGE_COLORS[reg.package.tier] ?? ""}>
                  {reg.package.tier} {reg.package.days ?? ""}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: "calc(90vh - 96px)" }}>
          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="registration">Registration</TabsTrigger>
              <TabsTrigger value="attendance">Attendance &amp; Hiring</TabsTrigger>
              <TabsTrigger value="relationship">Relationship</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KPI icon={Building2} label="Type" value={company.companyType ?? "—"} />
                <KPI
                  icon={DollarSign}
                  label="Revenue (M)"
                  value={company.revenueMillionsUSD != null ? `$${formatNumber(company.revenueMillionsUSD)}` : "—"}
                />
                <KPI
                  icon={DollarSign}
                  label="Market Cap (B)"
                  value={
                    company.marketCapBillionsUSD != null
                      ? `$${formatNumber(company.marketCapBillionsUSD)}`
                      : "—"
                  }
                />
                <KPI icon={Users} label="Employees" value={formatNumber(company.employees ?? null)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Exit survey hiring history and prior career fair packages are in the Registration tab
                under Historical Company Profile (local master workbook).
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <KPI
                  label="Willing to Sponsor"
                  value={
                    company.willingToSponsor == null
                      ? "—"
                      : company.willingToSponsor
                        ? "Yes"
                        : "No"
                  }
                  icon={GraduationCap}
                />
                <KPI
                  label="Semesters Attended"
                  value={
                    semestersAttended.length
                      ? semestersAttended.map(shortSemesterLabel).join(", ")
                      : "None on record"
                  }
                  icon={Building2}
                />
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="text-sm font-semibold text-foreground">Top flags</h4>
                <div className="mt-2">
                  <FlagsList flags={flags.slice(0, 5)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="registration" className="space-y-4">
              {company.canonicalName.trim() ? (
                <HistoricalCompanyProfilePanel companyName={company.canonicalName} />
              ) : null}
              {!reg && (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No active {ACTIVE_FAIR.label} registration yet.
                </div>
              )}
              {reg && (
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h4 className="mb-3 text-sm font-semibold">Day(s) of Career Fair</h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <Stat label="Days" value={dayLabelFromDaysAttending(reg.daysAttending)} />
                      <Stat
                        label="Power"
                        value={reg.powerRequired ?? (reg.wifi ? "Required" : "—")}
                        sub={reg.poweredDevices ? `${reg.poweredDevices} powered devices` : undefined}
                      />
                      <Stat label="Reps" value={String(repCount || "—")} />
                    </div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <Field label="Booth" value={reg.boothLocation ?? "—"} icon={MapPin} />
                      <Field
                        label="Wi-Fi devices"
                        value={
                          reg.poweredDevices != null
                            ? String(reg.poweredDevices)
                            : (reg.wifi ?? "—")
                        }
                        icon={Wifi}
                      />
                      <Field
                        label="Powered booth"
                        value={
                          reg.powerRequired ?? (reg.wifi ? "Required" : "—")
                        }
                        icon={Zap}
                      />
                      <Field label="Attendee Type" value={reg.attendeeType ?? "—"} />
                      <Field
                        label="Virtual Fair"
                        value={reg.virtualFair ? "Yes" : "No"}
                      />
                      <Field label="Company queue" value={reg.companyQueue ?? "—"} />
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-4">
                    <h4 className="mb-3 text-sm font-semibold">Recruitment</h4>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <Field label="Top major" value={reg.topMajor || "—"} />
                      <Field
                        label="Majors"
                        value={reg.majors?.length ? reg.majors.join(", ") : "—"}
                      />
                      <Field
                        label="Degree levels"
                        value={reg.degreeLevels?.length ? reg.degreeLevels.join(", ") : "—"}
                      />
                      <Field
                        label="Position types"
                        value={reg.positionTypes?.length ? reg.positionTypes.join(", ") : "—"}
                      />
                      <Field
                        label="Work auth"
                        value={
                          reg.workAuthorization?.length ? reg.workAuthorization.join(", ") : "—"
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
                    <h4 className="mb-3 text-sm font-semibold">Logistics &amp; contact</h4>
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                      <Field
                        label="Registered"
                        value={reg.registeredOnRaw ?? "—"}
                      />
                      <Field
                        label="Deadline (6w)"
                        value={
                          deadlineDays == null
                            ? "—"
                            : deadlineDays < 0
                              ? `${Math.abs(deadlineDays)} days past`
                              : `${deadlineDays} days`
                        }
                      />
                      <Field
                        label="Package"
                        value={reg.package ? `${reg.package.tier ?? ""} ${reg.package.days ?? ""}`.trim() : "—"}
                      />
                      <Field
                        label="Status"
                        value={reg.status ?? "—"}
                      />
                      <Field
                        label="Balance due"
                        value={reg.balanceDue != null ? formatCurrency(reg.balanceDue) : "—"}
                      />
                      <Field
                        label="Last paid"
                        value={reg.lastPaid ?? "—"}
                      />
                      <Field
                        label="Sponsor (manual)"
                        value={reg.sponsorManual === true ? "Yes" : reg.sponsorManual === false ? "No" : "—"}
                      />
                    </div>
                    {missing.length > 0 && (
                      <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          <span className="font-medium">Missing info:</span> {missing.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Past registration history */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="mb-3 text-sm font-semibold">Historical registration history</h4>
                {(() => {
                  const histSemesters = semesterOrder
                    .slice()
                    .reverse()
                    .filter((s) => s !== ACTIVE_FAIR.code)
                  const cards = histSemesters
                    .map((s) => {
                      const r = company.registrationHistory[s]
                      if (!r) return null
                      return (
                        <div key={s} className="rounded-md border border-border bg-muted/30 p-2">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {semesterLabel(s)}
                          </p>
                          <p className="mt-1 text-sm font-medium">{r.status ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.package?.tier ?? "—"} {r.package?.days ?? ""}
                          </p>
                          <p className="text-xs text-muted-foreground">{r.boothLocation ?? "—"}</p>
                        </div>
                      )
                    })
                    .filter(Boolean)
                  return cards.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No historical records found for this company.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">{cards}</div>
                  )
                })()}
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="mb-3 text-sm font-semibold">Attended fair history</h4>
                <AttendanceChart company={company} semesterOrder={semesterOrder} />
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="mb-3 text-sm font-semibold">Package history &amp; estimated value</h4>
                {(() => {
                  const rows = semesterOrder
                    .slice()
                    .reverse()
                    .map((s) => {
                      const pkg = company.packageHistory[s]
                      const att = company.attendanceHistory[s]
                      if (!pkg && !att) return null
                      const price = getPackagePrice(pkg ?? null)
                      return (
                        <tr key={s} className="border-t border-border">
                          <td className="px-3 py-2 font-medium">{shortSemesterLabel(s)}</td>
                          <td className="px-3 py-2">
                            {pkg?.tier ? (
                              <Badge variant="outline" className={PACKAGE_BADGE_COLORS[pkg.tier] ?? ""}>
                                {pkg.tier}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{pkg?.days ?? "—"}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(price)}</td>
                        </tr>
                      )
                    })
                    .filter(Boolean)
                  return rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No historical data available from connected sheets.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-left">Semester</th>
                            <th className="px-3 py-2 text-left">Package</th>
                            <th className="px-3 py-2 text-left">Days</th>
                            <th className="px-3 py-2 text-right">Est. value</th>
                          </tr>
                        </thead>
                        <tbody>{rows}</tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
            </TabsContent>

            <TabsContent value="relationship" className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="mb-3 text-sm font-semibold">Flags</h4>
                <FlagsList flags={flags} />
              </div>
              <RelationshipCard relationship={company.relationship} />
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <SheetCreditsSection
                companyName={company.canonicalName}
                exportRowNumber={reg?.exportRowNumber ?? undefined}
              />
              {ACTIVE_FAIR.code === "F26" && reg?.exportRowNumber != null ? (
                <CompanyEnrichmentPanel exportRowNumber={reg.exportRowNumber} />
              ) : null}
              <NotesEditor
                notes={notes}
                onAdd={addNote}
                onRemove={removeNote}
              />
              {welcome && (
                <WelcomeSocialEditor
                  value={welcome}
                  onChange={(next) =>
                    setWelcomeSocialByCompany((prev) => ({ ...prev, [company.id]: next }))
                  }
                />
              )}
            </TabsContent>

            <TabsContent value="chat" className="space-y-4">
              <CompanyChat messages={chat} onAdd={addChat} />
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Status
                    </Label>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {reg?.exportRowNumber != null ? "Google Sheet · Export" : "Dataset"}
                    </span>
                  </div>
                  <div className="mt-2">
                    {reg ? (
                      <Badge variant="outline" className={STATUS_BADGE_COLORS[status]}>
                        {status}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
                        No active registration
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {reg?.exportRowNumber != null
                      ? `Active ${ACTIVE_FAIR.label} registration comes from the connected Export tab.`
                      : `Active ${ACTIVE_FAIR.label} registration follows the generated workbook dataset when present.`}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Assigned to
                  </Label>
                  <Select value={assignedTo} onValueChange={(v) => onChangeAssignment?.(v)}>
                    <SelectTrigger className="mt-1">
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
                  <p className="mt-2 text-xs text-muted-foreground">
                    SEC coordinator assignment is internal-only and stored locally.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="mb-3 text-sm font-semibold">Sources</h4>
                <ul className="flex flex-wrap gap-1.5 text-xs">
                  {company.sources.map((s) => (
                    <li
                      key={s}
                      className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-muted-foreground"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function KPI({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Users
  label: string
  value: string | number | null | undefined
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">
        {value == null || value === "" ? "—" : value}
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: typeof Mail
}) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
      <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="ml-auto truncate text-right text-sm text-foreground">{value}</span>
    </div>
  )
}

function NotesEditor({
  notes,
  onAdd,
  onRemove,
}: {
  notes: CoordinatorNote[]
  onAdd: (cat: CoordinatorNote["category"], text: string) => void
  onRemove: (id: string) => void
}) {
  const [category, setCategory] = useState<CoordinatorNote["category"]>("general")
  const [text, setText] = useState("")
  const grouped = useMemo(() => {
    const positive = notes.filter((n) => n.category === "positive")
    const issue = notes.filter((n) => n.category === "issue")
    const general = notes.filter((n) => n.category === "general")
    const coordinator = notes.filter((n) => n.category === "coordinator")
    return { positive, issue, general, coordinator }
  }, [notes])
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Coordinator notes</h4>
        <Badge variant="outline" className="bg-muted/50 text-xs">
          Internal · stored locally
        </Badge>
      </div>
      <div className="mt-3 grid gap-3">
        <Section title="Positive" items={grouped.positive} onRemove={onRemove} tone="success" />
        <Section title="Issues / upsets" items={grouped.issue} onRemove={onRemove} tone="danger" />
        <Section title="General" items={grouped.general} onRemove={onRemove} tone="info" />
        <Section title="Coordinator only" items={grouped.coordinator} onRemove={onRemove} tone="warning" />
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Select value={category} onValueChange={(v) => setCategory(v as CoordinatorNote["category"])}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="issue">Issue / upset</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="coordinator">Coordinator only</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAdd(category, text)
              setText("")
            }
          }}
        />
        <Button
          onClick={() => {
            onAdd(category, text)
            setText("")
          }}
        >
          Add
        </Button>
      </div>
    </div>
  )
}

function Section({
  title,
  items,
  onRemove,
  tone,
}: {
  title: string
  items: CoordinatorNote[]
  onRemove: (id: string) => void
  tone: "success" | "danger" | "info" | "warning"
}) {
  const STYLE: Record<typeof tone, string> = {
    success: "border-emerald-200 bg-emerald-50",
    danger: "border-red-200 bg-red-50",
    info: "border-blue-200 bg-blue-50",
    warning: "border-amber-200 bg-amber-50",
  }
  return (
    <div className={`rounded-md border p-2.5 ${STYLE[tone]}`}>
      <p className="mb-1 text-xs font-semibold text-foreground">
        {title} {items.length ? `(${items.length})` : ""}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">None.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-2 rounded bg-white/70 px-2 py-1.5 text-sm"
            >
              <div className="min-w-0">
                <p className="text-sm">{n.text}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(n.timestamp).toLocaleString()}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => onRemove(n.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function WelcomeSocialEditor({
  value,
  onChange,
}: {
  value: WelcomeSocialRecord
  onChange: (next: WelcomeSocialRecord) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Welcome social</h4>
        <Badge variant="outline" className="bg-muted/50 text-xs">
          Internal · stored locally
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Attending</Label>
          <Select
            value={value.attending}
            onValueChange={(v) => onChange({ ...value, attending: v as WelcomeSocialRecord["attending"] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
              <SelectItem value="Unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Reps attending</Label>
          <Input
            type="number"
            value={value.repsAttending ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                repsAttending: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </div>
        <div className="sm:col-span-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Notes</Label>
          <Textarea
            rows={2}
            value={value.notes}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}

function CompanyChat({
  messages,
  onAdd,
}: {
  messages: CompanyChatMessage[]
  onAdd: (msg: string, tag: CompanyChatMessage["tag"]) => void
}) {
  const [text, setText] = useState("")
  const [tag, setTag] = useState<NonNullable<CompanyChatMessage["tag"]>>("general" as NonNullable<CompanyChatMessage["tag"]>)
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="h-4 w-4" />
          Internal company chat
        </h4>
        <Badge variant="outline" className="bg-muted/50 text-xs">
          Stored locally
        </Badge>
      </div>
      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No messages yet. Leave a note for other coordinators.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="rounded-md border border-border bg-muted/30 p-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">{m.author}</span>{" "}
                  {m.tag && (
                    <Badge variant="outline" className="ml-1 text-[10px]">
                      {m.tag}
                    </Badge>
                  )}
                </span>
                <span>{new Date(m.timestamp).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-sm text-foreground">{m.message}</p>
            </div>
          ))
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Select value={String(tag)} onValueChange={(v) => setTag(v as typeof tag)}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="decision">decision</SelectItem>
            <SelectItem value="issue">issue</SelectItem>
            <SelectItem value="follow-up">follow-up</SelectItem>
            <SelectItem value="finance">finance</SelectItem>
            <SelectItem value="logistics">logistics</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              onAdd(text, tag)
              setText("")
            }
          }}
        />
        <Button
          onClick={() => {
            onAdd(text, tag)
            setText("")
          }}
        >
          Send
        </Button>
      </div>
    </div>
  )
}
