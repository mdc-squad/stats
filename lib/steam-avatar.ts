import { withBasePath } from "./base-path"

const STEAM_PROFILE_URL = "https://steamcommunity.com/profiles"
const STEAM_ID_PATTERN = /^\d{17}$/
const PROFILE_REQUEST_TIMEOUT_MS = 12000
const DEFAULT_STEAM_PROFILE_PROXY_BASE = "https://r.jina.ai/http://steamcommunity.com/profiles"
const STEAM_PROFILE_PROXY_BASE = (process.env.NEXT_PUBLIC_STEAM_PROFILE_PROXY_BASE ?? DEFAULT_STEAM_PROFILE_PROXY_BASE).replace(/\/$/, "")

const avatarUrlCache = new Map<string, string | null>()
const pendingAvatarRequests = new Map<string, Promise<string | null>>()

function buildProfileProxyUrl(steamId: string, includeXml = false): string {
  const profileUrl = `${STEAM_PROFILE_URL}/${steamId}${includeXml ? "?xml=1" : ""}`
  if (STEAM_PROFILE_PROXY_BASE.includes("{PROFILE_URL}")) {
    return STEAM_PROFILE_PROXY_BASE.replace("{PROFILE_URL}", encodeURIComponent(profileUrl))
  }

  if (STEAM_PROFILE_PROXY_BASE.includes("{STEAM_ID}")) {
    return STEAM_PROFILE_PROXY_BASE.replace("{STEAM_ID}", steamId)
  }

  return `${STEAM_PROFILE_PROXY_BASE}/${steamId}${includeXml ? "?xml=1" : ""}`
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

  const markdownAvatarMatch = payload.match(/https:\/\/avatars(?:\.[a-z0-9-]+)?\.steamstatic\.com\/[a-f0-9]+_full\.(?:jpg|png|jpeg|webp)/i)
  if (markdownAvatarMatch?.[0]) {
    return markdownAvatarMatch[0]
  }

  const genericAvatarMatch = payload.match(/https:\/\/avatars(?:\.[a-z0-9-]+)?\.steamstatic\.com\/[a-f0-9]+(?:_full|_medium)?\.(?:jpg|png|jpeg|webp)/i)
  return genericAvatarMatch?.[0] ?? null
}

async function fetchTextWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      cache: "force-cache",
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

  if (avatarUrlCache.has(normalizedSteamId)) {
    return avatarUrlCache.get(normalizedSteamId) ?? null
  }

  const pendingRequest = pendingAvatarRequests.get(normalizedSteamId)
  if (pendingRequest) {
    return pendingRequest
  }

  const request = (async () => {
    try {
      const candidateUrls = [buildProfileProxyUrl(normalizedSteamId, false), buildProfileProxyUrl(normalizedSteamId, true)]

      for (const candidateUrl of candidateUrls) {
        try {
          const profilePayload = await fetchTextWithTimeout(candidateUrl, PROFILE_REQUEST_TIMEOUT_MS)
          const avatarUrl = extractAvatarUrlFromProfilePayload(profilePayload)
          if (avatarUrl) {
            avatarUrlCache.set(normalizedSteamId, avatarUrl)
            return avatarUrl
          }
        } catch {
          // Try the next source.
        }
      }

      avatarUrlCache.set(normalizedSteamId, null)
      return null
    } catch {
      avatarUrlCache.set(normalizedSteamId, null)
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
