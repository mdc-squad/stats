"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayerAvatar } from "@/components/player-avatar"
import { getMetricIcon } from "@/lib/app-icons"
import type { PastGameSummary } from "@/lib/data-utils"
import { cn } from "@/lib/utils"
import { ChevronDown, Crosshair, Map as MapIcon, Shield, Skull, Trophy } from "lucide-react"

interface GameSliceLeaderboardsProps {
  games: PastGameSummary[]
  selectedPlayerIds: string[]
}

type LeaderboardItem = {
  key: string
  label: string
  subtitle: string
  metricLabel: string
  metric: string
  helperLabel: string
  helper: string
  steamId?: string
  nickname?: string
  tag?: string
}

type LeaderboardCardConfig = {
  key: string
  title: string
  subtitle: string
  items: LeaderboardItem[]
  emptyText: string
  icon: typeof Trophy
}

const GAME_LEADERBOARD_LIMIT = 10

function getTicketDiff(game: Pick<PastGameSummary, "tickets_1" | "tickets_2" | "score">): number | null {
  if (game.score !== null) {
    return game.score
  }

  if (game.tickets_1 !== null && game.tickets_2 !== null) {
    return game.tickets_1 - game.tickets_2
  }

  return null
}

function formatSigned(value: number, digits = 0): string {
  const rounded = digits === 0 ? Math.round(value).toString() : value.toFixed(digits)
  return `${value > 0 ? "+" : ""}${rounded}`
}

function withSampleFloor<T extends { matches: number }>(items: T[]): T[] {
  const reliable = items.filter((item) => item.matches >= 2)
  return reliable.length >= 3 ? reliable : items
}

function SliceLeaderboardCard({
  title,
  subtitle,
  items,
  emptyText,
  icon: Icon,
  isExpanded,
  onToggle,
}: {
  title: string
  subtitle: string
  items: LeaderboardItem[]
  emptyText: string
  icon: typeof Trophy
  isExpanded: boolean
  onToggle: () => void
}) {
  const topItem = items[0]

  return (
    <Card className="border-border/50 bg-card/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base text-christmas-snow">
              <Icon className="w-4 h-4 text-christmas-gold" />
              {title}
            </CardTitle>
            <p className={cn("text-sm", !isExpanded && topItem ? "font-medium text-christmas-snow" : "text-muted-foreground")}>
              {!isExpanded && topItem ? `${topItem.label} - ${topItem.metricLabel}: ${topItem.metric}` : subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-label={isExpanded ? "Свернуть лидерборд" : "Развернуть лидерборд"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/40 text-muted-foreground transition-colors hover:text-christmas-snow"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
          </button>
        </div>
      </CardHeader>
      {isExpanded ? (
        <CardContent className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-lg border border-border/50 bg-background/30 p-4 text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            items.map((item, index) => (
              <div
                key={item.key}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/35 px-3 py-2"
              >
                <span className="w-6 text-center font-mono text-sm text-christmas-gold">{index + 1}</span>
                {item.steamId ? (
                  <PlayerAvatar steamId={item.steamId} nickname={item.nickname || item.label} size="sm" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-christmas-snow">
                    {item.tag ? <span className="mr-1 text-christmas-snow">{item.tag}</span> : null}
                    {item.label}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{item.subtitle}</p>
                </div>
                <div className="min-w-[132px] text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.metricLabel}</p>
                  <p className="text-sm font-semibold text-christmas-snow">{item.metric}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.helperLabel}: {item.helper}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      ) : null}
    </Card>
  )
}

export function GameSliceLeaderboards({ games, selectedPlayerIds }: GameSliceLeaderboardsProps) {
  const RevivesIcon = getMetricIcon("revives")
  const [expandedRows, setExpandedRows] = useState<number[]>([])

  const leaderboards = useMemo(() => {
    const selectedSet = new Set(selectedPlayerIds)
    const useSelectedOnly = selectedPlayerIds.length > 0
    const relevantGames = games.filter((game) => !useSelectedOnly || game.players.some((player) => selectedSet.has(player.player_id)))
    const opponentMap = new Map<
      string,
      {
        opponent: string
        matches: number
        resolvedMatches: number
        wins: number
        losses: number
        ticketDiffTotal: number
        ticketDiffSamples: number
        kills: number
        deaths: number
        downs: number
        revives: number
      }
    >()
    const comboMap = new Map<
      string,
      {
        label: string
        matches: number
        resolvedMatches: number
        wins: number
        ticketDiffTotal: number
        ticketDiffSamples: number
        kills: number
        downs: number
        deaths: number
      }
    >()
    const playerOpponentMap = new Map<
      string,
      {
        player_id: string
        nickname: string
        tag: string
        steam_id: string
        opponent: string
        matches: number
        resolvedMatches: number
        wins: number
        kills: number
        downs: number
        deaths: number
        revives: number
        heals: number
        elo: number
        ticketDiffTotal: number
        ticketDiffSamples: number
      }
    >()

    relevantGames.forEach((game) => {
      const scopedPlayers = useSelectedOnly
        ? game.players.filter((player) => selectedSet.has(player.player_id))
        : game.players

      if (scopedPlayers.length === 0) {
        return
      }

      if (game.opponent) {
        if (!opponentMap.has(game.opponent)) {
          opponentMap.set(game.opponent, {
            opponent: game.opponent,
            matches: 0,
            resolvedMatches: 0,
            wins: 0,
            losses: 0,
            ticketDiffTotal: 0,
            ticketDiffSamples: 0,
            kills: 0,
            deaths: 0,
            downs: 0,
            revives: 0,
          })
        }

        const opponentEntry = opponentMap.get(game.opponent)
        if (opponentEntry) {
          opponentEntry.matches += 1
          opponentEntry.kills += scopedPlayers.reduce((sum, player) => sum + player.kills, 0)
          opponentEntry.deaths += scopedPlayers.reduce((sum, player) => sum + player.deaths, 0)
          opponentEntry.downs += scopedPlayers.reduce((sum, player) => sum + player.downs, 0)
          opponentEntry.revives += scopedPlayers.reduce((sum, player) => sum + player.revives, 0)

          const ticketDiff = getTicketDiff(game)
          if (ticketDiff !== null) {
            opponentEntry.ticketDiffTotal += ticketDiff
            opponentEntry.ticketDiffSamples += 1
          }

          if (game.is_win !== null) {
            opponentEntry.resolvedMatches += 1
            if (game.is_win) {
              opponentEntry.wins += 1
            } else {
              opponentEntry.losses += 1
            }
          }
        }
      }

      if (game.map && game.opponent) {
        const comboKey = `${game.map} :: ${game.opponent}`
        if (!comboMap.has(comboKey)) {
          comboMap.set(comboKey, {
            label: `${game.map} • ${game.opponent}`,
            matches: 0,
            resolvedMatches: 0,
            wins: 0,
            ticketDiffTotal: 0,
            ticketDiffSamples: 0,
            kills: 0,
            downs: 0,
            deaths: 0,
          })
        }

        const comboEntry = comboMap.get(comboKey)
        if (comboEntry) {
          comboEntry.matches += 1
          comboEntry.kills += scopedPlayers.reduce((sum, player) => sum + player.kills, 0)
          comboEntry.downs += scopedPlayers.reduce((sum, player) => sum + player.downs, 0)
          comboEntry.deaths += scopedPlayers.reduce((sum, player) => sum + player.deaths, 0)

          const ticketDiff = getTicketDiff(game)
          if (ticketDiff !== null) {
            comboEntry.ticketDiffTotal += ticketDiff
            comboEntry.ticketDiffSamples += 1
          }

          if (game.is_win !== null) {
            comboEntry.resolvedMatches += 1
            if (game.is_win) {
              comboEntry.wins += 1
            }
          }
        }
      }

      if (!game.opponent) {
        return
      }

      scopedPlayers.forEach((player) => {
        const playerKey = `${player.player_id}::${game.opponent}`
        if (!playerOpponentMap.has(playerKey)) {
          playerOpponentMap.set(playerKey, {
            player_id: player.player_id,
            nickname: player.nickname,
            tag: player.tag,
            steam_id: player.steam_id,
            opponent: game.opponent!,
            matches: 0,
            resolvedMatches: 0,
            wins: 0,
            kills: 0,
            downs: 0,
            deaths: 0,
            revives: 0,
            heals: 0,
            elo: 0,
            ticketDiffTotal: 0,
            ticketDiffSamples: 0,
          })
        }

        const entry = playerOpponentMap.get(playerKey)
        if (!entry) return

        entry.matches += 1
        entry.kills += player.kills
        entry.downs += player.downs
        entry.deaths += player.deaths
        entry.revives += player.revives
        entry.heals += player.heals
        entry.elo += player.elo

        const ticketDiff = getTicketDiff(game)
        if (ticketDiff !== null) {
          entry.ticketDiffTotal += ticketDiff
          entry.ticketDiffSamples += 1
        }

        if (game.is_win !== null) {
          entry.resolvedMatches += 1
          if (game.is_win) {
            entry.wins += 1
          }
        }
      })
    })

    const opponentRows = withSampleFloor(
      Array.from(opponentMap.values()).map((entry) => ({
        ...entry,
        winRate: entry.resolvedMatches > 0 ? (entry.wins / entry.resolvedMatches) * 100 : 0,
        avgTicketDiff: entry.ticketDiffSamples > 0 ? entry.ticketDiffTotal / entry.ticketDiffSamples : 0,
        kd: entry.deaths > 0 ? entry.kills / entry.deaths : entry.kills,
        avgRevives: entry.matches > 0 ? entry.revives / entry.matches : 0,
      })),
    )

    const comboRows = withSampleFloor(
      Array.from(comboMap.values()).map((entry) => ({
        ...entry,
        winRate: entry.resolvedMatches > 0 ? (entry.wins / entry.resolvedMatches) * 100 : 0,
        avgTicketDiff: entry.ticketDiffSamples > 0 ? entry.ticketDiffTotal / entry.ticketDiffSamples : 0,
        kd: entry.deaths > 0 ? entry.kills / entry.deaths : entry.kills,
      })),
    )

    const playerOpponentRows = withSampleFloor(
      Array.from(playerOpponentMap.values()).map((entry) => ({
        ...entry,
        winRate: entry.resolvedMatches > 0 ? (entry.wins / entry.resolvedMatches) * 100 : 0,
        avgTicketDiff: entry.ticketDiffSamples > 0 ? entry.ticketDiffTotal / entry.ticketDiffSamples : 0,
        avgKills: entry.matches > 0 ? entry.kills / entry.matches : 0,
        avgDowns: entry.matches > 0 ? entry.downs / entry.matches : 0,
        avgRevives: entry.matches > 0 ? entry.revives / entry.matches : 0,
        avgHeals: entry.matches > 0 ? entry.heals / entry.matches : 0,
        avgElo: entry.matches > 0 ? entry.elo / entry.matches : 0,
        kd: entry.deaths > 0 ? entry.kills / entry.deaths : entry.kills,
      })),
    )

    const strongOpponents = new Set(
      opponentRows
        .filter((entry) => entry.matches >= 2 && (entry.winRate <= 45 || entry.avgTicketDiff <= -20))
        .map((entry) => entry.opponent),
    )

    if (strongOpponents.size === 0) {
      opponentRows
        .filter((entry) => entry.losses > 0)
        .sort((left, right) => {
          if (left.winRate !== right.winRate) return left.winRate - right.winRate
          return left.avgTicketDiff - right.avgTicketDiff
        })
        .slice(0, 4)
        .forEach((entry) => strongOpponents.add(entry.opponent))
    }

    const strongPlayerMap = new Map<
      string,
      {
        player_id: string
        nickname: string
        tag: string
        steam_id: string
        matches: number
        resolvedMatches: number
        wins: number
        kills: number
        deaths: number
        elo: number
        opponents: Set<string>
      }
    >()

    playerOpponentRows.forEach((entry) => {
      if (!strongOpponents.has(entry.opponent)) {
        return
      }

      if (!strongPlayerMap.has(entry.player_id)) {
        strongPlayerMap.set(entry.player_id, {
          player_id: entry.player_id,
          nickname: entry.nickname,
          tag: entry.tag,
          steam_id: entry.steam_id,
          matches: 0,
          resolvedMatches: 0,
          wins: 0,
          kills: 0,
          deaths: 0,
          elo: 0,
          opponents: new Set<string>(),
        })
      }

      const current = strongPlayerMap.get(entry.player_id)
      if (!current) return

      current.matches += entry.matches
      current.resolvedMatches += entry.resolvedMatches
      current.wins += entry.wins
      current.kills += entry.kills
      current.deaths += entry.deaths
      current.elo += entry.elo
      current.opponents.add(entry.opponent)
    })

    const strongPlayerRows = withSampleFloor(
      Array.from(strongPlayerMap.values()).map((entry) => ({
        ...entry,
        winRate: entry.resolvedMatches > 0 ? (entry.wins / entry.resolvedMatches) * 100 : 0,
        avgElo: entry.matches > 0 ? entry.elo / entry.matches : 0,
        kd: entry.deaths > 0 ? entry.kills / entry.deaths : entry.kills,
      })),
    )

    return {
      bestOpponents: opponentRows
        .filter((entry) => entry.wins > 0)
        .sort((left, right) => {
          if (right.winRate !== left.winRate) return right.winRate - left.winRate
          if (right.avgTicketDiff !== left.avgTicketDiff) return right.avgTicketDiff - left.avgTicketDiff
          return right.matches - left.matches
        })
        .slice(0, GAME_LEADERBOARD_LIMIT)
        .map<LeaderboardItem>((entry) => ({
          key: `best-${entry.opponent}`,
          label: entry.opponent,
          subtitle: `${entry.matches} игр • WR ${entry.winRate.toFixed(0)}%`,
          metricLabel: "Ср. разница",
          metric: formatSigned(entry.avgTicketDiff),
          helperLabel: "Среднее K/D",
          helper: entry.kd.toFixed(2),
        })),
      hardOpponents: opponentRows
        .filter((entry) => entry.losses > 0)
        .sort((left, right) => {
          if (left.winRate !== right.winRate) return left.winRate - right.winRate
          if (left.avgTicketDiff !== right.avgTicketDiff) return left.avgTicketDiff - right.avgTicketDiff
          return right.matches - left.matches
        })
        .slice(0, GAME_LEADERBOARD_LIMIT)
        .map<LeaderboardItem>((entry) => ({
          key: `hard-${entry.opponent}`,
          label: entry.opponent,
          subtitle: `${entry.matches} игр • WR ${entry.winRate.toFixed(0)}%`,
          metricLabel: "Ср. разница",
          metric: formatSigned(entry.avgTicketDiff),
          helperLabel: "K/D",
          helper: entry.kd.toFixed(2),
        })),
      bestCombos: comboRows
        .sort((left, right) => {
          if (right.avgTicketDiff !== left.avgTicketDiff) return right.avgTicketDiff - left.avgTicketDiff
          if (right.winRate !== left.winRate) return right.winRate - left.winRate
          return right.matches - left.matches
        })
        .slice(0, GAME_LEADERBOARD_LIMIT)
        .map<LeaderboardItem>((entry) => ({
          key: `combo-${entry.label}`,
          label: entry.label,
          subtitle: `${entry.matches} игр • WR ${entry.winRate.toFixed(0)}%`,
          metricLabel: "Ср. разница",
          metric: formatSigned(entry.avgTicketDiff),
          helperLabel: "K/D",
          helper: entry.kd.toFixed(2),
        })),
      medicOpponents: playerOpponentRows
        .sort((left, right) => {
          if (right.avgRevives !== left.avgRevives) return right.avgRevives - left.avgRevives
          if (right.avgTicketDiff !== left.avgTicketDiff) return right.avgTicketDiff - left.avgTicketDiff
          return right.matches - left.matches
        })
        .slice(0, GAME_LEADERBOARD_LIMIT)
        .map<LeaderboardItem>((entry) => ({
          key: `medic-${entry.player_id}-${entry.opponent}`,
          label: `${entry.nickname} • ${entry.opponent}`,
          subtitle: `${entry.matches} игр • WR ${entry.winRate.toFixed(0)}%`,
          metricLabel: "Поднятия",
          metric: entry.avgRevives.toFixed(1),
          helperLabel: "Ср. хил",
          helper: entry.avgHeals.toFixed(1),
          steamId: entry.steam_id,
          nickname: entry.nickname,
          tag: entry.tag,
        })),
      killerOpponents: playerOpponentRows
        .sort((left, right) => {
          if (right.avgKills !== left.avgKills) return right.avgKills - left.avgKills
          if (right.avgDowns !== left.avgDowns) return right.avgDowns - left.avgDowns
          if (right.kd !== left.kd) return right.kd - left.kd
          return right.matches - left.matches
        })
        .slice(0, GAME_LEADERBOARD_LIMIT)
        .map<LeaderboardItem>((entry) => ({
          key: `killer-${entry.player_id}-${entry.opponent}`,
          label: `${entry.nickname} • ${entry.opponent}`,
          subtitle: `${entry.matches} игр • Ноки ${entry.avgDowns.toFixed(1)} / матч`,
          metricLabel: "Убийства",
          metric: entry.avgKills.toFixed(1),
          helperLabel: "Среднее K/D",
          helper: entry.kd.toFixed(2),
          steamId: entry.steam_id,
          nickname: entry.nickname,
          tag: entry.tag,
        })),
      strongMatchPlayers: strongPlayerRows
        .sort((left, right) => {
          if (right.avgElo !== left.avgElo) return right.avgElo - left.avgElo
          if (right.kd !== left.kd) return right.kd - left.kd
          return right.matches - left.matches
        })
        .slice(0, GAME_LEADERBOARD_LIMIT)
        .map<LeaderboardItem>((entry) => ({
          key: `strong-${entry.player_id}`,
          label: entry.nickname,
          subtitle: `${entry.matches} игр • ${Array.from(entry.opponents).slice(0, 2).join(", ") || "сильные соперники"}`,
          metricLabel: "ELO",
          metric: entry.avgElo.toFixed(1),
          helperLabel: "K/D",
          helper: entry.kd.toFixed(2),
          steamId: entry.steam_id,
          nickname: entry.nickname,
          tag: entry.tag,
        })),
      matchCount: relevantGames.length,
    }
  }, [games, selectedPlayerIds])

  const leaderboardCards: LeaderboardCardConfig[] = [
    {
      key: "bestOpponents",
      title: "Лёгкие оппоненты",
      subtitle: "Оппоненты, против которых лучшая средняя разница по тикетам и стабильно побеждаем.",
      items: leaderboards.bestOpponents,
      emptyText: "Недостаточно матчей с выраженно успешными оппонентами по текущему фильтру.",
      icon: Trophy,
    },
    {
      key: "hardOpponents",
      title: "Сложные оппоненты",
      subtitle: "Оппоненты, против которых худшая средняя разница по тикетам и часто проигрываем.",
      items: leaderboards.hardOpponents,
      emptyText: "По текущему фильтру нет выраженных проблемных оппонентов.",
      icon: Skull,
    },
    {
      key: "bestCombos",
      title: "Связки Карта + Оппонент",
      subtitle: "Лучшие результаты по картам против конкретного оппонента.",
      items: leaderboards.bestCombos,
      emptyText: "Не хватает повторяющихся сочетаний карта + оппонент.",
      icon: MapIcon,
    },
    {
      key: "medicOpponents",
      title: "Лучшие медики",
      subtitle: "Больше всего поднятий против конкретных кланов.",
      items: leaderboards.medicOpponents,
      emptyText: "Нет устойчивых подборок по поднятиям по текущему фильтру.",
      icon: RevivesIcon,
    },
    {
      key: "killerOpponents",
      title: "Лучшие Убийцы",
      subtitle: "Больше всего убийств против конкретного оппонента.",
      items: leaderboards.killerOpponents,
      emptyText: "Недостаточно данных для персональной выборки по убийствам.",
      icon: Crosshair,
    },
    {
      key: "strongMatchPlayers",
      title: "Холодная голова",
      subtitle: "Самый большой ELO против самых сильных соперников.",
      items: leaderboards.strongMatchPlayers,
      emptyText: "Не нашлось тяжёлых противостояний, на которых можно собрать отдельный рейтинг.",
      icon: Shield,
    },
  ]

  const leaderboardRows = leaderboardCards.reduce<LeaderboardCardConfig[][]>((rows, card, index) => {
    if (index % 2 === 0) {
      rows.push([card])
    } else {
      rows[rows.length - 1].push(card)
    }
    return rows
  }, [])

  const toggleRow = (rowIndex: number) => {
    setExpandedRows((current) =>
      current.includes(rowIndex) ? current.filter((value) => value !== rowIndex) : [...current, rowIndex],
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-base font-semibold text-christmas-snow">Игровые лидерборды</p>
        <Badge variant="outline" className="border-christmas-gold/30 text-christmas-gold">
          {leaderboards.matchCount} матчей по фильтру игроков
        </Badge>
      </div>

      <div className="space-y-4">
        {leaderboardRows.map((row, rowIndex) => {
          const isExpanded = expandedRows.includes(rowIndex)
          return (
            <div key={`leaderboard-row-${rowIndex}`} className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
              {row.map((card) => (
                <SliceLeaderboardCard
                  key={card.key}
                  title={card.title}
                  subtitle={card.subtitle}
                  items={card.items}
                  emptyText={card.emptyText}
                  icon={card.icon}
                  isExpanded={isExpanded}
                  onToggle={() => toggleRow(rowIndex)}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
