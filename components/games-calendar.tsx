"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { PastGameSummary } from "@/lib/data-utils"
import { cn } from "@/lib/utils"
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Swords, Users } from "lucide-react"

interface GamesCalendarProps {
  games: PastGameSummary[]
  onOpenGame: (eventId: string) => void
}

type CalendarGame = {
  key: string
  games: PastGameSummary[]
  primary: PastGameSummary
  isSideSwap: boolean
}

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

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

function resultTone(game: PastGameSummary): string {
  const parsed = parseDate(game.started_at)
  if (parsed && parsed.getTime() > Date.now()) return "border-sky-400/40 bg-sky-400/10 text-sky-200"
  if (game.is_win === true) return "border-christmas-green/40 bg-christmas-green/10 text-christmas-green"
  if (game.is_win === false) return "border-christmas-red/40 bg-christmas-red/10 text-christmas-red"
  return "border-border/60 bg-background/50 text-muted-foreground"
}

function ticketText(game: PastGameSummary): string {
  if (game.score !== null) return `${game.score > 0 ? "+" : ""}${game.score}`
  if (game.tickets_1 !== null && game.tickets_2 !== null) return `${game.tickets_1}:${game.tickets_2}`
  return "н/д"
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
  return (
    <div className="max-w-sm space-y-2 text-xs">
      <div>
        <p className="font-semibold text-christmas-snow">{formatFullDate(primary.started_at)} в {formatTime(primary.started_at)}</p>
        <p className="text-muted-foreground">{primary.event_type || "Матч"}{isSideSwap ? " • смена сторон" : ""}</p>
      </div>
      <div className="grid grid-cols-1 gap-1 text-muted-foreground">
        <span>Карта: <span className="text-christmas-snow">{primary.map || "Не указана"}</span></span>
        <span>Режим: <span className="text-christmas-snow">{primary.mode || "Не указан"}</span></span>
        <span>Оппонент: <span className="text-christmas-snow">{primary.opponent || "Не указан"}</span></span>
        <span>Фракции: <span className="text-christmas-snow">{primary.faction_matchup || [primary.faction_1, primary.faction_2].filter(Boolean).join(" vs ") || "Не указаны"}</span></span>
        <span>Результат: <span className="text-christmas-snow">{resultLabel(primary)}</span></span>
        <span>Тикеты: <span className="text-christmas-snow">{ticketText(primary)}</span></span>
        <span>Игроков MDC: <span className="text-christmas-snow">{primary.mdc_players}</span></span>
      </div>
      {games.length > 1 ? (
        <div className="border-t border-border/60 pt-2">
          <p className="mb-1 text-muted-foreground">Матчи в группе: {games.length}</p>
          {games.map((game) => (
            <p key={game.event_id} className="truncate text-muted-foreground">
              {game.faction_matchup || [game.faction_1, game.faction_2].filter(Boolean).join(" vs ") || game.event_id}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function GamesCalendar({ games, onOpenGame }: GamesCalendarProps) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

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

  return (
    <Card className="border-christmas-gold/20 bg-card/60">
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base text-christmas-snow">
            <CalendarDays className="h-4 w-4 text-christmas-gold" />
            Календарь игр
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Прошедшие и будущие игры по дням месяца.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="border-christmas-gold/20 bg-background/50" onClick={() => goToMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[180px] text-center text-sm font-semibold text-christmas-snow">{formatMonthTitle(month)}</div>
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
                  !isCurrentMonth && "opacity-45",
                  isToday && "border-christmas-gold/60 bg-christmas-gold/10",
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={cn("text-sm font-semibold", isToday ? "text-christmas-gold" : "text-christmas-snow")}>{day.getDate()}</span>
                  {dayGames.length > 0 ? <Badge variant="outline" className="border-border/60 px-1.5 py-0 text-[10px] text-muted-foreground">{dayGames.length}</Badge> : null}
                </div>
                <div className="space-y-1.5">
                  {dayGames.map((item) => (
                    <Tooltip key={item.key}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onOpenGame(item.primary.event_id)}
                          className={cn(
                            "w-full rounded-md border px-2 py-1.5 text-left transition-colors hover:border-christmas-gold/60 hover:bg-christmas-gold/10",
                            resultTone(item.primary),
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span className="text-[11px] font-semibold">{formatTime(item.primary.started_at)}</span>
                            {item.isSideSwap ? <span className="text-[10px] text-muted-foreground">2 стороны</span> : null}
                          </div>
                          <p className="mt-0.5 truncate text-xs font-medium text-christmas-snow">{item.primary.map || "Карта не указана"}</p>
                          <div className="mt-1 flex min-w-0 items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="inline-flex min-w-0 items-center gap-1"><Swords className="h-3 w-3 shrink-0" /><span className="truncate">{item.primary.opponent || "Оппонент"}</span></span>
                            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{item.primary.mdc_players}</span>
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
