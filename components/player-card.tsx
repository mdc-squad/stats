"use client"

import { useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlayerAvatar } from "@/components/player-avatar"
import { PlayerRadarChart } from "@/components/player-radar-chart"
import { type Player, type PlayerEventStat, type RelativeThresholds, getPlayerStrengths } from "@/lib/data-utils"
import { Download, Trophy, Skull, Target, Heart, Crosshair, Sparkles, Car, Zap } from "lucide-react"
import { toPng } from "html-to-image"

interface PlayerCardProps {
  player: Player
  rank?: number
  footerLabel?: string
  playerStats?: PlayerEventStat[]
  maxRoleKD?: Record<string, number>
  thresholds?: RelativeThresholds
  maxValues?: {
    kills: number
    deaths: number
    downs: number
    revives: number
    vehicle: number
    events: number
    kd: number
    kda: number
    win_rate: number
  }
  avgValues?: {
    kills: number
    deaths: number
    downs: number
    revives: number
    vehicle: number
    events: number
    kd: number
    kda: number
    win_rate: number
  }
}

const DEFAULT_MAX_VALUES = {
  kills: 500,
  deaths: 300,
  downs: 300,
  revives: 100,
  vehicle: 20,
  events: 50,
  kd: 3,
  kda: 4,
  win_rate: 1,
}

const DEFAULT_AVG_VALUES = {
  kills: 100,
  deaths: 80,
  downs: 60,
  revives: 20,
  vehicle: 5,
  events: 15,
  kd: 1.2,
  kda: 1.8,
  win_rate: 0.5,
}

const DEFAULT_FOOTER_LABEL = "MDC CLAN • АКТУАЛЬНАЯ СТАТИСТИКА"

export function PlayerCard({
  player,
  rank,
  footerLabel = DEFAULT_FOOTER_LABEL,
  playerStats = [],
  maxRoleKD = {},
  thresholds,
  maxValues = DEFAULT_MAX_VALUES,
  avgValues = DEFAULT_AVG_VALUES,
}: PlayerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const strengths = getPlayerStrengths(player, thresholds)

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
      link.download = `${player.nickname}-stats.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Export failed:", err)
    }
  }

  return (
    <div className="relative group">
      <Card ref={cardRef} className="overflow-hidden border-christmas-gold/20">
        <div className="absolute inset-0 bg-gradient-to-br from-christmas-red/10 via-transparent to-christmas-green/10" />

        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-christmas-red via-christmas-gold to-christmas-green" />

        <CardContent className="p-5 relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <PlayerAvatar steamId={player.steam_id} nickname={player.nickname} size="lg" />
              <div>
                <h3 className="text-xl font-bold text-christmas-snow">{player.nickname}</h3>
                <p className="text-xs text-muted-foreground">{player.tag}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-christmas-gold">{player.totals.kd.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground uppercase">K/D Ratio</p>
              <p className="text-sm text-muted-foreground mt-1">KDA: {player.totals.kda.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-4">
            <div className="text-center p-2 rounded-md bg-christmas-green/10 border border-christmas-green/20">
              <Crosshair className="w-4 h-4 mx-auto mb-1 text-christmas-green" />
              <p className="text-lg font-bold text-christmas-snow">{player.totals.kills}</p>
              <p className="text-[9px] text-muted-foreground">Убийств</p>
            </div>
            <div className="text-center p-2 rounded-md bg-orange-500/10 border border-orange-500/20">
              <Zap className="w-4 h-4 mx-auto mb-1 text-orange-400" />
              <p className="text-lg font-bold text-christmas-snow">{player.totals.downs}</p>
              <p className="text-[9px] text-muted-foreground">Ноков</p>
            </div>
            <div className="text-center p-2 rounded-md bg-christmas-red/10 border border-christmas-red/20">
              <Skull className="w-4 h-4 mx-auto mb-1 text-christmas-red" />
              <p className="text-lg font-bold text-christmas-snow">{player.totals.deaths}</p>
              <p className="text-[9px] text-muted-foreground">Смертей</p>
            </div>
            <div className="text-center p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
              <Car className="w-4 h-4 mx-auto mb-1 text-blue-400" />
              <p className="text-lg font-bold text-christmas-snow">{player.totals.vehicle}</p>
              <p className="text-[9px] text-muted-foreground">Техника</p>
            </div>
            <div className="text-center p-2 rounded-md bg-christmas-gold/10 border border-christmas-gold/20">
              <Trophy className="w-4 h-4 mx-auto mb-1 text-christmas-gold" />
              <p className="text-lg font-bold text-christmas-snow">{(player.totals.win_rate * 100).toFixed(0)}%</p>
              <p className="text-[9px] text-muted-foreground">Побед</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <span>
              <Target className="w-3 h-3 inline mr-1" />
              {player.totals.events} событий
            </span>
            <span>
              <Heart className="w-3 h-3 inline mr-1" />
              {player.totals.revives} подъёмов
            </span>
            <span>Карта: {player.favorites.map}</span>
          </div>

          {strengths.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {strengths.map((s) => (
                <Badge key={s} variant="outline" className="text-[10px] border-christmas-gold/30 text-christmas-snow">
                  {s}
                </Badge>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-4">
            <PlayerRadarChart
              player={player}
              playerStats={playerStats}
              maxValues={maxValues}
              avgValues={avgValues}
              maxRoleKD={maxRoleKD}
              title="Роли (K/D)"
              type="roles"
            />
            <PlayerRadarChart
              player={player}
              playerStats={playerStats}
              maxValues={maxValues}
              avgValues={avgValues}
              maxRoleKD={maxRoleKD}
              title="Навыки"
              type="skills"
            />
          </div>

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
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleExport}
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  )
}
