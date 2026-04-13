"use client"

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

const SPECIALIZATION_EMOJIS: Record<keyof typeof SPECIALIZATION_LABELS, string> = {
  pusher: "🗡️",
  anchor: "🛡️",
  drg: "💥",
  mortar: "💣",
  tech: "🚙",
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

  if (!normalized || normalized === "cellimage" || normalized === "нет") return ""
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

export function getSpecializationEmoji(value: string | null | undefined): string {
  const key = normalizeSpecializationKey(value)
  if (!key && (value ?? "").trim().toLowerCase() === "cast") return "📷"
  return key ? SPECIALIZATION_EMOJIS[key] : "❔"
}

export function SpecializationIcon({ specialization, className }: SpecializationIconProps) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center text-base leading-none", className)}
      aria-hidden="true"
    >
      {getSpecializationEmoji(specialization)}
    </span>
  )
}
