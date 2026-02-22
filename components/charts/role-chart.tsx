"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
        <p className="text-christmas-snow font-medium">{payload[0].name}</p>
        <p className="text-christmas-snow/80 text-sm">Игр: {payload[0].value}</p>
      </div>
    )
  }
  return null
}

export function RoleChart({ data }: RoleChartProps) {
  return (
    <Card className="border-christmas-gold/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Распределение ролей
        </CardTitle>
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
              <Tooltip content={<CustomTooltip />} />
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
