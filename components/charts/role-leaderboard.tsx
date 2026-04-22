"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { AchievementBadges } from "@/components/achievement-badges"
import { PlayerAvatar } from "@/components/player-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown } from "lucide-react"
import type { RoleLeaderboardMetric } from "@/lib/data-utils"
import { cn } from "@/lib/utils"

interface RolePlayer {
  player_id: string
  nickname: string
  tag?: string
  steam_id: string
  kills: number
  deaths: number
  downs: number
  revives: number
  heals: number
  avgHeals: number
  vehicle: number
  games: number
  kd: number
  kda: number
  elo: number
  tbf: number
  rating: number
  metricValue: number
}

interface RoleLeaderboardProps {
  players: RolePlayer[]
  role: string
  metric: RoleLeaderboardMetric
  icon?: React.ReactNode
  playerAchievements?: Record<string, string[]>
  collapsedCount?: number
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

const METRIC_LABELS: Record<RoleLeaderboardMetric, string> = {
  kd: "K/D",
  kda: "KDA",
  kills: "Убийства",
  deaths: "Смерти",
  downs: "Ноки",
  revives: "Поднятия",
  avgRevives: "Поднятия / игра",
  heals: "Хил",
  avgHeals: "Хил / игра",
  vehicle: "Техника",
  elo: "ELO",
  tbf: "ТБФ",
  rating: "ОР",
  avgVehicle: "Техника / игра",
}

const DEFAULT_COLLAPSED_COUNT = 10
const TOP_CARD_CLASS =
  "flex h-full flex-col overflow-hidden border-christmas-gold/30 bg-gradient-to-br from-christmas-red/5 via-card to-christmas-green/5"
const FULL_TOP_LIST_CLASS =
  "scrollbar-gold max-h-[820px] overflow-y-auto rounded-md border border-christmas-gold/25 bg-transparent p-2"

function formatMetricValue(player: RolePlayer, metric: RoleLeaderboardMetric): string {
  if (metric === "kd" || metric === "kda" || metric === "avgRevives" || metric === "avgHeals" || metric === "avgVehicle") {
    return player.metricValue.toFixed(2)
  }

  if (metric === "elo" || metric === "tbf" || metric === "rating") {
    return player.metricValue.toFixed(1)
  }

  return player.metricValue.toLocaleString("ru-RU")
}

export function RoleLeaderboard({
  players,
  role,
  metric,
  icon,
  playerAchievements,
  collapsedCount = DEFAULT_COLLAPSED_COUNT,
  isCollapsed = false,
  onToggleCollapse,
}: RoleLeaderboardProps) {
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (isCollapsed) {
      setShowAll(false)
    }
  }, [isCollapsed])

  if (players.length === 0) return null

  const getMedal = (index: number) => {
    if (index === 0) return "🥇"
    if (index === 1) return "🥈"
    if (index === 2) return "🥉"
    return `${index + 1}.`
  }

  const canExpand = players.length > collapsedCount
  const visiblePlayers = showAll ? players : players.slice(0, collapsedCount)
  const topPlayer = players[0]
  const topSummary = topPlayer
    ? `${topPlayer.tag ? `${topPlayer.tag} ` : ""}${topPlayer.nickname} - ${METRIC_LABELS[metric]}: ${formatMetricValue(topPlayer, metric)}`
    : null
  const topAchievements = topPlayer ? playerAchievements?.[topPlayer.player_id] ?? [] : []

  return (
    <div className="relative">
      <Card className={TOP_CARD_CLASS}>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-christmas-gold">
              {icon}
              Топ {role}
            </CardTitle>
            {isCollapsed && topSummary ? (
              <div className="mt-1">
                <p className="truncate text-sm font-medium uppercase tracking-wider text-christmas-snow">
                  {topSummary}
                </p>
                {topAchievements.length > 0 && (
                  <AchievementBadges achievements={topAchievements} display="icons" containerClassName="mt-2" />
                )}
              </div>
            ) : (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {showAll
                  ? `Игроков на роли: ${players.length} • сортировка по ${METRIC_LABELS[metric]}`
                  : `Минимум 10 игр на роли • показано ${visiblePlayers.length} из ${players.length}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canExpand && !isCollapsed && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 border-christmas-gold/35 bg-christmas-gold/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-christmas-gold hover:border-christmas-gold hover:bg-christmas-gold hover:text-black"
                onClick={() => setShowAll((current) => !current)}
              >
                {showAll ? "Свернуть" : "Весь топ"}
              </Button>
            )}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label={isCollapsed ? "Развернуть лидерборд" : "Свернуть лидерборд"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/40 text-muted-foreground transition-colors hover:text-christmas-snow"
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", !isCollapsed && "rotate-180")} />
              </button>
            )}
          </div>
        </CardHeader>
        {isCollapsed ? null : (
          <CardContent className="flex flex-col">
            <div className={cn("pr-2", showAll && FULL_TOP_LIST_CLASS)}>
              <div className="space-y-1.5">
                {visiblePlayers.map((player, index) => {
                  const achievements = playerAchievements?.[player.player_id] ?? []
                  const gamesLine = `${player.games.toLocaleString("ru-RU")} игр на роли`

                  return (
                    <div
                      key={player.player_id}
                      className={cn("rounded-md px-2 py-2 transition-colors", index < 3 && "bg-secondary/50")}
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 pt-1 text-center font-mono text-sm text-christmas-snow">{getMedal(index)}</span>
                        <PlayerAvatar steamId={player.steam_id} nickname={player.nickname} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="grid min-h-[58px] grid-cols-[minmax(0,1fr)_auto] items-stretch gap-x-2 gap-y-1">
                            <div className="flex min-w-0 flex-col justify-between gap-2">
                              <p className="font-medium text-sm truncate text-christmas-snow">
                                {player.tag ? `${player.tag} ` : ""}{player.nickname}
                              </p>
                              <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
                                {achievements.length > 0 && (
                                  <AchievementBadges
                                    achievements={achievements}
                                    display="icons"
                                    containerClassName="shrink-0"
                                  />
                                )}
                              </div>
                            </div>
                            <div className="flex min-w-[108px] flex-col items-end justify-between gap-2">
                              <Badge
                                variant="outline"
                                className="whitespace-nowrap border-christmas-gold/30 font-mono text-christmas-gold"
                              >
                                {METRIC_LABELS[metric]}: {formatMetricValue(player, metric)}
                              </Badge>
                              <p className="text-xs text-muted-foreground">{gamesLine}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
