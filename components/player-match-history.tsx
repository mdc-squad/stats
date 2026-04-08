"use client"

import { useState } from "react"
import { ArrowUpRight, Medal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RoleIcon } from "@/components/role-icon"
import { SpecializationIcon, getSpecializationLabel, normalizeSpecializationKey } from "@/components/specialization-icon"
import type { PlayerGameHistoryEntry } from "@/lib/data-utils"
import { getEventTypeMeta } from "@/lib/data-utils"
import { getSquadToneClasses } from "@/lib/squad-utils"
import { cn } from "@/lib/utils"

interface PlayerMatchHistoryProps {
  playerId: string
  games: PlayerGameHistoryEntry[]
  onOpenGame?: (eventId: string, playerId: string) => void
  layout?: "compact" | "expanded"
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
  const [showAll, setShowAll] = useState(false)
  const isExpanded = layout === "expanded"
  const visibleGames = showAll ? games : games.slice(0, 5)

  const content = (
    <div className={cn("space-y-2", isExpanded ? "p-3" : "p-2")}>
      {visibleGames.map((game) => {
        const resultMeta = getResultMeta(game)
        const squadTone = getSquadToneClasses(game.squad_label)
        const eventTypeMeta = getEventTypeMeta(game.event_type)
        const { date, time } = formatMatchDateParts(game.started_at)
        const matchup = game.faction_matchup || [game.faction_1, game.faction_2].filter(Boolean).join(" vs ")
        const primaryRole = game.roles[0] || game.role
        const specializations = Array.from(
          new Set(
            game.specializations
              .map((specialization) => getSpecializationLabel(specialization))
              .filter((specialization) => normalizeSpecializationKey(specialization)),
          ),
        )
        const metrics = [
          {
            key: "revives",
            label: "Подн.",
            value: game.revives.toLocaleString("ru-RU"),
            valueClassName: "text-sky-300",
          },
          {
            key: "heals",
            label: "Хил",
            value: game.heals.toLocaleString("ru-RU"),
            valueClassName: "text-rose-300",
          },
          {
            key: "downs",
            label: "Ноки",
            value: game.downs.toLocaleString("ru-RU"),
            valueClassName: "text-orange-300",
          },
          {
            key: "kills",
            label: "Уб.",
            value: game.kills.toLocaleString("ru-RU"),
            valueClassName: "text-christmas-green",
          },
          {
            key: "deaths",
            label: "См.",
            value: game.deaths.toLocaleString("ru-RU"),
            valueClassName: "text-christmas-red",
          },
          {
            key: "vehicle",
            label: "Тех.",
            value: game.vehicle.toLocaleString("ru-RU"),
            valueClassName: "text-blue-300",
          },
          {
            key: "kd",
            label: "KD",
            value: game.kd.toFixed(2),
            valueClassName: "text-christmas-gold",
          },
          {
            key: "kda",
            label: "KDA",
            value: game.kda.toFixed(2),
            valueClassName: "text-violet-300",
          },
          {
            key: "elo",
            label: "ELO",
            value: game.elo.toFixed(1),
            valueClassName: "text-christmas-snow",
            progress: Math.max(0, Math.min(100, game.eloShare)),
          },
          {
            key: "rank",
            label: "Место",
            value: `${game.rank}/${game.participants}`,
            valueClassName: "text-christmas-gold",
          },
        ] as const

        return (
          <div
            key={`${game.event_id}-${game.player_id}`}
            data-testid="player-match-card"
            className="rounded-lg border border-border/50 bg-background/40 px-3 py-3"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Badge variant="outline" className={cn("h-auto px-2 py-0.5 text-[10px]", resultMeta.className)}>
                {resultMeta.label}
              </Badge>
              <Badge
                variant="outline"
                className="h-auto border-christmas-gold/30 px-2 py-0.5 text-[10px] text-christmas-gold"
              >
                <span className="mr-1">{eventTypeMeta.icon}</span>
                {eventTypeMeta.label}
              </Badge>
              <Badge variant="outline" className={cn("h-auto px-2 py-0.5 text-[10px]", squadTone.badge)}>
                {game.squad_label}
              </Badge>
              {game.rank === 1 && (
                <Badge
                  variant="outline"
                  data-testid="player-match-mvp"
                  className="h-auto border-christmas-gold/35 bg-christmas-gold/10 px-2 py-0.5 text-[10px] text-christmas-gold"
                >
                  <Medal className="mr-1 h-3.5 w-3.5" />
                  MVP
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {date}
                {time ? ` • ${time}` : ""}
              </span>
              <span className="text-sm font-semibold text-christmas-snow">
                {game.map}
                {game.mode ? ` • ${game.mode}` : ""}
              </span>
              {matchup && <span className="text-xs text-muted-foreground">{matchup}</span>}
              {game.opponent && <span className="text-xs text-muted-foreground">Соперник: {game.opponent}</span>}
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <RoleIcon role={primaryRole} className="h-4 w-4" />
                {game.role || "Роль не указана"}
              </span>
              {specializations.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {specializations.map((specialization) => (
                    <Badge
                      key={`${game.event_id}-${specialization}`}
                      variant="outline"
                      className="h-auto border-border/50 bg-background/35 px-2 py-0.5 text-[10px] text-christmas-snow"
                    >
                      <SpecializationIcon specialization={specialization} className="mr-1 h-3.5 w-3.5" />
                      {specialization}
                    </Badge>
                  ))}
                </div>
              )}
              {onOpenGame && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 shrink-0 px-2 text-christmas-gold hover:bg-christmas-gold/10 hover:text-christmas-snow"
                  onClick={() => onOpenGame(game.event_id, playerId)}
                >
                  Матч
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="mt-3 overflow-x-auto">
              <div className="grid min-w-[760px] grid-cols-10 gap-2">
                {metrics.map((metric) => (
                  <div
                    key={`${game.event_id}-${metric.key}`}
                    data-testid="player-match-metric"
                    className="rounded-md border border-border/50 bg-background/55 px-3 py-2 text-center"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{metric.label}</span>
                      <span className={cn("text-sm font-semibold", metric.valueClassName)}>{metric.value}</span>
                    </div>
                    {metric.key === "elo" ? (
                      <div className="mt-2 space-y-1" data-testid="player-match-elo-progress">
                        <div className="h-1.5 overflow-hidden rounded-full bg-background/70">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-christmas-red via-christmas-gold to-christmas-green"
                            style={{ width: `${metric.progress}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{Math.round(metric.progress)}% от лучшего ELO</p>
                      </div>
                    ) : (
                      <div className="mt-2 h-[26px]" aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className={cn("space-y-2.5", isExpanded && "space-y-3")} data-testid="player-match-history">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-christmas-snow">Последние матчи игрока</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-christmas-gold/30 text-christmas-gold">
            {games.length}
          </Badge>
          {games.length > 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-christmas-gold/25 bg-background/40 text-christmas-snow hover:bg-christmas-gold/10"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? "Скрыть" : "Весь список"}
            </Button>
          )}
        </div>
      </div>

      {games.length === 0 ? (
        <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 text-sm text-muted-foreground">
          Для игрока пока нет истории матчей.
        </div>
      ) : showAll ? (
        <ScrollArea
          className={cn(
            "rounded-lg border border-border/50 bg-background/20",
            isExpanded ? "h-[360px] lg:h-[420px]" : "h-[320px]",
          )}
        >
          {content}
        </ScrollArea>
      ) : (
        <div className="rounded-lg border border-border/50 bg-background/20">{content}</div>
      )}
    </div>
  )
}
