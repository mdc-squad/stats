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
}

export function AchievementBadges({
  achievements,
  variant = "secondary",
  badgeClassName,
  containerClassName,
}: AchievementBadgesProps) {
  if (achievements.length === 0) {
    return null
  }

  return (
    <div className={cn("flex flex-wrap gap-1", containerClassName)}>
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
}
