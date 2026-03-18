"use client"

import type { LucideIcon } from "lucide-react"
import { Flag, Heart, Leaf, Shield, Sparkles, Sun, TreePine, Trophy } from "lucide-react"
import type { SeasonalTheme, SeasonalThemeIcon } from "@/lib/seasonal-theme"
import { withBasePath } from "@/lib/base-path"

interface SeasonalHeaderProps {
  playersCount: number
  eventsCount: number
  theme: SeasonalTheme
}

const ICON_BY_THEME: Record<SeasonalThemeIcon, LucideIcon> = {
  tree: TreePine,
  shield: Shield,
  heart: Heart,
  flag: Flag,
  sun: Sun,
  leaf: Leaf,
  sparkles: Sparkles,
  trophy: Trophy,
}

export function SeasonalHeader({ playersCount, eventsCount, theme }: SeasonalHeaderProps) {
  const ThemeIcon = ICON_BY_THEME[theme.icon] ?? Sparkles

  return (
    <header className="relative border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-christmas-red via-christmas-green to-christmas-gold" />

      <div className="container mx-auto px-4 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <div className="overflow-hidden rounded-full border border-christmas-gold/30 bg-background/70 p-1 shadow-lg shadow-black/20">
                <img
                  src={withBasePath("/mdc-clan-emblem.png")}
                  alt="Эмблема клана MDC"
                  className="h-12 w-12 rounded-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-christmas-gold/30 bg-background/90">
                <ThemeIcon className="h-3.5 w-3.5 text-christmas-green" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-christmas-snow leading-tight">MDC CLAN</h1>
              <p className="text-sm text-christmas-gold font-medium truncate">Mors De Caelo Task Force • {theme.subtitle}</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm shrink-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-christmas-snow">{playersCount}</p>
              <p className="text-christmas-gold/80 text-xs">игроков</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-christmas-snow">{eventsCount}</p>
              <p className="text-christmas-gold/80 text-xs">событий</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
