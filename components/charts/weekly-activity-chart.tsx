"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Users } from "lucide-react"

interface WeeklyActivityChartProps {
  data: { week: string; participants: number; uniqueParticipants: number }[]
}

export function WeeklyActivityChart({ data }: WeeklyActivityChartProps) {
  const formatWeek = (week: unknown) => {
    if (typeof week !== "string" || week.length === 0) {
      return "W?"
    }

    const parts = week.split("-W")
    if (parts.length < 2 || !parts[1]) {
      return week
    }

    return `W${parts[1]}`
  }

  const chartData = data.map((d) => ({
    ...d,
    weekLabel: formatWeek(d.week),
  }))

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Участники по неделям
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Нет данных по участникам</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Участники по неделям
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis dataKey="weekLabel" stroke="var(--muted-foreground)" fontSize={9} tickLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
                formatter={(value: number) => [value, "Участников"]}
                labelFormatter={(label) => `Неделя ${label}`}
              />
              <Bar dataKey="participants" fill="var(--christmas-gold)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-center">
          <p className="text-xs text-muted-foreground">Уникальных игроков за неделю</p>
        </div>
      </CardContent>
    </Card>
  )
}
