"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Building2, Briefcase, GraduationCap, CheckCircle2 } from "lucide-react"
import { MAJORS, type MajorCode } from "@/lib/majors"
import type {
  AssignedToCoordinator,
  DaysAttending,
  FairDuration,
  F26ManualRegistration,
  PackageTier,
} from "@/lib/f26Registration"
import { decisionDeadlineFromRegistered } from "@/lib/f26Registration"
import { calculateEstimatedPackageValue } from "@/lib/packagePricing"
import { getCompanySlug } from "@/lib/companyNormalizer"
import { ASSIGNMENT_OPTIONS } from "@/lib/types"
const PACKAGE_TIERS: PackageTier[] = ["Basic", "Silver", "Gold", "Diamond", "Maroon"]
const DURATIONS: FairDuration[] = ["One-Day", "Two-Day"]
const DAYS_OPTIONS: { value: DaysAttending; label: string }[] = [
  { value: "Wednesday", label: "Wednesday" },
  { value: "Thursday", label: "Thursday" },
  { value: "Both", label: "Both" },
]

const WORK_AUTH_OPTIONS = [
  "US Citizen",
  "Permanent Resident",
  "H-1B",
  "OPT/CPT",
  "Any",
  "Does not sponsor",
  "Unknown",
] as const

const DEGREE_OPTIONS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Masters",
  "PhD",
  "Alumni",
] as const

const POSITION_OPTIONS = [
  "Internship",
  "Co-op",
  "Full-Time",
  "Part-Time",
  "Research",
  "Leadership Program",
] as const

type FormData = {
  organization: string
  industry: string
  packageTier: PackageTier | ""
  duration: FairDuration | ""
  daysAttending: DaysAttending
  virtualFair: boolean
  poweredBooth: boolean
  poweredDevices: string
  representativeCount: string
  dateRegistered: string
  primaryMajor: MajorCode | ""
  majorsRecruited: MajorCode[]
  degreeLevels: string[]
  positionTypes: string[]
  workAuthorization: string[]
  assignedTo: AssignedToCoordinator
  symplicityUpdated: boolean
  welcomeSocialInterest: "Yes" | "No" | ""
  companyChatInterest: "Yes" | "No" | ""
  careerDiscoveryFairInterest: "Yes" | "No" | ""
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const defaultForm: FormData = {
  organization: "",
  industry: "",
  packageTier: "",
  duration: "",
  daysAttending: "Both",
  virtualFair: false,
  poweredBooth: false,
  poweredDevices: "",
  representativeCount: "3",
  dateRegistered: todayIso(),
  primaryMajor: "",
  majorsRecruited: [],
  degreeLevels: [],
  positionTypes: [],
  workAuthorization: [],
  assignedTo: "Unassigned",
  symplicityUpdated: false,
  welcomeSocialInterest: "",
  companyChatInterest: "",
  careerDiscoveryFairInterest: "",
}

function FormSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function toggleInList<T extends string>(list: T[], v: T, set: (next: T[]) => void) {
  if (list.includes(v)) set(list.filter((x) => x !== v))
  else set([...list, v])
}

type Props = {
  onManualRegistration?: (entry: F26ManualRegistration) => void
}

export function RegistrationFormDialog({ onManualRegistration }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormData>(defaultForm)
  const [submitted, setSubmitted] = useState(false)

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const decisionDeadline = useMemo(
    () => (form.dateRegistered ? decisionDeadlineFromRegistered(form.dateRegistered) : ""),
    [form.dateRegistered],
  )

  const estimate = useMemo(() => {
    if (!form.packageTier || !form.duration) return null
    const n = Number(form.representativeCount) || 0
    return calculateEstimatedPackageValue({
      packageTier: form.packageTier,
      duration: form.duration,
      representativeCount: n,
      poweredBooth: form.poweredBooth,
      virtualFair: form.virtualFair,
    })
  }, [form.packageTier, form.duration, form.representativeCount, form.poweredBooth, form.virtualFair])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (
      !form.organization.trim() ||
      !form.packageTier ||
      !form.duration ||
      !form.primaryMajor ||
      !form.welcomeSocialInterest ||
      !form.companyChatInterest ||
      !form.careerDiscoveryFairInterest
    ) {
      return
    }
    const id = getCompanySlug(form.organization.trim())
    const repN = Math.max(0, Math.floor(Number(form.representativeCount) || 0))
    const devN = form.poweredDevices.trim() ? Math.max(0, Number(form.poweredDevices)) : undefined
    const entry: F26ManualRegistration = {
      id: `manual-${id}-${Date.now()}`,
      companyId: id,
      companyName: form.organization.trim(),
      industry: form.industry || "Other",
      fairCode: "F26",
      dateRegistered: form.dateRegistered,
      decisionDeadline,
      status: "Pending",
      packageTier: form.packageTier,
      duration: form.duration,
      daysAttending: form.daysAttending,
      virtualFair: form.virtualFair,
      representativeCount: repN,
      poweredBooth: form.poweredBooth,
      poweredDevices: devN,
      primaryMajor: form.primaryMajor,
      majorsRecruited: form.majorsRecruited.length ? form.majorsRecruited : [form.primaryMajor],
      degreeLevels: form.degreeLevels,
      positionTypes: form.positionTypes,
      workAuthorization: form.workAuthorization,
      assignedTo: form.assignedTo,
      symplicityUpdated: form.symplicityUpdated,
      bttStatus: "None",
      oneToTwoDayStatus: "None",
      welcomeSocialInterest: form.welcomeSocialInterest,
      companyChatInterest: form.companyChatInterest,
      careerDiscoveryFairInterest: form.careerDiscoveryFairInterest,
    }
    onManualRegistration?.(entry)
    setSubmitted(true)
  }

  function handleClose() {
    setOpen(false)
    setTimeout(() => {
      setForm({ ...defaultForm, dateRegistered: todayIso() })
      setSubmitted(false)
    }, 300)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Add New Entry
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <CheckCircle2 className="h-14 w-14 text-emerald-500" />
              <h2 className="text-xl font-bold text-foreground">Registration Submitted</h2>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                The entry is saved in this browser and appears in the Fall 2026 registrations list.
              </p>
              <Button onClick={handleClose}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <DialogHeader className="pb-4">
                <DialogTitle className="text-lg font-bold">New Company Registration</DialogTitle>
                <DialogDescription>
                  Fall 2026 active registration (stored locally in this browser).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-8 py-4">
                <FormSection icon={Building2} title="Company Information">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Organization Name" required>
                      <Input
                        placeholder="e.g. Acme Corporation"
                        value={form.organization}
                        onChange={(e) => set("organization", e.target.value)}
                        required
                      />
                    </FormField>
                    <FormField label="Industry" required>
                      <Select value={form.industry} onValueChange={(v) => set("industry", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {["Energy", "Technology", "Defense & Aerospace", "Semiconductor", "Oilfield Services", "Finance", "Consulting", "Healthcare", "Other"].map((i) => (
                            <SelectItem key={i} value={i}>
                              {i}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </FormSection>

                <FormSection icon={Briefcase} title="Package & logistics">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Package tier" required>
                      <Select value={form.packageTier} onValueChange={(v) => set("packageTier", v as PackageTier)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                        <SelectContent>
                          {PACKAGE_TIERS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Duration" required>
                      <Select value={form.duration} onValueChange={(v) => set("duration", v as FairDuration)}>
                        <SelectTrigger>
                          <SelectValue placeholder="One or two days" />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATIONS.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Days attending">
                      <Select value={form.daysAttending} onValueChange={(v) => set("daysAttending", v as DaysAttending)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OPTIONS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Date registered" required>
                      <Input type="date" value={form.dateRegistered} onChange={(e) => set("dateRegistered", e.target.value)} required />
                    </FormField>
                    <FormField label="Decision deadline (auto)">
                      <Input readOnly value={decisionDeadline} className="bg-muted" />
                    </FormField>
                    <FormField label="Representative count" required>
                      <Input
                        type="number"
                        min={0}
                        value={form.representativeCount}
                        onChange={(e) => set("representativeCount", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Powered devices (optional)">
                      <Input type="number" min={0} value={form.poweredDevices} onChange={(e) => set("poweredDevices", e.target.value)} />
                    </FormField>
                    <FormField label="Assigned to">
                      <Select value={form.assignedTo} onValueChange={(v) => set("assignedTo", v as AssignedToCoordinator)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNMENT_OPTIONS.map((a) => (
                            <SelectItem key={a} value={a}>
                              {a}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.virtualFair} onCheckedChange={(v) => set("virtualFair", !!v)} />
                      Virtual Career Fair (FREE add-on)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.poweredBooth} onCheckedChange={(v) => set("poweredBooth", !!v)} />
                      Powered booth (+$50)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.symplicityUpdated} onCheckedChange={(v) => set("symplicityUpdated", !!v)} />
                      Info updated in Symplicity
                    </label>
                  </div>
                  <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                    <p className="font-semibold">Package summary</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {form.packageTier && form.duration ? `${form.packageTier} ${form.duration}` : "Select tier and duration"}
                      {form.virtualFair ? " · Virtual Career Fair: FREE" : ""}
                    </p>
                    {estimate != null && (
                      <p className="mt-2 text-base font-bold text-foreground">Estimated total: ${estimate.toLocaleString()}</p>
                    )}
                  </div>
                </FormSection>

                <FormSection icon={Briefcase} title="Event interest">
                  <p className="text-xs text-muted-foreground -mt-2">
                    Is the company interested in participating in these events?
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField label="Welcome Social" required>
                      <Select
                        value={form.welcomeSocialInterest || undefined}
                        onValueChange={(v) => set("welcomeSocialInterest", v as "Yes" | "No")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Yes or No" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Company Chat" required>
                      <Select
                        value={form.companyChatInterest || undefined}
                        onValueChange={(v) => set("companyChatInterest", v as "Yes" | "No")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Yes or No" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Career Discovery Fair" required>
                      <Select
                        value={form.careerDiscoveryFairInterest || undefined}
                        onValueChange={(v) => set("careerDiscoveryFairInterest", v as "Yes" | "No")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Yes or No" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </FormSection>

                <FormSection icon={GraduationCap} title="Recruitment">
                  <FormField label="Primary major" required>
                    <Select value={form.primaryMajor} onValueChange={(v) => set("primaryMajor", v as MajorCode)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select major code" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {MAJORS.map((m) => (
                          <SelectItem key={m.code} value={m.code}>
                            {m.name} ({m.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Majors recruited — select all that apply">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border border-border p-2">
                      {MAJORS.map((m) => (
                        <label key={m.code} className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={form.majorsRecruited.includes(m.code)}
                            onCheckedChange={() =>
                              toggleInList(form.majorsRecruited, m.code, (next) => set("majorsRecruited", next))
                            }
                          />
                          {m.code}
                        </label>
                      ))}
                    </div>
                  </FormField>
                  <FormField label="Degree levels — select all that apply">
                    <div className="flex flex-wrap gap-2">
                      {DEGREE_OPTIONS.map((d) => (
                        <label key={d} className="flex items-center gap-1.5 text-xs border rounded-md px-2 py-1">
                          <Checkbox
                            checked={form.degreeLevels.includes(d)}
                            onCheckedChange={() => toggleInList(form.degreeLevels, d, (next) => set("degreeLevels", next))}
                          />
                          {d}
                        </label>
                      ))}
                    </div>
                  </FormField>
                  <FormField label="Position types — select all that apply">
                    <div className="flex flex-wrap gap-2">
                      {POSITION_OPTIONS.map((d) => (
                        <label key={d} className="flex items-center gap-1.5 text-xs border rounded-md px-2 py-1">
                          <Checkbox
                            checked={form.positionTypes.includes(d)}
                            onCheckedChange={() => toggleInList(form.positionTypes, d, (next) => set("positionTypes", next))}
                          />
                          {d}
                        </label>
                      ))}
                    </div>
                  </FormField>
                  <FormField label="Work authorization — select all that apply">
                    <div className="flex flex-wrap gap-2">
                      {WORK_AUTH_OPTIONS.map((d) => (
                        <label key={d} className="flex items-center gap-1.5 text-xs border rounded-md px-2 py-1">
                          <Checkbox
                            checked={form.workAuthorization.includes(d)}
                            onCheckedChange={() =>
                              toggleInList(form.workAuthorization, d, (next) => set("workAuthorization", next))
                            }
                          />
                          {d}
                        </label>
                      ))}
                    </div>
                  </FormField>
                </FormSection>
              </div>

              <DialogFooter className="pt-4 border-t border-border gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit">Submit Registration</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
