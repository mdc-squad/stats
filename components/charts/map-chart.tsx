"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts"
import { Map } from "lucide-react"

interface MapChartProps {
  data: { map: string; count: number; wins: number; winRate: number }[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
        <p className="text-christmas-snow font-medium">{label}</p>
        <p className="text-christmas-snow/80 text-sm">Матчей: {payload[0].value}</p>
      </div>
    )
  }
  return null
}

export function MapChart({ data }: MapChartProps) {
  const chartData = data.slice(0, 8)

  return (
    <Card className="border-christmas-gold/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
          <Map className="w-4 h-4" />
          Популярные карты
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} horizontal={false} />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis
                type="category"
                dataKey="map"
                stroke="var(--muted-foreground)"
                fontSize={10}
                width={80}
                tickLine={false}
                tick={{ fill: "var(--christmas-snow)" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index < 3 ? "var(--christmas-green)" : "var(--muted-foreground)"}
                    opacity={1 - index * 0.08}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
