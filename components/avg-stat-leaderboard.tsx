"use client"

import type React from "react"
import { Download } from "lucide-react" // Declare the Download variable here

import { useRef } from "react"
import { AchievementBadges } from "@/components/achievement-badges"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlayerAvatar } from "@/components/player-avatar"
import type { Player } from "@/lib/data-utils"
import { toPng } from "html-to-image"
import { cn } from "@/lib/utils"

interface AvgStatLeaderboardProps {
  title: string
  players: (Player & { avgVehicle?: number; avgRevives?: number })[]
  avgStat: "avgVehicle" | "avgRevives"
  totalStat: "vehicle" | "revives"
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

  return (
    <div className="relative group">
      <Card
        ref={cardRef}
        className={cn(
          "border-christmas-gold/30",
          variant === "christmas" && "bg-gradient-to-br from-christmas-red/10 via-card to-christmas-green/10",
          className,
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {players.map((player, index) => {
            const avgValue = player[avgStat] as number
            const totalValue = player.totals[totalStat] as number
            const achievements = playerAchievements?.[player.player_id] ?? []

            return (
              <div
                key={player.player_id}
                className={cn(
                  "flex items-center gap-3 rounded-md p-2 transition-colors",
                  index < 3 && "bg-secondary/50",
                )}
              >
                <span className="w-8 text-center font-mono text-sm text-christmas-snow">{getMedal(index)}</span>
                <PlayerAvatar steamId={player.steam_id} nickname={player.nickname} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-christmas-snow">{player.nickname}</p>
                  {achievements.length > 0 && (
                    <AchievementBadges
                      achievements={achievements}
                      variant="secondary"
                      badgeClassName="text-[10px] px-1 py-0"
                      containerClassName="mt-1"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Всего: {totalValue} | {player.totals.events} событий
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-christmas-gold">{formatValue(avgValue)}</span>
              </div>
            )
          })}
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
