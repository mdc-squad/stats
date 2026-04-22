import type { LucideIcon } from "lucide-react"
import {
  Award,
  Calendar,
  Car,
  ChevronsUp,
  createLucideIcon,
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

const Explosion = createLucideIcon("Explosion", [
  [
    "path",
    {
      d: "M12.8 2.5 10 8.4 3.8 6.2l3.3 5.5-4.6 4.5 6.3-.5 1.6 5.8 3.4-5.1 6.1 2.2-2.3-6 3.9-4.9-6.1.7-2.6-5.9Z",
      key: "explosion-burst",
    },
  ],
  ["path", { d: "m9.5 10.5 2.1 1.1 1.8-2.4.5 3 2.8.9-2.6 1.2.2 3-2.2-2-2.7 1.3 1.1-2.8-2.2-2Z", key: "explosion-core" }],
])

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
  "Укротитель машин": Explosion,
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
