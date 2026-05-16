"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CompanyEventInterest } from "@/lib/types"
import { cn } from "@/lib/utils"

export const EVENT_INTEREST_OPTIONS: CompanyEventInterest[] = ["Yes", "No", "Not indicated"]

export const MANUAL_EVENT_INTEREST_OPTIONS = ["Yes", "No"] as const

type Props = {
  value: CompanyEventInterest
  onValueChange: (value: CompanyEventInterest) => void
  className?: string
  /** When false, only Yes / No (manual entry form). */
  includeNotIndicated?: boolean
}

export function EventInterestSelect({
  value,
  onValueChange,
  className,
  includeNotIndicated = true,
}: Props) {
  const options = includeNotIndicated ? EVENT_INTEREST_OPTIONS : MANUAL_EVENT_INTEREST_OPTIONS

  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as CompanyEventInterest)}>
      <SelectTrigger className={cn("h-7 w-[7.5rem] text-xs", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="text-xs">
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
