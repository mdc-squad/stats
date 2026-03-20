"use client"

import type { LucideIcon } from "lucide-react"
import { Brain, Calendar, Car, Crosshair, Heart, Shield, Star, Syringe, Target, TrendingUp, Trophy, Users, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAchievementDescription } from "@/lib/achievement-utils"
import { cn } from "@/lib/utils"

interface AchievementBadgesProps {
  achievements: string[]
  variant?: "default" | "secondary" | "destructive" | "outline"
  badgeClassName?: string
  containerClassName?: string
  layout?: "row" | "column"
  collapseToSummary?: boolean
  summaryLabel?: string
  panelClassName?: string
  display?: "badges" | "icons"
}

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  "Убийца": Crosshair,
  "Высокий K/D": Target,
  "Доминатор": TrendingUp,
  "Победитель": Trophy,
  "Оплот клана": Calendar,
  "Спасатель": Heart,
  "Штурмовик": Zap,
  "Гроза техники": Car,
  "Истребитель брони": Shield,
  "Ангел-хранитель": Syringe,
  "Сквад-лидер": Users,
  "Стратег": Brain,
  "Боевой фактор": Star,
  "Острие клана": Trophy,
}

export function AchievementBadges({
  achievements,
  variant = "secondary",
  badgeClassName,
  containerClassName,
  layout = "row",
  collapseToSummary = false,
  summaryLabel = "Ачивки",
  panelClassName,
  display = "badges",
}: AchievementBadgesProps) {
  if (achievements.length === 0) {
    return null
  }

  const badges = (
    <div
      className={cn(
        "flex gap-1",
        layout === "column" ? "flex-col items-start" : "flex-wrap",
        !collapseToSummary && containerClassName,
      )}
    >
      {achievements.map((achievement) => (
        <Tooltip key={achievement}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex cursor-help border-0 bg-transparent p-0 text-left",
                display === "icons" && "h-6 w-6 items-center justify-center rounded-full border border-christmas-gold/25 bg-background/45 text-christmas-gold hover:text-christmas-snow",
              )}
            >
              {display === "icons" ? (
                (() => {
                  const Icon = ACHIEVEMENT_ICONS[achievement] ?? Star
                  return <Icon className="h-3.5 w-3.5" />
                })()
              ) : (
                <Badge variant={variant} className={badgeClassName}>
                  {achievement}
                </Badge>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs border border-border bg-card text-card-foreground">
            <p className="font-medium text-christmas-snow">{achievement}</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">{getAchievementDescription(achievement)}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )

  if (collapseToSummary) {
    return (
      <details className={cn("inline-block [&_summary::-webkit-details-marker]:hidden", containerClassName)}>
        <summary className="list-none cursor-pointer rounded-sm text-[10px] text-muted-foreground transition-colors hover:text-christmas-snow">
          {summaryLabel}: {achievements.length}
        </summary>
        <div
          className={cn(
            "mt-1 min-w-[220px] rounded-md border border-border/60 bg-card/95 p-2 shadow-lg backdrop-blur",
            panelClassName,
          )}
        >
          {badges}
        </div>
      </details>
    )
  }

  return badges
}
