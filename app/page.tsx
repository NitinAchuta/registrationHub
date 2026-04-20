import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getCurrentUserAccess } from "@/lib/auth/get-current-user-access"
import { getWorkspacesForSecTitle } from "@/lib/auth/workspace-access-by-title"
import { PublicLandingPage } from "@/components/public-landing-page"
import { CareerFairHubDashboard } from "@/components/career-fair-hub-dashboard"

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

  return (
    <CareerFairHubDashboard
      secTitle={secTitle}
      allowedWorkspaces={allowedWorkspaces}
    />
  )
}
