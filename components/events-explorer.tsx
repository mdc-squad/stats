"use client"

import { useDeferredValue, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EventsAnalyticsPanel } from "@/components/events-analytics-panel"
import { GameSliceLeaderboards } from "@/components/game-slice-leaderboards"
import { MultiValueFilter, type MultiValueFilterOption } from "@/components/multi-value-filter"
import { PinnedSquadLeaderboards } from "@/components/pinned-squad-leaderboards"
import { Input } from "@/components/ui/input"
import { PlayerAvatar } from "@/components/player-avatar"
import { PlayerSelector } from "@/components/player-selector"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { HealIcon } from "@/lib/app-icons"
import type { PastGameSummary, Player } from "@/lib/data-utils"
import { getSquadToneClasses } from "@/lib/squad-utils"
import { Calendar, CircleHelp, Crosshair, Filter, Search, Shield, Trophy, Users } from "lucide-react"

interface EventsExplorerProps {
  games: PastGameSummary[]
  players: Player[]
  squadDomain: string[]
  pinnedPlayerIds: string[]
  onPinnedPlayersChange: (ids: string[]) => void
  focusTarget?: {
    eventId: string
    playerId: string
  } | null
}

function formatMatchDate(value: string): string {
  if (!value) return "Дата не указана"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getResultMeta(entry: Pick<PastGameSummary, "is_win" | "result">): {
  label: string
  className: string
} {
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

function TableHeadHelp({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-sm text-left text-muted-foreground transition-colors hover:text-christmas-snow"
          aria-label={`Справка по колонке ${label}`}
        >
          <span>{label}</span>
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs border border-border bg-card text-card-foreground">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

export function EventsExplorer({
  games,
  players,
  squadDomain,
  pinnedPlayerIds,
  onPinnedPlayersChange,
  focusTarget,
}: EventsExplorerProps) {
  const [query, setQuery] = useState("")
  const [activeSection, setActiveSection] = useState("matches")
  const [typeFilters, setTypeFilters] = useState<string[]>([])
  const [mapFilters, setMapFilters] = useState<string[]>([])
  const [opponentFilters, setOpponentFilters] = useState<string[]>([])
  const [factionFilters, setFactionFilters] = useState<string[]>([])
  const [squadFilters, setSquadFilters] = useState<string[]>([])
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
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
        player.squad_labels.forEach((label) => labels.add(label))
      })
    })
    squadDomain.forEach((label) => {
      if (label.trim()) {
        labels.add(label.trim())
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

      if (selectedPlayerIds.length > 0) {
        const gamePlayerIds = new Set(game.players.map((player) => player.player_id))
        if (!selectedPlayerIds.some((playerId) => gamePlayerIds.has(playerId))) {
          return false
        }
      }

      if (!deferredQuery) return true

      const haystack = [
        game.event_id,
        game.map,
        game.event_type,
        game.opponent,
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
    games,
    factionFilters,
    mapFilters,
    opponentFilters,
    selectedPlayerIds,
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
  }, [focusTarget])

  const focusedGameHiddenByFilters =
    !!focusTarget && !!focusedGame && !filteredGames.some((game) => game.event_id === focusedGame.event_id)

  const clearFilters = () => {
    setQuery("")
    setTypeFilters([])
    setMapFilters([])
    setOpponentFilters([])
    setFactionFilters([])
    setSquadFilters([])
    setSelectedPlayerIds([])
  }

  return (
    <div className="space-y-4">
      <Card className="border-christmas-gold/20 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-christmas-snow">
            <Filter className="w-4 h-4 text-christmas-gold" />
            Прошедшие игры и развороты по игрокам
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
                  placeholder="Карта, соперник, event_id или игрок..."
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
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Фракция MDC</p>
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Участники матча</p>
              <PlayerSelector
                players={filterablePlayers}
                selected={selectedPlayerIds}
                onSelectionChange={setSelectedPlayerIds}
                placeholder="Фильтр по игрокам..."
              />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Закрепленные игроки</p>
              <PlayerSelector
                players={filterablePlayers}
                selected={pinnedPlayerIds}
                onSelectionChange={onPinnedPlayersChange}
                placeholder="Игроки для сквадовых топов и персональной аналитики..."
              />
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Каждый фильтр теперь мультивыборный: можно собрать свой набор карт, оппонентов, фракций и отрядов, и этот срез
            сразу применится и к списку игр, и к сравнительным кривым, и к матчевым лидербордам, и к сквадовым топам.
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Показано {filteredGames.length}
              {focusedGameHiddenByFilters ? ` + 1 закрепленная игра` : ""}
              {" "}из {games.length}
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
              {visibleGames.length} игр в листинге{focusedGameHiddenByFilters ? " + 1 закрепленная" : ""}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="leaderboards"
            className="flex h-auto min-h-[58px] cursor-pointer flex-col items-start gap-0.5 rounded-none border-0 border-b border-emerald-500/20 bg-emerald-500/[0.03] px-3 py-2.5 text-left shadow-none transition-colors duration-150 hover:bg-emerald-500/[0.1] hover:text-emerald-50 data-[state=active]:bg-emerald-500/[0.15] data-[state=active]:text-emerald-50 data-[state=active]:shadow-none md:border-b-0 md:border-r"
          >
            <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/70">Раздел</span>
            <span className="text-sm font-semibold text-christmas-snow">Лидерборды</span>
            <span className="text-[11px] text-emerald-100/70">Срезы и топы</span>
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
          <div className="grid gap-2 rounded-lg border border-border/50 bg-background/20 px-3 py-2 text-sm md:grid-cols-[1.2fr_auto_auto] md:items-center">
            <div className="min-w-0">
              <p className="font-medium text-christmas-snow">Плотный листинг матчей и разворотов</p>
              <p className="text-[11px] text-muted-foreground">Компактный список для быстрого сканирования серии игр</p>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Видимо: <span className="font-medium text-christmas-snow">{visibleGames.length}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Фокус: <span className="font-medium text-christmas-snow">{focusTarget ? "есть" : "нет"}</span>
            </div>
          </div>

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
            <Accordion type="multiple" value={expandedGames} onValueChange={setExpandedGames} className="space-y-1.5">
              {visibleGames.map((game) => {
                const resultMeta = getResultMeta(game)
                const isFocused = focusTarget?.eventId === game.event_id
                const recordingUrl = normalizeExternalUrl(game.cast_url)
                const ticketDiff = getTicketDiffValue(game)
                const cardToneStyle = getCollapsedGameToneStyle(game)
                const compactMetrics = [
                  {
                    label: "±",
                    value: formatTicketSummary(game),
                    className:
                      ticketDiff === null
                        ? "border-slate-400/20 bg-slate-400/10 text-christmas-snow"
                        : ticketDiff >= 0
                        ? "border-emerald-400/25 bg-emerald-400/12 text-christmas-snow"
                        : "border-rose-400/25 bg-rose-400/12 text-christmas-snow",
                  },
                  {
                    label: "K",
                    value: String(game.totalKills),
                    className: "border-christmas-green/20 bg-christmas-green/10 text-christmas-snow",
                  },
                  {
                    label: "Dn",
                    value: String(game.totalDowns),
                    className: "border-orange-500/20 bg-orange-500/10 text-christmas-snow",
                  },
                  {
                    label: "D",
                    value: String(game.totalDeaths),
                    className: "border-christmas-red/20 bg-christmas-red/10 text-christmas-snow",
                  },
                  {
                    label: "Rev",
                    value: String(game.totalRevives),
                    className: "border-blue-500/20 bg-blue-500/10 text-christmas-snow",
                  },
                  {
                    label: "P",
                    value: String(game.participants),
                    className: "border-christmas-gold/20 bg-christmas-gold/10 text-christmas-snow",
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
                      <AccordionTrigger className="px-2 py-1.5 hover:no-underline sm:px-2.5 [&>svg]:size-3.5">
                        <div className="flex-1 min-w-0">
                          <div className="grid gap-1.5 lg:grid-cols-[minmax(0,2.1fr)_auto] lg:items-center">
                            <div className="space-y-0.5 text-left">
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
                                {game.faction_matchup && (
                                  <Badge
                                    variant="outline"
                                    className="h-auto border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0 text-[9px] text-cyan-200"
                                  >
                                    {game.faction_matchup}
                                  </Badge>
                                )}
                                {isFocused && (
                                  <Badge
                                    variant="outline"
                                    className="h-auto border-christmas-gold/40 bg-christmas-gold/10 px-1.5 py-0 text-[9px] text-christmas-snow"
                                  >
                                    Открыто из карточки игрока
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-0.5">
                                <p className="text-[13px] font-semibold leading-tight text-christmas-snow sm:text-sm">
                                  {game.map}
                                  {game.mode ? ` • ${game.mode}` : ""}
                                </p>
                                <p className="truncate text-[11px] leading-tight text-muted-foreground">
                                  {game.opponent ? `${game.opponent} • ` : ""}
                                  {formatMatchDate(game.started_at)}
                                  <span className="hidden 2xl:inline"> • {game.event_id}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-start gap-1 text-left lg:flex-nowrap lg:justify-end">
                              {compactMetrics.map((metric) => (
                                <div
                                  key={`${game.event_id}-${metric.label}`}
                                  className={`min-w-[44px] rounded-md border px-1.5 py-0.5 ${metric.className}`}
                                >
                                  <p className="text-[9px] uppercase leading-none tracking-wide text-muted-foreground">{metric.label}</p>
                                  <p className="mt-0.5 text-xs font-semibold leading-none">{metric.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-2.5 pb-2.5">
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 gap-2 lg:grid-cols-8">
                            <div className="rounded-lg border border-border/50 bg-background/35 p-2.5">
                              <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5" />
                                Дата
                              </p>
                              <p className="mt-2 text-sm font-medium text-christmas-snow">{formatMatchDate(game.started_at)}</p>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-background/35 p-2.5">
                              <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                <Users className="w-3.5 h-3.5" />
                                Состав
                              </p>
                              <p className="mt-2 text-sm font-medium text-christmas-snow">
                                MDC {game.mdc_players}
                                {game.enemy_size ? ` • против ${game.enemy_size}` : ""}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-background/35 p-2.5">
                              <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                <Shield className="w-3.5 h-3.5" />
                                Фракция MDC
                              </p>
                              <p className="mt-2 text-sm font-medium text-christmas-snow">
                                {game.faction_1 || "Не указана"}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-background/35 p-2.5">
                              <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                <Crosshair className="w-3.5 h-3.5" />
                                Ноки / Поднятия
                              </p>
                              <p className="mt-2 text-sm font-medium text-christmas-snow">
                                {game.totalDowns} / {game.totalRevives}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-background/35 p-2.5">
                              <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                <HealIcon className="w-3.5 h-3.5" />
                                Хил
                              </p>
                              <p className="mt-2 text-sm font-medium text-christmas-snow">{game.totalHeals}</p>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-background/35 p-2.5">
                              <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                <Trophy className="w-3.5 h-3.5" />
                                Билеты
                              </p>
                              <p className="mt-2 text-sm font-medium text-christmas-snow">{formatTicketSummary(game)}</p>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-background/35 p-2.5">
                              <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                <Shield className="w-3.5 h-3.5" />
                                Лидер по ELO
                              </p>
                              <p className="mt-2 text-sm font-medium text-christmas-snow">
                                {game.topPerformer ? `${game.topPerformer.nickname} • #${game.topPerformer.rank}` : "Нет данных"}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-background/35 p-2.5">
                              <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                <Trophy className="w-3.5 h-3.5" />
                                Запись
                              </p>
                              {recordingUrl ? (
                                <div className="mt-1 flex flex-wrap gap-2.5">
                                  <a
                                    href={recordingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(event) => event.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-sm text-christmas-gold underline-offset-4 hover:text-christmas-snow hover:underline"
                                    title={recordingUrl}
                                  >
                                    Запись
                                    <span className="text-[11px] text-muted-foreground">{getLinkHostLabel(recordingUrl)}</span>
                                  </a>
                                </div>
                              ) : (
                                <p className="mt-2 text-sm font-medium text-muted-foreground">Ссылка не указана</p>
                              )}
                            </div>
                          </div>

                          <ScrollArea className="rounded-lg border border-border/50 bg-background/30">
                            {game.players.length === 0 ? (
                              <div className="p-4 text-sm text-muted-foreground">
                                Для этого события есть карточка матча, но нет развернутого протокола игроков в `playersevents`.
                              </div>
                            ) : (
                              <Table className="min-w-[1020px]">
                                <TableHeader>
                                  <TableRow className="border-border/60">
                                    <TableHead>
                                      <TableHeadHelp label="#">
                                        <p className="leading-relaxed text-muted-foreground">
                                          Позиция игрока внутри конкретного матча. Сортировка идет по ELO, затем по
                                          убийствам, нокам, поднятиям и меньшему числу смертей.
                                        </p>
                                      </TableHeadHelp>
                                    </TableHead>
                                    <TableHead>
                                      <TableHeadHelp label="Игрок">
                                        <p className="leading-relaxed text-muted-foreground">
                                          Ник, аватар и клановый тег игрока из матчевого протокола.
                                        </p>
                                      </TableHeadHelp>
                                    </TableHead>
                                    <TableHead>
                                      <TableHeadHelp label="Роль">
                                        <p className="leading-relaxed text-muted-foreground">
                                          Основная роль игрока в этом матче. Ниже показываются метки сквада, к которому
                                          он относился в протоколе.
                                        </p>
                                      </TableHeadHelp>
                                    </TableHead>
                                    <TableHead>
                                      <TableHeadHelp label="K">
                                        <p className="leading-relaxed text-muted-foreground">
                                          Количество убийств за матч.
                                        </p>
                                      </TableHeadHelp>
                                    </TableHead>
                                    <TableHead>
                                      <TableHeadHelp label="Dn">
                                        <p className="leading-relaxed text-muted-foreground">
                                          Количество ноков. Нок может не превратиться в убийство этим же игроком, поэтому
                                          `Dn` часто выше `K`.
                                        </p>
                                      </TableHeadHelp>
                                    </TableHead>
                                    <TableHead>
                                      <TableHeadHelp label="D">
                                        <p className="leading-relaxed text-muted-foreground">
                                          Количество смертей игрока в этом матче.
                                        </p>
                                      </TableHeadHelp>
                                    </TableHead>
                                    <TableHead>
                                      <TableHeadHelp label="Rev">
                                        <p className="leading-relaxed text-muted-foreground">
                                          Количество поднятий союзников.
                                        </p>
                                      </TableHeadHelp>
                                    </TableHead>
                                    <TableHead>
                                      <TableHeadHelp label="Хил">
                                        <p className="leading-relaxed text-muted-foreground">
                                          Суммарный объем лечения, который игрок выдал за матч.
                                        </p>
                                      </TableHeadHelp>
                                    </TableHead>
                                    <TableHead>
                                      <TableHeadHelp label="K/D">
                                        <p className="leading-relaxed text-muted-foreground">
                                          Отношение убийств к смертям. Если смертей нет, значение равно числу убийств.
                                        </p>
                                      </TableHeadHelp>
                                    </TableHead>
                                    <TableHead>
                                      <TableHeadHelp label="ELO">
                                        <p className="font-medium text-christmas-snow">Как читать матчевый ELO</p>
                                        <p className="mt-1 leading-relaxed text-muted-foreground">
                                          Используется готовый матчевый ELO из протокола. Процент справа показывает
                                          долю от лучшего ELO в текущей игре.
                                        </p>
                                      </TableHeadHelp>
                                    </TableHead>
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
                                        className={isHighlighted ? "bg-christmas-gold/10 hover:bg-christmas-gold/15" : ""}
                                      >
                                        <TableCell className="font-mono text-christmas-gold">#{player.rank}</TableCell>
                                        <TableCell className="max-w-[220px]">
                                          <div className="flex items-center gap-3">
                                            <PlayerAvatar steamId={player.steam_id} nickname={player.nickname} size="sm" />
                                            <div className="min-w-0">
                                              <p className="truncate font-medium text-christmas-snow">{player.nickname}</p>
                                              <p className="truncate text-[11px] text-muted-foreground">{player.tag}</p>
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell className="max-w-[220px]">
                                          <div className="space-y-1">
                                            <p className="truncate text-sm text-christmas-snow">{player.role || "Без роли"}</p>
                                            {player.squads.length > 0 && (
                                              <div className="flex flex-wrap gap-1">
                                                {player.squad_labels.map((label) => {
                                                  const tone = getSquadToneClasses(label)
                                                  return (
                                                    <Badge key={`${player.player_id}-${label}`} variant="outline" className={tone.badge}>
                                                      {label}
                                                    </Badge>
                                                  )
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-christmas-snow">{player.kills}</TableCell>
                                        <TableCell className="text-orange-300">{player.downs}</TableCell>
                                        <TableCell className="text-christmas-red">{player.deaths}</TableCell>
                                        <TableCell className="text-blue-300">{player.revives}</TableCell>
                                        <TableCell className="text-rose-200">{player.heals}</TableCell>
                                        <TableCell className="text-christmas-snow">{player.kd.toFixed(2)}</TableCell>
                                        <TableCell className="w-[180px]">
                                          <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                              <span>{player.elo.toFixed(0)}</span>
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
          <div className="grid gap-2 rounded-lg border border-border/50 bg-background/20 px-3 py-2 text-sm md:grid-cols-[1.2fr_auto_auto] md:items-center">
            <div className="min-w-0">
              <p className="font-medium text-christmas-snow">Готовые игровые выводы и рейтинги</p>
              <p className="text-[11px] text-muted-foreground">Быстрые срезы по кланам, связкам и закрепленным игрокам</p>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Закреплено: <span className="font-medium text-christmas-snow">{pinnedPlayerIds.length}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Отрядов в срезе: <span className="font-medium text-christmas-snow">{squadFilters.length || "все"}</span>
            </div>
          </div>
          <GameSliceLeaderboards games={filteredGames} pinnedPlayerIds={pinnedPlayerIds} />
          <PinnedSquadLeaderboards games={filteredGames} pinnedPlayerIds={pinnedPlayerIds} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0 space-y-3">
          <div className="grid gap-2 rounded-lg border border-border/50 bg-background/20 px-3 py-2 text-sm md:grid-cols-[1.2fr_auto_auto] md:items-center">
            <div className="min-w-0">
              <p className="font-medium text-christmas-snow">Аналитический срез по выбранным фильтрам</p>
              <p className="text-[11px] text-muted-foreground">Сравнение карт, кланов, фракций и отрядов по динамике матчей</p>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Матчи: <span className="font-medium text-christmas-snow">{filteredGames.length}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Фильтров:{" "}
              <span className="font-medium text-christmas-snow">
                {typeFilters.length + mapFilters.length + opponentFilters.length + factionFilters.length + squadFilters.length}
              </span>
            </div>
          </div>
          <EventsAnalyticsPanel games={filteredGames} pinnedPlayerIds={pinnedPlayerIds} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
