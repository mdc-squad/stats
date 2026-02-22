"use client"

import { useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlayerAvatar } from "@/components/player-avatar"
import type { PlayerEventStat } from "@/lib/data-utils"
import { Download, Star, Trophy } from "lucide-react"
import { toPng } from "html-to-image"

interface BestMatch extends PlayerEventStat {
  eventType: string
  map: string
  date: string
  isWin: boolean | null
}

interface BestMatchesProps {
  matches: BestMatch[]
  players: { player_id: string; steam_id: string }[]
}

export function BestMatches({ matches, players }: BestMatchesProps) {
  const cardRef = useRef<HTMLDivElement>(null)

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
      link.download = "best-matches-2025.png"
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Export failed:", err)
    }
  }

  const getSteamId = (playerId: string) => {
    const player = players.find((p) => p.player_id === playerId)
    return player?.steam_id || ""
  }

  return (
    <div className="relative group">
      <Card ref={cardRef}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
            <Star className="w-4 h-4" />
            Лучшие матчи по K/D
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {matches.map((match, index) => (
            <div
              key={`${match.event_id}-${match.player_id}`}
              className={`flex items-center gap-3 rounded-md p-2 transition-colors ${index < 3 ? "bg-secondary/50" : ""}`}
            >
              <span className="w-6 text-center font-mono text-sm text-christmas-snow">
                {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
              </span>
              <PlayerAvatar steamId={getSteamId(match.player_id)} nickname={match.nickname} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate text-christmas-snow">{match.nickname}</p>
                  {match.isWin && <Trophy className="w-3 h-3 text-christmas-gold" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {match.map} • {match.role}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="font-mono text-christmas-gold border-christmas-gold/30">
                  {match.kd.toFixed(2)}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {match.kills}K / {match.deaths}D
                </p>
              </div>
            </div>
          ))}
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
