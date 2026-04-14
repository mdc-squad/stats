"use client"

import { useEffect, useMemo, useState } from "react"
import { PlayerAvatar } from "@/components/player-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getMetricIcon } from "@/lib/app-icons"
import type { MatchRecordMetric, PlayerEventStat } from "@/lib/data-utils"
import { cn } from "@/lib/utils"

interface BestMatch extends PlayerEventStat {
  eventType: string
  map: string
  date: string
  isWin: boolean | null
}

interface BestMatchesProps {
  matches: BestMatch[]
  players: { player_id: string; steam_id: string }[]
  title?: string
  metric?: MatchRecordMetric
  isCollapsed?: boolean
}

const DEFAULT_COLLAPSED_COUNT = 10
const TOP_CARD_CLASS =
  "flex flex-col overflow-hidden border-christmas-gold/30 bg-gradient-to-br from-christmas-red/5 via-card to-christmas-green/5"

function getMetricNumericValue(match: BestMatch, metric: MatchRecordMetric): number {
  if (metric === "kd") {
    return match.kd
  }

  if (metric === "kda") {
    return match.kda
  }

  if (metric === "elo") {
    return match.elo
  }

  return match[metric]
}

function compareMatchesByMetric(left: BestMatch, right: BestMatch, metric: MatchRecordMetric): number {
  const leftValue = getMetricNumericValue(left, metric)
  const rightValue = getMetricNumericValue(right, metric)

  if (rightValue !== leftValue) {
    return rightValue - leftValue
  }
  if (right.kills !== left.kills) {
    return right.kills - left.kills
  }
  if (left.deaths !== right.deaths) {
    return left.deaths - right.deaths
  }
  return left.nickname.localeCompare(right.nickname, "ru")
}

function getMetricValue(match: BestMatch, metric: MatchRecordMetric): string {
  if (metric === "kd") {
    return match.kd.toFixed(2)
  }

  if (metric === "kda") {
    return match.kda.toFixed(2)
  }

  if (metric === "elo") {
    return match.elo.toFixed(0)
  }

  return match[metric].toLocaleString("ru-RU")
}

function getMetricLabel(metric: MatchRecordMetric): string {
  if (metric === "kd") return "K/D"
  if (metric === "kda") return "KDA"
  if (metric === "elo") return "ELO"
  if (metric === "kills") return "Убийства"
  if (metric === "downs") return "Ноки"
  if (metric === "deaths") return "Смерти"
  if (metric === "revives") return "Поднятия"
  if (metric === "heals") return "Хил"
  return "Техника"
}

export function BestMatches({
  matches,
  players,
  title = "Рекорды по K/D",
  metric = "kd",
  isCollapsed = false,
}: BestMatchesProps) {
  const [showAll, setShowAll] = useState(false)
  const TitleIcon = getMetricIcon(metric)

  useEffect(() => {
    if (isCollapsed) {
      setShowAll(false)
    }
  }, [isCollapsed])

  const playerSteamIds = useMemo(() => new Map(players.map((player) => [player.player_id, player.steam_id])), [players])
  const sortedMatches = useMemo(
    () =>
      matches
        .map((match) => ({ ...match, steam_id: playerSteamIds.get(match.player_id) ?? "" }))
        .sort((left, right) => compareMatchesByMetric(left, right, metric)),
    [matches, metric, playerSteamIds],
  )

  const canExpand = sortedMatches.length > DEFAULT_COLLAPSED_COUNT
  const visibleRecords = showAll ? sortedMatches : sortedMatches.slice(0, DEFAULT_COLLAPSED_COUNT)

  return (
    <div className="relative">
      <Card className={cn(TOP_CARD_CLASS, showAll && "h-[720px]")}>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-christmas-gold">
              <TitleIcon className="w-4 h-4" />
              <span className="truncate">{title}</span>
            </CardTitle>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {showAll ? `Игроков в топе: ${sortedMatches.length}` : `Показано: ${visibleRecords.length} из ${sortedMatches.length}`}
            </p>
          </div>
          {canExpand && !isCollapsed && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 border-christmas-gold/35 bg-christmas-gold/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-christmas-snow hover:border-christmas-gold/60 hover:bg-christmas-gold/20"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? "Свернуть" : "Весь топ"}
            </Button>
          )}
        </CardHeader>
        {isCollapsed ? null : (
          <CardContent className={cn("flex flex-col", showAll && "min-h-0 flex-1")}>
            {sortedMatches.length === 0 && <p className="text-sm text-muted-foreground">Нет данных по матчам</p>}
            {sortedMatches.length > 0 && (
              <div className={cn("pr-2", showAll && "min-h-0 flex-1 overflow-y-auto")}>
                <div className="space-y-1.5">
                  {visibleRecords.map((match, index) => (
                    <div
                      key={`${match.event_id}-${match.player_id}-${match.role}-${match.map}-${index}`}
                      className={`rounded-md px-2 py-1.5 transition-colors ${index < 3 ? "bg-secondary/50" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 pt-1 text-center font-mono text-sm text-christmas-snow">
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                        </span>
                        <PlayerAvatar steamId={match.steam_id} nickname={match.nickname} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium text-christmas-snow">{match.nickname}</p>
                              </div>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {match.map} • {match.role} • {match.kills}K / {match.deaths}D / {match.downs}Н
                              </p>
                            </div>
                            <Badge variant="outline" className="border-christmas-gold/30 font-mono text-christmas-gold">
                              {getMetricLabel(metric)}: {getMetricValue(match, metric)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
