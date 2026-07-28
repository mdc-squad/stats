import type { NextRequest } from "next/server"
import { EXTERNAL_LINEUP_API_URL } from "@/lib/lineup-source"
import { renderLineupPng, type LineupPayload, type LineupSideKey } from "@/lib/lineup-renderer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const FRESH_TTL_MS = 60_000
const STALE_TTL_MS = 15 * 60_000

type Side = "1" | "2"
type PngCacheEntry = {
  body: Buffer
  updatedAt: number
}
type DataCacheEntry = {
  body: LineupPayload
  updatedAt: number
}
type LineupPngGlobal = typeof globalThis & {
  __lineupPngCache?: Partial<Record<Side, PngCacheEntry>>
  __lineupPngInflight?: Partial<Record<Side, Promise<PngCacheEntry>>>
  __lineupPngDataCache?: DataCacheEntry
  __lineupPngDataInflight?: Promise<DataCacheEntry>
}

const pngGlobal = globalThis as LineupPngGlobal

function resolveSide(value: string | null): Side {
  const normalized = String(value ?? "").trim().toLowerCase()
  return ["2", "two", "right", "second", "sitetwo", "site-two"].includes(normalized) ? "2" : "1"
}

function sideToKey(side: Side): LineupSideKey {
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

async function buildLineupPng(side: Side, force = false): Promise<PngCacheEntry> {
  const lineup = await getCachedLineupData(force)
  return {
    body: Buffer.from(renderLineupPng(lineup.body, sideToKey(side))),
    updatedAt: Date.now(),
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
