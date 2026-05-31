import { withBasePath } from "./base-path"

export type SeasonalThemeId =
  | "winter"
  | "spring"
  | "summer"
  | "autumn"

export type SeasonalThemeIcon = "snowflake" | "sprout" | "sun" | "maple-leaf"

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
  backgroundSize: string
  backgroundPosition: string
  backgroundRepeat: string
  backgroundBlendMode: string
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
  year: number
  month: number
  day: number
  hour: number
}

const WINTER_BACKGROUND_IMAGE = withBasePath("/dark-winter-forest-snow-christmas-night-stars.jpg")

function getMoscowCalendarDate(now: Date): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now)

  const year = Number(parts.find((part) => part.type === "year")?.value ?? 1970)
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 1)
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 1)
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0)

  return { year, month, day, hour }
}

type BackgroundLayer = {
  image: string
  size?: string
  position?: string
  repeat?: string
  blendMode?: string
}

type BackgroundSpec = {
  image: string
  overlayGradient: string
  opacity: number
  size: string
  position: string
  repeat: string
  blendMode: string
}

type MilitaryBackgroundRecipe = {
  glowA: string
  glowB: string
  contour: string
  contourAccent: string
  grid: string
  stripe: string
  scan: string
  camoA: string
  camoB: string
  camoC: string
  baseStart: string
  baseMid: string
  baseEnd: string
  overlayTop: string
  overlayMid: string
  overlayBottom: string
  photoUrl?: string
  photoPosition?: string
  opacity?: number
}

type SeasonalThemeDefinition = Omit<
  SeasonalTheme,
  "backgroundImage" | "overlayGradient" | "backgroundOpacity" | "backgroundSize" | "backgroundPosition" | "backgroundRepeat" | "backgroundBlendMode"
> & {
  backgrounds: BackgroundSpec[]
}

function svgDataUri(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

function createContourPattern(stroke: string, accent: string): string {
  return svgDataUri(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 560 560' fill='none'>
      <path d='M-24 112C56 46 144 44 222 96C300 148 378 154 470 124C522 106 564 88 592 94' stroke='${stroke}' stroke-width='1.4'/>
      <path d='M-18 176C66 126 140 134 214 182C286 228 362 238 448 214C506 198 546 176 586 176' stroke='${stroke}' stroke-width='1.1' opacity='.78'/>
      <path d='M-12 252C82 210 164 214 246 260C324 304 396 310 474 288C520 274 558 258 586 262' stroke='${stroke}' stroke-width='1.3' opacity='.74'/>
      <path d='M-20 336C56 286 132 286 214 330C304 378 382 388 470 362C520 346 552 330 590 330' stroke='${stroke}' stroke-width='1.2' opacity='.82'/>
      <path d='M-12 428C66 386 154 392 246 438C330 478 412 482 488 456C528 442 560 430 590 430' stroke='${stroke}' stroke-width='1.1' opacity='.68'/>
      <circle cx='148' cy='132' r='5' fill='${accent}' opacity='.28'/>
      <circle cx='392' cy='232' r='4' fill='${accent}' opacity='.22'/>
      <circle cx='452' cy='408' r='6' fill='${accent}' opacity='.18'/>
      <path d='M118 134h52M144 108v52' stroke='${accent}' stroke-width='1.2' opacity='.22'/>
      <path d='M386 236h40M406 216v40' stroke='${accent}' stroke-width='1.1' opacity='.18'/>
    </svg>`,
  )
}

function createGridPattern(line: string, accent: string): string {
  return svgDataUri(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 360 360' fill='none'>
      <path d='M0 60H360M0 120H360M0 180H360M0 240H360M0 300H360' stroke='${line}' stroke-width='1'/>
      <path d='M60 0V360M120 0V360M180 0V360M240 0V360M300 0V360' stroke='${line}' stroke-width='1'/>
      <circle cx='180' cy='180' r='48' stroke='${accent}' stroke-width='1.3' opacity='.5'/>
      <circle cx='180' cy='180' r='90' stroke='${accent}' stroke-width='0.8' opacity='.24'/>
      <path d='M180 96V264M96 180H264' stroke='${accent}' stroke-width='1.2' opacity='.42'/>
      <path d='M0 0L360 360M360 0L0 360' stroke='${accent}' stroke-width='0.8' opacity='.12'/>
    </svg>`,
  )
}

function createChevronPattern(stroke: string, accent: string): string {
  return svgDataUri(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 240' fill='none'>
      <path d='M-54 34L80 120L-54 206' stroke='${stroke}' stroke-width='20' opacity='.22' stroke-linecap='round' stroke-linejoin='round'/>
      <path d='M62 34L196 120L62 206' stroke='${stroke}' stroke-width='20' opacity='.16' stroke-linecap='round' stroke-linejoin='round'/>
      <path d='M178 34L312 120L178 206' stroke='${stroke}' stroke-width='20' opacity='.12' stroke-linecap='round' stroke-linejoin='round'/>
      <path d='M300 22L414 96' stroke='${accent}' stroke-width='2.2' opacity='.3'/>
      <path d='M286 216L418 128' stroke='${accent}' stroke-width='1.6' opacity='.22'/>
    </svg>`,
  )
}

function createCamouflagePattern(fillA: string, fillB: string, fillC: string): string {
  return svgDataUri(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'>
      <path fill='${fillA}' opacity='.26' d='M46 88c62-44 166-34 216 22c46 52 54 132 14 182c-38 48-134 86-206 46C6 300-14 208 18 142c6-18 14-34 28-54Z'/>
      <path fill='${fillB}' opacity='.22' d='M350 62c72-24 158 6 210 64c56 62 70 162 14 226c-50 58-158 90-240 48c-70-38-114-144-72-222c20-40 46-86 88-116Z'/>
      <path fill='${fillC}' opacity='.24' d='M122 398c68-42 184-44 258 2c80 50 102 164 44 214c-70 58-232 52-314-14c-70-56-62-142 12-202Z'/>
      <path fill='${fillB}' opacity='.16' d='M450 324c54-12 132 10 164 54c36 48 18 116-44 162c-66 48-160 48-208-10c-52-62 4-186 88-206Z'/>
    </svg>`,
  )
}

function composeBackground(layers: BackgroundLayer[], overlayGradient: string, opacity: number): BackgroundSpec {
  return {
    image: layers.map((layer) => layer.image).join(", "),
    overlayGradient,
    opacity,
    size: layers.map((layer) => layer.size ?? "cover").join(", "),
    position: layers.map((layer) => layer.position ?? "center").join(", "),
    repeat: layers.map((layer) => layer.repeat ?? "no-repeat").join(", "),
    blendMode: layers.map((layer) => layer.blendMode ?? "normal").join(", "),
  }
}

function buildMilitaryBackgrounds(recipe: MilitaryBackgroundRecipe): BackgroundSpec[] {
  const opacity = recipe.opacity ?? 0.3
  const photoLayer = recipe.photoUrl
    ? [
        {
          image: `url('${recipe.photoUrl}')`,
          size: "cover",
          position: recipe.photoPosition ?? "center",
          repeat: "no-repeat",
          blendMode: "normal",
        },
      ]
    : []

  const baseLayer: BackgroundLayer = {
    image: `linear-gradient(132deg, ${recipe.baseStart} 0%, ${recipe.baseMid} 52%, ${recipe.baseEnd} 100%)`,
    size: "cover",
    position: "center",
    repeat: "no-repeat",
    blendMode: recipe.photoUrl ? "multiply" : "normal",
  }

  return [
    composeBackground(
      [
        {
          image: `radial-gradient(circle at 14% 18%, ${recipe.glowA}, transparent 40%)`,
          blendMode: "screen",
        },
        {
          image: `radial-gradient(circle at 84% 16%, ${recipe.glowB}, transparent 36%)`,
          blendMode: "screen",
        },
        {
          image: "linear-gradient(180deg, rgba(255,255,255,0.05), transparent 38%, rgba(0,0,0,0.14) 100%)",
          blendMode: "soft-light",
        },
        {
          image: createContourPattern(recipe.contour, recipe.contourAccent),
          size: "560px 560px",
          repeat: "repeat",
          blendMode: "overlay",
        },
        baseLayer,
        ...photoLayer,
      ],
      `linear-gradient(to bottom, ${recipe.overlayTop}, ${recipe.overlayMid}, ${recipe.overlayBottom})`,
      opacity,
    ),
    composeBackground(
      [
        {
          image: `radial-gradient(circle at 22% 72%, ${recipe.glowA}, transparent 42%)`,
          blendMode: "screen",
        },
        {
          image: `radial-gradient(circle at 78% 14%, ${recipe.glowB}, transparent 34%)`,
          blendMode: "screen",
        },
        {
          image: `repeating-linear-gradient(122deg, transparent 0 84px, ${recipe.scan} 84px 92px, transparent 92px 168px)`,
          size: "cover",
          repeat: "no-repeat",
          blendMode: "soft-light",
        },
        {
          image: createGridPattern(recipe.grid, recipe.contourAccent),
          size: "360px 360px",
          repeat: "repeat",
          blendMode: "overlay",
        },
        {
          image: createChevronPattern(recipe.stripe, recipe.contourAccent),
          size: "420px 240px",
          repeat: "repeat",
          blendMode: "soft-light",
        },
        baseLayer,
        ...photoLayer,
      ],
      `linear-gradient(to bottom, ${recipe.overlayTop}, rgba(8, 12, 16, 0.24), ${recipe.overlayBottom})`,
      Math.min(0.34, opacity + 0.02),
    ),
    composeBackground(
      [
        {
          image: `radial-gradient(circle at 16% 22%, ${recipe.glowA}, transparent 40%)`,
          blendMode: "screen",
        },
        {
          image: `radial-gradient(circle at 86% 76%, ${recipe.glowB}, transparent 38%)`,
          blendMode: "screen",
        },
        {
          image: createCamouflagePattern(recipe.camoA, recipe.camoB, recipe.camoC),
          size: "640px 640px",
          repeat: "repeat",
          blendMode: "soft-light",
        },
        {
          image: createChevronPattern(recipe.stripe, recipe.contourAccent),
          size: "420px 240px",
          repeat: "repeat",
          blendMode: "overlay",
        },
        {
          image: createContourPattern(recipe.contour, recipe.contourAccent),
          size: "620px 620px",
          repeat: "repeat",
          blendMode: "soft-light",
        },
        baseLayer,
        ...photoLayer,
      ],
      `linear-gradient(to bottom, ${recipe.overlayTop}, rgba(10, 14, 16, 0.22), ${recipe.overlayBottom})`,
      opacity,
    ),
  ]
}

function hashThemeId(id: SeasonalThemeId): number {
  return Array.from(id).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0)
}

function selectBackground(themeId: SeasonalThemeId, now: Date, backgrounds: BackgroundSpec[]): BackgroundSpec {
  if (backgrounds.length === 0) {
    return {
      image: "linear-gradient(135deg, rgba(10, 16, 22, 0.92), rgba(6, 10, 16, 0.98))",
      overlayGradient: "linear-gradient(to bottom, rgba(8, 12, 18, 0.42), rgba(8, 12, 18, 0.58))",
      opacity: 0.3,
      size: "cover",
      position: "center",
      repeat: "no-repeat",
      blendMode: "normal",
    }
  }

  const { year, month, day, hour } = getMoscowCalendarDate(now)
  const hourBucket = Math.floor(hour / 8)
  const seed = year * 17 + month * 31 + day * 7 + hourBucket + hashThemeId(themeId)
  return backgrounds[Math.abs(seed) % backgrounds.length]!
}

const WINTER_RECIPE: MilitaryBackgroundRecipe = {
  glowA: "rgba(118, 174, 218, 0.22)",
  glowB: "rgba(232, 242, 250, 0.18)",
  contour: "rgba(154, 196, 226, 0.2)",
  contourAccent: "rgba(236, 246, 252, 0.2)",
  grid: "rgba(154, 196, 226, 0.08)",
  stripe: "rgba(218, 236, 248, 0.18)",
  scan: "rgba(210, 232, 246, 0.06)",
  camoA: "rgba(72, 106, 132, 0.58)",
  camoB: "rgba(170, 206, 232, 0.42)",
  camoC: "rgba(24, 42, 64, 0.84)",
  baseStart: "rgba(8, 28, 50, 0.82)",
  baseMid: "rgba(8, 20, 38, 0.88)",
  baseEnd: "rgba(6, 12, 26, 0.95)",
  overlayTop: "rgba(6, 14, 28, 0.62)",
  overlayMid: "rgba(8, 18, 32, 0.38)",
  overlayBottom: "rgba(6, 14, 28, 0.76)",
  photoUrl: WINTER_BACKGROUND_IMAGE,
  photoPosition: "center center",
  opacity: 0.28,
}

const SPRING_RECIPE: MilitaryBackgroundRecipe = {
  glowA: "rgba(245, 164, 125, 0.24)",
  glowB: "rgba(142, 201, 141, 0.22)",
  contour: "rgba(171, 200, 142, 0.18)",
  contourAccent: "rgba(245, 205, 150, 0.16)",
  grid: "rgba(171, 200, 142, 0.08)",
  stripe: "rgba(196, 146, 95, 0.16)",
  scan: "rgba(214, 198, 138, 0.07)",
  camoA: "rgba(94, 112, 76, 0.5)",
  camoB: "rgba(148, 102, 70, 0.34)",
  camoC: "rgba(26, 36, 28, 0.84)",
  baseStart: "rgba(30, 28, 22, 0.9)",
  baseMid: "rgba(22, 36, 30, 0.9)",
  baseEnd: "rgba(26, 32, 20, 0.9)",
  overlayTop: "rgba(16, 14, 10, 0.42)",
  overlayMid: "rgba(16, 14, 10, 0.28)",
  overlayBottom: "rgba(16, 14, 10, 0.54)",
  opacity: 0.3,
}

const SUMMER_RECIPE: MilitaryBackgroundRecipe = {
  glowA: "rgba(38, 188, 184, 0.25)",
  glowB: "rgba(238, 172, 76, 0.24)",
  contour: "rgba(62, 178, 176, 0.19)",
  contourAccent: "rgba(240, 184, 94, 0.22)",
  grid: "rgba(62, 178, 176, 0.08)",
  stripe: "rgba(238, 172, 76, 0.17)",
  scan: "rgba(86, 214, 204, 0.07)",
  camoA: "rgba(18, 82, 84, 0.5)",
  camoB: "rgba(132, 84, 36, 0.34)",
  camoC: "rgba(10, 30, 32, 0.88)",
  baseStart: "rgba(6, 34, 38, 0.95)",
  baseMid: "rgba(10, 42, 44, 0.91)",
  baseEnd: "rgba(42, 26, 12, 0.91)",
  overlayTop: "rgba(4, 14, 16, 0.44)",
  overlayMid: "rgba(5, 18, 18, 0.28)",
  overlayBottom: "rgba(6, 12, 12, 0.58)",
  opacity: 0.3,
}

const AUTUMN_RECIPE: MilitaryBackgroundRecipe = {
  glowA: "rgba(118, 74, 132, 0.24)",
  glowB: "rgba(220, 172, 70, 0.25)",
  contour: "rgba(132, 92, 126, 0.18)",
  contourAccent: "rgba(226, 180, 86, 0.24)",
  grid: "rgba(188, 150, 74, 0.08)",
  stripe: "rgba(210, 164, 76, 0.17)",
  scan: "rgba(218, 170, 84, 0.07)",
  camoA: "rgba(52, 34, 62, 0.52)",
  camoB: "rgba(98, 96, 46, 0.34)",
  camoC: "rgba(18, 14, 24, 0.88)",
  baseStart: "rgba(24, 12, 30, 0.96)",
  baseMid: "rgba(28, 22, 18, 0.92)",
  baseEnd: "rgba(18, 24, 14, 0.93)",
  overlayTop: "rgba(8, 4, 12, 0.48)",
  overlayMid: "rgba(9, 7, 6, 0.3)",
  overlayBottom: "rgba(6, 4, 8, 0.62)",
  opacity: 0.3,
}

const THEMES: Record<SeasonalThemeId, SeasonalThemeDefinition> = {
  winter: {
    id: "winter",
    icon: "snowflake",
    seasonLabel: "Зима",
    subtitle: "Зимний сезон",
    contextLabel: "Авто-тема по календарю РФ",
    loadingLabel: "Загрузка статистики... зимний сезон",
    summaryLabel: "MDC CLAN • ЗИМНИЙ СЕЗОН",
    showSnowfall: true,
    backgrounds: buildMilitaryBackgrounds(WINTER_RECIPE),
    palette: {
      red: "oklch(0.68 0.09 235)",
      green: "oklch(0.76 0.06 220)",
      gold: "oklch(0.9 0.03 230)",
      snow: "oklch(0.97 0.02 250)",
      primary: "oklch(0.68 0.09 235)",
      accent: "oklch(0.9 0.03 230)",
      ring: "oklch(0.76 0.06 220)",
      chart4: "oklch(0.78 0.06 220)",
      chart5: "oklch(0.92 0.02 245)",
    },
  },
  spring: {
    id: "spring",
    icon: "sprout",
    seasonLabel: "Весна",
    subtitle: "Весенний сезон",
    contextLabel: "Авто-тема по календарю РФ",
    loadingLabel: "Загрузка статистики... весенний сезон",
    summaryLabel: "MDC CLAN • ВЕСЕННИЙ СЕЗОН",
    showSnowfall: false,
    backgrounds: buildMilitaryBackgrounds(SPRING_RECIPE),
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
    backgrounds: buildMilitaryBackgrounds(SUMMER_RECIPE),
    palette: {
      red: "oklch(0.72 0.12 52)",
      green: "oklch(0.68 0.11 185)",
      gold: "oklch(0.84 0.13 74)",
      snow: "oklch(0.98 0.02 95)",
      primary: "oklch(0.68 0.11 185)",
      accent: "oklch(0.84 0.13 74)",
      ring: "oklch(0.72 0.12 52)",
      chart4: "oklch(0.72 0.1 178)",
      chart5: "oklch(0.78 0.11 64)",
    },
  },
  autumn: {
    id: "autumn",
    icon: "maple-leaf",
    seasonLabel: "Осень",
    subtitle: "Осенний сезон",
    contextLabel: "Авто-тема по календарю РФ",
    loadingLabel: "Загрузка статистики... осенний сезон",
    summaryLabel: "MDC CLAN • ОСЕННИЙ СЕЗОН",
    showSnowfall: false,
    backgrounds: buildMilitaryBackgrounds(AUTUMN_RECIPE),
    palette: {
      red: "oklch(0.5 0.1 320)",
      green: "oklch(0.58 0.08 112)",
      gold: "oklch(0.8 0.12 82)",
      snow: "oklch(0.97 0.02 80)",
      primary: "oklch(0.5 0.1 320)",
      accent: "oklch(0.8 0.12 82)",
      ring: "oklch(0.8 0.12 82)",
      chart4: "oklch(0.62 0.08 105)",
      chart5: "oklch(0.56 0.09 318)",
    },
  },
}

export function getSeasonalTheme(now: Date = new Date()): SeasonalTheme {
  const { month } = getMoscowCalendarDate(now)
  const toRuntimeTheme = (theme: SeasonalThemeDefinition, overrides: Partial<Pick<SeasonalThemeDefinition, "subtitle" | "contextLabel" | "summaryLabel" | "loadingLabel">> = {}): SeasonalTheme => {
    const background = selectBackground(theme.id, now, theme.backgrounds)
    const runtimeTheme = { ...theme, ...overrides }
    return {
      ...runtimeTheme,
      backgroundImage: background.image,
      overlayGradient: background.overlayGradient,
      backgroundOpacity: background.opacity,
      backgroundSize: background.size,
      backgroundPosition: background.position,
      backgroundRepeat: background.repeat,
      backgroundBlendMode: background.blendMode,
    }
  }

  if (month === 12 || month === 1 || month === 2) {
    return toRuntimeTheme(THEMES.winter)
  }

  if (month >= 3 && month <= 5) {
    return toRuntimeTheme(THEMES.spring)
  }

  if (month >= 6 && month <= 8) {
    return toRuntimeTheme(THEMES.summer)
  }

  return toRuntimeTheme(THEMES.autumn)
}

export function getRussianCalendarThemeCatalog(): Array<{ id: SeasonalThemeId; subtitle: string; contextLabel: string }> {
  return [
    { id: "winter", subtitle: THEMES.winter.subtitle, contextLabel: "декабрь - февраль" },
    { id: "spring", subtitle: THEMES.spring.subtitle, contextLabel: "март - май" },
    { id: "summer", subtitle: THEMES.summer.subtitle, contextLabel: "июнь - август" },
    { id: "autumn", subtitle: THEMES.autumn.subtitle, contextLabel: "сентябрь - ноябрь" },
  ]
}
