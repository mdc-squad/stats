"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { PastGamePlayerStat, PastGameSummary } from "@/lib/data-utils"
import { Activity, Crosshair, Heart, Shield, Skull, TrendingUp, Zap } from "lucide-react"

type AnalyticsMetric =
  | "winRate"
  | "kills"
  | "deaths"
  | "downs"
  | "revives"
  | "kd"
  | "participants"
  | "elo"
  | "ticketDiff"
type AnalyticsMode = "per_match" | "cumulative"
type AnalyticsScope = "team" | "pinned"
type AnalyticsBreakdown =
  | "overall"
  | "opponent"
  | "map"
  | "faction"
  | "result"
  | "squad"
  | "map_opponent"
  | "faction_opponent"

interface EventsAnalyticsPanelProps {
  games: PastGameSummary[]
  pinnedPlayerIds: string[]
}

type AnalyticsAggregate = {
  kills: number
  deaths: number
  downs: number
  revives: number
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
  kd: "K/D",
  participants: "Участники",
  elo: "ELO",
  ticketDiff: "Разница билетов",
}

const BREAKDOWN_LABELS: Record<AnalyticsBreakdown, string> = {
  overall: "Общий срез",
  opponent: "По оппонентам",
  map: "По картам",
  faction: "По фракциям MDC",
  result: "По результатам",
  squad: "По отрядам",
  map_opponent: "Карта + оппонент",
  faction_opponent: "Фракция + оппонент",
}

const SERIES_COLORS = [
  "var(--chart-4)",
  "var(--christmas-gold)",
  "var(--chart-5)",
  "#67e8f9",
  "#4ade80",
  "#fb7185",
]

const MAX_COMPARISON_SERIES = 6
const COMBO_SEPARATOR = " :: "

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

  if (metric === "kd") {
    return value.toFixed(2)
  }

  if (metric === "ticketDiff") {
    return formatSignedNumber(value, Math.abs(value) >= 10 ? 0 : 1)
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
    elo: 0,
    participants: 0,
    ticketDiffTotal: 0,
    ticketDiffSamples: 0,
  }
}

function getScopedPlayers(game: PastGameSummary, scope: AnalyticsScope, pinnedSet: Set<string>): PastGamePlayerStat[] {
  if (scope !== "pinned") {
    return game.players
  }

  return game.players.filter((player) => pinnedSet.has(player.player_id))
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

  if (metric === "ticketDiff") {
    return aggregate.ticketDiff
  }

  if (metric === "elo") {
    return aggregate.elo
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

  if (metric === "participants") {
    return state.participants / state.matches
  }

  if (metric === "elo") {
    return state.elo / state.matches
  }

  if (metric === "ticketDiff") {
    return state.ticketDiffSamples > 0 ? state.ticketDiffTotal / state.ticketDiffSamples : null
  }

  return state.deaths > 0 ? state.kills / state.deaths : state.kills
}

function getSeriesCandidates(
  games: PastGameSummary[],
  scope: AnalyticsScope,
  pinnedSet: Set<string>,
  breakdown: AnalyticsBreakdown,
): Array<{ key: string; label: string; matches: number }> {
  if (breakdown === "overall") {
    return [{ key: "overall", label: scope === "team" ? "Весь состав" : "Закрепленные игроки", matches: games.length }]
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
    const scopedPlayers = getScopedPlayers(game, scope, pinnedSet)
    if (scope === "pinned" && scopedPlayers.length === 0) {
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
      const squadLabels = new Set(scopedPlayers.map((player) => player.squad_label).filter(Boolean))
      squadLabels.forEach((label) => addCandidate(label, label))
      return
    }

    if (breakdown === "map_opponent") {
      if (game.map && game.opponent) {
        addCandidate(`${game.map}${COMBO_SEPARATOR}${game.opponent}`, `${game.map} • ${game.opponent}`)
      }
      return
    }

    if (breakdown === "faction_opponent") {
      if (game.faction_1 && game.opponent) {
        addCandidate(`${game.faction_1}${COMBO_SEPARATOR}${game.opponent}`, `${game.faction_1} • ${game.opponent}`)
      }
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
  pinnedSet: Set<string>,
  breakdown: AnalyticsBreakdown,
): ComparisonSeries[] {
  const candidates = getSeriesCandidates(games, scope, pinnedSet, breakdown)
  const pickedCandidates =
    breakdown === "overall" ? candidates.slice(0, 1) : candidates.slice(0, Math.min(MAX_COMPARISON_SERIES, candidates.length))

  return pickedCandidates.map((candidate, index) => ({
    ...candidate,
    dataKey: `series_${index + 1}`,
    color: SERIES_COLORS[index % SERIES_COLORS.length]!,
    resolveAggregate: (game) => {
      const scopedPlayers = getScopedPlayers(game, scope, pinnedSet)
      if (scope === "pinned" && scopedPlayers.length === 0) {
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

      if (breakdown === "map_opponent") {
        const comboKey = game.opponent ? `${game.map}${COMBO_SEPARATOR}${game.opponent}` : null
        return comboKey === candidate.key ? buildAggregate(scopedPlayers, game) : null
      }

      const comboKey = game.faction_1 && game.opponent ? `${game.faction_1}${COMBO_SEPARATOR}${game.opponent}` : null
      return comboKey === candidate.key ? buildAggregate(scopedPlayers, game) : null
    },
  }))
}

export function EventsAnalyticsPanel({ games, pinnedPlayerIds }: EventsAnalyticsPanelProps) {
  const [metric, setMetric] = useState<AnalyticsMetric>("kd")
  const [mode, setMode] = useState<AnalyticsMode>("cumulative")
  const [scope, setScope] = useState<AnalyticsScope>("team")
  const [breakdown, setBreakdown] = useState<AnalyticsBreakdown>("overall")

  useEffect(() => {
    if (scope === "pinned" && pinnedPlayerIds.length === 0) {
      setScope("team")
    }
  }, [pinnedPlayerIds.length, scope])

  const effectiveScope: AnalyticsScope = scope === "pinned" && pinnedPlayerIds.length > 0 ? "pinned" : "team"

  const analytics = useMemo(() => {
    const pinnedSet = new Set(pinnedPlayerIds)
    const sortedGames = [...games].sort((left, right) => {
      const leftTime = Number.isNaN(new Date(left.started_at).getTime()) ? 0 : new Date(left.started_at).getTime()
      const rightTime = Number.isNaN(new Date(right.started_at).getTime()) ? 0 : new Date(right.started_at).getTime()
      return leftTime - rightTime
    })

    const eligibleGames =
      effectiveScope === "team"
        ? sortedGames
        : sortedGames.filter((game) => getScopedPlayers(game, effectiveScope, pinnedSet).length > 0)

    const comparisonSeries = buildComparisonSeries(eligibleGames, effectiveScope, pinnedSet, breakdown)
    const overallState = createSeriesState()
    const seriesStates = new Map(comparisonSeries.map((series) => [series.key, createSeriesState()]))
    const chartData = eligibleGames.map((game) => {
      const row: Record<string, number | string | null> = {
        dateLabel: formatMatchDate(game.started_at),
        eventLabel: game.map,
        eventId: game.event_id,
      }

      const overallAggregate = buildAggregate(getScopedPlayers(game, effectiveScope, pinnedSet), game)
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
        kd: getCumulativeMetricValue("kd", overallState) ?? 0,
      },
    }
  }, [breakdown, effectiveScope, games, metric, mode, pinnedPlayerIds])

  const hasBaseline = analytics.series.length === 1 && analytics.chartData.length > 0

  return (
    <Card className="border-christmas-gold/20 bg-card/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-christmas-snow">
          <TrendingUp className="w-4 h-4 text-christmas-gold" />
          Аналитические кривые по фильтрам
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Параметр</p>
            <Select value={metric} onValueChange={(value) => setMetric(value as AnalyticsMetric)}>
              <SelectTrigger className="w-full border-christmas-gold/20 bg-background/50 text-christmas-snow">
                <SelectValue placeholder="Метрика" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kd">K/D</SelectItem>
                <SelectItem value="winRate">Win Rate</SelectItem>
                <SelectItem value="ticketDiff">Разница билетов</SelectItem>
                <SelectItem value="kills">Убийства</SelectItem>
                <SelectItem value="downs">Ноки</SelectItem>
                <SelectItem value="revives">Поднятия</SelectItem>
                <SelectItem value="elo">ELO</SelectItem>
                <SelectItem value="deaths">Смерти</SelectItem>
                <SelectItem value="participants">Участники</SelectItem>
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
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Срез</p>
            <Select value={effectiveScope} onValueChange={(value) => setScope(value as AnalyticsScope)}>
              <SelectTrigger className="w-full border-christmas-gold/20 bg-background/50 text-christmas-snow">
                <SelectValue placeholder="Срез" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team">Весь состав</SelectItem>
                <SelectItem value="pinned" disabled={pinnedPlayerIds.length === 0}>
                  Закрепленные игроки
                </SelectItem>
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
                <SelectItem value="overall">Общий срез</SelectItem>
                <SelectItem value="opponent">По оппонентам</SelectItem>
                <SelectItem value="map">По картам</SelectItem>
                <SelectItem value="faction">По фракциям MDC</SelectItem>
                <SelectItem value="result">По результатам</SelectItem>
                <SelectItem value="squad">По отрядам</SelectItem>
                <SelectItem value="map_opponent">Карта + оппонент</SelectItem>
                <SelectItem value="faction_opponent">Фракция + оппонент</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          <div className="rounded-xl border border-christmas-gold/20 bg-christmas-gold/10 p-3">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Activity className="w-3.5 h-3.5 text-christmas-gold" />
              Матчи
            </p>
            <p className="mt-2 text-2xl font-semibold text-christmas-snow">{analytics.summary.matches}</p>
          </div>
          <div className="rounded-xl border border-christmas-green/20 bg-christmas-green/10 p-3">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-christmas-green" />
              WR
            </p>
            <p className="mt-2 text-2xl font-semibold text-christmas-snow">{analytics.summary.winRate.toFixed(1)}%</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Crosshair className="w-3.5 h-3.5 text-blue-300" />
              Ср. убийства
            </p>
            <p className="mt-2 text-2xl font-semibold text-christmas-snow">{analytics.summary.avgKills.toFixed(1)}</p>
          </div>
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-3">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Heart className="w-3.5 h-3.5 text-orange-300" />
              Ср. поднятия
            </p>
            <p className="mt-2 text-2xl font-semibold text-christmas-snow">{analytics.summary.avgRevives.toFixed(1)}</p>
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Zap className="w-3.5 h-3.5 text-cyan-300" />
              Ср. разрыв
            </p>
            <p className="mt-2 text-2xl font-semibold text-christmas-snow">{formatSignedNumber(analytics.summary.avgTicketDiff, 0)}</p>
          </div>
          <div className="rounded-xl border border-christmas-red/20 bg-christmas-red/10 p-3">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Skull className="w-3.5 h-3.5 text-christmas-red" />
              K/D
            </p>
            <p className="mt-2 text-2xl font-semibold text-christmas-snow">{analytics.summary.kd.toFixed(2)}</p>
          </div>
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
                  {BREAKDOWN_LABELS[breakdown]} • {effectiveScope === "team" ? "весь состав" : "закрепленные игроки"}
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
                <LineChart data={analytics.chartData} margin={{ left: 0, right: 0, top: 12, bottom: 8 }}>
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      color: "var(--foreground)",
                    }}
                    formatter={(value, name) => {
                      const numericValue =
                        typeof value === "number" ? value : typeof value === "string" ? Number(value) : null
                      const safeName = String(name)
                      const baselineLabel = String(analytics.chartData[0]?.baselineLabel ?? "")
                      if (safeName === baselineLabel) {
                        if (baselineLabel === "Кумулятивный K/D") {
                          return [numericValue?.toFixed(2) ?? "н/д", safeName]
                        }

                        return [numericValue === null || Number.isNaN(numericValue) ? "н/д" : `${numericValue.toFixed(1)}%`, safeName]
                      }

                      return [formatMetricValue(metric, numericValue), safeName]
                    }}
                    labelFormatter={(label, payload) => {
                      const point = payload?.[0]?.payload as { eventLabel?: string } | undefined
                      return `${label}${point?.eventLabel ? ` • ${point.eventLabel}` : ""}`
                    }}
                  />
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

            <div className="text-[11px] text-muted-foreground">
              Серии теперь строятся не только по общему фильтру, но и по выбранной группировке: можно сравнивать оппонентов,
              карты, фракции, отряды и комбинированные связки вроде карта + оппонент или фракция + оппонент.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
