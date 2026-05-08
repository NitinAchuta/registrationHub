"use client"

import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"
import type { Relationship } from "@/lib/types"

const FACTORS: { key: keyof Relationship; label: string; weight: number }[] = [
  { key: "attendedPastFairs", label: "Attended past career fairs", weight: 20 },
  { key: "outsideEngagement", label: "Engaged outside career fair", weight: 15 },
  { key: "fycfParticipant", label: "FYCF participant", weight: 10 },
  { key: "alumniPresence", label: "Strong alumni presence", weight: 15 },
  { key: "careerCenterPartner", label: "Career Center partner", weight: 20 },
  { key: "coeDonor", label: "CoE donor", weight: 20 },
]

export function RelationshipCard({
  relationship,
  showScore = true,
}: {
  relationship: Relationship
  showScore?: boolean
}) {
  const score = FACTORS.reduce(
    (sum, f) => sum + (relationship[f.key] ? f.weight : 0),
    0,
  )

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Relationship with A&amp;M</h4>
        {showScore && (
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
            {score}/100
          </Badge>
        )}
      </div>
      <ul className="mt-3 space-y-1.5">
        {FACTORS.map((f) => {
          const on = Boolean(relationship[f.key])
          return (
            <li key={f.key as string} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-foreground">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full ${
                    on ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {on ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                </span>
                {f.label}
              </span>
              <span className="text-xs text-muted-foreground">+{f.weight}</span>
            </li>
          )
        })}
      </ul>
      {relationship.outsideEngagementNote && (
        <p className="mt-3 rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Outside engagement note:</span>{" "}
          {relationship.outsideEngagementNote}
        </p>
      )}
      {relationship.careerCenterSponsorshipLevel && (
        <p className="mt-2 text-xs text-muted-foreground">
          Career Center sponsorship:{" "}
          <span className="font-medium text-foreground">{relationship.careerCenterSponsorshipLevel}</span>
        </p>
      )}
    </div>
  )
}
