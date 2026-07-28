import { chromium } from "playwright"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const FRESH_TTL_MS = 60_000
const STALE_TTL_MS = 15 * 60_000

type Side = "1" | "2"
type PngCacheEntry = {
  body: Buffer
  updatedAt: number
}
type LineupPngGlobal = typeof globalThis & {
  __lineupPngCache?: Partial<Record<Side, PngCacheEntry>>
  __lineupPngInflight?: Partial<Record<Side, Promise<PngCacheEntry>>>
  __lineupPngRenderQueue?: Promise<unknown>
}

const pngGlobal = globalThis as LineupPngGlobal

function resolveSide(value: string | null): "1" | "2" {
  const normalized = String(value ?? "").trim().toLowerCase()
  return ["2", "two", "right", "second", "sitetwo", "site-two"].includes(normalized) ? "2" : "1"
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

async function renderLineupPng(side: Side): Promise<PngCacheEntry> {
  const renderUrl = new URL("/lineup-export", getScreenshotOrigin())
  renderUrl.searchParams.set("side", side)
  renderUrl.searchParams.set("t", String(Date.now()))

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null

  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  })

  let page: Awaited<ReturnType<typeof browser.newPage>> | null = null

  try {
    page = await browser.newPage({
      viewport: { width: 1500, height: 1400 },
      deviceScaleFactor: 2,
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

    return { body: Buffer.from(screenshot), updatedAt: Date.now() }
  } finally {
    await page?.close().catch(() => undefined)
    await browser?.close()
  }
}

async function getCachedLineupPng(side: Side, force = false) {
  const now = Date.now()
  pngGlobal.__lineupPngCache ??= {}
  pngGlobal.__lineupPngInflight ??= {}

  const cached = pngGlobal.__lineupPngCache[side]
  const isFresh = cached && now - cached.updatedAt < FRESH_TTL_MS
  if (!force && isFresh) return cached

  if (!pngGlobal.__lineupPngInflight[side]) {
    pngGlobal.__lineupPngInflight[side] = enqueueRender(() => renderLineupPng(side))
      .then((entry) => {
        pngGlobal.__lineupPngCache![side] = entry
        return entry
      })
      .finally(() => {
        delete pngGlobal.__lineupPngInflight?.[side]
      })
  }

  try {
    return await pngGlobal.__lineupPngInflight[side]
  } catch (error) {
    if (cached && now - cached.updatedAt < STALE_TTL_MS) return cached
    throw error
  }
}

export async function GET(request: NextRequest) {
  const side = resolveSide(request.nextUrl.searchParams.get("side"))
  const force = request.nextUrl.searchParams.get("refresh") === "true"

  try {
    const screenshot = await getCachedLineupPng(side, force)
    const ageSeconds = Math.max(0, Math.round((Date.now() - screenshot.updatedAt) / 1000))

    return new Response(screenshot.body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="lineup-side-${side}.png"`,
        "X-Lineup-Png-Cache-Age": String(ageSeconds),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error)
    return new Response(message, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }
}
