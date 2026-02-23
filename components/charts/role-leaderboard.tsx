"use client"

import type React from "react"

import { useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlayerAvatar } from "@/components/player-avatar"

interface RolePlayer {
  player_id: string
  nickname: string
  steam_id: string
  kills: number
  deaths: number
  downs: number
  games: number
  roleTotalEntries: number
  roleSharePercent: number
  kd: number
  kda: number
}

interface RoleLeaderboardProps {
  players: RolePlayer[]
  role: string
  icon?: React.ReactNode
}

export function RoleLeaderboard({ players, role, icon }: RoleLeaderboardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  if (players.length === 0) return null

  const getMedal = (index: number) => {
    if (index === 0) return "🥇"
    if (index === 1) return "🥈"
    if (index === 2) return "🥉"
    return `${index + 1}.`
  }

  const formatEntries = (count: number) => count.toLocaleString("ru-RU")

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
          <p className="text-[10px] text-muted-foreground">
            K/D по роли {role}. Процент показывает долю записей этой роли в текущей выборке `playersevents`.
          </p>
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
                <p className="text-xs text-muted-foreground">
                  {player.roleSharePercent.toFixed(1)}% всех участий в роли ({formatEntries(player.games)} из{" "}
                  {formatEntries(player.roleTotalEntries)})
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="font-mono text-christmas-gold border-christmas-gold/30">
                  {player.kd.toFixed(2)}
                </Badge>
                <p className="text-[9px] text-muted-foreground mt-1">KDA: {player.kda.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
