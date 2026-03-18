"use client"

import type React from "react"
import { Download } from "lucide-react"
import { useRef, useState } from "react"
import { AchievementBadges } from "@/components/achievement-badges"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlayerAvatar } from "@/components/player-avatar"
import type { Player } from "@/lib/data-utils"
import { toPng } from "html-to-image"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

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
}

export function AvgStatLeaderboard({
  title,
  players,
  avgStat,
  totalStat,
  formatValue = (v) => v.toFixed(2),
  className,
  icon,
  variant = "default",
  playerAchievements,
}: AvgStatLeaderboardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [showAll, setShowAll] = useState(false)
  const defaultVisiblePlayers = 8

  const getMedal = (index: number) => {
    if (index === 0) return "🥇"
    if (index === 1) return "🥈"
    if (index === 2) return "🥉"
    return `${index + 1}.`
  }

  const handleExport = async () => {
    if (!cardRef.current) return
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#1a1a2e",
        skipFonts: true,
        filter: (node: HTMLElement) => {
          if (node.tagName === "LINK" && node.getAttribute("rel") === "stylesheet") {
            return false
          }
          return true
        },
      })
      const link = document.createElement("a")
      link.download = `leaderboard-${avgStat}-2025.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Export failed:", err)
    }
  }

  if (players.length === 0) {
    return null
  }

  const visiblePlayers = showAll ? players : players.slice(0, defaultVisiblePlayers)
  const canExpand = players.length > defaultVisiblePlayers

  return (
    <div className="relative group">
      <Card
        ref={cardRef}
        className={cn(
          "flex h-[332px] flex-col border-christmas-gold/30",
          variant === "christmas" && "bg-gradient-to-br from-christmas-red/10 via-card to-christmas-green/10",
          className,
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2.5 pr-14">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-christmas-gold">
              {icon}
              <span className="truncate">{title}</span>
            </CardTitle>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {showAll ? `Полный список: ${players.length}` : `Показано: ${visiblePlayers.length} из ${players.length}`}
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
          <ScrollArea className="flex-1 pr-3">
            <div className="space-y-1.5">
              {visiblePlayers.map((player, index) => {
                const avgValue = player[avgStat] as number
                const totalValue = player.totals[totalStat] as number
                const achievements = playerAchievements?.[player.player_id] ?? []

                return (
                  <div
                    key={player.player_id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md p-2 transition-colors",
                      index < 3 && "bg-secondary/50",
                    )}
                  >
                    <span className="w-7 text-center font-mono text-xs text-christmas-snow">{getMedal(index)}</span>
                    <PlayerAvatar steamId={player.steam_id} nickname={player.nickname} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-christmas-snow">{player.nickname}</p>
                      {achievements.length > 0 && (
                        <AchievementBadges
                          achievements={achievements}
                          variant="secondary"
                          badgeClassName="text-[10px] px-1 py-0"
                          containerClassName="mt-1"
                          layout="column"
                        />
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Всего: {totalValue} • {player.totals.events} событий
                      </p>
                    </div>
                    <span className="font-mono text-sm font-bold text-christmas-gold">{formatValue(avgValue)}</span>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Button
        size="sm"
        variant="secondary"
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleExport}
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  )
}
