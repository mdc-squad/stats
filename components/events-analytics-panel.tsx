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
import { isSelectableSquadLabel } from "@/lib/squad-utils"
import { ArrowLeftRight, Activity, Skull, TrendingUp } from "lucide-react"

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
  dataKey: string
  color: string
  resolveAggregate: (game: PastGameSummary) => AnalyticsAggregate | null
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

const TOOLTIP_VISIBLE_ROWS = 10
const TOOLTIP_ROW_HEIGHT_PX = 24

function getSeriesColor(index: number): string {
  const hue = (index * 47) % 360
  return `hsl(${hue} 78% 62%)`
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

  if (metric === "heals") {
    return aggregate.heals
  }

  return aggregate.vehicle
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

  return candidates.map((candidate, index) => ({
    ...candidate,
    dataKey: `series_${index + 1}`,
    color: getSeriesColor(index),
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

function AnalyticsTooltipContent({
  active,
  label,
  payload,
  metric,
}: {
  active?: boolean
  label?: string | number
  payload?: Array<{
    color?: string
    name?: string
    value?: number | string | null
    payload?: { eventLabel?: string }
  }>
  metric: AnalyticsMetric
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
    <div className="w-[290px] rounded-xl border border-border bg-card p-3 text-card-foreground shadow-xl">
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

          return (
            <div key={`${entry.name}-${entry.color}`} className="flex items-center justify-between gap-3 text-xs">
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
  const [metric, setMetric] = useState<AnalyticsMetric>("kd")
  const [mode, setMode] = useState<AnalyticsMode>("cumulative")
  const [breakdown, setBreakdown] = useState<AnalyticsBreakdown>("overall")

  const analyticsPlayers = useMemo(
    () => players.filter((player) => player.totals?.events > 0).sort((left, right) => left.nickname.localeCompare(right.nickname, "ru")),
    [players],
  )

  const analytics = useMemo(() => {
    const selectedSet = new Set(selectedPlayerIds)
    const sortedGames = [...games].sort((left, right) => {
      const leftTime = Number.isNaN(new Date(left.started_at).getTime()) ? 0 : new Date(left.started_at).getTime()
      const rightTime = Number.isNaN(new Date(right.started_at).getTime()) ? 0 : new Date(right.started_at).getTime()
      return leftTime - rightTime
    })

    const eligibleGames = sortedGames.filter((game) => getScopedPlayers(game, selectedSet).length > 0)
    const comparisonSeries = buildComparisonSeries(eligibleGames, selectedSet, breakdown)
    const overallState = createSeriesState()
    const seriesStates = new Map(comparisonSeries.map((series) => [series.key, createSeriesState()]))

    const chartData = eligibleGames.map((game) => {
      const row: Record<string, number | string | null> = {
        dateLabel: formatMatchDate(game.started_at),
        eventLabel: game.map,
        eventId: game.event_id,
      }

      const overallAggregate = buildAggregate(getScopedPlayers(game, selectedSet), game)
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

      return row
    })

    return {
      chartData,
      series: comparisonSeries,
      summary: {
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
      },
    }
  }, [breakdown, games, metric, mode, selectedPlayerIds])

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
      value: analytics.summary.avgKd.toFixed(2),
      icon: getMetricIcon("kd"),
      className: "rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-center",
    },
    {
      key: "kda",
      label: "Ср. KDA",
      value: analytics.summary.avgKda.toFixed(2),
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
          Статистика и аналитика игр
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          <div className="space-y-2 xl:col-span-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Игроки</p>
            <PlayerSelector
              players={analyticsPlayers}
              selected={selectedPlayerIds}
              onSelectionChange={onSelectedPlayerIdsChange}
              placeholder="Весь состав или конкретные игроки..."
            />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Параметр</p>
            <Select value={metric} onValueChange={(value) => setMetric(value as AnalyticsMetric)}>
              <SelectTrigger className="w-full border-christmas-gold/20 bg-background/50 text-christmas-snow">
                <SelectValue placeholder="Метрика" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kd">K/D</SelectItem>
                <SelectItem value="kda">KDA</SelectItem>
                <SelectItem value="winRate">Win Rate</SelectItem>
                <SelectItem value="ticketDiff">Разница билетов</SelectItem>
                <SelectItem value="kills">Убийства</SelectItem>
                <SelectItem value="downs">Ноки</SelectItem>
                <SelectItem value="revives">Поднятия</SelectItem>
                <SelectItem value="heals">Хил</SelectItem>
                <SelectItem value="vehicle">Техника</SelectItem>
                <SelectItem value="elo">ELO</SelectItem>
                <SelectItem value="deaths">Смерти</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Режим</p>
            <Select value={mode} onValueChange={(value) => setMode(value as AnalyticsMode)}>
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
            <Select value={breakdown} onValueChange={(value) => setBreakdown(value as AnalyticsBreakdown)}>
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
          {summaryCards.map((card) => (
            <SummaryStatCard key={card.key} label={card.label} value={card.value} icon={card.icon} className={card.className} />
          ))}
        </div>

        {analytics.chartData.length === 0 || analytics.series.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-background/35 p-6 text-sm text-muted-foreground">
            Для текущих фильтров и выбранных игроков не хватает данных для построения сравнительных кривых.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="space-y-1">
                <p className="text-christmas-snow">
                  Кривая: {METRIC_LABELS[metric]} • {mode === "cumulative" ? "кумулятивно" : "по матчам"}
                </p>
                <p className="text-muted-foreground">
                  {BREAKDOWN_LABELS[breakdown]} • {selectedPlayerIds.length > 0 ? `игроки: ${selectedPlayerIds.length}` : "игроки: весь состав"}
                </p>
              </div>
              <Badge variant="outline" className="border-christmas-gold/30 text-christmas-gold">
                {analytics.series.length} серий
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {analytics.series.map((series) => (
                <Badge
                  key={series.key}
                  variant="outline"
                  className="justify-start gap-2 border-border/60 bg-background/30 px-2 py-1 text-left text-muted-foreground"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.color }} />
                  <span className="text-christmas-snow">{series.label}</span>
                  <span>{series.matches} игр</span>
                </Badge>
              ))}
            </div>

            <div className="h-[360px] rounded-xl border border-border/50 bg-background/25 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.chartData} margin={{ left: 0, right: 8, top: 12, bottom: 8 }}>
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
                    tickFormatter={(value) => formatMetricValue(metric, Number(value))}
                  />
                  {metric === "winRate" && (
                    <ReferenceLine y={50} stroke="var(--muted-foreground)" strokeDasharray="5 5" opacity={0.4} />
                  )}
                  {metric === "ticketDiff" && (
                    <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="5 5" opacity={0.4} />
                  )}
                  <Tooltip content={<AnalyticsTooltipContent metric={metric} />} />
                  {analytics.series.map((series) => (
                    <Line
                      key={series.key}
                      type="monotone"
                      dataKey={series.dataKey}
                      name={series.label}
                      stroke={series.color}
                      strokeWidth={2.2}
                      dot={false}
                      connectNulls={mode === "cumulative"}
                      activeDot={{ r: 4, fill: series.color }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
