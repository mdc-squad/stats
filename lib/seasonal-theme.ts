import { withBasePath } from "./base-path"

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
  glowA: "rgba(122, 166, 214, 0.28)",
  glowB: "rgba(202, 224, 255, 0.18)",
  contour: "rgba(156, 196, 228, 0.24)",
  contourAccent: "rgba(234, 244, 255, 0.22)",
  grid: "rgba(156, 196, 228, 0.1)",
  stripe: "rgba(186, 214, 238, 0.22)",
  scan: "rgba(190, 220, 255, 0.08)",
  camoA: "rgba(82, 104, 122, 0.6)",
  camoB: "rgba(132, 162, 186, 0.45)",
  camoC: "rgba(36, 50, 66, 0.82)",
  baseStart: "rgba(12, 24, 42, 0.8)",
  baseMid: "rgba(8, 18, 34, 0.86)",
  baseEnd: "rgba(7, 14, 28, 0.94)",
  overlayTop: "rgba(9, 16, 28, 0.64)",
  overlayMid: "rgba(9, 16, 28, 0.42)",
  overlayBottom: "rgba(9, 16, 28, 0.76)",
  photoUrl: WINTER_BACKGROUND_IMAGE,
  photoPosition: "center center",
  opacity: 0.28,
}

const NEW_YEAR_RECIPE: MilitaryBackgroundRecipe = {
  ...WINTER_RECIPE,
  glowA: "rgba(118, 170, 220, 0.24)",
  glowB: "rgba(236, 214, 150, 0.18)",
  contourAccent: "rgba(248, 236, 188, 0.2)",
  stripe: "rgba(210, 188, 126, 0.18)",
}

const DEFENDER_RECIPE: MilitaryBackgroundRecipe = {
  glowA: "rgba(132, 160, 116, 0.3)",
  glowB: "rgba(171, 123, 72, 0.24)",
  contour: "rgba(163, 184, 129, 0.2)",
  contourAccent: "rgba(231, 198, 128, 0.18)",
  grid: "rgba(168, 178, 122, 0.09)",
  stripe: "rgba(171, 123, 72, 0.2)",
  scan: "rgba(199, 176, 116, 0.08)",
  camoA: "rgba(86, 96, 66, 0.64)",
  camoB: "rgba(146, 112, 76, 0.42)",
  camoC: "rgba(26, 34, 28, 0.86)",
  baseStart: "rgba(22, 36, 28, 0.98)",
  baseMid: "rgba(18, 30, 38, 0.95)",
  baseEnd: "rgba(48, 28, 24, 0.92)",
  overlayTop: "rgba(12, 20, 17, 0.48)",
  overlayMid: "rgba(12, 20, 17, 0.3)",
  overlayBottom: "rgba(12, 20, 17, 0.6)",
  opacity: 0.32,
}

const WOMENS_DAY_RECIPE: MilitaryBackgroundRecipe = {
  ...DEFENDER_RECIPE,
  glowA: "rgba(244, 152, 145, 0.24)",
  glowB: "rgba(245, 196, 127, 0.24)",
  contour: "rgba(205, 178, 155, 0.18)",
  contourAccent: "rgba(244, 208, 188, 0.18)",
  stripe: "rgba(196, 130, 124, 0.18)",
  scan: "rgba(245, 206, 180, 0.07)",
  camoA: "rgba(110, 88, 86, 0.56)",
  camoB: "rgba(150, 112, 98, 0.4)",
  camoC: "rgba(40, 34, 44, 0.82)",
  baseStart: "rgba(38, 28, 34, 0.92)",
  baseMid: "rgba(37, 26, 44, 0.9)",
  baseEnd: "rgba(24, 38, 34, 0.9)",
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

const LABOR_RECIPE: MilitaryBackgroundRecipe = {
  ...SPRING_RECIPE,
  glowA: "rgba(246, 189, 91, 0.28)",
  glowB: "rgba(118, 182, 120, 0.24)",
  contourAccent: "rgba(246, 213, 126, 0.18)",
  stripe: "rgba(196, 156, 78, 0.18)",
  baseStart: "rgba(28, 36, 22, 0.94)",
  baseMid: "rgba(24, 40, 34, 0.92)",
  baseEnd: "rgba(38, 30, 17, 0.93)",
}

const VICTORY_RECIPE: MilitaryBackgroundRecipe = {
  ...DEFENDER_RECIPE,
  glowA: "rgba(198, 132, 74, 0.28)",
  glowB: "rgba(133, 174, 117, 0.22)",
  contourAccent: "rgba(232, 187, 112, 0.16)",
  stripe: "rgba(196, 114, 72, 0.2)",
  baseStart: "rgba(30, 20, 18, 0.95)",
  baseMid: "rgba(35, 20, 21, 0.92)",
  baseEnd: "rgba(20, 32, 28, 0.9)",
}

const SUMMER_RECIPE: MilitaryBackgroundRecipe = {
  glowA: "rgba(111, 170, 236, 0.26)",
  glowB: "rgba(245, 191, 105, 0.24)",
  contour: "rgba(142, 190, 232, 0.18)",
  contourAccent: "rgba(206, 226, 248, 0.18)",
  grid: "rgba(142, 190, 232, 0.09)",
  stripe: "rgba(125, 172, 212, 0.16)",
  scan: "rgba(183, 212, 244, 0.08)",
  camoA: "rgba(54, 104, 118, 0.42)",
  camoB: "rgba(112, 150, 88, 0.34)",
  camoC: "rgba(18, 34, 24, 0.84)",
  baseStart: "rgba(18, 34, 50, 0.9)",
  baseMid: "rgba(20, 44, 52, 0.88)",
  baseEnd: "rgba(18, 34, 24, 0.88)",
  overlayTop: "rgba(9, 18, 28, 0.4)",
  overlayMid: "rgba(9, 18, 28, 0.27)",
  overlayBottom: "rgba(9, 18, 28, 0.5)",
  opacity: 0.3,
}

const RUSSIA_RECIPE: MilitaryBackgroundRecipe = {
  ...SUMMER_RECIPE,
  glowA: "rgba(82, 128, 204, 0.3)",
  glowB: "rgba(210, 88, 88, 0.2)",
  contourAccent: "rgba(255, 255, 255, 0.18)",
  stripe: "rgba(172, 92, 92, 0.16)",
  baseStart: "rgba(18, 30, 48, 0.94)",
  baseMid: "rgba(20, 36, 60, 0.9)",
  baseEnd: "rgba(32, 22, 34, 0.9)",
}

const AUTUMN_RECIPE: MilitaryBackgroundRecipe = {
  glowA: "rgba(204, 120, 72, 0.26)",
  glowB: "rgba(224, 170, 78, 0.2)",
  contour: "rgba(194, 146, 82, 0.18)",
  contourAccent: "rgba(229, 194, 126, 0.18)",
  grid: "rgba(196, 150, 92, 0.08)",
  stripe: "rgba(170, 110, 72, 0.18)",
  scan: "rgba(222, 176, 112, 0.08)",
  camoA: "rgba(114, 70, 42, 0.46)",
  camoB: "rgba(154, 124, 66, 0.34)",
  camoC: "rgba(18, 30, 18, 0.86)",
  baseStart: "rgba(38, 22, 16, 0.95)",
  baseMid: "rgba(32, 26, 14, 0.92)",
  baseEnd: "rgba(18, 30, 18, 0.9)",
  overlayTop: "rgba(14, 10, 8, 0.44)",
  overlayMid: "rgba(14, 10, 8, 0.3)",
  overlayBottom: "rgba(14, 10, 8, 0.58)",
  opacity: 0.3,
}

const UNITY_RECIPE: MilitaryBackgroundRecipe = {
  ...AUTUMN_RECIPE,
  glowA: "rgba(189, 86, 66, 0.28)",
  glowB: "rgba(211, 151, 67, 0.22)",
  contourAccent: "rgba(236, 196, 126, 0.18)",
  stripe: "rgba(185, 92, 72, 0.18)",
  baseStart: "rgba(38, 20, 16, 0.95)",
  baseMid: "rgba(30, 26, 16, 0.92)",
  baseEnd: "rgba(20, 32, 20, 0.9)",
}

const THEMES: Record<SeasonalThemeId, SeasonalThemeDefinition> = {
  "new-year": {
    id: "new-year",
    icon: "tree",
    seasonLabel: "Зима",
    subtitle: "Новогодний и рождественский сезон",
    contextLabel: "Праздники по календарю РФ",
    loadingLabel: "Загрузка статистики... собираем зимние данные",
    summaryLabel: "MDC CLAN • ЗИМНИЙ СЕЗОН",
    showSnowfall: true,
    backgrounds: buildMilitaryBackgrounds(NEW_YEAR_RECIPE),
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
    backgrounds: buildMilitaryBackgrounds(DEFENDER_RECIPE),
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
    backgrounds: buildMilitaryBackgrounds(WOMENS_DAY_RECIPE),
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
    backgrounds: buildMilitaryBackgrounds(LABOR_RECIPE),
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
    backgrounds: buildMilitaryBackgrounds(VICTORY_RECIPE),
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
    backgrounds: buildMilitaryBackgrounds(RUSSIA_RECIPE),
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
    backgrounds: buildMilitaryBackgrounds(UNITY_RECIPE),
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
    backgrounds: buildMilitaryBackgrounds(WINTER_RECIPE),
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
    backgrounds: buildMilitaryBackgrounds(AUTUMN_RECIPE),
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
  const toRuntimeTheme = (theme: SeasonalThemeDefinition): SeasonalTheme => {
    const background = selectBackground(theme.id, now, theme.backgrounds)
    return {
      ...theme,
      backgroundImage: background.image,
      overlayGradient: background.overlayGradient,
      backgroundOpacity: background.opacity,
      backgroundSize: background.size,
      backgroundPosition: background.position,
      backgroundRepeat: background.repeat,
      backgroundBlendMode: background.blendMode,
    }
  }

  if ((month === 12 && day >= 20) || (month === 1 && day <= 14)) {
    return toRuntimeTheme(THEMES["new-year"])
  }

  if (month === 2 && day >= 20 && day <= 24) {
    return toRuntimeTheme(THEMES["defender-day"])
  }

  if (month === 3 && day >= 6 && day <= 10) {
    return toRuntimeTheme(THEMES["womens-day"])
  }

  if (month === 5 && day >= 7 && day <= 10) {
    return toRuntimeTheme(THEMES["victory-day"])
  }

  if (month === 5 && day >= 1 && day <= 3) {
    return toRuntimeTheme(THEMES["labor-day"])
  }

  if (month === 6 && day >= 10 && day <= 13) {
    return toRuntimeTheme(THEMES["russia-day"])
  }

  if (month === 11 && day >= 2 && day <= 5) {
    return toRuntimeTheme(THEMES["unity-day"])
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
