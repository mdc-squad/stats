"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Calendar } from "lucide-react"

interface DailyActivityChartProps {
  wins: number
  losses: number
  periodLabel?: string
}

interface SliceTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    payload: {
      name: string
      value: number
      color: string
    }
  }>
  totalMatches: number
}

function SliceTooltip({ active, payload, totalMatches }: SliceTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  const point = payload[0]?.payload
  if (!point) {
    return null
  }

  const percentage = totalMatches > 0 ? (point.value / totalMatches) * 100 : 0

  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
      <p className="text-sm font-medium text-christmas-snow">{point.name}</p>
      <p className="text-xs text-muted-foreground">
        {point.value} матчей • {percentage.toFixed(1)}%
      </p>
    </div>
  )
}

export function DailyActivityChart({ wins, losses, periodLabel = "за всё время" }: DailyActivityChartProps) {
  const totalMatches = wins + losses
  const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0
  const slices = [
    { name: "Победы", value: wins, color: "var(--christmas-green)" },
    { name: "Поражения", value: losses, color: "var(--christmas-red)" },
  ]

  if (totalMatches === 0) {
    return (
      <Card className="col-span-full">
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
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Победы и поражения
        </CardTitle>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(360px,0.95fr)_minmax(260px,0.7fr)] xl:items-center">
          <div className="relative h-[300px] rounded-xl border border-border/50 bg-background/25 px-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                <Pie
                  data={slices}
                  cx="50%"
                  cy="50%"
                  innerRadius={88}
                  outerRadius={132}
                  dataKey="value"
                  paddingAngle={4}
                  cornerRadius={10}
                  stroke="var(--background)"
                  strokeWidth={3}
                >
                  {slices.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<SliceTooltip totalMatches={totalMatches} />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-full border border-christmas-gold/20 bg-background/75 px-6 py-4 text-center shadow-lg backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Сыграно</p>
                <p className="text-3xl font-bold text-christmas-snow">{totalMatches}</p>
                <p className="text-sm font-semibold text-christmas-gold">{winRate.toFixed(1)}% WR</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {slices.map((slice) => {
              const percentage = totalMatches > 0 ? (slice.value / totalMatches) * 100 : 0

              return (
                <div
                  key={slice.name}
                  className="rounded-xl border border-border/50 bg-background/30 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                      <p className="text-sm font-medium text-christmas-snow">{slice.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-christmas-snow">{slice.value}</p>
                      <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
