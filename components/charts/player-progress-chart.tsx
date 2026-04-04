"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts"
import { TrendingUp } from "lucide-react"
import type { PlayerProgressPoint } from "@/lib/data-utils"

interface PlayerProgressChartProps {
  data: PlayerProgressPoint[]
  currentKD: number
  currentElo: number
  currentTbf: number
  className?: string
}

export function PlayerProgressChart({ data, currentKD, currentElo, currentTbf, className }: PlayerProgressChartProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-christmas-gold">
          <TrendingUp className="w-4 h-4" />
          Динамика показателей
          <div className="ml-auto flex flex-wrap items-center justify-end gap-3 text-[13px] font-bold normal-case tracking-normal text-christmas-snow">
            <span>K/D: {currentKD.toFixed(2)}</span>
            <span className="text-sky-300">ELO: {currentElo.toFixed(1)}</span>
            <span className="text-christmas-red">ТБФ: {currentTbf.toFixed(1)}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--christmas-gold)]" />
            Общий K/D
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--christmas-green)]" />
            K/D матча
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            ELO
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--christmas-red)]" />
            ТБФ
          </span>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: -10, right: 10, top: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis dataKey="game" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
              <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#7dd3fc"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => value.toFixed(0)}
              />
              <ReferenceLine yAxisId="left" y={1} stroke="var(--muted-foreground)" strokeDasharray="5 5" opacity={0.5} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
                formatter={(value: number, name: string) => [
                  name === "elo" || name === "tbf" ? value.toFixed(1) : value.toFixed(2),
                  name === "cumKD" ? "Общий K/D" : name === "elo" ? "ELO" : name === "tbf" ? "ТБФ" : "K/D матча",
                ]}
                labelFormatter={(label, payload) => {
                  const point = payload?.[0]?.payload as { date?: string } | undefined
                  return `Игра #${label}${point?.date ? ` • ${point.date}` : ""}`
                }}
              />
              <Line yAxisId="left" type="monotone" dataKey="cumKD" stroke="var(--christmas-gold)" strokeWidth={2} dot={false} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="kd"
                stroke="var(--christmas-green)"
                strokeWidth={1.8}
                dot={false}
                opacity={0.75}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="elo"
                stroke="#7dd3fc"
                strokeWidth={1.8}
                dot={false}
                activeDot={{ r: 3, fill: "#7dd3fc" }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tbf"
                stroke="var(--christmas-red)"
                strokeWidth={1.8}
                dot={false}
                activeDot={{ r: 3, fill: "var(--christmas-red)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
