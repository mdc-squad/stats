import { withBasePath } from "./base-path"

const STEAM_PROFILE_URL = "https://steamcommunity.com/profiles"
const STEAM_ID_PATTERN = /^\d{17}$/
const PROFILE_REQUEST_TIMEOUT_MS = 12000
const DEFAULT_STEAM_PROFILE_PROXY_BASE = "https://r.jina.ai/http://steamcommunity.com/profiles"
const STEAM_PROFILE_PROXY_BASE = (process.env.NEXT_PUBLIC_STEAM_PROFILE_PROXY_BASE ?? DEFAULT_STEAM_PROFILE_PROXY_BASE).replace(/\/$/, "")
const STEAMID_IO_PROXY_URL = "https://r.jina.ai/http://steamid.io/lookup"
const STEAM_AVATAR_CACHE_KEY = "mdc-steam-avatar-cache-v1"
const STEAM_AVATAR_SUCCESS_TTL_MS = 14 * 24 * 60 * 60 * 1000
const STEAM_AVATAR_FAILURE_TTL_MS = 12 * 60 * 60 * 1000

const avatarUrlCache = new Map<string, string | null>()
const pendingAvatarRequests = new Map<string, Promise<string | null>>()

type PersistentAvatarCacheEntry = {
  url: string | null
  expiresAt: number
}

type PersistentAvatarCache = Record<string, PersistentAvatarCacheEntry>

function buildProfileProxyUrl(steamId: string, includeXml = false): string {
  const profileUrl = `${STEAM_PROFILE_URL}/${steamId}${includeXml ? "?xml=1" : ""}`
  if (STEAM_PROFILE_PROXY_BASE.includes("{PROFILE_URL}")) {
    return STEAM_PROFILE_PROXY_BASE.replace("{PROFILE_URL}", encodeURIComponent(profileUrl))
  }

  if (STEAM_PROFILE_PROXY_BASE.includes("{STEAM_ID}")) {
    return STEAM_PROFILE_PROXY_BASE.replace("{STEAM_ID}", steamId)
  }

  return `${STEAM_PROFILE_PROXY_BASE}/${steamId}${includeXml ? "/?xml=1" : ""}`
}

function buildSteamIdIoProxyUrl(steamId: string): string {
  return `${STEAMID_IO_PROXY_URL}/${steamId}`
}

function extractAvatarUrlFromXml(xmlPayload: string): string | null {
  const avatarMatch = xmlPayload.match(/<avatarFull>\s*<!\[CDATA\[(.+?)\]\]>\s*<\/avatarFull>/i)
  return avatarMatch?.[1]?.trim() || null
}

function extractAvatarUrlFromProfilePayload(payload: string): string | null {
  const xmlAvatar = extractAvatarUrlFromXml(payload)
  if (xmlAvatar) {
    return xmlAvatar
  }

  const schemaAvatarMatch = payload.match(/"thumbnailURL"\s*:\s*"([^"]+)"/i)
  if (schemaAvatarMatch?.[1]) {
    return schemaAvatarMatch[1].trim()
  }

  const legacySteamAvatarMatch = payload.match(/https:\/\/steamcdn-a\.akamaihd\.net\/steamcommunity\/public\/images\/avatars\/[a-z0-9]{2}\/[a-z0-9]+\.(?:jpg|png|jpeg|webp)/i)
  if (legacySteamAvatarMatch?.[0]) {
    return legacySteamAvatarMatch[0]
  }

  const markdownAvatarMatch = payload.match(/https:\/\/avatars(?:\.[a-z0-9-]+)?\.steamstatic\.com\/[a-f0-9]+_full\.(?:jpg|png|jpeg|webp)/i)
  if (markdownAvatarMatch?.[0]) {
    return markdownAvatarMatch[0]
  }

  const genericAvatarMatch = payload.match(/https:\/\/avatars(?:\.[a-z0-9-]+)?\.steamstatic\.com\/[a-f0-9]+(?:_full|_medium)?\.(?:jpg|png|jpeg|webp)/i)
  return genericAvatarMatch?.[0] ?? null
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function readPersistentAvatarCache(): PersistentAvatarCache {
  if (!canUseStorage()) {
    return {}
  }

  try {
    const rawValue = window.localStorage.getItem(STEAM_AVATAR_CACHE_KEY)
    if (!rawValue) {
      return {}
    }

    const parsed = JSON.parse(rawValue) as PersistentAvatarCache
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writePersistentAvatarCache(cache: PersistentAvatarCache) {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(STEAM_AVATAR_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}

function readCachedAvatarUrl(steamId: string): string | null | undefined {
  if (avatarUrlCache.has(steamId)) {
    return avatarUrlCache.get(steamId) ?? null
  }

  const persistentCache = readPersistentAvatarCache()
  const cachedEntry = persistentCache[steamId]
  if (!cachedEntry) {
    return undefined
  }

  if (!Number.isFinite(cachedEntry.expiresAt) || cachedEntry.expiresAt <= Date.now()) {
    delete persistentCache[steamId]
    writePersistentAvatarCache(persistentCache)
    return undefined
  }

  avatarUrlCache.set(steamId, cachedEntry.url)
  return cachedEntry.url
}

function storeCachedAvatarUrl(steamId: string, url: string | null) {
  avatarUrlCache.set(steamId, url)

  const persistentCache = readPersistentAvatarCache()
  persistentCache[steamId] = {
    url,
    expiresAt: Date.now() + (url ? STEAM_AVATAR_SUCCESS_TTL_MS : STEAM_AVATAR_FAILURE_TTL_MS),
  }
  writePersistentAvatarCache(persistentCache)
}

async function fetchTextWithTimeout(url: string, timeoutMs: number, headers?: HeadersInit): Promise<string> {
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      cache: "force-cache",
      headers,
      signal: abortController.signal,
    })

    if (!response.ok) {
      throw new Error(`Avatar proxy request failed: ${response.status}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

export async function resolveSteamAvatarUrl(steamId: string): Promise<string | null> {
  const normalizedSteamId = steamId.trim()
  if (!normalizedSteamId || !STEAM_ID_PATTERN.test(normalizedSteamId)) {
    return null
  }

  const cachedAvatarUrl = readCachedAvatarUrl(normalizedSteamId)
  if (cachedAvatarUrl !== undefined) {
    return cachedAvatarUrl
  }

  const pendingRequest = pendingAvatarRequests.get(normalizedSteamId)
  if (pendingRequest) {
    return pendingRequest
  }

  const request = (async () => {
    try {
      const candidateSources = [
        { url: buildProfileProxyUrl(normalizedSteamId, false) },
        { url: buildProfileProxyUrl(normalizedSteamId, true) },
        {
          url: buildSteamIdIoProxyUrl(normalizedSteamId),
          headers: {
            "x-respond-with": "html",
          },
        },
      ]

      for (const candidateSource of candidateSources) {
        try {
          const profilePayload = await fetchTextWithTimeout(candidateSource.url, PROFILE_REQUEST_TIMEOUT_MS, candidateSource.headers)
          const avatarUrl = extractAvatarUrlFromProfilePayload(profilePayload)
          if (avatarUrl) {
            storeCachedAvatarUrl(normalizedSteamId, avatarUrl)
            return avatarUrl
          }
        } catch {
          // Try the next source.
        }
      }

      storeCachedAvatarUrl(normalizedSteamId, null)
      return null
    } catch {
      storeCachedAvatarUrl(normalizedSteamId, null)
      return null
    } finally {
      pendingAvatarRequests.delete(normalizedSteamId)
    }
  })()

  pendingAvatarRequests.set(normalizedSteamId, request)
  return request
}

export function getSteamAvatarFallbackUrl(): string {
  return withBasePath("/placeholder-user.jpg")
}
