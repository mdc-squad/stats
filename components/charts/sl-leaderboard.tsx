"use client"

import { useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlayerAvatar } from "@/components/player-avatar"
import type { SLStats } from "@/lib/data-utils"
import { Download, Shield, Cross } from "lucide-react"
import { toPng } from "html-to-image"

interface SLLeaderboardProps {
  slStats: SLStats[]
  title?: string
}

export function SLLeaderboard({ slStats, title = "Топ Squad Leaders" }: SLLeaderboardProps) {
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
      link.download = "sl-leaderboard-2025.png"
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Export failed:", err)
    }
  }

  return (
    <div className="relative group">
      <Card ref={cardRef}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-christmas-gold flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {title}
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Участие SL = запись в `playersevents`, где роль игрока указана как SL.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {slStats.slice(0, 10).map((sl, index) => (
            <div
              key={sl.player_id}
              className={`flex items-center gap-3 rounded-md p-2 transition-colors ${index < 3 ? "bg-secondary/50" : ""}`}
            >
              <span className="w-8 text-center font-mono text-sm text-christmas-snow">{getMedal(index)}</span>
              <PlayerAvatar steamId={sl.steam_id} nickname={sl.nickname} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate text-christmas-snow">{sl.nickname}</p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>{sl.slGames.toLocaleString("ru-RU")} участий SL</span>
                  <span>WR в роли SL: {(sl.slWinRate * 100).toFixed(0)}%</span>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-christmas-gold border-christmas-gold/30">
                {sl.slKD.toFixed(2)}
              </Badge>
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
