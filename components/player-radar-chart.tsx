"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, PolarRadiusAxis } from "recharts"
import type { GameEvent, Player, PlayerEventStat, PlayerRoleMetricEntry, RoleLeaderboardMetric } from "@/lib/data-utils"
import { getPlayerAverageValue, getPlayerRoleMetricBreakdown } from "@/lib/data-utils"

interface SkillMaxima {
  kd: number
  kda: number
  avgRevives: number
  avgVehicle: number
}

interface PlayerRadarChartProps {
  player: Player
  playerStats: PlayerEventStat[]
  events?: GameEvent[]
  roleDomain?: string[]
  roleMetricMaxima?: Record<string, number>
  roleMetric?: RoleLeaderboardMetric
  roleMetricOptions?: Array<{ value: RoleLeaderboardMetric; label: string }>
  skillMaxima: SkillMaxima
  activityAverage: number
  activityMax: number
  title: string
  type: "roles" | "skills"
  layout?: "compact" | "expanded"
  onRoleMetricChange?: (metric: RoleLeaderboardMetric) => void
}

const ROLE_METRIC_LABELS: Record<RoleLeaderboardMetric, string> = {
  kd: "K/D",
  kda: "KDA",
  kills: "Убийства",
  deaths: "Смерти",
  downs: "Ноки",
  revives: "Поднятия",
  avgRevives: "Поднятия / игра",
  heals: "Хил",
  vehicle: "Техника",
  elo: "ELO",
  tbf: "ТБФ",
  rating: "ОР",
  avgVehicle: "Техника / игра",
}

function scaleToMax(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.min((value / max) * 100, 100)
}

function scaleActivity(value: number, average: number, max: number): number {
  if (max <= 0) return 0

  if (value <= average) {
    return average > 0 ? (value / average) * 50 : 0
  }

  const aboveAverageRange = max - average
  if (aboveAverageRange <= 0) return 50

  return 50 + ((value - average) / aboveAverageRange) * 50
}

function formatMetricValue(value: number, metric: RoleLeaderboardMetric): string {
  if (metric === "kills" || metric === "deaths" || metric === "downs" || metric === "revives" || metric === "heals" || metric === "vehicle") {
    return value.toFixed(0)
  }

  if (metric === "elo" || metric === "tbf" || metric === "rating") {
    return value.toFixed(1)
  }

  return value.toFixed(2)
}

function buildRoleData(
  player: Player,
  playerStats: PlayerEventStat[],
  roleMetric: RoleLeaderboardMetric,
  roleDomain: string[],
  events: GameEvent[],
  roleMetricMaxima: Record<string, number>,
): Array<PlayerRoleMetricEntry & { stat: string; value: number; fullMark: number }> {
  return getPlayerRoleMetricBreakdown(
    player.player_id,
    playerStats,
    roleMetric,
    roleDomain,
    events,
    player.totals.rating,
  )
    .map((entry) => ({
      ...entry,
      stat: entry.role,
      value: scaleToMax(entry.metricValue, roleMetricMaxima[entry.role] || 0),
      fullMark: 100,
    }))
    .slice(0, 6)
}

export function PlayerRadarChart({
  player,
  playerStats,
  events = [],
  roleDomain = [],
  roleMetricMaxima = {},
  roleMetric = "kd",
  roleMetricOptions = [],
  skillMaxima,
  activityAverage,
  activityMax,
  title,
  type,
  layout = "compact",
  onRoleMetricChange,
}: PlayerRadarChartProps) {
  const isExpanded = layout === "expanded"
  const playerAvgRevives = getPlayerAverageValue(player, "revives")
  const playerAvgVehicle = getPlayerAverageValue(player, "vehicle")

  const rolesData = buildRoleData(player, playerStats, roleMetric, roleDomain, events, roleMetricMaxima)

  const skillsData = [
    {
      stat: "KD",
      value: scaleToMax(player.totals.kd, skillMaxima.kd),
      rawValue: player.totals.kd,
      max: skillMaxima.kd,
      fullMark: 100,
    },
    {
      stat: "KDA",
      value: scaleToMax(player.totals.kda, skillMaxima.kda),
      rawValue: player.totals.kda,
      max: skillMaxima.kda,
      fullMark: 100,
    },
    {
      stat: "Поднятия",
      value: scaleToMax(playerAvgRevives, skillMaxima.avgRevives),
      rawValue: playerAvgRevives,
      max: skillMaxima.avgRevives,
      fullMark: 100,
    },
    {
      stat: "Техника",
      value: scaleToMax(playerAvgVehicle, skillMaxima.avgVehicle),
      rawValue: playerAvgVehicle,
      max: skillMaxima.avgVehicle,
      fullMark: 100,
    },
    {
      stat: "Активность",
      value: scaleActivity(player.totals.events, activityAverage, activityMax),
      rawValue: player.totals.events,
      max: activityMax,
      fullMark: 100,
    },
  ]

  const data = type === "roles" ? rolesData : skillsData
  const fillColor = type === "roles" ? "var(--christmas-green)" : "var(--christmas-gold)"
  const strokeColor = type === "roles" ? "var(--christmas-green)" : "var(--christmas-gold)"

  if (type === "roles" && rolesData.length === 0) {
    return (
      <Card className="h-full border-christmas-gold/20" data-testid={`player-radar-${type}`}>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-christmas-gold">{title}</CardTitle>
            {type === "roles" && roleMetricOptions.length > 0 && onRoleMetricChange && (
              <Select value={roleMetric} onValueChange={(value) => onRoleMetricChange(value as RoleLeaderboardMetric)}>
                <SelectTrigger
                  className="h-8 w-[180px] border-christmas-gold/20 bg-background/50 text-xs text-christmas-snow"
                  data-testid="player-role-metric-selector"
                >
                  <SelectValue placeholder="Показатель" />
                </SelectTrigger>
                <SelectContent>
                  {roleMetricOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className={`${isExpanded ? "h-[300px] lg:h-[320px]" : "h-[260px]"} flex items-center justify-center text-sm text-muted-foreground`}>
            Нет ролей с минимум 10 играми
          </div>
        </CardContent>
      </Card>
    )
  }

  if (type === "roles" && rolesData.length <= 2) {
    return (
      <Card className="h-full border-christmas-gold/20" data-testid={`player-radar-${type}`}>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-christmas-gold">
              {title}
              <span className="ml-2 text-[10px] normal-case tracking-normal text-muted-foreground">
                {ROLE_METRIC_LABELS[roleMetric]}
              </span>
            </CardTitle>
            {roleMetricOptions.length > 0 && onRoleMetricChange && (
              <Select value={roleMetric} onValueChange={(value) => onRoleMetricChange(value as RoleLeaderboardMetric)}>
                <SelectTrigger
                  className="h-8 w-[180px] border-christmas-gold/20 bg-background/50 text-xs text-christmas-snow"
                  data-testid="player-role-metric-selector"
                >
                  <SelectValue placeholder="Показатель" />
                </SelectTrigger>
                <SelectContent>
                  {roleMetricOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {rolesData.map((entry) => (
            <div key={entry.role} className="rounded-lg border border-border/50 bg-background/25 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-christmas-snow">{entry.role}</p>
                <p className="text-sm font-semibold text-christmas-gold">{formatMetricValue(entry.metricValue, roleMetric)}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {entry.games} игр • {ROLE_METRIC_LABELS[roleMetric]}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full border-christmas-gold/20" data-testid={`player-radar-${type}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-christmas-gold">
            {title}
            {type === "roles" && (
              <span className="ml-2 text-[10px] normal-case tracking-normal text-muted-foreground">
                {ROLE_METRIC_LABELS[roleMetric]}
              </span>
            )}
          </CardTitle>
          {type === "roles" && roleMetricOptions.length > 0 && onRoleMetricChange && (
            <Select value={roleMetric} onValueChange={(value) => onRoleMetricChange(value as RoleLeaderboardMetric)}>
              <SelectTrigger
                className="h-8 w-[180px] border-christmas-gold/20 bg-background/50 text-xs text-christmas-snow"
                data-testid="player-role-metric-selector"
              >
                <SelectValue placeholder="Показатель" />
              </SelectTrigger>
              <SelectContent>
                {roleMetricOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className={isExpanded ? "h-[300px] lg:h-[320px]" : "h-[260px]"}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="stat" tick={{ fill: "var(--muted-foreground)", fontSize: isExpanded ? 12 : 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
                formatter={(
                  _value: number,
                  _name: string,
                  props: {
                    payload?: {
                      rawValue?: number
                      games?: number
                      max?: number
                    }
                  },
                ) => {
                  const payload = props.payload
                  if (!payload) {
                    return ["", ""]
                  }

                  if (type === "roles") {
                    return [
                      `${ROLE_METRIC_LABELS[roleMetric]}: ${formatMetricValue((payload as { metricValue?: number }).metricValue ?? payload.rawValue ?? 0, roleMetric)} (${payload.games ?? 0} игр)`,
                      "",
                    ]
                  }

                  return [`${(payload.rawValue ?? 0).toFixed(payload.rawValue && payload.rawValue < 10 ? 2 : 0)} из ${(payload.max ?? 0).toFixed(2)}`, ""]
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
