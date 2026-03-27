"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts"
import { TrendingUp } from "lucide-react"
import { useMemo } from "react"

interface WinrateProgressChartProps {
  data: { date: string; count: number; wins: number; cumWinRate: number }[]
}

export function WinrateProgressChart({ data }: WinrateProgressChartProps) {
  const formatDate = (date: unknown) => {
    if (typeof date !== "string" || date.length === 0) {
      return "N/A"
    }

    const d = new Date(date)
    if (Number.isNaN(d.getTime())) {
      return date
    }

    return `${d.getDate()}.${d.getMonth() + 1}`
  }

  const chartData = data.map((d) => ({
    ...d,
    dateLabel: formatDate(d.date),
  }))

  const averageWinRate = useMemo(() => {
    if (data.length === 0) return 0
    const totalWins = data.reduce((sum, d) => sum + d.wins, 0)
    const totalGames = data.reduce((sum, d) => sum + d.count, 0)
    return totalGames > 0 ? (totalWins / totalGames) * 100 : 0
  }, [data])

  if (chartData.length === 0) {
    return (
      <Card className="flex h-full min-h-[420px] flex-col border-christmas-gold/20 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Средний Win Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <p className="text-sm text-muted-foreground">Нет данных по результатам для расчёта Win Rate</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex h-full min-h-[420px] flex-col border-christmas-gold/20 bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Средний Win Rate
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="h-[300px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: -10, right: 10, top: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis
                dataKey="dateLabel"
                stroke="var(--muted-foreground)"
                fontSize={9}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <ReferenceLine y={50} stroke="var(--muted-foreground)" strokeDasharray="5 5" opacity={0.5} />
              <ReferenceLine y={averageWinRate} stroke="var(--christmas-gold)" strokeDasharray="3 3" opacity={0.7} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, "Win Rate"]}
              />
              <Line
                type="monotone"
                dataKey="cumWinRate"
                stroke="var(--christmas-gold)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--christmas-gold)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
