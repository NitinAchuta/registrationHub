"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import { UserButton } from "@clerk/nextjs"
import { CompanyTable } from "@/components/company-table"
import { CompanyInsights } from "@/components/company-insights"
import { RegistrationFormDialog } from "@/components/registration-form"
import { Analytics as AnalyticsWorkspace } from "@/components/workspaces/analytics"
import { FinanceWorkspace } from "@/components/workspaces/finance-workspace"
import { HospitalityWorkspace } from "@/components/workspaces/hospitality-workspace"
import { OperationsWorkspace } from "@/components/workspaces/operations-workspace"
import { Badge } from "@/components/ui/badge"
import {
  ClipboardList,
  BarChart2,
  TrendingUp,
  DollarSign,
  Utensils,
  Settings,
  AlertCircle,
  Briefcase,
} from "lucide-react"
import { getNormalizedCompanies, rawRegistrations, getTotalReceivables } from "@/lib/data"
import { canAccessWorkspace } from "@/lib/auth/workspace-access-by-title"
import type { Workspace } from "@/lib/rbac"

type Tab = "registrations" | "insights" | "analytics" | "finance" | "hospitality" | "operations"

const tabConfig: { id: Tab; workspace: Workspace | null; label: string; icon: typeof ClipboardList }[] = [
  { id: "registrations", workspace: "registrations", label: "Registrations", icon: ClipboardList },
  { id: "insights", workspace: "registrations", label: "Insights", icon: BarChart2 },
  { id: "analytics", workspace: "analytics", label: "Analytics", icon: TrendingUp },
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

type CareerFairHubDashboardProps = {
  secTitle: string
  allowedWorkspaces: Workspace[]
}

export function CareerFairHubDashboard({
  secTitle,
  allowedWorkspaces,
}: CareerFairHubDashboardProps) {
  const [tab, setTab] = useState<Tab>("registrations")

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

  const visibleTabs = useMemo(() => {
    return tabConfig.filter((t) => {
      if (!t.workspace) return true
      return canAccessWorkspace(allowedWorkspaces, t.workspace)
    })
  }, [allowedWorkspaces])

  useEffect(() => {
    const currentTabVisible = visibleTabs.some((t) => t.id === tab)
    if (!currentTabVisible && visibleTabs.length > 0) {
      setTab(visibleTabs[0].id)
    }
  }, [visibleTabs, tab])

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-primary-foreground/25 bg-white p-1 shadow-sm">
              <Image
                src="/sec_logo.png"
                alt="Student Engineers' Council"
                width={36}
                height={36}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-xs font-medium leading-none text-primary-foreground/70">
                Texas A&amp;M University
              </p>
              <h1 className="text-sm font-bold leading-tight text-balance text-primary-foreground">
                SEC Career Fair Hub
              </h1>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Badge
              variant="outline"
              className="border-primary-foreground/30 bg-primary-foreground/10 text-xs text-primary-foreground"
            >
              Spring 2026
            </Badge>
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-8 w-8",
                },
              }}
            />
            <div
              className="flex max-w-[min(100%,18rem)] items-center gap-2 rounded-md border border-primary-foreground/30 bg-primary-foreground/10 px-2.5 py-1.5 text-primary-foreground sm:max-w-xs"
              title={secTitle}
            >
              <Briefcase className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              <span className="truncate text-xs font-medium leading-tight sm:text-sm">{secTitle}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
              {canAccessWorkspace(allowedWorkspaces, "finance") && (
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
            <div className="flex shrink-0 items-center gap-2">
              {stats.normalized < stats.totalEntries && (
                <div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{stats.totalEntries - stats.normalized} duplicates merged</span>
                </div>
              )}
              {canAccessWorkspace(allowedWorkspaces, "registrations") && <RegistrationFormDialog />}
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="flex gap-0 overflow-x-auto" role="tablist" aria-label="Dashboard sections">
            {visibleTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  tab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {tab === "registrations" && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-balance text-foreground">Company Registrations</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
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
              <h2 className="text-lg font-semibold text-balance text-foreground">Company Insights</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Historical engagement analytics and acceptance recommendations for each company.
              </p>
            </div>
            <CompanyInsights />
          </div>
        )}

        {tab === "analytics" && <AnalyticsWorkspace />}
        {tab === "finance" && <FinanceWorkspace />}
        {tab === "hospitality" && <HospitalityWorkspace />}
        {tab === "operations" && <OperationsWorkspace />}
      </main>

      <footer className="mt-auto border-t border-border bg-card py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>TAMU Student Engineering Council &middot; Career Fair Management System</p>
            <p>
              Your role: <span className="font-medium text-foreground">{secTitle}</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
