"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import { UserButton } from "@clerk/nextjs"
import { Badge } from "@/components/ui/badge"
import {
  ClipboardList,
  Building2,
  TrendingUp,
  DollarSign,
  Utensils,
  Settings,
  AlertCircle,
  Briefcase,
  RefreshCw,
} from "lucide-react"
import { canAccessWorkspace } from "@/lib/auth/workspace-access-by-title"
import type { Workspace } from "@/lib/rbac"
import type {
  CompanyRecord,
  MajorAnalytics,
  SemesterCode,
  RegistrationStatus,
} from "@/lib/types"
import { ALL_REGISTRATION_STATUSES } from "@/lib/types"
import { mapRawStatus } from "@/lib/statusMapping"
import { getPackagePrice, LOCAL_STORAGE_KEYS } from "@/lib/packagePricing"
import { semesterLabel } from "@/lib/format"
import { useLocalStorageState } from "@/hooks/use-local-storage"
import { applyF26Overrides } from "@/lib/f26MergeCompanies"
import { buildActiveF26View, getF26Meta, type F26RegistrationOverride } from "@/lib/f26Registration"
import { RegistrationsView } from "@/components/views/registrations-view"
import { CompanyDashboardView } from "@/components/views/company-dashboard-view"
import { CareerFairAnalyticsView } from "@/components/views/career-fair-analytics-view"
import { FinanceWorkspace } from "@/components/workspaces/finance-workspace"
import { HospitalityWorkspace } from "@/components/workspaces/hospitality-workspace"
import { OperationsWorkspace } from "@/components/workspaces/operations-workspace"
import { useF26Registrations } from "@/hooks/useF26Registrations"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type Tab =
  | "registrations"
  | "company-dashboard"
  | "career-fair"
  | "finance"
  | "hospitality"
  | "operations"

const tabConfig: { id: Tab; workspace: Workspace | null; label: string; icon: typeof ClipboardList }[] = [
  { id: "registrations", workspace: "registrations", label: "Registrations", icon: ClipboardList },
  { id: "company-dashboard", workspace: "registrations", label: "Company Dashboard", icon: Building2 },
  { id: "career-fair", workspace: "analytics", label: "Career Fair", icon: TrendingUp },
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

type Props = {
  secTitle: string
  allowedWorkspaces: Workspace[]
  semesterOrder: SemesterCode[]
  currentSemester: SemesterCode
  majorAnalytics: MajorAnalytics[]
  allCompanies: CompanyRecord[]
  registrationCompanies: CompanyRecord[]
}

export function CareerFairHubDashboard({
  secTitle,
  allowedWorkspaces,
  semesterOrder,
  currentSemester,
  majorAnalytics,
  allCompanies,
  registrationCompanies,
}: Props) {
  const [tab, setTab] = useState<Tab>("registrations")
  const [registrationOverrides, setRegistrationOverrides] = useLocalStorageState<
    Record<string, F26RegistrationOverride>
  >(LOCAL_STORAGE_KEYS.registrationOverrides, {})
  const [assignments] = useLocalStorageState<Record<string, string>>(LOCAL_STORAGE_KEYS.assignments, {})

  const exportSheet = useF26Registrations(currentSemester === "F26")

  const mergedRegistrationCompanies = useMemo(() => {
    let base: CompanyRecord[]
    if (currentSemester !== "F26") {
      base = registrationCompanies
    } else if (exportSheet.error && exportSheet.companies.length === 0) {
      base = []
    } else if (exportSheet.companies.length > 0) {
      base = exportSheet.companies
    } else {
      base = []
    }
    return applyF26Overrides(base, registrationOverrides, currentSemester)
  }, [
    currentSemester,
    registrationCompanies,
    exportSheet.companies,
    exportSheet.error,
    registrationOverrides,
  ])

  const stats = useMemo(() => {
    let confirmed = 0
    let pending = 0
    let canceled = 0
    let denied = 0
    let receivables = 0
    let totalEntries = 0
    let symplicityRemaining = 0
    let dueSoon = 0
    let overdue = 0
    for (const c of mergedRegistrationCompanies) {
      const reg = c.currentRegistration
      if (!reg) continue
      totalEntries++
      const s: RegistrationStatus = mapRawStatus(reg.status) ?? "Pending"
      const meta = getF26Meta(reg)
      if (s === "Pending" && !meta.symplicityUpdated) symplicityRemaining++
      const v = buildActiveF26View(c, currentSemester, `${currentSemester}:${c.id}`, assignments)
      if (v && v.deadlineLabel === "Due soon") dueSoon++
      if (v && v.deadlineLabel === "Overdue") overdue++
      if (s === "Confirmed") {
        confirmed++
        const price = getPackagePrice(reg?.package ?? null) ?? 0
        receivables += price
      } else if (s === "Pending") {
        pending++
      } else if (s === "Canceled") {
        canceled++
      } else if (s === "Denied") {
        denied++
      }
    }
    return {
      confirmed,
      pending,
      canceled,
      denied,
      totalEntries,
      normalized: totalEntries,
      receivables,
      symplicityRemaining,
      dueSoon,
      overdue,
    }
  }, [mergedRegistrationCompanies, currentSemester, assignments])

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
              {semesterLabel(currentSemester)}
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
              {canAccessWorkspace(allowedWorkspaces, "finance") ? (
                <StatBadge
                  count={`$${(stats.receivables / 1000).toFixed(0)}k`}
                  label="Est. revenue"
                  color="bg-blue-50 border-blue-200 text-blue-800"
                />
              ) : (
                <StatBadge
                  count={stats.symplicityRemaining}
                  label="Symplicity updates left"
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
              {allCompanies.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-xs text-blue-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {mergedRegistrationCompanies.length} active {semesterLabel(currentSemester)} registration
                    {mergedRegistrationCompanies.length === 1 ? "" : "s"}
                  </span>
                </div>
              )}
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
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-balance text-foreground">
                  Company Registrations
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {mergedRegistrationCompanies.length} active {semesterLabel(currentSemester)} registration
                  {mergedRegistrationCompanies.length === 1 ? "" : "s"}. Historical fair data is
                  available in each company profile.
                </p>
              </div>
              {currentSemester === "F26" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-primary/30 bg-background"
                  disabled={exportSheet.loading}
                  title="Reload Export tab from Google Sheets (bypasses day-long browser cache)"
                  onClick={() => void exportSheet.refresh(true)}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 shrink-0 ${exportSheet.loading ? "animate-spin" : ""}`}
                  />
                  Sync Google Sheets
                </Button>
              )}
            </div>
            {currentSemester === "F26" && exportSheet.loading && (
              <Alert className="mb-4 border-border">
                <AlertTitle>Loading registrations</AlertTitle>
                <AlertDescription>Fetching F26 rows from the Google Sheet Export tab…</AlertDescription>
              </Alert>
            )}
            {currentSemester === "F26" &&
              !exportSheet.loading &&
              !exportSheet.error &&
              mergedRegistrationCompanies.length === 0 && (
                <Alert className="mb-4 border-border">
                  <AlertTitle>No F26 registrations found</AlertTitle>
                  <AlertDescription>
                    No F26 registrations found in the connected sheet.
                  </AlertDescription>
                </Alert>
              )}
            {currentSemester === "F26" && exportSheet.error && !exportSheet.loading && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Could not load F26 registrations from Google Sheets.</AlertTitle>
                <AlertDescription>{exportSheet.error}</AlertDescription>
              </Alert>
            )}
            <RegistrationsView
              companies={mergedRegistrationCompanies}
              semesterOrder={semesterOrder}
              currentSemester={currentSemester}
              majorAnalytics={majorAnalytics}
              setRegistrationOverrides={setRegistrationOverrides}
              onExportRefresh={(force) => void exportSheet.refresh(force)}
            />
          </div>
        )}

        {tab === "company-dashboard" && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-balance text-foreground">Company Dashboard</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Company background, historical attendance, hiring outcomes, relationship data,
                and active registration details.
              </p>
            </div>
            <CompanyDashboardView
              companies={allCompanies}
              semesterOrder={semesterOrder}
              currentSemester={currentSemester}
              majorAnalytics={majorAnalytics}
            />
          </div>
        )}

        {tab === "career-fair" && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-balance text-foreground">Career Fair Analytics</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {semesterLabel(currentSemester)} registration progress with historical benchmarks
                from prior fairs.
              </p>
            </div>
            <CareerFairAnalyticsView
              companies={mergedRegistrationCompanies}
              historicalCompanies={allCompanies}
              activeFairLabel={semesterLabel(currentSemester)}
              majorAnalytics={majorAnalytics}
              currentSemester={currentSemester}
              assignments={assignments}
            />
          </div>
        )}

        {tab === "finance" && <FinanceWorkspace />}
        {tab === "hospitality" && <HospitalityWorkspace />}
        {tab === "operations" && (
          <OperationsWorkspace
            activeFairLabel={semesterLabel(currentSemester)}
            activeCompanyCount={mergedRegistrationCompanies.length}
            registrationCompanies={mergedRegistrationCompanies}
            currentSemester={currentSemester}
            assignments={assignments}
          />
        )}
      </main>

      <footer className="mt-auto border-t border-border bg-card py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>TAMU Student Engineering Council &middot; Career Fair Management System</p>
            <p>
              Your role: <span className="font-medium text-foreground">{secTitle}</span>
              {" · "}
              Primary registration statuses: {ALL_REGISTRATION_STATUSES.join(", ")}. BTT and 1-to-2-day are tracked separately.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
