"use client"

import type React from "react"

import { startTransition, useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Leaderboard } from "@/components/leaderboard"
import { AvgStatLeaderboard } from "@/components/avg-stat-leaderboard"
import { MapChart } from "@/components/charts/map-chart"
import { ActivityChart } from "@/components/charts/activity-chart"
import { RoleChart } from "@/components/charts/role-chart"
import { DailyActivityChart } from "@/components/charts/daily-activity-chart"
import { WeeklyActivityChart } from "@/components/charts/weekly-activity-chart"
import { WinrateProgressChart } from "@/components/charts/winrate-progress-chart"
import { PlayerProgressChart } from "@/components/charts/player-progress-chart"
import { SLLeaderboard } from "@/components/charts/sl-leaderboard"
import { RoleLeaderboard } from "@/components/charts/role-leaderboard"
import { BestMatches } from "@/components/charts/best-matches"
import { PlayerCard } from "@/components/player-card"
import { PlayerSelector } from "@/components/player-selector"
import { GroupStatsCard } from "@/components/group-stats-card"
import { SquadBuilder } from "@/components/squad-builder"
import { Snowfall } from "@/components/snowfall"
import { SeasonalHeader } from "@/components/seasonal-header"
import { OverallStatsPanel } from "@/components/overall-stats-panel"
import { EventsExplorer } from "@/components/events-explorer"
import {
  type MDCData,
  type Player,
  getTopPlayersByStat,
  getMapStats,
  getEventTypeStats,
  getOverallStats,
  getRoleStats,
  getRoleDataCoverage,
  getMonthlyActivity,
  getDailyActivity,
  getWeeklyParticipation,
  getSLStats,
  getTopByRole,
  getPastGames,
  getPlayerGameHistory,
  getPlayerProgress,
  getBestMatches,
  getUniqueTags,
  getUniqueRoles,
  filterDataByTags,
  getTopByWinRate,
  getTopByVehicle,
  getTopByKDA,
  getTopByAvgVehicle,
  getTopByAvgRevives,
  getMaxKDByRole,
  getAverageValues,
  calculateRelativeThresholds,
} from "@/lib/data-utils"
import { fetchAllData, type SyncProgressUpdate } from "@/lib/api"
import { getSeasonalTheme, type SeasonalTheme } from "@/lib/seasonal-theme"
import {
  Trophy,
  Crosshair,
  Target,
  Users,
  Calendar,
  Shield,
  Heart,
  Zap,
  Star,
  Sparkles,
  Syringe,
  Car,
  TrendingUp,
  RefreshCw,
  RotateCcw,
} from "lucide-react"

const API_CACHE_KEY = "mdc-api-cache-v5"
const API_CACHE_TTL_MS = 5 * 60 * 1000

type CachedPayload = {
  savedAt: number
  data: MDCData
}

function readCachedData(): CachedPayload | null {
  try {
    const raw = localStorage.getItem(API_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedPayload
    if (!parsed || typeof parsed.savedAt !== "number" || !parsed.data) return null
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
      data,
    }
    localStorage.setItem(API_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore cache write errors (e.g. private mode quota restrictions)
  }
}

function clearCachedData(): void {
  try {
    localStorage.removeItem(API_CACHE_KEY)
  } catch {
    // Ignore cache clear errors
  }
}

type SyncMode = "auto" | "refresh" | "reset"

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

function getNextRecommendedSyncDate(referenceDate: Date): Date {
  const recommendedDays = [3, 5, 6, 0] // Wed, Fri, Sat, Sun
  const base = new Date(referenceDate)
  base.setHours(0, 0, 0, 0)

  let minDiff = 8
  for (const weekday of recommendedDays) {
    const rawDiff = (weekday - base.getDay() + 7) % 7
    const diff = rawDiff === 0 ? 7 : rawDiff
    if (diff < minDiff) {
      minDiff = diff
    }
  }

  const result = new Date(base)
  result.setDate(base.getDate() + minDiff)
  return result
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
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("leaderboards")
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [selectedPlayersForChart, setSelectedPlayersForChart] = useState<string[]>([])
  const [gameFocusTarget, setGameFocusTarget] = useState<{ eventId: string; playerId: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [syncProgress, setSyncProgress] = useState<SyncProgressState | null>(null)
  const [lastSyncReport, setLastSyncReport] = useState<SyncReport | null>(null)
  const rawDataRef = useRef<MDCData | null>(null)

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
    const syncMode: SyncMode = resetCache ? "reset" : forceRefresh ? "refresh" : "auto"

    if (resetCache) {
      clearCachedData()
    } else if (cached) {
      setRawData(cached.data)
      setLoading(false)
      setLoadError(null)
      setLastUpdatedAt(cached.savedAt)
    }

    // In regular page reload flow, keep cached snapshot and skip network sync.
    // API sync is manual via "Обновить API" or "Сбросить кэш и обновить API".
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
        void loadData(true, false)
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

  const lastUpdatedAtLabel = useMemo(() => {
    if (!lastUpdatedAt) {
      return "нет данных о синхронизации"
    }

    return new Date(lastUpdatedAt).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
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

  const syncProgressStyle = useMemo(
    () =>
      ({
        "--primary":
          syncProgress?.stage === "error"
            ? "var(--christmas-red)"
            : syncProgress?.stage === "done"
            ? "var(--christmas-green)"
            : "var(--christmas-gold)",
      }) as ThemeVariableStyle,
    [syncProgress],
  )

  const lastSyncPagesLabel = useMemo(() => {
    const pagesDone = syncProgress?.pagesDone ?? lastSyncReport?.protocolPagesDone ?? null
    const pagesTotal = syncProgress?.pagesTotal ?? lastSyncReport?.protocolPagesTotal ?? null

    if (pagesTotal && pagesTotal > 0) {
      return `${pagesDone ?? pagesTotal}/${pagesTotal} стр.`
    }
    if (pagesDone && pagesDone > 0) {
      return `${pagesDone} стр.`
    }
    return "н/д"
  }, [lastSyncReport, syncProgress])

  const lastSyncRoleRecordsCount = useMemo(() => {
    if (lastSyncReport) return lastSyncReport.currentRoleRecords
    if (rawData) return rawData.player_event_stats.length
    return 0
  }, [lastSyncReport, rawData])

  const lastSyncDurationLabel = useMemo(() => {
    if (!lastSyncReport?.durationMs || lastSyncReport.durationMs <= 0) {
      return "н/д"
    }

    const seconds = Math.max(1, Math.round(lastSyncReport.durationMs / 1000))
    if (seconds < 60) {
      return `${seconds} сек.`
    }

    const minutes = Math.floor(seconds / 60)
    const restSeconds = seconds % 60
    if (restSeconds === 0) {
      return `${minutes} мин.`
    }

    return `${minutes} мин. ${restSeconds} сек.`
  }, [lastSyncReport])

  const nextRecommendedUpdateLabel = useMemo(() => {
    const referenceDate = lastUpdatedAt ? new Date(lastUpdatedAt) : new Date()
    const nextDate = getNextRecommendedSyncDate(referenceDate)
    return nextDate.toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }, [lastUpdatedAt])

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

  const latestWeekNewEvents = useMemo(() => {
    return lastSyncReport?.addedEventsLastWeek ?? []
  }, [lastSyncReport])

  const availableTags = useMemo(() => {
    if (!rawData) return []
    const players = Array.isArray(rawData.players) ? rawData.players : []
    return getUniqueTags(players, rawData.dictionaries?.tags ?? [])
  }, [rawData])

  useEffect(() => {
    if (availableTags.length > 0 && selectedTags.length === 0) {
      const excludedTags = ["C4", "NKLV", "【UNP】", "Ветеран", "『FW』"]
      const defaultTags = availableTags.filter((tag) => !excludedTags.includes(tag))
      setSelectedTags(defaultTags)
    }
  }, [availableTags, selectedTags.length])

  const data = useMemo(() => {
    if (!rawData) return null
    return filterDataByTags(rawData, selectedTags)
  }, [rawData, selectedTags])

  const uniqueRoles = useMemo(() => {
    if (!data) return []
    const playerStats = Array.isArray(data.player_event_stats) ? data.player_event_stats : []
    return getUniqueRoles(playerStats, data.dictionaries?.roles ?? [])
  }, [data])

  // Core stats
  const overallStats = useMemo(() => (data ? getOverallStats(data) : null), [data])
  const mapStats = useMemo(() => (data ? getMapStats(data.events, data.dictionaries?.maps ?? []) : []), [data])
  const eventTypeStats = useMemo(
    () => (data ? getEventTypeStats(data.events, data.dictionaries?.event_types ?? []) : []),
    [data],
  )
  const roleStats = useMemo(() => (data ? getRoleStats(data.player_event_stats, data.dictionaries?.roles ?? []) : []), [data])
  const roleDataCoverage = useMemo(
    () => (data ? getRoleDataCoverage(data.events, data.player_event_stats) : null),
    [data],
  )
  const monthlyActivity = useMemo(() => (data ? getMonthlyActivity(data.events) : []), [data])

  // New detailed stats
  const dailyActivity = useMemo(() => (data ? getDailyActivity(data.events) : []), [data])
  const weeklyParticipation = useMemo(
    () => (data ? getWeeklyParticipation(data.events, data.player_event_stats) : []),
    [data],
  )
  const slStats = useMemo(() => (data ? getSLStats(data.player_event_stats, data.events, data.players) : []), [data])
  const bestMatches = useMemo(() => (data ? getBestMatches(data.player_event_stats, data.events, 10) : []), [data])
  const pastGames = useMemo(() => {
    if (!data) return []
    const protocolEvents = rawData?.events ?? data.events
    return getPastGames(protocolEvents, data.player_event_stats, data.players, data.dictionaries?.squads ?? [])
  }, [data, rawData])

  const roleLeaderboards = useMemo(() => {
    if (!data) return []
    return uniqueRoles.map((role) => ({
      role,
      players: getTopByRole(data.player_event_stats, data.players, role, 10, data.dictionaries?.roles ?? []),
    }))
  }, [data, uniqueRoles])

  const maxRoleKD = useMemo(() => {
    if (!data) return {}
    return getMaxKDByRole(data.player_event_stats)
  }, [data])

  // Basic leaderboards
  const topKills = useMemo(() => (data ? getTopPlayersByStat(data.players, "kills", 10) : []), [data])
  const topKD = useMemo(() => (data ? getTopPlayersByStat(data.players, "kd", 10) : []), [data])
  const topWinRate = useMemo(() => (data ? getTopByWinRate(data.players, 5, 10) : []), [data])
  const topEvents = useMemo(() => (data ? getTopPlayersByStat(data.players, "events", 10) : []), [data])
  const topRevives = useMemo(() => (data ? getTopPlayersByStat(data.players, "revives", 10) : []), [data])
  const topDowns = useMemo(() => (data ? getTopPlayersByStat(data.players, "downs", 10) : []), [data])
  const topVehicle = useMemo(() => (data ? getTopByVehicle(data.players, 5) : []), [data])
  const topKDA = useMemo(() => (data ? getTopByKDA(data.players, 10) : []), [data])

  const topAvgVehicle = useMemo(() => (data ? getTopByAvgVehicle(data.players, 3, 10) : []), [data])
  const topAvgRevives = useMemo(() => (data ? getTopByAvgRevives(data.players, 3, 10) : []), [data])

  // Player progress chart data
  const selectedProgressEntries = useMemo(() => {
    if (!data || selectedPlayersForChart.length === 0) return [] as Array<{
      player: Player
      progress: ReturnType<typeof getPlayerProgress>
    }>

    const players = Array.isArray(data.players) ? data.players : []
    const playerById = new Map(players.map((player) => [player.player_id, player]))
    const entries: Array<{ player: Player; progress: ReturnType<typeof getPlayerProgress> }> = []

    selectedPlayersForChart.forEach((playerId) => {
      const player = playerById.get(playerId)
      if (!player) return

      const progress = getPlayerProgress(playerId, data.player_event_stats, data.events)
      if (progress.length > 0) {
        entries.push({ player, progress })
      }
    })

    return entries
  }, [data, selectedPlayersForChart])

  const selectedPlayerData = useMemo(() => {
    if (!data) return []
    const players = Array.isArray(data.players) ? data.players : []
    return players.filter((p) => selectedPlayers.includes(p.player_id))
  }, [data, selectedPlayers])

  const selectedPlayerHistories = useMemo(() => {
    const selectedIds = Array.from(new Set([...selectedPlayers, ...selectedPlayersForChart]))
    const historyByPlayerId = new Map<string, ReturnType<typeof getPlayerGameHistory>>()

    selectedIds.forEach((playerId) => {
      historyByPlayerId.set(playerId, getPlayerGameHistory(playerId, pastGames, 20))
    })

    return historyByPlayerId
  }, [pastGames, selectedPlayers, selectedPlayersForChart])

  const activePlayers = useMemo(() => {
    if (!data) return []
    const players = Array.isArray(data.players) ? data.players : []
    return players.filter((p) => p && p.totals && p.totals.events >= 3)
  }, [data])

  const avgValues = useMemo(() => {
    if (!data) {
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
    return getAverageValues(data.players)
  }, [data])

  const relativeThresholds = useMemo(() => {
    if (!data) return undefined
    return calculateRelativeThresholds(data.players)
  }, [data])

  const maxValues = useMemo(() => {
    if (!data)
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

    const allPlayers = Array.isArray(data.players) ? data.players : []
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
  }, [data])

  const getRoleIcon = (role: string) => {
    const icons: Record<string, React.ReactNode> = {
      SL: <Shield className="w-4 h-4" />,
      Медик: <Syringe className="w-4 h-4" />,
      ГП: <Zap className="w-4 h-4" />,
      Стрелок: <Crosshair className="w-4 h-4" />,
      LAT: <Target className="w-4 h-4" />,
      HAT: <Target className="w-4 h-4" />,
      Тандем: <Target className="w-4 h-4" />,
      Гранатомётчик: <Target className="w-4 h-4" />,
      Пулемётчик: <Crosshair className="w-4 h-4" />,
      "Л. пулемёт": <Crosshair className="w-4 h-4" />,
      "Т. пулемёт": <Crosshair className="w-4 h-4" />,
      Снайпер: <Target className="w-4 h-4" />,
      Марксмен: <Target className="w-4 h-4" />,
      Разведчик: <Target className="w-4 h-4" />,
      Рейдер: <Target className="w-4 h-4" />,
      Сапёр: <Shield className="w-4 h-4" />,
      Инженер: <Shield className="w-4 h-4" />,
      "SL Крюмен": <Shield className="w-4 h-4" />,
      Крюмен: <Car className="w-4 h-4" />,
      "SL Пилот": <Shield className="w-4 h-4" />,
      Пилот: <Car className="w-4 h-4" />,
      "Без кита": <Users className="w-4 h-4" />,
    }
    return icons[role] || <Users className="w-4 h-4" />
  }

  const handleOpenGame = useCallback((eventId: string, playerId: string) => {
    startTransition(() => {
      setActiveTab("games")
      setGameFocusTarget({ eventId, playerId })
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Sparkles className="w-16 h-16 text-christmas-green mx-auto animate-pulse" />
          <p className="text-christmas-gold">{seasonalTheme.loadingLabel}</p>
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
      <SeasonalHeader playersCount={data.meta.counts.players} eventsCount={data.meta.counts.events} theme={seasonalTheme} />

      <main className="container mx-auto px-4 py-6 space-y-6 relative z-10">
        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{cacheInfoText}</p>
              <p className="text-[11px] text-muted-foreground">
                Текущая авто-тема: {seasonalTheme.subtitle} ({seasonalTheme.seasonLabel}).
              </p>
              <p className="text-[11px] text-muted-foreground">
                Обновлять статистику имеет смысл после завершенной игры, когда данные уже добавлены в таблицу.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Сброс кэша нужен только при изменении структуры API/словарей.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-christmas-gold/30 bg-background/50 hover:bg-christmas-gold/10 text-christmas-snow"
                onClick={() => void loadData(true, false)}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Синхронизируем..." : "Обновить API (Shift+R)"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-muted/40 bg-background/50 hover:bg-muted/10 text-muted-foreground"
                onClick={() => void loadData(true, true)}
                disabled={isRefreshing}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Сбросить кэш
              </Button>
            </div>
          </div>

          <Card className="border-christmas-gold/20 bg-card/60">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-xs ${syncStatusClassName}`}>
                  {syncProgressLabel ?? "Синхронизация не выполняется"}
                </p>
                <p className={`text-[11px] ${syncMetaClassName}`}>
                  {syncProgress ? `${Math.round(syncProgress.percent)}%` : isCacheProbablyStale ? "кэш устарел" : "кэш актуален"}
                </p>
              </div>
              <div style={syncProgressStyle}>
                <Progress value={syncProgress?.percent ?? 100} className="h-2 bg-muted/30" />
              </div>
              <p className="text-[11px] text-muted-foreground">Последняя полная синхронизация: {lastUpdatedAtLabel}</p>
              <p className="text-[11px] text-muted-foreground">
                Крайняя сводка: страницы протокола {lastSyncPagesLabel}, role-записей{" "}
                {lastSyncRoleRecordsCount.toLocaleString("ru-RU")}, длительность {lastSyncDurationLabel}.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Рекомендуем следующее обновление: {nextRecommendedUpdateLabel} (обычно после игр пт-вс, иногда после
                тренировки в среду).
              </p>
            </CardContent>
          </Card>

          {lastSyncReport && (
            <Card className="border-christmas-green/20 bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-christmas-snow">Ретроспектива синхронизации (7 дней)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lastSyncReport.isReset && (
                  <p className="text-xs text-amber-200">Локальный кэш был сброшен перед этой синхронизацией.</p>
                )}
                {lastSyncReport.isInitial ? (
                  <p className="text-xs text-muted-foreground">
                    Базовая загрузка выполнена. Событий в базе: {lastSyncReport.currentEvents}.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Добавлено событий с прошлого обновления: {lastSyncReport.addedEventsTotal}. Всего событий:
                      {" "}
                      {lastSyncReport.currentEvents} (было {lastSyncReport.previousEvents}).
                    </p>
                    <p className="text-xs text-muted-foreground">
                      За последние 7 дней добавлено: {latestWeekNewEvents.length}.
                    </p>
                    {latestWeekNewEvents.length > 0 && (
                      <div className="space-y-1">
                        {latestWeekNewEvents.map((event) => {
                          const dateLabel =
                            parseSafeDate(event.started_at)?.toLocaleString("ru-RU", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            }) ?? event.started_at

                          const resultLabel =
                            event.is_win === true
                              ? "Победа"
                              : event.is_win === false
                              ? "Поражение"
                              : event.result?.toString() || "Результат не указан"

                          return (
                            <div
                              key={`${event.event_id}-${event.started_at}`}
                              className="text-[11px] text-muted-foreground rounded border border-border/50 px-2 py-1 bg-background/40"
                            >
                              {dateLabel} • {resultLabel} • {event.event_id}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        <OverallStatsPanel stats={overallStats} />

        {/* Event Types Summary */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-christmas-snow">Статистика по типам событий</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {eventTypeStats.map((et) => (
              <Card key={et.type} className="border-christmas-gold/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl mb-1">{et.type}</p>
                  <p className="text-xl font-bold text-christmas-snow">{et.count}</p>
                  <p className="text-xs text-christmas-gold">
                    {et.wins} побед ({et.resolved > 0 ? `${((et.wins / et.resolved) * 100).toFixed(0)}%` : "н/д"})
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    результатов: {et.resolved}/{et.count}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Daily Activity Chart - Full Width */}
        <DailyActivityChart data={dailyActivity} />

        {/* Charts Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          <ActivityChart data={monthlyActivity} />
          <WeeklyActivityChart data={weeklyParticipation} />
          <WinrateProgressChart data={dailyActivity} />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          <MapChart data={mapStats} />
          <RoleChart
            data={roleStats}
            coverageSummary={
              roleDataCoverage
                ? {
                    coveredEvents: roleDataCoverage.coveredEvents,
                    totalEvents: roleDataCoverage.totalEvents,
                    coveredEventRate: roleDataCoverage.coveredEventRate,
                  }
                : undefined
            }
          />
          <BestMatches
            matches={bestMatches}
            players={(Array.isArray(data.players) ? data.players : []).map((p) => ({ player_id: p.player_id, steam_id: p.steam_id }))}
          />
        </section>

        {/* Tabs for different views - Removed export tab */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full flex flex-wrap justify-start gap-2 bg-transparent border-0 h-auto p-0">
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
              По ролям
            </TabsTrigger>
            <TabsTrigger
              value="sl"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-christmas-gold/30 bg-christmas-gold/10 text-christmas-snow data-[state=active]:bg-christmas-gold data-[state=active]:border-christmas-gold data-[state=active]:text-black hover:bg-christmas-gold/20 transition-all"
            >
              Squad Leaders
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-blue-500/30 bg-blue-500/10 text-christmas-snow data-[state=active]:bg-blue-500 data-[state=active]:border-blue-500 data-[state=active]:text-white hover:bg-blue-500/20 transition-all"
            >
              Прогресс игрока
            </TabsTrigger>
            <TabsTrigger
              value="games"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-cyan-500/30 bg-cyan-500/10 text-christmas-snow data-[state=active]:bg-cyan-500 data-[state=active]:border-cyan-500 data-[state=active]:text-slate-950 hover:bg-cyan-500/20 transition-all"
            >
              Игры
            </TabsTrigger>
            <TabsTrigger
              value="individual"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-purple-500/30 bg-purple-500/10 text-christmas-snow data-[state=active]:bg-purple-500 data-[state=active]:border-purple-500 data-[state=active]:text-white hover:bg-purple-500/20 transition-all"
            >
              Карточки
            </TabsTrigger>
            <TabsTrigger
              value="group"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-orange-500/30 bg-orange-500/10 text-christmas-snow data-[state=active]:bg-orange-500 data-[state=active]:border-orange-500 data-[state=active]:text-white hover:bg-orange-500/20 transition-all"
            >
              Групповые
            </TabsTrigger>
            <TabsTrigger
              value="squad-builder"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-emerald-500/30 bg-emerald-500/10 text-christmas-snow data-[state=active]:bg-emerald-500 data-[state=active]:border-emerald-500 data-[state=active]:text-white hover:bg-emerald-500/20 transition-all"
            >
              Сборка сквада
            </TabsTrigger>
          </TabsList>

          {/* Leaderboards Tab */}
          <TabsContent value="leaderboards" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Leaderboard
                title="Топ по убийствам"
                players={topKills}
                stat="kills"
                icon={<Crosshair className="w-4 h-4" />}
                variant="christmas"
              />
              <Leaderboard
                title="Топ по K/D"
                players={topKD}
                stat="kd"
                formatValue={(v) => v.toFixed(2)}
                icon={<Target className="w-4 h-4" />}
                variant="christmas"
              />
              <Leaderboard
                title="Топ по KDA"
                players={topKDA}
                stat="kda"
                formatValue={(v) => v.toFixed(2)}
                icon={<TrendingUp className="w-4 h-4" />}
                variant="christmas"
              />
              <Leaderboard
                title="Топ победителей (5+ событий)"
                players={topWinRate}
                stat="win_rate"
                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                icon={<Trophy className="w-4 h-4" />}
                variant="christmas"
              />
              <Leaderboard
                title="Топ по активности"
                players={topEvents}
                stat="events"
                formatValue={(v) => `${v} событий`}
                icon={<Calendar className="w-4 h-4" />}
                variant="christmas"
              />
              <Leaderboard
                title="Топ медики"
                players={topRevives}
                stat="revives"
                icon={<Heart className="w-4 h-4" />}
                variant="christmas"
              />
              <Leaderboard
                title="Топ по нокам"
                players={topDowns}
                stat="downs"
                icon={<Zap className="w-4 h-4" />}
                variant="christmas"
              />
              <Leaderboard
                title="Топ по выбитой технике"
                players={topVehicle}
                stat="vehicle"
                icon={<Car className="w-4 h-4" />}
                variant="christmas"
                className="bg-gradient-to-br from-blue-500/10 via-card to-blue-500/5"
              />
              <AvgStatLeaderboard
                title="Топ по средней технике за матч"
                players={topAvgVehicle}
                avgStat="avgVehicle"
                totalStat="vehicle"
                formatValue={(v) => v.toFixed(2)}
                icon={<Car className="w-4 h-4" />}
                variant="christmas"
                className="bg-gradient-to-br from-orange-500/10 via-card to-orange-500/5"
              />
              <AvgStatLeaderboard
                title="Топ по среднему поднятию за матч"
                players={topAvgRevives}
                avgStat="avgRevives"
                totalStat="revives"
                formatValue={(v) => v.toFixed(2)}
                icon={<Syringe className="w-4 h-4" />}
                variant="christmas"
                className="bg-gradient-to-br from-pink-500/10 via-card to-pink-500/5"
              />
            </div>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            <p className="text-sm text-muted-foreground bg-card/50 p-3 rounded-lg border border-christmas-gold/20">
              Показаны игроки с лучшим K/D в каждой роли (минимум 3 записи в роли). K/D и KDA считаются только по
              записям `playersevents` с указанной ролью.
            </p>
            {roleDataCoverage && roleDataCoverage.totalEvents > 0 && (
              <div
                className={`text-xs p-3 rounded-lg border ${
                  roleDataCoverage.coveredEventRate < 0.5
                    ? "text-amber-200 bg-amber-500/10 border-amber-500/40"
                    : "text-muted-foreground bg-card/30 border-border"
                }`}
              >
                <p>
                  Покрытие ролей: в {roleDataCoverage.coveredEvents}/{roleDataCoverage.totalEvents} событий есть хотя бы
                  одна запись роли ({(roleDataCoverage.coveredEventRate * 100).toFixed(1)}%).
                </p>
                <p>
                  Всего role-записей: {roleDataCoverage.totalRoleRecords.toLocaleString("ru-RU")} (строки
                  `playersevents` с заполненной ролью).
                </p>
                <p>
                  В среднем: {roleDataCoverage.averageRoleRecordsPerCoveredEvent.toFixed(1)} role-записей на событие, где
                  есть данные по ролям.
                </p>
                {roleDataCoverage.extraCoveredEvents > 0 && (
                  <p>
                    Дополнительно найдено {roleDataCoverage.extraCoveredEvents.toLocaleString("ru-RU")} event_id из
                    `playersevents`, которых нет в списке `/events`.
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {nonEmptyRoleLeaderboards.map(({ role, players }) => (
                <RoleLeaderboard key={role} players={players} role={role} icon={getRoleIcon(role)} />
              ))}
            </div>
            {nonEmptyRoleLeaderboards.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-christmas-snow">Нет данных по ролям для выбранных тегов</p>
              </div>
            )}
          </TabsContent>

          {/* SL Tab */}
          <TabsContent value="sl" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SLLeaderboard slStats={slStats} title="Топ Squad Leaders по играм" />
              <SLLeaderboard
                slStats={[...slStats].sort((a, b) => b.slWinRate - a.slWinRate).slice(0, 10)}
                title="Топ SL по Win Rate"
              />
            </div>
          </TabsContent>

          <TabsContent value="games" className="space-y-4">
            <EventsExplorer
              games={pastGames}
              players={data.players}
              squadDomain={data.dictionaries?.squads ?? []}
              pinnedPlayerIds={selectedPlayers}
              onPinnedPlayersChange={setSelectedPlayers}
              focusTarget={gameFocusTarget}
            />
          </TabsContent>

          {/* Player Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            <Card className="border-christmas-gold/20">
              <CardHeader>
                <CardTitle className="text-base text-christmas-snow">Выберите игроков для просмотра прогресса</CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerSelector
                  players={activePlayers}
                  selected={selectedPlayersForChart}
                  onSelectionChange={setSelectedPlayersForChart}
                  placeholder="Найти игрока..."
                />
              </CardContent>
            </Card>

            {selectedProgressEntries.length > 0 && (
              <div className="space-y-4">
                {selectedProgressEntries.map(({ player, progress }, index) => (
                  <div key={player.player_id} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <PlayerProgressChart data={progress} nickname={player.nickname} />
                    <PlayerCard
                      player={player}
                      rank={index + 1}
                      footerLabel={seasonalTheme.summaryLabel}
                      maxValues={maxValues}
                      avgValues={avgValues}
                      maxRoleKD={maxRoleKD}
                      playerStats={data.player_event_stats}
                      matchHistory={selectedPlayerHistories.get(player.player_id) ?? []}
                      onOpenGame={handleOpenGame}
                    />
                  </div>
                ))}
              </div>
            )}

            {selectedPlayersForChart.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-4 text-christmas-gold opacity-50" />
                <p className="text-christmas-snow">Выберите одного или нескольких игроков для просмотра прогресса</p>
              </div>
            )}

            {selectedPlayersForChart.length > 0 && selectedProgressEntries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-christmas-snow">Для выбранных игроков пока нет данных прогресса</p>
              </div>
            )}
          </TabsContent>

          {/* Individual Stats Tab */}
          <TabsContent value="individual" className="space-y-4">
            <Card className="border-christmas-gold/20">
              <CardHeader>
                <CardTitle className="text-base text-christmas-snow">Выберите игроков для просмотра карточек</CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerSelector
                  players={activePlayers}
                  selected={selectedPlayers}
                  onSelectionChange={setSelectedPlayers}
                  placeholder="Найти игрока..."
                />
              </CardContent>
            </Card>

            {selectedPlayerData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedPlayerData.map((player, index) => (
                  <PlayerCard
                    key={player.player_id}
                    player={player}
                    rank={index + 1}
                    footerLabel={seasonalTheme.summaryLabel}
                    maxValues={maxValues}
                    avgValues={avgValues}
                    maxRoleKD={maxRoleKD}
                    playerStats={data.player_event_stats}
                    matchHistory={selectedPlayerHistories.get(player.player_id) ?? []}
                    onOpenGame={handleOpenGame}
                  />
                ))}
              </div>
            )}

            {selectedPlayers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-4 text-christmas-gold opacity-50" />
                <p className="text-christmas-snow">Выберите игроков для просмотра их карточек</p>
              </div>
            )}
          </TabsContent>

          {/* Group Stats Tab */}
          <TabsContent value="group" className="space-y-4">
            <Card className="border-christmas-gold/20">
              <CardHeader>
                <CardTitle className="text-base text-christmas-snow">
                  Выберите игроков для группового сравнения
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerSelector
                  players={activePlayers}
                  selected={selectedPlayers}
                  onSelectionChange={setSelectedPlayers}
                  placeholder="Найти игрока..."
                />
              </CardContent>
            </Card>

            {selectedPlayerData.length > 0 && (
              <GroupStatsCard players={selectedPlayerData} footerLabel={seasonalTheme.summaryLabel} />
            )}

            {selectedPlayers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 text-christmas-gold opacity-50" />
                <p className="text-christmas-snow">Выберите игроков для группового сравнения</p>
              </div>
            )}
          </TabsContent>

          {/* Squad Builder Tab */}
          <TabsContent value="squad-builder" className="space-y-4">
            <SquadBuilder players={activePlayers} playerStats={data.player_event_stats} roles={data.dictionaries?.roles ?? []} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
