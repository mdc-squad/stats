"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Calendar } from "lucide-react"
import { useMemo } from "react"

interface DailyActivityChartProps {
  data: { date: string; count: number; wins: number; cumWinRate: number }[]
}

export function DailyActivityChart({ data }: DailyActivityChartProps) {
  const chartData = useMemo(() => {
    const totalMatches = data.reduce((sum, point) => sum + point.count, 0)
    const totalWins = data.reduce((sum, point) => sum + point.wins, 0)
    const totalLosses = Math.max(0, totalMatches - totalWins)
    const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0

    return {
      totalMatches,
      totalWins,
      totalLosses,
      winRate,
      slices: [
        { name: "Победы", value: totalWins, color: "var(--christmas-green)" },
        { name: "Поражения", value: totalLosses, color: "var(--christmas-red)" },
      ],
    }
  }, [data])

  if (chartData.totalMatches === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Победы и поражения за всё время
          </CardTitle>
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
          Победы и поражения за всё время
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.slices}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={96}
                  dataKey="value"
                  paddingAngle={3}
                  cornerRadius={6}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {chartData.slices.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
                formatter={(value: number, name: string) => [
                  `${value} (${chartData.totalMatches > 0 ? ((value / chartData.totalMatches) * 100).toFixed(1) : 0}%)`,
                  name,
                ]}
              />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-border/50 bg-background/30 p-3">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-semibold text-christmas-gold">{chartData.winRate.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/30 p-3">
              <p className="text-xs text-muted-foreground">Победы</p>
              <p className="text-xl font-semibold text-christmas-green">{chartData.totalWins}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/30 p-3">
              <p className="text-xs text-muted-foreground">Поражения</p>
              <p className="text-xl font-semibold text-christmas-red">{chartData.totalLosses}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/30 p-3">
              <p className="text-xs text-muted-foreground">Событий с известным результатом</p>
              <p className="text-lg font-semibold text-christmas-snow">{chartData.totalMatches}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
