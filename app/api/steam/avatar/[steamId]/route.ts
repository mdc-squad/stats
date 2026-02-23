import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"

const STEAM_PROFILE_URL = "https://steamcommunity.com/profiles"
const PLACEHOLDER_PATH = "/placeholder-user.jpg"
const STEAM_ID_PATTERN = /^\d{17}$/
const PROFILE_REQUEST_TIMEOUT_MS = 5000
const AVATAR_REQUEST_TIMEOUT_MS = 5000

type CacheEntry = {
  avatarUrl: string
  expiresAt: number
}

type AvatarImageCacheEntry = {
  imageBytes: Uint8Array
  contentType: string
  expiresAt: number
}

const AVATAR_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const AVATAR_IMAGE_CACHE_TTL_MS = 60 * 60 * 1000
const AVATAR_IMAGE_CACHE_MAX_ENTRIES = 1000
const avatarUrlCache = new Map<string, CacheEntry>()
const avatarImageCache = new Map<string, AvatarImageCacheEntry>()
let placeholderImageBufferPromise: Promise<Buffer> | null = null

export const dynamic = "force-dynamic"

function getCachedAvatarUrl(steamId: string): string | undefined {
  const cached = avatarUrlCache.get(steamId)
  if (!cached) {
    return undefined
  }

  if (Date.now() > cached.expiresAt) {
    avatarUrlCache.delete(steamId)
    return undefined
  }

  return cached.avatarUrl
}

function setCachedAvatarUrl(steamId: string, avatarUrl: string): void {
  avatarUrlCache.set(steamId, {
    avatarUrl,
    expiresAt: Date.now() + AVATAR_CACHE_TTL_MS,
  })
}

function getCachedAvatarImage(steamId: string): AvatarImageCacheEntry | undefined {
  const cached = avatarImageCache.get(steamId)
  if (!cached) {
    return undefined
  }

  if (Date.now() > cached.expiresAt) {
    avatarImageCache.delete(steamId)
    return undefined
  }

  return cached
}

function setCachedAvatarImage(steamId: string, imageBytes: Uint8Array, contentType = "image/jpeg"): void {
  avatarImageCache.set(steamId, {
    imageBytes,
    contentType,
    expiresAt: Date.now() + AVATAR_IMAGE_CACHE_TTL_MS,
  })

  while (avatarImageCache.size > AVATAR_IMAGE_CACHE_MAX_ENTRIES) {
    const oldestKey = avatarImageCache.keys().next().value
    if (!oldestKey) {
      break
    }
    avatarImageCache.delete(oldestKey)
  }
}

function extractAvatarUrlFromXml(xmlPayload: string): string | null {
  const avatarMatch = xmlPayload.match(/<avatarFull>\s*<!\[CDATA\[(.+?)\]\]>\s*<\/avatarFull>/i)
  return avatarMatch?.[1] ?? null
}

async function fetchWithTimeout(input: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: abortController.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function resolveAvatarUrl(steamId: string): Promise<string | null> {
  const cached = getCachedAvatarUrl(steamId)
  if (cached !== undefined) {
    return cached
  }

  const profileUrl = `${STEAM_PROFILE_URL}/${steamId}?xml=1`
  const profileResponse = await fetchWithTimeout(profileUrl, PROFILE_REQUEST_TIMEOUT_MS, { cache: "no-store" })
  if (!profileResponse.ok) {
    return null
  }

  const profileXml = await profileResponse.text()
  const avatarUrl = extractAvatarUrlFromXml(profileXml)
  if (avatarUrl) {
    setCachedAvatarUrl(steamId, avatarUrl)
  }
  return avatarUrl
}

async function getPlaceholderImageBuffer(): Promise<Buffer> {
  if (!placeholderImageBufferPromise) {
    const placeholderPath = path.join(process.cwd(), "public", PLACEHOLDER_PATH.replace(/^\//, ""))
    placeholderImageBufferPromise = readFile(placeholderPath)
  }

  return placeholderImageBufferPromise
}

async function placeholderResponse(): Promise<NextResponse> {
  try {
    const placeholderImageBuffer = await getPlaceholderImageBuffer()
    return new NextResponse(placeholderImageBuffer, {
      status: 200,
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "no-store, max-age=0",
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}

function avatarImageResponse(imageBytes: Uint8Array, contentType: string): NextResponse {
  return new NextResponse(imageBytes, {
    status: 200,
    headers: {
      "content-type": contentType || "image/jpeg",
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  })
}

export async function GET(
  _request: Request,
  context?: { params: Promise<{ steamId: string }> | { steamId: string } },
) {
  const resolvedParams = context?.params ? await context.params : undefined
  const steamId = resolvedParams?.steamId?.trim()

  if (!steamId || !STEAM_ID_PATTERN.test(steamId)) {
    return placeholderResponse()
  }

  const cachedAvatarImage = getCachedAvatarImage(steamId)
  if (cachedAvatarImage) {
    return avatarImageResponse(cachedAvatarImage.imageBytes, cachedAvatarImage.contentType)
  }

  let avatarUrl: string | null
  try {
    avatarUrl = await resolveAvatarUrl(steamId)
  } catch {
    return placeholderResponse()
  }

  if (!avatarUrl) {
    return placeholderResponse()
  }

  let avatarResponse: Response
  try {
    avatarResponse = await fetchWithTimeout(avatarUrl, AVATAR_REQUEST_TIMEOUT_MS, {
      cache: "no-store",
      redirect: "follow",
    })
  } catch {
    return placeholderResponse()
  }

  if (!avatarResponse.ok) {
    return placeholderResponse()
  }

  const contentType = avatarResponse.headers.get("content-type") ?? "image/jpeg"

  let imageBytes: Uint8Array
  try {
    imageBytes = new Uint8Array(await avatarResponse.arrayBuffer())
  } catch {
    return placeholderResponse()
  }

  if (imageBytes.byteLength === 0) {
    return placeholderResponse()
  }

  setCachedAvatarImage(steamId, imageBytes, contentType)
  return avatarImageResponse(imageBytes, contentType)
}
