"use client"

import type React from "react"

import { startTransition, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { MultiValueFilter, type MultiValueFilterOption } from "@/components/multi-value-filter"
import { Leaderboard } from "@/components/leaderboard"
import { AvgStatLeaderboard } from "@/components/avg-stat-leaderboard"
import { MapChart } from "@/components/charts/map-chart"
import { ActivityChart } from "@/components/charts/activity-chart"
import { RoleChart } from "@/components/charts/role-chart"
import { DailyActivityChart } from "@/components/charts/daily-activity-chart"
import { WeeklyActivityChart } from "@/components/charts/weekly-activity-chart"
import { WinrateProgressChart } from "@/components/charts/winrate-progress-chart"
import { RoleLeaderboard } from "@/components/charts/role-leaderboard"
import { BestMatches } from "@/components/charts/best-matches"
import { PlayerCard } from "@/components/player-card"
import { PlayerSelector } from "@/components/player-selector"
import { RoleIcon } from "@/components/role-icon"
import { SquadOverview } from "@/components/squad-overview"
import { Snowfall } from "@/components/snowfall"
import { SeasonalHeader } from "@/components/seasonal-header"
import { OverallStatsPanel } from "@/components/overall-stats-panel"
import { EventsExplorer } from "@/components/events-explorer"
import { GamesCalendar } from "@/components/games-calendar"
import {
  type MDCData,
  type Player,
  getTopPlayersByStat,
  getMapStats,
  getEventTypeStats,
  getOverallStats,
  getRoleStats,
  getMonthlyActivity,
  getDailyActivity,
  getWeeklyParticipation,
  getSLStats,
  getTopByRole,
  getPastGames,
  getPlayerGameHistory,
  getPlayerProgress,
  getUniqueTags,
  getUniqueRoles,
  filterDataByTags,
  filterDataByDateRange,
  filterDataByEventSlice,
  filterDataToCompetitiveEvents,
  getTopByWinRate,
  getTopByVehicle,
  getTopByKDA,
  getTopByAvgVehicle,
  getTopByAvgRevives,
  getTopByAvgHeals,
  getMaxRoleMetricByRole,
  getAverageValues,
  getTopMatchRecords,
  type RoleLeaderboardMetric,
} from "@/lib/data-utils"
import { getAchievementIcon, getMetricIcon } from "@/lib/app-icons"
import { fetchAllData, type SyncProgressUpdate } from "@/lib/api"
import { getSeasonalTheme, type SeasonalTheme } from "@/lib/seasonal-theme"
import { cn } from "@/lib/utils"
import {
  Calendar,
  Sparkles,
  Star,
  RotateCcw,
} from "lucide-react"

const API_CACHE_NAMESPACE = "mdc-api-cache"
const APP_BUILD_ID = process.env.NEXT_PUBLIC_APP_BUILD_ID?.trim() || "dev"
const API_CACHE_KEY = `${API_CACHE_NAMESPACE}-${APP_BUILD_ID}`
const API_CACHE_TTL_MS = 5 * 60 * 1000

type CachedPayload = {
  savedAt: number
  buildId?: string
  data: MDCData
}

function clearObsoleteCaches(currentKey: string): void {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (!key) continue

      const isApiCacheKey = key === API_CACHE_NAMESPACE || key.startsWith(`${API_CACHE_NAMESPACE}-`)
      if (isApiCacheKey && key !== currentKey) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

function readCachedData(): CachedPayload | null {
  try {
    clearObsoleteCaches(API_CACHE_KEY)
    const raw = localStorage.getItem(API_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedPayload
    if (!parsed || typeof parsed.savedAt !== "number" || !parsed.data) return null
    if (parsed.buildId && parsed.buildId !== APP_BUILD_ID) return null
    if (!Array.isArray(parsed.data.events)) return null
    if (!Array.isArray(parsed.data.players)) return null
    if (!Array.isArray(parsed.data.player_event_stats)) return null
    if (!Array.isArray(parsed.data.clans)) return null
    return parsed
  } catch {
    return null
  }
}

function writeCachedData(data: MDCData): void {
  try {
    const payload: CachedPayload = {
      savedAt: Date.now(),
      buildId: APP_BUILD_ID,
      data,
    }
    clearObsoleteCaches(API_CACHE_KEY)
    localStorage.setItem(API_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore cache write errors (e.g. private mode quota restrictions)
  }
}

function clearCachedData(): void {
  try {
    localStorage.removeItem(API_CACHE_KEY)
    clearObsoleteCaches(API_CACHE_KEY)
  } catch {
    // Ignore cache clear errors
  }
}

type SyncMode = "auto" | "reset"

type SyncProgressState = SyncProgressUpdate & {
  active: boolean
  startedAt: number
  mode: SyncMode
  finishedAt?: number
}

type RecentSyncEvent = {
  event_id: string
  started_at: string
  result: string | null
  is_win: boolean | null
}

type SyncReport = {
  syncedAt: number
  isInitial: boolean
  isReset: boolean
  previousEvents: number
  currentEvents: number
  currentRoleRecords: number
  currentPlayers: number
  currentClans: number
  protocolPagesDone: number | null
  protocolPagesTotal: number | null
  durationMs: number
  addedEventsTotal: number
  addedEventsLastWeek: RecentSyncEvent[]
}

type ThemeVariableStyle = React.CSSProperties & Record<`--${string}`, string>

type StatsPeriod = "all" | "7d" | "30d" | "90d" | "180d" | "365d" | "custom"

const STATS_PERIOD_OPTIONS: Array<{ value: StatsPeriod; label: string; summary: string }> = [
  { value: "all", label: "За всё время", summary: "Срез: за всё время" },
  { value: "7d", label: "7 дней", summary: "Срез: последние 7 дней" },
  { value: "30d", label: "30 дней", summary: "Срез: последние 30 дней" },
  { value: "90d", label: "90 дней", summary: "Срез: последние 90 дней" },
  { value: "180d", label: "180 дней", summary: "Срез: последние 180 дней" },
  { value: "365d", label: "365 дней", summary: "Срез: последние 365 дней" },
  { value: "custom", label: "Произвольно", summary: "Срез: произвольный диапазон" },
]

const ROLE_METRIC_OPTIONS: Array<{ value: RoleLeaderboardMetric; label: string }> = [
  { value: "kd", label: "K/D" },
  { value: "kda", label: "KDA" },
  { value: "elo", label: "ELO" },
  { value: "tbf", label: "ТБФ" },
  { value: "kills", label: "Убийства" },
  { value: "deaths", label: "Смерти" },
  { value: "downs", label: "Ноки" },
  { value: "revives", label: "Поднятия" },
  { value: "avgRevives", label: "Поднятия / игра" },
  { value: "heals", label: "Хил" },
  { value: "avgHeals", label: "Хил / игра" },
  { value: "vehicle", label: "Техника" },
  { value: "avgVehicle", label: "Техника / игра" },
]

const MIN_COMPETITIVE_EVENTS_FOR_TOPS = 10
const MIN_PLAYER_CARD_SAMPLE_SIZE = 10
const LEADERBOARD_PREVIEW_LIMIT = 10
const VEHICLE_LEADERBOARD_PREVIEW_LIMIT = 5

type LeaderboardCardConfig = {
  key: string
  render: (isCollapsed: boolean, onToggle: () => void) => ReactNode
}
const DEFAULT_TAG_FILTER_TOKENS = ["mdc", "grave"]
const HIDDEN_TAG_FILTER_TOKENS = ["ветеран", "неактив"]
const MDC_TAG_FILTER_VALUE = "__tag_group__mdc"
const MDC_TAG_FILTER_LABEL = "Mdc︱"

type GlobalTagFilterOption = MultiValueFilterOption & {
  rawTags: string[]
}

function buildDateRangeForPeriod(period: StatsPeriod): { from?: Date; to?: Date } {
  if (period === "all" || period === "custom") {
    return {}
  }

  const days = Number(period.replace("d", ""))
  const to = new Date()
  to.setHours(23, 59, 59, 999)

  const from = new Date(to)
  from.setDate(from.getDate() - (days - 1))
  from.setHours(0, 0, 0, 0)

  return { from, to }
}

function buildDateRangeFromCustomInput(fromValue: string, toValue: string): { from?: Date; to?: Date } {
  const from = fromValue ? new Date(`${fromValue}T00:00:00`) : undefined
  const to = toValue ? new Date(`${toValue}T23:59:59.999`) : undefined

  return {
    from: from && !Number.isNaN(from.getTime()) ? from : undefined,
    to: to && !Number.isNaN(to.getTime()) ? to : undefined,
  }
}

function parseDateInputValue(value: string): Date | undefined {
  if (!value) {
    return undefined
  }

  const [year, month, day] = value.split("-").map((part) => Number(part))
  if (!year || !month || !day) {
    return undefined
  }

  const parsed = new Date(year, month - 1, day)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDateFilterLabel(value: string): string {
  const parsed = parseDateInputValue(value)
  return parsed ? parsed.toLocaleDateString("ru-RU") : "Выберите дату"
}

function DateFilterPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between border-christmas-gold/35 bg-background/50 text-christmas-snow hover:bg-background/60 hover:text-christmas-snow"
        >
          <span className={value ? "text-christmas-snow" : "text-muted-foreground"}>{formatDateFilterLabel(value)}</span>
          <Calendar className="h-4 w-4 text-christmas-gold" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto border-christmas-gold/20 bg-card/95 p-0">
        <DatePickerCalendar
          mode="single"
          selected={parseDateInputValue(value)}
          defaultMonth={parseDateInputValue(value)}
          onSelect={(date) => {
            if (!date) return
            onChange(formatDateInputValue(date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function isLectureEventType(value: string): boolean {
  const normalized = value.toLowerCase()
  return normalized.includes("лекц") || normalized.includes("lecture")
}

function matchesTagToken(value: string, token: string): boolean {
  const normalized = value.trim().toLowerCase().replaceAll("ё", "е")
  return normalized.includes(token)
}

function matchesDefaultTagFilter(value: string): boolean {
  return DEFAULT_TAG_FILTER_TOKENS.some((token) => matchesTagToken(value, token))
}

function isHiddenTagFilterValue(value: string): boolean {
  const normalized = value.trim().toLowerCase().replaceAll("ё", "е")
  return HIDDEN_TAG_FILTER_TOKENS.some((token) => normalized.includes(token))
}

function isMdcTagFilterValue(value: string): boolean {
  return value.trim().toLowerCase().includes("mdc")
}

function haveSameStringSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false
  }

  const rightSet = new Set(right)
  return left.every((value) => rightSet.has(value))
}

function normalizeTextKey(value: string): string {
  return value
    .trim()
    .replace(/\s*\|\s*/g, " | ")
    .replace(/\s+/g, " ")
    .toLowerCase()
}

function mergeStringDomain(primary: string[] = [], secondary: string[] = []): string[] {
  const byKey = new Map<string, string>()
  ;[...primary, ...secondary]
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      const key = normalizeTextKey(value)
      if (!byKey.has(key)) {
        byKey.set(key, value)
      }
    })
  return Array.from(byKey.values())
}

function mergeByKey<T>(older: T[], newer: T[], getKey: (value: T) => string): T[] {
  const map = new Map<string, T>()
  older.forEach((value) => {
    const key = getKey(value)
    if (key) {
      map.set(key, value)
    }
  })
  newer.forEach((value) => {
    const key = getKey(value)
    if (key) {
      map.set(key, value)
    }
  })
  return Array.from(map.values())
}

function buildGlobalTagFilterOptions(players: Player[] | undefined, tagDomain: string[] | undefined): GlobalTagFilterOption[] {
  const tags = getUniqueTags(players ?? [], tagDomain ?? []).filter((tag) => !isHiddenTagFilterValue(tag))
  const mdcTags = tags.filter(isMdcTagFilterValue)
  const nonMdcTags = tags.filter((tag) => !isMdcTagFilterValue(tag))

  const options: GlobalTagFilterOption[] = []

  if (mdcTags.length > 0) {
    options.push({
      value: MDC_TAG_FILTER_VALUE,
      label: MDC_TAG_FILTER_LABEL,
      rawTags: mdcTags,
      meta: mdcTags.length > 1 ? `${mdcTags.length} вариаций` : undefined,
    })
  }

  nonMdcTags.forEach((tag) => {
    options.push({
      value: tag,
      label: tag,
      rawTags: [tag],
    })
  })

  return options
}

type DataTabFilters = ReturnType<typeof useDataTabFilters>

function useDataTabFilters(rawData: MDCData | null, enabled: boolean, includeTags = true) {
  const [selectedPeriod, setSelectedPeriod] = useState<StatsPeriod>("all")
  const [customDateFrom, setCustomDateFrom] = useState("")
  const [customDateTo, setCustomDateTo] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[] | null>(null)
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [selectedMaps, setSelectedMaps] = useState<string[]>([])
  const [selectedOpponents, setSelectedOpponents] = useState<string[]>([])
  const [selectedFactions, setSelectedFactions] = useState<string[]>([])

  const selectedPeriodOption = useMemo(
    () => STATS_PERIOD_OPTIONS.find((option) => option.value === selectedPeriod) ?? STATS_PERIOD_OPTIONS[0],
    [selectedPeriod],
  )

  const periodSummaryLabel = useMemo(() => {
    if (selectedPeriod !== "custom") return selectedPeriodOption.summary
    const formattedFrom = customDateFrom ? formatDateFilterLabel(customDateFrom) : ""
    const formattedTo = customDateTo ? formatDateFilterLabel(customDateTo) : ""
    if (customDateFrom && customDateTo) return `Срез: ${formattedFrom} - ${formattedTo}`
    if (customDateFrom) return `Срез: с ${formattedFrom}`
    if (customDateTo) return `Срез: до ${formattedTo}`
    return selectedPeriodOption.summary
  }, [customDateFrom, customDateTo, selectedPeriod, selectedPeriodOption.summary])

  const periodRange = useMemo(
    () =>
      selectedPeriod === "custom"
        ? buildDateRangeFromCustomInput(customDateFrom, customDateTo)
        : buildDateRangeForPeriod(selectedPeriod),
    [customDateFrom, customDateTo, selectedPeriod],
  )

  const dateFilteredData = useMemo(() => {
    if (!rawData) return null
    if (!enabled) return rawData
    return filterDataByDateRange(rawData, periodRange)
  }, [enabled, periodRange, rawData])

  const tagOptions = useMemo<GlobalTagFilterOption[]>(
    () => (includeTags ? buildGlobalTagFilterOptions(dateFilteredData?.players, dateFilteredData?.dictionaries?.tags) : []),
    [dateFilteredData, includeTags],
  )

  const defaultSelectedTags = useMemo(
    () => tagOptions.filter((option) => option.rawTags.some(matchesDefaultTagFilter)).map((option) => option.value),
    [tagOptions],
  )

  const effectiveSelectedTags = includeTags ? selectedTags ?? defaultSelectedTags : []

  const selectedRawTags = useMemo(() => {
    if (!includeTags) return []
    const optionByValue = new Map(tagOptions.map((option) => [option.value, option.rawTags]))
    return Array.from(new Set(effectiveSelectedTags.flatMap((value) => optionByValue.get(value) ?? [])))
  }, [effectiveSelectedTags, includeTags, tagOptions])

  const tagFilteredData = useMemo(() => {
    if (!dateFilteredData) return null
    if (!enabled || !includeTags) return dateFilteredData
    return filterDataByTags(dateFilteredData, selectedRawTags)
  }, [dateFilteredData, enabled, includeTags, selectedRawTags])

  const eventTypeOptions = useMemo<MultiValueFilterOption[]>(
    () =>
      Array.from(new Set((tagFilteredData?.events ?? []).map((event) => event.event_type?.trim() ?? "").filter(Boolean)))
        .sort((left, right) => left.localeCompare(right, "ru"))
        .map((value) => ({ value, label: value })),
    [tagFilteredData],
  )

  const mapOptions = useMemo<MultiValueFilterOption[]>(
    () =>
      Array.from(new Set((tagFilteredData?.events ?? []).map((event) => event.map?.trim() ?? "").filter(Boolean)))
        .sort((left, right) => left.localeCompare(right, "ru"))
        .map((value) => ({ value, label: value })),
    [tagFilteredData],
  )

  const opponentOptions = useMemo<MultiValueFilterOption[]>(
    () =>
      Array.from(new Set((tagFilteredData?.events ?? []).map((event) => event.opponent?.trim() ?? "").filter(Boolean)))
        .sort((left, right) => left.localeCompare(right, "ru"))
        .map((value) => ({ value, label: value })),
    [tagFilteredData],
  )

  const factionOptions = useMemo<MultiValueFilterOption[]>(
    () =>
      Array.from(new Set((tagFilteredData?.events ?? []).map((event) => event.faction_1?.trim() ?? "").filter(Boolean)))
        .sort((left, right) => left.localeCompare(right, "ru"))
        .map((value) => ({ value, label: value })),
    [tagFilteredData],
  )

  const data = useMemo(() => {
    if (!tagFilteredData) return null
    if (!enabled) return tagFilteredData
    return filterDataByEventSlice(tagFilteredData, {
      eventTypes: selectedEventTypes,
      maps: selectedMaps,
      opponents: selectedOpponents,
      factions: selectedFactions,
    })
  }, [enabled, selectedEventTypes, selectedFactions, selectedMaps, selectedOpponents, tagFilteredData])

  const isDefaultTagSelection = !includeTags || haveSameStringSet(effectiveSelectedTags, defaultSelectedTags)
  const hasFilters = Boolean(
    !isDefaultTagSelection ||
      selectedEventTypes.length ||
      selectedMaps.length ||
      selectedOpponents.length ||
      selectedFactions.length ||
      selectedPeriod !== "all" ||
      customDateFrom ||
      customDateTo,
  )

  const summaryLabel = useMemo(() => {
    const segments = [periodSummaryLabel]
    if (includeTags && !isDefaultTagSelection) segments.push(effectiveSelectedTags.length > 0 ? `теги: ${effectiveSelectedTags.length}` : "теги: все")
    if (selectedEventTypes.length > 0) segments.push(`типы: ${selectedEventTypes.length}`)
    if (selectedMaps.length > 0) segments.push(`карты: ${selectedMaps.length}`)
    if (selectedOpponents.length > 0) segments.push(`оппоненты: ${selectedOpponents.length}`)
    if (selectedFactions.length > 0) segments.push(`фракции: ${selectedFactions.length}`)
    return segments.join(" • ")
  }, [
    effectiveSelectedTags.length,
    includeTags,
    isDefaultTagSelection,
    periodSummaryLabel,
    selectedEventTypes.length,
    selectedFactions.length,
    selectedMaps.length,
    selectedOpponents.length,
  ])

  const reset = useCallback(() => {
    setSelectedPeriod("all")
    setCustomDateFrom("")
    setCustomDateTo("")
    setSelectedTags(null)
    setSelectedEventTypes([])
    setSelectedMaps([])
    setSelectedOpponents([])
    setSelectedFactions([])
  }, [])

  return {
    data,
    includeTags,
    selectedPeriod,
    setSelectedPeriod,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    tagOptions,
    effectiveSelectedTags,
    setSelectedTags,
    eventTypeOptions,
    selectedEventTypes,
    setSelectedEventTypes,
    mapOptions,
    selectedMaps,
    setSelectedMaps,
    factionOptions,
    selectedFactions,
    setSelectedFactions,
    opponentOptions,
    selectedOpponents,
    setSelectedOpponents,
    summaryLabel,
    hasFilters,
    reset,
  }
}

function DataTabFilterCard({
  filters,
  leadingFilter,
  extraHasFilters = false,
  onReset,
}: {
  filters: DataTabFilters
  leadingFilter?: ReactNode
  extraHasFilters?: boolean
  onReset?: () => void
}) {
  const columnClassName = filters.includeTags
    ? leadingFilter
      ? "xl:grid-cols-7"
      : "xl:grid-cols-6"
    : leadingFilter
    ? "xl:grid-cols-6"
    : "xl:grid-cols-5"

  return (
    <Card className="border-christmas-gold/20 bg-card/60">
      <CardContent className="space-y-3 pt-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-christmas-snow">Фильтры</p>
            <p className="text-xs text-muted-foreground">{filters.summaryLabel}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-christmas-gold/20 bg-background/40 text-christmas-snow hover:bg-christmas-gold/10"
            onClick={onReset ?? filters.reset}
            disabled={!filters.hasFilters && !extraHasFilters}
          >
            Сбросить фильтры
          </Button>
        </div>

        <div className={cn("grid grid-cols-1 gap-3 md:grid-cols-2", columnClassName)}>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Период</p>
            <Select value={filters.selectedPeriod} onValueChange={(value) => filters.setSelectedPeriod(value as StatsPeriod)}>
              <SelectTrigger className="border-christmas-gold/35 bg-background/50 text-christmas-snow">
                <SelectValue placeholder="Период" />
              </SelectTrigger>
              <SelectContent>
                {STATS_PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {leadingFilter}

          {filters.includeTags ? (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Тег</p>
              <MultiValueFilter
                options={filters.tagOptions}
                selected={filters.effectiveSelectedTags}
                onSelectionChange={(values) => filters.setSelectedTags(values)}
                placeholder="Все теги"
                searchPlaceholder="Поиск по тегам..."
                allLabel="Выбрать все теги"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Тип</p>
            <MultiValueFilter options={filters.eventTypeOptions} selected={filters.selectedEventTypes} onSelectionChange={filters.setSelectedEventTypes} placeholder="Любые типы" searchPlaceholder="Поиск по типам..." />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Карта</p>
            <MultiValueFilter options={filters.mapOptions} selected={filters.selectedMaps} onSelectionChange={filters.setSelectedMaps} placeholder="Любые карты" searchPlaceholder="Поиск по картам..." />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Фракция</p>
            <MultiValueFilter options={filters.factionOptions} selected={filters.selectedFactions} onSelectionChange={filters.setSelectedFactions} placeholder="Любые фракции" searchPlaceholder="Поиск по фракциям..." />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Оппонент</p>
            <MultiValueFilter options={filters.opponentOptions} selected={filters.selectedOpponents} onSelectionChange={filters.setSelectedOpponents} placeholder="Любые оппоненты" searchPlaceholder="Поиск по кланам и оппонентам..." />
          </div>
        </div>

        {filters.selectedPeriod === "custom" ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-2">
              <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">Дата от</span>
              <DateFilterPicker value={filters.customDateFrom} onChange={filters.setCustomDateFrom} />
            </label>
            <label className="space-y-2">
              <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">Дата до</span>
              <DateFilterPicker value={filters.customDateTo} onChange={filters.setCustomDateTo} />
            </label>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function DateOnlyFilterCard({ filters }: { filters: DataTabFilters }) {
  return (
    <Card className="border-christmas-gold/20 bg-card/60">
      <CardContent className="space-y-3 pt-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-christmas-snow">Фильтр по дате</p>
            <p className="text-xs text-muted-foreground">{filters.summaryLabel}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-christmas-gold/20 bg-background/40 text-christmas-snow hover:bg-christmas-gold/10"
            onClick={filters.reset}
            disabled={!filters.hasFilters}
          >
            Сбросить фильтр
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Период</p>
            <Select value={filters.selectedPeriod} onValueChange={(value) => filters.setSelectedPeriod(value as StatsPeriod)}>
              <SelectTrigger className="border-christmas-gold/35 bg-background/50 text-christmas-snow">
                <SelectValue placeholder="Период" />
              </SelectTrigger>
              <SelectContent>
                {STATS_PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filters.selectedPeriod === "custom" ? (
            <>
              <label className="space-y-2">
                <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">Дата от</span>
                <DateFilterPicker value={filters.customDateFrom} onChange={filters.setCustomDateFrom} />
              </label>
              <label className="space-y-2">
                <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">Дата до</span>
                <DateFilterPicker value={filters.customDateTo} onChange={filters.setCustomDateTo} />
              </label>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function mergeMDCData(older: MDCData, newer: MDCData): MDCData {
  const events = mergeByKey(
    older.events ?? [],
    newer.events ?? [],
    (event) => normalizeTextKey(event.event_id ?? ""),
  )

  const players = mergeByKey(
    older.players ?? [],
    newer.players ?? [],
    (player) => normalizeTextKey(player.player_id ?? ""),
  )

  const clans = mergeByKey(
    older.clans ?? [],
    newer.clans ?? [],
    (clan) => normalizeTextKey(clan.clan_id ?? ""),
  )

  const playerEventStats = mergeByKey(
    older.player_event_stats ?? [],
    newer.player_event_stats ?? [],
    (stat) =>
      [
        normalizeTextKey(stat.event_id ?? ""),
        normalizeTextKey(stat.player_id ?? ""),
        normalizeTextKey(stat.role ?? ""),
        String(stat.squad_no ?? ""),
        normalizeTextKey(stat.specialization ?? ""),
      ].join("::"),
  )

  const dictionaries = {
    maps: mergeStringDomain(newer.dictionaries?.maps, older.dictionaries?.maps),
    modes: mergeStringDomain(newer.dictionaries?.modes, older.dictionaries?.modes),
    factions: mergeStringDomain(newer.dictionaries?.factions, older.dictionaries?.factions),
    event_types: mergeStringDomain(newer.dictionaries?.event_types, older.dictionaries?.event_types),
    tags: mergeStringDomain(newer.dictionaries?.tags, older.dictionaries?.tags),
    roles: mergeStringDomain(newer.dictionaries?.roles, older.dictionaries?.roles),
    specializations: mergeStringDomain(newer.dictionaries?.specializations, older.dictionaries?.specializations),
    vehicles: mergeStringDomain(newer.dictionaries?.vehicles, older.dictionaries?.vehicles),
    squads: mergeStringDomain(newer.dictionaries?.squads, older.dictionaries?.squads),
  }

  return {
    meta: {
      generated_at: newer.meta?.generated_at ?? new Date().toISOString(),
      counts: {
        events: events.length,
        player_event_stats: playerEventStats.length,
        players: players.length,
        clans: clans.length,
      },
    },
    events,
    player_event_stats: playerEventStats,
    players,
    clans,
    dictionaries,
  }
}

function pickMoreCompleteData(left: MDCData | null, right: MDCData | null): MDCData | null {
  if (!left) return right
  if (!right) return left

  const leftScore =
    left.events.length * 100000 +
    left.player_event_stats.length * 100 +
    left.players.length * 10 +
    left.clans.length
  const rightScore =
    right.events.length * 100000 +
    right.player_event_stats.length * 100 +
    right.players.length * 10 +
    right.clans.length

  return leftScore >= rightScore ? left : right
}

function parseSafeDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function buildSyncReport(
  previous: MDCData | null,
  current: MDCData,
  isReset: boolean,
  progress: Pick<SyncProgressUpdate, "pagesDone" | "pagesTotal"> | null,
  startedAt: number,
): SyncReport {
  const syncedAt = Date.now()
  const durationMs = Math.max(0, syncedAt - startedAt)
  const protocolPagesDone = progress?.pagesDone ?? null
  const protocolPagesTotal = progress?.pagesTotal ?? null

  if (!previous) {
    return {
      syncedAt,
      isInitial: true,
      isReset,
      previousEvents: 0,
      currentEvents: current.events.length,
      currentRoleRecords: current.player_event_stats.length,
      currentPlayers: current.players.length,
      currentClans: current.clans.length,
      protocolPagesDone,
      protocolPagesTotal,
      durationMs,
      addedEventsTotal: 0,
      addedEventsLastWeek: [],
    }
  }

  const previousEventKeys = new Set(previous.events.map((event) => normalizeTextKey(event.event_id)))
  const addedEvents = current.events.filter((event) => !previousEventKeys.has(normalizeTextKey(event.event_id)))

  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(now.getDate() - 7)

  const addedEventsLastWeek = addedEvents
    .filter((event) => {
      const date = parseSafeDate(event.started_at)
      return date !== null && date >= weekAgo
    })
    .sort((a, b) => {
      const left = parseSafeDate(a.started_at)?.getTime() ?? 0
      const right = parseSafeDate(b.started_at)?.getTime() ?? 0
      return right - left
    })
    .slice(0, 8)
    .map((event) => ({
      event_id: event.event_id,
      started_at: event.started_at,
      result: event.result,
      is_win: event.is_win,
    }))

  return {
    syncedAt,
    isInitial: false,
    isReset,
    previousEvents: previous.events.length,
    currentEvents: current.events.length,
    currentRoleRecords: current.player_event_stats.length,
    currentPlayers: current.players.length,
    currentClans: current.clans.length,
    protocolPagesDone,
    protocolPagesTotal,
    durationMs,
    addedEventsTotal: addedEvents.length,
    addedEventsLastWeek,
  }
}

export default function YearReviewPage() {
  const [rawData, setRawData] = useState<MDCData | null>(null)
  const [seasonalTheme, setSeasonalTheme] = useState<SeasonalTheme>(() => getSeasonalTheme())
  const [selectedPeriod, setSelectedPeriod] = useState<StatsPeriod>("all")
  const [customDateFrom, setCustomDateFrom] = useState("")
  const [customDateTo, setCustomDateTo] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[] | null>(null)
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [selectedMaps, setSelectedMaps] = useState<string[]>([])
  const [selectedOpponents, setSelectedOpponents] = useState<string[]>([])
  const [selectedFactions, setSelectedFactions] = useState<string[]>([])
  const [selectedRoleMetric, setSelectedRoleMetric] = useState<RoleLeaderboardMetric>("kd")
  const [activeTab, setActiveTab] = useState("calendar")
  const [isCustomDateFromOpen, setIsCustomDateFromOpen] = useState(false)
  const [isCustomDateToOpen, setIsCustomDateToOpen] = useState(false)
  const [selectedPlayersForChart, setSelectedPlayersForChart] = useState<string[]>([])
  const [gameFocusTarget, setGameFocusTarget] = useState<{ eventId: string; playerId: string } | null>(null)
  const [expandedLeaderboardRows, setExpandedLeaderboardRows] = useState<number[]>([])
  const [expandedRoleRows, setExpandedRoleRows] = useState<number[]>([])
  const [expandedRecordRows, setExpandedRecordRows] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [calendarFocusEventId, setCalendarFocusEventId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [syncProgress, setSyncProgress] = useState<SyncProgressState | null>(null)
  const [, setLastSyncReport] = useState<SyncReport | null>(null)
  const rawDataRef = useRef<MDCData | null>(null)
  const calendarSectionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    rawDataRef.current = rawData
  }, [rawData])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSeasonalTheme((currentTheme) => {
        const nextTheme = getSeasonalTheme()
        return nextTheme.id === currentTheme.id &&
          nextTheme.backgroundImage === currentTheme.backgroundImage &&
          nextTheme.overlayGradient === currentTheme.overlayGradient &&
          nextTheme.backgroundOpacity === currentTheme.backgroundOpacity &&
          nextTheme.backgroundSize === currentTheme.backgroundSize &&
          nextTheme.backgroundPosition === currentTheme.backgroundPosition &&
          nextTheme.backgroundRepeat === currentTheme.backgroundRepeat &&
          nextTheme.backgroundBlendMode === currentTheme.backgroundBlendMode
          ? currentTheme
          : nextTheme
      })
    }, 60 * 60 * 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const loadData = useCallback(async (forceRefresh = false, resetCache = false) => {
    const cached = readCachedData()
    const syncMode: SyncMode = resetCache ? "reset" : "auto"

    if (resetCache) {
      clearCachedData()
    } else if (cached) {
      setRawData(cached.data)
      setLoading(false)
      setLoadError(null)
      setLastUpdatedAt(cached.savedAt)
    }

    // In regular page reload flow, keep cached snapshot and skip network sync.
    // Manual sync always clears the local cache and performs a full reload.
    if (!forceRefresh && !resetCache && cached) {
      return
    }

    setIsRefreshing(true)
    const startedAt = Date.now()
    let latestProgress: SyncProgressUpdate = {
      percent: 2,
      stage: "prepare",
      message: "Подготовка синхронизации...",
    }
    setSyncProgress({
      active: true,
      startedAt,
      mode: syncMode,
      ...latestProgress,
    })
    try {
      const normalizedData = await fetchAllData({
        forceRefresh,
        publish: forceRefresh || resetCache,
        onProgress: (progress) => {
          latestProgress = progress
          setSyncProgress((current) => ({
            active: true,
            startedAt: current?.startedAt ?? startedAt,
            mode: current?.mode ?? syncMode,
            ...progress,
          }))
        },
      })

      const previousDataForMerge = resetCache
        ? null
        : pickMoreCompleteData(rawDataRef.current, cached?.data ?? null)
      const finalData = previousDataForMerge ? mergeMDCData(previousDataForMerge, normalizedData) : normalizedData
      const syncReport = buildSyncReport(previousDataForMerge, finalData, resetCache, latestProgress, startedAt)

      setRawData(finalData)
      setLoading(false)
      setLoadError(null)
      writeCachedData(finalData)
      setLastUpdatedAt(Date.now())
      setLastSyncReport(syncReport)
      setSyncProgress((current) => ({
        active: false,
        startedAt: current?.startedAt ?? startedAt,
        mode: current?.mode ?? syncMode,
        percent: 100,
        stage: "done",
        message: latestProgress.stage === "done" ? latestProgress.message : "Синхронизация завершена",
        pagesDone: latestProgress.pagesDone ?? current?.pagesDone,
        pagesTotal: latestProgress.pagesTotal ?? current?.pagesTotal,
        finishedAt: Date.now(),
      }))
    } catch (err) {
      console.error("Failed to load data:", err)
      setLoadError(err instanceof Error ? err.message : "Unknown error")
      if (!cached) {
        setLoading(false)
      }
      setSyncProgress((current) => ({
        active: false,
        startedAt: current?.startedAt ?? startedAt,
        mode: current?.mode ?? syncMode,
        percent: current?.percent ?? 0,
        stage: "error",
        message: err instanceof Error ? `Ошибка синхронизации: ${err.message}` : "Ошибка синхронизации",
        pagesDone: latestProgress.pagesDone ?? current?.pagesDone,
        pagesTotal: latestProgress.pagesTotal ?? current?.pagesTotal,
        finishedAt: Date.now(),
      }))
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData(false, false)
  }, [loadData])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)

      if (isEditable) {
        return
      }

      if (event.shiftKey && !event.ctrlKey && !event.metaKey && event.code === "KeyR") {
        event.preventDefault()
        void loadData(true, true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [loadData])

  const cacheInfoText = useMemo(() => {
    if (!lastUpdatedAt) {
      return "Источник: API"
    }
    return `Обновлено: ${new Date(lastUpdatedAt).toLocaleTimeString("ru-RU")}`
  }, [lastUpdatedAt])

  const isCacheProbablyStale = useMemo(() => {
    if (!lastUpdatedAt) return true
    return Date.now() - lastUpdatedAt > API_CACHE_TTL_MS
  }, [lastUpdatedAt])

  const syncProgressLabel = useMemo(() => {
    if (!syncProgress) return null
    const pagesInfo =
      syncProgress.pagesTotal && syncProgress.pagesTotal > 0
        ? ` (${syncProgress.pagesDone ?? 0}/${syncProgress.pagesTotal} стр.)`
        : ""
    return `${syncProgress.message}${pagesInfo}`
  }, [syncProgress])

  const syncStatusClassName = useMemo(() => {
    if (syncProgress?.stage === "error") return "text-christmas-red"
    if (syncProgress?.stage === "done") return "text-christmas-green"
    if (syncProgress?.active) return "text-christmas-gold"
    return "text-christmas-snow"
  }, [syncProgress])

  const syncMetaClassName = useMemo(() => {
    if (syncProgress?.stage === "error") return "text-christmas-red"
    if (syncProgress?.stage === "done") return "text-christmas-green"
    if (syncProgress) return "text-christmas-gold"
    return isCacheProbablyStale ? "text-christmas-gold" : "text-christmas-green"
  }, [isCacheProbablyStale, syncProgress])

  const syncCompactLabel = useMemo(() => {
    if (syncProgressLabel) {
      return syncProgressLabel
    }

    return isCacheProbablyStale ? "Кэш устарел, можно обновить данные" : "Кэш актуален"
  }, [isCacheProbablyStale, syncProgressLabel])

  const syncCompactHint = useMemo(() => {
    if (syncProgress?.stage === "error") {
      return "Повторите обновление после завершённой игры."
    }
    if (syncProgress?.active) {
      return "Идёт обновление локального кэша и пересчёт статистики."
    }

    return `${cacheInfoText} • обновляйте после завершённой игры`
  }, [cacheInfoText, syncProgress])

  const syncProgressStyle = useMemo(
    () =>
      ({
        "--primary":
          syncProgress?.stage === "error"
            ? "var(--christmas-red)"
            : syncProgress?.stage === "done"
            ? "var(--christmas-green)"
            : syncProgress?.active || isCacheProbablyStale
            ? "var(--christmas-gold)"
            : "var(--christmas-green)",
      }) as ThemeVariableStyle,
    [isCacheProbablyStale, syncProgress],
  )

  const seasonalVariables = useMemo(
    () =>
      ({
        "--christmas-red": seasonalTheme.palette.red,
        "--christmas-green": seasonalTheme.palette.green,
        "--christmas-gold": seasonalTheme.palette.gold,
        "--christmas-snow": seasonalTheme.palette.snow,
        "--primary": seasonalTheme.palette.primary,
        "--accent": seasonalTheme.palette.accent,
        "--ring": seasonalTheme.palette.ring,
        "--chart-1": seasonalTheme.palette.red,
        "--chart-2": seasonalTheme.palette.green,
        "--chart-3": seasonalTheme.palette.gold,
        "--chart-4": seasonalTheme.palette.chart4,
        "--chart-5": seasonalTheme.palette.chart5,
      }) as ThemeVariableStyle,
    [seasonalTheme],
  )

  const selectedPeriodOption = useMemo(
    () => STATS_PERIOD_OPTIONS.find((option) => option.value === selectedPeriod) ?? STATS_PERIOD_OPTIONS[0],
    [selectedPeriod],
  )

  const periodSummaryLabel = useMemo(() => {
    if (selectedPeriod !== "custom") {
      return selectedPeriodOption.summary
    }

    const formattedFrom = customDateFrom ? formatDateFilterLabel(customDateFrom) : ""
    const formattedTo = customDateTo ? formatDateFilterLabel(customDateTo) : ""

    if (customDateFrom && customDateTo) {
      return `Срез: ${formattedFrom} - ${formattedTo}`
    }
    if (customDateFrom) {
      return `Срез: с ${formattedFrom}`
    }
    if (customDateTo) {
      return `Срез: до ${formattedTo}`
    }

    return selectedPeriodOption.summary
  }, [customDateFrom, customDateTo, selectedPeriod, selectedPeriodOption.summary])

  const periodRange = useMemo(
    () =>
      selectedPeriod === "custom"
        ? buildDateRangeFromCustomInput(customDateFrom, customDateTo)
        : buildDateRangeForPeriod(selectedPeriod),
    [customDateFrom, customDateTo, selectedPeriod],
  )

  const dateFilteredData = useMemo(() => {
    if (!rawData) return null
    return filterDataByDateRange(rawData, periodRange)
  }, [periodRange, rawData])

  const tagOptions = useMemo<GlobalTagFilterOption[]>(
    () => buildGlobalTagFilterOptions(dateFilteredData?.players, dateFilteredData?.dictionaries?.tags),
    [dateFilteredData],
  )

  const defaultSelectedTags = useMemo(
    () => tagOptions.filter((option) => option.rawTags.some(matchesDefaultTagFilter)).map((option) => option.value),
    [tagOptions],
  )

  const effectiveSelectedTags = selectedTags ?? defaultSelectedTags

  useEffect(() => {
    if (selectedTags === null) {
      return
    }

    const availableTags = new Set(tagOptions.map((option) => option.value))
    setSelectedTags((current) => {
      if (current === null) {
        return null
      }

      const next = current.filter((tag) => availableTags.has(tag))
      return next.length === current.length ? current : next
    })
  }, [selectedTags, tagOptions])

  const selectedRawTags = useMemo(() => {
    const optionByValue = new Map(tagOptions.map((option) => [option.value, option.rawTags]))

    return Array.from(
      new Set(
        effectiveSelectedTags.flatMap((value) => optionByValue.get(value) ?? []),
      ),
    )
  }, [effectiveSelectedTags, tagOptions])

  const tagFilteredData = useMemo(() => {
    if (!dateFilteredData) return null
    return filterDataByTags(dateFilteredData, selectedRawTags)
  }, [dateFilteredData, selectedRawTags])

  const eventTypeOptions = useMemo<MultiValueFilterOption[]>(
    () =>
      Array.from(new Set((tagFilteredData?.events ?? []).map((event) => event.event_type?.trim() ?? "").filter(Boolean)))
        .sort((left, right) => left.localeCompare(right, "ru"))
        .map((value) => ({ value, label: value })),
    [tagFilteredData],
  )

  const mapOptions = useMemo<MultiValueFilterOption[]>(
    () =>
      Array.from(new Set((tagFilteredData?.events ?? []).map((event) => event.map?.trim() ?? "").filter(Boolean)))
        .sort((left, right) => left.localeCompare(right, "ru"))
        .map((value) => ({ value, label: value })),
    [tagFilteredData],
  )

  const opponentOptions = useMemo<MultiValueFilterOption[]>(
    () =>
      Array.from(new Set((tagFilteredData?.events ?? []).map((event) => event.opponent?.trim() ?? "").filter(Boolean)))
        .sort((left, right) => left.localeCompare(right, "ru"))
        .map((value) => ({ value, label: value })),
    [tagFilteredData],
  )

  const factionOptions = useMemo<MultiValueFilterOption[]>(
    () =>
      Array.from(new Set((tagFilteredData?.events ?? []).map((event) => event.faction_1?.trim() ?? "").filter(Boolean)))
        .sort((left, right) => left.localeCompare(right, "ru"))
        .map((value) => ({ value, label: value })),
    [tagFilteredData],
  )

  const summaryData = useMemo(() => {
    if (!tagFilteredData) return null
    return filterDataByEventSlice(tagFilteredData, {
      eventTypes: selectedEventTypes,
      maps: selectedMaps,
      opponents: selectedOpponents,
      factions: selectedFactions,
    })
  }, [
    selectedEventTypes,
    selectedFactions,
    selectedMaps,
    selectedOpponents,
    tagFilteredData,
  ])

  const data = rawData
  const leaderboardFilters = useDataTabFilters(rawData, activeTab === "leaderboards", true)
  const roleFilters = useDataTabFilters(rawData, activeTab === "roles", true)
  const recordFilters = useDataTabFilters(rawData, activeTab === "records", true)
  const playerFilters = useDataTabFilters(rawData, activeTab === "progress", false)
  const groupFilters = useDataTabFilters(rawData, activeTab === "group", false)
  const leaderboardData = leaderboardFilters.data ?? data
  const roleData = roleFilters.data ?? data
  const recordData = recordFilters.data ?? data
  const playerData = playerFilters.data ?? data
  const groupData = groupFilters.data ?? data

  const competitiveData = useMemo(() => {
    if (!data) return null
    return filterDataToCompetitiveEvents(data)
  }, [data])
  const leaderboardCompetitiveData = useMemo(
    () => (activeTab === "leaderboards" && leaderboardData ? filterDataToCompetitiveEvents(leaderboardData) : competitiveData),
    [activeTab, competitiveData, leaderboardData],
  )
  const roleCompetitiveData = useMemo(
    () => (activeTab === "roles" && roleData ? filterDataToCompetitiveEvents(roleData) : competitiveData),
    [activeTab, competitiveData, roleData],
  )
  const recordCompetitiveData = useMemo(
    () => (activeTab === "records" && recordData ? filterDataToCompetitiveEvents(recordData) : competitiveData),
    [activeTab, competitiveData, recordData],
  )
  const playerCompetitiveData = useMemo(
    () => (activeTab === "progress" && playerData ? filterDataToCompetitiveEvents(playerData) : competitiveData),
    [activeTab, competitiveData, playerData],
  )
  const playerCardData = useMemo(() => playerCompetitiveData ?? playerData ?? data, [data, playerCompetitiveData, playerData])
  const isDefaultTagSelection = useMemo(
    () => haveSameStringSet(effectiveSelectedTags, defaultSelectedTags),
    [defaultSelectedTags, effectiveSelectedTags],
  )

  const hasExtendedSliceFilters = Boolean(
    !isDefaultTagSelection ||
      selectedEventTypes.length ||
      selectedMaps.length ||
      selectedOpponents.length ||
      selectedFactions.length ||
      selectedPeriod !== "all" ||
      customDateFrom ||
      customDateTo,
  )

  const sliceSummaryLabel = useMemo(() => {
    const segments = [periodSummaryLabel]

    if (!isDefaultTagSelection) {
      segments.push(effectiveSelectedTags.length > 0 ? `теги: ${effectiveSelectedTags.length}` : "теги: все")
    }
    if (selectedEventTypes.length > 0) {
      segments.push(`типы: ${selectedEventTypes.length}`)
    }
    if (selectedMaps.length > 0) {
      segments.push(`карты: ${selectedMaps.length}`)
    }
    if (selectedOpponents.length > 0) {
      segments.push(`оппоненты: ${selectedOpponents.length}`)
    }
    if (selectedFactions.length > 0) {
      segments.push(`фракции: ${selectedFactions.length}`)
    }

    return segments.join(" • ")
  }, [
    effectiveSelectedTags.length,
    isDefaultTagSelection,
    periodSummaryLabel,
    selectedEventTypes.length,
    selectedFactions.length,
    selectedMaps.length,
    selectedOpponents.length,
  ])

  const resetSliceFilters = useCallback(() => {
    setSelectedPeriod("all")
    setCustomDateFrom("")
    setCustomDateTo("")
    setSelectedTags(null)
    setSelectedEventTypes([])
    setSelectedMaps([])
    setSelectedOpponents([])
    setSelectedFactions([])
  }, [])

  useEffect(() => {
    if (!playerCardData) {
      return
    }

    const availablePlayerIds = new Set(playerCardData.players.map((player) => player.player_id))
    setSelectedPlayersForChart((current) => current.filter((playerId) => availablePlayerIds.has(playerId)))
  }, [playerCardData])

  const uniqueRoles = useMemo(() => {
    if (!data) return []
    const playerStats = Array.isArray(data.player_event_stats) ? data.player_event_stats : []
    return getUniqueRoles(playerStats, data.dictionaries?.roles ?? [])
  }, [data])

  const competitiveUniqueRoles = useMemo(() => {
    if (!roleCompetitiveData) return []
    const playerStats = Array.isArray(roleCompetitiveData.player_event_stats) ? roleCompetitiveData.player_event_stats : []
    return getUniqueRoles(playerStats, roleCompetitiveData.dictionaries?.roles ?? [])
  }, [roleCompetitiveData])

  // Core stats
  const overallStats = useMemo(() => (summaryData ? getOverallStats(summaryData) : null), [summaryData])
  const mapStats = useMemo(() => (summaryData ? getMapStats(summaryData.events, summaryData.dictionaries?.maps ?? []) : []), [summaryData])
  const eventTypeStats = useMemo(
    () => (summaryData ? getEventTypeStats(summaryData.events, summaryData.dictionaries?.event_types ?? []) : []),
    [summaryData],
  )
  const roleStats = useMemo(() => (summaryData ? getRoleStats(summaryData.player_event_stats, summaryData.dictionaries?.roles ?? []) : []), [summaryData])
  const monthlyActivity = useMemo(() => (summaryData ? getMonthlyActivity(summaryData.events) : []), [summaryData])

  // New detailed stats
  const dailyActivity = useMemo(() => (summaryData ? getDailyActivity(summaryData.events) : []), [summaryData])
  const weeklyParticipation = useMemo(
    () => (summaryData ? getWeeklyParticipation(summaryData.events, summaryData.player_event_stats) : []),
    [summaryData],
  )
  const mdcRosterCount = useMemo(
    () =>
      rawData
        ? rawData.players.filter((player) => matchesTagToken(player.tag, "mdc") || player.is_mdc_member).length
        : 0,
    [rawData],
  )
  const graveRosterCount = useMemo(
    () => (rawData ? rawData.players.filter((player) => matchesTagToken(player.tag, "grave")).length : 0),
    [rawData],
  )
  const competitiveClanPlayers = useMemo(
    () => (leaderboardCompetitiveData ? leaderboardCompetitiveData.players : []),
    [leaderboardCompetitiveData],
  )
  const competitiveClanPlayerIds = useMemo(
    () => new Set(competitiveClanPlayers.map((player) => player.player_id)),
    [competitiveClanPlayers],
  )
  const competitiveClanPlayerStats = useMemo(
    () =>
      leaderboardCompetitiveData
        ? leaderboardCompetitiveData.player_event_stats.filter((stat) => competitiveClanPlayerIds.has(stat.player_id))
        : [],
    [leaderboardCompetitiveData, competitiveClanPlayerIds],
  )
  const qualifiedCompetitiveClanPlayers = useMemo(
    () => competitiveClanPlayers.filter((player) => player.totals.events >= MIN_COMPETITIVE_EVENTS_FOR_TOPS),
    [competitiveClanPlayers],
  )
  const qualifiedCompetitiveClanPlayerIds = useMemo(
    () => new Set(qualifiedCompetitiveClanPlayers.map((player) => player.player_id)),
    [qualifiedCompetitiveClanPlayers],
  )
  const qualifiedCompetitiveClanPlayerStats = useMemo(
    () => competitiveClanPlayerStats.filter((stat) => qualifiedCompetitiveClanPlayerIds.has(stat.player_id)),
    [competitiveClanPlayerStats, qualifiedCompetitiveClanPlayerIds],
  )
  const fullCompetitiveLeaderboardLimit = Math.max(qualifiedCompetitiveClanPlayers.length, LEADERBOARD_PREVIEW_LIMIT)
  const fullCompetitiveVehicleLeaderboardLimit = Math.max(
    qualifiedCompetitiveClanPlayers.length,
    VEHICLE_LEADERBOARD_PREVIEW_LIMIT,
  )
  const roleClanPlayers = useMemo(() => (roleCompetitiveData ? roleCompetitiveData.players : []), [roleCompetitiveData])
  const roleClanPlayerIds = useMemo(() => new Set(roleClanPlayers.map((player) => player.player_id)), [roleClanPlayers])
  const roleClanPlayerStats = useMemo(
    () => (roleCompetitiveData ? roleCompetitiveData.player_event_stats.filter((stat) => roleClanPlayerIds.has(stat.player_id)) : []),
    [roleCompetitiveData, roleClanPlayerIds],
  )
  const qualifiedRoleClanPlayers = useMemo(
    () => roleClanPlayers.filter((player) => player.totals.events >= MIN_COMPETITIVE_EVENTS_FOR_TOPS),
    [roleClanPlayers],
  )
  const qualifiedRoleClanPlayerIds = useMemo(() => new Set(qualifiedRoleClanPlayers.map((player) => player.player_id)), [qualifiedRoleClanPlayers])
  const qualifiedRoleClanPlayerStats = useMemo(
    () => roleClanPlayerStats.filter((stat) => qualifiedRoleClanPlayerIds.has(stat.player_id)),
    [qualifiedRoleClanPlayerIds, roleClanPlayerStats],
  )
  const fullRoleLeaderboardLimit = Math.max(qualifiedRoleClanPlayers.length, LEADERBOARD_PREVIEW_LIMIT)
  const recordClanPlayers = useMemo(() => (recordCompetitiveData ? recordCompetitiveData.players : []), [recordCompetitiveData])
  const recordClanPlayerIds = useMemo(() => new Set(recordClanPlayers.map((player) => player.player_id)), [recordClanPlayers])
  const recordClanPlayerStats = useMemo(
    () => (recordCompetitiveData ? recordCompetitiveData.player_event_stats.filter((stat) => recordClanPlayerIds.has(stat.player_id)) : []),
    [recordCompetitiveData, recordClanPlayerIds],
  )
  const qualifiedRecordClanPlayers = useMemo(
    () => recordClanPlayers.filter((player) => player.totals.events >= MIN_COMPETITIVE_EVENTS_FOR_TOPS),
    [recordClanPlayers],
  )
  const qualifiedRecordClanPlayerIds = useMemo(() => new Set(qualifiedRecordClanPlayers.map((player) => player.player_id)), [qualifiedRecordClanPlayers])
  const qualifiedRecordClanPlayerStats = useMemo(
    () => recordClanPlayerStats.filter((stat) => qualifiedRecordClanPlayerIds.has(stat.player_id)),
    [qualifiedRecordClanPlayerIds, recordClanPlayerStats],
  )
  const fullRecordLimit = Math.max(qualifiedRecordClanPlayerStats.length, 1)
  const slStats = useMemo(
    () =>
      leaderboardCompetitiveData
        ? getSLStats(qualifiedCompetitiveClanPlayerStats, leaderboardCompetitiveData.events, qualifiedCompetitiveClanPlayers)
        : [],
    [leaderboardCompetitiveData, qualifiedCompetitiveClanPlayerStats, qualifiedCompetitiveClanPlayers],
  )
  const recordMatchesByMetric = useMemo(
    () =>
      recordCompetitiveData
        ? {
            kd: getTopMatchRecords(qualifiedRecordClanPlayerStats, recordCompetitiveData.events, "kd", fullRecordLimit),
            kda: getTopMatchRecords(qualifiedRecordClanPlayerStats, recordCompetitiveData.events, "kda", fullRecordLimit),
            elo: getTopMatchRecords(qualifiedRecordClanPlayerStats, recordCompetitiveData.events, "elo", fullRecordLimit),
            kills: getTopMatchRecords(qualifiedRecordClanPlayerStats, recordCompetitiveData.events, "kills", fullRecordLimit),
            downs: getTopMatchRecords(qualifiedRecordClanPlayerStats, recordCompetitiveData.events, "downs", fullRecordLimit),
            deaths: getTopMatchRecords(qualifiedRecordClanPlayerStats, recordCompetitiveData.events, "deaths", fullRecordLimit),
            revives: getTopMatchRecords(qualifiedRecordClanPlayerStats, recordCompetitiveData.events, "revives", fullRecordLimit),
            heals: getTopMatchRecords(qualifiedRecordClanPlayerStats, recordCompetitiveData.events, "heals", fullRecordLimit),
            vehicle: getTopMatchRecords(qualifiedRecordClanPlayerStats, recordCompetitiveData.events, "vehicle", fullRecordLimit),
          }
        : {
            kd: [],
            kda: [],
            elo: [],
            kills: [],
            downs: [],
            deaths: [],
            revives: [],
            heals: [],
            vehicle: [],
          },
    [fullRecordLimit, qualifiedRecordClanPlayerStats, recordCompetitiveData],
  )
  const pastGames = useMemo(() => {
    if (!data) return []
    const protocolEvents = rawData?.events ?? data.events
    return getPastGames(protocolEvents, data.player_event_stats, data.players, data.dictionaries?.squads ?? [])
  }, [data, rawData])
  const groupPastGames = useMemo(() => {
    if (!groupData) return []
    const protocolEvents = rawData?.events ?? groupData.events
    return getPastGames(protocolEvents, groupData.player_event_stats, groupData.players, groupData.dictionaries?.squads ?? [])
  }, [groupData, rawData])
  const futureEvents = useMemo(
    () =>
      pastGames
        .filter((game) => {
          const parsed = new Date(game.started_at)
          return !Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()
        })
        .sort((left, right) => new Date(left.started_at).getTime() - new Date(right.started_at).getTime()),
    [pastGames],
  )
  const playerCardPastGames = useMemo(() => {
    if (!playerCardData) return []
    const protocolEvents = rawData?.events ?? playerCardData.events
    return getPastGames(
      protocolEvents,
      playerCardData.player_event_stats,
      playerCardData.players,
      playerCardData.dictionaries?.squads ?? [],
    )
  }, [playerCardData, rawData])

  const roleLeaderboards = useMemo(() => {
    if (!roleCompetitiveData) return []
    return competitiveUniqueRoles
      .filter((role) => role.trim().replace(/\s+/g, " ").toLowerCase() !== "без кита")
      .map((role) => ({
        role,
        players: getTopByRole(
          qualifiedRoleClanPlayerStats,
          qualifiedRoleClanPlayers,
          role,
          fullRoleLeaderboardLimit,
          roleCompetitiveData.dictionaries?.roles ?? [],
          selectedRoleMetric,
          roleCompetitiveData.events,
        ),
      }))
  }, [
    competitiveUniqueRoles,
    fullRoleLeaderboardLimit,
    qualifiedRoleClanPlayerStats,
    qualifiedRoleClanPlayers,
    roleCompetitiveData,
    selectedRoleMetric,
  ])

  const roleMetricMaxima = useMemo(() => {
    if (!playerCardData) return {}
    const roleSource = playerCardData
    return getMaxRoleMetricByRole(
      roleSource.player_event_stats,
      roleSource.players,
      selectedRoleMetric,
      roleSource.dictionaries?.roles ?? [],
      roleSource.events,
    )
  }, [playerCardData, selectedRoleMetric])

  // Basic leaderboards
  const leaderboardKills = useMemo(
    () => getTopPlayersByStat(qualifiedCompetitiveClanPlayers, "kills", fullCompetitiveLeaderboardLimit),
    [fullCompetitiveLeaderboardLimit, qualifiedCompetitiveClanPlayers],
  )
  const leaderboardKD = useMemo(
    () => getTopPlayersByStat(qualifiedCompetitiveClanPlayers, "kd", fullCompetitiveLeaderboardLimit),
    [fullCompetitiveLeaderboardLimit, qualifiedCompetitiveClanPlayers],
  )
  const leaderboardWinRate = useMemo(
    () => getTopByWinRate(qualifiedCompetitiveClanPlayers, MIN_COMPETITIVE_EVENTS_FOR_TOPS, fullCompetitiveLeaderboardLimit),
    [fullCompetitiveLeaderboardLimit, qualifiedCompetitiveClanPlayers],
  )
  const leaderboardEvents = useMemo(
    () => getTopPlayersByStat(qualifiedCompetitiveClanPlayers, "events", fullCompetitiveLeaderboardLimit),
    [fullCompetitiveLeaderboardLimit, qualifiedCompetitiveClanPlayers],
  )
  const leaderboardHeals = useMemo(
    () => getTopPlayersByStat(qualifiedCompetitiveClanPlayers, "heals", fullCompetitiveLeaderboardLimit),
    [fullCompetitiveLeaderboardLimit, qualifiedCompetitiveClanPlayers],
  )
  const leaderboardRevives = useMemo(
    () => getTopPlayersByStat(qualifiedCompetitiveClanPlayers, "revives", fullCompetitiveLeaderboardLimit),
    [fullCompetitiveLeaderboardLimit, qualifiedCompetitiveClanPlayers],
  )
  const leaderboardDowns = useMemo(
    () => getTopPlayersByStat(qualifiedCompetitiveClanPlayers, "downs", fullCompetitiveLeaderboardLimit),
    [fullCompetitiveLeaderboardLimit, qualifiedCompetitiveClanPlayers],
  )
  const leaderboardVehicle = useMemo(
    () => getTopByVehicle(qualifiedCompetitiveClanPlayers, fullCompetitiveVehicleLeaderboardLimit),
    [fullCompetitiveVehicleLeaderboardLimit, qualifiedCompetitiveClanPlayers],
  )
  const leaderboardKDA = useMemo(
    () => getTopByKDA(qualifiedCompetitiveClanPlayers, fullCompetitiveLeaderboardLimit),
    [fullCompetitiveLeaderboardLimit, qualifiedCompetitiveClanPlayers],
  )
  const leaderboardELO = useMemo(
    () => getTopPlayersByStat(qualifiedCompetitiveClanPlayers, "elo", fullCompetitiveLeaderboardLimit),
    [fullCompetitiveLeaderboardLimit, qualifiedCompetitiveClanPlayers],
  )
  const leaderboardTBF = useMemo(
    () => getTopPlayersByStat(qualifiedCompetitiveClanPlayers, "tbf", fullCompetitiveLeaderboardLimit),
    [fullCompetitiveLeaderboardLimit, qualifiedCompetitiveClanPlayers],
  )
  const leaderboardRating = useMemo(
    () => getTopPlayersByStat(qualifiedCompetitiveClanPlayers, "rating", fullCompetitiveLeaderboardLimit),
    [fullCompetitiveLeaderboardLimit, qualifiedCompetitiveClanPlayers],
  )
  const leaderboardAvgVehicle = useMemo(
    () => getTopByAvgVehicle(qualifiedCompetitiveClanPlayers, MIN_COMPETITIVE_EVENTS_FOR_TOPS, fullCompetitiveLeaderboardLimit),
    [fullCompetitiveLeaderboardLimit, qualifiedCompetitiveClanPlayers],
  )
  const leaderboardAvgHeals = useMemo(
    () => getTopByAvgHeals(qualifiedCompetitiveClanPlayers, MIN_COMPETITIVE_EVENTS_FOR_TOPS, fullCompetitiveLeaderboardLimit),
    [fullCompetitiveLeaderboardLimit, qualifiedCompetitiveClanPlayers],
  )
  const leaderboardAvgRevives = useMemo(
    () => getTopByAvgRevives(qualifiedCompetitiveClanPlayers, MIN_COMPETITIVE_EVENTS_FOR_TOPS, fullCompetitiveLeaderboardLimit),
    [fullCompetitiveLeaderboardLimit, qualifiedCompetitiveClanPlayers],
  )
  const topKills = useMemo(() => leaderboardKills.slice(0, LEADERBOARD_PREVIEW_LIMIT), [leaderboardKills])
  const topKD = useMemo(() => leaderboardKD.slice(0, LEADERBOARD_PREVIEW_LIMIT), [leaderboardKD])
  const topWinRate = useMemo(() => leaderboardWinRate.slice(0, LEADERBOARD_PREVIEW_LIMIT), [leaderboardWinRate])
  const topEvents = useMemo(() => leaderboardEvents.slice(0, LEADERBOARD_PREVIEW_LIMIT), [leaderboardEvents])
  const topRevives = useMemo(() => leaderboardRevives.slice(0, LEADERBOARD_PREVIEW_LIMIT), [leaderboardRevives])
  const topHeals = useMemo(() => leaderboardHeals.slice(0, LEADERBOARD_PREVIEW_LIMIT), [leaderboardHeals])
  const topDowns = useMemo(() => leaderboardDowns.slice(0, LEADERBOARD_PREVIEW_LIMIT), [leaderboardDowns])
  const topVehicle = useMemo(() => leaderboardVehicle.slice(0, VEHICLE_LEADERBOARD_PREVIEW_LIMIT), [leaderboardVehicle])
  const topKDA = useMemo(() => leaderboardKDA.slice(0, LEADERBOARD_PREVIEW_LIMIT), [leaderboardKDA])
  const topELO = useMemo(() => leaderboardELO.slice(0, LEADERBOARD_PREVIEW_LIMIT), [leaderboardELO])
  const topTBF = useMemo(() => leaderboardTBF.slice(0, LEADERBOARD_PREVIEW_LIMIT), [leaderboardTBF])
  const topRating = useMemo(() => leaderboardRating.slice(0, LEADERBOARD_PREVIEW_LIMIT), [leaderboardRating])
  const topAvgVehicle = useMemo(() => leaderboardAvgVehicle.slice(0, LEADERBOARD_PREVIEW_LIMIT), [leaderboardAvgVehicle])
  const topAvgHeals = useMemo(() => leaderboardAvgHeals.slice(0, LEADERBOARD_PREVIEW_LIMIT), [leaderboardAvgHeals])
  const topAvgRevives = useMemo(() => leaderboardAvgRevives.slice(0, LEADERBOARD_PREVIEW_LIMIT), [leaderboardAvgRevives])
  const playerAchievements = useMemo(() => {
    const byPlayerId = new Map<string, string[]>()

    const register = (players: Array<{ player_id: string; totals: { events: number } }>, achievement: string) => {
      players.slice(0, 3).forEach((player) => {
        if (player.totals.events < MIN_COMPETITIVE_EVENTS_FOR_TOPS) {
          return
        }

        const current = byPlayerId.get(player.player_id) ?? []
        if (!current.includes(achievement)) {
          current.push(achievement)
          byPlayerId.set(player.player_id, current)
        }
      })
    }

    const registerSL = (leaders: Array<{ player_id: string; slGames: number }>, achievement: string) => {
      leaders.slice(0, 3).forEach((leader) => {
        if (leader.slGames < 3) {
          return
        }

        const current = byPlayerId.get(leader.player_id) ?? []
        if (!current.includes(achievement)) {
          current.push(achievement)
          byPlayerId.set(leader.player_id, current)
        }
      })
    }

    register(topKills, "Убийца")
    register(topKD, "Каратель")
    register(topKDA, "Доминатор")
    register(topELO, "MVP")
    register(topTBF, "В тонусе")
    register(topRating, "Эталон")
    register(topWinRate, "Победитель")
    register(topEvents, "Активист")
    register(topRevives, "Спасатель")
    register(topHeals, "Лекарь")
    register(topDowns, "Штурмовик")
    register(topVehicle, "Гроза техники")
    register(topAvgVehicle, "Укротитель машин")
    register(topAvgHeals, "Главврач")
    register(topAvgRevives, "Ангел-хранитель")
    registerSL(slStats, "Сквад-лидер")

    return Object.fromEntries(byPlayerId)
  }, [
    slStats,
    topAvgHeals,
    topAvgRevives,
    topAvgVehicle,
    topDowns,
    topELO,
    topEvents,
    topHeals,
    topKDA,
    topKD,
    topKills,
    topRating,
    topRevives,
    topTBF,
    topVehicle,
    topWinRate,
  ])

  // Player progress chart data
  const selectedProgressEntries = useMemo(() => {
    if (!playerCardData || selectedPlayersForChart.length === 0) return [] as Array<{
      player: Player
      progress: ReturnType<typeof getPlayerProgress>
    }>

    const players = Array.isArray(playerCardData.players) ? playerCardData.players : []
    const playerById = new Map(players.map((player) => [player.player_id, player]))
    const entries: Array<{ player: Player; progress: ReturnType<typeof getPlayerProgress> }> = []

    selectedPlayersForChart.forEach((playerId) => {
      const player = playerById.get(playerId)
      if (!player) return

      const progress = getPlayerProgress(playerId, playerCardData.player_event_stats, playerCardData.events)
      if (progress.length > 0) {
        entries.push({ player, progress })
      }
    })

    return entries
  }, [playerCardData, selectedPlayersForChart])

  const selectedPlayerHistories = useMemo(() => {
    const selectedIds = Array.from(new Set(selectedPlayersForChart))
    const historyByPlayerId = new Map<string, ReturnType<typeof getPlayerGameHistory>>()

    selectedIds.forEach((playerId) => {
      historyByPlayerId.set(
        playerId,
        getPlayerGameHistory(playerId, playerCardPastGames, Math.max(playerCardPastGames.length, 1)),
      )
    })

    return historyByPlayerId
  }, [playerCardPastGames, selectedPlayersForChart])

  const activePlayers = useMemo(() => {
    if (!playerCardData) return []
    const players = Array.isArray(playerCardData.players) ? playerCardData.players : []
    return players.filter((p) => p && p.totals && p.totals.events >= 3)
  }, [playerCardData])

  const avgValues = useMemo(() => {
    if (!playerCardData) {
      return {
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
    }
    return getAverageValues(playerCardData.players)
  }, [playerCardData])

  const maxValues = useMemo(() => {
    if (!playerCardData)
      return {
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

    const allPlayers = Array.isArray(playerCardData.players) ? playerCardData.players : []
    const players = allPlayers.filter((p) => p && p.totals && p.totals.events >= 3)
    return {
      kills: Math.max(...players.map((p) => p.totals.kills), 1),
      deaths: Math.max(...players.map((p) => p.totals.deaths), 1),
      downs: Math.max(...players.map((p) => p.totals.downs), 1),
      revives: Math.max(...players.map((p) => p.totals.revives), 1),
      vehicle: Math.max(...players.map((p) => p.totals.vehicle), 1),
      events: Math.max(...players.map((p) => p.totals.events), 1),
      kd: Math.max(...players.map((p) => p.totals.kd), 1),
      kda: Math.max(...players.map((p) => p.totals.kda), 1),
      win_rate: Math.max(...players.map((p) => p.totals.win_rate), 1),
    }
  }, [playerCardData])

  const skillMaxima = useMemo(() => {
    if (!playerCardData) {
      return {
        kd: 1,
        kda: 1,
        avgRevives: 1,
        avgVehicle: 1,
      }
    }

    const qualifiedPlayers = playerCardData.players.filter((player) => player.totals.events >= MIN_PLAYER_CARD_SAMPLE_SIZE)
    if (qualifiedPlayers.length === 0) {
      return {
        kd: 1,
        kda: 1,
        avgRevives: 1,
        avgVehicle: 1,
      }
    }

    return {
      kd: Math.max(...qualifiedPlayers.map((player) => player.totals.kd), 1),
      kda: Math.max(...qualifiedPlayers.map((player) => player.totals.kda), 1),
      avgRevives: Math.max(...qualifiedPlayers.map((player) => player.totals.avgRevives), 1),
      avgVehicle: Math.max(...qualifiedPlayers.map((player) => player.totals.avgVehicle), 1),
    }
  }, [playerCardData])

  const getRoleIcon = (role: string) => {
    return <RoleIcon role={role} />
  }

  const renderMetricIcon = (
    metric:
      | "kd"
      | "kda"
      | "elo"
      | "tbf"
      | "rating"
      | "kills"
      | "win_rate"
      | "events"
      | "revives"
      | "heals"
      | "downs"
      | "vehicle"
      | "avgVehicle"
      | "avgHeals"
      | "avgRevives",
  ) => {
    const Icon = getMetricIcon(metric)
    return <Icon className="w-4 h-4" />
  }

  const renderAchievementIcon = (achievement: string) => {
    const Icon = getAchievementIcon(achievement)
    return <Icon className="w-4 h-4" />
  }

  const handleOpenGame = useCallback((eventId: string, playerId: string) => {
    startTransition(() => {
      setActiveTab("games")
      setGameFocusTarget({ eventId, playerId })
    })
  }, [])

  const handleOpenCalendarEvent = useCallback((eventId: string) => {
    startTransition(() => {
      setActiveTab("calendar")
      setCalendarFocusEventId(eventId)
    })
    window.setTimeout(() => {
      calendarSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 120)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md px-4 text-center space-y-4">
          <Sparkles className="w-16 h-16 text-christmas-green mx-auto animate-pulse" />
          <div className="space-y-2">
            <p className="text-christmas-gold">{syncProgress?.message ?? seasonalTheme.loadingLabel}</p>
            <Progress value={syncProgress?.percent ?? 5} className="h-2 bg-muted/30" />
            <p className="text-xs text-muted-foreground">
              {Math.round(syncProgress?.percent ?? 5)}% • подготовка статистики и матчевого протокола
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!rawData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-2 text-center">
          <p className="text-christmas-red">Ошибка загрузки данных с сервера</p>
          {loadError && <p className="text-xs text-muted-foreground">{loadError}</p>}
        </div>
      </div>
    )
  }

  if (!data || !overallStats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-christmas-red">Ошибка обработки данных</p>
      </div>
    )
  }

  // Filter out empty role leaderboards
  const nonEmptyRoleLeaderboards = roleLeaderboards.filter(({ players }) => players.length > 0)

  const leaderboardCards: LeaderboardCardConfig[] = [
    {
      key: "kd",
      render: (isCollapsed: boolean, onToggle: () => void) => (
        <Leaderboard
          title="Топ по K/D"
          players={leaderboardKD}
          stat="kd"
          formatValue={(v) => v.toFixed(2)}
          playerAchievements={playerAchievements}
          icon={renderAchievementIcon("Каратель")}
          variant="christmas"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggle}
        />
      ),
    },
    {
      key: "kda",
      render: (isCollapsed: boolean, onToggle: () => void) => (
        <Leaderboard
          title="Топ по KDA"
          players={leaderboardKDA}
          stat="kda"
          formatValue={(v) => v.toFixed(2)}
          playerAchievements={playerAchievements}
          icon={renderAchievementIcon("Доминатор")}
          variant="christmas"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggle}
        />
      ),
    },
    {
      key: "elo",
      render: (isCollapsed: boolean, onToggle: () => void) => (
        <Leaderboard
          title="Топ по ELO"
          players={leaderboardELO}
          stat="elo"
          formatValue={(v) => v.toFixed(1)}
          playerAchievements={playerAchievements}
          icon={renderAchievementIcon("MVP")}
          variant="christmas"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggle}
        />
      ),
    },
    {
      key: "tbf",
      render: (isCollapsed: boolean, onToggle: () => void) => (
        <Leaderboard
          title="Топ по ТБФ"
          players={leaderboardTBF}
          stat="tbf"
          formatValue={(v) => v.toFixed(1)}
          playerAchievements={playerAchievements}
          icon={renderAchievementIcon("В тонусе")}
          variant="christmas"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggle}
        />
      ),
    },
    {
      key: "rating",
      render: (isCollapsed: boolean, onToggle: () => void) => (
        <Leaderboard
          title="Топ по ОР"
          players={leaderboardRating}
          stat="rating"
          formatValue={(v) => v.toFixed(1)}
          playerAchievements={playerAchievements}
          icon={renderAchievementIcon("Эталон")}
          variant="christmas"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggle}
        />
      ),
    },
    {
      key: "kills",
      render: (isCollapsed: boolean, onToggle: () => void) => (
        <Leaderboard
          title="Топ по убийствам"
          players={leaderboardKills}
          stat="kills"
          playerAchievements={playerAchievements}
          icon={renderAchievementIcon("Убийца")}
          variant="christmas"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggle}
        />
      ),
    },
    {
      key: "win_rate",
      render: (isCollapsed: boolean, onToggle: () => void) => (
        <Leaderboard
          title="Топ победителей"
          players={leaderboardWinRate}
          stat="win_rate"
          formatValue={(v) => `${(v * 100).toFixed(0)}%`}
          playerAchievements={playerAchievements}
          icon={renderAchievementIcon("Победитель")}
          variant="christmas"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggle}
        />
      ),
    },
    {
      key: "events",
      render: (isCollapsed: boolean, onToggle: () => void) => (
        <Leaderboard
          title="Топ по активности"
          players={leaderboardEvents}
          stat="events"
          formatValue={(v) => `${v} игр`}
          playerAchievements={playerAchievements}
          icon={renderAchievementIcon("Активист")}
          variant="christmas"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggle}
        />
      ),
    },
    {
      key: "revives",
      render: (isCollapsed: boolean, onToggle: () => void) => (
        <Leaderboard
          title="Топ по поднятиям"
          players={leaderboardRevives}
          stat="revives"
          playerAchievements={playerAchievements}
          icon={renderAchievementIcon("Спасатель")}
          variant="christmas"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggle}
        />
      ),
    },
    {
      key: "heals",
      render: (isCollapsed: boolean, onToggle: () => void) => (
        <Leaderboard
          title="Топ по хилу"
          players={leaderboardHeals}
          stat="heals"
          playerAchievements={playerAchievements}
          icon={renderAchievementIcon("Лекарь")}
          variant="christmas"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggle}
        />
      ),
    },
    {
      key: "downs",
      render: (isCollapsed: boolean, onToggle: () => void) => (
        <Leaderboard
          title="Топ по нокам"
          players={leaderboardDowns}
          stat="downs"
          playerAchievements={playerAchievements}
          icon={renderAchievementIcon("Штурмовик")}
          variant="christmas"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggle}
        />
      ),
    },
    {
      key: "vehicle",
      render: (isCollapsed: boolean, onToggle: () => void) => (
        <Leaderboard
          title="Топ по выбитой технике"
          players={leaderboardVehicle}
          stat="vehicle"
          playerAchievements={playerAchievements}
          icon={renderAchievementIcon("Гроза техники")}
          variant="christmas"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggle}
        />
      ),
    },
    {
      key: "avgVehicle",
      render: (isCollapsed: boolean, onToggle: () => void) => (
        <AvgStatLeaderboard
          title="Топ по средней технике за матч"
          players={leaderboardAvgVehicle}
          avgStat="avgVehicle"
          totalStat="vehicle"
          formatValue={(v) => v.toFixed(2)}
          playerAchievements={playerAchievements}
          icon={renderAchievementIcon("Укротитель машин")}
          variant="christmas"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggle}
        />
      ),
    },
    {
      key: "avgHeals",
      render: (isCollapsed: boolean, onToggle: () => void) => (
        <AvgStatLeaderboard
          title="Топ по среднему хилу за матч"
          players={leaderboardAvgHeals}
          avgStat="avgHeals"
          totalStat="heals"
          formatValue={(v) => v.toFixed(2)}
          playerAchievements={playerAchievements}
          icon={renderAchievementIcon("Главврач")}
          variant="christmas"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggle}
        />
      ),
    },
    {
      key: "avgRevives",
      render: (isCollapsed: boolean, onToggle: () => void) => (
        <AvgStatLeaderboard
          title="Топ по среднему поднятию за матч"
          titleClassName="whitespace-normal text-[11px] leading-tight tracking-[0.08em]"
          players={leaderboardAvgRevives}
          avgStat="avgRevives"
          totalStat="revives"
          formatValue={(v) => v.toFixed(2)}
          playerAchievements={playerAchievements}
          icon={renderAchievementIcon("Ангел-хранитель")}
          variant="christmas"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggle}
        />
      ),
    },
  ] as const

  const leaderboardRows = leaderboardCards.reduce<LeaderboardCardConfig[][]>((rows, card, index) => {
    if (index % 3 === 0) {
      rows.push([card])
    } else {
      rows[rows.length - 1].push(card)
    }
    return rows
  }, [])

  const roleRows = nonEmptyRoleLeaderboards.reduce<typeof nonEmptyRoleLeaderboards[]>((rows, entry, index) => {
    if (index % 3 === 0) {
      rows.push([entry])
    } else {
      rows[rows.length - 1].push(entry)
    }
    return rows
  }, [])

  type RecordCard = {
    key: string
    title: string
    metric: keyof typeof recordMatchesByMetric
    matches: typeof recordMatchesByMetric[keyof typeof recordMatchesByMetric]
  }

  const recordCards: RecordCard[] = [
    { key: "kd", title: "Рекорды по K/D", metric: "kd", matches: recordMatchesByMetric.kd },
    { key: "kda", title: "Рекорды по KDA", metric: "kda", matches: recordMatchesByMetric.kda },
    { key: "elo", title: "Рекорды по ELO", metric: "elo", matches: recordMatchesByMetric.elo },
    { key: "kills", title: "Рекорды по убийствам", metric: "kills", matches: recordMatchesByMetric.kills },
    { key: "downs", title: "Рекорды по нокам", metric: "downs", matches: recordMatchesByMetric.downs },
    { key: "deaths", title: "Рекорды по смертям", metric: "deaths", matches: recordMatchesByMetric.deaths },
    { key: "revives", title: "Рекорды по поднятиям", metric: "revives", matches: recordMatchesByMetric.revives },
    { key: "heals", title: "Рекорды по хилу", metric: "heals", matches: recordMatchesByMetric.heals },
    { key: "vehicle", title: "Рекорды по технике", metric: "vehicle", matches: recordMatchesByMetric.vehicle },
  ] as const

  const recordRows = recordCards.reduce<RecordCard[][]>((rows, entry, index) => {
    if (index % 3 === 0) {
      rows.push([entry])
    } else {
      rows[rows.length - 1].push(entry)
    }
    return rows
  }, [])

  const toggleLeaderboardRow = (rowIndex: number) => {
    setExpandedLeaderboardRows((current) =>
      current.includes(rowIndex) ? current.filter((value) => value !== rowIndex) : [...current, rowIndex],
    )
  }

  const toggleRoleRow = (rowIndex: number) => {
    setExpandedRoleRows((current) => (current.includes(rowIndex) ? current.filter((value) => value !== rowIndex) : [...current, rowIndex]))
  }

  const toggleRecordRow = (rowIndex: number) => {
    setExpandedRecordRows((current) =>
      current.includes(rowIndex) ? current.filter((value) => value !== rowIndex) : [...current, rowIndex],
    )
  }

  return (
    <div className="min-h-screen bg-background relative" style={seasonalVariables}>
      <div
        className="fixed inset-0 z-0"
        style={{
          opacity: seasonalTheme.backgroundOpacity,
          backgroundImage: seasonalTheme.backgroundImage,
          backgroundSize: seasonalTheme.backgroundSize,
          backgroundPosition: seasonalTheme.backgroundPosition,
          backgroundRepeat: seasonalTheme.backgroundRepeat,
          backgroundBlendMode: seasonalTheme.backgroundBlendMode,
          backgroundAttachment: "fixed",
          transition: "opacity 280ms ease-out, filter 280ms ease-out",
          filter: "saturate(1.02) contrast(1.03)",
        }}
      />
      <div className="fixed inset-0 z-0" style={{ background: seasonalTheme.overlayGradient }} />

      {seasonalTheme.showSnowfall && <Snowfall />}
      <SeasonalHeader
        mdcPlayersCount={mdcRosterCount}
        gravePlayersCount={graveRosterCount}
        theme={seasonalTheme}
        futureEvents={futureEvents}
        onOpenCalendarEvent={(event) => handleOpenCalendarEvent(event.event_id)}
      />

      <main className="container mx-auto px-4 py-6 space-y-6 relative z-10">
        <section>
          <Card className="border-christmas-gold/20 bg-card/60">
            <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`truncate text-xs font-medium ${syncStatusClassName}`}>{syncCompactLabel}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{syncCompactHint}</p>
                  </div>
                  <p className={`shrink-0 text-[11px] font-medium ${syncMetaClassName}`}>
                    {syncProgress ? `${Math.round(syncProgress.percent)}%` : isCacheProbablyStale ? "нужна синхр." : "готово"}
                  </p>
                </div>
                <div className="mt-2" style={syncProgressStyle}>
                  <Progress value={syncProgress?.percent ?? 100} className="h-1.5 bg-muted/30" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-christmas-gold/30 bg-background/50 text-christmas-snow hover:bg-christmas-gold/10"
                  onClick={() => void loadData(true, true)}
                  disabled={isRefreshing}
                >
                  <RotateCcw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                  {isRefreshing ? "Синхронизируем..." : "Обновить (Shift+R)"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Tabs for different views - Removed export tab */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full flex flex-wrap justify-start gap-2 bg-transparent border-0 h-auto p-0">
            <TabsTrigger
              value="calendar"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-amber-500/30 bg-amber-500/10 text-christmas-snow data-[state=active]:bg-amber-500 data-[state=active]:border-amber-500 data-[state=active]:text-slate-950 hover:bg-amber-500/20 transition-all"
            >
              Календарь
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-violet-500/30 bg-violet-500/10 text-christmas-snow data-[state=active]:bg-violet-500 data-[state=active]:border-violet-500 data-[state=active]:text-white hover:bg-violet-500/20 transition-all"
            >
              Итоги
            </TabsTrigger>
            <TabsTrigger
              value="leaderboards"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-christmas-red/30 bg-christmas-red/10 text-christmas-snow data-[state=active]:bg-christmas-red data-[state=active]:border-christmas-red data-[state=active]:text-white hover:bg-christmas-red/20 transition-all"
            >
              Лидерборды
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-christmas-green/30 bg-christmas-green/10 text-christmas-snow data-[state=active]:bg-christmas-green data-[state=active]:border-christmas-green data-[state=active]:text-white hover:bg-christmas-green/20 transition-all"
            >
              Роли
            </TabsTrigger>
            <TabsTrigger
              value="records"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-rose-500/30 bg-rose-500/10 text-christmas-snow data-[state=active]:bg-rose-500 data-[state=active]:border-rose-500 data-[state=active]:text-white hover:bg-rose-500/20 transition-all"
            >
              Рекорды
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-blue-500/30 bg-blue-500/10 text-christmas-snow data-[state=active]:bg-blue-500 data-[state=active]:border-blue-500 data-[state=active]:text-white hover:bg-blue-500/20 transition-all"
            >
              Игроки
            </TabsTrigger>
            <TabsTrigger
              value="games"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-cyan-500/30 bg-cyan-500/10 text-christmas-snow data-[state=active]:bg-cyan-500 data-[state=active]:border-cyan-500 data-[state=active]:text-slate-950 hover:bg-cyan-500/20 transition-all"
            >
              Игры
            </TabsTrigger>
            <TabsTrigger
              value="group"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-pink-500/30 bg-pink-500/10 text-christmas-snow data-[state=active]:bg-pink-500 data-[state=active]:border-pink-500 data-[state=active]:text-white hover:bg-pink-500/20 transition-all"
            >
              Отряды
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4" ref={calendarSectionRef}>
            <GamesCalendar games={pastGames} onOpenGame={(eventId) => handleOpenGame(eventId, "")} focusedEventId={calendarFocusEventId} />
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
        <Card className="border-christmas-gold/20 bg-card/60">
          <CardContent className="flex flex-col gap-3 pt-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-christmas-snow">Фильтры</p>
                <p className="text-xs text-muted-foreground">{sliceSummaryLabel}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-christmas-gold/20 bg-background/40 text-christmas-snow hover:bg-christmas-gold/10"
                onClick={resetSliceFilters}
                disabled={!hasExtendedSliceFilters}
              >
                Сбросить фильтры
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Период</p>
                <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as StatsPeriod)}>
                  <SelectTrigger className="border-christmas-gold/35 bg-background/50 text-christmas-snow">
                    <SelectValue placeholder="Период" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATS_PERIOD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2" data-testid="global-tag-filter">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Тег</p>
                <MultiValueFilter
                  options={tagOptions}
                  selected={effectiveSelectedTags}
                  onSelectionChange={setSelectedTags}
                  placeholder="Все теги"
                  searchPlaceholder="Поиск по тегам..."
                  allLabel="Выбрать все теги"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Тип</p>
                <MultiValueFilter
                  options={eventTypeOptions}
                  selected={selectedEventTypes}
                  onSelectionChange={setSelectedEventTypes}
                  placeholder="Любые типы"
                  searchPlaceholder="Поиск по типам..."
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Карта</p>
                <MultiValueFilter
                  options={mapOptions}
                  selected={selectedMaps}
                  onSelectionChange={setSelectedMaps}
                  placeholder="Любые карты"
                  searchPlaceholder="Поиск по картам..."
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Фракция</p>
                <MultiValueFilter
                  options={factionOptions}
                  selected={selectedFactions}
                  onSelectionChange={setSelectedFactions}
                  placeholder="Любые фракции"
                  searchPlaceholder="Поиск по фракциям..."
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Оппонент</p>
                <MultiValueFilter
                  options={opponentOptions}
                  selected={selectedOpponents}
                  onSelectionChange={setSelectedOpponents}
                  placeholder="Любые оппоненты"
                  searchPlaceholder="Поиск по кланам и оппонентам..."
                />
              </div>
            </div>
            {selectedPeriod === "custom" && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <label className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Дата от</span>
                  <Popover open={isCustomDateFromOpen} onOpenChange={setIsCustomDateFromOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between border-christmas-gold/35 bg-background/50 text-christmas-snow hover:bg-background/60 hover:text-christmas-snow"
                      >
                        <span className={customDateFrom ? "text-christmas-snow" : "text-muted-foreground"}>
                          {formatDateFilterLabel(customDateFrom)}
                        </span>
                        <Calendar className="h-4 w-4 text-christmas-gold" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto border-christmas-gold/20 bg-card/95 p-0">
                      <DatePickerCalendar
                        mode="single"
                        selected={parseDateInputValue(customDateFrom)}
                        defaultMonth={parseDateInputValue(customDateFrom)}
                        onSelect={(date) => {
                          if (!date) return
                          setCustomDateFrom(formatDateInputValue(date))
                          setIsCustomDateFromOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Дата до</span>
                  <Popover open={isCustomDateToOpen} onOpenChange={setIsCustomDateToOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between border-christmas-gold/35 bg-background/50 text-christmas-snow hover:bg-background/60 hover:text-christmas-snow"
                      >
                        <span className={customDateTo ? "text-christmas-snow" : "text-muted-foreground"}>
                          {formatDateFilterLabel(customDateTo)}
                        </span>
                        <Calendar className="h-4 w-4 text-christmas-gold" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto border-christmas-gold/20 bg-card/95 p-0">
                      <DatePickerCalendar
                        mode="single"
                        selected={parseDateInputValue(customDateTo)}
                        defaultMonth={parseDateInputValue(customDateTo)}
                        onSelect={(date) => {
                          if (!date) return
                          setCustomDateTo(formatDateInputValue(date))
                          setIsCustomDateToOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        <OverallStatsPanel stats={overallStats} />

        {/* Event Types Summary - Compact */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-christmas-snow">
            <Sparkles className="h-5 w-5 text-christmas-gold" />
            Статистика по типам событий
          </h2>
        
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
            {eventTypeStats.map((et) => {
              const isLecture = isLectureEventType(et.type);
              
              return (
                <Card key={et.type} className="h-full border-christmas-gold/20">
                  <CardContent className="flex h-full flex-col justify-center gap-0.5 px-1.5 py-1 text-center">
                    <p className="line-clamp-2 text-[12px] font-medium leading-[1.08] text-christmas-snow">{et.type}</p>
                    <p className="text-[1.55rem] font-bold leading-none text-christmas-snow">{et.count}</p>
                    <p className={`text-[10px] leading-none text-muted-foreground ${isLecture ? "opacity-0" : ""}`} aria-hidden={isLecture}>
                      {et.resolved > 0 ? `WR ${((et.wins / et.resolved) * 100).toFixed(0)}%` : "без результата"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Charts Section */}
        <section className="grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <DailyActivityChart
            wins={overallStats.wins}
            losses={overallStats.losses}
          />
          <ActivityChart data={monthlyActivity} />
          <WeeklyActivityChart data={weeklyParticipation} />
          <WinrateProgressChart data={dailyActivity} />
          <MapChart data={mapStats} />
          <RoleChart data={roleStats} />
        </section>
          </TabsContent>

          {/* Leaderboards Tab */}
          <TabsContent value="leaderboards" className="space-y-4">
            <DataTabFilterCard filters={leaderboardFilters} />
            <p className="text-xs text-muted-foreground">
              В топ включены игроки с не менее чем {MIN_COMPETITIVE_EVENTS_FOR_TOPS} играми.
            </p>
            <div className="space-y-4">
              {leaderboardRows.map((row, rowIndex) => {
                const isExpanded = expandedLeaderboardRows.includes(rowIndex)
                const isCollapsed = !isExpanded
                return (
                  <div key={`leaderboard-row-${rowIndex}`} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {row.map((card) => card.render(isCollapsed, () => toggleLeaderboardRow(rowIndex)))}
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            <DataTabFilterCard
              filters={roleFilters}
              extraHasFilters={selectedRoleMetric !== "kd"}
              onReset={() => {
                roleFilters.reset()
                setSelectedRoleMetric("kd")
              }}
              leadingFilter={
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Критерий</p>
                  <Select
                    value={selectedRoleMetric}
                    onValueChange={(value) => setSelectedRoleMetric(value as RoleLeaderboardMetric)}
                  >
                    <SelectTrigger className="border-christmas-gold/35 bg-background/50 text-christmas-snow">
                      <SelectValue placeholder="Критерий" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_METRIC_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              }
            />
            <div className="space-y-4">
              {roleRows.map((row, rowIndex) => {
                const isExpanded = expandedRoleRows.includes(rowIndex)
                const isCollapsed = !isExpanded
                return (
                  <div key={`role-row-${rowIndex}`} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {row.map(({ role, players }) => (
                      <RoleLeaderboard
                        key={role}
                        players={players}
                        role={role}
                        metric={selectedRoleMetric}
                        playerAchievements={playerAchievements}
                        icon={getRoleIcon(role)}
                        isCollapsed={isCollapsed}
                        onToggleCollapse={() => toggleRoleRow(rowIndex)}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
            {nonEmptyRoleLeaderboards.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-christmas-snow">Нет данных по ролям для выбранных тегов</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="records" className="space-y-4">
            <DataTabFilterCard filters={recordFilters} />
            <p className="text-xs text-muted-foreground">
              Рекорды ниже показаны за одну отдельную игру. В каждой категории у игрока берётся только лучший матч.
            </p>
            <div className="space-y-4">
              {recordRows.map((row, rowIndex) => {
                const isExpanded = expandedRecordRows.includes(rowIndex)
                const isCollapsed = !isExpanded
                return (
                  <div key={`record-row-${rowIndex}`} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {row.map((entry) => (
                      <BestMatches
                        key={entry.key}
                        title={entry.title}
                        metric={entry.metric}
                        matches={entry.matches}
                        players={(recordData?.players ?? data.players).map((player) => ({ player_id: player.player_id, steam_id: player.steam_id }))}
                        isCollapsed={isCollapsed}
                        onToggleCollapse={() => toggleRecordRow(rowIndex)}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="games" className="space-y-4">
            <EventsExplorer
              games={pastGames}
              players={data.players}
              squadDomain={data.dictionaries?.squads ?? []}
              focusTarget={gameFocusTarget}
            />
          </TabsContent>

          {/* Player Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            <DataTabFilterCard filters={playerFilters} />
            <Card className="border-christmas-gold/20">
              <CardHeader>
                <CardTitle className="text-base text-christmas-snow">Выберите игроков для просмотра статистики</CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerSelector
                  players={activePlayers}
                  selected={selectedPlayersForChart}
                  onSelectionChange={setSelectedPlayersForChart}
                  placeholder="Выбор игрока"
                />
              </CardContent>
            </Card>

            {selectedProgressEntries.length > 0 && (
              <div className="space-y-4">
                {selectedProgressEntries.map(({ player, progress }, index) => (
                  <div key={player.player_id}>
                    <PlayerCard
                      player={player}
                      rawPlayer={data.players.find((entry) => entry.player_id === player.player_id)}
                      rank={index + 1}
                      footerLabel={seasonalTheme.summaryLabel}
                      achievements={playerAchievements[player.player_id] ?? []}
                      playerStats={playerCardData?.player_event_stats ?? []}
                      matchHistory={selectedPlayerHistories.get(player.player_id) ?? []}
                      progress={progress}
                      roleMetric={selectedRoleMetric}
                      roleMetricOptions={ROLE_METRIC_OPTIONS}
                      roleMetricMaxima={roleMetricMaxima}
                      roleDomain={playerCardData?.dictionaries?.roles ?? []}
                      squadDomain={playerCardData?.dictionaries?.squads ?? []}
                      events={playerCardData?.events ?? []}
                      skillMaxima={skillMaxima}
                      activityAverage={avgValues.events}
                      activityMax={maxValues.events}
                      onRoleMetricChange={(value) => setSelectedRoleMetric(value)}
                      onOpenGame={handleOpenGame}
                      layout="expanded"
                    />
                  </div>
                ))}
              </div>
            )}

            {selectedPlayersForChart.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {(() => {
                  const EmptyStateIcon = getMetricIcon("tbf")
                  return <EmptyStateIcon className="w-12 h-12 mx-auto mb-4 text-christmas-gold opacity-50" />
                })()}
                <p className="text-christmas-snow">Выберите одного или нескольких игроков для просмотра статистики</p>
              </div>
            )}

            {selectedPlayersForChart.length > 0 && selectedProgressEntries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-christmas-snow">Для выбранных игроков пока нет данных статистики</p>
              </div>
            )}
          </TabsContent>

          {/* Squads Tab */}
          <TabsContent value="group" className="space-y-4">
            <Card className="border-christmas-gold/20 bg-card/60">
              <CardContent className="space-y-3 pt-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="grid w-full gap-3 md:grid-cols-3 xl:max-w-[560px] xl:flex-1">
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Период</p>
                      <Select value={groupFilters.selectedPeriod} onValueChange={(value) => groupFilters.setSelectedPeriod(value as StatsPeriod)}>
                        <SelectTrigger className="border-christmas-gold/35 bg-background/50 text-christmas-snow">
                          <SelectValue placeholder="Период" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATS_PERIOD_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {groupFilters.selectedPeriod === "custom" ? (
                      <>
                        <label className="space-y-2">
                          <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">Дата от</span>
                          <DateFilterPicker value={groupFilters.customDateFrom} onChange={groupFilters.setCustomDateFrom} />
                        </label>
                        <label className="space-y-2">
                          <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">Дата до</span>
                          <DateFilterPicker value={groupFilters.customDateTo} onChange={groupFilters.setCustomDateTo} />
                        </label>
                      </>
                    ) : (
                      <div className="flex items-end justify-end md:col-span-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-christmas-gold/20 bg-background/40 text-christmas-snow hover:bg-christmas-gold/10"
                          onClick={groupFilters.reset}
                          disabled={!groupFilters.hasFilters}
                        >
                          Сбросить фильтр
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 xl:max-w-xl">
                    <p className="text-sm font-medium text-christmas-snow">Отряды по цветам</p>
                    <p className="text-xs text-muted-foreground">
                      Общие показатели, последние матчи, составы и сравнение динамики между отрядами.
                    </p>
                  </div>
                </div>
                {groupFilters.selectedPeriod === "custom" ? (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-christmas-gold/20 bg-background/40 text-christmas-snow hover:bg-christmas-gold/10"
                      onClick={groupFilters.reset}
                      disabled={!groupFilters.hasFilters}
                    >
                      Сбросить фильтр
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
            <SquadOverview
              games={groupPastGames}
              players={groupData?.players ?? data.players}
              squadDomain={groupData?.dictionaries?.squads ?? data.dictionaries?.squads ?? []}
              onOpenGame={(eventId) => handleOpenGame(eventId, "")}
              onOpenPlayer={(playerId) => {
                setSelectedPlayersForChart([playerId])
                setActiveTab("progress")
              }}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
