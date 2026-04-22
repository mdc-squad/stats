"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { AchievementBadges } from "@/components/achievement-badges"
import { PlayerAvatar } from "@/components/player-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown } from "lucide-react"
import { type Player } from "@/lib/data-utils"
import { cn } from "@/lib/utils"

interface LeaderboardProps {
  title: string
  players: Player[]
  stat: keyof Player["totals"]
  formatValue?: (value: number) => string
  className?: string
  titleClassName?: string
  icon?: React.ReactNode
  variant?: "default" | "christmas"
  playerAchievements?: Record<string, string[]>
  collapsedCount?: number
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

const DEFAULT_COLLAPSED_COUNT = 10
const TOP_CARD_CLASS =
  "flex h-full flex-col overflow-hidden border-christmas-gold/30 bg-gradient-to-br from-christmas-red/5 via-card to-christmas-green/5"
const FULL_TOP_LIST_CLASS =
  "scrollbar-gold max-h-[820px] overflow-y-auto rounded-md border border-christmas-gold/25 bg-transparent p-2"

export function Leaderboard({
  title,
  players,
  stat,
  formatValue,
  className,
  titleClassName,
  icon,
  variant = "default",
  playerAchievements,
  collapsedCount = DEFAULT_COLLAPSED_COUNT,
  isCollapsed = false,
  onToggleCollapse,
}: LeaderboardProps) {
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (isCollapsed) {
      setShowAll(false)
    }
  }, [isCollapsed])

  const getMedal = (index: number) => {
    if (index === 0) return "🥇"
    if (index === 1) return "🥈"
    if (index === 2) return "🥉"
    return `${index + 1}.`
  }

  if (players.length === 0) {
    return null
  }

  const canExpand = players.length > collapsedCount
  const visiblePlayers = showAll ? players : players.slice(0, collapsedCount)
  const topPlayer = players[0]
  const topValue = topPlayer?.totals[stat]
  const topSummary =
    topPlayer && typeof topValue === "number" && Number.isFinite(topValue)
      ? `${topPlayer.tag ? `${topPlayer.tag} ` : ""}${topPlayer.nickname} - ${formatValue ? formatValue(topValue) : topValue}`
      : null
  const topAchievements = topPlayer ? playerAchievements?.[topPlayer.player_id] ?? [] : []

  return (
    <div className="relative">
      <Card
        className={cn(
          TOP_CARD_CLASS,
          variant === "christmas" && "from-christmas-red/5 via-card to-christmas-green/5",
          className,
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-christmas-gold">
              {icon}
              <span className={cn("truncate", titleClassName)}>{title}</span>
            </CardTitle>
            {isCollapsed && topSummary ? (
              <div className="mt-1">
                <p className="truncate text-sm font-medium uppercase tracking-wider text-christmas-snow">
                  {topSummary}
                </p>
                {topAchievements.length > 0 && (
                  <AchievementBadges
                    achievements={topAchievements}
                    display="icons"
                    containerClassName="mt-2"
                  />
                )}
              </div>
            ) : (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {showAll ? `Игроков в топе: ${players.length}` : `Показано: ${visiblePlayers.length} из ${players.length}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canExpand && !isCollapsed && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 border-christmas-gold/35 bg-christmas-gold/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-christmas-gold hover:border-christmas-gold/60 hover:bg-christmas-gold/20 hover:text-christmas-gold"
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
                  const rawValue = player.totals[stat]
                  const value = typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : 0
                  const achievements = playerAchievements?.[player.player_id] ?? []
                  const detailLine = stat === "events" ? `WR: ${(player.totals.win_rate * 100).toFixed(0)}%` : null
                  const gamesLine = `${player.totals.events.toLocaleString("ru-RU")} игр`

                  return (
                    <div key={player.player_id} className={cn("rounded-md px-2 py-2 transition-colors", index < 3 && "bg-secondary/50")}>
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
                                {detailLine && <p className="text-xs text-muted-foreground">{detailLine}</p>}
                                {achievements.length > 0 && (
                                  <AchievementBadges
                                    achievements={achievements}
                                    display="icons"
                                    containerClassName="shrink-0"
                                  />
                                )}
                              </div>
                            </div>
                            <div className="flex min-w-[82px] flex-col items-end justify-between gap-2">
                              <Badge
                                variant="outline"
                                className="whitespace-nowrap border-christmas-gold/30 font-mono text-christmas-gold"
                              >
                                {formatValue ? formatValue(value) : value}
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
