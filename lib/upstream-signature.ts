const DEFAULT_API_BASE = "https://api.hungryfishteam.org/gas/mdc"
const API_BASE = (process.env.NEXT_PUBLIC_MDC_API_BASE ?? DEFAULT_API_BASE).replace(/\/$/, "")

export type UpstreamSignature = {
  etag: string | null
  lastModified: string | null
  url: string
}

function normalizeHeaderValue(value: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/**
 * Lightweight "did anything change?" check for the upstream data source.
 * Uses HTTP caching headers (ETag / Last-Modified) so we can avoid a full sync if nothing changed.
 *
 * Notes:
 * - Some backends don't support HEAD; we fall back to a minimal GET.
 * - If headers are missing, the signature will be null-ish and callers can choose a safe fallback.
 */
export async function fetchUpstreamSignature(forceRefresh = false): Promise<UpstreamSignature> {
  const url = `${API_BASE}/pages?publish=true`
  const requestInit: RequestInit = forceRefresh ? { cache: "no-store" } : {}

  const attemptFetch = async (method: "HEAD" | "GET") => {
    const response = await fetch(url, { ...requestInit, method })
    if (!response.ok) {
      throw new Error(`API error: ${response.status} (${url})`)
    }
    return response
  }

  let response: Response
  try {
    response = await attemptFetch("HEAD")
  } catch {
    response = await attemptFetch("GET")
  }

  return {
    url,
    etag: normalizeHeaderValue(response.headers.get("etag")),
    lastModified: normalizeHeaderValue(response.headers.get("last-modified")),
  }
}

