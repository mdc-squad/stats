"use client"

import { useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlayerAvatar } from "@/components/player-avatar"
import type { Player } from "@/lib/data-utils"
import { Download, Users, Crosshair, Skull, Trophy, Target, Sparkles } from "lucide-react"
import { toPng } from "html-to-image"

interface GroupStatsCardProps {
  players: Player[]
  title?: string
  footerLabel?: string
}

const DEFAULT_FOOTER_LABEL = "MDC CLAN • АКТУАЛЬНАЯ СТАТИСТИКА"

export function GroupStatsCard({
  players,
  title = "Групповая статистика",
  footerLabel = DEFAULT_FOOTER_LABEL,
}: GroupStatsCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const stats = {
    totalKills: players.reduce((sum, p) => sum + p.totals.kills, 0),
    totalDeaths: players.reduce((sum, p) => sum + p.totals.deaths, 0),
    totalRevives: players.reduce((sum, p) => sum + p.totals.revives, 0),
    totalDowns: players.reduce((sum, p) => sum + p.totals.downs, 0),
    totalEvents: players.reduce((sum, p) => sum + p.totals.events, 0),
    totalWins: players.reduce((sum, p) => sum + p.totals.wins, 0),
    avgKD: players.length > 0 ? players.reduce((sum, p) => sum + p.totals.kd, 0) / players.length : 0,
    avgWinRate: players.length > 0 ? players.reduce((sum, p) => sum + p.totals.win_rate, 0) / players.length : 0,
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
      link.download = `group-stats-${players.length}-players.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Export failed:", err)
    }
  }

  return (
    <div className="relative group">
      <Card ref={cardRef} className="border-christmas-gold/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-christmas-red/5 via-transparent to-christmas-green/5" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-christmas-red via-christmas-gold to-christmas-green" />

        <CardHeader className="pb-3 relative">
          <CardTitle className="flex items-center gap-2 text-christmas-snow">
            <Users className="w-5 h-5 text-christmas-gold" />
            {title}
          </CardTitle>
          <p className="text-sm text-christmas-gold">{players.length} игроков</p>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-christmas-green/10 border border-christmas-green/20">
              <Crosshair className="w-5 h-5 mx-auto mb-2 text-christmas-green" />
              <p className="text-2xl font-bold text-christmas-snow">{stats.totalKills}</p>
              <p className="text-xs text-muted-foreground">Всего убийств</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-christmas-red/10 border border-christmas-red/20">
              <Skull className="w-5 h-5 mx-auto mb-2 text-christmas-red" />
              <p className="text-2xl font-bold text-christmas-snow">{stats.totalDeaths}</p>
              <p className="text-xs text-muted-foreground">Всего смертей</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-christmas-gold/10 border border-christmas-gold/20">
              <Target className="w-5 h-5 mx-auto mb-2 text-christmas-gold" />
              <p className="text-2xl font-bold text-christmas-snow">{stats.avgKD.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Средний K/D</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-christmas-gold/10 border border-christmas-gold/20">
              <Trophy className="w-5 h-5 mx-auto mb-2 text-christmas-gold" />
              <p className="text-2xl font-bold text-christmas-snow">{(stats.avgWinRate * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Средний WR</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-semibold text-christmas-snow">{stats.totalDowns}</p>
              <p className="text-xs text-muted-foreground">Подавлений</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-christmas-snow">{stats.totalRevives}</p>
              <p className="text-xs text-muted-foreground">Оживлений</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-christmas-snow">{stats.totalWins}</p>
              <p className="text-xs text-muted-foreground">Побед</p>
            </div>
          </div>

          {players.length <= 8 && (
            <div className="pt-3 border-t border-christmas-gold/20">
              <p className="text-xs text-christmas-gold mb-2">Состав:</p>
              <div className="flex flex-wrap gap-2">
                {players.map((p) => (
                  <div key={p.player_id} className="flex items-center gap-1">
                    <PlayerAvatar steamId={p.steam_id} nickname={p.nickname} size="sm" />
                    <span className="text-xs text-christmas-snow">{p.nickname}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-christmas-gold/20 text-center flex items-center justify-center gap-2">
            <Sparkles className="w-3 h-3 text-christmas-red" />
            <p className="text-[10px] text-christmas-gold">{footerLabel}</p>
            <Sparkles className="w-3 h-3 text-christmas-gold" />
          </div>
        </CardContent>
      </Card>

      <Button
        size="sm"
        variant="secondary"
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleExport}
      >
        <Download className="w-4 h-4 mr-1" />
        PNG
      </Button>
    </div>
  )
}
