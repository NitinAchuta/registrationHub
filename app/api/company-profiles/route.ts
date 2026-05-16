import { NextResponse } from "next/server"
import { loadMasterCompanyProfiles, resolveMasterProfilesWorkbookPath } from "@/lib/excel/loadMasterCompanyProfiles"
import { findHistoricalProfile } from "@/lib/historicalProfileMatch"

/**
 * GET historical company profiles from data/MASTER - Company Profiles.xlsx (server-only).
 * Optional ?companyName= for a single lookup.
 */
export async function GET(request: Request) {
  const filePath = resolveMasterProfilesWorkbookPath()
  if (!filePath) {
    const companyName = new URL(request.url).searchParams.get("companyName")?.trim()
    if (companyName) {
      return NextResponse.json({
        success: true,
        profile: null,
        ambiguous: false,
        warning: "Master company profiles file not found.",
      })
    }
    return NextResponse.json({
      success: true,
      profiles: [],
      warning: "Master company profiles file not found.",
    })
  }

  try {
    const profiles = loadMasterCompanyProfiles()
    const companyName = new URL(request.url).searchParams.get("companyName")?.trim()

    if (companyName) {
      const { profile, ambiguous } = findHistoricalProfile(companyName, profiles)
      return NextResponse.json(
        {
          success: true,
          profile,
          ambiguous,
        },
        { headers: { "Cache-Control": "private, no-store" } },
      )
    }

    return NextResponse.json(
      { success: true, profiles },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load master company profiles."
    if (message.includes("Worksheet")) {
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
    console.error("[api/company-profiles]", message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
