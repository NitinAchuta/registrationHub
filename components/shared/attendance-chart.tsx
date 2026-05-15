"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { CompanyRecord, SemesterCode } from "@/lib/types"
import { shortSemesterLabel } from "@/lib/format"

export function AttendanceChart({
  company,
  semesterOrder,
}: {
  company: CompanyRecord
  semesterOrder: SemesterCode[]
}) {
  const rows = semesterOrder.map((sem) => {
    const att = company.attendanceHistory[sem]
    const hires = company.hiringHistory[sem] ?? 0
    return {
      semester: shortSemesterLabel(sem),
      attended: att?.attended ? 1 : 0,
      hires,
      package: att?.package?.tier ?? null,
    }
  })

  const anyData = rows.some((r) => r.attended || r.hires)
  if (!anyData) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
        No historical data available from connected sheets.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="semester" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === "Attended") return [value === 1 ? "Yes" : "No", "Attended"]
            return [value, name]
          }}
        />
        <Legend />
        <Bar dataKey="attended" name="Attended" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="hires" name="Hires" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
