import type { LucideIcon } from "lucide-react"
import {
  Award,
  Bomb,
  Calendar,
  Car,
  ChevronsUp,
  Cross,
  Crosshair,
  Crown,
  Heart,
  ShieldPlus,
  Skull,
  Star,
  Syringe,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react"

export type AppMetricIconKey =
  | "kd"
  | "kda"
  | "elo"
  | "tbf"
  | "rating"
  | "kills"
  | "win_rate"
  | "events"
  | "revives"
  | "avgRevives"
  | "heals"
  | "avgHeals"
  | "downs"
  | "deaths"
  | "vehicle"
  | "avgVehicle"

export const MetricIcons: Record<AppMetricIconKey, LucideIcon> = {
  kd: Target,
  kda: TrendingUp,
  elo: Award,
  tbf: Star,
  rating: Crown,
  kills: Crosshair,
  win_rate: Trophy,
  events: Calendar,
  revives: Cross,
  avgRevives: Cross,
  heals: Heart,
  avgHeals: Heart,
  downs: Zap,
  deaths: Skull,
  vehicle: Car,
  avgVehicle: Car,
} as const

export function getMetricIcon(metric: AppMetricIconKey): LucideIcon {
  return MetricIcons[metric]
}

export const HealIcon = MetricIcons.heals
export const ReviveIcon = MetricIcons.revives

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  "Убийца": getMetricIcon("kills"),
  "Каратель": getMetricIcon("kd"),
  "Доминатор": getMetricIcon("kda"),
  "Победитель": getMetricIcon("win_rate"),
  "Активист": getMetricIcon("events"),
  "Спасатель": getMetricIcon("revives"),
  "Лекарь": Heart,
  "Штурмовик": getMetricIcon("downs"),
  "Гроза техники": getMetricIcon("vehicle"),
  "Укротитель машин": Bomb,
  "Ангел-хранитель": ShieldPlus,
  "Главврач": Syringe,
  "Сквад-лидер": ChevronsUp,
  MVP: getMetricIcon("elo"),
  "В тонусе": getMetricIcon("tbf"),
  "Эталон": getMetricIcon("rating"),
}

export function getAchievementIcon(achievement: string): LucideIcon {
  return ACHIEVEMENT_ICONS[achievement] ?? Star
}
