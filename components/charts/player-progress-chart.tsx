"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts"
import { TrendingUp } from "lucide-react"

interface PlayerProgressChartProps {
  data: { game: number; date: string; kd: number; cumKD: number; kills: number; deaths: number }[]
  nickname: string
}

export function PlayerProgressChart({ data, nickname }: PlayerProgressChartProps) {
  const latestKD = data.length > 0 ? data[data.length - 1].cumKD : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Прогресс {nickname}
          <span className="ml-auto text-base font-bold text-christmas-snow">K/D: {latestKD.toFixed(2)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: -10, right: 10, top: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis dataKey="game" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
              <ReferenceLine y={1} stroke="var(--muted-foreground)" strokeDasharray="5 5" opacity={0.5} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
                formatter={(value: number, name: string) => [
                  value.toFixed(2),
                  name === "cumKD" ? "Общий K/D" : "K/D матча",
                ]}
                labelFormatter={(label) => `Игра #${label}`}
              />
              <Line type="monotone" dataKey="cumKD" stroke="var(--christmas-gold)" strokeWidth={2} dot={false} />
              <Line
                type="monotone"
                dataKey="kd"
                stroke="var(--christmas-green)"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                opacity={0.6}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
