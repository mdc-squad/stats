"use client"

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getMetricIcon } from "@/lib/app-icons"
import { getEventSizeLabel, type PastGameSummary } from "@/lib/data-utils"
import { cn } from "@/lib/utils"
import {
  ArrowLeftRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crosshair,
  Flag,
  MapPin,
  Shield,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react"

interface GamesCalendarProps {
  games: PastGameSummary[]
  onOpenGame: (eventId: string) => void
  focusedEventId?: string | null
}

type CalendarGame = {
  key: string
  games: PastGameSummary[]
  primary: PastGameSummary
  isSideSwap: boolean
}

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
const EVENT_TYPE_ICONS: Array<[string, LucideIcon]> = [
  ["skirmish", Swords],
  ["training", Shield],
  ["турнир", Trophy],
  ["tournament", Trophy],
  ["матч", Swords],
  ["match", Swords],
]

function parseDate(value: string): Date | null {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function formatMonthTitle(date: Date): string {
  const value = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatTime(value: string): string {
  const parsed = parseDate(value)
  if (!parsed) return "??:??"
  return parsed.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
}

function formatFullDate(value: string): string {
  const parsed = parseDate(value)
  if (!parsed) return "Дата не указана"
  return parsed.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })
}

function minuteKey(value: string): string {
  const parsed = parseDate(value)
  if (!parsed) return value || "unknown"
  parsed.setSeconds(0, 0)
  return parsed.toISOString()
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

function factionSetKey(game: PastGameSummary): string {
  return [normalizeText(game.faction_1), normalizeText(game.faction_2)].sort().join(" vs ")
}

function calendarGroupKey(game: PastGameSummary): string {
  return [
    minuteKey(game.started_at),
    normalizeText(game.map),
    normalizeText(game.mode),
    normalizeText(game.opponent),
    factionSetKey(game),
  ].join("|")
}

function isSideSwapGroup(games: PastGameSummary[]): boolean {
  if (games.length < 2) return false
  const first = games[0]
  return games.some(
    (game) =>
      normalizeText(game.faction_1) === normalizeText(first.faction_2) &&
      normalizeText(game.faction_2) === normalizeText(first.faction_1),
  )
}

function resultLabel(game: PastGameSummary): string {
  const parsed = parseDate(game.started_at)
  if (parsed && parsed.getTime() > Date.now()) return "Запланирована"
  if (game.result?.trim()) return game.result.trim()
  if (game.is_win === true) return "Победа"
  if (game.is_win === false) return "Поражение"
  return "Без результата"
}

function isPlannedGame(game: PastGameSummary): boolean {
  const parsed = parseDate(game.started_at)
  return Boolean(parsed && parsed.getTime() > Date.now())
}

function gameTicketDiff(game: PastGameSummary): number | null {
  if (game.score !== null) return game.score
  if (game.tickets_1 !== null && game.tickets_2 !== null) return game.tickets_1 - game.tickets_2
  return null
}

function aggregateTicketDiff(games: PastGameSummary[]): number | null {
  const diffs = games.map(gameTicketDiff).filter((value): value is number => value !== null)
  return diffs.length > 0 ? diffs.reduce((sum, value) => sum + value, 0) : null
}

function isCalendarItemFocused(item: CalendarGame, focusedEventId: string | null): boolean {
  return Boolean(focusedEventId && item.games.some((game) => game.event_id === focusedEventId))
}

function resultTone(item: CalendarGame): string {
  if (isPlannedGame(item.primary)) return "border-sky-400/40 bg-sky-400/10 text-sky-200"

  if (item.isSideSwap) {
    const diff = aggregateTicketDiff(item.games)
    if (diff !== null) {
      if (diff > 0) return "border-christmas-green/40 bg-christmas-green/10 text-christmas-green"
      if (diff < 0) return "border-christmas-red/40 bg-christmas-red/10 text-christmas-red"
    }
  }

  if (item.primary.is_win === true) return "border-christmas-green/40 bg-christmas-green/10 text-christmas-green"
  if (item.primary.is_win === false) return "border-christmas-red/40 bg-christmas-red/10 text-christmas-red"
  return "border-border/60 bg-background/50 text-muted-foreground"
}

function ticketText(game: PastGameSummary): string {
  if (game.score !== null) return `${game.score > 0 ? "+" : ""}${game.score}`
  if (game.tickets_1 !== null && game.tickets_2 !== null) return `${game.tickets_1}:${game.tickets_2}`
  return ""
}

function getEventTypeIcon(eventType: string | null | undefined): LucideIcon {
  const normalized = normalizeText(eventType)
  return EVENT_TYPE_ICONS.find(([key]) => normalized.includes(key))?.[1] ?? CalendarDays
}

function isLectureEvent(eventType: string | null | undefined): boolean {
  const normalized = normalizeText(eventType)
  return normalized.includes("lecture") || normalized.includes("лекц")
}

function normalizeClanTag(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]/gi, "")
}

function tagIncludesClan(tag: string | null | undefined, clan: string): boolean {
  return normalizeClanTag(tag).includes(clan)
}

function getRosterCounts(game: PastGameSummary) {
  const mdc = game.players.filter((player) => tagIncludesClan(player.tag, "mdc")).length
  const grave = game.players.filter((player) => tagIncludesClan(player.tag, "grave")).length
  const formatPlayers =
    typeof game.team_size === "number" && Number.isFinite(game.team_size) && game.team_size > 0 ? game.team_size : game.players.length
  return { mdc, grave, merc: Math.max(formatPlayers - mdc - grave, 0), total: formatPlayers }
}

function compactInfoItems(item: CalendarGame): Array<{ key: string; icon: LucideIcon; value: string }> {
  const game = item.primary
  const eventIcon = getEventTypeIcon(game.event_type)
  const matchup = game.faction_matchup || [game.faction_1, game.faction_2].filter(Boolean).join(" vs ")
  const ticketValue = item.isSideSwap ? aggregateTicketDiff(item.games) : gameTicketDiff(game)

  const items = [
    game.event_type ? { key: "type", icon: eventIcon, value: game.event_type } : null,
    game.started_at ? { key: "time", icon: Clock, value: formatTime(game.started_at) } : null,
    getEventSizeLabel(game) ? { key: "format", icon: Users, value: getEventSizeLabel(game) } : null,
    game.map && !isLectureEvent(game.event_type) ? { key: "map", icon: MapPin, value: game.map } : null,
    game.mode ? { key: "mode", icon: Crosshair, value: game.mode } : null,
    matchup ? { key: "factions", icon: Flag, value: matchup } : null,
    ticketValue !== null ? { key: "tickets", icon: ArrowLeftRight, value: `${ticketValue > 0 ? "+" : ""}${ticketValue}` } : null,
  ]

  return items.filter((entry): entry is { key: string; icon: LucideIcon; value: string } => Boolean(entry))
}

function metricItems(game: PastGameSummary): Array<{ key: string; icon: ComponentType<{ className?: string }>; label: string; value: string }> {
  return [
    { key: "tickets", icon: ArrowLeftRight, label: "Тикеты", value: ticketText(game) },
    { key: "kills", icon: getMetricIcon("kills"), label: "Убийства", value: String(game.totalKills) },
    { key: "deaths", icon: getMetricIcon("deaths"), label: "Смерти", value: String(game.totalDeaths) },
    { key: "downs", icon: getMetricIcon("downs"), label: "Ноки", value: String(game.totalDowns) },
    { key: "revives", icon: getMetricIcon("revives"), label: "Поднятия", value: String(game.totalRevives) },
    { key: "heals", icon: getMetricIcon("heals"), label: "Хил", value: String(game.totalHeals) },
    { key: "vehicle", icon: getMetricIcon("vehicle"), label: "Техника", value: String(game.totalVehicle) },
    { key: "kd", icon: getMetricIcon("kd"), label: "KD", value: game.avgKd.toFixed(2) },
    { key: "kda", icon: getMetricIcon("kda"), label: "KDA", value: game.avgKda.toFixed(2) },
    { key: "elo", icon: getMetricIcon("elo"), label: "ELO", value: game.avgElo.toFixed(1) },
  ].filter((item) => item.value !== "")
}

function buildCalendarDays(month: Date): Date[] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - mondayOffset)

  const totalDays = Math.ceil((mondayOffset + lastDay.getDate()) / 7) * 7
  return Array.from({ length: totalDays }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

function CalendarGameTooltip({ item }: { item: CalendarGame }) {
  const { primary, games, isSideSwap } = item
  const [selectedGameIndex, setSelectedGameIndex] = useState(0)
  const selectedGame = games[Math.min(selectedGameIndex, games.length - 1)] ?? primary
  const roster = getRosterCounts(selectedGame)
  const matchup = selectedGame.faction_matchup || [selectedGame.faction_1, selectedGame.faction_2].filter(Boolean).join(" vs ")
  const planned = isPlannedGame(primary)
  const aggregateDiff = aggregateTicketDiff(games)

  useEffect(() => {
    setSelectedGameIndex(0)
  }, [item.key])

  useEffect(() => {
    if (planned || games.length < 2) return
    const intervalId = window.setInterval(() => {
      setSelectedGameIndex((current) => (current + 1) % games.length)
    }, 5000)
    return () => window.clearInterval(intervalId)
  }, [games.length, planned])

  return (
    <div className="max-w-sm space-y-2 text-center text-xs">
      <div>
        <p className="font-semibold text-christmas-snow">{formatFullDate(primary.started_at)} в {formatTime(primary.started_at)}</p>
        <p className="text-muted-foreground">
          {primary.event_type || "Матч"}
          {isSideSwap ? " • 2 игры со сменой сторон" : games.length > 1 ? ` • ${games.length} игры` : ""}
        </p>
      </div>
      {games.length > 1 ? (
        <div className="flex flex-wrap justify-center gap-1">
          {games.map((game, index) => (
            <button
              key={game.event_id}
              type="button"
              onClick={() => setSelectedGameIndex(index)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[11px] transition-colors",
                index === selectedGameIndex
                  ? "border-christmas-gold/60 bg-christmas-gold/10 text-christmas-snow"
                  : "border-border/60 bg-background/35 text-muted-foreground hover:border-christmas-gold/40 hover:text-christmas-snow",
              )}
            >
              {`Игра ${index + 1}`}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-1 text-center text-muted-foreground">
        {!isLectureEvent(selectedGame.event_type) ? <span>Карта: <span className="text-christmas-snow">{selectedGame.map || "Не указана"}</span></span> : null}
        <span>Формат: <span className="text-christmas-snow">{getEventSizeLabel(selectedGame) || "Не указан"}</span></span>
        <span>Режим: <span className="text-christmas-snow">{selectedGame.mode || "Не указан"}</span></span>
        <span>Оппонент: <span className="text-christmas-snow">{selectedGame.opponent || "Не указан"}</span></span>
        {selectedGame.opponent_strength ? <span>Сила соперника: <span className="text-christmas-snow">{selectedGame.opponent_strength}</span></span> : null}
        <span>Фракции: <span className="text-christmas-snow">{matchup || "Не указаны"}</span></span>
        <span>Результат: <span className="text-christmas-snow">{resultLabel(selectedGame)}</span></span>
        {isSideSwap && aggregateDiff !== null ? <span>Общая разница тикетов: <span className="text-christmas-snow">{aggregateDiff > 0 ? "+" : ""}{aggregateDiff}</span></span> : null}
      </div>
      {!planned ? (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            {metricItems(selectedGame).map((metric) => {
              const Icon = metric.icon
              return (
                <div key={metric.key} className="flex flex-col items-center justify-center gap-1 rounded-md border border-border/50 bg-background/35 px-2 py-1 text-center">
                  <span className="inline-flex min-w-0 items-center justify-center gap-1 text-muted-foreground"><Icon className="h-3 w-3 shrink-0 text-christmas-gold" />{metric.label}</span>
                  <span className="font-medium text-christmas-snow">{metric.value}</span>
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <div className="rounded-md border border-border/50 bg-background/35 px-2 py-1 text-center"><p className="text-muted-foreground">MDC</p><p className="font-semibold text-christmas-snow">{roster.mdc}</p></div>
            <div className="rounded-md border border-border/50 bg-background/35 px-2 py-1 text-center"><p className="text-muted-foreground">GRAVE</p><p className="font-semibold text-christmas-snow">{roster.grave}</p></div>
            <div className="rounded-md border border-border/50 bg-background/35 px-2 py-1 text-center"><p className="text-muted-foreground">Мерки</p><p className="font-semibold text-christmas-snow">{roster.merc}</p></div>
            <div className="rounded-md border border-border/50 bg-background/35 px-2 py-1 text-center"><p className="text-muted-foreground">Формат</p><p className="font-semibold text-christmas-snow">{roster.total}</p></div>
          </div>
        </>
      ) : null}
      {games.length > 1 ? (
        <div className="border-t border-border/60 pt-2">
          <p className="mb-1 text-muted-foreground">Матчи в группе: {games.length}</p>
          {games.map((game) => (
            <p key={game.event_id} className="truncate text-center text-muted-foreground">
              {game.faction_matchup || [game.faction_1, game.faction_2].filter(Boolean).join(" vs ") || game.event_id}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function GamesCalendar({ games, onOpenGame, focusedEventId = null }: GamesCalendarProps) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const focusedButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!focusedEventId) return
    const focusedGame = games.find((game) => game.event_id === focusedEventId)
    const focusedDate = focusedGame ? parseDate(focusedGame.started_at) : null
    if (!focusedDate) return
    setMonth(new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1))
  }, [focusedEventId, games])

  useEffect(() => {
    if (!focusedEventId) return
    const timeoutId = window.setTimeout(() => {
      focusedButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" })
    }, 180)
    return () => window.clearTimeout(timeoutId)
  }, [focusedEventId, month])

  const calendarDays = useMemo(() => buildCalendarDays(month), [month])
  const gamesByDay = useMemo(() => {
    const grouped = new Map<string, PastGameSummary[]>()

    games.forEach((game) => {
      const parsed = parseDate(game.started_at)
      if (!parsed) return
      const dayKey = formatDayKey(startOfLocalDay(parsed))
      if (!grouped.has(dayKey)) grouped.set(dayKey, [])
      grouped.get(dayKey)!.push(game)
    })

    const result = new Map<string, CalendarGame[]>()
    grouped.forEach((dayGames, dayKey) => {
      const groups = new Map<string, PastGameSummary[]>()

      dayGames.forEach((game) => {
        const key = calendarGroupKey(game)
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(game)
      })

      result.set(
        dayKey,
        [...groups.entries()]
          .flatMap(([key, groupedGames]) => {
            const sorted = [...groupedGames].sort((a, b) => a.event_id.localeCompare(b.event_id, "ru"))
            const isSideSwap = isSideSwapGroup(sorted)
            if (isSideSwap) {
              return [{ key, games: sorted, primary: sorted[0]!, isSideSwap }]
            }
            return sorted.map((game) => ({ key: game.event_id, games: [game], primary: game, isSideSwap: false }))
          })
          .sort((a, b) => (parseDate(a.primary.started_at)?.getTime() ?? 0) - (parseDate(b.primary.started_at)?.getTime() ?? 0)),
      )
    })

    return result
  }, [games])

  const goToMonth = (offset: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const monthInputValue = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`

  return (
    <Card className="border-christmas-gold/20 bg-card/60">
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base text-christmas-snow">
            <CalendarDays className="h-4 w-4 text-christmas-gold" />
            Календарь событий
          </CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="border-christmas-gold/20 bg-background/50" onClick={() => goToMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[180px] text-center text-sm font-semibold text-christmas-snow">{formatMonthTitle(month)}</div>
          <input
            type="month"
            value={monthInputValue}
            onChange={(event) => {
              const [yearValue, monthValue] = event.target.value.split("-")
              const year = Number(yearValue)
              const monthIndex = Number(monthValue) - 1
              if (Number.isFinite(year) && Number.isFinite(monthIndex) && monthIndex >= 0) {
                setMonth(new Date(year, monthIndex, 1))
              }
            }}
            className="rounded-md border border-christmas-gold/20 bg-background/50 px-2 py-1 text-sm text-christmas-snow"
          />
          <Button type="button" variant="outline" size="sm" className="border-christmas-gold/20 bg-background/50" onClick={() => goToMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[920px] space-y-3">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {WEEK_DAYS.map((day) => <div key={day} className="py-1">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const dayKey = formatDayKey(day)
                const dayGames = gamesByDay.get(dayKey) ?? []
                const isCurrentMonth = day.getMonth() === month.getMonth()
                const isToday = dayKey === formatDayKey(new Date())

                return (
                  <div
                    key={dayKey}
                    className={cn(
                      "min-h-[150px] rounded-lg border border-border/50 bg-background/25 p-2",
                      isToday && "border-christmas-gold/60 bg-christmas-gold/10",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className={cn("text-sm font-semibold", isToday ? "text-christmas-gold" : isCurrentMonth ? "text-christmas-snow" : "text-muted-foreground")}>{day.getDate()}</span>
                      {dayGames.length > 0 ? <Badge variant="outline" className="border-border/60 px-1.5 py-0 text-[10px] text-muted-foreground">{dayGames.length}</Badge> : null}
                    </div>
                    <div className="space-y-1.5">
                      {dayGames.map((item) => (
                        <Tooltip key={item.key}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onOpenGame(item.primary.event_id)}
                              ref={isCalendarItemFocused(item, focusedEventId) ? focusedButtonRef : null}
                              className={cn(
                                "w-full rounded-md border px-2 py-1.5 text-left transition-colors hover:border-christmas-gold/60 hover:bg-christmas-gold/10",
                                isCalendarItemFocused(item, focusedEventId) && "border-christmas-gold/70 bg-christmas-gold/10",
                                resultTone(item),
                              )}
                            >
                              <div className="space-y-1">
                                {compactInfoItems(item).map((info) => {
                                  const Icon = info.icon
                                  return (
                                    <div key={info.key} className="flex min-w-0 items-center justify-center gap-1.5 text-center text-[11px]">
                                      {info.key !== "type" ? <Icon className="h-3 w-3 shrink-0" /> : null}
                                      <span className="truncate">{info.value}</span>
                                    </div>
                                  )
                                })}
                                {item.isSideSwap ? <div className="text-center text-[11px] text-muted-foreground">2 игры со сменой сторон</div> : item.games.length > 1 ? <div className="text-center text-[11px] text-muted-foreground">{`${item.games.length} игры`}</div> : null}
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="border border-border bg-card text-card-foreground">
                            <CalendarGameTooltip item={item} />
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" />Будущие</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-christmas-green" />Победы</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-christmas-red" />Поражения</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />Клик открывает матч во вкладке игр</span>
        </div>
      </CardContent>
    </Card>
  )
}
