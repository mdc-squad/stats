"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  CalendarDays,
  Flag,
  Heart,
  Leaf,
  Shield,
  Sparkles,
  Sun,
  TreePine,
  Trophy,
  Users,
  Volume2,
} from "lucide-react"
import { Slider } from "@/components/ui/slider"
import type { SeasonalTheme, SeasonalThemeIcon } from "@/lib/seasonal-theme"
import { withBasePath } from "@/lib/base-path"
import { cn } from "@/lib/utils"

interface SeasonalHeaderProps {
  mdcPlayersCount: number
  gravePlayersCount: number
  theme: SeasonalTheme
}

interface ClanTimelineInfo {
  ageLabel: string
  celebrationLabel: string | null
}

interface ClanFoundationInfo {
  year: number
  monthIndex: number
  day: number
}

interface HeaderSlide {
  id: "mdc" | "grave" | "dcia"
  overline?: string | null
  title: string
  subtitle: string
  tagline?: string | null
  emblemSrc: string
  emblemAlt: string
  heroLabel: string
  playersLabel: string
  playersValue: string
  dateLabel: string
  dateValue: string
  extraStat?: {
    icon: LucideIcon
    label: string
    value: string
  }
  celebrationLabel?: string | null
  showAnthem: boolean
}

const CLAN_FOUNDATION: ClanFoundationInfo = {
  year: 2023,
  monthIndex: 3,
  day: 29,
}

const GRAVE_FOUNDATION: ClanFoundationInfo = {
  year: 2024,
  monthIndex: 11,
  day: 12,
}

const DCIA_FOUNDATION: ClanFoundationInfo = {
  year: 2026,
  monthIndex: 3,
  day: 9,
}

const CLAN_FOUNDATION_LABEL = "29.04.2023"
const GRAVE_FOUNDATION_LABEL = "12.12.2024"
const DCIA_FOUNDATION_LABEL = "09.04.2026"
const CLAN_MOTTO = "Смерть с небес и в этом сила, Mdc - непобедима!"
const ANNIVERSARY_WINDOW_DAYS = 62
const DEFAULT_ANTHEM_VOLUME = 20
const SLIDE_INTERVAL_MS = 5000
const SLIDE_FADE_MS = 280

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

function getClanTimeline(referenceDate: Date, foundation: ClanFoundationInfo): ClanTimelineInfo {
  const today = toUtcDate(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate())

  let years = today.getUTCFullYear() - foundation.year
  let months = today.getUTCMonth() - foundation.monthIndex

  if (today.getUTCDate() < foundation.day) {
    months -= 1
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  const ageLabel = formatAgeLabel(Math.max(years, 0), Math.max(months, 0))

  const hasReachedAnniversaryThisYear =
    today.getUTCMonth() > foundation.monthIndex ||
    (today.getUTCMonth() === foundation.monthIndex && today.getUTCDate() >= foundation.day)

  const lastAnniversaryYear = hasReachedAnniversaryThisYear ? today.getUTCFullYear() : today.getUTCFullYear() - 1
  const nextAnniversaryYear = hasReachedAnniversaryThisYear ? today.getUTCFullYear() + 1 : today.getUTCFullYear()

  const lastAnniversaryDate = toUtcDate(lastAnniversaryYear, foundation.monthIndex, foundation.day)
  const nextAnniversaryDate = toUtcDate(nextAnniversaryYear, foundation.monthIndex, foundation.day)

  const daysSinceLast = daysBetween(lastAnniversaryDate, today)
  const daysUntilNext = daysBetween(today, nextAnniversaryDate)

  let celebrationLabel: string | null = null

  if (daysSinceLast >= 0 && daysSinceLast <= ANNIVERSARY_WINDOW_DAYS) {
    const anniversaryAge = lastAnniversaryYear - foundation.year

    if (anniversaryAge > 0) {
      celebrationLabel = `${anniversaryAge} ${pluralize(anniversaryAge, "год", "года", "лет")}`
    }
  } else if (daysUntilNext >= 0 && daysUntilNext <= ANNIVERSARY_WINDOW_DAYS) {
    const anniversaryAge = nextAnniversaryYear - foundation.year

    if (anniversaryAge > 0) {
      celebrationLabel = `Скоро ${anniversaryAge} ${pluralize(anniversaryAge, "год", "года", "лет")}`
    }
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
    <div className="min-w-[120px] rounded-2xl border border-christmas-gold/15 bg-background/35 px-3 py-2 text-center shadow-lg shadow-black/10 backdrop-blur-sm">
      <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.22em] text-christmas-gold/80">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-1 text-center text-sm font-semibold text-christmas-snow md:text-base">{value}</p>
    </div>
  )
}

export function SeasonalHeader({ mdcPlayersCount, gravePlayersCount, theme }: SeasonalHeaderProps) {
  const ThemeIcon = ICON_BY_THEME[theme.icon] ?? Sparkles
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fadeTimeoutRef = useRef<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [referenceDate, setReferenceDate] = useState<Date | null>(null)
  const [isCompactViewport, setIsCompactViewport] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [isSlideVisible, setIsSlideVisible] = useState(true)
  const [volume, setVolume] = useState(DEFAULT_ANTHEM_VOLUME)

  const coalitionPlayersCount = mdcPlayersCount + gravePlayersCount

  useEffect(() => {
    setReferenceDate(new Date())
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return
    }

    const mediaQuery = window.matchMedia("(max-width: 640px)")
    const updateViewportState = () => setIsCompactViewport(mediaQuery.matches)

    updateViewportState()

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateViewportState)
      return () => mediaQuery.removeEventListener("change", updateViewportState)
    }

    mediaQuery.addListener(updateViewportState)
    return () => mediaQuery.removeListener(updateViewportState)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    if (!isCompactViewport) {
      setIsCollapsed(false)
      return
    }

    const updateCollapsedState = () => {
      setIsCollapsed(window.scrollY > 24)
    }

    updateCollapsedState()
    window.addEventListener("scroll", updateCollapsedState, { passive: true })
    return () => window.removeEventListener("scroll", updateCollapsedState)
  }, [isCompactViewport])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    audio.volume = volume / 100
  }, [volume])

  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current)
      }

      const audio = audioRef.current
      if (!audio) return

      audio.pause()
      audio.currentTime = 0
    }
  }, [])

  const mdcTimeline = referenceDate ? getClanTimeline(referenceDate, CLAN_FOUNDATION) : null
  const graveTimeline = referenceDate ? getClanTimeline(referenceDate, GRAVE_FOUNDATION) : null
  const dciaTimeline = referenceDate ? getClanTimeline(referenceDate, DCIA_FOUNDATION) : null

  const clanAgeLabel = mdcTimeline ? mdcTimeline.ageLabel : "Возраст клана"
  const graveAgeLabel = graveTimeline ? graveTimeline.ageLabel : "Возраст GRAVE"
  const dciaAgeLabel = dciaTimeline ? dciaTimeline.ageLabel : "Возраст коалиции"

  const slides = useMemo<HeaderSlide[]>(() => {
    const preparedSlides: HeaderSlide[] = [
      {
        id: "mdc",
        title: "Mors De Caelo",
        subtitle: theme.subtitle,
        emblemSrc: withBasePath("/mdc-clan-emblem.png"),
        emblemAlt: "Эмблема клана MDC",
        heroLabel: CLAN_MOTTO,
        playersLabel: "Mdc",
        playersValue: String(mdcPlayersCount),
        dateLabel: "Основан",
        dateValue: CLAN_FOUNDATION_LABEL,
        extraStat: {
          icon: Sparkles,
          label: "Возраст",
          value: clanAgeLabel,
        },
        celebrationLabel: mdcTimeline?.celebrationLabel ?? null,
        showAnthem: true,
      },
    ]

    if (gravePlayersCount > 0) {
      preparedSlides.push(
        {
          id: "grave",
          title: "GRAVE",
          subtitle: theme.subtitle,
          tagline: "Grave",
          emblemSrc: withBasePath("/grave-emblem.png"),
          emblemAlt: "Эмблема GRAVE",
          heroLabel: "[GRAVE]",
          playersLabel: "GRAVE",
          playersValue: String(gravePlayersCount),
          dateLabel: "Основан",
          dateValue: GRAVE_FOUNDATION_LABEL,
          extraStat: {
            icon: Sparkles,
            label: "Возраст",
            value: graveAgeLabel,
          },
          celebrationLabel: graveTimeline?.celebrationLabel ?? null,
          showAnthem: false,
        },
        {
          id: "dcia",
          title: "De Caelo Ad Infernos",
          subtitle: theme.subtitle,
          tagline: null,
          emblemSrc: withBasePath("/dcia-emblem.png"),
          emblemAlt: "Эмблема коалиции DCIA",
          heroLabel: "Коалиция\n『DCAI』",
          playersLabel: "Коалиция",
          playersValue: String(coalitionPlayersCount),
          dateLabel: "Основан",
          dateValue: DCIA_FOUNDATION_LABEL,
          extraStat: {
            icon: Sparkles,
            label: "Возраст",
            value: dciaAgeLabel,
          },
          celebrationLabel: dciaTimeline?.celebrationLabel ?? null,
          showAnthem: false,
        },
      )
    }

    return preparedSlides
  }, [
    clanAgeLabel,
    coalitionPlayersCount,
    dciaAgeLabel,
    dciaTimeline?.celebrationLabel,
    graveAgeLabel,
    gravePlayersCount,
    graveTimeline?.celebrationLabel,
    mdcPlayersCount,
    mdcTimeline?.celebrationLabel,
    theme.subtitle,
  ])

  useEffect(() => {
    if (activeSlideIndex < slides.length) {
      return
    }

    setActiveSlideIndex(0)
    setIsSlideVisible(true)
  }, [activeSlideIndex, slides.length])

  useEffect(() => {
    if (slides.length <= 1 || isPlaying) {
      return
    }

    const intervalId = window.setInterval(() => {
      setIsSlideVisible(false)

      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current)
      }

      fadeTimeoutRef.current = window.setTimeout(() => {
        setActiveSlideIndex((current) => (current + 1) % slides.length)
        setIsSlideVisible(true)
      }, SLIDE_FADE_MS)
    }, SLIDE_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current)
        fadeTimeoutRef.current = null
      }
      setIsSlideVisible(true)
    }
  }, [isPlaying, slides.length])

  const currentSlide = slides[Math.min(activeSlideIndex, slides.length - 1)] ?? slides[0]
  const showTagline =
    !!currentSlide.tagline &&
    currentSlide.tagline.trim().length > 0 &&
    currentSlide.tagline.trim().toLowerCase() !== currentSlide.title.trim().toLowerCase()
  const showOverline = !!currentSlide.overline && currentSlide.overline.trim().length > 0
  const showTitle = !!currentSlide.title && currentSlide.title.trim().length > 0

  const stopAnthem = () => {
    const audio = audioRef.current

    if (!audio) return

    audio.pause()
    audio.currentTime = 0
  }

  const toggleAnthem = async () => {
    const audio = audioRef.current

    if (!audio) return

    if (!audio.paused) {
      stopAnthem()
      return
    }

    audio.currentTime = 0
    audio.volume = volume / 100

    try {
      await audio.play()
    } catch {
      setIsPlaying(false)
    }
  }

  const animatedContentClassName = cn(
    "transition-all duration-300",
    isSlideVisible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
  )

  return (
    <header
      data-testid="seasonal-header"
      data-collapsed={isCollapsed ? "true" : "false"}
      className={cn(
        "sticky top-0 z-40 overflow-hidden border-b border-border backdrop-blur-sm transition-all duration-300",
        isCollapsed ? "bg-card/95 shadow-lg shadow-black/15" : "bg-card/80",
      )}
    >
      <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-christmas-red via-christmas-green to-christmas-gold" />

      <div className={cn("container mx-auto px-4 transition-all duration-300", isCollapsed ? "py-2" : "py-5")}>
        <div
          className={cn(
            "flex flex-col gap-4 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-6",
            isCollapsed && "flex-row items-center justify-between gap-3",
          )}
        >
          <div className={cn("flex min-w-0 items-center", isCollapsed ? "gap-3" : "gap-4")}>
            <div className={cn("relative shrink-0", animatedContentClassName)}>
              <div
                className={cn(
                  "overflow-hidden rounded-full bg-background/45 shadow-xl shadow-black/25 transition-all duration-300",
                  isCollapsed ? "h-12 w-12" : "h-20 w-20 md:h-24 md:w-24",
                )}
              >
                <img src={currentSlide.emblemSrc} alt={currentSlide.emblemAlt} className="h-full w-full rounded-full object-cover" />
              </div>
              <div
                className={cn(
                  "absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border border-christmas-gold/25 bg-background/90 shadow-lg shadow-black/20 transition-all duration-300",
                  isCollapsed ? "h-5 w-5" : "h-7 w-7 md:h-8 md:w-8",
                )}
              >
                <ThemeIcon className="h-4 w-4 text-christmas-green" />
              </div>
            </div>

            <div className={cn("min-w-0", animatedContentClassName)}>
              {!isCollapsed && showOverline ? (
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-christmas-snow">
                  {currentSlide.overline}
                </p>
              ) : null}
              {showTitle ? (
                <h1
                  className={cn(
                    "font-bold leading-tight text-christmas-snow transition-all duration-300",
                    isCollapsed ? "text-lg" : "text-2xl md:text-3xl",
                  )}
                >
                  {currentSlide.title}
                </h1>
              ) : null}
              {!isCollapsed && (
                <div className={cn("space-y-0.5", showTitle ? "mt-1" : "mt-0.5")}>
                  <p className="text-sm font-medium text-christmas-gold md:text-base">{currentSlide.subtitle}</p>
                  {showTagline ? <p className="text-xs text-muted-foreground">{currentSlide.tagline}</p> : null}
                </div>
              )}
            </div>
          </div>

          {isCollapsed ? (
            <div className="shrink-0 rounded-full border border-christmas-gold/20 bg-background/45 px-3 py-1.5 shadow-lg shadow-black/10">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-christmas-snow">
                <Users className="h-3.5 w-3.5 text-christmas-gold" />
                {currentSlide.playersValue}
              </span>
            </div>
          ) : (
            <>
              <div className={cn("flex min-w-0 flex-col items-center gap-2 text-center lg:px-2", animatedContentClassName)}>
                {currentSlide.showAnthem ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void toggleAnthem()}
                      aria-pressed={isPlaying}
                      aria-label={isPlaying ? "Остановить гимн клана" : "Включить гимн клана"}
                      className={cn(
                        "group inline-flex max-w-full items-center justify-center gap-2 rounded-2xl border border-transparent px-2 py-0.5 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-christmas-gold/60",
                        isPlaying ? "text-christmas-snow" : "text-christmas-snow/92 hover:text-christmas-snow",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1 h-2.5 w-2.5 shrink-0 rounded-full transition-colors",
                          isPlaying ? "animate-pulse bg-christmas-green" : "bg-christmas-gold/80 group-hover:bg-christmas-gold",
                        )}
                      />
                      <span className="text-[15px] font-semibold leading-snug tracking-[0.01em] md:text-base">{currentSlide.heroLabel}</span>
                    </button>

                    {isPlaying ? (
                      <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-christmas-gold/20 bg-background/35 px-3 py-2 shadow-lg shadow-black/10">
                        <Volume2 className="h-4 w-4 shrink-0 text-christmas-gold" />
                        <Slider
                          value={[volume]}
                          onValueChange={(values) => setVolume(Math.max(0, Math.min(100, values[0] ?? DEFAULT_ANTHEM_VOLUME)))}
                          min={0}
                          max={100}
                          step={1}
                          className="[&_[data-slot=slider-range]]:bg-christmas-gold"
                          aria-label="Громкость гимна"
                        />
                        <span className="w-10 text-right text-xs text-christmas-snow">{volume}%</span>
                      </div>
                    ) : null}

                    <span className="text-[11px] text-muted-foreground">{isPlaying ? "Гимн звучит" : "Нажатие включает гимн"}</span>
                  </>
                ) : (
                  <div className="flex min-h-[82px] items-center justify-center">
                    {currentSlide.id === "dcia" ? (
                      <span className="flex flex-col items-center text-center font-black uppercase tracking-[0.22em] text-christmas-snow">
                        <span className="text-lg md:text-xl">Коалиция</span>
                        <span className="text-3xl leading-tight md:text-[2.35rem]">『DCAI』</span>
                        <span className="mt-1 max-w-[22rem] text-[11px] font-medium normal-case leading-snug tracking-[0.08em] text-christmas-gold/90 md:text-xs">
                          Вместе — от небес до самого ада!
                        </span>
                      </span>
                    ) : (
                      <span className="whitespace-pre-line text-center text-3xl font-black uppercase tracking-[0.28em] text-christmas-snow md:text-4xl">
                        {currentSlide.heroLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className={cn("flex flex-wrap items-stretch gap-2 lg:justify-end", animatedContentClassName)}>
                <HeaderStat icon={Users} label={currentSlide.playersLabel} value={currentSlide.playersValue} />
                <HeaderStat icon={CalendarDays} label={currentSlide.dateLabel} value={currentSlide.dateValue} />
                {currentSlide.extraStat ? (
                  <HeaderStat
                    icon={currentSlide.extraStat.icon}
                    label={currentSlide.extraStat.label}
                    value={currentSlide.extraStat.value}
                  />
                ) : null}

                {currentSlide.celebrationLabel ? (
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-christmas-red/20 bg-christmas-red/10 px-3 py-2 text-xs font-medium text-christmas-snow shadow-lg shadow-black/10">
                    <Sparkles className="h-3.5 w-3.5 text-christmas-gold" />
                    <span>{currentSlide.celebrationLabel}</span>
                  </div>
                ) : null}
              </div>
            </>
          )}
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
