"use client"

import { useState } from "react"
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
import { cn } from "@/lib/utils"

type FormData = {
  // Company
  organization: string
  industry: string
  // Logistics
  package: string
  virtualFair: boolean
  wifi: boolean
  boothLocation: string
  attendeeType: string
  day1: boolean
  day2: boolean
  // Recruitment
  topMajor: string
  majorsRecruited: string
  degreeLevels: string
  positionTypes: string
  workAuth: string
  // Contact
  repName: string
  repEmail: string
  repPhone: string
  additionalRepsDay1: string
  additionalRepsDay2: string
}

const defaultForm: FormData = {
  organization: "",
  industry: "",
  package: "",
  virtualFair: false,
  wifi: false,
  boothLocation: "",
  attendeeType: "",
  day1: false,
  day2: false,
  topMajor: "",
  majorsRecruited: "",
  degreeLevels: "",
  positionTypes: "",
  workAuth: "",
  repName: "",
  repEmail: "",
  repPhone: "",
  additionalRepsDay1: "",
  additionalRepsDay2: "",
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

export function RegistrationFormDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormData>(defaultForm)
  const [submitted, setSubmitted] = useState(false)

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // In a real app this would call an API
    setSubmitted(true)
  }

  function handleClose() {
    setOpen(false)
    setTimeout(() => {
      setForm(defaultForm)
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
                The new company entry has been added successfully and will appear in the registration table.
              </p>
              <Button onClick={handleClose}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <DialogHeader className="pb-4">
                <DialogTitle className="text-lg font-bold">New Company Registration</DialogTitle>
                <DialogDescription>
                  Complete all sections to register a new company for the career fair.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-8 py-4">
                {/* Company */}
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
                            <SelectItem key={i} value={i}>{i}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </FormSection>

                {/* Logistics */}
                <FormSection icon={Briefcase} title="Logistics">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Sponsorship Package" required>
                      <Select value={form.package} onValueChange={(v) => set("package", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select package" />
                        </SelectTrigger>
                        <SelectContent>
                          {["Platinum", "Gold", "Silver", "Bronze"].map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Attendee Type" required>
                      <Select value={form.attendeeType} onValueChange={(v) => set("attendeeType", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {["In-Person", "Virtual", "Hybrid"].map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Booth Location">
                      <Input
                        placeholder="e.g. A1, B3"
                        value={form.boothLocation}
                        onChange={(e) => set("boothLocation", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Days Attending">
                      <div className="flex items-center gap-4 h-9">
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox
                            checked={form.day1}
                            onCheckedChange={(v) => set("day1", !!v)}
                          />
                          Day 1
                        </label>
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox
                            checked={form.day2}
                            onCheckedChange={(v) => set("day2", !!v)}
                          />
                          Day 2
                        </label>
                      </div>
                    </FormField>
                    <FormField label="Additional Options">
                      <div className="flex items-center gap-4 h-9">
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox
                            checked={form.virtualFair}
                            onCheckedChange={(v) => set("virtualFair", !!v)}
                          />
                          Virtual Fair
                        </label>
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox
                            checked={form.wifi}
                            onCheckedChange={(v) => set("wifi", !!v)}
                          />
                          Wi-Fi
                        </label>
                      </div>
                    </FormField>
                  </div>
                </FormSection>

                {/* Recruitment */}
                <FormSection icon={GraduationCap} title="Recruitment">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Top Major Recruited" required>
                      <Select value={form.topMajor} onValueChange={(v) => set("topMajor", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select major" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "Petroleum Engineering",
                            "Chemical Engineering",
                            "Mechanical Engineering",
                            "Electrical Engineering",
                            "Computer Science",
                            "Computer Engineering",
                            "Aerospace Engineering",
                            "Civil Engineering",
                            "Industrial Engineering",
                            "Information Technology",
                            "Other",
                          ].map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="All Majors Recruited">
                      <Input
                        placeholder="e.g. Mech E, Chem E"
                        value={form.majorsRecruited}
                        onChange={(e) => set("majorsRecruited", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Degree Levels">
                      <Input
                        placeholder="e.g. Junior, Senior, Masters"
                        value={form.degreeLevels}
                        onChange={(e) => set("degreeLevels", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Position Types">
                      <Input
                        placeholder="e.g. Full-Time, Internship"
                        value={form.positionTypes}
                        onChange={(e) => set("positionTypes", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Work Authorization">
                      <Input
                        placeholder="e.g. US Citizen, OPT/CPT"
                        value={form.workAuth}
                        onChange={(e) => set("workAuth", e.target.value)}
                        className="col-span-2"
                      />
                    </FormField>
                  </div>
                </FormSection>

                {/* Contact */}
                <FormSection icon={Building2} title="Contact Information">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Representative Name" required>
                      <Input
                        placeholder="Full name"
                        value={form.repName}
                        onChange={(e) => set("repName", e.target.value)}
                        required
                      />
                    </FormField>
                    <FormField label="Representative Email" required>
                      <Input
                        type="email"
                        placeholder="email@company.com"
                        value={form.repEmail}
                        onChange={(e) => set("repEmail", e.target.value)}
                        required
                      />
                    </FormField>
                    <FormField label="Personal Phone">
                      <Input
                        type="tel"
                        placeholder="(xxx) xxx-xxxx"
                        value={form.repPhone}
                        onChange={(e) => set("repPhone", e.target.value)}
                      />
                    </FormField>
                    <div />
                    <FormField label="Additional Reps — Day 1">
                      <Input
                        placeholder="Names, comma-separated"
                        value={form.additionalRepsDay1}
                        onChange={(e) => set("additionalRepsDay1", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Additional Reps — Day 2">
                      <Input
                        placeholder="Names, comma-separated"
                        value={form.additionalRepsDay2}
                        onChange={(e) => set("additionalRepsDay2", e.target.value)}
                      />
                    </FormField>
                  </div>
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
