"use client"

import type { LucideIcon } from "lucide-react"
import { Anchor, Bomb, Crosshair, ShieldAlert, Wrench, CircleHelp } from "lucide-react"
import { cn } from "@/lib/utils"

interface SpecializationIconProps {
  specialization?: string | null
  className?: string
}

export const SPECIALIZATION_LABELS = {
  pusher: "Пушер",
  anchor: "Якорь",
  drg: "ДРГ",
  mortar: "Миномёт",
  tech: "Тех",
} as const

export const SPECIALIZATION_ORDER = [
  SPECIALIZATION_LABELS.pusher,
  SPECIALIZATION_LABELS.anchor,
  SPECIALIZATION_LABELS.drg,
  SPECIALIZATION_LABELS.mortar,
  SPECIALIZATION_LABELS.tech,
] as const

const SPECIALIZATION_ICONS: Record<keyof typeof SPECIALIZATION_LABELS, LucideIcon> = {
  pusher: ShieldAlert,
  anchor: Anchor,
  drg: Crosshair,
  mortar: Bomb,
  tech: Wrench,
}

export function normalizeSpecializationKey(value: string | null | undefined): keyof typeof SPECIALIZATION_LABELS | "" {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return ""
  if (trimmed === "🗡️") return "pusher"
  if (trimmed === "🛡️") return "anchor"
  if (trimmed === "💥") return "drg"
  if (trimmed === "💣") return "mortar"
  if (trimmed === "🚙") return "tech"
  if (trimmed === "❌" || trimmed === "🎥") return ""

  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]/gi, "")

  if (!normalized || normalized === "cellimage" || normalized === "нет" || normalized === "cast") return ""
  if (normalized === "pusher" || normalized === "пушер") return "pusher"
  if (normalized === "anchor" || normalized === "якорь") return "anchor"
  if (normalized === "drg" || normalized === "дрг") return "drg"
  if (normalized === "mortar" || normalized === "миномет" || normalized === "минометчик") return "mortar"
  if (normalized === "tech" || normalized === "тех" || normalized === "техник") return "tech"

  return ""
}

export function getSpecializationLabel(value: string | null | undefined): string {
  const key = normalizeSpecializationKey(value)
  return key ? SPECIALIZATION_LABELS[key] : (value?.trim() || "Не указана")
}

export function SpecializationIcon({ specialization, className }: SpecializationIconProps) {
  const key = normalizeSpecializationKey(specialization)
  const Icon = key ? SPECIALIZATION_ICONS[key] : CircleHelp

  return <Icon className={cn("h-4 w-4 shrink-0", className)} aria-hidden="true" />
}
