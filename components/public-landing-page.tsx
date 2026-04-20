"use client"

import { useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { SignInButton, SignUpButton, Show, useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function PublicLandingPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    router.refresh()
  }, [isLoaded, isSignedIn, router])

  return (
    <div className="flex min-h-screen flex-col bg-background">
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
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <Card className="w-full max-w-md border-border shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-balance">Internal dashboard</CardTitle>
            <CardDescription className="text-pretty">
              Sign in with your Google account to access SEC Career Fair Hub. Access is limited
              to approved SEC members.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button className="w-full" size="lg">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="outline" className="w-full" size="lg">
                  Sign up
                </Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in" fallback={null}>
              <p className="text-center text-sm text-muted-foreground">Redirecting…</p>
            </Show>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
