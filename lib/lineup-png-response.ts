import { createHash } from "node:crypto"
import { chromium } from "playwright"
import sharp from "sharp"
import { EXTERNAL_LINEUP_API_URL } from "@/lib/lineup-source"

const STALE_TTL_MS = 15 * 60_000
const LINEUP_CHECK_INTERVAL_MS = 30_000
const LINEUP_REGEN_DEBOUNCE_MS = 90_000
const LINEUP_BLOCKING_REGEN_DEBOUNCE_MS = 45_000

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
  __lineupPngDataHash?: string
  __lineupPngDataCheckedAt?: number
  __lineupPngDataInflight?: Promise<string>
  __lineupPngPendingHash?: string
  __lineupPngDebounceTimer?: ReturnType<typeof setTimeout>
  __lineupPngQueuedFormats?: Set<LineupImageFormat>
  __lineupPngBlockingRefresh?: Partial<Record<LineupImageFormat, Promise<string>>>
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

function getCacheKey(side: LineupPngSide, format: LineupImageFormat) {
  return `${side}:${format}`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchLineupHash() {
  const response = await fetch(EXTERNAL_LINEUP_API_URL, { cache: "no-store" })
  if (!response.ok) throw new Error(`Lineup API ${response.status}`)

  const body = await response.text()
  return createHash("sha256").update(body).digest("hex")
}

async function checkLineupHash() {
  if (!pngGlobal.__lineupPngDataInflight) {
    pngGlobal.__lineupPngDataInflight = fetchLineupHash()
      .then((hash) => {
        pngGlobal.__lineupPngDataCheckedAt = Date.now()
        return hash
      })
      .finally(() => {
        pngGlobal.__lineupPngDataInflight = undefined
      })
  }

  return pngGlobal.__lineupPngDataInflight
}

function queueLineupRegeneration(format: LineupImageFormat, nextHash: string) {
  pngGlobal.__lineupPngQueuedFormats ??= new Set<LineupImageFormat>()
  pngGlobal.__lineupPngQueuedFormats.add(format)

  if (pngGlobal.__lineupPngDebounceTimer && pngGlobal.__lineupPngPendingHash === nextHash) {
    return
  }

  pngGlobal.__lineupPngPendingHash = nextHash

  if (pngGlobal.__lineupPngDebounceTimer) {
    clearTimeout(pngGlobal.__lineupPngDebounceTimer)
  }

  pngGlobal.__lineupPngDebounceTimer = setTimeout(() => {
    const formats = Array.from(pngGlobal.__lineupPngQueuedFormats ?? new Set<LineupImageFormat>(["avif"]))
    const targetHash = pngGlobal.__lineupPngPendingHash

    pngGlobal.__lineupPngQueuedFormats = new Set<LineupImageFormat>()
    pngGlobal.__lineupPngPendingHash = undefined
    pngGlobal.__lineupPngDebounceTimer = undefined

    void regenerateLineupImages(formats, targetHash)
  }, LINEUP_REGEN_DEBOUNCE_MS)
}

async function checkLineupChangesInBackground(format: LineupImageFormat) {
  const now = Date.now()
  if (pngGlobal.__lineupPngDataCheckedAt && now - pngGlobal.__lineupPngDataCheckedAt < LINEUP_CHECK_INTERVAL_MS) return

  void checkLineupHash()
    .then((hash) => {
      if (!pngGlobal.__lineupPngDataHash) {
        pngGlobal.__lineupPngDataHash = hash
        return
      }

      if (hash !== pngGlobal.__lineupPngDataHash) {
        queueLineupRegeneration(format, hash)
      }
    })
    .catch(() => undefined)
}

async function waitForStableLineupHash(firstHash: string) {
  let lastHash = firstHash

  while (true) {
    await sleep(LINEUP_BLOCKING_REGEN_DEBOUNCE_MS)

    const nextHash = await checkLineupHash()
    if (nextHash === lastHash) return nextHash

    lastHash = nextHash
  }
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

async function renderTrackedLineupImage(side: LineupPngSide, format: LineupImageFormat): Promise<PngCacheEntry> {
  const [hashResult, imageResult] = await Promise.allSettled([
    checkLineupHash(),
    renderLineupImage(side, format),
  ])

  if (hashResult.status === "fulfilled") {
    pngGlobal.__lineupPngDataHash = hashResult.value
  }

  if (imageResult.status === "rejected") {
    throw imageResult.reason
  }

  return imageResult.value
}

async function regenerateLineupImages(formats: LineupImageFormat[], targetHash?: string) {
  const uniqueFormats = Array.from(new Set(formats))

  for (const format of uniqueFormats) {
    for (const side of ["1", "2"] as const) {
      const cacheKey = getCacheKey(side, format)

      if (!pngGlobal.__lineupPngInflight?.[cacheKey]) {
        pngGlobal.__lineupPngInflight ??= {}
        pngGlobal.__lineupPngInflight[cacheKey] = enqueueRender(() => renderLineupImage(side, format))
          .then((entry) => {
            pngGlobal.__lineupPngCache ??= {}
            pngGlobal.__lineupPngCache[cacheKey] = entry
            return entry
          })
          .finally(() => {
            delete pngGlobal.__lineupPngInflight?.[cacheKey]
          })
      }

      await pngGlobal.__lineupPngInflight[cacheKey].catch(() => undefined)
    }
  }

  if (targetHash) {
    pngGlobal.__lineupPngDataHash = targetHash
  }
}

async function ensureFreshLineupImagesForResponse(format: LineupImageFormat, changedHash: string) {
  pngGlobal.__lineupPngBlockingRefresh ??= {}

  if (!pngGlobal.__lineupPngBlockingRefresh[format]) {
    pngGlobal.__lineupPngBlockingRefresh[format] = waitForStableLineupHash(changedHash)
      .then(async (stableHash) => {
        await regenerateLineupImages([format], stableHash)
        return stableHash
      })
      .finally(() => {
        delete pngGlobal.__lineupPngBlockingRefresh?.[format]
      })
  }

  return pngGlobal.__lineupPngBlockingRefresh[format]
}

async function refreshBeforeResponseIfChanged(format: LineupImageFormat) {
  const hash = await checkLineupHash()

  if (!pngGlobal.__lineupPngDataHash) {
    pngGlobal.__lineupPngDataHash = hash
    return
  }

  if (hash !== pngGlobal.__lineupPngDataHash) {
    await ensureFreshLineupImagesForResponse(format, hash)
  }
}

async function getCachedLineupPng(side: LineupPngSide, format: LineupImageFormat, force = false) {
  const now = Date.now()
  const cacheKey = getCacheKey(side, format)
  pngGlobal.__lineupPngCache ??= {}
  pngGlobal.__lineupPngInflight ??= {}

  const cached = pngGlobal.__lineupPngCache[cacheKey]
  if (!force && cached) {
    try {
      await refreshBeforeResponseIfChanged(format)
      return pngGlobal.__lineupPngCache[cacheKey] ?? cached
    } catch {
      void checkLineupChangesInBackground(format)
      return cached
    }
  }

  if (!pngGlobal.__lineupPngInflight[cacheKey]) {
    pngGlobal.__lineupPngInflight[cacheKey] = enqueueRender(() => renderTrackedLineupImage(side, format))
      .then((entry) => {
        pngGlobal.__lineupPngCache![cacheKey] = entry
        return entry
      })
      .finally(() => {
        delete pngGlobal.__lineupPngInflight?.[cacheKey]
      })
  }

  try {
    const entry = await pngGlobal.__lineupPngInflight[cacheKey]
    void checkLineupChangesInBackground(format)
    return entry
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
