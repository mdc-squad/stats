"use client"

import { useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { PlayerSelector } from "@/components/player-selector"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { getMetricIcon } from "@/lib/app-icons"
import type { PastGamePlayerStat, PastGameSummary, Player } from "@/lib/data-utils"
import { getSquadToneKey, isSelectableSquadLabel } from "@/lib/squad-utils"
import { Activity, ArrowLeftRight, TrendingUp } from "lucide-react"

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
  | "participants"
  | "impact"
  | "ticketDiff"
type AnalyticsMode = "per_match" | "cumulative"
type AnalyticsScope = "team" | "selected"
type AnalyticsBreakdown =
  | "overall"
  | "opponent"
  | "map"
  | "faction"
  | "result"
  | "squad"

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
  impact: number
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
  impact: number
  participants: number
  ticketDiffTotal: number
  ticketDiffSamples: number
}

type ComparisonSeries = {
  key: string
  label: string
  matches: number
  dataKey: string
  color: string
  resolveAggregate: (game: PastGameSummary) => AnalyticsAggregate | null
}

type ChartValueEntry = {
  key: string
  name: string
  color: string
  value: number | null
}

type LockedChartValues = {
  label: string
  eventLabel?: string
  entries: ChartValueEntry[]
}

type ChartPayloadEntry = {
  color?: string
  dataKey?: string | number
  name?: string | number
  value?: number | string | null
  payload?: Record<string, number | string | null | undefined> & { eventLabel?: string }
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
  participants: "Участники",
  impact: "Импакт",
  ticketDiff: "Разница билетов",
}

const BREAKDOWN_LABELS: Record<AnalyticsBreakdown, string> = {
  overall: "Общий срез",
  opponent: "По оппонентам",
  map: "По картам",
  faction: "По фракциям",
  result: "По результатам",
  squad: "По отрядам",
}

const SERIES_COLORS = [
  "var(--chart-4)",
  "var(--christmas-gold)",
  "var(--chart-5)",
  "#67e8f9",
  "#4ade80",
  "#fb7185",
]

const SQUAD_LINE_COLORS: Record<string, string> = {
  red: "#fb7185",
  blue: "#38bdf8",
  green: "#34d399",
  yellow: "#fbbf24",
  orange: "#fb923c",
  purple: "#a78bfa",
  pink: "#f472b6",
  cyan: "#22d3ee",
  brown: "#b45309",
  black: "#cbd5e1",
  white: "#f8fafc",
  neutral: "#94a3b8",
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

  if (metric === "elo") {
    return value.toFixed(1)
  }

  if (metric === "ticketDiff") {
    return formatSignedNumber(value, Math.abs(value) >= 10 ? 0 : 1)
  }

  return value.toFixed(1)
}

function getChartValueLabel(label: string | number | undefined, eventLabel?: string): string {
  const labelText = label === undefined ? "" : String(label)
  return `${labelText}${eventLabel ? ` • ${eventLabel}` : ""}`
}

function formatChartValue(metric: AnalyticsMetric, entry: Pick<ChartValueEntry, "name" | "value">): string {
  if (entry.name === "Кумулятивный K/D") {
    return entry.value === null || entry.value === undefined ? "н/д" : entry.value.toFixed(2)
  }

  if (entry.name === "Кумулятивный Win Rate") {
    return entry.value === null || entry.value === undefined ? "н/д" : `${entry.value.toFixed(1)}%`
  }

  return formatMetricValue(metric, entry.value)
}

function getComparableValue(value: number | null): number {
  return value === null || !Number.isFinite(value) ? Number.NEGATIVE_INFINITY : value
}

function getSortedChartEntries(payload: ChartPayloadEntry[]): ChartValueEntry[] {
  return payload
    .filter((entry) => entry.value !== null && entry.value !== undefined)
    .map((entry) => ({
      key: String(entry.dataKey ?? entry.name ?? ""),
      name: String(entry.name ?? ""),
      color: entry.color ?? "var(--muted-foreground)",
      value: typeof entry.value === "number" ? entry.value : typeof entry.value === "string" ? Number(entry.value) : null,
    }))
    .sort((left, right) => getComparableValue(right.value) - getComparableValue(left.value))
}

function formatChartDelta(metric: AnalyticsMetric, entry: Pick<ChartValueEntry, "name" | "value">): string {
  if (entry.value === null || entry.value === undefined || !Number.isFinite(entry.value)) {
    return "н/д"
  }

  if (entry.name === "Кумулятивный K/D" || metric === "kd" || metric === "kda") {
    return formatSignedNumber(entry.value, 2)
  }

  if (entry.name === "Кумулятивный Win Rate" || metric === "winRate") {
    return `${formatSignedNumber(entry.value, 1)}%`
  }

  if (metric === "ticketDiff") {
    return formatSignedNumber(entry.value, Math.abs(entry.value) >= 10 ? 0 : 1)
  }

  return formatSignedNumber(entry.value, Math.abs(entry.value) >= 10 ? 0 : 1)
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

function getSeriesColor(breakdown: AnalyticsBreakdown, label: string, index: number): string {
  if (breakdown === "squad") {
    return SQUAD_LINE_COLORS[getSquadToneKey(label)]
  }

  return SERIES_COLORS[index % SERIES_COLORS.length]!
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
    impact: 0,
    participants: 0,
    ticketDiffTotal: 0,
    ticketDiffSamples: 0,
  }
}

function getPlayerImpact(player: PastGamePlayerStat): number {
  return player.kills + player.downs * 0.75 + player.revives * 0.5
}

function getScopedPlayers(game: PastGameSummary, scope: AnalyticsScope, selectedSet: Set<string>): PastGamePlayerStat[] {
  if (scope !== "selected") {
    return game.players
  }

  return game.players.filter((player) => selectedSet.has(player.player_id))
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
    impact: players.reduce((sum, player) => sum + getPlayerImpact(player), 0),
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
  state.impact += aggregate.impact
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

  if (metric === "impact") {
    return aggregate.impact
  }

  if (metric === "kills") {
    return aggregate.kills
  }

  if (metric === "deaths") {
    return aggregate.deaths
  }

  if (metric === "downs") {
    return aggregate.downs
  }

  if (metric === "revives") {
    return aggregate.revives
  }

  if (metric === "heals") return aggregate.heals
  if (metric === "vehicle") return aggregate.vehicle

  return aggregate.participants
}

function getCumulativeMetricValue(metric: AnalyticsMetric, state: SeriesState): number | null {
  if (state.matches === 0) {
    return null
  }

  if (metric === "winRate") {
    return state.resolvedMatches > 0 ? (state.wins / state.resolvedMatches) * 100 : null
  }

  if (metric === "kills") {
    return state.kills / state.matches
  }

  if (metric === "deaths") {
    return state.deaths / state.matches
  }

  if (metric === "downs") {
    return state.downs / state.matches
  }

  if (metric === "revives") {
    return state.revives / state.matches
  }

  if (metric === "heals") {
    return state.heals / state.matches
  }

  if (metric === "vehicle") {
    return state.vehicle / state.matches
  }

  if (metric === "elo") {
    return state.participants > 0 ? state.elo / state.participants : 0
  }

  if (metric === "participants") {
    return state.participants / state.matches
  }

  if (metric === "impact") {
    return state.impact / state.matches
  }

  if (metric === "ticketDiff") {
    return state.ticketDiffSamples > 0 ? state.ticketDiffTotal / state.ticketDiffSamples : null
  }

  if (metric === "kda") {
    return state.deaths > 0 ? (state.kills + state.downs) / state.deaths : state.kills + state.downs
  }

  return state.deaths > 0 ? state.kills / state.deaths : state.kills
}

function getSeriesCandidates(
  games: PastGameSummary[],
  scope: AnalyticsScope,
  selectedSet: Set<string>,
  breakdown: AnalyticsBreakdown,
): Array<{ key: string; label: string; matches: number }> {
  if (breakdown === "overall") {
    return [{ key: "overall", label: scope === "team" ? "Весь состав" : "Выбранные игроки", matches: games.length }]
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
    const scopedPlayers = getScopedPlayers(game, scope, selectedSet)
    if (scope === "selected" && scopedPlayers.length === 0) {
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

    if (breakdown === "squad") {
      const squadLabels = new Set(scopedPlayers.map((player) => player.squad_label).filter((label) => isSelectableSquadLabel(label)))
      squadLabels.forEach((label) => addCandidate(label, label))
      return
    }

  })

  return Array.from(counts.values()).sort((left, right) => {
    if (right.matches !== left.matches) return right.matches - left.matches
    return left.label.localeCompare(right.label, "ru")
  })
}

function buildComparisonSeries(
  games: PastGameSummary[],
  scope: AnalyticsScope,
  selectedSet: Set<string>,
  breakdown: AnalyticsBreakdown,
): ComparisonSeries[] {
  const candidates = getSeriesCandidates(games, scope, selectedSet, breakdown)
  const pickedCandidates = breakdown === "overall" ? candidates.slice(0, 1) : candidates

  return pickedCandidates.map((candidate, index) => ({
    ...candidate,
    dataKey: `series_${index + 1}`,
    color: getSeriesColor(breakdown, candidate.label, index),
    resolveAggregate: (game) => {
      const scopedPlayers = getScopedPlayers(game, scope, selectedSet)
      if (scope === "selected" && scopedPlayers.length === 0) {
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

      if (breakdown === "squad") {
        return buildAggregate(scopedPlayers.filter((player) => player.squad_label === candidate.key), game)
      }

      return null
    },
  }))
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

function ChartValuesPanel({
  title,
  metric,
  values,
  onClear,
}: {
  title: string
  metric: AnalyticsMetric
  values: LockedChartValues
  onClear?: () => void
}) {
  const useTwoColumns = values.entries.length > 8

  return (
    <div className="rounded-xl border border-border/50 bg-background/35 p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-christmas-snow">
          {title}: {getChartValueLabel(values.label, values.eventLabel)}
        </p>
        {onClear ? (
          <button
            type="button"
            className="rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:bg-background/70 hover:text-christmas-snow"
            onClick={onClear}
          >
            Снять фиксацию
          </button>
        ) : null}
      </div>
      <div className={useTwoColumns ? "grid grid-cols-1 gap-1.5 sm:grid-cols-2" : "space-y-1.5"}>
        {values.entries.map((entry) => (
          <div key={entry.key} className="flex items-center gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="truncate text-christmas-snow">{entry.name}</span>
            </span>
            <span className="shrink-0 font-medium text-christmas-snow">{formatChartValue(metric, entry)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartDynamicsPanel({
  metric,
  left,
  right,
}: {
  metric: AnalyticsMetric
  left: LockedChartValues
  right: LockedChartValues
}) {
  const leftByKey = new Map(left.entries.map((entry) => [entry.key, entry]))
  const dynamics = right.entries
    .map((rightEntry) => {
      const leftEntry = leftByKey.get(rightEntry.key)
      if (!leftEntry || leftEntry.value === null || rightEntry.value === null) {
        return null
      }

      return {
        key: rightEntry.key,
        name: rightEntry.name,
        color: rightEntry.color,
        from: leftEntry.value,
        to: rightEntry.value,
        delta: rightEntry.value - leftEntry.value,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((leftEntry, rightEntry) => rightEntry.delta - leftEntry.delta)

  if (dynamics.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-christmas-gold/20 bg-christmas-gold/10 p-3 text-sm">
      <div className="mb-2 space-y-1">
        <p className="font-medium text-christmas-snow">Динамика изменения</p>
        <p className="text-xs text-muted-foreground">
          {getChartValueLabel(left.label, left.eventLabel)} → {getChartValueLabel(right.label, right.eventLabel)}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {dynamics.map((entry) => (
          <div key={entry.key} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-christmas-snow">{entry.name}</span>
            <span className="text-muted-foreground">
              {formatChartValue(metric, { name: entry.name, value: entry.from })} → {formatChartValue(metric, { name: entry.name, value: entry.to })}
            </span>
            <span className={entry.delta >= 0 ? "font-medium text-christmas-green" : "font-medium text-christmas-red"}>
              {formatChartDelta(metric, { name: entry.name, value: entry.delta })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartTooltipContent({
  active,
  label,
  payload,
  metric,
}: {
  active?: boolean
  label?: string | number
  payload?: ChartPayloadEntry[]
  metric: AnalyticsMetric
}) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const point = payload[0]?.payload
  const entries = getSortedChartEntries(payload)

  if (entries.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-auto max-w-[min(92vw,560px)] rounded-xl border border-border bg-card p-3 text-card-foreground shadow-xl">
      <ChartValuesPanel
        title="Значения"
        metric={metric}
        values={{ label: String(label ?? ""), eventLabel: point?.eventLabel ? String(point.eventLabel) : undefined, entries }}
      />
    </div>
  )
}

export function EventsAnalyticsPanel({
  games,
  players,
  selectedPlayerIds,
  onSelectedPlayerIdsChange,
}: EventsAnalyticsPanelProps) {
  const [metric, setMetric] = useState<AnalyticsMetric>("kd")
  const [mode, setMode] = useState<AnalyticsMode>("cumulative")
  const [breakdown, setBreakdown] = useState<AnalyticsBreakdown>("overall")
  const [lockedValues, setLockedValues] = useState<LockedChartValues[]>([])

  const analyticsPlayers = useMemo(
    () => players.filter((player) => player.totals?.events > 0).sort((left, right) => left.nickname.localeCompare(right.nickname, "ru")),
    [players],
  )
  const effectiveScope: AnalyticsScope = selectedPlayerIds.length > 0 ? "selected" : "team"

  const analytics = useMemo(() => {
    const selectedSet = new Set(selectedPlayerIds)
    const sortedGames = [...games].sort((left, right) => {
      const leftTime = Number.isNaN(new Date(left.started_at).getTime()) ? 0 : new Date(left.started_at).getTime()
      const rightTime = Number.isNaN(new Date(right.started_at).getTime()) ? 0 : new Date(right.started_at).getTime()
      return leftTime - rightTime
    })

    const eligibleGames = sortedGames.filter((game) => getScopedPlayers(game, effectiveScope, selectedSet).length > 0)

    const comparisonSeries = buildComparisonSeries(eligibleGames, effectiveScope, selectedSet, breakdown)
    const overallState = createSeriesState()
    const seriesStates = new Map(comparisonSeries.map((series) => [series.key, createSeriesState()]))
    const chartData = eligibleGames.map((game) => {
      const row: Record<string, number | string | null> = {
        dateLabel: formatMatchDate(game.started_at),
        eventLabel: game.map,
        eventId: game.event_id,
      }

      const overallAggregate = buildAggregate(getScopedPlayers(game, effectiveScope, selectedSet), game)
      if (overallAggregate) {
        updateSeriesState(overallState, overallAggregate, game)
      }

      comparisonSeries.forEach((series) => {
        const state = seriesStates.get(series.key)
        if (!state) return

        const aggregate = series.resolveAggregate(game)
        if (aggregate) {
          updateSeriesState(state, aggregate, game)
          row[series.dataKey] = mode === "per_match" ? getPerMatchMetricValue(metric, aggregate, game) : getCumulativeMetricValue(metric, state)
          return
        }

        row[series.dataKey] = mode === "cumulative" && state.matches > 0 ? getCumulativeMetricValue(metric, state) : null
      })

      if (comparisonSeries.length === 1) {
        const primaryState = seriesStates.get(comparisonSeries[0]!.key)
        if (primaryState) {
          row.baselineValue =
            metric === "winRate" ? getCumulativeMetricValue("kd", primaryState) : getCumulativeMetricValue("winRate", primaryState)
          row.baselineLabel = metric === "winRate" ? "Кумулятивный K/D" : "Кумулятивный Win Rate"
        }
      }

      return row
    })

    return {
      chartData,
      series: comparisonSeries,
      summary: {
        matches: overallState.matches,
        winRate: getCumulativeMetricValue("winRate", overallState) ?? 0,
        avgKills: getCumulativeMetricValue("kills", overallState) ?? 0,
        avgRevives: getCumulativeMetricValue("revives", overallState) ?? 0,
        avgTicketDiff: getCumulativeMetricValue("ticketDiff", overallState) ?? 0,
        avgHeals: getCumulativeMetricValue("heals", overallState) ?? 0,
        avgDowns: getCumulativeMetricValue("downs", overallState) ?? 0,
        avgDeaths: getCumulativeMetricValue("deaths", overallState) ?? 0,
        avgVehicle: getCumulativeMetricValue("vehicle", overallState) ?? 0,
        kd: getCumulativeMetricValue("kd", overallState) ?? 0,
        kda: getCumulativeMetricValue("kda", overallState) ?? 0,
        avgElo: getCumulativeMetricValue("elo", overallState) ?? 0,
      },
    }
  }, [breakdown, effectiveScope, games, metric, mode, selectedPlayerIds])

  const hasBaseline = analytics.series.length === 1 && analytics.chartData.length > 0
  const handleChartClick = (state: unknown) => {
    const chartState = state as
      | {
          activeLabel?: string | number
          activePayload?: ChartPayloadEntry[]
        }
      | null
      | undefined

    if (!chartState?.activePayload || chartState.activePayload.length === 0) {
      return
    }

    const entries = getSortedChartEntries(chartState.activePayload)

    if (entries.length === 0) {
      return
    }

    const point = chartState.activePayload[0]?.payload
    const nextValues = {
      label: String(chartState.activeLabel ?? ""),
      eventLabel: point?.eventLabel ? String(point.eventLabel) : undefined,
      entries,
    }
    setLockedValues((current) => [...current, nextValues].slice(-2))
  }
  const summaryCards = [
    {
      key: "matches",
      label: "Матчи",
      value: String(analytics.summary.matches),
      icon: Activity,
      className: "rounded-xl border border-christmas-gold/20 bg-christmas-gold/10 p-3 text-center",
    },
    {
      key: "wr",
      label: "Win Rate",
      value: `${analytics.summary.winRate.toFixed(1)}%`,
      icon: getMetricIcon("win_rate"),
      className: "rounded-xl border border-christmas-green/20 bg-christmas-green/10 p-3 text-center",
    },
    {
      key: "ticketDiff",
      label: "Ср. разница тикетов",
      value: formatSignedNumber(analytics.summary.avgTicketDiff, 0),
      icon: ArrowLeftRight,
      className: "rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-center",
    },
    {
      key: "revives",
      label: "Ср. поднятий",
      value: analytics.summary.avgRevives.toFixed(1),
      icon: getMetricIcon("revives"),
      className: "rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-center",
    },
    {
      key: "heals",
      label: "Ср. хил",
      value: analytics.summary.avgHeals.toFixed(1),
      icon: getMetricIcon("heals"),
      className: "rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-center",
    },
    {
      key: "downs",
      label: "Ср. ноки",
      value: analytics.summary.avgDowns.toFixed(1),
      icon: getMetricIcon("downs"),
      className: "rounded-xl border border-orange-500/20 bg-orange-500/10 p-3 text-center",
    },
    {
      key: "kills",
      label: "Ср. убийства",
      value: analytics.summary.avgKills.toFixed(1),
      icon: getMetricIcon("kills"),
      className: "rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center",
    },
    {
      key: "deaths",
      label: "Ср. смерти",
      value: analytics.summary.avgDeaths.toFixed(1),
      icon: getMetricIcon("deaths"),
      className: "rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center",
    },
    {
      key: "vehicle",
      label: "Ср. техника",
      value: analytics.summary.avgVehicle.toFixed(1),
      icon: getMetricIcon("vehicle"),
      className: "rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-center",
    },
    {
      key: "kd",
      label: "Ср. KD",
      value: analytics.summary.kd.toFixed(2),
      icon: getMetricIcon("kd"),
      className: "rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-center",
    },
    {
      key: "kda",
      label: "Ср. KDA",
      value: analytics.summary.kda.toFixed(2),
      icon: TrendingUp,
      className: "rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-center",
    },
    {
      key: "elo",
      label: "Ср. ELO",
      value: analytics.summary.avgElo.toFixed(1),
      icon: getMetricIcon("elo"),
      className: "rounded-xl border border-slate-400/20 bg-slate-400/10 p-3 text-center",
    },
  ] as const

  return (
    <Card className="border-christmas-gold/20 bg-card/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-christmas-snow">
          <TrendingUp className="w-4 h-4 text-christmas-gold" />
          Аналитические кривые по фильтрам
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.8fr))]">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Игроки</p>
            <PlayerSelector
              players={analyticsPlayers}
              selected={selectedPlayerIds}
              onSelectionChange={(ids) => {
                setLockedValues([])
                onSelectedPlayerIdsChange(ids)
              }}
              placeholder="Весь состав или конкретные игроки..."
            />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Параметр</p>
            <Select
              value={metric}
              onValueChange={(value) => {
                setLockedValues([])
                setMetric(value as AnalyticsMetric)
              }}
            >
              <SelectTrigger className="w-full border-christmas-gold/35 bg-background/50 text-christmas-snow">
                <SelectValue placeholder="Метрика" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kd">K/D</SelectItem>
                <SelectItem value="kda">KDA</SelectItem>
                <SelectItem value="winRate">Win Rate</SelectItem>
                <SelectItem value="ticketDiff">Разница билетов</SelectItem>
                <SelectItem value="elo">ELO</SelectItem>
                <SelectItem value="kills">Убийства</SelectItem>
                <SelectItem value="downs">Ноки</SelectItem>
                <SelectItem value="revives">Поднятия</SelectItem>
                <SelectItem value="heals">Хил</SelectItem>
                <SelectItem value="vehicle">Техника</SelectItem>
                <SelectItem value="impact">Импакт</SelectItem>
                <SelectItem value="deaths">Смерти</SelectItem>
                <SelectItem value="participants">Участники</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Режим</p>
            <Select
              value={mode}
              onValueChange={(value) => {
                setLockedValues([])
                setMode(value as AnalyticsMode)
              }}
            >
              <SelectTrigger className="w-full border-christmas-gold/35 bg-background/50 text-christmas-snow">
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
              value={breakdown}
              onValueChange={(value) => {
                setLockedValues([])
                setBreakdown(value as AnalyticsBreakdown)
              }}
            >
              <SelectTrigger className="w-full border-christmas-gold/35 bg-background/50 text-christmas-snow">
                <SelectValue placeholder="Группировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">Общий срез</SelectItem>
                <SelectItem value="opponent">По оппонентам</SelectItem>
                <SelectItem value="map">По картам</SelectItem>
                <SelectItem value="faction">По фракциям</SelectItem>
                <SelectItem value="result">По результатам</SelectItem>
                <SelectItem value="squad">По отрядам</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
          {summaryCards.map((card) => (
            <SummaryStatCard key={card.key} label={card.label} value={card.value} icon={card.icon} className={card.className} />
          ))}
        </div>

        {analytics.chartData.length === 0 || analytics.series.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-background/35 p-6 text-sm text-muted-foreground">
            Для текущих фильтров и выбранного среза не хватает данных для построения сравнительных кривых.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="space-y-1">
                <p className="text-christmas-snow">
                  Кривая: {METRIC_LABELS[metric]} • {mode === "cumulative" ? "кумулятивно" : "по матчам"}
                </p>
                <p className="text-muted-foreground">
                  {BREAKDOWN_LABELS[breakdown]} • {effectiveScope === "team" ? "весь состав" : `игроки: ${selectedPlayerIds.length}`}
                </p>
              </div>
              <Badge variant="outline" className="border-christmas-gold/30 text-christmas-gold">
                {analytics.series.length} серий
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {analytics.series.map((series) => (
                <Badge
                  key={series.key}
                  variant="outline"
                  className="gap-2 border-border/60 bg-background/30 px-2 py-1 text-muted-foreground"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.color }} />
                  <span className="text-christmas-snow">{series.label}</span>
                  <span>{series.matches} игр</span>
                </Badge>
              ))}
            </div>

            <div className="h-[320px] rounded-xl border border-border/50 bg-background/25 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.chartData} margin={{ left: 0, right: 0, top: 12, bottom: 8 }} onClick={handleChartClick}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.28} />
                  <XAxis
                    dataKey="dateLabel"
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(value) => formatMetricValue(metric, Number(value))}
                  />
                  {hasBaseline && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(value) =>
                        metric === "winRate" ? Number(value).toFixed(2) : `${Number(value).toFixed(0)}%`
                      }
                    />
                  )}
                  {metric === "winRate" && (
                    <ReferenceLine yAxisId="left" y={50} stroke="var(--muted-foreground)" strokeDasharray="5 5" opacity={0.4} />
                  )}
                  {metric === "ticketDiff" && (
                    <ReferenceLine yAxisId="left" y={0} stroke="var(--muted-foreground)" strokeDasharray="5 5" opacity={0.4} />
                  )}
                  <Tooltip content={<ChartTooltipContent metric={metric} />} wrapperStyle={{ pointerEvents: "auto" }} />
                  {analytics.series.map((series) => (
                    <Line
                      key={series.key}
                      yAxisId="left"
                      type="monotone"
                      dataKey={series.dataKey}
                      name={series.label}
                      stroke={series.color}
                      strokeWidth={2.4}
                      dot={false}
                      connectNulls={mode === "cumulative"}
                      activeDot={{ r: 4, fill: series.color }}
                    />
                  ))}
                  {hasBaseline && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="baselineValue"
                      name={String(analytics.chartData[0]?.baselineLabel ?? "Базовая линия")}
                      stroke="var(--christmas-gold)"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 4"
                      activeDot={{ r: 3, fill: "var(--christmas-gold)" }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {lockedValues.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {lockedValues.map((values, index) => (
                  <ChartValuesPanel
                    key={`${values.label}-${values.eventLabel ?? ""}-${index}`}
                    title={`Фиксация ${index + 1}`}
                    metric={metric}
                    values={values}
                    onClear={() => setLockedValues((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  />
                ))}
              </div>
            ) : null}

            {lockedValues.length === 2 ? <ChartDynamicsPanel metric={metric} left={lockedValues[0]!} right={lockedValues[1]!} /> : null}

          </div>
        )}
      </CardContent>
    </Card>
  )
}
