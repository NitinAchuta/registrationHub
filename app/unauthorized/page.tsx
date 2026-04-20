import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getCurrentUserAccess } from "@/lib/auth/get-current-user-access"
import { UnauthorizedContent } from "@/components/unauthorized-content"

export default async function UnauthorizedPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/")
  }

  const access = await getCurrentUserAccess()
  if (access.isApproved) {
    redirect("/")
  }

  return <UnauthorizedContent email={access.email} />
}
