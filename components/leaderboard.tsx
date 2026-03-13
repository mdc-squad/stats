"use client"

import type React from "react"
import { useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlayerAvatar } from "@/components/player-avatar"
import { type Player, type RelativeThresholds, getPlayerStrengths } from "@/lib/data-utils"
import { cn } from "@/lib/utils"
import { toPng } from "html-to-image"
import { Button } from "@/components/ui/button"

interface LeaderboardProps {
  title: string
  players: Player[]
  stat: keyof Player["totals"]
  formatValue?: (value: number) => string
  className?: string
  icon?: React.ReactNode
  variant?: "default" | "christmas"
  thresholds?: RelativeThresholds
}

export function Leaderboard({
  title,
  players,
  stat,
  formatValue,
  className,
  icon,
  variant = "default",
  thresholds,
}: LeaderboardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const getMedal = (index: number) => {
    if (index === 0) return "🥇"
    if (index === 1) return "🥈"
    if (index === 2) return "🥉"
    return `${index + 1}.`
  }

  if (players.length === 0) {
    return null
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
      link.download = `leaderboard-${stat}-2025.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Export failed:", err)
    }
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
            const value = player.totals[stat] as number
            const strengths =
              index < 3 && player.totals.events >= 10 ? getPlayerStrengths(player, thresholds).slice(0, 2) : []

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
                  {strengths.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {strengths.slice(0, 2).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px] px-1 py-0">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <span className="font-mono text-sm font-bold text-christmas-gold">
                  {formatValue ? formatValue(value) : value}
                </span>
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
        {/* Download icon */}
      </Button>
    </div>
  )
}
