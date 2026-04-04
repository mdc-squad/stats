"use client"

import { useState } from "react"
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
          { label: "Поднятия", value: game.revives.toLocaleString("ru-RU") },
          { label: "Хил", value: game.heals.toLocaleString("ru-RU") },
          { label: "Ноки", value: game.downs.toLocaleString("ru-RU") },
          { label: "Убийства", value: game.kills.toLocaleString("ru-RU") },
          { label: "Смерти", value: game.deaths.toLocaleString("ru-RU") },
          { label: "Техника", value: game.vehicle.toLocaleString("ru-RU") },
          { label: "KD", value: game.kd.toFixed(2) },
          { label: "KDA", value: game.kda.toFixed(2) },
          { label: "ELO", value: game.elo.toFixed(1) },
          { label: "Место", value: `${game.rank}/${game.participants}` },
        ]

        return (
          <div
            key={`${game.event_id}-${game.player_id}`}
            className="rounded-lg border border-border/50 bg-background/40 px-3 py-3"
          >
            <div className="flex flex-wrap items-start gap-2">
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

            <div className="mt-2 space-y-1.5">
              <p className="text-sm font-semibold leading-tight text-christmas-snow">
                {game.map}
                {game.mode ? ` • ${game.mode}` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {matchup && <span>{matchup}</span>}
                {game.opponent && <span>Соперник: {game.opponent}</span>}
                <span className="inline-flex items-center gap-1.5">
                  <RoleIcon role={primaryRole} className="h-4 w-4" />
                  {game.role || "Роль не указана"}
                </span>
                {primarySpecialization && (
                  <span className="inline-flex items-center gap-1.5">
                    <SpecializationIcon specialization={primarySpecialization} className="h-4 w-4" />
                    {getSpecializationLabel(primarySpecialization)}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {metrics.map((metric) => (
                <div
                  key={`${game.event_id}-${metric.label}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/55 px-2 py-1"
                >
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{metric.label}</span>
                  <span className="text-xs font-semibold text-christmas-snow">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className={cn("space-y-2.5", isExpanded && "space-y-3")}>
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
