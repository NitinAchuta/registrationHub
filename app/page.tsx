"use client"

import { useState, useMemo } from "react"
import { CompanyTable } from "@/components/company-table"
import { CompanyInsights } from "@/components/company-insights"
import { RegistrationFormDialog } from "@/components/registration-form"
import { ZachryAnalytics } from "@/components/workspaces/zachry-analytics"
import { FinanceWorkspace } from "@/components/workspaces/finance-workspace"
import { HospitalityWorkspace } from "@/components/workspaces/hospitality-workspace"
import { OperationsWorkspace } from "@/components/workspaces/operations-workspace"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  ClipboardList,
  BarChart2,
  TrendingUp,
  DollarSign,
  Utensils,
  Settings,
  AlertCircle,
  GraduationCap,
  User,
  Shield,
  ChevronDown,
} from "lucide-react"
import { getNormalizedCompanies, rawRegistrations, getTotalReceivables, type UserRole } from "@/lib/data"
import { 
  canViewWorkspace, 
  getAccessibleWorkspaces, 
  getRoleLabel, 
  getRoleDescription,
  allRoles,
  type Workspace 
} from "@/lib/rbac"

type Tab = "registrations" | "insights" | "zachry-analytics" | "finance" | "hospitality" | "operations"

const tabConfig: { id: Tab; workspace: Workspace | null; label: string; icon: typeof ClipboardList }[] = [
  { id: "registrations", workspace: "registrations", label: "Registrations", icon: ClipboardList },
  { id: "insights", workspace: "registrations", label: "Insights", icon: BarChart2 },
  { id: "zachry-analytics", workspace: "zachry-analytics", label: "Zachry Analytics", icon: TrendingUp },
  { id: "finance", workspace: "finance", label: "Finance", icon: DollarSign },
  { id: "hospitality", workspace: "hospitality", label: "Hospitality", icon: Utensils },
  { id: "operations", workspace: "operations", label: "Operations", icon: Settings },
]

function StatBadge({ count, label, color }: { count: number | string; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${color}`}>
      <span className="text-xl font-bold">{count}</span>
      <span className="text-xs font-medium leading-tight">{label}</span>
    </div>
  )
}

function getRoleIcon(role: UserRole) {
  switch (role) {
    case "Admin":
      return <Shield className="h-4 w-4" />
    case "Registration":
      return <ClipboardList className="h-4 w-4" />
    case "Finance":
      return <DollarSign className="h-4 w-4" />
    case "Hospitality":
      return <Utensils className="h-4 w-4" />
  }
}

export default function Page() {
  const [tab, setTab] = useState<Tab>("registrations")
  const [role, setRole] = useState<UserRole>("Admin")

  const stats = useMemo(() => {
    const companies = getNormalizedCompanies()
    const confirmed = companies.filter((c) => c.status === "Confirmed").length
    const pending = companies.filter((c) => c.status === "Pending").length
    const waitlisted = companies.filter((c) => c.status === "Waitlisted").length
    const cancelled = companies.filter((c) => c.status === "Cancelled").length
    const totalEntries = rawRegistrations.length
    const normalized = companies.length
    const receivables = getTotalReceivables()
    return { confirmed, pending, waitlisted, cancelled, totalEntries, normalized, receivables }
  }, [])

  // Filter tabs based on role permissions
  const visibleTabs = useMemo(() => {
    return tabConfig.filter(t => {
      if (!t.workspace) return true
      return canViewWorkspace(role, t.workspace)
    })
  }, [role])

  // Reset tab if current tab is no longer visible
  useMemo(() => {
    const currentTabVisible = visibleTabs.some(t => t.id === tab)
    if (!currentTabVisible && visibleTabs.length > 0) {
      setTab(visibleTabs[0].id)
    }
  }, [visibleTabs, tab])

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Top Header Bar */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-primary-foreground/10 border border-primary-foreground/20">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-primary-foreground/70 leading-none">Texas A&amp;M University</p>
              <h1 className="text-sm font-bold text-primary-foreground leading-tight text-balance">SEC Career Fair Hub</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground bg-primary-foreground/10 text-xs">
              Spring 2026
            </Badge>
            
            {/* Role Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 gap-2 border border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
                >
                  {getRoleIcon(role)}
                  <span className="hidden sm:inline">{getRoleLabel(role)}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>View As</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allRoles.map(r => (
                  <DropdownMenuItem
                    key={r}
                    onClick={() => setRole(r)}
                    className={role === r ? "bg-accent" : ""}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        {getRoleIcon(r)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{getRoleLabel(r)}</p>
                        <p className="text-xs text-muted-foreground">
                          {getAccessibleWorkspaces(r).length} workspaces
                        </p>
                      </div>
                      {role === r && (
                        <Badge variant="secondary" className="ml-auto text-xs">Active</Badge>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sub-header with stats */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatBadge
                count={stats.confirmed}
                label="Confirmed"
                color="bg-emerald-50 border-emerald-200 text-emerald-800"
              />
              <StatBadge
                count={stats.pending}
                label="Pending"
                color="bg-amber-50 border-amber-200 text-amber-800"
              />
              {canViewWorkspace(role, "finance") && (
                <StatBadge
                  count={`$${(stats.receivables / 1000).toFixed(0)}k`}
                  label="Receivables"
                  color="bg-blue-50 border-blue-200 text-blue-800"
                />
              )}
              <StatBadge
                count={stats.normalized}
                label="Companies"
                color="bg-muted border-border text-foreground"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {stats.normalized < stats.totalEntries && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{stats.totalEntries - stats.normalized} duplicates merged</span>
                </div>
              )}
              {canViewWorkspace(role, "registrations") && <RegistrationFormDialog />}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-0 overflow-x-auto" role="tablist" aria-label="Dashboard sections">
            {visibleTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {tab === "registrations" && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground text-balance">Company Registrations</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {stats.normalized} unique companies &middot; {stats.totalEntries} total registration entries.
                Duplicate organization names are automatically normalized.
              </p>
            </div>
            <CompanyTable />
          </div>
        )}

        {tab === "insights" && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground text-balance">Company Insights</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Historical engagement analytics and acceptance recommendations for each company.
              </p>
            </div>
            <CompanyInsights />
          </div>
        )}

        {tab === "zachry-analytics" && <ZachryAnalytics />}
        {tab === "finance" && <FinanceWorkspace />}
        {tab === "hospitality" && <HospitalityWorkspace />}
        {tab === "operations" && <OperationsWorkspace />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>TAMU Student Engineering Council &middot; Career Fair Management System</p>
            <p>
              Viewing as: <span className="font-medium text-foreground">{getRoleLabel(role)}</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
