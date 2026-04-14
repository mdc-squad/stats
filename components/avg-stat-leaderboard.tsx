"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { AchievementBadges } from "@/components/achievement-badges"
import { PlayerAvatar } from "@/components/player-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown } from "lucide-react"
import type { Player } from "@/lib/data-utils"
import { cn } from "@/lib/utils"

interface AvgStatLeaderboardProps {
  title: string
  players: (Player & { avgVehicle?: number; avgRevives?: number; avgHeals?: number })[]
  avgStat: "avgVehicle" | "avgRevives" | "avgHeals"
  totalStat: "vehicle" | "revives" | "heals"
  formatValue?: (value: number) => string
  className?: string
  icon?: React.ReactNode
  variant?: "default" | "christmas"
  playerAchievements?: Record<string, string[]>
  collapsedCount?: number
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

const DEFAULT_COLLAPSED_COUNT = 10
const TOP_CARD_CLASS =
  "flex flex-col overflow-hidden border-christmas-gold/30 bg-gradient-to-br from-christmas-red/5 via-card to-christmas-green/5"

export function AvgStatLeaderboard({
  title,
  players,
  avgStat,
  totalStat,
  formatValue = (value) => value.toFixed(2),
  className,
  icon,
  variant = "default",
  playerAchievements,
  collapsedCount = DEFAULT_COLLAPSED_COUNT,
  isCollapsed = false,
  onToggleCollapse,
}: AvgStatLeaderboardProps) {
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

  return (
    <div className="relative">
      <Card
        className={cn(
          TOP_CARD_CLASS,
          showAll && "h-[720px]",
          variant === "christmas" && "from-christmas-red/5 via-card to-christmas-green/5",
          className,
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-christmas-gold">
              {icon}
              <span className="truncate">{title}</span>
            </CardTitle>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {showAll ? `Игроков в топе: ${players.length}` : `Показано: ${visiblePlayers.length} из ${players.length}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canExpand && !isCollapsed && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 border-christmas-gold/35 bg-christmas-gold/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-christmas-snow hover:border-christmas-gold/60 hover:bg-christmas-gold/20"
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
          <CardContent className={cn("flex flex-col", showAll && "min-h-0 flex-1")}>
            <div className={cn("pr-2", showAll && "min-h-0 flex-1 overflow-y-auto")}>
              <div className="space-y-1.5">
                {visiblePlayers.map((player, index) => {
                  const avgValue = player[avgStat] as number
                  const totalValue = player.totals[totalStat] as number
                  const achievements = playerAchievements?.[player.player_id] ?? []

                  return (
                    <div
                      key={player.player_id}
                      className={cn("rounded-md px-2 py-1.5 transition-colors", index < 3 && "bg-secondary/50")}
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 pt-1 text-center font-mono text-sm text-christmas-snow">{getMedal(index)}</span>
                        <PlayerAvatar steamId={player.steam_id} nickname={player.nickname} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate text-christmas-snow">{player.nickname}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <p className="text-xs text-muted-foreground">
                                  Всего: {totalValue.toLocaleString("ru-RU")} | {player.totals.events.toLocaleString("ru-RU")} событий
                                </p>
                                {achievements.length > 0 && (
                                  <AchievementBadges
                                    achievements={achievements}
                                    display="icons"
                                    containerClassName="shrink-0"
                                  />
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="border-christmas-gold/30 font-mono text-christmas-gold">
                              {formatValue(avgValue)}
                            </Badge>
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
