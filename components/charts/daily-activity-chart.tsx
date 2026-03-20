"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Calendar } from "lucide-react"

interface DailyActivityChartProps {
  wins: number
  losses: number
  periodLabel?: string
}

export function DailyActivityChart({ wins, losses, periodLabel = "за всё время" }: DailyActivityChartProps) {
  const totalMatches = wins + losses
  const slices = [
    { name: "Победы", value: wins, color: "var(--christmas-green)" },
    { name: "Поражения", value: losses, color: "var(--christmas-red)" },
  ]

  if (totalMatches === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Победы и поражения
          </CardTitle>
          <p className="text-xs text-muted-foreground">{periodLabel}</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Нет данных по результатам событий</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Победы и поражения
        </CardTitle>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative h-[220px] rounded-xl border border-border/50 bg-background/25 px-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
              <Pie
                data={slices}
                cx="50%"
                cy="50%"
                innerRadius={64}
                outerRadius={98}
                dataKey="value"
                paddingAngle={3}
                cornerRadius={8}
                stroke="var(--background)"
                strokeWidth={3}
              >
                {slices.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full border border-christmas-gold/20 bg-background/75 px-5 py-3 text-center shadow-lg backdrop-blur-sm">
              <p className="text-3xl font-bold text-christmas-snow">{totalMatches}</p>
              <p className="text-[11px] text-christmas-gold">игр</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {slices.map((slice) => {
            const percentage = totalMatches > 0 ? (slice.value / totalMatches) * 100 : 0

            return (
              <div
                key={slice.name}
                className="rounded-xl border border-border/50 bg-background/30 p-3"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                    <p className="text-sm font-medium text-christmas-snow">{slice.name}</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold leading-none text-christmas-snow">{slice.value}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
