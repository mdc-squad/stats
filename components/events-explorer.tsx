"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
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
import type { PastGameSummary, Player } from "@/lib/data-utils"
import { getSquadToneClasses } from "@/lib/squad-utils"
import { Calendar, Crosshair, Filter, Heart, Search, Shield, Skull, Trophy, Users, Zap } from "lucide-react"

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

function formatTicketSummary(game: Pick<PastGameSummary, "tickets_1" | "tickets_2" | "score">): string {
  const diff =
    game.score !== null
      ? game.score
      : game.tickets_1 !== null && game.tickets_2 !== null
      ? game.tickets_1 - game.tickets_2
      : null

  if (diff === null) {
    return "Нет данных"
  }

  return `${diff > 0 ? "+" : ""}${diff}`
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

export function EventsExplorer({
  games,
  players,
  squadDomain,
  pinnedPlayerIds,
  onPinnedPlayersChange,
  focusTarget,
}: EventsExplorerProps) {
  const [query, setQuery] = useState("")
  const [resultFilters, setResultFilters] = useState<string[]>([])
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

  const resultOptions = useMemo<MultiValueFilterOption[]>(
    () => [
      { value: "win", label: "Победы" },
      { value: "loss", label: "Поражения" },
      { value: "unknown", label: "Неизвестно" },
    ],
    [],
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
      Array.from(new Set(games.map((game) => game.faction_matchup).filter(Boolean) as string[]))
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
      const resultKey = game.is_win === true ? "win" : game.is_win === false ? "loss" : "unknown"

      if (resultFilters.length > 0 && !resultFilters.includes(resultKey)) return false
      if (typeFilters.length > 0 && !typeFilters.includes(game.event_type)) return false
      if (mapFilters.length > 0 && !mapFilters.includes(game.map)) return false
      if (opponentFilters.length > 0 && (!game.opponent || !opponentFilters.includes(game.opponent))) return false
      if (factionFilters.length > 0 && (!game.faction_matchup || !factionFilters.includes(game.faction_matchup))) return false
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
    resultFilters,
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
    setResultFilters([])
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
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(6,minmax(0,0.8fr))]">
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
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Результат</p>
              <MultiValueFilter
                options={resultOptions}
                selected={resultFilters}
                onSelectionChange={setResultFilters}
                placeholder="Любые результаты"
                searchPlaceholder="Поиск по результатам..."
              />
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
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Дека</p>
              <MultiValueFilter
                options={factionOptions}
                selected={factionFilters}
                onSelectionChange={setFactionFilters}
                placeholder="Любые деки"
                searchPlaceholder="Поиск по декам..."
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
            Каждый фильтр теперь мультивыборный: можно собрать свой набор карт, оппонентов, дек и отрядов, и этот срез
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

      <EventsAnalyticsPanel games={filteredGames} pinnedPlayerIds={pinnedPlayerIds} />
      <GameSliceLeaderboards games={filteredGames} pinnedPlayerIds={pinnedPlayerIds} />
      <PinnedSquadLeaderboards games={filteredGames} pinnedPlayerIds={pinnedPlayerIds} />

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
        <Accordion type="multiple" value={expandedGames} onValueChange={setExpandedGames} className="space-y-3">
          {visibleGames.map((game) => {
            const resultMeta = getResultMeta(game)
            const isFocused = focusTarget?.eventId === game.event_id
            const recordingUrl = normalizeExternalUrl(game.cast_url)
            const tacticsUrl = normalizeExternalUrl(game.tactics_url)

            return (
              <Card
                key={game.event_id}
                id={getGameAnchorId(game.event_id)}
                className={`border transition-colors ${
                  isFocused ? "border-christmas-gold/50 bg-christmas-gold/5" : "border-border/50 bg-card/70"
                }`}
              >
                <AccordionItem value={game.event_id} className="border-0">
                  <AccordionTrigger className="px-4 py-5 hover:no-underline">
                    <div className="flex-1 min-w-0">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)] lg:items-center">
                        <div className="space-y-2 text-left">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={resultMeta.className}>
                              {resultMeta.label}
                            </Badge>
                            <Badge variant="outline" className="border-christmas-gold/30 text-christmas-gold">
                              {game.event_type}
                            </Badge>
                            {game.faction_matchup && (
                              <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
                                {game.faction_matchup}
                              </Badge>
                            )}
                            {isFocused && (
                              <Badge variant="outline" className="border-christmas-gold/40 bg-christmas-gold/10 text-christmas-snow">
                                Открыто из карточки игрока
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-1">
                            <p className="text-base font-semibold text-christmas-snow">
                              {game.map}
                              {game.mode ? ` • ${game.mode}` : ""}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {game.opponent ? `${game.opponent} • ` : ""}
                              {formatMatchDate(game.started_at)}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">{game.event_id}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-left sm:grid-cols-4">
                          <div className="rounded-lg border border-christmas-green/20 bg-christmas-green/10 p-2">
                            <p className="text-[11px] text-muted-foreground">Убийства</p>
                            <p className="text-lg font-semibold text-christmas-snow">{game.totalKills}</p>
                          </div>
                          <div className="rounded-lg border border-christmas-red/20 bg-christmas-red/10 p-2">
                            <p className="text-[11px] text-muted-foreground">Смерти</p>
                            <p className="text-lg font-semibold text-christmas-snow">{game.totalDeaths}</p>
                          </div>
                          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2">
                            <p className="text-[11px] text-muted-foreground">Поднятия</p>
                            <p className="text-lg font-semibold text-christmas-snow">{game.totalRevives}</p>
                          </div>
                          <div className="rounded-lg border border-christmas-gold/20 bg-christmas-gold/10 p-2">
                            <p className="text-[11px] text-muted-foreground">Игроков</p>
                            <p className="text-lg font-semibold text-christmas-snow">{game.participants}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
                        <div className="rounded-lg border border-border/50 bg-background/35 p-3">
                          <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            Дата
                          </p>
                          <p className="mt-2 text-sm font-medium text-christmas-snow">{formatMatchDate(game.started_at)}</p>
                        </div>
                        <div className="rounded-lg border border-border/50 bg-background/35 p-3">
                          <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                            <Users className="w-3.5 h-3.5" />
                            Состав
                          </p>
                          <p className="mt-2 text-sm font-medium text-christmas-snow">
                            MDC {game.mdc_players}
                            {game.enemy_size ? ` • против ${game.enemy_size}` : ""}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/50 bg-background/35 p-3">
                          <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                            <Shield className="w-3.5 h-3.5" />
                            Дека
                          </p>
                          <p className="mt-2 text-sm font-medium text-christmas-snow">
                            {game.faction_matchup || "Не указана"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/50 bg-background/35 p-3">
                          <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                            <Crosshair className="w-3.5 h-3.5" />
                            Ноки / Поднятия
                          </p>
                          <p className="mt-2 text-sm font-medium text-christmas-snow">
                            {game.totalDowns} / {game.totalRevives}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/50 bg-background/35 p-3">
                          <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                            <Trophy className="w-3.5 h-3.5" />
                            Билеты
                          </p>
                          <p className="mt-2 text-sm font-medium text-christmas-snow">{formatTicketSummary(game)}</p>
                        </div>
                        <div className="rounded-lg border border-border/50 bg-background/35 p-3">
                          <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                            <Shield className="w-3.5 h-3.5" />
                            Лучший игрок
                          </p>
                          <p className="mt-2 text-sm font-medium text-christmas-snow">
                            {game.topPerformer ? `${game.topPerformer.nickname} • #${game.topPerformer.rank}` : "Нет данных"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/50 bg-background/35 p-3">
                          <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                            <Trophy className="w-3.5 h-3.5" />
                            Ссылки
                          </p>
                          {recordingUrl || tacticsUrl ? (
                            <div className="mt-1 flex flex-wrap gap-3">
                              {recordingUrl && (
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
                              )}
                              {tacticsUrl && (
                                <a
                                  href={tacticsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-sm text-cyan-200 underline-offset-4 hover:text-christmas-snow hover:underline"
                                  title={tacticsUrl}
                                >
                                  Тактика
                                  <span className="text-[11px] text-muted-foreground">{getLinkHostLabel(tacticsUrl)}</span>
                                </a>
                              )}
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
                          <Table className="min-w-[920px]">
                            <TableHeader>
                              <TableRow className="border-border/60">
                                <TableHead>#</TableHead>
                                <TableHead>Игрок</TableHead>
                                <TableHead>Роль</TableHead>
                                <TableHead>K</TableHead>
                                <TableHead>Dn</TableHead>
                                <TableHead>D</TableHead>
                                <TableHead>Rev</TableHead>
                                <TableHead>K/D</TableHead>
                                <TableHead>Импакт</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {game.players.map((player) => {
                                const isHighlighted =
                                  focusTarget?.eventId === game.event_id && focusTarget.playerId === player.player_id
                                const impactWidth = Math.max(0, Math.min(100, player.impactShare))

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
                                    <TableCell className="text-christmas-snow">{player.kd.toFixed(2)}</TableCell>
                                    <TableCell className="w-[180px]">
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                          <span>{player.impactScore}</span>
                                          <span>{Math.round(player.impactShare)}%</span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-background/70">
                                          <div
                                            className="h-full rounded-full bg-gradient-to-r from-christmas-red via-christmas-gold to-christmas-green"
                                            style={{ width: `${impactWidth}%` }}
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

                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        <div className="rounded-lg border border-christmas-green/20 bg-christmas-green/10 p-3">
                          <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Crosshair className="w-3.5 h-3.5 text-christmas-green" />
                            Убийства
                          </p>
                          <p className="mt-2 text-lg font-semibold text-christmas-snow">{game.totalKills}</p>
                        </div>
                        <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
                          <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Zap className="w-3.5 h-3.5 text-orange-300" />
                            Ноки
                          </p>
                          <p className="mt-2 text-lg font-semibold text-christmas-snow">{game.totalDowns}</p>
                        </div>
                        <div className="rounded-lg border border-christmas-red/20 bg-christmas-red/10 p-3">
                          <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Skull className="w-3.5 h-3.5 text-christmas-red" />
                            Смерти
                          </p>
                          <p className="mt-2 text-lg font-semibold text-christmas-snow">{game.totalDeaths}</p>
                        </div>
                        <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                          <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Heart className="w-3.5 h-3.5 text-blue-300" />
                            Поднятия
                          </p>
                          <p className="mt-2 text-lg font-semibold text-christmas-snow">{game.totalRevives}</p>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Card>
            )
          })}
        </Accordion>
      )}
    </div>
  )
}
