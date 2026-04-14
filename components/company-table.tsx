"use client"

import { useState, useMemo, useRef } from "react"
import { useForm, Controller } from "react-hook-form"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MapPin,
  User,
  Wifi,
  Briefcase,
  GraduationCap,
  Phone,
  Mail,
  Calendar,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertCircle,
  Upload,
  Filter,
  X,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Zap,
  Users,
  DollarSign,
  Clock,
  History,
  Pencil,
  UserCircle,
} from "lucide-react"
import {
  getNormalizedCompanies,
  getCompanyFinancials,
  secMembers,
  getMemberByInitials,
  type NormalizedCompany,
  type RegistrationEntry,
  type RegistrationStatus,
} from "@/lib/data"
import { toast } from "sonner"

type SortField = "canonicalName" | "industry" | "topMajor" | "package" | "status"
type SortDir = "asc" | "desc"

const packageOrder = ["Platinum", "Gold", "Silver", "Bronze"]
const allStatusOptions: RegistrationStatus[] = [
  "Confirmed",
  "Denied",
  "Pending",
  "Waitlisted",
  "Cancelled",
  "BTT Pending",
  "BTT Confirmed",
  "BTT Rejected",
  "1 to 2 Day Pending",
  "1 to 2 Day Accepted",
  "1 to 2 Day Rejected",
]
const majorGroups = [
  "Computer Science",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Petroleum Engineering",
  "Chemical Engineering",
  "Aerospace Engineering",
]

const statusColor: Record<string, string> = {
  Confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Denied: "bg-red-100 text-red-800 border-red-200",
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  Waitlisted: "bg-blue-100 text-blue-800 border-blue-200",
  Cancelled: "bg-red-100 text-red-800 border-red-200",
  "BTT Pending": "bg-purple-100 text-purple-800 border-purple-200",
  "BTT Confirmed": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "BTT Rejected": "bg-red-100 text-red-800 border-red-200",
  "1 to 2 Day Pending": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "1 to 2 Day Accepted": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "1 to 2 Day Rejected": "bg-red-100 text-red-800 border-red-200",
}
const packageColor: Record<string, string> = {
  Platinum: "bg-slate-100 text-slate-800 border-slate-300",
  Gold: "bg-amber-100 text-amber-800 border-amber-200",
  Silver: "bg-gray-100 text-gray-700 border-gray-300",
  Bronze: "bg-orange-100 text-orange-800 border-orange-200",
}

// Check if status requires SEC assignment
function requiresAssignment(status: RegistrationStatus): boolean {
  return [
    "BTT Pending",
    "BTT Confirmed",
    "BTT Rejected",
    "1 to 2 Day Pending",
    "1 to 2 Day Accepted",
    "1 to 2 Day Rejected",
  ].includes(status)
}

// CSV Header mapping for import
const csvFieldMapping: Record<string, keyof RegistrationEntry> = {
  organization: "organization",
  company: "organization",
  "company name": "organization",
  "org name": "organization",
  package: "package",
  tier: "package",
  "package type": "package",
  status: "status",
  "registration status": "status",
  "rep name": "repName",
  representative: "repName",
  "contact name": "repName",
  "rep email": "repEmail",
  email: "repEmail",
  "contact email": "repEmail",
  "rep phone": "repPhone",
  phone: "repPhone",
  "top major": "topMajor",
  "primary major": "topMajor",
  industry: "industry",
  booth: "boothLocation",
  "booth location": "boothLocation",
  location: "boothLocation",
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split("\n")
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase())
  const rows = lines.slice(1).map((line) => {
    const values: string[] = []
    let current = ""
    let inQuotes = false
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        values.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    values.push(current.trim())
    return values
  })

  return { headers, rows }
}

function mapCSVToEntries(
  headers: string[],
  rows: string[][],
  mapping: Record<string, string>
): Partial<RegistrationEntry>[] {
  const entries: Partial<RegistrationEntry>[] = []

  for (const row of rows) {
    const entry: Partial<RegistrationEntry> = {}
    headers.forEach((header, i) => {
      const mappedField = mapping[header]
      if (mappedField && row[i]) {
        ;(entry as Record<string, string>)[mappedField] = row[i]
      }
    })
    if (entry.organization) {
      entries.push(entry)
    }
  }

  return entries
}

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: SortField
  sortField: SortField
  sortDir: SortDir
}) {
  if (field !== sortField)
    return <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
  return sortDir === "asc" ? (
    <ChevronUp className="h-3 w-3 text-primary" />
  ) : (
    <ChevronDown className="h-3 w-3 text-primary" />
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0 w-32">
        {label}
      </span>
      <span className="text-sm text-foreground text-right">{value}</span>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType
  title: string
}) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

type EditFormData = {
  status: RegistrationStatus
  daysAttending: ("Day 1" | "Day 2")[]
  needsPower: boolean
  repCount: number
  assignedTo: string | null
}

function CompanySheet({
  company,
  open,
  onClose,
  onUpdate,
}: {
  company: NormalizedCompany | null
  open: boolean
  onClose: () => void
  onUpdate: (companyName: string, data: Partial<RegistrationEntry>) => void
}) {
  const [isEditing, setIsEditing] = useState(false)

  const { control, handleSubmit, watch, reset } = useForm<EditFormData>()

  const primary = company?.entries[0]
  const financials = company ? getCompanyFinancials(company.canonicalName) : null

  // Reset form when company changes
  useMemo(() => {
    if (primary) {
      reset({
        status: primary.status,
        daysAttending: primary.daysAttending,
        needsPower: primary.needsPower,
        repCount: primary.repCount,
        assignedTo: primary.assignedTo,
      })
    }
  }, [primary, reset])

  if (!company || !primary) return null

  const watchStatus = watch("status")
  const showAssignment = requiresAssignment(watchStatus || primary.status)

  const onSubmit = (data: EditFormData) => {
    onUpdate(company.canonicalName, {
      status: data.status,
      daysAttending: data.daysAttending,
      needsPower: data.needsPower,
      repCount: data.repCount,
      assignedTo: data.assignedTo,
      lastStatusUpdate: new Date().toISOString(),
    })
    setIsEditing(false)
    toast.success("Registration updated successfully")
  }

  const assignedMember = primary.assignedTo
    ? getMemberByInitials(primary.assignedTo)
    : null

  return (
    <Sheet
      open={open}
      onOpenChange={() => {
        setIsEditing(false)
        onClose()
      }}
    >
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle className="text-lg font-semibold text-foreground">
                {company.canonicalName}
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground mt-0.5">
                {company.industry}
              </SheetDescription>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge variant="outline" className={packageColor[company.package]}>
                {company.package}
              </Badge>
              <Badge
                variant="outline"
                className={statusColor[company.status] || "bg-gray-100 text-gray-800"}
              >
                {company.status}
              </Badge>
            </div>
          </div>
          {company.variants.length > 1 && (
            <div className="flex items-center gap-1.5 mt-2 p-2 rounded-md bg-amber-50 border border-amber-200">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">
                <span className="font-medium">
                  Normalized from {company.variants.length} entries:
                </span>{" "}
                {company.variants.join(", ")}
              </p>
            </div>
          )}
        </SheetHeader>

        <div className="px-1 pb-8">
          {/* Day(s) of Career Fair - Branded Section at Top */}
          <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                Day(s) of Career Fair
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs uppercase tracking-wide">Days</span>
                </div>
                <p className="font-semibold text-foreground">
                  {primary.daysAttending.length === 2 ? "Both Days" : primary.daysAttending.join(", ")}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="text-xs uppercase tracking-wide">Power</span>
                </div>
                <p className="font-semibold text-foreground">
                  {primary.needsPower ? "Required" : "Not Needed"}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs uppercase tracking-wide">Reps</span>
                </div>
                <p className="font-semibold text-foreground">{primary.repCount}</p>
              </div>
            </div>
          </div>

          {/* Edit Mode Toggle */}
          <div className="flex items-center justify-between mt-4 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Edit Mode</span>
            </div>
            <Switch checked={isEditing} onCheckedChange={setIsEditing} />
          </div>

          {/* Edit Form or Display */}
          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </Label>
                <Controller
                  name="status"
                  control={control}
                  defaultValue={primary.status}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {allStatusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Days Attending */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Days Attending
                </Label>
                <Controller
                  name="daysAttending"
                  control={control}
                  defaultValue={primary.daysAttending}
                  render={({ field }) => (
                    <div className="flex gap-4">
                      {["Day 1", "Day 2"].map((day) => (
                        <div key={day} className="flex items-center gap-2">
                          <Checkbox
                            id={day}
                            checked={field.value?.includes(day as "Day 1" | "Day 2")}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, day])
                              } else {
                                field.onChange(
                                  field.value.filter((d) => d !== day)
                                )
                              }
                            }}
                          />
                          <Label htmlFor={day} className="text-sm cursor-pointer">
                            {day}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                />
              </div>

              {/* Power Needs */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Power Needs
                </Label>
                <Controller
                  name="needsPower"
                  control={control}
                  defaultValue={primary.needsPower}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <span className="text-sm">
                        {field.value ? "Power Required" : "No Power Needed"}
                      </span>
                    </div>
                  )}
                />
              </div>

              {/* Rep Count */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Number of Representatives
                </Label>
                <Controller
                  name="repCount"
                  control={control}
                  defaultValue={primary.repCount}
                  render={({ field }) => (
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  )}
                />
              </div>

              {/* SEC Assignment - Shows for BTT and 1-2 Day statuses */}
              {showAssignment && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Assigned SEC Member
                  </Label>
                  <Controller
                    name="assignedTo"
                    control={control}
                    defaultValue={primary.assignedTo}
                    render={({ field }) => (
                      <Select
                        value={field.value || "unassigned"}
                        onValueChange={(v) =>
                          field.onChange(v === "unassigned" ? null : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {secMembers.map((member) => (
                            <SelectItem key={member.id} value={member.initials}>
                              {member.initials} - {member.name} ({member.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <>
              {/* SEC Assignment Display - For BTT and 1-2 Day statuses */}
              {requiresAssignment(primary.status) && (
                <div className="mt-4">
                  <SectionHeader icon={UserCircle} title="SEC Assignment" />
                  {primary.assignedTo && assignedMember ? (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {assignedMember.initials}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{assignedMember.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {assignedMember.role}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-200">
                      <Badge variant="destructive">Unassigned</Badge>
                      <span className="text-sm text-red-700">
                        This status requires an SEC member assignment
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Financial Snapshot */}
              {financials && (
                <div className="mt-4">
                  <SectionHeader icon={DollarSign} title="Financial Snapshot" />
                  <div className="p-3 rounded-md bg-muted/50 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Balance Due
                      </span>
                      <span
                        className={`text-lg font-bold ${
                          financials.balanceDue > 0
                            ? "text-destructive"
                            : "text-green-600"
                        }`}
                      >
                        {formatCurrency(financials.balanceDue)}
                      </span>
                    </div>
                    {financials.lastPaidSemester && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last paid: {financials.lastPaidSemester}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <SectionHeader icon={Briefcase} title="Logistics" />
              <DetailRow
                label="Package"
                value={
                  <Badge variant="outline" className={packageColor[primary.package]}>
                    {primary.package}
                  </Badge>
                }
              />
              <DetailRow
                label="Virtual Fair"
                value={primary.virtualFair ? "Yes" : "No"}
              />
              <DetailRow
                label="Wi-Fi"
                value={
                  <span className="flex items-center gap-1 justify-end">
                    <Wifi className="h-3.5 w-3.5" />
                    {primary.wifi ? "Requested" : "Not Requested"}
                  </span>
                }
              />
              <DetailRow
                label="Booth Location"
                value={
                  <span className="flex items-center gap-1 justify-end">
                    <MapPin className="h-3.5 w-3.5" />
                    {primary.boothLocation}
                  </span>
                }
              />
              <DetailRow label="Attendee Type" value={primary.attendeeType} />

              <SectionHeader icon={GraduationCap} title="Recruitment" />
              <DetailRow label="Top Major" value={primary.topMajor} />
              <DetailRow
                label="Majors Recruited"
                value={primary.majorsRecruited.join(", ")}
              />
              <DetailRow
                label="Degree Levels"
                value={primary.degreeLevels.join(", ")}
              />
              <DetailRow
                label="Position Types"
                value={primary.positionTypes.join(", ")}
              />
              <DetailRow label="Work Auth" value={primary.workAuth.join(", ")} />

              <SectionHeader icon={User} title="Contact" />
              <DetailRow
                label="Rep Name"
                value={
                  <span className="flex items-center gap-1 justify-end">
                    <User className="h-3.5 w-3.5" />
                    {primary.repName}
                  </span>
                }
              />
              <DetailRow
                label="Rep Email"
                value={
                  <span className="flex items-center gap-1 justify-end">
                    <Mail className="h-3.5 w-3.5" />
                    <a
                      href={`mailto:${primary.repEmail}`}
                      className="text-primary hover:underline"
                    >
                      {primary.repEmail}
                    </a>
                  </span>
                }
              />
              <DetailRow
                label="Rep Phone"
                value={
                  <span className="flex items-center gap-1 justify-end">
                    <Phone className="h-3.5 w-3.5" />
                    {primary.repPhone}
                  </span>
                }
              />
              <DetailRow
                label="Add'l Reps Day 1"
                value={primary.additionalRepsDay1 || "—"}
              />
              <DetailRow
                label="Add'l Reps Day 2"
                value={primary.additionalRepsDay2 || "—"}
              />

              {/* Past Career Fair Notes */}
              {primary.pastNotes && primary.pastNotes.length > 0 && (
                <>
                  <SectionHeader icon={History} title="Past Career Fair Notes" />
                  <ScrollArea className="h-48 rounded-md border border-border">
                    <div className="p-3 space-y-3">
                      {primary.pastNotes.map((note, idx) => (
                        <div
                          key={idx}
                          className="relative pl-4 pb-3 border-l-2 border-primary/30 last:pb-0"
                        >
                          <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-primary/30 border-2 border-background" />
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {note.year}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              by {note.memberInitials}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">{note.note}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}

              {/* Last Status Update */}
              {primary.lastStatusUpdate && (
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Last updated:{" "}
                  {new Date(primary.lastStatusUpdate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}

              {company.entries.length > 1 && (
                <>
                  <div className="flex items-center gap-2 pt-4 pb-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                      All Registrations ({company.entries.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {company.entries.map((e) => (
                      <div
                        key={e.id}
                        className="rounded-md border border-border p-3 text-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">
                            {e.organization}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${packageColor[e.package]}`}
                          >
                            {e.package}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {e.repName} · {e.repEmail}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

type FilterState = {
  packages: string[]
  statuses: string[]
  majors: string[]
}

function CSVImportDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean
  onClose: () => void
  onImport: (entries: Partial<RegistrationEntry>[]) => void
}) {
  const [step, setStep] = useState<"upload" | "mapping" | "success">("upload")
  const [csvData, setCsvData] = useState<{
    headers: string[]
    rows: string[][]
  } | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importedCount, setImportedCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const parsed = parseCSV(text)
      setCsvData(parsed)

      const autoMapping: Record<string, string> = {}
      parsed.headers.forEach((header) => {
        const normalizedHeader = header.toLowerCase().trim()
        if (csvFieldMapping[normalizedHeader]) {
          autoMapping[header] = csvFieldMapping[normalizedHeader]
        }
      })
      setMapping(autoMapping)
      setStep("mapping")
    }
    reader.readAsText(file)
  }

  const handleImport = () => {
    if (!csvData) return
    const entries = mapCSVToEntries(csvData.headers, csvData.rows, mapping)
    setImportedCount(entries.length)
    onImport(entries)
    setStep("success")
  }

  const handleClose = () => {
    setStep("upload")
    setCsvData(null)
    setMapping({})
    setImportedCount(0)
    onClose()
  }

  const crmFields = [
    "organization",
    "package",
    "status",
    "repName",
    "repEmail",
    "repPhone",
    "topMajor",
    "industry",
    "boothLocation",
  ]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import CSV
          </DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              "Upload a CSV file to import company registrations."}
            {step === "mapping" && "Map your CSV columns to CRM fields."}
            {step === "success" && "Import completed successfully."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="py-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
            >
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">CSV files only</p>
            </div>
          </div>
        )}

        {step === "mapping" && csvData && (
          <div className="py-4 space-y-4 max-h-[400px] overflow-y-auto">
            <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border">
              <span>CSV Column</span>
              <span>CRM Field</span>
            </div>
            {csvData.headers.map((header) => (
              <div key={header} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{header}</span>
                </div>
                <Select
                  value={mapping[header] || "skip"}
                  onValueChange={(value) =>
                    setMapping((m) => ({
                      ...m,
                      [header]: value === "skip" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Skip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip</SelectItem>
                    {crmFields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              Preview: {csvData.rows.length} rows detected
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-1">
              Import Successful
            </p>
            <p className="text-sm text-muted-foreground">
              {importedCount} {importedCount === 1 ? "record" : "records"} imported
              and added to the table.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  !Object.values(mapping).some((v) => v === "organization")
                }
              >
                Import {csvData?.rows.length || 0} Records
              </Button>
            </>
          )}
          {step === "success" && <Button onClick={handleClose}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CompanyTable() {
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<SortField>("canonicalName")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [selected, setSelected] = useState<NormalizedCompany | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    packages: [],
    statuses: [],
    majors: [],
  })
  const [importedEntries, setImportedEntries] = useState<
    Partial<RegistrationEntry>[]
  >([])
  const [localUpdates, setLocalUpdates] = useState<
    Record<string, Partial<RegistrationEntry>>
  >({})

  const baseCompanies = useMemo(() => getNormalizedCompanies(), [])

  const companies = useMemo(() => {
    // Apply local updates to base companies
    let result = baseCompanies.map((company) => {
      const update = localUpdates[company.canonicalName]
      if (!update) return company
      return {
        ...company,
        status: (update.status as RegistrationStatus) || company.status,
        entries: company.entries.map((entry, i) =>
          i === 0 ? { ...entry, ...update } : entry
        ),
      }
    })

    if (importedEntries.length === 0) return result

    const importedCompanies: NormalizedCompany[] = importedEntries.map(
      (entry, i) => ({
        canonicalName: entry.organization || `Imported ${i + 1}`,
        variants: [entry.organization || `Imported ${i + 1}`],
        entries: [
          {
            id: `imported-${i}`,
            organization: entry.organization || "",
            package:
              (entry.package as RegistrationEntry["package"]) || "Bronze",
            virtualFair: false,
            wifi: false,
            boothLocation: entry.boothLocation || "TBD",
            attendeeType: "In-Person",
            daysAttending: ["Day 1"],
            needsPower: false,
            repCount: 1,
            topMajor: entry.topMajor || "General",
            majorsRecruited: [],
            degreeLevels: ["Senior"],
            positionTypes: ["Full-Time"],
            workAuth: ["US Citizen"],
            repName: entry.repName || "",
            repEmail: entry.repEmail || "",
            repPhone: entry.repPhone || "",
            additionalRepsDay1: "",
            additionalRepsDay2: "",
            industry: entry.industry || "Other",
            status: (entry.status as RegistrationStatus) || "Pending",
            semester: "Spring 2026",
            assignedTo: null,
            lastStatusUpdate: new Date().toISOString(),
            pastNotes: [],
          },
        ],
        industry: entry.industry || "Other",
        topMajor: entry.topMajor || "General",
        package: (entry.package as RegistrationEntry["package"]) || "Bronze",
        status: (entry.status as RegistrationStatus) || "Pending",
      })
    )

    return [...result, ...importedCompanies]
  }, [baseCompanies, importedEntries, localUpdates])

  const activeFilterCount =
    filters.packages.length + filters.statuses.length + filters.majors.length

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return companies.filter((c) => {
      const matchesSearch =
        !q ||
        c.canonicalName.toLowerCase().includes(q) ||
        c.variants.some((v) => v.toLowerCase().includes(q)) ||
        c.entries.some((e) => e.repName.toLowerCase().includes(q))

      const matchesPackage =
        filters.packages.length === 0 || filters.packages.includes(c.package)

      const matchesStatus =
        filters.statuses.length === 0 || filters.statuses.includes(c.status)

      const matchesMajor =
        filters.majors.length === 0 ||
        filters.majors.some(
          (major) =>
            c.topMajor.toLowerCase().includes(major.toLowerCase()) ||
            c.entries.some((e) =>
              e.majorsRecruited.some((m) =>
                m.toLowerCase().includes(major.toLowerCase())
              )
            )
        )

      return matchesSearch && matchesPackage && matchesStatus && matchesMajor
    })
  }, [companies, search, filters])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortField === "package") {
        cmp = packageOrder.indexOf(a.package) - packageOrder.indexOf(b.package)
      } else {
        cmp = (a[sortField] as string).localeCompare(b[sortField] as string)
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  function handleRowClick(company: NormalizedCompany) {
    setSelected(company)
    setSheetOpen(true)
  }

  function toggleFilter(category: keyof FilterState, value: string) {
    setFilters((f) => ({
      ...f,
      [category]: f[category].includes(value)
        ? f[category].filter((v) => v !== value)
        : [...f[category], value],
    }))
  }

  function clearFilters() {
    setFilters({ packages: [], statuses: [], majors: [] })
  }

  function handleCSVImport(entries: Partial<RegistrationEntry>[]) {
    setImportedEntries((prev) => [...prev, ...entries])
  }

  function handleCompanyUpdate(
    companyName: string,
    data: Partial<RegistrationEntry>
  ) {
    setLocalUpdates((prev) => ({
      ...prev,
      [companyName]: { ...prev[companyName], ...data },
    }))
    // Update selected company if it's the same one
    if (selected?.canonicalName === companyName) {
      setSelected((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          status: (data.status as RegistrationStatus) || prev.status,
          entries: prev.entries.map((entry, i) =>
            i === 0 ? { ...entry, ...data } : entry
          ),
        }
      })
    }
  }

  const headers: { label: string; field: SortField }[] = [
    { label: "Organization", field: "canonicalName" },
    { label: "Industry", field: "industry" },
    { label: "Top Major", field: "topMajor" },
    { label: "Package", field: "package" },
    { label: "Status", field: "status" },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by organization or representative name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 shrink-0">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filters</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Package Type
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {packageOrder.map((pkg) => (
                    <div key={pkg} className="flex items-center gap-2">
                      <Checkbox
                        id={`pkg-${pkg}`}
                        checked={filters.packages.includes(pkg)}
                        onCheckedChange={() => toggleFilter("packages", pkg)}
                      />
                      <Label
                        htmlFor={`pkg-${pkg}`}
                        className="text-sm cursor-pointer"
                      >
                        {pkg}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Status
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {allStatusOptions.map((status) => (
                    <div key={status} className="flex items-center gap-2">
                      <Checkbox
                        id={`status-${status}`}
                        checked={filters.statuses.includes(status)}
                        onCheckedChange={() => toggleFilter("statuses", status)}
                      />
                      <Label
                        htmlFor={`status-${status}`}
                        className="text-sm cursor-pointer"
                      >
                        {status}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Major Group
                </p>
                <div className="space-y-2">
                  {majorGroups.map((major) => (
                    <div key={major} className="flex items-center gap-2">
                      <Checkbox
                        id={`major-${major}`}
                        checked={filters.majors.includes(major)}
                        onCheckedChange={() => toggleFilter("majors", major)}
                      />
                      <Label
                        htmlFor={`major-${major}`}
                        className="text-sm cursor-pointer"
                      >
                        {major}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          className="gap-2 shrink-0"
          onClick={() => setCsvDialogOpen(true)}
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.packages.map((pkg) => (
            <Badge key={pkg} variant="secondary" className="gap-1 pr-1">
              {pkg}
              <button
                onClick={() => toggleFilter("packages", pkg)}
                className="ml-1 hover:bg-muted rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.statuses.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1 pr-1">
              {status}
              <button
                onClick={() => toggleFilter("statuses", status)}
                className="ml-1 hover:bg-muted rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.majors.map((major) => (
            <Badge key={major} variant="secondary" className="gap-1 pr-1">
              {major}
              <button
                onClick={() => toggleFilter("majors", major)}
                className="ml-1 hover:bg-muted rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                {headers.map(({ label, field }) => (
                  <th
                    key={field}
                    className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide cursor-pointer select-none hover:text-foreground transition-colors"
                    onClick={() => toggleSort(field)}
                  >
                    <span className="flex items-center gap-1.5">
                      {label}
                      <SortIcon
                        field={field}
                        sortField={sortField}
                        sortDir={sortDir}
                      />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((company, i) => (
                <tr
                  key={company.canonicalName + i}
                  className={`border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-accent/50 ${
                    i % 2 === 0 ? "bg-background" : "bg-muted/20"
                  }`}
                  onClick={() => handleRowClick(company)}
                >
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-foreground">
                        {company.canonicalName}
                      </span>
                      {company.variants.length > 1 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                          <span className="text-xs text-amber-600">
                            {company.variants.length} variants merged
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {company.industry}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {company.topMajor}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs ${packageColor[company.package]}`}
                    >
                      {company.package}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs ${statusColor[company.status] || "bg-gray-100 text-gray-800"}`}
                    >
                      {company.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No organizations match your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {sorted.length} of {companies.length} organizations &middot;{" "}
        {companies.reduce((s, c) => s + c.entries.length, 0)} total registrations
        {importedEntries.length > 0 && ` · ${importedEntries.length} imported`}
      </p>

      <CompanySheet
        company={selected}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onUpdate={handleCompanyUpdate}
      />
      <CSVImportDialog
        open={csvDialogOpen}
        onClose={() => setCsvDialogOpen(false)}
        onImport={handleCSVImport}
      />
    </div>
  )
}
