"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RoleIcon, formatRoleName } from "@/components/role-icon"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Users } from "lucide-react"

interface RoleChartProps {
  data: { role: string; count: number }[]
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
    const role = String(payload[0].name ?? "")
    return (
      <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
        <p className="flex items-center gap-1.5 font-medium text-christmas-snow">
          <RoleIcon role={role} className="h-4 w-4" />
          {formatRoleName(role) || role}
        </p>
        <p className="text-sm text-christmas-snow/80">{sharePercent.toFixed(1)}% - {value.toLocaleString("ru-RU")} участий</p>
      </div>
    )
  }
  return null
}

export function RoleChart({ data }: RoleChartProps) {
  const totalCount = data.reduce((sum, item) => sum + item.count, 0)

  return (
    <Card className="flex h-full min-h-[390px] flex-col border-christmas-gold/20 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Распределение ролей
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="h-[320px] flex-1">
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
                formatter={(value) => <span style={{ color: "var(--christmas-snow)", fontSize: "11px" }}>{formatRoleName(String(value)) || String(value)}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
