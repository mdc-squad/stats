"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Calendar } from "lucide-react"

interface DailyActivityChartProps {
  data: { date: string; count: number; wins: number; cumWinRate: number }[]
}

export function DailyActivityChart({ data }: DailyActivityChartProps) {
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
    losses: d.count - d.wins,
  }))

  // Calculate date range for title
  const dateRange =
    chartData.length > 0 ? `${formatDate(chartData[0].date)} - ${formatDate(chartData[chartData.length - 1].date)}` : ""
  const titleSuffix = dateRange ? ` (${dateRange})` : ""

  if (chartData.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Победы и поражения за всё время
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Нет данных по событиям</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Победы и поражения за всё время{titleSuffix}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10 }}>
              <defs>
                <linearGradient id="colorWinsDaily" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--christmas-green)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--christmas-green)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLossesDaily" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--christmas-red)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--christmas-red)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis
                dataKey="dateLabel"
                stroke="var(--muted-foreground)"
                fontSize={9}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
                labelStyle={{ color: "var(--foreground)" }}
                formatter={(value: number, name: string) => [
                  value,
                  name === "wins" ? "Победы" : name === "losses" ? "Поражения" : name,
                ]}
              />
              <Area
                type="monotone"
                dataKey="wins"
                stroke="var(--christmas-green)"
                fillOpacity={1}
                fill="url(#colorWinsDaily)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="losses"
                stroke="var(--christmas-red)"
                fillOpacity={1}
                fill="url(#colorLossesDaily)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
