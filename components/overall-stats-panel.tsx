"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Trophy, Shield, Crosshair, Skull, Target, Zap, Car, TrendingUp, Cross } from "lucide-react"

interface OverallStatsPanelProps {
  stats: {
    totalKills: number
    totalDeaths: number
    totalRevives: number
    totalDowns: number
    totalVehicle: number
    totalEvents: number
    wins: number
    losses: number
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
      icon: <Calendar className="w-5 h-5" />,
      color: "text-christmas-gold",
    },
    {
      label: "Побед",
      value: stats.wins,
      subtitle: `${stats.winRate.toFixed(1)}% WR`,
      icon: <Trophy className="w-5 h-5" />,
      color: "text-christmas-green",
    },
    {
      label: "Поражений",
      value: stats.losses,
      icon: <Shield className="w-5 h-5" />,
      color: "text-christmas-red",
    },
    {
      label: "Хила",
      value: stats.totalRevives.toLocaleString(),
      icon: <Cross className="w-5 h-5" />,
      color: "text-orange-400",
    },
    {
      label: "Ноков",
      value: stats.totalDowns.toLocaleString(),
      icon: <Zap className="w-5 h-5" />,
      color: "text-orange-400",
    },
    {
      label: "Убийств",
      value: stats.totalKills.toLocaleString(),
      icon: <Crosshair className="w-5 h-5" />,
      color: "text-christmas-green",
    },
    {
      label: "Смертей",
      value: stats.totalDeaths.toLocaleString(),
      icon: <Skull className="w-5 h-5" />,
      color: "text-christmas-red",
    },
    {
      label: "Техника",
      value: stats.totalVehicle.toLocaleString(),
      icon: <Car className="w-5 h-5" />,
      color: "text-blue-400",
    },
    {
      label: "Средний K/D",
      value: stats.averageKD.toFixed(2),
      icon: <Target className="w-5 h-5" />,
      color: "text-christmas-gold",
    },
    {
      label: "Средний KDA",
      value: stats.averageKDA.toFixed(2),
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-purple-400",
    },
  ]

  return (
    <Card className="border-christmas-gold/30 bg-gradient-to-br from-card via-card to-christmas-green/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-christmas-snow">
          <TrendingUp className="w-5 h-5 text-christmas-gold" />
          Общая статистика клана
        </CardTitle>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
          {statItems.map((item) => (
            <div key={item.label} className="text-center p-3 rounded-lg bg-background/50 border border-border/50">
              <div className={`${item.color} opacity-80 flex justify-center mb-2`}>{item.icon}</div>
              <p className="text-xl font-bold text-christmas-snow">{item.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
              {item.subtitle && (
                <Badge variant="outline" className="text-[9px] mt-1 px-1 py-0">
                  {item.subtitle}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
