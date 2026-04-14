"use client"

import { useState, useMemo } from "react"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CheckCircle2, XCircle, ChevronsUpDown, Check, TrendingUp, TrendingDown, Users, Award } from "lucide-react"
import { getNormalizedCompanies, historicalData, getRecommendation } from "@/lib/data"
import { cn } from "@/lib/utils"

const packageColor: Record<string, string> = {
  Platinum: "bg-slate-100 text-slate-800 border-slate-300",
  Gold: "bg-amber-100 text-amber-800 border-amber-200",
  Silver: "bg-gray-100 text-gray-700 border-gray-300",
  Bronze: "bg-orange-100 text-orange-800 border-orange-200",
}

const statusColor: Record<string, string> = {
  Confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  Waitlisted: "bg-blue-100 text-blue-800 border-blue-200",
  Cancelled: "bg-red-100 text-red-800 border-red-200",
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

export function CompanyInsights() {
  const companies = useMemo(() => getNormalizedCompanies(), [])
  const [open, setOpen] = useState(false)
  const [selectedName, setSelectedName] = useState<string>("ExxonMobil")

  const company = useMemo(
    () => companies.find((c) => c.canonicalName === selectedName) ?? null,
    [companies, selectedName]
  )

  const chartData = useMemo(() => {
    if (!selectedName) return []
    return (historicalData[selectedName] ?? []).map((d) => ({
      semester: d.semester.replace(" 20", " '"),
      "Engagement Score": d.engagement,
      "Reps Attended": d.attended,
    }))
  }, [selectedName])

  const recommendation = useMemo(
    () => (selectedName ? getRecommendation(selectedName) : null),
    [selectedName]
  )

  const trend = useMemo(() => {
    const data = historicalData[selectedName]
    if (!data || data.length < 2) return null
    return data[data.length - 1].engagement - data[0].engagement
  }, [selectedName])

  const avgEngagement = useMemo(() => {
    const data = historicalData[selectedName]
    if (!data) return 0
    return Math.round(data.reduce((s, d) => s + d.engagement, 0) / data.length)
  }, [selectedName])

  const totalReps = useMemo(() => {
    const data = historicalData[selectedName]
    if (!data) return 0
    return data.reduce((s, d) => s + d.attended, 0)
  }, [selectedName])

  return (
    <div className="space-y-6">
      {/* Company Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-base font-semibold text-foreground">Select Company</h2>
          <p className="text-sm text-muted-foreground">View historical attendance and engagement analytics</p>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full sm:w-64 justify-between"
            >
              {selectedName || "Select a company..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <Command>
              <CommandInput placeholder="Search companies..." />
              <CommandList>
                <CommandEmpty>No company found.</CommandEmpty>
                <CommandGroup>
                  {companies.map((c) => (
                    <CommandItem
                      key={c.canonicalName}
                      value={c.canonicalName}
                      onSelect={(val) => {
                        setSelectedName(val)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", selectedName === c.canonicalName ? "opacity-100" : "opacity-0")}
                      />
                      {c.canonicalName}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {company && recommendation && (
        <>
          {/* Decision Card */}
          <Card className={`border-2 ${recommendation.recommended ? "border-emerald-300 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-foreground">{company.canonicalName}</CardTitle>
                  <CardDescription className="text-sm mt-0.5">{company.industry}</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant="outline" className={packageColor[company.package]}>{company.package}</Badge>
                  <Badge variant="outline" className={statusColor[company.status]}>{company.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`flex items-start gap-3 p-3 rounded-lg ${recommendation.recommended ? "bg-emerald-100" : "bg-red-100"}`}>
                {recommendation.recommended ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <Badge
                    variant="outline"
                    className={recommendation.recommended
                      ? "bg-emerald-200 text-emerald-900 border-emerald-300 font-semibold"
                      : "bg-red-200 text-red-900 border-red-300 font-semibold"
                    }
                  >
                    {recommendation.recommended ? "Recommended for Acceptance" : "Review Before Accepting"}
                  </Badge>
                  <p className="text-sm mt-1.5 text-foreground">{recommendation.reason}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Avg Engagement" value={`${avgEngagement}%`} sub="Across all semesters" />
            <StatCard label="Total Reps Sent" value={totalReps} sub="Cumulative attendance" />
            <StatCard
              label="Engagement Trend"
              value={trend !== null ? `${trend > 0 ? "+" : ""}${trend}pts` : "N/A"}
              sub="vs. first semester on record"
            />
            <StatCard label="Variants Merged" value={company.variants.length} sub={company.variants.length > 1 ? "Smart normalization" : "No duplicates"} />
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Historical Engagement & Attendance</CardTitle>
                  <CardDescription>Fall 2024 – Spring 2026</CardDescription>
                </div>
                <div className="flex items-center gap-1.5">
                  {trend !== null && trend >= 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-700">Positive trend</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="text-xs font-medium text-red-600">Declining trend</span>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="semester"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 5]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "13px",
                      color: "var(--foreground)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                  <Bar yAxisId="left" dataKey="Engagement Score" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="Reps Attended" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Major Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Recruitment Focus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Top Major</p>
                  <p className="font-semibold text-foreground">{company.topMajor}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Attendee Type</p>
                  <p className="font-semibold text-foreground">{company.entries[0].attendeeType}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Position Types</p>
                  <p className="font-semibold text-foreground">{company.entries[0].positionTypes.join(", ")}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Work Auth</p>
                  <p className="font-semibold text-foreground">{company.entries[0].workAuth.join(", ")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedName && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Select a company above to view its analytics.</p>
        </div>
      )}
    </div>
  )
}
