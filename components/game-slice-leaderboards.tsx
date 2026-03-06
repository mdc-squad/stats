"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PlayerAvatar } from "@/components/player-avatar"
import type { PastGameSummary } from "@/lib/data-utils"
import { CircleHelp, Crosshair, Heart, Map as MapIcon, Shield, Skull, Trophy } from "lucide-react"

interface GameSliceLeaderboardsProps {
  games: PastGameSummary[]
  pinnedPlayerIds: string[]
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
  tooltip,
  items,
  emptyText,
  icon: Icon,
}: {
  title: string
  subtitle: string
  tooltip: string
  items: LeaderboardItem[]
  emptyText: string
  icon: typeof Trophy
}) {
  return (
    <Card className="border-border/50 bg-card/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base text-christmas-snow">
              <Icon className="w-4 h-4 text-christmas-gold" />
              {title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/35 text-muted-foreground transition-colors hover:border-christmas-gold/40 hover:text-christmas-gold"
                aria-label={`Пояснение для борда ${title}`}
              >
                <CircleHelp className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs border border-border bg-card text-card-foreground">
              <p className="font-medium text-christmas-snow">{title}</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
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
                <p className="truncate text-sm font-medium text-christmas-snow">{item.label}</p>
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
    </Card>
  )
}

export function GameSliceLeaderboards({ games, pinnedPlayerIds }: GameSliceLeaderboardsProps) {
  const leaderboards = useMemo(() => {
    const pinnedSet = new Set(pinnedPlayerIds)
    const usePinnedOnly = pinnedPlayerIds.length > 0
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
      }
    >()
    const playerOpponentMap = new Map<
      string,
      {
        player_id: string
        nickname: string
        steam_id: string
        opponent: string
        matches: number
        resolvedMatches: number
        wins: number
        kills: number
        downs: number
        deaths: number
        revives: number
        impact: number
        ticketDiffTotal: number
        ticketDiffSamples: number
      }
    >()

    games.forEach((game) => {
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
          opponentEntry.kills += game.totalKills
          opponentEntry.deaths += game.totalDeaths
          opponentEntry.downs += game.totalDowns
          opponentEntry.revives += game.totalRevives

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
          })
        }

        const comboEntry = comboMap.get(comboKey)
        if (comboEntry) {
          comboEntry.matches += 1
          comboEntry.kills += game.totalKills
          comboEntry.downs += game.totalDowns

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

      game.players.forEach((player) => {
        if (usePinnedOnly && !pinnedSet.has(player.player_id)) {
          return
        }

        const playerKey = `${player.player_id}::${game.opponent}`
        if (!playerOpponentMap.has(playerKey)) {
          playerOpponentMap.set(playerKey, {
            player_id: player.player_id,
            nickname: player.nickname,
            steam_id: player.steam_id,
            opponent: game.opponent,
            matches: 0,
            resolvedMatches: 0,
            wins: 0,
            kills: 0,
            downs: 0,
            deaths: 0,
            revives: 0,
            impact: 0,
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
        entry.impact += player.impactScore

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
        avgKills: entry.matches > 0 ? entry.kills / entry.matches : 0,
        avgRevives: entry.matches > 0 ? entry.revives / entry.matches : 0,
      })),
    )

    const comboRows = withSampleFloor(
      Array.from(comboMap.values()).map((entry) => ({
        ...entry,
        winRate: entry.resolvedMatches > 0 ? (entry.wins / entry.resolvedMatches) * 100 : 0,
        avgTicketDiff: entry.ticketDiffSamples > 0 ? entry.ticketDiffTotal / entry.ticketDiffSamples : 0,
        avgKills: entry.matches > 0 ? entry.kills / entry.matches : 0,
        avgDowns: entry.matches > 0 ? entry.downs / entry.matches : 0,
      })),
    )

    const playerOpponentRows = withSampleFloor(
      Array.from(playerOpponentMap.values()).map((entry) => ({
        ...entry,
        winRate: entry.resolvedMatches > 0 ? (entry.wins / entry.resolvedMatches) * 100 : 0,
        avgTicketDiff: entry.ticketDiffSamples > 0 ? entry.ticketDiffTotal / entry.ticketDiffSamples : 0,
        avgKills: entry.matches > 0 ? entry.kills / entry.matches : 0,
        avgDowns: entry.matches > 0 ? entry.downs / entry.matches : 0,
        avgDeaths: entry.matches > 0 ? entry.deaths / entry.matches : 0,
        avgRevives: entry.matches > 0 ? entry.revives / entry.matches : 0,
        avgImpact: entry.matches > 0 ? entry.impact / entry.matches : 0,
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
        steam_id: string
        matches: number
        resolvedMatches: number
        wins: number
        kills: number
        deaths: number
        revives: number
        impact: number
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
          steam_id: entry.steam_id,
          matches: 0,
          resolvedMatches: 0,
          wins: 0,
          kills: 0,
          deaths: 0,
          revives: 0,
          impact: 0,
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
      current.revives += entry.revives
      current.impact += entry.impact
      current.opponents.add(entry.opponent)
    })

    const strongPlayerRows = withSampleFloor(
      Array.from(strongPlayerMap.values()).map((entry) => ({
        ...entry,
        winRate: entry.resolvedMatches > 0 ? (entry.wins / entry.resolvedMatches) * 100 : 0,
        avgImpact: entry.matches > 0 ? entry.impact / entry.matches : 0,
        avgDeaths: entry.matches > 0 ? entry.deaths / entry.matches : 0,
        kd: entry.deaths > 0 ? entry.kills / entry.deaths : entry.kills,
      })),
    )

    return {
      playerScopeLabel: usePinnedOnly ? "среди закрепленных игроков" : "по всему составу",
      bestOpponents: opponentRows
        .filter((entry) => entry.wins > 0)
        .sort((left, right) => {
          if (right.winRate !== left.winRate) return right.winRate - left.winRate
          if (right.avgTicketDiff !== left.avgTicketDiff) return right.avgTicketDiff - left.avgTicketDiff
          return right.matches - left.matches
        })
        .slice(0, 5)
        .map<LeaderboardItem>((entry) => ({
          key: `best-${entry.opponent}`,
          label: entry.opponent,
          subtitle: `${entry.matches} игр • WR ${entry.winRate.toFixed(0)}%`,
          metricLabel: "Средний разрыв",
          metric: formatSigned(entry.avgTicketDiff),
          helperLabel: "Средние убийства",
          helper: `${entry.avgKills.toFixed(1)} за матч`,
        })),
      hardOpponents: opponentRows
        .filter((entry) => entry.losses > 0)
        .sort((left, right) => {
          if (left.winRate !== right.winRate) return left.winRate - right.winRate
          if (left.avgTicketDiff !== right.avgTicketDiff) return left.avgTicketDiff - right.avgTicketDiff
          return right.matches - left.matches
        })
        .slice(0, 5)
        .map<LeaderboardItem>((entry) => ({
          key: `hard-${entry.opponent}`,
          label: entry.opponent,
          subtitle: `${entry.matches} игр • WR ${entry.winRate.toFixed(0)}%`,
          metricLabel: "Средний разрыв",
          metric: formatSigned(entry.avgTicketDiff),
          helperLabel: "Средние поднятия",
          helper: `${entry.avgRevives.toFixed(1)} за матч`,
        })),
      bestCombos: comboRows
        .sort((left, right) => {
          if (right.avgTicketDiff !== left.avgTicketDiff) return right.avgTicketDiff - left.avgTicketDiff
          if (right.winRate !== left.winRate) return right.winRate - left.winRate
          return right.matches - left.matches
        })
        .slice(0, 5)
        .map<LeaderboardItem>((entry) => ({
          key: `combo-${entry.label}`,
          label: entry.label,
          subtitle: `${entry.matches} игр • WR ${entry.winRate.toFixed(0)}%`,
          metricLabel: "Средний разрыв",
          metric: formatSigned(entry.avgTicketDiff),
          helperLabel: "Средние K / Dn",
          helper: `${entry.avgKills.toFixed(1)} / ${entry.avgDowns.toFixed(1)}`,
        })),
      medicOpponents: playerOpponentRows
        .sort((left, right) => {
          if (right.avgRevives !== left.avgRevives) return right.avgRevives - left.avgRevives
          if (right.avgImpact !== left.avgImpact) return right.avgImpact - left.avgImpact
          return right.matches - left.matches
        })
        .slice(0, 5)
        .map<LeaderboardItem>((entry) => ({
          key: `medic-${entry.player_id}-${entry.opponent}`,
          label: `${entry.nickname} • ${entry.opponent}`,
          subtitle: `${entry.matches} игр • WR ${entry.winRate.toFixed(0)}%`,
          metricLabel: "Поднятия за матч",
          metric: entry.avgRevives.toFixed(1),
          helperLabel: "Средний импакт",
          helper: entry.avgImpact.toFixed(0),
          steamId: entry.steam_id,
          nickname: entry.nickname,
        })),
      killerOpponents: playerOpponentRows
        .sort((left, right) => {
          if (right.avgKills !== left.avgKills) return right.avgKills - left.avgKills
          if (right.avgDowns !== left.avgDowns) return right.avgDowns - left.avgDowns
          if (right.kd !== left.kd) return right.kd - left.kd
          return right.matches - left.matches
        })
        .slice(0, 5)
        .map<LeaderboardItem>((entry) => ({
          key: `killer-${entry.player_id}-${entry.opponent}`,
          label: `${entry.nickname} • ${entry.opponent}`,
          subtitle: `${entry.matches} игр • Dn ${entry.avgDowns.toFixed(1)} / матч`,
          metricLabel: "Убийства за матч",
          metric: entry.avgKills.toFixed(1),
          helperLabel: "Средний K/D",
          helper: entry.kd.toFixed(2),
          steamId: entry.steam_id,
          nickname: entry.nickname,
        })),
      strongMatchPlayers: strongPlayerRows
        .sort((left, right) => {
          if (right.avgImpact !== left.avgImpact) return right.avgImpact - left.avgImpact
          if (right.kd !== left.kd) return right.kd - left.kd
          return left.avgDeaths - right.avgDeaths
        })
        .slice(0, 5)
        .map<LeaderboardItem>((entry) => ({
          key: `strong-${entry.player_id}`,
          label: entry.nickname,
          subtitle: `${entry.matches} игр • ${Array.from(entry.opponents).slice(0, 2).join(", ") || "тяжелые соперники"}`,
          metricLabel: "Импакт за матч",
          metric: entry.avgImpact.toFixed(0),
          helperLabel: "Средний K/D",
          helper: entry.kd.toFixed(2),
          steamId: entry.steam_id,
          nickname: entry.nickname,
        })),
    }
  }, [games, pinnedPlayerIds])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-christmas-snow">Игровые лидерборды</p>
          <p className="text-sm text-muted-foreground">
            Готовые матчевые срезы по кланам, связкам карта + оппонент и персональным выступлениям {leaderboards.playerScopeLabel}
          </p>
        </div>
        <Badge variant="outline" className="border-christmas-gold/30 text-christmas-gold">
          {games.length} матчей в срезе
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <SliceLeaderboardCard
          title="Против кого заходит"
          subtitle="Оппоненты, против которых у нас лучший средний разрыв и стабильный WR"
          tooltip="Главное число справа — средний разрыв билетов за матч: положительное значит, что этот соперник чаще закрывается с запасом, отрицательное — что игры получаются вязкими или проигрышными. Ниже показаны средние убийства за матч. Этот срез помогает отделить комфортные победы от случайных разовых успехов."
          items={leaderboards.bestOpponents}
          emptyText="Недостаточно матчей с явно успешными соперниками в текущем срезе."
          icon={Trophy}
        />
        <SliceLeaderboardCard
          title="Кому чаще отдаём"
          subtitle="Самые неприятные оппоненты по win rate и среднему разрыву билетов"
          tooltip="Главное число — средний разрыв билетов, но уже с акцентом на слабые матчапы: чем сильнее минус, тем болезненнее средний итог против этого клана. Дополнительная метрика — средние поднятия за матч, она показывает, сколько ресурса уходит на стабилизацию команды под этим давлением."
          items={leaderboards.hardOpponents}
          emptyText="В текущем срезе нет выраженных проблемных соперников."
          icon={Skull}
        />
        <SliceLeaderboardCard
          title="Связки Карта + Оппонент"
          subtitle="Где конкретная карта против конкретного клана особенно хорошо складывается"
          tooltip="Этот борд смотрит не просто на клан или карту по отдельности, а на конкретную связку. Главное число — средний разрыв билетов, ниже — средние убийства и ноки за матч. Такой срез нужен, чтобы находить сценарии, где именно на этой карте против этого соперника мы раскрываемся лучше всего."
          items={leaderboards.bestCombos}
          emptyText="Не хватает повторяющихся сочетаний карта + оппонент."
          icon={MapIcon}
        />
        <SliceLeaderboardCard
          title="Лучшие Реаним-Паки"
          subtitle={`Кто больше всего поднимает против конкретных кланов ${leaderboards.playerScopeLabel}`}
          tooltip="Главная метрика — среднее число поднятий конкретного игрока за матч против данного клана. Ниже — средний импакт, чтобы видеть, не сводится ли вклад только к ревайвам. Борд помогает понять, кто лучше всего удерживает строй команды в тяжёлых разменах."
          items={leaderboards.medicOpponents}
          emptyText="Нет устойчивых матчапов по поднятиям в текущем срезе."
          icon={Heart}
        />
        <SliceLeaderboardCard
          title="Лучшие Убийцы По Кланам"
          subtitle={`Кто чаще всего делает фраги и ноки против конкретных оппонентов ${leaderboards.playerScopeLabel}`}
          tooltip="Главное число — средние убийства игрока за матч против конкретного оппонента. Ниже — его средний K/D в этом matchup. Этот рейтинг показывает, кто лучше всего конвертирует контакты во фраги именно против определённых кланов, а не в среднем по больнице."
          items={leaderboards.killerOpponents}
          emptyText="Недостаточно данных для персональных килл-мэтчапов."
          icon={Crosshair}
        />
        <SliceLeaderboardCard
          title="Холодная Голова В Тяжёлых Матчах"
          subtitle="Игроки, которые лучше всего держат импакт против самых неудобных соперников"
          tooltip="Здесь собираются игроки, которые не проседают по качеству игры против самых неудобных оппонентов. Главное число — средний импакт за матч, ниже — средний K/D. Борд полезен для понимания, на кого можно опираться в матчах против реально неприятных соперников."
          items={leaderboards.strongMatchPlayers}
          emptyText="Не нашлось тяжёлых матчапов, на которых можно собрать отдельный рейтинг."
          icon={Shield}
        />
      </div>
    </div>
  )
}
