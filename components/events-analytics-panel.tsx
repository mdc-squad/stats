"use client"

import { useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { MultiValueFilter, type MultiValueFilterOption } from "@/components/multi-value-filter"
import { PlayerSelector } from "@/components/player-selector"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { getMetricIcon } from "@/lib/app-icons"
import type { PastGamePlayerStat, PastGameSummary, Player } from "@/lib/data-utils"
import { isSelectableSquadLabel } from "@/lib/squad-utils"
import { ArrowLeftRight, Activity, Plus, TrendingUp, X } from "lucide-react"

type AnalyticsMetric =
  | "winRate"
  | "kills"
  | "deaths"
  | "downs"
  | "revives"
  | "heals"
  | "vehicle"
  | "kd"
  | "kda"
  | "elo"
  | "ticketDiff"

type AnalyticsMode = "per_match" | "cumulative"
type AnalyticsBreakdown = "overall" | "opponent" | "map" | "faction" | "result" | "squad"

interface EventsAnalyticsPanelProps {
  games: PastGameSummary[]
  players: Player[]
  selectedPlayerIds: string[]
  onSelectedPlayerIdsChange: (ids: string[]) => void
}

type AnalyticsAggregate = {
  kills: number
  deaths: number
  downs: number
  revives: number
  heals: number
  vehicle: number
  elo: number
  participants: number
  ticketDiff: number | null
}

type SeriesState = {
  matches: number
  resolvedMatches: number
  wins: number
  kills: number
  deaths: number
  downs: number
  revives: number
  heals: number
  vehicle: number
  elo: number
  participants: number
  ticketDiffTotal: number
  ticketDiffSamples: number
}

type ComparisonSeries = {
  key: string
  label: string
  matches: number
  resolveAggregate: (game: PastGameSummary) => AnalyticsAggregate | null
}

type ChartBuilderConfig = {
  id: string
  metrics: AnalyticsMetric[]
  mode: AnalyticsMode
  breakdown: AnalyticsBreakdown
}

type ChartLine = {
  key: string
  dataKey: string
  label: string
  matches: number
  color: string
  metric: AnalyticsMetric
}

type ChartModel = {
  chartData: Array<Record<string, number | string | null>>
  lines: ChartLine[]
  lineMetaByDataKey: Record<string, { metric: AnalyticsMetric }>
  gameCount: number
}

type AnalyticsSummary = {
  matches: number
  winRate: number
  avgTicketDiff: number
  avgRevives: number
  avgHeals: number
  avgDowns: number
  avgKills: number
  avgDeaths: number
  avgVehicle: number
  avgKd: number
  avgKda: number
  avgElo: number
}

const METRIC_LABELS: Record<AnalyticsMetric, string> = {
  winRate: "Win Rate",
  kills: "Убийства",
  deaths: "Смерти",
  downs: "Ноки",
  revives: "Поднятия",
  heals: "Хил",
  vehicle: "Техника",
  kd: "K/D",
  kda: "KDA",
  elo: "ELO",
  ticketDiff: "Разница тикетов",
}

const BREAKDOWN_LABELS: Record<AnalyticsBreakdown, string> = {
  overall: "Весь состав",
  opponent: "По оппонентам",
  map: "По картам",
  faction: "По фракциям",
  result: "По результатам",
  squad: "По отрядам",
}

const METRIC_ORDER: AnalyticsMetric[] = [
  "kd",
  "kda",
  "winRate",
  "ticketDiff",
  "kills",
  "deaths",
  "downs",
  "revives",
  "heals",
  "vehicle",
  "elo",
]

const METRIC_OPTIONS: MultiValueFilterOption[] = METRIC_ORDER.map((metric) => ({
  value: metric,
  label: METRIC_LABELS[metric],
}))

const LINE_COLOR_PALETTE = [
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#a855f7",
  "#14b8a6",
  "#f97316",
  "#e11d48",
  "#0ea5e9",
  "#84cc16",
  "#6366f1",
  "#ec4899",
]

const TOOLTIP_VISIBLE_ROWS = 10
const TOOLTIP_ROW_HEIGHT_PX = 24

let chartConfigCounter = 1

function createChartConfig(): ChartBuilderConfig {
  return {
    id: `chart-${chartConfigCounter++}`,
    metrics: ["kd"],
    mode: "cumulative",
    breakdown: "overall",
  }
}

function formatMatchDate(value: string): string {
  if (!value) return "N/A"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return `${String(parsed.getDate()).padStart(2, "0")}.${String(parsed.getMonth() + 1).padStart(2, "0")}`
}

function getTicketDiff(game: Pick<PastGameSummary, "tickets_1" | "tickets_2" | "score">): number | null {
  if (game.score !== null) {
    return game.score
  }

  if (game.tickets_1 !== null && game.tickets_2 !== null) {
    return game.tickets_1 - game.tickets_2
  }

  return null
}

function formatSignedNumber(value: number, digits = 1): string {
  const rounded = digits === 0 ? Math.round(value).toString() : value.toFixed(digits)
  return `${value > 0 ? "+" : ""}${rounded}`
}

function formatMetricValue(metric: AnalyticsMetric, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "н/д"
  }

  if (metric === "winRate") {
    return `${value.toFixed(1)}%`
  }

  if (metric === "kd" || metric === "kda") {
    return value.toFixed(2)
  }

  if (metric === "ticketDiff") {
    return formatSignedNumber(value, Math.abs(value) >= 10 ? 0 : 1)
  }

  if (metric === "elo") {
    return value.toFixed(1)
  }

  return value.toFixed(1)
}

function formatAxisValue(value: number, metrics: AnalyticsMetric[]): string {
  if (!Number.isFinite(value)) {
    return ""
  }

  if (metrics.length === 1) {
    return formatMetricValue(metrics[0], value)
  }

  const absValue = Math.abs(value)
  if (absValue >= 100) return Math.round(value).toString()
  if (absValue >= 10) return value.toFixed(1)
  return value.toFixed(2)
}

function getResultKey(game: Pick<PastGameSummary, "is_win">): "win" | "loss" | "unknown" {
  if (game.is_win === true) return "win"
  if (game.is_win === false) return "loss"
  return "unknown"
}

function getResultLabel(resultKey: "win" | "loss" | "unknown"): string {
  if (resultKey === "win") return "Победы"
  if (resultKey === "loss") return "Поражения"
  return "Неизвестно"
}

function createSeriesState(): SeriesState {
  return {
    matches: 0,
    resolvedMatches: 0,
    wins: 0,
    kills: 0,
    deaths: 0,
    downs: 0,
    revives: 0,
    heals: 0,
    vehicle: 0,
    elo: 0,
    participants: 0,
    ticketDiffTotal: 0,
    ticketDiffSamples: 0,
  }
}

function getScopedPlayers(game: PastGameSummary, selectedPlayerIds: Set<string>): PastGamePlayerStat[] {
  if (selectedPlayerIds.size === 0) {
    return game.players
  }

  return game.players.filter((player) => selectedPlayerIds.has(player.player_id))
}

function buildAggregate(players: PastGamePlayerStat[], game: PastGameSummary): AnalyticsAggregate | null {
  if (players.length === 0) {
    return null
  }

  return {
    kills: players.reduce((sum, player) => sum + player.kills, 0),
    deaths: players.reduce((sum, player) => sum + player.deaths, 0),
    downs: players.reduce((sum, player) => sum + player.downs, 0),
    revives: players.reduce((sum, player) => sum + player.revives, 0),
    heals: players.reduce((sum, player) => sum + player.heals, 0),
    vehicle: players.reduce((sum, player) => sum + player.vehicle, 0),
    elo: players.reduce((sum, player) => sum + player.elo, 0),
    participants: players.length,
    ticketDiff: getTicketDiff(game),
  }
}

function updateSeriesState(state: SeriesState, aggregate: AnalyticsAggregate, game: PastGameSummary): void {
  state.matches += 1
  state.kills += aggregate.kills
  state.deaths += aggregate.deaths
  state.downs += aggregate.downs
  state.revives += aggregate.revives
  state.heals += aggregate.heals
  state.vehicle += aggregate.vehicle
  state.elo += aggregate.elo
  state.participants += aggregate.participants

  if (aggregate.ticketDiff !== null) {
    state.ticketDiffTotal += aggregate.ticketDiff
    state.ticketDiffSamples += 1
  }

  if (game.is_win !== null) {
    state.resolvedMatches += 1
    if (game.is_win) {
      state.wins += 1
    }
  }
}

function getPerMatchMetricValue(metric: AnalyticsMetric, aggregate: AnalyticsAggregate, game: PastGameSummary): number | null {
  if (metric === "winRate") {
    return game.is_win === true ? 100 : game.is_win === false ? 0 : null
  }

  if (metric === "kd") {
    return aggregate.deaths > 0 ? aggregate.kills / aggregate.deaths : aggregate.kills
  }

  if (metric === "kda") {
    return aggregate.deaths > 0 ? (aggregate.kills + aggregate.downs) / aggregate.deaths : aggregate.kills + aggregate.downs
  }

  if (metric === "ticketDiff") {
    return aggregate.ticketDiff
  }

  if (metric === "elo") {
    return aggregate.participants > 0 ? aggregate.elo / aggregate.participants : 0
  }

  if (metric === "kills") return aggregate.kills
  if (metric === "deaths") return aggregate.deaths
  if (metric === "downs") return aggregate.downs
  if (metric === "revives") return aggregate.revives
  if (metric === "heals") return aggregate.heals

  return aggregate.vehicle
}

function getCumulativeMetricValue(metric: AnalyticsMetric, state: SeriesState): number | null {
  if (state.matches === 0) {
    return null
  }

  if (metric === "winRate") {
    return state.resolvedMatches > 0 ? (state.wins / state.resolvedMatches) * 100 : null
  }

  if (metric === "kills") return state.kills / state.matches
  if (metric === "deaths") return state.deaths / state.matches
  if (metric === "downs") return state.downs / state.matches
  if (metric === "revives") return state.revives / state.matches
  if (metric === "heals") return state.heals / state.matches
  if (metric === "vehicle") return state.vehicle / state.matches
  if (metric === "elo") return state.participants > 0 ? state.elo / state.participants : 0
  if (metric === "ticketDiff") return state.ticketDiffSamples > 0 ? state.ticketDiffTotal / state.ticketDiffSamples : null
  if (metric === "kda") return state.deaths > 0 ? (state.kills + state.downs) / state.deaths : state.kills + state.downs

  return state.deaths > 0 ? state.kills / state.deaths : state.kills
}

function getSeriesCandidates(
  games: PastGameSummary[],
  selectedPlayerIds: Set<string>,
  breakdown: AnalyticsBreakdown,
): Array<{ key: string; label: string; matches: number }> {
  if (breakdown === "overall") {
    return [
      {
        key: "overall",
        label: selectedPlayerIds.size > 0 ? "Выбранные игроки" : "Весь состав",
        matches: games.length,
      },
    ]
  }

  const counts = new Map<string, { key: string; label: string; matches: number }>()
  const addCandidate = (key: string, label: string) => {
    const current = counts.get(key)
    if (current) {
      current.matches += 1
      return
    }

    counts.set(key, { key, label, matches: 1 })
  }

  games.forEach((game) => {
    const scopedPlayers = getScopedPlayers(game, selectedPlayerIds)
    if (scopedPlayers.length === 0) {
      return
    }

    if (breakdown === "opponent") {
      if (game.opponent) addCandidate(game.opponent, game.opponent)
      return
    }

    if (breakdown === "map") {
      if (game.map) addCandidate(game.map, game.map)
      return
    }

    if (breakdown === "faction") {
      if (game.faction_1) addCandidate(game.faction_1, game.faction_1)
      return
    }

    if (breakdown === "result") {
      const resultKey = getResultKey(game)
      addCandidate(resultKey, getResultLabel(resultKey))
      return
    }

    const squadLabels = new Set(scopedPlayers.map((player) => player.squad_label).filter((label) => isSelectableSquadLabel(label)))
    squadLabels.forEach((label) => addCandidate(label, label))
  })

  return Array.from(counts.values()).sort((left, right) => {
    if (right.matches !== left.matches) return right.matches - left.matches
    return left.label.localeCompare(right.label, "ru")
  })
}

function buildComparisonSeries(
  games: PastGameSummary[],
  selectedPlayerIds: Set<string>,
  breakdown: AnalyticsBreakdown,
): ComparisonSeries[] {
  const candidates = getSeriesCandidates(games, selectedPlayerIds, breakdown)

  return candidates.map((candidate) => ({
    ...candidate,
    resolveAggregate: (game) => {
      const scopedPlayers = getScopedPlayers(game, selectedPlayerIds)
      if (scopedPlayers.length === 0) {
        return null
      }

      if (breakdown === "overall") {
        return buildAggregate(scopedPlayers, game)
      }

      if (breakdown === "opponent") {
        return game.opponent === candidate.key ? buildAggregate(scopedPlayers, game) : null
      }

      if (breakdown === "map") {
        return game.map === candidate.key ? buildAggregate(scopedPlayers, game) : null
      }

      if (breakdown === "faction") {
        return game.faction_1 === candidate.key ? buildAggregate(scopedPlayers, game) : null
      }

      if (breakdown === "result") {
        return getResultKey(game) === candidate.key ? buildAggregate(scopedPlayers, game) : null
      }

      return buildAggregate(scopedPlayers.filter((player) => player.squad_label === candidate.key), game)
    },
  }))
}

function getChartDataKey(metric: AnalyticsMetric, seriesKey: string): string {
  return `${metric}::${seriesKey}`
}

function getChartLineLabel(metric: AnalyticsMetric, seriesLabel: string, metricCount: number, seriesCount: number): string {
  if (metricCount === 1 && seriesCount === 1) {
    return METRIC_LABELS[metric]
  }

  if (metricCount === 1) {
    return seriesLabel
  }

  if (seriesCount === 1) {
    return METRIC_LABELS[metric]
  }

  return `${METRIC_LABELS[metric]} • ${seriesLabel}`
}

function getChartLineColor(metric: AnalyticsMetric, seriesIndex: number): string {
  const metricIndex = METRIC_ORDER.indexOf(metric)
  const paletteIndex = (metricIndex * 5 + seriesIndex * 2) % LINE_COLOR_PALETTE.length
  return LINE_COLOR_PALETTE[paletteIndex]
}

function buildAnalyticsSummary(games: PastGameSummary[], selectedPlayerIds: Set<string>): AnalyticsSummary {
  const sortedGames = [...games].sort((left, right) => {
    const leftTime = Number.isNaN(new Date(left.started_at).getTime()) ? 0 : new Date(left.started_at).getTime()
    const rightTime = Number.isNaN(new Date(right.started_at).getTime()) ? 0 : new Date(right.started_at).getTime()
    return leftTime - rightTime
  })

  const eligibleGames = sortedGames.filter((game) => getScopedPlayers(game, selectedPlayerIds).length > 0)
  const overallState = createSeriesState()

  eligibleGames.forEach((game) => {
    const overallAggregate = buildAggregate(getScopedPlayers(game, selectedPlayerIds), game)
    if (overallAggregate) {
      updateSeriesState(overallState, overallAggregate, game)
    }
  })

  return {
    matches: overallState.matches,
    winRate: getCumulativeMetricValue("winRate", overallState) ?? 0,
    avgTicketDiff: getCumulativeMetricValue("ticketDiff", overallState) ?? 0,
    avgRevives: getCumulativeMetricValue("revives", overallState) ?? 0,
    avgHeals: getCumulativeMetricValue("heals", overallState) ?? 0,
    avgDowns: getCumulativeMetricValue("downs", overallState) ?? 0,
    avgKills: getCumulativeMetricValue("kills", overallState) ?? 0,
    avgDeaths: getCumulativeMetricValue("deaths", overallState) ?? 0,
    avgVehicle: getCumulativeMetricValue("vehicle", overallState) ?? 0,
    avgKd: getCumulativeMetricValue("kd", overallState) ?? 0,
    avgKda: getCumulativeMetricValue("kda", overallState) ?? 0,
    avgElo: getCumulativeMetricValue("elo", overallState) ?? 0,
  }
}

function buildChartModel(games: PastGameSummary[], selectedPlayerIds: Set<string>, config: ChartBuilderConfig): ChartModel {
  if (config.metrics.length === 0) {
    return {
      chartData: [],
      lines: [],
      lineMetaByDataKey: {},
      gameCount: 0,
    }
  }

  const sortedGames = [...games].sort((left, right) => {
    const leftTime = Number.isNaN(new Date(left.started_at).getTime()) ? 0 : new Date(left.started_at).getTime()
    const rightTime = Number.isNaN(new Date(right.started_at).getTime()) ? 0 : new Date(right.started_at).getTime()
    return leftTime - rightTime
  })

  const eligibleGames = sortedGames.filter((game) => getScopedPlayers(game, selectedPlayerIds).length > 0)
  const comparisonSeries = buildComparisonSeries(eligibleGames, selectedPlayerIds, config.breakdown)

  if (comparisonSeries.length === 0) {
    return {
      chartData: [],
      lines: [],
      lineMetaByDataKey: {},
      gameCount: eligibleGames.length,
    }
  }

  const metricStates = new Map(
    config.metrics.map((metric) => [metric, new Map(comparisonSeries.map((series) => [series.key, createSeriesState()]))]),
  )

  const lines = config.metrics.flatMap((metric) =>
    comparisonSeries.map((series, seriesIndex) => ({
      key: `${config.id}-${metric}-${series.key}`,
      dataKey: getChartDataKey(metric, series.key),
      label: getChartLineLabel(metric, series.label, config.metrics.length, comparisonSeries.length),
      matches: series.matches,
      color: getChartLineColor(metric, seriesIndex),
      metric,
    })),
  )

  const lineMetaByDataKey = lines.reduce<Record<string, { metric: AnalyticsMetric }>>((accumulator, line) => {
    accumulator[line.dataKey] = { metric: line.metric }
    return accumulator
  }, {})

  const chartData = eligibleGames.map((game) => {
    const row: Record<string, number | string | null> = {
      dateLabel: formatMatchDate(game.started_at),
      eventLabel: game.map,
      eventId: game.event_id,
    }

    config.metrics.forEach((metric) => {
      const statesBySeries = metricStates.get(metric)
      if (!statesBySeries) {
        return
      }

      comparisonSeries.forEach((series) => {
        const state = statesBySeries.get(series.key)
        if (!state) {
          return
        }

        const dataKey = getChartDataKey(metric, series.key)
        const aggregate = series.resolveAggregate(game)

        if (aggregate) {
          updateSeriesState(state, aggregate, game)
          row[dataKey] =
            config.mode === "per_match" ? getPerMatchMetricValue(metric, aggregate, game) : getCumulativeMetricValue(metric, state)
          return
        }

        row[dataKey] = config.mode === "cumulative" && state.matches > 0 ? getCumulativeMetricValue(metric, state) : null
      })
    })

    return row
  })

  return {
    chartData,
    lines,
    lineMetaByDataKey,
    gameCount: eligibleGames.length,
  }
}

function AnalyticsTooltipContent({
  active,
  label,
  payload,
  lineMetaByDataKey,
}: {
  active?: boolean
  label?: string | number
  payload?: Array<{
    color?: string
    dataKey?: string | number
    name?: string
    value?: number | string | null
    payload?: { eventLabel?: string }
  }>
  lineMetaByDataKey: Record<string, { metric: AnalyticsMetric }>
}) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const point = payload[0]?.payload
  const visibleItems = payload
    .filter((entry) => entry.value !== null && entry.value !== undefined)
    .sort((left, right) => {
      const leftValue = typeof left.value === "number" ? left.value : Number(left.value)
      const rightValue = typeof right.value === "number" ? right.value : Number(right.value)
      return (Number.isFinite(rightValue) ? rightValue : -Infinity) - (Number.isFinite(leftValue) ? leftValue : -Infinity)
    })
  const maxHeight = `${TOOLTIP_VISIBLE_ROWS * TOOLTIP_ROW_HEIGHT_PX}px`

  return (
    <div className="w-[310px] rounded-xl border border-border bg-card p-3 text-card-foreground shadow-xl">
      <p className="text-sm font-medium text-christmas-snow">
        {label}
        {point?.eventLabel ? ` • ${point.eventLabel}` : ""}
      </p>
      <div
        className="mt-2 space-y-1.5 overflow-y-auto pr-1 overscroll-contain"
        style={{ maxHeight }}
        onWheel={(event) => {
          event.preventDefault()
          event.stopPropagation()
          event.currentTarget.scrollTop += event.deltaY
        }}
      >
        {visibleItems.map((entry) => {
          const numericValue =
            typeof entry.value === "number" ? entry.value : typeof entry.value === "string" ? Number(entry.value) : null
          const dataKey = typeof entry.dataKey === "string" ? entry.dataKey : ""
          const metric = lineMetaByDataKey[dataKey]?.metric ?? "kd"

          return (
            <div key={`${entry.name}-${entry.color}-${dataKey}`} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="truncate text-christmas-snow">{entry.name}</span>
              </span>
              <span className="shrink-0 font-medium text-christmas-snow">{formatMetricValue(metric, numericValue)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SummaryStatCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string
  value: string
  icon: LucideIcon
  className: string
}) {
  return (
    <div className={className}>
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-background/20">
        <Icon className="h-4 w-4 text-christmas-snow" />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-center text-2xl font-semibold text-christmas-snow">{value}</p>
    </div>
  )
}

export function EventsAnalyticsPanel({
  games,
  players,
  selectedPlayerIds,
  onSelectedPlayerIdsChange,
}: EventsAnalyticsPanelProps) {
  const [chartConfigs, setChartConfigs] = useState<ChartBuilderConfig[]>(() => [createChartConfig()])

  const analyticsPlayers = useMemo(
    () => players.filter((player) => player.totals?.events > 0).sort((left, right) => left.nickname.localeCompare(right.nickname, "ru")),
    [players],
  )
  const selectedSet = useMemo(() => new Set(selectedPlayerIds), [selectedPlayerIds])

  const summary = useMemo(() => buildAnalyticsSummary(games, selectedSet), [games, selectedSet])
  const chartModels = useMemo(
    () => chartConfigs.map((config) => ({ config, model: buildChartModel(games, selectedSet, config) })),
    [chartConfigs, games, selectedSet],
  )

  const addChart = () => {
    setChartConfigs((current) => [...current, createChartConfig()])
  }

  const updateChartConfig = (chartId: string, patch: Partial<ChartBuilderConfig>) => {
    setChartConfigs((current) => current.map((config) => (config.id === chartId ? { ...config, ...patch } : config)))
  }

  const removeChart = (chartId: string) => {
    setChartConfigs((current) => {
      if (current.length <= 1) {
        return current
      }

      return current.filter((config) => config.id !== chartId)
    })
  }

  const summaryCards = [
    {
      key: "matches",
      label: "Матчи",
      value: String(summary.matches),
      icon: Activity,
      className: "rounded-xl border border-christmas-gold/20 bg-christmas-gold/10 p-3 text-center",
    },
    {
      key: "wr",
      label: "Win Rate",
      value: `${summary.winRate.toFixed(1)}%`,
      icon: getMetricIcon("win_rate"),
      className: "rounded-xl border border-christmas-green/20 bg-christmas-green/10 p-3 text-center",
    },
    {
      key: "ticketDiff",
      label: "Ср. разница тикетов",
      value: formatSignedNumber(summary.avgTicketDiff, 0),
      icon: ArrowLeftRight,
      className: "rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-center",
    },
    {
      key: "revives",
      label: "Ср. поднятий",
      value: summary.avgRevives.toFixed(1),
      icon: getMetricIcon("revives"),
      className: "rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-center",
    },
    {
      key: "heals",
      label: "Ср. хил",
      value: summary.avgHeals.toFixed(1),
      icon: getMetricIcon("heals"),
      className: "rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-center",
    },
    {
      key: "downs",
      label: "Ср. ноки",
      value: summary.avgDowns.toFixed(1),
      icon: getMetricIcon("downs"),
      className: "rounded-xl border border-orange-500/20 bg-orange-500/10 p-3 text-center",
    },
    {
      key: "kills",
      label: "Ср. убийства",
      value: summary.avgKills.toFixed(1),
      icon: getMetricIcon("kills"),
      className: "rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center",
    },
    {
      key: "deaths",
      label: "Ср. смерти",
      value: summary.avgDeaths.toFixed(1),
      icon: getMetricIcon("deaths"),
      className: "rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center",
    },
    {
      key: "vehicle",
      label: "Ср. техника",
      value: summary.avgVehicle.toFixed(1),
      icon: getMetricIcon("vehicle"),
      className: "rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-center",
    },
    {
      key: "kd",
      label: "Ср. KD",
      value: summary.avgKd.toFixed(2),
      icon: getMetricIcon("kd"),
      className: "rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-center",
    },
    {
      key: "kda",
      label: "Ср. KDA",
      value: summary.avgKda.toFixed(2),
      icon: TrendingUp,
      className: "rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-center",
    },
    {
      key: "elo",
      label: "Ср. ELO",
      value: summary.avgElo.toFixed(1),
      icon: getMetricIcon("elo"),
      className: "rounded-xl border border-slate-400/20 bg-slate-400/10 p-3 text-center",
    },
  ] as const

  return (
    <Card className="border-christmas-gold/20 bg-card/70">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base text-christmas-snow">
            <TrendingUp className="w-4 h-4 text-christmas-gold" />
            Статистика и аналитика игр
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            className="border-christmas-gold/20 bg-background/50 text-christmas-snow hover:bg-christmas-gold/10"
            onClick={addChart}
          >
            <Plus className="mr-2 h-4 w-4" />
            Добавить график ниже
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Игроки</p>
            <PlayerSelector
              players={analyticsPlayers}
              selected={selectedPlayerIds}
              onSelectionChange={onSelectedPlayerIdsChange}
              placeholder="Весь состав или конкретные игроки..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
          {summaryCards.map((card) => (
            <SummaryStatCard key={card.key} label={card.label} value={card.value} icon={card.icon} className={card.className} />
          ))}
        </div>

        <div className="space-y-4">
          {chartModels.map(({ config, model }, index) => (
            <Card key={config.id} className="border-border/50 bg-background/25">
              <CardContent className="space-y-4 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-christmas-snow">График {index + 1}</p>
                    <p className="text-xs text-muted-foreground">
                      {BREAKDOWN_LABELS[config.breakdown]} • {config.mode === "cumulative" ? "кумулятивно" : "по матчам"} •{" "}
                      {selectedPlayerIds.length > 0 ? `игроки: ${selectedPlayerIds.length}` : "игроки: весь состав"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-christmas-gold/20 bg-background/50 text-christmas-snow hover:bg-christmas-gold/10"
                      onClick={addChart}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Ниже
                    </Button>
                    {chartConfigs.length > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-border/60 bg-background/40 text-muted-foreground hover:bg-background/70 hover:text-christmas-snow"
                        onClick={() => removeChart(config.id)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Удалить
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.8fr)_repeat(2,minmax(0,0.9fr))]">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Метрики</p>
                    <MultiValueFilter
                      options={METRIC_OPTIONS}
                      selected={config.metrics}
                      onSelectionChange={(values) => updateChartConfig(config.id, { metrics: values as AnalyticsMetric[] })}
                      placeholder="Одна или несколько метрик..."
                      searchPlaceholder="Поиск по метрикам..."
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Режим</p>
                    <Select value={config.mode} onValueChange={(value) => updateChartConfig(config.id, { mode: value as AnalyticsMode })}>
                      <SelectTrigger className="w-full border-christmas-gold/20 bg-background/50 text-christmas-snow">
                        <SelectValue placeholder="Режим" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cumulative">Кумулятивно</SelectItem>
                        <SelectItem value="per_match">По матчам</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Группировка</p>
                    <Select
                      value={config.breakdown}
                      onValueChange={(value) => updateChartConfig(config.id, { breakdown: value as AnalyticsBreakdown })}
                    >
                      <SelectTrigger className="w-full border-christmas-gold/20 bg-background/50 text-christmas-snow">
                        <SelectValue placeholder="Группировка" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="overall">Весь состав</SelectItem>
                        <SelectItem value="opponent">По оппонентам</SelectItem>
                        <SelectItem value="map">По картам</SelectItem>
                        <SelectItem value="faction">По фракциям</SelectItem>
                        <SelectItem value="result">По результатам</SelectItem>
                        <SelectItem value="squad">По отрядам</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {config.metrics.length === 0 ? (
                  <div className="rounded-xl border border-border/50 bg-background/35 p-6 text-sm text-muted-foreground">
                    Выберите хотя бы одну метрику, чтобы построить график.
                  </div>
                ) : model.chartData.length === 0 || model.lines.length === 0 ? (
                  <div className="rounded-xl border border-border/50 bg-background/35 p-6 text-sm text-muted-foreground">
                    Для текущих фильтров и выбранных игроков не хватает данных для построения сравнительных кривых.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="space-y-1">
                        <p className="text-christmas-snow">Метрики: {config.metrics.map((metric) => METRIC_LABELS[metric]).join(" • ")}</p>
                        <p className="text-muted-foreground">
                          {BREAKDOWN_LABELS[config.breakdown]} • {config.mode === "cumulative" ? "кумулятивно" : "по матчам"} • матчей:{" "}
                          {model.gameCount}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-christmas-gold/30 text-christmas-gold">
                        {model.lines.length} линий
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {model.lines.map((line) => (
                        <Badge
                          key={line.key}
                          variant="outline"
                          className="justify-start gap-2 border-border/60 bg-background/30 px-2 py-1 text-left text-muted-foreground"
                        >
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: line.color }} />
                          <span className="text-christmas-snow">{line.label}</span>
                          <span>{line.matches} игр</span>
                        </Badge>
                      ))}
                    </div>

                    <div className="h-[360px] rounded-xl border border-border/50 bg-background/25 p-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={model.chartData} margin={{ left: 0, right: 8, top: 12, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.28} />
                          <XAxis
                            dataKey="dateLabel"
                            stroke="var(--muted-foreground)"
                            fontSize={10}
                            tickLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            stroke="var(--muted-foreground)"
                            fontSize={10}
                            tickLine={false}
                            tickFormatter={(value) => formatAxisValue(Number(value), config.metrics)}
                          />
                          {config.metrics.includes("winRate") && (
                            <ReferenceLine y={50} stroke="var(--muted-foreground)" strokeDasharray="5 5" opacity={0.4} />
                          )}
                          {config.metrics.includes("ticketDiff") && (
                            <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="5 5" opacity={0.4} />
                          )}
                          <Tooltip content={<AnalyticsTooltipContent lineMetaByDataKey={model.lineMetaByDataKey} />} />
                          {[...model.lines]
                            .sort((left, right) => {
                              const metricDelta = METRIC_ORDER.indexOf(left.metric) - METRIC_ORDER.indexOf(right.metric)
                              if (metricDelta !== 0) return metricDelta
                              return left.matches - right.matches
                            })
                            .map((line) => (
                            <Line
                              key={line.key}
                              type="monotone"
                              dataKey={line.dataKey}
                              name={line.label}
                              stroke={line.color}
                              strokeWidth={config.metrics.length > 1 ? 2.4 : 2.2}
                              strokeOpacity={config.metrics.length > 1 ? 0.9 : 1}
                              dot={false}
                              connectNulls={config.mode === "cumulative"}
                              activeDot={{ r: 4, fill: line.color }}
                              style={{ zIndex: 10 + METRIC_ORDER.indexOf(line.metric) }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
