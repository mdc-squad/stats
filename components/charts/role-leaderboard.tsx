"use client"

import type React from "react"
import { useState } from "react"
import { AchievementBadges } from "@/components/achievement-badges"
import { PlayerAvatar } from "@/components/player-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RoleLeaderboardMetric } from "@/lib/data-utils"

interface RolePlayer {
  player_id: string
  nickname: string
  steam_id: string
  kills: number
  deaths: number
  downs: number
  revives: number
  heals: number
  vehicle: number
  games: number
  kd: number
  kda: number
  metricValue: number
}

interface RoleLeaderboardProps {
  players: RolePlayer[]
  role: string
  metric: RoleLeaderboardMetric
  icon?: React.ReactNode
  playerAchievements?: Record<string, string[]>
  collapsedCount?: number
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
  vehicle: "Техника",
  avgVehicle: "Техника / игра",
}

const DEFAULT_COLLAPSED_COUNT = 10
const TOP_CARD_CLASS = "flex h-[720px] flex-col overflow-hidden border-christmas-gold/30 bg-gradient-to-br from-christmas-red/5 via-card to-christmas-green/5"

function formatMetricValue(player: RolePlayer, metric: RoleLeaderboardMetric): string {
  if (metric === "kd" || metric === "kda" || metric === "avgRevives" || metric === "avgVehicle") {
    return player.metricValue.toFixed(2)
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
}: RoleLeaderboardProps) {
  const [showAll, setShowAll] = useState(false)

  if (players.length === 0) return null

  const getMedal = (index: number) => {
    if (index === 0) return "🥇"
    if (index === 1) return "🥈"
    if (index === 2) return "🥉"
    return `${index + 1}.`
  }

  const canExpand = players.length > collapsedCount
  const visiblePlayers = showAll ? players : players.slice(0, collapsedCount)

  return (
    <div className="relative">
      <Card className={TOP_CARD_CLASS}>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-christmas-gold">
              {icon}
              Топ {role}
            </CardTitle>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {showAll
                ? `Игроков на роли: ${players.length} • сортировка по ${METRIC_LABELS[metric]}`
                : `Минимум 10 игр на роли • показано ${visiblePlayers.length} из ${players.length}`}
            </p>
          </div>
          {canExpand && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 px-2 text-[10px] text-muted-foreground hover:bg-background/50 hover:text-christmas-snow"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? "Свернуть" : "Весь топ"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-1.5">
              {visiblePlayers.map((player, index) => (
                <div
                  key={player.player_id}
                  className={`rounded-md px-2 py-1.5 transition-colors ${index < 3 ? "bg-secondary/50" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 pt-1 text-center font-mono text-sm text-christmas-snow">{getMedal(index)}</span>
                    <PlayerAvatar steamId={player.steam_id} nickname={player.nickname} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate text-christmas-snow">{player.nickname}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="text-xs text-muted-foreground">{player.games.toLocaleString("ru-RU")} игр на роли</p>
                            {(playerAchievements?.[player.player_id]?.length ?? 0) > 0 && (
                              <AchievementBadges
                                achievements={playerAchievements?.[player.player_id] ?? []}
                                variant="secondary"
                                badgeClassName="text-[10px] px-1 py-0"
                                collapseToSummary
                                containerClassName="shrink-0"
                              />
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="font-mono text-christmas-gold border-christmas-gold/30">
                          {METRIC_LABELS[metric]}: {formatMetricValue(player, metric)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
