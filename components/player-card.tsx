"use client"

import { useMemo, useRef, useState } from "react"
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
import { getPlayerAverageValue, isRoleWithoutKit } from "@/lib/data-utils"
import { getMetricIcon } from "@/lib/app-icons"
import { getSquadToneClasses } from "@/lib/squad-utils"
import { cn } from "@/lib/utils"
import { Award, CalendarDays, Download, Flag, MapPinned, Medal, Shield, Sparkles, Timer } from "lucide-react"
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
  roleMetricOptions?: Array<{ value: RoleLeaderboardMetric; label: string }>
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
  onRoleMetricChange?: (metric: RoleLeaderboardMetric) => void
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

function countTopEntries(values: string[], limit?: number): Array<{ label: string; count: number }> {
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
    .slice(0, limit ?? Number.POSITIVE_INFINITY)
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
  roleMetricOptions = [],
  roleMetricMaxima = {},
  roleDomain = [],
  events = [],
  skillMaxima,
  activityAverage,
  activityMax,
  onRoleMetricChange,
  onOpenGame,
  layout = "compact",
}: PlayerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const isExpanded = layout === "expanded"

  const resolvedMatchSummary = useMemo(() => {
    const resolvedMatches = matchHistory.filter((entry) => entry.is_win !== null)

    return {
      wins: resolvedMatches.filter((entry) => entry.is_win === true).length,
      losses: resolvedMatches.filter((entry) => entry.is_win === false).length,
      resolvedGames: resolvedMatches.length,
    }
  }, [matchHistory])

  const squadSummary = useMemo(() => {
    const bySquad = new Map<string, number>()

    matchHistory.forEach((entry) => {
      Array.from(new Set(entry.squad_labels.map((label) => label?.trim()).filter(Boolean))).forEach((label) => {
        bySquad.set(label, (bySquad.get(label) ?? 0) + 1)
      })
    })

    return Array.from(bySquad.entries())
      .map(([label, games]) => ({ label, games }))
      .filter((entry) => entry.games > 0)
      .sort((left, right) => {
        if (right.games !== left.games) {
          return right.games - left.games
        }
        return left.label.localeCompare(right.label, "ru")
      })
  }, [matchHistory])

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
      heals: getPlayerAverageValue(player, "heals"),
      revives: getPlayerAverageValue(player, "revives"),
      vehicle: getPlayerAverageValue(player, "vehicle"),
    }
  }, [player])

  const mvpCount = useMemo(
    () => matchHistory.filter((entry) => entry.rank === 1).length,
    [matchHistory],
  )

  const handleExport = async () => {
    if (!cardRef.current || isExporting) return

    setIsExporting(true)
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })

      if (typeof document !== "undefined" && "fonts" in document) {
        await document.fonts.ready
      }

      const images = Array.from(cardRef.current.querySelectorAll("img"))
      await Promise.all(
        images.map(
          (image) =>
            new Promise<void>((resolve) => {
              if (image.complete) {
                resolve()
                return
              }

              const done = () => resolve()
              image.addEventListener("load", done, { once: true })
              image.addEventListener("error", done, { once: true })
            }),
        ),
      )

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })

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
    } finally {
      setIsExporting(false)
    }
  }

  const summaryTiles = [
    {
      label: "Всего событий",
      key: "events",
      value: player.totals.events.toLocaleString("ru-RU"),
      icon: getMetricIcon("events"),
      color: "text-christmas-gold",
    },
    {
      label: "Поднятий",
      key: "revives",
      value: player.totals.revives.toLocaleString("ru-RU"),
      icon: getMetricIcon("revives"),
      color: "text-sky-300",
    },
    {
      label: "Хила",
      key: "heals",
      value: player.totals.heals.toLocaleString("ru-RU"),
      icon: getMetricIcon("heals"),
      color: "text-rose-300",
    },
    {
      label: "Ноков",
      key: "downs",
      value: player.totals.downs.toLocaleString("ru-RU"),
      icon: getMetricIcon("downs"),
      color: "text-orange-400",
    },
    {
      label: "Убийств",
      key: "kills",
      value: player.totals.kills.toLocaleString("ru-RU"),
      icon: getMetricIcon("kills"),
      color: "text-christmas-green",
    },
    {
      label: "Смертей",
      key: "deaths",
      value: player.totals.deaths.toLocaleString("ru-RU"),
      icon: getMetricIcon("deaths"),
      color: "text-christmas-red",
    },
    {
      label: "Техника",
      key: "vehicle",
      value: player.totals.vehicle.toLocaleString("ru-RU"),
      icon: getMetricIcon("vehicle"),
      color: "text-blue-400",
    },
    {
      label: "K/D",
      key: "kd",
      value: player.totals.kd.toFixed(2),
      icon: getMetricIcon("kd"),
      color: "text-christmas-gold",
    },
    {
      label: "KDA",
      key: "kda",
      value: player.totals.kda.toFixed(2),
      icon: getMetricIcon("kda"),
      color: "text-purple-400",
    },
  ] as const

  const ratingTiles = [
    {
      label: "ОР",
      key: "rating",
      value: player.totals.rating.toFixed(1),
      icon: getMetricIcon("rating"),
      accentClass: "border-christmas-gold/30 bg-christmas-gold/10 text-christmas-gold",
    },
    {
      label: "ELO",
      key: "elo",
      value: player.totals.elo.toFixed(1),
      icon: getMetricIcon("elo"),
      accentClass: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    },
    {
      label: "ТБФ",
      key: "tbf",
      value: player.totals.tbf.toFixed(1),
      icon: getMetricIcon("tbf"),
      accentClass: "border-christmas-red/30 bg-christmas-red/10 text-christmas-red",
    },
    {
      label: "MVP",
      key: "mvp",
      value: mvpCount.toLocaleString("ru-RU"),
      icon: Medal,
      accentClass: "border-christmas-green/30 bg-christmas-green/10 text-christmas-green",
    },
  ] as const

  const averageTiles = [
    {
      label: "Поднятия / игра",
      key: "revives",
      value: averagePerGame.revives.toFixed(2),
      icon: getMetricIcon("avgRevives"),
      color: "text-sky-300",
    },
    {
      label: "Хил / игра",
      key: "heals",
      value: averagePerGame.heals.toFixed(1),
      icon: getMetricIcon("heals"),
      color: "text-rose-300",
    },
    {
      label: "Техника / игра",
      key: "vehicle",
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
        data-testid="player-card"
        data-exporting={isExporting ? "true" : "false"}
        className="w-full overflow-hidden border-christmas-gold/20"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-christmas-red/10 via-transparent to-christmas-green/10" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-christmas-red via-christmas-gold to-christmas-green" />

        <CardContent className={cn("relative", isExpanded ? "space-y-5 p-5 lg:p-6" : "space-y-4 p-4")}>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(460px,560px)] xl:items-start">
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
                    {(resolvedMatchSummary.resolvedGames > 0 ? resolvedMatchSummary.wins : player.totals.wins).toLocaleString("ru-RU")}W /{" "}
                    {(resolvedMatchSummary.resolvedGames > 0 ? resolvedMatchSummary.losses : player.totals.losses).toLocaleString("ru-RU")}L
                  </Badge>
                </div>

                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 break-words">
                  {player.tag && (
                    <span
                      data-testid="player-card-tag"
                      className={cn(
                        "font-bold leading-tight text-christmas-snow",
                        isExpanded ? "text-2xl lg:text-3xl" : "text-xl",
                      )}
                    >
                      {player.tag}
                    </span>
                  )}
                  <h3
                    data-testid="player-card-nickname"
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

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ratingTiles.map((tile) => {
                const Icon = tile.icon
                return (
                  <div
                    key={tile.label}
                    className={cn("flex min-h-[104px] flex-col justify-between rounded-xl border px-4 py-3.5", tile.accentClass)}
                    data-testid={`player-card-rating-${tile.key}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.18em]">{tile.label}</p>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-christmas-snow lg:text-[2rem]">{tile.value}</p>
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
                  data-testid={`player-card-summary-${tile.key}`}
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
                <div
                  key={tile.label}
                  data-testid={`player-card-average-${tile.key}`}
                  className="flex h-full flex-col items-center justify-center rounded-xl border border-border/50 bg-background/35 px-4 py-4 text-center"
                >
                  <div className={cn("mb-2 flex items-center justify-center gap-2", tile.color)}>
                    <Icon className="h-4 w-4" />
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{tile.label}</p>
                  </div>
                  <p className="text-xl font-bold text-christmas-snow">{tile.value}</p>
                </div>
              )
            })}
          </div>

          {achievements.length > 0 && (
            <div
              data-testid="player-card-achievements"
              className="rounded-xl border border-christmas-gold/20 bg-gradient-to-br from-christmas-gold/10 via-background/35 to-background/20 px-4 py-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-christmas-gold" />
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Достижения</p>
              </div>
              <AchievementBadges
                achievements={achievements}
                variant="outline"
                itemClassName="w-full"
                badgeClassName="flex min-h-[82px] w-full items-center justify-center gap-2.5 rounded-xl border-christmas-gold/35 bg-background/35 px-4 py-4 text-sm font-medium text-christmas-snow"
                containerClassName="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-4"
                showIcons
              />
            </div>
          )}

          <div className="grid items-stretch gap-3 xl:grid-cols-2">
            {topRoles.length > 0 && (
              <div className="h-full rounded-xl border border-border/50 bg-background/30 px-4 py-4">
                <p className="mb-3 text-center text-[11px] uppercase tracking-wider text-muted-foreground">Популярные роли</p>
                <div className="grid auto-rows-fr gap-2 sm:grid-cols-3">
                  {topRoles.map((entry) => (
                    <div
                      key={entry.label}
                      className="flex h-full min-h-[96px] flex-col items-center justify-center rounded-lg border border-border/40 bg-background/35 px-3 py-3 text-center"
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-christmas-snow">
                        <RoleIcon role={entry.label} className="h-4 w-4" />
                        {entry.label}
                      </span>
                      <span className="mt-2 text-xs text-muted-foreground">{entry.count} игр</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {specializationSummary.length > 0 && (
              <div
                data-testid="player-card-specializations"
                className="h-full rounded-xl border border-border/50 bg-background/30 px-4 py-4"
              >
                <p className="mb-3 text-center text-[11px] uppercase tracking-wider text-muted-foreground">Специализации</p>
                <div className="grid auto-rows-fr gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {specializationSummary.map((entry) => (
                    <div
                      key={entry.label}
                      data-testid="player-card-specialization-tile"
                      className="flex h-full min-h-[96px] flex-col items-center justify-center rounded-lg border border-border/40 bg-background/30 px-3 py-3 text-center"
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-christmas-snow">
                        <SpecializationIcon specialization={entry.label} className="h-4 w-4" />
                        {entry.label}
                      </span>
                      <span className="mt-2 text-xs text-muted-foreground">{entry.count} игр</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid items-stretch gap-3 xl:grid-cols-2">
            {(topFactions.length > 0 || topMaps.length > 0) && (
              <div className="h-full rounded-xl border border-border/50 bg-background/30 px-4 py-4">
                <div className="grid h-full gap-3 md:grid-cols-2">
                  <div className="flex h-full min-h-[152px] flex-col items-center justify-center rounded-lg border border-border/40 bg-background/30 px-3 py-3 text-center">
                    <div className="mb-3 flex items-center gap-2">
                      <Flag className="h-4 w-4 text-christmas-green" />
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Фракции</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {topFactions.length > 0 ? (
                        topFactions.map((entry) => (
                          <Badge
                            key={entry.label}
                            variant="outline"
                            className="border-christmas-green/25 bg-background/35 text-christmas-snow"
                          >
                            {entry.label} • {entry.count}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Нет данных</span>
                      )}
                    </div>
                  </div>
                  <div className="flex h-full min-h-[152px] flex-col items-center justify-center rounded-lg border border-border/40 bg-background/30 px-3 py-3 text-center">
                    <div className="mb-3 flex items-center gap-2">
                      <MapPinned className="h-4 w-4 text-sky-300" />
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Карты</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {topMaps.length > 0 ? (
                        topMaps.map((entry) => (
                          <Badge
                            key={entry.label}
                            variant="outline"
                            className="border-sky-400/25 bg-background/35 text-christmas-snow"
                          >
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
              <div className="h-full rounded-xl border border-border/50 bg-background/30 px-4 py-4">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <Shield className="h-4 w-4 text-christmas-gold" />
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Цвета отрядов</p>
                </div>
                <div className="grid auto-rows-fr gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {squadSummary.map((squad) => {
                    const tone = getSquadToneClasses(squad.label)
                    return (
                      <div
                        key={squad.label}
                        data-testid="player-card-squad-tile"
                        className={cn(
                          "flex h-full min-h-[96px] flex-col items-center justify-center rounded-lg border px-3 py-3 text-center",
                          tone.badge,
                        )}
                      >
                        <span className="text-sm font-medium">{squad.label}</span>
                        <span className="mt-2 text-xs">{squad.games} игр</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 2xl:grid-cols-2">
            <PlayerRadarChart
              player={player}
              playerStats={playerStats}
              events={events}
              roleDomain={roleDomain}
              roleMetric={roleMetric}
              roleMetricOptions={roleMetricOptions}
              roleMetricMaxima={roleMetricMaxima}
              skillMaxima={skillMaxima}
              activityAverage={activityAverage}
              activityMax={activityMax}
              title="Роли"
              type="roles"
              layout={isExpanded ? "expanded" : "compact"}
              onRoleMetricChange={onRoleMetricChange}
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

          {!isExporting && (
            <div data-testid="player-card-history-section">
              <PlayerMatchHistory
                playerId={player.player_id}
                games={matchHistory}
                onOpenGame={onOpenGame}
                layout={isExpanded ? "expanded" : "compact"}
              />
            </div>
          )}

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
        aria-label="Скачать карточку игрока"
        title="Скачать карточку игрока"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  )
}
