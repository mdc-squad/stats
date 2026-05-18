export type RatingMetricHelpKey = "elo" | "tbf" | "rating"

export const RATING_METRIC_HELP: Record<RatingMetricHelpKey, string> = {
  elo: "ELO - боевой вклад за один матч. Формула: поднятия x10 + хил x1 + ноки x15 + убийства x20 - смерти x20 + техника x25. Чем выше вклад и меньше лишних смертей, тем выше ELO.",
  tbf: "ТБФ - текущая боевая форма за последние 30 дней. Берутся 10 последних игр: их ELO корректируется коэффициентом типа события, силы соперника и резултата игры (победа/поражение). Если игр меньше 10, результат сглаживается.",
  rating: "ОР - итоговый рейтинг за последние 30 дней: ТБФ + баллы посещения. Он показывает не только боевую эффективность, но и активность: игры, тренировки, лекции и штрафы за неявку.",
}

export function getRatingMetricHelp(metric: string): string | undefined {
  const normalized = metric.toLowerCase().replace(/^avg/, "")
  if (normalized === "elo") return RATING_METRIC_HELP.elo
  if (normalized === "tbf") return RATING_METRIC_HELP.tbf
  if (normalized === "rating") return RATING_METRIC_HELP.rating
  return undefined
}
