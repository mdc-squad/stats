export type RatingMetricHelpKey = "elo" | "tbf" | "rating"

export const RATING_METRIC_HELP: Record<RatingMetricHelpKey, string> = {
  elo: "ELO показывает боевой вклад в конкретном матче: поднятия, хил, ноки, убийства и техника дают очки, смерти их снижают.",
  tbf: "ТБФ показывает текущую боевую форму: средний боевой рейтинг по последним боям с учетом типа события, силы соперника и результата.",
  rating: "ОР - итоговые очки рейтинга. Это ТБФ плюс баллы посещения, поэтому показатель учитывает и эффективность, и активность игрока.",
}

export function getRatingMetricHelp(metric: string): string | undefined {
  const normalized = metric.toLowerCase().replace(/^avg/, "")
  if (normalized === "elo") return RATING_METRIC_HELP.elo
  if (normalized === "tbf") return RATING_METRIC_HELP.tbf
  if (normalized === "rating") return RATING_METRIC_HELP.rating
  return undefined
}
