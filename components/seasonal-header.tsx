"use client"

import { useEffect, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  CalendarDays,
  Flag,
  Heart,
  Leaf,
  PauseCircle,
  PlayCircle,
  Radio,
  Shield,
  Sparkles,
  Sun,
  TreePine,
  Trophy,
  Users,
} from "lucide-react"
import type { SeasonalTheme, SeasonalThemeIcon } from "@/lib/seasonal-theme"
import { withBasePath } from "@/lib/base-path"

interface SeasonalHeaderProps {
  playersCount: number
  theme: SeasonalTheme
}

interface ClanTimelineInfo {
  ageLabel: string
  celebrationLabel: string | null
}

const CLAN_FOUNDATION = {
  year: 2023,
  monthIndex: 3,
  day: 29,
}

const CLAN_FOUNDATION_LABEL = "29.04.2023"
const CLAN_TRACK_TITLE = "Mors de caelo"
const CLAN_MOTTO = "Смерть с небес и в этом сила, Mdc - непобедима!"
const ANNIVERSARY_WINDOW_DAYS = 62

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

function pluralize(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10
  const mod100 = value % 100

  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function toUtcDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day))
}

function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

function formatAgeLabel(years: number, months: number) {
  const parts: string[] = []

  if (years > 0) {
    parts.push(`${years} ${pluralize(years, "год", "года", "лет")}`)
  }

  if (months > 0) {
    parts.push(`${months} ${pluralize(months, "месяц", "месяца", "месяцев")}`)
  }

  if (parts.length === 0) {
    return "меньше месяца"
  }

  return parts.join(" ")
}

function getClanTimeline(referenceDate: Date): ClanTimelineInfo {
  const today = toUtcDate(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate())

  let years = today.getUTCFullYear() - CLAN_FOUNDATION.year
  let months = today.getUTCMonth() - CLAN_FOUNDATION.monthIndex

  if (today.getUTCDate() < CLAN_FOUNDATION.day) {
    months -= 1
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  const ageLabel = formatAgeLabel(Math.max(years, 0), Math.max(months, 0))

  const hasReachedAnniversaryThisYear =
    today.getUTCMonth() > CLAN_FOUNDATION.monthIndex ||
    (today.getUTCMonth() === CLAN_FOUNDATION.monthIndex && today.getUTCDate() >= CLAN_FOUNDATION.day)

  const lastAnniversaryYear = hasReachedAnniversaryThisYear ? today.getUTCFullYear() : today.getUTCFullYear() - 1
  const nextAnniversaryYear = hasReachedAnniversaryThisYear ? today.getUTCFullYear() + 1 : today.getUTCFullYear()

  const lastAnniversaryDate = toUtcDate(lastAnniversaryYear, CLAN_FOUNDATION.monthIndex, CLAN_FOUNDATION.day)
  const nextAnniversaryDate = toUtcDate(nextAnniversaryYear, CLAN_FOUNDATION.monthIndex, CLAN_FOUNDATION.day)

  const daysSinceLast = daysBetween(lastAnniversaryDate, today)
  const daysUntilNext = daysBetween(today, nextAnniversaryDate)

  let celebrationLabel: string | null = null

  if (daysSinceLast >= 0 && daysSinceLast <= ANNIVERSARY_WINDOW_DAYS) {
    const anniversaryAge = lastAnniversaryYear - CLAN_FOUNDATION.year
    celebrationLabel = `Нам ${anniversaryAge} ${pluralize(anniversaryAge, "год", "года", "лет")}`
  } else if (daysUntilNext >= 0 && daysUntilNext <= ANNIVERSARY_WINDOW_DAYS) {
    const anniversaryAge = nextAnniversaryYear - CLAN_FOUNDATION.year
    celebrationLabel = `Скоро ${anniversaryAge} ${pluralize(anniversaryAge, "год", "года", "лет")}`
  }

  return {
    ageLabel,
    celebrationLabel,
  }
}

function HeaderStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="min-w-[120px] rounded-2xl border border-christmas-gold/15 bg-background/35 px-3 py-2 shadow-lg shadow-black/10 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-christmas-gold/80">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-christmas-snow md:text-base">{value}</p>
    </div>
  )
}

export function SeasonalHeader({ playersCount, theme }: SeasonalHeaderProps) {
  const ThemeIcon = ICON_BY_THEME[theme.icon] ?? Sparkles
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeline, setTimeline] = useState<ClanTimelineInfo | null>(null)

  useEffect(() => {
    setTimeline(getClanTimeline(new Date()))
  }, [])

  useEffect(() => {
    return () => {
      const audio = audioRef.current

      if (!audio) return

      audio.pause()
      audio.currentTime = 0
    }
  }, [])

  const toggleAnthem = async () => {
    const audio = audioRef.current

    if (!audio) return

    if (!audio.paused) {
      audio.pause()
      audio.currentTime = 0
      return
    }

    audio.currentTime = 0

    try {
      await audio.play()
    } catch {
      setIsPlaying(false)
    }
  }

  const clanAgeLabel = timeline ? `Нам ${timeline.ageLabel}` : "Возраст клана"

  return (
    <header className="relative border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-christmas-red via-christmas-green to-christmas-gold" />

      <div className="container mx-auto px-4 py-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <div className="h-20 w-20 overflow-hidden rounded-full bg-background/45 shadow-xl shadow-black/25 md:h-24 md:w-24">
                  <img
                    src={withBasePath("/mdc-clan-emblem.png")}
                    alt="Эмблема клана MDC"
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-christmas-gold/25 bg-background/90 shadow-lg shadow-black/20 md:h-8 md:w-8">
                  <ThemeIcon className="h-4 w-4 text-christmas-green" />
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold leading-tight text-christmas-snow md:text-3xl">Mors De Caelo</h1>
                <p className="mt-1 text-sm font-medium text-christmas-gold md:text-base">{theme.subtitle}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-stretch gap-2 lg:justify-end">
              <HeaderStat icon={Users} label="Игроков" value={playersCount.toString()} />
              <HeaderStat icon={CalendarDays} label="Основан" value={CLAN_FOUNDATION_LABEL} />
              <HeaderStat icon={Sparkles} label="Возраст" value={clanAgeLabel} />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <button
              type="button"
              onClick={() => void toggleAnthem()}
              aria-pressed={isPlaying}
              aria-label={isPlaying ? "Остановить гимн клана" : "Включить гимн клана"}
              className={`group w-full rounded-2xl border px-4 py-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-christmas-gold/60 ${
                isPlaying
                  ? "border-christmas-gold/45 bg-christmas-green/10 shadow-lg shadow-christmas-green/10"
                  : "border-christmas-gold/20 bg-background/40 hover:border-christmas-gold/45 hover:bg-background/55"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isPlaying
                      ? "border-christmas-green/40 bg-christmas-green/15 text-christmas-green"
                      : "border-christmas-gold/30 bg-background/60 text-christmas-gold"
                  }`}
                >
                  {isPlaying ? <PauseCircle className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                        isPlaying
                          ? "border-christmas-green/35 bg-christmas-green/12 text-christmas-green"
                          : "border-christmas-gold/25 bg-christmas-gold/8 text-christmas-gold"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${isPlaying ? "animate-pulse bg-christmas-green" : "bg-christmas-gold"}`} />
                      {isPlaying ? "Играет" : "Нажми"}
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.28em] text-christmas-gold/70">
                      Гимн клана • {CLAN_TRACK_TITLE}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold leading-relaxed text-christmas-snow md:text-base">{CLAN_MOTTO}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {isPlaying
                      ? "Повтор включён. Ещё одно нажатие полностью остановит трек."
                      : "Кнопка прямо в девизе: одно нажатие запускает гимн, повторное останавливает."}
                  </p>
                </div>
              </div>
            </button>

            {timeline?.celebrationLabel ? (
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-christmas-red/25 bg-christmas-red/10 px-3 py-2 text-sm font-medium text-christmas-snow shadow-lg shadow-black/10">
                <Radio className="h-4 w-4 text-christmas-gold" />
                <span>{timeline.celebrationLabel}</span>
              </div>
            ) : null}
          </div>
        </div>

        <audio
          ref={audioRef}
          loop
          preload="metadata"
          src={withBasePath("/audio/mors-de-caelo.mp3")}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>
    </header>
  )
}
