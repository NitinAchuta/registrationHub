"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  zachryMajorDistribution,
  getNormalizedCompanies,
} from "@/lib/data"
import { AlertTriangle, Building2, Layers, TrendingUp } from "lucide-react"

export function Analytics() {
  const companies = useMemo(() => getNormalizedCompanies(), [])

  const majorRecruitmentStats = useMemo(() => {
    const majorCounts: Record<string, number> = {}

    companies.forEach((company) => {
      company.entries.forEach((entry) => {
        entry.majorsRecruited.forEach((major) => {
          majorCounts[major] = (majorCounts[major] || 0) + 1
        })
      })
    })

    const totalCompanies = companies.length
    return zachryMajorDistribution.map((m) => ({
      ...m,
      recruitedPercent:
        totalCompanies > 0
          ? Math.round(((majorCounts[m.major] || 0) / totalCompanies) * 100)
          : 0,
      companyCount: majorCounts[m.major] || 0,
    }))
  }, [companies])

  const underIndexedMajors = majorRecruitmentStats.filter(
    (m) => m.recruitedPercent < m.zachryPercent * 0.5
  )

  const balanceScore = useMemo(() => {
    let totalDeviation = 0
    majorRecruitmentStats.forEach((m) => {
      const deviation = Math.abs(m.recruitedPercent - m.zachryPercent)
      totalDeviation += deviation
    })
    const avgDeviation = totalDeviation / majorRecruitmentStats.length
    return Math.max(0, Math.round(100 - avgDeviation * 2))
  }, [majorRecruitmentStats])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Major distribution: student population vs. recruiting employers
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Companies</p>
                <p className="text-2xl font-bold text-foreground">{companies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance Score</p>
                <p className="text-2xl font-bold text-foreground">{balanceScore}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Majors Tracked</p>
                <p className="text-2xl font-bold text-foreground">{majorRecruitmentStats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {underIndexedMajors.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Under-Indexed Majors
            </CardTitle>
            <CardDescription className="text-amber-700">
              These majors have significantly fewer recruiting companies than their Zachry population
              suggests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {underIndexedMajors.map((m) => (
                <Badge
                  key={m.major}
                  variant="outline"
                  className="border-amber-300 bg-amber-100 text-amber-800"
                >
                  {m.major}: {m.recruitedPercent}% recruiting vs {m.zachryPercent}% population
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Major Distribution: Population vs. Recruitment</CardTitle>
          <CardDescription>
            Zachry student population % compared to companies recruiting each major
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={majorRecruitmentStats}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="major" width={95} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => [`${value}%`, ""]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Bar
                dataKey="zachryPercent"
                name="Zachry Population %"
                fill="hsl(var(--chart-2))"
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="recruitedPercent"
                name="Companies Recruiting %"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
