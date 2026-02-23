export type SeasonalThemeId =
  | "new-year"
  | "defender-day"
  | "womens-day"
  | "labor-day"
  | "victory-day"
  | "russia-day"
  | "unity-day"
  | "winter"
  | "spring"
  | "summer"
  | "autumn"

export type SeasonalThemeIcon = "tree" | "shield" | "heart" | "flag" | "sun" | "leaf" | "sparkles" | "trophy"

export type SeasonalTheme = {
  id: SeasonalThemeId
  icon: SeasonalThemeIcon
  seasonLabel: string
  subtitle: string
  contextLabel: string
  loadingLabel: string
  summaryLabel: string
  showSnowfall: boolean
  backgroundImage: string
  overlayGradient: string
  backgroundOpacity: number
  palette: {
    red: string
    green: string
    gold: string
    snow: string
    primary: string
    accent: string
    ring: string
    chart4: string
    chart5: string
  }
}

type CalendarDate = {
  month: number
  day: number
}

function getMoscowCalendarDate(now: Date): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now)

  const month = Number(parts.find((part) => part.type === "month")?.value ?? 1)
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 1)

  return { month, day }
}

const THEMES: Record<SeasonalThemeId, SeasonalTheme> = {
  "new-year": {
    id: "new-year",
    icon: "tree",
    seasonLabel: "Зима",
    subtitle: "Новогодний и рождественский сезон",
    contextLabel: "Праздники по календарю РФ",
    loadingLabel: "Загрузка статистики... собираем зимние данные",
    summaryLabel: "MDC CLAN • ЗИМНИЙ СЕЗОН",
    showSnowfall: true,
    backgroundImage:
      "linear-gradient(140deg, rgba(10, 22, 38, 0.78) 0%, rgba(8, 18, 32, 0.84) 52%, rgba(7, 14, 24, 0.92) 100%), url('/dark-winter-forest-snow-christmas-night-stars.jpg')",
    overlayGradient:
      "linear-gradient(to bottom, rgba(8, 16, 28, 0.62), rgba(8, 16, 28, 0.46), rgba(8, 16, 28, 0.72))",
    backgroundOpacity: 0.25,
    palette: {
      red: "oklch(0.56 0.2 25)",
      green: "oklch(0.5 0.16 145)",
      gold: "oklch(0.83 0.14 92)",
      snow: "oklch(0.97 0.02 250)",
      primary: "oklch(0.56 0.2 25)",
      accent: "oklch(0.83 0.14 92)",
      ring: "oklch(0.83 0.14 92)",
      chart4: "oklch(0.7 0.13 235)",
      chart5: "oklch(0.71 0.12 332)",
    },
  },
  "defender-day": {
    id: "defender-day",
    icon: "shield",
    seasonLabel: "Зима",
    subtitle: "Сводка ко Дню защитника Отечества",
    contextLabel: "23 февраля по календарю РФ",
    loadingLabel: "Загрузка статистики... готовим сводку ко Дню защитника",
    summaryLabel: "MDC CLAN • 23 ФЕВРАЛЯ",
    showSnowfall: false,
    backgroundImage:
      "radial-gradient(circle at 18% 20%, rgba(134, 160, 116, 0.38), transparent 42%), radial-gradient(circle at 82% 16%, rgba(171, 123, 72, 0.32), transparent 40%), linear-gradient(128deg, rgba(22, 36, 28, 0.98) 0%, rgba(18, 30, 38, 0.95) 54%, rgba(48, 28, 24, 0.92) 100%)",
    overlayGradient:
      "linear-gradient(to bottom, rgba(12, 20, 17, 0.45), rgba(12, 20, 17, 0.3), rgba(12, 20, 17, 0.6))",
    backgroundOpacity: 0.3,
    palette: {
      red: "oklch(0.59 0.19 30)",
      green: "oklch(0.51 0.14 145)",
      gold: "oklch(0.79 0.12 88)",
      snow: "oklch(0.97 0.02 95)",
      primary: "oklch(0.59 0.19 30)",
      accent: "oklch(0.79 0.12 88)",
      ring: "oklch(0.79 0.12 88)",
      chart4: "oklch(0.68 0.12 230)",
      chart5: "oklch(0.67 0.1 35)",
    },
  },
  "womens-day": {
    id: "womens-day",
    icon: "heart",
    seasonLabel: "Весна",
    subtitle: "Сводка к Международному женскому дню",
    contextLabel: "8 марта по календарю РФ",
    loadingLabel: "Загрузка статистики... готовим весенний выпуск",
    summaryLabel: "MDC CLAN • 8 МАРТА",
    showSnowfall: false,
    backgroundImage:
      "radial-gradient(circle at 12% 20%, rgba(244, 152, 145, 0.35), transparent 40%), radial-gradient(circle at 86% 22%, rgba(245, 196, 127, 0.32), transparent 38%), linear-gradient(130deg, rgba(38, 28, 34, 0.92) 0%, rgba(37, 26, 44, 0.9) 48%, rgba(24, 38, 34, 0.9) 100%)",
    overlayGradient:
      "linear-gradient(to bottom, rgba(20, 14, 20, 0.44), rgba(20, 14, 20, 0.32), rgba(20, 14, 20, 0.56))",
    backgroundOpacity: 0.28,
    palette: {
      red: "oklch(0.66 0.2 22)",
      green: "oklch(0.56 0.13 150)",
      gold: "oklch(0.84 0.15 85)",
      snow: "oklch(0.98 0.02 45)",
      primary: "oklch(0.66 0.2 22)",
      accent: "oklch(0.84 0.15 85)",
      ring: "oklch(0.84 0.15 85)",
      chart4: "oklch(0.7 0.12 225)",
      chart5: "oklch(0.72 0.11 350)",
    },
  },
  "labor-day": {
    id: "labor-day",
    icon: "sparkles",
    seasonLabel: "Весна",
    subtitle: "Майский сезон: Праздник Весны и Труда",
    contextLabel: "1 мая по календарю РФ",
    loadingLabel: "Загрузка статистики... обновляем майскую статистику",
    summaryLabel: "MDC CLAN • МАЙСКИЙ СЕЗОН",
    showSnowfall: false,
    backgroundImage:
      "radial-gradient(circle at 14% 24%, rgba(246, 189, 91, 0.34), transparent 42%), radial-gradient(circle at 84% 15%, rgba(118, 182, 120, 0.35), transparent 38%), linear-gradient(126deg, rgba(28, 36, 22, 0.94) 0%, rgba(24, 40, 34, 0.92) 53%, rgba(38, 30, 17, 0.93) 100%)",
    overlayGradient:
      "linear-gradient(to bottom, rgba(14, 21, 14, 0.4), rgba(14, 21, 14, 0.3), rgba(14, 21, 14, 0.52))",
    backgroundOpacity: 0.28,
    palette: {
      red: "oklch(0.64 0.2 32)",
      green: "oklch(0.57 0.15 147)",
      gold: "oklch(0.84 0.16 88)",
      snow: "oklch(0.98 0.02 95)",
      primary: "oklch(0.64 0.2 32)",
      accent: "oklch(0.84 0.16 88)",
      ring: "oklch(0.84 0.16 88)",
      chart4: "oklch(0.7 0.12 215)",
      chart5: "oklch(0.73 0.11 32)",
    },
  },
  "victory-day": {
    id: "victory-day",
    icon: "trophy",
    seasonLabel: "Весна",
    subtitle: "Майский сезон: ко Дню Победы",
    contextLabel: "9 мая по календарю РФ",
    loadingLabel: "Загрузка статистики... обновляем майскую сводку",
    summaryLabel: "MDC CLAN • КО ДНЮ ПОБЕДЫ",
    showSnowfall: false,
    backgroundImage:
      "radial-gradient(circle at 12% 20%, rgba(198, 132, 74, 0.35), transparent 40%), radial-gradient(circle at 84% 20%, rgba(133, 174, 117, 0.3), transparent 38%), linear-gradient(132deg, rgba(30, 20, 18, 0.95) 0%, rgba(35, 20, 21, 0.92) 50%, rgba(20, 32, 28, 0.9) 100%)",
    overlayGradient:
      "linear-gradient(to bottom, rgba(16, 10, 10, 0.45), rgba(16, 10, 10, 0.3), rgba(16, 10, 10, 0.58))",
    backgroundOpacity: 0.3,
    palette: {
      red: "oklch(0.6 0.2 26)",
      green: "oklch(0.53 0.13 145)",
      gold: "oklch(0.8 0.14 80)",
      snow: "oklch(0.97 0.02 90)",
      primary: "oklch(0.6 0.2 26)",
      accent: "oklch(0.8 0.14 80)",
      ring: "oklch(0.8 0.14 80)",
      chart4: "oklch(0.69 0.11 214)",
      chart5: "oklch(0.67 0.1 38)",
    },
  },
  "russia-day": {
    id: "russia-day",
    icon: "flag",
    seasonLabel: "Лето",
    subtitle: "Летний сезон: ко Дню России",
    contextLabel: "12 июня по календарю РФ",
    loadingLabel: "Загрузка статистики... готовим летнюю сводку",
    summaryLabel: "MDC CLAN • ДЕНЬ РОССИИ",
    showSnowfall: false,
    backgroundImage:
      "radial-gradient(circle at 18% 18%, rgba(82, 128, 204, 0.36), transparent 40%), radial-gradient(circle at 82% 16%, rgba(210, 88, 88, 0.3), transparent 38%), linear-gradient(126deg, rgba(18, 30, 48, 0.94) 0%, rgba(20, 36, 60, 0.9) 52%, rgba(32, 22, 34, 0.9) 100%)",
    overlayGradient:
      "linear-gradient(to bottom, rgba(10, 17, 28, 0.42), rgba(10, 17, 28, 0.3), rgba(10, 17, 28, 0.56))",
    backgroundOpacity: 0.3,
    palette: {
      red: "oklch(0.62 0.2 24)",
      green: "oklch(0.58 0.13 230)",
      gold: "oklch(0.85 0.08 100)",
      snow: "oklch(0.99 0.01 250)",
      primary: "oklch(0.62 0.2 24)",
      accent: "oklch(0.85 0.08 100)",
      ring: "oklch(0.85 0.08 100)",
      chart4: "oklch(0.72 0.12 235)",
      chart5: "oklch(0.74 0.11 27)",
    },
  },
  "unity-day": {
    id: "unity-day",
    icon: "flag",
    seasonLabel: "Осень",
    subtitle: "Осенний сезон: ко Дню народного единства",
    contextLabel: "4 ноября по календарю РФ",
    loadingLabel: "Загрузка статистики... готовим осенний обзор",
    summaryLabel: "MDC CLAN • ДЕНЬ ЕДИНСТВА",
    showSnowfall: false,
    backgroundImage:
      "radial-gradient(circle at 14% 18%, rgba(189, 86, 66, 0.34), transparent 42%), radial-gradient(circle at 86% 20%, rgba(211, 151, 67, 0.3), transparent 40%), linear-gradient(132deg, rgba(38, 20, 16, 0.95) 0%, rgba(30, 26, 16, 0.92) 48%, rgba(20, 32, 20, 0.9) 100%)",
    overlayGradient:
      "linear-gradient(to bottom, rgba(14, 10, 8, 0.42), rgba(14, 10, 8, 0.3), rgba(14, 10, 8, 0.56))",
    backgroundOpacity: 0.3,
    palette: {
      red: "oklch(0.61 0.2 28)",
      green: "oklch(0.55 0.12 136)",
      gold: "oklch(0.81 0.14 75)",
      snow: "oklch(0.97 0.02 85)",
      primary: "oklch(0.61 0.2 28)",
      accent: "oklch(0.81 0.14 75)",
      ring: "oklch(0.81 0.14 75)",
      chart4: "oklch(0.7 0.11 210)",
      chart5: "oklch(0.71 0.1 30)",
    },
  },
  winter: {
    id: "winter",
    icon: "tree",
    seasonLabel: "Зима",
    subtitle: "Зимний сезон",
    contextLabel: "Авто-тема по календарю РФ",
    loadingLabel: "Загрузка статистики... зимний сезон",
    summaryLabel: "MDC CLAN • ЗИМНИЙ СЕЗОН",
    showSnowfall: true,
    backgroundImage:
      "linear-gradient(140deg, rgba(12, 24, 42, 0.76) 0%, rgba(8, 18, 34, 0.84) 55%, rgba(7, 14, 28, 0.9) 100%), url('/dark-winter-forest-snow-christmas-night-stars.jpg')",
    overlayGradient:
      "linear-gradient(to bottom, rgba(9, 16, 28, 0.62), rgba(9, 16, 28, 0.46), rgba(9, 16, 28, 0.72))",
    backgroundOpacity: 0.24,
    palette: {
      red: "oklch(0.56 0.2 25)",
      green: "oklch(0.5 0.15 145)",
      gold: "oklch(0.82 0.13 90)",
      snow: "oklch(0.97 0.02 250)",
      primary: "oklch(0.56 0.2 25)",
      accent: "oklch(0.82 0.13 90)",
      ring: "oklch(0.82 0.13 90)",
      chart4: "oklch(0.69 0.12 232)",
      chart5: "oklch(0.69 0.1 330)",
    },
  },
  spring: {
    id: "spring",
    icon: "sparkles",
    seasonLabel: "Весна",
    subtitle: "Весенний сезон",
    contextLabel: "Авто-тема по календарю РФ",
    loadingLabel: "Загрузка статистики... весенний сезон",
    summaryLabel: "MDC CLAN • ВЕСЕННИЙ СЕЗОН",
    showSnowfall: false,
    backgroundImage:
      "radial-gradient(circle at 14% 22%, rgba(245, 164, 125, 0.32), transparent 40%), radial-gradient(circle at 84% 18%, rgba(142, 201, 141, 0.32), transparent 36%), linear-gradient(128deg, rgba(30, 28, 22, 0.9) 0%, rgba(22, 36, 30, 0.9) 52%, rgba(26, 32, 20, 0.9) 100%)",
    overlayGradient:
      "linear-gradient(to bottom, rgba(16, 14, 10, 0.38), rgba(16, 14, 10, 0.28), rgba(16, 14, 10, 0.52))",
    backgroundOpacity: 0.28,
    palette: {
      red: "oklch(0.65 0.19 32)",
      green: "oklch(0.59 0.14 145)",
      gold: "oklch(0.84 0.14 95)",
      snow: "oklch(0.98 0.02 95)",
      primary: "oklch(0.65 0.19 32)",
      accent: "oklch(0.84 0.14 95)",
      ring: "oklch(0.84 0.14 95)",
      chart4: "oklch(0.71 0.11 220)",
      chart5: "oklch(0.72 0.1 34)",
    },
  },
  summer: {
    id: "summer",
    icon: "sun",
    seasonLabel: "Лето",
    subtitle: "Летний сезон",
    contextLabel: "Авто-тема по календарю РФ",
    loadingLabel: "Загрузка статистики... летний сезон",
    summaryLabel: "MDC CLAN • ЛЕТНИЙ СЕЗОН",
    showSnowfall: false,
    backgroundImage:
      "radial-gradient(circle at 12% 18%, rgba(111, 170, 236, 0.34), transparent 42%), radial-gradient(circle at 85% 14%, rgba(245, 191, 105, 0.34), transparent 38%), linear-gradient(124deg, rgba(18, 34, 50, 0.9) 0%, rgba(20, 44, 52, 0.88) 54%, rgba(18, 34, 24, 0.88) 100%)",
    overlayGradient:
      "linear-gradient(to bottom, rgba(9, 18, 28, 0.36), rgba(9, 18, 28, 0.27), rgba(9, 18, 28, 0.5))",
    backgroundOpacity: 0.3,
    palette: {
      red: "oklch(0.63 0.19 32)",
      green: "oklch(0.58 0.13 205)",
      gold: "oklch(0.86 0.14 88)",
      snow: "oklch(0.98 0.02 235)",
      primary: "oklch(0.63 0.19 32)",
      accent: "oklch(0.86 0.14 88)",
      ring: "oklch(0.86 0.14 88)",
      chart4: "oklch(0.74 0.12 235)",
      chart5: "oklch(0.75 0.11 28)",
    },
  },
  autumn: {
    id: "autumn",
    icon: "leaf",
    seasonLabel: "Осень",
    subtitle: "Осенний сезон",
    contextLabel: "Авто-тема по календарю РФ",
    loadingLabel: "Загрузка статистики... осенний сезон",
    summaryLabel: "MDC CLAN • ОСЕННИЙ СЕЗОН",
    showSnowfall: false,
    backgroundImage:
      "radial-gradient(circle at 14% 18%, rgba(204, 120, 72, 0.34), transparent 42%), radial-gradient(circle at 84% 16%, rgba(224, 170, 78, 0.3), transparent 38%), linear-gradient(132deg, rgba(38, 22, 16, 0.95) 0%, rgba(32, 26, 14, 0.92) 50%, rgba(18, 30, 18, 0.9) 100%)",
    overlayGradient:
      "linear-gradient(to bottom, rgba(14, 10, 8, 0.42), rgba(14, 10, 8, 0.3), rgba(14, 10, 8, 0.56))",
    backgroundOpacity: 0.3,
    palette: {
      red: "oklch(0.62 0.2 30)",
      green: "oklch(0.53 0.11 132)",
      gold: "oklch(0.82 0.15 74)",
      snow: "oklch(0.97 0.02 82)",
      primary: "oklch(0.62 0.2 30)",
      accent: "oklch(0.82 0.15 74)",
      ring: "oklch(0.82 0.15 74)",
      chart4: "oklch(0.69 0.1 205)",
      chart5: "oklch(0.7 0.11 32)",
    },
  },
}

export function getSeasonalTheme(now: Date = new Date()): SeasonalTheme {
  const { month, day } = getMoscowCalendarDate(now)

  if ((month === 12 && day >= 20) || (month === 1 && day <= 14)) {
    return THEMES["new-year"]
  }

  if (month === 2 && day >= 20 && day <= 24) {
    return THEMES["defender-day"]
  }

  if (month === 3 && day >= 6 && day <= 10) {
    return THEMES["womens-day"]
  }

  if (month === 5 && day >= 7 && day <= 10) {
    return THEMES["victory-day"]
  }

  if (month === 5 && day >= 1 && day <= 3) {
    return THEMES["labor-day"]
  }

  if (month === 6 && day >= 10 && day <= 13) {
    return THEMES["russia-day"]
  }

  if (month === 11 && day >= 2 && day <= 5) {
    return THEMES["unity-day"]
  }

  if (month === 12 || month === 1 || month === 2) {
    return THEMES.winter
  }

  if (month >= 3 && month <= 5) {
    return THEMES.spring
  }

  if (month >= 6 && month <= 8) {
    return THEMES.summer
  }

  return THEMES.autumn
}

export function getRussianCalendarThemeCatalog(): Array<{ id: SeasonalThemeId; subtitle: string; contextLabel: string }> {
  return [
    { id: "new-year", subtitle: THEMES["new-year"].subtitle, contextLabel: "20 декабря - 14 января" },
    { id: "defender-day", subtitle: THEMES["defender-day"].subtitle, contextLabel: "20 - 24 февраля" },
    { id: "womens-day", subtitle: THEMES["womens-day"].subtitle, contextLabel: "6 - 10 марта" },
    { id: "labor-day", subtitle: THEMES["labor-day"].subtitle, contextLabel: "1 - 3 мая" },
    { id: "victory-day", subtitle: THEMES["victory-day"].subtitle, contextLabel: "7 - 10 мая" },
    { id: "russia-day", subtitle: THEMES["russia-day"].subtitle, contextLabel: "10 - 13 июня" },
    { id: "unity-day", subtitle: THEMES["unity-day"].subtitle, contextLabel: "2 - 5 ноября" },
    { id: "winter", subtitle: THEMES.winter.subtitle, contextLabel: "декабрь - февраль" },
    { id: "spring", subtitle: THEMES.spring.subtitle, contextLabel: "март - май" },
    { id: "summer", subtitle: THEMES.summer.subtitle, contextLabel: "июнь - август" },
    { id: "autumn", subtitle: THEMES.autumn.subtitle, contextLabel: "сентябрь - ноябрь" },
  ]
}
