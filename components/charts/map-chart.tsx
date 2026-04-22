"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts"
import { Map } from "lucide-react"

interface MapChartProps {
  data: { map: string; count: number; wins: number; resolved: number; winRate: number }[]
}

const TOP_MAPS_LIMIT = 12

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const point = payload[0].payload as { map: string; count: number; wins: number; resolved: number; winRate: number }
    return (
      <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
        <p className="text-christmas-snow font-medium">{point.map}</p>
        <p className="text-christmas-snow/80 text-sm">Матчей: {point.count}</p>
        <p className="text-christmas-snow/80 text-sm">Побед: {point.wins}</p>
        <p className="text-christmas-snow/80 text-sm">С результатом: {point.resolved}</p>
        <p className="text-christmas-gold text-xs">
          WR: {point.resolved > 0 ? `${point.winRate.toFixed(1)}%` : "н/д"}
        </p>
      </div>
    )
  }
  return null
}

export function MapChart({ data }: MapChartProps) {
  const chartData = data.slice(0, TOP_MAPS_LIMIT)
  const maxCount = Math.max(...chartData.map((item) => item.count), 1)
  const yAxisWidth = Math.min(160, Math.max(86, Math.max(...chartData.map((item) => item.map.length), 0) * 7))
  const chartHeight = Math.max(260, chartData.length * 24 + 24)

  if (chartData.length === 0) {
    return (
      <Card className="flex h-full min-h-[390px] flex-col border-christmas-gold/20 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
            <Map className="w-4 h-4" />
            Популярные карты
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <p className="text-sm text-muted-foreground">Нет данных по картам</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex h-full min-h-[390px] flex-col border-christmas-gold/20 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
          <Map className="w-4 h-4" />
          Популярные карты
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 28, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} horizontal={false} />
              <XAxis
                type="number"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                tick={{ fill: "var(--christmas-snow)" }}
                allowDecimals={false}
                domain={[0, maxCount]}
              />
              <YAxis
                type="category"
                dataKey="map"
                stroke="var(--muted-foreground)"
                fontSize={10}
                width={yAxisWidth}
                tickLine={false}
                tick={{ fill: "var(--christmas-snow)" }}
                interval={0}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
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
