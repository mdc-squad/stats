"use client"

import type { CSSProperties } from "react"
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
  containerStyle?: CSSProperties
  itemClassName?: string
  layout?: "row" | "column"
  collapseToSummary?: boolean
  summaryLabel?: string
  panelClassName?: string
  display?: "badges" | "icons" | "feature-grid"
  showIcons?: boolean
  iconClassName?: string
  labelClassName?: string
}

export function AchievementBadges({
  achievements,
  variant = "secondary",
  badgeClassName,
  containerClassName,
  containerStyle,
  itemClassName,
  layout = "row",
  collapseToSummary = false,
  summaryLabel = "Ачивки",
  panelClassName,
  display = "badges",
  showIcons = false,
  iconClassName,
  labelClassName,
}: AchievementBadgesProps) {
  if (achievements.length === 0) {
    return null
  }

  const badges = (
    <div
      className={cn(
        display === "feature-grid" ? "grid w-full items-stretch gap-2" : "flex gap-1",
        display !== "feature-grid" && (layout === "column" ? "flex-col items-start" : "flex-wrap"),
        !collapseToSummary && containerClassName,
      )}
      style={!collapseToSummary ? containerStyle : undefined}
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
                display === "feature-grid" && "flex h-full min-w-0 items-stretch justify-stretch",
              )}
            >
              {display === "icons" ? (
                (() => {
                  const Icon = getAchievementIcon(achievement)
                  return <Icon className="h-3.5 w-3.5" />
                })()
              ) : display === "feature-grid" ? (
                (() => {
                  const Icon = getAchievementIcon(achievement)
                  return (
                    <div className={cn("flex h-full w-full flex-col items-center justify-center gap-2 text-center", badgeClassName)}>
                      <Icon className={cn("h-9 w-9 shrink-0 text-christmas-gold", iconClassName)} />
                      <span className={cn("text-sm font-medium leading-tight text-christmas-snow", labelClassName)}>
                        {achievement}
                      </span>
                    </div>
                  )
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
