"use client"

import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import type { CompanyFlag } from "@/lib/types"

const STYLE: Record<CompanyFlag["type"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
}

const ICON: Record<CompanyFlag["type"], typeof Info> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
}

export function FlagsList({ flags }: { flags: CompanyFlag[] }) {
  if (flags.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No flags. Company looks clear.</p>
    )
  }
  return (
    <ul className="space-y-2">
      {flags.map((f, i) => {
        const Icon = ICON[f.type]
        return (
          <li
            key={`${f.label}-${i}`}
            className={`flex items-start gap-2 rounded-md border p-2.5 ${STYLE[f.type]}`}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{f.label}</p>
              <p className="text-xs leading-relaxed opacity-90">{f.description}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
