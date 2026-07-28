import { EXTERNAL_LINEUP_API_URL } from "@/lib/lineup-source"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const FRESH_TTL_MS = 60_000
const STALE_TTL_MS = 15 * 60_000

type CacheEntry = {
  body: string
  updatedAt: number
}

type LineupDataGlobal = typeof globalThis & {
  __lineupDataCache?: CacheEntry
  __lineupDataInflight?: Promise<CacheEntry>
}

const cacheGlobal = globalThis as LineupDataGlobal

async function fetchLineupData(): Promise<CacheEntry> {
  const response = await fetch(EXTERNAL_LINEUP_API_URL, { cache: "no-store" })
  if (!response.ok) throw new Error(`Lineup API ${response.status}`)

  return {
    body: await response.text(),
    updatedAt: Date.now(),
  }
}

async function getCachedLineupData(force = false) {
  const now = Date.now()
  const cached = cacheGlobal.__lineupDataCache
  const isFresh = cached && now - cached.updatedAt < FRESH_TTL_MS

  if (!force && isFresh) return cached

  if (!cacheGlobal.__lineupDataInflight) {
    cacheGlobal.__lineupDataInflight = fetchLineupData()
      .then((entry) => {
        cacheGlobal.__lineupDataCache = entry
        return entry
      })
      .finally(() => {
        cacheGlobal.__lineupDataInflight = undefined
      })
  }

  try {
    return await cacheGlobal.__lineupDataInflight
  } catch (error) {
    if (cached && now - cached.updatedAt < STALE_TTL_MS) return cached
    throw error
  }
}

export async function GET(request: Request) {
  try {
    const force = new URL(request.url).searchParams.get("refresh") === "true"
    const entry = await getCachedLineupData(force)

    return new Response(entry.body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Lineup-Cache-Age": String(Math.max(0, Math.round((Date.now() - entry.updatedAt) / 1000))),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(message, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }
}
