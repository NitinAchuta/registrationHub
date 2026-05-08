"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { CompanyScoring } from "@/lib/types"

const PRIORITY_COLOR: Record<CompanyScoring["priorityBadge"], string> = {
  "High Priority": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Good Fit": "bg-blue-100 text-blue-800 border-blue-200",
  "Needs Review": "bg-amber-100 text-amber-800 border-amber-200",
  "Low Priority": "bg-slate-200 text-slate-700 border-slate-300",
}

const RECOMMENDATION_COLOR: Record<CompanyScoring["recommendation"], string> = {
  "Recommended for Acceptance": "text-emerald-700",
  "Recommended for Review": "text-amber-700",
  "Recommended for Waitlist": "text-blue-700",
  "Recommended for Denial": "text-red-700",
  "Recommended for BTT": "text-purple-700",
  "Recommended for 1 to 2 Day": "text-cyan-700",
  "Needs More Information": "text-slate-700",
}

export function ScoreCard({ scoring, compact = false }: { scoring: CompanyScoring; compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-border bg-card ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Company Score</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-foreground">{scoring.totalScore}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>
        <Badge variant="outline" className={PRIORITY_COLOR[scoring.priorityBadge]}>
          {scoring.priorityBadge}
        </Badge>
      </div>

      <div className={`mt-3 text-sm font-medium ${RECOMMENDATION_COLOR[scoring.recommendation]}`}>
        {scoring.recommendation}
      </div>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{scoring.recommendationReason}</p>

      {!compact && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Bar label="Relationship (25%)" value={scoring.relationshipScore} />
          <Bar label="Hiring (20%)" value={scoring.hiringScore} />
          <Bar label="Engagement (15%)" value={scoring.engagementScore} />
          <Bar label="Major Fit (15%)" value={scoring.majorFitScore} />
          <Bar label="Financial (10%)" value={scoring.financialScore} />
          <Bar label="Operational (10%)" value={scoring.operationalScore} />
          <Bar label="Work Auth (5%)" value={scoring.workAuthScore} />
        </div>
      )}
    </div>
  )
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <Progress value={value} className="h-1.5 mt-1" />
    </div>
  )
}
