"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Calendar } from "lucide-react"

interface DailyActivityChartProps {
  wins: number
  losses: number
}

export function DailyActivityChart({ wins, losses }: DailyActivityChartProps) {
  const totalMatches = wins + losses
  const slices = [
    { name: "Победы", value: wins, color: "var(--christmas-green)" },
    { name: "Поражения", value: losses, color: "var(--christmas-red)" },
  ]

  if (totalMatches === 0) {
    return (
      <Card className="flex h-full min-h-[390px] flex-col border-christmas-gold/20 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Победы и поражения
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <p className="text-sm text-muted-foreground">Нет данных по результатам событий</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex h-full min-h-[390px] flex-col border-christmas-gold/20 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Победы и поражения
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-3">
        <div className="relative h-[240px] rounded-xl border border-border/50 bg-background/25 px-2">
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
              <p className="text-3xl font-bold text-christmas-snow" data-testid="overall-results-total">{totalMatches}</p>
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
                data-testid={slice.name === "Победы" ? "overall-results-wins" : "overall-results-losses"}
                className="rounded-xl border border-border/50 bg-background/30 p-3"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                    <p className="text-sm font-medium text-christmas-snow">{slice.name}</p>
                  </div>
                  <div className="text-center">
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
