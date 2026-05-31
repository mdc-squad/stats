"use client"

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type MouseEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FactionMatchup } from "@/components/faction-icon"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getMetricIcon } from "@/lib/app-icons"
import { withBasePath } from "@/lib/base-path"
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
  Pin,
  Shield,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react"

interface GamesCalendarProps {
  games: PastGameSummary[]
  onOpenGame: (eventId: string) => void
  onOpenLineup?: () => void
  focusedEventId?: string | null
}

type LineupPlayer = {
  nickname?: string | null
  tag?: string | null
}

type LineupPayload = {
  name?: string | null
  siteOne?: Record<string, LineupPlayer[] | undefined>
  siteTwo?: Record<string, LineupPlayer[] | undefined>
}

type LineupAvailability = {
  date: Date | null
  map: string
  factionSet: string
  hasPlayers: boolean
}

type CalendarGame = {
  key: string
  games: PastGameSummary[]
  primary: PastGameSummary
  isSideSwap: boolean
}

type HolidayFilter = "all" | "ru" | "by"
type HolidayCountry = Exclude<HolidayFilter, "all">
type HolidayInfo = { label: string; nonWorking: boolean; countries?: HolidayCountry[] }

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
const WEEKDAY_GUIDE_OFFSET = 0
const WEEKDAY_GUIDE_MOUSE_LOCK_MS = 650
const WEEKDAY_GUIDE_STICKY_TOP = 12
const WEEKDAY_GUIDE_PINNED_STORAGE_KEY = "mdc-calendar-weekday-guide-pinned"
const LINEUP_API_BASE = (process.env.NEXT_PUBLIC_MDC_API_BASE ?? "https://api.hungryfishteam.org/gas/mdc").replace(/\/$/, "")
const LINEUP_API_URL = `${LINEUP_API_BASE}/lineup?publish=true`
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
const HOLIDAYS_BY_MONTH_DAY: Record<string, HolidayInfo> = {
  "01-01": { label: "Новый год / Новы год", nonWorking: true },
  "01-02": { label: "Новогодние каникулы", nonWorking: true },
  "01-03": { label: "Новогодние каникулы", nonWorking: true },
  "01-04": { label: "Новогодние каникулы", nonWorking: true },
  "01-05": { label: "Новогодние каникулы", nonWorking: true },
  "01-06": { label: "Новогодние каникулы", nonWorking: true },
  "01-07": { label: "Рождество Христово", nonWorking: true },
  "01-08": { label: "Новогодние каникулы", nonWorking: true },
  "01-11": { label: "День заповедников и национальных парков", nonWorking: false },
  "01-25": { label: "Татьянин день", nonWorking: false },
  "01-27": { label: "День снятия блокады Ленинграда", nonWorking: false },
  "02-02": { label: "День воинской славы: Сталинградская битва", nonWorking: false },
  "02-08": { label: "День российской науки", nonWorking: false },
  "02-14": { label: "День святого Валентина", nonWorking: false },
  "02-15": { label: "День памяти воинов-интернационалистов", nonWorking: false },
  "02-23": { label: "День защитника Отечества", nonWorking: true },
  "03-08": { label: "Женский день", nonWorking: true },
  "03-15": { label: "День Конституции РБ", nonWorking: false },
  "03-27": { label: "День войск национальной гвардии РФ", nonWorking: false },
  "04-02": { label: "День единения народов", nonWorking: false },
  "04-09": { label: "День основания DCAI", nonWorking: false },
  "04-12": { label: "День космонавтики", nonWorking: false },
  "04-26": { label: "День памяти Чернобыльской трагедии", nonWorking: false },
  "04-29": { label: "День основания Mors De Caelo", nonWorking: false },
  "05-01": { label: "Праздник Весны и Труда / День труда", nonWorking: true },
  "05-07": { label: "День радио", nonWorking: false },
  "05-09": { label: "День Победы", nonWorking: true },
  "05-15": { label: "Международный день семьи", nonWorking: false },
  "05-24": { label: "День славянской письменности и культуры", nonWorking: false },
  "05-28": { label: "День пограничника", nonWorking: false },
  "06-01": { label: "День защиты детей", nonWorking: false },
  "06-06": { label: "День русского языка", nonWorking: false },
  "06-12": { label: "День России", nonWorking: true },
  "06-22": { label: "День памяти и скорби", nonWorking: false },
  "06-27": { label: "День молодежи", nonWorking: false },
  "07-03": { label: "День Независимости РБ", nonWorking: true },
  "07-08": { label: "День семьи, любви и верности", nonWorking: false },
  "07-28": { label: "День Крещения Руси", nonWorking: false },
  "08-02": { label: "День Воздушно-десантных войск", nonWorking: false },
  "08-12": { label: "День Военно-воздушных сил", nonWorking: false },
  "08-27": { label: "День российского кино", nonWorking: false },
  "09-01": { label: "День знаний", nonWorking: false },
  "09-03": { label: "День окончания Второй мировой войны", nonWorking: false },
  "09-08": { label: "День воинской славы: Бородинское сражение", nonWorking: false },
  "09-17": { label: "День народного единства РБ", nonWorking: false },
  "10-01": { label: "День пожилых людей", nonWorking: false },
  "10-05": { label: "День учителя", nonWorking: false },
  "10-14": { label: "День матери РБ", nonWorking: false },
  "10-20": { label: "День военного связиста", nonWorking: false },
  "10-24": { label: "День подразделений специального назначения", nonWorking: false },
  "10-28": { label: "День бабушек и дедушек", nonWorking: false },
  "11-01": { label: "День основания Сибирского Анклава", nonWorking: false },
  "11-04": { label: "День народного единства РФ", nonWorking: true },
  "11-07": { label: "День Октябрьской революции", nonWorking: true },
  "11-10": { label: "День сотрудника органов внутренних дел", nonWorking: false },
  "11-19": { label: "День ракетных войск и артиллерии", nonWorking: false },
  "11-27": { label: "День морской пехоты", nonWorking: false },
  "12-09": { label: "День Героев Отечества", nonWorking: false },
  "12-12": { label: "День Конституции РФ • День основания GRAVE", nonWorking: false },
  "12-17": { label: "День Ракетных войск стратегического назначения", nonWorking: false },
  "12-25": { label: "Католическое Рождество", nonWorking: true },
  "12-27": { label: "День спасателя", nonWorking: false },
}
const HOLIDAY_FILTERS: Array<{ value: HolidayFilter; label: string; icon?: string }> = [
  { value: "all", label: "Все" },
  { value: "ru", label: "РФ", icon: withBasePath("/holiday-icons/russia.png") },
  { value: "by", label: "РБ", icon: withBasePath("/holiday-icons/belarus.png") },
]
const BELARUS_HOLIDAY_KEYS = new Set(["03-15", "04-02", "04-26", "07-03", "09-17", "10-14", "11-07", "12-25"])
const COMMON_HOLIDAY_KEYS = new Set(["01-01", "01-02", "01-07", "03-08", "05-01", "05-09"])
const GENERAL_HOLIDAY_KEYS = new Set(["02-14", "05-15", "06-01", "10-01", "10-28"])
const CLAN_HOLIDAY_KEYS = new Set(["04-09", "04-29", "11-01", "12-12"])
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

function getLastWeekdayOfMonth(year: number, monthIndex: number, weekday: number): Date {
  const date = new Date(year, monthIndex + 1, 0)
  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() - 1)
  }
  return date
}

function getNthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, nth: number): Date {
  const date = new Date(year, monthIndex, 1)
  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() + 1)
  }
  date.setDate(date.getDate() + (nth - 1) * 7)
  return date
}

function holidayCountriesForKey(key: string): HolidayCountry[] | null {
  if (CLAN_HOLIDAY_KEYS.has(key) || COMMON_HOLIDAY_KEYS.has(key)) return ["ru", "by"]
  if (GENERAL_HOLIDAY_KEYS.has(key)) return null
  if (BELARUS_HOLIDAY_KEYS.has(key)) return ["by"]
  return ["ru"]
}

function holidayMatchesFilter(date: Date, holiday: HolidayInfo, filter: HolidayFilter): boolean {
  if (filter === "all") return true
  const countries = holiday.countries ?? holidayCountriesForKey(formatMonthDayKey(date))
  return countries !== null && countries.includes(filter)
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function getHoliday(date: Date, filter: HolidayFilter = "all"): HolidayInfo | null {
  const radunitsa = getRadunitsaDate(date.getFullYear())
  if (formatDayKey(date) === formatDayKey(radunitsa)) {
    const holiday = { label: "Радуница", nonWorking: true, countries: ["by"] } satisfies HolidayInfo
    return holidayMatchesFilter(date, holiday, filter) ? holiday : null
  }
  const fathersDay = getNthWeekdayOfMonth(date.getFullYear(), 9, 0, 3)
  if (formatDayKey(date) === formatDayKey(fathersDay)) {
    const holiday = { label: "День отца", nonWorking: false, countries: ["ru"] } satisfies HolidayInfo
    return holidayMatchesFilter(date, holiday, filter) ? holiday : null
  }
  const mothersDay = getLastWeekdayOfMonth(date.getFullYear(), 10, 0)
  if (formatDayKey(date) === formatDayKey(mothersDay)) {
    const holiday = { label: "День матери РФ", nonWorking: false, countries: ["ru"] } satisfies HolidayInfo
    return holidayMatchesFilter(date, holiday, filter) ? holiday : null
  }
  const key = formatMonthDayKey(date)
  const holiday = HOLIDAYS_BY_MONTH_DAY[key] ?? null
  if (holiday && key === "12-12" && filter === "by") {
    return { ...holiday, label: "День основания GRAVE" }
  }
  return holiday && holidayMatchesFilter(date, holiday, filter) ? holiday : null
}

function isNonWorkingDay(date: Date, filter: HolidayFilter = "all"): boolean {
  return isWeekend(date) || getHoliday(date, filter)?.nonWorking === true
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

function normalizeMatchText(value: string | null | undefined): string {
  return normalizeText(value)
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function factionSetKey(game: PastGameSummary): string {
  return [normalizeMatchText(game.faction_1), normalizeMatchText(game.faction_2)].sort().join(" vs ")
}

function factionSetFromMatchup(value: string | null | undefined): string {
  const parts = String(value ?? "").split(/\s+vs\s+/i).map(normalizeMatchText).filter(Boolean)
  return parts.length >= 2 ? parts.slice(0, 2).sort().join(" vs ") : ""
}

function parseLineupDate(value: string | null | undefined): Date | null {
  const match = String(value ?? "").match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})/)
  if (!match) return null
  const [, day, month, year, hour, minute] = match
  const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function sameMinute(left: Date | null, right: Date | null): boolean {
  if (!left || !right) return false
  return Math.abs(left.getTime() - right.getTime()) < 60_000
}

function hasLineupPlayers(payload: LineupPayload | null): boolean {
  if (!payload) return false
  return [payload.siteOne, payload.siteTwo].some((side) =>
    Object.values(side ?? {}).some((rows) =>
      (rows ?? []).some((row) => [row.nickname, row.tag].some((value) => String(value ?? "").trim().length > 0)),
    ),
  )
}

function buildLineupAvailability(payload: LineupPayload | null): LineupAvailability | null {
  if (!payload?.name) return null
  const parts = payload.name.split("|").map((part) => part.trim()).filter(Boolean)
  const matchup = parts.find((part) => /\s+vs\s+/i.test(part)) ?? parts.at(-1) ?? ""

  return {
    date: parseLineupDate(payload.name),
    map: normalizeMatchText(parts[2] ?? ""),
    factionSet: factionSetFromMatchup(matchup),
    hasPlayers: hasLineupPlayers(payload),
  }
}

function gameHasLineup(item: CalendarGame, lineup: LineupAvailability | null): boolean {
  if (!isPlannedGame(item.primary)) return false
  if (!lineup?.hasPlayers || !lineup.date) return false

  return item.games.some((game) => {
    const gameDate = parseDate(game.started_at)
    if (!sameMinute(lineup.date, gameDate)) return false

    const gameMap = normalizeMatchText(game.map)
    const mapMatches = !lineup.map || !gameMap || lineup.map.includes(gameMap) || gameMap.includes(lineup.map)
    const factionsMatch = !lineup.factionSet || lineup.factionSet === factionSetKey(game)

    return mapMatches && factionsMatch
  })
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
  if (isPlannedGame(item.primary)) return "border-sky-400/45 bg-[#071827] text-sky-200 hover:border-sky-400/60 hover:bg-[#071827]"

  if (item.isSideSwap) {
    const diff = aggregateTicketDiff(item.games)
    if (diff !== null) {
      if (diff > 0) return "border-emerald-400/45 bg-[#071b12] text-emerald-300 hover:border-emerald-400/60 hover:bg-[#071b12]"
      if (diff < 0) return "border-red-400/45 bg-[#24070a] text-red-300 hover:border-red-400/60 hover:bg-[#24070a]"
    }
  }

  if (item.primary.is_win === true) return "border-emerald-400/45 bg-[#071b12] text-emerald-300 hover:border-emerald-400/60 hover:bg-[#071b12]"
  if (item.primary.is_win === false) return "border-red-400/45 bg-[#24070a] text-red-300 hover:border-red-400/60 hover:bg-[#24070a]"
  return "border-border/60 bg-background/50 text-muted-foreground"
}

function selectedGameTone(game: PastGameSummary): string {
  if (isPlannedGame(game)) return "border-sky-400/45 bg-[#071827]"
  if (game.is_win === true) return "border-emerald-400/45 bg-[#071b12]"
  if (game.is_win === false) return "border-red-400/45 bg-[#24070a]"
  return "border-border/70 bg-[#090a12]"
}

function cleanCalendarValue(value: string | null | undefined): string {
  const normalized = (value ?? "").trim()
  if (!normalized) return ""

  const lower = normalized.toLowerCase()
  if (["vs", "v", "null", "undefined", "-", "—", "?"].includes(lower)) {
    return ""
  }

  return normalized
}

function isMeaningfulMatchup(value: string): boolean {
  const cleaned = cleanCalendarValue(value)
  if (!cleaned) return false

  if (/\bvs\b/i.test(cleaned)) {
    const sides = cleaned.split(/\s+vs\s+/i).map(cleanCalendarValue).filter(Boolean)
    return sides.length >= 2
  }

  return true
}

function explicitMatchupLabel(game: PastGameSummary): string {
  const explicit = cleanCalendarValue(game.faction_matchup)
  if (explicit && isMeaningfulMatchup(explicit)) return explicit

  const fallback = [game.faction_1, game.faction_2]
    .map(cleanCalendarValue)
    .filter(Boolean)
    .join(" vs ")
  return isMeaningfulMatchup(fallback) ? fallback : ""
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
  const nklv = game.players.filter((player) => tagIncludesClan(player.tag, "nklv")).length
  const formatPlayers =
    typeof game.team_size === "number" && Number.isFinite(game.team_size) && game.team_size > 0 ? game.team_size : game.players.length
  return { mdc, grave, nklv, merc: Math.max(formatPlayers - mdc - grave - nklv, 0), total: formatPlayers }
}

function compactInfoItems(item: CalendarGame): Array<{ key: string; icon: LucideIcon; value: string }> {
  const game = item.primary
  const isLecture = isLectureEvent(game.event_type)
  const eventIcon = getEventTypeIcon(game.event_type)
  const matchup = explicitMatchupLabel(game)
  const ticketValue = item.isSideSwap ? aggregateTicketDiff(item.games) : gameTicketDiff(game)

  const items = [
    game.event_type ? { key: "type", icon: eventIcon, value: game.event_type } : null,
    game.started_at ? { key: "time", icon: CalendarDays, value: formatTime(game.started_at) } : null,
    !isLecture && getEventSizeLabel(game) ? { key: "format", icon: Users, value: getEventSizeLabel(game) } : null,
    !isLecture && cleanCalendarValue(game.map) ? { key: "map", icon: MapPin, value: cleanCalendarValue(game.map) } : null,
    !isLecture && cleanCalendarValue(game.mode) ? { key: "mode", icon: Gamepad2, value: cleanCalendarValue(game.mode) } : null,
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
  const matchup = explicitMatchupLabel(selectedGame)
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
      {!planned && games.length > 1 ? (
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
              {explicitMatchupLabel(game) ? (
                <FactionMatchup value={explicitMatchupLabel(game)} className="justify-center" disableTooltip />
              ) : (
                <span>{index + 1}</span>
              )}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-1 text-center text-muted-foreground">
        {isLecture ? (
          <span>Участников: <span className="text-christmas-snow">{roster.total}</span></span>
        ) : (
          <>
            {cleanCalendarValue(selectedGame.map) ? <span>Карта: <span className="text-christmas-snow">{cleanCalendarValue(selectedGame.map)}</span></span> : null}
            {getEventSizeLabel(selectedGame) ? <span>Формат: <span className="text-christmas-snow">{getEventSizeLabel(selectedGame)}</span></span> : null}
            {cleanCalendarValue(selectedGame.mode) ? <span>Режим: <span className="text-christmas-snow">{cleanCalendarValue(selectedGame.mode)}</span></span> : null}
            {cleanCalendarValue(selectedGame.opponent) ? <span>Оппонент: <span className="text-christmas-snow">{cleanCalendarValue(selectedGame.opponent)}</span></span> : null}
            {selectedGame.opponent_strength ? <span>Сила соперника: <span className="text-christmas-snow">{selectedGame.opponent_strength}</span></span> : null}
            {matchup ? <span className="inline-flex items-center justify-center gap-1.5">
              Фракции:
              <FactionMatchup value={matchup} className="text-christmas-snow" showLabels />
            </span> : null}
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
          <div className="grid grid-cols-4 gap-1.5">
            <div className="rounded-md border border-border/50 bg-background/35 px-2 py-1 text-center"><p className="text-muted-foreground">MDC</p><p className="font-semibold text-christmas-snow">{roster.mdc}</p></div>
            <div className="rounded-md border border-border/50 bg-background/35 px-2 py-1 text-center"><p className="text-muted-foreground">GRAVE</p><p className="font-semibold text-christmas-snow">{roster.grave}</p></div>
            <div className="rounded-md border border-border/50 bg-background/35 px-2 py-1 text-center"><p className="text-muted-foreground">NKLV</p><p className="font-semibold text-christmas-snow">{roster.nklv}</p></div>
            <div className="rounded-md border border-border/50 bg-background/35 px-2 py-1 text-center"><p className="text-muted-foreground">Мерки</p><p className="font-semibold text-christmas-snow">{roster.merc}</p></div>
          </div>
        </>
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

export function GamesCalendar({ games, onOpenGame, onOpenLineup, focusedEventId = null }: GamesCalendarProps) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear())
  const [holidayFilter, setHolidayFilter] = useState<HolidayFilter>("all")
  const [lineupAvailability, setLineupAvailability] = useState<LineupAvailability | null>(null)
  const [weekdayGuidePinned, setWeekdayGuidePinned] = useState(false)
  const [weekdayGuidePreferenceReady, setWeekdayGuidePreferenceReady] = useState(false)
  const [weekdayGuideStickyTop, setWeekdayGuideStickyTop] = useState(WEEKDAY_GUIDE_STICKY_TOP)
  const [weekdayGuideContentOffset, setWeekdayGuideContentOffset] = useState(0)
  const [weekdayGuideReservedOffset, setWeekdayGuideReservedOffset] = useState(0)
  const [weekdayGuideClipTop, setWeekdayGuideClipTop] = useState(0)
  const [weekdayGuide, setWeekdayGuide] = useState({ weekIndex: 0, top: 0 })
  const calendarScrollerRef = useRef<HTMLDivElement | null>(null)
  const floatingWeekdayGuideRef = useRef<HTMLDivElement | null>(null)
  const previousFloatingWeekdayGuideRectRef = useRef<DOMRect | null>(null)
  const weekRefs = useRef<Array<HTMLDivElement | null>>([])
  const weekdayGuideRef = useRef(weekdayGuide)
  const scrollFrameRef = useRef<number | null>(null)
  const mouseFrameRef = useRef<number | null>(null)
  const mouseLockUntilRef = useRef(0)
  const focusedButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    try {
      setWeekdayGuidePinned(window.localStorage.getItem(WEEKDAY_GUIDE_PINNED_STORAGE_KEY) === "true")
    } catch {
      // Local storage can be blocked; the calendar still works with the default state.
    } finally {
      setWeekdayGuidePreferenceReady(true)
    }
  }, [])

  useEffect(() => {
    if (!weekdayGuidePreferenceReady) return

    try {
      window.localStorage.setItem(WEEKDAY_GUIDE_PINNED_STORAGE_KEY, weekdayGuidePinned ? "true" : "false")
    } catch {
      // Ignore storage failures, the visible pinned state has already changed.
    }
  }, [weekdayGuidePinned, weekdayGuidePreferenceReady])

  useEffect(() => {
    let isActive = true

    const loadLineupState = async () => {
      try {
        const response = await fetch(LINEUP_API_URL, { cache: "no-store" })
        if (!response.ok) throw new Error(`API ${response.status}`)
        const payload = (await response.json()) as LineupPayload
        if (isActive) setLineupAvailability(buildLineupAvailability(payload))
      } catch {
        if (isActive) setLineupAvailability(null)
      }
    }

    void loadLineupState()

    return () => {
      isActive = false
    }
  }, [])

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

  useEffect(() => {
    weekdayGuideRef.current = weekdayGuide
  }, [weekdayGuide])

  const moveWeekdayGuideToWeek = useCallback(
    (weekIndex: number) => {
      const clampedWeekIndex = Math.min(Math.max(weekIndex, 0), Math.max(calendarWeeks.length - 1, 0))
      const weekNode = weekRefs.current[clampedWeekIndex]
      const top = weekNode ? Math.max(0, weekNode.offsetTop - WEEKDAY_GUIDE_OFFSET) : 0
      previousFloatingWeekdayGuideRectRef.current = floatingWeekdayGuideRef.current?.getBoundingClientRect() ?? null

      setWeekdayGuide((current) => {
        if (current.weekIndex === clampedWeekIndex && current.top === top) return current
        return { weekIndex: clampedWeekIndex, top }
      })
    },
    [calendarWeeks.length],
  )

  const scheduleWeekdayGuideMove = useCallback(
    (weekIndex: number, source: "mouse" | "scroll" = "scroll") => {
      if (weekdayGuidePinned) return
      const frameRef = source === "mouse" ? mouseFrameRef : scrollFrameRef
      if (source === "mouse") {
        mouseLockUntilRef.current = Date.now() + WEEKDAY_GUIDE_MOUSE_LOCK_MS
      } else if (Date.now() < mouseLockUntilRef.current) {
        return
      }
      if (frameRef.current !== null) return
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null
        moveWeekdayGuideToWeek(weekIndex)
      })
    },
    [moveWeekdayGuideToWeek, weekdayGuidePinned],
  )

  useEffect(() => {
    weekRefs.current = weekRefs.current.slice(0, calendarWeeks.length)
    const frameId = window.requestAnimationFrame(() => moveWeekdayGuideToWeek(weekdayGuideRef.current.weekIndex))
    return () => window.cancelAnimationFrame(frameId)
  }, [calendarWeeks.length, moveWeekdayGuideToWeek])

  useEffect(() => {
    if (weekdayGuidePinned) return
    const updateFromScroll = () => {
      if (Date.now() < mouseLockUntilRef.current) return
      const focusY = window.innerHeight * 0.45
      const currentNode = weekRefs.current[weekdayGuideRef.current.weekIndex]
      const currentRect = currentNode?.getBoundingClientRect()
      if (currentRect && currentRect.top - 28 <= focusY && currentRect.bottom + 28 >= focusY) {
        return
      }
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
        scheduleWeekdayGuideMove(bestWeekIndex, "scroll")
      }
    }

    const scheduleUpdateFromScroll = () => {
      if (scrollFrameRef.current !== null) return
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null
        updateFromScroll()
      })
    }

    scheduleUpdateFromScroll()
    window.addEventListener("scroll", scheduleUpdateFromScroll, { passive: true })
    window.addEventListener("resize", scheduleUpdateFromScroll)
    return () => {
      window.removeEventListener("scroll", scheduleUpdateFromScroll)
      window.removeEventListener("resize", scheduleUpdateFromScroll)
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current)
        scrollFrameRef.current = null
      }
    }
  }, [scheduleWeekdayGuideMove, weekdayGuidePinned])

  useEffect(() => {
    if (!weekdayGuidePinned) {
      setWeekdayGuideContentOffset(0)
      setWeekdayGuideReservedOffset(0)
      setWeekdayGuideClipTop(0)
      const frameId = window.requestAnimationFrame(() => moveWeekdayGuideToWeek(weekdayGuideRef.current.weekIndex))
      return () => window.cancelAnimationFrame(frameId)
    }
  }, [moveWeekdayGuideToWeek, weekdayGuidePinned])

  useLayoutEffect(() => {
    if (weekdayGuidePinned) {
      previousFloatingWeekdayGuideRectRef.current = null
      return undefined
    }

    const node = floatingWeekdayGuideRef.current
    const previousRect = previousFloatingWeekdayGuideRectRef.current
    previousFloatingWeekdayGuideRectRef.current = null
    if (!node || !previousRect) return undefined

    const nextRect = node.getBoundingClientRect()
    const deltaY = previousRect.top - nextRect.top
    if (Math.abs(deltaY) < 2) return undefined

    node.style.transition = "none"
    node.style.transform = `translateY(${deltaY}px)`
    node.style.opacity = "0.96"

    const frameId = window.requestAnimationFrame(() => {
      node.style.transition = "transform 180ms ease-out, opacity 160ms ease-out"
      node.style.transform = "translateY(0)"
      node.style.opacity = "1"
    })
    const timeoutId = window.setTimeout(() => {
      node.style.transition = ""
      node.style.transform = ""
      node.style.opacity = ""
    }, 220)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
    }
  }, [weekdayGuide.weekIndex, weekdayGuidePinned])

  useEffect(() => {
    if (!weekdayGuidePinned) return
    let frameId: number | null = null

    const updateStickyTop = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        const headerRect = document.querySelector<HTMLElement>("[data-testid='seasonal-header']")?.getBoundingClientRect()
        const guide = document.querySelector<HTMLElement>("[data-testid='calendar-weekday-guide-pinned']")
        const stickyTop = Math.max(WEEKDAY_GUIDE_STICKY_TOP, Math.ceil((headerRect?.bottom ?? 0) + 8))
        const guideRect = guide?.getBoundingClientRect()
        const scrollerRect = calendarScrollerRef.current?.getBoundingClientRect()
        const isStuck = Boolean(guideRect && guideRect.top <= stickyTop + 1)
        const reservedOffset = Math.ceil((guideRect?.height ?? 34) + 10)

        setWeekdayGuideStickyTop(stickyTop)
        setWeekdayGuideReservedOffset(reservedOffset)
        setWeekdayGuideContentOffset(isStuck ? reservedOffset : 0)
        setWeekdayGuideClipTop(isStuck && guideRect && scrollerRect ? Math.max(0, Math.ceil(guideRect.bottom + 2 - scrollerRect.top)) : 0)
      })
    }

    updateStickyTop()
    window.addEventListener("scroll", updateStickyTop, { passive: true })
    window.addEventListener("resize", updateStickyTop)

    return () => {
      window.removeEventListener("scroll", updateStickyTop)
      window.removeEventListener("resize", updateStickyTop)
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [weekdayGuidePinned])

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current)
      if (mouseFrameRef.current !== null) window.cancelAnimationFrame(mouseFrameRef.current)
    }
  }, [])

  const handleCalendarMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (weekdayGuidePinned) return
    const weekNode = (event.target as HTMLElement).closest<HTMLElement>("[data-calendar-week-index]")
    const weekIndex = Number(weekNode?.dataset.calendarWeekIndex)
    if (Number.isFinite(weekIndex)) {
      scheduleWeekdayGuideMove(weekIndex, "mouse")
    }
  }

  const renderWeekdayGuide = (mode: "pinned" | "floating") => {
    const isPinnedMode = mode !== "floating"

    return (
      <div
        ref={mode === "floating" ? floatingWeekdayGuideRef : undefined}
        data-testid={`calendar-weekday-guide-${mode}`}
        className={cn(
          "rounded-md border border-christmas-gold/20 bg-background text-center text-sm font-bold uppercase tracking-wider text-christmas-gold shadow-lg shadow-black/20",
          mode === "floating" && "pointer-events-none relative z-20",
          mode === "pinned" && "sticky z-30 mb-3",
        )}
        style={
          mode === "pinned"
              ? { top: weekdayGuideStickyTop }
              : undefined
        }
      >
        <div className="grid grid-cols-7 gap-2">
          {WEEK_DAYS.map((day) => <div key={day} className="py-1.5">{day}</div>)}
        </div>
        <button
          type="button"
          onClick={() => setWeekdayGuidePinned((pinned) => !pinned)}
          title={isPinnedMode ? "Открепить дни недели" : "Закрепить дни недели сверху"}
          aria-label={isPinnedMode ? "Открепить дни недели" : "Закрепить дни недели сверху"}
          aria-pressed={weekdayGuidePinned}
          className={cn(
            "pointer-events-auto absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-christmas-gold transition-colors",
            isPinnedMode ? "bg-christmas-gold/15" : "bg-transparent hover:bg-christmas-gold/10",
          )}
        >
          <Pin className={cn("h-3.5 w-3.5", isPinnedMode && "fill-current")} />
        </button>
      </div>
    )
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
        <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_1fr]">
          <div className="hidden md:block" />
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
          <div className="flex justify-center md:justify-end">
            <div className="flex w-fit flex-col items-center gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Праздники</span>
              <div className="flex items-center rounded-md border border-christmas-gold/20 bg-background/45 p-0.5">
                {HOLIDAY_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setHolidayFilter(filter.value)}
                    aria-label={filter.label}
                    title={filter.label}
                    className={cn(
                      "inline-flex h-8 min-w-8 items-center justify-center rounded px-3 py-1.5 text-xs font-semibold transition-colors",
                      filter.icon && "px-1.5",
                      holidayFilter === filter.value
                        ? "bg-christmas-gold text-slate-950"
                        : "text-christmas-gold hover:bg-christmas-gold/10 hover:text-christmas-gold",
                    )}
                  >
                    {filter.icon ? (
                      <img src={filter.icon} alt="" aria-hidden="true" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      filter.label
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {weekdayGuidePinned ? renderWeekdayGuide("pinned") : null}
        <div
          ref={calendarScrollerRef}
          data-testid="calendar-week-grid-scroll"
          className="overflow-x-auto pb-1"
          style={weekdayGuideClipTop > 0 ? { clipPath: `inset(${weekdayGuideClipTop}px 0 0 0)` } : undefined}
        >
          <div className="min-w-[920px]">
            <div
              className="relative"
              onMouseMove={handleCalendarMouseMove}
            >
              <div
                className="space-y-3"
                style={
                  weekdayGuideReservedOffset > 0
                    ? {
                        paddingTop: weekdayGuideContentOffset,
                        paddingBottom: Math.max(0, weekdayGuideReservedOffset - weekdayGuideContentOffset),
                      }
                    : undefined
                }
              >
              {calendarWeeks.map((week, weekIndex) => (
                <Fragment key={`week-${weekIndex}`}>
                  {!weekdayGuidePinned && weekdayGuide.weekIndex === weekIndex ? renderWeekdayGuide("floating") : null}
                  <div
                    ref={(node) => {
                      weekRefs.current[weekIndex] = node
                    }}
                    data-calendar-week-index={weekIndex}
                    className="grid grid-cols-7 gap-2"
                  >
                  {week.map((day, dayIndex) => {
                const dayKey = formatDayKey(day)
                const dayGames = gamesByDay.get(dayKey) ?? []
                const isCurrentMonth = day.getMonth() === month.getMonth()
                const isToday = dayKey === formatDayKey(new Date())
                const holiday = getHoliday(day, holidayFilter)
                const nonWorkingDay = isNonWorkingDay(day, holidayFilter)
                const tooltipSide: "right" | "left" = dayIndex >= 4 ? "left" : "right"

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
                        <div key={item.key} className="space-y-1">
                          <Tooltip>
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
                                      {cleanCalendarValue(item.primary.map) ? <div className="flex min-w-0 items-center justify-center gap-1.5">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{cleanCalendarValue(item.primary.map)}</span>
                                      </div> : null}
                                      {cleanCalendarValue(item.primary.mode) ? <div className="flex min-w-0 items-center justify-center gap-1.5">
                                        <Gamepad2 className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{cleanCalendarValue(item.primary.mode)}</span>
                                      </div> : null}
                                      {cleanCalendarValue(item.primary.opponent) ? <div className="flex min-w-0 items-center justify-center gap-1.5">
                                        <Swords className="h-3 w-3 shrink-0" />
                                        <span className="truncate">Соперник: {cleanCalendarValue(item.primary.opponent)}</span>
                                      </div> : null}
                                      {explicitMatchupLabel(item.primary) ? <div className="flex min-w-0 items-center justify-center gap-1.5">
                                        <FactionMatchup value={explicitMatchupLabel(item.primary)} className="justify-center" />
                                      </div> : null}
                                    </>
                                  ) : null}
                                  {!isLectureEvent(item.primary.event_type) && !isPlannedGame(item.primary) && aggregateTicketDiff(item.games) !== null ? (
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
                          {!isLectureEvent(item.primary.event_type) && isPlannedGame(item.primary) && item.primary.discord_url ? (
                            <a
                              href={item.primary.discord_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex w-full items-center justify-center rounded-md border border-sky-300/35 bg-sky-400/10 px-2 py-1 text-[10px] font-semibold uppercase text-sky-100 transition-colors hover:bg-sky-400/20"
                            >
                              Регистрация
                            </a>
                          ) : null}
                          {onOpenLineup && gameHasLineup(item, lineupAvailability) ? (
                            <button
                              type="button"
                              onClick={onOpenLineup}
                              className="w-full rounded-md border border-christmas-gold/45 bg-christmas-gold/10 px-2 py-1 text-[10px] font-semibold uppercase text-christmas-gold transition-colors hover:bg-christmas-gold hover:text-slate-950"
                            >
                              Лайнап
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {holiday ? <HolidayLabel label={holiday.label} /> : null}
                  </div>
                )
                  })}
                  </div>
                </Fragment>
              ))}
            </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" />Будущие</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />Победы</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" />Поражения</span>
          <span className="ml-auto text-right">Клик открывает матч во вкладке игр</span>
        </div>
      </CardContent>
    </Card>
  )
}
