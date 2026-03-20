"use client"

import type { LucideIcon } from "lucide-react"
import { Flag, Heart, Leaf, Shield, Sparkles, Sun, TreePine, Trophy } from "lucide-react"
import type { SeasonalTheme, SeasonalThemeIcon } from "@/lib/seasonal-theme"
import { withBasePath } from "@/lib/base-path"

interface SeasonalHeaderProps {
  playersCount: number
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

export function SeasonalHeader({ playersCount, theme }: SeasonalHeaderProps) {
  const ThemeIcon = ICON_BY_THEME[theme.icon] ?? Sparkles

  return (
    <header className="relative border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-christmas-red via-christmas-green to-christmas-gold" />

      <div className="container mx-auto px-4 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <div className="overflow-hidden rounded-full border border-christmas-gold/30 bg-background/70 p-1.5 shadow-lg shadow-black/20">
                <img
                  src={withBasePath("/mdc-clan-emblem.png")}
                  alt="Эмблема клана MDC"
                  className="h-16 w-16 rounded-full object-cover md:h-20 md:w-20"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-christmas-gold/30 bg-background/90 md:h-8 md:w-8">
                <ThemeIcon className="h-4 w-4 text-christmas-green" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight text-christmas-snow md:text-3xl">Mors De Caelo</h1>
              <p className="mt-1 text-sm font-medium text-christmas-gold md:text-base">{theme.subtitle}</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm shrink-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-christmas-snow">{playersCount}</p>
              <p className="text-christmas-gold/80 text-xs">игроков</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
