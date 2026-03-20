"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts"
import { TrendingUp } from "lucide-react"

interface PlayerProgressChartProps {
  data: { game: number; date: string; kd: number; elo: number; cumKD: number; kills: number; deaths: number }[]
  nickname: string
}

export function PlayerProgressChart({ data, nickname }: PlayerProgressChartProps) {
  const latestKD = data.length > 0 ? data[data.length - 1].cumKD : 0
  const latestElo = data.length > 0 ? data[data.length - 1].elo : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Прогресс {nickname}
          <span className="ml-auto flex items-center gap-3 text-base font-bold text-christmas-snow">
            <span>K/D: {latestKD.toFixed(2)}</span>
            <span className="text-sky-300">ELO: {latestElo.toFixed(0)}</span>
          </span>
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
            ELO матча
          </span>
        </div>
        <div className="h-[200px]">
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
                  name === "elo" ? value.toFixed(0) : value.toFixed(2),
                  name === "cumKD" ? "Общий K/D" : name === "elo" ? "ELO матча" : "K/D матча",
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
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                opacity={0.6}
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
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
