"use client"

import { useMemo, useRef, useState } from "react"
import { AchievementBadges } from "@/components/achievement-badges"
import { PlayerProgressChart } from "@/components/charts/player-progress-chart"
import { FactionIcon } from "@/components/faction-icon"
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
  rawPlayer?: Player
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

function isMeaningfulSquadLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase()
  return Boolean(normalized) && normalized !== "0" && normalized !== "без отряда"
}

export function PlayerCard({
  player,
  rawPlayer,
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
  const ratingSource = rawPlayer ?? player

  const squadSummary = useMemo(() => {
    const bySquad = new Map<string, number>()

    matchHistory.forEach((entry) => {
      Array.from(new Set(entry.squad_labels.map((label) => label?.trim()).filter(Boolean))).forEach((label) => {
        if (!isMeaningfulSquadLabel(label)) {
          return
        }
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

  const rolesSummary = useMemo(() => {
    const perMatchRoles = matchHistory.flatMap((entry) =>
      Array.from(new Set(entry.roles.filter((roleName) => roleName?.trim() && !isRoleWithoutKit(roleName)))),
    )
    return countTopEntries(perMatchRoles)
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
      label: "Всего игр",
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
      value: ratingSource.totals.rating.toFixed(1),
      icon: getMetricIcon("rating"),
      accentClass: "border-christmas-gold/30 bg-christmas-gold/10 text-christmas-gold",
    },
    {
      label: "ELO",
      key: "elo",
      value: ratingSource.totals.elo.toFixed(1),
      icon: getMetricIcon("elo"),
      accentClass: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    },
    {
      label: "ТБФ",
      key: "tbf",
      value: ratingSource.totals.tbf.toFixed(1),
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

  const achievementGridStyle = achievements.length > 0 ? { gridTemplateColumns: `repeat(${achievements.length}, minmax(0, 1fr))` } : undefined
  const achievementIconClassName =
    achievements.length >= 6 ? "h-8 w-8 sm:h-9 sm:w-9" : achievements.length >= 4 ? "h-9 w-9 sm:h-10 sm:w-10" : "h-10 w-10 sm:h-12 sm:w-12"
  const achievementLabelClassName =
    achievements.length >= 6 ? "text-[10px] sm:text-[11px]" : achievements.length >= 4 ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm"

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
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
            <div className="flex min-w-0 items-center gap-4 xl:min-w-max xl:flex-[0_0_auto]">
              <PlayerAvatar
                steamId={player.steam_id}
                nickname={player.nickname}
                size="lg"
                className={isExpanded ? "!h-20 !w-20" : ""}
              />
              <div className="min-w-0 space-y-2 xl:min-w-max">
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

                <div className="flex min-w-0 items-baseline gap-2 whitespace-nowrap">
                  {player.tag && (
                    <span
                      data-testid="player-card-tag"
                      className={cn(
                        "shrink-0 font-bold leading-tight text-christmas-snow",
                        isExpanded ? "text-2xl lg:text-3xl" : "text-xl",
                      )}
                    >
                      {player.tag}
                    </span>
                  )}
                  <h3
                    data-testid="player-card-nickname"
                    className={cn(
                      "min-w-0 whitespace-nowrap font-bold leading-tight text-christmas-snow",
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

            <div data-testid="player-card-ratings" className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
              {ratingTiles.map((tile) => {
                const Icon = tile.icon
                return (
                  <div
                    key={tile.label}
                    className={cn("flex min-h-[82px] min-w-0 flex-col items-center justify-center rounded-xl border px-2.5 py-2.5 text-center", tile.accentClass)}
                    data-testid={`player-card-rating-${tile.key}`}
                  >
                    <div className="flex min-w-0 items-center justify-center gap-1.5">
                      <p className="text-[9px] uppercase tracking-[0.16em] sm:text-[10px]">{tile.label}</p>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-1.5 text-[clamp(1.1rem,2vw,1.9rem)] font-bold leading-none text-christmas-snow">{tile.value}</p>
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
                  className="flex min-h-[88px] flex-col items-center justify-center rounded-xl border border-border/50 bg-background/45 px-3 py-2.5 text-center"
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
                  className="flex h-full min-h-[88px] flex-col items-center justify-center rounded-xl border border-border/50 bg-background/35 px-4 py-3 text-center"
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
              className="overflow-hidden rounded-xl border border-christmas-gold/20 bg-gradient-to-br from-christmas-gold/10 via-background/35 to-background/20 px-4 py-3.5"
            >
              <div className="mb-2.5 flex items-center gap-2">
                <Award className="h-4 w-4 text-christmas-gold" />
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Достижения</p>
              </div>
              <AchievementBadges
                achievements={achievements}
                display="feature-grid"
                containerStyle={achievementGridStyle}
                itemClassName="w-full"
                badgeClassName="min-h-[88px] px-1"
                containerClassName="w-full items-stretch gap-2"
                iconClassName={achievementIconClassName}
                labelClassName={achievementLabelClassName}
              />
            </div>
          )}

          <div className="grid items-stretch gap-3 xl:grid-cols-2">
            {rolesSummary.length > 0 && (
              <div className="h-full rounded-xl border border-border/50 bg-background/30 px-4 py-3.5">
                <p className="mb-3 text-center text-[11px] uppercase tracking-wider text-muted-foreground">Роли</p>
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
                  {rolesSummary.map((entry) => (
                    <div
                      key={entry.label}
                      className="flex min-w-[92px] flex-col items-center justify-center text-center"
                    >
                      <span className="inline-flex items-center gap-2 text-[15px] font-medium text-christmas-snow">
                        <RoleIcon role={entry.label} className="h-[18px] w-[18px]" />
                        {entry.label}
                      </span>
                      <span className="mt-1 text-xs text-muted-foreground">{entry.count} игр</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {specializationSummary.length > 0 && (
              <div
                data-testid="player-card-specializations"
                className="h-full rounded-xl border border-border/50 bg-background/30 px-4 py-3.5"
              >
                <p className="mb-3 text-center text-[11px] uppercase tracking-wider text-muted-foreground">Специализации</p>
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
                  {specializationSummary.map((entry) => (
                    <div
                      key={entry.label}
                      data-testid="player-card-specialization-item"
                      className="flex min-w-[88px] flex-col items-center justify-center text-center"
                    >
                      <span className="inline-flex items-center gap-2 text-[15px] font-medium text-christmas-snow">
                        <SpecializationIcon specialization={entry.label} className="text-lg" />
                        {entry.label}
                      </span>
                      <span className="mt-1 text-xs text-muted-foreground">{entry.count} игр</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            {(topFactions.length > 0 || topMaps.length > 0) && (
              <div className="grid h-full gap-3 md:grid-cols-2">
                <div className="flex h-full min-h-[132px] flex-col items-center justify-center rounded-xl border border-border/50 bg-background/30 px-3 py-3 text-center">
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
                          <span className="inline-flex items-center gap-1.5">
                            <FactionIcon faction={entry.label} />
                            <span>• {entry.count}</span>
                          </span>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Нет данных</span>
                    )}
                  </div>
                </div>
                <div className="flex h-full min-h-[132px] flex-col items-center justify-center rounded-xl border border-border/50 bg-background/30 px-3 py-3 text-center">
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
            )}

            {squadSummary.length > 0 && (
              <div className="h-full rounded-xl border border-border/50 bg-background/30 px-4 py-3.5">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <Shield className="h-4 w-4 text-christmas-gold" />
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Цвета отрядов</p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {squadSummary.map((squad) => {
                    const tone = getSquadToneClasses(squad.label)
                    return (
                      <span
                        key={squad.label}
                        data-testid="player-card-squad-tile"
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                          tone.badge,
                        )}
                      >
                        <span className={cn("h-2.5 w-2.5 rounded-full", tone.dot)} />
                        <span className="font-medium">{squad.label}</span>
                        <span className="text-xs opacity-80">{squad.games}</span>
                      </span>
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
            currentElo={ratingSource.totals.elo}
            currentTbf={ratingSource.totals.tbf}
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
