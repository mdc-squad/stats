import { withBasePath } from "./base-path"

const STEAM_PROFILE_URL = "https://steamcommunity.com/profiles"
const STEAM_MINIPROFILE_URL = "https://steamcommunity.com/miniprofile"
const STEAM_ID_PATTERN = /^\d{17}$/
const STEAM_ID64_OFFSET = "76561197960265728"
const PROFILE_REQUEST_TIMEOUT_MS = 30000
const DEFAULT_STEAM_PROFILE_PROXY_BASE = "https://r.jina.ai/http://steamcommunity.com/profiles"
const DEFAULT_STEAM_MINIPROFILE_PROXY_BASE = "https://r.jina.ai/http://steamcommunity.com/miniprofile"
const DEFAULT_STEAM_AVATAR_IMAGE_PROXY_BASE = "https://images.weserv.nl/?url={AVATAR_URL}"
const STEAM_PROFILE_PROXY_BASE = (process.env.NEXT_PUBLIC_STEAM_PROFILE_PROXY_BASE ?? DEFAULT_STEAM_PROFILE_PROXY_BASE).replace(/\/$/, "")
const STEAM_MINIPROFILE_PROXY_BASE = (process.env.NEXT_PUBLIC_STEAM_MINIPROFILE_PROXY_BASE ?? DEFAULT_STEAM_MINIPROFILE_PROXY_BASE).replace(/\/$/, "")
const STEAM_AVATAR_IMAGE_PROXY_BASE = process.env.NEXT_PUBLIC_STEAM_AVATAR_IMAGE_PROXY_BASE ?? DEFAULT_STEAM_AVATAR_IMAGE_PROXY_BASE
const STEAM_AVATAR_CACHE_KEY = "mdc-steam-avatar-cache-v7"
const STEAM_AVATAR_SUCCESS_TTL_MS = 3 * 24 * 60 * 60 * 1000

const avatarUrlCache = new Map<string, string | null>()
const pendingAvatarRequests = new Map<string, Promise<string | null>>()
let activeAvatarFetches = 0
const queuedAvatarFetches: Array<() => void> = []
const MAX_PARALLEL_AVATAR_FETCHES = 4

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

function steamId64ToAccountId(steamId: string): string | null {
  try {
    const accountId = BigInt(steamId) - BigInt(STEAM_ID64_OFFSET)
    return accountId > BigInt(0) ? accountId.toString() : null
  } catch {
    return null
  }
}

function buildMiniProfileProxyUrl(steamId: string): string | null {
  const accountId = steamId64ToAccountId(steamId)
  if (!accountId) {
    return null
  }

  const miniProfileUrl = `${STEAM_MINIPROFILE_URL}/${accountId}/json`
  if (STEAM_MINIPROFILE_PROXY_BASE.includes("{MINIPROFILE_URL}")) {
    return STEAM_MINIPROFILE_PROXY_BASE.replace("{MINIPROFILE_URL}", encodeURIComponent(miniProfileUrl))
  }

  if (STEAM_MINIPROFILE_PROXY_BASE.includes("{ACCOUNT_ID}")) {
    return STEAM_MINIPROFILE_PROXY_BASE.replace("{ACCOUNT_ID}", accountId)
  }

  return `${STEAM_MINIPROFILE_PROXY_BASE}/${accountId}/json`
}

function payloadBelongsToSteamId(payload: string, steamId: string): boolean {
  const normalizedPayload = payload.replace(/\s+/g, "")
  return (
    normalizedPayload.includes(steamId) ||
    normalizedPayload.includes(`steamcommunity.com/profiles/${steamId}`) ||
    normalizedPayload.includes(`steamID64>${steamId}<`) ||
    normalizedPayload.includes(`steamid64>${steamId}<`)
  )
}

function normalizeSteamAvatarUrl(value: string | null | undefined): string | null {
  const normalizedValue = value
    ?.replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .trim()

  if (!normalizedValue || !/^https:\/\/avatars\.[a-z0-9-]+\.steamstatic\.com\/.+\.(?:jpg|jpeg|png|webp)$/i.test(normalizedValue)) {
    return null
  }

  return normalizedValue
}

function extractAvatarUrlFromXml(xmlPayload: string): string | null {
  const avatarMatch = xmlPayload.match(/<avatarFull>\s*<!\[CDATA\[(.+?)\]\]>\s*<\/avatarFull>/i)
  return normalizeSteamAvatarUrl(avatarMatch?.[1])
}

function extractAvatarUrlFromMiniProfile(payload: string): string | null {
  const avatarUrlMatch = payload.match(/"avatar_url"\s*:\s*"([^"]+)"/i)
  const avatarUrl = normalizeSteamAvatarUrl(avatarUrlMatch?.[1])
  if (avatarUrl) {
    return avatarUrl
  }

  const firstSteamAvatarMatch = payload.match(/https:\\?\/\\?\/avatars\.[a-z0-9-]+\.steamstatic\.com\\?\/[^"')\s]+?\.(?:jpg|jpeg|png|webp)/i)
  return normalizeSteamAvatarUrl(firstSteamAvatarMatch?.[0])
}

function extractAvatarUrlFromProfileMarkdown(payload: string): string | null {
  const namedFullAvatarMatch = payload.match(/"avatar_url_full"\s*:\s*"([^"]+)"/i)
  const namedFullAvatar = normalizeSteamAvatarUrl(namedFullAvatarMatch?.[1])
  if (namedFullAvatar) {
    return namedFullAvatar
  }

  const fullAvatarMatch = payload.match(/https:\\?\/\\?\/avatars\.[a-z0-9-]+\.steamstatic\.com\\?\/[^"')\s]+?_full\.(?:jpg|jpeg|png|webp)/i)
  const fullAvatar = normalizeSteamAvatarUrl(fullAvatarMatch?.[0])
  if (fullAvatar) {
    return fullAvatar
  }

  const firstSteamAvatarMatch = payload.match(/https:\\?\/\\?\/avatars\.[a-z0-9-]+\.steamstatic\.com\\?\/[^"')\s]+?\.(?:jpg|jpeg|png|webp)/i)
  return normalizeSteamAvatarUrl(firstSteamAvatarMatch?.[0])
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
  if (!url) {
    avatarUrlCache.delete(steamId)
    const persistentCache = readPersistentAvatarCache()
    if (persistentCache[steamId]) {
      delete persistentCache[steamId]
      writePersistentAvatarCache(persistentCache)
    }
    return
  }

  avatarUrlCache.set(steamId, url)

  const persistentCache = readPersistentAvatarCache()
  persistentCache[steamId] = {
    url,
    expiresAt: Date.now() + STEAM_AVATAR_SUCCESS_TTL_MS,
  }
  writePersistentAvatarCache(persistentCache)
}

async function withAvatarFetchSlot<T>(task: () => Promise<T>): Promise<T> {
  if (activeAvatarFetches >= MAX_PARALLEL_AVATAR_FETCHES) {
    await new Promise<void>((resolve) => queuedAvatarFetches.push(resolve))
  }

  activeAvatarFetches += 1

  try {
    return await task()
  } finally {
    activeAvatarFetches = Math.max(0, activeAvatarFetches - 1)
    queuedAvatarFetches.shift()?.()
  }
}

async function fetchTextWithTimeout(url: string, timeoutMs: number, headers?: HeadersInit): Promise<string> {
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      cache: "no-store",
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

export async function resolveSteamAvatarUrl(steamId: string | null | undefined): Promise<string | null> {
  const normalizedSteamId = typeof steamId === "string" ? steamId.trim() : ""
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
      const miniProfileProxyUrl = buildMiniProfileProxyUrl(normalizedSteamId)
      const candidateSources: Array<{ url: string; validateSteamId: boolean; extractAvatar: (payload: string) => string | null; headers?: HeadersInit }> = [
        ...(miniProfileProxyUrl ? [{ url: miniProfileProxyUrl, validateSteamId: false, extractAvatar: extractAvatarUrlFromMiniProfile }] : []),
        { url: buildProfileProxyUrl(normalizedSteamId, false), validateSteamId: true, extractAvatar: extractAvatarUrlFromProfileMarkdown },
        { url: buildProfileProxyUrl(normalizedSteamId, true), validateSteamId: true, extractAvatar: extractAvatarUrlFromXml },
      ]

      for (const candidateSource of candidateSources) {
        try {
          const profilePayload = await withAvatarFetchSlot(() =>
            fetchTextWithTimeout(candidateSource.url, PROFILE_REQUEST_TIMEOUT_MS, candidateSource.headers),
          )
          if (candidateSource.validateSteamId && !payloadBelongsToSteamId(profilePayload, normalizedSteamId)) {
            continue
          }
          const avatarUrl = candidateSource.extractAvatar(profilePayload)
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

export function getProxiedSteamAvatarUrl(avatarUrl: string | null | undefined): string | null {
  const normalizedAvatarUrl = normalizeSteamAvatarUrl(avatarUrl)
  if (!normalizedAvatarUrl) {
    return null
  }

  const proxyValue = normalizedAvatarUrl.replace(/^https?:\/\//i, "")
  if (STEAM_AVATAR_IMAGE_PROXY_BASE.includes("{AVATAR_URL}")) {
    return STEAM_AVATAR_IMAGE_PROXY_BASE.replace("{AVATAR_URL}", encodeURIComponent(proxyValue))
  }

  return `${STEAM_AVATAR_IMAGE_PROXY_BASE}${encodeURIComponent(proxyValue)}`
}
