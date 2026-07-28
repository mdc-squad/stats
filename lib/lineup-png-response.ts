import { EXTERNAL_LINEUP_API_URL } from "@/lib/lineup-source"
import { renderLineupPng, type LineupPayload, type LineupSideKey } from "@/lib/lineup-renderer"

const FRESH_TTL_MS = 60_000
const STALE_TTL_MS = 15 * 60_000

export type LineupPngSide = "1" | "2"

type PngCacheEntry = {
  body: Buffer
  updatedAt: number
}
type DataCacheEntry = {
  body: LineupPayload
  updatedAt: number
}
type LineupPngGlobal = typeof globalThis & {
  __lineupPngCache?: Partial<Record<LineupPngSide, PngCacheEntry>>
  __lineupPngInflight?: Partial<Record<LineupPngSide, Promise<PngCacheEntry>>>
  __lineupPngDataCache?: DataCacheEntry
  __lineupPngDataInflight?: Promise<DataCacheEntry>
}

const pngGlobal = globalThis as LineupPngGlobal

export function resolveLineupPngSide(value: string | null | undefined): LineupPngSide {
  const normalized = String(value ?? "").trim().toLowerCase()
  return ["2", "two", "right", "second", "sitetwo", "site-two", "side-2", "side2", "2.png", "side-2.png"].includes(normalized)
    ? "2"
    : "1"
}

function sideToKey(side: LineupPngSide): LineupSideKey {
  return side === "2" ? "siteTwo" : "siteOne"
}

async function fetchLineupData(): Promise<DataCacheEntry> {
  const response = await fetch(EXTERNAL_LINEUP_API_URL, { cache: "no-store" })
  if (!response.ok) throw new Error(`Lineup API ${response.status}`)

  return {
    body: (await response.json()) as LineupPayload,
    updatedAt: Date.now(),
  }
}

async function getCachedLineupData(force = false) {
  const now = Date.now()
  const cached = pngGlobal.__lineupPngDataCache
  const isFresh = cached && now - cached.updatedAt < FRESH_TTL_MS
  if (!force && isFresh) return cached

  if (!pngGlobal.__lineupPngDataInflight) {
    pngGlobal.__lineupPngDataInflight = fetchLineupData()
      .then((entry) => {
        pngGlobal.__lineupPngDataCache = entry
        return entry
      })
      .finally(() => {
        pngGlobal.__lineupPngDataInflight = undefined
      })
  }

  try {
    return await pngGlobal.__lineupPngDataInflight
  } catch (error) {
    if (cached && now - cached.updatedAt < STALE_TTL_MS) return cached
    throw error
  }
}

async function buildLineupPng(side: LineupPngSide, force = false): Promise<PngCacheEntry> {
  const lineup = await getCachedLineupData(force)
  return {
    body: Buffer.from(renderLineupPng(lineup.body, sideToKey(side))),
    updatedAt: Date.now(),
  }
}

async function getCachedLineupPng(side: LineupPngSide, force = false) {
  const now = Date.now()
  pngGlobal.__lineupPngCache ??= {}
  pngGlobal.__lineupPngInflight ??= {}

  const cached = pngGlobal.__lineupPngCache[side]
  const isFresh = cached && now - cached.updatedAt < FRESH_TTL_MS
  if (!force && isFresh) return cached

  if (!pngGlobal.__lineupPngInflight[side]) {
    pngGlobal.__lineupPngInflight[side] = buildLineupPng(side, force)
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

export async function createLineupPngResponse(side: LineupPngSide, force = false) {
  const screenshot = await getCachedLineupPng(side, force)
  const ageSeconds = Math.max(0, Math.round((Date.now() - screenshot.updatedAt) / 1000))

  return new Response(screenshot.body, {
    headers: {
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "Content-Type": "image/png",
      "Content-Length": String(screenshot.body.byteLength),
      "Content-Disposition": `inline; filename="lineup-side-${side}.png"`,
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
