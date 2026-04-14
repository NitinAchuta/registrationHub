"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import {
  zachryMajorDistribution,
  getNormalizedCompanies,
  companyDEI,
  getDEICompanies,
  type MajorDistribution,
} from "@/lib/data"
import { AlertTriangle, Award, Building2, TrendingUp, Users } from "lucide-react"

export function ZachryAnalytics() {
  const [showDEIOnly, setShowDEIOnly] = useState(false)
  
  const companies = useMemo(() => getNormalizedCompanies(), [])
  const deiCompanies = useMemo(() => getDEICompanies(), [])

  // Calculate recruitment distribution from actual company data
  const majorRecruitmentStats = useMemo(() => {
    const majorCounts: Record<string, number> = {}
    const filteredCompanies = showDEIOnly 
      ? companies.filter(c => deiCompanies.some(d => d.companyName === c.canonicalName))
      : companies

    filteredCompanies.forEach(company => {
      company.entries.forEach(entry => {
        entry.majorsRecruited.forEach(major => {
          majorCounts[major] = (majorCounts[major] || 0) + 1
        })
      })
    })

    const totalCompanies = filteredCompanies.length
    return zachryMajorDistribution.map(m => ({
      ...m,
      recruitedPercent: totalCompanies > 0 
        ? Math.round((majorCounts[m.major] || 0) / totalCompanies * 100)
        : 0,
      companyCount: majorCounts[m.major] || 0,
    }))
  }, [companies, showDEIOnly, deiCompanies])

  // Find under-indexed majors (companies recruit less than population %)
  const underIndexedMajors = majorRecruitmentStats.filter(
    m => m.recruitedPercent < m.zachryPercent * 0.5
  )

  // DEI stats
  const deiStats = useMemo(() => {
    const veteranOwned = companyDEI.filter(d => d.isVeteranOwned).length
    const minorityOwned = companyDEI.filter(d => d.isMinorityOwned).length
    const womanOwned = companyDEI.filter(d => d.isWomanOwned).length
    const underrepresented = companyDEI.filter(d => d.isUnderrepresented).length
    const withCerts = companyDEI.filter(d => d.deiCertifications.length > 0).length
    
    return {
      veteranOwned,
      minorityOwned,
      womanOwned,
      underrepresented,
      withCerts,
      total: companies.length,
      deiPercentage: Math.round((deiCompanies.length / companies.length) * 100),
    }
  }, [companies, deiCompanies])

  // Calculate recruitment balance score
  const balanceScore = useMemo(() => {
    let totalDeviation = 0
    majorRecruitmentStats.forEach(m => {
      const deviation = Math.abs(m.recruitedPercent - m.zachryPercent)
      totalDeviation += deviation
    })
    const avgDeviation = totalDeviation / majorRecruitmentStats.length
    return Math.max(0, Math.round(100 - avgDeviation * 2))
  }, [majorRecruitmentStats])

  // Prepare radar chart data
  const radarData = majorRecruitmentStats.map(m => ({
    major: m.major.replace(" Engineering", "").replace("Computer ", "CS/"),
    zachry: m.zachryPercent,
    recruited: m.recruitedPercent,
  }))

  return (
    <div className="space-y-6">
      {/* Header with DEI toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Zachry Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Major distribution analysis and DEI tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="dei-filter"
            checked={showDEIOnly}
            onCheckedChange={setShowDEIOnly}
          />
          <Label htmlFor="dei-filter" className="text-sm font-medium">
            Show DEI Companies Only
          </Label>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">DEI Representation</p>
                <p className="text-2xl font-bold text-foreground">{deiStats.deiPercentage}%</p>
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
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">DEI Certified</p>
                <p className="text-2xl font-bold text-foreground">{deiStats.withCerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Under-indexed Alerts */}
      {underIndexedMajors.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Under-Indexed Majors
            </CardTitle>
            <CardDescription className="text-amber-700">
              These majors have significantly fewer recruiting companies than their Zachry population suggests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {underIndexedMajors.map(m => (
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar Chart: Zachry vs Recruited */}
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
                <YAxis 
                  type="category" 
                  dataKey="major" 
                  width={95}
                  tick={{ fontSize: 12 }}
                />
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

        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Recruitment Coverage Radar</CardTitle>
            <CardDescription>
              Visual comparison of population vs. recruitment across all majors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid />
                <PolarAngleAxis dataKey="major" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Zachry Population %"
                  dataKey="zachry"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.3}
                />
                <Radar
                  name="Companies Recruiting %"
                  dataKey="recruited"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* DEI Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>DEI Company Breakdown</CardTitle>
          <CardDescription>
            Diversity, Equity, and Inclusion status of registered companies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-3xl font-bold text-primary">{deiStats.veteranOwned}</p>
              <p className="text-sm text-muted-foreground">Veteran-Owned</p>
            </div>
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-3xl font-bold text-primary">{deiStats.minorityOwned}</p>
              <p className="text-sm text-muted-foreground">Minority-Owned</p>
            </div>
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-3xl font-bold text-primary">{deiStats.womanOwned}</p>
              <p className="text-sm text-muted-foreground">Woman-Owned</p>
            </div>
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-3xl font-bold text-primary">{deiStats.underrepresented}</p>
              <p className="text-sm text-muted-foreground">Underrepresented</p>
            </div>
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-3xl font-bold text-primary">{deiStats.withCerts}</p>
              <p className="text-sm text-muted-foreground">With DEI Certs</p>
            </div>
          </div>

          {/* DEI Companies List */}
          <div className="mt-6">
            <h4 className="mb-3 font-medium text-foreground">Companies with DEI Status</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {deiCompanies.map(company => {
                const deiInfo = companyDEI.find(d => d.companyName === company.companyName)
                return (
                  <div 
                    key={company.companyName} 
                    className="flex items-center justify-between rounded-lg border bg-card p-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">{company.companyName}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {company.isVeteranOwned && (
                          <Badge variant="secondary" className="text-xs">Veteran</Badge>
                        )}
                        {company.isMinorityOwned && (
                          <Badge variant="secondary" className="text-xs">Minority</Badge>
                        )}
                        {company.isWomanOwned && (
                          <Badge variant="secondary" className="text-xs">Woman</Badge>
                        )}
                        {company.isUnderrepresented && (
                          <Badge variant="secondary" className="text-xs">Underrep.</Badge>
                        )}
                      </div>
                    </div>
                    {deiInfo && deiInfo.deiCertifications.length > 0 && (
                      <Badge variant="outline" className="ml-2 shrink-0">
                        {deiInfo.deiCertifications.length} cert{deiInfo.deiCertifications.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
