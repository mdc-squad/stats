"use client"

import { useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlayerAvatar } from "@/components/player-avatar"
import type { MatchRecordMetric, PlayerEventStat } from "@/lib/data-utils"
import { Download, Star, Trophy } from "lucide-react"
import { toPng } from "html-to-image"
import { ScrollArea } from "@/components/ui/scroll-area"

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
}

interface AggregatedRecordEntry {
  player_id: string
  nickname: string
  steam_id: string
  bestMatch: BestMatch
  records: BestMatch[]
}

function getMetricNumericValue(match: BestMatch, metric: MatchRecordMetric): number {
  if (metric === "kd") {
    return match.kd
  }

  if (metric === "kda") {
    return match.kda
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

  return match[metric].toLocaleString("ru-RU")
}

function getMetricLabel(metric: MatchRecordMetric): string {
  if (metric === "kd") return "K/D"
  if (metric === "kda") return "KDA"
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
}: BestMatchesProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [showAll, setShowAll] = useState(false)
  const defaultVisiblePlayers = 8

  const handleExport = async () => {
    if (!cardRef.current) return
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#1a1a2e",
        skipFonts: true,
        filter: (node: HTMLElement) => {
          if (node.tagName === "LINK" && node.getAttribute("rel") === "stylesheet") {
            return false
          }
          return true
        },
      })
      const link = document.createElement("a")
      link.download = "best-matches-2025.png"
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Export failed:", err)
    }
  }

  const getSteamId = (playerId: string) => {
    const player = players.find((p) => p.player_id === playerId)
    return player?.steam_id || ""
  }

  const groupedRecords = useMemo<AggregatedRecordEntry[]>(() => {
    const grouped = new Map<string, AggregatedRecordEntry>()

    matches.forEach((match) => {
      const current = grouped.get(match.player_id)
      if (!current) {
        grouped.set(match.player_id, {
          player_id: match.player_id,
          nickname: match.nickname,
          steam_id: getSteamId(match.player_id),
          bestMatch: match,
          records: [match],
        })
        return
      }

      current.records.push(match)
      if (compareMatchesByMetric(match, current.bestMatch, metric) >= 0) {
        return
      }
      current.bestMatch = match
    })

    return Array.from(grouped.values())
      .map((entry) => ({
        ...entry,
        records: [...entry.records].sort((left, right) => compareMatchesByMetric(left, right, metric)),
      }))
      .sort((left, right) => {
        const bestComparison = compareMatchesByMetric(left.bestMatch, right.bestMatch, metric)
        if (bestComparison !== 0) {
          return bestComparison
        }
        if (right.records.length !== left.records.length) {
          return right.records.length - left.records.length
        }
        return left.nickname.localeCompare(right.nickname, "ru")
      })
  }, [matches, metric, players])

  const canExpand = groupedRecords.length > defaultVisiblePlayers
  const visibleRecords = showAll ? groupedRecords : groupedRecords.slice(0, defaultVisiblePlayers)

  return (
    <div className="relative group">
      <Card ref={cardRef} className="flex h-[360px] flex-col">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2.5 pr-14">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-christmas-gold">
              <Star className="w-4 h-4" />
              <span className="truncate">{title}</span>
            </CardTitle>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {showAll
                ? `Игроков с рекордами: ${groupedRecords.length}`
                : `Показано: ${visibleRecords.length} из ${groupedRecords.length}`}
            </p>
          </div>
          {canExpand && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 px-2 text-[10px] text-muted-foreground hover:bg-background/50 hover:text-christmas-snow"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? "Свернуть" : "Все рекорды"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          {groupedRecords.length === 0 && <p className="text-sm text-muted-foreground">Нет данных по матчам</p>}
          {groupedRecords.length > 0 && (
            <ScrollArea className="flex-1 pr-3">
              <div className="space-y-1.5">
                {visibleRecords.map((entry, index) => (
                  <div
                    key={entry.player_id}
                    className={`rounded-md border border-border/50 p-2 transition-colors ${index < 3 ? "bg-secondary/50" : "bg-background/20"}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-7 pt-1 text-center font-mono text-xs text-christmas-snow">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                      </span>
                      <PlayerAvatar steamId={entry.steam_id} nickname={entry.nickname} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-christmas-snow">{entry.nickname}</p>
                          {entry.bestMatch.isWin && <Trophy className="h-3 w-3 shrink-0 text-christmas-gold" />}
                          {entry.records.length > 1 && (
                            <Badge variant="outline" className="border-christmas-gold/20 px-1.5 py-0 text-[10px] text-muted-foreground">
                              x{entry.records.length}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          Лучший матч: {entry.bestMatch.map} • {entry.bestMatch.role}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {entry.bestMatch.kills}K / {entry.bestMatch.deaths}D / {entry.bestMatch.downs}Н
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="border-christmas-gold/30 font-mono text-christmas-gold">
                          {getMetricLabel(metric)}: {getMetricValue(entry.bestMatch, metric)}
                        </Badge>
                      </div>
                    </div>

                    {entry.records.length > 1 && (
                      <details className="mt-2 rounded-md border border-border/40 bg-background/30 px-2.5 py-2">
                        <summary className="cursor-pointer text-[11px] text-muted-foreground marker:text-christmas-gold">
                          Все рекорды игрока
                        </summary>
                        <div className="mt-2 space-y-1.5">
                          {entry.records.map((match) => (
                            <div
                              key={`${match.event_id}-${match.player_id}-${match.role}-${match.map}`}
                              className="flex items-start justify-between gap-3 rounded-md border border-border/30 bg-background/35 px-2 py-1.5"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-[11px] text-christmas-snow">
                                  {match.map} • {match.role}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {match.kills}K / {match.deaths}D / {match.downs}Н
                                </p>
                              </div>
                              <span className="shrink-0 font-mono text-[11px] font-semibold text-christmas-gold">
                                {getMetricValue(match, metric)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Button
        size="sm"
        variant="secondary"
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleExport}
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  )
}
