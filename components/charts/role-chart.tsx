"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Users } from "lucide-react"

interface RoleChartProps {
  data: { role: string; count: number }[]
  coverageSummary?: {
    coveredEvents: number
    totalEvents: number
    coveredEventRate: number
  }
}

const COLORS = [
  "var(--christmas-red)",
  "var(--christmas-green)",
  "var(--christmas-gold)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#a4de6c",
  "#d0ed57",
  "#83a6ed",
]

const CustomTooltip = ({ active, payload, totalCount }: any) => {
  if (active && payload && payload.length) {
    const value = Number(payload[0].value ?? 0)
    const sharePercent = totalCount > 0 ? (value / totalCount) * 100 : 0
    return (
      <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
        <p className="text-christmas-snow font-medium">{payload[0].name}</p>
        <p className="text-christmas-snow/80 text-sm">
          Доля среди role-записей: {sharePercent.toFixed(1)}% ({value.toLocaleString("ru-RU")} участий)
        </p>
      </div>
    )
  }
  return null
}

export function RoleChart({ data, coverageSummary }: RoleChartProps) {
  const totalCount = data.reduce((sum, item) => sum + item.count, 0)
  const coverageText = coverageSummary
    ? `Данные ролей есть в ${coverageSummary.coveredEvents}/${coverageSummary.totalEvents} событий (${(coverageSummary.coveredEventRate * 100).toFixed(1)}%)`
    : "Источник: API playersevents"

  return (
    <Card className="border-christmas-gold/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Распределение ролей
        </CardTitle>
        <p className="text-xs text-muted-foreground">{coverageText}</p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="count"
                nameKey="role"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip totalCount={totalCount} />} />
              <Legend
                verticalAlign="bottom"
                height={60}
                wrapperStyle={{ fontSize: "11px" }}
                formatter={(value) => <span style={{ color: "var(--christmas-snow)", fontSize: "11px" }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
