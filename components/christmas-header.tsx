"use client"

import { Gift, Sparkles, TreePine } from "lucide-react"

interface ChristmasHeaderProps {
  playersCount: number
  eventsCount: number
}

export function ChristmasHeader({ playersCount, eventsCount }: ChristmasHeaderProps) {
  return (
    <header className="relative border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40 overflow-hidden">
      {/* Christmas lights decoration */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-christmas-red via-christmas-green to-christmas-gold" />

      <div className="container mx-auto px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <TreePine className="w-10 h-10 text-christmas-green" />
              <Sparkles className="w-4 h-4 text-christmas-gold absolute -top-1 -right-1" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-christmas-snow">MDC CLAN</span>
                <Gift className="w-5 h-5 text-christmas-red christmas-light" />
              </h1>
              <p className="text-sm text-christmas-gold font-medium">Новогодние итоги 2025</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm">
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

      {/* Bottom garland */}
      <div className="flex justify-center gap-4 pb-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full christmas-light"
            style={{
              backgroundColor:
                i % 3 === 0 ? "var(--christmas-red)" : i % 3 === 1 ? "var(--christmas-green)" : "var(--christmas-gold)",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </header>
  )
}
