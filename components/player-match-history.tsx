"use client"

import { ArrowUpRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { PlayerGameHistoryEntry } from "@/lib/data-utils"
import { getSquadToneClasses } from "@/lib/squad-utils"
import { cn } from "@/lib/utils"

interface PlayerMatchHistoryProps {
  playerId: string
  games: PlayerGameHistoryEntry[]
  onOpenGame?: (eventId: string, playerId: string) => void
  layout?: "compact" | "expanded"
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
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getResultMeta(entry: Pick<PlayerGameHistoryEntry, "is_win" | "result">): {
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

export function PlayerMatchHistory({
  playerId,
  games,
  onOpenGame,
  layout = "compact",
}: PlayerMatchHistoryProps) {
  const isExpanded = layout === "expanded"

  return (
    <div className={cn("space-y-2.5", isExpanded && "space-y-3")}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-christmas-snow">История игр</p>
          <p className="text-[11px] text-muted-foreground">Последние матчи игрока с местом и динамикой по игре</p>
        </div>
        <Badge variant="outline" className="border-christmas-gold/30 text-christmas-gold">
          {games.length}
        </Badge>
      </div>

      {games.length === 0 ? (
        <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 text-sm text-muted-foreground">
          Для игрока пока нет истории матчей.
        </div>
      ) : (
        <ScrollArea
          className={cn(
            "rounded-lg border border-border/50 bg-background/20",
            isExpanded ? "h-[320px] lg:h-[360px]" : "h-[260px]",
          )}
        >
          <div className="space-y-2 p-2">
            {games.map((game) => {
              const resultMeta = getResultMeta(game)
              const eloWidth = Math.max(0, Math.min(100, game.eloShare))
              const squadTone = getSquadToneClasses(game.squad_label)
              const compactMetrics = [
                {
                  label: "K",
                  value: game.kills,
                  className: "border-christmas-green/20 bg-christmas-green/10 text-christmas-snow",
                },
                {
                  label: "Dn",
                  value: game.downs,
                  className: "border-orange-500/20 bg-orange-500/10 text-christmas-snow",
                },
                {
                  label: "D",
                  value: game.deaths,
                  className: "border-christmas-red/20 bg-christmas-red/10 text-christmas-snow",
                },
                {
                  label: "Rev",
                  value: game.revives,
                  className: "border-blue-500/20 bg-blue-500/10 text-christmas-snow",
                },
                {
                  label: "#",
                  value: `${game.rank}/${game.participants}`,
                  className: "border-christmas-gold/25 bg-christmas-gold/10 text-christmas-snow",
                },
              ] as const

              return (
                <div
                  key={`${game.event_id}-${game.player_id}`}
                  className={cn(
                    "rounded-md border border-border/50 bg-background/55 px-2.5 py-1.5",
                    isExpanded && "px-3 py-2",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-1.5 text-left">
                    <div className="flex min-w-0 flex-wrap items-center gap-1">
                      <Badge variant="outline" className={`h-auto px-1.5 py-0 text-[9px] ${resultMeta.className}`}>
                        {resultMeta.label}
                      </Badge>
                      <Badge variant="outline" className={`h-auto px-1.5 py-0 text-[9px] ${squadTone.badge}`}>
                        {game.squad_label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="h-auto border-christmas-gold/30 px-1.5 py-0 text-[9px] text-christmas-gold"
                      >
                        {game.event_type}
                      </Badge>
                      <span
                        className={cn(
                          "max-w-[160px] truncate text-[12px] font-semibold leading-tight text-christmas-snow",
                          isExpanded && "max-w-[260px] text-[13px]",
                        )}
                      >
                        {game.map}
                      </span>
                      {game.opponent && (
                        <span
                          className={cn(
                            "max-w-[140px] truncate text-[11px] leading-tight text-christmas-gold",
                            isExpanded && "max-w-[220px]",
                          )}
                        >
                          vs {game.opponent}
                        </span>
                      )}
                      <span className="whitespace-nowrap text-[11px] leading-tight text-muted-foreground">
                        {formatMatchDate(game.started_at)}
                        {game.role ? ` • ${game.role}` : ""}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
                      {compactMetrics.map((metric) => (
                        <div
                          key={`${game.event_id}-${metric.label}`}
                          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${metric.className}`}
                        >
                          <span className="text-[9px] uppercase leading-none tracking-wide text-muted-foreground">
                            {metric.label}
                          </span>
                          <span className="text-xs font-semibold leading-none">{metric.value}</span>
                        </div>
                      ))}
                      <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                        K/D {game.kd.toFixed(2)} • общий K/D {game.cumKD.toFixed(2)}
                      </span>
                      <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                        ELO {game.elo.toFixed(0)} • {Math.round(game.eloShare)}%
                      </span>
                      {onOpenGame && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 shrink-0 px-2 text-christmas-gold hover:bg-christmas-gold/10 hover:text-christmas-snow"
                          onClick={() => onOpenGame(game.event_id, playerId)}
                        >
                          Матч
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background/70">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-christmas-red via-christmas-gold to-christmas-green"
                      style={{ width: `${eloWidth}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
