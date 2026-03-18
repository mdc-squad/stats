"use client"

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
            <button type="button" className="inline-flex cursor-help border-0 bg-transparent p-0 text-left">
              <Badge variant={variant} className={badgeClassName}>
                {achievement}
              </Badge>
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
