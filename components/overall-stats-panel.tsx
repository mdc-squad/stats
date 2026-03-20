"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Calendar, CircleHelp, Crosshair, Skull, Target, Zap, Car, TrendingUp, Cross, Heart } from "lucide-react"

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-christmas-snow">
              <TrendingUp className="w-5 h-5 text-christmas-gold" />
              Общая статистика клана
            </CardTitle>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/35 text-muted-foreground transition-colors hover:border-christmas-gold/40 hover:text-christmas-gold"
                aria-label="Пояснение по формулам статистики"
              >
                <CircleHelp className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs border border-border bg-card text-card-foreground">
              <p className="font-medium text-christmas-snow">Как считаются метрики</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">KDA = ноки / смерти. Если смертей нет, значение равно числу ноков.</p>
            </TooltipContent>
          </Tooltip>
        </div>
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
