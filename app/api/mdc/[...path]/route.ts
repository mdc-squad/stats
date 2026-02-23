import { NextRequest, NextResponse } from "next/server"

const UPSTREAM_BASE = "https://api.hungryfishteam.org/gas/mdc"

const ALLOWED_PATHS = new Set([
  "all",
  "pages",
  "events",
  "players",
  "playersevents",
  "clans",
  "dictionaries",
  "player",
])

export const dynamic = "force-dynamic"

function buildUpstreamUrl(pathParts: string[], searchParams: URLSearchParams): string {
  const path = pathParts.join("/")
  if (!ALLOWED_PATHS.has(path)) {
    throw new Error("Unsupported API path")
  }

  const upstream = new URL(`${UPSTREAM_BASE}/${path}`)
  searchParams.forEach((value, key) => {
    upstream.searchParams.set(key, value)
  })
  return upstream.toString()
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  const resolvedParams = await context.params
  const pathParts = Array.isArray(resolvedParams.path) ? resolvedParams.path : []

  if (pathParts.length === 0) {
    return NextResponse.json({ error: "Missing API path" }, { status: 400 })
  }

  let upstreamUrl: string
  try {
    upstreamUrl = buildUpstreamUrl(pathParts, request.nextUrl.searchParams)
  } catch {
    return NextResponse.json({ error: "Unsupported API path" }, { status: 400 })
  }

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(upstreamUrl, { cache: "no-store" })
  } catch {
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 })
  }

  const contentType = upstreamResponse.headers.get("content-type") ?? "application/json; charset=utf-8"
  const body = await upstreamResponse.text()

  return new NextResponse(body, {
    status: upstreamResponse.status,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  })
}
