"use client"

import { useMemo, useState } from "react"
import { ArrowUpRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RoleIcon } from "@/components/role-icon"
import { SpecializationIcon, getSpecializationLabel } from "@/components/specialization-icon"
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
  const metricMaxima = useMemo(
    () => ({
      revives: Math.max(...games.map((game) => game.revives), 1),
      heals: Math.max(...games.map((game) => game.heals), 1),
      downs: Math.max(...games.map((game) => game.downs), 1),
      kills: Math.max(...games.map((game) => game.kills), 1),
      deaths: Math.max(...games.map((game) => game.deaths), 1),
      vehicle: Math.max(...games.map((game) => game.vehicle), 1),
      kd: Math.max(...games.map((game) => game.kd), 1),
      kda: Math.max(...games.map((game) => game.kda), 1),
      elo: Math.max(...games.map((game) => game.elo), 1),
    }),
    [games],
  )

  const content = (
    <div className={cn("space-y-2", isExpanded ? "p-3" : "p-2")}>
      {visibleGames.map((game) => {
        const resultMeta = getResultMeta(game)
        const squadTone = getSquadToneClasses(game.squad_label)
        const eventTypeMeta = getEventTypeMeta(game.event_type)
        const { date, time } = formatMatchDateParts(game.started_at)
        const matchup = game.faction_matchup || [game.faction_1, game.faction_2].filter(Boolean).join(" vs ")
        const primaryRole = game.roles[0] || game.role
        const primarySpecialization = game.specializations[0] || game.specialization
        const metrics = [
          {
            key: "revives",
            label: "Поднятия",
            value: game.revives.toLocaleString("ru-RU"),
            progress: game.revives / metricMaxima.revives,
          },
          {
            key: "heals",
            label: "Хил",
            value: game.heals.toLocaleString("ru-RU"),
            progress: game.heals / metricMaxima.heals,
          },
          {
            key: "downs",
            label: "Ноки",
            value: game.downs.toLocaleString("ru-RU"),
            progress: game.downs / metricMaxima.downs,
          },
          {
            key: "kills",
            label: "Убийства",
            value: game.kills.toLocaleString("ru-RU"),
            progress: game.kills / metricMaxima.kills,
          },
          {
            key: "deaths",
            label: "Смерти",
            value: game.deaths.toLocaleString("ru-RU"),
            progress: game.deaths / metricMaxima.deaths,
          },
          {
            key: "vehicle",
            label: "Техника",
            value: game.vehicle.toLocaleString("ru-RU"),
            progress: game.vehicle / metricMaxima.vehicle,
          },
          {
            key: "kd",
            label: "KD",
            value: game.kd.toFixed(2),
            progress: game.kd / metricMaxima.kd,
          },
          {
            key: "kda",
            label: "KDA",
            value: game.kda.toFixed(2),
            progress: game.kda / metricMaxima.kda,
          },
          {
            key: "elo",
            label: "ELO",
            value: game.elo.toFixed(1),
            progress: game.elo / metricMaxima.elo,
          },
          {
            key: "rank",
            label: "Место",
            value: `${game.rank}/${game.participants}`,
            progress: game.participants > 1 ? 1 - (game.rank - 1) / (game.participants - 1) : 1,
          },
        ]

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
              {primarySpecialization && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <SpecializationIcon specialization={primarySpecialization} className="h-4 w-4" />
                  {getSpecializationLabel(primarySpecialization)}
                </span>
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

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {metrics.map((metric) => (
                <div
                  key={`${game.event_id}-${metric.key}`}
                  data-testid="player-match-metric"
                  className="relative overflow-hidden rounded-md border border-border/50 bg-background/55 px-3 py-2"
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-r-md bg-christmas-gold/12"
                    style={{ width: `${Math.max(0, Math.min(metric.progress, 1)) * 100}%` }}
                  />
                  <div className="relative flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{metric.label}</span>
                    <span className="text-sm font-semibold text-christmas-snow">{metric.value}</span>
                  </div>
                </div>
              ))}
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
