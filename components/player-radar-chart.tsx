"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, PolarRadiusAxis } from "recharts"
import type { Player, PlayerEventStat } from "@/lib/data-utils"

interface PlayerRadarChartProps {
  player: Player
  playerStats: PlayerEventStat[]
  maxValues: {
    kills: number
    deaths: number
    downs: number
    revives: number
    vehicle: number
    events: number
    kd: number
    kda: number
    win_rate: number
  }
  avgValues: {
    kills: number
    deaths: number
    downs: number
    revives: number
    vehicle: number
    events: number
    kd: number
    kda: number
    win_rate: number
  }
  maxRoleKD: Record<string, number>
  title: string
  type: "roles" | "skills"
}

export function PlayerRadarChart({
  player,
  playerStats,
  maxValues,
  avgValues,
  maxRoleKD,
  title,
  type,
}: PlayerRadarChartProps) {
  const getScaledValue = (value: number, avg: number, max: number) => {
    if (max === 0) return 0

    // If value is below average, scale from 0 to 50%
    if (value <= avg) {
      return avg > 0 ? (value / avg) * 50 : 0
    }

    // If value is above average, scale from 50% to 100%
    const aboveAvgRange = max - avg
    if (aboveAvgRange <= 0) return 50

    return 50 + ((value - avg) / aboveAvgRange) * 50
  }

  const playerRoleStats = playerStats
    .filter((s) => s.player_id === player.player_id)
    .reduce(
      (acc, stat) => {
        if (!stat.role) return acc
        if (!acc[stat.role]) {
          acc[stat.role] = { kills: 0, deaths: 0, games: 0 }
        }
        acc[stat.role].kills += stat.kills
        acc[stat.role].deaths += stat.deaths
        acc[stat.role].games++
        return acc
      },
      {} as Record<string, { kills: number; deaths: number; games: number }>,
    )

  const rolesData = Object.entries(playerRoleStats)
    .filter(([, stats]) => stats.games >= 1)
    .map(([role, stats]) => {
      const kd = stats.deaths > 0 ? stats.kills / stats.deaths : stats.kills
      const maxKD = maxRoleKD[role] || 1
      return {
        stat: role,
        value: Math.min((kd / maxKD) * 100, 100),
        rawValue: kd,
        games: stats.games,
        fullMark: 100,
      }
    })
    .sort((a, b) => b.games - a.games)
    .slice(0, 6)

  const skillsData = [
    {
      stat: "Убийства",
      value: getScaledValue(player.totals.kills, avgValues.kills, maxValues.kills),
      rawValue: player.totals.kills,
      avg: avgValues.kills,
      max: maxValues.kills,
      fullMark: 100,
    },
    {
      stat: "Ноки",
      value: getScaledValue(player.totals.downs, avgValues.downs, maxValues.downs),
      rawValue: player.totals.downs,
      avg: avgValues.downs,
      max: maxValues.downs,
      fullMark: 100,
    },
    {
      stat: "Поднятия",
      value: getScaledValue(player.totals.revives, avgValues.revives, maxValues.revives),
      rawValue: player.totals.revives,
      avg: avgValues.revives,
      max: maxValues.revives,
      fullMark: 100,
    },
    {
      stat: "Техника",
      value: getScaledValue(player.totals.vehicle, avgValues.vehicle, maxValues.vehicle),
      rawValue: player.totals.vehicle,
      avg: avgValues.vehicle,
      max: maxValues.vehicle,
      fullMark: 100,
    },
    {
      stat: "Активность",
      value: getScaledValue(player.totals.events, avgValues.events, maxValues.events),
      rawValue: player.totals.events,
      avg: avgValues.events,
      max: maxValues.events,
      fullMark: 100,
    },
  ]

  const data = type === "roles" ? rolesData : skillsData
  const fillColor = type === "roles" ? "var(--christmas-green)" : "var(--christmas-gold)"
  const strokeColor = type === "roles" ? "var(--christmas-green)" : "var(--christmas-gold)"

  if (type === "roles" && rolesData.length === 0) {
    return (
      <Card className="border-christmas-gold/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-christmas-gold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
            Нет данных по ролям
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-christmas-gold/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-christmas-gold">{title}</CardTitle>
        {type === "skills" && <p className="text-[10px] text-muted-foreground">50% = среднее, 100% = топ-1</p>}
      </CardHeader>
      <CardContent>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="stat" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
                formatter={(
                  value: number,
                  name: string,
                  props: { payload?: { rawValue?: number; games?: number; avg?: number; max?: number } },
                ) => {
                  const payload = props.payload
                  if (type === "roles" && payload) {
                    return [`K/D: ${payload.rawValue?.toFixed(2)} (${payload.games} записей)`, ""]
                  }
                  if (payload) {
                    const avgVal = payload.avg?.toFixed(0) || "0"
                    const maxVal = payload.max?.toFixed(0) || "0"
                    return [`${payload.rawValue} (ср: ${avgVal}, макс: ${maxVal})`, ""]
                  }
                  return [`${value.toFixed(0)}%`, ""]
                }}
              />
              <Radar
                name={player.nickname}
                dataKey="value"
                stroke={strokeColor}
                fill={fillColor}
                fillOpacity={0.4}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
