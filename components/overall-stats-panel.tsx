"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Crosshair, Skull, Target, Zap, Car, TrendingUp, Cross, Heart, Trophy } from "lucide-react"

interface OverallStatsPanelProps {
  stats: {
    totalHeals: number
    totalKills: number
    totalDeaths: number
    totalRevives: number
    totalDowns: number
    totalVehicle: number
    totalEvents: number
    winRate: number
    averageKD: number
    averageKDA: number
    activePlayers: number
  }
  periodLabel?: string
}

export function OverallStatsPanel({ stats, periodLabel = "за всё время" }: OverallStatsPanelProps) {
  const statItems = [
    {
      label: "Всего событий",
      value: stats.totalEvents,
      icon: <Calendar className="w-4 h-4" />,
      color: "text-christmas-gold",
    },
    {
      label: "Винрейт",
      value: `${stats.winRate.toFixed(0)}%`,
      icon: <Trophy className="w-4 h-4" />,
      color: "text-christmas-gold",
    },
    {
      label: "Хила",
      value: stats.totalHeals.toLocaleString(),
      icon: <Cross className="w-4 h-4" />,
      color: "text-rose-300",
    },
    {
      label: "Поднятий",
      value: stats.totalRevives.toLocaleString(),
      icon: <Heart className="w-4 h-4" />,
      color: "text-sky-300",
    },
    {
      label: "Ноков",
      value: stats.totalDowns.toLocaleString(),
      icon: <Zap className="w-4 h-4" />,
      color: "text-orange-400",
    },
    {
      label: "Убийств",
      value: stats.totalKills.toLocaleString(),
      icon: <Crosshair className="w-4 h-4" />,
      color: "text-christmas-green",
    },
    {
      label: "Смертей",
      value: stats.totalDeaths.toLocaleString(),
      icon: <Skull className="w-4 h-4" />,
      color: "text-christmas-red",
    },
    {
      label: "Техника",
      value: stats.totalVehicle.toLocaleString(),
      icon: <Car className="w-4 h-4" />,
      color: "text-blue-400",
    },
    {
      label: "K/D",
      value: stats.averageKD.toFixed(2),
      icon: <Target className="w-4 h-4" />,
      color: "text-christmas-gold",
    },
    {
      label: "KDA",
      value: stats.averageKDA.toFixed(2),
      icon: <TrendingUp className="w-4 h-4" />,
      color: "text-purple-400",
    },
  ]

  return (
    <Card className="border-christmas-gold/30 bg-gradient-to-br from-card via-card to-christmas-green/5">
      <CardHeader className="pb-2.5">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-christmas-snow">
          <TrendingUp className="w-5 h-5 text-christmas-gold" />
          Общая статистика клана
        </CardTitle>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-10">
          {statItems.map((item) => (
            <div key={item.label} className="rounded-lg border border-border/50 bg-background/45 p-2.5 text-center">
              <div className={`${item.color} mb-1.5 flex justify-center opacity-80`}>{item.icon}</div>
              <p className="text-lg font-bold leading-none text-christmas-snow">{item.value}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
