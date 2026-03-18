"use client"

import type React from "react"

import { useRef } from "react"
import { AchievementBadges } from "@/components/achievement-badges"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlayerAvatar } from "@/components/player-avatar"
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
}

const METRIC_LABELS: Record<RoleLeaderboardMetric, string> = {
  kd: "K/D",
  kda: "KDA",
  kills: "Убийства",
  downs: "Ноки",
  revives: "Поднятия",
  heals: "Хил",
  vehicle: "Техника",
}

function formatMetricValue(player: RolePlayer, metric: RoleLeaderboardMetric): string {
  if (metric === "kd" || metric === "kda") {
    return player.metricValue.toFixed(2)
  }

  return player.metricValue.toLocaleString("ru-RU")
}

export function RoleLeaderboard({ players, role, metric, icon, playerAchievements }: RoleLeaderboardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  if (players.length === 0) return null

  const getMedal = (index: number) => {
    if (index === 0) return "🥇"
    if (index === 1) return "🥈"
    if (index === 2) return "🥉"
    return `${index + 1}.`
  }

  return (
    <div className="relative group">
      <Card
        ref={cardRef}
        className="border-christmas-gold/30 bg-gradient-to-br from-christmas-red/5 via-card to-christmas-green/5"
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
            {icon}
            Топ {role}
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Минимум 10 игр на роли • сортировка по {METRIC_LABELS[metric]}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {players.map((player, index) => (
            <div
              key={player.player_id}
              className={`rounded-md p-2 transition-colors ${index < 3 ? "bg-secondary/50" : ""}`}
            >
              <div className="flex items-start gap-3">
                <span className="w-6 pt-1 text-center font-mono text-sm text-christmas-snow">{getMedal(index)}</span>
                <PlayerAvatar steamId={player.steam_id} nickname={player.nickname} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate text-christmas-snow">{player.nickname}</p>
                      {(playerAchievements?.[player.player_id]?.length ?? 0) > 0 && (
                        <AchievementBadges
                          achievements={playerAchievements?.[player.player_id] ?? []}
                          variant="secondary"
                          badgeClassName="text-[10px] px-1 py-0"
                          containerClassName="mt-1"
                        />
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">{player.games.toLocaleString("ru-RU")} игр на роли</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-christmas-gold border-christmas-gold/30">
                      {METRIC_LABELS[metric]}: {formatMetricValue(player, metric)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                    <Badge variant="outline" className="border-christmas-gold/20 text-christmas-snow">K/D {player.kd.toFixed(2)}</Badge>
                    <Badge variant="outline" className="border-christmas-gold/20 text-christmas-snow">KDA {player.kda.toFixed(2)}</Badge>
                    <Badge variant="outline" className="border-christmas-gold/20 text-christmas-snow">K {player.kills}</Badge>
                    <Badge variant="outline" className="border-christmas-gold/20 text-christmas-snow">Dn {player.downs}</Badge>
                    <Badge variant="outline" className="border-christmas-gold/20 text-christmas-snow">D {player.deaths}</Badge>
                    <Badge variant="outline" className="border-christmas-gold/20 text-christmas-snow">Подн {player.revives}</Badge>
                    <Badge variant="outline" className="border-christmas-gold/20 text-christmas-snow">Хил {player.heals}</Badge>
                    <Badge variant="outline" className="border-christmas-gold/20 text-christmas-snow">Тех {player.vehicle}</Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
