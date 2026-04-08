"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAchievementDescription } from "@/lib/achievement-utils"
import { getAchievementIcon } from "@/lib/app-icons"
import { cn } from "@/lib/utils"

interface AchievementBadgesProps {
  achievements: string[]
  variant?: "default" | "secondary" | "destructive" | "outline"
  badgeClassName?: string
  containerClassName?: string
  itemClassName?: string
  layout?: "row" | "column"
  collapseToSummary?: boolean
  summaryLabel?: string
  panelClassName?: string
  display?: "badges" | "icons"
  showIcons?: boolean
}

export function AchievementBadges({
  achievements,
  variant = "secondary",
  badgeClassName,
  containerClassName,
  itemClassName,
  layout = "row",
  collapseToSummary = false,
  summaryLabel = "Ачивки",
  panelClassName,
  display = "badges",
  showIcons = false,
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
                itemClassName,
                display === "icons" &&
                  "h-7 w-7 items-center justify-center rounded-full border border-christmas-gold/35 bg-background/70 text-christmas-gold shadow-sm shadow-black/20 transition-colors hover:border-christmas-gold/60 hover:bg-background/85 hover:text-christmas-snow",
              )}
            >
              {display === "icons" ? (
                (() => {
                  const Icon = getAchievementIcon(achievement)
                  return <Icon className="h-3.5 w-3.5" />
                })()
              ) : (
                <Badge variant={variant} className={cn("gap-1.5", badgeClassName)}>
                  {showIcons &&
                    (() => {
                      const Icon = getAchievementIcon(achievement)
                      return <Icon className="h-3 w-3 shrink-0" />
                    })()}
                  <span>{achievement}</span>
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
