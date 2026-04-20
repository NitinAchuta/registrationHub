"use client"

import { UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Link from "next/link"
import { ShieldAlert } from "lucide-react"

type Props = {
  email: string | null
}

export function UnauthorizedContent({ email }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            SEC Career Fair Hub
          </div>
          <UserButton />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <Card className="w-full max-w-lg border-border">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-balance">Access not enabled</CardTitle>
            <CardDescription className="text-pretty text-base leading-relaxed">
              You are signed in successfully. However, your account is not currently authorized to
              access SEC Career Fair Hub. This internal tool is only available to approved Student
              Engineers&apos; Council members for career fair operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {email && (
              <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                Signed in as: <span className="font-medium text-foreground">{email}</span>
              </p>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you believe this is a mistake, contact the systems team or a career fair
              administrator to request access.
            </p>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
