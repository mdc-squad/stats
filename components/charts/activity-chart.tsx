"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Activity } from "lucide-react"

interface ActivityChartProps {
  data: { month: string; count: number; wins: number }[]
}

export function ActivityChart({ data }: ActivityChartProps) {
  const formatMonth = (month: unknown) => {
    if (typeof month !== "string" || month.length === 0) {
      return "N/A"
    }

    const [year, m] = month.split("-")
    if (!year || !m) {
      return month
    }

    const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
    const monthIndex = Number.parseInt(m, 10) - 1
    const monthLabel = months[monthIndex]
    if (!monthLabel) {
      return month
    }

    return `${monthLabel} ${year.slice(2)}`
  }

  const chartData = data.map((d) => ({
    ...d,
    monthLabel: formatMonth(d.month),
    losses: d.count - d.wins,
  }))

  if (chartData.length === 0) {
    return (
      <Card className="flex h-full min-h-[420px] flex-col border-christmas-gold/20 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Активность по месяцам
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <p className="text-sm text-muted-foreground">Нет данных по результатам событий</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex h-full min-h-[420px] flex-col border-christmas-gold/20 bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Активность по месяцам
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="h-[300px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -20, right: 10 }}>
              <defs>
                <linearGradient id="colorWins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--christmas-green)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--christmas-green)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLosses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--christmas-red)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--christmas-red)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis dataKey="monthLabel" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
                labelStyle={{ color: "var(--foreground)" }}
                formatter={(value: number, name: string) => [value, name === "wins" ? "Победы" : "Поражения"]}
              />
              <Area
                type="monotone"
                dataKey="wins"
                stroke="var(--christmas-green)"
                fillOpacity={1}
                fill="url(#colorWins)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="losses"
                stroke="var(--christmas-red)"
                fillOpacity={1}
                fill="url(#colorLosses)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
