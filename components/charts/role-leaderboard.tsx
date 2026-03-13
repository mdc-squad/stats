"use client"

import type React from "react"

import { useRef } from "react"
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
}

const METRIC_LABELS: Record<RoleLeaderboardMetric, string> = {
  kd: "K/D",
  kda: "KDA",
  kills: "Убийства",
  downs: "Ноки",
  revives: "Хил",
  vehicle: "Техника",
}

function formatMetricValue(player: RolePlayer, metric: RoleLeaderboardMetric): string {
  if (metric === "kd" || metric === "kda") {
    return player.metricValue.toFixed(2)
  }

  return player.metricValue.toLocaleString("ru-RU")
}

export function RoleLeaderboard({ players, role, metric, icon }: RoleLeaderboardProps) {
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
              className={`flex items-center gap-3 rounded-md p-2 transition-colors ${index < 3 ? "bg-secondary/50" : ""}`}
            >
              <span className="w-6 text-center font-mono text-sm text-christmas-snow">{getMedal(index)}</span>
              <PlayerAvatar steamId={player.steam_id} nickname={player.nickname} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate text-christmas-snow">{player.nickname}</p>
                <p className="text-xs text-muted-foreground">{player.games.toLocaleString("ru-RU")} игр на роли</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="font-mono text-christmas-gold border-christmas-gold/30">
                  {METRIC_LABELS[metric]}: {formatMetricValue(player, metric)}
                </Badge>
                <p className="text-[9px] text-muted-foreground mt-1">
                  K/D: {player.kd.toFixed(2)} • KDA: {player.kda.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
