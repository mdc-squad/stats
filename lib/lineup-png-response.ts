import { chromium } from "playwright"
import sharp from "sharp"

const FRESH_TTL_MS = 60_000
const STALE_TTL_MS = 15 * 60_000

export type LineupPngSide = "1" | "2"
export type LineupImageFormat = "avif" | "png"

type PngCacheEntry = {
  body: Buffer
  format: LineupImageFormat
  updatedAt: number
}
type LineupPngGlobal = typeof globalThis & {
  __lineupPngCache?: Partial<Record<string, PngCacheEntry>>
  __lineupPngInflight?: Partial<Record<string, Promise<PngCacheEntry>>>
  __lineupPngRenderQueue?: Promise<unknown>
}

const pngGlobal = globalThis as LineupPngGlobal

export function resolveLineupPngSide(value: string | null | undefined): LineupPngSide {
  const normalized = String(value ?? "").trim().toLowerCase()
  return ["2", "two", "right", "second", "sitetwo", "site-two", "side-2", "side2", "2.png", "side-2.png"].includes(normalized)
    ? "2"
    : "1"
}

export function resolveLineupImageFormat(value: string | null | undefined): LineupImageFormat {
  return String(value ?? "").trim().toLowerCase() === "png" ? "png" : "avif"
}

function getScreenshotOrigin() {
  const configuredOrigin = (process.env.LINEUP_SCREENSHOT_ORIGIN ?? "").trim()
  if (!configuredOrigin) return "http://127.0.0.1:80"

  try {
    const url = new URL(configuredOrigin)
    if (["0.0.0.0", "127.0.0.1", "localhost"].includes(url.hostname)) {
      return `http://127.0.0.1:${url.port || "80"}`
    }
    return url.toString().replace(/\/$/, "")
  } catch {
    return "http://127.0.0.1:80"
  }
}

function enqueueRender(task: () => Promise<PngCacheEntry>) {
  const previous = pngGlobal.__lineupPngRenderQueue ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(task)
  pngGlobal.__lineupPngRenderQueue = next.catch(() => undefined)
  return next
}

async function renderLineupBrowserPng(side: LineupPngSide): Promise<Buffer> {
  const renderUrl = new URL("/lineup-export", getScreenshotOrigin())
  renderUrl.searchParams.set("side", side)
  renderUrl.searchParams.set("t", String(Date.now()))

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  })

  let page: Awaited<ReturnType<typeof browser.newPage>> | null = null

  try {
    page = await browser.newPage({
      viewport: { width: 1500, height: 1400 },
      deviceScaleFactor: 1,
    })

    await page.goto(renderUrl.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    })
    await page.waitForSelector('html[data-lineup-export-ready="true"]', { timeout: 45_000 })
    await page.waitForFunction(
      () => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
      null,
      { timeout: 45_000 },
    )

    const card = page.locator("[data-lineup-export-card]").first()
    await card.waitFor({ state: "visible", timeout: 15_000 })

    const screenshot = await card.screenshot({
      type: "png",
      animations: "disabled",
      scale: "device",
      timeout: 45_000,
    })

    return Buffer.from(screenshot)
  } finally {
    await page?.close().catch(() => undefined)
    await browser.close().catch(() => undefined)
  }
}

async function renderLineupImage(side: LineupPngSide, format: LineupImageFormat): Promise<PngCacheEntry> {
  const screenshot = await renderLineupBrowserPng(side)
  const body = format === "avif"
    ? await sharp(screenshot).avif({ quality: 82, effort: 4 }).toBuffer()
    : screenshot

  return { body, format, updatedAt: Date.now() }
}

async function getCachedLineupPng(side: LineupPngSide, format: LineupImageFormat, force = false) {
  const now = Date.now()
  const cacheKey = `${side}:${format}`
  pngGlobal.__lineupPngCache ??= {}
  pngGlobal.__lineupPngInflight ??= {}

  const cached = pngGlobal.__lineupPngCache[cacheKey]
  const isFresh = cached && now - cached.updatedAt < FRESH_TTL_MS
  if (!force && isFresh) return cached

  if (!pngGlobal.__lineupPngInflight[cacheKey]) {
    pngGlobal.__lineupPngInflight[cacheKey] = enqueueRender(() => renderLineupImage(side, format))
      .then((entry) => {
        pngGlobal.__lineupPngCache![cacheKey] = entry
        return entry
      })
      .finally(() => {
        delete pngGlobal.__lineupPngInflight?.[cacheKey]
      })
  }

  try {
    return await pngGlobal.__lineupPngInflight[cacheKey]
  } catch (error) {
    if (cached && now - cached.updatedAt < STALE_TTL_MS) return cached
    throw error
  }
}

export async function createLineupPngResponse(side: LineupPngSide, force = false, format: LineupImageFormat = "avif") {
  const screenshot = await getCachedLineupPng(side, format, force)
  const ageSeconds = Math.max(0, Math.round((Date.now() - screenshot.updatedAt) / 1000))
  const extension = screenshot.format === "avif" ? "avif" : "png"
  const contentType = screenshot.format === "avif" ? "image/avif" : "image/png"

  return new Response(screenshot.body, {
    headers: {
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": contentType,
      "Content-Length": String(screenshot.body.byteLength),
      "Content-Disposition": `inline; filename="lineup-side-${side}.${extension}"`,
      "X-Content-Type-Options": "nosniff",
      "X-Lineup-Png-Cache-Age": String(ageSeconds),
    },
  })
}

export function createLineupPngErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  return new Response(message, {
    status: 500,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
