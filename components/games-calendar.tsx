"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type MouseEvent } from "react"
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
  Flag,
  Gamepad2,
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
const WEEKDAY_GUIDE_OFFSET = 0
const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
]
const HOLIDAYS_BY_MONTH_DAY: Record<string, { label: string; nonWorking: boolean }> = {
  "01-01": { label: "Новый год / Новы год", nonWorking: true },
  "01-02": { label: "Новогодние каникулы", nonWorking: true },
  "01-03": { label: "Новогодние каникулы", nonWorking: true },
  "01-04": { label: "Новогодние каникулы", nonWorking: true },
  "01-05": { label: "Новогодние каникулы", nonWorking: true },
  "01-06": { label: "Новогодние каникулы", nonWorking: true },
  "01-07": { label: "Рождество Христово", nonWorking: true },
  "01-08": { label: "Новогодние каникулы", nonWorking: true },
  "01-25": { label: "Татьянин день", nonWorking: false },
  "02-23": { label: "День защитника Отечества", nonWorking: true },
  "03-08": { label: "Женский день", nonWorking: true },
  "03-15": { label: "День Конституции РБ", nonWorking: false },
  "04-02": { label: "День единения народов", nonWorking: false },
  "04-12": { label: "День космонавтики", nonWorking: false },
  "05-01": { label: "Праздник Весны и Труда / День труда", nonWorking: true },
  "05-09": { label: "День Победы", nonWorking: true },
  "05-13": { label: "День Государственного флага РБ", nonWorking: false },
  "06-12": { label: "День России", nonWorking: true },
  "06-22": { label: "День памяти и скорби", nonWorking: false },
  "07-03": { label: "День Независимости РБ", nonWorking: true },
  "08-22": { label: "День флага РФ", nonWorking: false },
  "09-01": { label: "День знаний", nonWorking: false },
  "09-17": { label: "День народного единства РБ", nonWorking: false },
  "11-04": { label: "День народного единства РФ", nonWorking: true },
  "11-07": { label: "День Октябрьской революции", nonWorking: true },
  "12-12": { label: "День Конституции РФ", nonWorking: false },
  "12-25": { label: "Католическое Рождество", nonWorking: true },
}
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

function formatMonthDayKey(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function getOrthodoxEasterDate(year: number): Date {
  const a = year % 4
  const b = year % 7
  const c = year % 19
  const d = (19 * c + 15) % 30
  const e = (2 * a + 4 * b - d + 34) % 7
  const month = Math.floor((d + e + 114) / 31)
  const day = ((d + e + 114) % 31) + 1
  return new Date(year, month - 1, day + 13)
}

function getRadunitsaDate(year: number): Date {
  const date = getOrthodoxEasterDate(year)
  date.setDate(date.getDate() + 9)
  return date
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function getHoliday(date: Date): { label: string; nonWorking: boolean } | null {
  const radunitsa = getRadunitsaDate(date.getFullYear())
  if (formatDayKey(date) === formatDayKey(radunitsa)) {
    return { label: "Радуница", nonWorking: true }
  }
  return HOLIDAYS_BY_MONTH_DAY[formatMonthDayKey(date)] ?? null
}

function isNonWorkingDay(date: Date): boolean {
  return isWeekend(date) || getHoliday(date)?.nonWorking === true
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

function selectedGameTone(game: PastGameSummary): string {
  if (isPlannedGame(game)) return "border-sky-400/45 bg-sky-950"
  if (game.is_win === true) return "border-christmas-green/45 bg-green-950"
  if (game.is_win === false) return "border-christmas-red/45 bg-red-950"
  return "border-border/70 bg-background"
}

function matchupLabel(game: PastGameSummary): string {
  return game.faction_matchup || [game.faction_1, game.faction_2].filter(Boolean).join(" vs ") || game.event_id
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
  const isLecture = isLectureEvent(game.event_type)
  const eventIcon = getEventTypeIcon(game.event_type)
  const matchup = game.faction_matchup || [game.faction_1, game.faction_2].filter(Boolean).join(" vs ")
  const ticketValue = item.isSideSwap ? aggregateTicketDiff(item.games) : gameTicketDiff(game)

  const items = [
    game.event_type ? { key: "type", icon: eventIcon, value: game.event_type } : null,
    game.started_at ? { key: "time", icon: CalendarDays, value: formatTime(game.started_at) } : null,
    !isLecture && getEventSizeLabel(game) ? { key: "format", icon: Users, value: getEventSizeLabel(game) } : null,
    !isLecture && game.map ? { key: "map", icon: MapPin, value: game.map } : null,
    !isLecture && game.mode ? { key: "mode", icon: Gamepad2, value: game.mode } : null,
    !isLecture && matchup ? { key: "factions", icon: Flag, value: matchup } : null,
    !isLecture && ticketValue !== null ? { key: "tickets", icon: ArrowLeftRight, value: `${ticketValue > 0 ? "+" : ""}${ticketValue}` } : null,
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
  const [manualSelection, setManualSelection] = useState(false)
  const selectedGame = games[Math.min(selectedGameIndex, games.length - 1)] ?? primary
  const roster = getRosterCounts(selectedGame)
  const matchup = selectedGame.faction_matchup || [selectedGame.faction_1, selectedGame.faction_2].filter(Boolean).join(" vs ")
  const planned = isPlannedGame(primary)
  const isLecture = isLectureEvent(selectedGame.event_type)
  const aggregateDiff = aggregateTicketDiff(games)

  useEffect(() => {
    setSelectedGameIndex(0)
    setManualSelection(false)
  }, [item.key])

  useEffect(() => {
    if (planned || manualSelection || games.length < 2) return
    const intervalId = window.setInterval(() => {
      setSelectedGameIndex((current) => (current + 1) % games.length)
    }, 3000)
    return () => window.clearInterval(intervalId)
  }, [games.length, manualSelection, planned])

  return (
    <div className={cn("max-w-sm space-y-2 rounded-lg border p-2 text-center text-xs", selectedGameTone(selectedGame))}>
      <div>
        {planned ? <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-300">Запланирована</p> : null}
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
              onClick={() => {
                setSelectedGameIndex(index)
                setManualSelection(true)
              }}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[11px] transition-colors",
                index === selectedGameIndex
                  ? "border-christmas-gold/60 bg-christmas-gold/10 text-christmas-snow"
                  : "border-border/60 bg-background/35 text-muted-foreground hover:border-christmas-gold/40 hover:text-christmas-snow",
              )}
            >
              {`${index + 1}. ${matchupLabel(game)}`}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-1 text-center text-muted-foreground">
        {isLecture ? (
          <span>Участников: <span className="text-christmas-snow">{roster.total}</span></span>
        ) : (
          <>
            <span>Карта: <span className="text-christmas-snow">{selectedGame.map || "Не указана"}</span></span>
            <span>Формат: <span className="text-christmas-snow">{getEventSizeLabel(selectedGame) || "Не указан"}</span></span>
            <span>Режим: <span className="text-christmas-snow">{selectedGame.mode || "Не указан"}</span></span>
            <span>Оппонент: <span className="text-christmas-snow">{selectedGame.opponent || "Не указан"}</span></span>
            {selectedGame.opponent_strength ? <span>Сила соперника: <span className="text-christmas-snow">{selectedGame.opponent_strength}</span></span> : null}
            <span>Фракции: <span className="text-christmas-snow">{matchup || "Не указаны"}</span></span>
            {!planned ? <span>Результат: <span className="text-christmas-snow">{resultLabel(selectedGame)}</span></span> : null}
            {isSideSwap && aggregateDiff !== null ? <span>Общая разница тикетов: <span className="text-christmas-snow">{aggregateDiff > 0 ? "+" : ""}{aggregateDiff}</span></span> : null}
          </>
        )}
      </div>
      {!planned && !isLecture && selectedGame.discord_url ? (
        <a
          href={selectedGame.discord_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center rounded-md border border-christmas-gold/40 bg-christmas-gold/10 px-3 py-1.5 text-xs font-semibold uppercase text-christmas-snow transition-colors hover:bg-christmas-gold/20"
        >
          Discord
        </a>
      ) : null}
      {!planned && !isLecture ? (
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
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-md border border-border/50 bg-background/35 px-2 py-1 text-center"><p className="text-muted-foreground">MDC</p><p className="font-semibold text-christmas-snow">{roster.mdc}</p></div>
            <div className="rounded-md border border-border/50 bg-background/35 px-2 py-1 text-center"><p className="text-muted-foreground">GRAVE</p><p className="font-semibold text-christmas-snow">{roster.grave}</p></div>
            <div className="rounded-md border border-border/50 bg-background/35 px-2 py-1 text-center"><p className="text-muted-foreground">Мерки</p><p className="font-semibold text-christmas-snow">{roster.merc}</p></div>
          </div>
        </>
      ) : null}
      {games.length > 1 && !isLecture ? (
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

function HolidayLabel({ label }: { label: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLSpanElement | null>(null)
  const [scrollDistance, setScrollDistance] = useState(0)

  useEffect(() => {
    const updateScrollDistance = () => {
      const container = containerRef.current
      const text = textRef.current
      if (!container || !text) return
      setScrollDistance(Math.max(0, text.scrollWidth - container.clientWidth))
    }

    updateScrollDistance()
    window.addEventListener("resize", updateScrollDistance)
    return () => window.removeEventListener("resize", updateScrollDistance)
  }, [label])

  return (
    <div ref={containerRef} className="calendar-holiday-scroll mt-2 text-center text-[10px] font-medium text-christmas-gold/80">
      <span
        ref={textRef}
        className={cn("calendar-holiday-scroll__text", scrollDistance > 0 && "calendar-holiday-scroll__text--moving")}
        style={scrollDistance > 0 ? ({ "--holiday-scroll-distance": `-${scrollDistance}px` } as CSSProperties) : undefined}
      >
        {label}
      </span>
    </div>
  )
}

export function GamesCalendar({ games, onOpenGame, focusedEventId = null }: GamesCalendarProps) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear())
  const focusedButtonRef = useRef<HTMLButtonElement | null>(null)
  const weekRefs = useRef<Array<HTMLDivElement | null>>([])
  const [weekdayGuide, setWeekdayGuide] = useState({ weekIndex: 0, top: 0 })

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
  const calendarWeeks = useMemo(() => {
    const weeks: Date[][] = []
    for (let index = 0; index < calendarDays.length; index += 7) {
      weeks.push(calendarDays.slice(index, index + 7))
    }
    return weeks
  }, [calendarDays])
  const moveWeekdayGuideToWeek = useCallback(
    (weekIndex: number) => {
      const clampedWeekIndex = Math.min(Math.max(weekIndex, 0), Math.max(calendarWeeks.length - 1, 0))
      const weekNode = weekRefs.current[clampedWeekIndex]
      const top = weekNode ? Math.max(0, weekNode.offsetTop - WEEKDAY_GUIDE_OFFSET) : 0

      setWeekdayGuide((current) => {
        if (current.weekIndex === clampedWeekIndex && current.top === top) return current
        return { weekIndex: clampedWeekIndex, top }
      })
    },
    [calendarWeeks.length],
  )

  useEffect(() => {
    weekRefs.current = weekRefs.current.slice(0, calendarWeeks.length)
    const frameId = window.requestAnimationFrame(() => moveWeekdayGuideToWeek(0))
    return () => window.cancelAnimationFrame(frameId)
  }, [calendarWeeks.length, moveWeekdayGuideToWeek])

  useEffect(() => {
    const updateFromScroll = () => {
      const focusY = window.innerHeight * 0.45
      let bestWeekIndex = 0
      let bestDistance = Number.POSITIVE_INFINITY

      weekRefs.current.forEach((weekNode, weekIndex) => {
        if (!weekNode) return
        const rect = weekNode.getBoundingClientRect()
        if (rect.bottom < 0 || rect.top > window.innerHeight) return
        const distance = rect.top <= focusY && rect.bottom >= focusY
          ? 0
          : Math.min(Math.abs(rect.top - focusY), Math.abs(rect.bottom - focusY))
        if (distance < bestDistance) {
          bestDistance = distance
          bestWeekIndex = weekIndex
        }
      })

      if (bestDistance !== Number.POSITIVE_INFINITY) {
        moveWeekdayGuideToWeek(bestWeekIndex)
      }
    }

    updateFromScroll()
    window.addEventListener("scroll", updateFromScroll, { passive: true })
    window.addEventListener("resize", updateFromScroll)
    return () => {
      window.removeEventListener("scroll", updateFromScroll)
      window.removeEventListener("resize", updateFromScroll)
    }
  }, [moveWeekdayGuideToWeek])

  const handleCalendarMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const weekNode = (event.target as HTMLElement).closest<HTMLElement>("[data-calendar-week-index]")
    const weekIndex = Number(weekNode?.dataset.calendarWeekIndex)
    if (Number.isFinite(weekIndex)) {
      moveWeekdayGuideToWeek(weekIndex)
    }
  }

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
      <CardHeader className="gap-4">
        <div className="flex justify-center">
          <CardTitle className="flex items-center justify-center gap-3 text-xl font-semibold text-christmas-snow md:text-2xl">
            <CalendarDays className="h-6 w-6 text-christmas-gold md:h-7 md:w-7" />
            Календарь событий
          </CardTitle>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="outline" size="sm" className="!border !border-christmas-gold/45 bg-background/50 text-christmas-gold hover:!border-christmas-gold/70 hover:bg-christmas-gold/10 hover:text-christmas-gold" onClick={() => goToMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setPickerYear(month.getFullYear())
                setMonthPickerOpen((open) => !open)
              }}
              className="min-w-[220px] rounded-md border border-christmas-gold/20 bg-background/50 px-4 py-2 text-center text-base font-semibold text-christmas-snow hover:bg-christmas-gold/10"
            >
              {formatMonthTitle(month)}
            </button>
            {monthPickerOpen ? (
              <div className="absolute left-1/2 top-full z-30 mt-2 w-[300px] -translate-x-1/2 rounded-lg border border-christmas-gold/20 bg-card/95 p-3 shadow-xl shadow-black/30">
                <div className="mb-3 flex items-center justify-between">
                  <Button type="button" variant="outline" size="sm" className="!border !border-christmas-gold/45 bg-background/50 text-christmas-gold hover:!border-christmas-gold/70 hover:bg-christmas-gold/10 hover:text-christmas-gold" onClick={() => setPickerYear((year) => year - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-base font-semibold text-christmas-snow">{pickerYear}</span>
                  <Button type="button" variant="outline" size="sm" className="!border !border-christmas-gold/45 bg-background/50 text-christmas-gold hover:!border-christmas-gold/70 hover:bg-christmas-gold/10 hover:text-christmas-gold" onClick={() => setPickerYear((year) => year + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {MONTH_NAMES.map((name, index) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setMonth(new Date(pickerYear, index, 1))
                        setMonthPickerOpen(false)
                      }}
                      className={cn(
                        "rounded-md border border-border/50 bg-background/35 px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-christmas-gold/40 hover:text-christmas-snow",
                        pickerYear === month.getFullYear() && index === month.getMonth() && "border-christmas-gold/60 bg-christmas-gold/10 text-christmas-snow",
                      )}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <Button type="button" variant="outline" size="sm" className="!border !border-christmas-gold/45 bg-background/50 text-christmas-gold hover:!border-christmas-gold/70 hover:bg-christmas-gold/10 hover:text-christmas-gold" onClick={() => goToMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto pb-1">
          <div className="relative min-w-[920px] pt-8" onMouseMove={handleCalendarMouseMove}>
            <div
              className="pointer-events-none absolute left-0 right-0 top-0 z-20 grid grid-cols-7 gap-1 rounded-md border border-christmas-gold/20 bg-card/95 text-center text-sm font-bold uppercase tracking-wider text-christmas-gold shadow-lg shadow-black/20 backdrop-blur transition-transform duration-200 ease-out"
              style={{ transform: `translateY(${weekdayGuide.top}px)` }}
            >
              {WEEK_DAYS.map((day) => <div key={day} className="py-1.5">{day}</div>)}
            </div>
            <div className="space-y-3">
              {calendarWeeks.map((week, weekIndex) => (
                <div
                  key={`week-${weekIndex}`}
                  ref={(node) => {
                    weekRefs.current[weekIndex] = node
                  }}
                  data-calendar-week-index={weekIndex}
                  className={cn(
                    "grid grid-cols-7 gap-2 transition-[padding] duration-200",
                    weekdayGuide.weekIndex === weekIndex && "pt-10",
                  )}
                >
                  {week.map((day, dayIndex) => {
                const dayKey = formatDayKey(day)
                const dayGames = gamesByDay.get(dayKey) ?? []
                const isCurrentMonth = day.getMonth() === month.getMonth()
                const isToday = dayKey === formatDayKey(new Date())
                const holiday = getHoliday(day)
                const nonWorkingDay = isNonWorkingDay(day)
                const tooltipSide: "right" | "left" | "top" | "bottom" =
                  weekIndex <= 2 ? "bottom" : dayIndex <= 1 ? "right" : dayIndex >= 5 ? "left" : "top"

                return (
                  <div
                    key={dayKey}
                    style={
                      nonWorkingDay
                        ? {
                            backgroundImage:
                              "repeating-linear-gradient(135deg, rgba(234,179,8,0.08) 0, rgba(234,179,8,0.08) 6px, rgba(255,255,255,0.015) 6px, rgba(255,255,255,0.015) 12px)",
                          }
                        : undefined
                    }
                    className={cn(
                      "flex min-h-[150px] flex-col rounded-lg border border-border/50 bg-background/25 p-2",
                      isToday && "border-christmas-gold/60 bg-christmas-gold/10",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="min-w-0">
                        <span className={cn("text-sm font-semibold", isToday ? "text-christmas-gold" : isCurrentMonth ? "text-christmas-snow" : "text-muted-foreground")}>{day.getDate()}</span>
                        {isToday ? <span className="ml-1 align-middle text-[9px] font-medium uppercase text-christmas-gold">сегодня</span> : null}
                      </div>
                      {dayGames.length > 0 ? <Badge variant="outline" className="border-border/60 px-1.5 py-0 text-[10px] text-muted-foreground">{dayGames.length}</Badge> : null}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {dayGames.map((item) => (
                        <Tooltip key={item.key}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isPlannedGame(item.primary)) {
                                  onOpenGame(item.primary.event_id)
                                }
                              }}
                              ref={isCalendarItemFocused(item, focusedEventId) ? focusedButtonRef : null}
                              className={cn(
                                "w-full rounded-md border px-2 py-1.5 text-left transition-colors hover:border-christmas-gold/60 hover:bg-christmas-gold/10",
                                resultTone(item),
                                isCalendarItemFocused(item, focusedEventId) && "ring-2 ring-fuchsia-400/85 ring-offset-1 ring-offset-background",
                              )}
                            >
                              <div className="space-y-1 text-center text-[11px]">
                                <div className="flex min-w-0 items-center justify-center gap-1.5 font-semibold text-christmas-snow">
                                  <span className="truncate">{item.primary.event_type}</span>
                                  <span className="truncate">{formatTime(item.primary.started_at)}</span>
                                  {!isLectureEvent(item.primary.event_type) && getEventSizeLabel(item.primary) ? <span className="truncate">{getEventSizeLabel(item.primary)}</span> : null}
                                </div>
                                {!isLectureEvent(item.primary.event_type) ? (
                                  <>
                                    <div className="flex min-w-0 items-center justify-center gap-1.5">
                                      <MapPin className="h-3 w-3 shrink-0" />
                                      <span className="truncate">{item.primary.map}</span>
                                    </div>
                                    <div className="flex min-w-0 items-center justify-center gap-1.5">
                                      {item.primary.mode ? (
                                        <>
                                          <Gamepad2 className="h-3 w-3 shrink-0" />
                                          <span className="truncate">{item.primary.mode}</span>
                                        </>
                                      ) : null}
                                    </div>
                                    <div className="flex min-w-0 items-center justify-center gap-1.5">
                                      <Flag className="h-3 w-3 shrink-0" />
                                      <span className="truncate">{matchupLabel(item.primary)}</span>
                                    </div>
                                  </>
                                ) : null}
                                {!isLectureEvent(item.primary.event_type) && isPlannedGame(item.primary) && item.primary.discord_url ? (
                                  <a
                                    href={item.primary.discord_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(event) => event.stopPropagation()}
                                    className="mt-1 inline-flex w-full items-center justify-center rounded-md border border-sky-300/35 bg-sky-400/10 px-2 py-1 text-[10px] font-semibold uppercase text-sky-100 hover:bg-sky-400/20"
                                  >
                                    Регистрация
                                  </a>
                                ) : !isLectureEvent(item.primary.event_type) && aggregateTicketDiff(item.games) !== null ? (
                                  <div className="mt-1 rounded-md border border-christmas-gold/25 bg-background/35 px-2 py-1 text-center text-sm font-bold text-christmas-snow">
                                    {`${aggregateTicketDiff(item.games)! > 0 ? "+" : ""}${aggregateTicketDiff(item.games)}`}
                                  </div>
                                ) : null}
                                {!isLectureEvent(item.primary.event_type) && item.isSideSwap ? <div className="text-center text-[11px] text-muted-foreground">2 игры со сменой сторон</div> : !isLectureEvent(item.primary.event_type) && item.games.length > 1 ? <div className="text-center text-[11px] text-muted-foreground">{`${item.games.length} игры`}</div> : null}
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side={tooltipSide}
                            sideOffset={8}
                            collisionPadding={24}
                            className="overflow-visible bg-transparent p-0 text-card-foreground shadow-none"
                          >
                            <CalendarGameTooltip item={item} />
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                    {holiday ? <HolidayLabel label={holiday.label} /> : null}
                  </div>
                )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" />Будущие</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-christmas-green" />Победы</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-christmas-red" />Поражения</span>
          <span className="ml-auto text-right">Клик открывает матч во вкладке игр</span>
        </div>
      </CardContent>
    </Card>
  )
}
