import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getCurrentUserAccess } from "@/lib/auth/get-current-user-access"
import { getWorkspacesForSecTitle } from "@/lib/auth/workspace-access-by-title"
import { PublicLandingPage } from "@/components/public-landing-page"
import { CareerFairHubDashboard } from "@/components/career-fair-hub-dashboard"
import { getDataset, getCurrentSemester } from "@/lib/data-source"

export default async function HomePage() {
  const { userId } = await auth()
  if (!userId) {
    return <PublicLandingPage />
  }

  const access = await getCurrentUserAccess()
  if (!access.isApproved) {
    redirect("/unauthorized")
  }

  const secTitle = access.approvedUser?.title ?? "SEC Member"
  const allowedWorkspaces = getWorkspacesForSecTitle(access.approvedUser?.title)

  // Load and slim the parsed Excel dataset on the server.
  const dataset = getDataset()
  const currentSemester = getCurrentSemester()
  const registrationCompanies = dataset.companies.filter(
    (c) => c.registrationHistory[currentSemester] || c.f25Selection,
  )

  return (
    <CareerFairHubDashboard
      secTitle={secTitle}
      allowedWorkspaces={allowedWorkspaces}
      semesterOrder={dataset.semesterOrder}
      currentSemester={currentSemester}
      majorAnalytics={dataset.majorAnalytics}
      allCompanies={dataset.companies}
      registrationCompanies={registrationCompanies}
    />
  )
}
