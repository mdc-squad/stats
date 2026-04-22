"use client"

import { getMetricIcon } from "@/lib/app-icons"
import { TrendingUp } from "lucide-react"

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
}

export function OverallStatsPanel({ stats }: OverallStatsPanelProps) {
  const statItems = [
    {
      label: "Всего событий",
      value: stats.totalEvents,
      icon: getMetricIcon("events"),
      color: "text-christmas-gold",
    },
    {
      label: "Поднятий",
      value: stats.totalRevives.toLocaleString(),
      icon: getMetricIcon("revives"),
      color: "text-sky-300",
    },
    {
      label: "Хила",
      value: stats.totalHeals.toLocaleString(),
      icon: getMetricIcon("heals"),
      color: "text-rose-300",
    },
    {
      label: "Ноков",
      value: stats.totalDowns.toLocaleString(),
      icon: getMetricIcon("downs"),
      color: "text-orange-400",
    },
    {
      label: "Убийств",
      value: stats.totalKills.toLocaleString(),
      icon: getMetricIcon("kills"),
      color: "text-christmas-green",
    },
    {
      label: "Смертей",
      value: stats.totalDeaths.toLocaleString(),
      icon: getMetricIcon("deaths"),
      color: "text-christmas-red",
    },
    {
      label: "Техника",
      value: stats.totalVehicle.toLocaleString(),
      icon: getMetricIcon("vehicle"),
      color: "text-blue-400",
    },
    {
      label: "K/D",
      value: stats.averageKD.toFixed(2),
      icon: getMetricIcon("kd"),
      color: "text-christmas-gold",
    },
    {
      label: "KDA",
      value: stats.averageKDA.toFixed(2),
      icon: getMetricIcon("kda"),
      color: "text-purple-400",
    },
  ]

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-christmas-snow">
        <TrendingUp className="h-5 w-5 text-christmas-gold" />
        Общая статистика клана
      </h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-9">
        {statItems.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="flex min-h-[104px] flex-col items-center justify-center rounded-xl border border-christmas-gold/20 bg-card/60 px-2.5 py-3 text-center"
            >
              <div className={`${item.color} mb-2 flex justify-center opacity-80`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold leading-none text-christmas-snow">{item.value}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
