"use client"

import { useDeferredValue, useEffect, useMemo, useState, type CSSProperties, type ComponentType } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EventsAnalyticsPanel } from "@/components/events-analytics-panel"
import { GameSliceLeaderboards } from "@/components/game-slice-leaderboards"
import { MultiValueFilter, type MultiValueFilterOption } from "@/components/multi-value-filter"
import { Input } from "@/components/ui/input"
import { PlayerAvatar } from "@/components/player-avatar"
import { PlayerSelector } from "@/components/player-selector"
import { RoleIcon } from "@/components/role-icon"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getSpecializationLabel, SpecializationIcon } from "@/components/specialization-icon"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getMetricIcon } from "@/lib/app-icons"
import { getEventSizeLabel, type PastGameSummary, type Player } from "@/lib/data-utils"
import { getSquadToneKey, isSelectableSquadLabel } from "@/lib/squad-utils"
import { cn } from "@/lib/utils"
import { ArrowLeftRight, Filter, Search, Shield, Video } from "lucide-react"

interface EventsExplorerProps {
  games: PastGameSummary[]
  players: Player[]
  squadDomain: string[]
  selectedPlayerIds: string[]
  onSelectedPlayersChange: (ids: string[]) => void
  focusTarget?: {
    eventId: string
    playerId: string
  } | null
}

type MetricDescriptor = {
  key: string
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
  className: string
}

const METRIC_TOOLTIP_LABELS: Record<
  "revives" | "heals" | "downs" | "kills" | "deaths" | "vehicle" | "kd" | "kda" | "elo",
  string
> = {
  revives: "Поднятия",
  heals: "Хил",
  downs: "Ноки",
  kills: "Убийства",
  deaths: "Смерти",
  vehicle: "Техника",
  kd: "K/D",
  kda: "KDA",
  elo: "ELO",
}

function formatMatchDateParts(value: string): { date: string; time: string } {
  if (!value) {
    return {
      date: "Дата не указана",
      time: "",
    }
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return {
      date: value,
      time: "",
    }
  }

  return {
    date: parsed.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: parsed.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }
}

function getResultMeta(entry: Pick<PastGameSummary, "is_win" | "result">): {
  label: string
  className: string
} {
  if (entry.is_win === null && !entry.result?.trim()) {
    return {
      label: "Запланированная игра",
      className: "border-sky-400/40 bg-sky-400/10 text-sky-200",
    }
  }

  if (entry.is_win === true) {
    return {
      label: "Победа",
      className: "border-christmas-green/40 bg-christmas-green/10 text-christmas-green",
    }
  }

  if (entry.is_win === false) {
    return {
      label: "Поражение",
      className: "border-christmas-red/40 bg-christmas-red/10 text-christmas-red",
    }
  }

  return {
    label: entry.result?.trim() || "Результат не указан",
    className: "border-muted/40 bg-background/60 text-muted-foreground",
  }
}

function isPlannedGame(entry: Pick<PastGameSummary, "is_win" | "result">): boolean {
  return entry.is_win === null && !entry.result?.trim()
}

function getGameAnchorId(eventId: string): string {
  const normalized = eventId
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")

  return `game-${normalized || "unknown"}`
}

function getTicketDiffValue(game: Pick<PastGameSummary, "tickets_1" | "tickets_2" | "score">): number | null {
  if (game.score !== null) {
    return game.score
  }

  if (game.tickets_1 !== null && game.tickets_2 !== null) {
    return game.tickets_1 - game.tickets_2
  }

  return null
}

function formatTicketSummary(game: Pick<PastGameSummary, "tickets_1" | "tickets_2" | "score">): string {
  const diff = getTicketDiffValue(game)

  if (diff === null) {
    return "Нет данных"
  }

  return `${diff > 0 ? "+" : ""}${diff}`
}

function getCollapsedGameToneStyle(game: Pick<PastGameSummary, "is_win" | "tickets_1" | "tickets_2" | "score">): CSSProperties {
  const diff = getTicketDiffValue(game)
  const intensity = diff === null ? 0.16 : Math.min(1, Math.abs(diff) / 180)

  if (game.is_win === true) {
    return {
      backgroundImage: `linear-gradient(90deg, rgba(34, 197, 94, ${0.14 + intensity * 0.2}) 0%, rgba(34, 197, 94, ${
        0.04 + intensity * 0.12
      }) 18%, rgba(15, 23, 42, 0.04) 44%, rgba(15, 23, 42, 0) 72%)`,
      boxShadow: `inset 3px 0 0 rgba(74, 222, 128, ${0.45 + intensity * 0.28})`,
    }
  }

  if (game.is_win === false) {
    return {
      backgroundImage: `linear-gradient(90deg, rgba(239, 68, 68, ${0.13 + intensity * 0.22}) 0%, rgba(239, 68, 68, ${
        0.04 + intensity * 0.12
      }) 18%, rgba(15, 23, 42, 0.04) 44%, rgba(15, 23, 42, 0) 72%)`,
      boxShadow: `inset 3px 0 0 rgba(248, 113, 113, ${0.42 + intensity * 0.3})`,
    }
  }

  return {
    backgroundImage:
      "linear-gradient(90deg, rgba(148, 163, 184, 0.16) 0%, rgba(148, 163, 184, 0.06) 18%, rgba(15, 23, 42, 0.04) 44%, rgba(15, 23, 42, 0) 72%)",
    boxShadow: "inset 3px 0 0 rgba(148, 163, 184, 0.35)",
  }
}

function normalizeExternalUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const candidate = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

function getLinkHostLabel(value: string): string {
  try {
    const parsed = new URL(value)
    return parsed.hostname.replace(/^www\./i, "")
  } catch {
    return value
  }
}

function MetricPill({ metric }: { metric: MetricDescriptor }) {
  const Icon = metric.icon

  return (
    <div className={`flex min-w-[76px] items-center gap-2 rounded-lg border px-2 py-1.5 ${metric.className}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-background/25">
            <Icon className="h-3.5 w-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="border border-border bg-card text-card-foreground">
          {metric.label}
        </TooltipContent>
      </Tooltip>
      <span className="text-sm font-semibold text-christmas-snow">{metric.value}</span>
    </div>
  )
}

function MetricTableHead({
  metric,
}: {
  metric: "revives" | "heals" | "downs" | "kills" | "deaths" | "vehicle" | "kd" | "kda" | "elo"
}) {
  const Icon = getMetricIcon(metric)
  const label = METRIC_TOOLTIP_LABELS[metric]

  return (
    <TableHead className="text-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex w-full items-center justify-center text-muted-foreground">
            <Icon className="h-4 w-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="border border-border bg-card text-card-foreground">
          {label}
        </TooltipContent>
      </Tooltip>
    </TableHead>
  )
}

export function EventsExplorer({
  games,
  players,
  squadDomain,
  selectedPlayerIds,
  onSelectedPlayersChange,
  focusTarget,
}: EventsExplorerProps) {
  const [query, setQuery] = useState("")
  const [activeSection, setActiveSection] = useState("matches")
  const [typeFilters, setTypeFilters] = useState<string[]>([])
  const [mapFilters, setMapFilters] = useState<string[]>([])
  const [opponentFilters, setOpponentFilters] = useState<string[]>([])
  const [factionFilters, setFactionFilters] = useState<string[]>([])
  const [squadFilters, setSquadFilters] = useState<string[]>([])
  const [matchPlayerIds, setMatchPlayerIds] = useState<string[]>([])
  const [expandedGames, setExpandedGames] = useState<string[]>([])
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())

  const filterablePlayers = useMemo(
    () => players.filter((player) => player.totals?.events > 0).sort((left, right) => left.nickname.localeCompare(right.nickname, "ru")),
    [players],
  )

  const eventTypeOptions = useMemo<MultiValueFilterOption[]>(
    () =>
      Array.from(new Set(games.map((game) => game.event_type).filter(Boolean)))
        .sort((left, right) => left.localeCompare(right, "ru"))
        .map((value) => ({ value, label: value })),
    [games],
  )

  const mapOptions = useMemo<MultiValueFilterOption[]>(
    () =>
      Array.from(new Set(games.map((game) => game.map).filter(Boolean)))
        .sort((left, right) => left.localeCompare(right, "ru"))
        .map((value) => ({ value, label: value })),
    [games],
  )

  const opponentOptions = useMemo<MultiValueFilterOption[]>(
    () =>
      Array.from(new Set(games.map((game) => game.opponent).filter(Boolean) as string[]))
        .sort((left, right) => left.localeCompare(right, "ru"))
        .map((value) => ({ value, label: value })),
    [games],
  )

  const factionOptions = useMemo<MultiValueFilterOption[]>(
    () =>
      Array.from(new Set(games.map((game) => game.faction_1).filter(Boolean) as string[]))
        .sort((left, right) => left.localeCompare(right, "ru"))
        .map((value) => ({ value, label: value })),
    [games],
  )

  const squadOptions = useMemo<MultiValueFilterOption[]>(() => {
    const labels = new Set<string>()
    games.forEach((game) => {
      game.players.forEach((player) => {
        player.squad_labels.filter((label) => isSelectableSquadLabel(label)).forEach((label) => labels.add(label))
      })
    })
    squadDomain.forEach((label) => {
      const trimmed = label.trim()
      if (isSelectableSquadLabel(trimmed)) {
        labels.add(trimmed)
      }
    })
    return Array.from(labels)
      .sort((left, right) => left.localeCompare(right, "ru"))
      .map((value) => ({ value, label: value }))
  }, [games, squadDomain])

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      if (typeFilters.length > 0 && !typeFilters.includes(game.event_type)) return false
      if (mapFilters.length > 0 && !mapFilters.includes(game.map)) return false
      if (opponentFilters.length > 0 && (!game.opponent || !opponentFilters.includes(game.opponent))) return false
      if (factionFilters.length > 0 && (!game.faction_1 || !factionFilters.includes(game.faction_1))) return false
      if (squadFilters.length > 0 && !game.players.some((player) => player.squad_labels.some((label) => squadFilters.includes(label)))) {
        return false
      }

      if (matchPlayerIds.length > 0) {
        const gamePlayerIds = new Set(game.players.map((player) => player.player_id))
        if (!matchPlayerIds.some((playerId) => gamePlayerIds.has(playerId))) {
          return false
        }
      }

      if (!deferredQuery) return true

      const haystack = [
        game.event_id,
        game.map,
        game.event_type,
        game.opponent,
        game.opponent_strength,
        game.faction_matchup,
        game.result,
        ...game.players.map((player) => `${player.nickname} ${player.tag} ${player.role} ${player.squad_labels.join(" ")}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(deferredQuery)
    })
  }, [
    deferredQuery,
    factionFilters,
    games,
    mapFilters,
    matchPlayerIds,
    opponentFilters,
    squadFilters,
    typeFilters,
  ])

  const focusedGame = useMemo(() => {
    if (!focusTarget) return null
    return games.find((game) => game.event_id === focusTarget.eventId) ?? null
  }, [focusTarget, games])

  const visibleGames = useMemo(() => {
    if (!focusedGame) return filteredGames
    if (filteredGames.some((game) => game.event_id === focusedGame.event_id)) {
      return filteredGames
    }

    return [focusedGame, ...filteredGames]
  }, [filteredGames, focusedGame])

  useEffect(() => {
    if (!focusTarget) return

    setActiveSection("matches")
    setExpandedGames((current) => {
      if (focusedGame?.event_id === focusTarget.eventId && isPlannedGame(focusedGame)) {
        return current.filter((eventId) => eventId !== focusTarget.eventId)
      }

      if (current.includes(focusTarget.eventId)) {
        return current
      }
      return [focusTarget.eventId, ...current]
    })

    const timeoutId = window.setTimeout(() => {
      document.getElementById(getGameAnchorId(focusTarget.eventId))?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }, 180)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [focusTarget, focusedGame])

  const focusedGameHiddenByFilters =
    !!focusTarget && !!focusedGame && !filteredGames.some((game) => game.event_id === focusedGame.event_id)

  const clearFilters = () => {
    setQuery("")
    setTypeFilters([])
    setMapFilters([])
    setOpponentFilters([])
    setFactionFilters([])
    setSquadFilters([])
    setMatchPlayerIds([])
  }

  const getRoleTooltipLabel = (player: PastGameSummary["players"][number]) => {
    const labels = Array.from(new Set((player.roles.length > 0 ? player.roles : [player.role || ""]).filter(Boolean)))
    return labels.length > 0 ? labels.join(", ") : "Без роли"
  }

  const getSpecializationTooltipLabel = (player: PastGameSummary["players"][number]) => {
    const labels = Array.from(new Set(player.specializations.map((specialization) => getSpecializationLabel(specialization)).filter(Boolean)))
    return labels.length > 0 ? labels.join(", ") : "Специализация не указана"
  }

  const getSquadRowClassName = (squadLabel: string | null | undefined, isHighlighted: boolean) => {
    if (isHighlighted) {
      return "border-christmas-gold/50 bg-christmas-gold/5 hover:bg-christmas-gold/15"
    }

    switch (getSquadToneKey(squadLabel)) {
      case "red":
        return "border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/14"
      case "blue":
        return "border-sky-500/20 bg-sky-500/10 hover:bg-sky-500/14"
      case "green":
        return "border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/14"
      case "yellow":
        return "border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/14"
      case "orange":
        return "border-orange-500/20 bg-orange-500/10 hover:bg-orange-500/14"
      case "purple":
        return "border-violet-500/20 bg-violet-500/10 hover:bg-violet-500/14"
      case "pink":
        return "border-pink-500/20 bg-pink-500/10 hover:bg-pink-500/14"
      case "cyan":
        return "border-cyan-500/20 bg-cyan-500/10 hover:bg-cyan-500/14"
      case "brown":
        return "border-amber-700/20 bg-amber-900/15 hover:bg-amber-900/20"
      case "black":
        return "border-slate-500/20 bg-slate-800/40 hover:bg-slate-800/50"
      case "white":
        return "border-zinc-300/20 bg-zinc-100/5 hover:bg-zinc-100/10"
      default:
        return ""
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-christmas-gold/20 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-christmas-snow">
            <Filter className="w-4 h-4 text-christmas-gold" />
            Статистика и аналитика игр
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,0.8fr))]">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Поиск</p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Карта, соперник, событие или игрок..."
                  className="border-christmas-gold/20 bg-background/50 pl-9 text-christmas-snow"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Тип</p>
              <MultiValueFilter
                options={eventTypeOptions}
                selected={typeFilters}
                onSelectionChange={setTypeFilters}
                placeholder="Любые типы"
                searchPlaceholder="Поиск по типам..."
              />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Карта</p>
              <MultiValueFilter
                options={mapOptions}
                selected={mapFilters}
                onSelectionChange={setMapFilters}
                placeholder="Любые карты"
                searchPlaceholder="Поиск по картам..."
              />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Оппонент</p>
              <MultiValueFilter
                options={opponentOptions}
                selected={opponentFilters}
                onSelectionChange={setOpponentFilters}
                placeholder="Любые оппоненты"
                searchPlaceholder="Поиск по кланам и оппонентам..."
              />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Фракция</p>
              <MultiValueFilter
                options={factionOptions}
                selected={factionFilters}
                onSelectionChange={setFactionFilters}
                placeholder="Любые фракции"
                searchPlaceholder="Поиск по фракциям..."
              />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Отряд</p>
              <MultiValueFilter
                options={squadOptions}
                selected={squadFilters}
                onSelectionChange={setSquadFilters}
                placeholder="Любые отряды"
                searchPlaceholder="Поиск по цветам и отрядам..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Участники матча</p>
            <PlayerSelector
              players={filterablePlayers}
              selected={matchPlayerIds}
              onSelectionChange={setMatchPlayerIds}
              placeholder="Фильтр по игрокам..."
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Показано {filteredGames.length}
              {focusedGameHiddenByFilters ? " + 1 открытая игра" : ""} из {games.length}
            </p>
            <Button
              type="button"
              variant="outline"
              className="border-christmas-gold/20 bg-background/50 text-christmas-snow hover:bg-christmas-gold/10"
              onClick={clearFilters}
            >
              Сбросить фильтры
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-2">
        <TabsList className="grid h-auto w-full grid-cols-1 overflow-hidden rounded-lg border border-border/60 bg-background/30 p-0 md:grid-cols-3">
          <TabsTrigger
            value="matches"
            className="flex h-auto min-h-[58px] cursor-pointer flex-col items-start gap-0.5 rounded-none border-0 border-b border-r border-amber-500/20 bg-amber-500/[0.03] px-3 py-2.5 text-left shadow-none transition-colors duration-150 hover:bg-amber-500/[0.1] hover:text-amber-50 data-[state=active]:bg-amber-500/[0.15] data-[state=active]:text-amber-50 data-[state=active]:shadow-none md:border-b-0"
          >
            <span className="text-[11px] uppercase tracking-[0.18em] text-amber-200/70">Раздел</span>
            <span className="text-sm font-semibold text-christmas-snow">Матчи</span>
            <span className="text-[11px] text-amber-100/70">
              {visibleGames.length} игр в листинге{focusedGameHiddenByFilters ? " + 1 открытая" : ""}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="leaderboards"
            className="flex h-auto min-h-[58px] cursor-pointer flex-col items-start gap-0.5 rounded-none border-0 border-b border-emerald-500/20 bg-emerald-500/[0.03] px-3 py-2.5 text-left shadow-none transition-colors duration-150 hover:bg-emerald-500/[0.1] hover:text-emerald-50 data-[state=active]:bg-emerald-500/[0.15] data-[state=active]:text-emerald-50 data-[state=active]:shadow-none md:border-b-0 md:border-r"
          >
            <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/70">Раздел</span>
            <span className="text-sm font-semibold text-christmas-snow">Лидерборды</span>
            <span className="text-[11px] text-emerald-100/70">Матчевые рейтинги</span>
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="flex h-auto min-h-[58px] cursor-pointer flex-col items-start gap-0.5 rounded-none border-0 bg-cyan-500/[0.03] px-3 py-2.5 text-left shadow-none transition-colors duration-150 hover:bg-cyan-500/[0.1] hover:text-cyan-50 data-[state=active]:bg-cyan-500/[0.16] data-[state=active]:text-cyan-50 data-[state=active]:shadow-none"
          >
            <span className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/70">Раздел</span>
            <span className="text-sm font-semibold text-christmas-snow">Аналитика</span>
            <span className="text-[11px] text-cyan-100/70">Кривые и динамика</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="mt-0 space-y-3">
          {focusedGameHiddenByFilters && (
            <Card className="border-amber-500/30 bg-amber-500/10">
              <CardContent className="pt-4 text-sm text-amber-100">
                Открытая из карточки игрока игра закреплена сверху, даже если текущие фильтры её скрывают.
              </CardContent>
            </Card>
          )}

          {visibleGames.length === 0 ? (
            <Card className="border-border/50 bg-card/60">
              <CardContent className="py-10 text-center text-muted-foreground">
                Нет игр, которые подходят под текущие фильтры.
              </CardContent>
            </Card>
          ) : (
            <Accordion
              type="multiple"
              value={expandedGames}
              onValueChange={(values) =>
                setExpandedGames(values.filter((eventId) => !visibleGames.some((game) => game.event_id === eventId && isPlannedGame(game))))
              }
              className="space-y-1.5"
            >
              {visibleGames.map((game) => {
                const resultMeta = getResultMeta(game)
                const isFocused = focusTarget?.eventId === game.event_id
                const isPlanned = isPlannedGame(game)
                const recordingUrl = normalizeExternalUrl(game.cast_url)
                const cardToneStyle = getCollapsedGameToneStyle(game)
                const { date, time } = formatMatchDateParts(game.started_at)
                const matchup = game.faction_matchup || [game.faction_1, game.faction_2].filter(Boolean).join(" vs ")
                const sizeLabel = getEventSizeLabel(game)
                const summaryMetrics: MetricDescriptor[] = [
                  {
                    key: "ticketDiff",
                    label: "Разница тикетов",
                    value: formatTicketSummary(game),
                    icon: ArrowLeftRight,
                    className:
                      getTicketDiffValue(game) === null
                        ? "border-slate-400/20 bg-slate-400/10"
                        : getTicketDiffValue(game)! >= 0
                        ? "border-emerald-400/25 bg-emerald-400/12"
                        : "border-rose-400/25 bg-rose-400/12",
                  },
                  {
                    key: "revives",
                    label: "Поднятия",
                    value: game.totalRevives.toString(),
                    icon: getMetricIcon("revives"),
                    className: "border-sky-500/20 bg-sky-500/10",
                  },
                  {
                    key: "heals",
                    label: "Хил",
                    value: game.totalHeals.toString(),
                    icon: getMetricIcon("heals"),
                    className: "border-rose-500/20 bg-rose-500/10",
                  },
                  {
                    key: "downs",
                    label: "Ноки",
                    value: game.totalDowns.toString(),
                    icon: getMetricIcon("downs"),
                    className: "border-orange-500/20 bg-orange-500/10",
                  },
                  {
                    key: "kills",
                    label: "Убийства",
                    value: game.totalKills.toString(),
                    icon: getMetricIcon("kills"),
                    className: "border-emerald-500/20 bg-emerald-500/10",
                  },
                  {
                    key: "deaths",
                    label: "Смерти",
                    value: game.totalDeaths.toString(),
                    icon: getMetricIcon("deaths"),
                    className: "border-red-500/20 bg-red-500/10",
                  },
                  {
                    key: "vehicle",
                    label: "Техника",
                    value: game.totalVehicle.toString(),
                    icon: getMetricIcon("vehicle"),
                    className: "border-blue-500/20 bg-blue-500/10",
                  },
                  {
                    key: "avgKd",
                    label: "Средний K/D",
                    value: game.avgKd.toFixed(2),
                    icon: getMetricIcon("kd"),
                    className: "border-amber-500/20 bg-amber-500/10",
                  },
                  {
                    key: "avgKda",
                    label: "Средний KDA",
                    value: game.avgKda.toFixed(2),
                    icon: getMetricIcon("kda"),
                    className: "border-violet-500/20 bg-violet-500/10",
                  },
                  {
                    key: "avgElo",
                    label: "Средний ELO",
                    value: game.avgElo.toFixed(1),
                    icon: getMetricIcon("elo"),
                    className: "border-slate-400/20 bg-slate-400/10",
                  },
                ]

                return (
                  <Card
                    key={game.event_id}
                    id={getGameAnchorId(game.event_id)}
                    style={cardToneStyle}
                    className={`gap-0 overflow-hidden rounded-lg border py-0 transition-colors ${
                      isFocused ? "border-christmas-gold/50 bg-christmas-gold/5" : "border-border/50 bg-card/75"
                    }`}
                  >
                    <AccordionItem value={game.event_id} className="border-0">
                      <AccordionTrigger
                        disabled={isPlanned}
                        className={cn(
                          "px-2 py-2 hover:no-underline sm:px-2.5 [&>svg]:size-3.5",
                          isPlanned && "cursor-default opacity-100 [&>svg]:hidden",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="grid gap-2 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1.3fr)] xl:items-center">
                            <div className="space-y-1 text-left">
                              <div className="flex flex-wrap items-center gap-1">
                                <Badge variant="outline" className={`h-auto px-1.5 py-0 text-[9px] ${resultMeta.className}`}>
                                  {resultMeta.label}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="h-auto border-christmas-gold/30 px-1.5 py-0 text-[9px] text-christmas-gold"
                                >
                                  {game.event_type}
                                </Badge>
                                {isFocused && (
                                  <Badge
                                    variant="outline"
                                    className="h-auto border-christmas-gold/40 bg-christmas-gold/10 px-1.5 py-0 text-[9px] text-christmas-snow"
                                  >
                                    Открыто из карточки игрока
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-semibold leading-tight text-christmas-snow">
                                {game.map}
                                {game.mode ? ` • ${game.mode}` : ""}
                              </p>
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {time ? `${date} ${time}` : date}
                                {sizeLabel ? ` • ${sizeLabel}` : ""}
                                {matchup ? ` • ${matchup}` : ""}
                                {game.opponent ? ` • ${game.opponent}` : ""}
                                {game.opponent_strength ? ` • ${game.opponent_strength}` : ""}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-1.5 xl:justify-end">
                              {summaryMetrics.map((metric) => (
                                <MetricPill key={`${game.event_id}-${metric.key}`} metric={metric} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-2.5 pb-2.5">
                        <div className="space-y-3">
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            <div className="min-w-[180px] shrink-0 rounded-xl border border-border/50 bg-background/35 p-3">
                              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-background/25">
                                <Shield className="h-4 w-4 text-christmas-snow" />
                              </div>
                              <p className="mt-2 text-[11px] text-muted-foreground">MVP</p>
                              <p className="mt-1 text-lg font-semibold text-christmas-snow">
                                {game.topPerformer ? `${game.topPerformer.nickname} • #${game.topPerformer.rank}` : "Нет данных"}
                              </p>
                            </div>

                            <div className="min-w-[220px] shrink-0 rounded-xl border border-border/50 bg-background/35 p-3">
                              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-background/25">
                                <Video className="h-4 w-4 text-christmas-snow" />
                              </div>
                              <p className="mt-2 text-[11px] text-muted-foreground">Запись</p>
                              {recordingUrl ? (
                                <a
                                  href={recordingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-christmas-gold underline-offset-4 hover:text-christmas-snow hover:underline"
                                  title={recordingUrl}
                                >
                                  Запись
                                  <span className="text-[11px] text-muted-foreground">{getLinkHostLabel(recordingUrl)}</span>
                                </a>
                              ) : (
                                <p className="mt-1 text-sm font-semibold text-muted-foreground">Ссылка не указана</p>
                              )}
                            </div>
                          </div>

                          <ScrollArea className="rounded-lg border border-border/50 bg-background/30">
                            {game.players.length === 0 ? (
                              <div className="p-4 text-sm text-muted-foreground">
                                Для этого события есть карточка матча, но нет развернутого протокола игроков в `playersevents`.
                              </div>
                            ) : (
                              <Table className="min-w-[1160px]">
                                <TableHeader>
                                  <TableRow className="border-border/60">
                                    <TableHead>#</TableHead>
                                    <TableHead>Игрок</TableHead>
                                    <TableHead className="text-center">Роль</TableHead>
                                    <TableHead>Отряд</TableHead>
                                    <TableHead className="text-center">Спец.</TableHead>
                                    <MetricTableHead metric="revives" />
                                    <MetricTableHead metric="heals" />
                                    <MetricTableHead metric="downs" />
                                    <MetricTableHead metric="kills" />
                                    <MetricTableHead metric="deaths" />
                                    <MetricTableHead metric="vehicle" />
                                    <MetricTableHead metric="kd" />
                                    <MetricTableHead metric="kda" />
                                    <MetricTableHead metric="elo" />
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {game.players.map((player) => {
                                    const isHighlighted =
                                      focusTarget?.eventId === game.event_id && focusTarget.playerId === player.player_id
                                    const eloWidth = Math.max(0, Math.min(100, player.eloShare))

                                    return (
                                      <TableRow
                                        key={`${game.event_id}-${player.player_id}`}
                                        className={cn("border-l-2", getSquadRowClassName(player.squad_label, isHighlighted))}
                                      >
                                        <TableCell className="font-mono text-christmas-gold">#{player.rank}</TableCell>
                                        <TableCell className="max-w-[240px]">
                                          <div className="flex items-center gap-3">
                                            <PlayerAvatar steamId={player.steam_id} nickname={player.nickname} size="sm" />
                                            <div className="min-w-0">
                                              <p className="truncate font-medium text-christmas-snow">
                                                {player.tag ? `${player.tag} ${player.nickname}` : player.nickname}
                                              </p>
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="flex items-center justify-center gap-1">
                                                {(player.roles.length > 0 ? player.roles : [player.role || ""]).filter(Boolean).slice(0, 2).map((role) => (
                                                  <RoleIcon key={`${player.player_id}-${role}`} role={role} className="h-4 w-4" />
                                                ))}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="border border-border bg-card text-card-foreground">
                                              {getRoleTooltipLabel(player)}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TableCell>
                                        <TableCell className="text-christmas-snow">{player.squad_label}</TableCell>
                                        <TableCell className="text-center">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="flex items-center justify-center gap-1">
                                                {player.specializations.length > 0 ? (
                                                  player.specializations.slice(0, 3).map((specialization) => (
                                                    <SpecializationIcon
                                                      key={`${player.player_id}-${specialization}`}
                                                      specialization={specialization}
                                                      className="text-sm"
                                                    />
                                                  ))
                                                ) : (
                                                  <span className="text-muted-foreground">-</span>
                                                )}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="border border-border bg-card text-card-foreground">
                                              {getSpecializationTooltipLabel(player)}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TableCell>
                                        <TableCell className="text-center text-sky-300">{player.revives}</TableCell>
                                        <TableCell className="text-center text-rose-300">{player.heals}</TableCell>
                                        <TableCell className="text-center text-orange-300">{player.downs}</TableCell>
                                        <TableCell className="text-center text-emerald-300">{player.kills}</TableCell>
                                        <TableCell className="text-center text-red-300">{player.deaths}</TableCell>
                                        <TableCell className="text-center text-blue-300">{player.vehicle}</TableCell>
                                        <TableCell className="text-center text-christmas-snow">{player.kd.toFixed(2)}</TableCell>
                                        <TableCell className="text-center text-christmas-snow">{player.kda.toFixed(2)}</TableCell>
                                        <TableCell className="w-[180px]">
                                          <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                              <span>{player.elo.toFixed(1)}</span>
                                              <span>{Math.round(player.eloShare)}%</span>
                                            </div>
                                            <div className="h-1.5 overflow-hidden rounded-full bg-background/70">
                                              <div
                                                className="h-full rounded-full bg-gradient-to-r from-christmas-red via-christmas-gold to-christmas-green"
                                                style={{ width: `${eloWidth}%` }}
                                              />
                                            </div>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            )}
                          </ScrollArea>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Card>
                )
              })}
            </Accordion>
          )}
        </TabsContent>

        <TabsContent value="leaderboards" className="mt-0 space-y-3">
          <Card className="border-border/50 bg-card/60">
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Игроки</p>
                <PlayerSelector
                  players={filterablePlayers}
                  selected={selectedPlayerIds}
                  onSelectionChange={onSelectedPlayersChange}
                  placeholder="Весь состав или конкретные игроки..."
                />
              </div>
            </CardContent>
          </Card>
          <GameSliceLeaderboards games={filteredGames} selectedPlayerIds={selectedPlayerIds} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <EventsAnalyticsPanel
            games={filteredGames}
            players={filterablePlayers}
            selectedPlayerIds={selectedPlayerIds}
            onSelectedPlayerIdsChange={onSelectedPlayersChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
