"use client"

import { useMemo, useRef } from "react"
import { AchievementBadges } from "@/components/achievement-badges"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlayerAvatar } from "@/components/player-avatar"
import { PlayerMatchHistory } from "@/components/player-match-history"
import { PlayerRadarChart } from "@/components/player-radar-chart"
import {
  type Player,
  type PlayerEventStat,
  type PlayerGameHistoryEntry,
} from "@/lib/data-utils"
import { getSquadToneClasses, SQUAD_MEMBERSHIP_MIN_GAMES } from "@/lib/squad-utils"
import { cn } from "@/lib/utils"
import { Download, Trophy, Skull, Target, Heart, Crosshair, Sparkles, Car, Zap } from "lucide-react"
import { toPng } from "html-to-image"

interface PlayerCardProps {
  player: Player
  rank?: number
  footerLabel?: string
  achievements?: string[]
  playerStats?: PlayerEventStat[]
  maxRoleKD?: Record<string, number>
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
  matchHistory?: PlayerGameHistoryEntry[]
  onOpenGame?: (eventId: string, playerId: string) => void
  layout?: "compact" | "expanded"
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
  achievements = [],
  playerStats = [],
  maxRoleKD = {},
  maxValues = DEFAULT_MAX_VALUES,
  avgValues = DEFAULT_AVG_VALUES,
  matchHistory = [],
  onOpenGame,
  layout = "compact",
}: PlayerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const isExpanded = layout === "expanded"
  const squadSummary = useMemo(() => {
    const bySquad = new Map<string, number>()

    matchHistory.forEach((entry) => {
      const label = entry.squad_label?.trim() || "Без отряда"
      bySquad.set(label, (bySquad.get(label) ?? 0) + 1)
    })

    return Array.from(bySquad.entries())
      .map(([label, games]) => ({ label, games }))
      .filter((entry) => entry.games > SQUAD_MEMBERSHIP_MIN_GAMES)
      .sort((left, right) => right.games - left.games)
      .slice(0, 3)
  }, [matchHistory])

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

  const summaryTiles = [
    {
      label: "Убийств",
      value: player.totals.kills,
      icon: Crosshair,
      accentClass: "bg-christmas-green/10 border-christmas-green/20 text-christmas-green",
    },
    {
      label: "Ноков",
      value: player.totals.downs,
      icon: Zap,
      accentClass: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    },
    {
      label: "Смертей",
      value: player.totals.deaths,
      icon: Skull,
      accentClass: "bg-christmas-red/10 border-christmas-red/20 text-christmas-red",
    },
    {
      label: "Техника",
      value: player.totals.vehicle,
      icon: Car,
      accentClass: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    },
    {
      label: "Побед",
      value: `${(player.totals.win_rate * 100).toFixed(0)}%`,
      icon: Trophy,
      accentClass: "bg-christmas-gold/10 border-christmas-gold/20 text-christmas-gold",
    },
  ] as const

  const expandedMeta = [
    {
      label: "Событий",
      value: `${player.totals.events}`,
      icon: Target,
    },
    {
      label: "Подъёмов",
      value: `${player.totals.revives}`,
      icon: Heart,
    },
    {
      label: "Любимая карта",
      value: player.favorites.map || "Не указана",
      icon: Target,
    },
  ] as const

  return (
    <div className="relative group w-full">
      <Card ref={cardRef} className="w-full overflow-hidden border-christmas-gold/20">
        <div className="absolute inset-0 bg-gradient-to-br from-christmas-red/10 via-transparent to-christmas-green/10" />

        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-christmas-red via-christmas-gold to-christmas-green" />

        <CardContent className={cn("relative", isExpanded ? "p-6 lg:p-7" : "p-5")}>
          <div className={cn("mb-4", isExpanded ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start" : "flex items-start justify-between")}>
            <div className={cn("flex min-w-0 items-center", isExpanded ? "gap-4" : "gap-3")}>
              <PlayerAvatar
                steamId={player.steam_id}
                nickname={player.nickname}
                size="lg"
                className={isExpanded ? "!h-20 !w-20" : ""}
              />
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {typeof rank === "number" && (
                    <Badge variant="outline" className="border-christmas-gold/35 text-christmas-gold">
                      #{rank}
                    </Badge>
                  )}
                </div>
                <h3 className={cn("truncate font-bold text-christmas-snow", isExpanded ? "text-2xl lg:text-3xl" : "text-xl")}>
                  {player.nickname}
                </h3>
                <p className="text-xs text-muted-foreground">{player.tag || "Тег не указан"}</p>
              </div>
            </div>
            <div className={cn("text-right", isExpanded && "flex items-end justify-between gap-4 xl:justify-end")}>
              <div className="text-right">
                <p className={cn("font-bold text-christmas-gold", isExpanded ? "text-4xl" : "text-3xl")}>
                  {player.totals.kd.toFixed(2)}
                </p>
                <p className="text-[10px] uppercase text-muted-foreground">K/D Ratio</p>
                <p className="mt-1 text-sm text-muted-foreground">KDA: {player.totals.kda.toFixed(2)}</p>
              </div>
              {isExpanded && (
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-christmas-gold/15 bg-background/30 px-4 py-3 text-left">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Win Rate</p>
                    <p className="text-lg font-semibold text-christmas-snow">
                      {(player.totals.win_rate * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Событий</p>
                    <p className="text-lg font-semibold text-christmas-snow">{player.totals.events}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isExpanded ? (
            <div className="space-y-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-start">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {expandedMeta.map((item) => {
                      const Icon = item.icon
                      return (
                        <div
                          key={item.label}
                          className="rounded-lg border border-border/50 bg-background/25 px-3 py-2.5"
                        >
                          <p className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                            <Icon className="h-3.5 w-3.5" />
                            {item.label}
                          </p>
                          <p className="mt-1.5 truncate text-sm font-medium text-christmas-snow">{item.value}</p>
                        </div>
                      )
                    })}
                  </div>

                  {achievements.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Достижения</p>
                      <AchievementBadges
                        achievements={achievements}
                        variant="outline"
                        badgeClassName="border-christmas-gold/30 text-[10px] text-christmas-snow"
                        containerClassName="gap-1.5"
                      />
                    </div>
                  )}

                  {squadSummary.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Отряды / цвета</p>
                      <div className="flex flex-wrap gap-1.5">
                        {squadSummary.map((squad) => {
                          const tone = getSquadToneClasses(squad.label)
                          return (
                            <Badge key={squad.label} variant="outline" className={tone.badge}>
                              {squad.label} • {squad.games}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                    {summaryTiles.map((tile) => {
                      const Icon = tile.icon
                      return (
                        <div
                          key={tile.label}
                          className={cn("rounded-md border p-2.5 text-center", tile.accentClass)}
                        >
                          <Icon className="mx-auto mb-1 h-4 w-4" />
                          <p className="text-lg font-bold text-christmas-snow">{tile.value}</p>
                          <p className="text-[9px] text-muted-foreground">{tile.label}</p>
                        </div>
                      )
                    })}
                  </div>

                  <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
                    <PlayerRadarChart
                      player={player}
                      playerStats={playerStats}
                      maxValues={maxValues}
                      avgValues={avgValues}
                      maxRoleKD={maxRoleKD}
                      title="Роли (K/D)"
                      type="roles"
                      layout="expanded"
                    />
                    <PlayerRadarChart
                      player={player}
                      playerStats={playerStats}
                      maxValues={maxValues}
                      avgValues={avgValues}
                      maxRoleKD={maxRoleKD}
                      title="Навыки"
                      type="skills"
                      layout="expanded"
                    />
                  </div>
                </div>
              </div>

              <PlayerMatchHistory
                playerId={player.player_id}
                games={matchHistory}
                onOpenGame={onOpenGame}
                layout="expanded"
              />
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-5 gap-2">
                {summaryTiles.map((tile) => {
                  const Icon = tile.icon
                  return (
                    <div key={tile.label} className={cn("rounded-md border p-2 text-center", tile.accentClass)}>
                      <Icon className="mx-auto mb-1 h-4 w-4" />
                      <p className="text-lg font-bold text-christmas-snow">{tile.value}</p>
                      <p className="text-[9px] text-muted-foreground">{tile.label}</p>
                    </div>
                  )
                })}
              </div>

              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  <Target className="mr-1 inline h-3 w-3" />
                  {player.totals.events} событий
                </span>
                <span>
                  <Heart className="mr-1 inline h-3 w-3" />
                  {player.totals.revives} подъёмов
                </span>
                <span>Карта: {player.favorites.map || "Не указана"}</span>
              </div>

              {achievements.length > 0 && (
                <AchievementBadges
                  achievements={achievements}
                  variant="outline"
                  badgeClassName="border-christmas-gold/30 text-[10px] text-christmas-snow"
                  containerClassName="mb-4"
                />
              )}

              {squadSummary.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Отряды / цвета</p>
                  <div className="flex flex-wrap gap-1.5">
                    {squadSummary.map((squad) => {
                      const tone = getSquadToneClasses(squad.label)
                      return (
                        <Badge key={squad.label} variant="outline" className={tone.badge}>
                          {squad.label} • {squad.games}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="mb-4 grid grid-cols-2 gap-2">
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

              <div className="mb-4">
                <PlayerMatchHistory playerId={player.player_id} games={matchHistory} onOpenGame={onOpenGame} />
              </div>
            </>
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
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleExport}
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  )
}
