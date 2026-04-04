"use client"

import { useMemo, useRef } from "react"
import { AchievementBadges } from "@/components/achievement-badges"
import { PlayerProgressChart } from "@/components/charts/player-progress-chart"
import { PlayerMatchHistory } from "@/components/player-match-history"
import { PlayerRadarChart } from "@/components/player-radar-chart"
import { RoleIcon } from "@/components/role-icon"
import { SpecializationIcon, SPECIALIZATION_ORDER, getSpecializationLabel, normalizeSpecializationKey } from "@/components/specialization-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlayerAvatar } from "@/components/player-avatar"
import type {
  GameEvent,
  Player,
  PlayerEventStat,
  PlayerGameHistoryEntry,
  PlayerProgressPoint,
  RoleLeaderboardMetric,
} from "@/lib/data-utils"
import { isRoleWithoutKit } from "@/lib/data-utils"
import { getMetricIcon } from "@/lib/app-icons"
import { getSquadLabels, getSquadToneClasses } from "@/lib/squad-utils"
import { cn } from "@/lib/utils"
import { CalendarDays, Download, Medal, Sparkles, Timer } from "lucide-react"
import { toPng } from "html-to-image"

interface PlayerCardProps {
  player: Player
  rank?: number
  footerLabel?: string
  achievements?: string[]
  playerStats?: PlayerEventStat[]
  matchHistory?: PlayerGameHistoryEntry[]
  progress?: PlayerProgressPoint[]
  roleMetric?: RoleLeaderboardMetric
  roleMetricMaxima?: Record<string, number>
  roleDomain?: string[]
  squadDomain?: string[]
  events?: GameEvent[]
  skillMaxima: {
    kd: number
    kda: number
    avgRevives: number
    avgVehicle: number
  }
  activityAverage: number
  activityMax: number
  onOpenGame?: (eventId: string, playerId: string) => void
  layout?: "compact" | "expanded"
}

const DEFAULT_FOOTER_LABEL = "MDC CLAN • АКТУАЛЬНАЯ СТАТИСТИКА"

function formatJoinedAt(value: string): string {
  if (!value) return "Не указана"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatTenure(value: string, joinedAt: string): string {
  if (value?.trim()) {
    return value
  }

  if (!joinedAt) {
    return "Не указан"
  }

  const joinedDate = new Date(joinedAt)
  if (Number.isNaN(joinedDate.getTime())) {
    return "Не указан"
  }

  const now = new Date()
  let years = now.getFullYear() - joinedDate.getFullYear()
  let months = now.getMonth() - joinedDate.getMonth()

  if (now.getDate() < joinedDate.getDate()) {
    months -= 1
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  if (years <= 0 && months <= 0) {
    return "Меньше месяца"
  }

  const parts: string[] = []
  if (years > 0) parts.push(`${years} г.`)
  if (months > 0) parts.push(`${months} мес.`)

  return parts.join(" ")
}

function countTopEntries(values: string[], limit: number): Array<{ label: string; count: number }> {
  const counter = new Map<string, number>()

  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      counter.set(value, (counter.get(value) ?? 0) + 1)
    })

  return Array.from(counter.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count
      }
      return left.label.localeCompare(right.label, "ru")
    })
    .slice(0, limit)
}

export function PlayerCard({
  player,
  rank,
  footerLabel = DEFAULT_FOOTER_LABEL,
  achievements = [],
  playerStats = [],
  matchHistory = [],
  progress = [],
  roleMetric = "kd",
  roleMetricMaxima = {},
  roleDomain = [],
  squadDomain = [],
  events = [],
  skillMaxima,
  activityAverage,
  activityMax,
  onOpenGame,
  layout = "compact",
}: PlayerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const isExpanded = layout === "expanded"

  const squadSummary = useMemo(() => {
    const bySquad = new Map<string, number>()
    const explicitSquadLabels = new Set(getSquadLabels(player.teams ?? [], squadDomain))

    if (explicitSquadLabels.size === 0) {
      return []
    }

    matchHistory.forEach((entry) => {
      const label = entry.squad_label?.trim() || "Без отряда"
      if (!explicitSquadLabels.has(label)) {
        return
      }
      bySquad.set(label, (bySquad.get(label) ?? 0) + 1)
    })

    return Array.from(bySquad.entries())
      .map(([label, games]) => ({ label, games }))
      .filter((entry) => entry.games > 0)
      .sort((left, right) => right.games - left.games)
      .slice(0, 3)
  }, [matchHistory, player.teams, squadDomain])

  const topRoles = useMemo(() => {
    const perMatchRoles = matchHistory.flatMap((entry) =>
      Array.from(new Set(entry.roles.filter((roleName) => roleName?.trim() && !isRoleWithoutKit(roleName)))),
    )
    return countTopEntries(perMatchRoles, 3)
  }, [matchHistory])

  const specializationSummary = useMemo(() => {
    const counts = new Map<string, number>()

    matchHistory.forEach((entry) => {
      Array.from(new Set(entry.specializations))
        .map((specialization) => normalizeSpecializationKey(specialization))
        .filter(Boolean)
        .forEach((key) => {
          const label = getSpecializationLabel(key)
          counts.set(label, (counts.get(label) ?? 0) + 1)
        })
    })

    return SPECIALIZATION_ORDER.map((label) => ({
      label,
      count: counts.get(label) ?? 0,
    })).filter((entry) => entry.count > 0)
  }, [matchHistory])

  const topFactions = useMemo(
    () => countTopEntries(matchHistory.map((entry) => entry.faction_1 || "").filter(Boolean), 3),
    [matchHistory],
  )

  const topMaps = useMemo(
    () => countTopEntries(matchHistory.map((entry) => entry.map || "").filter(Boolean), 3),
    [matchHistory],
  )

  const averagePerGame = useMemo(() => {
    if (player.totals.events <= 0) {
      return { heals: 0, revives: 0, vehicle: 0 }
    }

    return {
      heals: player.totals.heals / player.totals.events,
      revives: player.totals.revives / player.totals.events,
      vehicle: player.totals.vehicle / player.totals.events,
    }
  }, [player])

  const mvpCount = useMemo(
    () => matchHistory.filter((entry) => entry.rank === 1).length,
    [matchHistory],
  )

  const handleExport = async () => {
    if (!cardRef.current) return

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#1a1a2e",
        cacheBust: true,
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
      label: "Всего событий",
      value: player.totals.events.toLocaleString("ru-RU"),
      icon: getMetricIcon("events"),
      color: "text-christmas-gold",
    },
    {
      label: "Хила",
      value: player.totals.heals.toLocaleString("ru-RU"),
      icon: getMetricIcon("heals"),
      color: "text-rose-300",
    },
    {
      label: "Поднятий",
      value: player.totals.revives.toLocaleString("ru-RU"),
      icon: getMetricIcon("revives"),
      color: "text-sky-300",
    },
    {
      label: "Ноков",
      value: player.totals.downs.toLocaleString("ru-RU"),
      icon: getMetricIcon("downs"),
      color: "text-orange-400",
    },
    {
      label: "Убийств",
      value: player.totals.kills.toLocaleString("ru-RU"),
      icon: getMetricIcon("kills"),
      color: "text-christmas-green",
    },
    {
      label: "Смертей",
      value: player.totals.deaths.toLocaleString("ru-RU"),
      icon: getMetricIcon("deaths"),
      color: "text-christmas-red",
    },
    {
      label: "Техника",
      value: player.totals.vehicle.toLocaleString("ru-RU"),
      icon: getMetricIcon("vehicle"),
      color: "text-blue-400",
    },
    {
      label: "K/D",
      value: player.totals.kd.toFixed(2),
      icon: getMetricIcon("kd"),
      color: "text-christmas-gold",
    },
    {
      label: "KDA",
      value: player.totals.kda.toFixed(2),
      icon: getMetricIcon("kda"),
      color: "text-purple-400",
    },
  ] as const

  const ratingTiles = [
    {
      label: "ОР",
      value: player.totals.rating.toFixed(1),
      icon: getMetricIcon("rating"),
      accentClass: "border-christmas-gold/30 bg-christmas-gold/10 text-christmas-gold",
    },
    {
      label: "ELO",
      value: player.totals.elo.toFixed(1),
      icon: getMetricIcon("elo"),
      accentClass: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    },
    {
      label: "ТБФ",
      value: player.totals.tbf.toFixed(1),
      icon: getMetricIcon("tbf"),
      accentClass: "border-christmas-red/30 bg-christmas-red/10 text-christmas-red",
    },
    {
      label: "MVP",
      value: mvpCount.toLocaleString("ru-RU"),
      icon: Medal,
      accentClass: "border-christmas-green/30 bg-christmas-green/10 text-christmas-green",
    },
  ] as const

  const averageTiles = [
    {
      label: "Хил / игра",
      value: averagePerGame.heals.toFixed(1),
      icon: getMetricIcon("heals"),
      color: "text-rose-300",
    },
    {
      label: "Поднятия / игра",
      value: averagePerGame.revives.toFixed(2),
      icon: getMetricIcon("avgRevives"),
      color: "text-sky-300",
    },
    {
      label: "Техника / игра",
      value: averagePerGame.vehicle.toFixed(2),
      icon: getMetricIcon("avgVehicle"),
      color: "text-blue-400",
    },
  ] as const

  return (
    <div className="relative group w-full">
      <Card
        ref={cardRef}
        id={`player-card-${player.player_id}`}
        className="w-full overflow-hidden border-christmas-gold/20"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-christmas-red/10 via-transparent to-christmas-green/10" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-christmas-red via-christmas-gold to-christmas-green" />

        <CardContent className={cn("relative", isExpanded ? "space-y-5 p-5 lg:p-6" : "space-y-4 p-4")}>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] xl:items-start">
            <div className="flex min-w-0 items-center gap-4">
              <PlayerAvatar
                steamId={player.steam_id}
                nickname={player.nickname}
                size="lg"
                className={isExpanded ? "!h-20 !w-20" : ""}
              />
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {typeof rank === "number" && (
                    <Badge variant="outline" className="border-christmas-gold/35 text-christmas-gold">
                      #{rank}
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-border/60 text-muted-foreground">
                    {player.totals.wins.toLocaleString("ru-RU")}W / {player.totals.losses.toLocaleString("ru-RU")}L
                  </Badge>
                </div>

                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 break-words">
                  {player.tag && (
                    <span
                      className={cn(
                        "font-bold leading-tight text-christmas-gold",
                        isExpanded ? "text-2xl lg:text-3xl" : "text-xl",
                      )}
                    >
                      {player.tag}
                    </span>
                  )}
                  <h3
                    className={cn(
                      "break-words font-bold leading-tight text-christmas-snow",
                      isExpanded ? "text-2xl lg:text-3xl" : "text-xl",
                    )}
                  >
                    {player.nickname}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    В клане с {formatJoinedAt(player.joined_at)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5" />
                    Стаж: {formatTenure(player.tenure, player.joined_at)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ratingTiles.map((tile) => {
                const Icon = tile.icon
                return (
                  <div key={tile.label} className={cn("rounded-xl border px-3 py-3", tile.accentClass)}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.16em]">{tile.label}</p>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-1 text-xl font-bold text-christmas-snow">{tile.value}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-9">
            {summaryTiles.map((tile) => {
              const Icon = tile.icon
              return (
                <div
                  key={tile.label}
                  className="flex min-h-[104px] flex-col items-center justify-center rounded-xl border border-border/50 bg-background/45 px-3 py-3 text-center"
                >
                  <div className={cn("mb-2 flex justify-center opacity-80", tile.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold leading-none text-christmas-snow">{tile.value}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{tile.label}</p>
                </div>
              )
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {averageTiles.map((tile) => {
              const Icon = tile.icon
              return (
                <div key={tile.label} className="rounded-xl border border-border/50 bg-background/35 px-4 py-3">
                  <div className={cn("mb-2 flex items-center gap-2", tile.color)}>
                    <Icon className="h-4 w-4" />
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{tile.label}</p>
                  </div>
                  <p className="text-xl font-bold text-christmas-snow">{tile.value}</p>
                </div>
              )
            })}
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <div className="space-y-3">
              {achievements.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-background/30 px-4 py-3">
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Достижения</p>
                  <AchievementBadges
                    achievements={achievements}
                    variant="outline"
                    badgeClassName="border-christmas-gold/30 text-[10px] text-christmas-snow"
                    containerClassName="gap-1.5"
                    showIcons
                  />
                </div>
              )}

              {topRoles.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-background/30 px-4 py-3">
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Популярные роли</p>
                  <div className="space-y-2">
                    {topRoles.map((entry) => (
                      <div key={entry.label} className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-sm text-christmas-snow">
                          <RoleIcon role={entry.label} className="h-4 w-4" />
                          {entry.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{entry.count} игр</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {specializationSummary.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-background/30 px-4 py-3">
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Специализации</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {specializationSummary.map((entry) => (
                      <div key={entry.label} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/30 px-3 py-2">
                        <span className="inline-flex items-center gap-2 text-sm text-christmas-snow">
                          <SpecializationIcon specialization={entry.label} className="h-4 w-4" />
                          {entry.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{entry.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {(topFactions.length > 0 || topMaps.length > 0) && (
                <div className="rounded-xl border border-border/50 bg-background/30 px-4 py-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Фракции</p>
                      <div className="flex flex-wrap gap-1.5">
                        {topFactions.length > 0 ? (
                          topFactions.map((entry) => (
                            <Badge key={entry.label} variant="outline" className="border-border/60 text-christmas-snow">
                              {entry.label} • {entry.count}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Нет данных</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Карты</p>
                      <div className="flex flex-wrap gap-1.5">
                        {topMaps.length > 0 ? (
                          topMaps.map((entry) => (
                            <Badge key={entry.label} variant="outline" className="border-border/60 text-christmas-snow">
                              {entry.label} • {entry.count}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Нет данных</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {squadSummary.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-background/30 px-4 py-3">
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Популярный цвет отряда</p>
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
          </div>

          <div className="grid gap-3 2xl:grid-cols-2">
            <PlayerRadarChart
              player={player}
              playerStats={playerStats}
              events={events}
              roleDomain={roleDomain}
              roleMetric={roleMetric}
              roleMetricMaxima={roleMetricMaxima}
              skillMaxima={skillMaxima}
              activityAverage={activityAverage}
              activityMax={activityMax}
              title="Роли"
              type="roles"
              layout={isExpanded ? "expanded" : "compact"}
            />
            <PlayerRadarChart
              player={player}
              playerStats={playerStats}
              events={events}
              roleDomain={roleDomain}
              roleMetric={roleMetric}
              roleMetricMaxima={roleMetricMaxima}
              skillMaxima={skillMaxima}
              activityAverage={activityAverage}
              activityMax={activityMax}
              title="Навыки"
              type="skills"
              layout={isExpanded ? "expanded" : "compact"}
            />
          </div>

          <PlayerProgressChart
            data={progress}
            currentKD={player.totals.kd}
            currentElo={player.totals.elo}
            currentTbf={player.totals.tbf}
          />

          <PlayerMatchHistory
            playerId={player.player_id}
            games={matchHistory}
            onOpenGame={onOpenGame}
            layout={isExpanded ? "expanded" : "compact"}
          />

          <div className="flex items-center justify-center gap-2 border-t border-christmas-gold/20 pt-3 text-center">
            <Sparkles className="h-3 w-3 text-christmas-red" />
            <p className="text-[10px] text-christmas-gold">{footerLabel}</p>
            <Sparkles className="h-3 w-3 text-christmas-gold" />
          </div>
        </CardContent>
      </Card>

      <Button
        size="sm"
        variant="secondary"
        className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={handleExport}
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  )
}
