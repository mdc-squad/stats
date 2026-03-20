"use client"

import { useMemo } from "react"
import { PlayerAvatar } from "@/components/player-avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { PastGameSummary } from "@/lib/data-utils"
import { getSquadToneClasses, SQUAD_MEMBERSHIP_MIN_GAMES } from "@/lib/squad-utils"
import { Shield, Target, Trophy, Users, Zap } from "lucide-react"

interface SquadOverviewProps {
  games: PastGameSummary[]
}

function formatRecentDate(value: string): string {
  if (!value) return "?"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return `${String(parsed.getDate()).padStart(2, "0")}.${String(parsed.getMonth() + 1).padStart(2, "0")}`
}

function getMatchResultMeta(isWin: boolean | null): {
  label: string
  shortLabel: string
  textClassName: string
} {
  if (isWin === true) {
    return {
      label: "Победа",
      shortLabel: "В",
      textClassName: "text-christmas-green",
    }
  }

  if (isWin === false) {
    return {
      label: "Поражение",
      shortLabel: "П",
      textClassName: "text-christmas-red",
    }
  }

  return {
    label: "Результат не указан",
    shortLabel: "?",
    textClassName: "text-muted-foreground",
  }
}

export function SquadOverview({ games }: SquadOverviewProps) {
  const squads = useMemo(() => {
    const bySquad = new Map<
      string,
      {
        label: string
        games: number
        wins: number
        kills: number
        deaths: number
        revives: number
        elo: number
        recent: Array<{ eventId: string; startedAt: string; isWin: boolean | null; avgElo: number }>
        players: Map<
          string,
          {
            player_id: string
            nickname: string
            steam_id: string
            games: number
            wins: number
            kills: number
            deaths: number
            revives: number
            elo: number
          }
        >
      }
    >()

    games.forEach((game) => {
      const playersBySquad = new Map<string, typeof game.players>()

      game.players.forEach((player) => {
        const label = player.squad_label?.trim() || player.squad_labels[0]?.trim() || "Без отряда"
        if (label === "Без отряда") {
          return
        }

        if (!playersBySquad.has(label)) {
          playersBySquad.set(label, [])
        }
        playersBySquad.get(label)?.push(player)
      })

      playersBySquad.forEach((playersInSquad, label) => {
        if (!bySquad.has(label)) {
          bySquad.set(label, {
            label,
            games: 0,
            wins: 0,
            kills: 0,
            deaths: 0,
            revives: 0,
            elo: 0,
            recent: [],
            players: new Map(),
          })
        }

        const squad = bySquad.get(label)
        if (!squad) return

        squad.games += 1
        squad.kills += playersInSquad.reduce((sum, player) => sum + player.kills, 0)
        squad.deaths += playersInSquad.reduce((sum, player) => sum + player.deaths, 0)
        squad.revives += playersInSquad.reduce((sum, player) => sum + player.revives, 0)
        squad.elo += playersInSquad.reduce((sum, player) => sum + player.elo, 0)
        if (game.is_win) {
          squad.wins += 1
        }

        squad.recent.push({
          eventId: game.event_id,
          startedAt: game.started_at,
          isWin: game.is_win,
          avgElo: playersInSquad.reduce((sum, player) => sum + player.elo, 0) / playersInSquad.length,
        })

        playersInSquad.forEach((player) => {
          if (!squad.players.has(player.player_id)) {
            squad.players.set(player.player_id, {
              player_id: player.player_id,
              nickname: player.nickname,
              steam_id: player.steam_id,
              games: 0,
              wins: 0,
              kills: 0,
              deaths: 0,
              revives: 0,
              elo: 0,
            })
          }

          const squadPlayer = squad.players.get(player.player_id)
          if (!squadPlayer) return

          squadPlayer.games += 1
          squadPlayer.kills += player.kills
          squadPlayer.deaths += player.deaths
          squadPlayer.revives += player.revives
          squadPlayer.elo += player.elo
          if (game.is_win) {
            squadPlayer.wins += 1
          }
        })
      })
    })

    return Array.from(bySquad.values())
      .map((squad) => ({
        ...squad,
        winRate: squad.games > 0 ? (squad.wins / squad.games) * 100 : 0,
        kd: squad.deaths > 0 ? squad.kills / squad.deaths : squad.kills,
        avgElo: squad.games > 0 ? squad.elo / squad.games : 0,
        recent: [...squad.recent]
          .sort((left, right) => {
            const leftTime = Number.isNaN(new Date(left.startedAt).getTime()) ? 0 : new Date(left.startedAt).getTime()
            const rightTime = Number.isNaN(new Date(right.startedAt).getTime()) ? 0 : new Date(right.startedAt).getTime()
            return rightTime - leftTime
          })
          .slice(0, 8),
        playersRanked: Array.from(squad.players.values())
          .map((player) => ({
            ...player,
            winRate: player.games > 0 ? (player.wins / player.games) * 100 : 0,
            kd: player.deaths > 0 ? player.kills / player.deaths : player.kills,
            avgElo: player.games > 0 ? player.elo / player.games : 0,
          }))
          .filter((player) => player.games > SQUAD_MEMBERSHIP_MIN_GAMES)
          .sort((left, right) => {
            if (right.games !== left.games) return right.games - left.games
            if (right.avgElo !== left.avgElo) return right.avgElo - left.avgElo
            return left.nickname.localeCompare(right.nickname, "ru")
          }),
      }))
      .sort((left, right) => {
        if (right.games !== left.games) return right.games - left.games
        if (right.avgElo !== left.avgElo) return right.avgElo - left.avgElo
        return left.label.localeCompare(right.label, "ru")
      })
  }, [games])

  if (squads.length === 0) {
    return (
      <Card className="border-border/50 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-christmas-snow">
            <Shield className="w-4 h-4 text-christmas-gold" />
            Отряды по цветам
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          В текущем срезе нет матчей с размеченными отрядами по цветам.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-christmas-gold/20 bg-card/60">
        <CardContent className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-base font-semibold text-christmas-snow">Отряды по цветам</p>
            <p className="text-sm text-muted-foreground">
              Общие цифры по отрядам, динамика последних игр и лидеры внутри каждого цветового состава.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Игрок считается закреплённым за цветом, если сыграл в нём более {SQUAD_MEMBERSHIP_MIN_GAMES} игр.
            </p>
          </div>
          <Badge variant="outline" className="border-christmas-gold/30 text-christmas-gold">
            {squads.length} отрядов
          </Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {squads.map((squad, index) => {
          const tone = getSquadToneClasses(squad.label)
          const recentEloMax = Math.max(...squad.recent.map((entry) => entry.avgElo), 1)

          return (
            <Card key={squad.label} className={`border ${tone.panel}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={tone.badge}>
                        #{index + 1} • {squad.label}
                      </Badge>
                      <Badge variant="outline" className="border-christmas-gold/30 text-christmas-gold">
                        {squad.playersRanked.length} игроков
                      </Badge>
                    </div>
                    <CardTitle className="text-base text-christmas-snow">Общий профиль отряда</CardTitle>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-christmas-snow">{squad.avgElo.toFixed(1)}</p>
                    <p className="text-[11px] text-muted-foreground">ср. ELO</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-lg border border-border/50 bg-background/35 p-3">
                    <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Users className="w-3.5 h-3.5 text-christmas-gold" />
                      Игры
                    </p>
                    <p className="mt-2 text-lg font-semibold text-christmas-snow">{squad.games}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/35 p-3">
                    <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Trophy className="w-3.5 h-3.5 text-christmas-green" />
                      WR
                    </p>
                    <p className="mt-2 text-lg font-semibold text-christmas-snow">{squad.winRate.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/35 p-3">
                    <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Target className="w-3.5 h-3.5 text-christmas-red" />
                      K/D
                    </p>
                    <p className="mt-2 text-lg font-semibold text-christmas-snow">{squad.kd.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/35 p-3">
                    <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Zap className="w-3.5 h-3.5 text-cyan-300" />
                      Поднятия
                    </p>
                    <p className="mt-2 text-lg font-semibold text-christmas-snow">{squad.revives}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-christmas-snow">Последние игры отряда</p>
                    <p className="text-[11px] text-muted-foreground">Высота столбца = ср. ELO, цвет = результат матча</p>
                  </div>
                  <div className="grid grid-cols-8 gap-1.5">
                    {squad.recent.map((entry) => {
                      const resultMeta = getMatchResultMeta(entry.isWin)
                      return (
                        <div key={`${squad.label}-${entry.eventId}`} className="space-y-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="block w-full text-left">
                                <div
                                  className="w-full rounded-md"
                                  style={{
                                    height: `${Math.max(18, Math.min(54, (entry.avgElo / recentEloMax) * 54))}px`,
                                    background:
                                      entry.isWin === true
                                        ? "linear-gradient(180deg, rgba(34,197,94,0.95), rgba(34,197,94,0.35))"
                                        : entry.isWin === false
                                        ? "linear-gradient(180deg, rgba(239,68,68,0.95), rgba(239,68,68,0.35))"
                                        : "linear-gradient(180deg, rgba(148,163,184,0.95), rgba(148,163,184,0.35))",
                                  }}
                                />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs border border-border bg-card text-card-foreground">
                              <p className="font-medium text-christmas-snow">{formatRecentDate(entry.startedAt)} • {resultMeta.label}</p>
                              <p className="mt-1 text-muted-foreground">Средний ELO отряда в этом матче: {entry.avgElo.toFixed(1)}</p>
                              <p className="mt-1 text-muted-foreground">
                                Высота столбца показывает относительный ELO среди последних 8 игр этого отряда, цвет показывает исход матча.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          <p className="text-center text-[10px] text-muted-foreground">{formatRecentDate(entry.startedAt)}</p>
                          <p className={`text-center text-[10px] font-medium ${resultMeta.textClassName}`}>{resultMeta.shortLabel}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-christmas-snow">Игроки отряда</p>
                  {squad.playersRanked.length === 0 ? (
                    <div className="rounded-lg border border-border/50 bg-background/35 px-3 py-2 text-[11px] text-muted-foreground">
                      Пока нет игроков, которые сыграли за этот цвет более {SQUAD_MEMBERSHIP_MIN_GAMES} игр.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {squad.playersRanked.slice(0, 6).map((player) => (
                        <div
                          key={`${squad.label}-${player.player_id}`}
                          className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/35 px-3 py-2"
                        >
                          <PlayerAvatar steamId={player.steam_id} nickname={player.nickname} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-christmas-snow">{player.nickname}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {player.games} игр • WR {player.winRate.toFixed(0)}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-christmas-snow">{player.avgElo.toFixed(1)}</p>
                            <p className="text-[11px] text-muted-foreground">K/D {player.kd.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
